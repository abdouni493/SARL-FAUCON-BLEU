-- ============================================
-- WORKER EXPENSES TABLE SCHEMA
-- ============================================
-- This table manages all worker-related expenses
-- Such as wages, bonuses, daily allowances, etc.

CREATE TABLE IF NOT EXISTS worker_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category VARCHAR(100),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  worker_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for faster queries
CREATE INDEX idx_worker_expenses_user_id ON worker_expenses(user_id);
CREATE INDEX idx_worker_expenses_date ON worker_expenses(expense_date DESC);
CREATE INDEX idx_worker_expenses_category ON worker_expenses(category);
CREATE INDEX idx_worker_expenses_created_at ON worker_expenses(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_worker_expenses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER worker_expenses_update_timestamp
BEFORE UPDATE ON worker_expenses
FOR EACH ROW
EXECUTE FUNCTION update_worker_expenses_timestamp();

-- Enable RLS (Row Level Security)
ALTER TABLE worker_expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own expenses
CREATE POLICY worker_expenses_user_access ON worker_expenses
FOR ALL USING (auth.uid() = user_id OR 
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'comptable', 'gestionnaire'));

-- Insert sample data (optional)
INSERT INTO worker_expenses (user_id, description, category, amount, expense_date, worker_name, notes) 
VALUES 
  (NULL, 'Salaire hebdomadaire - Équipe A', 'Salaire', 150000, '2026-03-20', 'Équipe construction', 'Semaine du 16-20 mars'),
  (NULL, 'Prime de rendement', 'Prime', 50000, '2026-03-19', 'Ali Hassan', 'Bonus mensuel'),
  (NULL, 'Indemnité de transport', 'Transport', 25000, '2026-03-18', 'Équipe logistique', 'Déplacement site'),
  (NULL, 'Allocations journalières', 'Allocations', 35000, '2026-03-17', 'Équipe technique', 'Frais divers')
ON CONFLICT DO NOTHING;
