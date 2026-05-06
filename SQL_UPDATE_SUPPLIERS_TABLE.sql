-- SQL code to update the suppliers table with new columns
-- This adds the required columns: company_name, nis, nif, article, commercial_registration

-- Add the new columns to the suppliers table
ALTER TABLE public.suppliers
ADD COLUMN company_name character varying,
ADD COLUMN nif character varying,
ADD COLUMN nis character varying,
ADD COLUMN article character varying,
ADD COLUMN commercial_registration character varying;

-- Optional: If you want to add these columns with unique constraints or indexes
-- CREATE INDEX idx_suppliers_nif ON public.suppliers(nif) WHERE nif IS NOT NULL;
-- CREATE INDEX idx_suppliers_nis ON public.suppliers(nis) WHERE nis IS NOT NULL;
-- CREATE INDEX idx_suppliers_commercial_registration ON public.suppliers(commercial_registration) WHERE commercial_registration IS NOT NULL;

-- Verify the new columns were added
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'suppliers' ORDER BY ordinal_position;

-- ============================================
-- WORKER EXPENSES TABLE SCHEMA
-- ============================================
-- This table manages all worker-related expenses
-- Such as wages, bonuses, daily allowances, etc.

CREATE TABLE IF NOT EXISTS worker_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category VARCHAR(100),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  worker_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for faster queries
CREATE INDEX idx_worker_expenses_user_id ON worker_expenses(user_id);
CREATE INDEX idx_worker_expenses_date ON worker_expenses(expense_date DESC);
CREATE INDEX idx_worker_expenses_category ON worker_expenses(category);
CREATE INDEX idx_worker_expenses_created_at ON worker_expenses(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_worker_expenses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER worker_expenses_update_timestamp
BEFORE UPDATE ON worker_expenses
FOR EACH ROW
EXECUTE FUNCTION update_worker_expenses_timestamp();

-- Enable RLS (Row Level Security)
ALTER TABLE worker_expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own expenses
CREATE POLICY worker_expenses_user_access ON worker_expenses
FOR ALL USING (auth.uid() = user_id OR 
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'comptable', 'gestionnaire'));

-- Insert sample data (optional)
INSERT INTO worker_expenses (user_id, description, category, amount, expense_date, worker_name, notes) 
VALUES 
  (NULL, 'Salaire hebdomadaire - Équipe A', 'Salaire', 150000, '2026-03-20', 'Équipe construction', 'Semaine du 16-20 mars'),
  (NULL, 'Prime de rendement', 'Prime', 50000, '2026-03-19', 'Ali Hassan', 'Bonus mensuel'),
  (NULL, 'Indemnité de transport', 'Transport', 25000, '2026-03-18', 'Équipe logistique', 'Déplacement site'),
  (NULL, 'Allocations journalières', 'Allocations', 35000, '2026-03-17', 'Équipe technique', 'Frais divers')
ON CONFLICT DO NOTHING;

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


-- ============================================================
-- ENTERPRISE SETTINGS - SIMPLE FIX
-- Run this EXACTLY as shown
-- ============================================================

-- STEP 1: Drop and recreate
DROP TABLE IF EXISTS public.enterprise_settings CASCADE;

-- STEP 2: Create table
CREATE TABLE public.enterprise_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'ERP System',
  logo_url text,
  created_by_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(created_by_id)
);

-- STEP 3: Enable RLS
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

-- STEP 4: Simple SELECT policy
CREATE POLICY "select_own" ON public.enterprise_settings
FOR SELECT USING (auth.uid() = created_by_id);

-- STEP 5: Simple INSERT policy  
CREATE POLICY "insert_own" ON public.enterprise_settings
FOR INSERT WITH CHECK (auth.uid() = created_by_id);

-- STEP 6: Simple UPDATE policy
CREATE POLICY "update_own" ON public.enterprise_settings
FOR UPDATE USING (auth.uid() = created_by_id);

-- STEP 7: Simple DELETE policy
CREATE POLICY "delete_own" ON public.enterprise_settings
FOR DELETE USING (auth.uid() = created_by_id);

-- STEP 8: Index
CREATE INDEX idx_created_by ON public.enterprise_settings(created_by_id);

-- STEP 9: Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.enterprise_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.enterprise_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Done!
