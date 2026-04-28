-- ============================================================================
-- COMPLETE FIX FOR ENTERPRISE SETTINGS & LOGO - EXECUTE THIS ENTIRE FILE
-- ============================================================================
-- Purpose: Create enterprise_settings table with RLS, indexes, and triggers
-- Fixes: 406 Not Acceptable error + Database operations
-- Time: ~1 minute to execute
-- ============================================================================

-- STEP 1: Drop existing table if you want a fresh start (OPTIONAL - COMMENT OUT IF YOU WANT TO KEEP DATA)
-- DROP TABLE IF EXISTS public.enterprise_settings CASCADE;

-- STEP 2: Create enterprise_settings table
CREATE TABLE IF NOT EXISTS public.enterprise_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'ERP System',
  logo_url text,
  created_by_id uuid NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (created_by_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- STEP 3: Enable Row Level Security (RLS)
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

-- STEP 4: Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "select_own" ON public.enterprise_settings;
DROP POLICY IF EXISTS "insert_own" ON public.enterprise_settings;
DROP POLICY IF EXISTS "update_own" ON public.enterprise_settings;
DROP POLICY IF EXISTS "delete_own" ON public.enterprise_settings;

-- STEP 5: Create RLS Policies for secure data access
-- Policy 1: Users can SELECT their own enterprise settings
CREATE POLICY "select_own" ON public.enterprise_settings
  FOR SELECT
  USING (auth.uid() = created_by_id);

-- Policy 2: Users can INSERT their own enterprise settings
CREATE POLICY "insert_own" ON public.enterprise_settings
  FOR INSERT
  WITH CHECK (auth.uid() = created_by_id);

-- Policy 3: Users can UPDATE their own enterprise settings
CREATE POLICY "update_own" ON public.enterprise_settings
  FOR UPDATE
  USING (auth.uid() = created_by_id)
  WITH CHECK (auth.uid() = created_by_id);

-- Policy 4: Users can DELETE their own enterprise settings
CREATE POLICY "delete_own" ON public.enterprise_settings
  FOR DELETE
  USING (auth.uid() = created_by_id);

-- STEP 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_enterprise_settings_created_by 
  ON public.enterprise_settings(created_by_id);

CREATE INDEX IF NOT EXISTS idx_enterprise_settings_updated_at 
  ON public.enterprise_settings(updated_at);

-- STEP 7: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_enterprise_settings_updated_at ON public.enterprise_settings;
DROP FUNCTION IF EXISTS set_enterprise_settings_updated_at();

-- STEP 8: Create function to auto-update timestamp
CREATE OR REPLACE FUNCTION set_enterprise_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 9: Create trigger to auto-update timestamp on every UPDATE
CREATE TRIGGER set_enterprise_settings_updated_at
BEFORE UPDATE ON public.enterprise_settings
FOR EACH ROW
EXECUTE FUNCTION set_enterprise_settings_updated_at();

-- STEP 10: Add comments for documentation
COMMENT ON TABLE public.enterprise_settings IS 'Stores enterprise-wide settings including company name and logo URL';
COMMENT ON COLUMN public.enterprise_settings.company_name IS 'The enterprise/company name';
COMMENT ON COLUMN public.enterprise_settings.logo_url IS 'Public URL to the logo stored in Supabase Storage';
COMMENT ON COLUMN public.enterprise_settings.created_by_id IS 'The user ID who created this record';

-- ============================================================================
-- ✅ ALL SETUP COMPLETE - Now you must:
-- ============================================================================
-- 1. Execute this entire file in Supabase SQL Editor
-- 2. Wait for all statements to complete (should show ✅ for each)
-- 3. Then create a storage bucket named "logos" (see instructions below)
-- 4. Then refresh your browser
-- ============================================================================

-- STORAGE BUCKET SETUP (Manual - Follow these steps in Supabase Dashboard):
-- ============================================================================
-- LOCATION: Supabase Dashboard → Storage (left menu)
-- 
-- STEPS:
--   1. Click "Create new bucket"
--   2. Enter name: logos (lowercase, no spaces)
--   3. IMPORTANT: Uncheck the box "Make it private" 
--      (It MUST show "Public" when created)
--   4. Click "Create bucket"
--   5. Done! Now the bucket is ready to receive logo files
--
-- ============================================================================

-- VERIFICATION: Run these queries to verify everything is set up correctly
-- ============================================================================
-- Verify table exists:
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'enterprise_settings'
) AS table_exists;

-- Verify RLS is enabled:
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'enterprise_settings';

-- Verify policies exist:
SELECT policyname FROM pg_policies WHERE tablename = 'enterprise_settings';

-- Verify indexes exist:
SELECT indexname FROM pg_indexes WHERE tablename = 'enterprise_settings';

-- ============================================================================
-- NEXT STEPS FOR USER:
-- ============================================================================
-- 1. Execute this SQL file (Ctrl+Enter or Run button)
-- 2. Verify all statements show ✅
-- 3. Go to Storage and create bucket named "logos" (PUBLIC)
-- 4. Refresh browser (F5)
-- 5. Go to Settings page
-- 6. Upload logo
-- 7. Logo will display in:
--    - Navbar (top) as circle (28x28px)
--    - Sidebar (left) as square (36x36px)
--    - Settings page as preview (128x128px)
-- ============================================================================
