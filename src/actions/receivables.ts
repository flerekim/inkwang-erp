'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  ReceivableWithDetails,
  ReceivableFormData,
  ReceivableActivityFormData,
  ReceivableActivityWithUser,
  ReceivableDetailData,
  CollectionWithDetails,
} from '@/types';

// ============================================
// 채권 조회 Actions
// ============================================

/**
 * 채권 목록 조회 (뷰 사용 - JOIN 최적화)
 */
export async function getReceivables() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('receivables_with_details')
      .select('*')
      .order('billing_date', { ascending: false })
      .order('created_at', { ascending: false });

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

/**
 * 단일 채권 상세 조회 (회수활동 및 수금이력 포함)
 */
export async function getReceivableDetail(id: string) {
  try {
    const supabase = await createClient();

    // 1. 채권 기본 정보 조회 (뷰 사용)
    const { data: receivable, error: receivableError } = await supabase
      .from('receivables_with_details')
      .select('*')
      .eq('id', id)
      .single();

    if (receivableError) {
      return { data: null, error: `채권 정보 조회 실패: ${receivableError.message}` };
    }

    // 2. 회수활동 내역 조회
    const { data: activities, error: activitiesError } = await supabase
      .from('receivable_activities')
      .select(`
        *,
        user:users!receivable_activities_created_by_fkey (
          id,
          name,
          email
        )
      `)
      .eq('receivable_id', id)
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (activitiesError) {
      console.error('회수활동 내역 조회 오류:', activitiesError);
    }

    // 3. 수금 이력 조회
    const { data: collections, error: collectionsError } = receivable.billing_id
      ? await supabase
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
          .eq('billing_id', receivable.billing_id)
          .order('collection_date', { ascending: false })
          .order('created_at', { ascending: false })
      : { data: null, error: null };

    if (collectionsError) {
      console.error('수금 이력 조회 오류:', collectionsError);
    }

    const detailData: ReceivableDetailData = {
      ...(receivable as ReceivableWithDetails),
      activities: (activities as ReceivableActivityWithUser[]) || [],
      collections: (collections as CollectionWithDetails[]) || [],
    };

    return { data: detailData, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

// ============================================
// 채권 수정 Actions (대손처리용)
// ============================================

/**
 * 채권 분류 수동 변경 (대손처리)
 * @param id 채권 ID
 * @param formData 분류 변경 데이터
 */
export async function updateReceivableClassification(id: string, formData: ReceivableFormData) {
  try {
    const supabase = await createClient();

    // 권한 확인 (admin만 가능)
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

    if (currentUser?.role !== 'admin') {
      return { data: null, error: '권한이 없습니다' };
    }

    // 대손처리만 수동 변경 허용
    if (formData.classification !== 'written_off') {
      return { data: null, error: '대손처리만 수동으로 변경할 수 있습니다' };
    }

    const { data, error } = await supabase
      .from('receivables')
      .update({
        classification: formData.classification,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: `채권 분류 변경 실패: ${error.message}` };
    }

    revalidatePath('/inkwang-es/finance/receivables');
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

// ============================================
// 회수활동 관리 Actions
// ============================================

/**
 * 회수활동 생성
 */
export async function createReceivableActivity(formData: ReceivableActivityFormData) {
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

    if (!currentUser || !['admin', 'user'].includes(currentUser.role)) {
      return { data: null, error: '권한이 없습니다' };
    }

    // 회수활동 생성
    const insertData = {
      receivable_id: formData.receivable_id,
      activity_date: formData.activity_date,
      activity_content: formData.activity_content,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from('receivable_activities')
      .insert(insertData)
      .select(`
        *,
        user:users!receivable_activities_created_by_fkey (
          id,
          name,
          email
        )
      `)
      .single();

    if (error) {
      return { data: null, error: `회수활동 생성 실패: ${error.message}` };
    }

    revalidatePath('/inkwang-es/finance/receivables');
    return { data: data as ReceivableActivityWithUser, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 회수활동 수정
 */
export async function updateReceivableActivity(
  id: string,
  formData: Partial<ReceivableActivityFormData>
) {
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

    // 자신이 작성한 회수활동만 수정 가능
    const { data: activity } = await supabase
      .from('receivable_activities')
      .select('created_by')
      .eq('id', id)
      .single();

    if (activity?.created_by !== user.id) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (currentUser?.role !== 'admin') {
        return { data: null, error: '자신이 작성한 회수활동만 수정할 수 있습니다' };
      }
    }

    const { data, error } = await supabase
      .from('receivable_activities')
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        user:users!receivable_activities_created_by_fkey (
          id,
          name,
          email
        )
      `)
      .single();

    if (error) {
      return { data: null, error: `회수활동 수정 실패: ${error.message}` };
    }

    revalidatePath('/inkwang-es/finance/receivables');
    return { data: data as ReceivableActivityWithUser, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 회수활동 삭제
 */
export async function deleteReceivableActivity(id: string) {
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

    // 자신이 작성한 회수활동만 삭제 가능
    const { data: activity } = await supabase
      .from('receivable_activities')
      .select('created_by')
      .eq('id', id)
      .single();

    if (activity?.created_by !== user.id) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (currentUser?.role !== 'admin') {
        return { error: '자신이 작성한 회수활동만 삭제할 수 있습니다' };
      }
    }

    const { error } = await supabase.from('receivable_activities').delete().eq('id', id);

    if (error) {
      return { error: `회수활동 삭제 실패: ${error.message}` };
    }

    revalidatePath('/inkwang-es/finance/receivables');
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}
