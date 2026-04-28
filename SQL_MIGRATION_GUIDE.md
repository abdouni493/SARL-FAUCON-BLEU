# SQL Migration Guide - Fix Project Expenses Table

## The Issue
Your database already has a `project_expenses` table with a different structure. The original SQL script tried to CREATE a new table with columns that didn't exist.

## The Fix
The corrected `project_expenses_schema.sql` now:
1. ✅ Uses `ALTER TABLE` instead of `CREATE TABLE` to add missing columns to your existing table
2. ✅ Adds only the missing columns: `created_by_id`, `chef_de_projet_id`, `category`, `notes`, `amount`
3. ✅ Creates proper foreign key constraints
4. ✅ Adds performance indexes
5. ✅ Includes update trigger for timestamps

## What the SQL Does

### Columns Added:
```sql
- created_by_id UUID          -- References who created the expense
- chef_de_projet_id UUID      -- References the project manager
- category VARCHAR(100)       -- Category like 'autre', 'materiel', etc.
- notes TEXT                  -- Additional notes
- amount DECIMAL(12, 2)       -- Expense amount
```

### Foreign Keys:
```sql
- created_by_id → auth.users(id)
- chef_de_projet_id → auth.users(id)
```

### Indexes Created:
- On project_box_id
- On created_by_id
- On chef_de_projet_id
- On expense_date
- On category

### Trigger:
- Auto-updates `updated_at` timestamp on modifications

## How to Run

1. Open Supabase Dashboard → SQL Editor
2. Copy the ENTIRE content of `project_expenses_schema.sql`
3. Paste into the SQL editor
4. Click **Run**
5. You should see success message: "Success. No rows returned"

## What Your Table Looks Like After Migration

```sql
CREATE TABLE project_expenses (
  id UUID PRIMARY KEY,
  expense_id VARCHAR(50) UNIQUE NOT NULL,
  project_box_id UUID NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,           -- Existing field
  expense_date DATE NOT NULL,       -- Existing field
  created_at TIMESTAMP,             -- Existing field
  updated_at TIMESTAMP,             -- Existing field
  
  -- NEW FIELDS ADDED:
  created_by_id UUID,               -- Who created it
  chef_de_projet_id UUID,           -- Project manager
  category VARCHAR(100),            -- Expense category
  notes TEXT,                       -- Additional notes
  amount DECIMAL(12, 2),            -- Expense amount
  
  FOREIGN KEY (project_box_id) → project_boxes(id),
  FOREIGN KEY (created_by_id) → auth.users(id),
  FOREIGN KEY (chef_de_projet_id) → auth.users(id)
)
```

## Backward Compatibility

✅ **Safe Migration** - All existing data is preserved:
- All existing columns remain unchanged
- New columns default to NULL if not provided
- Default category is 'autre'
- No data loss

## Next Steps After SQL Runs

1. Verify columns were added:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'project_expenses';
   ```

2. Test frontend - create new expense:
   - Select a project from dropdown
   - Fill in description, amount, category
   - Click Save
   - Verify data appears in database

3. Check if last selected project persists across sessions

## If You Get Errors

### Error: "column already exists"
**Solution:** That's OK! It means the column was already added. Continue with the rest of the script.

### Error: "constraint already exists"  
**Solution:** That's OK! The foreign key was already created. Continue.

### Error: "relation does not exist"
**Solution:** Make sure you're running against the correct database. Check Supabase connection.

---

**Status:** ✅ Corrected and ready to deploy
**File:** `project_expenses_schema.sql`
**Last Updated:** April 7, 2026
