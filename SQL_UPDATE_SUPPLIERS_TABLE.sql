-- SQL code to update the suppliers table with new columns
-- This adds the required columns: company_name, nis, nif, article, commercial_registration

-- Add the new columns to the suppliers table
ALTER TABLE public.suppliers
ADD COLUMN company_name character varying,
ADD COLUMN nif character varying,
ADD COLUMN nis character varying,
ADD COLUMN article character varying,
ADD COLUMN commercial_registration character varying;

-- Optional: If you want to add these columns with unique constraints or indexes
-- CREATE INDEX idx_suppliers_nif ON public.suppliers(nif) WHERE nif IS NOT NULL;
-- CREATE INDEX idx_suppliers_nis ON public.suppliers(nis) WHERE nis IS NOT NULL;
-- CREATE INDEX idx_suppliers_commercial_registration ON public.suppliers(commercial_registration) WHERE commercial_registration IS NOT NULL;

-- Verify the new columns were added
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'suppliers' ORDER BY ordinal_position;
