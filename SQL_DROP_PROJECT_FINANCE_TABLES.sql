-- Drop project_finance tables (migrate to project_versements)
-- All data should be in project_versements table now

-- DROP TABLE project_finance_detail (child table first)
DROP TABLE IF EXISTS public.project_finance_detail CASCADE;

-- DROP TABLE project_finance (parent table)
DROP TABLE IF EXISTS public.project_finance CASCADE;

-- Verify project_versements table exists and has correct structure
-- SELECT * FROM project_versements;

-- Note: All project finance data is now managed through project_versements table
-- New versements are created with versement_type = 'finance_allocation' to identify them
