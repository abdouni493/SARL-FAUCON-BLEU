-- ============================================================================
-- COPY & PASTE THIS EXACT SQL INTO SUPABASE SQL EDITOR
-- ============================================================================

-- Step 1: Add missing columns to project_expenses table
ALTER TABLE project_expenses
ADD COLUMN IF NOT EXISTS created_by_id UUID,
ADD COLUMN IF NOT EXISTS chef_de_projet_id UUID,
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'autre',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2);

-- Step 2: Add foreign key constraints for user references (if they don't exist)
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

-- Step 3: Create indexes for performance
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

-- Step 4: Create trigger function for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_project_expenses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger on the table
DROP TRIGGER IF EXISTS project_expenses_update_timestamp ON project_expenses;
CREATE TRIGGER project_expenses_update_timestamp
  BEFORE UPDATE ON project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_project_expenses_timestamp();

-- ============================================================================
-- DONE! Your project_expenses table is now enhanced with:
-- ✅ created_by_id column
-- ✅ chef_de_projet_id column  
-- ✅ category column
-- ✅ notes column
-- ✅ amount column
-- ✅ Foreign key constraints
-- ✅ Performance indexes
-- ✅ Auto-updating timestamps
-- ============================================================================
