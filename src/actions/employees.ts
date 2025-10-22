'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { userInsertSchema, userUpdateSchema } from '@/lib/validations';
import { withAuth } from '@/lib/with-auth';
import type { UserUpdate, EmployeeFormData } from '@/types';

/**
 * 사원 목록 조회
 *
 * 캐싱 전략:
 * - Page 레벨에서 revalidate 설정 (page.tsx에서 export const revalidate = 60)
 * - 태그 기반 재검증: revalidateTag('employees')로 수동 무효화
 * - 생성/수정/삭제 시 자동으로 캐시 무효화
 */
export async function getEmployees() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select(
        `
          id,
          employee_number,
          name,
          email,
          role,
          employment_status,
          hire_date,
          department_id,
          position_id,
          company_id,
          created_at,
          updated_at,
          department:departments(id, name),
          position:positions(id, name),
          company:companies(id, name, business_number)
        `
      )
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: `사원 목록 조회 실패: ${error.message}` };
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
 * 사원 생성 (관리자 전용) - HOF 패턴 적용
 */
export const createEmployee = withAuth(
  async (user, data: EmployeeFormData) => {
    const adminClient = createAdminClient();

    // 유효성 검사
    const validation = userInsertSchema.safeParse(data);
    if (!validation.success) {
      return { data: null, error: validation.error.issues[0].message };
    }

    try {
      // Admin Client로 Supabase Auth에 사용자 생성
      // 트리거(handle_new_user)가 자동으로 public.users 테이블에 INSERT하고
      // 입사일 기반으로 사번 자동 생성 (yyyymmddNN 형식)
      const { data: authData, error: authError } =
        await adminClient.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
          user_metadata: {
            name: data.name,
            employee_number: '자동생성', // 트리거에서 자동 생성
            department_id: data.department_id || null,
            position_id: data.position_id || null,
            role: data.role || 'user',
            hire_date: data.hire_date || new Date().toISOString().split('T')[0],
            company_id: data.company_id,
          },
        });

      if (authError) {
        return { data: null, error: `계정 생성 실패: ${authError.message}` };
      }

      revalidatePath('/admin/employees');
      revalidateTag('employees'); // 캐시 무효화
      return { data: authData.user, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      };
    }
  },
  { requireAdmin: true }
);

/**
 * 사원 수정
 */
export async function updateEmployee(
  id: string,
  data: Partial<UserUpdate> & { password?: string }
) {
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

  // Admin이거나 본인만 수정 가능
  if (currentUser?.role !== 'admin' && user.id !== id) {
    return { error: '권한이 없습니다' };
  }

  // password 필드 분리
  const { password, ...userTableData } = data;

  // 유효성 검사 (userTableData만)
  const validation = userUpdateSchema.safeParse(userTableData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    // 1. 비밀번호 변경이 요청된 경우 Auth API 사용
    if (password) {
      const adminClient = createAdminClient();
      const { error: authError } = await adminClient.auth.admin.updateUserById(
        id,
        { password }
      );

      if (authError) {
        return { error: `비밀번호 변경 실패: ${authError.message}` };
      }
    }

    // 2. users 테이블 업데이트 (password 제외)
    if (Object.keys(userTableData).length > 0) {
      const { error } = await supabase
        .from('users')
        .update({
          ...userTableData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return { error: `수정 실패: ${error.message}` };
      }
    }

    revalidatePath('/admin/employees');
    revalidateTag('employees'); // 캐시 무효화
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 사원 삭제 (관리자 전용)
 */
export async function deleteEmployee(id: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

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
    // Admin Client로 Auth 사용자 삭제
    // ON DELETE CASCADE로 public.users 레코드도 자동 삭제됨
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);

    if (authError) {
      return { error: `계정 삭제 실패: ${authError.message}` };
    }

    revalidatePath('/admin/employees');
    revalidateTag('employees'); // 캐시 무효화
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
    };
  }
}

/**
 * 부서 목록 조회
 */
export async function getDepartments() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`부서 목록 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 직급 목록 조회
 */
export async function getPositions() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`직급 목록 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 회사 목록 조회
 */
export async function getCompanies() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`회사 목록 조회 실패: ${error.message}`);
  }

  return data;
}
