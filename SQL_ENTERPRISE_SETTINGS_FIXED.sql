-- ============================================================================
-- ENTERPRISE SETTINGS - PRODUCTION SCHEMA (FIXED)
-- ============================================================================
-- This fixes all issues: 406 errors, RLS, upsert handling

DROP TABLE IF EXISTS public.enterprise_settings CASCADE;

CREATE TABLE public.enterprise_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_id uuid NOT NULL UNIQUE,
  company_name text NOT NULL DEFAULT 'ERP System',
  logo_url text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "allow_select_own_settings" ON public.enterprise_settings;
DROP POLICY IF EXISTS "allow_insert_own_settings" ON public.enterprise_settings;
DROP POLICY IF EXISTS "allow_update_own_settings" ON public.enterprise_settings;
DROP POLICY IF EXISTS "allow_delete_own_settings" ON public.enterprise_settings;

-- RLS Policies
CREATE POLICY "allow_select_own_settings" ON public.enterprise_settings
  FOR SELECT
  USING (auth.uid() = created_by_id);

CREATE POLICY "allow_insert_own_settings" ON public.enterprise_settings
  FOR INSERT
  WITH CHECK (auth.uid() = created_by_id);

CREATE POLICY "allow_update_own_settings" ON public.enterprise_settings
  FOR UPDATE
  USING (auth.uid() = created_by_id)
  WITH CHECK (auth.uid() = created_by_id);

CREATE POLICY "allow_delete_own_settings" ON public.enterprise_settings
  FOR DELETE
  USING (auth.uid() = created_by_id);

-- Indexes
CREATE INDEX idx_enterprise_settings_created_by ON public.enterprise_settings(created_by_id);
CREATE INDEX idx_enterprise_settings_updated_at ON public.enterprise_settings(updated_at DESC);

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS update_enterprise_settings_timestamp ON public.enterprise_settings;
DROP FUNCTION IF EXISTS update_enterprise_settings_timestamp();

CREATE OR REPLACE FUNCTION update_enterprise_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enterprise_settings_timestamp
BEFORE UPDATE ON public.enterprise_settings
FOR EACH ROW
EXECUTE FUNCTION update_enterprise_settings_timestamp();

-- Verification
SELECT 'Table created' AS status;
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'enterprise_settings';
SELECT policyname FROM pg_policies WHERE tablename = 'enterprise_settings';
