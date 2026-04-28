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
