-- ============================================================================
-- FIX_PAYMENT_ORDERS_RLS_SIMPLE.sql
-- ============================================================================
-- SIMPLIFIED VERSION - Use this if the main SQL has issues
-- PURPOSE: Fix 403 Forbidden errors on payment_orders table
-- SOLUTION: Replace with simple auth.role() = 'authenticated' checks
-- ============================================================================

-- ============================================================================
-- STEP 1: ENSURE RLS IS ENABLED
-- ============================================================================
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_commandes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: CREATE NEW PERMISSIVE POLICIES FOR payment_orders
-- ============================================================================
-- These policies allow ALL AUTHENTICATED users
-- This is more permissive but still requires user to be logged in

-- SELECT Policy for payment_orders
CREATE POLICY "payment_orders_select_authenticated"
  ON public.payment_orders
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT Policy for payment_orders
CREATE POLICY "payment_orders_insert_authenticated"
  ON public.payment_orders
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE Policy for payment_orders
CREATE POLICY "payment_orders_update_authenticated"
  ON public.payment_orders
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- DELETE Policy for payment_orders
CREATE POLICY "payment_orders_delete_authenticated"
  ON public.payment_orders
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 3: CREATE SELECT POLICY FOR bons_commandes (dropdown search)
-- ============================================================================
-- The payment_orders interface queries bons_commandes for the search dropdown

CREATE POLICY "bons_commandes_select_authenticated"
  ON public.bons_commandes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 4: VERIFY RLS IS ENABLED
-- ============================================================================
SELECT 
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅ RLS ENABLED' ELSE '❌ RLS DISABLED' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('payment_orders', 'bons_commandes')
ORDER BY tablename;

-- ============================================================================
-- STEP 5: LIST ALL ACTIVE POLICIES
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('payment_orders', 'bons_commandes')
ORDER BY tablename, policyname;

-- ============================================================================
-- COMPLETION CHECKLIST
-- ============================================================================
-- After running this SQL, verify:
-- 
-- ✅ Query executed successfully (no red error messages)
-- ✅ RLS is enabled on payment_orders (rowsecurity = t)
-- ✅ RLS is enabled on bons_commandes (rowsecurity = t)
-- ✅ At least 4-5 policies created
-- ✅ All policies use auth.role() = 'authenticated' condition
-- 
-- Then in React App:
-- ✅ Refresh page (F5)
-- ✅ Check console: NO 403 Forbidden errors
-- ✅ Navigate to "Ordres de Paiement"
-- ✅ See "Aucune donnée" OR list of payment orders
-- ✅ Search dropdown works for bon de commande
-- ✅ Can create/edit/delete payment orders

-- ============================================================================
