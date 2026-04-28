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
