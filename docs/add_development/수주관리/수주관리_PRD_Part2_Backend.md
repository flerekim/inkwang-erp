# 수주관리 기능 상세 PRD - Part 2: Backend (Server Actions & Types)

> **작성일**: 2025-01-11
> **대상**: 인광이에스 ERP 시스템
> **전체 3부작 중 Part 2**

---

## 📋 문서 구성

- **Part 1**: 개요 및 DB 설계
- **Part 2**: Server Actions 및 TypeScript 타입 (현재 문서)
- **Part 3**: 프론트엔드 구현 가이드

---

## 목차

1. [TypeScript 타입 정의](#1-typescript-타입-정의)
2. [Zod Validation 스키마](#2-zod-validation-스키마)
3. [Server Actions 구현](#3-server-actions-구현)
4. [테스트 방법](#4-테스트-방법)

---

## 1. TypeScript 타입 정의

### 1.1 파일 위치
`src/types/index.ts`에 추가

### 1.2 기본 Enum 타입

```typescript
/**
 * 수주 계약 관련 Enum 타입
 */
export type ContractType = 'new' | 'change'; // 신규, 변경
export type ContractStatus = 'quotation' | 'contract' | 'in_progress' | 'completed'; // 견적, 계약, 진행, 완료
export type BusinessType = 'civilian' | 'government'; // 민수, 관수
export type PricingType = 'total' | 'unit_price'; // 총액계약, 단가계약
export type ExportType = 'on_site' | 'export'; // 부지내, 반출
export type CustomerType = 'client' | 'verification' | 'both'; // 발주처, 검증업체, 둘 다
```

### 1.3 Entity 타입

```typescript
/**
 * 수주 기본 타입
 */
export interface Order {
  id: string;
  order_number: string; // 계약번호 (YYYYMMDDNN)

  // 계약 기본 정보
  contract_type: ContractType;
  contract_status: ContractStatus;
  business_type: BusinessType;
  pricing_type: PricingType;

  // 계약 상세
  contract_name: string;
  contract_date: string; // YYYY-MM-DD
  contract_amount: number; // Decimal → number

  // 관계형 데이터 (FK)
  customer_id: string;
  verification_company_id: string | null;
  manager_id: string | null;
  parent_order_id: string | null; // 변경계약의 경우 원본 계약 ID

  // 기타
  export_type: ExportType;
  notes: string | null;
  attachments: string[]; // JSONB → string[]

  // 메타데이터
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * 수주 상세 타입 (JOIN된 데이터 포함)
 */
export interface OrderWithDetails extends Order {
  customer: Customer | null;
  verification_company: Customer | null;
  manager: User | null;
  parent_order: Pick<Order, 'id' | 'order_number' | 'contract_name'> | null;
  pollutants: OrderPollutant[];
  methods: OrderMethod[];
}

/**
 * 오염물질 마스터 타입
 */
export interface Pollutant {
  id: string;
  name: string;
  category: string; // 중금속류, 유류, 염소계 유기화합물, 그 외
  region_1_standard: number | null;
  region_2_standard: number | null;
  region_3_standard: number | null;
  unit: string; // mg/kg
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * 수주-오염물질 연결 타입
 */
export interface OrderPollutant {
  id: string;
  order_id: string;
  pollutant_id: string;
  concentration: number; // 소수점 둘째자리까지
  group_name: string | null; // 그룹핑 네임
  pollutant?: Pollutant; // JOIN된 오염물질 정보
  created_at: string;
}

/**
 * 정화방법 마스터 타입
 */
export interface Method {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * 수주-정화방법 연결 타입
 */
export interface OrderMethod {
  id: string;
  order_id: string;
  method_id: string;
  method?: Method; // JOIN된 정화방법 정보
  created_at: string;
}

/**
 * 고객 타입 확장 (기존 Customer 타입에 customer_type 추가)
 */
export interface Customer {
  id: string;
  name: string;
  customer_type: CustomerType; // 발주처, 검증업체, 둘 다
  business_number: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  // ... 기존 필드들
  created_at: string;
  updated_at: string;
}
```

### 1.4 Form Data 타입

```typescript
/**
 * 수주 생성/수정 폼 데이터
 */
export interface OrderFormData {
  // 계약 기본 정보
  contract_type: ContractType;
  contract_status: ContractStatus;
  business_type: BusinessType;
  pricing_type: PricingType;

  // 계약 상세
  contract_name: string;
  contract_date: string;
  contract_amount: number;

  // 관계형 데이터
  customer_id: string;
  verification_company_id: string | null;
  manager_id: string | null;
  parent_order_id: string | null;

  // 기타
  export_type: ExportType;
  notes: string | null;
  attachments?: string[];

  // 오염물질 배열 (다중 선택)
  pollutants: Array<{
    pollutant_id: string;
    concentration: number;
    group_name?: string | null;
  }>;

  // 정화방법 배열 (다중 선택)
  methods: string[]; // method_id 배열
}

/**
 * 수주 수정 타입 (Partial)
 */
export type OrderUpdate = Partial<OrderFormData>;

/**
 * 오염물질 입력 타입
 */
export interface PollutantInput {
  pollutant_id: string;
  concentration: number;
  group_name?: string | null;
}
```

---

## 2. Zod Validation 스키마

### 2.1 파일 위치
`src/lib/validations.ts`에 추가

### 2.2 스키마 정의

```typescript
import { z } from 'zod';

/**
 * 오염물질 입력 스키마
 */
export const pollutantInputSchema = z.object({
  pollutant_id: z.string().uuid('올바른 오염물질을 선택해주세요'),
  concentration: z
    .number({ required_error: '농도를 입력해주세요' })
    .positive('농도는 0보다 커야 합니다')
    .max(999999.99, '농도는 999,999.99를 초과할 수 없습니다'),
  group_name: z.string().nullable().optional(),
});

/**
 * 수주 생성 스키마
 */
export const orderInsertSchema = z.object({
  // 계약 기본 정보
  contract_type: z.enum(['new', 'change'], {
    required_error: '계약구분을 선택해주세요',
  }),
  contract_status: z.enum(['quotation', 'contract', 'in_progress', 'completed'], {
    required_error: '계약상태를 선택해주세요',
  }),
  business_type: z.enum(['civilian', 'government'], {
    required_error: '구분을 선택해주세요',
  }),
  pricing_type: z.enum(['total', 'unit_price'], {
    required_error: '계약유형을 선택해주세요',
  }),

  // 계약 상세
  contract_name: z
    .string({ required_error: '계약명을 입력해주세요' })
    .min(1, '계약명을 입력해주세요')
    .max(500, '계약명은 500자를 초과할 수 없습니다'),
  contract_date: z
    .string({ required_error: '계약일을 선택해주세요' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식(YYYY-MM-DD)이 아닙니다'),
  contract_amount: z
    .number({ required_error: '계약금액을 입력해주세요' })
    .nonnegative('계약금액은 0 이상이어야 합니다')
    .max(999999999999.99, '계약금액이 너무 큽니다'),

  // 관계형 데이터
  customer_id: z.string().uuid('올바른 고객을 선택해주세요'),
  verification_company_id: z.string().uuid().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  parent_order_id: z.string().uuid().nullable().optional(),

  // 기타
  export_type: z.enum(['on_site', 'export'], {
    required_error: '반출여부를 선택해주세요',
  }),
  notes: z.string().nullable().optional(),
  attachments: z.array(z.string()).optional(),

  // 오염물질 배열
  pollutants: z
    .array(pollutantInputSchema)
    .min(1, '최소 1개 이상의 오염물질을 선택해주세요'),

  // 정화방법 배열
  methods: z
    .array(z.string().uuid())
    .min(1, '최소 1개 이상의 정화방법을 선택해주세요'),
});

/**
 * 수주 수정 스키마 (Partial)
 */
export const orderUpdateSchema = orderInsertSchema.partial().extend({
  // 필요한 경우 수정 시 특정 필드만 허용
});

/**
 * 계약구분이 '변경'인 경우 parent_order_id 필수 검증
 */
export const orderInsertSchemaRefined = orderInsertSchema.refine(
  (data) => {
    if (data.contract_type === 'change') {
      return !!data.parent_order_id;
    }
    return true;
  },
  {
    message: '변경계약의 경우 원본 계약을 선택해주세요',
    path: ['parent_order_id'],
  }
);
```

---

## 3. Server Actions 구현

### 3.1 파일 위치
`src/actions/orders.ts`

### 3.2 주의사항

⚠️ **Next.js 15 Server Actions 제약**:
- `'use server'` 파일에서 **destructuring export 불가**
- 반드시 **명시적인 async 함수**로 export
- `revalidatePath()`로 캐시 무효화

### 3.3 전체 코드

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { orderInsertSchemaRefined, orderUpdateSchema } from '@/lib/validations';
import { withAuth } from '@/lib/with-auth';
import type { OrderFormData, OrderWithDetails } from '@/types';

/**
 * 수주 목록 조회
 *
 * @returns 수주 목록 (JOIN된 관계형 데이터 포함)
 */
export async function getOrders() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers!customer_id(id, name, business_number, customer_type),
        verification_company:customers!verification_company_id(id, name, business_number, customer_type),
        manager:users!manager_id(id, name, email),
        parent_order:orders!parent_order_id(id, order_number, contract_name),
        pollutants:order_pollutants(
          id,
          concentration,
          group_name,
          pollutant:pollutants(id, name, category, unit)
        ),
        methods:order_methods(
          id,
          method:methods(id, name, description)
        )
      `)
      .order('contract_date', { ascending: false })
      .order('order_number', { ascending: false });

    if (error) {
      return { data: null, error: `수주 목록 조회 실패: ${error.message}` };
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 수주 단건 조회
 *
 * @param id - 수주 ID
 * @returns 수주 상세 정보
 */
export async function getOrderById(id: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers!customer_id(id, name, business_number, customer_type),
        verification_company:customers!verification_company_id(id, name, business_number, customer_type),
        manager:users!manager_id(id, name, email),
        parent_order:orders!parent_order_id(id, order_number, contract_name),
        pollutants:order_pollutants(
          id,
          concentration,
          group_name,
          pollutant:pollutants(id, name, category, unit)
        ),
        methods:order_methods(
          id,
          method:methods(id, name, description)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: `수주 조회 실패: ${error.message}` };
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 수주 생성 (관리자 전용)
 *
 * @param user - 인증된 사용자 정보 (withAuth HOF로 전달)
 * @param formData - 수주 폼 데이터
 * @returns 생성된 수주 데이터
 */
export const createOrder = withAuth(
  async (user, formData: OrderFormData) => {
    const supabase = await createClient();

    // 유효성 검사
    const validation = orderInsertSchemaRefined.safeParse(formData);
    if (!validation.success) {
      return { data: null, error: validation.error.issues[0].message };
    }

    try {
      // 1. 메인 수주 데이터 추가
      const { pollutants, methods, ...orderData } = formData;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          ...orderData,
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single();

      if (orderError) {
        return { data: null, error: `수주 생성 실패: ${orderError.message}` };
      }

      // 2. 오염물질 연결 데이터 추가
      if (pollutants && pollutants.length > 0) {
        const pollutantRecords = pollutants.map((p) => ({
          order_id: order.id,
          pollutant_id: p.pollutant_id,
          concentration: p.concentration,
          group_name: p.group_name || null,
        }));

        const { error: pollutantError } = await supabase
          .from('order_pollutants')
          .insert(pollutantRecords);

        if (pollutantError) {
          // 롤백: 메인 수주 데이터 삭제
          await supabase.from('orders').delete().eq('id', order.id);
          return { data: null, error: `오염물질 추가 실패: ${pollutantError.message}` };
        }
      }

      // 3. 정화방법 연결 데이터 추가
      if (methods && methods.length > 0) {
        const methodRecords = methods.map((methodId) => ({
          order_id: order.id,
          method_id: methodId,
        }));

        const { error: methodError } = await supabase
          .from('order_methods')
          .insert(methodRecords);

        if (methodError) {
          // 롤백: 메인 수주 데이터 및 오염물질 삭제
          await supabase.from('orders').delete().eq('id', order.id);
          return { data: null, error: `정화방법 추가 실패: ${methodError.message}` };
        }
      }

      revalidatePath('/sales/orders');
      return { data: order, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      };
    }
  },
  { requireAdmin: true }
);

/**
 * 수주 수정 (관리자 전용)
 *
 * @param id - 수주 ID
 * @param formData - 수정할 데이터 (Partial)
 * @returns 수정 결과
 */
export async function updateOrder(id: string, formData: Partial<OrderFormData>) {
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

  // pollutants, methods 분리
  const { pollutants, methods, ...orderData } = formData;

  // 유효성 검사 (orderData만)
  const validation = orderUpdateSchema.safeParse(orderData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    // 1. 메인 수주 데이터 업데이트
    if (Object.keys(orderData).length > 0) {
      const { error } = await supabase
        .from('orders')
        .update({
          ...orderData,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', id);

      if (error) {
        return { error: `수정 실패: ${error.message}` };
      }
    }

    // 2. 오염물질 업데이트 (있는 경우)
    if (pollutants !== undefined) {
      // 기존 오염물질 삭제
      await supabase.from('order_pollutants').delete().eq('order_id', id);

      // 새 오염물질 추가
      if (pollutants && pollutants.length > 0) {
        const pollutantRecords = pollutants.map((p) => ({
          order_id: id,
          pollutant_id: p.pollutant_id,
          concentration: p.concentration,
          group_name: p.group_name || null,
        }));

        const { error: pollutantError } = await supabase
          .from('order_pollutants')
          .insert(pollutantRecords);

        if (pollutantError) {
          return { error: `오염물질 수정 실패: ${pollutantError.message}` };
        }
      }
    }

    // 3. 정화방법 업데이트 (있는 경우)
    if (methods !== undefined) {
      // 기존 정화방법 삭제
      await supabase.from('order_methods').delete().eq('order_id', id);

      // 새 정화방법 추가
      if (methods && methods.length > 0) {
        const methodRecords = methods.map((methodId) => ({
          order_id: id,
          method_id: methodId,
        }));

        const { error: methodError } = await supabase
          .from('order_methods')
          .insert(methodRecords);

        if (methodError) {
          return { error: `정화방법 수정 실패: ${methodError.message}` };
        }
      }
    }

    revalidatePath('/sales/orders');
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 수주 삭제 (관리자 전용)
 *
 * @param id - 수주 ID
 * @returns 삭제 결과
 */
export async function deleteOrder(id: string) {
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
    // CASCADE 설정으로 연결된 order_pollutants, order_methods도 자동 삭제됨
    const { error } = await supabase.from('orders').delete().eq('id', id);

    if (error) {
      return { error: `삭제 실패: ${error.message}` };
    }

    revalidatePath('/sales/orders');
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 고객 목록 조회 (발주처)
 */
export async function getCustomers() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .in('customer_type', ['client', 'both'])
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`고객 목록 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 검증업체 목록 조회
 */
export async function getVerificationCompanies() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .in('customer_type', ['verification', 'both'])
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`검증업체 목록 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 오염물질 목록 조회
 */
export async function getPollutants() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pollutants')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`오염물질 목록 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 정화방법 목록 조회
 */
export async function getMethods() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('methods')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`정화방법 목록 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 사용자(담당자) 목록 조회
 */
export async function getUsers() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('employment_status', 'active')
    .order('name', { ascending: true});

  if (error) {
    throw new Error(`사용자 목록 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 신규 계약 목록 조회 (변경계약 작성 시 사용)
 */
export async function getNewOrders() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, contract_name, contract_date')
    .eq('contract_type', 'new')
    .order('contract_date', { ascending: false });

  if (error) {
    throw new Error(`신규 계약 목록 조회 실패: ${error.message}`);
  }

  return data;
}
```

---

## 4. 테스트 방법

### 4.1 타입 체크

```bash
# TypeScript 컴파일 에러 확인
pnpm type-check
```

### 4.2 Server Actions 테스트

#### 방법 1: 브라우저 개발자 도구

```typescript
// 개발 중인 페이지에서 실행
const result = await fetch('/api/actions/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'getOrders',
  }),
});

console.log(await result.json());
```

#### 방법 2: 컴포넌트에서 직접 테스트

```typescript
// src/app/(dashboard)/sales/orders/test-page.tsx
'use client';

import { useEffect } from 'react';
import { getOrders } from '@/actions/orders';

export default function TestPage() {
  useEffect(() => {
    async function test() {
      const result = await getOrders();
      console.log('Orders:', result);
    }
    test();
  }, []);

  return <div>테스트 페이지 (콘솔 확인)</div>;
}
```

### 4.3 유효성 검사 테스트

```typescript
import { orderInsertSchemaRefined } from '@/lib/validations';

// 테스트 데이터
const testData = {
  contract_type: 'new',
  contract_status: 'quotation',
  business_type: 'civilian',
  pricing_type: 'total',
  contract_name: '테스트 계약',
  contract_date: '2025-01-11',
  contract_amount: 100000000,
  customer_id: '고객ID',
  export_type: 'on_site',
  pollutants: [
    { pollutant_id: '오염물질ID', concentration: 50.25 },
  ],
  methods: ['정화방법ID'],
};

const validation = orderInsertSchemaRefined.safeParse(testData);

if (validation.success) {
  console.log('✅ 유효성 검사 통과');
} else {
  console.error('❌ 유효성 검사 실패:', validation.error.issues);
}
```

---

## 다음 문서

👉 **Part 3: 프론트엔드 구현 가이드** 문서를 참고하여 UI 컴포넌트를 구현하세요.

