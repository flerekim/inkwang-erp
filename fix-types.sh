#!/bin/bash

# 1. billings.ts 수정 - Date를 string으로 변환
cd "C:/dev/docs/inkwang-erp"

cat > src/actions/billings-fixed.ts << 'BILLINGS_EOF'
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { billingInsertSchema, billingUpdateSchema } from '@/lib/validations';
import type { BillingWithDetails } from '@/types';

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

    const updateData: any = { ...validatedData, updated_by: user.id };

    if (updateData.billing_date && typeof updateData.billing_date !== 'string') {
      updateData.billing_date = updateData.billing_date.toISOString().split('T')[0];
    }

    if (updateData.expected_payment_date && typeof updateData.expected_payment_date !== 'string') {
      updateData.expected_payment_date = updateData.expected_payment_date.toISOString().split('T')[0];
    }

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

    const transformedData = data.map((order: any) => ({
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
BILLINGS_EOF

mv src/actions/billings-fixed.ts src/actions/billings.ts

echo "billings.ts 수정 완료"
