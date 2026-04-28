-- ============================================================================
-- FIX FOREIGN KEY CONSTRAINT on material_commands.created_by_id
-- ============================================================================
-- Problem: material_commands.created_by_id references users table
-- Solution: Create user records that match auth.users
-- ============================================================================

-- STEP 1: Create public.users table records for each authenticated user
-- These records link auth.users to the public.users table via UUID

INSERT INTO public.users (id, email, role, full_name, username, created_at, updated_at)
VALUES
  ('6ca491f6-ac4e-4d22-baa0-9b6208f3a3cc', 'admin@admin.com', 'admin', 'Administrator', 'admin', NOW(), NOW()),
  ('52a74346-c9f5-4498-850c-6f7a9dde929d', 'chef@projet.com', 'chef_projet', 'Chef de Projet', 'chef_projet', NOW(), NOW()),
  ('d53dc076-d323-41db-952b-07f16b250159', 'stockage@stockage.com', 'storage', 'Responsable Stockage', 'stockage', NOW(), NOW()),
  ('3ebb968c-47c8-4d4e-8892-92cb400ac153', 'achats@achats.com', 'purchase', 'Responsable Achats', 'achats', NOW(), NOW()),
  ('94317379-0894-4203-98ea-5760922f4ad6', 'comptable@comptable.com', 'comptable', 'Comptable', 'comptable', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  username = EXCLUDED.username,
  updated_at = NOW();

-- STEP 2: Verify the users were created
SELECT id, email, role, full_name, username FROM public.users 
WHERE email IN (
  'admin@admin.com',
  'chef@projet.com',
  'stockage@stockage.com',
  'achats@achats.com',
  'comptable@comptable.com'
);

-- STEP 3: Check if there are any material_commands with invalid created_by_id
SELECT id, created_by_id, created_at 
FROM material_commands 
WHERE created_by_id IS NOT NULL
  AND created_by_id NOT IN (
    SELECT id FROM public.users
  );

-- STEP 4: If there are orphaned records, fix them by assigning to admin
UPDATE material_commands
SET created_by_id = '6ca491f6-ac4e-4d22-baa0-9b6208f3a3cc'
WHERE created_by_id IS NOT NULL
  AND created_by_id NOT IN (
    SELECT id FROM public.users
  );

-- ============================================================================
-- VERIFY FOREIGN KEY CONSTRAINT
-- ============================================================================
-- Run this to check that the constraint is working:

SELECT 
  constraint_name,
  table_name,
  column_name
FROM information_schema.key_column_usage
WHERE table_name = 'material_commands'
  AND column_name = 'created_by_id';

-- ============================================================================
-- TEST: Create a new material_command to verify FK works
-- ============================================================================

INSERT INTO material_commands (
  command_id,
  created_by_id,
  status,
  created_at,
  updated_at
) VALUES (
  'TEST-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),  -- Generate unique command_id
  '52a74346-c9f5-4498-850c-6f7a9dde929d',  -- chef@projet.com
  'pending',
  NOW(),
  NOW()
);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. These UUIDs must match exactly with auth.users IDs
-- 2. The foreign key constraint will now allow material_commands creation
-- 3. Each user in auth.users has a corresponding record in public.users
-- 4. Authentication uses auth.users, Commands use public.users for FK
-- 5. Run STEP 1 first, then verify with STEP 2, STEP 3, STEP 4
-- ============================================================================
