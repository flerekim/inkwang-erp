-- ============================================================================
-- Migration: Optimize RLS Policy Performance
-- ============================================================================
-- Description: auth.uid() 호출을 SELECT로 감싸서 InitPlan 최적화
-- Priority: P1 - Performance Optimization
-- References:
--   - Supabase Advisor: auth_rls_initplan
--   - https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- Performance Impact: 대량 데이터 처리 시 최대 10배 성능 향상
-- Date: 2025-01-18
-- ============================================================================

-- ============================================================================
-- 성능 최적화 원리
-- ============================================================================
-- ❌ Before: auth.uid()가 각 행마다 재평가 (O(n) 시간)
--    SELECT * FROM users WHERE company_id = auth.uid();
--    → 1,000건 조회 시 auth.uid() 1,000번 호출
--
-- ✅ After: auth.uid()가 쿼리당 1번만 평가 (O(1) 시간)
--    SELECT * FROM users WHERE company_id = (SELECT auth.uid());
--    → 1,000건 조회 시 auth.uid() 1번만 호출
-- ============================================================================

-- ============================================================================
-- 1. companies 테이블 정책 최적화
-- ============================================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admin만 회사 정보를 삭제할 수 있음" ON public.companies;
DROP POLICY IF EXISTS "Admin만 회사 정보를 삽입할 수 있음" ON public.companies;
DROP POLICY IF EXISTS "Admin만 회사 정보를 수정할 수 있음" ON public.companies;

-- 최적화된 정책 생성
CREATE POLICY "Admin만 회사 정보를 삭제할 수 있음"
  ON public.companies FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admin만 회사 정보를 삽입할 수 있음"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admin만 회사 정보를 수정할 수 있음"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 2. departments 테이블 정책 최적화
-- ============================================================================

DROP POLICY IF EXISTS "Admin만 부서 정보를 삭제할 수 있음" ON public.departments;
DROP POLICY IF EXISTS "Admin만 부서 정보를 삽입할 수 있음" ON public.departments;
DROP POLICY IF EXISTS "Admin만 부서 정보를 수정할 수 있음" ON public.departments;

CREATE POLICY "Admin만 부서 정보를 삭제할 수 있음"
  ON public.departments FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admin만 부서 정보를 삽입할 수 있음"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admin만 부서 정보를 수정할 수 있음"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 3. positions 테이블 정책 최적화
-- ============================================================================

DROP POLICY IF EXISTS "Admin만 직급 정보를 삭제할 수 있음" ON public.positions;
DROP POLICY IF EXISTS "Admin만 직급 정보를 삽입할 수 있음" ON public.positions;
DROP POLICY IF EXISTS "Admin만 직급 정보를 수정할 수 있음" ON public.positions;

CREATE POLICY "Admin만 직급 정보를 삭제할 수 있음"
  ON public.positions FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admin만 직급 정보를 삽입할 수 있음"
  ON public.positions FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admin만 직급 정보를 수정할 수 있음"
  ON public.positions FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 4. bank_accounts 테이블 정책 최적화
-- ============================================================================

DROP POLICY IF EXISTS "Admin만 은행계좌를 삭제할 수 있음" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admin만 은행계좌를 생성할 수 있음" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admin만 은행계좌를 수정할 수 있음" ON public.bank_accounts;

CREATE POLICY "Admin만 은행계좌를 삭제할 수 있음"
  ON public.bank_accounts FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admin만 은행계좌를 생성할 수 있음"
  ON public.bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admin만 은행계좌를 수정할 수 있음"
  ON public.bank_accounts FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 5. users 테이블 정책 최적화
-- ============================================================================

DROP POLICY IF EXISTS "Admin과 본인만 사용자 정보를 수정할 수 있음" ON public.users;
DROP POLICY IF EXISTS "Admin만 사용자를 삭제할 수 있음" ON public.users;
DROP POLICY IF EXISTS "Admin만 사용자를 생성할 수 있음" ON public.users;

CREATE POLICY "Admin과 본인만 사용자 정보를 수정할 수 있음"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid()) OR
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    id = (SELECT auth.uid()) OR
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admin만 사용자를 삭제할 수 있음"
  ON public.users FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admin만 사용자를 생성할 수 있음"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 6. methods 테이블 정책 최적화
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view methods" ON public.methods;
DROP POLICY IF EXISTS "Only admins can modify methods" ON public.methods;

CREATE POLICY "Anyone can view methods"
  ON public.methods FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Only admins can modify methods"
  ON public.methods FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 7. customers 테이블 정책 최적화
-- ============================================================================

DROP POLICY IF EXISTS "Admin full access to customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view customers" ON public.customers;

CREATE POLICY "Admin full access to customers"
  ON public.customers FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Users can view customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================================
-- 8. pollutants 테이블 정책 최적화
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view pollutants" ON public.pollutants;
DROP POLICY IF EXISTS "Only admins can modify pollutants" ON public.pollutants;

CREATE POLICY "Anyone can view pollutants"
  ON public.pollutants FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Only admins can modify pollutants"
  ON public.pollutants FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 9. order_pollutants 테이블 정책 최적화
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view order_pollutants" ON public.order_pollutants;
DROP POLICY IF EXISTS "Only admins can modify order_pollutants" ON public.order_pollutants;

CREATE POLICY "Anyone can view order_pollutants"
  ON public.order_pollutants FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Only admins can modify order_pollutants"
  ON public.order_pollutants FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 10. order_methods 테이블 정책 최적화
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view order_methods" ON public.order_methods;
DROP POLICY IF EXISTS "Only admins can modify order_methods" ON public.order_methods;

CREATE POLICY "Anyone can view order_methods"
  ON public.order_methods FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Only admins can modify order_methods"
  ON public.order_methods FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 11. performances 테이블 정책 최적화
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage performances" ON public.performances;
DROP POLICY IF EXISTS "Users can view performances" ON public.performances;

CREATE POLICY "Admins can manage performances"
  ON public.performances FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Users can view performances"
  ON public.performances FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================================
-- 12. orders 테이블 정책 최적화
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Only admins can modify orders" ON public.orders;

CREATE POLICY "Anyone can view orders"
  ON public.orders FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Only admins can modify orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
  );

-- ============================================================================
-- 13. 마이그레이션 완료 로그
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ RLS performance optimization completed';
  RAISE NOTICE '📊 Optimized tables: 12 tables';
  RAISE NOTICE '🚀 Performance improvement: Up to 10x faster on large datasets';
  RAISE NOTICE '💡 Optimization method: auth.uid() wrapped in SELECT';
  RAISE NOTICE '   - companies (3 policies)';
  RAISE NOTICE '   - departments (3 policies)';
  RAISE NOTICE '   - positions (3 policies)';
  RAISE NOTICE '   - bank_accounts (3 policies)';
  RAISE NOTICE '   - users (3 policies)';
  RAISE NOTICE '   - methods (2 policies)';
  RAISE NOTICE '   - customers (2 policies)';
  RAISE NOTICE '   - pollutants (2 policies)';
  RAISE NOTICE '   - order_pollutants (2 policies)';
  RAISE NOTICE '   - order_methods (2 policies)';
  RAISE NOTICE '   - performances (2 policies)';
  RAISE NOTICE '   - orders (2 policies)';
END $$;
