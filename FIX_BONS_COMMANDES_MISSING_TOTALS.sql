-- Fix Bons Commandes Totals - Calculate missing totals from products
-- This migration updates all bons_commandes records with 0 DA totals
-- by calculating the actual totals from their bons_commandes_products records

-- Step 1: Create a temporary view with calculated totals
CREATE OR REPLACE VIEW bon_commandes_totals_view AS
SELECT 
  bc.id,
  COALESCE(SUM(bcp.subtotal), 0) as calculated_total_without_tva,
  COALESCE(SUM(bcp.tva_amount), 0) as calculated_total_tva,
  COALESCE(SUM(bcp.total_with_tva), 0) as calculated_total_with_tva
FROM public.bons_commandes bc
LEFT JOIN public.bons_commandes_products bcp ON bc.id = bcp.bon_commande_id
GROUP BY bc.id;

-- Step 2: Update bons_commandes with calculated totals from products
-- Only update records where:
-- 1. They have products (subtotal > 0), AND
-- 2. Their current totals are 0 (meaning they were never calculated)
UPDATE public.bons_commandes bc
SET 
  total_without_tva = CASE 
    WHEN bctv.calculated_total_without_tva > 0 THEN bctv.calculated_total_without_tva
    ELSE bc.total_without_tva
  END,
  total_with_tva = CASE 
    WHEN bctv.calculated_total_with_tva > 0 THEN bctv.calculated_total_with_tva
    ELSE bc.total_with_tva
  END,
  total_price = CASE 
    WHEN bctv.calculated_total_with_tva > 0 THEN bctv.calculated_total_with_tva
    ELSE bc.total_price
  END,
  updated_at = NOW()
FROM bon_commandes_totals_view bctv
WHERE bc.id = bctv.id
  AND bc.total_with_tva = 0  -- Only update records with 0 DA
  AND bctv.calculated_total_with_tva > 0;  -- And they have products to calculate from

-- Step 3: Verify the update
SELECT 
  COUNT(*) as total_bons,
  COUNT(CASE WHEN total_with_tva > 0 THEN 1 END) as bons_with_totals,
  COUNT(CASE WHEN total_with_tva = 0 THEN 1 END) as bons_without_totals,
  AVG(total_with_tva) as average_total,
  MIN(total_with_tva) as min_total,
  MAX(total_with_tva) as max_total
FROM public.bons_commandes;

-- Step 4: Show example of updated records
SELECT 
  bon_id,
  supplier_name,
  total_without_tva,
  total_with_tva,
  status,
  updated_at
FROM public.bons_commandes
WHERE total_with_tva > 0
ORDER BY updated_at DESC
LIMIT 10;

-- Step 5: Show any bons that still have 0 totals (should be empty or have no products)
SELECT 
  bc.id,
  bc.bon_id,
  bc.supplier_name,
  bc.total_with_tva,
  COUNT(bcp.id) as product_count
FROM public.bons_commandes bc
LEFT JOIN public.bons_commandes_products bcp ON bc.id = bcp.bon_commande_id
WHERE bc.total_with_tva = 0
GROUP BY bc.id, bc.bon_id, bc.supplier_name, bc.total_with_tva;
