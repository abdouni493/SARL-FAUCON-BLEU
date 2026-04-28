-- ============================================
-- GESTION PROJETS - ADAPTED TO EXISTING SCHEMA
-- ============================================
-- This file adapts the projects system to work with existing project_boxes table

-- ============================================
-- UPDATE PROJECT_BOXES TABLE (add missing fields)
-- ============================================
ALTER TABLE public.project_boxes 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE public.project_boxes 
ADD COLUMN IF NOT EXISTS total_budget DECIMAL(15,2) DEFAULT 0;

ALTER TABLE public.project_boxes 
ADD COLUMN IF NOT EXISTS chef_de_projet_email VARCHAR(255);

ALTER TABLE public.project_boxes 
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================
-- GENERAL CASH BOX (CAISSE GÉNÉRALE) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.general_cash_box (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type VARCHAR(50), -- versement, retrait, dépense
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  category VARCHAR(100), -- frais généraux, salaires, matériel, autre
  reference_project_box_id UUID REFERENCES public.project_boxes(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- PROJECT FINANCE (CAISSE DE FINANCEMENT PROJETS) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_finance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finance_id VARCHAR(50) UNIQUE NOT NULL,
  project_box_id UUID NOT NULL REFERENCES public.project_boxes(id) ON DELETE CASCADE,
  total_allocated DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_spent DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_received DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- PROJECT FINANCE DETAIL TABLE
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
CREATE INDEX IF NOT EXISTS idx_project_boxes_chef_id ON public.project_boxes(chef_id);
CREATE INDEX IF NOT EXISTS idx_project_boxes_status ON public.project_boxes(status);
CREATE INDEX IF NOT EXISTS idx_project_boxes_created_at ON public.project_boxes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_general_cash_box_type ON public.general_cash_box(transaction_type);
CREATE INDEX IF NOT EXISTS idx_general_cash_box_date ON public.general_cash_box(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_general_cash_box_project ON public.general_cash_box(reference_project_box_id);

CREATE INDEX IF NOT EXISTS idx_project_finance_project_box ON public.project_finance(project_box_id);

CREATE INDEX IF NOT EXISTS idx_project_finance_detail_project_finance ON public.project_finance_detail(project_finance_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Existing project_boxes RLS
ALTER TABLE public.project_boxes ENABLE ROW LEVEL SECURITY;

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

-- Project Finance Detail RLS
ALTER TABLE public.project_finance_detail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read project finance detail" ON public.project_finance_detail
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create project finance detail" ON public.project_finance_detail
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'resp_projets', 'comptable')
  );

-- ============================================
-- SAMPLE DATA (OPTIONAL - For Testing)
-- ============================================
-- Uncomment to insert sample data

/*
INSERT INTO public.general_cash_box (transaction_id, amount, transaction_type, description, transaction_date, category, created_at, created_by_id)
VALUES 
  ('GCB001', 50000, 'versement', 'Versement initial caisse générale', CURRENT_DATE, 'frais généraux', CURRENT_TIMESTAMP, (SELECT id FROM auth.users LIMIT 1)),
  ('GCB002', 5000, 'dépense', 'Frais administratifs', CURRENT_DATE, 'frais généraux', CURRENT_TIMESTAMP, (SELECT id FROM auth.users LIMIT 1));

INSERT INTO public.project_finance (finance_id, project_box_id, total_allocated, total_spent, total_received)
SELECT 'FIN001', id, 100000, 25000, 75000 FROM public.project_boxes LIMIT 1;

INSERT INTO public.project_finance_detail (project_finance_id, description, amount, finance_date, finance_type)
SELECT id, 'Allocation initiale', 100000, CURRENT_DATE, 'entrée' FROM public.project_finance LIMIT 1;
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check project_boxes with new fields:
-- SELECT * FROM public.project_boxes;

-- Check general cash box:
-- SELECT * FROM public.general_cash_box ORDER BY transaction_date DESC;

-- Check project finance:
-- SELECT pb.name, pf.total_allocated, pf.total_spent, pf.total_received FROM public.project_finance pf
-- LEFT JOIN public.project_boxes pb ON pf.project_box_id = pb.id;

-- Calculate general cash balance:
-- SELECT 
--   transaction_type,
--   COUNT(*) as count,
--   COALESCE(SUM(amount), 0) as total
-- FROM public.general_cash_box 
-- GROUP BY transaction_type;
