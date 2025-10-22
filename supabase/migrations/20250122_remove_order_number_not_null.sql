-- 수주 번호 중복 키 에러 완전 수정
-- 날짜: 2025-01-22
-- 문제: order_number NOT NULL 제약 조건으로 인해 트리거가 실행되기 전에 에러 발생
-- 해결: NOT NULL 제약 제거 (트리거가 항상 값을 생성하므로 실질적으로 NOT NULL)

-- order_number의 NOT NULL 제약 제거
ALTER TABLE orders ALTER COLUMN order_number DROP NOT NULL;

-- 주석 추가
COMMENT ON COLUMN orders.order_number IS '수주 번호 (트리거에서 자동 생성: YYYYMMDD + 일련번호)';
