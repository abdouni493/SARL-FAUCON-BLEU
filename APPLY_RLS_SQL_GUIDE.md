# How to Apply the RLS SQL Fix to Supabase

## ⚠️ IMPORTANT: This is the KEY step to fix the 403 Forbidden errors!

The payment orders interface shows "Aucune donnée" (No data) because your Supabase database RLS policies are blocking access. This guide will fix it.

---

## Step 1: Open Supabase Dashboard

1. Go to https://supabase.com/
2. Log in with your account
3. Select your project: **ERP System**

---

## Step 2: Navigate to SQL Editor

1. Click **SQL Editor** in the left sidebar
2. Click **+ New Query** (top left)

---

## Step 3: Copy and Paste the SQL

1. Open the file: `FIX_PAYMENT_ORDERS_RLS.sql` from your project
2. Copy ALL the SQL code (lines 1-72)
3. Paste into the Supabase SQL Editor

**The SQL includes:**
- Removes old restrictive policies
- Enables RLS on payment_orders table
- Creates new permissive policies for all authenticated users
- Same for bons_commandes table (needed for search dropdown)
- Verification queries to confirm success

---

## Step 4: Execute the SQL

1. Click the **Play button** (▶️) in the top right of the SQL editor
2. Wait for the query to complete (you should see green checkmarks ✅)

---

## Step 5: Verify Success

You should see output like:

```
tablename        | rowsecurity
payment_orders   | true
bons_commandes   | true
```

This confirms RLS is enabled and policies are applied.

---

## Step 6: Refresh Your App

1. Go back to your React app
2. Press **F5** to hard refresh the page
3. Navigate to **Ordres de Paiement** (Payment Orders)

---

## ✅ What You Should See After Applying SQL

- ✅ No more "403 Forbidden" errors in console
- ✅ Payment orders list displays (or "No data" if empty, but accessible)
- ✅ Can create new payment orders
- ✅ Can search for bons de commande in dropdown
- ✅ Can edit/delete/validate payment orders

---

## 🔍 Troubleshooting

### Still seeing 403 errors?

1. **Verify SQL executed:** Run this query in Supabase SQL Editor:
   ```sql
   SELECT policyname FROM pg_policies 
   WHERE tablename = 'payment_orders';
   ```
   
   You should see 4 policies:
   - Enable read access for all authenticated users
   - Enable insert for authenticated users
   - Enable update for authenticated users
   - Enable delete for authenticated users

2. **Check RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE tablename = 'payment_orders';
   ```
   
   Should show: `payment_orders | true`

3. **Check your auth session:** Logout and login again to ensure fresh Supabase session

### If SQL execution fails?

- Make sure you're in **Supabase SQL Editor** (not another tool)
- Copy the ENTIRE content from `FIX_PAYMENT_ORDERS_RLS.sql`
- Run it as a single query (don't split it)
- Check for any error messages in red

---

## 📋 What the SQL Does

| Table | Policy | Effect |
|-------|--------|--------|
| payment_orders | SELECT | All authenticated users can view all payment orders |
| payment_orders | INSERT | All authenticated users can create payment orders |
| payment_orders | UPDATE | All authenticated users can edit payment orders |
| payment_orders | DELETE | All authenticated users can delete payment orders |
| bons_commandes | SELECT | All authenticated users can view bons de commande |

---

## ❓ Questions?

The error message "Aucune donnée" (No data) is fine - it means:
- ✅ RLS is working (access granted)
- ✅ No payment orders exist yet (empty database)
- ✅ You can now create new ones!

If you still see 403 errors after running this SQL, there may be an issue with your Supabase database configuration.
