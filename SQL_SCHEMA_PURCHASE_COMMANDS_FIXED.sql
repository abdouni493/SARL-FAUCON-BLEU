-- ============================================
-- UPDATED SQL SCHEMA - PURCHASE COMMANDS FIX
-- Run this if starting fresh or need complete schema
-- ============================================

-- ============================================
-- PURCHASE COMMANDS TABLE (UPDATED)
-- material_command_id changed from UUID to VARCHAR
-- ============================================
CREATE TABLE IF NOT EXISTS public.purchase_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id VARCHAR(50) NOT NULL UNIQUE,
  material_command_id VARCHAR(255),  -- Changed from UUID to VARCHAR
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'finalized')),
  supplier_id VARCHAR(255),
  supplier_name VARCHAR(255),
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COMMAND PRODUCTS TABLE (For purchase commands)
-- ============================================
CREATE TABLE IF NOT EXISTS public.command_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID NOT NULL REFERENCES public.purchase_commands(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unity_id UUID REFERENCES public.unities(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(15,2) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_purchase_commands_status ON public.purchase_commands(status);
CREATE INDEX IF NOT EXISTS idx_purchase_commands_material_id ON public.purchase_commands(material_command_id);
CREATE INDEX IF NOT EXISTS idx_purchase_commands_created_by ON public.purchase_commands(created_by_id);
CREATE INDEX IF NOT EXISTS idx_command_products_command_id ON public.command_products(command_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE IF EXISTS public.purchase_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.command_products ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Purchase Commands Policies
DROP POLICY IF EXISTS "Allow authenticated users to read purchase commands" ON public.purchase_commands;
DROP POLICY IF EXISTS "Allow authenticated users to manage purchase commands" ON public.purchase_commands;
CREATE POLICY "Allow authenticated users to read purchase commands" ON public.purchase_commands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage purchase commands" ON public.purchase_commands FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Command Products Policies
DROP POLICY IF EXISTS "Allow authenticated users to read command products" ON public.command_products;
DROP POLICY IF EXISTS "Allow authenticated users to manage command products" ON public.command_products;
CREATE POLICY "Allow authenticated users to read command products" ON public.command_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage command products" ON public.command_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'purchase_commands' 
-- ORDER BY ordinal_position;

-- Check data
-- SELECT command_id, material_command_id, status, created_at 
-- FROM purchase_commands 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- ============================================
-- END OF UPDATED SCHEMA
-- ============================================
