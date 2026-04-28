-- ============================================================================
-- DEBT MANAGEMENT - DATABASE VERIFICATION AND FIX
-- Date: April 6, 2026
-- Purpose: Verify and fix any missing fields/configurations in debt tables
-- ============================================================================

-- STEP 1: VERIFY DEBTS TABLE HAS ALL REQUIRED COLUMNS
-- Add missing columns if they don't exist

ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0);

ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(15, 2) GENERATED ALWAYS AS (total_price - amount_paid) STORED;

ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue'));

ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50);

-- STEP 2: VERIFY DEBT_PAYMENTS TABLE HAS ALL REQUIRED COLUMNS

ALTER TABLE debt_payments 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'check', 'transfer', 'other'));

ALTER TABLE debt_payments 
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);

ALTER TABLE debt_payments 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- STEP 3: ENSURE TRIGGER FOR AUTO-UPDATE EXISTS

-- Drop existing trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_debts_updated_at ON debts;

-- Create the trigger function
CREATE OR REPLACE FUNCTION update_debts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_debts_updated_at
BEFORE UPDATE ON debts
FOR EACH ROW
EXECUTE FUNCTION update_debts_updated_at();

-- STEP 4: ENSURE STATUS UPDATE TRIGGER EXISTS

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_debt_status ON debts;

-- Create the function for status update
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

-- Create the trigger
CREATE TRIGGER trigger_update_debt_status
BEFORE INSERT OR UPDATE ON debts
FOR EACH ROW
EXECUTE FUNCTION update_debt_status();

-- STEP 5: ENSURE PAYMENT PROCESSING FUNCTION EXISTS

CREATE OR REPLACE FUNCTION process_debt_payment(
  p_debt_id UUID,
  p_amount_paid DECIMAL,
  p_user_id UUID,
  p_description TEXT DEFAULT NULL,
  p_payment_method VARCHAR DEFAULT 'cash'
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
  INSERT INTO debt_payments (debt_id, user_id, amount_paid, description, payment_method, payment_date)
  VALUES (p_debt_id, p_user_id, p_amount_paid, p_description, p_payment_method, now())
  RETURNING id INTO v_payment_id;
  
  -- Update debt amount paid
  v_new_amount_paid := v_debt_record.amount_paid + p_amount_paid;
  v_new_remaining := v_debt_record.total_price - v_new_amount_paid;
  
  UPDATE debts 
  SET amount_paid = v_new_amount_paid,
      updated_at = now()
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

-- STEP 6: CREATE OR UPDATE VIEWS

-- Drop existing views first
DROP VIEW IF EXISTS debt_statistics CASCADE;
DROP VIEW IF EXISTS pending_debts CASCADE;
DROP VIEW IF EXISTS debts_summary CASCADE;

-- Create debts summary view
CREATE OR REPLACE VIEW debts_summary AS
SELECT 
  d.id,
  d.user_id,
  d.bon_commande_id,
  COALESCE(bc.bon_id, 'N/A') as bon_id,
  d.supplier_name,
  d.total_price,
  d.amount_paid,
  d.remaining_balance,
  d.status,
  d.due_date,
  d.description,
  d.created_at,
  d.updated_at,
  (SELECT COUNT(*) FROM debt_payments WHERE debt_id = d.id) as payment_count,
  (SELECT MAX(payment_date) FROM debt_payments WHERE debt_id = d.id) as last_payment_date,
  CASE 
    WHEN d.remaining_balance = 0 THEN 'Fully Paid'
    WHEN d.remaining_balance = d.total_price THEN 'Not Started'
    ELSE 'Partially Paid'
  END as payment_status
FROM debts d
LEFT JOIN bons_commandes bc ON d.bon_commande_id = bc.id;

-- Create pending debts view
CREATE OR REPLACE VIEW pending_debts AS
SELECT * FROM debts_summary
WHERE status IN ('pending', 'partial', 'overdue')
ORDER BY due_date ASC NULLS LAST, created_at DESC;

-- Create debt statistics view
CREATE OR REPLACE VIEW debt_statistics AS
SELECT 
  user_id,
  COUNT(*) as total_debts,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_debts,
  COUNT(CASE WHEN status IN ('pending', 'partial', 'overdue') THEN 1 END) as unpaid_debts,
  SUM(CASE WHEN status = 'paid' THEN total_price ELSE 0 END) as total_paid,
  SUM(CASE WHEN status != 'paid' THEN remaining_balance ELSE 0 END) as total_remaining,
  SUM(total_price) as total_debt_amount,
  AVG(CASE WHEN status != 'paid' THEN remaining_balance END) as avg_remaining_per_debt
FROM debts
GROUP BY user_id;

-- STEP 7: ENSURE ALL INDEXES EXIST

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_bon_commande_id ON debts(bon_commande_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_user_status ON debts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_debts_supplier_name ON debts(supplier_name);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON debt_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_debts_remaining ON debts(remaining_balance) WHERE status != 'paid';
CREATE INDEX IF NOT EXISTS idx_debts_created_at ON debts(created_at DESC);

-- STEP 8: VERIFICATION QUERIES
-- Run these to check if everything is set up correctly

SELECT 'DEBTS TABLE COLUMNS:' as check_type;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'debts'
ORDER BY ordinal_position;

SELECT 'DEBT_PAYMENTS TABLE COLUMNS:' as check_type;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'debt_payments'
ORDER BY ordinal_position;

SELECT 'TRIGGERS:' as check_type;
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public' AND (event_object_table = 'debts' OR event_object_table = 'debt_payments')
ORDER BY event_object_table;

SELECT 'INDEXES:' as check_type;
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' AND (tablename = 'debts' OR tablename = 'debt_payments')
ORDER BY tablename, indexname;

SELECT 'VIEWS:' as check_type;
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' AND table_name IN ('debts_summary', 'pending_debts', 'debt_statistics');

-- ============================================================================
-- NOTES:
-- 1. If you get errors about columns already existing, that's fine - they were already there
-- 2. The remaining_balance is automatically calculated as (total_price - amount_paid)
-- 3. The status is automatically updated based on amount_paid value
-- 4. All dates are stored in timezone-aware format (TIMESTAMP WITH TIME ZONE)
-- 5. All indexes are created for optimal query performance
-- ============================================================================
