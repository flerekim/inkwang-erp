-- ============================================
-- 수금관리 테이블 생성
-- ============================================

-- collections 테이블 생성
CREATE TABLE collections (
  -- 기본 정보
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 외래 키
  billing_id UUID NOT NULL REFERENCES billings(id) ON DELETE CASCADE,

  -- 수금 상세
  collection_date DATE NOT NULL,
  collection_amount NUMERIC(15, 2) NOT NULL CHECK (collection_amount > 0),
  collection_method TEXT NOT NULL CHECK (collection_method IN ('bank_transfer', 'other')),

  -- 은행 정보
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  bank_name TEXT,
  account_number TEXT,
  depositor TEXT,

  -- 비고
  notes TEXT,

  -- 메타 데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX idx_collections_billing_id ON collections(billing_id);
CREATE INDEX idx_collections_bank_account_id ON collections(bank_account_id);
CREATE INDEX idx_collections_collection_date ON collections(collection_date);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_select_policy"
ON collections FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "collections_insert_policy"
ON collections FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);

CREATE POLICY "collections_update_policy"
ON collections FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
  )
);

CREATE POLICY "collections_delete_policy"
ON collections FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 코멘트
COMMENT ON TABLE collections IS '수금 관리 테이블';
COMMENT ON COLUMN collections.collection_method IS '수금방법 (bank_transfer: 계좌이체, other: 기타)';
COMMENT ON COLUMN collections.bank_account_id IS '은행계좌 ID (계좌이체 시 필수)';
COMMENT ON COLUMN collections.depositor IS '입금자 (기본값: 청구의 고객명)';
