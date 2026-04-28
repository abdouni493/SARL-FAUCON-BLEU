-- ============================================================
-- ENTERPRISE SETTINGS TABLE SETUP - CLEAN VERSION
-- Run this in Supabase SQL Editor to fix 406 errors
-- ============================================================

-- Step 1: DROP existing table
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

-- Step 4: Create SELECT policy
CREATE POLICY enterprise_settings_select
ON public.enterprise_settings
FOR SELECT
USING (auth.uid() = created_by_id);

-- Step 5: Create INSERT policy
CREATE POLICY enterprise_settings_insert
ON public.enterprise_settings
FOR INSERT
WITH CHECK (auth.uid() = created_by_id);

-- Step 6: Create UPDATE policy
CREATE POLICY enterprise_settings_update
ON public.enterprise_settings
FOR UPDATE
USING (auth.uid() = created_by_id)
WITH CHECK (auth.uid() = created_by_id);

-- Step 7: Create DELETE policy
CREATE POLICY enterprise_settings_delete
ON public.enterprise_settings
FOR DELETE
USING (auth.uid() = created_by_id);

-- Step 8: Create index for performance
CREATE INDEX idx_enterprise_settings_created_by 
ON public.enterprise_settings(created_by_id);

-- Step 9: Create function for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.update_enterprise_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create trigger
DROP TRIGGER IF EXISTS trigger_enterprise_settings_updated_at ON public.enterprise_settings;
CREATE TRIGGER trigger_enterprise_settings_updated_at
BEFORE UPDATE ON public.enterprise_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_enterprise_settings_updated_at();
