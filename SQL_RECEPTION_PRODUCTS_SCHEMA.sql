-- =====================================================
-- RECEPTION PRODUCTS MANAGEMENT SCHEMA
-- =====================================================

-- Main reception records table
CREATE TABLE reception_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  reception_date TIMESTAMP NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'received', 'completed')),
  notes TEXT,
  total_price DECIMAL(15, 2) DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_reception_id CHECK(reception_id ~ '^REC-[0-9]{8}-[0-9]{4}$')
);

-- Reception products details
CREATE TABLE reception_product_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id UUID NOT NULL REFERENCES reception_products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  unity_id UUID REFERENCES unities(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  price_per_unity DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * price_per_unity) STORED,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_reception_products_supplier_id ON reception_products(supplier_id);
CREATE INDEX idx_reception_products_status ON reception_products(status);
CREATE INDEX idx_reception_products_created_at ON reception_products(created_at DESC);
CREATE INDEX idx_reception_product_items_reception_id ON reception_product_items(reception_id);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC CALCULATIONS
-- =====================================================

-- Update reception totals when items change
CREATE OR REPLACE FUNCTION update_reception_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reception_products
  SET 
    total_quantity = (SELECT COALESCE(SUM(quantity), 0) FROM reception_product_items WHERE reception_id = NEW.reception_id),
    total_price = (SELECT COALESCE(SUM(total_price), 0) FROM reception_product_items WHERE reception_id = NEW.reception_id),
    updated_at = NOW()
  WHERE id = NEW.reception_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger when inserting/updating items
CREATE TRIGGER trigger_update_reception_totals_insert
AFTER INSERT ON reception_product_items
FOR EACH ROW
EXECUTE FUNCTION update_reception_totals();

CREATE TRIGGER trigger_update_reception_totals_update
AFTER UPDATE ON reception_product_items
FOR EACH ROW
EXECUTE FUNCTION update_reception_totals();

CREATE TRIGGER trigger_update_reception_totals_delete
AFTER DELETE ON reception_product_items
FOR EACH ROW
EXECUTE FUNCTION update_reception_totals();

-- =====================================================
-- RLS POLICIES FOR SECURITY
-- =====================================================

ALTER TABLE reception_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_product_items ENABLE ROW LEVEL SECURITY;

-- Allow storage users to view and create reception products
CREATE POLICY "storage_can_view_reception_products" ON reception_products
  FOR SELECT
  TO authenticated
  USING (TRUE); -- Can view all

CREATE POLICY "storage_can_create_reception_products" ON reception_products
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "storage_can_update_reception_products" ON reception_products
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "storage_can_delete_reception_products" ON reception_products
  FOR DELETE
  TO authenticated
  USING (TRUE);

-- Similar policies for items
CREATE POLICY "storage_can_view_items" ON reception_product_items
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "storage_can_create_items" ON reception_product_items
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "storage_can_update_items" ON reception_product_items
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "storage_can_delete_items" ON reception_product_items
  FOR DELETE
  TO authenticated
  USING (TRUE);

-- =====================================================
-- HELPER FUNCTION TO GENERATE RECEPTION ID
-- =====================================================

CREATE OR REPLACE FUNCTION generate_reception_id()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  seq_part TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  seq_part := LPAD((EXTRACT(EPOCH FROM NOW() % '1 hour'::interval) / 60)::INTEGER, 4, '0');
  RETURN 'REC-' || date_part || '-' || seq_part;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA (optional - remove in production)
-- =====================================================
-- To be populated by the application

-- =====================================================
-- VIEWS FOR EASIER DATA RETRIEVAL
-- =====================================================

-- Combined view with all reception details
CREATE OR REPLACE VIEW v_reception_products_with_items AS
SELECT
  rp.id as reception_id,
  rp.reception_id as reception_code,
  rp.supplier_id,
  rp.supplier_name,
  rp.reception_date,
  rp.status,
  rp.total_quantity,
  rp.total_price,
  rp.notes,
  rp.created_at,
  COUNT(rpi.id) as item_count
FROM reception_products rp
LEFT JOIN reception_product_items rpi ON rp.id = rpi.reception_id
GROUP BY rp.id, rp.reception_id, rp.supplier_id, rp.supplier_name, rp.reception_date, rp.status, rp.total_quantity, rp.total_price, rp.notes, rp.created_at;

-- Items with category and unity names
CREATE OR REPLACE VIEW v_reception_items_detailed AS
SELECT
  rpi.id,
  rpi.reception_id,
  rp.reception_id as reception_code,
  rpi.product_name,
  c.name as category_name,
  u.name as unity_name,
  rpi.quantity,
  rpi.price_per_unity,
  rpi.total_price,
  rpi.notes,
  rpi.created_at
FROM reception_product_items rpi
JOIN reception_products rp ON rpi.reception_id = rp.id
LEFT JOIN categories c ON rpi.category_id = c.id
LEFT JOIN unities u ON rpi.unity_id = u.id;
