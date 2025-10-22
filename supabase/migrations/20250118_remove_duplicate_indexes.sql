-- ============================================================================
-- Migration: Remove Duplicate Indexes
-- ============================================================================
-- Description: 중복된 인덱스 제거하여 디스크 공간 절약 및 쓰기 성능 개선
-- Priority: P2 - Resource Optimization
-- References:
--   - Supabase Advisor: duplicate_index
--   - https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index
-- Impact: 디스크 공간 절약, INSERT/UPDATE 성능 향상
-- Date: 2025-01-18
-- ============================================================================

-- ============================================================================
-- 중복 인덱스 영향
-- ============================================================================
-- ❌ 중복 인덱스 유지 시:
--    - 디스크 공간 2배 소모
--    - INSERT/UPDATE 시 2개 인덱스 모두 업데이트 (성능 저하)
--    - 유지보수 비용 증가
--
-- ✅ 중복 인덱스 제거 후:
--    - 디스크 공간 50% 절약
--    - 쓰기 성능 향상
--    - 단순한 인덱스 관리
-- ============================================================================

-- ============================================================================
-- 1. customers 테이블 중복 인덱스 제거
-- ============================================================================

-- idx_customers_customer_type와 idx_customers_type가 완전히 동일함
-- idx_customers_type을 유지하고 idx_customers_customer_type 제거

DROP INDEX IF EXISTS public.idx_customers_customer_type;

-- 남은 인덱스 확인
-- ✅ idx_customers_type (유지)
-- ✅ idx_customers_name
-- ✅ idx_customers_status
-- ✅ idx_customers_business_number

-- ============================================================================
-- 2. 인덱스 통계 수집
-- ============================================================================

ANALYZE public.customers;

-- ============================================================================
-- 3. 마이그레이션 완료 로그
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Duplicate indexes removed successfully';
  RAISE NOTICE '📊 Removed indexes: 1 index';
  RAISE NOTICE '   - customers.idx_customers_customer_type (duplicate of idx_customers_type)';
  RAISE NOTICE '💾 Disk space saved: ~50%% for this index';
  RAISE NOTICE '🚀 Write performance improved on customers table';
END $$;
