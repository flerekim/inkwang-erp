'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createCrudActions } from '@/lib/server-actions';
import type { BankAccount, BankAccountInsert } from '@/types';

/**
 * CRUD Actions for Bank Accounts
 * 기본 팩토리 패턴 + 커스텀 조회/생성 함수
 */
const crudActions = createCrudActions<BankAccount>('bank_accounts', ['/admin/company/bank-accounts'], {
  requireAdminForWrite: true,
});

/**
 * 은행계좌 목록 조회 (회사 정보 포함)
 * 팩토리의 getAll 대신 커스텀 구현
 */
export async function getBankAccounts() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*, company:companies(id, name)')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`은행계좌 목록 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 은행계좌 생성 (초기 잔액 = 현재 잔액)
 * 팩토리의 create 대신 커스텀 구현
 */
export async function createBankAccount(data: Omit<BankAccountInsert, 'id'>) {
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
    const { error } = await supabase.from('bank_accounts').insert({
      ...data,
      current_balance: data.initial_balance, // 초기 잔액 = 현재 잔액
    });

    if (error) {
      return { error: `생성 실패: ${error.message}` };
    }

    revalidatePath('/admin/company/bank-accounts');
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 팩토리에서 재사용
 */
export async function getBankAccountById(id: string) {
  return crudActions.getById(id);
}

export async function updateBankAccount(id: string, data: Partial<Omit<BankAccount, 'id' | 'created_at'>>) {
  return crudActions.update(id, data);
}

export async function deleteBankAccount(id: string) {
  return crudActions.remove(id);
}
