-- ============================================================================
-- SQL Schema Fix - Drop old FK constraint and fix reclamations table
-- Execute this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop the old foreign key constraint on receive_command_id (if it exists)
ALTER TABLE public.reclamations
DROP CONSTRAINT IF EXISTS reclamations_receive_command_id_fkey;

-- Step 1b: Drop the check constraint if it exists
ALTER TABLE public.reclamations
DROP CONSTRAINT IF EXISTS reclamations_receive_command_id_check;

-- Step 2: Drop the problematic product_id foreign key from reclamation_products
-- Since we're using reception_product_items, not command_products
ALTER TABLE public.reclamation_products
DROP CONSTRAINT IF EXISTS reclamation_products_product_id_fkey;

-- Step 2b: Drop the nullable check constraint if it exists
ALTER TABLE public.reclamation_products
DROP CONSTRAINT IF EXISTS reclamation_products_product_id_nullable;

-- Step 3: Make product_id nullable (since it's not a strict FK anymore)
ALTER TABLE public.reclamation_products
ALTER COLUMN product_id DROP NOT NULL;

-- Step 4: Make receive_command_id nullable (if needed)
ALTER TABLE public.reclamations
ALTER COLUMN receive_command_id DROP NOT NULL;

-- Step 5: Ensure reception_products_id column exists and has proper FK
ALTER TABLE public.reclamations
ADD COLUMN IF NOT EXISTS reception_products_id UUID REFERENCES public.reception_products(id) ON DELETE CASCADE;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_reclamations_reception_products_id ON public.reclamations(reception_products_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_created_by ON public.reclamations(created_by);

-- Step 7: Ensure reclamation_responses table has proper structure
CREATE TABLE IF NOT EXISTS public.reclamation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamation_id UUID NOT NULL,
  response_message TEXT NOT NULL,
  responded_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reclamation_id) REFERENCES public.reclamations(id) ON DELETE CASCADE,
  FOREIGN KEY (responded_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reclamation_responses_reclamation_id ON public.reclamation_responses(reclamation_id);

-- Step 8: Drop old command_validations and recreate with correct FK
DROP TABLE IF EXISTS public.command_validations CASCADE;

CREATE TABLE public.command_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_products_id UUID NOT NULL,
  validated_by UUID,
  validation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'validated' CHECK (status IN ('validated', 'rejected', 'pending')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reception_products_id) REFERENCES public.reception_products(id) ON DELETE CASCADE,
  FOREIGN KEY (validated_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_command_validations_reception_products_id ON public.command_validations(reception_products_id);

-- Step 9: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reclamations TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reclamation_products TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reclamation_responses TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.command_validations TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check reclamations table structure
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'reclamations' ORDER BY ordinal_position;

-- Check constraints
-- SELECT constraint_name, constraint_type FROM information_schema.table_constraints 
-- WHERE table_name = 'reclamations';

-- Check reclamation_products constraints
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'reclamation_products';

-- Check if data exists
-- SELECT COUNT(*) FROM public.reclamations;
-- SELECT COUNT(*) FROM public.reclamation_responses;
-- SELECT COUNT(*) FROM public.command_validations;
