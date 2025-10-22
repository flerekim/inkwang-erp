'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { orderInsertSchemaRefined, orderUpdateSchema } from '@/lib/validations';
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
          pollutant_id,
          concentration,
          group_name,
          pollutant:pollutants(id, name, category, unit)
        ),
        methods:order_methods(
          id,
          method_id,
          method:methods(id, name, description)
        )
      `)
      .order('contract_date', { ascending: false })
      .order('order_number', { ascending: false });

    if (error) {
      return { data: null, error: `수주 목록 조회 실패: ${error.message}` };
    }

    return { data: data as OrderWithDetails[], error: null };
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
          pollutant_id,
          concentration,
          group_name,
          pollutant:pollutants(id, name, category, unit)
        ),
        methods:order_methods(
          id,
          method_id,
          method:methods(id, name, description)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: `수주 조회 실패: ${error.message}` };
    }

    return { data: data as OrderWithDetails, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 수주 생성
 *
 * @param formData - 수주 폼 데이터
 * @returns 생성된 수주 데이터
 */
export async function createOrder(formData: OrderFormData) {
  const supabase = await createClient();

  // 권한 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: '인증이 필요합니다' };
  }

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();

  if (currentUser?.role !== 'admin') {
    return { data: null, error: '권한이 없습니다' };
  }

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
        // NULL로 설정하여 트리거가 자동 생성 (UNIQUE 제약 위반 방지)
        // unknown을 거쳐 string으로 캐스팅하여 타입 안전성 향상
        order_number: null as unknown as string,
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
        concentration: Number(p.concentration) || 0,
        group_name: p.group_name || null,
      }));

      const { error: pollutantError } = await supabase.from('order_pollutants').insert(pollutantRecords);

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

      const { error: methodError } = await supabase.from('order_methods').insert(methodRecords);

      if (methodError) {
        // 롤백: 메인 수주 데이터 및 오염물질 삭제
        await supabase.from('orders').delete().eq('id', order.id);
        return { data: null, error: `정화방법 추가 실패: ${methodError.message}` };
      }
    }

    revalidatePath('/inkwang-es/sales/orders');
    return { data: order, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 수주 수정
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

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();

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
          concentration: Number(p.concentration) || 0,
          group_name: p.group_name || null,
        }));

        const { error: pollutantError } = await supabase.from('order_pollutants').insert(pollutantRecords);

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

        const { error: methodError } = await supabase.from('order_methods').insert(methodRecords);

        if (methodError) {
          return { error: `정화방법 수정 실패: ${methodError.message}` };
        }
      }
    }

    revalidatePath('/inkwang-es/sales/orders');
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 수주 삭제
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

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();

  if (currentUser?.role !== 'admin') {
    return { error: '권한이 없습니다' };
  }

  try {
    // CASCADE 설정으로 연결된 order_pollutants, order_methods도 자동 삭제됨
    const { error } = await supabase.from('orders').delete().eq('id', id);

    if (error) {
      return { error: `삭제 실패: ${error.message}` };
    }

    revalidatePath('/inkwang-es/sales/orders');
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
    .eq('customer_type', '발주처')
    .eq('status', '거래중')
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
    .eq('customer_type', '검증업체')
    .eq('status', '거래중')
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

  const { data, error } = await supabase.from('methods').select('*').order('sort_order', { ascending: true });

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
    .order('name', { ascending: true });

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
