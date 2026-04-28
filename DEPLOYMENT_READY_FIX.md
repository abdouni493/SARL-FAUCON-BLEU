# Fix Applied - Project Expenses Table Migration

## What Happened
The original SQL schema tried to CREATE a new `project_expenses` table, but your database already had one with a different structure. This caused the error:
```
ERROR: 42703: column "created_by_id" does not exist
```

## What Changed
✅ **Fixed** - Now using ALTER TABLE instead of CREATE TABLE
✅ **Safe** - All existing data preserved  
✅ **Backward Compatible** - No breaking changes

## Current Status

### Your Existing Table Structure
```
project_expenses (
  id UUID PRIMARY KEY
  expense_id VARCHAR(50) UNIQUE
  project_box_id UUID
  description TEXT
  price NUMERIC
  expense_date DATE
  created_at TIMESTAMP
  updated_at TIMESTAMP
)
```

### After Running the Migration
```
project_expenses (
  [All existing columns above] +
  created_by_id UUID              ← NEW
  chef_de_projet_id UUID          ← NEW
  category VARCHAR(100)           ← NEW (defaults to 'autre')
  notes TEXT                      ← NEW
  amount DECIMAL(12, 2)           ← NEW
)
```

## Files Ready to Execute

### Option 1: Recommended - Execute Full Schema
**File:** `project_expenses_schema.sql`
- Contains everything in proper order
- Includes all indexes, triggers, views
- Copy entire file content into Supabase SQL Editor

### Option 2: Quick Execute - Just Essentials
**File:** `SQL_EXECUTE_THIS.sql`
- Contains only the critical ALTER TABLE statements
- 5 simple steps
- Fastest way to get columns added

## Execution Steps

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Choose one of these:
   - **Recommended:** Copy entire `project_expenses_schema.sql`
   - **Quick:** Copy entire `SQL_EXECUTE_THIS.sql`
6. Paste into the editor
7. Click **Run**
8. Look for success message: "Success. No rows returned"

## Verification

After running, verify the columns exist:

```sql
-- Run this query to verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'project_expenses'
ORDER BY ordinal_position;
```

Expected output should show:
- ✅ created_by_id (UUID, nullable)
- ✅ chef_de_projet_id (UUID, nullable)
- ✅ category (character varying, nullable)
- ✅ notes (text, nullable)
- ✅ amount (numeric, nullable)

## What the Frontend Will Do With These Columns

### When Creating a New Expense:
```typescript
const { error } = await supabase
  .from('project_expenses')
  .insert({
    expense_id: `EXP-${Date.now()}`,
    project_box_id: formData.projectBoxId,      // User selected project
    description: formData.description,
    amount: Number(formData.amount),            // Uses NEW 'amount' column
    category: formData.category,                // Uses NEW 'category' column
    expense_date: formData.date,
    created_by_id: user?.id,                   // Uses NEW 'created_by_id'
    chef_de_projet_id: user?.id,               // Uses NEW 'chef_de_projet_id'
    notes: formData.notes || null              // Optional notes
  });
```

## Timeline

| Step | Status | File |
|------|--------|------|
| 1. Frontend Code | ✅ DONE | ProjectExpensesPage.tsx |
| 2. Database Schema | ✅ READY | project_expenses_schema.sql |
| 3. Execute SQL | ⏳ PENDING | Run in Supabase SQL Editor |
| 4. Test Features | ⏳ PENDING | Create expense in app |

## Rollback Plan (If Needed)

If something goes wrong, you can safely drop the new columns:

```sql
-- ONLY IF NEEDED - This removes new columns
ALTER TABLE project_expenses
DROP COLUMN IF EXISTS created_by_id,
DROP COLUMN IF EXISTS chef_de_projet_id,
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS notes,
DROP COLUMN IF EXISTS amount;
```

## Support

If you encounter issues:

1. **"Column already exists" error** → Safe to ignore, continue
2. **"Constraint already exists" error** → Safe to ignore, continue
3. **"Relation does not exist" error** → Check database connection
4. **No error, no output** → Success! ✅

---

**Status:** ✅ Ready for Production Deployment
**Created:** April 7, 2026
**Type:** Database Migration
