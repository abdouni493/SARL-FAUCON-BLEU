# ⚠️ SQL Syntax Error - Solution Guide

## Problem Encountered
```
Error: Failed to run sql query: ERROR: 42601: syntax error at or near "POLICY" LINE 11
```

This error occurred when trying to execute `FIX_PAYMENT_ORDERS_RLS_FINAL.sql`

---

## Solution: Use the Simpler Version ✅

We've created an alternative SQL file that should work: **FIX_PAYMENT_ORDERS_RLS_SIMPLE.sql**

### Why This Works:
- ✅ Removes complex error-handling code
- ✅ Uses straightforward CREATE POLICY statements
- ✅ Avoids potential DROP POLICY syntax issues
- ✅ Still creates all 5 required RLS policies
- ✅ Includes verification queries

---

## How to Use FIX_PAYMENT_ORDERS_RLS_SIMPLE.sql

### Step 1: Open the New File
```
File: FIX_PAYMENT_ORDERS_RLS_SIMPLE.sql
Location: Root of your erp_build folder
```

### Step 2: Copy All Content
```
Select All (Ctrl+A)
Copy (Ctrl+C)
```

### Step 3: Paste in Supabase SQL Editor
```
1. Go to: https://supabase.com/
2. Select your ERP project
3. Click: SQL Editor → New Query
4. Paste the SQL (Ctrl+V)
5. Click: Execute (▶️ button)
```

### Step 4: Watch for Success Message
```
Expected: "Query executed successfully"
(Not: "ERROR" or red text)
```

---

## If You Still Get an Error

### Issue: "Policy already exists"
**Cause**: An old policy with the same name exists  
**Solution**: The new SQL file uses different policy names that shouldn't conflict

### Issue: "Undefined table"
**Cause**: Table name is wrong  
**Solution**: Verify tables exist with: `SELECT * FROM pg_tables WHERE tablename IN ('payment_orders', 'bons_commandes');`

### Issue: Still getting syntax error
**Solution**: Try executing line-by-line:
1. Comment out the verification queries (lines starting with `--`)
2. Execute just the CREATE POLICY statements
3. Then run the verification queries separately

---

## Comparison of Files

| File | Approach | Best For |
|------|----------|----------|
| FIX_PAYMENT_ORDERS_RLS_FINAL.sql | Complex error handling | Advanced users |
| FIX_PAYMENT_ORDERS_RLS_SIMPLE.sql | Straightforward statements | Most users ✅ |

---

## Quick Fix (5 minutes)

1. **Copy**: FIX_PAYMENT_ORDERS_RLS_SIMPLE.sql
2. **Paste**: In Supabase SQL Editor
3. **Execute**: Click Play button
4. **Done**: Refresh your React app

---

## Verification

After executing, run these queries to confirm it worked:

### Query 1: Check RLS Status
```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('payment_orders', 'bons_commandes');
```
**Expected**: Both show `true`

### Query 2: Check Policies
```sql
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('payment_orders', 'bons_commandes');
```
**Expected**: 5 policies listed

---

## Next Steps

1. ✅ Execute FIX_PAYMENT_ORDERS_RLS_SIMPLE.sql
2. ✅ Run verification queries
3. ✅ Refresh your React app (Ctrl+F5)
4. ✅ Test Payment Orders interface
5. ✅ Verify no 403 errors in console

**Time**: 5-10 minutes total

---

## Still Having Issues?

If the simple version doesn't work:

1. Check that RLS is actually enabled on the tables
2. Verify the table names are exactly: `payment_orders` and `bons_commandes`
3. Check that you're in the correct Supabase project
4. Look for any red error messages in the Supabase SQL Editor output

---

**Last Updated**: April 6, 2026  
**Status**: Ready to use  
**Expected Outcome**: All 403 errors resolved after executing the simple SQL
