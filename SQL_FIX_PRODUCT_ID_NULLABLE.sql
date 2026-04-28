-- ============================================================================
-- SQL Fix - Make product_id nullable in reclamation_products
-- Execute this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop the NOT NULL constraint on product_id
ALTER TABLE public.reclamation_products
ALTER COLUMN product_id DROP NOT NULL;

-- Step 2: Drop the foreign key constraint on product_id (it references command_products which we don't use)
ALTER TABLE public.reclamation_products
DROP CONSTRAINT IF EXISTS reclamation_products_product_id_fkey;

-- Verify changes
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'reclamation_products' ORDER BY ordinal_position;
