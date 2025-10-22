-- =============================================================================
-- 수주 번호 생성 경쟁 조건(Race Condition) 수정
-- 작성일: 2025-01-22
-- 설명: Advisory Lock을 사용하여 동시 생성 시 중복 번호 방지
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 문제: 동시에 여러 수주가 생성될 때 같은 order_number가 생성되어 중복 키 에러 발생
-- 해결: pg_advisory_xact_lock()을 사용하여 날짜별 번호 생성을 직렬화
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  date_prefix VARCHAR(8);
  sequence_num INTEGER;
  new_order_number VARCHAR(20);
  lock_key BIGINT;
BEGIN
  -- 계약일 기반 날짜 prefix 생성 (YYYYMMDD)
  date_prefix := TO_CHAR(NEW.contract_date, 'YYYYMMDD');

  -- 날짜를 정수로 변환하여 Advisory Lock Key 생성
  -- 예: '20250122' → 20250122 (BIGINT)
  lock_key := CAST(date_prefix AS BIGINT);

  -- Advisory Lock 획득 (트랜잭션 종료 시 자동 해제)
  -- 같은 날짜에 대한 번호 생성을 직렬화하여 경쟁 조건 방지
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Lock 획득 후 안전하게 MAX sequence 조회
  -- order_number 형식: YYYYMMDD + 01, 02, 03, ...
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM orders
  WHERE order_number LIKE date_prefix || '%';

  -- 새 order_number 생성 (날짜 + 2자리 일련번호)
  new_order_number := date_prefix || LPAD(sequence_num::TEXT, 2, '0');

  NEW.order_number := new_order_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 함수 주석 추가
COMMENT ON FUNCTION generate_order_number() IS
'수주 번호 자동 생성 함수 (Advisory Lock 사용)
- 형식: YYYYMMDD + 일련번호 (예: 2025012201)
- pg_advisory_xact_lock()으로 동시 생성 시 중복 방지
- 트랜잭션 종료 시 자동으로 Lock 해제';

-- =============================================================================
-- 마이그레이션 완료
-- =============================================================================
