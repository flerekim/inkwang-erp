'use server';

import { createCrudActions } from '@/lib/server-actions';
import type { Company } from '@/types';

/**
 * CRUD Actions for Companies
 * 공통 팩토리 패턴 사용으로 코드 70% 감소
 */
const crudActions = createCrudActions<Company>('companies', ['/admin/company/companies'], {
  requireAdminForWrite: true,
});

export async function getCompanies() {
  return crudActions.getAll();
}

export async function getCompanyById(id: string) {
  return crudActions.getById(id);
}

export async function createCompany(data: Omit<Company, 'id' | 'created_at' | 'updated_at'>) {
  return crudActions.create(data);
}

export async function updateCompany(id: string, data: Partial<Omit<Company, 'id' | 'created_at'>>) {
  return crudActions.update(id, data);
}

export async function deleteCompany(id: string) {
  return crudActions.remove(id);
}

export async function reorderCompanies(items: { id: string; sort_order: number }[]) {
  return crudActions.reorder(items);
}

/**
 * 사업자등록번호 중복 확인
 * @param businessNumber - 사업자등록번호 (숫자만, 10자리)
 * @param excludeId - 제외할 회사 ID (수정 시)
 * @returns 중복 여부
 */
export async function checkDuplicateBusinessNumber(
  businessNumber: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    // 숫자만 추출 (하이픈 제거)
    const cleaned = businessNumber.replace(/\D/g, '');

    if (!cleaned || cleaned.length !== 10) {
      return { isDuplicate: false };
    }

    // 중복 확인 쿼리
    let query = supabase
      .from('companies')
      .select('id')
      .eq('business_number', cleaned)
      .limit(1);

    // 수정 시 자기 자신 제외
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[checkDuplicateBusinessNumber] Error:', error);
      return { isDuplicate: false, error: '중복 확인 중 오류가 발생했습니다.' };
    }

    return { isDuplicate: (data?.length ?? 0) > 0 };
  } catch (error) {
    console.error('[checkDuplicateBusinessNumber] Exception:', error);
    return { isDuplicate: false, error: '중복 확인 중 오류가 발생했습니다.' };
  }
}
