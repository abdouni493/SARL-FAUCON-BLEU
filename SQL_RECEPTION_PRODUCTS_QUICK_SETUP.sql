-- =====================================================
-- QUICK START: COPY AND PASTE TO SUPABASE SQL EDITOR
-- =====================================================

-- Step 1: Create reception_products table
CREATE TABLE IF NOT EXISTS reception_products (
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
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Create reception_product_items table
CREATE TABLE IF NOT EXISTS reception_product_items (
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

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_reception_products_supplier_id ON reception_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_reception_products_status ON reception_products(status);
CREATE INDEX IF NOT EXISTS idx_reception_products_created_at ON reception_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reception_product_items_reception_id ON reception_product_items(reception_id);

-- Step 4: Create trigger function for automatic totals
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

-- Step 5: Create triggers
DROP TRIGGER IF EXISTS trigger_update_reception_totals_insert ON reception_product_items;
CREATE TRIGGER trigger_update_reception_totals_insert
AFTER INSERT ON reception_product_items
FOR EACH ROW
EXECUTE FUNCTION update_reception_totals();

DROP TRIGGER IF EXISTS trigger_update_reception_totals_update ON reception_product_items;
CREATE TRIGGER trigger_update_reception_totals_update
AFTER UPDATE ON reception_product_items
FOR EACH ROW
EXECUTE FUNCTION update_reception_totals();

DROP TRIGGER IF EXISTS trigger_update_reception_totals_delete ON reception_product_items;
CREATE TRIGGER trigger_update_reception_totals_delete
AFTER DELETE ON reception_product_items
FOR EACH ROW
EXECUTE FUNCTION update_reception_totals();

-- Step 6: Enable RLS
ALTER TABLE reception_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_product_items ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies for reception_products
DROP POLICY IF EXISTS "storage_can_view_reception_products" ON reception_products;
CREATE POLICY "storage_can_view_reception_products" ON reception_products
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "storage_can_create_reception_products" ON reception_products;
CREATE POLICY "storage_can_create_reception_products" ON reception_products
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "storage_can_update_reception_products" ON reception_products;
CREATE POLICY "storage_can_update_reception_products" ON reception_products
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "storage_can_delete_reception_products" ON reception_products;
CREATE POLICY "storage_can_delete_reception_products" ON reception_products
  FOR DELETE
  TO authenticated
  USING (TRUE);

-- Step 8: Create RLS Policies for reception_product_items
DROP POLICY IF EXISTS "storage_can_view_items" ON reception_product_items;
CREATE POLICY "storage_can_view_items" ON reception_product_items
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "storage_can_create_items" ON reception_product_items;
CREATE POLICY "storage_can_create_items" ON reception_product_items
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "storage_can_update_items" ON reception_product_items;
CREATE POLICY "storage_can_update_items" ON reception_product_items
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "storage_can_delete_items" ON reception_product_items;
CREATE POLICY "storage_can_delete_items" ON reception_product_items
  FOR DELETE
  TO authenticated
  USING (TRUE);

-- Step 9: Create helper function for generating reception IDs
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

-- Step 10: Create views for easier querying
DROP VIEW IF EXISTS v_reception_products_with_items;
CREATE VIEW v_reception_products_with_items AS
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

DROP VIEW IF EXISTS v_reception_items_detailed;
CREATE VIEW v_reception_items_detailed AS
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

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify tables exist
SELECT tablename FROM pg_tables 
WHERE tablename IN ('reception_products', 'reception_product_items') 
ORDER BY tablename;

-- Verify indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('reception_products', 'reception_product_items')
ORDER BY indexname;

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('reception_products', 'reception_product_items')
ORDER BY tablename;

-- Verify triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' AND event_object_table IN ('reception_product_items')
ORDER BY event_object_table, trigger_name;

-- Verify views exist
SELECT viewname FROM pg_views 
WHERE schemaname = 'public' AND viewname LIKE 'v_reception%'
ORDER BY viewname;

-- =====================================================
-- TEST QUERIES (Run after creating schema)
-- =====================================================

-- Check if reception_products table has rows
SELECT COUNT(*) as total_receptions FROM reception_products;

-- List all reception products with item counts
SELECT * FROM v_reception_products_with_items;

-- Get reception items with full details
SELECT * FROM v_reception_items_detailed;

-- =====================================================
-- SAMPLE INSERT (For Testing)
-- =====================================================

-- This is for testing only - remove after verification
INSERT INTO reception_products (
  reception_id, supplier_name, reception_date, status, notes, created_by_id
) VALUES (
  'REC-20260402-0001', 
  'Test Supplier', 
  NOW(), 
  'pending', 
  'Test reception', 
  gen_random_uuid()
) RETURNING id as reception_id;

-- Then copy the reception_id and use it below:
INSERT INTO reception_product_items (
  reception_id, product_name, quantity, price_per_unity
) VALUES (
  'PASTE_RECEPTION_ID_HERE', 
  'Test Product', 
  10, 
  50.00
);

-- Verify totals were calculated
SELECT * FROM reception_products WHERE reception_id = 'REC-20260402-0001';

-- Clean up test data
DELETE FROM reception_products WHERE reception_id = 'REC-20260402-0001';

-- =====================================================
-- END OF SETUP SCRIPT
-- =====================================================
