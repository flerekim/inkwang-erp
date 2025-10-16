/**
 * 모듈 시스템 타입 정의
 * Option C (하이브리드 접근) - 모듈 수준 접근 제어
 */

/**
 * 모듈 코드 타입
 * 새 모듈 추가 시 여기에 추가하세요
 */
export type ModuleCode = 'admin' | 'inkwang-es' | 'inkwang-ec';

/**
 * 모듈 정보 인터페이스
 */
export interface Module {
  id: string;
  code: ModuleCode;
  name: string;
  description: string | null;
  icon: string | null;
  href: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 사용자 모듈 접근 권한 인터페이스
 */
export interface UserModuleAccess {
  id: string;
  user_id: string;
  module_id: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 모듈 접근 권한 상태
 */
export interface ModuleAccessState {
  module: Module;
  hasAccess: boolean;
  isEnabled: boolean;
}

/**
 * 사용자별 모듈 접근 권한 (Join 결과)
 */
export interface UserModuleWithAccess extends Module {
  access_id?: string;
  is_enabled: boolean;
  user_id?: string;
}

/**
 * 모듈 활성화/비활성화 요청
 */
export interface ToggleModuleAccessRequest {
  userId: string;
  moduleId: string;
  isEnabled: boolean;
}

/**
 * 모듈 접근 확인 결과
 */
export interface ModuleAccessResult {
  hasAccess: boolean;
  reason?: 'admin' | 'explicit_grant' | 'no_access' | 'module_inactive';
}

/**
 * 페이지 정보 인터페이스
 */
export interface ModulePage {
  id: string;
  module_id: string;
  code: string;
  name: string;
  description: string | null;
  href: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 사용자 페이지 접근 권한 인터페이스
 */
export interface UserPageAccess {
  id: string;
  user_id: string;
  page_id: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 사용자별 페이지 접근 권한 (Join 결과)
 */
export interface UserPageWithAccess extends ModulePage {
  access_id?: string;
  is_enabled: boolean;
  user_id?: string;
  module?: Module;
}

/**
 * 모듈과 하위 페이지 정보 (계층 구조)
 */
export interface ModuleWithPages extends Module {
  pages: ModulePage[];
}

/**
 * 페이지 접근 권한 토글 요청
 */
export interface TogglePageAccessRequest {
  userId: string;
  pageId: string;
  isEnabled: boolean;
}
