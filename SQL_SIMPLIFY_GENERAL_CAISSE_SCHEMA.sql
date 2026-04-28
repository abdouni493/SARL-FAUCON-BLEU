-- ============================================
-- SIMPLIFY GENERAL CASH BOX SCHEMA
-- ============================================
-- This migration simplifies the general_cash_box table
-- to focus on core transaction types: Encaissement (income) and Décaissement (expense)

-- ============================================
-- STEP 1: Update existing records if needed
-- ============================================
-- Consolidate transaction types to: versement (Encaissement) or retrait (Décaissement)
UPDATE public.general_cash_box 
SET transaction_type = 'retrait' 
WHERE transaction_type = 'dépense';

-- ============================================
-- STEP 2: Make category and reference_project_box_id optional
-- ============================================
-- These columns are already nullable, so no changes needed
-- The schema will allow NULL values for category and reference_project_box_id

-- ============================================
-- STEP 3: Verify the schema is correct
-- ============================================
-- The general_cash_box table should have:
-- - id (UUID)
-- - transaction_id (VARCHAR)
-- - amount (DECIMAL)
-- - transaction_type (VARCHAR) - values: 'versement' (Encaissement) or 'retrait' (Décaissement)
-- - description (TEXT)
-- - transaction_date (DATE)
-- - category (VARCHAR) - OPTIONAL (can be NULL)
-- - reference_project_box_id (UUID) - OPTIONAL (can be NULL)
-- - created_at (TIMESTAMP)
-- - created_by_id (UUID)

-- ============================================
-- REFERENCE: Current Simplified Schema
-- ============================================
/*
CREATE TABLE public.general_cash_box (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id character varying NOT NULL UNIQUE,
  amount numeric NOT NULL,
  transaction_type character varying,
  description text NOT NULL,
  transaction_date date NOT NULL,
  category character varying,
  reference_project_box_id uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by_id uuid,
  CONSTRAINT general_cash_box_pkey PRIMARY KEY (id),
  CONSTRAINT general_cash_box_reference_project_box_id_fkey FOREIGN KEY (reference_project_box_id) REFERENCES public.project_boxes(id),
  CONSTRAINT general_cash_box_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES auth.users(id)
);
*/

-- ============================================
-- TRANSACTION TYPE MEANINGS (Updated)
-- ============================================
-- versement  => Encaissement (Income/Receipt) - Money coming IN
-- retrait    => Décaissement (Expense/Withdrawal) - Money going OUT
-- (dépense   => Consolidated to 'retrait' for simplicity)

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check transaction types in the database:
-- SELECT DISTINCT transaction_type FROM public.general_cash_box;

-- Check distribution of transaction types:
-- SELECT 
--   transaction_type,
--   COUNT(*) as count,
--   SUM(amount) as total
-- FROM public.general_cash_box
-- GROUP BY transaction_type
-- ORDER BY transaction_type;

-- Check for NULL categories and projects:
-- SELECT 
--   COUNT(CASE WHEN category IS NULL THEN 1 END) as null_categories,
--   COUNT(CASE WHEN reference_project_box_id IS NULL THEN 1 END) as null_projects,
--   COUNT(*) as total_transactions
-- FROM public.general_cash_box;
