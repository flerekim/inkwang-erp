-- ============================================
-- 실적관리 시스템 구축
-- ============================================

-- 실적관리 테이블 생성
CREATE TABLE IF NOT EXISTS performances (
  -- 기본 정보
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 실적 구분 (예정/확정)
  performance_type TEXT NOT NULL CHECK (performance_type IN ('planned', 'confirmed')),

  -- 수주관리 연동 (신규계약만)
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,

  -- 실적 상세
  performance_date DATE NOT NULL,           -- 실적일
  unit TEXT NOT NULL CHECK (unit IN ('ton', 'unit', 'm3')),  -- 단위
  quantity DECIMAL(15, 2) NOT NULL CHECK (quantity >= 0),     -- 수량 (소수점 둘째자리)
  unit_price DECIMAL(15, 0) NOT NULL CHECK (unit_price >= 0), -- 단가 (정수)
  performance_amount DECIMAL(15, 0) NOT NULL CHECK (performance_amount >= 0), -- 실적금액 (정수)

  -- 담당자 (인광이에스 소속 직원만)
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- 비고
  notes TEXT,

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  -- 제약조건: 실적금액은 수량 × 단가 또는 사용자 직접 입력
  CONSTRAINT performance_amount_check
    CHECK (performance_amount >= 0)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_performances_order_id ON performances(order_id);
CREATE INDEX IF NOT EXISTS idx_performances_manager_id ON performances(manager_id);
CREATE INDEX IF NOT EXISTS idx_performances_performance_date ON performances(performance_date DESC);
CREATE INDEX IF NOT EXISTS idx_performances_performance_type ON performances(performance_type);
CREATE INDEX IF NOT EXISTS idx_performances_created_at ON performances(created_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_performances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_performances_updated_at
  BEFORE UPDATE ON performances
  FOR EACH ROW
  EXECUTE FUNCTION update_performances_updated_at();

-- RLS (Row Level Security) 정책
ALTER TABLE performances ENABLE ROW LEVEL SECURITY;

-- 정책 1: 활성 사용자는 실적 조회 가능
CREATE POLICY "Users can view performances"
  ON performances FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE employment_status = 'active'
    )
  );

-- 정책 2: Admin만 실적 관리 가능
CREATE POLICY "Admins can manage performances"
  ON performances FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role = 'admin' AND employment_status = 'active'
    )
  );

-- 테이블 코멘트
COMMENT ON TABLE performances IS '실적관리 테이블 - 수주관리와 연동된 실적 등록 시스템';
COMMENT ON COLUMN performances.performance_type IS '실적구분 (planned: 예정, confirmed: 확정)';
COMMENT ON COLUMN performances.order_id IS '연동된 수주 ID (신규계약만)';
COMMENT ON COLUMN performances.performance_date IS '실적일';
COMMENT ON COLUMN performances.unit IS '단위 (ton: Ton, unit: 대, m3: m³)';
COMMENT ON COLUMN performances.quantity IS '수량 (소수점 둘째자리까지)';
COMMENT ON COLUMN performances.unit_price IS '단가 (정수, 원 단위)';
COMMENT ON COLUMN performances.performance_amount IS '실적금액 (정수, 기본값: 수량 × 단가, 사용자 직접 수정 가능)';
COMMENT ON COLUMN performances.manager_id IS '담당자 (인광이에스 소속 직원만 선택 가능)';
COMMENT ON COLUMN performances.notes IS '비고';
