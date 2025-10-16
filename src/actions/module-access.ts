'use server';

import { requireAdmin } from '@/lib/auth';
import {
  getAllModules,
  getUserModuleAccessList,
  toggleUserModuleAccess,
  getUserPageAccessList,
  toggleUserPageAccess,
} from '@/lib/modules/permissions';
import { revalidatePath } from 'next/cache';

/**
 * 모든 모듈 목록 가져오기 (관리자 전용)
 */
export async function getModulesAction() {
  try {
    await requireAdmin();
    const modules = await getAllModules();
    return { data: modules, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '모듈 목록 조회 실패',
    };
  }
}

/**
 * 특정 사용자의 모듈 접근 권한 목록 가져오기 (관리자 전용)
 */
export async function getUserModuleAccessAction(userId: string) {
  try {
    await requireAdmin();
    const access = await getUserModuleAccessList(userId);
    return { data: access, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '접근 권한 조회 실패',
    };
  }
}

/**
 * 사용자 모듈 접근 권한 토글 (관리자 전용)
 */
export async function toggleModuleAccessAction(
  userId: string,
  moduleId: string,
  isEnabled: boolean
) {
  try {
    await requireAdmin();

    const result = await toggleUserModuleAccess(userId, moduleId, isEnabled);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // 레이아웃 재검증 (사이드바 갱신)
    revalidatePath('/(dashboard)', 'layout');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '권한 변경 실패',
    };
  }
}

/**
 * 특정 사용자의 특정 모듈 페이지 접근 권한 목록 가져오기 (관리자 전용)
 */
export async function getUserPageAccessAction(userId: string, moduleId: string) {
  try {
    await requireAdmin();
    const pages = await getUserPageAccessList(userId, moduleId);
    return { data: pages, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : '페이지 접근 권한 조회 실패',
    };
  }
}

/**
 * 사용자 페이지 접근 권한 토글 (관리자 전용)
 */
export async function togglePageAccessAction(
  userId: string,
  pageId: string,
  isEnabled: boolean
) {
  try {
    await requireAdmin();

    const result = await toggleUserPageAccess(userId, pageId, isEnabled);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // 레이아웃 재검증 (사이드바 갱신)
    revalidatePath('/(dashboard)', 'layout');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '페이지 권한 변경 실패',
    };
  }
}
