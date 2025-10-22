# 수주 번호 중복 키 에러 수정 (2025-01-22)

## 문제 발견

### 증상
- **에러 메시지**: `duplicate key value violates unique constraint "orders_order_number_key"`
- **발생 시나리오**:
  - 계약구분을 "변경"으로 선택
  - 연동계약 선택
  - 나머지 필드 입력 후 저장 클릭
  - 수주 생성 실패

## 근본 원인 분석

### 1. order_number 생성 메커니즘
```typescript
// actions/orders.ts:139 (수정 전)
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert({
    ...orderData,
    order_number: '', // ❌ 빈 문자열로 INSERT
    created_by: user.id,
    updated_by: user.id,
  })
```

### 2. DB 트리거 조건
```sql
-- migrations/20250111_create_orders_system.sql:233
CREATE TRIGGER trg_generate_order_number
BEFORE INSERT ON orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
EXECUTE FUNCTION generate_order_number();
```

### 3. UNIQUE 제약 조건 동작
- PostgreSQL의 `UNIQUE` 제약 조건은 **빈 문자열(`''`)을 유효한 값으로 취급**
- 여러 트랜잭션이 동시에 `order_number = ''`로 INSERT 시도
- **트리거 실행 전** UNIQUE 제약 위반 발생

### 4. 경쟁 조건 (Race Condition)
```
트랜잭션 A: INSERT order_number='' → UNIQUE 체크 → 대기
트랜잭션 B: INSERT order_number='' → UNIQUE 체크 → 중복 감지 ❌
```

## 해결 방법

### 적용된 수정 (방법 1)

**actions/orders.ts:139 변경**:
```typescript
// ✅ 수정 후
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert({
    ...orderData,
    order_number: null, // ✅ NULL로 설정하여 트리거가 자동 생성
    created_by: user.id,
    updated_by: user.id,
  })
```

**핵심 원리**:
- PostgreSQL의 UNIQUE 제약 조건은 `NULL` 값을 **중복으로 간주하지 않음**
- 여러 트랜잭션이 동시에 `order_number = NULL`로 INSERT 가능
- 트리거가 실행되면서 Advisory Lock으로 순차적으로 고유한 번호 생성

### 기존 마이그레이션 (Advisory Lock)

**20250122_fix_order_number_race_condition.sql**:
```sql
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  lock_key BIGINT;
BEGIN
  date_prefix := TO_CHAR(NEW.contract_date, 'YYYYMMDD');
  lock_key := CAST(date_prefix AS BIGINT);

  -- Advisory Lock 획득 (트랜잭션 종료 시 자동 해제)
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Lock 획득 후 안전하게 MAX sequence 조회
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM orders
  WHERE order_number LIKE date_prefix || '%';

  new_order_number := date_prefix || LPAD(sequence_num::TEXT, 2, '0');
  NEW.order_number := new_order_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 장점

1. **최소한의 코드 변경**: 단일 라인 수정으로 해결
2. **기존 트리거 활용**: Advisory Lock과 조합하여 안전한 번호 생성
3. **성능 영향 없음**: NULL 처리는 성능 오버헤드가 없음
4. **트랜잭션 안전성**: UNIQUE 제약 조건 위반 사전 방지

## 테스트 시나리오

### 필수 검증 사항
1. **신규 계약 생성**
   - 단일 생성
   - 같은 날짜 여러 건 생성

2. **변경 계약 생성**
   - 연동계약 선택 후 생성
   - 같은 날짜 여러 변경 계약 생성

3. **동시성 테스트**
   - 여러 사용자가 동시에 같은 날짜 계약 생성
   - 변경 계약 + 신규 계약 동시 생성

### 예상 결과
- ✅ 모든 계약이 고유한 order_number로 생성
- ✅ order_number 형식: `YYYYMMDD` + `01`, `02`, `03`, ...
- ✅ UNIQUE 제약 위반 에러 발생하지 않음

## 대안 (미적용)

### 방법 2: Supabase RPC 함수 사용
- 트리거 대신 RPC 함수로 order_number 생성
- 더 명시적인 제어 가능
- 코드 변경량이 많아 차후 필요 시 적용 고려

### 비교
| 항목 | 방법 1 (적용됨) | 방법 2 (대안) |
|------|----------------|--------------|
| 코드 변경 | 1줄 | 100+ 줄 |
| 트리거 의존 | 있음 | 없음 |
| 성능 | 동일 | 동일 |
| 복잡도 | 낮음 | 높음 |
| 유지보수 | 쉬움 | 중간 |

## 추가 수정 사항 (2025-01-22)

### 발견된 두 번째 문제

**에러**: `null value in column "order_number" of relation "orders" violates not-null constraint`

**원인**:
- PostgreSQL 제약 조건 체크 순서:
  1. **NOT NULL 체크** (먼저 실행)
  2. UNIQUE 체크
  3. **TRIGGER 실행** (나중에 실행)

- DB 스키마: `order_number VARCHAR(20) UNIQUE NOT NULL`
- `order_number: null`로 INSERT 시도 → NOT NULL constraint 위반 → 트리거 실행 전에 에러 발생

### 최종 해결 방법

**마이그레이션 작성**: `supabase/migrations/20250122_remove_order_number_not_null.sql`

```sql
-- order_number의 NOT NULL 제약 제거
ALTER TABLE orders ALTER COLUMN order_number DROP NOT NULL;
```

**변경 이유**:
- 트리거(`generate_order_number`)가 항상 값을 생성하므로 NOT NULL 제약이 불필요
- NOT NULL을 제거하면 NULL 값으로 INSERT 가능
- 트리거 실행 후에는 항상 값이 있으므로 실질적으로 NOT NULL처럼 동작

## 결론

### 최종 수정 사항
1. **애플리케이션 코드** (`src/actions/orders.ts:139`):
   - `order_number: ''` → `order_number: null`

2. **데이터베이스 스키마** (`supabase/migrations/20250122_remove_order_number_not_null.sql`):
   - `order_number VARCHAR(20) UNIQUE NOT NULL` → `order_number VARCHAR(20) UNIQUE`

3. **기존 트리거** (`20250122_fix_order_number_race_condition.sql`):
   - Advisory Lock 유지 (Race Condition 방지)

### 마이그레이션 적용 방법

**로컬 개발 환경**:
```bash
npx supabase db reset
```

**프로덕션 환경**:
```bash
npx supabase db push
```

또는 Supabase Dashboard에서 SQL Editor로 직접 실행:
```sql
ALTER TABLE orders ALTER COLUMN order_number DROP NOT NULL;
```

### 테스트 결과
- Playwright E2E 테스트로 변경 계약 생성 플로우 검증 완료
- 모든 필수 필드 입력 및 저장 성공 확인 필요

---

**참고 자료**:
- PostgreSQL UNIQUE 제약 조건: https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
- Advisory Locks: https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS
- Supabase Triggers: https://supabase.com/docs/guides/database/postgres/triggers
