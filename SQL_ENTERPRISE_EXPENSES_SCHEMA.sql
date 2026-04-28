-- ============================================
-- ENTERPRISE EXPENSES TABLE SCHEMA
-- ============================================
-- This table manages all company-level expenses
-- Such as rent, utilities, office supplies, etc.

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

-- Create indexes for faster queries
CREATE INDEX idx_enterprise_expenses_user_id ON enterprise_expenses(user_id);
CREATE INDEX idx_enterprise_expenses_date ON enterprise_expenses(expense_date DESC);
CREATE INDEX idx_enterprise_expenses_category ON enterprise_expenses(category);
CREATE INDEX idx_enterprise_expenses_created_at ON enterprise_expenses(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_enterprise_expenses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enterprise_expenses_update_timestamp
BEFORE UPDATE ON enterprise_expenses
FOR EACH ROW
EXECUTE FUNCTION update_enterprise_expenses_timestamp();

-- Enable RLS (Row Level Security)
ALTER TABLE enterprise_expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Users with appropriate roles can access
CREATE POLICY enterprise_expenses_access ON enterprise_expenses
FOR ALL USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'comptable', 'gestionnaire')
);

-- Insert sample data (optional)
INSERT INTO enterprise_expenses (user_id, name, description, category, amount, expense_date, vendor_name, notes) 
VALUES 
  (NULL, 'Loyer du Bureau', 'Loyer mensuel bureau central', 'Immobilier', 500000, '2026-03-01', 'Propriétaire bâtiment', 'Mois de mars'),
  (NULL, 'Électricité et Eau', 'Facture services publics', 'Utilitaires', 75000, '2026-03-05', 'Sonelgaz/Seaal', 'Facturation février'),
  (NULL, 'Fournitures de Bureau', 'Papier, stylos, cartouches', 'Fournitures', 35000, '2026-03-10', 'Fournisseur bureau', 'Stock mensuel'),
  (NULL, 'Maintenance Informatique', 'Support technique et maintenance', 'IT', 50000, '2026-03-15', 'Technicien système', 'Contrat maintenance')
ON CONFLICT DO NOTHING;
