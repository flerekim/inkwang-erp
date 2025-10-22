-- ============================================
-- 수주 테이블에 계약 단위 컬럼 추가
-- ============================================
-- 작성일: 2025-01-18
-- 목적: 단가계약 시 단위(Ton, 대, ㎥) 정보 저장
-- ============================================

-- contract_unit 컬럼 추가 (단가계약 시만 사용, 총액계약은 NULL)
ALTER TABLE orders
ADD COLUMN contract_unit TEXT NULL
CHECK (contract_unit IN ('ton', 'unit', 'm3') OR contract_unit IS NULL);

-- 컬럼 주석 추가
COMMENT ON COLUMN orders.contract_unit IS '단가계약 시 단위 (ton: Ton, unit: 대, m3: ㎥). 총액계약인 경우 NULL.';

-- 기존 데이터는 모두 총액계약이므로 NULL 유지 (별도 업데이트 불필요)
