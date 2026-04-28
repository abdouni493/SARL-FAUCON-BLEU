-- ============================================
-- COMPLETE EXPENSES SYSTEM SETUP
-- ============================================
-- This file contains all SQL needed to set up the complete expenses system
-- Includes: Worker Expenses and Enterprise Expenses tables

-- ============================================
-- 1. WORKER EXPENSES TABLE
-- ============================================

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

CREATE INDEX idx_worker_expenses_user_id ON worker_expenses(user_id);
CREATE INDEX idx_worker_expenses_date ON worker_expenses(expense_date DESC);
CREATE INDEX idx_worker_expenses_category ON worker_expenses(category);
CREATE INDEX idx_worker_expenses_created_at ON worker_expenses(created_at DESC);

CREATE OR REPLACE FUNCTION update_worker_expenses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS worker_expenses_update_timestamp ON worker_expenses;
CREATE TRIGGER worker_expenses_update_timestamp
BEFORE UPDATE ON worker_expenses
FOR EACH ROW
EXECUTE FUNCTION update_worker_expenses_timestamp();

ALTER TABLE worker_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS worker_expenses_user_access ON worker_expenses;
CREATE POLICY worker_expenses_user_access ON worker_expenses
FOR ALL USING (
  auth.uid() = user_id OR 
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'comptable', 'gestionnaire')
);

-- ============================================
-- 2. ENTERPRISE EXPENSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS enterprise_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  vendor_name VARCHAR(255),
  receipt_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_enterprise_expenses_user_id ON enterprise_expenses(user_id);
CREATE INDEX idx_enterprise_expenses_date ON enterprise_expenses(expense_date DESC);
CREATE INDEX idx_enterprise_expenses_category ON enterprise_expenses(category);
CREATE INDEX idx_enterprise_expenses_created_at ON enterprise_expenses(created_at DESC);

CREATE OR REPLACE FUNCTION update_enterprise_expenses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enterprise_expenses_update_timestamp ON enterprise_expenses;
CREATE TRIGGER enterprise_expenses_update_timestamp
BEFORE UPDATE ON enterprise_expenses
FOR EACH ROW
EXECUTE FUNCTION update_enterprise_expenses_timestamp();

ALTER TABLE enterprise_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS enterprise_expenses_access ON enterprise_expenses;
CREATE POLICY enterprise_expenses_access ON enterprise_expenses
FOR ALL USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'comptable', 'gestionnaire')
);

-- ============================================
-- 3. SAMPLE DATA (OPTIONAL)
-- ============================================

-- Worker Expenses Sample Data
INSERT INTO worker_expenses (user_id, description, category, amount, expense_date, worker_name, notes) 
VALUES 
  (NULL, 'Salaire hebdomadaire - Équipe A', 'Salaire', 150000, CURRENT_DATE - 3, 'Équipe construction', 'Semaine du 16-20 mars'),
  (NULL, 'Prime de rendement', 'Prime', 50000, CURRENT_DATE - 4, 'Ali Hassan', 'Bonus mensuel'),
  (NULL, 'Indemnité de transport', 'Transport', 25000, CURRENT_DATE - 5, 'Équipe logistique', 'Déplacement site'),
  (NULL, 'Allocations journalières', 'Allocations', 35000, CURRENT_DATE - 6, 'Équipe technique', 'Frais divers')
ON CONFLICT DO NOTHING;

-- Enterprise Expenses Sample Data
INSERT INTO enterprise_expenses (user_id, name, description, category, amount, expense_date, vendor_name, notes) 
VALUES 
  (NULL, 'Loyer du Bureau', 'Loyer mensuel bureau central', 'Immobilier', 500000, CURRENT_DATE - 5, 'Propriétaire bâtiment', 'Mois en cours'),
  (NULL, 'Électricité et Eau', 'Facture services publics', 'Utilitaires', 75000, CURRENT_DATE - 10, 'Sonelgaz/Seaal', 'Facturation'),
  (NULL, 'Fournitures de Bureau', 'Papier, stylos, cartouches', 'Fournitures', 35000, CURRENT_DATE - 12, 'Fournisseur bureau', 'Stock mensuel'),
  (NULL, 'Maintenance Informatique', 'Support technique et maintenance', 'IT', 50000, CURRENT_DATE - 8, 'Technicien système', 'Contrat maintenance')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. GRANTS & PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT ON worker_expenses TO authenticated;
GRANT INSERT ON worker_expenses TO authenticated;
GRANT UPDATE ON worker_expenses TO authenticated;
GRANT DELETE ON worker_expenses TO authenticated;

GRANT SELECT ON enterprise_expenses TO authenticated;
GRANT INSERT ON enterprise_expenses TO authenticated;
GRANT UPDATE ON enterprise_expenses TO authenticated;
GRANT DELETE ON enterprise_expenses TO authenticated;
