-- ========================================
-- Add Description Column to Enterprise Settings
-- ========================================
-- This script adds a description field to the enterprise_settings table
-- to store information about the enterprise.

-- Add description column if it doesn't exist
ALTER TABLE enterprise_settings 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add a comment to the column for documentation
COMMENT ON COLUMN enterprise_settings.description IS 'Description or information about the enterprise';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'enterprise_settings' AND column_name = 'description';
