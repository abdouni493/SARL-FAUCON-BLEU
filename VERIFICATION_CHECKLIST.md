-- Add invoice_image_url column to reception_products table
ALTER TABLE reception_products ADD COLUMN IF NOT EXISTS invoice_image_url TEXT;

-- Drop NOT NULL constraint from bon_commande_id and add beneficiary column
ALTER TABLE payment_orders 
  ALTER COLUMN bon_commande_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS beneficiary TEXT;

  -- ============================================================================
-- SUPABASE USER UPDATE QUERIES
-- ============================================================================
-- These queries will update user passwords and metadata in Supabase auth.users
-- 
-- IMPORTANT: These queries must be run in Supabase SQL Editor with an admin token
-- Do NOT run these in the frontend application
-- ============================================================================

-- ==========================
-- UPDATE EXISTING USERS WITH CORRECT PASSWORDS AND METADATA
-- ==========================

-- 1. UPDATE ADMIN USER (admin@admin.com)
-- Password: admin123
UPDATE auth.users
SET 
  encrypted_password = crypt('admin123', gen_salt('bf')),
  raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{fullName,username,role}',
    '{"fullName":"Administrator","username":"admin","role":"admin"}'::jsonb
  ),
  updated_at = now()
WHERE email = 'admin@admin.com';

-- 2. UPDATE CHEF DE PROJET (chef@projet.com)
-- Password: chef123
UPDATE auth.users
SET 
  encrypted_password = crypt('chef123', gen_salt('bf')),
  raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{fullName,username,role}',
    '{"fullName":"Chef de Projet","username":"chef_projet","role":"chef_projet"}'::jsonb
  ),
  updated_at = now()
WHERE email = 'chef@projet.com';

-- 3. UPDATE STORAGE (stockage@stockage.com)
-- Password: stockage123
UPDATE auth.users
SET 
  encrypted_password = crypt('stockage123', gen_salt('bf')),
  raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{fullName,username,role}',
    '{"fullName":"Responsable Stockage","username":"stockage","role":"storage"}'::jsonb
  ),
  updated_at = now()
WHERE email = 'stockage@stockage.com';

-- 4. UPDATE PURCHASE (achats@achats.com)
-- Password: achats123
UPDATE auth.users
SET 
  encrypted_password = crypt('achats123', gen_salt('bf')),
  raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{fullName,username,role}',
    '{"fullName":"Responsable Achats","username":"achats","role":"purchase"}'::jsonb
  ),
  updated_at = now()
WHERE email = 'achats@achats.com';

-- 5. UPDATE COMPTABLE (comptable@comptable.com)
-- Password: comptable123
UPDATE auth.users
SET 
  encrypted_password = crypt('comptable123', gen_salt('bf')),
  raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{fullName,username,role}',
    '{"fullName":"Comptable","username":"comptable","role":"comptable"}'::jsonb
  ),
  updated_at = now()
WHERE email = 'comptable@comptable.com';

-- ============================================================================
-- VERIFY UPDATES
-- ============================================================================
-- Run these queries to verify the updates were successful:

-- Check if passwords and metadata were updated:
SELECT 
  id,
  email,
  raw_user_meta_data->>'fullName' as fullName,
  raw_user_meta_data->>'username' as username,
  raw_user_meta_data->>'role' as role,
  created_at,
  updated_at
FROM auth.users
WHERE email IN (
  'admin@admin.com',
  'chef@projet.com',
  'stockage@stockage.com',
  'achats@achats.com',
  'comptable@comptable.com'
)
ORDER BY created_at;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. These queries use PostgreSQL's crypt() function which is available in Supabase
-- 2. Passwords will be hashed with bcrypt (bf algorithm)
-- 3. User metadata is updated to include proper role information
-- 4. All timestamps are updated to current time
-- 5. Users can now log in with:
--    - admin@admin.com / admin123
--    - chef@projet.com / chef123
--    - stockage@stockage.com / stockage123
--    - achats@achats.com / achats123
--    - comptable@comptable.com / comptable123
-- ============================================================================


-- Storage Management System - SQL Schema and RLS Policies
-- This file contains the SQL code needed to add storage management functionality to the ERP system

-- ============================================================================
-- 1. CREATE STORAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.storages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  address text,
  description text,
  created_by_id uuid NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  CONSTRAINT storages_pkey PRIMARY KEY (id),
  CONSTRAINT storages_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. ADD STORAGE_ID COLUMN TO PRODUCTS TABLE
-- ============================================================================

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS storage_id uuid REFERENCES public.storages(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. ADD STORAGE_ID COLUMN TO RECEPTION_PRODUCTS TABLE
-- ============================================================================

ALTER TABLE public.reception_products 
ADD COLUMN IF NOT EXISTS storage_id uuid REFERENCES public.storages(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_storages_created_by_id ON public.storages(created_by_id);
CREATE INDEX IF NOT EXISTS idx_storages_is_active ON public.storages(is_active);
CREATE INDEX IF NOT EXISTS idx_products_storage_id ON public.products(storage_id);
CREATE INDEX IF NOT EXISTS idx_reception_products_storage_id ON public.reception_products(storage_id);

-- ============================================================================
-- 5. ENABLE RLS (Row Level Security) ON STORAGES TABLE
-- ============================================================================

ALTER TABLE public.storages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. DROP EXISTING POLICIES (if they exist) - RUN THIS FIRST IF UPDATING
-- ============================================================================

DROP POLICY IF EXISTS "storages_select_policy" ON public.storages;
DROP POLICY IF EXISTS "storages_insert_policy" ON public.storages;
DROP POLICY IF EXISTS "storages_update_policy" ON public.storages;
DROP POLICY IF EXISTS "storages_delete_policy" ON public.storages;

-- ============================================================================
-- 7. CREATE NEW RLS POLICIES - ALLOW ADMIN AND COMPTABLE
-- ============================================================================

-- SELECT Policy: Admin and Comptable can view all storages
CREATE POLICY "storages_select_policy" ON public.storages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'comptable')
    )
  );

-- INSERT Policy: Admin and Comptable can create storages
CREATE POLICY "storages_insert_policy" ON public.storages
  FOR INSERT
  WITH CHECK (
    created_by_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'comptable')
    )
  );

-- UPDATE Policy: Admin and Comptable can update storages they created
CREATE POLICY "storages_update_policy" ON public.storages
  FOR UPDATE
  USING (
    created_by_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'comptable')
    )
  )
  WITH CHECK (
    created_by_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'comptable')
    )
  );

-- DELETE Policy: Admin and Comptable can delete storages they created
CREATE POLICY "storages_delete_policy" ON public.storages
  FOR DELETE
  USING (
    created_by_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'comptable')
    )
  );

-- ============================================================================
-- 8. ENSURE PRODUCTS TABLE ALLOWS STORAGE_ID UPDATES
-- ============================================================================

-- If RLS is enabled on products table, ensure the policy allows storage_id updates
-- This SQL assumes you want to keep existing policies but allow storage selection

-- ============================================================================
-- 9. STORAGE PRODUCTS VIEW (Optional - for better querying)
-- ============================================================================

CREATE OR REPLACE VIEW public.storage_products_view AS
SELECT 
  p.id,
  p.name as product_name,
  p.quantity,
  p.unit_price,
  p.total_price,
  p.storage_id,
  s.name as storage_name,
  s.address as storage_address,
  c.name as category_name,
  u.name as unity_name,
  sup.name as supplier_name,
  p.created_at,
  p.updated_at
FROM public.products p
LEFT JOIN public.storages s ON p.storage_id = s.id
LEFT JOIN public.categories c ON p.category_id = c.id
LEFT JOIN public.unities u ON p.unity_id = u.id
LEFT JOIN public.suppliers sup ON p.supplier_id = sup.id;

-- ============================================================================
-- 10. VERIFY TABLE STRUCTURE (Run this to verify everything is correct)
-- ============================================================================

-- Uncomment to verify the storages table structure:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'storages'
-- ORDER BY ordinal_position;

-- ============================================================================
-- NOTES FOR IMPLEMENTATION
-- ============================================================================
/*
IMPORTANT STEPS TO FOLLOW:

1. Run the SQL code above in Supabase SQL Editor to create the new storages table
   and add RLS policies.

2. The policies allow:
   - Only users with role 'admin' or 'comptable' can view/create/update/delete storages
   - Users can only manage storages they created (based on created_by_id)

3. The products and reception_products tables now have storage_id columns to link them
   to specific storages.

4. Indexes are created for performance optimization.

5. After running the SQL:
   - Update the frontend components to include storage selection in product creation
   - Update the receive products interface to select storage
   - Create the new StoragesManagement page component

6. If you get RLS policy errors:
   - Ensure the user is authenticated
   - Ensure the user's role is 'admin' or 'comptable' in the users table
   - Check that policies are created correctly

7. To disable RLS temporarily for testing (NOT recommended for production):
   - ALTER TABLE public.storages DISABLE ROW LEVEL SECURITY;
   - But remember to enable it again after testing

8. If you need to allow Storage role users as well:
   - Update the policy WHERE clause to include 'storage' role:
   - AND users.role IN ('admin', 'comptable', 'storage')
*/

-- SQL code to update the suppliers table with new columns
-- This adds the required columns: company_name, nis, nif, article, commercial_registration

-- Add the new columns to the suppliers table
ALTER TABLE public.suppliers
ADD COLUMN company_name character varying,
ADD COLUMN nif character varying,
ADD COLUMN nis character varying,
ADD COLUMN article character varying,
ADD COLUMN commercial_registration character varying;

-- Optional: If you want to add these columns with unique constraints or indexes
-- CREATE INDEX idx_suppliers_nif ON public.suppliers(nif) WHERE nif IS NOT NULL;
-- CREATE INDEX idx_suppliers_nis ON public.suppliers(nis) WHERE nis IS NOT NULL;
-- CREATE INDEX idx_suppliers_commercial_registration ON public.suppliers(commercial_registration) WHERE commercial_registration IS NOT NULL;

-- Verify the new columns were added
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'suppliers' ORDER BY ordinal_position;

-- ============================================
-- WORKER EXPENSES TABLE SCHEMA
-- ============================================
-- This table manages all worker-related expenses
-- Such as wages, bonuses, daily allowances, etc.

CREATE TABLE IF NOT EXISTS worker_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category VARCHAR(100),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  worker_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for faster queries
CREATE INDEX idx_worker_expenses_user_id ON worker_expenses(user_id);
CREATE INDEX idx_worker_expenses_date ON worker_expenses(expense_date DESC);
CREATE INDEX idx_worker_expenses_category ON worker_expenses(category);
CREATE INDEX idx_worker_expenses_created_at ON worker_expenses(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_worker_expenses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER worker_expenses_update_timestamp
BEFORE UPDATE ON worker_expenses
FOR EACH ROW
EXECUTE FUNCTION update_worker_expenses_timestamp();

-- Enable RLS (Row Level Security)
ALTER TABLE worker_expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own expenses
CREATE POLICY worker_expenses_user_access ON worker_expenses
FOR ALL USING (auth.uid() = user_id OR 
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'comptable', 'gestionnaire'));

-- Insert sample data (optional)
INSERT INTO worker_expenses (user_id, description, category, amount, expense_date, worker_name, notes) 
VALUES 
  (NULL, 'Salaire hebdomadaire - Équipe A', 'Salaire', 150000, '2026-03-20', 'Équipe construction', 'Semaine du 16-20 mars'),
  (NULL, 'Prime de rendement', 'Prime', 50000, '2026-03-19', 'Ali Hassan', 'Bonus mensuel'),
  (NULL, 'Indemnité de transport', 'Transport', 25000, '2026-03-18', 'Équipe logistique', 'Déplacement site'),
  (NULL, 'Allocations journalières', 'Allocations', 35000, '2026-03-17', 'Équipe technique', 'Frais divers')
ON CONFLICT DO NOTHING;

-- ============================================
-- SIMPLIFY GENERAL CASH BOX SCHEMA
-- ============================================
-- This migration simplifies the general_cash_box table
-- to focus on core transaction types: Encaissement (income) and Décaissement (expense)

-- ============================================
-- STEP 1: Update existing records if needed
-- ============================================
-- Consolidate transaction types to: versement (Encaissement) or retrait (Décaissement)
UPDATE public.general_cash_box 
SET transaction_type = 'retrait' 
WHERE transaction_type = 'dépense';

-- ============================================
-- STEP 2: Make category and reference_project_box_id optional
-- ============================================
-- These columns are already nullable, so no changes needed
-- The schema will allow NULL values for category and reference_project_box_id

-- ============================================
-- STEP 3: Verify the schema is correct
-- ============================================
-- The general_cash_box table should have:
-- - id (UUID)
-- - transaction_id (VARCHAR)
-- - amount (DECIMAL)
-- - transaction_type (VARCHAR) - values: 'versement' (Encaissement) or 'retrait' (Décaissement)
-- - description (TEXT)
-- - transaction_date (DATE)
-- - category (VARCHAR) - OPTIONAL (can be NULL)
-- - reference_project_box_id (UUID) - OPTIONAL (can be NULL)
-- - created_at (TIMESTAMP)
-- - created_by_id (UUID)

-- ============================================
-- REFERENCE: Current Simplified Schema
-- ============================================
/*
CREATE TABLE public.general_cash_box (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id character varying NOT NULL UNIQUE,
  amount numeric NOT NULL,
  transaction_type character varying,
  description text NOT NULL,
  transaction_date date NOT NULL,
  category character varying,
  reference_project_box_id uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by_id uuid,
  CONSTRAINT general_cash_box_pkey PRIMARY KEY (id),
  CONSTRAINT general_cash_box_reference_project_box_id_fkey FOREIGN KEY (reference_project_box_id) REFERENCES public.project_boxes(id),
  CONSTRAINT general_cash_box_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES auth.users(id)
);
*/

-- ============================================
-- TRANSACTION TYPE MEANINGS (Updated)
-- ============================================
-- versement  => Encaissement (Income/Receipt) - Money coming IN
-- retrait    => Décaissement (Expense/Withdrawal) - Money going OUT
-- (dépense   => Consolidated to 'retrait' for simplicity)

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check transaction types in the database:
-- SELECT DISTINCT transaction_type FROM public.general_cash_box;

-- Check distribution of transaction types:
-- SELECT 
--   transaction_type,
--   COUNT(*) as count,
--   SUM(amount) as total
-- FROM public.general_cash_box
-- GROUP BY transaction_type
-- ORDER BY transaction_type;

-- Check for NULL categories and projects:
-- SELECT 
--   COUNT(CASE WHEN category IS NULL THEN 1 END) as null_categories,
--   COUNT(CASE WHEN reference_project_box_id IS NULL THEN 1 END) as null_projects,
--   COUNT(*) as total_transactions
-- FROM public.general_cash_box;


-- ============================================================
-- ENTERPRISE SETTINGS - SIMPLE FIX
-- Run this EXACTLY as shown
-- ============================================================

-- STEP 1: Drop and recreate
DROP TABLE IF EXISTS public.enterprise_settings CASCADE;

-- STEP 2: Create table
CREATE TABLE public.enterprise_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'ERP System',
  logo_url text,
  created_by_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(created_by_id)
);

-- STEP 3: Enable RLS
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

-- STEP 4: Simple SELECT policy
CREATE POLICY "select_own" ON public.enterprise_settings
FOR SELECT USING (auth.uid() = created_by_id);

-- STEP 5: Simple INSERT policy  
CREATE POLICY "insert_own" ON public.enterprise_settings
FOR INSERT WITH CHECK (auth.uid() = created_by_id);

-- STEP 6: Simple UPDATE policy
CREATE POLICY "update_own" ON public.enterprise_settings
FOR UPDATE USING (auth.uid() = created_by_id);

-- STEP 7: Simple DELETE policy
CREATE POLICY "delete_own" ON public.enterprise_settings
FOR DELETE USING (auth.uid() = created_by_id);

-- STEP 8: Index
CREATE INDEX idx_created_by ON public.enterprise_settings(created_by_id);

-- STEP 9: Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.enterprise_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.enterprise_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Done!
