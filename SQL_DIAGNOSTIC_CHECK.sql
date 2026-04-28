-- ============================================================
-- DIAGNOSTIC: Check current state
-- ============================================================

-- Check if table exists
SELECT tablename FROM pg_tables WHERE tablename = 'enterprise_settings';

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'enterprise_settings' 
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'enterprise_settings';

-- Check existing policies
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'enterprise_settings';

-- Check existing data
SELECT * FROM public.enterprise_settings;
