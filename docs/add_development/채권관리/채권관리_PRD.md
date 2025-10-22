# 채권관리 PRD (Product Requirements Document)

> **버전**: 1.0.0
> **작성일**: 2025년 1월 21일
> **대상**: 주니어 개발자
> **프로젝트**: 인광ERP 시스템

---

## 목차

1. [개요](#1-개요)
2. [기술 스택](#2-기술-스택)
3. [데이터베이스 설계](#3-데이터베이스-설계)
4. [TypeScript 타입 정의](#4-typescript-타입-정의)
5. [페이지 구조](#5-페이지-구조)
6. [기능 명세](#6-기능-명세)
7. [컴포넌트 구현](#7-컴포넌트-구현)
8. [Server Actions 구현](#8-server-actions-구현)
9. [UI/UX 가이드](#9-uiux-가이드)
10. [단계별 구현 가이드](#10-단계별-구현-가이드)

---

## 1. 개요

### 1.1 목적

채권관리 시스템은 청구관리와 연동하여 청구별 채권 현황, 수금 내역, 회수활동 등을 통합 관리하는 시스템입니다.

### 1.2 주요 기능

- 청구 기반 채권 목록 조회
- 채권 상태 자동 분류 (미수, 부분수금, 수금완료)
- 채권 위험도 자동 분류 (정상, 장기, 부실, 대손)
- 수금 내역 관리 및 추적
- 회수활동 이력 관리
- 채권 상세 다이얼로그
- Excel 내보내기 및 인쇄 기능

### 1.3 주요 용어

| 용어 | 설명 |
|------|------|
| **채권** | 청구를 통해 발생한 미수금 |
| **채권금액** | 청구 금액 (billing_amount) |
| **잔액** | 채권금액 - 수금완료 금액 |
| **상태** | 미수, 부분수금, 수금완료 |
| **분류** | 정상, 장기, 부실, 대손 |
| **경과일** | 청구일부터 오늘까지의 일수 |
| **회수활동** | 채권 회수를 위한 활동 기록 |

---

## 2. 기술 스택

### 2.1 프레임워크 및 라이브러리

```json
{
  "framework": "Next.js 15.5.4",
  "react": "19.1.0",
  "typescript": "5.x",
  "database": "Supabase (PostgreSQL)",
  "ui": {
    "tailwind": "v4.0",
    "shadcn-ui": "latest",
    "radix-ui": "latest"
  },
  "table": "@tanstack/react-table v8",
  "form": {
    "react-hook-form": "7.x",
    "zod": "4.x"
  },
  "icons": "lucide-react"
}
```

### 2.2 아키텍처 패턴

- **App Router**: Next.js 15 App Router 방식
- **Server Components**: 기본 서버 컴포넌트 사용
- **Server Actions**: `'use server'` 디렉티브 기반 API
- **Component Separation**: 관심사 분리 (Hooks, Components, Actions)

---

## 3. 데이터베이스 설계

### 3.1 테이블 스키마

#### 3.1.1 receivables (채권) 테이블

```sql
-- 채권 테이블 생성
CREATE TABLE IF NOT EXISTS public.receivables (
  -- 기본 필드
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- 연동 필드 (청구관리)
  billing_id UUID REFERENCES public.billings(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,

  -- 청구 정보 (복사본 - 성능 최적화)
  billing_number TEXT NOT NULL,
  contract_name TEXT NOT NULL,
  billing_amount DECIMAL(15, 2) NOT NULL,
  billing_date DATE NOT NULL,

  -- 채권 현황 (계산 필드는 VIEW로 관리)
  -- 상태: pending(미수), partial(부분수금), completed(수금완료)
  status TEXT NOT NULL DEFAULT 'pending',
  CHECK (status IN ('pending', 'partial', 'completed')),

  -- 분류: normal(정상), overdue_long(장기), bad_debt(부실), written_off(대손)
  classification TEXT NOT NULL DEFAULT 'normal',
  CHECK (classification IN ('normal', 'overdue_long', 'bad_debt', 'written_off')),

  -- 인덱스
  CONSTRAINT receivables_billing_id_unique UNIQUE (billing_id)
);

-- 인덱스 생성
CREATE INDEX idx_receivables_billing_id ON public.receivables(billing_id);
CREATE INDEX idx_receivables_order_id ON public.receivables(order_id);
CREATE INDEX idx_receivables_customer_id ON public.receivables(customer_id);
CREATE INDEX idx_receivables_status ON public.receivables(status);
CREATE INDEX idx_receivables_classification ON public.receivables(classification);
CREATE INDEX idx_receivables_billing_date ON public.receivables(billing_date);

-- RLS 정책
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

-- 조회 정책
CREATE POLICY "사용자는 자신의 회사 채권을 조회할 수 있습니다"
ON public.receivables FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.users
    WHERE company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  )
);

-- 생성 정책 (admin, manager만)
CREATE POLICY "관리자와 매니저는 채권을 생성할 수 있습니다"
ON public.receivables FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('admin', 'manager')
  )
);

-- 수정 정책 (admin, manager만)
CREATE POLICY "관리자와 매니저는 채권을 수정할 수 있습니다"
ON public.receivables FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('admin', 'manager')
  )
);

-- 삭제 정책 (admin만)
CREATE POLICY "관리자만 채권을 삭제할 수 있습니다"
ON public.receivables FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  )
);
```

#### 3.1.2 receivable_activities (회수활동) 테이블

```sql
-- 회수활동 테이블 생성
CREATE TABLE IF NOT EXISTS public.receivable_activities (
  -- 기본 필드
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- 연동 필드
  receivable_id UUID REFERENCES public.receivables(id) ON DELETE CASCADE NOT NULL,

  -- 활동 정보
  activity_date DATE NOT NULL,
  activity_content TEXT NOT NULL,

  -- 작성자
  created_by UUID REFERENCES public.users(id) NOT NULL
);

-- 인덱스 생성
CREATE INDEX idx_receivable_activities_receivable_id ON public.receivable_activities(receivable_id);
CREATE INDEX idx_receivable_activities_activity_date ON public.receivable_activities(activity_date);

-- RLS 정책
ALTER TABLE public.receivable_activities ENABLE ROW LEVEL SECURITY;

-- 조회 정책
CREATE POLICY "사용자는 자신의 회사 회수활동을 조회할 수 있습니다"
ON public.receivable_activities FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.users
    WHERE company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  )
);

-- 생성 정책
CREATE POLICY "인증된 사용자는 회수활동을 생성할 수 있습니다"
ON public.receivable_activities FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- 수정 정책
CREATE POLICY "작성자만 회수활동을 수정할 수 있습니다"
ON public.receivable_activities FOR UPDATE
USING (auth.uid() = created_by);

-- 삭제 정책
CREATE POLICY "작성자 또는 관리자만 회수활동을 삭제할 수 있습니다"
ON public.receivable_activities FOR DELETE
USING (
  auth.uid() = created_by OR
  auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  )
);
```

### 3.2 뷰 (View) 생성

#### 3.2.1 receivables_with_details (채권 상세 뷰)

```sql
-- 채권 상세 뷰 생성 (JOIN 최적화)
CREATE OR REPLACE VIEW public.receivables_with_details AS
SELECT
  r.id,
  r.created_at,
  r.updated_at,
  r.billing_id,
  r.order_id,
  r.customer_id,
  r.billing_number,
  r.contract_name,
  r.billing_amount,
  r.billing_date,
  r.status,
  r.classification,

  -- 고객 정보
  c.name AS customer_name,
  c.business_number AS customer_business_number,

  -- 담당자 정보 (주문에서 가져옴)
  o.manager_id,
  u.name AS manager_name,

  -- 수금 집계 (서브쿼리)
  COALESCE(
    (SELECT SUM(collection_amount)
     FROM public.collections
     WHERE billing_id = r.billing_id),
    0
  ) AS collected_amount,

  -- 잔액 계산
  r.billing_amount - COALESCE(
    (SELECT SUM(collection_amount)
     FROM public.collections
     WHERE billing_id = r.billing_id),
    0
  ) AS remaining_amount,

  -- 경과일 계산
  CURRENT_DATE - r.billing_date AS days_overdue,

  -- 최종수금일
  (SELECT MAX(collection_date)
   FROM public.collections
   WHERE billing_id = r.billing_id) AS last_collection_date,

  -- 회수활동 건수
  (SELECT COUNT(*)
   FROM public.receivable_activities
   WHERE receivable_id = r.id) AS activity_count

FROM public.receivables r
LEFT JOIN public.customers c ON r.customer_id = c.id
LEFT JOIN public.orders o ON r.order_id = o.id
LEFT JOIN public.users u ON o.manager_id = u.id;

-- 뷰에 인덱스 추가 불가하므로 기본 테이블 인덱스 활용
```

### 3.3 트리거 함수

#### 3.3.1 청구 생성 시 자동 채권 생성

```sql
-- 청구 생성 시 자동으로 채권 생성
CREATE OR REPLACE FUNCTION public.create_receivable_on_billing_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.receivables (
    billing_id,
    order_id,
    customer_id,
    billing_number,
    contract_name,
    billing_amount,
    billing_date,
    status,
    classification
  )
  VALUES (
    NEW.id,
    NEW.order_id,
    NEW.customer_id,
    NEW.billing_number,
    (SELECT contract_name FROM public.orders WHERE id = NEW.order_id),
    NEW.billing_amount,
    NEW.billing_date,
    'pending', -- 초기 상태는 미수
    'normal'   -- 초기 분류는 정상
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
CREATE TRIGGER trigger_create_receivable_on_billing_insert
AFTER INSERT ON public.billings
FOR EACH ROW
EXECUTE FUNCTION public.create_receivable_on_billing_insert();
```

#### 3.3.2 수금 생성/수정/삭제 시 채권 상태 업데이트

```sql
-- 수금 변경 시 채권 상태 자동 업데이트
CREATE OR REPLACE FUNCTION public.update_receivable_status_on_collection_change()
RETURNS TRIGGER AS $$
DECLARE
  v_billing_id UUID;
  v_billing_amount DECIMAL(15, 2);
  v_collected_amount DECIMAL(15, 2);
  v_new_status TEXT;
BEGIN
  -- billing_id 가져오기
  IF TG_OP = 'DELETE' THEN
    v_billing_id := OLD.billing_id;
  ELSE
    v_billing_id := NEW.billing_id;
  END IF;

  -- 청구 금액 및 수금 합계 조회
  SELECT billing_amount INTO v_billing_amount
  FROM public.billings
  WHERE id = v_billing_id;

  SELECT COALESCE(SUM(collection_amount), 0) INTO v_collected_amount
  FROM public.collections
  WHERE billing_id = v_billing_id;

  -- 상태 결정
  IF v_collected_amount = 0 THEN
    v_new_status := 'pending';
  ELSIF v_collected_amount >= v_billing_amount THEN
    v_new_status := 'completed';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- 채권 상태 업데이트
  UPDATE public.receivables
  SET
    status = v_new_status,
    updated_at = now()
  WHERE billing_id = v_billing_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 수금 INSERT 트리거
CREATE TRIGGER trigger_update_receivable_on_collection_insert
AFTER INSERT ON public.collections
FOR EACH ROW
EXECUTE FUNCTION public.update_receivable_status_on_collection_change();

-- 수금 UPDATE 트리거
CREATE TRIGGER trigger_update_receivable_on_collection_update
AFTER UPDATE ON public.collections
FOR EACH ROW
EXECUTE FUNCTION public.update_receivable_status_on_collection_change();

-- 수금 DELETE 트리거
CREATE TRIGGER trigger_update_receivable_on_collection_delete
AFTER DELETE ON public.collections
FOR EACH ROW
EXECUTE FUNCTION public.update_receivable_status_on_collection_change();
```

#### 3.3.3 경과일 기반 자동 분류 업데이트 (배치 작업)

```sql
-- 경과일 기반 분류 업데이트 함수 (배치 작업 - 매일 실행)
CREATE OR REPLACE FUNCTION public.update_receivable_classification()
RETURNS void AS $$
BEGIN
  -- 정상: 0~90일
  UPDATE public.receivables
  SET classification = 'normal'
  WHERE
    status != 'completed' AND
    (CURRENT_DATE - billing_date) BETWEEN 0 AND 90 AND
    classification != 'written_off'; -- 대손은 수동 처리

  -- 장기: 91~180일
  UPDATE public.receivables
  SET classification = 'overdue_long'
  WHERE
    status != 'completed' AND
    (CURRENT_DATE - billing_date) BETWEEN 91 AND 180 AND
    classification != 'written_off';

  -- 부실: 181일 이상
  UPDATE public.receivables
  SET classification = 'bad_debt'
  WHERE
    status != 'completed' AND
    (CURRENT_DATE - billing_date) > 180 AND
    classification != 'written_off';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 매일 자정 실행 (Supabase Edge Function 또는 pg_cron 사용)
-- 예시: SELECT cron.schedule('update-receivable-classification', '0 0 * * *', 'SELECT public.update_receivable_classification();');
```

---

## 4. TypeScript 타입 정의

### 4.1 파일 위치

```
src/types/receivables.ts
```

### 4.2 타입 정의

```typescript
// src/types/receivables.ts
import type { Database } from './database';

// ============================================
// 데이터베이스 타입 (Supabase 생성)
// ============================================

export type Receivable = Database['public']['Tables']['receivables']['Row'];
export type ReceivableInsert = Database['public']['Tables']['receivables']['Insert'];
export type ReceivableUpdate = Database['public']['Tables']['receivables']['Update'];

export type ReceivableActivity = Database['public']['Tables']['receivable_activities']['Row'];
export type ReceivableActivityInsert = Database['public']['Tables']['receivable_activities']['Insert'];
export type ReceivableActivityUpdate = Database['public']['Tables']['receivable_activities']['Update'];

// ============================================
// 확장 타입 (JOIN 결과)
// ============================================

export interface ReceivableWithDetails extends Receivable {
  // 고객 정보
  customer_name: string;
  customer_business_number: string | null;

  // 담당자 정보
  manager_id: string | null;
  manager_name: string | null;

  // 수금 집계
  collected_amount: number;
  remaining_amount: number;

  // 경과일
  days_overdue: number;

  // 최종수금일
  last_collection_date: string | null;

  // 회수활동 건수
  activity_count: number;
}

export interface ReceivableActivityWithDetails extends ReceivableActivity {
  created_by_user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// ============================================
// 폼 데이터 타입
// ============================================

export interface ReceivableFormData {
  billing_id: string;
  classification: 'normal' | 'overdue_long' | 'bad_debt' | 'written_off';
}

export interface ReceivableActivityFormData {
  receivable_id: string;
  activity_date: string;
  activity_content: string;
}

// ============================================
// 상태 및 분류 타입
// ============================================

export type ReceivableStatus = 'pending' | 'partial' | 'completed';
export type ReceivableClassification = 'normal' | 'overdue_long' | 'bad_debt' | 'written_off';

// ============================================
// 유틸리티 타입
// ============================================

export interface ReceivableStats {
  total_count: number;
  total_amount: number;
  collected_amount: number;
  remaining_amount: number;
  by_status: {
    pending: number;
    partial: number;
    completed: number;
  };
  by_classification: {
    normal: number;
    overdue_long: number;
    bad_debt: number;
    written_off: number;
  };
}
```

---

## 5. 페이지 구조

### 5.1 라우트 구조

```
src/app/(dashboard)/inkwang-es/finance/receivables/
├── page.tsx                      # 서버 컴포넌트 (데이터 페칭)
├── receivables-page-client.tsx   # 클라이언트 컴포넌트 (메인)
├── receivables-table.tsx         # 테이블 컴포넌트
├── receivable-columns.tsx        # 테이블 컬럼 정의
├── components/
│   ├── ReceivableToolbar.tsx    # 툴바 (추가, 내보내기, 인쇄)
│   └── ReceivableDetailDialog.tsx # 상세 다이얼로그
└── hooks/
    ├── useReceivableData.ts      # 데이터 관리 훅
    └── useReceivableActions.ts   # 액션 관리 훅
```

### 5.2 파일별 역할

| 파일 | 역할 | 타입 |
|------|------|------|
| `page.tsx` | 서버 컴포넌트, 초기 데이터 페칭 | Server Component |
| `receivables-page-client.tsx` | 클라이언트 진입점, 레이아웃 관리 | Client Component |
| `receivables-table.tsx` | TanStack Table 구현, 데이터 표시 | Client Component |
| `receivable-columns.tsx` | 컬럼 정의, EditableCell 통합 | Client Component |
| `components/ReceivableToolbar.tsx` | CRUD 버튼, Excel/Print 기능 | Client Component |
| `components/ReceivableDetailDialog.tsx` | 채권 상세 정보 표시 | Client Component |
| `hooks/useReceivableData.ts` | 데이터 로딩 및 상태 관리 | Custom Hook |
| `hooks/useReceivableActions.ts` | CRUD 액션 및 비즈니스 로직 | Custom Hook |

---

## 6. 기능 명세

### 6.1 채권 목록 조회

**요구사항**:
- 청구관리와 연동된 모든 채권 조회
- 고객명, 계약명, 채권금액, 잔액, 상태, 분류, 경과일, 담당자, 청구일, 최종수금일, 회수활동 배지 표시

**컬럼 구성**:

| 컬럼명 | 데이터 소스 | 타입 | 설명 |
|--------|-------------|------|------|
| 청구번호 | `billing_number` | Text | 청구 번호 (숨김 가능) |
| 계약명 | `contract_name` | Text | 주문의 계약명 |
| 고객명 | `customer_name` | Text | 고객 이름 |
| 채권금액 | `billing_amount` | Number | 청구 금액 (원화 포맷) |
| 잔액 | `remaining_amount` | Number | 채권금액 - 수금금액 |
| 상태 | `status` | Badge | 미수/부분수금/수금완료 |
| 분류 | `classification` | Badge | 정상/장기/부실/대손 |
| 경과일 | `days_overdue` | Number | 청구일 ~ 오늘 (일) |
| 담당자 | `manager_name` | Text | 주문 담당자 |
| 청구일 | `billing_date` | Date | YYYY-MM-DD |
| 최종수금일 | `last_collection_date` | Date | 가장 최근 수금일 |
| 회수활동 | `activity_count` | Badge | 내역있음/내역없음 |

### 6.2 채권 상태 자동 분류

**상태 (status)**:

| 상태 | 조건 | 배지 색상 |
|------|------|----------|
| `pending` (미수) | `collected_amount = 0` | Gray |
| `partial` (부분수금) | `0 < collected_amount < billing_amount` | Yellow |
| `completed` (수금완료) | `collected_amount >= billing_amount` | Green |

**분류 (classification)**:

| 분류 | 조건 | 배지 색상 |
|------|------|----------|
| `normal` (정상) | `0 ≤ days_overdue ≤ 90` | Blue |
| `overdue_long` (장기) | `91 ≤ days_overdue ≤ 180` | Yellow |
| `bad_debt` (부실) | `days_overdue > 180` | Orange |
| `written_off` (대손) | 수동 처리 | Red |

### 6.3 회수활동 관리

**요구사항**:
- 날짜 + 텍스트 형식으로 회수활동 기록
- 회수활동이 있으면 배지에 "내역있음", 없으면 "내역없음"
- 여러 개의 회수활동 누적 관리 가능

**데이터 구조**:
```typescript
{
  activity_date: '2025-01-21',
  activity_content: '채권자 방문하였으나 만나지 못함.'
}
```

### 6.4 채권 상세 다이얼로그

**표시 정보**:
- **기본 정보**: 계약명, 고객명, 청구번호, 청구일
- **금액 정보**: 채권금액, 수금금액, 잔액
- **상태 정보**: 상태, 분류, 경과일, 담당자, 최종수금일
- **수금 이력**: 수금일, 수금금액, 수금방법, 은행, 예금주 (테이블 형식)
- **회수활동 이력**: 활동일, 활동내용, 작성자 (테이블 형식)

---

## 7. 컴포넌트 구현

### 7.1 page.tsx (서버 컴포넌트)

**파일 경로**: `src/app/(dashboard)/inkwang-es/finance/receivables/page.tsx`

```typescript
import { Suspense } from 'react';
import { getReceivablesWithDetails } from '@/actions/receivables';
import { ReceivablesPageClient } from './receivables-page-client';

export const metadata = {
  title: '채권관리 | 인광ERP',
  description: '청구 기반 채권 현황 및 수금 관리',
};

export default async function ReceivablesPage() {
  // 서버에서 데이터 페칭
  const { data, error } = await getReceivablesWithDetails();

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">데이터 로딩 실패</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <ReceivablesPageClient initialData={data || []} />
    </Suspense>
  );
}
```

### 7.2 receivables-page-client.tsx (클라이언트 컴포넌트)

**파일 경로**: `src/app/(dashboard)/inkwang-es/finance/receivables/receivables-page-client.tsx`

```typescript
'use client';

import React from 'react';
import { ReceivablesTable } from './receivables-table';
import type { ReceivableWithDetails } from '@/types/receivables';

interface ReceivablesPageClientProps {
  initialData: ReceivableWithDetails[];
}

export function ReceivablesPageClient({ initialData }: ReceivablesPageClientProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">채권관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            청구 기반 채권 현황 및 수금 관리
          </p>
        </div>
      </div>

      <ReceivablesTable data={initialData} />
    </div>
  );
}
```

### 7.3 receivables-table.tsx (테이블 컴포넌트)

**파일 경로**: `src/app/(dashboard)/inkwang-es/finance/receivables/receivables-table.tsx`

**구현 가이드**:
1. `useReceivableData` 훅으로 데이터 관리
2. `useReceivableActions` 훅으로 액션 관리
3. `DataTable` 컴포넌트 활용
4. `receivableColumns` 정의
5. `ReceivableToolbar` 툴바 통합
6. `ReceivableDetailDialog` 다이얼로그 통합
7. 행 클릭 시 상세 다이얼로그 오픈

**코드 예시** (주요 부분만):

```typescript
'use client';

import React, { useMemo } from 'react';
import { DataTable } from '@/components/common/data-table';
import { receivableColumns } from './receivable-columns';
import { ReceivableToolbar } from './components/ReceivableToolbar';
import { ReceivableDetailDialog } from './components/ReceivableDetailDialog';
import { useReceivableData } from './hooks/useReceivableData';
import { useReceivableActions } from './hooks/useReceivableActions';
import type { ReceivableWithDetails } from '@/types/receivables';

interface ReceivablesTableProps {
  data: ReceivableWithDetails[];
}

export function ReceivablesTable({ data }: ReceivablesTableProps) {
  // 데이터 관리 훅
  const receivableData = useReceivableData(data);

  // 액션 관리 훅
  const receivableActions = useReceivableActions(receivableData);

  // 메모이제이션된 컬럼
  const columns = useMemo(
    () => receivableColumns({
      onClassificationChange: receivableActions.handleClassificationChange,
    }),
    [receivableActions.handleClassificationChange]
  );

  // 메모이제이션된 데이터
  const tableData = useMemo(() => receivableData.displayData, [receivableData.displayData]);

  return (
    <>
      <DataTable
        columns={columns}
        data={tableData}
        searchKey="contract_name"
        searchPlaceholder="계약명으로 검색..."
        enableColumnVisibility
        enablePageSizeSelection
        pageSizeOptions={[10, 20, 50, 100]}
        onRowClick={(row) => receivableActions.handleRowClick(row)}
        toolbar={
          <ReceivableToolbar
            data={tableData}
            onRefresh={receivableData.refresh}
          />
        }
      />

      {/* 상세 다이얼로그 */}
      {receivableActions.selectedReceivable && (
        <ReceivableDetailDialog
          receivable={receivableActions.selectedReceivable}
          open={receivableActions.detailDialogOpen}
          onOpenChange={receivableActions.setDetailDialogOpen}
        />
      )}
    </>
  );
}
```

### 7.4 receivable-columns.tsx (컬럼 정의)

**파일 경로**: `src/app/(dashboard)/inkwang-es/finance/receivables/receivable-columns.tsx`

**구현 가이드**:
1. `ColumnDef<ReceivableWithDetails>` 타입 사용
2. `DataTableColumnHeader` 활용 (정렬 가능)
3. 숫자는 `toLocaleString()` + '원' 포맷
4. 날짜는 `YYYY-MM-DD` 포맷
5. 배지는 `Badge` 컴포넌트 사용
6. 분류는 `EditableSelectCell`로 수정 가능

**코드 예시** (주요 컬럼만):

```typescript
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/common/data-table';
import { EditableSelectCell } from '@/components/common/editable-select-cell';
import type { ReceivableWithDetails } from '@/types/receivables';

interface ReceivableColumnsProps {
  onClassificationChange: (rowIndex: number, columnId: string, value: string) => Promise<void>;
}

export const receivableColumns = ({
  onClassificationChange,
}: ReceivableColumnsProps): ColumnDef<ReceivableWithDetails>[] => [
  {
    accessorKey: 'contract_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="계약명" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('contract_name')}</div>
    ),
  },
  {
    accessorKey: 'customer_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="고객명" />
    ),
  },
  {
    accessorKey: 'billing_amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="채권금액" />
    ),
    cell: ({ row }) => {
      const amount = row.getValue('billing_amount') as number;
      return (
        <div className="text-right font-medium">
          {amount.toLocaleString()}원
        </div>
      );
    },
  },
  {
    accessorKey: 'remaining_amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="잔액" />
    ),
    cell: ({ row }) => {
      const remaining = row.getValue('remaining_amount') as number;
      return (
        <div className="text-right font-semibold text-orange-600">
          {remaining.toLocaleString()}원
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="상태" />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const statusConfig = {
        pending: { label: '미수', variant: 'secondary' as const },
        partial: { label: '부분수금', variant: 'warning' as const },
        completed: { label: '수금완료', variant: 'success' as const },
      };
      const config = statusConfig[status as keyof typeof statusConfig];
      return <Badge variant={config.variant}>{config.label}</Badge>;
    },
  },
  {
    accessorKey: 'classification',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="분류" />
    ),
    cell: ({ row, getValue }) => {
      const rowIndex = row.index;
      const value = getValue<string>();

      const classificationOptions = [
        { id: 'normal', name: '정상' },
        { id: 'overdue_long', name: '장기' },
        { id: 'bad_debt', name: '부실' },
        { id: 'written_off', name: '대손' },
      ];

      const classificationConfig = {
        normal: 'default' as const,
        overdue_long: 'warning' as const,
        bad_debt: 'destructive' as const,
        written_off: 'destructive' as const,
      };

      const selectedOption = classificationOptions.find(opt => opt.id === value);
      const variant = classificationConfig[value as keyof typeof classificationConfig];

      return (
        <EditableSelectCell
          value={value}
          rowIndex={rowIndex}
          columnId="classification"
          onUpdate={onClassificationChange}
          options={classificationOptions}
          type="select"
          displayValue={
            <Badge variant={variant}>{selectedOption?.name || '정상'}</Badge>
          }
        />
      );
    },
  },
  {
    accessorKey: 'days_overdue',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="경과일" />
    ),
    cell: ({ row }) => {
      const days = row.getValue('days_overdue') as number;
      return <div className="text-center">{days}일</div>;
    },
  },
  {
    accessorKey: 'manager_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="담당자" />
    ),
    cell: ({ row }) => {
      const name = row.getValue('manager_name') as string | null;
      return <div>{name || '-'}</div>;
    },
  },
  {
    accessorKey: 'billing_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="청구일" />
    ),
  },
  {
    accessorKey: 'last_collection_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="최종수금일" />
    ),
    cell: ({ row }) => {
      const date = row.getValue('last_collection_date') as string | null;
      return <div>{date || '-'}</div>;
    },
  },
  {
    accessorKey: 'activity_count',
    header: '회수활동',
    cell: ({ row }) => {
      const count = row.getValue('activity_count') as number;
      return (
        <Badge variant={count > 0 ? 'default' : 'outline'}>
          {count > 0 ? `내역있음 (${count})` : '내역없음'}
        </Badge>
      );
    },
  },
];
```

### 7.5 components/ReceivableToolbar.tsx

**파일 경로**: `src/app/(dashboard)/inkwang-es/finance/receivables/components/ReceivableToolbar.tsx`

**구현 가이드**:
1. `CrudTableToolbar` 컴포넌트 활용
2. Excel 내보내기 버튼 추가
3. 인쇄 버튼 추가
4. 새로고침 버튼 추가
5. 추가 버튼은 숨김 (청구에서 자동 생성)

**코드 예시**:

```typescript
'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportToExcel } from '@/components/common/export-to-excel';
import { PrintTable } from '@/components/common/print-table';
import type { ReceivableWithDetails } from '@/types/receivables';

interface ReceivableToolbarProps {
  data: ReceivableWithDetails[];
  onRefresh: () => void;
}

export function ReceivableToolbar({ data, onRefresh }: ReceivableToolbarProps) {
  // Excel 데이터 변환
  const excelData = data.map((item) => ({
    계약명: item.contract_name,
    고객명: item.customer_name,
    채권금액: item.billing_amount,
    수금금액: item.collected_amount,
    잔액: item.remaining_amount,
    상태: item.status === 'pending' ? '미수' : item.status === 'partial' ? '부분수금' : '수금완료',
    분류:
      item.classification === 'normal'
        ? '정상'
        : item.classification === 'overdue_long'
        ? '장기'
        : item.classification === 'bad_debt'
        ? '부실'
        : '대손',
    경과일: item.days_overdue,
    담당자: item.manager_name || '-',
    청구일: item.billing_date,
    최종수금일: item.last_collection_date || '-',
  }));

  return (
    <div className="flex items-center gap-2">
      {/* 새로고침 */}
      <Button variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4 mr-2" />
        새로고침
      </Button>

      {/* Excel 다운로드 */}
      <ExportToExcel data={excelData} filename="채권관리" />

      {/* 인쇄 */}
      <PrintTable
        data={excelData}
        title="채권관리"
        headers={[
          '계약명',
          '고객명',
          '채권금액',
          '수금금액',
          '잔액',
          '상태',
          '분류',
          '경과일',
          '담당자',
          '청구일',
          '최종수금일',
        ]}
      />
    </div>
  );
}
```

### 7.6 components/ReceivableDetailDialog.tsx

**파일 경로**: `src/app/(dashboard)/inkwang-es/finance/receivables/components/ReceivableDetailDialog.tsx`

**구현 가이드**:
1. `Dialog` 컴포넌트 사용
2. **기본 정보** 섹션: 계약명, 고객명, 청구번호, 청구일
3. **금액 정보** 섹션: 채권금액, 수금금액, 잔액
4. **상태 정보** 섹션: 상태, 분류, 경과일, 담당자, 최종수금일
5. **수금 이력** 섹션: DataTable로 표시
6. **회수활동 이력** 섹션: DataTable로 표시
7. 회수활동 추가 버튼 및 폼

**코드 예시** (주요 구조만):

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getCollectionsByBillingId } from '@/actions/collections';
import { getReceivableActivities, createReceivableActivity } from '@/actions/receivables';
import type { ReceivableWithDetails } from '@/types/receivables';
import type { CollectionWithDetails } from '@/types';
import type { ReceivableActivityWithDetails } from '@/types/receivables';

interface ReceivableDetailDialogProps {
  receivable: ReceivableWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceivableDetailDialog({
  receivable,
  open,
  onOpenChange,
}: ReceivableDetailDialogProps) {
  const [collections, setCollections] = useState<CollectionWithDetails[]>([]);
  const [activities, setActivities] = useState<ReceivableActivityWithDetails[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  useEffect(() => {
    if (open) {
      loadCollections();
      loadActivities();
    }
  }, [open, receivable.id]);

  const loadCollections = async () => {
    setIsLoadingCollections(true);
    const { data } = await getCollectionsByBillingId(receivable.billing_id);
    setCollections(data || []);
    setIsLoadingCollections(false);
  };

  const loadActivities = async () => {
    setIsLoadingActivities(true);
    const { data } = await getReceivableActivities(receivable.id);
    setActivities(data || []);
    setIsLoadingActivities(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>채권 상세 정보</DialogTitle>
          <DialogDescription>
            {receivable.contract_name} - {receivable.customer_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <div>
            <h3 className="font-semibold mb-3">기본 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">계약명</p>
                <p className="font-medium">{receivable.contract_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">고객명</p>
                <p className="font-medium">{receivable.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">청구번호</p>
                <p className="font-medium">{receivable.billing_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">청구일</p>
                <p className="font-medium">{receivable.billing_date}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* 금액 정보 */}
          <div>
            <h3 className="font-semibold mb-3">금액 정보</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">채권금액</p>
                <p className="text-lg font-semibold">
                  {receivable.billing_amount.toLocaleString()}원
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">수금금액</p>
                <p className="text-lg font-semibold text-green-600">
                  {receivable.collected_amount.toLocaleString()}원
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">잔액</p>
                <p className="text-lg font-semibold text-orange-600">
                  {receivable.remaining_amount.toLocaleString()}원
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* 상태 정보 */}
          <div>
            <h3 className="font-semibold mb-3">상태 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">상태</p>
                <Badge
                  variant={
                    receivable.status === 'completed'
                      ? 'success'
                      : receivable.status === 'partial'
                      ? 'warning'
                      : 'secondary'
                  }
                >
                  {receivable.status === 'pending'
                    ? '미수'
                    : receivable.status === 'partial'
                    ? '부분수금'
                    : '수금완료'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">분류</p>
                <Badge
                  variant={
                    receivable.classification === 'normal'
                      ? 'default'
                      : receivable.classification === 'overdue_long'
                      ? 'warning'
                      : 'destructive'
                  }
                >
                  {receivable.classification === 'normal'
                    ? '정상'
                    : receivable.classification === 'overdue_long'
                    ? '장기'
                    : receivable.classification === 'bad_debt'
                    ? '부실'
                    : '대손'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">경과일</p>
                <p className="font-medium">{receivable.days_overdue}일</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">담당자</p>
                <p className="font-medium">{receivable.manager_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">최종수금일</p>
                <p className="font-medium">{receivable.last_collection_date || '-'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* 수금 이력 */}
          <div>
            <h3 className="font-semibold mb-3">수금 이력</h3>
            {isLoadingCollections ? (
              <p className="text-sm text-muted-foreground">로딩 중...</p>
            ) : collections.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">수금일</th>
                      <th className="p-2 text-right">수금금액</th>
                      <th className="p-2 text-left">수금방법</th>
                      <th className="p-2 text-left">은행</th>
                      <th className="p-2 text-left">예금주</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.map((collection) => (
                      <tr key={collection.id} className="border-t">
                        <td className="p-2">{collection.collection_date}</td>
                        <td className="p-2 text-right font-medium">
                          {collection.collection_amount.toLocaleString()}원
                        </td>
                        <td className="p-2">{collection.collection_method}</td>
                        <td className="p-2">{collection.bank_name || '-'}</td>
                        <td className="p-2">{collection.depositor || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">수금 내역이 없습니다.</p>
            )}
          </div>

          <Separator />

          {/* 회수활동 이력 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">회수활동 이력</h3>
              <Button size="sm" onClick={() => {/* TODO: 회수활동 추가 폼 열기 */}}>
                활동 추가
              </Button>
            </div>
            {isLoadingActivities ? (
              <p className="text-sm text-muted-foreground">로딩 중...</p>
            ) : activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="border rounded-lg p-3 bg-muted/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">{activity.activity_date}</p>
                      <p className="text-xs text-muted-foreground">
                        작성자: {activity.created_by_user?.name || '알 수 없음'}
                      </p>
                    </div>
                    <p className="text-sm">{activity.activity_content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">회수활동 내역이 없습니다.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 7.7 hooks/useReceivableData.ts

**파일 경로**: `src/app/(dashboard)/inkwang-es/finance/receivables/hooks/useReceivableData.ts`

**역할**:
- 초기 데이터 상태 관리
- 데이터 새로고침
- 로딩 및 에러 상태 관리

**코드 예시**:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { getReceivablesWithDetails } from '@/actions/receivables';
import type { ReceivableWithDetails } from '@/types/receivables';

export function useReceivableData(initialData: ReceivableWithDetails[]) {
  const [displayData, setDisplayData] = useState<ReceivableWithDetails[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getReceivablesWithDetails();
      if (error) {
        console.error('채권 목록 조회 실패:', error);
        return;
      }
      setDisplayData(data || []);
    } catch (error) {
      console.error('채권 목록 조회 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    displayData,
    isLoading,
    refresh,
  };
}
```

### 7.8 hooks/useReceivableActions.ts

**파일 경로**: `src/app/(dashboard)/inkwang-es/finance/receivables/hooks/useReceivableActions.ts`

**역할**:
- 행 클릭 핸들러
- 분류 변경 핸들러
- 상세 다이얼로그 제어

**코드 예시**:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { updateReceivableClassification } from '@/actions/receivables';
import { useToast } from '@/hooks/use-toast';
import type { ReceivableWithDetails } from '@/types/receivables';

export function useReceivableActions(receivableData: ReturnType<typeof import('./useReceivableData').useReceivableData>) {
  const { toast } = useToast();
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableWithDetails | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleRowClick = useCallback((row: ReceivableWithDetails) => {
    setSelectedReceivable(row);
    setDetailDialogOpen(true);
  }, []);

  const handleClassificationChange = useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const receivable = receivableData.displayData[rowIndex];
      if (!receivable) return;

      const { error } = await updateReceivableClassification(receivable.id, value as any);

      if (error) {
        toast({
          title: '분류 변경 실패',
          description: error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: '분류 변경 완료',
        description: '채권 분류가 성공적으로 변경되었습니다.',
      });

      await receivableData.refresh();
    },
    [receivableData, toast]
  );

  return {
    selectedReceivable,
    detailDialogOpen,
    setDetailDialogOpen,
    handleRowClick,
    handleClassificationChange,
  };
}
```

---

## 8. Server Actions 구현

### 8.1 파일 위치

```
src/actions/receivables.ts
```

### 8.2 주요 함수

**8.2.1 getReceivablesWithDetails()**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import type { ReceivableWithDetails } from '@/types/receivables';

export async function getReceivablesWithDetails() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('receivables_with_details')
      .select('*')
      .order('billing_date', { ascending: false })
      .order('billing_number', { ascending: false });

    if (error) {
      return { data: null, error: `채권 목록 조회 실패: ${error.message}` };
    }

    return { data: data as ReceivableWithDetails[], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}
```

**8.2.2 updateReceivableClassification()**

```typescript
export async function updateReceivableClassification(
  id: string,
  classification: 'normal' | 'overdue_long' | 'bad_debt' | 'written_off'
) {
  try {
    const supabase = await createClient();

    // 권한 확인
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

    if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
      return { error: '권한이 없습니다' };
    }

    const { error } = await supabase
      .from('receivables')
      .update({ classification, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { error: `분류 변경 실패: ${error.message}` };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}
```

**8.2.3 getReceivableActivities()**

```typescript
export async function getReceivableActivities(receivableId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('receivable_activities')
      .select(`
        *,
        created_by_user:users!created_by(id, name, email)
      `)
      .eq('receivable_id', receivableId)
      .order('activity_date', { ascending: false });

    if (error) {
      return { data: null, error: `회수활동 조회 실패: ${error.message}` };
    }

    return { data: data as ReceivableActivityWithDetails[], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}
```

**8.2.4 createReceivableActivity()**

```typescript
export async function createReceivableActivity(formData: {
  receivable_id: string;
  activity_date: string;
  activity_content: string;
}) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: '사용자 인증 실패' };
    }

    const { data, error } = await supabase
      .from('receivable_activities')
      .insert({
        receivable_id: formData.receivable_id,
        activity_date: formData.activity_date,
        activity_content: formData.activity_content,
        created_by: user.id,
      })
      .select(`
        *,
        created_by_user:users!created_by(id, name, email)
      `)
      .single();

    if (error) {
      return { data: null, error: `회수활동 생성 실패: ${error.message}` };
    }

    return { data: data as ReceivableActivityWithDetails, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}
```

**8.2.5 getCollectionsByBillingId()** (collections.ts에 추가)

```typescript
export async function getCollectionsByBillingId(billingId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        bank_account:bank_accounts!bank_account_id (
          id,
          bank_name,
          account_number
        )
      `)
      .eq('billing_id', billingId)
      .order('collection_date', { ascending: false });

    if (error) {
      return { data: null, error: `수금 내역 조회 실패: ${error.message}` };
    }

    return { data: data as CollectionWithDetails[], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}
```

---

## 9. UI/UX 가이드

### 9.1 색상 시스템

**상태 (Status) 배지**:
- **미수 (pending)**: `variant="secondary"` - 회색
- **부분수금 (partial)**: `variant="warning"` - 노란색
- **수금완료 (completed)**: `variant="success"` - 초록색

**분류 (Classification) 배지**:
- **정상 (normal)**: `variant="default"` - 파란색
- **장기 (overdue_long)**: `variant="warning"` - 노란색
- **부실 (bad_debt)**: `variant="destructive"` - 주황색
- **대손 (written_off)**: `variant="destructive"` - 빨간색

**회수활동 배지**:
- **내역있음**: `variant="default"` - 파란색
- **내역없음**: `variant="outline"` - 회색 테두리

### 9.2 반응형 디자인

- **데스크톱**: 전체 테이블 표시
- **태블릿**: 컬럼 가시성 제어 활용
- **모바일**: 카드 뷰 또는 중요 컬럼만 표시

### 9.3 인터랙션

- **더블클릭**: 셀 편집 (분류 컬럼)
- **싱글클릭 (행)**: 상세 다이얼로그 오픈
- **Tab 키**: 다음 편집 가능 셀로 이동
- **Escape 키**: 편집 취소

---

## 10. 단계별 구현 가이드

### Step 1: 데이터베이스 마이그레이션 (30분)

1. Supabase SQL Editor 열기
2. `receivables` 테이블 생성 SQL 실행
3. `receivable_activities` 테이블 생성 SQL 실행
4. `receivables_with_details` 뷰 생성 SQL 실행
5. 트리거 함수 3개 생성 및 트리거 등록
6. RLS 정책 확인

### Step 2: TypeScript 타입 생성 (15분)

1. `pnpm types:gen` 실행하여 Supabase 타입 생성
2. `src/types/receivables.ts` 파일 생성
3. 위의 타입 정의 코드 복사

### Step 3: Server Actions 작성 (45분)

1. `src/actions/receivables.ts` 파일 생성
2. 5개의 Server Action 함수 작성
3. `src/actions/collections.ts`에 `getCollectionsByBillingId()` 추가
4. 타입 체크: `pnpm type-check`

### Step 4: 페이지 및 클라이언트 컴포넌트 작성 (30분)

1. `src/app/(dashboard)/inkwang-es/finance/receivables/` 폴더 생성
2. `page.tsx` 작성 (서버 컴포넌트)
3. `receivables-page-client.tsx` 작성

### Step 5: Hooks 작성 (30분)

1. `hooks/useReceivableData.ts` 작성
2. `hooks/useReceivableActions.ts` 작성

### Step 6: 컬럼 정의 작성 (45분)

1. `receivable-columns.tsx` 작성
2. 11개 컬럼 정의
3. 배지 및 포맷 적용

### Step 7: 테이블 컴포넌트 작성 (30분)

1. `receivables-table.tsx` 작성
2. `DataTable` 통합
3. Hooks 연결

### Step 8: 툴바 컴포넌트 작성 (20분)

1. `components/ReceivableToolbar.tsx` 작성
2. Excel 내보내기 통합
3. 인쇄 기능 통합

### Step 9: 상세 다이얼로그 작성 (60분)

1. `components/ReceivableDetailDialog.tsx` 작성
2. 5개 섹션 구현
3. 수금 이력 테이블 구현
4. 회수활동 이력 표시
5. 회수활동 추가 폼 구현

### Step 10: 사이드바 메뉴 추가 (10분)

1. `src/components/layout/sidebar.tsx` 열기
2. 인광ES → 재무관리 → 채권관리 메뉴 추가

```typescript
{
  title: '재무관리',
  items: [
    {
      title: '청구관리',
      href: '/inkwang-es/finance/billings',
      icon: FileText,
    },
    {
      title: '채권관리', // 새로 추가
      href: '/inkwang-es/finance/receivables',
      icon: TrendingUp,
    },
    {
      title: '수금관리',
      href: '/inkwang-es/finance/collections',
      icon: DollarSign,
    },
  ],
},
```

### Step 11: 테스트 (30분)

1. 청구 생성 → 채권 자동 생성 확인
2. 수금 등록 → 채권 상태 자동 변경 확인
3. 경과일 계산 확인
4. 분류 변경 테스트
5. 회수활동 추가/조회 테스트
6. 상세 다이얼로그 테스트
7. Excel 내보내기 테스트
8. 인쇄 기능 테스트

### Step 12: 최적화 및 배포 (20분)

1. `pnpm lint` 실행
2. `pnpm type-check` 실행
3. `pnpm build` 실행
4. 프로덕션 배포

---

## 총 예상 시간

- **데이터베이스**: 30분
- **타입 정의**: 15분
- **Server Actions**: 45분
- **페이지/클라이언트**: 30분
- **Hooks**: 30분
- **컬럼 정의**: 45분
- **테이블**: 30분
- **툴바**: 20분
- **상세 다이얼로그**: 60분
- **사이드바**: 10분
- **테스트**: 30분
- **최적화**: 20분

**총 합계**: 약 6시간 5분

---

## 참고 자료

### 프로젝트 문서
- `CLAUDE.md` - 프로젝트 전반 가이드
- `src/components/common/data-table.tsx` - DataTable 컴포넌트
- `src/components/common/crud-table-toolbar.tsx` - CRUD 툴바
- `src/lib/server-actions.ts` - CRUD 팩토리 패턴

### 외부 문서
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [TanStack Table v8](https://tanstack.com/table/v8)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Supabase Documentation](https://supabase.com/docs)

---

**작성자**: Claude Code
**버전**: 1.0.0
**최종 수정일**: 2025년 1월 21일
