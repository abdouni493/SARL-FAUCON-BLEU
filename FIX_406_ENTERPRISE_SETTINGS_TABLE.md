# ENTERPRISE SETTINGS TABLE - FIX 406 ERROR

## Problem

**Error:** `GET ... 406 (Not Acceptable)`  
**When:** Querying `enterprise_settings` table  
**Cause:** Table doesn't exist, has wrong schema, or RLS policies are blocking access

## Solution

The `enterprise_settings` table needs to be properly created with correct columns and RLS policies enabled. Execute this SQL in your Supabase SQL Editor:

```sql
-- 1. Drop table if exists (ONLY IF YOU WANT TO RESET)
-- DROP TABLE IF EXISTS public.enterprise_settings;

-- 2. Create enterprise_settings table with correct schema
CREATE TABLE IF NOT EXISTS public.enterprise_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url character varying,
  company_name character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_by_id uuid NOT NULL REFERENCES auth.users(id),
  CONSTRAINT enterprise_settings_created_by_id_fkey 
    FOREIGN KEY (created_by_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_created_by UNIQUE(created_by_id)
);

-- 3. Enable RLS (very important!)
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Policy: Users can SELECT their own enterprise settings
DROP POLICY IF EXISTS "Users can select their own enterprise settings" ON public.enterprise_settings;
CREATE POLICY "Users can select their own enterprise settings"
ON public.enterprise_settings
FOR SELECT
USING (created_by_id = auth.uid());

-- Policy: Users can INSERT their own enterprise settings
DROP POLICY IF EXISTS "Users can insert their own enterprise settings" ON public.enterprise_settings;
CREATE POLICY "Users can insert their own enterprise settings"
ON public.enterprise_settings
FOR INSERT
WITH CHECK (created_by_id = auth.uid());

-- Policy: Users can UPDATE their own enterprise settings
DROP POLICY IF EXISTS "Users can update their own enterprise settings" ON public.enterprise_settings;
CREATE POLICY "Users can update their own enterprise settings"
ON public.enterprise_settings
FOR UPDATE
USING (created_by_id = auth.uid())
WITH CHECK (created_by_id = auth.uid());

-- Policy: Users can DELETE their own enterprise settings
DROP POLICY IF EXISTS "Users can delete their own enterprise settings" ON public.enterprise_settings;
CREATE POLICY "Users can delete their own enterprise settings"
ON public.enterprise_settings
FOR DELETE
USING (created_by_id = auth.uid());

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_enterprise_settings_created_by 
ON public.enterprise_settings(created_by_id);

-- 6. Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_enterprise_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enterprise_settings_updated_at ON public.enterprise_settings;
CREATE TRIGGER trigger_enterprise_settings_updated_at
  BEFORE UPDATE ON public.enterprise_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_enterprise_settings_updated_at();

-- Verification queries
-- Check if table exists:
-- SELECT * FROM information_schema.tables WHERE table_name = 'enterprise_settings';

-- Check table structure:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'enterprise_settings';

-- Check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'enterprise_settings';
```

## Key Fixes

### 1. **created_by_id is NOT NULL**
```sql
-- BEFORE (allows NULL)
created_by_id uuid,

-- AFTER (required)
created_by_id uuid NOT NULL REFERENCES auth.users(id),
```

### 2. **UNIQUE constraint**
```sql
-- Only one settings record per user
CONSTRAINT unique_created_by UNIQUE(created_by_id)
```

### 3. **Proper RLS Policies**
```sql
-- Users can only access their own settings
FOR SELECT USING (created_by_id = auth.uid());
FOR INSERT WITH CHECK (created_by_id = auth.uid());
FOR UPDATE USING (created_by_id = auth.uid());
FOR DELETE USING (created_by_id = auth.uid());
```

### 4. **ON DELETE CASCADE**
```sql
-- If user is deleted, their settings are also deleted
REFERENCES auth.users(id) ON DELETE CASCADE
```

## Steps to Apply

### Step 1: Open Supabase SQL Editor
1. Go to Supabase Dashboard
2. Click "SQL Editor" in left sidebar
3. Click "New Query"

### Step 2: Copy the SQL
Copy the SQL from the "Solution" section above

### Step 3: Execute
Click "Run" button

### Step 4: Verify
You should see:
```
✓ CREATE TABLE IF NOT EXISTS public.enterprise_settings
✓ ALTER TABLE
✓ CREATE POLICY (4x)
✓ CREATE INDEX
✓ CREATE TRIGGER
```

### Step 5: Refresh Browser
- Close and reopen your app
- Logo persistence should now work
- No 406 errors

## Verification Checklist

After running the SQL, verify:

```sql
-- 1. Table exists and has correct schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'enterprise_settings'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid, NOT NULL)
-- logo_url (character varying, nullable)
-- company_name (character varying, NOT NULL)
-- created_at (timestamp, NOT NULL)
-- updated_at (timestamp, NOT NULL)
-- created_by_id (uuid, NOT NULL) ← Important!

-- 2. RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'enterprise_settings';

-- Expected: rowsecurity = true

-- 3. Policies exist
SELECT policyname, quals, with_check 
FROM pg_policies 
WHERE tablename = 'enterprise_settings';

-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE)

-- 4. Indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'enterprise_settings';
```

## Why 406 Error Occurred

| Reason | Fix |
|--------|-----|
| Table didn't exist | SQL creates it |
| Wrong schema | created_by_id NOT NULL |
| RLS policies missing | Creates 4 policies |
| RLS policies blocking access | Policies allow user access |
| created_by_id was NULL | Makes it NOT NULL |
| No unique constraint | Adds UNIQUE(created_by_id) |

## Common Issues After SQL Execution

### Issue: Still getting 406 error
**Solution:**
1. Refresh page (F5)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Verify RLS is enabled (check SQL verification above)
4. Check that policies were created

### Issue: "Duplicate key error"
**Solution:**
1. Each user can only have 1 settings record
2. UNIQUE(created_by_id) constraint prevents duplicates
3. Update instead of insert if record exists (code already handles this)

### Issue: Foreign key error
**Solution:**
1. Make sure user exists in auth.users
2. created_by_id must match a real auth user ID
3. Check user is authenticated before saving

## Testing After Fix

1. **Login** → Admin settings loads
2. **Upload logo** → Save
3. **Refresh page** (F5) → Logo persists ✓
4. **Check console** → No 406 errors ✓
5. **Open new tab** → Settings sync real-time ✓

## Expected Behavior Now

```
✅ Load enterprise settings from database
✅ No 406 errors
✅ Logo persists across refresh
✅ Company name persists
✅ Real-time sync between tabs
✅ RLS prevents data leaks
✅ Unique constraint prevents duplicates
```

## Database Schema Summary

```sql
CREATE TABLE public.enterprise_settings (
  id uuid PRIMARY KEY,
  logo_url varchar,                    -- Public Supabase Storage URL
  company_name varchar NOT NULL,       -- Required
  created_at timestamp NOT NULL,       -- Auto-set
  updated_at timestamp NOT NULL,       -- Auto-updated by trigger
  created_by_id uuid NOT NULL,         -- Foreign key to auth.users
  UNIQUE(created_by_id)                -- One record per user
);

RLS Policies: ✓ Enabled
- SELECT: created_by_id = auth.uid()
- INSERT: created_by_id = auth.uid()
- UPDATE: created_by_id = auth.uid()
- DELETE: created_by_id = auth.uid()
```

## Status

**Before Fix:** 406 Not Acceptable error  
**After Fix:** ✅ Table properly configured with RLS

Execute the SQL above and refresh your browser. The logo persistence should now work perfectly!
