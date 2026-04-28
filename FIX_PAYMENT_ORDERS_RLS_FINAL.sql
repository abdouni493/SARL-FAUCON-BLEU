-- ============================================================================
-- FIX_PAYMENT_ORDERS_RLS_FINAL.sql
-- ============================================================================
-- PURPOSE: Fix 403 Forbidden errors on payment_orders table
-- ISSUE: Subquery-based RLS policies are too restrictive on Supabase
-- SOLUTION: Replace with simple auth.role() = 'authenticated' checks
-- ============================================================================

-- STEP 1: REMOVE OLD RESTRICTIVE POLICIES (safer approach)
-- Try to remove policies with exact names - if they don't exist, that's OK
BEGIN;

-- Drop old payment_orders policies (Supabase-safe approach)
DO $$
BEGIN
  -- Try to drop each policy individually
  BEGIN
    DROP POLICY "Authorized users can view all payment orders" ON public.payment_orders;
  EXCEPTION WHEN UNDEFINED_OBJECT THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY "Authorized users can create payment orders" ON public.payment_orders;
  EXCEPTION WHEN UNDEFINED_OBJECT THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY "Authorized users can update payment orders" ON public.payment_orders;
  EXCEPTION WHEN UNDEFINED_OBJECT THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY "Authorized users can delete payment orders" ON public.payment_orders;
  EXCEPTION WHEN UNDEFINED_OBJECT THEN
    NULL;
  END;
  
  -- Try to drop old bons_commandes policies
  BEGIN
    DROP POLICY "allow_view_bons_commandes" ON public.bons_commandes;
  EXCEPTION WHEN UNDEFINED_OBJECT THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY "allow_insert_bons_commandes" ON public.bons_commandes;
  EXCEPTION WHEN UNDEFINED_OBJECT THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY "allow_update_bons_commandes" ON public.bons_commandes;
  EXCEPTION WHEN UNDEFINED_OBJECT THEN
    NULL;
  END;
  
  BEGIN
    DROP POLICY "allow_delete_bons_commandes" ON public.bons_commandes;
  EXCEPTION WHEN UNDEFINED_OBJECT THEN
    NULL;
  END;
  
END $$;

COMMIT;

-- ============================================================================
-- STEP 2: ENSURE RLS IS ENABLED (clean slate)
-- ============================================================================
ALTER TABLE public.payment_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bons_commandes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_commandes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: CREATE NEW PERMISSIVE POLICIES FOR payment_orders
-- ============================================================================
-- These policies allow ALL AUTHENTICATED users (not just specific roles)
-- This is more permissive but still requires user to be logged in

-- POLICY 1: SELECT - All authenticated users can read payment orders
CREATE POLICY "payment_orders_select_authenticated"
  ON public.payment_orders
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- POLICY 2: INSERT - Authenticated users can create payment orders
CREATE POLICY "payment_orders_insert_authenticated"
  ON public.payment_orders
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- POLICY 3: UPDATE - Authenticated users can update payment orders
CREATE POLICY "payment_orders_update_authenticated"
  ON public.payment_orders
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- POLICY 4: DELETE - Authenticated users can delete payment orders
CREATE POLICY "payment_orders_delete_authenticated"
  ON public.payment_orders
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 4: CREATE POLICIES FOR bons_commandes (dropdown search)
-- ============================================================================
-- The payment_orders interface queries bons_commandes for the search dropdown
-- This table needs a SELECT policy to allow the search to work

-- POLICY 5: SELECT - All authenticated users can read bons_commandes
CREATE POLICY "bons_commandes_select_authenticated"
  ON public.bons_commandes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 5: VERIFY RLS IS ENABLED (checking phase)
-- ============================================================================
-- Run these queries to confirm RLS is properly enabled
-- Expected: both should show 't' (true) for rowsecurity column

-- Check RLS status on both tables
SELECT 
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅ RLS ENABLED' ELSE '❌ RLS DISABLED' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('payment_orders', 'bons_commandes')
ORDER BY tablename;

-- ============================================================================
-- STEP 6: LIST ALL ACTIVE POLICIES (verification phase)
-- ============================================================================
-- Run this to see all the policies we just created
-- Expected: 5 total policies (4 for payment_orders, 1 for bons_commandes)

SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN qual IS NOT NULL THEN 'Restrictive'
    ELSE 'Permissive'
  END as policy_type
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('payment_orders', 'bons_commandes')
ORDER BY tablename, policyname;

-- ============================================================================
-- STEP 7: TEST QUERIES (after executing this SQL, run these in a new query)
-- ============================================================================
-- Uncomment and run these queries to test access to both tables

-- Test 1: Count payment orders (SELECT test)
-- SELECT COUNT(*) as payment_order_count FROM payment_orders;
-- Expected: 0 or N (no 403 error)

-- Test 2: Count bons commandes (SELECT test)
-- SELECT COUNT(*) as bons_count FROM bons_commandes;
-- Expected: 0 or N (no 403 error)

-- Test 3: List bons commandes with relevant fields (for dropdown search)
-- SELECT id, bon_id, total_price FROM bons_commandes LIMIT 5;
-- Expected: rows returned with no 403 error

-- ============================================================================
-- COMPLETION CHECKLIST
-- ============================================================================
-- After running this SQL, check:
-- 
-- ✅ Query executed successfully (no red error messages)
-- ✅ RLS is enabled on payment_orders (rowsecurity = t)
-- ✅ RLS is enabled on bons_commandes (rowsecurity = t)
-- ✅ 5 policies created (4 for payment_orders, 1 for bons_commandes)
-- ✅ All policies use auth.role() = 'authenticated' condition
-- 
-- Then in React App:
-- ✅ Refresh page (F5)
-- ✅ Check console: NO 403 Forbidden errors
-- ✅ Navigate to "Ordres de Paiement"
-- ✅ See "Aucune donnée" OR list of payment orders (if records exist)
-- ✅ Search dropdown works for bon de commande
-- ✅ Can create payment order
-- ✅ Can edit payment order
-- ✅ Can delete payment order
-- ✅ Can validate payment order

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================
-- If you still see 403 errors after running this SQL:
--
-- 1. VERIFY RLS WAS ACTUALLY ENABLED:
--    Run: SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('payment_orders', 'bons_commandes');
--    Should show: rowsecurity = t (true) for both tables
--
-- 2. VERIFY POLICIES WERE CREATED:
--    Run: SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('payment_orders', 'bons_commandes');
--    Should show: 5 total policies (4 for payment_orders, 1 for bons_commandes)
--
-- 3. VERIFY USER IS AUTHENTICATED:
--    Check browser console: "Logged in with Supabase: [username]"
--    If not logged in, you cannot access any data
--
-- 4. HARD REFRESH BROWSER:
--    Press Ctrl+Shift+Delete (Windows) to clear cache, then refresh page
--    Or press Ctrl+F5 (full refresh)
--
-- 5. CHECK BROWSER DEVTOOLS NETWORK TAB:
--    Look at the GET request to payment_orders
--    Status should be 200 (not 403) after SQL is applied
--
-- ============================================================================
