-- ============================================
-- QUICK REFERENCE: SQL COMMANDS TO RUN
-- ============================================
-- Copy and paste sections below directly into Supabase SQL Editor

-- SECTION 1: Run complete schema (All in one)
-- File: SQL_SCHEMA_BONS_COMMANDES_COMPLETE.sql
-- This creates all tables, indexes, triggers, and RLS policies
-- Time: ~30 seconds
-- Just open the file and run entire content

-- SECTION 2: Add Sample Suppliers
-- Run this to populate suppliers dropdown
INSERT INTO public.suppliers (name, email, phone, address, city, contact_person, is_active)
VALUES
  ('Global Supplies Inc', 'contact@globalsupply.com', '+213123456789', '123 Business St', 'Algiers', 'Ahmed Ali', TRUE),
  ('Regional Traders', 'sales@regionaltraders.dz', '+213987654321', '456 Commerce Ave', 'Oran', 'Fatima Zahra', TRUE),
  ('Local Hardware Co', 'info@localhardware.dz', '+213555123456', '789 Industrial Rd', 'Constantine', 'Mohammed Hassan', TRUE),
  ('Premium Equipment Ltd', 'sales@premiumequip.dz', '+213666777888', '321 Equipment Zone', 'Tlemcen', 'Hassan Ali', TRUE),
  ('Industrial Solutions', 'contact@industrialsol.dz', '+213444555666', '654 Factory St', 'Blida', 'Zahra Ahmed', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Verify suppliers were added
SELECT * FROM public.suppliers WHERE is_active = TRUE;

-- SECTION 3: Storage Policy (if not already created)
-- Allows authenticated users to upload to offers bucket
CREATE POLICY "Allow authenticated uploads 1i5ycnr_0" ON storage.objects 
FOR INSERT TO public 
WITH CHECK (bucket_id = 'offers');

-- Verify policy exists
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%offers%';

-- SECTION 4: Verify Tables Created
-- Run these to confirm all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bons_commandes', 'bons_commandes_products', 'bons_commandes_offers', 'suppliers')
ORDER BY table_name;

-- SECTION 5: Check RLS Policies
-- View all policies on main table
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'bons_commandes'
ORDER BY tablename, policyname;

-- SECTION 6: Test Insert (Create sample Bon)
-- This verifies the schema is working correctly
-- First, get a purchase_command_id
SELECT id FROM public.purchase_commands LIMIT 1;

-- Then create a test bon (replace UUID with actual purchase_command_id)
INSERT INTO public.bons_commandes (
  bon_id,
  purchase_command_id,
  supplier_name,
  status,
  total_price,
  total_without_tva,
  total_with_tva,
  created_by_id
)
VALUES (
  'BON-TEST-' || to_char(now(), 'YYYYMMDDHH24MISS'),
  '550e8400-e29b-41d4-a716-446655440004', -- Replace with real UUID
  'Test Supplier',
  'pending',
  0,
  0,
  0,
  '550e8400-e29b-41d4-a716-446655440001' -- Replace with real user UUID
);

-- Verify it was created
SELECT bon_id, supplier_name, status, created_at FROM public.bons_commandes ORDER BY created_at DESC LIMIT 1;

-- SECTION 7: Add Test Product to Bon
-- First get the bon_id from above query
-- Then add a product (replace bon_id UUID)
INSERT INTO public.bons_commandes_products (
  bon_commande_id,
  product_name,
  quantity,
  unity_price,
  is_active,
  tva_rate,
  subtotal,
  tva_amount,
  total_with_tva
)
VALUES (
  (SELECT id FROM public.bons_commandes ORDER BY created_at DESC LIMIT 1),
  'Test Product',
  10,
  1000.00,
  TRUE,
  19,
  10000.00,
  1900.00,
  11900.00
);

-- Verify product was added
SELECT product_name, quantity, unity_price, tva_rate, total_with_tva 
FROM public.bons_commandes_products 
WHERE is_active = TRUE
LIMIT 1;

-- SECTION 8: Add Test Offer
INSERT INTO public.bons_commandes_offers (
  bon_commande_id,
  supplier_name,
  offer_date,
  notes
)
VALUES (
  (SELECT id FROM public.bons_commandes ORDER BY created_at DESC LIMIT 1),
  'Test Supplier',
  NOW(),
  'Test offer note'
);

-- Verify offer was added
SELECT supplier_name, offer_date, notes 
FROM public.bons_commandes_offers 
ORDER BY offer_date DESC LIMIT 1;

-- SECTION 9: Check Totals Calculation
-- View complete bon with calculated totals
SELECT 
  b.bon_id,
  b.supplier_name,
  b.status,
  COUNT(p.id) as product_count,
  SUM(CASE WHEN p.is_active THEN p.subtotal ELSE 0 END) as total_without_tva,
  SUM(CASE WHEN p.is_active THEN p.total_with_tva ELSE 0 END) as total_with_tva
FROM public.bons_commandes b
LEFT JOIN public.bons_commandes_products p ON b.id = p.bon_commande_id
GROUP BY b.id, b.bon_id, b.supplier_name, b.status
ORDER BY b.created_at DESC;

-- SECTION 10: Clean Up Test Data (Optional)
-- Delete test records if needed
DELETE FROM public.bons_commandes_offers 
WHERE bon_commande_id IN (SELECT id FROM public.bons_commandes WHERE bon_id LIKE 'BON-TEST%');

DELETE FROM public.bons_commandes_products 
WHERE bon_commande_id IN (SELECT id FROM public.bons_commandes WHERE bon_id LIKE 'BON-TEST%');

DELETE FROM public.bons_commandes WHERE bon_id LIKE 'BON-TEST%';

-- SECTION 11: Backup Current Data (Before Major Changes)
-- Export current bons_commandes
COPY public.bons_commandes TO STDOUT;

-- Export current products
COPY public.bons_commandes_products TO STDOUT;

-- SECTION 12: Monitoring Queries
-- Check for any errors in recent operations
SELECT table_name, pg_size_pretty(pg_total_relation_size(schemaname||'.'||table_name)) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'bons%'
ORDER BY pg_total_relation_size(schemaname||'.'||table_name) DESC;

-- Count records in each table
SELECT 
  'bons_commandes' as table_name,
  COUNT(*) as record_count
FROM public.bons_commandes
UNION ALL
SELECT 
  'bons_commandes_products',
  COUNT(*)
FROM public.bons_commandes_products
UNION ALL
SELECT 
  'bons_commandes_offers',
  COUNT(*)
FROM public.bons_commandes_offers
UNION ALL
SELECT 
  'suppliers',
  COUNT(*)
FROM public.suppliers;

-- ============================================
-- EXECUTION ORDER
-- ============================================
-- 1. Run full SQL_SCHEMA_BONS_COMMANDES_COMPLETE.sql file
-- 2. Run SECTION 2 (Add Sample Suppliers)
-- 3. Run SECTION 4 (Verify Tables Created)
-- 4. Run SECTION 5 (Check RLS Policies)
-- 5. Run SECTION 6-7 (Test Insert - verify schema works)
-- 6. Deploy frontend code
-- 7. Test application

-- ============================================
-- COMMON ISSUES & SOLUTIONS
-- ============================================

-- Issue: "relation does not exist"
-- Solution: Run full SQL schema first (SQL_SCHEMA_BONS_COMMANDES_COMPLETE.sql)

-- Issue: "permission denied"
-- Solution: Check RLS policies with SECTION 5, may need to grant permissions

-- Issue: "duplicate key value"
-- Solution: Supplier names must be unique, check existing suppliers:
SELECT DISTINCT name FROM public.suppliers ORDER BY name;

-- Issue: "storage bucket not found"
-- Solution: Create bucket manually or use Supabase Dashboard > Storage > Create Bucket
-- Bucket name must be exactly: offers

-- Issue: "UUID type invalid"
-- Solution: Replace sample UUIDs with real values from your database
-- Get real UUID examples:
SELECT id FROM public.purchase_commands LIMIT 1;
SELECT id FROM auth.users LIMIT 1;

-- ============================================
-- DATABASE STATISTICS
-- ============================================

-- View table structure
\d public.bons_commandes
\d public.bons_commandes_products
\d public.bons_commandes_offers
\d public.suppliers

-- View all indexes
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('bons_commandes', 'bons_commandes_products', 'bons_commandes_offers', 'suppliers');

-- View all triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- FINAL VALIDATION
-- ============================================

-- Everything should be set up if all these return results:

-- 1. Tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('bons_commandes', 'bons_commandes_products', 'bons_commandes_offers', 'suppliers');
-- Expected: 4

-- 2. Suppliers exist
SELECT COUNT(*) FROM public.suppliers WHERE is_active = TRUE;
-- Expected: >= 1

-- 3. Indexes exist
SELECT COUNT(*) FROM pg_indexes 
WHERE tablename IN ('bons_commandes', 'bons_commandes_products', 'bons_commandes_offers');
-- Expected: >= 6

-- 4. Triggers exist
SELECT COUNT(*) FROM information_schema.triggers
WHERE trigger_schema = 'public';
-- Expected: >= 3

-- 5. RLS policies exist
SELECT COUNT(*) FROM pg_policies 
WHERE tablename IN ('bons_commandes', 'bons_commandes_products', 'bons_commandes_offers', 'suppliers');
-- Expected: >= 8

-- ALL CHECKS PASSED = Database Ready! ✅

