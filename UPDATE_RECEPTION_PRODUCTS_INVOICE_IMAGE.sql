-- Add invoice_image_url column to reception_products table
ALTER TABLE reception_products ADD COLUMN IF NOT EXISTS invoice_image_url TEXT;