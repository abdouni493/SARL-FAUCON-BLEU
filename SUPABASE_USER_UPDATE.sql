-- ============================================================================
-- SUPABASE USER UPDATE QUERIES
-- ============================================================================
-- These queries will update user passwords and metadata in Supabase auth.users
-- 
-- IMPORTANT: These queries must be run in Supabase SQL Editor with an admin token
-- Do NOT run these in the frontend application
-- ============================================================================

-- ==========================
-- UPDATE EXISTING USERS WITH CORRECT PASSWORDS AND METADATA
-- ==========================

-- 1. UPDATE ADMIN USER (admin@admin.com)
-- Password: admin123
UPDATE auth.users
SET 
  encrypted_password = crypt('admin123', gen_salt('bf')),
  raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{fullName,username,role}',
    '{"fullName":"Administrator","username":"admin","role":"admin"}'::jsonb
  ),
  updated_at = now()
WHERE email = 'admin@admin.com';

-- 2. UPDATE CHEF DE PROJET (chef@projet.com)
-- Password: chef123
UPDATE auth.users
SET 
  encrypted_password = crypt('chef123', gen_salt('bf')),
  raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{fullName,username,role}',
    '{"fullName":"Chef de Projet","username":"chef_projet","role":"chef_projet"}'::jsonb
  ),
  updated_at = now()
WHERE email = 'chef@projet.com';

-- 3. UPDATE STORAGE (stockage@stockage.com)
-- Password: stockage123
UPDATE auth.users
SET 
  encrypted_password = crypt('stockage123', gen_salt('bf')),
  raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{fullName,username,role}',
    '{"fullName":"Responsable Stockage","username":"stockage","role":"storage"}'::jsonb
  ),
  updated_at = now()
WHERE email = 'stockage@stockage.com';

-- 4. UPDATE PURCHASE (achats@achats.com)
-- Password: achats123
UPDATE auth.users
SET 
  encrypted_password = crypt('achats123', gen_salt('bf')),
  raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{fullName,username,role}',
    '{"fullName":"Responsable Achats","username":"achats","role":"purchase"}'::jsonb
  ),
  updated_at = now()
WHERE email = 'achats@achats.com';

-- 5. UPDATE COMPTABLE (comptable@comptable.com)
-- Password: comptable123
UPDATE auth.users
SET 
  encrypted_password = crypt('comptable123', gen_salt('bf')),
  raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{fullName,username,role}',
    '{"fullName":"Comptable","username":"comptable","role":"comptable"}'::jsonb
  ),
  updated_at = now()
WHERE email = 'comptable@comptable.com';

-- ============================================================================
-- VERIFY UPDATES
-- ============================================================================
-- Run these queries to verify the updates were successful:

-- Check if passwords and metadata were updated:
SELECT 
  id,
  email,
  raw_user_meta_data->>'fullName' as fullName,
  raw_user_meta_data->>'username' as username,
  raw_user_meta_data->>'role' as role,
  created_at,
  updated_at
FROM auth.users
WHERE email IN (
  'admin@admin.com',
  'chef@projet.com',
  'stockage@stockage.com',
  'achats@achats.com',
  'comptable@comptable.com'
)
ORDER BY created_at;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. These queries use PostgreSQL's crypt() function which is available in Supabase
-- 2. Passwords will be hashed with bcrypt (bf algorithm)
-- 3. User metadata is updated to include proper role information
-- 4. All timestamps are updated to current time
-- 5. Users can now log in with:
--    - admin@admin.com / admin123
--    - chef@projet.com / chef123
--    - stockage@stockage.com / stockage123
--    - achats@achats.com / achats123
--    - comptable@comptable.com / comptable123
-- ============================================================================
