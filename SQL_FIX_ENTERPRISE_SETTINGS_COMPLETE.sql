-- ============================================================
-- COMPLETE ENTERPRISE SETTINGS TABLE SETUP
-- Run this in Supabase SQL Editor to fix 406 errors
-- ============================================================

-- Step 1: DROP existing table (clean start)
DROP TABLE IF EXISTS public.enterprise_settings CASCADE;

-- Step 2: Create table with correct schema
CREATE TABLE public.enterprise_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_url character varying,
  company_name character varying NOT NULL DEFAULT 'ERP System',
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_created_by UNIQUE(created_by_id)
);

-- Step 3: Enable RLS
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies (ALL FOUR REQUIRED)
CREATE POLICY "Users can select their own enterprise settings"
ON public.enterprise_settings
FOR SELECT
TO authenticated
USING (auth.uid() = created_by_id);

CREATE POLICY "Users can insert their own enterprise settings"
ON public.enterprise_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by_id);

CREATE POLICY "Users can update their own enterprise settings"
ON public.enterprise_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by_id)
WITH CHECK (auth.uid() = created_by_id);

CREATE POLICY "Users can delete their own enterprise settings"
ON public.enterprise_settings
FOR DELETE
TO authenticated
USING (auth.uid() = created_by_id);

-- Step 5: Create index for performance
CREATE INDEX idx_enterprise_settings_created_by 
ON public.enterprise_settings(created_by_id);

-- Step 6: Create function for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.update_enterprise_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger
CREATE TRIGGER trigger_enterprise_settings_updated_at
  BEFORE UPDATE ON public.enterprise_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_enterprise_settings_updated_at();

-- ============================================================
-- VERIFICATION QUERIES (run these to check everything works)
-- ============================================================

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'enterprise_settings'
ORDER BY ordinal_position;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'enterprise_settings';

-- Check policies exist
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'enterprise_settings'
ORDER BY policyname;

-- Check index exists
SELECT indexname
FROM pg_indexes
WHERE tablename = 'enterprise_settings';

-- ============================================================
-- EXPECTED RESULTS AFTER RUNNING THIS SQL:
-- ============================================================
-- Table created with columns:
--   id (uuid, primary key)
--   logo_url (varchar, nullable)
--   company_name (varchar, NOT NULL)
--   created_at (timestamp, NOT NULL)
--   updated_at (timestamp, NOT NULL)
--   created_by_id (uuid, NOT NULL) ← CRITICAL
--
-- RLS: enabled (rowsecurity = true)
-- 
-- Policies: 4 policies
--   - SELECT: allows user to view own settings
--   - INSERT: allows user to create own settings
--   - UPDATE: allows user to update own settings
--   - DELETE: allows user to delete own settings
--
-- Index: idx_enterprise_settings_created_by
--
-- Trigger: trigger_enterprise_settings_updated_at
--   (auto-updates updated_at when record changes)
