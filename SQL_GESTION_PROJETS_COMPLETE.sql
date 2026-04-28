-- ============================================
-- GESTION PROJETS - COMPLETE DATABASE SCHEMA
-- ============================================

-- ============================================
-- 1. PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  description TEXT,
  chef_de_projet_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chef_de_projet_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, active, completed, cancelled
  total_budget DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 2. PROJECT EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  expense_date DATE NOT NULL,
  category VARCHAR(100), -- matériel, main-d'oeuvre, transport, autre
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 3. PROJECT VERSEMENTS (PAYMENTS) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_versements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  versement_date DATE NOT NULL,
  description TEXT,
  payment_method VARCHAR(100), -- virement, espèces, chèque
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 4. GENERAL CASH BOX (CAISSE GÉNÉRALE) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.general_cash_box (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type VARCHAR(50), -- versement, retrait, dépense
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  category VARCHAR(100), -- frais généraux, salaires, matériel, autre
  reference_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 5. PROJECT FINANCE (CAISSE DE FINANCEMENT PROJETS) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_finance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finance_id VARCHAR(50) UNIQUE NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  total_allocated DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_spent DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_received DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 6. PROJECT FINANCE DETAIL TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_finance_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_finance_id UUID NOT NULL REFERENCES public.project_finance(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  finance_date DATE NOT NULL,
  finance_type VARCHAR(50), -- entrée, sortie
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_projects_chef_de_projet ON public.projects(chef_de_projet_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_expenses_project_id ON public.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_date ON public.project_expenses(expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_project_versements_project_id ON public.project_versements(project_id);
CREATE INDEX IF NOT EXISTS idx_project_versements_date ON public.project_versements(versement_date DESC);

CREATE INDEX IF NOT EXISTS idx_general_cash_box_type ON public.general_cash_box(transaction_type);
CREATE INDEX IF NOT EXISTS idx_general_cash_box_date ON public.general_cash_box(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_general_cash_box_project ON public.general_cash_box(reference_project_id);

CREATE INDEX IF NOT EXISTS idx_project_finance_project ON public.project_finance(project_id);

CREATE INDEX IF NOT EXISTS idx_project_finance_detail_project_finance ON public.project_finance_detail(project_finance_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Projects table RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all projects" ON public.projects
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and Chef de Projet can create projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'resp_projets')
    OR auth.uid() = chef_de_projet_id
  );

CREATE POLICY "Admins and Chef de Projet can update their projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'resp_projets')
    OR auth.uid() = chef_de_projet_id
  );

-- Project Expenses RLS
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read project expenses" ON public.project_expenses
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create project expenses" ON public.project_expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'resp_projets', 'chef_projet')
  );

-- Project Versements RLS
ALTER TABLE public.project_versements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read project versements" ON public.project_versements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create project versements" ON public.project_versements
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'resp_projets', 'comptable')
  );

-- General Cash Box RLS
ALTER TABLE public.general_cash_box ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read general cash box" ON public.general_cash_box
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and Comptable can create cash transactions" ON public.general_cash_box
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'comptable')
  );

-- Project Finance RLS
ALTER TABLE public.project_finance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read project finance" ON public.project_finance
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create project finance" ON public.project_finance
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'resp_projets', 'comptable')
  );

-- ============================================
-- SAMPLE DATA (OPTIONAL - For Testing)
-- ============================================
-- Uncomment to insert sample data

/*
INSERT INTO public.projects (project_id, name, address, description, chef_de_projet_id, status, total_budget)
VALUES 
  ('PROJ001', 'Projet Construction Immeuble A', '123 Rue du Commerce', 'Immeuble résidentiel 10 étages', '52a74346-c9f5-4498-850c-6f7a9dde929d', 'active', 5000000),
  ('PROJ002', 'Projet Rénovation Bureau B', '456 Avenue Principale', 'Rénovation bureaux centre-ville', '62b84347-d6f5-4498-850c-6f7a9dde929d', 'pending', 2000000);

INSERT INTO public.project_expenses (project_id, description, amount, expense_date, category)
SELECT id, 'Achat matériel construction', 50000, CURRENT_DATE, 'matériel' 
FROM public.projects WHERE project_id = 'PROJ001';

INSERT INTO public.project_versements (project_id, amount, versement_date, description)
SELECT id, 500000, CURRENT_DATE, 'Acompte initial 10%' 
FROM public.projects WHERE project_id = 'PROJ001';
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check projects:
-- SELECT * FROM public.projects;

-- Check project expenses:
-- SELECT p.name, pe.description, pe.amount, pe.expense_date FROM public.projects p 
-- LEFT JOIN public.project_expenses pe ON p.id = pe.project_id;

-- Check project versements:
-- SELECT p.name, pv.amount, pv.versement_date FROM public.projects p 
-- LEFT JOIN public.project_versements pv ON p.id = pv.project_id;

-- Check general cash box:
-- SELECT * FROM public.general_cash_box ORDER BY transaction_date DESC;

-- Calculate project balance:
-- SELECT 
--   p.name, 
--   COALESCE(SUM(pv.amount), 0) as total_received,
--   COALESCE(SUM(pe.amount), 0) as total_spent,
--   COALESCE(SUM(pv.amount), 0) - COALESCE(SUM(pe.amount), 0) as balance
-- FROM public.projects p
-- LEFT JOIN public.project_versements pv ON p.id = pv.project_id
-- LEFT JOIN public.project_expenses pe ON p.id = pe.project_id
-- GROUP BY p.id, p.name;
