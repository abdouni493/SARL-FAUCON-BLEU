-- ============================================
-- GESTION PROJETS - ADAPTED TO EXISTING SCHEMA
-- ============================================
-- This file adapts the projects system to work with existing project_boxes table

-- ============================================
-- UPDATE PROJECT_BOXES TABLE (add missing fields)
-- ============================================
ALTER TABLE public.project_boxes 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE public.project_boxes 
ADD COLUMN IF NOT EXISTS total_budget DECIMAL(15,2) DEFAULT 0;

ALTER TABLE public.project_boxes 
ADD COLUMN IF NOT EXISTS chef_de_projet_email VARCHAR(255);

ALTER TABLE public.project_boxes 
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================
-- GENERAL CASH BOX (CAISSE GÉNÉRALE) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.general_cash_box (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type VARCHAR(50), -- versement, retrait, dépense
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  category VARCHAR(100), -- frais généraux, salaires, matériel, autre
  reference_project_box_id UUID REFERENCES public.project_boxes(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- PROJECT FINANCE (CAISSE DE FINANCEMENT PROJETS) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_finance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finance_id VARCHAR(50) UNIQUE NOT NULL,
  project_box_id UUID NOT NULL REFERENCES public.project_boxes(id) ON DELETE CASCADE,
  total_allocated DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_spent DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_received DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- PROJECT FINANCE DETAIL TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_finance_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_finance_id UUID NOT NULL REFERENCES public.project_finance(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  finance_date DATE NOT NULL,
  finance_type VARCHAR(50), -- entrée, sortie
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_boxes_chef_id ON public.project_boxes(chef_id);
CREATE INDEX IF NOT EXISTS idx_project_boxes_status ON public.project_boxes(status);
CREATE INDEX IF NOT EXISTS idx_project_boxes_created_at ON public.project_boxes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_general_cash_box_type ON public.general_cash_box(transaction_type);
CREATE INDEX IF NOT EXISTS idx_general_cash_box_date ON public.general_cash_box(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_general_cash_box_project ON public.general_cash_box(reference_project_box_id);

CREATE INDEX IF NOT EXISTS idx_project_finance_project_box ON public.project_finance(project_box_id);

CREATE INDEX IF NOT EXISTS idx_project_finance_detail_project_finance ON public.project_finance_detail(project_finance_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Existing project_boxes RLS
ALTER TABLE public.project_boxes ENABLE ROW LEVEL SECURITY;

-- General Cash Box RLS
ALTER TABLE public.general_cash_box ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read general cash box" ON public.general_cash_box
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and Comptable can create cash transactions" ON public.general_cash_box
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'comptable')
  );

-- Project Finance RLS
ALTER TABLE public.project_finance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read project finance" ON public.project_finance
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create project finance" ON public.project_finance
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'resp_projets', 'comptable')
  );

-- Project Finance Detail RLS
ALTER TABLE public.project_finance_detail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read project finance detail" ON public.project_finance_detail
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create project finance detail" ON public.project_finance_detail
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'resp_projets', 'comptable')
  );

-- ============================================
-- SAMPLE DATA (OPTIONAL - For Testing)
-- ============================================
-- Uncomment to insert sample data

/*
INSERT INTO public.general_cash_box (transaction_id, amount, transaction_type, description, transaction_date, category, created_at, created_by_id)
VALUES 
  ('GCB001', 50000, 'versement', 'Versement initial caisse générale', CURRENT_DATE, 'frais généraux', CURRENT_TIMESTAMP, (SELECT id FROM auth.users LIMIT 1)),
  ('GCB002', 5000, 'dépense', 'Frais administratifs', CURRENT_DATE, 'frais généraux', CURRENT_TIMESTAMP, (SELECT id FROM auth.users LIMIT 1));

INSERT INTO public.project_finance (finance_id, project_box_id, total_allocated, total_spent, total_received)
SELECT 'FIN001', id, 100000, 25000, 75000 FROM public.project_boxes LIMIT 1;

INSERT INTO public.project_finance_detail (project_finance_id, description, amount, finance_date, finance_type)
SELECT id, 'Allocation initiale', 100000, CURRENT_DATE, 'entrée' FROM public.project_finance LIMIT 1;
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check project_boxes with new fields:
-- SELECT * FROM public.project_boxes;

-- Check general cash box:
-- SELECT * FROM public.general_cash_box ORDER BY transaction_date DESC;

-- Check project finance:
-- SELECT pb.name, pf.total_allocated, pf.total_spent, pf.total_received FROM public.project_finance pf
-- LEFT JOIN public.project_boxes pb ON pf.project_box_id = pb.id;

-- Calculate general cash balance:
-- SELECT 
--   transaction_type,
--   COUNT(*) as count,
--   COALESCE(SUM(amount), 0) as total
-- FROM public.general_cash_box 
-- GROUP BY transaction_type;

-- ============================================
-- GESTION PROJETS - COMPLETE DATABASE SCHEMA
-- ============================================

-- ============================================
-- 1. PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  description TEXT,
  chef_de_projet_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chef_de_projet_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, active, completed, cancelled
  total_budget DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 2. PROJECT EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  expense_date DATE NOT NULL,
  category VARCHAR(100), -- matériel, main-d'oeuvre, transport, autre
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 3. PROJECT VERSEMENTS (PAYMENTS) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_versements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  versement_date DATE NOT NULL,
  description TEXT,
  payment_method VARCHAR(100), -- virement, espèces, chèque
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 4. GENERAL CASH BOX (CAISSE GÉNÉRALE) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.general_cash_box (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type VARCHAR(50), -- versement, retrait, dépense
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  category VARCHAR(100), -- frais généraux, salaires, matériel, autre
  reference_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 5. PROJECT FINANCE (CAISSE DE FINANCEMENT PROJETS) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_finance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finance_id VARCHAR(50) UNIQUE NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  total_allocated DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_spent DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_received DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 6. PROJECT FINANCE DETAIL TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_finance_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_finance_id UUID NOT NULL REFERENCES public.project_finance(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  finance_date DATE NOT NULL,
  finance_type VARCHAR(50), -- entrée, sortie
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_projects_chef_de_projet ON public.projects(chef_de_projet_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_expenses_project_id ON public.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_date ON public.project_expenses(expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_project_versements_project_id ON public.project_versements(project_id);
CREATE INDEX IF NOT EXISTS idx_project_versements_date ON public.project_versements(versement_date DESC);

CREATE INDEX IF NOT EXISTS idx_general_cash_box_type ON public.general_cash_box(transaction_type);
CREATE INDEX IF NOT EXISTS idx_general_cash_box_date ON public.general_cash_box(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_general_cash_box_project ON public.general_cash_box(reference_project_id);

CREATE INDEX IF NOT EXISTS idx_project_finance_project ON public.project_finance(project_id);

CREATE INDEX IF NOT EXISTS idx_project_finance_detail_project_finance ON public.project_finance_detail(project_finance_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Projects table RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all projects" ON public.projects
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and Chef de Projet can create projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'resp_projets')
    OR auth.uid() = chef_de_projet_id
  );

CREATE POLICY "Admins and Chef de Projet can update their projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'resp_projets')
    OR auth.uid() = chef_de_projet_id
  );

-- Project Expenses RLS
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read project expenses" ON public.project_expenses
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create project expenses" ON public.project_expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'resp_projets', 'chef_projet')
  );

-- Project Versements RLS
ALTER TABLE public.project_versements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read project versements" ON public.project_versements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create project versements" ON public.project_versements
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'resp_projets', 'comptable')
  );

-- General Cash Box RLS
ALTER TABLE public.general_cash_box ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read general cash box" ON public.general_cash_box
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and Comptable can create cash transactions" ON public.general_cash_box
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'comptable')
  );

-- Project Finance RLS
ALTER TABLE public.project_finance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read project finance" ON public.project_finance
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create project finance" ON public.project_finance
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'resp_projets', 'comptable')
  );

-- ============================================
-- SAMPLE DATA (OPTIONAL - For Testing)
-- ============================================
-- Uncomment to insert sample data

/*
INSERT INTO public.projects (project_id, name, address, description, chef_de_projet_id, status, total_budget)
VALUES 
  ('PROJ001', 'Projet Construction Immeuble A', '123 Rue du Commerce', 'Immeuble résidentiel 10 étages', '52a74346-c9f5-4498-850c-6f7a9dde929d', 'active', 5000000),
  ('PROJ002', 'Projet Rénovation Bureau B', '456 Avenue Principale', 'Rénovation bureaux centre-ville', '62b84347-d6f5-4498-850c-6f7a9dde929d', 'pending', 2000000);

INSERT INTO public.project_expenses (project_id, description, amount, expense_date, category)
SELECT id, 'Achat matériel construction', 50000, CURRENT_DATE, 'matériel' 
FROM public.projects WHERE project_id = 'PROJ001';

INSERT INTO public.project_versements (project_id, amount, versement_date, description)
SELECT id, 500000, CURRENT_DATE, 'Acompte initial 10%' 
FROM public.projects WHERE project_id = 'PROJ001';
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check projects:
-- SELECT * FROM public.projects;

-- Check project expenses:
-- SELECT p.name, pe.description, pe.amount, pe.expense_date FROM public.projects p 
-- LEFT JOIN public.project_expenses pe ON p.id = pe.project_id;

-- Check project versements:
-- SELECT p.name, pv.amount, pv.versement_date FROM public.projects p 
-- LEFT JOIN public.project_versements pv ON p.id = pv.project_id;

-- Check general cash box:
-- SELECT * FROM public.general_cash_box ORDER BY transaction_date DESC;

-- Calculate project balance:
-- SELECT 
--   p.name, 
--   COALESCE(SUM(pv.amount), 0) as total_received,
--   COALESCE(SUM(pe.amount), 0) as total_spent,
--   COALESCE(SUM(pv.amount), 0) - COALESCE(SUM(pe.amount), 0) as balance
-- FROM public.projects p
-- LEFT JOIN public.project_versements pv ON p.id = pv.project_id
-- LEFT JOIN public.project_expenses pe ON p.id = pe.project_id
-- GROUP BY p.id, p.name;

-- SQL Script to Insert Test Data for Material Commands (Commandes Matériel)
-- This script inserts sample material commands with 2-4 products each for testing

-- First, let's ensure we have some categories and unities
INSERT INTO public.categories (name, description) VALUES
('Électricité', 'Produits électriques'),
('Plomberie', 'Produits de plomberie'),
('Quincaillerie', 'Articles de quincaillerie'),
('Peinture', 'Produits de peinture et revêtement')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.unities (name, symbol) VALUES
('Mètre', 'm'),
('Kilogramme', 'kg'),
('Unité', 'u'),
('Litre', 'l'),
('Boîte', 'bx')
ON CONFLICT (name) DO NOTHING;

-- Get IDs for categories and unities (we'll reference them)
-- Note: Replace 'your-user-id-here' with an actual user ID from auth.users
-- You can find valid user IDs by running: SELECT id FROM auth.users LIMIT 1;

-- Insert Material Commands
-- Command 1: Électricité et Câblage
WITH new_cmd AS (
  INSERT INTO public.material_commands (command_id, status, created_by_id, created_at, updated_at) 
  VALUES (
    'CMD-' || LPAD((FLOOR(RANDOM() * 100000)::int)::text, 5, '0'),
    'pending',
    (SELECT id FROM auth.users LIMIT 1),
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO public.command_products (command_id, product_name, category_id, unity_id, quantity, price, note, created_at)
SELECT 
  nc.id,
  'Câble électrique 2.5mm',
  (SELECT id FROM public.categories WHERE name = 'Électricité' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Mètre' LIMIT 1),
  50,
  2500,
  'Câble de qualité standard',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Disjoncteur 16A',
  (SELECT id FROM public.categories WHERE name = 'Électricité' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Unité' LIMIT 1),
  10,
  850,
  'Disjoncteur automatique bipolaire',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Prise électrique',
  (SELECT id FROM public.categories WHERE name = 'Électricité' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Unité' LIMIT 1),
  20,
  450,
  'Prise 2P+T avec terre',
  NOW()
FROM new_cmd nc;

-- Command 2: Plomberie et Tuyauterie
WITH new_cmd AS (
  INSERT INTO public.material_commands (command_id, status, created_by_id, created_at, updated_at) 
  VALUES (
    'CMD-' || LPAD((FLOOR(RANDOM() * 100000)::int)::text, 5, '0'),
    'pending',
    (SELECT id FROM auth.users LIMIT 1),
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO public.command_products (command_id, product_name, category_id, unity_id, quantity, price, note, created_at)
SELECT 
  nc.id,
  'Tuyau PVC 20mm',
  (SELECT id FROM public.categories WHERE name = 'Plomberie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Mètre' LIMIT 1),
  100,
  1200,
  'Tuyau rigide PVC pour eau froide',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Robinet d''arrêt',
  (SELECT id FROM public.categories WHERE name = 'Plomberie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Unité' LIMIT 1),
  8,
  3500,
  'Robinet d''arrêt 3/4 pouces',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Coude PVC 90°',
  (SELECT id FROM public.categories WHERE name = 'Plomberie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Unité' LIMIT 1),
  30,
  350,
  'Coude 20mm pour tuyauterie',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Sceau étanchéité',
  (SELECT id FROM public.categories WHERE name = 'Plomberie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Boîte' LIMIT 1),
  5,
  2800,
  'Sceau pour joints étanches',
  NOW()
FROM new_cmd nc;

-- Command 3: Quincaillerie
WITH new_cmd AS (
  INSERT INTO public.material_commands (command_id, status, created_by_id, created_at, updated_at) 
  VALUES (
    'CMD-' || LPAD((FLOOR(RANDOM() * 100000)::int)::text, 5, '0'),
    'pending',
    (SELECT id FROM auth.users LIMIT 1),
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO public.command_products (command_id, product_name, category_id, unity_id, quantity, price, note, created_at)
SELECT 
  nc.id,
  'Vis acier 4x50mm',
  (SELECT id FROM public.categories WHERE name = 'Quincaillerie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Boîte' LIMIT 1),
  10,
  950,
  'Boîte de 500 vis',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Clou galvanisé 3.5mm',
  (SELECT id FROM public.categories WHERE name = 'Quincaillerie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Kilogramme' LIMIT 1),
  5,
  1200,
  'Clous galvanisés premium',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Charnière porte 100mm',
  (SELECT id FROM public.categories WHERE name = 'Quincaillerie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Unité' LIMIT 1),
  12,
  2100,
  'Charnière en acier zingué',
  NOW()
FROM new_cmd nc;

-- Command 4: Peinture et Revêtement
WITH new_cmd AS (
  INSERT INTO public.material_commands (command_id, status, created_by_id, created_at, updated_at) 
  VALUES (
    'CMD-' || LPAD((FLOOR(RANDOM() * 100000)::int)::text, 5, '0'),
    'pending',
    (SELECT id FROM auth.users LIMIT 1),
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO public.command_products (command_id, product_name, category_id, unity_id, quantity, price, note, created_at)
SELECT 
  nc.id,
  'Peinture acrylique blanche',
  (SELECT id FROM public.categories WHERE name = 'Peinture' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Litre' LIMIT 1),
  20,
  3500,
  'Peinture 100% acrylique - Finish mat',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Pinceau 25mm',
  (SELECT id FROM public.categories WHERE name = 'Peinture' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Unité' LIMIT 1),
  15,
  850,
  'Pinceau poils mixtes',
  NOW()
FROM new_cmd nc;

-- Command 5: Matériaux mixtes
WITH new_cmd AS (
  INSERT INTO public.material_commands (command_id, status, created_by_id, created_at, updated_at) 
  VALUES (
    'CMD-' || LPAD((FLOOR(RANDOM() * 100000)::int)::text, 5, '0'),
    'pending',
    (SELECT id FROM auth.users LIMIT 1),
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO public.command_products (command_id, product_name, category_id, unity_id, quantity, price, note, created_at)
SELECT 
  nc.id,
  'Ciment gris 50kg',
  (SELECT id FROM public.categories WHERE name = 'Quincaillerie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Kilogramme' LIMIT 1),
  30,
  450,
  'Sac de 50kg ciment Portland',
  NOW()
FROM new_cmd nc
UNION ALL
SELECT 
  nc.id,
  'Sable fin',
  (SELECT id FROM public.categories WHERE name = 'Quincaillerie' LIMIT 1),
  (SELECT id FROM public.unities WHERE name = 'Kilogramme' LIMIT 1),
  500,
  180,
  'Sable de rivière lavé',
  NOW()
FROM new_cmd nc;

-- Verify the data was inserted
SELECT 'Total Material Commands Created:' as info, COUNT(*) as count 
FROM public.material_commands 
WHERE created_at > NOW() - INTERVAL '10 minutes';

SELECT 'Total Command Products Created:' as info, COUNT(*) as count 
FROM public.command_products 
WHERE created_at > NOW() - INTERVAL '10 minutes';

-- View the created data
SELECT 
  mc.command_id,
  mc.status,
  COUNT(cp.id) as product_count,
  mc.created_at
FROM public.material_commands mc
LEFT JOIN public.command_products cp ON mc.id = cp.command_id
WHERE mc.created_at > NOW() - INTERVAL '10 minutes'
GROUP BY mc.id, mc.command_id, mc.status, mc.created_at
ORDER BY mc.created_at DESC;

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

-- ============================================================================
-- QUICK COPY & PASTE SQL - APPOINTMENTS & PAYMENT ORDERS
-- ============================================================================
-- Just select all and copy into Supabase SQL Editor, then click Run
-- Takes ~10 seconds to execute
-- ============================================================================

-- CREATE APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON public.appointments(created_at DESC);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
CREATE POLICY "Users can view their own appointments" ON public.appointments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own appointments" ON public.appointments;
CREATE POLICY "Users can create their own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
CREATE POLICY "Users can update their own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.appointments;
CREATE POLICY "Users can delete their own appointments" ON public.appointments FOR DELETE USING (auth.uid() = user_id);

-- CREATE PAYMENT ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bon_commande_id UUID NOT NULL REFERENCES public.bons_commandes(id) ON DELETE RESTRICT,
  total_price NUMERIC(15, 2) NOT NULL CHECK (total_price > 0),
  note TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'validated')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_bon_commande_id ON public.payment_orders(bon_commande_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON public.payment_orders(created_at DESC);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized users can view all payment orders" ON public.payment_orders;
CREATE POLICY "Authorized users can view all payment orders" ON public.payment_orders FOR SELECT USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'comptable', 'gestionnaire')) OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Authorized users can create payment orders" ON public.payment_orders;
CREATE POLICY "Authorized users can create payment orders" ON public.payment_orders FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'comptable', 'gestionnaire'))
);

DROP POLICY IF EXISTS "Authorized users can update payment orders" ON public.payment_orders;
CREATE POLICY "Authorized users can update payment orders" ON public.payment_orders FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'comptable', 'gestionnaire'))
) WITH CHECK (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'comptable', 'gestionnaire'))
);

DROP POLICY IF EXISTS "Authorized users can delete payment orders" ON public.payment_orders;
CREATE POLICY "Authorized users can delete payment orders" ON public.payment_orders FOR DELETE USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'comptable', 'gestionnaire'))
);

-- CREATE VIEWS FOR DASHBOARD
CREATE OR REPLACE VIEW public.upcoming_appointments_view AS
SELECT 
  a.id,
  a.user_id,
  a.title,
  a.description,
  a.date,
  a.time,
  a.created_at,
  CASE 
    WHEN CAST(a.date AS DATE) = CAST(CURRENT_DATE AS DATE) THEN 'today'
    WHEN CAST(a.date AS DATE) = CAST(CURRENT_DATE + INTERVAL '1 day' AS DATE) THEN 'tomorrow'
    WHEN CAST(a.date AS DATE) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 'this_week'
    ELSE 'later'
  END AS urgency
FROM public.appointments a
WHERE a.is_active = true AND CAST(a.date AS DATE) >= CAST(CURRENT_DATE AS DATE)
ORDER BY a.date ASC, a.time ASC;

CREATE OR REPLACE VIEW public.pending_payment_orders_view AS
SELECT 
  po.id,
  po.user_id,
  po.bon_commande_id,
  po.total_price,
  po.note,
  po.created_at,
  bc.bon_id AS bon_commande_reference
FROM public.payment_orders po
LEFT JOIN public.bons_commandes bc ON po.bon_commande_id = bc.id
WHERE po.status = 'pending' AND po.is_active = true
ORDER BY po.created_at DESC;

-- ============================================================================
-- DONE! Tables created with RLS policies and indexes
-- ============================================================================

-- ============================================
-- QUICK REFERENCE: SQL COMMANDS TO RUN
-- ============================================
-- Copy and paste sections below directly into Supabase SQL Editor

-- SECTION 1: Run complete schema (All in one)
-- File: SQL_SCHEMA_BONS_COMMANDES_COMPLETE.sql
-- This creates all tables, indexes, triggers, and RLS policies
-- Time: ~30 seconds
-- Just open the file and run entire content

-- SECTION 2: Add Sample Suppliers
-- Run this to populate suppliers dropdown
INSERT INTO public.suppliers (name, email, phone, address, city, contact_person, is_active)
VALUES
  ('Global Supplies Inc', 'contact@globalsupply.com', '+213123456789', '123 Business St', 'Algiers', 'Ahmed Ali', TRUE),
  ('Regional Traders', 'sales@regionaltraders.dz', '+213987654321', '456 Commerce Ave', 'Oran', 'Fatima Zahra', TRUE),
  ('Local Hardware Co', 'info@localhardware.dz', '+213555123456', '789 Industrial Rd', 'Constantine', 'Mohammed Hassan', TRUE),
  ('Premium Equipment Ltd', 'sales@premiumequip.dz', '+213666777888', '321 Equipment Zone', 'Tlemcen', 'Hassan Ali', TRUE),
  ('Industrial Solutions', 'contact@industrialsol.dz', '+213444555666', '654 Factory St', 'Blida', 'Zahra Ahmed', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Verify suppliers were added
SELECT * FROM public.suppliers WHERE is_active = TRUE;

-- SECTION 3: Storage Policy (if not already created)
-- Allows authenticated users to upload to offers bucket
CREATE POLICY "Allow authenticated uploads 1i5ycnr_0" ON storage.objects 
FOR INSERT TO public 
WITH CHECK (bucket_id = 'offers');

-- Verify policy exists
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%offers%';

-- SECTION 4: Verify Tables Created
-- Run these to confirm all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bons_commandes', 'bons_commandes_products', 'bons_commandes_offers', 'suppliers')
ORDER BY table_name;

-- SECTION 5: Check RLS Policies
-- View all policies on main table
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'bons_commandes'
ORDER BY tablename, policyname;

-- SECTION 6: Test Insert (Create sample Bon)
-- This verifies the schema is working correctly
-- First, get a purchase_command_id
SELECT id FROM public.purchase_commands LIMIT 1;

-- Then create a test bon (replace UUID with actual purchase_command_id)
INSERT INTO public.bons_commandes (
  bon_id,
  purchase_command_id,
  supplier_name,
  status,
  total_price,
  total_without_tva,
  total_with_tva,
  created_by_id
)
VALUES (
  'BON-TEST-' || to_char(now(), 'YYYYMMDDHH24MISS'),
  '550e8400-e29b-41d4-a716-446655440004', -- Replace with real UUID
  'Test Supplier',
  'pending',
  0,
  0,
  0,
  '550e8400-e29b-41d4-a716-446655440001' -- Replace with real user UUID
);

-- Verify it was created
SELECT bon_id, supplier_name, status, created_at FROM public.bons_commandes ORDER BY created_at DESC LIMIT 1;

-- SECTION 7: Add Test Product to Bon
-- First get the bon_id from above query
-- Then add a product (replace bon_id UUID)
INSERT INTO public.bons_commandes_products (
  bon_commande_id,
  product_name,
  quantity,
  unity_price,
  is_active,
  tva_rate,
  subtotal,
  tva_amount,
  total_with_tva
)
VALUES (
  (SELECT id FROM public.bons_commandes ORDER BY created_at DESC LIMIT 1),
  'Test Product',
  10,
  1000.00,
  TRUE,
  19,
  10000.00,
  1900.00,
  11900.00
);

-- Verify product was added
SELECT product_name, quantity, unity_price, tva_rate, total_with_tva 
FROM public.bons_commandes_products 
WHERE is_active = TRUE
LIMIT 1;

-- SECTION 8: Add Test Offer
INSERT INTO public.bons_commandes_offers (
  bon_commande_id,
  supplier_name,
  offer_date,
  notes
)
VALUES (
  (SELECT id FROM public.bons_commandes ORDER BY created_at DESC LIMIT 1),
  'Test Supplier',
  NOW(),
  'Test offer note'
);

-- Verify offer was added
SELECT supplier_name, offer_date, notes 
FROM public.bons_commandes_offers 
ORDER BY offer_date DESC LIMIT 1;

-- SECTION 9: Check Totals Calculation
-- View complete bon with calculated totals
SELECT 
  b.bon_id,
  b.supplier_name,
  b.status,
  COUNT(p.id) as product_count,
  SUM(CASE WHEN p.is_active THEN p.subtotal ELSE 0 END) as total_without_tva,
  SUM(CASE WHEN p.is_active THEN p.total_with_tva ELSE 0 END) as total_with_tva
FROM public.bons_commandes b
LEFT JOIN public.bons_commandes_products p ON b.id = p.bon_commande_id
GROUP BY b.id, b.bon_id, b.supplier_name, b.status
ORDER BY b.created_at DESC;

-- SECTION 10: Clean Up Test Data (Optional)
-- Delete test records if needed
DELETE FROM public.bons_commandes_offers 
WHERE bon_commande_id IN (SELECT id FROM public.bons_commandes WHERE bon_id LIKE 'BON-TEST%');

DELETE FROM public.bons_commandes_products 
WHERE bon_commande_id IN (SELECT id FROM public.bons_commandes WHERE bon_id LIKE 'BON-TEST%');

DELETE FROM public.bons_commandes WHERE bon_id LIKE 'BON-TEST%';

-- SECTION 11: Backup Current Data (Before Major Changes)
-- Export current bons_commandes
COPY public.bons_commandes TO STDOUT;

-- Export current products
COPY public.bons_commandes_products TO STDOUT;

-- SECTION 12: Monitoring Queries
-- Check for any errors in recent operations
SELECT table_name, pg_size_pretty(pg_total_relation_size(schemaname||'.'||table_name)) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'bons%'
ORDER BY pg_total_relation_size(schemaname||'.'||table_name) DESC;

-- Count records in each table
SELECT 
  'bons_commandes' as table_name,
  COUNT(*) as record_count
FROM public.bons_commandes
UNION ALL
SELECT 
  'bons_commandes_products',
  COUNT(*)
FROM public.bons_commandes_products
UNION ALL
SELECT 
  'bons_commandes_offers',
  COUNT(*)
FROM public.bons_commandes_offers
UNION ALL
SELECT 
  'suppliers',
  COUNT(*)
FROM public.suppliers;

-- ============================================
-- EXECUTION ORDER
-- ============================================
-- 1. Run full SQL_SCHEMA_BONS_COMMANDES_COMPLETE.sql file
-- 2. Run SECTION 2 (Add Sample Suppliers)
-- 3. Run SECTION 4 (Verify Tables Created)
-- 4. Run SECTION 5 (Check RLS Policies)
-- 5. Run SECTION 6-7 (Test Insert - verify schema works)
-- 6. Deploy frontend code
-- 7. Test application

-- ============================================
-- COMMON ISSUES & SOLUTIONS
-- ============================================

-- Issue: "relation does not exist"
-- Solution: Run full SQL schema first (SQL_SCHEMA_BONS_COMMANDES_COMPLETE.sql)

-- Issue: "permission denied"
-- Solution: Check RLS policies with SECTION 5, may need to grant permissions

-- Issue: "duplicate key value"
-- Solution: Supplier names must be unique, check existing suppliers:
SELECT DISTINCT name FROM public.suppliers ORDER BY name;

-- Issue: "storage bucket not found"
-- Solution: Create bucket manually or use Supabase Dashboard > Storage > Create Bucket
-- Bucket name must be exactly: offers

-- Issue: "UUID type invalid"
-- Solution: Replace sample UUIDs with real values from your database
-- Get real UUID examples:
SELECT id FROM public.purchase_commands LIMIT 1;
SELECT id FROM auth.users LIMIT 1;

-- ============================================
-- DATABASE STATISTICS
-- ============================================

-- View table structure
\d public.bons_commandes
\d public.bons_commandes_products
\d public.bons_commandes_offers
\d public.suppliers

-- View all indexes
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('bons_commandes', 'bons_commandes_products', 'bons_commandes_offers', 'suppliers');

-- View all triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- FINAL VALIDATION
-- ============================================

-- Everything should be set up if all these return results:

-- 1. Tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bons_commandes', 'bons_commandes_products', 'bons_commandes_offers', 'suppliers');
-- Expected: 4

-- 2. Suppliers exist
SELECT COUNT(*) FROM public.suppliers WHERE is_active = TRUE;
-- Expected: >= 1

-- 3. Indexes exist
SELECT COUNT(*) FROM pg_indexes 
WHERE tablename IN ('bons_commandes', 'bons_commandes_products', 'bons_commandes_offers');
-- Expected: >= 6

-- 4. Triggers exist
SELECT COUNT(*) FROM information_schema.triggers
WHERE trigger_schema = 'public';
-- Expected: >= 3

-- 5. RLS policies exist
SELECT COUNT(*) FROM pg_policies 
WHERE tablename IN ('bons_commandes', 'bons_commandes_products', 'bons_commandes_offers', 'suppliers');
-- Expected: >= 8

-- ALL CHECKS PASSED = Database Ready! ✅


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

-- ============================================================================
-- SQL Schema for Reclamation Messages and Validation
-- ============================================================================

-- Add missing column to reclamations table
ALTER TABLE public.reclamations
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add column to track reception_products instead of receive_commands
ALTER TABLE public.reclamations
ADD COLUMN IF NOT EXISTS reception_products_id UUID REFERENCES public.reception_products(id) ON DELETE CASCADE;

-- Alter reclamation_products to add missing columns for better tracking
ALTER TABLE public.reclamation_products
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);

ALTER TABLE public.reclamation_products
ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;

ALTER TABLE public.reclamation_products
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Table for reclamation responses/replies
CREATE TABLE IF NOT EXISTS public.reclamation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamation_id UUID NOT NULL,
  response_message TEXT NOT NULL,
  responded_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reclamation_id) REFERENCES public.reclamations(id) ON DELETE CASCADE,
  FOREIGN KEY (responded_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Table for command validation records
CREATE TABLE IF NOT EXISTS public.command_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_products_id UUID NOT NULL,
  validated_by UUID,
  validation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'validated' CHECK (status IN ('validated', 'rejected', 'pending')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reception_products_id) REFERENCES public.reception_products(id) ON DELETE CASCADE,
  FOREIGN KEY (validated_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reclamations_receive_command_id ON public.reclamations(receive_command_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_reception_products_id ON public.reclamations(reception_products_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_status ON public.reclamations(status);
CREATE INDEX IF NOT EXISTS idx_reclamations_created_by ON public.reclamations(created_by);
CREATE INDEX IF NOT EXISTS idx_reclamation_products_reclamation_id ON public.reclamation_products(reclamation_id);
CREATE INDEX IF NOT EXISTS idx_reclamation_responses_reclamation_id ON public.reclamation_responses(reclamation_id);
CREATE INDEX IF NOT EXISTS idx_command_validations_reception_products_id ON public.command_validations(reception_products_id);

-- Grant permissions (adjust role names as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reclamations TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reclamation_products TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reclamation_responses TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.command_validations TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- =============================================================================
-- SQL MIGRATION: Remove Logo Functionality from Database
-- =============================================================================
-- This migration removes all logo-related columns from the database tables.
-- Run this migration to clean up the database after removing logo feature
-- from the application.
--
-- WARNING: This will permanently delete logo URLs from the database.
-- Make sure you have backups before running this migration.
-- =============================================================================

-- ============================================================================
-- 1. Remove logo_url from enterprise_settings table
-- ============================================================================
-- This column stores company logos
ALTER TABLE IF EXISTS public.enterprise_settings
DROP COLUMN IF EXISTS logo_url CASCADE;

-- ============================================================================
-- 2. Remove logo_url from users table
-- ============================================================================
-- This column was used for user profile logos (if any)
ALTER TABLE IF EXISTS public.users
DROP COLUMN IF EXISTS logo_url CASCADE;

-- ============================================================================
-- 3. Remove logo position columns from print_customizations table
-- ============================================================================
-- These columns were used for logo positioning in print customizations
ALTER TABLE IF EXISTS public.print_customizations
DROP COLUMN IF EXISTS logo_position_x CASCADE;

ALTER TABLE IF EXISTS public.print_customizations
DROP COLUMN IF EXISTS logo_position_y CASCADE;

-- ============================================================================
-- 4. OPTIONAL: Remove image_url from bons_commandes_offers table
-- ============================================================================
-- If you want to remove all image uploads (not just logos), uncomment below:
-- ALTER TABLE IF EXISTS public.bons_commandes_offers
-- DROP COLUMN IF EXISTS image_url CASCADE;

-- ALTER TABLE IF EXISTS public.bons_commandes_offers
-- DROP COLUMN IF EXISTS image_path CASCADE;

-- ============================================================================
-- 5. OPTIONAL: Remove image_url from bon_offers table
-- ============================================================================
-- If you want to remove all image uploads (not just logos), uncomment below:
-- ALTER TABLE IF EXISTS public.bon_offers
-- DROP COLUMN IF EXISTS image_url CASCADE;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these queries to verify the columns have been removed:

-- Check enterprise_settings table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'enterprise_settings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check users table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check print_customizations table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'print_customizations' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================================================
-- Notes:
-- =============================================================================
-- 1. The 'logos' storage bucket in Supabase can be deleted manually through
--    the Supabase dashboard if you want to free up storage space.
--
-- 2. The CompanyLogo component (/src/components/CompanyLogo.tsx) has been 
--    removed from the codebase and is no longer used.
--
-- 3. Logo upload functions have been removed from:
--    - SettingsPage.tsx
--    - AdminSettingsPage.tsx
--
-- 4. Logo display has been removed from:
--    - AppLayout.tsx (sidebar and navbar)
--
-- 5. All logo-related UI elements and state management have been cleaned up.
-- =============================================================================

-- ============================================
-- BONS COMMANDES COMPLETE SCHEMA
-- ============================================
-- This schema defines the complete structure for Bons de Commande (Purchase Orders)
-- with products, offers, pricing, TVA settings, and image storage integration

-- ============================================
-- STEP 1: CREATE SUPPLIERS TABLE (FIRST - for foreign keys)
-- ============================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  contact_person VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 2: CREATE BONS_COMMANDES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.bons_commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_id VARCHAR(50) NOT NULL UNIQUE,
  purchase_command_id UUID NOT NULL REFERENCES public.purchase_commands(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'paid', 'finalized')),
  total_price DECIMAL(15,2) DEFAULT 0,
  total_without_tva DECIMAL(15,2) DEFAULT 0,
  total_with_tva DECIMAL(15,2) DEFAULT 0,
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- ============================================
-- STEP 3: CREATE BONS_COMMANDES_PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.bons_commandes_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_commande_id UUID NOT NULL REFERENCES public.bons_commandes(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unity_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  tva_rate DECIMAL(5,2) DEFAULT 19 CHECK (tva_rate IN (0, 9, 19)),
  subtotal DECIMAL(15,2) DEFAULT 0,
  tva_amount DECIMAL(15,2) DEFAULT 0,
  total_with_tva DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 4: CREATE BONS_COMMANDES_OFFERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.bons_commandes_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_commande_id UUID NOT NULL REFERENCES public.bons_commandes(id) ON DELETE CASCADE,
  supplier_name VARCHAR(255) NOT NULL,
  offer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  image_path VARCHAR(512),
  image_url VARCHAR(512),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 5: CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bons_commandes_purchase_command_id 
  ON public.bons_commandes(purchase_command_id);

CREATE INDEX IF NOT EXISTS idx_bons_commandes_supplier_id 
  ON public.bons_commandes(supplier_id);

CREATE INDEX IF NOT EXISTS idx_bons_commandes_created_by_id 
  ON public.bons_commandes(created_by_id);

CREATE INDEX IF NOT EXISTS idx_bons_commandes_status 
  ON public.bons_commandes(status);

CREATE INDEX IF NOT EXISTS idx_bons_commandes_products_bon_id 
  ON public.bons_commandes_products(bon_commande_id);

CREATE INDEX IF NOT EXISTS idx_bons_commandes_offers_bon_id 
  ON public.bons_commandes_offers(bon_commande_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_is_active 
  ON public.suppliers(is_active);

-- ============================================
-- STEP 6: CREATE STORAGE BUCKET POLICY
-- ============================================
-- This policy allows authenticated users to upload and view offer images
-- Run this in your Supabase Dashboard under Storage > Policies

-- Policy: Allow authenticated uploads to offers bucket
-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
--   FOR INSERT TO public
--   WITH CHECK (bucket_id = 'offers' AND auth.role() = 'authenticated');

-- Policy: Allow public read access to offers bucket
-- CREATE POLICY "Allow public read" ON storage.objects
--   FOR SELECT
--   USING (bucket_id = 'offers');

-- ============================================
-- STEP 7: INSERT SAMPLE SUPPLIERS (OPTIONAL)
-- ============================================
-- Uncomment to add sample suppliers
/*
INSERT INTO public.suppliers (name, email, phone, address, city, contact_person, is_active)
VALUES
  ('Supplier One', 'supplier1@example.com', '+213123456789', '123 Main St', 'Algiers', 'John Doe', TRUE),
  ('Supplier Two', 'supplier2@example.com', '+213987654321', '456 Oak Ave', 'Oran', 'Jane Smith', TRUE),
  ('Supplier Three', 'supplier3@example.com', '+213555123456', '789 Pine Rd', 'Constantine', 'Ahmed Ali', TRUE)
ON CONFLICT (name) DO NOTHING;
*/

-- ============================================
-- STEP 8: TRIGGERS FOR AUTO UPDATE TIMESTAMPS
-- ============================================
CREATE OR REPLACE FUNCTION update_bons_commandes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_bons_commandes_products_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_bons_commandes_offers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS bons_commandes_updated_at ON public.bons_commandes;
DROP TRIGGER IF EXISTS bons_commandes_products_updated_at ON public.bons_commandes_products;
DROP TRIGGER IF EXISTS bons_commandes_offers_updated_at ON public.bons_commandes_offers;

-- Create triggers
CREATE TRIGGER bons_commandes_updated_at
BEFORE UPDATE ON public.bons_commandes
FOR EACH ROW
EXECUTE FUNCTION update_bons_commandes_timestamp();

CREATE TRIGGER bons_commandes_products_updated_at
BEFORE UPDATE ON public.bons_commandes_products
FOR EACH ROW
EXECUTE FUNCTION update_bons_commandes_products_timestamp();

CREATE TRIGGER bons_commandes_offers_updated_at
BEFORE UPDATE ON public.bons_commandes_offers
FOR EACH ROW
EXECUTE FUNCTION update_bons_commandes_offers_timestamp();

-- ============================================
-- STEP 9: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE public.bons_commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_commandes_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_commandes_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all bons_commandes
CREATE POLICY "allow_view_bons_commandes" ON public.bons_commandes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert bons_commandes
CREATE POLICY "allow_insert_bons_commandes" ON public.bons_commandes
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update bons_commandes
CREATE POLICY "allow_update_bons_commandes" ON public.bons_commandes
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete bons_commandes
CREATE POLICY "allow_delete_bons_commandes" ON public.bons_commandes
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to view all products
CREATE POLICY "allow_view_bons_products" ON public.bons_commandes_products
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert products
CREATE POLICY "allow_insert_bons_products" ON public.bons_commandes_products
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update products
CREATE POLICY "allow_update_bons_products" ON public.bons_commandes_products
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete products
CREATE POLICY "allow_delete_bons_products" ON public.bons_commandes_products
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to view all offers
CREATE POLICY "allow_view_bons_offers" ON public.bons_commandes_offers
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert offers
CREATE POLICY "allow_insert_bons_offers" ON public.bons_commandes_offers
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update offers
CREATE POLICY "allow_update_bons_offers" ON public.bons_commandes_offers
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete offers
CREATE POLICY "allow_delete_bons_offers" ON public.bons_commandes_offers
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to view suppliers
CREATE POLICY "allow_view_suppliers" ON public.suppliers
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert suppliers
CREATE POLICY "allow_insert_suppliers" ON public.suppliers
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update suppliers
CREATE POLICY "allow_update_suppliers" ON public.suppliers
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete suppliers
CREATE POLICY "allow_delete_suppliers" ON public.suppliers
  FOR DELETE
  USING (auth.role() = 'authenticated');

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

-- ============================================
-- UPDATED SQL SCHEMA - WITH UNIT PRICE & TOTAL PRICE
-- This is the CORRECTED schema for production use
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
-- STEP 1D: CREATE PRODUCTS TABLE (UPDATED)
-- CHANGE: price → unit_price + total_price
-- unit_price: Price per single unit
-- total_price: Calculated as quantity × unit_price
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
CREATE INDEX IF NOT EXISTS idx_products_unit_price ON public.products(unit_price);
CREATE INDEX IF NOT EXISTS idx_products_total_price ON public.products(total_price);
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
-- TOTAL INDEXES CREATED: 12 (including new price indexes)
-- TOTAL RLS POLICIES CREATED: 24
-- ============================================
-- KEY CHANGES IN THIS VERSION:
-- 1. Products table: price → unit_price + total_price
-- 2. Added indexes for unit_price and total_price for performance
-- 3. All other tables remain unchanged
-- ============================================

-- SQL Setup for Settings Page with Logo Storage Support
-- This ensures the enterprise_settings table is properly configured for logo storage
-- Run this in Supabase SQL Editor

-- 1. Create enterprise_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.enterprise_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'ERP System',
  logo_url text,
  created_by_id uuid NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (created_by_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Enable Row Level Security
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies if they don't exist
-- Drop existing policies if you want to recreate them
DROP POLICY IF EXISTS "select_own" ON public.enterprise_settings;
DROP POLICY IF EXISTS "insert_own" ON public.enterprise_settings;
DROP POLICY IF EXISTS "update_own" ON public.enterprise_settings;
DROP POLICY IF EXISTS "delete_own" ON public.enterprise_settings;

-- Allow users to SELECT their own settings
CREATE POLICY "select_own" ON public.enterprise_settings
  FOR SELECT
  USING (auth.uid() = created_by_id);

-- Allow users to INSERT their own settings
CREATE POLICY "insert_own" ON public.enterprise_settings
  FOR INSERT
  WITH CHECK (auth.uid() = created_by_id);

-- Allow users to UPDATE their own settings
CREATE POLICY "update_own" ON public.enterprise_settings
  FOR UPDATE
  USING (auth.uid() = created_by_id)
  WITH CHECK (auth.uid() = created_by_id);

-- Allow users to DELETE their own settings
CREATE POLICY "delete_own" ON public.enterprise_settings
  FOR DELETE
  USING (auth.uid() = created_by_id);

-- 4. Create index on created_by_id for performance
CREATE INDEX IF NOT EXISTS idx_enterprise_settings_created_by 
  ON public.enterprise_settings(created_by_id);

-- 5. Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_enterprise_settings_updated_at 
  ON public.enterprise_settings(updated_at);

-- 6. Create trigger function for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_enterprise_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to call the function
DROP TRIGGER IF EXISTS set_enterprise_settings_updated_at ON public.enterprise_settings;
CREATE TRIGGER set_enterprise_settings_updated_at
  BEFORE UPDATE ON public.enterprise_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_enterprise_settings_updated_at();

-- 8. Ensure Storage bucket exists for logos (must be configured in Supabase UI)
-- Go to Supabase Dashboard -> Storage -> Create bucket named "logos"
-- Make sure it's set to PUBLIC so images can be accessed

-- 9. Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_settings TO authenticated;

-- Done!
-- You can now upload logos through the Settings page and they will be stored in:
-- - Supabase Storage (logos bucket) with public URL
-- - Database enterprise_settings table (logo_url column)
-- 
-- The logo will persist across page refreshes and display in:
-- - Settings page (preview)
-- - Sidebar (via DataContext)
-- - Header/NavBar (via DataContext)
