# QUICK REFERENCE - ENTERPRISE SETTINGS FIX

## The Problem
```
❌ 406 Not Acceptable
❌ 400 Bad Request  
❌ Bucket not found
❌ Logo won't save
❌ فشل التحميل
```

## The Solution

### 1. Execute SQL (1 minute)

**File**: `SQL_ENTERPRISE_SETTINGS_FIXED.sql`

```
Supabase → SQL Editor → New Query
Copy & Paste → RUN
```

### 2. Create Bucket (1 minute)

**In Supabase Storage**:
```
Name: logos
Access: PUBLIC (UNCHECK private)
```

### 3. Code Already Fixed ✅

- DataContext.tsx ← Updated
- SettingsPage.tsx ← Updated

### 4. Refresh Browser

```
Press: F5
```

### 5. Test

```
Settings → Upload Logo → Save → Done! ✅
```

---

## What Changed

### DataContext.tsx

```typescript
// BEFORE
.single() // ❌ throws 406 if no row

// AFTER  
.maybeSingle() // ✅ returns null safely
if (!data) await createDefaultSettings()
```

### SettingsPage.tsx

```typescript
// BEFORE
const filePath = `logos/${fileName}`  // ❌ wrong path
.upload(filePath, file, { upsert: true }) // ❌ no contentType
// Manual insert OR update

// AFTER
const fileName = `logo_${id}_${time}.ext`  // ✅ correct
.upload(fileName, file, { 
  contentType: file.type  // ✅ added
})
.upsert({...}, onConflict: 'created_by_id')  // ✅ auto insert/update
```

---

## Expected Result

```
✅ No 406 errors
✅ No 400 errors
✅ Logo uploads
✅ Logo saves
✅ Logo displays (navbar circle + sidebar square)
✅ Settings persist
✅ Works every time
```

---

## Total Time: 5 Minutes

Execute SQL → Create bucket → Refresh → Test → DONE! 🎉

