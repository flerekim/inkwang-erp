-- =====================================================
-- 페이지 단위 접근 제어 시스템 추가
-- =====================================================
-- 작성일: 2025-01-17
-- 설명: 모듈 내 개별 페이지에 대한 세밀한 접근 제어 기능 추가
--       - module_pages: 각 모듈의 페이지(메뉴) 정보
--       - user_page_access: 사용자별 페이지 접근 권한

-- =====================================================
-- 1. module_pages 테이블 생성
-- =====================================================
CREATE TABLE IF NOT EXISTS public.module_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (code ~ '^[a-z0-9-]+$'),
  name TEXT NOT NULL,
  description TEXT,
  href TEXT NOT NULL,
  icon TEXT,
  parent_id UUID REFERENCES public.module_pages(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, code)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_module_pages_module_id ON public.module_pages(module_id);
CREATE INDEX IF NOT EXISTS idx_module_pages_parent_id ON public.module_pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_module_pages_code ON public.module_pages(code);
CREATE INDEX IF NOT EXISTS idx_module_pages_is_active ON public.module_pages(is_active);

-- 코멘트 추가
COMMENT ON TABLE public.module_pages IS '모듈 내 페이지(메뉴) 정보';
COMMENT ON COLUMN public.module_pages.module_id IS '소속 모듈 ID';
COMMENT ON COLUMN public.module_pages.code IS '페이지 고유 코드 (예: sales-orders)';
COMMENT ON COLUMN public.module_pages.name IS '페이지 표시명';
COMMENT ON COLUMN public.module_pages.href IS '페이지 경로';
COMMENT ON COLUMN public.module_pages.parent_id IS '상위 페이지 ID (계층 구조용)';
COMMENT ON COLUMN public.module_pages.sort_order IS '정렬 순서';

-- =====================================================
-- 2. user_page_access 테이블 생성
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_page_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.module_pages(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, page_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_page_access_user_id ON public.user_page_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_page_access_page_id ON public.user_page_access(page_id);
CREATE INDEX IF NOT EXISTS idx_user_page_access_is_enabled ON public.user_page_access(is_enabled);

-- 코멘트 추가
COMMENT ON TABLE public.user_page_access IS '사용자별 페이지 접근 권한';
COMMENT ON COLUMN public.user_page_access.user_id IS '사용자 ID';
COMMENT ON COLUMN public.user_page_access.page_id IS '페이지 ID';
COMMENT ON COLUMN public.user_page_access.is_enabled IS '권한 활성화 여부';

-- =====================================================
-- 3. updated_at 트리거 생성
-- =====================================================
CREATE TRIGGER update_module_pages_updated_at
  BEFORE UPDATE ON public.module_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_page_access_updated_at
  BEFORE UPDATE ON public.user_page_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. 초기 페이지 데이터 삽입 (인광이에스 모듈)
-- =====================================================

-- 먼저 inkwang-es 모듈 ID 가져오기
DO $$
DECLARE
  v_inkwang_es_module_id UUID;
  v_sales_parent_id UUID;
  v_project_parent_id UUID;
  v_survey_parent_id UUID;
BEGIN
  -- inkwang-es 모듈 ID 조회
  SELECT id INTO v_inkwang_es_module_id
  FROM public.modules
  WHERE code = 'inkwang-es';

  IF v_inkwang_es_module_id IS NULL THEN
    RAISE NOTICE 'inkwang-es 모듈을 찾을 수 없습니다.';
    RETURN;
  END IF;

  -- 영업관리 (상위 메뉴)
  INSERT INTO public.module_pages (module_id, code, name, description, href, icon, parent_id, sort_order, is_active)
  VALUES (v_inkwang_es_module_id, 'sales', '영업관리', '영업 관련 업무 관리', '/inkwang-es/sales', 'Briefcase', NULL, 1, true)
  ON CONFLICT (module_id, code) DO NOTHING
  RETURNING id INTO v_sales_parent_id;

  -- 영업관리 하위 페이지들
  INSERT INTO public.module_pages (module_id, code, name, description, href, icon, parent_id, sort_order, is_active)
  VALUES
    (v_inkwang_es_module_id, 'sales-orders', '수주관리', '수주 계약 관리', '/inkwang-es/sales/orders', 'FileText', v_sales_parent_id, 1, true),
    (v_inkwang_es_module_id, 'sales-quotes', '견적관리', '견적서 작성 및 관리', '/inkwang-es/sales/quotes', 'Calculator', v_sales_parent_id, 2, true),
    (v_inkwang_es_module_id, 'sales-customers', '고객관리', '고객 정보 관리', '/inkwang-es/sales/customers', 'Users', v_sales_parent_id, 3, true)
  ON CONFLICT (module_id, code) DO NOTHING;

  -- 프로젝트관리 (상위 메뉴)
  INSERT INTO public.module_pages (module_id, code, name, description, href, icon, parent_id, sort_order, is_active)
  VALUES (v_inkwang_es_module_id, 'projects', '프로젝트관리', '프로젝트 진행 관리', '/inkwang-es/projects', 'FolderKanban', NULL, 2, true)
  ON CONFLICT (module_id, code) DO NOTHING
  RETURNING id INTO v_project_parent_id;

  -- 프로젝트관리 하위 페이지들
  INSERT INTO public.module_pages (module_id, code, name, description, href, icon, parent_id, sort_order, is_active)
  VALUES
    (v_inkwang_es_module_id, 'projects-list', '프로젝트 목록', '진행 중인 프로젝트', '/inkwang-es/projects/list', 'List', v_project_parent_id, 1, true),
    (v_inkwang_es_module_id, 'projects-schedule', '일정관리', '프로젝트 일정 관리', '/inkwang-es/projects/schedule', 'Calendar', v_project_parent_id, 2, true)
  ON CONFLICT (module_id, code) DO NOTHING;

  -- 현장조사 (상위 메뉴)
  INSERT INTO public.module_pages (module_id, code, name, description, href, icon, parent_id, sort_order, is_active)
  VALUES (v_inkwang_es_module_id, 'surveys', '현장조사', '현장 조사 및 보고', '/inkwang-es/surveys', 'MapPin', NULL, 3, true)
  ON CONFLICT (module_id, code) DO NOTHING
  RETURNING id INTO v_survey_parent_id;

  -- 현장조사 하위 페이지들
  INSERT INTO public.module_pages (module_id, code, name, description, href, icon, parent_id, sort_order, is_active)
  VALUES
    (v_inkwang_es_module_id, 'surveys-schedule', '조사 일정', '현장 조사 일정 관리', '/inkwang-es/surveys/schedule', 'CalendarCheck', v_survey_parent_id, 1, true),
    (v_inkwang_es_module_id, 'surveys-reports', '조사 보고서', '현장 조사 보고서 작성', '/inkwang-es/surveys/reports', 'FileEdit', v_survey_parent_id, 2, true)
  ON CONFLICT (module_id, code) DO NOTHING;

  RAISE NOTICE 'inkwang-es 모듈 페이지가 성공적으로 추가되었습니다.';
END $$;

-- =====================================================
-- 5. 페이지 접근 권한 체크 함수 (RPC)
-- =====================================================

-- 사용자가 특정 페이지에 접근할 수 있는지 확인
CREATE OR REPLACE FUNCTION public.has_page_access(page_code TEXT, module_code TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  is_admin BOOLEAN;
  has_module_access BOOLEAN;
  has_explicit_page_access BOOLEAN;
  has_any_page_restriction BOOLEAN;
  current_user_id UUID;
  target_module_id UUID;
  target_page_id UUID;
BEGIN
  -- 현재 사용자 ID 가져오기
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 사용자가 관리자인지 확인
  SELECT (role = 'admin') INTO is_admin
  FROM public.users
  WHERE id = current_user_id;

  -- 관리자는 모든 페이지 접근 가능
  IF is_admin THEN
    RETURN TRUE;
  END IF;

  -- 페이지 정보 조회 (module_code가 제공된 경우 사용)
  IF module_code IS NOT NULL THEN
    SELECT mp.id, mp.module_id INTO target_page_id, target_module_id
    FROM public.module_pages mp
    JOIN public.modules m ON m.id = mp.module_id
    WHERE mp.code = page_code
      AND m.code = module_code
      AND mp.is_active = TRUE
      AND m.is_active = TRUE;
  ELSE
    SELECT mp.id, mp.module_id INTO target_page_id, target_module_id
    FROM public.module_pages mp
    JOIN public.modules m ON m.id = mp.module_id
    WHERE mp.code = page_code
      AND mp.is_active = TRUE
      AND m.is_active = TRUE;
  END IF;

  -- 페이지를 찾지 못한 경우
  IF target_page_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1단계: 모듈 접근 권한 확인
  SELECT EXISTS (
    SELECT 1
    FROM public.user_module_access uma
    WHERE uma.user_id = current_user_id
      AND uma.module_id = target_module_id
      AND uma.is_enabled = TRUE
  ) INTO has_module_access;

  -- 모듈 접근 권한이 없으면 페이지도 접근 불가
  IF NOT has_module_access THEN
    RETURN FALSE;
  END IF;

  -- 2단계: 페이지별 제한이 설정되어 있는지 확인
  SELECT EXISTS (
    SELECT 1
    FROM public.user_page_access upa
    JOIN public.module_pages mp ON mp.id = upa.page_id
    WHERE upa.user_id = current_user_id
      AND mp.module_id = target_module_id
  ) INTO has_any_page_restriction;

  -- 페이지별 제한이 없으면 모듈 권한으로 모든 페이지 접근 가능
  IF NOT has_any_page_restriction THEN
    RETURN TRUE;
  END IF;

  -- 3단계: 특정 페이지 접근 권한 확인
  SELECT EXISTS (
    SELECT 1
    FROM public.user_page_access upa
    WHERE upa.user_id = current_user_id
      AND upa.page_id = target_page_id
      AND upa.is_enabled = TRUE
  ) INTO has_explicit_page_access;

  RETURN COALESCE(has_explicit_page_access, FALSE);
END;
$$;

-- 함수 코멘트
COMMENT ON FUNCTION public.has_page_access(TEXT, TEXT) IS '사용자의 특정 페이지 접근 권한 확인';

-- =====================================================
-- 6. 권한 부여
-- =====================================================
GRANT SELECT ON public.module_pages TO authenticated;
GRANT SELECT ON public.user_page_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_page_access(TEXT, TEXT) TO authenticated;

-- Admin 역할에는 모든 권한 부여
GRANT ALL ON public.module_pages TO service_role;
GRANT ALL ON public.user_page_access TO service_role;
