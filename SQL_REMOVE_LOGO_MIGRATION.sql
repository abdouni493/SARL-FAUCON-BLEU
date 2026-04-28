-- =============================================================================
-- SQL MIGRATION: Remove Logo Functionality from Database
-- =============================================================================
-- This migration removes all logo-related columns from the database tables.
-- Run this migration to clean up the database after removing logo feature
-- from the application.
--
-- WARNING: This will permanently delete logo URLs from the database.
-- Make sure you have backups before running this migration.
-- =============================================================================

-- ============================================================================
-- 1. Remove logo_url from enterprise_settings table
-- ============================================================================
-- This column stores company logos
ALTER TABLE IF EXISTS public.enterprise_settings
DROP COLUMN IF EXISTS logo_url CASCADE;

-- ============================================================================
-- 2. Remove logo_url from users table
-- ============================================================================
-- This column was used for user profile logos (if any)
ALTER TABLE IF EXISTS public.users
DROP COLUMN IF EXISTS logo_url CASCADE;

-- ============================================================================
-- 3. Remove logo position columns from print_customizations table
-- ============================================================================
-- These columns were used for logo positioning in print customizations
ALTER TABLE IF EXISTS public.print_customizations
DROP COLUMN IF EXISTS logo_position_x CASCADE;

ALTER TABLE IF EXISTS public.print_customizations
DROP COLUMN IF EXISTS logo_position_y CASCADE;

-- ============================================================================
-- 4. OPTIONAL: Remove image_url from bons_commandes_offers table
-- ============================================================================
-- If you want to remove all image uploads (not just logos), uncomment below:
-- ALTER TABLE IF EXISTS public.bons_commandes_offers
-- DROP COLUMN IF EXISTS image_url CASCADE;

-- ALTER TABLE IF EXISTS public.bons_commandes_offers
-- DROP COLUMN IF EXISTS image_path CASCADE;

-- ============================================================================
-- 5. OPTIONAL: Remove image_url from bon_offers table
-- ============================================================================
-- If you want to remove all image uploads (not just logos), uncomment below:
-- ALTER TABLE IF EXISTS public.bon_offers
-- DROP COLUMN IF EXISTS image_url CASCADE;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these queries to verify the columns have been removed:

-- Check enterprise_settings table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'enterprise_settings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check users table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check print_customizations table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'print_customizations' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================================================
-- Notes:
-- =============================================================================
-- 1. The 'logos' storage bucket in Supabase can be deleted manually through
--    the Supabase dashboard if you want to free up storage space.
--
-- 2. The CompanyLogo component (/src/components/CompanyLogo.tsx) has been 
--    removed from the codebase and is no longer used.
--
-- 3. Logo upload functions have been removed from:
--    - SettingsPage.tsx
--    - AdminSettingsPage.tsx
--
-- 4. Logo display has been removed from:
--    - AppLayout.tsx (sidebar and navbar)
--
-- 5. All logo-related UI elements and state management have been cleaned up.
-- =============================================================================
