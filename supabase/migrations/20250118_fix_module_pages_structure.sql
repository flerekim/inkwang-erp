-- =====================================================
-- 페이지 구조 수정: 실제 사이드바 메뉴와 일치시키기
-- =====================================================
-- 작성일: 2025-01-18
-- 설명: 실제 구현된 사이드바 메뉴 구조와 module_pages 테이블 데이터 일치
--       기존의 잘못된 페이지 데이터 삭제 및 정확한 구조로 재구성

-- =====================================================
-- 1. 기존 inkwang-es 모듈 페이지 데이터 삭제
-- =====================================================
DO $$
DECLARE
  v_inkwang_es_module_id UUID;
BEGIN
  -- inkwang-es 모듈 ID 조회
  SELECT id INTO v_inkwang_es_module_id
  FROM public.modules
  WHERE code = 'inkwang-es';

  IF v_inkwang_es_module_id IS NULL THEN
    RAISE NOTICE 'inkwang-es 모듈을 찾을 수 없습니다.';
    RETURN;
  END IF;

  -- 기존 페이지 데이터 삭제 (CASCADE로 user_page_access도 함께 삭제됨)
  DELETE FROM public.module_pages
  WHERE module_id = v_inkwang_es_module_id;

  RAISE NOTICE 'inkwang-es 모듈의 기존 페이지 데이터가 삭제되었습니다.';
END $$;

-- =====================================================
-- 2. 실제 사이드바 구조에 맞는 페이지 데이터 삽입
-- =====================================================

-- inkwang-es 모듈 페이지 구조
DO $$
DECLARE
  v_inkwang_es_module_id UUID;
  v_basics_parent_id UUID;
  v_sales_parent_id UUID;
BEGIN
  -- inkwang-es 모듈 ID 조회
  SELECT id INTO v_inkwang_es_module_id
  FROM public.modules
  WHERE code = 'inkwang-es';

  IF v_inkwang_es_module_id IS NULL THEN
    RAISE NOTICE 'inkwang-es 모듈을 찾을 수 없습니다.';
    RETURN;
  END IF;

  -- 기초관리 (상위 메뉴)
  INSERT INTO public.module_pages (module_id, code, name, description, href, icon, parent_id, sort_order, is_active)
  VALUES (v_inkwang_es_module_id, 'basics', '기초관리', '기초 데이터 관리', '/inkwang-es/basics', 'Database', NULL, 1, true)
  RETURNING id INTO v_basics_parent_id;

  -- 기초관리 하위 페이지
  INSERT INTO public.module_pages (module_id, code, name, description, href, icon, parent_id, sort_order, is_active)
  VALUES
    (v_inkwang_es_module_id, 'basics-customers', '고객관리', '고객 정보 관리', '/inkwang-es/basics/customers', 'UsersRound', v_basics_parent_id, 1, true);

  -- 영업관리 (상위 메뉴)
  INSERT INTO public.module_pages (module_id, code, name, description, href, icon, parent_id, sort_order, is_active)
  VALUES (v_inkwang_es_module_id, 'sales', '영업관리', '영업 관련 업무 관리', '/inkwang-es/sales', 'FileText', NULL, 2, true)
  RETURNING id INTO v_sales_parent_id;

  -- 영업관리 하위 페이지
  INSERT INTO public.module_pages (module_id, code, name, description, href, icon, parent_id, sort_order, is_active)
  VALUES
    (v_inkwang_es_module_id, 'sales-orders', '수주관리', '수주 계약 관리', '/inkwang-es/sales/orders', 'FileText', v_sales_parent_id, 1, true);

  RAISE NOTICE 'inkwang-es 모듈 페이지가 실제 사이드바 구조와 일치하도록 업데이트되었습니다.';
END $$;

-- =====================================================
-- 3. admin 모듈 페이지 데이터 추가
-- =====================================================

-- 기존 admin 모듈 페이지 삭제
DO $$
DECLARE
  v_admin_module_id UUID;
BEGIN
  -- admin 모듈 ID 조회
  SELECT id INTO v_admin_module_id
  FROM public.modules
  WHERE code = 'admin';

  IF v_admin_module_id IS NULL THEN
    RAISE NOTICE 'admin 모듈을 찾을 수 없습니다.';
    RETURN;
  END IF;

  -- 기존 페이지 데이터 삭제
  DELETE FROM public.module_pages
  WHERE module_id = v_admin_module_id;

  RAISE NOTICE 'admin 모듈의 기존 페이지 데이터가 삭제되었습니다.';
END $$;

-- admin 모듈 페이지 구조
DO $$
DECLARE
  v_admin_module_id UUID;
  v_company_parent_id UUID;
BEGIN
  -- admin 모듈 ID 조회
  SELECT id INTO v_admin_module_id
  FROM public.modules
  WHERE code = 'admin';

  IF v_admin_module_id IS NULL THEN
    RAISE NOTICE 'admin 모듈을 찾을 수 없습니다.';
    RETURN;
  END IF;

  -- 사원관리 (최상위 페이지)
  INSERT INTO public.module_pages (module_id, code, name, description, href, icon, parent_id, sort_order, is_active)
  VALUES
    (v_admin_module_id, 'employees', '사원관리', '사원 정보 관리', '/admin/employees', 'Users', NULL, 1, true);

  -- 회사관리 (상위 메뉴)
  INSERT INTO public.module_pages (module_id, code, name, description, href, icon, parent_id, sort_order, is_active)
  VALUES (v_admin_module_id, 'company', '회사관리', '회사 기본 정보 관리', '/admin/company', 'Building2', NULL, 2, true)
  RETURNING id INTO v_company_parent_id;

  -- 회사관리 하위 페이지
  INSERT INTO public.module_pages (module_id, code, name, description, href, icon, parent_id, sort_order, is_active)
  VALUES
    (v_admin_module_id, 'company-companies', '회사 정보', '회사 기본 정보', '/admin/company/companies', 'Building2', v_company_parent_id, 1, true),
    (v_admin_module_id, 'company-departments', '부서 관리', '부서 정보 관리', '/admin/company/departments', 'Building2', v_company_parent_id, 2, true),
    (v_admin_module_id, 'company-positions', '직급 관리', '직급 정보 관리', '/admin/company/positions', 'Building2', v_company_parent_id, 3, true),
    (v_admin_module_id, 'company-bank-accounts', '은행계좌', '은행 계좌 관리', '/admin/company/bank-accounts', 'Building2', v_company_parent_id, 4, true);

  RAISE NOTICE 'admin 모듈 페이지가 실제 사이드바 구조와 일치하도록 추가되었습니다.';
END $$;

-- =====================================================
-- 4. 검증 쿼리 (결과 확인용)
-- =====================================================

-- 모듈별 페이지 구조 확인
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== 모듈별 페이지 구조 ===';

  FOR rec IN
    SELECT
      m.name AS module_name,
      m.code AS module_code,
      COUNT(mp.id) AS page_count
    FROM public.modules m
    LEFT JOIN public.module_pages mp ON mp.module_id = m.id
    GROUP BY m.id, m.name, m.code
    ORDER BY m.sort_order
  LOOP
    RAISE NOTICE '모듈: % (%) - 페이지 수: %', rec.module_name, rec.module_code, rec.page_count;
  END LOOP;
END $$;
