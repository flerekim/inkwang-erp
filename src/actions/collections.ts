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
        ),
        customer:customers!customer_id (
          name
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
          customer: { name: string } | null;
        };

        return {
          billing_id: billingData.id,
          billing_number: billingData.billing_number,
          contract_name: billingData.order?.contract_name || '',
          customer_name: billingData.customer?.name || '',
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
