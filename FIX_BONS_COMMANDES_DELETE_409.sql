-- Fix 409 Conflict Error on Bons Commandes Delete
-- The issue is that RLS policies don't allow DELETE operations

-- Step 1: Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Enable read access for bons_commandes" ON public.bons_commandes;
DROP POLICY IF EXISTS "bons_commandes_select" ON public.bons_commandes;
DROP POLICY IF EXISTS "bons_commandes_insert" ON public.bons_commandes;
DROP POLICY IF EXISTS "bons_commandes_update" ON public.bons_commandes;
DROP POLICY IF EXISTS "bons_commandes_delete" ON public.bons_commandes;

-- Step 2: Disable and re-enable RLS on bons_commandes to start fresh
ALTER TABLE public.bons_commandes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_commandes ENABLE ROW LEVEL SECURITY;

-- Step 3: Create comprehensive RLS policies for bons_commandes

-- Policy for SELECT - allow all authenticated users
CREATE POLICY "bons_commandes_select"
ON public.bons_commandes
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy for INSERT - allow authenticated users to create their own records
CREATE POLICY "bons_commandes_insert"
ON public.bons_commandes
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND created_by_id = auth.uid()
);

-- Policy for UPDATE - allow users to update their own records
CREATE POLICY "bons_commandes_update"
ON public.bons_commandes
FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND created_by_id = auth.uid()
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND created_by_id = auth.uid()
);

-- Policy for DELETE - allow users to delete their own records (THIS FIXES THE 409 ERROR)
CREATE POLICY "bons_commandes_delete"
ON public.bons_commandes
FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND created_by_id = auth.uid()
);

-- Step 4: Also fix RLS policies for bons_commandes_products table

-- Drop existing policies
DROP POLICY IF EXISTS "bons_commandes_products_select" ON public.bons_commandes_products;
DROP POLICY IF EXISTS "bons_commandes_products_insert" ON public.bons_commandes_products;
DROP POLICY IF EXISTS "bons_commandes_products_update" ON public.bons_commandes_products;
DROP POLICY IF EXISTS "bons_commandes_products_delete" ON public.bons_commandes_products;

-- Disable and re-enable RLS
ALTER TABLE public.bons_commandes_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_commandes_products ENABLE ROW LEVEL SECURITY;

-- Create policies for bons_commandes_products
CREATE POLICY "bons_commandes_products_select"
ON public.bons_commandes_products
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "bons_commandes_products_insert"
ON public.bons_commandes_products
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bons_commandes_products_update"
ON public.bons_commandes_products
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bons_commandes_products_delete"
ON public.bons_commandes_products
FOR DELETE
USING (auth.role() = 'authenticated');

-- Step 5: Also fix RLS policies for bons_commandes_offers table

-- Drop existing policies
DROP POLICY IF EXISTS "bons_commandes_offers_select" ON public.bons_commandes_offers;
DROP POLICY IF EXISTS "bons_commandes_offers_insert" ON public.bons_commandes_offers;
DROP POLICY IF EXISTS "bons_commandes_offers_update" ON public.bons_commandes_offers;
DROP POLICY IF EXISTS "bons_commandes_offers_delete" ON public.bons_commandes_offers;

-- Disable and re-enable RLS
ALTER TABLE public.bons_commandes_offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_commandes_offers ENABLE ROW LEVEL SECURITY;

-- Create policies for bons_commandes_offers
CREATE POLICY "bons_commandes_offers_select"
ON public.bons_commandes_offers
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "bons_commandes_offers_insert"
ON public.bons_commandes_offers
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bons_commandes_offers_update"
ON public.bons_commandes_offers
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bons_commandes_offers_delete"
ON public.bons_commandes_offers
FOR DELETE
USING (auth.role() = 'authenticated');

-- Step 6: Verify the policies are set correctly
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('bons_commandes', 'bons_commandes_products', 'bons_commandes_offers');

-- Step 7: List all active policies
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('bons_commandes', 'bons_commandes_products', 'bons_commandes_offers')
ORDER BY tablename, policyname;
