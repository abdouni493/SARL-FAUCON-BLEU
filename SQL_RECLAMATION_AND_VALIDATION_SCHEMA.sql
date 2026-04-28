-- ============================================================================
-- SQL Schema for Reclamation Messages and Validation
-- ============================================================================

-- Add missing column to reclamations table
ALTER TABLE public.reclamations
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add column to track reception_products instead of receive_commands
ALTER TABLE public.reclamations
ADD COLUMN IF NOT EXISTS reception_products_id UUID REFERENCES public.reception_products(id) ON DELETE CASCADE;

-- Alter reclamation_products to add missing columns for better tracking
ALTER TABLE public.reclamation_products
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);

ALTER TABLE public.reclamation_products
ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;

ALTER TABLE public.reclamation_products
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Table for reclamation responses/replies
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

-- Table for command validation records
CREATE TABLE IF NOT EXISTS public.command_validations (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reclamations_receive_command_id ON public.reclamations(receive_command_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_reception_products_id ON public.reclamations(reception_products_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_status ON public.reclamations(status);
CREATE INDEX IF NOT EXISTS idx_reclamations_created_by ON public.reclamations(created_by);
CREATE INDEX IF NOT EXISTS idx_reclamation_products_reclamation_id ON public.reclamation_products(reclamation_id);
CREATE INDEX IF NOT EXISTS idx_reclamation_responses_reclamation_id ON public.reclamation_responses(reclamation_id);
CREATE INDEX IF NOT EXISTS idx_command_validations_reception_products_id ON public.command_validations(reception_products_id);

-- Grant permissions (adjust role names as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reclamations TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reclamation_products TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reclamation_responses TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.command_validations TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;
