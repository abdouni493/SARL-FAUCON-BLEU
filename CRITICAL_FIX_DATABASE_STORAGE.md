# 🔧 CRITICAL: Fix Database & Storage FIRST (5 Minutes)

## ❌ Your Current Errors

```
406 Not Acceptable - Can't save logo to database
400 Bad Request - Storage bucket missing
StorageApiError: Bucket not found
```

**These MUST be fixed before logo saves/displays work**

---

## ✅ Step 1: Execute SQL Migration (2 Minutes)

### In Supabase Dashboard:
1. **Dashboard** → **SQL Editor** (left menu)
2. Click **"New Query"**
3. **COPY** entire content from: `SQL_SETTINGS_PAGE_WITH_LOGO.sql`
4. **PASTE** into the SQL editor
5. Click **"RUN"** button
6. **Wait** - all 9 statements should show ✅

```
✅ CREATE TABLE enterprise_settings
✅ ALTER TABLE ENABLE ROW LEVEL SECURITY
✅ CREATE POLICY select_own
✅ CREATE POLICY insert_own
✅ CREATE POLICY update_own
✅ CREATE POLICY delete_own
✅ CREATE TRIGGER set_enterprise_settings_updated_at
✅ CREATE INDEX idx_enterprise_settings_created_by
✅ CREATE INDEX idx_enterprise_settings_updated_at
```

**If you see ✅ on all 9:** ✨ **406 error is FIXED**

---

## ✅ Step 2: Create Storage Bucket (1 Minute)

### In Supabase Dashboard:
1. **Storage** (left menu, under Data)
2. Click **"Create new bucket"** button
3. **Name:** `logos` (lowercase, exact spelling)
4. **IMPORTANT:** Uncheck box "Make it private"
   - Should show: **"Public"** 
5. Click **"Create bucket"**

**Wait for bucket to appear in list** → ✨ **400 error is FIXED**

---

## ✅ Step 3: Refresh Browser

```
Press F5
Go to Settings page
Try uploading logo again
```

**Expected result:**
- ✅ No 406 error
- ✅ No 400 error  
- ✅ No "Bucket not found" error
- ✅ Logo uploads successfully
- ✅ Logo appears in sidebar
- ✅ Logo appears in navbar

---

## 📋 Verification Checklist

### SQL Migration ✅
- [ ] Opened Supabase Dashboard
- [ ] Went to SQL Editor
- [ ] Created New Query
- [ ] Copied SQL_SETTINGS_PAGE_WITH_LOGO.sql
- [ ] Pasted entire content
- [ ] Clicked RUN
- [ ] All 9 statements show ✅

### Storage Bucket ✅
- [ ] Opened Storage in Supabase
- [ ] Clicked "Create new bucket"
- [ ] Named it "logos" (lowercase)
- [ ] Unchecked "Make it private"
- [ ] Verified it shows "Public"
- [ ] Clicked "Create bucket"
- [ ] Bucket appears in storage list

### Browser ✅
- [ ] Pressed F5 to refresh
- [ ] Navigated to Settings page
- [ ] Attempted logo upload
- [ ] No errors in console
- [ ] Logo saved successfully

---

## 🎯 What This Fixes

| Error | Fix |
|-------|-----|
| 406 Not Acceptable | SQL migration creates table + RLS |
| 400 Bad Request | Storage bucket now exists |
| Bucket not found | Bucket is now public & accessible |
| Logo won't save | Database table ready to store |
| Logo won't display | Database can retrieve logo URL |

---

## ⏱️ Timeline

**Total time: 5 minutes**
- SQL: 2 min
- Bucket: 1 min  
- Browser refresh: 30 sec
- Testing: 90 sec

---

## 🚀 After These Steps

Logo will:
- ✅ Save to database (enterprise_settings.logo_url)
- ✅ Display in Settings sidebar
- ✅ Display in navbar as circle
- ✅ Persist on page refresh
- ✅ Load when page opens

---

## 📞 Still Getting Errors?

If you still see errors after steps above:

1. **Check browser console** (F12)
2. **Verify bucket shows PUBLIC** (not Private)
3. **Verify SQL shows all ✅** (not warnings/errors)
4. **Try refreshing page** (F5)
5. **Try clearing browser cache** (Ctrl+Shift+Del)
6. **Try incognito window** (test)

---

## Next: After SQL + Bucket Are Set Up

→ Read: `LOGO_DISPLAY_SIDEBAR_NAVBAR.md`

This shows how the logo will display everywhere once database/storage are ready.

---

**⏰ DO THIS NOW - It's the ONLY blocker!**
