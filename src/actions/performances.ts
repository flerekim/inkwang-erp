'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { performanceInsertSchema, performanceUpdateSchema } from '@/lib/validations';
import type { PerformanceFormData, PerformanceWithDetails, NewOrderOption } from '@/types';

/**
 * 실적 목록 조회
 *
 * @returns 실적 목록 (JOIN된 관계형 데이터 포함)
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
 *
 * @param id - 실적 ID
 * @returns 실적 상세 정보
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
 * 신규계약 목록 조회 (실적 등록용)
 * - contract_type = 'new' 인 주문만 반환
 * - 자동 연동을 위해 customer_id, manager_id도 함께 반환
 *
 * @returns 신규계약 목록
 */
export async function getNewOrders() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        contract_name,
        customer_id,
        manager_id,
        customer:customers!customer_id(name)
      `)
      .eq('contract_type', 'new')
      .order('order_number', { ascending: false });

    if (error) {
      return { data: null, error: `신규계약 목록 조회 실패: ${error.message}` };
    }

    // NewOrderOption 타입으로 변환
    const newOrders: NewOrderOption[] =
      data?.map((order) => ({
        id: order.id,
        order_number: order.order_number,
        contract_name: order.contract_name,
        customer_id: order.customer_id,
        customer_name: order.customer?.name || '',
        manager_id: order.manager_id,
      })) || [];

    return { data: newOrders, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 실적 생성
 *
 * @param formData - 실적 폼 데이터
 * @returns 생성된 실적 정보
 */
export async function createPerformance(formData: PerformanceFormData) {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: '인증되지 않은 사용자입니다' };
    }

    // Zod 검증
    const validatedData = performanceInsertSchema.parse(formData);

    // 실적 생성 (created_by, updated_by 추가)
    const { data, error } = await supabase
      .from('performances')
      .insert({
        ...validatedData,
        created_by: user.id,
        updated_by: user.id,
      })
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
      .single();

    if (error) {
      return { data: null, error: `실적 생성 실패: ${error.message}` };
    }

    // 캐시 무효화
    revalidatePath('/inkwang-es/sales/performances');

    return { data: data as PerformanceWithDetails, error: null };
  } catch (error) {
    if (error instanceof Error) {
      // Zod 검증 에러
      if (error.name === 'ZodError') {
        return { data: null, error: '입력 데이터가 올바르지 않습니다' };
      }
      return { data: null, error: error.message };
    }
    return { data: null, error: '알 수 없는 오류가 발생했습니다' };
  }
}

/**
 * 실적 수정
 *
 * @param id - 실적 ID
 * @param formData - 수정할 실적 데이터 (부분)
 * @returns 수정된 실적 정보
 */
export async function updatePerformance(id: string, formData: Partial<PerformanceFormData>) {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: '인증되지 않은 사용자입니다' };
    }

    // Zod 검증 (부분 업데이트)
    const validatedData = performanceUpdateSchema.parse(formData);

    // 실적 수정 (updated_by 추가)
    const { data, error } = await supabase
      .from('performances')
      .update({
        ...validatedData,
        updated_by: user.id,
      })
      .eq('id', id)
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
      .single();

    if (error) {
      return { data: null, error: `실적 수정 실패: ${error.message}` };
    }

    // 캐시 무효화
    revalidatePath('/inkwang-es/sales/performances');

    return { data: data as PerformanceWithDetails, error: null };
  } catch (error) {
    if (error instanceof Error) {
      // Zod 검증 에러
      if (error.name === 'ZodError') {
        return { data: null, error: '입력 데이터가 올바르지 않습니다' };
      }
      return { data: null, error: error.message };
    }
    return { data: null, error: '알 수 없는 오류가 발생했습니다' };
  }
}

/**
 * 실적 삭제
 *
 * @param id - 실적 ID
 * @returns 삭제 결과
 */
export async function deletePerformance(id: string) {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: '인증되지 않은 사용자입니다' };
    }

    // 권한 확인 (Admin만 삭제 가능)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      return { data: null, error: '삭제 권한이 없습니다 (Admin 전용)' };
    }

    // 실적 삭제
    const { error } = await supabase.from('performances').delete().eq('id', id);

    if (error) {
      return { data: null, error: `실적 삭제 실패: ${error.message}` };
    }

    // 캐시 무효화
    revalidatePath('/inkwang-es/sales/performances');

    return { data: { success: true }, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}
