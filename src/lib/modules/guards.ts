'use server';

import { redirect } from 'next/navigation';
import { checkModuleAccess } from './permissions';
import type { ModuleCode } from './types';

/**
 * 특정 모듈에 대한 접근 권한을 확인하고, 권한이 없으면 홈으로 리다이렉트
 * @param moduleCode 모듈 코드 (예: 'admin', 'inkwang-es')
 * @throws redirect to '/' if user doesn't have access
 */
export async function requireModule(moduleCode: ModuleCode): Promise<void> {
  const hasAccess = await checkModuleAccess(moduleCode);

  if (!hasAccess) {
    redirect('/');
  }
}

/**
 * 특정 모듈에 대한 접근 권한을 확인하고, 권한 여부를 반환
 * @param moduleCode 모듈 코드
 * @returns 접근 가능 여부
 */
export async function canAccessModule(moduleCode: ModuleCode): Promise<boolean> {
  return checkModuleAccess(moduleCode);
}
