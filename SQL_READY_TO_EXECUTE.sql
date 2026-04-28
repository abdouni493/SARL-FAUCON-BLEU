-- ═══════════════════════════════════════════════════════════════════════════════
-- RÉCEPTION PRODUITS - COMPLETE SQL SETUP
-- Ready to execute in Supabase SQL Editor
-- Copy entire content and paste into Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- STEP 1: Create reception_products table
-- Main table for storing reception records
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

-- STEP 2: Create reception_product_items table
-- Table for storing individual products in a reception
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

-- STEP 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reception_products_supplier_id ON reception_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_reception_products_status ON reception_products(status);
CREATE INDEX IF NOT EXISTS idx_reception_products_created_at ON reception_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reception_product_items_reception_id ON reception_product_items(reception_id);

-- STEP 4: Create trigger function for automatic calculations
-- This function automatically updates reception totals when items change
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

-- STEP 5: Create triggers that fire the function
-- Insert trigger - when adding products
DROP TRIGGER IF EXISTS trigger_update_reception_totals_insert ON reception_product_items;
CREATE TRIGGER trigger_update_reception_totals_insert
AFTER INSERT ON reception_product_items
FOR EACH ROW
EXECUTE FUNCTION update_reception_totals();

-- Update trigger - when modifying products
DROP TRIGGER IF EXISTS trigger_update_reception_totals_update ON reception_product_items;
CREATE TRIGGER trigger_update_reception_totals_update
AFTER UPDATE ON reception_product_items
FOR EACH ROW
EXECUTE FUNCTION update_reception_totals();

-- Delete trigger - when removing products
DROP TRIGGER IF EXISTS trigger_update_reception_totals_delete ON reception_product_items;
CREATE TRIGGER trigger_update_reception_totals_delete
AFTER DELETE ON reception_product_items
FOR EACH ROW
EXECUTE FUNCTION update_reception_totals();

-- STEP 6: Enable Row Level Security (RLS)
ALTER TABLE reception_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_product_items ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create RLS Policies for reception_products
-- Allow authenticated users to view all receptions
DROP POLICY IF EXISTS "storage_can_view_reception_products" ON reception_products;
CREATE POLICY "storage_can_view_reception_products" ON reception_products
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Allow authenticated users to create receptions
DROP POLICY IF EXISTS "storage_can_create_reception_products" ON reception_products;
CREATE POLICY "storage_can_create_reception_products" ON reception_products
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Allow authenticated users to update receptions
DROP POLICY IF EXISTS "storage_can_update_reception_products" ON reception_products;
CREATE POLICY "storage_can_update_reception_products" ON reception_products
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Allow authenticated users to delete receptions
DROP POLICY IF EXISTS "storage_can_delete_reception_products" ON reception_products;
CREATE POLICY "storage_can_delete_reception_products" ON reception_products
  FOR DELETE
  TO authenticated
  USING (TRUE);

-- STEP 8: Create RLS Policies for reception_product_items
-- Allow authenticated users to view all items
DROP POLICY IF EXISTS "storage_can_view_items" ON reception_product_items;
CREATE POLICY "storage_can_view_items" ON reception_product_items
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Allow authenticated users to create items
DROP POLICY IF EXISTS "storage_can_create_items" ON reception_product_items;
CREATE POLICY "storage_can_create_items" ON reception_product_items
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Allow authenticated users to update items
DROP POLICY IF EXISTS "storage_can_update_items" ON reception_product_items;
CREATE POLICY "storage_can_update_items" ON reception_product_items
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Allow authenticated users to delete items
DROP POLICY IF EXISTS "storage_can_delete_items" ON reception_product_items;
CREATE POLICY "storage_can_delete_items" ON reception_product_items
  FOR DELETE
  TO authenticated
  USING (TRUE);

-- STEP 9: Create helper function for generating reception IDs
-- Generates IDs in format: REC-YYYYMMDD-XXXX
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

-- STEP 10: Create views for easier querying
-- View 1: Reception products with item counts
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

-- View 2: Reception items with category and unit names
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES - Run these to verify setup was successful
-- ═══════════════════════════════════════════════════════════════════════════════

-- VERIFY TABLES EXIST
SELECT 'TABLES CREATED' as check_name, COUNT(*) as count
FROM pg_tables 
WHERE tablename IN ('reception_products', 'reception_product_items')
UNION ALL
SELECT 'Expected: 2', 2;

-- VERIFY INDEXES EXIST
SELECT 'INDEXES CREATED' as check_name, COUNT(*) as count
FROM pg_indexes 
WHERE tablename IN ('reception_products', 'reception_product_items')
UNION ALL
SELECT 'Expected: 4', 4;

-- VERIFY TRIGGERS EXIST
SELECT 'TRIGGERS CREATED' as check_name, COUNT(*) as count
FROM information_schema.triggers 
WHERE trigger_schema = 'public' AND event_object_table = 'reception_product_items'
UNION ALL
SELECT 'Expected: 3', 3;

-- VERIFY RLS IS ENABLED
SELECT 'RLS ENABLED' as check_name, COUNT(*) as count
FROM pg_tables 
WHERE tablename IN ('reception_products', 'reception_product_items') AND rowsecurity = TRUE
UNION ALL
SELECT 'Expected: 2', 2;

-- VERIFY VIEWS EXIST
SELECT 'VIEWS CREATED' as check_name, COUNT(*) as count
FROM pg_views 
WHERE schemaname = 'public' AND viewname LIKE 'v_reception%'
UNION ALL
SELECT 'Expected: 2', 2;

-- DETAILED TABLE STRUCTURE
SELECT 'reception_products structure:' as info;
SELECT column_name, data_type, is_nullable FROM information_schema.columns 
WHERE table_name = 'reception_products' ORDER BY ordinal_position;

SELECT 'reception_product_items structure:' as info;
SELECT column_name, data_type, is_nullable FROM information_schema.columns 
WHERE table_name = 'reception_product_items' ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUCCESS CONFIRMATION
-- ═══════════════════════════════════════════════════════════════════════════════
-- If all verification queries above show correct counts (as indicated),
-- then the database schema has been successfully created and configured.
-- 
-- You can now:
-- 1. Navigate to /receive-products in the application
-- 2. Create a new reception
-- 3. Add products
-- 4. View reception details
-- 5. Edit or delete receptions
--
-- All data will be automatically saved to these new tables and calculated
-- via the SQL triggers.
-- ═══════════════════════════════════════════════════════════════════════════════
