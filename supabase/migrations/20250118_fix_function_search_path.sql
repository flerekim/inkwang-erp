-- ============================================================================
-- Migration: Fix Function Search Path Vulnerability
-- ============================================================================
-- Description: 모든 Database Function에 search_path 설정하여 스키마 하이재킹 방지
-- Priority: P1 - High Security Issue
-- References:
--   - Supabase Advisor: function_search_path_mutable
--   - https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- Date: 2025-01-18
-- ============================================================================

-- ============================================================================
-- 1. update_updated_at_column 함수 (이미 search_path 있음 - 확인용)
-- ============================================================================
-- 이 함수는 이미 올바르게 구현되어 있으므로 수정 불필요
-- 다른 함수들도 이 패턴을 따라야 함

-- ============================================================================
-- 2. generate_order_number 함수 수정
-- ============================================================================
-- 주문 번호 자동 생성 함수에 search_path 추가

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- 추가
AS $$
DECLARE
  current_year TEXT;
  sequence_num INTEGER;
  order_num TEXT;
BEGIN
  -- 현재 연도 가져오기 (4자리)
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- 해당 연도의 마지막 주문 번호 조회
  SELECT COALESCE(MAX(
    CASE
      WHEN order_number ~ ('^' || current_year || '-[0-9]+$')
      THEN CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO sequence_num
  FROM public.orders
  WHERE order_number LIKE current_year || '-%';

  -- 주문 번호 생성 (형식: YYYY-0001)
  order_num := current_year || '-' || LPAD(sequence_num::TEXT, 4, '0');

  RETURN order_num;
END;
$$;

COMMENT ON FUNCTION public.generate_order_number IS '주문 번호 자동 생성 (형식: YYYY-0001) - 보안 강화';

-- ============================================================================
-- 3. update_performances_updated_at 함수 수정
-- ============================================================================
-- performances 테이블의 updated_at 자동 업데이트 함수에 search_path 추가

CREATE OR REPLACE FUNCTION public.update_performances_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public  -- 추가
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_performances_updated_at IS 'performances 테이블 updated_at 자동 업데이트 - 보안 강화';

-- ============================================================================
-- 4. validate_inkwang_email 함수 수정
-- ============================================================================
-- 인광이에스 이메일 검증 함수에 search_path 추가

CREATE OR REPLACE FUNCTION public.validate_inkwang_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public  -- 추가
AS $$
BEGIN
  -- 인광이에스 회사인 경우 이메일 도메인 검증
  IF EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = NEW.company_id
    AND name LIKE '%인광%'
  ) THEN
    IF NEW.email IS NOT NULL AND NEW.email !~ '@inkwang\.co\.kr$' THEN
      RAISE EXCEPTION '인광이에스 직원은 @inkwang.co.kr 이메일만 사용할 수 있습니다.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_inkwang_email IS '인광이에스 이메일 도메인 검증 - 보안 강화';

-- ============================================================================
-- 5. admin_create_user 함수 수정
-- ============================================================================
-- 관리자 사용자 생성 함수에 search_path 추가

CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email TEXT,
  user_password TEXT,
  user_name TEXT,
  user_role TEXT DEFAULT 'user',
  user_company_id UUID DEFAULT NULL,
  user_department_id UUID DEFAULT NULL,
  user_position_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth  -- public과 auth 스키마 모두 필요
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- 현재 사용자가 관리자인지 확인
  IF (SELECT role FROM public.users WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION '관리자만 사용자를 생성할 수 있습니다.';
  END IF;

  -- auth.users에 사용자 생성 (Supabase Auth)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', user_name),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- public.users에 사용자 정보 생성
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    company_id,
    department_id,
    position_id
  ) VALUES (
    new_user_id,
    user_email,
    user_name,
    user_role::user_role,
    user_company_id,
    user_department_id,
    user_position_id
  );

  RETURN new_user_id;
END;
$$;

COMMENT ON FUNCTION public.admin_create_user IS '관리자 사용자 생성 함수 - 보안 강화';

-- ============================================================================
-- 6. 마이그레이션 완료 로그
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Function search_path security fix completed';
  RAISE NOTICE '🔧 Fixed functions: 4 functions';
  RAISE NOTICE '   - generate_order_number';
  RAISE NOTICE '   - update_performances_updated_at';
  RAISE NOTICE '   - validate_inkwang_email';
  RAISE NOTICE '   - admin_create_user';
  RAISE NOTICE '🛡️ Security level: Schema hijacking prevention enabled';
END $$;
