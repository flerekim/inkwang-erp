-- =============================================================================
-- 수주관리 시스템 데이터베이스 마이그레이션
-- 작성일: 2025-01-11
-- 설명: orders, pollutants, methods, order_pollutants, order_methods 테이블 생성
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. pollutants 테이블 (오염물질 마스터)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pollutants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,

  region_1_standard DECIMAL(10, 2),
  region_2_standard DECIMAL(10, 2),
  region_3_standard DECIMAL(10, 2),

  unit VARCHAR(20) NOT NULL DEFAULT 'mg/kg',
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pollutants_category ON pollutants(category);
CREATE INDEX IF NOT EXISTS idx_pollutants_sort_order ON pollutants(sort_order);

-- RLS
ALTER TABLE pollutants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view pollutants" ON pollutants;
CREATE POLICY "Anyone can view pollutants" ON pollutants
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can modify pollutants" ON pollutants;
CREATE POLICY "Only admins can modify pollutants" ON pollutants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 초기 데이터 삽입
INSERT INTO pollutants (name, category, region_1_standard, region_2_standard, region_3_standard, sort_order) VALUES
-- 중금속류
('카드뮴', '중금속류', 4, 10, 60, 1),
('구리', '중금속류', 150, 500, 2000, 2),
('비소', '중금속류', 25, 50, 200, 3),
('수은', '중금속류', 4, 10, 20, 4),
('납', '중금속류', 200, 400, 700, 5),
('6가크롬', '중금속류', 5, 15, 40, 6),
('아연', '중금속류', 300, 600, 2000, 7),
('니켈', '중금속류', 100, 200, 500, 8),

-- 유류
('TPH', '유류', 500, 800, 2000, 9),
('벤젠', '유류', 1, 3, 15, 10),
('톨루엔', '유류', 20, 60, 200, 11),
('에틸벤젠', '유류', 50, 340, 600, 12),
('크실렌', '유류', 15, 45, 300, 13),

-- 염소계 유기화합물
('TCE', '염소계 유기화합물', 8, 40, 220, 14),
('PCE', '염소계 유기화합물', 4, 25, 180, 15),
('1,2-디클로로에탄', '염소계 유기화합물', NULL, NULL, NULL, 16),
('PCBs', '염소계 유기화합물', NULL, NULL, NULL, 17),
('다이옥신', '염소계 유기화합물', NULL, NULL, NULL, 18),

-- 그 외
('벤조(a)피렌', '그 외', 0.7, 2, 7, 19),
('불소', '그 외', 400, 400, 800, 20),
('유기인', '그 외', 10, 10, 30, 21),
('시안', '그 외', 2, 2, 120, 22),
('페놀류', '그 외', 4, 4, 20, 23)
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. methods 테이블 (정화방법 마스터)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_methods_sort_order ON methods(sort_order);

-- RLS
ALTER TABLE methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view methods" ON methods;
CREATE POLICY "Anyone can view methods" ON methods
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can modify methods" ON methods;
CREATE POLICY "Only admins can modify methods" ON methods
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 초기 데이터 삽입
INSERT INTO methods (name, description, sort_order) VALUES
('토양경작법', '토양을 경작하여 오염물질을 분해하는 방법', 1),
('토양세척법', '토양을 물로 세척하여 오염물질을 제거하는 방법', 2),
('토양세정법', '화학약품을 사용하여 토양을 세정하는 방법', 3),
('열탈착법', '고온으로 가열하여 오염물질을 분리하는 방법', 4),
('SVE', 'Soil Vapor Extraction - 토양 증기 추출법', 5),
('지중 화학적 산화/환원법', '지중에서 화학반응을 통해 오염물질을 처리하는 방법', 6)
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. customers 테이블에 customer_type 컬럼 추가
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'customer_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN customer_type VARCHAR(20) NOT NULL DEFAULT 'client';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);

-- customer_type 값: 'client'(발주처), 'verification'(검증업체), 'both'(둘 다)

-- -----------------------------------------------------------------------------
-- 4. orders 테이블 (수주 메인 테이블)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,

  -- 계약 기본 정보
  contract_type VARCHAR(20) NOT NULL DEFAULT 'new',
  contract_status VARCHAR(20) NOT NULL DEFAULT 'quotation',
  business_type VARCHAR(20) NOT NULL DEFAULT 'civilian',
  pricing_type VARCHAR(20) NOT NULL DEFAULT 'total',

  -- 계약 상세
  contract_name TEXT NOT NULL,
  contract_date DATE NOT NULL,
  contract_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- 관계형 데이터
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  verification_company_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_order_id UUID REFERENCES orders(id) ON DELETE CASCADE,

  -- 기타 정보
  export_type VARCHAR(20) NOT NULL DEFAULT 'on_site',
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,

  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_contract_date ON orders(contract_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_contract_status ON orders(contract_status);
CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id ON orders(parent_order_id);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
CREATE POLICY "Anyone can view orders" ON orders
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can modify orders" ON orders;
CREATE POLICY "Only admins can modify orders" ON orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 5. 계약번호 자동 생성 함수 및 트리거
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  date_prefix VARCHAR(8);
  sequence_num INTEGER;
  new_order_number VARCHAR(20);
BEGIN
  date_prefix := TO_CHAR(NEW.contract_date, 'YYYYMMDD');

  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM orders
  WHERE order_number LIKE date_prefix || '%';

  new_order_number := date_prefix || LPAD(sequence_num::TEXT, 2, '0');

  NEW.order_number := new_order_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_order_number ON orders;
CREATE TRIGGER trg_generate_order_number
BEFORE INSERT ON orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
EXECUTE FUNCTION generate_order_number();

-- updated_at 자동 갱신 트리거
DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 6. order_pollutants 테이블 (수주-오염물질 연결)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_pollutants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  pollutant_id UUID NOT NULL REFERENCES pollutants(id) ON DELETE RESTRICT,

  concentration DECIMAL(10, 2) NOT NULL,
  group_name VARCHAR(100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(order_id, pollutant_id)
);

CREATE INDEX IF NOT EXISTS idx_order_pollutants_order_id ON order_pollutants(order_id);
CREATE INDEX IF NOT EXISTS idx_order_pollutants_pollutant_id ON order_pollutants(pollutant_id);

-- RLS
ALTER TABLE order_pollutants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view order_pollutants" ON order_pollutants;
CREATE POLICY "Anyone can view order_pollutants" ON order_pollutants
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can modify order_pollutants" ON order_pollutants;
CREATE POLICY "Only admins can modify order_pollutants" ON order_pollutants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 7. order_methods 테이블 (수주-정화방법 연결)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method_id UUID NOT NULL REFERENCES methods(id) ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(order_id, method_id)
);

CREATE INDEX IF NOT EXISTS idx_order_methods_order_id ON order_methods(order_id);
CREATE INDEX IF NOT EXISTS idx_order_methods_method_id ON order_methods(method_id);

-- RLS
ALTER TABLE order_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view order_methods" ON order_methods;
CREATE POLICY "Anyone can view order_methods" ON order_methods
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can modify order_methods" ON order_methods;
CREATE POLICY "Only admins can modify order_methods" ON order_methods
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- =============================================================================
-- 마이그레이션 완료
-- =============================================================================
