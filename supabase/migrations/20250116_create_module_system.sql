-- ============================================================================
-- Migration: Create Module-based Access Control System (Option C - Hybrid)
-- ============================================================================
-- Description: 사용자별 모듈 접근 제어 시스템
-- Author: Claude Code
-- Date: 2025-01-16
-- Version: 1.0.0
-- ============================================================================

-- ============================================================================
-- 1. modules 테이블: 애플리케이션 모듈 정의
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL CHECK (code ~ '^[a-z0-9-]+$'),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,  -- lucide-react 아이콘 이름
  href TEXT NOT NULL,  -- 라우트 경로
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 코멘트 추가
COMMENT ON TABLE public.modules IS '애플리케이션 모듈 정의';
COMMENT ON COLUMN public.modules.code IS '모듈 고유 코드 (예: admin, inkwang-es)';
COMMENT ON COLUMN public.modules.name IS '모듈 표시명 (예: 관리자, 인광이에스)';
COMMENT ON COLUMN public.modules.href IS '모듈 라우트 경로 (예: /admin, /inkwang-es)';
COMMENT ON COLUMN public.modules.icon IS 'lucide-react 아이콘 이름';

-- ============================================================================
-- 2. user_module_access 테이블: 사용자별 모듈 접근 권한
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- 코멘트 추가
COMMENT ON TABLE public.user_module_access IS '사용자별 모듈 접근 권한 관리';
COMMENT ON COLUMN public.user_module_access.is_enabled IS '모듈 활성화 여부';

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_user_module_access_user_id ON public.user_module_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_access_module_id ON public.user_module_access(module_id);
CREATE INDEX IF NOT EXISTS idx_user_module_access_enabled ON public.user_module_access(user_id, is_enabled);

-- ============================================================================
-- 3. 기본 모듈 데이터 삽입
-- ============================================================================
INSERT INTO public.modules (code, name, description, icon, href, sort_order) VALUES
  ('admin', '관리자', '시스템 관리 및 설정', 'Settings', '/admin', 1),
  ('inkwang-es', '인광이에스', '인광이에스 업무 관리', 'Building2', '/inkwang-es', 2)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. RLS 함수: has_module_access (Security Definer)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_module_access(
  module_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE  -- 캐싱 활성화 (성능 최적화)
AS $$
DECLARE
  is_admin BOOLEAN;
  has_access BOOLEAN;
  current_user_id UUID;
BEGIN
  -- 현재 사용자 ID 가져오기
  current_user_id := auth.uid();

  -- 사용자가 없으면 false 반환
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. 관리자는 모든 모듈 접근 가능
  SELECT (role = 'admin') INTO is_admin
  FROM public.users
  WHERE id = current_user_id;

  IF is_admin THEN
    RETURN TRUE;
  END IF;

  -- 2. 일반 사용자는 user_module_access 테이블 확인
  SELECT EXISTS (
    SELECT 1
    FROM public.user_module_access uma
    JOIN public.modules m ON m.id = uma.module_id
    WHERE uma.user_id = current_user_id
      AND m.code = module_code
      AND uma.is_enabled = TRUE
      AND m.is_active = TRUE
  ) INTO has_access;

  RETURN COALESCE(has_access, FALSE);
END;
$$;

-- 함수 코멘트
COMMENT ON FUNCTION public.has_module_access IS '사용자가 특정 모듈에 접근 가능한지 확인 (admin은 모든 모듈 접근)';

-- ============================================================================
-- 5. RLS 활성화 (기본적으로 비활성화 상태로 시작)
-- ============================================================================
-- 주의: RLS는 나중에 필요 시 활성화할 수 있도록 준비만 해둡니다.
-- ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS 정책 (주석 처리 - 나중에 필요시 활성화)
-- ============================================================================
-- -- modules 테이블: 모든 사용자가 조회 가능 (활성화된 모듈만)
-- CREATE POLICY "모듈 목록은 모두 조회 가능"
--   ON public.modules FOR SELECT
--   TO authenticated
--   USING (is_active = TRUE);

-- -- user_module_access 테이블: 자신의 접근 권한만 조회 가능
-- CREATE POLICY "자신의 모듈 접근 권한만 조회 가능"
--   ON public.user_module_access FOR SELECT
--   TO authenticated
--   USING (user_id = auth.uid());

-- -- 관리자만 모듈 접근 권한 관리 가능
-- CREATE POLICY "관리자만 모듈 접근 권한 관리 가능"
--   ON public.user_module_access FOR ALL
--   TO authenticated
--   USING (
--     (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
--   )
--   WITH CHECK (
--     (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
--   );

-- ============================================================================
-- 7. updated_at 자동 업데이트 트리거
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- modules 테이블 트리거
DROP TRIGGER IF EXISTS update_modules_updated_at ON public.modules;
CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- user_module_access 테이블 트리거
DROP TRIGGER IF EXISTS update_user_module_access_updated_at ON public.user_module_access;
CREATE TRIGGER update_user_module_access_updated_at
  BEFORE UPDATE ON public.user_module_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 8. 권한 부여 (PostgreSQL Roles)
-- ============================================================================
-- authenticated 역할에 모듈 조회 권한 부여
GRANT SELECT ON public.modules TO authenticated;
GRANT SELECT ON public.user_module_access TO authenticated;

-- 관리자가 실행하는 함수는 모든 사용자가 호출 가능
GRANT EXECUTE ON FUNCTION public.has_module_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_module_access(TEXT) TO anon;

-- ============================================================================
-- 9. 마이그레이션 완료 로그
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Module system migration completed successfully';
  RAISE NOTICE '📋 Created tables: modules, user_module_access';
  RAISE NOTICE '🔧 Created function: has_module_access(TEXT)';
  RAISE NOTICE '📝 Inserted default modules: admin, inkwang-es';
  RAISE NOTICE '⚠️  RLS policies are prepared but NOT enabled yet';
END $$;
