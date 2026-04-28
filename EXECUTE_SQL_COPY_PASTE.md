# EXECUTE THIS SQL - COPY & PASTE

## What This SQL Does

Creates the database table that your app is looking for (enterprise_settings)

---

## HOW TO EXECUTE (1 minute)

### Step A: Copy the SQL

**In VS Code:**
- File is open: `SQL_FRESH_START_ENTERPRISE_SETTINGS.sql`
- Select All: `Ctrl+A`
- Copy: `Ctrl+C`

### Step B: Paste into Supabase

**In Supabase Dashboard:**
1. Go to: SQL Editor (left menu)
2. Click: "New Query" (blue button, top right)
3. Paste: `Ctrl+V`
4. Click: RUN (blue button)

### Step C: See Results

You should see:
```
✅ DROP TABLE statement
✅ CREATE TABLE statement
✅ RLS policies (4 policies)
✅ Indexes (2 indexes)
✅ Trigger
✅ All verification queries showing ✅
```

---

## What SQL Creates

```
Table: enterprise_settings
├─ id (UUID)
├─ created_by_id (UUID) - Your user ID
├─ company_name (TEXT) - Company name
├─ logo_url (TEXT) - Logo file URL
├─ created_at (TIMESTAMP) - Created date
├─ updated_at (TIMESTAMP) - Updated date
└─ RLS Security (4 policies)
```

---

## After SQL Executes

✅ Your app can query the table (406 error GONE)
✅ Ready for next step: Create "logos" bucket

---

## Create Storage Bucket (1 minute)

**In Supabase Dashboard:**

1. Click: Storage (left menu)
2. Click: "Create new bucket"
3. Fill in:
   - Name: `logos` (lowercase)
   - ❌ UNCHECK "Make it private"
4. Click: "Create bucket"

Result: Bucket appears in list, status: PUBLIC ✅

---

## Refresh Browser (30 seconds)

Press: `F5`

Done! Now test...

---

## Test Logo Upload

1. Go to: Settings page (⚙️ icon)
2. Scroll to: "Enterprise Settings"
3. Click: "Upload Logo"
4. Select: Image file (PNG/JPG)
5. Click: "Save Enterprise Settings"

**Expected:**
- ✅ Success message
- ✅ Logo shows in navbar (circle, top right)
- ✅ Logo shows in sidebar (square, left side)
- ❌ No 406 error
- ❌ No 400 error
- ❌ No "Bucket not found"

---

## Done! 🎉

All errors FIXED!

