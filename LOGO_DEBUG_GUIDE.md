# 🔍 Logo Display Debug Guide

## 📊 What to Check in Browser Console (F12)

After uploading a logo and clicking Save, you'll see debug logs. Follow this checklist:

---

## ✅ STEP 1: Upload Success
```
🚀 Uploading logo: logo_6ca491f6-ac4e-4d22-baa0-9b6208f3a3cc_1775508663786.png
✅ Upload successful: {path: '...', id: '...', fullPath: '...'}
🔗 CONSTRUCTED URL: https://vcelsivddzkopucoouwi.supabase.co/storage/v1/object/public/logos/logo_...
```

**Expected:** URL should start with `https://` and end with `.png/.jpg/.webp`

**If missing:** Upload failed to Supabase storage

---

## ✅ STEP 2: Save to Database
```
💾 SAVING TO DATABASE:
   - created_by_id: 6ca491f6-ac4e-4d22-baa0-9b6208f3a3cc
   - company_name: ERP System
   - logo_url: https://vcelsivddzkopucoouwi.supabase.co/storage/v1/object/public/logos/...
   - logo_url type: string
   - logo_url length: 127
   - logo_url empty?: false

✅ SAVE SUCCESSFUL - DB returned: {...}
   - DB logo_url: https://vcelsivddzkopucoouwi.supabase.co/storage/v1/object/public/logos/...
```

**Expected:** 
- `logo_url type: string`
- `logo_url empty?: false`
- `logo_url length:` > 0

**If `empty?: true`:** Database saving empty string instead of URL

---

## ✅ STEP 3: Settings Sync
```
=== SETTINGS SYNC DEBUG ===
enterpriseSettings: {
  name: 'ERP System',
  logoUrl: 'https://vcelsivddzkopucoouwi.supabase.co/storage/v1/object/public/logos/...'
}
logoUrl value: https://vcelsivddzkopucoouwi.supabase.co/storage/v1/object/public/logos/...
logoUrl type: string
logoUrl empty?: false
logoUrl null?: false
logoUrl valid?: true
========================
```

**Expected:**
- `logoUrl valid?: true`
- `logoUrl empty?: false`
- URL should be visible

**If `valid?: false`:** Context not updated correctly

---

## ✅ STEP 4: Component Rendering
```
CompanyLogo Debug: {
  logoUrl: 'https://vcelsivddzkopucoouwi.supabase.co/storage/v1/object/public/logos/...',
  hasValidUrl: true,
  isEmpty: false,
  isNull: false,
  isUndefined: false
}
```

**Expected:** `hasValidUrl: true`

**If `hasValidUrl: false`:** Component won't render image

---

## ✅ STEP 5: Image Loading
```
Image loaded successfully: https://vcelsivddzkopucoouwi.supabase.co/storage/v1/object/public/logos/...
```

**Expected:** This confirms image is found and loading

**If missing:** Image URL is broken or bucket not PUBLIC

---

## ❌ TROUBLESHOOTING

### Problem 1: Empty String Being Saved
```
💾 SAVING TO DATABASE:
   - logo_url: ''
   - logo_url empty?: true
```

**Fix:** In `handleSaveEnterpriseSettings`, check:
```tsx
if (!finalLogoUrl || finalLogoUrl === '') {
  setLogoError('Logo URL is empty');
  return;
}
```

---

### Problem 2: URL Not Valid
```
CompanyLogo Debug: {
  logoUrl: '',
  hasValidUrl: false
}
```

**Fix:** URL is empty string. Either:
- Logo not uploaded (check Step 1)
- Upload URL not returned (check Step 2)
- Context not updated (check Step 3)

---

### Problem 3: Image Won't Load
```
❌ Image failed to load. URL was: https://...
```

**Fix:** Bucket is not PUBLIC. Go to Supabase:
1. Storage → logos bucket
2. Settings → Make PUBLIC

Or manually test URL in browser - if it gives 403, bucket needs to be public.

---

### Problem 4: Component Shows Placeholder
```
CompanyLogo Debug: {
  logoUrl: '',
  hasValidUrl: false
}
```

**Fix:** logoUrl is empty. Trace back:
- Did upload work? (Check Step 1)
- Did save work? (Check Step 2)
- Did context update? (Check Step 3)

---

## 🧪 Manual Testing

**Test 1: Verify URL is Public**
1. Copy the URL from console
2. Open in NEW browser tab
3. Should see your logo image
4. If 403 error → bucket not PUBLIC

**Test 2: Verify Database Save**
1. Go to Supabase Dashboard
2. SQL Editor → Run:
```sql
SELECT id, created_by_id, company_name, logo_url 
FROM enterprise_settings 
WHERE created_by_id = '6ca491f6-ac4e-4d22-baa0-9b6208f3a3cc';
```
3. Check if `logo_url` has full URL

**Test 3: Verify Settings Load**
1. Refresh page (F5)
2. Open console
3. Look for `=== SETTINGS SYNC DEBUG ===`
4. Check if `logoUrl valid?: true`

---

## 📝 Notes

- All debug logs are marked with emoji (🚀, ✅, ❌, 📋, etc.)
- Look for these in order to trace the flow
- If any step shows empty/false, that's where the bug is
- The component `CompanyLogo` only renders `<img>` if `hasValidUrl: true`
- If `hasValidUrl: false`, you only see the gradient circle + Building icon

---

## 🎯 Quick Checklist

- [ ] Step 1: Upload log shows ✅
- [ ] Step 2: Save log shows valid URL
- [ ] Step 3: Settings sync shows valid: true
- [ ] Step 4: Component shows hasValidUrl: true
- [ ] Step 5: Image loads successfully
- [ ] Sidebar shows logo circle
- [ ] Navbar shows logo circle
- [ ] Settings preview shows logo circle
- [ ] Refresh persists logo

If all ✅, logo is working!
