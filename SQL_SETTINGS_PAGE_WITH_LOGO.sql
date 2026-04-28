-- SQL Setup for Settings Page with Logo Storage Support
-- This ensures the enterprise_settings table is properly configured for logo storage
-- Run this in Supabase SQL Editor

-- 1. Create enterprise_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.enterprise_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'ERP System',
  logo_url text,
  created_by_id uuid NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (created_by_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Enable Row Level Security
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies if they don't exist
-- Drop existing policies if you want to recreate them
DROP POLICY IF EXISTS "select_own" ON public.enterprise_settings;
DROP POLICY IF EXISTS "insert_own" ON public.enterprise_settings;
DROP POLICY IF EXISTS "update_own" ON public.enterprise_settings;
DROP POLICY IF EXISTS "delete_own" ON public.enterprise_settings;

-- Allow users to SELECT their own settings
CREATE POLICY "select_own" ON public.enterprise_settings
  FOR SELECT
  USING (auth.uid() = created_by_id);

-- Allow users to INSERT their own settings
CREATE POLICY "insert_own" ON public.enterprise_settings
  FOR INSERT
  WITH CHECK (auth.uid() = created_by_id);

-- Allow users to UPDATE their own settings
CREATE POLICY "update_own" ON public.enterprise_settings
  FOR UPDATE
  USING (auth.uid() = created_by_id)
  WITH CHECK (auth.uid() = created_by_id);

-- Allow users to DELETE their own settings
CREATE POLICY "delete_own" ON public.enterprise_settings
  FOR DELETE
  USING (auth.uid() = created_by_id);

-- 4. Create index on created_by_id for performance
CREATE INDEX IF NOT EXISTS idx_enterprise_settings_created_by 
  ON public.enterprise_settings(created_by_id);

-- 5. Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_enterprise_settings_updated_at 
  ON public.enterprise_settings(updated_at);

-- 6. Create trigger function for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_enterprise_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to call the function
DROP TRIGGER IF EXISTS set_enterprise_settings_updated_at ON public.enterprise_settings;
CREATE TRIGGER set_enterprise_settings_updated_at
  BEFORE UPDATE ON public.enterprise_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_enterprise_settings_updated_at();

-- 8. Ensure Storage bucket exists for logos (must be configured in Supabase UI)
-- Go to Supabase Dashboard -> Storage -> Create bucket named "logos"
-- Make sure it's set to PUBLIC so images can be accessed

-- 9. Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_settings TO authenticated;

-- Done!
-- You can now upload logos through the Settings page and they will be stored in:
-- - Supabase Storage (logos bucket) with public URL
-- - Database enterprise_settings table (logo_url column)
-- 
-- The logo will persist across page refreshes and display in:
-- - Settings page (preview)
-- - Sidebar (via DataContext)
-- - Header/NavBar (via DataContext)
