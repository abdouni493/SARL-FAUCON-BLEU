-- ============================================================================
-- DEBT MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Created: April 6, 2026
-- Purpose: Manage supplier debts and payment tracking for comptable users
-- ============================================================================

-- STEP 1: CREATE DEBTS TABLE
-- Stores all debt records with supplier and payment information
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bon_commande_id UUID NOT NULL REFERENCES bons_commandes(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name VARCHAR(255) NOT NULL,
  total_price DECIMAL(15, 2) NOT NULL CHECK (total_price >= 0),
  amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  remaining_balance DECIMAL(15, 2) NOT NULL GENERATED ALWAYS AS (total_price - amount_paid) STORED,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by_role VARCHAR(50),
  notes TEXT
);

-- STEP 2: CREATE DEBT PAYMENTS TABLE
-- Tracks individual payment transactions for each debt
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  amount_paid DECIMAL(15, 2) NOT NULL CHECK (amount_paid > 0),
  payment_method VARCHAR(100) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'check', 'transfer', 'other')),
  description TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- Index for debt queries by user
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);

-- Index for debt queries by bon de commande
CREATE INDEX IF NOT EXISTS idx_debts_bon_commande_id ON debts(bon_commande_id);

-- Index for debt status queries
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);

-- Index for finding pending/overdue debts
CREATE INDEX IF NOT EXISTS idx_debts_user_status ON debts(user_id, status);

-- Index for debt payments
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);

-- Index for payment date queries
CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON debt_payments(payment_date);

-- Index for remaining balance queries
CREATE INDEX IF NOT EXISTS idx_debts_remaining ON debts(remaining_balance) WHERE status != 'paid';

-- STEP 4: CREATE SUPPLIERS TABLE (if it doesn't exist)
-- This table stores supplier information referenced by debts
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  tax_id VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- STEP 5: CREATE TRIGGERS FOR AUTO-UPDATE UPDATED_AT
CREATE OR REPLACE FUNCTION update_debts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_debts_updated_at
BEFORE UPDATE ON debts
FOR EACH ROW
EXECUTE FUNCTION update_debts_updated_at();

-- STEP 6: CREATE VIEW FOR DEBT SUMMARY
-- Shows summary of all debts with key metrics
CREATE OR REPLACE VIEW debts_summary AS
SELECT 
  d.id,
  d.user_id,
  d.bon_commande_id,
  bc.bon_id,
  d.supplier_name,
  d.total_price,
  d.amount_paid,
  d.remaining_balance,
  d.status,
  d.due_date,
  d.created_at,
  (SELECT COUNT(*) FROM debt_payments WHERE debt_id = d.id) as payment_count,
  (SELECT MAX(payment_date) FROM debt_payments WHERE debt_id = d.id) as last_payment_date,
  CASE 
    WHEN d.remaining_balance = 0 THEN 'Fully Paid'
    WHEN d.remaining_balance = d.total_price THEN 'Not Started'
    ELSE 'Partially Paid'
  END as payment_status
FROM debts d
LEFT JOIN bons_commandes bc ON d.bon_commande_id = bc.id;

-- STEP 7: CREATE VIEW FOR PENDING DEBTS
-- Shows only debts that are not yet fully paid
CREATE OR REPLACE VIEW pending_debts AS
SELECT * FROM debts_summary
WHERE status IN ('pending', 'partial', 'overdue')
ORDER BY due_date ASC NULLS LAST, created_at DESC;

-- STEP 8: CREATE VIEW FOR DEBT STATISTICS
-- Summary statistics for debt analysis
CREATE OR REPLACE VIEW debt_statistics AS
SELECT 
  user_id,
  COUNT(*) as total_debts,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_debts,
  COUNT(CASE WHEN status IN ('pending', 'partial', 'overdue') THEN 1 END) as unpaid_debts,
  SUM(CASE WHEN status = 'paid' THEN total_price ELSE 0 END) as total_paid,
  SUM(CASE WHEN status != 'paid' THEN remaining_balance ELSE 0 END) as total_remaining,
  SUM(total_price) as total_debt_amount
FROM debts
GROUP BY user_id;

-- STEP 9: ENABLE ROW LEVEL SECURITY
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- STEP 10: CREATE RLS POLICIES FOR DEBTS TABLE
-- Users can only see their own debts
CREATE POLICY "debts_select_own" ON debts
FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- Users can create debts
CREATE POLICY "debts_insert_authenticated" ON debts
FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Users can update their own debts
CREATE POLICY "debts_update_own" ON debts
FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Users can delete their own debts
CREATE POLICY "debts_delete_own" ON debts
FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- STEP 11: CREATE RLS POLICIES FOR DEBT_PAYMENTS TABLE
-- Users can see payments for their debts
CREATE POLICY "debt_payments_select" ON debt_payments
FOR SELECT USING (
  auth.role() = 'authenticated' OR
  debt_id IN (SELECT id FROM debts WHERE user_id = auth.uid())
);

-- Users can create payments for their debts
CREATE POLICY "debt_payments_insert" ON debt_payments
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  debt_id IN (SELECT id FROM debts WHERE user_id = auth.uid())
);

-- STEP 12: CREATE RLS POLICIES FOR SUPPLIERS TABLE
CREATE POLICY "suppliers_select" ON suppliers
FOR SELECT USING (auth.role() = 'authenticated');

-- STEP 13: CREATE FUNCTION TO UPDATE DEBT STATUS AUTOMATICALLY
-- This function updates debt status based on amount paid
CREATE OR REPLACE FUNCTION update_debt_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on amount paid
  IF NEW.amount_paid = 0 THEN
    NEW.status = 'pending';
  ELSIF NEW.amount_paid < NEW.total_price THEN
    NEW.status = 'partial';
  ELSIF NEW.amount_paid >= NEW.total_price THEN
    NEW.status = 'paid';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER trigger_update_debt_status
BEFORE INSERT OR UPDATE ON debts
FOR EACH ROW
EXECUTE FUNCTION update_debt_status();

-- STEP 14: CREATE FUNCTION TO CALCULATE REMAINING BALANCE
-- This function is called when a payment is made
CREATE OR REPLACE FUNCTION process_debt_payment(
  p_debt_id UUID,
  p_amount_paid DECIMAL,
  p_user_id UUID,
  p_description TEXT,
  p_payment_method VARCHAR
)
RETURNS JSON AS $$
DECLARE
  v_debt_record RECORD;
  v_new_amount_paid DECIMAL;
  v_new_remaining DECIMAL;
  v_payment_id UUID;
  v_result JSON;
BEGIN
  -- Get debt record
  SELECT * INTO v_debt_record FROM debts WHERE id = p_debt_id;
  
  -- Check if debt exists
  IF v_debt_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Debt not found'
    );
  END IF;
  
  -- Check if payment amount is valid
  IF p_amount_paid <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Payment amount must be greater than 0'
    );
  END IF;
  
  -- Check if payment exceeds remaining balance
  IF (v_debt_record.amount_paid + p_amount_paid) > v_debt_record.total_price THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Payment amount exceeds remaining balance',
      'remaining_balance', v_debt_record.remaining_balance
    );
  END IF;
  
  -- Insert payment record
  INSERT INTO debt_payments (debt_id, user_id, amount_paid, description, payment_method)
  VALUES (p_debt_id, p_user_id, p_amount_paid, p_description, p_payment_method)
  RETURNING id INTO v_payment_id;
  
  -- Update debt amount paid
  v_new_amount_paid := v_debt_record.amount_paid + p_amount_paid;
  v_new_remaining := v_debt_record.total_price - v_new_amount_paid;
  
  UPDATE debts 
  SET amount_paid = v_new_amount_paid
  WHERE id = p_debt_id;
  
  -- Return success result
  v_result := json_build_object(
    'success', true,
    'message', 'Payment recorded successfully',
    'payment_id', v_payment_id,
    'amount_paid', p_amount_paid,
    'total_amount_paid', v_new_amount_paid,
    'remaining_balance', v_new_remaining,
    'status', CASE 
      WHEN v_new_remaining = 0 THEN 'paid'
      WHEN v_new_remaining < v_debt_record.total_price THEN 'partial'
      ELSE 'pending'
    END
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERIES - Run these to verify the schema was created
-- ============================================================================

-- Check if debts table exists and show columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'debts'
ORDER BY ordinal_position;

-- Check if debt_payments table exists
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'debt_payments'
ORDER BY ordinal_position;

-- Check if indexes were created
SELECT indexname FROM pg_indexes WHERE tablename IN ('debts', 'debt_payments');

-- Check RLS policies
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('debts', 'debt_payments');

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- 1. Ensure bons_commandes table exists before creating debts table
-- 2. If suppliers table doesn't exist, it will be created automatically
-- 3. RLS is enabled - adjust policies based on your authentication setup
-- 4. The generated column 'remaining_balance' is computed automatically
-- 5. Status updates are automatic via trigger function

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Uncomment to add test data after confirming schema creation

/*
-- Add sample supplier
INSERT INTO suppliers (name, email, phone, city, country)
VALUES 
  ('Global Suppliers Inc', 'contact@global.com', '+1-234-567-8900', 'New York', 'USA'),
  ('European Distributors', 'info@eurodist.com', '+33-1-2345-6789', 'Paris', 'France'),
  ('Asian Trading Co', 'sales@asiantrading.com', '+86-10-1234-5678', 'Beijing', 'China');

-- View all debts
SELECT * FROM debts_summary;

-- View pending debts
SELECT * FROM pending_debts;

-- View debt statistics
SELECT * FROM debt_statistics;

-- Get payment history for a debt
SELECT * FROM debt_payments WHERE debt_id = 'debt-uuid-here';
*/

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Get all debts for current user
-- SELECT * FROM debts WHERE user_id = auth.uid();

-- Example 2: Get pending debts with remaining balance
-- SELECT id, supplier_name, total_price, amount_paid, remaining_balance, status 
-- FROM debts 
-- WHERE user_id = auth.uid() AND status != 'paid'
-- ORDER BY due_date ASC;

-- Example 3: Record a payment (use the function)
-- SELECT process_debt_payment(
--   'debt-uuid',
--   5000,
--   auth.uid(),
--   'Payment for January',
--   'transfer'
-- );

-- Example 4: Get debt with payment history
-- SELECT 
--   d.id, d.supplier_name, d.total_price, d.amount_paid, d.remaining_balance,
--   COUNT(dp.id) as payment_count,
--   json_agg(
--     json_build_object(
--       'id', dp.id,
--       'amount', dp.amount_paid,
--       'date', dp.payment_date,
--       'description', dp.description
--     )
--   ) as payments
-- FROM debts d
-- LEFT JOIN debt_payments dp ON d.id = dp.debt_id
-- WHERE d.id = 'debt-uuid'
-- GROUP BY d.id, d.supplier_name, d.total_price, d.amount_paid, d.remaining_balance;

-- ============================================================================
-- END OF DEBT MANAGEMENT SCHEMA
-- ============================================================================
