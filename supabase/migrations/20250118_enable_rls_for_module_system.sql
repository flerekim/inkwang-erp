-- ============================================================================
-- Migration: Enable RLS and Create Policies for Module Access System
-- ============================================================================
-- Description: 모듈 및 페이지 접근 제어 테이블의 RLS 활성화 및 보안 정책 생성
-- Priority: P0 - Critical Security Issue
-- References:
--   - Supabase Advisor: rls_disabled_in_public
--   - https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public
-- Date: 2025-01-18
-- ============================================================================

-- ============================================================================
-- 1. RLS 활성화
-- ============================================================================

-- modules 테이블 RLS 활성화
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- module_pages 테이블 RLS 활성화
ALTER TABLE public.module_pages ENABLE ROW LEVEL SECURITY;

-- user_module_access 테이블 RLS 활성화
ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;

-- user_page_access 테이블 RLS 활성화
ALTER TABLE public.user_page_access ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. modules 테이블 정책
-- ============================================================================

-- 인증된 사용자는 활성화된 모듈 목록 조회 가능
CREATE POLICY "인증된 사용자는 활성화된 모듈 목록 조회 가능"
  ON public.modules FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- 관리자만 모듈 관리 가능
CREATE POLICY "관리자만 모듈 관리 가능"
  ON public.modules FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 3. module_pages 테이블 정책
-- ============================================================================

-- 인증된 사용자는 활성화된 페이지 목록 조회 가능
CREATE POLICY "인증된 사용자는 활성화된 페이지 목록 조회 가능"
  ON public.module_pages FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- 관리자만 페이지 관리 가능
CREATE POLICY "관리자만 페이지 관리 가능"
  ON public.module_pages FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 4. user_module_access 테이블 정책
-- ============================================================================

-- 사용자는 자신의 모듈 접근 권한만 조회 가능
CREATE POLICY "사용자는 자신의 모듈 접근 권한만 조회 가능"
  ON public.user_module_access FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 관리자는 모든 사용자의 모듈 접근 권한 관리 가능
CREATE POLICY "관리자는 모든 모듈 접근 권한 관리 가능"
  ON public.user_module_access FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 5. user_page_access 테이블 정책
-- ============================================================================

-- 사용자는 자신의 페이지 접근 권한만 조회 가능
CREATE POLICY "사용자는 자신의 페이지 접근 권한만 조회 가능"
  ON public.user_page_access FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 관리자는 모든 사용자의 페이지 접근 권한 관리 가능
CREATE POLICY "관리자는 모든 페이지 접근 권한 관리 가능"
  ON public.user_page_access FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 6. 마이그레이션 완료 로그
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ RLS enabled for module system tables';
  RAISE NOTICE '📋 Tables: modules, module_pages, user_module_access, user_page_access';
  RAISE NOTICE '🔒 Policies created: 8 policies (2 per table)';
  RAISE NOTICE '🛡️ Security level: CRITICAL issue resolved';
END $$;
