-- ============================================
-- CHEF DE PROJET - COMPLETE SQL SCHEMA
-- Copy and paste this entire SQL into Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: CREATE CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 1B: CREATE UNITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.unities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  symbol VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 1C: CREATE SUPPLIERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  commercial_registration VARCHAR(255),
  nif VARCHAR(255),
  nis VARCHAR(255),
  article VARCHAR(255),
  company_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 1D: CREATE PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
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

-- ============================================
-- STEP 2: CREATE MATERIAL COMMANDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.material_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'purchase', 'finalized')),
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 3: CREATE COMMAND PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.command_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID NOT NULL REFERENCES public.material_commands(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unity_id UUID REFERENCES public.unities(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(15,2) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 5: CREATE PURCHASE COMMANDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.purchase_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id VARCHAR(50) NOT NULL UNIQUE,
  material_command_id UUID NOT NULL REFERENCES public.material_commands(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'finalized')),
  supplier_id VARCHAR(255),
  supplier_name VARCHAR(255),
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 6: CREATE BONS COMMANDES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.bons_commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_id VARCHAR(50) NOT NULL UNIQUE,
  purchase_command_id UUID NOT NULL REFERENCES public.purchase_commands(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'paid')),
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 7: CREATE BON OFFERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.bon_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_id UUID NOT NULL REFERENCES public.bons_commandes(id) ON DELETE CASCADE,
  supplier VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 8: CREATE RECEIVE COMMANDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.receive_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_id UUID NOT NULL REFERENCES public.bons_commandes(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'received')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 9: CREATE RECLAMATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reclamations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receive_command_id UUID NOT NULL REFERENCES public.receive_commands(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 10: CREATE RECLAMATION PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reclamation_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamation_id UUID NOT NULL REFERENCES public.reclamations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.command_products(id) ON DELETE CASCADE
);

-- ============================================
-- STEP 11: CREATE PROJECT BOXES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  chef_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  total_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 12: CREATE PROJECT VERSEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_versements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_box_id UUID NOT NULL REFERENCES public.project_boxes(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 13: CREATE PROJECT EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id VARCHAR(50) NOT NULL UNIQUE,
  project_box_id UUID REFERENCES public.project_boxes(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 14: CREATE PRINT CUSTOMIZATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.print_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_box_id UUID NOT NULL REFERENCES public.project_boxes(id) ON DELETE CASCADE,
  font_size INTEGER DEFAULT 14,
  is_bold BOOLEAN DEFAULT false,
  text_color VARCHAR(7) DEFAULT '#000000',
  company_name VARCHAR(255),
  logo_position_x INTEGER DEFAULT 0,
  logo_position_y INTEGER DEFAULT 0,
  title_font_size INTEGER DEFAULT 24,
  subtitle_font_size INTEGER DEFAULT 12,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 15: CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON public.products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_commands_status ON public.material_commands(status);
CREATE INDEX IF NOT EXISTS idx_material_commands_created_by ON public.material_commands(created_by_id);
CREATE INDEX IF NOT EXISTS idx_purchase_commands_material_id ON public.purchase_commands(material_command_id);
CREATE INDEX IF NOT EXISTS idx_purchase_commands_status ON public.purchase_commands(status);
CREATE INDEX IF NOT EXISTS idx_bons_commandes_purchase_id ON public.bons_commandes(purchase_command_id);
CREATE INDEX IF NOT EXISTS idx_command_products_command_id ON public.command_products(command_id);
CREATE INDEX IF NOT EXISTS idx_project_boxes_chef_id ON public.project_boxes(chef_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_project_id ON public.project_expenses(project_box_id);
CREATE INDEX IF NOT EXISTS idx_receive_commands_bon_id ON public.receive_commands(bon_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_receive_id ON public.reclamations(receive_command_id);

-- ============================================
-- STEP 16: ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.unities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.material_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.command_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bons_commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bon_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.receive_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reclamations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reclamation_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_versements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.print_customizations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 17: CREATE RLS POLICIES
-- ============================================

-- Categories Policies
DROP POLICY IF EXISTS "Allow authenticated users to read categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated users to manage categories" ON public.categories;
CREATE POLICY "Allow authenticated users to read categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products Policies
DROP POLICY IF EXISTS "Allow authenticated users to read products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to manage products" ON public.products;
CREATE POLICY "Allow authenticated users to read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Unities Policies
DROP POLICY IF EXISTS "Allow authenticated users to read unities" ON public.unities;
DROP POLICY IF EXISTS "Allow authenticated users to manage unities" ON public.unities;
CREATE POLICY "Allow authenticated users to read unities" ON public.unities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage unities" ON public.unities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Suppliers Policies
DROP POLICY IF EXISTS "Allow authenticated users to read suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow authenticated users to manage suppliers" ON public.suppliers;
CREATE POLICY "Allow authenticated users to read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Material Commands Policies
DROP POLICY IF EXISTS "Allow authenticated users to manage material commands" ON public.material_commands;
CREATE POLICY "Allow authenticated users to manage material commands" ON public.material_commands FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Command Products Policies
DROP POLICY IF EXISTS "Allow authenticated users to manage command products" ON public.command_products;
CREATE POLICY "Allow authenticated users to manage command products" ON public.command_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Purchase Commands Policies
DROP POLICY IF EXISTS "Allow authenticated users to manage purchase commands" ON public.purchase_commands;
CREATE POLICY "Allow authenticated users to manage purchase commands" ON public.purchase_commands FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bons Commandes Policies
DROP POLICY IF EXISTS "Allow authenticated users to manage bons commandes" ON public.bons_commandes;
CREATE POLICY "Allow authenticated users to manage bons commandes" ON public.bons_commandes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bon Offers Policies
DROP POLICY IF EXISTS "Allow authenticated users to manage bon offers" ON public.bon_offers;
CREATE POLICY "Allow authenticated users to manage bon offers" ON public.bon_offers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Receive Commands Policies
DROP POLICY IF EXISTS "Allow authenticated users to manage receive commands" ON public.receive_commands;
CREATE POLICY "Allow authenticated users to manage receive commands" ON public.receive_commands FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reclamations Policies
DROP POLICY IF EXISTS "Allow authenticated users to manage reclamations" ON public.reclamations;
CREATE POLICY "Allow authenticated users to manage reclamations" ON public.reclamations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reclamation Products Policies
DROP POLICY IF EXISTS "Allow authenticated users to manage reclamation products" ON public.reclamation_products;
CREATE POLICY "Allow authenticated users to manage reclamation products" ON public.reclamation_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Project Boxes Policies
DROP POLICY IF EXISTS "Allow authenticated users to manage project boxes" ON public.project_boxes;
CREATE POLICY "Allow authenticated users to manage project boxes" ON public.project_boxes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Project Versements Policies
DROP POLICY IF EXISTS "Allow authenticated users to manage project versements" ON public.project_versements;
CREATE POLICY "Allow authenticated users to manage project versements" ON public.project_versements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Project Expenses Policies
DROP POLICY IF EXISTS "Allow authenticated users to manage project expenses" ON public.project_expenses;
CREATE POLICY "Allow authenticated users to manage project expenses" ON public.project_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Print Customizations Policies
DROP POLICY IF EXISTS "Allow authenticated users to manage print customizations" ON public.print_customizations;
CREATE POLICY "Allow authenticated users to manage print customizations" ON public.print_customizations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- STEP 18: INSERT SAMPLE DATA (OPTIONAL)
-- ============================================

-- Sample Categories
INSERT INTO public.categories (name, description) VALUES
('Matériel Électronique', 'Composants et appareils électroniques'),
('Logiciels', 'Licences et outils logiciels'),
('Matériel Informatique', 'Matériel informatique'),
('Fournitures', 'Fournitures de bureau'),
('Équipement', 'Équipement lourd')
ON CONFLICT (name) DO NOTHING;

-- Sample Unities
INSERT INTO public.unities (name, symbol) VALUES
('Pièce', 'pcs'),
('Kilogramme', 'kg'),
('Litre', 'L'),
('Mètre', 'm'),
('Heure', 'h'),
('Lot', 'lot')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- END OF SQL SCHEMA
-- ============================================
-- TOTAL TABLES CREATED: 14
-- TOTAL INDEXES CREATED: 10
-- TOTAL RLS POLICIES CREATED: 24
-- ============================================
