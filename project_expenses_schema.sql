-- ============================================================================
-- PROJECT EXPENSES TABLE SCHEMA - ALTER EXISTING TABLE
-- ============================================================================
-- This modifies the existing project_expenses table to add missing columns
-- for better project and user tracking

-- Add missing columns to existing project_expenses table if they don't exist
ALTER TABLE project_expenses
ADD COLUMN IF NOT EXISTS created_by_id UUID,
ADD COLUMN IF NOT EXISTS chef_de_projet_id UUID,
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'autre',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2);

-- Add foreign key constraints for user references (if they don't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_expenses_created_by_id_fkey'
  ) THEN
    ALTER TABLE project_expenses
    ADD CONSTRAINT project_expenses_created_by_id_fkey 
      FOREIGN KEY (created_by_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_expenses_chef_de_projet_id_fkey'
  ) THEN
    ALTER TABLE project_expenses
    ADD CONSTRAINT project_expenses_chef_de_projet_id_fkey 
      FOREIGN KEY (chef_de_projet_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better query performance (if not already present)
CREATE INDEX IF NOT EXISTS idx_project_expenses_project_box_id 
  ON project_expenses(project_box_id);

CREATE INDEX IF NOT EXISTS idx_project_expenses_created_by_id 
  ON project_expenses(created_by_id);

CREATE INDEX IF NOT EXISTS idx_project_expenses_chef_de_projet_id 
  ON project_expenses(chef_de_projet_id);

CREATE INDEX IF NOT EXISTS idx_project_expenses_expense_date 
  ON project_expenses(expense_date);

CREATE INDEX IF NOT EXISTS idx_project_expenses_category 
  ON project_expenses(category);

-- Create or replace trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_expenses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS project_expenses_update_timestamp ON project_expenses;
CREATE TRIGGER project_expenses_update_timestamp
  BEFORE UPDATE ON project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_project_expenses_timestamp();

-- ============================================================================
-- OPTIONAL: VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View to get total expenses by project
CREATE OR REPLACE VIEW project_expenses_summary AS
SELECT 
  pb.id as project_id,
  pb.name as project_name,
  COUNT(pe.id) as expense_count,
  SUM(pe.amount) as total_amount,
  AVG(pe.amount) as average_expense,
  MAX(pe.expense_date) as last_expense_date
FROM project_boxes pb
LEFT JOIN project_expenses pe ON pb.id = pe.project_box_id
GROUP BY pb.id, pb.name;

-- View to get expenses by category per project
CREATE OR REPLACE VIEW project_expenses_by_category AS
SELECT 
  pb.id as project_id,
  pb.name as project_name,
  pe.category,
  COUNT(pe.id) as count,
  SUM(pe.amount) as total_amount
FROM project_boxes pb
LEFT JOIN project_expenses pe ON pb.id = pe.project_box_id
WHERE pe.category IS NOT NULL
GROUP BY pb.id, pb.name, pe.category;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - OPTIONAL
-- ============================================================================
-- Uncomment the following if you want to enable RLS for project_expenses

-- Enable RLS on project_expenses table
-- ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view expenses for their own projects
-- CREATE POLICY project_expenses_view_own
--   ON project_expenses FOR SELECT
--   USING (
--     created_by_id = auth.uid() 
--     OR chef_de_projet_id = auth.uid()
--     OR EXISTS (
--       SELECT 1 FROM project_boxes pb
--       WHERE pb.id = project_box_id AND pb.chef_id = auth.uid()
--     )
--   );

-- Policy: Users can insert expenses for their projects
-- CREATE POLICY project_expenses_insert_own
--   ON project_expenses FOR INSERT
--   WITH CHECK (
--     created_by_id = auth.uid()
--     AND EXISTS (
--       SELECT 1 FROM project_boxes pb
--       WHERE pb.id = project_box_id AND pb.chef_id = auth.uid()
--     )
--   );

-- Policy: Users can update expenses they created
-- CREATE POLICY project_expenses_update_own
--   ON project_expenses FOR UPDATE
--   USING (created_by_id = auth.uid())
--   WITH CHECK (created_by_id = auth.uid());

-- Policy: Users can delete expenses they created
-- CREATE POLICY project_expenses_delete_own
--   ON project_expenses FOR DELETE
--   USING (created_by_id = auth.uid());

-- ============================================================================
-- SAMPLE QUERIES FOR REFERENCE
-- ============================================================================

-- Get all expenses for a specific project
-- SELECT * FROM project_expenses 
-- WHERE project_box_id = 'PROJECT_ID_HERE'
-- ORDER BY expense_date DESC;

-- Get total expenses by project
-- SELECT * FROM project_expenses_summary
-- ORDER BY total_amount DESC;

-- Get expenses by category for a project
-- SELECT * FROM project_expenses_by_category
-- WHERE project_id = 'PROJECT_ID_HERE'
-- ORDER BY total_amount DESC;

-- Get chef_de_projet expenses within date range
-- SELECT * FROM project_expenses
-- WHERE chef_de_projet_id = 'USER_ID_HERE'
-- AND expense_date BETWEEN '2024-01-01' AND '2024-12-31'
-- ORDER BY expense_date DESC;
