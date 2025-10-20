'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { billingInsertSchema, billingUpdateSchema } from '@/lib/validations';
import type { BillingWithDetails } from '@/types';

// 신규 수주 조회 결과 타입
type OrderForBilling = {
  id: string;
  order_number: string;
  contract_name: string;
  contract_amount: number;
  customer_id: string;
  customer: { id: string; name: string } | null;
};

// 변환된 신규 수주 타입
type TransformedOrderForBilling = {
  id: string;
  order_number: string;
  contract_name: string;
  contract_amount: number;
  customer_id: string;
  customer_name: string;
};

export async function getBillings() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('billings')
      .select(`
        *,
        order:orders!order_id(id, order_number, contract_name),
        customer:customers!customer_id(id, name, business_number),
        created_by_user:users!created_by(id, name, email),
        updated_by_user:users!updated_by(id, name, email)
      `)
      .order('billing_date', { ascending: false })
      .order('billing_number', { ascending: false });

    if (error) {
      return { data: null, error: `청구 목록 조회 실패: ${error.message}` };
    }

    return { data: data as BillingWithDetails[], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

export async function getBillingById(id: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('billings')
      .select(`
        *,
        order:orders!order_id(id, order_number, contract_name),
        customer:customers!customer_id(id, name, business_number),
        created_by_user:users!created_by(id, name, email),
        updated_by_user:users!updated_by(id, name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: `청구 조회 실패: ${error.message}` };
    }

    return { data: data as BillingWithDetails, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

export async function createBilling(formData: unknown) {
  try {
    const validatedData = billingInsertSchema.parse(formData);
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: '사용자 인증 실패' };
    }

    const insertData = {
      billing_date: typeof validatedData.billing_date === 'string'
        ? validatedData.billing_date
        : validatedData.billing_date.toISOString().split('T')[0],
      order_id: validatedData.order_id,
      customer_id: validatedData.customer_id,
      billing_type: validatedData.billing_type,
      billing_amount: validatedData.billing_amount,
      expected_payment_date: typeof validatedData.expected_payment_date === 'string'
        ? validatedData.expected_payment_date
        : validatedData.expected_payment_date.toISOString().split('T')[0],
      invoice_status: validatedData.invoice_status,
      notes: validatedData.notes,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from('billings')
      .insert(insertData)
      .select(`
        *,
        order:orders!order_id(id, order_number, contract_name),
        customer:customers!customer_id(id, name, business_number),
        created_by_user:users!created_by(id, name, email),
        updated_by_user:users!updated_by(id, name, email)
      `)
      .single();

    if (error) {
      return { data: null, error: `청구 생성 실패: ${error.message}` };
    }

    revalidatePath('/inkwang-es/finance/billings');
    return { data: data as BillingWithDetails, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

export async function updateBilling(id: string, formData: unknown) {
  try {
    const validatedData = billingUpdateSchema.parse(formData);
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: '사용자 인증 실패' };
    }

    // 날짜 필드를 문자열로 변환
    const updateData = {
      ...validatedData,
      updated_by: user.id,
      billing_date: validatedData.billing_date
        ? typeof validatedData.billing_date === 'string'
          ? validatedData.billing_date
          : validatedData.billing_date.toISOString().split('T')[0]
        : undefined,
      expected_payment_date: validatedData.expected_payment_date
        ? typeof validatedData.expected_payment_date === 'string'
          ? validatedData.expected_payment_date
          : validatedData.expected_payment_date.toISOString().split('T')[0]
        : undefined,
    };

    const { data, error } = await supabase
      .from('billings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        order:orders!order_id(id, order_number, contract_name),
        customer:customers!customer_id(id, name, business_number),
        created_by_user:users!created_by(id, name, email),
        updated_by_user:users!updated_by(id, name, email)
      `)
      .single();

    if (error) {
      return { data: null, error: `청구 수정 실패: ${error.message}` };
    }

    revalidatePath('/inkwang-es/finance/billings');
    return { data: data as BillingWithDetails, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

export async function deleteBilling(id: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('billings').delete().eq('id', id);

    if (error) {
      return { error: `청구 삭제 실패: ${error.message}` };
    }

    revalidatePath('/inkwang-es/finance/billings');
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

export async function getNewOrdersForBilling() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        contract_name,
        contract_amount,
        customer_id,
        customer:customers!customer_id(id, name)
      `)
      .eq('contract_type', 'new')
      .order('contract_date', { ascending: false })
      .order('order_number', { ascending: false });

    if (error) {
      return { data: null, error: `신규 수주 목록 조회 실패: ${error.message}` };
    }

    const transformedData: TransformedOrderForBilling[] = (data as OrderForBilling[]).map((order) => ({
      id: order.id,
      order_number: order.order_number,
      contract_name: order.contract_name,
      contract_amount: order.contract_amount,
      customer_id: order.customer_id,
      customer_name: order.customer?.name || '',
    }));

    return { data: transformedData, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

export async function checkBillingNumberDuplicate(
  billingNumber: string,
  excludeId?: string
) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('billings')
      .select('id')
      .eq('billing_number', billingNumber);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      return { isDuplicate: false, error: `청구번호 중복 체크 실패: ${error.message}` };
    }

    return { isDuplicate: !!data, error: null };
  } catch (error) {
    return {
      isDuplicate: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}
