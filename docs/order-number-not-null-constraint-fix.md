# 수주 번호 NOT NULL 제약 조건 수정 (2025-01-22)

## 문제 발생 배경

### 첫 번째 에러 (이미 수정됨)
- **에러**: `duplicate key value violates unique constraint "orders_order_number_key"`
- **원인**: `order_number: ''` (빈 문자열) 사용으로 UNIQUE 제약 위반
- **수정**: `order_number: ''` → `order_number: null` (src/actions/orders.ts:139)

### 두 번째 에러 (현재 문제)
- **에러**: `null value in column "order_number" of relation "orders" violates not-null constraint`
- **발생 시나리오**: 변경 계약 추가 → 연동계약 선택 → 저장 시도

## 근본 원인 분석

### PostgreSQL 제약 조건 실행 순서

```
1. NOT NULL 체크    ← 여기서 에러 발생!
2. UNIQUE 체크
3. TRIGGER 실행     ← generate_order_number() 실행 못함
```

### 현재 설정

**DB 스키마** (20250111_create_orders_system.sql:148):
```sql
order_number VARCHAR(20) UNIQUE NOT NULL
```

**트리거 조건** (20250111_create_orders_system.sql:233):
```sql
WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
```

**애플리케이션 코드** (src/actions/orders.ts:139):
```typescript
order_number: null  // NULL로 설정하여 트리거 실행 의도
```

### 문제점

1. `order_number: null`로 INSERT 시도
2. PostgreSQL이 **먼저** NOT NULL 제약 조건 체크
3. NOT NULL 위반으로 에러 발생
4. **트리거 실행 전에 종료** → 자동 번호 생성 안됨

## 해결 방법

### 선택한 방법: NOT NULL 제약 제거

**이유**:
- `generate_order_number()` 트리거가 **항상** 값을 생성
- 트리거 실행 후에는 **절대 NULL이 될 수 없음**
- NOT NULL 제약이 실질적으로 불필요
- UNIQUE 제약만으로도 중복 방지 가능

### 마이그레이션 작성

**파일**: `supabase/migrations/20250122_remove_order_number_not_null.sql`

```sql
-- order_number의 NOT NULL 제약 제거
ALTER TABLE orders ALTER COLUMN order_number DROP NOT NULL;

-- 주석 추가
COMMENT ON COLUMN orders.order_number IS '수주 번호 (트리거에서 자동 생성: YYYYMMDD + 일련번호)';
```

## 실행 흐름 비교

### 수정 전 (에러 발생)

```
1. INSERT order_number = NULL
2. NOT NULL 체크 → ❌ 에러 발생
3. 트리거 실행 안됨
```

### 수정 후 (정상 동작)

```
1. INSERT order_number = NULL
2. NOT NULL 체크 없음 → ✅ 통과
3. UNIQUE 체크 (NULL은 중복 X) → ✅ 통과
4. 트리거 실행:
   - Advisory Lock 획득
   - 날짜별 MAX 시퀀스 조회
   - 새 번호 생성 (예: 2025012201)
   - order_number 설정
5. INSERT 완료 → ✅ 성공
```

## 마이그레이션 적용 방법

### 로컬 개발 환경

```bash
# Supabase CLI로 로컬 DB 리셋 및 마이그레이션 적용
npx supabase db reset
```

### 프로덕션 환경

**방법 1: Supabase CLI**
```bash
npx supabase db push
```

**방법 2: Supabase Dashboard**
1. Supabase Dashboard 접속
2. SQL Editor 열기
3. 다음 SQL 실행:
```sql
ALTER TABLE orders ALTER COLUMN order_number DROP NOT NULL;
COMMENT ON COLUMN orders.order_number IS '수주 번호 (트리거에서 자동 생성: YYYYMMDD + 일련번호)';
```

## 테스트 시나리오

### Playwright E2E 테스트 결과

**테스트 플로우**:
1. ✅ 수주 관리 페이지 접속
2. ✅ "수주 추가" 버튼 클릭
3. ✅ 계약구분 "변경" 선택
4. ✅ 연동계약 "테스트" 선택
5. ✅ 계약명 입력: "변경 계약 테스트"
6. ✅ 오염물질 추가: 카드뮴 (100 mg/kg)
7. ✅ 정화방법 선택: 열탈착법
8. ❌ 저장 시도 → NOT NULL constraint 에러 (마이그레이션 전)

### 마이그레이션 적용 후 검증 필요

1. **신규 계약 생성**
   - 단일 생성 → order_number 자동 생성 확인
   - 같은 날짜 여러 건 → 일련번호 증가 확인 (01, 02, 03...)

2. **변경 계약 생성**
   - 연동계약 선택 후 생성 → order_number 자동 생성 확인
   - 같은 날짜 여러 변경 계약 → 일련번호 증가 확인

3. **동시성 테스트**
   - 여러 사용자 동시 생성 → Advisory Lock으로 순차 처리 확인
   - Race Condition 발생하지 않음 확인

## 장점

1. **최소한의 변경**: DB 스키마 1줄 수정으로 해결
2. **안전성**: 트리거가 항상 값을 생성하므로 실질적으로 NOT NULL
3. **성능**: Advisory Lock과 조합하여 Race Condition 방지
4. **유지보수**: 명확한 의도 표현 (트리거가 값 생성)

## 관련 파일

### 수정된 파일
- `src/actions/orders.ts:139` - order_number를 null로 설정

### 추가된 파일
- `supabase/migrations/20250122_remove_order_number_not_null.sql` - NOT NULL 제약 제거

### 기존 관련 파일
- `supabase/migrations/20250111_create_orders_system.sql` - 원본 스키마 및 트리거
- `supabase/migrations/20250122_fix_order_number_race_condition.sql` - Advisory Lock 추가

## 결론

### 수정 요약
1. ✅ 애플리케이션: `order_number: ''` → `order_number: null`
2. ✅ DB 스키마: `NOT NULL` 제약 제거
3. ✅ 트리거: Advisory Lock으로 Race Condition 방지 (기존)

### 최종 동작
- INSERT 시 `order_number = null` 전달
- 트리거가 자동으로 `YYYYMMDD + 일련번호` 생성
- UNIQUE 제약으로 중복 방지
- Advisory Lock으로 동시성 제어

---

**작성일**: 2025-01-22
**테스트 도구**: Playwright MCP (Browser Automation)
**검증 상태**: 마이그레이션 작성 완료, 적용 및 재테스트 필요
