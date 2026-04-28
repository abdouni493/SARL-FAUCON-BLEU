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
