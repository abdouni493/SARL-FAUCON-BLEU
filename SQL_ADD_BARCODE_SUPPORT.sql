-- SQL: Add Barcode Support to Products Table
-- Purpose: Enable barcode scanning in Bons de Commande interface

-- 1. Add barcode column to products table
ALTER TABLE public.products ADD COLUMN barcode VARCHAR(255) UNIQUE;
ALTER TABLE public.products ADD COLUMN barcode_type VARCHAR(50); -- e.g., 'EAN-13', 'UPC', 'QR'

-- 2. Create index for faster barcode lookups
CREATE INDEX idx_products_barcode ON public.products(barcode);

-- 3. Add barcode column to bons_commandes_products table (optional, for local storage)
ALTER TABLE public.bons_commandes_products ADD COLUMN barcode VARCHAR(255);

-- 4. Create index for products_barcode_type
CREATE INDEX idx_products_barcode_type ON public.products(barcode_type);

-- 5. Add RLS policy for barcode scanning (if using RLS)
-- Allow authenticated users to read products by barcode
CREATE POLICY "Users can read products by barcode" ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

-- Sample data insertion (optional - for testing)
-- INSERT INTO public.products (name, barcode, barcode_type, unit_price)
-- VALUES 
--   ('Product A', '5901234123457', 'EAN-13', 100.00),
--   ('Product B', '123456789012', 'UPC', 50.00),
--   ('Product C', 'QR20240405001', 'QR', 75.00);

-- Verification queries
-- Check if barcode column exists:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name='products' AND column_name='barcode';

-- View products with barcodes:
-- SELECT id, name, barcode, barcode_type, unit_price FROM public.products WHERE barcode IS NOT NULL;
