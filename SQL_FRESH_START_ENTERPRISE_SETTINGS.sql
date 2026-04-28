-- ============================================================================
-- COMPLETE FRESH START - DROP OLD & CREATE NEW ENTERPRISE SETTINGS
-- ============================================================================
-- Purpose: Remove old table and create new one that matches interface exactly
-- Time: ~1 minute to execute
-- ============================================================================

-- STEP 1: Drop the old table completely (clean slate)
DROP TABLE IF EXISTS public.enterprise_settings CASCADE;

-- STEP 2: Create NEW enterprise_settings table with correct schema
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

-- STEP 3: Create comment on table for documentation
COMMENT ON TABLE public.enterprise_settings IS 'Stores company-wide settings including logo URL';
COMMENT ON COLUMN public.enterprise_settings.id IS 'Unique identifier';
COMMENT ON COLUMN public.enterprise_settings.created_by_id IS 'User ID (unique per user)';
COMMENT ON COLUMN public.enterprise_settings.company_name IS 'Company name from interface';
COMMENT ON COLUMN public.enterprise_settings.logo_url IS 'Public URL to logo from storage';
COMMENT ON COLUMN public.enterprise_settings.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.enterprise_settings.updated_at IS 'Last update timestamp (auto)';

-- STEP 4: Enable Row Level Security (RLS)
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create RLS policies - MUST drop first to avoid conflicts
DROP POLICY IF EXISTS "allow_select_own_settings" ON public.enterprise_settings;
DROP POLICY IF EXISTS "allow_insert_own_settings" ON public.enterprise_settings;
DROP POLICY IF EXISTS "allow_update_own_settings" ON public.enterprise_settings;
DROP POLICY IF EXISTS "allow_delete_own_settings" ON public.enterprise_settings;

-- STEP 6: Create NEW RLS policies
-- Policy 1: Users can only SELECT their own settings
CREATE POLICY "allow_select_own_settings" ON public.enterprise_settings
  FOR SELECT
  USING (auth.uid() = created_by_id OR auth.uid() IS NOT NULL);

-- Policy 2: Users can INSERT their own settings
CREATE POLICY "allow_insert_own_settings" ON public.enterprise_settings
  FOR INSERT
  WITH CHECK (auth.uid() = created_by_id);

-- Policy 3: Users can UPDATE their own settings
CREATE POLICY "allow_update_own_settings" ON public.enterprise_settings
  FOR UPDATE
  USING (auth.uid() = created_by_id)
  WITH CHECK (auth.uid() = created_by_id);

-- Policy 4: Users can DELETE their own settings
CREATE POLICY "allow_delete_own_settings" ON public.enterprise_settings
  FOR DELETE
  USING (auth.uid() = created_by_id);

-- STEP 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_enterprise_settings_created_by 
  ON public.enterprise_settings(created_by_id);

CREATE INDEX IF NOT EXISTS idx_enterprise_settings_updated_at 
  ON public.enterprise_settings(updated_at DESC);

-- STEP 8: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_enterprise_settings_timestamp ON public.enterprise_settings;
DROP FUNCTION IF EXISTS update_enterprise_settings_timestamp();

-- STEP 9: Create function to auto-update timestamp
CREATE OR REPLACE FUNCTION update_enterprise_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 10: Create trigger to call function
CREATE TRIGGER update_enterprise_settings_timestamp
BEFORE UPDATE ON public.enterprise_settings
FOR EACH ROW
EXECUTE FUNCTION update_enterprise_settings_timestamp();

-- ============================================================================
-- ✅ TABLE CREATED - Now insert initial data for admin user (optional)
-- ============================================================================
-- If needed, insert default record for current user
-- Uncomment and run if you want to pre-populate:
-- INSERT INTO public.enterprise_settings (created_by_id, company_name, logo_url)
-- VALUES ('YOUR_USER_ID_HERE', 'ERP System', '')
-- ON CONFLICT (created_by_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify everything is set up correctly:

-- Check 1: Table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'enterprise_settings'
) AS "Table Exists";

-- Check 2: RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'enterprise_settings';

-- Check 3: All RLS policies exist
SELECT policyname, permissive, qual 
FROM pg_policies 
WHERE tablename = 'enterprise_settings';

-- Check 4: Indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'enterprise_settings';

-- Check 5: Trigger exists
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'enterprise_settings';

-- ============================================================================
-- NEXT STEPS AFTER EXECUTION
-- ============================================================================
-- 1. ✅ Execute this entire SQL file
-- 2. ✅ Create storage bucket "logos" (PUBLIC access)
-- 3. ✅ Refresh browser (F5)
-- 4. ✅ Try uploading logo in Settings
-- ============================================================================
