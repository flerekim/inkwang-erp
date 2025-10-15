# 수주관리 기능 상세 PRD - Part 1: 개요 및 DB 설계

> **작성일**: 2025-01-11
> **대상**: 인광이에스 ERP 시스템
> **참고 구현**: 사원관리 페이지 (`src/app/(dashboard)/admin/employees/`)
> **문서 구성**: 전체 3부작 중 Part 1

---

## 📋 문서 구성

- **Part 1**: 개요 및 DB 설계 (현재 문서)
- **Part 2**: Server Actions 및 TypeScript 타입
- **Part 3**: 프론트엔드 구현 가이드

---

## 1. 개요

### 1.1 기능 목적
인광이에스의 영업 수주 데이터를 체계적으로 관리하고, 계약 진행 상황을 추적할 수 있는 관리 시스템을 구축합니다.

### 1.2 주요 기능
- ✅ 수주 계약 CRUD (생성, 조회, 수정, 삭제)
- ✅ 계약 상태 관리 (견적 → 계약 → 진행 → 완료)
- ✅ 변경 계약 관리 (신규 계약과의 종속 관계)
- ✅ 오염항목 다중 선택 및 농도 관리
- ✅ 정화방법 다중 선택
- ✅ 고객사 및 검증업체 연동
- ✅ Excel 내보내기 및 인쇄
- ✅ 반응형 디자인 (데스크톱/모바일)

### 1.3 사용자 역할
- **관리자(admin)**: 모든 기능 사용 가능
- **사용자(user)**: 조회 및 본인이 담당하는 계약만 수정 가능

### 1.4 화면 구성

#### 데스크톱 화면
```
┌─────────────────────────────────────────────────────────────┐
│                     수주관리                                   │
│  전체 계약 정보를 관리합니다                                    │
├─────────────────────────────────────────────────────────────┤
│ [통계 카드 4개: 전체 계약, 진행 중, 완료, 계약금액 합계]          │
├─────────────────────────────────────────────────────────────┤
│ [검색창] [수주 추가] [Excel] [인쇄] [삭제]                       │
├─────────────────────────────────────────────────────────────┤
│ □ | 계약번호 | 계약명 | 고객명 | 계약일 | 상태 | 금액 | ... │
│ □ | 20250111 | 토양정화 | 삼성 | 2025-01-11 | 진행 | 1억 |    │
│ □ | 20250110 | 오염조사 | LG | 2025-01-10 | 완료 | 5천 |      │
│ ...                                                           │
├─────────────────────────────────────────────────────────────┤
│             [이전] 1 / 10 [다음]                              │
└─────────────────────────────────────────────────────────────┘
```

#### 모바일 화면
```
┌───────────────────────────┐
│      수주관리             │
├───────────────────────────┤
│ [검색창]                  │
├───────────────────────────┤
│ [📋 작업] [⋯ 더보기]      │
├───────────────────────────┤
│ ┌───────────────────────┐ │
│ │ □ 계약번호: 20250111  │ │
│ │ 계약명: 토양정화       │ │
│ │ 고객: 삼성            │ │
│ │ 상태: 진행 | 1억원    │ │
│ └───────────────────────┘ │
│ ┌───────────────────────┐ │
│ │ □ 계약번호: 20250110  │ │
│ │ 계약명: 오염조사       │ │
│ │ ...                  │ │
│ └───────────────────────┘ │
└───────────────────────────┘
```

---

## 2. 기술 스택

### 2.1 프레임워크 & 라이브러리
```json
{
  "framework": "Next.js 15.5.4 (App Router)",
  "react": "19.1.0",
  "typescript": "5.x",
  "database": "Supabase (PostgreSQL)",
  "ui": "Radix UI + shadcn/ui",
  "table": "TanStack Table v8",
  "forms": "React Hook Form + Zod",
  "styling": "Tailwind CSS v4"
}
```

### 2.2 참고할 공식 문서
- Next.js 15 Server Actions: https://nextjs.org/docs/app/getting-started/updating-data
- TanStack Table v8: https://tanstack.com/table/latest/docs/introduction
- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/nextjs
- React Hook Form: https://react-hook-form.com/
- Zod: https://zod.dev/

---

## 3. 데이터베이스 설계

### 3.1 ERD (Entity Relationship Diagram)

```
┌─────────────────┐         ┌─────────────────┐
│   customers     │         │   orders        │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │◄────┬──►│ id (PK)         │
│ name            │     │   │ order_number    │
│ customer_type   │     │   │ contract_type   │
│ business_number │     │   │ contract_status │
│ ...             │     │   │ customer_id (FK)│
└─────────────────┘     │   │ parent_order_id │
                        │   │ ...             │
                        │   └─────────────────┘
                        │          │
                        │          │ 1:N
                        │          ▼
                        │   ┌──────────────────┐
                        │   │ order_pollutants │
                        │   ├──────────────────┤
                        │   │ id (PK)          │
                        │   │ order_id (FK)    │
                        │   │ pollutant_id (FK)│
                        │   │ concentration    │
                        │   │ group_name       │
                        │   └──────────────────┘
                        │          │
                        │          │ N:1
                        │          ▼
                        │   ┌──────────────────┐
                        │   │   pollutants     │
                        └──►├──────────────────┤
                            │ id (PK)          │
                            │ name             │
                            │ category         │
                            │ region_1_std     │
                            │ region_2_std     │
                            │ region_3_std     │
                            │ unit             │
                            │ sort_order       │
                            └──────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ order_methods   │         │   methods       │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ id (PK)         │
│ order_id (FK)   │◄────────│ name            │
│ method_id (FK)  │         │ description     │
└─────────────────┘         │ sort_order      │
                            └─────────────────┘

┌─────────────────┐
│     users       │
├─────────────────┤
│ id (PK)         │
│ name            │
│ email           │
│ role            │
└─────────────────┘
```

### 3.2 테이블 정의

#### 3.2.1 orders (수주 테이블)

**테이블 용도**: 수주 계약의 기본 정보를 저장하는 메인 테이블

**주요 컬럼**:
- `order_number`: 계약번호 (YYYYMMDDNN 형식, 자동 생성)
- `contract_type`: 신규(new) 또는 변경(change)
- `contract_status`: 견적, 계약, 진행, 완료
- `parent_order_id`: 변경 계약의 경우 원본 계약 참조

```sql
-- orders 테이블 생성
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL, -- 계약번호 (자동생성: YYYYMMDDNN)

  -- 계약 기본 정보
  contract_type VARCHAR(20) NOT NULL DEFAULT 'new', -- 신규(new), 변경(change)
  contract_status VARCHAR(20) NOT NULL DEFAULT 'quotation', -- 견적, 계약, 진행, 완료
  business_type VARCHAR(20) NOT NULL DEFAULT 'civilian', -- 민수, 관수
  pricing_type VARCHAR(20) NOT NULL DEFAULT 'total', -- 총액계약, 단가계약

  -- 계약 상세
  contract_name TEXT NOT NULL,
  contract_date DATE NOT NULL,
  contract_amount DECIMAL(15, 2) NOT NULL DEFAULT 0, -- 계약금액(공급가)

  -- 관계형 데이터
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  verification_company_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_order_id UUID REFERENCES orders(id) ON DELETE CASCADE,

  -- 기타 정보
  export_type VARCHAR(20) NOT NULL DEFAULT 'on_site', -- 부지내, 반출
  notes TEXT, -- 비고
  attachments JSONB DEFAULT '[]'::jsonb, -- 첨부파일

  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 인덱스 생성
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_contract_date ON orders(contract_date DESC);
CREATE INDEX idx_orders_contract_status ON orders(contract_status);
CREATE INDEX idx_orders_parent_order_id ON orders(parent_order_id);

-- RLS (Row Level Security) 설정
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 인증된 사용자는 조회 가능
CREATE POLICY "Anyone can view orders" ON orders
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 정책: 관리자만 INSERT/UPDATE/DELETE 가능
CREATE POLICY "Only admins can modify orders" ON orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

**계약번호 자동 생성 트리거**:

```sql
-- 계약번호 자동 생성 함수
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  date_prefix VARCHAR(8);
  sequence_num INTEGER;
  new_order_number VARCHAR(20);
BEGIN
  -- 계약일 기준으로 YYYYMMDD 형식의 prefix 생성
  date_prefix := TO_CHAR(NEW.contract_date, 'YYYYMMDD');

  -- 해당 날짜의 마지막 시퀀스 번호 조회
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM orders
  WHERE order_number LIKE date_prefix || '%';

  -- 새 계약번호 생성 (YYYYMMDDNN 형식)
  new_order_number := date_prefix || LPAD(sequence_num::TEXT, 2, '0');

  NEW.order_number := new_order_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trg_generate_order_number
BEFORE INSERT ON orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
EXECUTE FUNCTION generate_order_number();

-- updated_at 자동 갱신 트리거
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

#### 3.2.2 pollutants (오염물질 마스터)

**테이블 용도**: 23가지 오염물질 마스터 데이터

**카테고리**:
1. 중금속류 (8종)
2. 유류 (5종)
3. 염소계 유기화합물 (5종)
4. 그 외 (5종)

```sql
-- pollutants 테이블 생성
CREATE TABLE pollutants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE, -- 오염물질명
  category VARCHAR(50) NOT NULL, -- 분류

  -- 정화기준 (mg/kg)
  region_1_standard DECIMAL(10, 2), -- 1지역 기준
  region_2_standard DECIMAL(10, 2), -- 2지역 기준
  region_3_standard DECIMAL(10, 2), -- 3지역 기준

  unit VARCHAR(20) NOT NULL DEFAULT 'mg/kg', -- 단위
  sort_order INTEGER NOT NULL DEFAULT 0, -- 정렬 순서

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_pollutants_category ON pollutants(category);
CREATE INDEX idx_pollutants_sort_order ON pollutants(sort_order);

-- RLS
ALTER TABLE pollutants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pollutants" ON pollutants
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify pollutants" ON pollutants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 초기 데이터 삽입
INSERT INTO pollutants (name, category, region_1_standard, region_2_standard, region_3_standard, sort_order) VALUES
-- 중금속류
('카드뮴', '중금속류', 4, 10, 60, 1),
('구리', '중금속류', 150, 500, 2000, 2),
('비소', '중금속류', 25, 50, 200, 3),
('수은', '중금속류', 4, 10, 20, 4),
('납', '중금속류', 200, 400, 700, 5),
('6가크롬', '중금속류', 5, 15, 40, 6),
('아연', '중금속류', 300, 600, 2000, 7),
('니켈', '중금속류', 100, 200, 500, 8),

-- 유류
('TPH', '유류', 500, 800, 2000, 9),
('벤젠', '유류', 1, 3, 15, 10),
('톨루엔', '유류', 20, 60, 200, 11),
('에틸벤젠', '유류', 50, 340, 600, 12),
('크실렌', '유류', 15, 45, 300, 13),

-- 염소계 유기화합물
('TCE', '염소계 유기화합물', 8, 40, 220, 14),
('PCE', '염소계 유기화합물', 4, 25, 180, 15),
('1,2-디클로로에탄', '염소계 유기화합물', NULL, NULL, NULL, 16),
('PCBs', '염소계 유기화합물', NULL, NULL, NULL, 17),
('다이옥신', '염소계 유기화합물', NULL, NULL, NULL, 18),

-- 그 외
('벤조(a)피렌', '그 외', 0.7, 2, 7, 19),
('불소', '그 외', 400, 400, 800, 20),
('유기인', '그 외', 10, 10, 30, 21),
('시안', '그 외', 2, 2, 120, 22),
('페놀류', '그 외', 4, 4, 20, 23);
```

#### 3.2.3 order_pollutants (수주-오염물질 연결 테이블)

**테이블 용도**: 수주와 오염물질의 다대다 관계를 저장하고, 각 오염물질의 농도를 기록

```sql
-- order_pollutants 테이블 생성
CREATE TABLE order_pollutants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  pollutant_id UUID NOT NULL REFERENCES pollutants(id) ON DELETE RESTRICT,

  concentration DECIMAL(10, 2) NOT NULL, -- 농도 (소수점 둘째자리)
  group_name VARCHAR(100), -- 그룹핑 이름 (복수 선택시 사용)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(order_id, pollutant_id)
);

-- 인덱스
CREATE INDEX idx_order_pollutants_order_id ON order_pollutants(order_id);
CREATE INDEX idx_order_pollutants_pollutant_id ON order_pollutants(pollutant_id);

-- RLS
ALTER TABLE order_pollutants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view order_pollutants" ON order_pollutants
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify order_pollutants" ON order_pollutants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

#### 3.2.4 methods (정화방법 마스터)

**테이블 용도**: 6가지 정화방법 마스터 데이터

```sql
-- methods 테이블 생성
CREATE TABLE methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE, -- 정화방법명
  description TEXT, -- 설명
  sort_order INTEGER NOT NULL DEFAULT 0, -- 정렬 순서

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_methods_sort_order ON methods(sort_order);

-- RLS
ALTER TABLE methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view methods" ON methods
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify methods" ON methods
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 초기 데이터 삽입
INSERT INTO methods (name, description, sort_order) VALUES
('토양경작법', '토양을 경작하여 오염물질을 분해하는 방법', 1),
('토양세척법', '토양을 물로 세척하여 오염물질을 제거하는 방법', 2),
('토양세정법', '화학약품을 사용하여 토양을 세정하는 방법', 3),
('열탈착법', '고온으로 가열하여 오염물질을 분리하는 방법', 4),
('SVE', 'Soil Vapor Extraction - 토양 증기 추출법', 5),
('지중 화학적 산화/환원법', '지중에서 화학반응을 통해 오염물질을 처리하는 방법', 6);
```

#### 3.2.5 order_methods (수주-정화방법 연결 테이블)

```sql
-- order_methods 테이블 생성
CREATE TABLE order_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method_id UUID NOT NULL REFERENCES methods(id) ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(order_id, method_id)
);

-- 인덱스
CREATE INDEX idx_order_methods_order_id ON order_methods(order_id);
CREATE INDEX idx_order_methods_method_id ON order_methods(method_id);

-- RLS
ALTER TABLE order_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view order_methods" ON order_methods
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify order_methods" ON order_methods
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

#### 3.2.6 customers 테이블 수정

**customer_type 컬럼 추가**: 고객을 발주처, 검증업체, 또는 둘 다로 구분

```sql
-- customers 테이블에 customer_type 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'customer_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN customer_type VARCHAR(20) NOT NULL DEFAULT 'client';
  END IF;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);

-- customer_type 값: 'client'(발주처), 'verification'(검증업체), 'both'(둘 다)
```

---

## 4. 구현 체크리스트

### 4.1 데이터베이스 구축
- [ ] Supabase 프로젝트에서 SQL 쿼리 실행
- [ ] orders 테이블 생성
- [ ] pollutants 테이블 생성 및 초기 데이터 삽입 (23개)
- [ ] methods 테이블 생성 및 초기 데이터 삽입 (6개)
- [ ] order_pollutants 테이블 생성
- [ ] order_methods 테이블 생성
- [ ] customers 테이블에 customer_type 컬럼 추가
- [ ] RLS 정책 설정 확인
- [ ] 트리거 동작 테스트 (계약번호 자동 생성)
- [ ] Supabase 타입 생성: `pnpm types:gen`

### 4.2 데이터베이스 테스트
```sql
-- 테스트 데이터 삽입 예시
INSERT INTO orders (
  contract_name,
  contract_date,
  contract_amount,
  customer_id,
  manager_id,
  contract_type,
  contract_status,
  business_type,
  pricing_type,
  export_type
) VALUES (
  '테스트 계약',
  '2025-01-11',
  100000000,
  '고객ID',
  '담당자ID',
  'new',
  'quotation',
  'civilian',
  'total',
  'on_site'
);

-- 계약번호 자동 생성 확인
SELECT order_number, contract_name FROM orders ORDER BY created_at DESC LIMIT 1;
-- 예상 결과: order_number = '2025011101'

-- 오염물질 및 정화방법 확인
SELECT COUNT(*) FROM pollutants; -- 23개
SELECT COUNT(*) FROM methods; -- 6개
```

---

## 다음 문서

👉 **Part 2: Server Actions 및 TypeScript 타입** 문서를 참고하여 백엔드 로직을 구현하세요.

