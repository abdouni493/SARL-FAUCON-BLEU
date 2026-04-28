# QUICK REFERENCE - ENTERPRISE SETTINGS FIX

## Your Errors (What's Causing Them)

```
406 Not Acceptable   ← SQL not executed (database table missing)
400 Bad Request      ← Storage bucket missing
Bucket not found     ← Storage bucket missing
```

## Your Interface Issues

```
settings.upload_failed      → NOW TRANSLATED: فشل التحميل
settings.supported_formats  → NOW TRANSLATED: الصيغ المدعومة: PNG, JPG, WebP
settings.max_file_size      → NOW TRANSLATED: الحد الأقصى لحجم الملف: 5 ميجابايت
```

## The Fix (3 Steps - 5 Minutes Total)

### ⏱️ STEP 1: Execute SQL (2 min)
**File:** `SQL_COMPLETE_FIX_ENTERPRISE_SETTINGS.sql`
```
Supabase → SQL Editor → New Query → Paste entire file → RUN
```

### ⏱️ STEP 2: Create Bucket (1 min)
**Location:** Supabase → Storage
```
Create new bucket
Name: logos
UNCHECK "Make it private" (must be PUBLIC)
Create
```

### ⏱️ STEP 3: Refresh (30 sec)
```
Press F5
Done!
```

## Expected Results After Fix

| Item | Status | Where |
|------|--------|-------|
| 406 error | ✅ GONE | Console |
| 400 error | ✅ GONE | Console |
| Bucket error | ✅ GONE | Console |
| Arabic translations | ✅ WORKING | Settings page |
| Logo upload | ✅ WORKS | Settings page |
| Logo in navbar | ✅ SHOWS | Circle (28×28) |
| Logo in sidebar | ✅ SHOWS | Square (36×36) |
| Logo in settings | ✅ SHOWS | Preview (128×128) |

## Files You Have

| File | Purpose | Action |
|------|---------|--------|
| `SQL_COMPLETE_FIX_ENTERPRISE_SETTINGS.sql` | Database setup | Execute in Supabase |
| `ENTERPRISE_SETTINGS_COMPLETE_FIX.md` | Full guide | Read for details |
| `ar.json` | Translations | ✅ Already updated |

## Verification (After Fix)

- [ ] Execute SQL → All ✅
- [ ] Create bucket → "PUBLIC" status
- [ ] Refresh browser → F5
- [ ] Check console → No 406/400 errors
- [ ] Upload logo → Success message
- [ ] Check navbar → Logo visible
- [ ] Check sidebar → Logo visible
- [ ] Check settings → Logo visible

## Database Info

```
Table: enterprise_settings
Columns:
  - id (UUID, primary key)
  - company_name (TEXT)
  - logo_url (TEXT - Supabase Storage URL)
  - created_by_id (UUID - user ID)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP - auto-updated)

RLS: Enabled (4 policies)
- select_own: Users see their own data
- insert_own: Users create their own data
- update_own: Users edit their own data
- delete_own: Users delete their own data
```

## Storage Info

```
Bucket: logos
Access: PUBLIC (not private)
Path pattern: /logos/logo_[user_id]_[timestamp]_[filename]
Format: PNG, JPG, WebP
Max size: 5MB
```

## Translation Keys Fixed

```
ar.json → settings
  ✅ upload_failed = "فشل التحميل"
  ✅ supported_formats = "الصيغ المدعومة: PNG, JPG, WebP"
  ✅ max_file_size = "الحد الأقصى لحجم الملف: 5 ميجابايت"
  ✅ logo_preview = "معاينة الشعار"
  ✅ upload_failed_with_size = "فشل التحميل. تأكد من حجم الملف وصيغته."
```

## How Logo Works (After Fix)

```
1. User selects image in Settings
2. uploadLogoToSupabase() uploads to /logos/ bucket
3. Gets public URL from storage
4. handleSaveEnterpriseSettings() saves URL to database
5. updateEnterpriseSettings() updates app context
6. Navbar component reads URL and displays circle
7. Sidebar component reads URL and displays square
8. Settings component displays preview

All components check for logo_url in context:
- Found → Display logo
- Not found → Show placeholder icon
```

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Still seeing 406 | Refresh browser (Ctrl+Shift+R) |
| Still seeing 400 | Create bucket, set PUBLIC, refresh |
| Logo won't upload | File < 5MB, format PNG/JPG/WebP |
| Keys still showing | Hard refresh (Ctrl+Shift+R) |

## Timeline

```
Now → Execute SQL (2 min)
     ↓
     Create bucket (1 min)
     ↓
     Refresh (30 sec)
     ↓
     Everything works ✅
     
Total: 3.5 minutes
```

## What Changed

**Translation File (ar.json):**
- ✅ Added 5 new translation keys for logo upload

**SQL File (SQL_COMPLETE_FIX_ENTERPRISE_SETTINGS.sql):**
- ✅ Created with full setup (table, RLS, indexes, triggers)

**Database (Supabase):**
- ⏳ Waiting for SQL execution
- ⏳ Waiting for bucket creation

## Need More Details?

Read: `ENTERPRISE_SETTINGS_COMPLETE_FIX.md`

## Ready?

1. Execute SQL ✓
2. Create bucket ✓
3. Refresh ✓
4. Done ✓
