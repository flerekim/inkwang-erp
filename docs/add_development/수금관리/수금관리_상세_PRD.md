# 수금관리 시스템 PRD (Product Requirements Document)

> **작성일**: 2025년 1월 21일
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

**청구관리(billings)와 연동**되는 **수금관리(collections)** 기능을 구현하여, 계약금/중도금/잔금의 실제 수금 내역을 추적하고 관리합니다.

### 1.2 핵심 요구사항

| 요구사항 | 설명 |
|---------|------|
| **청구 연동** | 청구 데이터 기반으로 수금 생성 (Combobox로 선택) |
| **부분수금 지원** | 한 청구에 대해 여러 번 수금 가능 |
| **수금방법** | 계좌이체, 기타 구분 관리 |
| **은행계좌 연동** | 계좌이체 시 회사 은행계좌 선택 및 자동 입력 |
| **수금 추적** | 총 청구금액, 부분수금액, 남은금액 실시간 표시 |
| **비고** | 청구관리와 동일한 UX (Badge + Popover) |

### 1.3 사용자 스토리

```
AS A 재무 담당자
I WANT TO 청구서 기반으로 실제 수금 내역을 등록하고 추적
SO THAT 정확한 입금 관리를 효율화할 수 있다
```

### 1.4 업무 흐름도

```
[수주 생성] → [청구 생성] → [수금 등록]
    ↓            ↓            ↓
  orders     billings    collections
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
export const { getAll, create } = createCrudActions('collections');

// ✅ 올바른 예시 - 명시적 async 함수 래퍼
const crudActions = createCrudActions<Collection>('collections', ['/inkwang-es/finance/collections']);

export async function getAllCollections(orderBy?: { column: string; desc: boolean }) {
  return crudActions.getAll(orderBy);
}

export async function createCollection(data: Partial<CollectionFormData>) {
  return crudActions.create(data);
}
```

#### Pattern 2: Component Separation (관심사 분리)

**복잡한 테이블 컴포넌트 분리 패턴**:

```
collections/
├── page.tsx                      # 서버 컴포넌트 (데이터 페칭)
├── collections-table.tsx          # 메인 테이블 컴포넌트 (오케스트레이션)
├── collection-columns.tsx         # 컬럼 정의
├── hooks/
│   ├── useCollectionData.ts      # 데이터 관리 (관계형 데이터 로딩)
│   └── useCollectionActions.ts   # 액션 관리 (CRUD 로직)
└── components/
    └── CollectionToolbar.tsx     # 툴바 컴포넌트
```

**분리 효과**:
- 코드 라인 50% 이상 감소
- 재사용성 향상 (훅과 컴포넌트 독립 재사용)
- 테스트 용이성 (각 모듈 독립 테스트)
- 유지보수성 향상 (명확한 책임 분리)

#### Pattern 3: 메모이제이션 필수

```typescript
// ✅ 항상 useMemo로 데이터와 컬럼 메모이제이션
const data = useMemo(() => collections, [collections]);

const columns = useMemo<ColumnDef<Collection>[]>(() => [
  {
    accessorKey: 'collection_date',
    cell: ({ row }) => (
      <EditableDateCell
        value={row.getValue('collection_date')}
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
billings (청구)              collections (수금)
┌─────────────────┐         ┌─────────────────────┐
│ id (PK)         │────┐    │ id (PK)             │
│ billing_number  │    │    │ billing_id (FK)     │
│ order_id (FK)   │    └───→│ collection_date     │
│ customer_id (FK)│         │ collection_amount   │
│ billing_amount  │         │ collection_method   │
│ ...             │         │ bank_account_id (FK)│
└─────────────────┘         │ bank_name           │
                            │ account_number      │
                            │ depositor           │
                            │ notes               │
                            └─────────────────────┘
                                     │
                                     │
                                     ↓
                            bank_accounts (은행계좌)
                            ┌─────────────────────┐
                            │ id (PK)             │
                            │ company_id (FK)     │
                            │ bank_name           │
                            │ account_number      │
                            │ ...                 │
                            └─────────────────────┘
```

### 3.2 테이블 스키마

#### collections 테이블

```sql
CREATE TABLE collections (
  -- 기본 정보
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 외래 키
  billing_id UUID NOT NULL REFERENCES billings(id) ON DELETE CASCADE,

  -- 수금 상세
  collection_date DATE NOT NULL, -- 수금일
  collection_amount NUMERIC(15, 2) NOT NULL CHECK (collection_amount > 0), -- 수금액
  collection_method TEXT NOT NULL CHECK (collection_method IN ('bank_transfer', 'other')), -- 수금방법

  -- 은행 정보 (계좌이체 시 필수)
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL, -- 은행계좌 ID (계좌이체 시)
  bank_name TEXT, -- 은행명 (자동 입력, 또는 기타 시 직접 입력)
  account_number TEXT, -- 계좌번호 (자동 입력, 읽기 전용)
  depositor TEXT, -- 입금자 (기본값: 청구의 고객명)

  -- 비고
  notes TEXT,

  -- 메타 데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 (성능 최적화)
CREATE INDEX idx_collections_billing_id ON collections(billing_id);
CREATE INDEX idx_collections_bank_account_id ON collections(bank_account_id);
CREATE INDEX idx_collections_collection_date ON collections(collection_date);

-- 트리거 (updated_at 자동 갱신)
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 제약조건: 수금액은 0보다 커야 함
ALTER TABLE collections ADD CONSTRAINT check_positive_amount
  CHECK (collection_amount > 0);
```

### 3.3 RLS (Row Level Security) 정책

```sql
-- RLS 활성화
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- SELECT 정책: 모든 인증된 사용자가 조회 가능
CREATE POLICY "collections_select_policy"
ON collections FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT 정책: admin, manager 역할만 가능
CREATE POLICY "collections_insert_policy"
ON collections FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);

-- UPDATE 정책: admin, manager 역할만 가능
CREATE POLICY "collections_update_policy"
ON collections FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);

-- DELETE 정책: admin 역할만 가능
CREATE POLICY "collections_delete_policy"
ON collections FOR DELETE
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
export type Collection = Database['public']['Tables']['collections']['Row'];
export type CollectionInsert = Database['public']['Tables']['collections']['Insert'];
export type CollectionUpdate = Database['public']['Tables']['collections']['Update'];
```

#### src/types/index.ts (애플리케이션 타입)

```typescript
// Enum 타입
export type CollectionMethod = 'bank_transfer' | 'other'; // 계좌이체, 기타

/**
 * 수금 상세 타입 (JOIN된 데이터 포함)
 */
export type CollectionWithDetails = Collection & {
  billing: Pick<Billing, 'id' | 'billing_number' | 'billing_amount' | 'expected_payment_date'> & {
    order: Pick<Order, 'id' | 'order_number' | 'contract_name'> | null;
    customer: Pick<Customer, 'id' | 'name' | 'business_number'> | null;
  } | null;
  bank_account: Pick<BankAccount, 'id' | 'bank_name' | 'account_number'> | null;
};

/**
 * 청구 수금 현황 타입 (부분수금 지원)
 */
export type BillingCollectionStatus = {
  billing_id: string;
  billing_number: string;
  billing_amount: number; // 총 청구금액
  collected_amount: number; // 기수금액 (부분수금 합계)
  remaining_amount: number; // 미수금액 (청구금액 - 기수금액)
};

/**
 * 수금 생성/수정 폼 데이터
 */
export type CollectionFormData = {
  billing_id: string; // 청구 ID
  collection_date: string; // YYYY-MM-DD
  collection_amount: number;
  collection_method: CollectionMethod;
  bank_account_id: string | null; // 계좌이체 시 필수, 기타 시 null
  bank_name: string | null; // 계좌이체 시 자동 입력, 기타 시 null 가능
  account_number: string | null; // 계좌이체 시 자동 입력, 기타 시 null
  depositor: string; // 기본값: 청구의 고객명
  notes: string | null;
};
```

---

## 4. UI/UX 설계

### 4.1 페이지 구조

```
src/app/(dashboard)/inkwang-es/finance/collections/
├── page.tsx                      # 서버 컴포넌트 (데이터 페칭)
├── collections-table.tsx          # 메인 테이블 컴포넌트
├── collection-columns.tsx         # 컬럼 정의
├── hooks/
│   ├── useCollectionData.ts      # 데이터 로딩 및 상태 관리
│   └── useCollectionActions.ts   # CRUD 액션 관리
└── components/
    └── CollectionToolbar.tsx     # 툴바 컴포넌트
```

### 4.2 와이어프레임

#### 데스크톱 뷰

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 수금관리                                        [추가] [Excel] [인쇄] [삭제]     │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 청구번호/계약명으로 검색...                                                   │
├────┬────────┬──────┬────────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────┤
│ ☑  │청구번호│계약명│수금예정│수금일│수금액│수금  │입금자│은행명│계좌  │비고     │
│    │        │      │일      │      │      │방법  │      │      │번호  │         │
├────┼────────┼──────┼────────┼──────┼──────┼──────┼──────┼──────┼──────┼─────────┤
│ ☐  │BIL-    │OO정화│2025-   │2025- │20,000│계좌  │OO건설│신한  │1234- │         │
│    │2025-   │계약  │02-15   │02-10 │,000원│이체  │      │은행  │567.. │         │
│    │0001    │      │        │      │      │      │      │      │      │         │
│    │        │      │총: 50,000,000원 / 기: 20,000,000원 / 남: 30,000,000원    │
├────┼────────┼──────┼────────┼──────┼──────┼──────┼──────┼──────┼──────┼─────────┤
│ ☐  │BIL-    │OO정화│2025-   │2025- │10,000│계좌  │OO건설│우리  │9876- │         │
│    │2025-   │계약  │02-15   │02-15 │,000원│이체  │      │은행  │543.. │         │
│    │0001    │      │        │      │      │      │      │      │      │         │
│    │        │      │총: 50,000,000원 / 기: 30,000,000원 / 남: 20,000,000원    │
└────┴────────┴──────┴────────┴──────┴──────┴──────┴──────┴──────┴──────┴─────────┘
```

**부분수금 표시 방법**:
- 청구번호 Combobox에서: `BIL-2025-0001 (OO정화계약, 총: 50,000,000원 / 기: 20,000,000원 / 남: 30,000,000원)`
- 각 수금 행 아래에 작은 글씨로 표시: `총: 50,000,000원 / 기: 20,000,000원 / 남: 30,000,000원`

### 4.3 컬럼 정의

| 컬럼명 | 타입 | 편집 방식 | 설명 | 특이사항 |
|--------|------|----------|------|---------|
| **체크박스** | - | - | 행 선택 (삭제용) | - |
| **청구번호** | text | `EditableSelectCell` (Combobox) | 청구 선택 (청구번호 + 계약명 + 부분수금 현황) | 계약명으로 검색 가능, 총/기/남은금액 표시 |
| **계약명** | text | - | 선택한 청구의 계약명 자동 입력 (읽기 전용) | - |
| **수금예정일** | date | - | 선택한 청구의 수금예정일 자동 입력 (읽기 전용) | - |
| **수금일** | date | `EditableDateCell` | 날짜 입력 (더블클릭 편집) | - |
| **수금액** | number | `EditableCell` | 숫자 입력 (소수점 없음, 콤마 표시) | - |
| **수금방법** | enum | `EditableSelectCell` (Select) | 계좌이체, 기타 선택 | 계좌이체 선택 시 은행계좌 선택 활성화 |
| **입금자** | text | `EditableCell` | 텍스트 입력 | 기본값: 선택한 청구의 고객명 |
| **은행명** | text | `EditableSelectCell` (Combobox) | 은행계좌 선택 (계좌이체 시) / 직접 입력 (기타 시) | 신규 등록 시: 수금방법에서 계좌이체 선택 시 은행계좌 목록 표시<br>저장 후: 더블클릭하면 은행계좌 목록 표시 |
| **계좌번호** | text | - | 읽기 전용 (은행명 선택 시 자동 입력) | 사용자 직접 수정 불가 |
| **비고** | text | `EditableNotesCell` | Badge + Popover (청구관리 패턴) | - |

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
supabase/migrations/20250121_create_collections_table.sql
```

#### 전체 코드

```sql
-- ============================================
-- 수금관리 테이블 생성
-- ============================================

-- collections 테이블 생성
CREATE TABLE collections (
  -- 기본 정보
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 외래 키
  billing_id UUID NOT NULL REFERENCES billings(id) ON DELETE CASCADE,

  -- 수금 상세
  collection_date DATE NOT NULL,
  collection_amount NUMERIC(15, 2) NOT NULL CHECK (collection_amount > 0),
  collection_method TEXT NOT NULL CHECK (collection_method IN ('bank_transfer', 'other')),

  -- 은행 정보
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  bank_name TEXT,
  account_number TEXT,
  depositor TEXT,

  -- 비고
  notes TEXT,

  -- 메타 데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX idx_collections_billing_id ON collections(billing_id);
CREATE INDEX idx_collections_bank_account_id ON collections(bank_account_id);
CREATE INDEX idx_collections_collection_date ON collections(collection_date);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_select_policy"
ON collections FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "collections_insert_policy"
ON collections FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);

CREATE POLICY "collections_update_policy"
ON collections FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);

CREATE POLICY "collections_delete_policy"
ON collections FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 코멘트
COMMENT ON TABLE collections IS '수금 관리 테이블';
COMMENT ON COLUMN collections.collection_method IS '수금방법 (bank_transfer: 계좌이체, other: 기타)';
COMMENT ON COLUMN collections.bank_account_id IS '은행계좌 ID (계좌이체 시 필수)';
COMMENT ON COLUMN collections.depositor IS '입금자 (기본값: 청구의 고객명)';
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
// 수금관리 관련 타입
// ============================================

// 기본 Row 타입
export type Collection = Database['public']['Tables']['collections']['Row'];
export type CollectionInsert = Database['public']['Tables']['collections']['Insert'];
export type CollectionUpdate = Database['public']['Tables']['collections']['Update'];

// Enum 타입
export type CollectionMethod = 'bank_transfer' | 'other';

/**
 * 수금 상세 타입 (JOIN된 데이터 포함)
 */
export type CollectionWithDetails = Collection & {
  billing: (Pick<Billing, 'id' | 'billing_number' | 'billing_amount' | 'expected_payment_date'> & {
    order: Pick<Order, 'id' | 'order_number' | 'contract_name'> | null;
    customer: Pick<Customer, 'id' | 'name' | 'business_number'> | null;
  }) | null;
  bank_account: Pick<BankAccount, 'id' | 'bank_name' | 'account_number'> | null;
};

/**
 * 청구 수금 현황 타입 (부분수금 지원)
 */
export type BillingCollectionStatus = {
  billing_id: string;
  billing_number: string;
  contract_name: string;
  billing_amount: number;
  collected_amount: number;
  remaining_amount: number;
};

/**
 * 수금 생성/수정 폼 데이터
 */
export type CollectionFormData = {
  billing_id: string;
  collection_date: string;
  collection_amount: number;
  collection_method: CollectionMethod;
  bank_account_id: string | null;
  bank_name: string | null;
  account_number: string | null;
  depositor: string;
  notes: string | null;
};
```

### 5.3 Server Actions 구현

#### 파일: `src/actions/collections.ts`

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { CollectionWithDetails, CollectionFormData, BillingCollectionStatus } from '@/types';

// ============================================
// CRUD Actions
// ============================================

/**
 * 수금 목록 조회 (JOIN 포함)
 */
export async function getCollections() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        billing:billings!billing_id (
          id,
          billing_number,
          billing_amount,
          expected_payment_date,
          order:orders!order_id (
            id,
            order_number,
            contract_name
          ),
          customer:customers!customer_id (
            id,
            name,
            business_number
          )
        ),
        bank_account:bank_accounts!bank_account_id (
          id,
          bank_name,
          account_number
        )
      `)
      .order('collection_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: `수금 목록 조회 실패: ${error.message}` };
    }

    return { data: data as CollectionWithDetails[], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 수금 생성
 */
export async function createCollection(formData: CollectionFormData) {
  try {
    const supabase = await createClient();

    // 권한 확인
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: '사용자 인증 실패' };
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
      return { data: null, error: '권한이 없습니다' };
    }

    // 수금 생성
    const insertData = {
      billing_id: formData.billing_id,
      collection_date: formData.collection_date,
      collection_amount: formData.collection_amount,
      collection_method: formData.collection_method,
      bank_account_id: formData.bank_account_id,
      bank_name: formData.bank_name,
      account_number: formData.account_number,
      depositor: formData.depositor,
      notes: formData.notes,
    };

    const { data, error } = await supabase
      .from('collections')
      .insert(insertData)
      .select(`
        *,
        billing:billings!billing_id (
          id,
          billing_number,
          billing_amount,
          expected_payment_date,
          order:orders!order_id (
            id,
            order_number,
            contract_name
          ),
          customer:customers!customer_id (
            id,
            name,
            business_number
          )
        ),
        bank_account:bank_accounts!bank_account_id (
          id,
          bank_name,
          account_number
        )
      `)
      .single();

    if (error) {
      return { data: null, error: `수금 생성 실패: ${error.message}` };
    }

    revalidatePath('/inkwang-es/finance/collections');
    return { data: data as CollectionWithDetails, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 수금 수정
 */
export async function updateCollection(id: string, formData: Partial<CollectionFormData>) {
  try {
    const supabase = await createClient();

    // 권한 확인
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: '사용자 인증 실패' };
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
      return { data: null, error: '권한이 없습니다' };
    }

    const { data, error } = await supabase
      .from('collections')
      .update(formData)
      .eq('id', id)
      .select(`
        *,
        billing:billings!billing_id (
          id,
          billing_number,
          billing_amount,
          expected_payment_date,
          order:orders!order_id (
            id,
            order_number,
            contract_name
          ),
          customer:customers!customer_id (
            id,
            name,
            business_number
          )
        ),
        bank_account:bank_accounts!bank_account_id (
          id,
          bank_name,
          account_number
        )
      `)
      .single();

    if (error) {
      return { data: null, error: `수금 수정 실패: ${error.message}` };
    }

    revalidatePath('/inkwang-es/finance/collections');
    return { data: data as CollectionWithDetails, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 수금 삭제
 */
export async function deleteCollection(id: string) {
  try {
    const supabase = await createClient();

    // 권한 확인 (admin만 가능)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: '사용자 인증 실패' };
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUser?.role !== 'admin') {
      return { error: '권한이 없습니다' };
    }

    const { error } = await supabase.from('collections').delete().eq('id', id);

    if (error) {
      return { error: `수금 삭제 실패: ${error.message}` };
    }

    revalidatePath('/inkwang-es/finance/collections');
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

// ============================================
// 특수 조회 함수
// ============================================

/**
 * 청구 목록 조회 (수금 등록용 - 부분수금 현황 포함)
 */
export async function getBillingsForCollection(): Promise<BillingCollectionStatus[]> {
  try {
    const supabase = await createClient();

    // 1. 모든 청구 조회
    const { data: billings, error: billingsError } = await supabase
      .from('billings')
      .select(`
        id,
        billing_number,
        billing_amount,
        order:orders!order_id (
          contract_name
        )
      `)
      .order('billing_date', { ascending: false });

    if (billingsError) {
      console.error('청구 목록 조회 오류:', billingsError);
      return [];
    }

    // 2. 각 청구의 수금 합계 조회
    const billingsWithStatus: BillingCollectionStatus[] = await Promise.all(
      billings.map(async (billing) => {
        const { data: collections } = await supabase
          .from('collections')
          .select('collection_amount')
          .eq('billing_id', billing.id);

        const collectedAmount = collections?.reduce(
          (sum, c) => sum + Number(c.collection_amount),
          0
        ) || 0;

        const billingData = billing as {
          id: string;
          billing_number: string;
          billing_amount: number;
          order: { contract_name: string } | null;
        };

        return {
          billing_id: billingData.id,
          billing_number: billingData.billing_number,
          contract_name: billingData.order?.contract_name || '',
          billing_amount: Number(billingData.billing_amount),
          collected_amount: collectedAmount,
          remaining_amount: Number(billingData.billing_amount) - collectedAmount,
        };
      })
    );

    return billingsWithStatus;
  } catch (error) {
    console.error('청구 목록 조회 오류:', error);
    return [];
  }
}

/**
 * 은행계좌 목록 조회 (수금 등록용)
 */
export async function getBankAccountsForCollection() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('bank_accounts')
      .select('id, bank_name, account_number')
      .order('bank_name');

    if (error) {
      console.error('은행계좌 목록 조회 오류:', error);
      return [];
    }

    return data;
  } catch (error) {
    console.error('은행계좌 목록 조회 오류:', error);
    return [];
  }
}
```

### 5.4 페이지 컴포넌트 구현

#### 파일: `src/app/(dashboard)/inkwang-es/finance/collections/page.tsx`

```typescript
import { getCollections } from '@/actions/collections';
import { CollectionsTable } from './collections-table';

export const metadata = {
  title: '수금관리 | 인광 ERP',
  description: '수금 내역 관리',
};

export default async function CollectionsPage() {
  const { data: collections, error } = await getCollections();

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
        <h1 className="text-3xl font-bold tracking-tight">수금관리</h1>
        <p className="text-muted-foreground">청구 기반 수금 내역 관리</p>
      </div>

      <CollectionsTable data={collections || []} />
    </div>
  );
}
```

### 5.5 테이블 컴포넌트 구현

#### 파일: `src/app/(dashboard)/inkwang-es/finance/collections/collections-table.tsx`

```typescript
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/common/data-table';
import { useTableState } from '@/hooks/use-table-state';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { createCollectionColumns } from './collection-columns';
import { CollectionToolbar } from './components/CollectionToolbar';
import { useCollectionData } from './hooks/useCollectionData';
import { useCollectionActions } from './hooks/useCollectionActions';
import { deleteCollection } from '@/actions/collections';
import type { CollectionWithDetails } from '@/types';

interface CollectionsTableProps {
  data: CollectionWithDetails[];
}

export function CollectionsTable({ data }: CollectionsTableProps) {
  // 테이블 상태 관리
  const tableState = useTableState<CollectionWithDetails>(data);
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

  // 수금 관련 데이터 및 다이얼로그 상태
  const {
    billingStatuses,
    bankAccounts,
  } = useCollectionData(displayData);

  // 수금 CRUD 작업
  const {
    handleUpdateCell,
    handleAddCollection,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
  } = useCollectionActions(tableState, billingStatuses, bankAccounts);

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
        description: '선택된 수금이 없습니다.',
      });
      return;
    }

    tableState.setIsDeleting(true);

    try {
      const results = await Promise.all(
        selectedIds.map((id) => deleteCollection(id))
      );

      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error);
      }

      toast({
        title: '삭제 완료',
        description: `${selectedIds.length}개의 수금이 삭제되었습니다.`,
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
      const collection = displayData[rowIndex];
      if (!collection) return;

      if (collection.id?.startsWith('temp-')) {
        handleUpdateNewRow(columnId, value);
      } else {
        const actualIndex = tableData.findIndex((c) => c.id === collection.id);
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
      createCollectionColumns({
        billingStatuses,
        bankAccounts,
        onUpdateCell: handleUnifiedUpdate,
      }),
    [billingStatuses, bankAccounts, handleUnifiedUpdate]
  );

  return (
    <>
      {/* 데스크톱 테이블 */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={displayData}
          searchKey="billing_id"
          searchPlaceholder="청구번호로 검색..."
          toolbar={
            <CollectionToolbar
              data={tableData}
              selectedCount={selectedCount}
              hasNewRow={!!newRowData}
              isSavingNewRow={isSavingNewRow}
              isDeleting={isDeleting}
              onAdd={handleAddCollection}
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
        {/* MobileCollectionCard 컴포넌트 구현 (선택사항) */}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        title="수금 삭제"
        description={`선택한 ${selectedCount}개의 수금을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
      />
    </>
  );
}
```

### 5.6 컬럼 정의 구현

#### 파일: `src/app/(dashboard)/inkwang-es/finance/collections/collection-columns.tsx`

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
import type { CollectionWithDetails, BillingCollectionStatus, BankAccount } from '@/types';

interface CollectionColumnsProps {
  billingStatuses: BillingCollectionStatus[];
  bankAccounts: Pick<BankAccount, 'id' | 'bank_name' | 'account_number'>[];
  onUpdateCell: (rowIndex: number, columnId: string, value: string) => Promise<void>;
}

export function createCollectionColumns({
  billingStatuses,
  bankAccounts,
  onUpdateCell,
}: CollectionColumnsProps): ColumnDef<CollectionWithDetails>[] {
  // 수금방법 옵션
  const collectionMethodOptions = [
    { id: 'bank_transfer', name: '계좌이체' },
    { id: 'other', name: '기타' },
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
    // 청구번호 (Combobox - 부분수금 현황 표시)
    {
      accessorKey: 'billing_id',
      header: '청구번호',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const billingId = row.original.billing_id;
        const status = billingStatuses.find(s => s.billing_id === billingId);

        return (
          <div>
            <EditableSelectCell
              value={billingId}
              rowIndex={row.index}
              columnId="billing_id"
              onUpdate={onUpdateCell}
              options={billingStatuses.map(s => ({
                id: s.billing_id,
                name: `${s.billing_number} (${s.contract_name})`,
              }))}
              type="combobox"
              placeholder="청구 선택"
              searchPlaceholder="계약명으로 검색..."
              displayValue={
                row.original.billing?.billing_number ||
                (isNewRow && billingId && status && (
                  <Badge variant="outline" className="font-mono">
                    {status.billing_number}
                  </Badge>
                ))
              }
            />
            {/* 부분수금 현황 표시 */}
            {status && (
              <div className="text-xs text-muted-foreground mt-1">
                총: {status.billing_amount.toLocaleString()}원 /
                기: {status.collected_amount.toLocaleString()}원 /
                남: {status.remaining_amount.toLocaleString()}원
              </div>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    // 계약명 (선택한 청구의 계약명 자동 입력, 읽기 전용)
    {
      header: '계약명',
      cell: ({ row }) => {
        const contractName = row.original.billing?.order?.contract_name || '-';
        return (
          <div className="text-sm" title="선택한 청구의 계약명 (자동 입력)">
            {contractName}
          </div>
        );
      },
      enableSorting: false,
    },
    // 수금예정일 (선택한 청구의 수금예정일 자동 입력, 읽기 전용)
    {
      header: '수금예정일',
      cell: ({ row }) => {
        const expectedDate = row.original.billing?.expected_payment_date;
        const displayDate = expectedDate
          ? new Date(expectedDate).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })
          : '-';
        return (
          <div className="text-sm" title="선택한 청구의 수금예정일 (자동 입력)">
            {displayDate}
          </div>
        );
      },
      enableSorting: false,
    },
    // 수금일
    {
      accessorKey: 'collection_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="수금일" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableDateCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="collection_date"
            onUpdate={onUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: true,
    },
    // 수금액
    {
      accessorKey: 'collection_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="수금액" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const amount = getValue<number>();

        return (
          <EditableCell
            value={amount?.toString() || '0'}
            rowIndex={row.index}
            columnId="collection_amount"
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
    // 수금방법
    {
      accessorKey: 'collection_method',
      header: '수금방법',
      cell: ({ row }) => {
        const method = row.getValue('collection_method') as string;

        const getBadgeVariant = (m: string) => {
          return m === 'bank_transfer' ? 'default' : 'outline';
        };

        const getLabel = (m: string) => {
          return m === 'bank_transfer' ? '계좌이체' : '기타';
        };

        return (
          <EditableSelectCell
            value={method}
            rowIndex={row.index}
            columnId="collection_method"
            onUpdate={onUpdateCell}
            options={collectionMethodOptions}
            type="select"
            placeholder="수금방법"
            displayValue={
              <Badge variant={getBadgeVariant(method)}>
                {getLabel(method)}
              </Badge>
            }
          />
        );
      },
      enableSorting: false,
    },
    // 입금자
    {
      accessorKey: 'depositor',
      header: '입금자',
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="depositor"
            type="text"
            onUpdate={onUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: false,
    },
    // 은행명
    {
      accessorKey: 'bank_account_id',
      header: '은행명',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const method = row.original.collection_method;
        const bankAccountId = row.original.bank_account_id;
        const bankName = row.original.bank_name || row.original.bank_account?.bank_name;

        // 계좌이체가 아니면 null 가능
        if (method !== 'bank_transfer') {
          return <div className="text-sm text-muted-foreground">-</div>;
        }

        return (
          <EditableSelectCell
            value={bankAccountId || ''}
            rowIndex={row.index}
            columnId="bank_account_id"
            onUpdate={onUpdateCell}
            options={bankAccounts.map(ba => ({
              id: ba.id,
              name: ba.bank_name,
            }))}
            type="combobox"
            placeholder="은행 선택"
            searchPlaceholder="은행 검색..."
            displayValue={bankName}
          />
        );
      },
      enableSorting: false,
    },
    // 계좌번호 (읽기 전용)
    {
      accessorKey: 'account_number',
      header: '계좌번호',
      cell: ({ row }) => {
        const method = row.original.collection_method;
        const accountNumber = row.original.account_number || row.original.bank_account?.account_number;

        if (method !== 'bank_transfer') {
          return <div className="text-sm text-muted-foreground">-</div>;
        }

        return (
          <div className="text-sm" title="은행명 선택 시 자동 입력 (읽기 전용)">
            {accountNumber || '-'}
          </div>
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

#### 파일: `src/app/(dashboard)/inkwang-es/finance/collections/hooks/useCollectionData.ts`

```typescript
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getBillingsForCollection, getBankAccountsForCollection } from '@/actions/collections';
import type { CollectionWithDetails, BillingCollectionStatus, BankAccount } from '@/types';

/**
 * useCollectionData Hook
 *
 * 수금 테이블에 필요한 관련 데이터 로딩
 */
export function useCollectionData(displayData: CollectionWithDetails[]) {
  const { toast } = useToast();

  // 관계형 데이터 상태
  const [billingStatuses, setBillingStatuses] = useState<BillingCollectionStatus[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Pick<BankAccount, 'id' | 'bank_name' | 'account_number'>[]>([]);

  // 관계형 데이터 로드 (마운트 시 1회)
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [billingsData, bankAccountsData] = await Promise.all([
          getBillingsForCollection(),
          getBankAccountsForCollection(),
        ]);
        setBillingStatuses(billingsData);
        setBankAccounts(bankAccountsData);
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
    billingStatuses,
    bankAccounts,
  };
}
```

#### 파일: `src/app/(dashboard)/inkwang-es/finance/collections/hooks/useCollectionActions.ts`

```typescript
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createCollection, updateCollection } from '@/actions/collections';
import type { CollectionWithDetails, CollectionFormData, BillingCollectionStatus, BankAccount } from '@/types';
import type { UseTableStateReturn } from '@/hooks/use-table-state';

/**
 * useCollectionActions Hook
 *
 * 수금 테이블의 CRUD 작업 관리
 */
export function useCollectionActions(
  tableState: UseTableStateReturn<CollectionWithDetails>,
  billingStatuses: BillingCollectionStatus[],
  bankAccounts: Pick<BankAccount, 'id' | 'bank_name' | 'account_number'>[]
) {
  const { toast } = useToast();
  const router = useRouter();

  const {
    tableData,
    newRowData,
    setNewRowData,
    setIsSavingNewRow,
  } = tableState;

  // 수금 추가 (인라인 방식)
  const handleAddCollection = useCallback(() => {
    if (newRowData) {
      toast({
        variant: 'destructive',
        title: '추가 중인 수금이 있습니다',
        description: '현재 추가 중인 수금을 먼저 저장하거나 취소해주세요.',
      });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const defaultBillingId = billingStatuses[0]?.billing_id || '';
    const defaultBilling = billingStatuses[0];

    const newRow: Partial<CollectionWithDetails> = {
      id: tempId,
      billing_id: defaultBillingId,
      collection_date: new Date().toISOString().split('T')[0],
      collection_amount: 0,
      collection_method: 'bank_transfer',
      bank_account_id: null,
      bank_name: null,
      account_number: null,
      depositor: defaultBilling?.contract_name || '',
      notes: null,
    };

    setNewRowData(newRow);
  }, [newRowData, billingStatuses, toast, setNewRowData]);

  // 새 행 데이터 업데이트
  const handleUpdateNewRow = useCallback(
    (field: string, value: unknown) => {
      if (!newRowData) return;

      // billing_id 변경 시 입금자 자동 설정
      if (field === 'billing_id') {
        const selectedBilling = billingStatuses.find(b => b.billing_id === value);
        if (selectedBilling) {
          setNewRowData({
            ...newRowData,
            billing_id: value as string,
            depositor: selectedBilling.contract_name,
          });
          return;
        }
      }

      // bank_account_id 변경 시 은행명, 계좌번호 자동 설정
      if (field === 'bank_account_id') {
        const selectedBankAccount = bankAccounts.find(ba => ba.id === value);
        if (selectedBankAccount) {
          setNewRowData({
            ...newRowData,
            bank_account_id: value as string,
            bank_name: selectedBankAccount.bank_name,
            account_number: selectedBankAccount.account_number,
          });
          return;
        }
      }

      // collection_method 변경 시 은행 정보 초기화
      if (field === 'collection_method') {
        if (value === 'other') {
          setNewRowData({
            ...newRowData,
            collection_method: value as 'bank_transfer' | 'other',
            bank_account_id: null,
            bank_name: null,
            account_number: null,
          });
          return;
        }
      }

      // 타입 변환 처리
      let processedValue = value;
      if (field === 'collection_amount') {
        processedValue = typeof value === 'string' ? Number(value) || 0 : value;
      }

      setNewRowData({ ...newRowData, [field]: processedValue });
    },
    [newRowData, billingStatuses, bankAccounts, setNewRowData]
  );

  // 새 행 저장
  const handleSaveNewRow = useCallback(async () => {
    if (!newRowData) return;

    if (!newRowData.billing_id) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '청구를 선택해주세요.',
      });
      return;
    }

    if (!newRowData.collection_amount || newRowData.collection_amount <= 0) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '수금액을 입력해주세요. (0보다 커야 합니다)',
      });
      return;
    }

    if (newRowData.collection_method === 'bank_transfer' && !newRowData.bank_account_id) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '계좌이체 시 은행계좌를 선택해주세요.',
      });
      return;
    }

    const formData: CollectionFormData = {
      billing_id: newRowData.billing_id,
      collection_date: newRowData.collection_date || new Date().toISOString().split('T')[0],
      collection_amount: newRowData.collection_amount || 0,
      collection_method: (newRowData.collection_method || 'bank_transfer') as 'bank_transfer' | 'other',
      bank_account_id: newRowData.bank_account_id || null,
      bank_name: newRowData.bank_name || null,
      account_number: newRowData.account_number || null,
      depositor: newRowData.depositor || '',
      notes: newRowData.notes || null,
    };

    setIsSavingNewRow(true);

    try {
      const result = await createCollection(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: '추가 완료',
        description: '새로운 수금이 추가되었습니다.',
      });

      setNewRowData(null);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      setIsSavingNewRow(false);
    }
  }, [newRowData, toast, setNewRowData, setIsSavingNewRow, router]);

  // 새 행 취소
  const handleCancelNewRow = useCallback(() => {
    setNewRowData(null);
  }, [setNewRowData]);

  // 셀 업데이트
  const handleUpdateCell = useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const collection = tableData[rowIndex];
      if (!collection || collection.id?.startsWith('temp-')) return;

      try {
        // bank_account_id 변경 시 은행명, 계좌번호 자동 설정
        if (columnId === 'bank_account_id') {
          const selectedBankAccount = bankAccounts.find(ba => ba.id === value);
          if (selectedBankAccount) {
            const result = await updateCollection(collection.id, {
              bank_account_id: value,
              bank_name: selectedBankAccount.bank_name,
              account_number: selectedBankAccount.account_number,
            });

            if (result.error) {
              throw new Error(result.error);
            }

            toast({
              title: '저장 완료',
              description: '수금 정보가 업데이트되었습니다.',
            });

            router.refresh();
            return;
          }
        }

        // collection_method 변경 시 은행 정보 초기화
        if (columnId === 'collection_method') {
          if (value === 'other') {
            const result = await updateCollection(collection.id, {
              collection_method: value as 'bank_transfer' | 'other',
              bank_account_id: null,
              bank_name: null,
              account_number: null,
            });

            if (result.error) {
              throw new Error(result.error);
            }

            toast({
              title: '저장 완료',
              description: '수금 정보가 업데이트되었습니다.',
            });

            router.refresh();
            return;
          }
        }

        // 일반 필드 업데이트
        const updateData: Partial<CollectionFormData> = {
          [columnId]: value,
        };

        const result = await updateCollection(collection.id, updateData);

        if (result.error) {
          throw new Error(result.error);
        }

        toast({
          title: '저장 완료',
          description: '수금 정보가 업데이트되었습니다.',
        });

        router.refresh();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '저장 실패',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        });
      }
    },
    [tableData, bankAccounts, toast, router]
  );

  return {
    handleUpdateCell,
    handleAddCollection,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
  };
}
```

### 5.8 툴바 컴포넌트 구현

#### 파일: `src/app/(dashboard)/inkwang-es/finance/collections/components/CollectionToolbar.tsx`

```typescript
'use client';

import * as React from 'react';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { ExportToExcel } from '@/components/common/export-to-excel';
import { PrintTable } from '@/components/common/print-table';
import type { CollectionWithDetails } from '@/types';

interface CollectionToolbarProps {
  data: CollectionWithDetails[];
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

export function CollectionToolbar({
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
}: CollectionToolbarProps) {
  // Excel 내보내기 데이터 변환
  const excelData = React.useMemo(() => {
    return data.map((collection) => ({
      청구번호: collection.billing?.billing_number || '-',
      계약명: collection.billing?.order?.contract_name || '-',
      고객명: collection.billing?.customer?.name || '-',
      수금예정일: collection.billing?.expected_payment_date || '-',
      수금일: collection.collection_date,
      수금액: collection.collection_amount,
      수금방법: collection.collection_method === 'bank_transfer' ? '계좌이체' : '기타',
      입금자: collection.depositor,
      은행명: collection.bank_name || '-',
      계좌번호: collection.account_number || '-',
      비고: collection.notes || '',
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
      addButtonText="수금 추가"
      deleteButtonText="수금 삭제"
      exportButton={
        <ExportToExcel
          data={excelData}
          fileName="수금관리"
          sheetName="수금 목록"
        />
      }
      printButton={
        <PrintTable
          title="수금관리"
          description="수금 목록"
        />
      }
    />
  );
}
```

### 5.9 사이드바 메뉴 추가

#### 파일: `src/components/layout/sidebar.tsx`

기존 파일에 수금관리 메뉴 추가:

```typescript
// 기존 "재무관리" 섹션에 추가
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
    {
      title: '수금관리',
      href: '/inkwang-es/finance/collections',
      icon: Banknote, // lucide-react의 Banknote 아이콘
    },
    // 향후 추가 메뉴
  ],
}
```

---

## 6. 테스트 시나리오

### 6.1 단위 테스트

#### 수금 생성 테스트

```sql
-- 테스트: 수금 생성
INSERT INTO collections (
  billing_id,
  collection_date,
  collection_amount,
  collection_method,
  bank_account_id,
  depositor
) VALUES (
  (SELECT id FROM billings LIMIT 1),
  '2025-01-21',
  10000000,
  'bank_transfer',
  (SELECT id FROM bank_accounts LIMIT 1),
  '테스트 입금자'
);

-- 검증: 수금이 정상적으로 생성되었는지 확인
SELECT * FROM collections ORDER BY created_at DESC LIMIT 1;
```

#### 부분수금 현황 조회 테스트

```sql
-- 테스트: 특정 청구의 총 수금액 조회
SELECT
  b.billing_number,
  b.billing_amount AS total_billing,
  COALESCE(SUM(c.collection_amount), 0) AS total_collected,
  b.billing_amount - COALESCE(SUM(c.collection_amount), 0) AS remaining
FROM billings b
LEFT JOIN collections c ON c.billing_id = b.id
WHERE b.id = 'billing-id-here'
GROUP BY b.id, b.billing_number, b.billing_amount;
```

### 6.2 통합 테스트

#### 수금 생성 플로우

1. 수금 추가 버튼 클릭
2. 청구 선택 (Combobox - 부분수금 현황 확인)
3. 계약명, 수금예정일 자동 입력 확인
4. 수금일 입력 (예: 2025-01-21)
5. 수금액 입력 (예: 10,000,000)
6. 수금방법 선택 (계좌이체)
7. 은행명 선택 (Combobox - 은행계좌 목록)
8. 계좌번호 자동 입력 확인
9. 입금자 확인 (기본값: 고객명)
10. 비고 입력 (선택사항)
11. 저장 버튼 클릭
12. 테이블에 새 행 추가 확인
13. 부분수금 현황 업데이트 확인

#### 부분수금 플로우

1. 기존 청구에 대한 첫 번째 수금 등록 (예: 20,000,000원)
2. 부분수금 현황 확인 (총: 50,000,000 / 기: 20,000,000 / 남: 30,000,000)
3. 동일 청구에 대한 두 번째 수금 등록 (예: 10,000,000원)
4. 부분수금 현황 업데이트 확인 (총: 50,000,000 / 기: 30,000,000 / 남: 20,000,000)
5. 청구번호 Combobox에서 부분수금 현황 표시 확인

#### 수금방법 변경 플로우

1. 계좌이체 → 기타로 변경
2. 은행명, 계좌번호 필드 자동 초기화 확인
3. 기타 → 계좌이체로 변경
4. 은행계좌 선택 필드 활성화 확인

### 6.3 E2E 테스트 (Playwright)

```typescript
// tests/collections.spec.ts
import { test, expect } from '@playwright/test';

test('수금 생성 및 부분수금 플로우', async ({ page }) => {
  // 로그인
  await page.goto('http://localhost:3001/login');
  await page.fill('input[name="userId"]', 'admin');
  await page.fill('input[name="password"]', 'password');
  await page.click('button:has-text("로그인")');

  // 수금관리 페이지 이동
  await page.goto('http://localhost:3001/inkwang-es/finance/collections');

  // 수금 추가 버튼 클릭
  await page.click('button:has-text("수금 추가")');

  // 청구 선택 (Combobox)
  await page.click('button[role="combobox"]');
  await page.click('text=BIL-2025-0001');

  // 부분수금 현황 확인
  await expect(page.locator('text=총:')).toBeVisible();
  await expect(page.locator('text=기:')).toBeVisible();
  await expect(page.locator('text=남:')).toBeVisible();

  // 수금액 입력
  await page.fill('input[type="number"]', '10000000');

  // 수금방법 선택
  await page.click('button:has-text("계좌이체")');

  // 은행명 선택
  await page.click('button[aria-label="은행 선택"]');
  await page.click('text=신한은행');

  // 저장 버튼 클릭
  await page.click('button:has-text("저장")');

  // 성공 토스트 확인
  await expect(page.locator('text=추가 완료')).toBeVisible();

  // 테이블에 새 행 확인
  await expect(page.locator('text=BIL-2025-0001')).toBeVisible();
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
# http://localhost:3001/inkwang-es/finance/collections
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
- [ ] CRUD 작업 정상 동작
- [ ] 부분수금 기능 정상 동작
- [ ] 은행계좌 연동 정상 동작
- [ ] 청구번호 Combobox 부분수금 현황 표시 확인
- [ ] 모바일 반응형 확인 (선택사항)
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

5. **부분수금 처리**
   - 청구 조회 시 실시간으로 수금 합계 계산
   - UI에서 총/기/남은금액 명확히 표시

6. **은행계좌 연동**
   - 계좌이체 선택 시 은행계좌 필수
   - 기타 선택 시 은행 정보 자동 초기화

### 8.2 개발 팁

1. **공통 컴포넌트 활용**
   - 프로젝트에 이미 구현된 `EditableCell`, `EditableSelectCell` 등 적극 활용
   - 코드 중복 최소화

2. **청구관리 패턴 참고**
   - `src/app/(dashboard)/inkwang-es/finance/billings/` 폴더 구조 참고
   - 검증된 패턴 재사용

3. **타입 우선 개발**
   - 타입 정의 → Server Actions → 컴포넌트 순서로 개발
   - 타입 안정성 확보

4. **점진적 개발**
   - 기본 CRUD → 부분수금 → 은행계좌 연동 순서로 개발
   - 각 단계별 테스트 후 다음 단계 진행

---

## 9. 참고 자료

### 9.1 프로젝트 문서

- **CLAUDE.md** - 프로젝트 전체 가이드
- **청구관리 PRD** - `docs/add_development/청구관리/청구관리_상세_PRD.md`
- **청구관리 구현** - `src/app/(dashboard)/inkwang-es/finance/billings/`

### 9.2 외부 문서

- [Next.js 15 App Router](https://nextjs.org/docs/app)
- [TanStack Table v8 Editable Data](https://tanstack.com/table/v8/docs/framework/react/examples/editable-data)
- [Supabase RLS Policies](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

## 10. 추가 기능 확장 아이디어

### 10.1 단기 확장

- **수금 알림**: 수금예정일 D-7, D-3, D-day 알림
- **일괄 수금 등록**: Excel 업로드를 통한 일괄 수금 등록

### 10.2 장기 확장

- **자동 매칭**: 계좌 입금 내역과 청구 자동 매칭
- **통계 대시보드**: 수금률, 수금 추이 차트
- **회계 연동**: 회계 시스템과 연동하여 자동 전표 생성

---

**작성자**: Claude Code
**최종 업데이트**: 2025년 1월 21일
**버전**: 1.0.0
