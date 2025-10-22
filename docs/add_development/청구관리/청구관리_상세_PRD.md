# 청구관리 시스템 PRD (Product Requirements Document)

> **작성일**: 2025년 1월 20일
> **대상**: 주니어 개발자도 구현 가능한 상세 가이드
> **프로젝트**: 인광 ERP - 재무관리 모듈
> **기술 스택**: Next.js 15.5.4, React 19, TypeScript 5.x, Supabase, TanStack Table v8

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택 분석](#2-기술-스택-분석)
3. [데이터베이스 설계](#3-데이터베이스-설계)
4. [UI/UX 설계](#4-uiux-설계)
5. [구현 가이드](#5-구현-가이드)
6. [테스트 시나리오](#6-테스트-시나리오)
7. [배포 및 검증](#7-배포-및-검증)

---

## 1. 프로젝트 개요

### 1.1 목표

**수주관리(orders)와 연동**되는 **청구관리(billings)** 기능을 구현하여, 계약금/중도금/잔금의 청구 및 수금 관리를 효율화합니다.

### 1.2 핵심 요구사항

| 요구사항 | 설명 |
|---------|------|
| **청구 생성** | 수주(신규수주만)를 기반으로 청구 데이터 생성 |
| **청구 구분** | 계약금, 중도금, 잔금 3단계 구분 |
| **자동 번호** | 청구번호 자동 생성 (예: `BIL-2025-0001`) |
| **계산서 관리** | 발행/미발행 상태 관리 |
| **수금 예정일** | 예상 수금일 입력 및 추적 |
| **비고** | 수주관리와 동일한 UX (Badge + Popover) |

### 1.3 사용자 스토리

```
AS A 재무 담당자
I WANT TO 수주 계약을 기반으로 청구서를 생성하고 관리
SO THAT 계약금/중도금/잔금의 청구 및 수금 현황을 정확히 추적할 수 있다
```

---

## 2. 기술 스택 분석

### 2.1 프로젝트 기술 스택 (2025년 1월 기준)

#### Core Framework
- **Next.js 15.5.4** - App Router, Turbopack Beta (4배 빠른 빌드)
- **React 19.1.0** - 최신 안정 버전
- **TypeScript 5.x** - Strict mode 활성화

#### 데이터 관리
- **Supabase** - PostgreSQL + RLS (Row Level Security)
- **Server Actions** - Next.js 15 패턴 (`'use server'` 디렉티브)
- **TanStack Table v8** - 고성능 데이터 테이블

#### UI/UX
- **Tailwind CSS v4.0** - Rust 기반 엔진 (5배 빠른 빌드)
- **Radix UI + shadcn/ui** - 접근성 준수 컴포넌트
- **Lucide React** - 최적화된 SVG 아이콘

### 2.2 프로젝트 핵심 패턴

#### Pattern 1: Server Actions (Next.js 15)

**⚠️ Critical**: `'use server'` 사용 시 destructuring export 불가

```typescript
// ❌ 잘못된 예시
export const { getAll, create } = createCrudActions('billings');

// ✅ 올바른 예시 - 명시적 async 함수 래퍼
const crudActions = createCrudActions<Billing>('billings', ['/inkwang-es/finance/billings']);

export async function getAllBillings(orderBy?: { column: string; desc: boolean }) {
  return crudActions.getAll(orderBy);
}

export async function createBilling(data: Partial<BillingFormData>) {
  return crudActions.create(data);
}
```

#### Pattern 2: Component Separation (관심사 분리)

**복잡한 테이블 컴포넌트 분리 패턴** (수주관리 참고):

```
billings/
├── page.tsx                      # 서버 컴포넌트 (데이터 페칭)
├── billings-table.tsx            # 메인 테이블 컴포넌트 (오케스트레이션)
├── billing-columns.tsx           # 컬럼 정의
├── hooks/
│   ├── useBillingData.ts        # 데이터 관리 (관계형 데이터 로딩)
│   └── useBillingActions.ts     # 액션 관리 (CRUD 로직)
└── components/
    └── BillingToolbar.tsx       # 툴바 컴포넌트
```

**분리 효과**:
- 코드 라인 50% 이상 감소
- 재사용성 향상 (훅과 컴포넌트 독립 재사용)
- 테스트 용이성 (각 모듈 독립 테스트)
- 유지보수성 향상 (명확한 책임 분리)

#### Pattern 3: Data Table with Editable Cells

**인라인 편집 패턴** (TanStack Table v8 공식 패턴):

```typescript
// 1. 로컬 상태로 입력값 관리
const [value, setValue] = React.useState(initialValue);

// 2. blur 시 서버 업데이트
const handleSave = async () => {
  await onUpdate(rowIndex, columnId, value);
};

// 3. initialValue 변경 시 로컬 상태 동기화
React.useEffect(() => {
  setValue(initialValue);
}, [initialValue]);
```

**메모이제이션 필수** (무한 렌더링 방지):

```typescript
const data = useMemo(() => billings, [billings]);

const columns = useMemo<ColumnDef<Billing>[]>(() => [
  {
    accessorKey: 'billing_date',
    cell: ({ row }) => (
      <EditableDateCell
        value={row.getValue('billing_date')}
        onUpdate={handleUpdateCell}
      />
    ),
  },
], [handleUpdateCell]);
```

---

## 3. 데이터베이스 설계

### 3.1 ERD (Entity-Relationship Diagram)

```
orders (수주)                billings (청구)
┌─────────────┐            ┌─────────────────────┐
│ id (PK)     │────────┐   │ id (PK)             │
│ order_number│        │   │ billing_number      │
│ contract_name│       └──→│ order_id (FK)       │
│ customer_id │            │ billing_date        │
│ contract_type│           │ customer_id (FK)    │
│ ...         │            │ billing_type        │
└─────────────┘            │ billing_amount      │
                           │ expected_payment_date│
                           │ invoice_status      │
                           │ notes               │
                           │ created_at          │
                           │ updated_at          │
                           └─────────────────────┘
```

### 3.2 테이블 스키마

#### billings 테이블

```sql
CREATE TABLE billings (
  -- 기본 정보
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_number TEXT NOT NULL UNIQUE, -- 청구번호 (자동생성)
  billing_date DATE NOT NULL, -- 청구일

  -- 외래 키
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,

  -- 청구 상세
  billing_type TEXT NOT NULL CHECK (billing_type IN ('contract', 'interim', 'final')),
  billing_amount NUMERIC(15, 2) NOT NULL CHECK (billing_amount >= 0),
  expected_payment_date DATE NOT NULL, -- 수금예정일
  invoice_status TEXT NOT NULL DEFAULT 'not_issued' CHECK (invoice_status IN ('issued', 'not_issued')),

  -- 비고
  notes TEXT,

  -- 메타 데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 (성능 최적화)
CREATE INDEX idx_billings_order_id ON billings(order_id);
CREATE INDEX idx_billings_customer_id ON billings(customer_id);
CREATE INDEX idx_billings_billing_date ON billings(billing_date);
CREATE INDEX idx_billings_expected_payment_date ON billings(expected_payment_date);

-- 트리거 (updated_at 자동 갱신)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billings_updated_at
  BEFORE UPDATE ON billings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 청구번호 자동 생성 함수
CREATE OR REPLACE FUNCTION generate_billing_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  -- 현재 연도 추출
  year_str := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- 해당 연도의 청구 건수 조회
  SELECT COUNT(*) + 1
  INTO seq_num
  FROM billings
  WHERE billing_number LIKE 'BIL-' || year_str || '-%';

  -- 청구번호 생성 (예: BIL-2025-0001)
  new_number := 'BIL-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');

  NEW.billing_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_billing_number
  BEFORE INSERT ON billings
  FOR EACH ROW
  WHEN (NEW.billing_number IS NULL OR NEW.billing_number = '')
  EXECUTE FUNCTION generate_billing_number();
```

### 3.3 RLS (Row Level Security) 정책

```sql
-- RLS 활성화
ALTER TABLE billings ENABLE ROW LEVEL SECURITY;

-- SELECT 정책: 모든 인증된 사용자가 조회 가능
CREATE POLICY "billings_select_policy"
ON billings FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT 정책: admin, manager 역할만 가능
CREATE POLICY "billings_insert_policy"
ON billings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);

-- UPDATE 정책: admin, manager 역할만 가능
CREATE POLICY "billings_update_policy"
ON billings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);

-- DELETE 정책: admin 역할만 가능
CREATE POLICY "billings_delete_policy"
ON billings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
```

### 3.4 TypeScript 타입 정의

#### src/types/database.ts (Supabase 자동 생성)

```typescript
// Supabase CLI로 자동 생성 (pnpm types:gen)
export type Billing = Database['public']['Tables']['billings']['Row'];
export type BillingInsert = Database['public']['Tables']['billings']['Insert'];
export type BillingUpdate = Database['public']['Tables']['billings']['Update'];
```

#### src/types/index.ts (애플리케이션 타입)

```typescript
// Enum 타입
export type BillingType = 'contract' | 'interim' | 'final'; // 계약금, 중도금, 잔금
export type InvoiceStatus = 'issued' | 'not_issued'; // 발행, 미발행

/**
 * 청구 상세 타입 (JOIN된 데이터 포함)
 */
export type BillingWithDetails = Billing & {
  order: Pick<Order, 'id' | 'order_number' | 'contract_name'> | null;
  customer: Pick<Customer, 'id' | 'name' | 'business_number'> | null;
};

/**
 * 청구 생성/수정 폼 데이터
 */
export type BillingFormData = {
  billing_date: string; // YYYY-MM-DD
  order_id: string;
  customer_id: string; // 선택한 수주의 고객 자동 입력
  billing_type: BillingType;
  billing_amount: number;
  expected_payment_date: string; // YYYY-MM-DD
  invoice_status: InvoiceStatus;
  notes: string | null;
};
```

---

## 4. UI/UX 설계

### 4.1 페이지 구조

```
src/app/(dashboard)/inkwang-es/finance/billings/
├── page.tsx                    # 서버 컴포넌트 (데이터 페칭)
├── billings-table.tsx          # 메인 테이블 컴포넌트
├── billing-columns.tsx         # 컬럼 정의
├── hooks/
│   ├── useBillingData.ts      # 데이터 로딩 및 상태 관리
│   └── useBillingActions.ts   # CRUD 액션 관리
└── components/
    └── BillingToolbar.tsx     # 툴바 컴포넌트
```

### 4.2 와이어프레임

#### 데스크톱 뷰

```
┌────────────────────────────────────────────────────────────┐
│ 청구관리                                    [추가] [Excel] [인쇄] [삭제] │
├────────────────────────────────────────────────────────────┤
│ 🔍 계약명으로 검색...                                      │
├────┬──────┬──────┬────────┬──────┬──────┬──────┬─────────┤
│ ☑  │청구번호│청구일 │ 계약명   │고객명 │청구구분│청구금액│수금예정일│
├────┼──────┼──────┼────────┼──────┼──────┼──────┼─────────┤
│ ☐  │BIL-  │2025- │OO정화  │OO건설│계약금 │50,000│2025-   │
│    │2025- │01-15 │계약    │      │      │,000원│02-15   │
│    │0001  │      │        │      │      │      │        │
├────┼──────┼──────┼────────┼──────┼──────┼──────┼─────────┤
│ ☐  │BIL-  │2025- │XX환경  │XX기업│중도금 │30,000│2025-   │
│    │2025- │01-20 │사업    │      │      │,000원│03-01   │
│    │0002  │      │        │      │      │      │        │
└────┴──────┴──────┴────────┴──────┴──────┴──────┴─────────┘
```

#### 모바일 뷰 (Card Layout)

```
┌──────────────────────────────┐
│ 청구관리            [추가] [⋮] │
├──────────────────────────────┤
│ 🔍 검색...                    │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ BIL-2025-0001           │ │
│ │ OO정화계약               │ │
│ │ 고객: OO건설             │ │
│ │ 청구일: 2025-01-15       │ │
│ │ 청구구분: 계약금          │ │
│ │ 청구금액: 50,000,000원   │ │
│ │ 수금예정일: 2025-02-15   │ │
│ │ 계산서: 발행             │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ BIL-2025-0002           │ │
│ │ XX환경사업               │ │
│ │ ...                      │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

### 4.3 컬럼 정의

| 컬럼명 | 타입 | 편집 방식 | 설명 |
|--------|------|----------|------|
| **체크박스** | - | - | 행 선택 (삭제용) |
| **청구번호** | text | - | 자동 생성 (읽기 전용) |
| **청구일** | date | `EditableDateCell` | 날짜 입력 (더블클릭 편집) |
| **계약명** | text | `EditableSelectCell` | 수주(신규수주만) Combobox 선택 |
| **고객명** | text | - | 선택한 계약의 고객 자동 입력 (읽기 전용) |
| **청구구분** | enum | `EditableSelectCell` | 계약금/중도금/잔금 Select |
| **청구금액** | number | `EditableCell` | 숫자 입력 (소수점 없음, 콤마 표시) |
| **수금예정일** | date | `EditableDateCell` | 날짜 입력 (더블클릭 편집) |
| **계산서** | enum | `EditableSelectCell` | 발행/미발행 Select |
| **비고** | text | `EditableNotesCell` | Badge + Popover (수주관리 패턴) |

### 4.4 공통 컴포넌트 활용

**프로젝트에 이미 구현된 공통 컴포넌트 활용**:

| 컴포넌트 | 위치 | 용도 |
|---------|------|------|
| **DataTable** | `components/common/data-table.tsx` | 메인 테이블 (TanStack Table v8) |
| **EditableCell** | `components/common/editable-cell.tsx` | 텍스트/숫자 인라인 편집 |
| **EditableSelectCell** | `components/common/editable-select-cell.tsx` | Select/Combobox 편집 |
| **EditableDateCell** | `components/common/editable-date-cell.tsx` | 날짜 인라인 편집 |
| **EditableNotesCell** | `components/common/editable-notes-cell.tsx` | 비고 Badge + Popover |
| **CrudTableToolbar** | `components/common/crud-table-toolbar.tsx` | 추가/삭제/Excel/인쇄 툴바 |
| **ExportToExcel** | `components/common/export-to-excel.tsx` | Excel 내보내기 |
| **PrintTable** | `components/common/print-table.tsx` | 테이블 인쇄 |
| **DeleteConfirmDialog** | `components/dialogs/delete-confirm-dialog.tsx` | 삭제 확인 다이얼로그 |

---

## 5. 구현 가이드

### 5.1 마이그레이션 파일 생성

#### 파일 경로
```
supabase/migrations/20250120_create_billings_table.sql
```

#### 전체 코드

```sql
-- ============================================
-- 청구관리 테이블 생성
-- ============================================

-- billings 테이블 생성
CREATE TABLE billings (
  -- 기본 정보
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_number TEXT NOT NULL UNIQUE,
  billing_date DATE NOT NULL,

  -- 외래 키
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,

  -- 청구 상세
  billing_type TEXT NOT NULL CHECK (billing_type IN ('contract', 'interim', 'final')),
  billing_amount NUMERIC(15, 2) NOT NULL CHECK (billing_amount >= 0),
  expected_payment_date DATE NOT NULL,
  invoice_status TEXT NOT NULL DEFAULT 'not_issued' CHECK (invoice_status IN ('issued', 'not_issued')),

  -- 비고
  notes TEXT,

  -- 메타 데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX idx_billings_order_id ON billings(order_id);
CREATE INDEX idx_billings_customer_id ON billings(customer_id);
CREATE INDEX idx_billings_billing_date ON billings(billing_date);
CREATE INDEX idx_billings_expected_payment_date ON billings(expected_payment_date);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_billings_updated_at
  BEFORE UPDATE ON billings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 청구번호 자동 생성 함수
CREATE OR REPLACE FUNCTION generate_billing_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  year_str := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COUNT(*) + 1
  INTO seq_num
  FROM billings
  WHERE billing_number LIKE 'BIL-' || year_str || '-%';

  new_number := 'BIL-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');

  NEW.billing_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_billing_number
  BEFORE INSERT ON billings
  FOR EACH ROW
  WHEN (NEW.billing_number IS NULL OR NEW.billing_number = '')
  EXECUTE FUNCTION generate_billing_number();

-- RLS 정책
ALTER TABLE billings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billings_select_policy"
ON billings FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "billings_insert_policy"
ON billings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);

CREATE POLICY "billings_update_policy"
ON billings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);

CREATE POLICY "billings_delete_policy"
ON billings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 코멘트
COMMENT ON TABLE billings IS '청구 관리 테이블';
COMMENT ON COLUMN billings.billing_number IS '청구번호 (자동생성, 예: BIL-2025-0001)';
COMMENT ON COLUMN billings.billing_type IS '청구구분 (contract: 계약금, interim: 중도금, final: 잔금)';
COMMENT ON COLUMN billings.invoice_status IS '계산서 상태 (issued: 발행, not_issued: 미발행)';
```

### 5.2 타입 정의

#### 1단계: Supabase 타입 재생성

```bash
pnpm types:gen
```

이 명령어는 `src/types/database.ts`를 자동으로 업데이트합니다.

#### 2단계: 애플리케이션 타입 추가

**파일**: `src/types/index.ts`

```typescript
// ============================================
// 청구관리 관련 타입
// ============================================

// 기본 Row 타입
export type Billing = Database['public']['Tables']['billings']['Row'];
export type BillingInsert = Database['public']['Tables']['billings']['Insert'];
export type BillingUpdate = Database['public']['Tables']['billings']['Update'];

// Enum 타입
export type BillingType = 'contract' | 'interim' | 'final';
export type InvoiceStatus = 'issued' | 'not_issued';

/**
 * 청구 상세 타입 (JOIN된 데이터 포함)
 */
export type BillingWithDetails = Billing & {
  order: Pick<Order, 'id' | 'order_number' | 'contract_name'> | null;
  customer: Pick<Customer, 'id' | 'name' | 'business_number'> | null;
};

/**
 * 청구 생성/수정 폼 데이터
 */
export type BillingFormData = {
  billing_date: string;
  order_id: string;
  customer_id: string;
  billing_type: BillingType;
  billing_amount: number;
  expected_payment_date: string;
  invoice_status: InvoiceStatus;
  notes: string | null;
};
```

### 5.3 Server Actions 구현

#### 파일: `src/actions/billings.ts`

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createCrudActions } from '@/lib/server-actions';
import type { BillingWithDetails, BillingFormData } from '@/types';

// ============================================
// CRUD Actions (팩토리 패턴)
// ============================================

const crudActions = createCrudActions<BillingWithDetails>(
  'billings',
  ['/inkwang-es/finance/billings']
);

// ✅ 올바른 패턴: 명시적 async 함수 래퍼
export async function getAllBillings(orderBy?: { column: string; desc: boolean }) {
  return crudActions.getAll(orderBy);
}

export async function createBilling(data: Partial<BillingFormData>) {
  return crudActions.create(data);
}

export async function updateBilling(id: string, data: Partial<BillingFormData>) {
  return crudActions.update(id, data);
}

export async function deleteBilling(id: string) {
  return crudActions.remove(id);
}

// ============================================
// 특수 조회 함수
// ============================================

/**
 * 청구 목록 조회 (JOIN 포함)
 */
export async function getBillingsWithDetails() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('billings')
    .select(`
      *,
      order:orders!billings_order_id_fkey (
        id,
        order_number,
        contract_name
      ),
      customer:customers!billings_customer_id_fkey (
        id,
        name,
        business_number
      )
    `)
    .order('billing_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('청구 목록 조회 오류:', error);
    return { data: [], error: error.message };
  }

  return { data: data as BillingWithDetails[], error: null };
}

/**
 * 신규 수주 목록 조회 (청구 생성 시 선택용)
 * contract_type = 'new'인 수주만 반환
 */
export async function getNewOrdersForBilling() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, contract_name, customer_id')
    .eq('contract_type', 'new')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('신규 수주 목록 조회 오류:', error);
    return [];
  }

  return data;
}

/**
 * 고객 목록 조회 (간소화)
 */
export async function getCustomersForBilling() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customers')
    .select('id, name, business_number')
    .order('name');

  if (error) {
    console.error('고객 목록 조회 오류:', error);
    return [];
  }

  return data;
}
```

### 5.4 페이지 컴포넌트 구현

#### 파일: `src/app/(dashboard)/inkwang-es/finance/billings/page.tsx`

```typescript
import { getBillingsWithDetails } from '@/actions/billings';
import { BillingsTable } from './billings-table';

export const metadata = {
  title: '청구관리 | 인광 ERP',
  description: '청구 및 수금 관리',
};

export default async function BillingsPage() {
  const { data: billings, error } = await getBillingsWithDetails();

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-destructive">데이터 로드 오류</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">청구관리</h1>
        <p className="text-muted-foreground">계약금, 중도금, 잔금 청구 및 수금 관리</p>
      </div>

      <BillingsTable data={billings} />
    </div>
  );
}
```

### 5.5 테이블 컴포넌트 구현

#### 파일: `src/app/(dashboard)/inkwang-es/finance/billings/billings-table.tsx`

```typescript
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/common/data-table';
import { useTableState } from '@/hooks/use-table-state';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { createBillingColumns } from './billing-columns';
import { BillingToolbar } from './components/BillingToolbar';
import { useBillingData } from './hooks/useBillingData';
import { useBillingActions } from './hooks/useBillingActions';
import { deleteBilling } from '@/actions/billings';
import type { BillingWithDetails } from '@/types';

interface BillingsTableProps {
  data: BillingWithDetails[];
}

export function BillingsTable({ data }: BillingsTableProps) {
  // 테이블 상태 관리
  const tableState = useTableState<BillingWithDetails>(data);
  const {
    rowSelection,
    setRowSelection,
    deleteDialogOpen,
    setDeleteDialogOpen,
    newRowData,
    selectedCount,
    displayData,
    tableData,
    isDeleting,
    isSavingNewRow,
  } = tableState;

  // 청구 관련 데이터 및 다이얼로그 상태
  const {
    newOrders,
    customers,
  } = useBillingData(displayData);

  // 청구 CRUD 작업
  const {
    handleUpdateCell,
    handleAddBilling,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
  } = useBillingActions(tableState, newOrders, customers);

  const router = useRouter();
  const { toast } = useToast();

  // 삭제 핸들러
  const handleDeleteSelected = React.useCallback(async () => {
    const selectedIds = Object.keys(rowSelection)
      .map(Number)
      .map((index) => displayData[index]?.id)
      .filter((id): id is string => !!id && !id.startsWith('temp-'));

    if (selectedIds.length === 0) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: '선택된 청구가 없습니다.',
      });
      return;
    }

    tableState.setIsDeleting(true);

    try {
      const results = await Promise.all(
        selectedIds.map((id) => deleteBilling(id))
      );

      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error);
      }

      toast({
        title: '삭제 완료',
        description: `${selectedIds.length}개의 청구가 삭제되었습니다.`,
      });

      setRowSelection({});
      setDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      tableState.setIsDeleting(false);
    }
  }, [rowSelection, displayData, tableState, toast, router, setRowSelection, setDeleteDialogOpen]);

  // 통합 업데이트 핸들러
  const handleUnifiedUpdate = React.useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const billing = displayData[rowIndex];
      if (!billing) return;

      if (billing.id?.startsWith('temp-')) {
        handleUpdateNewRow(columnId, value);
      } else {
        const actualIndex = tableData.findIndex((b) => b.id === billing.id);
        if (actualIndex !== -1) {
          await handleUpdateCell(actualIndex, columnId, value);
        }
      }
    },
    [displayData, tableData, handleUpdateCell, handleUpdateNewRow]
  );

  // 컬럼 정의
  const columns = React.useMemo(
    () =>
      createBillingColumns({
        newOrders,
        customers,
        onUpdateCell: handleUnifiedUpdate,
      }),
    [newOrders, customers, handleUnifiedUpdate]
  );

  return (
    <>
      {/* 데스크톱 테이블 */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={displayData}
          searchKey="billing_number"
          searchPlaceholder="청구번호로 검색..."
          toolbar={
            <BillingToolbar
              data={tableData}
              selectedCount={selectedCount}
              hasNewRow={!!newRowData}
              isSavingNewRow={isSavingNewRow}
              isDeleting={isDeleting}
              onAdd={handleAddBilling}
              onDelete={() => setDeleteDialogOpen(true)}
              onSaveNewRow={handleSaveNewRow}
              onCancelNewRow={handleCancelNewRow}
            />
          }
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
        />
      </div>

      {/* 모바일 카드 뷰 (필요 시 추가 구현) */}
      <div className="md:hidden">
        {/* MobileBillingCard 컴포넌트 구현 (선택사항) */}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        title="청구 삭제"
        description={`선택한 ${selectedCount}개의 청구를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
      />
    </>
  );
}
```

### 5.6 컬럼 정의 구현

#### 파일: `src/app/(dashboard)/inkwang-es/finance/billings/billing-columns.tsx`

```typescript
'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/common/data-table';
import { EditableCell } from '@/components/common/editable-cell';
import { EditableSelectCell } from '@/components/common/editable-select-cell';
import { EditableDateCell } from '@/components/common/editable-date-cell';
import { EditableNotesCell } from '@/components/common/editable-notes-cell';
import type { BillingWithDetails, Customer } from '@/types';

interface BillingColumnsProps {
  newOrders: Array<{ id: string; order_number: string; contract_name: string; customer_id: string }>;
  customers: Pick<Customer, 'id' | 'name'>[];
  onUpdateCell: (rowIndex: number, columnId: string, value: string) => Promise<void>;
}

export function createBillingColumns({
  newOrders,
  customers,
  onUpdateCell,
}: BillingColumnsProps): ColumnDef<BillingWithDetails>[] {
  // 청구구분 옵션
  const billingTypeOptions = [
    { id: 'contract', name: '계약금' },
    { id: 'interim', name: '중도금' },
    { id: 'final', name: '잔금' },
  ];

  // 계산서 상태 옵션
  const invoiceStatusOptions = [
    { id: 'issued', name: '발행' },
    { id: 'not_issued', name: '미발행' },
  ];

  return [
    // 체크박스 컬럼
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="모두 선택"
        />
      ),
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');

        if (isNewRow) {
          return <div className="w-5" />;
        }

        return (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="행 선택"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
      size: 50,
      minSize: 50,
      maxSize: 50,
    },
    // 청구번호 (자동 생성, 읽기 전용)
    {
      accessorKey: 'billing_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="청구번호" />,
      cell: ({ getValue }) => {
        const value = getValue<string>();
        return (
          <Badge variant="outline" className="font-mono">
            {value || '자동생성'}
          </Badge>
        );
      },
      enableSorting: true,
    },
    // 청구일
    {
      accessorKey: 'billing_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="청구일" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableDateCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="billing_date"
            onUpdate={onUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: true,
    },
    // 계약명 (신규 수주만 선택 가능)
    {
      accessorKey: 'order_id',
      header: '계약명',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableSelectCell
            value={row.original.order_id}
            rowIndex={row.index}
            columnId="order_id"
            onUpdate={onUpdateCell}
            options={newOrders.map(order => ({ id: order.id, name: order.contract_name }))}
            type="combobox"
            placeholder="계약 선택"
            searchPlaceholder="계약 검색..."
            displayValue={row.original.order?.contract_name ||
              (isNewRow && row.original.order_id && newOrders.find(o => o.id === row.original.order_id)?.contract_name)}
          />
        );
      },
      enableSorting: false,
    },
    // 고객명 (선택한 계약의 고객 자동 입력, 읽기 전용)
    {
      accessorKey: 'customer_id',
      header: '고객명',
      cell: ({ row }) => {
        const customerName = row.original.customer?.name || '-';
        return (
          <div className="text-sm" title="선택한 계약의 고객 (자동 입력)">
            {customerName}
          </div>
        );
      },
      enableSorting: false,
    },
    // 청구구분
    {
      accessorKey: 'billing_type',
      header: '청구구분',
      cell: ({ row }) => {
        const billingType = row.getValue('billing_type') as string;

        const getBadgeVariant = (type: string) => {
          switch (type) {
            case 'contract': return 'default' as const;
            case 'interim': return 'secondary' as const;
            case 'final': return 'outline' as const;
            default: return 'outline' as const;
          }
        };

        const getLabel = (type: string) => {
          switch (type) {
            case 'contract': return '계약금';
            case 'interim': return '중도금';
            case 'final': return '잔금';
            default: return type;
          }
        };

        return (
          <EditableSelectCell
            value={billingType}
            rowIndex={row.index}
            columnId="billing_type"
            onUpdate={onUpdateCell}
            options={billingTypeOptions}
            type="select"
            placeholder="청구구분"
            displayValue={
              <Badge variant={getBadgeVariant(billingType)}>
                {getLabel(billingType)}
              </Badge>
            }
          />
        );
      },
      enableSorting: false,
    },
    // 청구금액
    {
      accessorKey: 'billing_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="청구금액" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const amount = getValue<number>();

        return (
          <EditableCell
            value={amount?.toString() || '0'}
            rowIndex={row.index}
            columnId="billing_amount"
            type="number"
            onUpdate={onUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
            formatDisplay={(value) => {
              const num = Number(value || 0);
              return num.toLocaleString() + '원';
            }}
          />
        );
      },
      enableSorting: true,
    },
    // 수금예정일
    {
      accessorKey: 'expected_payment_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="수금예정일" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableDateCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="expected_payment_date"
            onUpdate={onUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: true,
    },
    // 계산서
    {
      accessorKey: 'invoice_status',
      header: '계산서',
      cell: ({ row }) => {
        const status = row.getValue('invoice_status') as string;

        const getBadgeVariant = (s: string) => {
          return s === 'issued' ? 'default' : 'outline';
        };

        const getLabel = (s: string) => {
          return s === 'issued' ? '발행' : '미발행';
        };

        return (
          <EditableSelectCell
            value={status}
            rowIndex={row.index}
            columnId="invoice_status"
            onUpdate={onUpdateCell}
            options={invoiceStatusOptions}
            type="select"
            placeholder="계산서"
            displayValue={
              <Badge variant={getBadgeVariant(status)}>
                {getLabel(status)}
              </Badge>
            }
          />
        );
      },
      enableSorting: false,
    },
    // 비고 (Badge + Popover)
    {
      accessorKey: 'notes',
      header: '비고',
      cell: ({ row }) => {
        const notes = row.getValue('notes') as string | null;

        return (
          <EditableNotesCell
            notes={notes}
            onSave={async (value) => {
              await onUpdateCell(row.index, 'notes', value);
            }}
          />
        );
      },
      enableSorting: false,
    },
  ];
}
```

### 5.7 커스텀 훅 구현

#### 파일: `src/app/(dashboard)/inkwang-es/finance/billings/hooks/useBillingData.ts`

```typescript
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getNewOrdersForBilling, getCustomersForBilling } from '@/actions/billings';
import type { BillingWithDetails, Customer } from '@/types';

/**
 * useBillingData Hook
 *
 * 청구 테이블에 필요한 관련 데이터 로딩
 */
export function useBillingData(displayData: BillingWithDetails[]) {
  const { toast } = useToast();

  // 관계형 데이터 상태
  const [newOrders, setNewOrders] = useState<Array<{ id: string; order_number: string; contract_name: string; customer_id: string }>>([]);
  const [customers, setCustomers] = useState<Pick<Customer, 'id' | 'name'>[]>([]);

  // 관계형 데이터 로드 (마운트 시 1회)
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [ordersData, customersData] = await Promise.all([
          getNewOrdersForBilling(),
          getCustomersForBilling(),
        ]);
        setNewOrders(ordersData);
        setCustomers(customersData);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '데이터 로드 실패',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        });
      }
    };
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    newOrders,
    customers,
  };
}
```

#### 파일: `src/app/(dashboard)/inkwang-es/finance/billings/hooks/useBillingActions.ts`

```typescript
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateBilling, createBilling } from '@/actions/billings';
import { useTableActions } from '@/hooks/use-table-actions';
import type { BillingWithDetails, BillingFormData, Customer } from '@/types';
import type { UseTableStateReturn } from '@/hooks/use-table-state';

/**
 * useBillingActions Hook
 *
 * 청구 테이블의 CRUD 작업 관리
 */
export function useBillingActions(
  tableState: UseTableStateReturn<BillingWithDetails>,
  newOrders: Array<{ id: string; order_number: string; contract_name: string; customer_id: string }>,
  customers: Pick<Customer, 'id' | 'name'>[]
) {
  const { toast } = useToast();
  const router = useRouter();

  const {
    tableData,
    setTableData,
    rowSelection,
    setRowSelection,
    newRowData,
    setNewRowData,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  } = tableState;

  // updateAction 래퍼
  const updateBillingWrapper = useCallback(
    async (id: string, data: Partial<BillingWithDetails>) => {
      const formData: Partial<BillingFormData> = {
        billing_date: data.billing_date,
        order_id: data.order_id,
        customer_id: data.customer_id,
        billing_type: data.billing_type as 'contract' | 'interim' | 'final' | undefined,
        billing_amount: data.billing_amount,
        expected_payment_date: data.expected_payment_date,
        invoice_status: data.invoice_status as 'issued' | 'not_issued' | undefined,
        notes: data.notes,
      };

      return await updateBilling(id, formData);
    },
    []
  );

  // createAction 래퍼
  const createBillingWrapper = useCallback(
    async (data: BillingFormData) => {
      if (!data.order_id || !data.customer_id) {
        return { error: '계약과 고객은 필수 입력 항목입니다.' };
      }

      return await createBilling(data);
    },
    []
  );

  // CRUD 액션 훅 사용
  const {
    handleUpdateCell,
    handleSaveNewRow: saveNewRowAction,
  } = useTableActions<BillingWithDetails, BillingFormData>({
    tableData,
    setTableData,
    originalData: tableState.tableData,
    updateAction: updateBillingWrapper,
    deleteAction: async () => ({ error: null }), // 삭제는 billings-table.tsx에서 처리
    createAction: createBillingWrapper,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  });

  // 청구 추가 (인라인 방식)
  const handleAddBilling = useCallback(() => {
    if (newRowData) {
      toast({
        variant: 'destructive',
        title: '추가 중인 청구가 있습니다',
        description: '현재 추가 중인 청구를 먼저 저장하거나 취소해주세요.',
      });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const defaultOrderId = newOrders[0]?.id || '';
    const defaultCustomerId = newOrders[0]?.customer_id || '';

    const newRow: Partial<BillingWithDetails> = {
      id: tempId,
      billing_number: '자동생성',
      billing_date: new Date().toISOString().split('T')[0],
      order_id: defaultOrderId,
      customer_id: defaultCustomerId,
      billing_type: 'contract',
      billing_amount: 0,
      expected_payment_date: new Date().toISOString().split('T')[0],
      invoice_status: 'not_issued',
      notes: null,
    };

    setNewRowData(newRow);
  }, [newRowData, newOrders, toast, setNewRowData]);

  // 새 행 데이터 업데이트
  const handleUpdateNewRow = useCallback(
    (field: string, value: unknown) => {
      if (!newRowData) return;

      // order_id 변경 시 customer_id 자동 설정
      if (field === 'order_id') {
        const selectedOrder = newOrders.find(o => o.id === value);
        if (selectedOrder) {
          setNewRowData({
            ...newRowData,
            order_id: value as string,
            customer_id: selectedOrder.customer_id,
          });
          return;
        }
      }

      // 타입 변환 처리
      let processedValue = value;
      if (field === 'billing_amount') {
        processedValue = typeof value === 'string' ? Number(value) || 0 : value;
      }

      setNewRowData({ ...newRowData, [field]: processedValue });
    },
    [newRowData, newOrders, setNewRowData]
  );

  // 새 행 저장
  const handleSaveNewRow = useCallback(async () => {
    if (!newRowData) return;

    const formData: BillingFormData = {
      billing_date: newRowData.billing_date || new Date().toISOString().split('T')[0],
      order_id: newRowData.order_id || '',
      customer_id: newRowData.customer_id || '',
      billing_type: (newRowData.billing_type || 'contract') as 'contract' | 'interim' | 'final',
      billing_amount: newRowData.billing_amount || 0,
      expected_payment_date: newRowData.expected_payment_date || new Date().toISOString().split('T')[0],
      invoice_status: (newRowData.invoice_status || 'not_issued') as 'issued' | 'not_issued',
      notes: newRowData.notes || null,
    };

    const result = await saveNewRowAction(
      formData,
      (data: Record<string, unknown>) => {
        if (!data.order_id) {
          return { error: '계약을 선택해주세요.' };
        }
        if (!data.customer_id) {
          return { error: '고객을 선택해주세요.' };
        }
        return true;
      }
    );

    if (result.success) {
      toast({
        title: '추가 완료',
        description: '새로운 청구가 추가되었습니다.',
      });
      setNewRowData(null);
    }
  }, [newRowData, saveNewRowAction, toast, setNewRowData]);

  // 새 행 취소
  const handleCancelNewRow = useCallback(() => {
    setNewRowData(null);
  }, [setNewRowData]);

  return {
    handleUpdateCell,
    handleAddBilling,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
  };
}
```

### 5.8 툴바 컴포넌트 구현

#### 파일: `src/app/(dashboard)/inkwang-es/finance/billings/components/BillingToolbar.tsx`

```typescript
'use client';

import * as React from 'react';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { ExportToExcel } from '@/components/common/export-to-excel';
import { PrintTable } from '@/components/common/print-table';
import type { BillingWithDetails } from '@/types';

interface BillingToolbarProps {
  data: BillingWithDetails[];
  selectedCount: number;
  hasNewRow: boolean;
  isSavingNewRow: boolean;
  isDeleting: boolean;
  onAdd: () => void;
  onDelete: () => void;
  onSaveNewRow: () => void;
  onCancelNewRow: () => void;
  isMobile?: boolean;
}

export function BillingToolbar({
  data,
  selectedCount,
  hasNewRow,
  isSavingNewRow,
  isDeleting,
  onAdd,
  onDelete,
  onSaveNewRow,
  onCancelNewRow,
  isMobile = false,
}: BillingToolbarProps) {
  // Excel 내보내기 데이터 변환
  const excelData = React.useMemo(() => {
    return data.map((billing) => ({
      청구번호: billing.billing_number,
      청구일: billing.billing_date,
      계약명: billing.order?.contract_name || '-',
      고객명: billing.customer?.name || '-',
      청구구분: billing.billing_type === 'contract' ? '계약금' : billing.billing_type === 'interim' ? '중도금' : '잔금',
      청구금액: billing.billing_amount,
      수금예정일: billing.expected_payment_date,
      계산서: billing.invoice_status === 'issued' ? '발행' : '미발행',
      비고: billing.notes || '',
    }));
  }, [data]);

  return (
    <CrudTableToolbar
      isMobile={isMobile}
      isAddingNew={hasNewRow}
      isSaving={isSavingNewRow}
      selectedCount={selectedCount}
      isDeleting={isDeleting}
      onAdd={onAdd}
      onSave={onSaveNewRow}
      onCancel={onCancelNewRow}
      onDelete={onDelete}
      addButtonText="청구 추가"
      deleteButtonText="청구 삭제"
      exportButton={
        <ExportToExcel
          data={excelData}
          fileName="청구관리"
          sheetName="청구 목록"
        />
      }
      printButton={
        <PrintTable
          title="청구관리"
          description="청구 목록"
        />
      }
    />
  );
}
```

### 5.9 사이드바 메뉴 추가

#### 파일: `src/components/layout/sidebar.tsx`

기존 파일에 청구관리 메뉴 추가:

```typescript
// 기존 코드에 추가
{
  title: '재무관리',
  href: '#',
  icon: DollarSign,
  items: [
    {
      title: '청구관리',
      href: '/inkwang-es/finance/billings',
      icon: FileText,
    },
    // 향후 추가 메뉴
  ],
}
```

---

## 6. 테스트 시나리오

### 6.1 단위 테스트

#### 청구번호 자동 생성 테스트

```sql
-- 테스트: 청구번호 자동 생성
INSERT INTO billings (
  billing_date,
  order_id,
  customer_id,
  billing_type,
  billing_amount,
  expected_payment_date
) VALUES (
  '2025-01-20',
  (SELECT id FROM orders WHERE contract_type = 'new' LIMIT 1),
  (SELECT id FROM customers LIMIT 1),
  'contract',
  10000000,
  '2025-02-20'
);

-- 검증: billing_number가 'BIL-2025-0001' 형식으로 생성되었는지 확인
SELECT billing_number FROM billings ORDER BY created_at DESC LIMIT 1;
```

#### RLS 정책 테스트

```sql
-- 테스트: admin 역할로 청구 생성 가능 여부
-- (Supabase SQL Editor에서 테스트)
```

### 6.2 통합 테스트

#### 청구 생성 플로우

1. 청구 추가 버튼 클릭
2. 신규 수주 선택 (Combobox)
3. 고객명 자동 입력 확인
4. 청구구분 선택 (계약금/중도금/잔금)
5. 청구금액 입력 (예: 10,000,000)
6. 수금예정일 입력 (예: 2025-02-20)
7. 계산서 상태 선택 (발행/미발행)
8. 비고 입력 (선택사항)
9. 저장 버튼 클릭
10. 청구번호 자동 생성 확인
11. 테이블에 새 행 추가 확인

#### 청구 수정 플로우

1. 기존 청구 행 더블클릭
2. 청구일 수정 (EditableDateCell)
3. 청구금액 수정 (EditableCell)
4. 수금예정일 수정 (EditableDateCell)
5. 계산서 상태 변경 (EditableSelectCell)
6. 비고 수정 (EditableNotesCell)
7. 변경사항 자동 저장 확인

#### 청구 삭제 플로우

1. 청구 행 체크박스 선택
2. 삭제 버튼 클릭
3. 삭제 확인 다이얼로그 표시
4. 확인 버튼 클릭
5. 테이블에서 행 삭제 확인

### 6.3 E2E 테스트 (Playwright)

```typescript
// tests/billings.spec.ts
import { test, expect } from '@playwright/test';

test('청구 생성 플로우', async ({ page }) => {
  // 로그인
  await page.goto('http://localhost:3001/login');
  await page.fill('input[name="userId"]', 'admin');
  await page.fill('input[name="password"]', 'password');
  await page.click('button:has-text("로그인")');

  // 청구관리 페이지 이동
  await page.goto('http://localhost:3001/inkwang-es/finance/billings');

  // 청구 추가 버튼 클릭
  await page.click('button:has-text("청구 추가")');

  // 신규 수주 선택
  await page.click('button[role="combobox"]');
  await page.click('text=OO정화계약');

  // 청구구분 선택
  await page.click('button:has-text("계약금")');

  // 청구금액 입력
  await page.fill('input[type="number"]', '10000000');

  // 저장 버튼 클릭
  await page.click('button:has-text("저장")');

  // 성공 토스트 확인
  await expect(page.locator('text=추가 완료')).toBeVisible();

  // 테이블에 새 행 확인
  await expect(page.locator('text=BIL-2025-')).toBeVisible();
});
```

---

## 7. 배포 및 검증

### 7.1 로컬 개발 환경 실행

```bash
# 1. 마이그레이션 적용
npx supabase db reset

# 2. 타입 재생성
pnpm types:gen

# 3. 개발 서버 실행
pnpm dev

# 4. 브라우저에서 확인
# http://localhost:3001/inkwang-es/finance/billings
```

### 7.2 프로덕션 배포

```bash
# 1. 타입 체크
pnpm type-check

# 2. 린트 검사
pnpm lint

# 3. 프로덕션 빌드
pnpm build

# 4. 빌드 결과 확인
pnpm start
```

### 7.3 배포 체크리스트

- [ ] 마이그레이션 파일 적용 완료
- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 경고 없음
- [ ] 프로덕션 빌드 성공
- [ ] RLS 정책 테스트 완료
- [ ] 청구번호 자동 생성 확인
- [ ] CRUD 작업 정상 동작
- [ ] 모바일 반응형 확인
- [ ] Excel 내보내기 정상 동작
- [ ] 인쇄 기능 정상 동작

---

## 8. 주의사항 및 팁

### 8.1 주의사항

1. **Server Actions 패턴**
   - `'use server'` 사용 시 destructuring export 불가
   - 반드시 명시적 async 함수 래퍼 사용

2. **메모이제이션 필수**
   - `columns`와 `data`는 반드시 `useMemo`로 감싸기
   - 무한 렌더링 방지

3. **타입 안정성**
   - Supabase 타입 변경 시 `pnpm types:gen` 실행
   - 모든 필드에 적절한 타입 지정

4. **RLS 정책**
   - 프로덕션 환경에서 반드시 RLS 활성화
   - 역할별 권한 정확히 설정

### 8.2 개발 팁

1. **공통 컴포넌트 활용**
   - 프로젝트에 이미 구현된 `EditableCell`, `EditableSelectCell` 등 적극 활용
   - 코드 중복 최소화

2. **수주관리 패턴 참고**
   - `src/app/(dashboard)/inkwang-es/sales/orders/` 폴더 구조 참고
   - 검증된 패턴 재사용

3. **타입 우선 개발**
   - 타입 정의 → Server Actions → 컴포넌트 순서로 개발
   - 타입 안정성 확보

4. **점진적 개발**
   - 기본 CRUD → 인라인 편집 → 고급 기능 순서로 개발
   - 각 단계별 테스트 후 다음 단계 진행

---

## 9. 참고 자료

### 9.1 프로젝트 문서

- **CLAUDE.md** - 프로젝트 전체 가이드
- **수주관리 구현** - `src/app/(dashboard)/inkwang-es/sales/orders/`

### 9.2 외부 문서

- [Next.js 15 App Router](https://nextjs.org/docs/app)
- [TanStack Table v8 Editable Data](https://tanstack.com/table/v8/docs/framework/react/examples/editable-data)
- [Supabase RLS Policies](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

## 10. 추가 기능 확장 아이디어

### 10.1 단기 확장

- **수금 관리**: 실제 수금일, 수금 금액 추가
- **PDF 청구서**: 청구서 PDF 생성 및 다운로드
- **이메일 발송**: 청구서 이메일 자동 발송

### 10.2 장기 확장

- **통계 대시보드**: 청구/수금 통계 차트
- **자동 알림**: 수금 예정일 알림 기능
- **회계 연동**: 회계 시스템과 연동

---

**작성자**: Claude Code
**최종 업데이트**: 2025년 1월 20일
**버전**: 1.0.0
