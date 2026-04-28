-- ============================================
-- FIX: Separate Bon Products from Purchase Products
-- ============================================
-- This script fixes the issue where purchase command products were being 
-- displayed in the "Produits et Offres Enregistrés" tab instead of only
-- in the "Produits de Commande d'Achat" tab
--
-- The problem: When creating a bon from a purchase command, products were 
-- automatically inserted into bons_commandes_products table.
-- 
-- The solution: Remove those auto-inserted products (identified by unity_price = 0)
-- and ensure they only appear in purchase_command_products table.
-- ============================================

-- ============================================
-- STEP 1: IDENTIFY PRODUCTS TO REMOVE
-- ============================================
-- These are products that were auto-inserted with unity_price = 0
-- They should only exist in purchase_command_products, not bons_commandes_products

SELECT 
  bp.id,
  bp.bon_commande_id,
  bp.product_name,
  bp.quantity,
  bp.unity_price,
  b.bon_id,
  b.supplier_name,
  b.status
FROM public.bons_commandes_products bp
INNER JOIN public.bons_commandes b ON b.id = bp.bon_commande_id
WHERE bp.unity_price = 0
AND bp.subtotal = 0
AND bp.total_with_tva = 0
ORDER BY b.created_at DESC, bp.product_name;

-- ============================================
-- STEP 2: VERIFY THESE PRODUCTS EXIST IN PURCHASE_COMMAND_PRODUCTS
-- ============================================
-- Check that the products exist in the source table
SELECT DISTINCT
  pcp.product_name,
  COUNT(*) as count
FROM public.purchase_command_products pcp
WHERE pcp.product_name IN (
  SELECT DISTINCT bp.product_name
  FROM public.bons_commandes_products bp
  WHERE bp.unity_price = 0
)
GROUP BY pcp.product_name
ORDER BY pcp.product_name;

-- ============================================
-- STEP 3: DELETE UNWANTED PRODUCTS FROM BON TABLE
-- ============================================
-- WARNING: This will delete all products with unity_price = 0 from bons_commandes_products
-- These are the auto-inserted purchase products that should not be there

-- BACKUP FIRST: Check count before deletion
SELECT COUNT(*) as products_to_delete
FROM public.bons_commandes_products
WHERE unity_price = 0
AND subtotal = 0
AND total_with_tva = 0;

-- DELETE the products
DELETE FROM public.bons_commandes_products
WHERE unity_price = 0
AND subtotal = 0
AND total_with_tva = 0;

-- ============================================
-- STEP 4: RECALCULATE BON TOTALS
-- ============================================
-- Update bons_commandes totals to reflect the removed products

UPDATE public.bons_commandes
SET 
  total_without_tva = COALESCE(
    (SELECT SUM(subtotal) FROM public.bons_commandes_products 
     WHERE bon_commande_id = public.bons_commandes.id),
    0
  ),
  total_with_tva = COALESCE(
    (SELECT SUM(total_with_tva) FROM public.bons_commandes_products 
     WHERE bon_commande_id = public.bons_commandes.id),
    0
  ),
  total_price = COALESCE(
    (SELECT SUM(subtotal) FROM public.bons_commandes_products 
     WHERE bon_commande_id = public.bons_commandes.id),
    0
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  SELECT DISTINCT bon_commande_id 
  FROM public.bons_commandes_products
);

-- ============================================
-- STEP 5: VERIFY CLEANUP
-- ============================================
-- Verify that all remaining products in bons_commandes_products have non-zero prices
SELECT 
  b.bon_id,
  COUNT(bp.id) as product_count,
  b.total_with_tva,
  MIN(bp.unity_price) as min_price
FROM public.bons_commandes b
LEFT JOIN public.bons_commandes_products bp ON bp.bon_commande_id = b.id
GROUP BY b.id, b.bon_id, b.total_with_tva
HAVING MIN(bp.unity_price) = 0 OR MIN(bp.unity_price) IS NULL
ORDER BY b.created_at DESC;

-- ============================================
-- STEP 6: SUMMARY - Product counts by table
-- ============================================
-- This shows the final state:
-- - bons_commandes_products should have products with unity_price > 0 (manually added)
-- - purchase_command_products should have all original purchase products

SELECT 
  'bons_commandes_products (BON Products)' as source,
  COUNT(*) as total_products,
  COUNT(CASE WHEN unity_price > 0 THEN 1 END) as with_price,
  COUNT(CASE WHEN unity_price = 0 THEN 1 END) as without_price
FROM public.bons_commandes_products
UNION ALL
SELECT 
  'purchase_command_products (Purchase Products)',
  COUNT(*),
  COUNT(CASE WHEN price > 0 THEN 1 END),
  COUNT(CASE WHEN price = 0 OR price IS NULL THEN 1 END)
FROM public.purchase_command_products;

-- ============================================
-- STEP 7: FINAL VERIFICATION
-- ============================================
-- List all bons with their product counts

SELECT 
  b.bon_id,
  b.supplier_name,
  b.status,
  COUNT(DISTINCT bp.id) as bon_products_count,
  SUM(bp.total_with_tva) as bon_total,
  CASE 
    WHEN b.purchase_command_id IS NOT NULL THEN 1 
    ELSE 0 
  END as has_purchase_command
FROM public.bons_commandes b
LEFT JOIN public.bons_commandes_products bp ON bp.bon_commande_id = b.id
GROUP BY b.id, b.bon_id, b.supplier_name, b.status, b.purchase_command_id
ORDER BY b.created_at DESC;
