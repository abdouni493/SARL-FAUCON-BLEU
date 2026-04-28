-- ============================================================================
-- CREATE TABLE FOR PURCHASE COMMAND PRODUCTS
-- ============================================================================
-- This table stores ONLY the missing products for each purchase command
-- (products that were NOT found in inventory)

CREATE TABLE IF NOT EXISTS public.purchase_command_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_command_id UUID NOT NULL REFERENCES public.purchase_commands(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(15,2) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CREATE INDEX FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_purchase_command_products_purchase_id 
ON public.purchase_command_products(purchase_command_id);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE IF EXISTS public.purchase_command_products ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to read purchase command products" ON public.purchase_command_products;
DROP POLICY IF EXISTS "Allow authenticated users to manage purchase command products" ON public.purchase_command_products;

CREATE POLICY "Allow authenticated users to read purchase command products" ON public.purchase_command_products 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage purchase command products" ON public.purchase_command_products 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Check if table was created successfully:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'purchase_command_products' 
-- ORDER BY ordinal_position;
