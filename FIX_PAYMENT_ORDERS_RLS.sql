-- CRITICAL: Fix RLS policies for payment_orders table
-- Run this in Supabase SQL Editor to enable access for all authenticated users

-- Step 1: Drop existing restrictive policies
DROP POLICY IF EXISTS "payment_orders_select_own" ON public.payment_orders;
DROP POLICY IF EXISTS "payment_orders_insert_own" ON public.payment_orders;
DROP POLICY IF EXISTS "payment_orders_update_own" ON public.payment_orders;
DROP POLICY IF EXISTS "payment_orders_delete_own" ON public.payment_orders;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.payment_orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.payment_orders;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.payment_orders;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.payment_orders;

-- Step 2: Disable RLS temporarily to ensure clean slate
ALTER TABLE public.payment_orders DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Step 4: Create comprehensive policies for authenticated users
-- SELECT: All authenticated users can read payment orders
CREATE POLICY "Enable read access for all authenticated users"
ON public.payment_orders
FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT: Authenticated users can create payment orders
CREATE POLICY "Enable insert for authenticated users"
ON public.payment_orders
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Users can update payment orders
CREATE POLICY "Enable update for authenticated users"
ON public.payment_orders
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- DELETE: Users can delete payment orders
CREATE POLICY "Enable delete for authenticated users"
ON public.payment_orders
FOR DELETE
USING (auth.role() = 'authenticated');

-- Step 5: Fix bons_commandes RLS
DROP POLICY IF EXISTS "bons_commandes_select" ON public.bons_commandes;
DROP POLICY IF EXISTS "Enable read access for bons_commandes" ON public.bons_commandes;

-- Disable and re-enable RLS on bons_commandes
ALTER TABLE public.bons_commandes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_commandes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read bons_commandes
CREATE POLICY "Enable read access for bons_commandes"
ON public.bons_commandes
FOR SELECT
USING (auth.role() = 'authenticated');

-- Step 6: Verify RLS is enabled and check policies
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND (tablename = 'payment_orders' OR tablename = 'bons_commandes');

-- Step 7: List all active policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND (tablename = 'payment_orders' OR tablename = 'bons_commandes')
ORDER BY tablename, policyname;
