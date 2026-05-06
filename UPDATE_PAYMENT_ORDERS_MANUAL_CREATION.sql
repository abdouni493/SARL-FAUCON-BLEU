-- Drop NOT NULL constraint from bon_commande_id and add beneficiary column
ALTER TABLE payment_orders 
  ALTER COLUMN bon_commande_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS beneficiary TEXT;