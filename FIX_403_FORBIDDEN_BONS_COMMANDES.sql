-- ========================================================================
-- FIX: 403 FORBIDDEN ERROR FOR BONS_COMMANDES INSERT OPERATIONS
-- ========================================================================
-- This script fixes Row-Level Security (RLS) policies that may be blocking
-- INSERT operations on the bons_commandes table.
--
-- CAUSE: RLS policies might be too restrictive or not properly configured
-- SOLUTION: Recreate permissive RLS policies that allow authenticated users
-- ========================================================================

-- Step 1: Drop existing policies (if they exist)
-- This allows us to recreate them with proper permissions
DROP POLICY IF EXISTS "allow_view_bons_commandes" ON public.bons_commandes;
DROP POLICY IF EXISTS "allow_insert_bons_commandes" ON public.bons_commandes;
DROP POLICY IF EXISTS "allow_update_bons_commandes" ON public.bons_commandes;
DROP POLICY IF EXISTS "allow_delete_bons_commandes" ON public.bons_commandes;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.bons_commandes ENABLE ROW LEVEL SECURITY;

-- Step 3: Create new, permissive RLS policies for authenticated users

-- Policy 1: Allow authenticated users to SELECT (view) bons_commandes
CREATE POLICY "allow_view_bons_commandes" ON public.bons_commandes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy 2: Allow authenticated users to INSERT (create) bons_commandes
-- This is the critical policy for fixing the 403 error
CREATE POLICY "allow_insert_bons_commandes" ON public.bons_commandes
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy 3: Allow authenticated users to UPDATE bons_commandes
CREATE POLICY "allow_update_bons_commandes" ON public.bons_commandes
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy 4: Allow authenticated users to DELETE bons_commandes
CREATE POLICY "allow_delete_bons_commandes" ON public.bons_commandes
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ========================================================================
-- Step 4: Fix RLS policies for bons_commandes_products table
-- ========================================================================

DROP POLICY IF EXISTS "allow_view_bons_products" ON public.bons_commandes_products;
DROP POLICY IF EXISTS "allow_insert_bons_products" ON public.bons_commandes_products;
DROP POLICY IF EXISTS "allow_update_bons_products" ON public.bons_commandes_products;
DROP POLICY IF EXISTS "allow_delete_bons_products" ON public.bons_commandes_products;

ALTER TABLE public.bons_commandes_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_view_bons_products" ON public.bons_commandes_products
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "allow_insert_bons_products" ON public.bons_commandes_products
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "allow_update_bons_products" ON public.bons_commandes_products
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "allow_delete_bons_products" ON public.bons_commandes_products
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ========================================================================
-- Step 5: Fix RLS policies for bons_commandes_offers table
-- ========================================================================

DROP POLICY IF EXISTS "allow_view_bons_offers" ON public.bons_commandes_offers;
DROP POLICY IF EXISTS "allow_insert_bons_offers" ON public.bons_commandes_offers;
DROP POLICY IF EXISTS "allow_update_bons_offers" ON public.bons_commandes_offers;
DROP POLICY IF EXISTS "allow_delete_bons_offers" ON public.bons_commandes_offers;

ALTER TABLE public.bons_commandes_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_view_bons_offers" ON public.bons_commandes_offers
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "allow_insert_bons_offers" ON public.bons_commandes_offers
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "allow_update_bons_offers" ON public.bons_commandes_offers
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "allow_delete_bons_offers" ON public.bons_commandes_offers
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ========================================================================
-- Step 6: Verify the policies are in place
-- ========================================================================
-- Run this query to verify all policies are correctly configured:

SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('bons_commandes', 'bons_commandes_products', 'bons_commandes_offers')
ORDER BY tablename, policyname;

-- ========================================================================
-- VERIFICATION CHECKLIST
-- ========================================================================
-- After running this script, verify:
-- 1. ✓ All RLS policies are created (8 policies total)
-- 2. ✓ All policies are PERMISSIVE (not RESTRICTIVE)
-- 3. ✓ All policies allow auth.role() = 'authenticated'
-- 4. ✓ No errors during policy creation
--
-- TESTING THE FIX:
-- 1. Go to the Achat (Purchase) profile
-- 2. Click "Convert" on a validated purchase command
-- 3. System should create a new bon_commande successfully
-- 4. No more 403 Forbidden errors in console
--
-- If errors still occur:
-- - Check Supabase Auth status (user must be logged in)
-- - Verify internet connection
-- - Clear browser cache and try again
-- - Check browser console for detailed error messages
--
-- ========================================================================
