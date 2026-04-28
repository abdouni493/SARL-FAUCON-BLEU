-- ============================================================================
-- SQL Schema Fix - After Reclamation & Validation Updates
-- Execute this in Supabase SQL Editor to fix your database schema
-- ============================================================================

-- Step 1: Add missing columns to reclamations table
ALTER TABLE public.reclamations
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.reclamations
ADD COLUMN IF NOT EXISTS reception_products_id UUID REFERENCES public.reception_products(id) ON DELETE CASCADE;

-- Step 2: Enhance reclamation_products table with tracking columns
ALTER TABLE public.reclamation_products
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);

ALTER TABLE public.reclamation_products
ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;

ALTER TABLE public.reclamation_products
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Step 3: Create reclamation_responses table (if not exists)
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

-- Step 4: Drop old command_validations table if it exists (to recreate with correct FK)
DROP TABLE IF EXISTS public.command_validations CASCADE;

-- Step 5: Create command_validations table with correct foreign key
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

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reclamations_receive_command_id ON public.reclamations(receive_command_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_reception_products_id ON public.reclamations(reception_products_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_status ON public.reclamations(status);
CREATE INDEX IF NOT EXISTS idx_reclamations_created_by ON public.reclamations(created_by);
CREATE INDEX IF NOT EXISTS idx_reclamation_products_reclamation_id ON public.reclamation_products(reclamation_id);
CREATE INDEX IF NOT EXISTS idx_reclamation_responses_reclamation_id ON public.reclamation_responses(reclamation_id);
CREATE INDEX IF NOT EXISTS idx_command_validations_reception_products_id ON public.command_validations(reception_products_id);

-- Step 7: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reclamations TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reclamation_products TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reclamation_responses TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.command_validations TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Step 8: Enable RLS (Row Level Security) - Uncomment if needed
-- ALTER TABLE public.reclamations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.reclamation_responses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.command_validations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Verification queries (run after execution to verify)
-- ============================================================================

-- Check reclamations table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reclamations' ORDER BY ordinal_position;

-- Check reclamation_responses table exists
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reclamation_responses');

-- Check command_validations table exists and has correct foreign key
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'command_validations');

-- Check all indexes are created
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('reclamations', 'reclamation_responses', 'command_validations');
