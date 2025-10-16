'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  Module,
  ModuleCode,
  UserModuleWithAccess,
  ModulePage,
  UserPageWithAccess,
  ModuleWithPages,
} from './types';

/**
 * 사용자가 특정 모듈에 접근할 수 있는지 확인
 * @param moduleCode 모듈 코드 (예: 'admin', 'inkwang-es')
 * @returns 접근 가능 여부
 */
export async function checkModuleAccess(moduleCode: ModuleCode): Promise<boolean> {
  try {
    const supabase = await createClient();

    // has_module_access RPC 함수 호출
    const { data, error } = await supabase.rpc('has_module_access', {
      module_code: moduleCode,
    });

    if (error) {
      console.error('[checkModuleAccess] RPC error:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('[checkModuleAccess] Unexpected error:', error);
    return false;
  }
}

/**
 * 사용자가 접근 가능한 모든 모듈 목록 가져오기
 * @returns 접근 가능한 모듈 목록
 */
export async function getUserModules(): Promise<Module[]> {
  try {
    const supabase = await createClient();

    // 1. 현재 사용자 정보 가져오기
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    // 2. users 테이블에서 role 확인
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // 3. 관리자는 모든 활성 모듈 반환
    if (userRecord?.role === 'admin') {
      const { data: modules, error } = await supabase
        .from('modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('[getUserModules] Admin modules error:', error);
        return [];
      }

      return (modules || []) as Module[];
    }

    // 4. 일반 사용자는 user_module_access 기반으로 반환
    const { data: moduleAccess, error } = await supabase
      .from('user_module_access')
      .select(
        `
        modules (
          id,
          code,
          name,
          description,
          icon,
          href,
          sort_order,
          is_active,
          created_at,
          updated_at
        )
      `
      )
      .eq('user_id', user.id)
      .eq('is_enabled', true)
      .eq('modules.is_active', true)
      .order('modules.sort_order', { ascending: true });

    if (error) {
      console.error('[getUserModules] User modules error:', error);
      return [];
    }

    // 타입 변환 (nested object를 flat하게)
    return (
      moduleAccess
        ?.map((item) => item.modules)
        .filter((module): module is Module => module !== null) || []
    ) as Module[];
  } catch (error) {
    console.error('[getUserModules] Unexpected error:', error);
    return [];
  }
}

/**
 * 모든 모듈 목록 가져오기 (관리자 전용)
 * @returns 모든 모듈 목록
 */
export async function getAllModules(): Promise<Module[]> {
  try {
    const supabase = await createClient();

    const { data: modules, error } = await supabase
      .from('modules')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[getAllModules] Error:', error);
      return [];
    }

    return (modules || []) as Module[];
  } catch (error) {
    console.error('[getAllModules] Unexpected error:', error);
    return [];
  }
}

/**
 * 특정 사용자의 모듈 접근 권한 목록 가져오기 (관리자 전용)
 * @param userId 사용자 ID
 * @returns 모듈별 접근 권한 목록
 */
export async function getUserModuleAccessList(
  userId: string
): Promise<UserModuleWithAccess[]> {
  try {
    const supabase = await createClient();

    // 1. 모든 모듈 가져오기
    const { data: allModules, error: modulesError } = await supabase
      .from('modules')
      .select('*')
      .order('sort_order', { ascending: true });

    if (modulesError) {
      console.error('[getUserModuleAccessList] Modules error:', modulesError);
      return [];
    }

    if (!allModules || allModules.length === 0) {
      return [];
    }

    // 2. 사용자의 접근 권한 가져오기
    const { data: userAccess, error: accessError } = await supabase
      .from('user_module_access')
      .select('*')
      .eq('user_id', userId);

    if (accessError) {
      console.error('[getUserModuleAccessList] Access error:', accessError);
      return [];
    }

    // 3. 모듈과 접근 권한 매칭
    return allModules.map((module) => {
      const access = userAccess?.find((a) => a.module_id === module.id);

      return {
        ...module,
        access_id: access?.id,
        is_enabled: access?.is_enabled ?? false,
        user_id: userId,
      };
    }) as UserModuleWithAccess[];
  } catch (error) {
    console.error('[getUserModuleAccessList] Unexpected error:', error);
    return [];
  }
}

/**
 * 사용자 모듈 접근 권한 토글 (관리자 전용)
 * @param userId 사용자 ID
 * @param moduleId 모듈 ID
 * @param isEnabled 활성화 여부
 * @returns 성공 여부
 */
export async function toggleUserModuleAccess(
  userId: string,
  moduleId: string,
  isEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. 기존 레코드 확인
    const { data: existing } = await supabase
      .from('user_module_access')
      .select('id')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .single();

    if (existing) {
      // 기존 레코드 업데이트
      const { error } = await supabase
        .from('user_module_access')
        .update({ is_enabled: isEnabled })
        .eq('id', existing.id);

      if (error) {
        console.error('[toggleUserModuleAccess] Update error:', error);
        return { success: false, error: error.message };
      }
    } else {
      // 새 레코드 생성
      const { error } = await supabase.from('user_module_access').insert({
        user_id: userId,
        module_id: moduleId,
        is_enabled: isEnabled,
      });

      if (error) {
        console.error('[toggleUserModuleAccess] Insert error:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[toggleUserModuleAccess] Unexpected error:', error);
    return { success: false, error: errorMessage };
  }
}

// =====================================================
// 페이지 수준 접근 제어 함수들
// =====================================================

/**
 * 사용자가 특정 페이지에 접근할 수 있는지 확인
 * @param pageCode 페이지 코드
 * @param moduleCode 모듈 코드 (선택)
 * @returns 접근 가능 여부
 */
export async function checkPageAccess(
  pageCode: string,
  moduleCode?: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // has_page_access RPC 함수 호출
    const { data, error} = await supabase.rpc('has_page_access', {
      page_code: pageCode,
      module_code: moduleCode || undefined,
    });

    if (error) {
      console.error('[checkPageAccess] RPC error:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('[checkPageAccess] Unexpected error:', error);
    return false;
  }
}

/**
 * 모듈의 모든 페이지 목록 가져오기
 * @param moduleId 모듈 ID
 * @returns 페이지 목록
 */
export async function getModulePages(moduleId: string): Promise<ModulePage[]> {
  try {
    const supabase = await createClient();

    const { data: pages, error } = await supabase
      .from('module_pages')
      .select('*')
      .eq('module_id', moduleId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[getModulePages] Error:', error);
      return [];
    }

    return (pages || []) as ModulePage[];
  } catch (error) {
    console.error('[getModulePages] Unexpected error:', error);
    return [];
  }
}

/**
 * 모듈과 하위 페이지를 함께 가져오기
 * @param moduleCode 모듈 코드
 * @returns 모듈과 페이지 목록
 */
export async function getModuleWithPages(moduleCode: ModuleCode): Promise<ModuleWithPages | null> {
  try {
    const supabase = await createClient();

    // 1. 모듈 정보 가져오기
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('*')
      .eq('code', moduleCode)
      .eq('is_active', true)
      .single();

    if (moduleError || !module) {
      console.error('[getModuleWithPages] Module error:', moduleError);
      return null;
    }

    // 2. 페이지 목록 가져오기
    const pages = await getModulePages(module.id);

    return {
      ...module,
      pages,
    } as ModuleWithPages;
  } catch (error) {
    console.error('[getModuleWithPages] Unexpected error:', error);
    return null;
  }
}

/**
 * 특정 사용자의 페이지 접근 권한 목록 가져오기 (관리자 전용)
 * @param userId 사용자 ID
 * @param moduleId 모듈 ID
 * @returns 페이지별 접근 권한 목록
 */
export async function getUserPageAccessList(
  userId: string,
  moduleId: string
): Promise<UserPageWithAccess[]> {
  try {
    const supabase = await createClient();

    // 1. 모듈의 모든 페이지 가져오기
    const { data: allPages, error: pagesError } = await supabase
      .from('module_pages')
      .select('*')
      .eq('module_id', moduleId)
      .order('parent_id', { ascending: true, nullsFirst: true })
      .order('sort_order', { ascending: true });

    if (pagesError) {
      console.error('[getUserPageAccessList] Pages error:', pagesError);
      return [];
    }

    if (!allPages || allPages.length === 0) {
      return [];
    }

    // 2. 사용자의 페이지 접근 권한 가져오기
    const { data: userAccess, error: accessError } = await supabase
      .from('user_page_access')
      .select('*')
      .eq('user_id', userId)
      .in('page_id', allPages.map(p => p.id));

    if (accessError) {
      console.error('[getUserPageAccessList] Access error:', accessError);
      return [];
    }

    // 3. 페이지와 접근 권한 매칭
    return allPages.map((page) => {
      const access = userAccess?.find((a) => a.page_id === page.id);

      return {
        ...page,
        access_id: access?.id,
        is_enabled: access?.is_enabled ?? false,
        user_id: userId,
      };
    }) as UserPageWithAccess[];
  } catch (error) {
    console.error('[getUserPageAccessList] Unexpected error:', error);
    return [];
  }
}

/**
 * 사용자 페이지 접근 권한 토글 (관리자 전용)
 * @param userId 사용자 ID
 * @param pageId 페이지 ID
 * @param isEnabled 활성화 여부
 * @returns 성공 여부
 */
export async function toggleUserPageAccess(
  userId: string,
  pageId: string,
  isEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. 기존 레코드 확인
    const { data: existing } = await supabase
      .from('user_page_access')
      .select('id')
      .eq('user_id', userId)
      .eq('page_id', pageId)
      .single();

    if (existing) {
      // 기존 레코드 업데이트
      const { error } = await supabase
        .from('user_page_access')
        .update({ is_enabled: isEnabled })
        .eq('id', existing.id);

      if (error) {
        console.error('[toggleUserPageAccess] Update error:', error);
        return { success: false, error: error.message };
      }
    } else {
      // 새 레코드 생성
      const { error } = await supabase.from('user_page_access').insert({
        user_id: userId,
        page_id: pageId,
        is_enabled: isEnabled,
      });

      if (error) {
        console.error('[toggleUserPageAccess] Insert error:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[toggleUserPageAccess] Unexpected error:', error);
    return { success: false, error: errorMessage };
  }
}
