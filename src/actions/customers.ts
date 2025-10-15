'use server';

import { createCrudActions } from '@/lib/server-actions';
import { createClient } from '@/lib/supabase/server';
import type { Customer } from '@/types';

/**
 * CRUD Actions for Customers
 * 공통 팩토리 패턴 사용 + 사업자등록번호 중복 검증
 */
const crudActions = createCrudActions<Customer>('customers', ['/inkwang-es/basics/customers'], {
  requireAdminForWrite: true,
});

/**
 * 사업자등록번호 중복 검증
 * @param businessNumber - 검증할 사업자등록번호 (하이픈 포함/제외 모두 가능)
 * @param excludeId - 수정 시 제외할 ID (자기 자신 제외)
 * @returns 중복 여부 { isDuplicate: boolean, error?: string }
 */
export async function checkBusinessNumberDuplicate(
  businessNumber: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; error?: string }> {
  try {
    // 빈 값은 중복 검증 안 함
    if (!businessNumber || businessNumber.trim() === '') {
      return { isDuplicate: false };
    }

    const supabase = await createClient();

    // 하이픈 제거 후 숫자만 비교
    const cleanNumber = businessNumber.replace(/\D/g, '');

    // 모든 고객의 사업자등록번호 조회
    const { data, error } = await supabase
      .from('customers')
      .select('id, business_number')
      .not('business_number', 'is', null);

    if (error) {
      return { isDuplicate: false, error: '사업자등록번호 검증 중 오류가 발생했습니다' };
    }

    // 중복 체크 (하이픈 제거 후 비교)
    const duplicate = data?.some((customer) => {
      if (excludeId && customer.id === excludeId) {
        return false; // 자기 자신 제외
      }
      const existingClean = customer.business_number?.replace(/\D/g, '') || '';
      return existingClean === cleanNumber && cleanNumber !== '';
    });

    return { isDuplicate: duplicate || false };
  } catch (error) {
    console.error('checkBusinessNumberDuplicate error:', error);
    return { isDuplicate: false, error: '사업자등록번호 검증 중 오류가 발생했습니다' };
  }
}

export async function getCustomers() {
  return crudActions.getAll({ column: 'sort_order', ascending: true });
}

export async function getCustomerById(id: string) {
  return crudActions.getById(id);
}

export async function createCustomer(data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
  // 사업자등록번호 중복 검증
  if (data.business_number) {
    const { isDuplicate, error } = await checkBusinessNumberDuplicate(data.business_number);

    if (error) {
      return { error };
    }

    if (isDuplicate) {
      return { error: '이미 등록된 사업자등록번호입니다' };
    }
  }

  return crudActions.create(data);
}

export async function updateCustomer(id: string, data: Partial<Omit<Customer, 'id' | 'created_at'>>) {
  // 사업자등록번호 중복 검증 (자기 자신 제외)
  if (data.business_number) {
    const { isDuplicate, error } = await checkBusinessNumberDuplicate(data.business_number, id);

    if (error) {
      return { error };
    }

    if (isDuplicate) {
      return { error: '이미 등록된 사업자등록번호입니다' };
    }
  }

  return crudActions.update(id, data);
}

export async function deleteCustomer(id: string) {
  return crudActions.remove(id);
}

export async function reorderCustomers(items: { id: string; sort_order: number }[]) {
  return crudActions.reorder(items);
}
