-- Delete data from Bons Commandes respecting foreign key constraints
-- Execute these queries in order to avoid foreign key violations

-- Step 1: Delete from payment_orders (references bons_commandes via bon_commande_id)
DELETE FROM public.payment_orders;

-- Step 2: Delete from bons_commandes_products (references bons_commandes via bon_commande_id)
DELETE FROM public.bons_commandes_products;

-- Step 3: Delete from bons_commandes (main table)
DELETE FROM public.bons_commandes;

-- Verify deletions
SELECT 
  'bons_commandes' as table_name,
  COUNT(*) as record_count
FROM public.bons_commandes
UNION ALL
SELECT 
  'bons_commandes_products' as table_name,
  COUNT(*) as record_count
FROM public.bons_commandes_products
UNION ALL
SELECT 
  'payment_orders' as table_name,
  COUNT(*) as record_count
FROM public.payment_orders;
