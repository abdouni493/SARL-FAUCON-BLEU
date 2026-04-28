-- ============================================
-- SQL MIGRATION: Fix purchase_commands table
-- Change material_command_id from UUID to TEXT
-- ============================================

-- ============================================
-- OPTION 1: Drop and recreate the column
-- (Use if you have no existing data in purchase_commands)
-- ============================================

-- Drop the foreign key constraint first (if it exists)
ALTER TABLE IF EXISTS public.purchase_commands 
DROP CONSTRAINT IF EXISTS purchase_commands_material_command_id_fkey;

-- Drop the column
ALTER TABLE IF EXISTS public.purchase_commands 
DROP COLUMN IF EXISTS material_command_id;

-- Add it back as TEXT to store command IDs like "CMD-001" or "PC-001"
ALTER TABLE IF EXISTS public.purchase_commands 
ADD COLUMN material_command_id VARCHAR(255);

-- ============================================
-- OPTION 2: Alter existing column type
-- (Use if column already exists with data)
-- ============================================
/*
-- Drop the foreign key constraint
ALTER TABLE IF EXISTS public.purchase_commands 
DROP CONSTRAINT IF EXISTS purchase_commands_material_command_id_fkey;

-- Change column type from UUID to VARCHAR
ALTER TABLE IF EXISTS public.purchase_commands 
ALTER COLUMN material_command_id TYPE VARCHAR(255);
*/

-- ============================================
-- OPTION 3: Create index for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_purchase_commands_material_id 
ON public.purchase_commands(material_command_id);

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to check the column type:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'purchase_commands' AND column_name = 'material_command_id';

-- Run this to verify the data:
-- SELECT command_id, material_command_id, status FROM purchase_commands LIMIT 5;

-- ============================================
-- END OF MIGRATION
-- ============================================
