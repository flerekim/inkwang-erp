# 실적관리 PRD (Product Requirement Document)

> **작성일**: 2025-01-18
> **대상**: 주니어 개발자
> **목표**: 수주관리 연동 실적관리 페이지 구현

## 📋 목차

1. [개요](#개요)
2. [기술 스택](#기술-스택)
3. [데이터베이스 설계](#데이터베이스-설계)
4. [파일 구조](#파일 구조)
5. [구현 단계](#구현-단계)
6. [상세 구현 가이드](#상세-구현-가이드)
7. [테스트 시나리오](#테스트-시나리오)
8. [참고 자료](#참고-자료)

---

## 개요

### 요구사항 요약

**사이드바 경로**: 인광이에스 → 영업관리 → 실적관리

**핵심 기능**:
- 수주관리(신규계약)와 연동된 실적 등록/수정/삭제
- 실적구분(예정/확정) 토글 전환
- 계약번호 선택 시 계약명, 고객명 자동 연동
- 수량 × 단가 자동계산 (사용자 직접 수정 가능)
- 인광이에스 소속 직원만 담당자로 선택 가능
- Excel 내보내기 및 인쇄 기능

### 참고 페이지

본 PRD는 아래 기존 구현 패턴을 참고합니다:

| 참고 항목 | 파일 경로 | 목적 |
|---------|----------|------|
| **수주관리 Actions** | `src/actions/orders.ts` | Server Actions 패턴, CRUD 구현 |
| **수주관리 Table** | `src/app/(dashboard)/inkwang-es/sales/orders/orders-table.tsx` | 테이블 상태 관리, 인라인 편집 패턴 |
| **수주관리 Columns** | `src/app/(dashboard)/inkwang-es/sales/orders/order-columns.tsx` | TanStack Table 컬럼 정의 패턴 |
| **직원관리 Hooks** | `src/app/(dashboard)/admin/employees/hooks/` | 컴포넌트 분리 패턴 |
| **Validation** | `src/lib/validations.ts` | Zod 스키마 검증 패턴 |

---

## 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|-----|------|------|
| **Next.js** | 15.5.4 | App Router, Server Actions, Turbopack |
| **React** | 19.1.0 | UI 컴포넌트 |
| **TypeScript** | 5.x | 타입 안전성 |
| **TanStack Table** | v8 | 고성능 데이터 테이블 |
| **React Hook Form** | 7.x | 폼 검증 |
| **Zod** | 4.x | 스키마 검증 |
| **Tailwind CSS** | v4.0 | 스타일링 |
| **shadcn/ui** | latest | UI 컴포넌트 라이브러리 |

### Backend

| 기술 | 용도 |
|-----|------|
| **Supabase** | PostgreSQL 데이터베이스, 인증 |
| **Next.js Server Actions** | API 레이어 (REST API 불필요) |

### 주요 라이브러리

- **date-fns**: 날짜 포맷팅
- **lucide-react**: 아이콘
- **xlsx**: Excel 내보내기
- **react-to-print**: 인쇄 기능

---

## 데이터베이스 설계

### 1. 테이블 구조

```sql
-- 실적관리 테이블 (performances)
CREATE TABLE performances (
  -- 기본 정보
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 실적 구분 (예정/확정)
  performance_type TEXT NOT NULL CHECK (performance_type IN ('planned', 'confirmed')),

  -- 수주관리 연동 (신규계약만)
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,

  -- 실적 상세
  performance_date DATE NOT NULL,           -- 실적일
  unit TEXT NOT NULL CHECK (unit IN ('ton', 'unit', 'm3')),  -- 단위
  quantity DECIMAL(15, 2) NOT NULL CHECK (quantity >= 0),     -- 수량 (소수점 둘째자리)
  unit_price DECIMAL(15, 0) NOT NULL CHECK (unit_price >= 0), -- 단가 (정수)
  performance_amount DECIMAL(15, 0) NOT NULL CHECK (performance_amount >= 0), -- 실적금액 (정수)

  -- 담당자 (인광이에스 소속 직원만)
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- 비고
  notes TEXT,

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  -- 제약조건
  CONSTRAINT performance_amount_check
    CHECK (performance_amount = FLOOR(quantity * unit_price) OR performance_amount >= 0)
);

-- 인덱스
CREATE INDEX idx_performances_order_id ON performances(order_id);
CREATE INDEX idx_performances_manager_id ON performances(manager_id);
CREATE INDEX idx_performances_performance_date ON performances(performance_date DESC);
CREATE INDEX idx_performances_performance_type ON performances(performance_type);

-- RLS (Row Level Security) 정책
ALTER TABLE performances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view performances"
  ON performances FOR SELECT
  USING (auth.uid() IN (SELECT id FROM users WHERE employment_status = 'active'));

CREATE POLICY "Admins can manage performances"
  ON performances FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role = 'admin' AND employment_status = 'active'
    )
  );
```

### 2. 타입 정의 (TypeScript)

**파일**: `src/types/index.ts`

```typescript
// ============================================
// 실적관리 타입 정의
// ============================================

/**
 * 실적구분 Enum
 */
export type PerformanceType = 'planned' | 'confirmed';

/**
 * 단위 Enum
 */
export type UnitType = 'ton' | 'unit' | 'm3';

/**
 * 실적 기본 타입 (DB Row)
 */
export interface Performance {
  id: string;
  performance_type: PerformanceType;
  order_id: string;
  performance_date: string; // YYYY-MM-DD
  unit: UnitType;
  quantity: number; // 소수점 둘째자리
  unit_price: number; // 정수
  performance_amount: number; // 정수
  manager_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * 실적 + JOIN된 관계형 데이터
 */
export interface PerformanceWithDetails extends Performance {
  order: {
    id: string;
    order_number: string;
    contract_name: string;
    customer: {
      id: string;
      name: string;
    } | null;
  } | null;
  manager: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/**
 * 실적 폼 데이터 (UI용)
 */
export interface PerformanceFormData {
  performance_type: PerformanceType;
  order_id: string;
  performance_date: string;
  unit: UnitType;
  quantity: string; // UI에서는 string으로 받음
  unit_price: string; // UI에서는 string으로 받음
  performance_amount: string; // UI에서는 string으로 받음
  manager_id: string | null;
  notes: string | null;
}

/**
 * 신규 계약 선택용 타입
 */
export interface NewOrderOption {
  id: string;
  order_number: string;
  contract_name: string;
  customer_name: string;
}
```

### 3. Zod 스키마 검증

**파일**: `src/lib/validations.ts`

```typescript
// ============================================
// 실적관리 유효성 검사
// ============================================

/**
 * 실적 생성 스키마
 */
export const performanceInsertSchema = z.object({
  // 실적 구분
  performance_type: z.enum(['planned', 'confirmed'], {
    message: '실적구분을 선택해주세요',
  }),

  // 계약번호 (신규계약만 선택 가능)
  order_id: z.string().uuid('올바른 계약을 선택해주세요'),

  // 실적일
  performance_date: z
    .string({ message: '실적일을 선택해주세요' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식(YYYY-MM-DD)이 아닙니다'),

  // 단위
  unit: z.enum(['ton', 'unit', 'm3'], {
    message: '단위를 선택해주세요',
  }),

  // 수량 (소수점 둘째자리까지)
  quantity: z
    .union([
      z.number(),
      z.string().transform((val) => {
        const num = Number(val.replace(/,/g, '')); // 천단위 구분기호 제거
        if (isNaN(num)) {
          throw new Error('올바른 수량을 입력해주세요');
        }
        return Math.round(num * 100) / 100; // 소수점 둘째자리까지
      }),
    ])
    .refine((val) => typeof val === 'number' && val >= 0, {
      message: '수량은 0 이상이어야 합니다',
    })
    .refine((val) => typeof val === 'number' && val <= 999999.99, {
      message: '수량이 너무 큽니다 (최대: 999,999.99)',
    }),

  // 단가 (정수, 천단위 구분기호)
  unit_price: z
    .union([
      z.number(),
      z.string().transform((val) => {
        const num = Number(val.replace(/,/g, '')); // 천단위 구분기호 제거
        if (isNaN(num)) {
          throw new Error('올바른 단가를 입력해주세요');
        }
        return Math.floor(num); // 소수점 제거
      }),
    ])
    .refine((val) => typeof val === 'number' && val >= 0, {
      message: '단가는 0 이상이어야 합니다',
    })
    .refine((val) => typeof val === 'number' && val <= 999999999999, {
      message: '단가가 너무 큽니다 (최대: 999,999,999,999원)',
    }),

  // 실적금액 (정수, 기본값: 수량 × 단가)
  performance_amount: z
    .union([
      z.number(),
      z.string().transform((val) => {
        const num = Number(val.replace(/,/g, '')); // 천단위 구분기호 제거
        if (isNaN(num)) {
          throw new Error('올바른 실적금액을 입력해주세요');
        }
        return Math.floor(num); // 소수점 제거
      }),
    ])
    .refine((val) => typeof val === 'number' && val >= 0, {
      message: '실적금액은 0 이상이어야 합니다',
    })
    .refine((val) => typeof val === 'number' && val <= 999999999999, {
      message: '실적금액이 너무 큽니다 (최대: 999,999,999,999원)',
    }),

  // 담당자 (인광이에스 소속 직원만)
  manager_id: z.string().uuid().nullable().optional(),

  // 비고
  notes: z.string().nullable().optional(),
});

/**
 * 실적 수정 스키마 (Partial)
 */
export const performanceUpdateSchema = performanceInsertSchema.partial();
```

---

## 파일 구조

```
src/
├── actions/
│   └── performances.ts              # Server Actions (CRUD)
│
├── app/(dashboard)/inkwang-es/sales/
│   └── performances/
│       ├── page.tsx                  # 서버 컴포넌트 (데이터 페칭)
│       ├── performances-page-client.tsx  # 클라이언트 래퍼
│       ├── performances-table.tsx    # 테이블 메인 컴포넌트
│       ├── performance-columns.tsx   # TanStack Table 컬럼 정의
│       ├── hooks/
│       │   ├── usePerformanceData.ts # 관계형 데이터 로드 훅
│       │   └── usePerformanceActions.ts # CRUD 액션 훅
│       ├── components/
│       │   └── PerformanceToolbar.tsx # 툴바 컴포넌트
│       └── mobile-performance-card.tsx # 모바일 카드 뷰
│
├── types/
│   └── index.ts                      # Performance 타입 추가
│
└── lib/
    └── validations.ts                # Zod 스키마 추가
```

---

## 구현 단계

### Phase 1: 데이터베이스 설정 (30분)

1. **마이그레이션 파일 생성**
   ```bash
   cd supabase
   npx supabase migration create create_performances_table
   ```

2. **SQL 작성** (`supabase/migrations/YYYYMMDDHHMMSS_create_performances_table.sql`)
   - 위의 [데이터베이스 설계](#데이터베이스-설계) 섹션 SQL 복사
   - 로컬 테스트: `npx supabase db reset`

3. **타입 생성**
   ```bash
   pnpm types:gen
   ```

### Phase 2: 타입 및 검증 스키마 정의 (20분)

1. **타입 정의** (`src/types/index.ts`)
   - Performance, PerformanceWithDetails, PerformanceFormData 추가

2. **Zod 스키마** (`src/lib/validations.ts`)
   - performanceInsertSchema, performanceUpdateSchema 추가

### Phase 3: Server Actions 구현 (1시간)

**파일**: `src/actions/performances.ts`

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { performanceInsertSchema, performanceUpdateSchema } from '@/lib/validations';
import type { PerformanceFormData, PerformanceWithDetails } from '@/types';

/**
 * 실적 목록 조회
 */
export async function getPerformances() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('performances')
      .select(`
        *,
        order:orders!order_id(
          id,
          order_number,
          contract_name,
          customer:customers!customer_id(id, name)
        ),
        manager:users!manager_id(id, name, email)
      `)
      .order('performance_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: `실적 목록 조회 실패: ${error.message}` };
    }

    return { data: data as PerformanceWithDetails[], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 실적 단건 조회
 */
export async function getPerformanceById(id: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('performances')
      .select(`
        *,
        order:orders!order_id(
          id,
          order_number,
          contract_name,
          customer:customers!customer_id(id, name)
        ),
        manager:users!manager_id(id, name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: `실적 조회 실패: ${error.message}` };
    }

    return { data: data as PerformanceWithDetails, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 실적 생성
 */
export async function createPerformance(formData: PerformanceFormData) {
  const supabase = await createClient();

  // 권한 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: '인증이 필요합니다' };
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentUser?.role !== 'admin') {
    return { data: null, error: '권한이 없습니다' };
  }

  // 유효성 검사
  const validation = performanceInsertSchema.safeParse(formData);
  if (!validation.success) {
    return { data: null, error: validation.error.issues[0].message };
  }

  try {
    const { data: performance, error: performanceError } = await supabase
      .from('performances')
      .insert({
        ...validation.data,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (performanceError) {
      return { data: null, error: `실적 생성 실패: ${performanceError.message}` };
    }

    revalidatePath('/inkwang-es/sales/performances');
    return { data: performance, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 실적 수정
 */
export async function updatePerformance(id: string, formData: Partial<PerformanceFormData>) {
  const supabase = await createClient();

  // 권한 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentUser?.role !== 'admin') {
    return { error: '권한이 없습니다' };
  }

  // 유효성 검사
  const validation = performanceUpdateSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const { error } = await supabase
      .from('performances')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', id);

    if (error) {
      return { error: `수정 실패: ${error.message}` };
    }

    revalidatePath('/inkwang-es/sales/performances');
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 실적 삭제
 */
export async function deletePerformance(id: string) {
  const supabase = await createClient();

  // 권한 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentUser?.role !== 'admin') {
    return { error: '권한이 없습니다' };
  }

  try {
    const { error } = await supabase.from('performances').delete().eq('id', id);

    if (error) {
      return { error: `삭제 실패: ${error.message}` };
    }

    revalidatePath('/inkwang-es/sales/performances');
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 신규 계약 목록 조회 (계약번호 선택용)
 */
export async function getNewOrdersForPerformance() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      contract_name,
      customer:customers!customer_id(name)
    `)
    .eq('contract_type', 'new')
    .order('contract_date', { ascending: false });

  if (error) {
    throw new Error(`신규 계약 목록 조회 실패: ${error.message}`);
  }

  return data.map((order: any) => ({
    id: order.id,
    order_number: order.order_number,
    contract_name: order.contract_name,
    customer_name: order.customer?.name || '',
  }));
}

/**
 * 인광이에스 소속 직원 목록 조회 (담당자 선택용)
 */
export async function getInkwangESEmployees() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, company:companies!company_id(name)')
    .eq('employment_status', 'active')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`직원 목록 조회 실패: ${error.message}`);
  }

  // 인광이에스 소속 직원만 필터링
  return data.filter((user: any) => user.company?.name === '인광이에스');
}
```

### Phase 4: 테이블 컴포넌트 구현 (2시간)

#### 4-1. 서버 페이지 컴포넌트

**파일**: `src/app/(dashboard)/inkwang-es/sales/performances/page.tsx`

```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPerformances } from '@/actions/performances';
import { PerformancesPageClient } from './performances-page-client';

export const revalidate = 60; // 60초마다 캐시 갱신

export default async function PerformancesPage() {
  // 1. 인증 확인
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. 권한 확인
  const { data: currentUser } = await supabase
    .from('users')
    .select('role, company:companies!company_id(name)')
    .eq('id', user.id)
    .single();

  if (!currentUser) {
    redirect('/login');
  }

  // 3. 인광이에스 소속 확인
  if (currentUser.company?.name !== '인광이에스') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">접근 권한 없음</h2>
          <p className="text-muted-foreground">
            이 페이지는 인광이에스 소속 직원만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  // 4. 데이터 페칭
  const result = await getPerformances();

  if (result.error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">데이터 로드 실패</h2>
          <p className="text-muted-foreground">{result.error}</p>
        </div>
      </div>
    );
  }

  // 5. 클라이언트 컴포넌트로 전달
  return <PerformancesPageClient data={result.data || []} />;
}
```

#### 4-2. 클라이언트 래퍼

**파일**: `src/app/(dashboard)/inkwang-es/sales/performances/performances-page-client.tsx`

```typescript
'use client';

import { PerformancesTable } from './performances-table';
import type { PerformanceWithDetails } from '@/types';

interface PerformancesPageClientProps {
  data: PerformanceWithDetails[];
}

export function PerformancesPageClient({ data }: PerformancesPageClientProps) {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">실적관리</h2>
      </div>
      <PerformancesTable data={data} />
    </div>
  );
}
```

#### 4-3. 데이터 로드 훅

**파일**: `src/app/(dashboard)/inkwang-es/sales/performances/hooks/usePerformanceData.ts`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getNewOrdersForPerformance, getInkwangESEmployees } from '@/actions/performances';
import type { NewOrderOption, UserSelectOption } from '@/types';

export function usePerformanceData() {
  const { toast } = useToast();

  const [newOrders, setNewOrders] = useState<NewOrderOption[]>([]);
  const [employees, setEmployees] = useState<UserSelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [ordersData, employeesData] = await Promise.all([
          getNewOrdersForPerformance(),
          getInkwangESEmployees(),
        ]);

        setNewOrders(ordersData);
        setEmployees(employeesData);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '데이터 로드 실패',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  return { newOrders, employees, isLoading };
}
```

#### 4-4. 액션 훅

**파일**: `src/app/(dashboard)/inkwang-es/sales/performances/hooks/usePerformanceActions.ts`

```typescript
'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createPerformance, updatePerformance, deletePerformance } from '@/actions/performances';
import type { UseTableStateReturn } from '@/hooks/use-table-state';
import type { PerformanceWithDetails, PerformanceFormData } from '@/types';

export function usePerformanceActions(
  tableState: UseTableStateReturn<PerformanceWithDetails>
) {
  const { toast } = useToast();
  const router = useRouter();

  const {
    tableData,
    setTableData,
    newRowData,
    setNewRowData,
    setIsSavingNewRow,
    setIsDeleting,
    setDeleteDialogOpen,
    setRowSelection,
  } = tableState;

  // 실적 추가 (인라인)
  const handleAddPerformance = useCallback(() => {
    if (newRowData) {
      toast({
        variant: 'destructive',
        title: '추가 중인 실적이 있습니다',
        description: '현재 추가 중인 실적을 먼저 저장하거나 취소해주세요.',
      });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newRow: Partial<PerformanceWithDetails> = {
      id: tempId,
      performance_type: 'planned',
      order_id: '',
      performance_date: new Date().toISOString().split('T')[0],
      unit: 'ton',
      quantity: 0,
      unit_price: 0,
      performance_amount: 0,
      manager_id: null,
      notes: null,
    };
    setNewRowData(newRow);
  }, [newRowData, setNewRowData, toast]);

  // 신규 행 필드 업데이트
  const handleUpdateNewRow = useCallback((field: string, value: unknown) => {
    setNewRowData((prev) => {
      if (!prev) return prev;

      // 타입 변환 처리
      let processedValue = value;
      if (field === 'quantity' || field === 'unit_price' || field === 'performance_amount') {
        processedValue = typeof value === 'string' ? Number(value.replace(/,/g, '')) || 0 : value;
      }

      // 수량 또는 단가 변경 시 실적금액 자동 계산
      const updatedRow = { ...prev, [field]: processedValue };
      if (field === 'quantity' || field === 'unit_price') {
        const quantity = field === 'quantity' ? (processedValue as number) : (prev.quantity || 0);
        const unitPrice = field === 'unit_price' ? (processedValue as number) : (prev.unit_price || 0);
        updatedRow.performance_amount = Math.floor(quantity * unitPrice);
      }

      return updatedRow;
    });
  }, [setNewRowData]);

  // 기존 행 셀 업데이트
  const handleUpdateCell = useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const performance = tableData[rowIndex];
      if (!performance) return;

      // Optimistic update
      const prevData = [...tableData];
      setTableData((old) =>
        old.map((row, idx) => (idx === rowIndex ? { ...row, [columnId]: value } : row))
      );

      try {
        // 수량 또는 단가 변경 시 실적금액 자동 계산
        let updateData: any = { [columnId]: value };
        if (columnId === 'quantity' || columnId === 'unit_price') {
          const quantity = columnId === 'quantity' ? Number(value) : performance.quantity;
          const unitPrice = columnId === 'unit_price' ? Number(value) : performance.unit_price;
          updateData.performance_amount = Math.floor(quantity * unitPrice);
        }

        const result = await updatePerformance(performance.id, updateData);
        if (result.error) {
          // Rollback on error
          setTableData(prevData);
          toast({
            variant: 'destructive',
            title: '수정 실패',
            description: result.error,
          });
          throw new Error(result.error);
        }

        toast({
          title: '수정 완료',
          description: '실적 정보가 수정되었습니다.',
        });
        router.refresh();
      } catch (error) {
        throw error;
      }
    },
    [tableData, setTableData, toast, router]
  );

  // 통합 업데이트 핸들러
  const handleUnifiedUpdate = useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const performance = tableData[rowIndex] || newRowData;
      if (!performance) return;

      // temp- prefix가 있으면 새 행
      if (performance.id?.startsWith('temp-')) {
        handleUpdateNewRow(columnId, value);
      } else {
        await handleUpdateCell(rowIndex, columnId, value);
      }
    },
    [tableData, newRowData, handleUpdateCell, handleUpdateNewRow]
  );

  // 신규 행 저장
  const handleSaveNewRow = useCallback(async () => {
    if (!newRowData) return;

    // 필수 필드 검증
    if (!newRowData.order_id) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '계약번호를 선택해주세요.',
      });
      return;
    }

    setIsSavingNewRow(true);

    try {
      const result = await createPerformance({
        performance_type: newRowData.performance_type as 'planned' | 'confirmed',
        order_id: newRowData.order_id,
        performance_date: newRowData.performance_date || new Date().toISOString().split('T')[0],
        unit: newRowData.unit as 'ton' | 'unit' | 'm3',
        quantity: String(newRowData.quantity || 0),
        unit_price: String(newRowData.unit_price || 0),
        performance_amount: String(newRowData.performance_amount || 0),
        manager_id: newRowData.manager_id || null,
        notes: newRowData.notes || null,
      });

      if (result.error) {
        toast({
          variant: 'destructive',
          title: '추가 실패',
          description: result.error,
        });
        return;
      }

      toast({
        title: '추가 완료',
        description: '새로운 실적이 추가되었습니다.',
      });

      setNewRowData(null);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '추가 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      setIsSavingNewRow(false);
    }
  }, [newRowData, setNewRowData, setIsSavingNewRow, toast, router]);

  // 신규 행 취소
  const handleCancelNewRow = useCallback(() => {
    setNewRowData(null);
  }, [setNewRowData]);

  // 선택된 행 삭제
  const handleDeleteSelected = useCallback(async (selectedIndices: number[]) => {
    const selectedPerformances = selectedIndices.map((index) => tableData[index]).filter(Boolean);

    if (selectedPerformances.length === 0) {
      toast({
        variant: 'destructive',
        title: '선택 오류',
        description: '삭제할 실적을 선택해주세요.',
      });
      return;
    }

    setIsDeleting(true);

    try {
      const results = await Promise.allSettled(
        selectedPerformances.map((performance) => deletePerformance(performance.id))
      );

      const failures = results.filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
      );
      const successes = results.filter((r) => r.status === 'fulfilled' && r.value.success);

      if (failures.length > 0) {
        toast({
          variant: 'destructive',
          title: '일부 삭제 실패',
          description: `${successes.length}건 삭제 성공, ${failures.length}건 실패`,
        });
      } else {
        toast({
          title: '삭제 완료',
          description: `${selectedPerformances.length}건의 실적이 삭제되었습니다.`,
        });
      }

      setRowSelection({});
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }, [tableData, setIsDeleting, setDeleteDialogOpen, setRowSelection, toast, router]);

  return {
    handleAddPerformance,
    handleUpdateNewRow,
    handleUpdateCell,
    handleUnifiedUpdate,
    handleSaveNewRow,
    handleCancelNewRow,
    handleDeleteSelected,
  };
}
```

#### 4-5. 컬럼 정의

**파일**: `src/app/(dashboard)/inkwang-es/sales/performances/performance-columns.tsx`

```typescript
'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { DataTableColumnHeader } from '@/components/common/data-table';
import { EditableCell } from '@/components/common/editable-cell';
import { EditableSelectCell } from '@/components/common/editable-select-cell';
import { EditableDateCell } from '@/components/common/editable-date-cell';
import { EditableNotesCell } from '@/components/common/editable-notes-cell';
import type { PerformanceWithDetails, NewOrderOption, UserSelectOption } from '@/types';

interface PerformanceColumnsProps {
  newOrders: NewOrderOption[];
  employees: UserSelectOption[];
  handleUnifiedUpdate: (rowIndex: number, columnId: string, value: string) => Promise<void>;
}

export function createPerformanceColumns({
  newOrders,
  employees,
  handleUnifiedUpdate,
}: PerformanceColumnsProps): ColumnDef<PerformanceWithDetails>[] {
  // 단위 옵션
  const unitOptions = [
    { id: 'ton', name: 'Ton' },
    { id: 'unit', name: '대' },
    { id: 'm3', name: 'm³' },
  ];

  return [
    // 체크박스
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

    // 실적구분 (토글)
    {
      accessorKey: 'performance_type',
      header: '실적구분',
      cell: ({ row }) => {
        const performanceType = row.getValue('performance_type') as string;
        const isPlanned = performanceType === 'planned';

        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={!isPlanned}
              onCheckedChange={async (checked) => {
                const newType = checked ? 'confirmed' : 'planned';
                await handleUnifiedUpdate(row.index, 'performance_type', newType);
              }}
            />
            <Badge variant={isPlanned ? 'outline' : 'default'}>
              {isPlanned ? '예정' : '확정'}
            </Badge>
          </div>
        );
      },
      enableSorting: false,
    },

    // 계약번호 (Combobox)
    {
      accessorKey: 'order_id',
      header: '계약번호',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const orderId = row.original.order_id;
        const order = newOrders.find((o) => o.id === orderId);

        return (
          <EditableSelectCell
            value={orderId}
            rowIndex={row.index}
            columnId="order_id"
            onUpdate={handleUnifiedUpdate}
            options={newOrders}
            type="combobox"
            placeholder="계약 선택"
            searchPlaceholder="계약번호 또는 계약명 검색..."
            displayValue={order?.order_number}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: false,
    },

    // 계약명 (읽기 전용, 계약번호 연동)
    {
      accessorKey: 'order.contract_name',
      header: '계약명',
      cell: ({ row }) => {
        const contractName = row.original.order?.contract_name;
        return (
          <span className="text-sm text-muted-foreground">
            {contractName || '-'}
          </span>
        );
      },
      enableSorting: false,
    },

    // 고객명 (읽기 전용, 계약번호 연동)
    {
      accessorKey: 'order.customer.name',
      header: '고객명',
      cell: ({ row }) => {
        const customerName = row.original.order?.customer?.name;
        return (
          <span className="text-sm text-muted-foreground">
            {customerName || '-'}
          </span>
        );
      },
      enableSorting: false,
    },

    // 실적일
    {
      accessorKey: 'performance_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="실적일" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableDateCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="performance_date"
            onUpdate={handleUnifiedUpdate}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: true,
    },

    // 단위
    {
      accessorKey: 'unit',
      header: '단위',
      cell: ({ row }) => {
        const unit = row.getValue('unit') as string;
        return (
          <EditableSelectCell
            value={unit}
            rowIndex={row.index}
            columnId="unit"
            onUpdate={handleUnifiedUpdate}
            options={unitOptions}
            type="select"
            placeholder="단위"
            displayValue={
              unit === 'ton' ? 'Ton' : unit === 'unit' ? '대' : 'm³'
            }
          />
        );
      },
      enableSorting: false,
    },

    // 수량 (소수점 둘째자리, 천단위 구분기호)
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title="수량" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const quantity = getValue<number>();

        return (
          <EditableCell
            value={quantity?.toString() || '0'}
            rowIndex={row.index}
            columnId="quantity"
            type="number"
            onUpdate={handleUnifiedUpdate}
            className={isNewRow ? 'border border-primary/50' : ''}
            formatDisplay={(value) => {
              const num = Number(value || 0);
              return num.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
            }}
          />
        );
      },
      enableSorting: true,
    },

    // 단가 (정수, 천단위 구분기호)
    {
      accessorKey: 'unit_price',
      header: ({ column }) => <DataTableColumnHeader column={column} title="단가" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const unitPrice = getValue<number>();

        return (
          <EditableCell
            value={unitPrice?.toString() || '0'}
            rowIndex={row.index}
            columnId="unit_price"
            type="number"
            onUpdate={handleUnifiedUpdate}
            className={isNewRow ? 'border border-primary/50' : ''}
            formatDisplay={(value) => {
              const num = Math.floor(Number(value || 0));
              return num.toLocaleString() + '원';
            }}
          />
        );
      },
      enableSorting: true,
    },

    // 실적금액 (정수, 천단위 구분기호)
    {
      accessorKey: 'performance_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="실적금액" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const performanceAmount = getValue<number>();

        return (
          <EditableCell
            value={performanceAmount?.toString() || '0'}
            rowIndex={row.index}
            columnId="performance_amount"
            type="number"
            onUpdate={handleUnifiedUpdate}
            className={isNewRow ? 'border border-primary/50' : ''}
            formatDisplay={(value) => {
              const num = Math.floor(Number(value || 0));
              return num.toLocaleString() + '원';
            }}
          />
        );
      },
      enableSorting: true,
    },

    // 담당자 (인광이에스 소속 직원만)
    {
      accessorKey: 'manager_id',
      header: '담당자',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableSelectCell
            value={row.original.manager_id}
            rowIndex={row.index}
            columnId="manager_id"
            onUpdate={handleUnifiedUpdate}
            options={employees}
            type="combobox"
            placeholder="담당자 선택"
            searchPlaceholder="담당자 검색..."
            displayValue={
              row.original.manager?.name ||
              (isNewRow &&
                row.original.manager_id &&
                employees.find((u) => u.id === row.original.manager_id)?.name)
            }
          />
        );
      },
      enableSorting: false,
    },

    // 비고
    {
      accessorKey: 'notes',
      header: '비고',
      cell: ({ row }) => {
        const notes = row.getValue('notes') as string | null;

        return (
          <EditableNotesCell
            notes={notes}
            onSave={async (value) => {
              await handleUnifiedUpdate(row.index, 'notes', value);
            }}
          />
        );
      },
      enableSorting: false,
    },
  ];
}
```

#### 4-6. 메인 테이블 컴포넌트

**파일**: `src/app/(dashboard)/inkwang-es/sales/performances/performances-table.tsx`

```typescript
'use client';

import * as React from 'react';
import { DataTable } from '@/components/common/data-table';
import { useTableState } from '@/hooks/use-table-state';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import { createPerformanceColumns } from './performance-columns';
import { usePerformanceData } from './hooks/usePerformanceData';
import { usePerformanceActions } from './hooks/usePerformanceActions';
import { PerformanceToolbar } from './components/PerformanceToolbar';
import type { PerformanceWithDetails } from '@/types';

interface PerformancesTableProps {
  data: PerformanceWithDetails[];
}

export function PerformancesTable({ data }: PerformancesTableProps) {
  // 테이블 상태 관리
  const tableState = useTableState<PerformanceWithDetails>(data);

  // 관계형 데이터 로드
  const { newOrders, employees, isLoading } = usePerformanceData();

  // CRUD 액션
  const {
    handleAddPerformance,
    handleUnifiedUpdate,
    handleSaveNewRow,
    handleCancelNewRow,
    handleDeleteSelected,
  } = usePerformanceActions(tableState);

  // 표시할 데이터 (신규 행 포함)
  const displayData = React.useMemo(() => {
    if (tableState.newRowData) {
      return [tableState.newRowData as PerformanceWithDetails, ...tableState.tableData];
    }
    return tableState.tableData;
  }, [tableState.tableData, tableState.newRowData]);

  // 컬럼 정의
  const columns = React.useMemo(
    () =>
      createPerformanceColumns({
        newOrders,
        employees,
        handleUnifiedUpdate,
      }),
    [newOrders, employees, handleUnifiedUpdate]
  );

  // Excel 내보내기 컬럼
  const exportColumns = React.useMemo<ExportColumn<PerformanceWithDetails>[]>(
    () => [
      {
        key: 'performance_type',
        header: '실적구분',
        format: (value) => (value === 'planned' ? '예정' : '확정'),
      },
      {
        key: 'order.order_number',
        header: '계약번호',
        format: (_, row) => row.order?.order_number || '',
      },
      {
        key: 'order.contract_name',
        header: '계약명',
        format: (_, row) => row.order?.contract_name || '',
      },
      {
        key: 'order.customer.name',
        header: '고객명',
        format: (_, row) => row.order?.customer?.name || '',
      },
      { key: 'performance_date', header: '실적일' },
      {
        key: 'unit',
        header: '단위',
        format: (value) =>
          value === 'ton' ? 'Ton' : value === 'unit' ? '대' : 'm³',
      },
      {
        key: 'quantity',
        header: '수량',
        format: (value) => String(Number(value).toFixed(2)),
      },
      {
        key: 'unit_price',
        header: '단가',
        format: (value) => String(Number(value).toLocaleString()),
      },
      {
        key: 'performance_amount',
        header: '실적금액',
        format: (value) => String(Number(value).toLocaleString()),
      },
      {
        key: 'manager_id',
        header: '담당자',
        format: (_, row) => row.manager?.name || '',
      },
    ],
    []
  );

  // 인쇄용 컬럼
  const printColumns = React.useMemo<PrintColumn<PerformanceWithDetails>[]>(
    () => [
      {
        key: 'performance_type',
        header: '실적구분',
        width: '80px',
        align: 'center',
        format: (value) => <>{value === 'planned' ? '예정' : '확정'}</>,
      },
      {
        key: 'order.order_number',
        header: '계약번호',
        width: '120px',
        format: (_, row) => <>{row.order?.order_number || ''}</>,
      },
      {
        key: 'order.contract_name',
        header: '계약명',
        width: '200px',
        format: (_, row) => <>{row.order?.contract_name || ''}</>,
      },
      {
        key: 'performance_date',
        header: '실적일',
        width: '100px',
        align: 'center',
      },
      {
        key: 'quantity',
        header: '수량',
        width: '100px',
        align: 'right',
        format: (value) => <>{Number(value).toFixed(2)}</>,
      },
      {
        key: 'performance_amount',
        header: '실적금액',
        width: '120px',
        align: 'right',
        format: (value) => <>{`${Number(value).toLocaleString()}원`}</>,
      },
    ],
    []
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-96">데이터 로딩 중...</div>;
  }

  return (
    <>
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={displayData}
          searchKey="order.contract_name"
          searchPlaceholder="계약명 검색..."
          pageSize={10}
          enableRowSelection
          rowSelection={tableState.rowSelection}
          onRowSelectionChange={tableState.setRowSelection}
          enableFuzzyFilter={true}
          enableColumnResizing={true}
          columnResizeMode="onChange"
          enableColumnPinning={true}
          enableColumnVisibility={true}
          enablePageSizeSelection={true}
          enablePageJump={true}
          toolbar={
            <PerformanceToolbar
              isAddingNew={!!tableState.newRowData}
              isSaving={tableState.isSavingNewRow}
              selectedCount={tableState.selectedCount}
              isDeleting={tableState.isDeleting}
              onAdd={handleAddPerformance}
              onSave={handleSaveNewRow}
              onCancel={handleCancelNewRow}
              onDelete={() => tableState.setDeleteDialogOpen(true)}
              exportButton={
                <ExportToExcel
                  data={tableState.tableData}
                  columns={exportColumns}
                  filename={`실적목록_${new Date().toISOString().split('T')[0]}.xlsx`}
                  sheetName="실적"
                  buttonText="Excel 다운로드"
                />
              }
              printButton={
                <PrintTable
                  data={tableState.tableData}
                  columns={printColumns}
                  title="실적 목록"
                  subtitle={`총 ${tableState.tableData.length}건 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`}
                  buttonText="인쇄"
                />
              }
            />
          }
        />
      </div>

      <DeleteConfirmDialog
        open={tableState.deleteDialogOpen}
        onOpenChange={tableState.setDeleteDialogOpen}
        onConfirm={() =>
          handleDeleteSelected(Object.keys(tableState.rowSelection).map(Number))
        }
        title="실적 삭제"
        description={`선택한 ${tableState.selectedCount}건의 실적을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        isDeleting={tableState.isDeleting}
      />
    </>
  );
}
```

#### 4-7. 툴바 컴포넌트

**파일**: `src/app/(dashboard)/inkwang-es/sales/performances/components/PerformanceToolbar.tsx`

```typescript
'use client';

import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';

interface PerformanceToolbarProps {
  isAddingNew: boolean;
  isSaving: boolean;
  selectedCount: number;
  isDeleting: boolean;
  onAdd: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  exportButton: React.ReactNode;
  printButton: React.ReactNode;
}

export function PerformanceToolbar({
  isAddingNew,
  isSaving,
  selectedCount,
  isDeleting,
  onAdd,
  onSave,
  onCancel,
  onDelete,
  exportButton,
  printButton,
}: PerformanceToolbarProps) {
  return (
    <CrudTableToolbar
      isAddingNew={isAddingNew}
      isSaving={isSaving}
      selectedCount={selectedCount}
      isDeleting={isDeleting}
      onAdd={onAdd}
      onSave={onSave}
      onCancel={onCancel}
      onDelete={onDelete}
      exportButton={exportButton}
      printButton={printButton}
      addButtonText="실적 추가"
      deleteButtonText="삭제"
    />
  );
}
```

### Phase 5: 모바일 카드 뷰 (선택 사항, 1시간)

**파일**: `src/app/(dashboard)/inkwang-es/sales/performances/mobile-performance-card.tsx`

```typescript
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { PerformanceWithDetails } from '@/types';

interface MobilePerformanceCardProps {
  performance: PerformanceWithDetails;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  onCardClick: () => void;
}

export function MobilePerformanceCard({
  performance,
  isSelected,
  onSelectChange,
  onCardClick,
}: MobilePerformanceCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelectChange}
          onClick={(e) => e.stopPropagation()}
        />

        <div className="flex-1 space-y-2" onClick={onCardClick}>
          {/* 실적구분 & 계약번호 */}
          <div className="flex items-center justify-between">
            <Badge variant={performance.performance_type === 'planned' ? 'outline' : 'default'}>
              {performance.performance_type === 'planned' ? '예정' : '확정'}
            </Badge>
            <span className="text-sm font-medium">{performance.order?.order_number}</span>
          </div>

          {/* 계약명 */}
          <p className="font-semibold">{performance.order?.contract_name}</p>

          {/* 고객명 */}
          <p className="text-sm text-muted-foreground">{performance.order?.customer?.name}</p>

          {/* 실적일 & 금액 */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{performance.performance_date}</span>
            <span className="font-semibold">
              {performance.performance_amount.toLocaleString()}원
            </span>
          </div>

          {/* 수량 & 단가 */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {performance.quantity.toFixed(2)} {performance.unit}
            </span>
            <span>×</span>
            <span>{performance.unit_price.toLocaleString()}원</span>
          </div>

          {/* 담당자 */}
          {performance.manager && (
            <p className="text-xs text-muted-foreground">담당: {performance.manager.name}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
```

### Phase 6: 사이드바 메뉴 추가 (10분)

**파일**: `src/components/layout/sidebar.tsx` (기존 파일 수정)

```typescript
// 기존 코드에 추가
{
  title: '영업관리',
  icon: Briefcase,
  items: [
    {
      title: '수주관리',
      href: '/inkwang-es/sales/orders',
    },
    {
      title: '실적관리', // 새로 추가
      href: '/inkwang-es/sales/performances',
    },
  ],
},
```

---

## 상세 구현 가이드

### 1. 데이터베이스 마이그레이션 실행

```bash
# 1. Supabase 디렉토리로 이동
cd supabase

# 2. 마이그레이션 파일 생성
npx supabase migration create create_performances_table

# 3. 생성된 파일에 SQL 작성 (위의 SQL 복사)
# 파일 위치: supabase/migrations/YYYYMMDDHHMMSS_create_performances_table.sql

# 4. 로컬 데이터베이스에 적용
npx supabase db reset

# 5. 프로덕션 배포 (확인 후 실행)
npx supabase db push
```

### 2. 타입 생성

```bash
# Supabase 타입 자동 생성
pnpm types:gen

# 생성된 타입 확인
# 파일 위치: src/types/database.ts
```

### 3. 실적금액 자동 계산 로직

**수량 또는 단가 변경 시 자동 계산**:

```typescript
// usePerformanceActions.ts의 handleUpdateNewRow 함수
const handleUpdateNewRow = useCallback((field: string, value: unknown) => {
  setNewRowData((prev) => {
    if (!prev) return prev;

    const updatedRow = { ...prev, [field]: value };

    // 수량 또는 단가 변경 시 실적금액 자동 계산
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : (prev.quantity || 0);
      const unitPrice = field === 'unit_price' ? Number(value) : (prev.unit_price || 0);
      updatedRow.performance_amount = Math.floor(quantity * unitPrice);
    }

    return updatedRow;
  });
}, [setNewRowData]);
```

**사용자 직접 수정 가능**:
- `performance_amount` 컬럼에 EditableCell 사용
- 사용자가 직접 입력하면 자동 계산 무시

### 4. 계약번호 선택 시 자동 연동

**Combobox 선택 → order_id 업데이트 → JOIN 데이터 자동 표시**:

```typescript
// performance-columns.tsx
{
  accessorKey: 'order_id',
  header: '계약번호',
  cell: ({ row }) => {
    const orderId = row.original.order_id;
    const order = newOrders.find((o) => o.id === orderId);

    return (
      <EditableSelectCell
        value={orderId}
        rowIndex={row.index}
        columnId="order_id"
        onUpdate={handleUnifiedUpdate} // order_id 변경 → 자동 연동
        options={newOrders}
        type="combobox"
        placeholder="계약 선택"
        searchPlaceholder="계약번호 또는 계약명 검색..."
        displayValue={order?.order_number}
      />
    );
  },
},

// 계약명 (읽기 전용, JOIN 데이터)
{
  accessorKey: 'order.contract_name',
  header: '계약명',
  cell: ({ row }) => {
    const contractName = row.original.order?.contract_name;
    return <span>{contractName || '-'}</span>;
  },
},

// 고객명 (읽기 전용, JOIN 데이터)
{
  accessorKey: 'order.customer.name',
  header: '고객명',
  cell: ({ row }) => {
    const customerName = row.original.order?.customer?.name;
    return <span>{customerName || '-'}</span>;
  },
},
```

### 5. 인광이에스 소속 직원 필터링

**Server Action에서 필터링**:

```typescript
// actions/performances.ts
export async function getInkwangESEmployees() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, company:companies!company_id(name)')
    .eq('employment_status', 'active')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`직원 목록 조회 실패: ${error.message}`);
  }

  // 인광이에스 소속 직원만 필터링
  return data.filter((user: any) => user.company?.name === '인광이에스');
}
```

### 6. 실적구분 토글 구현

**Switch 컴포넌트 사용**:

```typescript
// performance-columns.tsx
{
  accessorKey: 'performance_type',
  header: '실적구분',
  cell: ({ row }) => {
    const performanceType = row.getValue('performance_type') as string;
    const isPlanned = performanceType === 'planned';

    return (
      <div className="flex items-center gap-2">
        <Switch
          checked={!isPlanned} // checked=true면 '확정'
          onCheckedChange={async (checked) => {
            const newType = checked ? 'confirmed' : 'planned';
            await handleUnifiedUpdate(row.index, 'performance_type', newType);
          }}
        />
        <Badge variant={isPlanned ? 'outline' : 'default'}>
          {isPlanned ? '예정' : '확정'}
        </Badge>
      </div>
    );
  },
},
```

### 7. 숫자 입력 포맷팅

**천단위 구분기호 & 소수점 처리**:

```typescript
// 수량 (소수점 둘째자리)
{
  accessorKey: 'quantity',
  header: ({ column }) => <DataTableColumnHeader column={column} title="수량" />,
  cell: ({ getValue, row }) => {
    const quantity = getValue<number>();

    return (
      <EditableCell
        value={quantity?.toString() || '0'}
        rowIndex={row.index}
        columnId="quantity"
        type="number"
        onUpdate={handleUnifiedUpdate}
        formatDisplay={(value) => {
          const num = Number(value || 0);
          return num.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        }}
      />
    );
  },
},

// 단가 & 실적금액 (정수)
{
  accessorKey: 'unit_price',
  header: ({ column }) => <DataTableColumnHeader column={column} title="단가" />,
  cell: ({ getValue, row }) => {
    const unitPrice = getValue<number>();

    return (
      <EditableCell
        value={unitPrice?.toString() || '0'}
        rowIndex={row.index}
        columnId="unit_price"
        type="number"
        onUpdate={handleUnifiedUpdate}
        formatDisplay={(value) => {
          const num = Math.floor(Number(value || 0));
          return num.toLocaleString() + '원';
        }}
      />
    );
  },
},
```

### 8. 비고 구현

**수주관리와 동일한 EditableNotesCell 사용**:

```typescript
{
  accessorKey: 'notes',
  header: '비고',
  cell: ({ row }) => {
    const notes = row.getValue('notes') as string | null;

    return (
      <EditableNotesCell
        notes={notes}
        onSave={async (value) => {
          await handleUnifiedUpdate(row.index, 'notes', value);
        }}
      />
    );
  },
},
```

---

## 테스트 시나리오

### 1. 기능 테스트

| 테스트 항목 | 입력 | 기대 결과 |
|------------|------|-----------|
| **실적 추가** | "실적 추가" 버튼 클릭 | 새 행 생성, 계약번호 Combobox 포커스 |
| **계약번호 선택** | 계약번호 선택 | 계약명, 고객명 자동 연동 |
| **수량 입력** | 수량: 10.50 | 소수점 둘째자리까지 입력, 천단위 구분기호 표시 |
| **단가 입력** | 단가: 1,000,000 | 정수 입력, 천단위 구분기호 표시 |
| **실적금액 자동 계산** | 수량: 10.50, 단가: 1,000,000 | 실적금액: 10,500,000 자동 계산 |
| **실적금액 직접 수정** | 실적금액: 10,000,000 | 자동 계산 무시, 사용자 입력값 저장 |
| **실적구분 토글** | Switch OFF → ON | "예정" → "확정" 변경 |
| **담당자 선택** | 담당자 Combobox | 인광이에스 소속 직원만 표시 |
| **비고 입력** | 비고 더블클릭 → Dialog | Dialog에서 긴 텍스트 입력 가능 |
| **저장** | "저장" 버튼 클릭 | 데이터베이스 저장, 토스트 알림 |
| **취소** | "취소" 버튼 클릭 | 새 행 제거, 입력 데이터 초기화 |
| **삭제** | 체크박스 선택 → "삭제" 버튼 | 확인 Dialog → 삭제 실행 |
| **Excel 내보내기** | "Excel 다운로드" 버튼 | XLSX 파일 다운로드 |
| **인쇄** | "인쇄" 버튼 | 인쇄 미리보기 표시 |

### 2. 검증 테스트

| 테스트 항목 | 입력 | 기대 결과 |
|------------|------|-----------|
| **필수 필드 검증** | 계약번호 없이 저장 | "계약번호를 선택해주세요" 에러 |
| **수량 범위 검증** | 수량: -1 | "수량은 0 이상이어야 합니다" 에러 |
| **단가 범위 검증** | 단가: -1000 | "단가는 0 이상이어야 합니다" 에러 |
| **날짜 형식 검증** | 실적일: "2025/01/18" | "올바른 날짜 형식(YYYY-MM-DD)이 아닙니다" 에러 |

### 3. 권한 테스트

| 테스트 항목 | 사용자 | 기대 결과 |
|------------|-------|-----------|
| **admin 권한** | role: 'admin', company: '인광이에스' | 모든 CRUD 가능 |
| **user 권한** | role: 'user' | "권한이 없습니다" 에러 |
| **타 회사 소속** | company: '인광피앤아이' | "접근 권한 없음" 페이지 표시 |

### 4. 데이터 연동 테스트

| 테스트 항목 | 시나리오 | 기대 결과 |
|------------|---------|-----------|
| **계약번호 연동** | 계약번호 선택 | 계약명, 고객명 자동 표시 |
| **담당자 필터링** | 담당자 Combobox 클릭 | 인광이에스 소속 직원만 표시 |
| **실적금액 자동 계산** | 수량 × 단가 | 실적금액 = 수량 × 단가 (소수점 버림) |

### 5. UI/UX 테스트

| 테스트 항목 | 환경 | 기대 결과 |
|------------|------|-----------|
| **반응형 테이블** | 데스크톱 (>768px) | 테이블 뷰 표시 |
| **모바일 카드 뷰** | 모바일 (<768px) | 카드 뷰 표시 |
| **인라인 편집** | EditableCell 더블클릭 | Input 포커스, 편집 모드 진입 |
| **Combobox 검색** | 계약번호 검색 | 계약번호/계약명으로 필터링 |
| **토스트 알림** | 저장/수정/삭제 | 성공/실패 토스트 표시 |

---

## 참고 자료

### 공식 문서

- **TanStack Table**: https://tanstack.com/table/latest/docs/introduction
- **React Hook Form**: https://react-hook-form.com/
- **Zod**: https://zod.dev/
- **Supabase**: https://supabase.com/docs
- **Next.js 15**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com/

### 프로젝트 내 참고 파일

| 항목 | 파일 경로 |
|-----|----------|
| **CLAUDE.md** | `/CLAUDE.md` (프로젝트 전체 가이드) |
| **수주관리 Actions** | `/src/actions/orders.ts` |
| **수주관리 Table** | `/src/app/(dashboard)/inkwang-es/sales/orders/orders-table.tsx` |
| **수주관리 Columns** | `/src/app/(dashboard)/inkwang-es/sales/orders/order-columns.tsx` |
| **직원관리 Hooks** | `/src/app/(dashboard)/admin/employees/hooks/` |
| **Validation 스키마** | `/src/lib/validations.ts` |
| **타입 정의** | `/src/types/index.ts` |
| **공통 컴포넌트** | `/src/components/common/` |

### TanStack Table 핵심 개념

1. **Column Definition**: `ColumnDef<T>` 타입으로 컬럼 정의
2. **Accessor Key**: `accessorKey`로 데이터 필드 접근
3. **Cell Rendering**: `cell` 함수로 커스텀 렌더링
4. **Sorting**: `enableSorting` 옵션으로 정렬 활성화
5. **Row Selection**: `enableRowSelection` + `rowSelection` state
6. **Inline Editing**: `EditableCell` 컴포넌트 사용

### Next.js 15 Server Actions 패턴

1. **'use server' 디렉티브**: 파일 최상단 선언
2. **Destructuring 불가**: 명시적 async 함수 래퍼 사용
3. **revalidatePath**: 캐시 무효화
4. **권한 확인**: `supabase.auth.getUser()` → role 체크
5. **에러 핸들링**: try-catch + 명확한 에러 메시지

---

## 구현 체크리스트

### Phase 1: 데이터베이스 설정 ✅

- [ ] 마이그레이션 파일 생성
- [ ] SQL 작성 및 실행
- [ ] 인덱스 생성 확인
- [ ] RLS 정책 적용 확인
- [ ] 타입 생성 (`pnpm types:gen`)

### Phase 2: 타입 및 검증 ✅

- [ ] Performance 타입 정의
- [ ] PerformanceWithDetails 타입 정의
- [ ] PerformanceFormData 타입 정의
- [ ] Zod 스키마 작성 (insert, update)

### Phase 3: Server Actions ✅

- [ ] getPerformances 구현
- [ ] getPerformanceById 구현
- [ ] createPerformance 구현 (권한 확인 포함)
- [ ] updatePerformance 구현 (권한 확인 포함)
- [ ] deletePerformance 구현 (권한 확인 포함)
- [ ] getNewOrdersForPerformance 구현
- [ ] getInkwangESEmployees 구현

### Phase 4: 테이블 컴포넌트 ✅

- [ ] page.tsx (서버 컴포넌트)
- [ ] performances-page-client.tsx
- [ ] usePerformanceData 훅
- [ ] usePerformanceActions 훅
- [ ] performance-columns.tsx
- [ ] performances-table.tsx
- [ ] PerformanceToolbar 컴포넌트

### Phase 5: 모바일 뷰 (선택 사항) ✅

- [ ] mobile-performance-card.tsx
- [ ] performances-table.tsx에 모바일 뷰 통합

### Phase 6: 사이드바 메뉴 ✅

- [ ] sidebar.tsx 수정 (실적관리 메뉴 추가)

### 테스트 ✅

- [ ] 기능 테스트 (추가, 수정, 삭제)
- [ ] 검증 테스트 (Zod 스키마)
- [ ] 권한 테스트 (admin, user, 회사 소속)
- [ ] 데이터 연동 테스트 (계약번호, 담당자)
- [ ] UI/UX 테스트 (반응형, 인라인 편집)

### 배포 전 체크 ✅

- [ ] TypeScript 타입 체크 (`pnpm type-check`)
- [ ] Lint 검사 (`pnpm lint`)
- [ ] 빌드 성공 확인 (`pnpm build`)
- [ ] 프로덕션 데이터베이스 마이그레이션 (`npx supabase db push`)
- [ ] 프로덕션 환경 테스트

---

## 추가 개선 사항 (선택 사항)

### 1. 실적 통계 대시보드
- 월별/분기별 실적 집계
- 담당자별 실적 순위
- 고객별 실적 현황

### 2. 실적 일괄 등록
- Excel 파일 업로드로 다중 실적 등록
- CSV 파일 파싱 및 검증

### 3. 실적 알림
- 실적 마감일 알림 (예정 → 확정 전환 독촉)
- 월말 실적 집계 리포트 이메일 발송

### 4. 실적 승인 프로세스
- 담당자 등록 → 관리자 승인 → 확정
- 승인 히스토리 로그

---

## 문제 해결 가이드

### 1. 타입 에러

**문제**: `Property 'order' does not exist on type 'Performance'`

**해결**:
```bash
# Supabase 타입 재생성
pnpm types:gen

# TypeScript 캐시 클리어
rm -rf .next
pnpm dev
```

### 2. 권한 에러

**문제**: "권한이 없습니다" 에러 발생

**확인 사항**:
1. 현재 사용자 role이 'admin'인지 확인
2. RLS 정책이 올바르게 적용되었는지 확인
3. Supabase Dashboard → Table Editor → RLS 정책 확인

### 3. 데이터 연동 실패

**문제**: 계약번호 선택 시 계약명, 고객명이 표시되지 않음

**확인 사항**:
1. `getPerformances()` 쿼리에 JOIN이 포함되었는지 확인
2. `order.contract_name`, `order.customer.name` accessorKey 확인
3. 네트워크 탭에서 Supabase 응답 데이터 확인

### 4. 실적금액 자동 계산 안됨

**문제**: 수량 또는 단가 변경 시 실적금액이 자동 계산되지 않음

**확인 사항**:
1. `handleUpdateNewRow` 함수에서 `field === 'quantity' || field === 'unit_price'` 조건 확인
2. `Math.floor(quantity * unitPrice)` 계산 로직 확인
3. 콘솔에서 `performance_amount` 값 확인

### 5. 빌드 실패

**문제**: `pnpm build` 실패

**해결**:
```bash
# TypeScript 타입 체크
pnpm type-check

# Lint 검사
pnpm lint

# .next 폴더 삭제 후 재빌드
rm -rf .next
pnpm build
```

---

## 마무리

본 PRD를 따라 구현하면 수주관리와 완벽하게 연동되는 실적관리 페이지를 구축할 수 있습니다.

**구현 순서**:
1. Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 6 (필수)
2. Phase 5 (모바일 뷰, 선택 사항)
3. 테스트 → 배포

**예상 소요 시간**:
- 필수 구현: 약 4-5시간
- 모바일 뷰 포함: 약 5-6시간
- 테스트 및 디버깅: 약 1-2시간

**질문이나 문제 발생 시**:
1. 위의 "문제 해결 가이드" 섹션 참고
2. CLAUDE.md 파일의 "Troubleshooting" 섹션 참고
3. 기존 수주관리 코드 참고 (`src/app/(dashboard)/inkwang-es/sales/orders/`)

---

**작성자**: Claude (Anthropic)
**검토자**: 프로젝트 관리자
**최종 수정일**: 2025-01-18
