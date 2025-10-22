-- ============================================================================
-- Migration: Add Missing Foreign Key Indexes
-- ============================================================================
-- Description: 외래 키 컬럼에 인덱스를 추가하여 JOIN 성능 개선
-- Priority: P2 - Performance Optimization
-- References:
--   - Supabase Advisor: unindexed_foreign_keys
--   - https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
-- Performance Impact: JOIN 쿼리 성능 향상 (Full Table Scan → Index Scan)
-- Date: 2025-01-18
-- ============================================================================

-- ============================================================================
-- 성능 개선 효과
-- ============================================================================
-- ❌ Before: 외래 키 없이 JOIN 시 Full Table Scan
--    SELECT * FROM orders o JOIN users u ON o.manager_id = u.id;
--    → orders 테이블 전체 스캔 (느림)
--
-- ✅ After: 외래 키 인덱스로 Index Scan
--    SELECT * FROM orders o JOIN users u ON o.manager_id = u.id;
--    → 인덱스로 빠른 조회
-- ============================================================================

-- ============================================================================
-- 1. orders 테이블 인덱스 추가 (4개)
-- ============================================================================

-- 담당자별 주문 조회 최적화
CREATE INDEX IF NOT EXISTS idx_orders_manager_id
  ON public.orders(manager_id)
  WHERE manager_id IS NOT NULL;

-- 검증업체별 주문 조회 최적화
CREATE INDEX IF NOT EXISTS idx_orders_verification_company_id
  ON public.orders(verification_company_id)
  WHERE verification_company_id IS NOT NULL;

-- 생성자별 주문 조회 최적화
CREATE INDEX IF NOT EXISTS idx_orders_created_by
  ON public.orders(created_by)
  WHERE created_by IS NOT NULL;

-- 수정자별 주문 조회 최적화
CREATE INDEX IF NOT EXISTS idx_orders_updated_by
  ON public.orders(updated_by)
  WHERE updated_by IS NOT NULL;

-- ============================================================================
-- 2. performances 테이블 인덱스 추가 (2개)
-- ============================================================================

-- 생성자별 실적 조회 최적화
CREATE INDEX IF NOT EXISTS idx_performances_created_by
  ON public.performances(created_by)
  WHERE created_by IS NOT NULL;

-- 수정자별 실적 조회 최적화
CREATE INDEX IF NOT EXISTS idx_performances_updated_by
  ON public.performances(updated_by)
  WHERE updated_by IS NOT NULL;

-- ============================================================================
-- 3. users 테이블 인덱스 추가 (1개)
-- ============================================================================

-- 직급별 사용자 조회 최적화
CREATE INDEX IF NOT EXISTS idx_users_position_id
  ON public.users(position_id)
  WHERE position_id IS NOT NULL;

-- ============================================================================
-- 4. 복합 인덱스 추가 (쿼리 패턴 분석 후 추가)
-- ============================================================================

-- 담당자 + 계약상태별 주문 조회 최적화
CREATE INDEX IF NOT EXISTS idx_orders_manager_status
  ON public.orders(manager_id, contract_status)
  WHERE manager_id IS NOT NULL;

-- 실적일 + 담당자별 실적 조회 최적화
CREATE INDEX IF NOT EXISTS idx_performances_date_manager
  ON public.performances(performance_date, manager_id)
  WHERE manager_id IS NOT NULL;

-- ============================================================================
-- 5. 인덱스 통계 수집 (성능 최적화)
-- ============================================================================

-- PostgreSQL이 최적의 쿼리 플랜을 선택할 수 있도록 통계 업데이트
ANALYZE public.orders;
ANALYZE public.performances;
ANALYZE public.users;

-- ============================================================================
-- 6. 마이그레이션 완료 로그
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key indexes created successfully';
  RAISE NOTICE '📊 Total indexes: 9 indexes';
  RAISE NOTICE '   - orders: 6 indexes (4 single + 2 composite)';
  RAISE NOTICE '   - performances: 3 indexes (2 single + 1 composite)';
  RAISE NOTICE '   - users: 1 index';
  RAISE NOTICE '🚀 Performance improvement: JOIN queries optimized';
  RAISE NOTICE '💡 Partial indexes used for NULL handling';
END $$;
