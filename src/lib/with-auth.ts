import { createClient } from '@/lib/supabase/server';
import type { UserWithDetails } from '@/types';

/**
 * 권한 체크를 위한 Higher-Order Function (HOF)
 * Server Actions를 권한 검증으로 래핑하여 중복 코드 제거
 *
 * @example
 * ```typescript
 * export const createEmployee = withAuth(
 *   async (user, data: EmployeeFormData) => {
 *     // 권한 체크 완료, 비즈니스 로직만 작성
 *     const result = await createEmployeeLogic(data);
 *     return result;
 *   },
 *   { requireAdmin: true }
 * );
 * ```
 */

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };

interface WithAuthOptions {
  /**
   * admin 권한 필요 여부
   */
  requireAdmin?: boolean;
}

/**
 * Server Action을 권한 체크로 래핑하는 HOF
 */
export function withAuth<TArgs extends unknown[], TReturn>(
  handler: (user: UserWithDetails, ...args: TArgs) => Promise<ActionResult<TReturn>>,
  options: WithAuthOptions = {}
) {
  return async (...args: TArgs): Promise<ActionResult<TReturn>> => {
    try {
      const supabase = await createClient();

      // 1. 세션 검증
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        return { data: null, error: '인증이 필요합니다' };
      }

      // 2. 사용자 정보 조회
      const { data: user, error: userError } = await supabase
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
        .eq('id', authUser.id)
        .single();

      if (userError || !user) {
        return { data: null, error: '사용자 정보를 찾을 수 없습니다' };
      }

      // 3. Admin 권한 체크 (옵션)
      if (options.requireAdmin && user.role !== 'admin') {
        return { data: null, error: '관리자 권한이 필요합니다' };
      }

      // 4. 비즈니스 로직 실행
      return await handler(user as UserWithDetails, ...args);
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      };
    }
  };
}
