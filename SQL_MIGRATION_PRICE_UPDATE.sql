-- ============================================
-- SQL MIGRATION: UPDATE PRODUCTS TABLE
-- Change from single 'price' to 'unit_price' and 'total_price'
-- ============================================

-- ============================================
-- STEP 1: ADD NEW COLUMNS IF THEY DON'T EXIST
-- ============================================
ALTER TABLE IF EXISTS public.products
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_price DECIMAL(15,2) NOT NULL DEFAULT 0;

-- ============================================
-- STEP 2: MIGRATE DATA FROM PRICE TO UNIT_PRICE
-- If you have existing products with the 'price' field, 
-- copy that value to unit_price and calculate total_price
-- ============================================
UPDATE public.products 
SET unit_price = COALESCE(price, 0),
    total_price = COALESCE(price, 0) * quantity
WHERE unit_price = 0 AND price IS NOT NULL;

-- ============================================
-- STEP 3: DROP THE OLD PRICE COLUMN
-- (Only run this AFTER verifying the data migration worked)
-- ============================================
-- ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS price;

-- ============================================
-- STEP 4: CREATE INDEX ON NEW COLUMNS FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_unit_price ON public.products(unit_price);
CREATE INDEX IF NOT EXISTS idx_products_total_price ON public.products(total_price);

-- ============================================
-- VERIFICATION QUERIES
-- Run these to verify the migration
-- ============================================

-- Check the table structure
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'products' AND table_schema = 'public';

-- Check sample data
-- SELECT id, name, quantity, unit_price, total_price FROM public.products LIMIT 10;

-- ============================================
-- ALTERNATIVE: Complete table recreation
-- Only use this if you want to completely rebuild the products table
-- ============================================
/*
-- Create new products table with correct schema
CREATE TABLE IF NOT EXISTS public.products_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unity_id UUID REFERENCES public.unities(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table (if it exists)
INSERT INTO public.products_new (id, name, category_id, unity_id, quantity, unit_price, total_price, supplier_id, note, created_at, updated_at)
SELECT id, name, category_id, unity_id, quantity, 
       COALESCE(price, 0) as unit_price,
       COALESCE(price, 0) * quantity as total_price,
       supplier_id, note, created_at, updated_at
FROM public.products;

-- Drop old table
DROP TABLE IF EXISTS public.products CASCADE;

-- Rename new table
ALTER TABLE public.products_new RENAME TO products;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON public.products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_unit_price ON public.products(unit_price);
CREATE INDEX IF NOT EXISTS idx_products_total_price ON public.products(total_price);

-- Re-enable RLS
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;

-- Recreate policies
DROP POLICY IF EXISTS "Allow authenticated users to read products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to manage products" ON public.products;
CREATE POLICY "Allow authenticated users to read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
*/

-- ============================================
-- END OF MIGRATION
-- ============================================
-- RECOMMENDED STEPS:
-- 1. Run STEP 1 to add new columns
-- 2. Run STEP 2 to migrate existing data
-- 3. Run STEP 4 to create indexes
-- 4. Verify with the verification queries
-- 5. Only run STEP 3 after verifying everything works
-- ============================================
