import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * 에러 메시지 추출 헬퍼
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '알 수 없는 오류가 발생했습니다';
}

/**
 * 권한 확인 헬퍼
 */
async function checkPermission(requiredRole?: 'admin') {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다', user: null };
  }

  if (requiredRole === 'admin') {
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUser?.role !== 'admin') {
      return { error: '권한이 없습니다', user: null };
    }
  }

  return { user, error: null };
}

/**
 * 제네릭 CRUD Server Actions 팩토리
 *
 * @param tableName - Supabase 테이블 이름
 * @param revalidatePaths - 재검증할 경로 배열
 * @param options - 추가 옵션 (권한 확인 스킵 등)
 *
 * @example
 * ```typescript
 * export const {
 *   getAll: getCompanies,
 *   getById: getCompanyById,
 *   create: createCompany,
 *   update: updateCompany,
 *   remove: deleteCompany,
 * } = createCrudActions<Company>('companies', ['/admin/company/companies']);
 * ```
 */
type TableName = 'companies' | 'departments' | 'positions' | 'bank_accounts' | 'users' | 'customers';

export function createCrudActions<T extends { id: string }>(
  tableName: TableName,
  revalidatePaths: string[],
  options: {
    skipAuthForRead?: boolean;
    requireAdminForWrite?: boolean;
  } = {}
) {
  const { skipAuthForRead = false, requireAdminForWrite = true } = options;

  return {
    /**
     * 목록 조회
     */
    async getAll(orderBy: { column: string; ascending: boolean } = { column: 'created_at', ascending: false }) {
      const supabase = await createClient();

      if (!skipAuthForRead) {
        const permission = await checkPermission();
        if (permission.error) {
          throw new Error(permission.error);
        }
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(orderBy.column, { ascending: orderBy.ascending });

      if (error) {
        throw new Error(`조회 실패: ${error.message}`);
      }

      return data as unknown as T[];
    },

    /**
     * ID로 단일 조회
     */
    async getById(id: string) {
      const supabase = await createClient();

      if (!skipAuthForRead) {
        const permission = await checkPermission();
        if (permission.error) {
          throw new Error(permission.error);
        }
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`조회 실패: ${error.message}`);
      }

      return data as unknown as T;
    },

    /**
     * 생성
     */
    async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>) {
      const supabase = await createClient();

      // 권한 확인
      const permission = await checkPermission(requireAdminForWrite ? 'admin' : undefined);
      if (permission.error) {
        return { error: permission.error };
      }

      try {
        // Supabase의 유니온 타입(companies | departments | ...) 때문에 타입 단언 필요
        // 각 테이블 타입이 서로 호환되지 않아 any로 타입 단언 필요
        const { data: insertedData, error } = await supabase
          .from(tableName)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(data as any)
          .select()
          .single();

        if (error) {
          console.error(`[Server Action] Create failed for ${tableName}:`, error);
          return { error: `생성 실패: ${error.message}` };
        }

        console.log(`[Server Action] Created ${tableName}:`, insertedData);

        // 경로 재검증
        revalidatePaths.forEach((path) => revalidatePath(path));

        return { success: true, data: insertedData as unknown as T };
      } catch (error) {
        console.error(`[Server Action] Create exception for ${tableName}:`, error);
        return { error: getErrorMessage(error) };
      }
    },

    /**
     * 수정
     */
    async update(id: string, data: Partial<Omit<T, 'id' | 'created_at'>>) {
      const supabase = await createClient();

      // 권한 확인
      const permission = await checkPermission(requireAdminForWrite ? 'admin' : undefined);
      if (permission.error) {
        return { error: permission.error };
      }

      try {
        const updateData: Record<string, unknown> = {
          ...data,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', id);

        if (error) {
          return { error: `수정 실패: ${error.message}` };
        }

        // 경로 재검증
        revalidatePaths.forEach((path) => revalidatePath(path));

        return { success: true };
      } catch (error) {
        return { error: getErrorMessage(error) };
      }
    },

    /**
     * 삭제
     */
    async remove(id: string) {
      const supabase = await createClient();

      // 권한 확인
      const permission = await checkPermission(requireAdminForWrite ? 'admin' : undefined);
      if (permission.error) {
        return { error: permission.error };
      }

      try {
        const { error } = await supabase.from(tableName).delete().eq('id', id);

        if (error) {
          return { error: `삭제 실패: ${error.message}` };
        }

        // 경로 재검증
        revalidatePaths.forEach((path) => revalidatePath(path));

        return { success: true };
      } catch (error) {
        return { error: getErrorMessage(error) };
      }
    },

    /**
     * 배치 순서 변경 (sort_order 필드가 있는 테이블용)
     */
    async reorder(items: { id: string; sort_order: number }[]) {
      const supabase = await createClient();

      // 권한 확인
      const permission = await checkPermission(requireAdminForWrite ? 'admin' : undefined);
      if (permission.error) {
        return { error: permission.error };
      }

      try {
        // 각 항목의 sort_order 업데이트
        for (const item of items) {
          const { error } = await supabase
            .from(tableName)
            .update({ sort_order: item.sort_order })
            .eq('id', item.id);

          if (error) {
            return { error: `순서 변경 실패: ${error.message}` };
          }
        }

        // 경로 재검증
        revalidatePaths.forEach((path) => revalidatePath(path));

        return { success: true };
      } catch (error) {
        return { error: getErrorMessage(error) };
      }
    },
  };
}
