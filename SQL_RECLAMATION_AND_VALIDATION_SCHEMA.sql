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
