# Fix Image Upload Issue - Supabase Storage & RLS Policies

## Problem Analysis

**Error**: `POST 400 (Bad Request)` when uploading images to the "offers" bucket

**Root Cause**: Insufficient RLS (Row Level Security) policies on the Supabase storage bucket

---

## Solution: Configure Proper RLS Policies

### Step 1: Go to Supabase Dashboard

1. Navigate to: https://supabase.com/dashboard/project/vcelsivddzkopucoouwi/storage
2. Click on **"offers"** bucket
3. Click on **"Policies"** tab

---

### Step 2: Create Required Policies

You need to create **4 policies** for full functionality:

#### Policy 1: Allow Authenticated Users to Upload
```
Name: Allow authenticated users to upload
Type: INSERT
Target: storage.objects
Condition:
- bucket_id = 'offers'
- auth.role() = 'authenticated'
```

#### Policy 2: Allow Authenticated Users to Read/View
```
Name: Allow authenticated to read
Type: SELECT
Target: storage.objects
Condition:
- bucket_id = 'offers'
- auth.role() = 'authenticated'
```

#### Policy 3: Allow Authenticated Users to Update
```
Name: Allow authenticated to update own files
Type: UPDATE
Target: storage.objects
Condition:
- bucket_id = 'offers'
- auth.role() = 'authenticated'
```

#### Policy 4: Allow Public Read Access (View Images)
```
Name: Allow public read access
Type: SELECT
Target: storage.objects
Condition:
- bucket_id = 'offers'
- (auth.role() = 'authenticated' OR auth.role() = 'anon')
```

---

### Step 3: Alternative - Quick Setup via SQL

If the UI approach doesn't work, use SQL directly:

```sql
-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;

-- Create new comprehensive policies
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'offers' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated select"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'offers' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated update"
ON storage.objects
FOR UPDATE
WITH CHECK (
  bucket_id = 'offers' 
  AND auth.role() = 'authenticated'
)
USING (
  bucket_id = 'offers' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'offers'
);
```

---

## Updated Upload Function Changes

The code has been updated to:

1. ✅ **Use File Object Directly** - No ArrayBuffer conversion needed
2. ✅ **Better Error Handling** - Detailed error messages
3. ✅ **File Validation** - Size and type checks
4. ✅ **Sanitized File Names** - Prevent conflicts with random suffix
5. ✅ **Store Image Path** - Save both URL and path to database
6. ✅ **Cache Headers** - Added cacheControl for performance

### Key Changes in `handleImageUpload`:

```typescript
// Before (❌ Was causing 400 error):
const { error: uploadError } = await supabase.storage
  .from('offers')
  .upload(filePath, uint8Array, { 
    upsert: true,
    contentType: file.type 
  });

// After (✅ Correct approach):
const { data, error: uploadError } = await supabase.storage
  .from('offers')
  .upload(sanitizedFileName, file, {
    cacheControl: '3600',
    upsert: false
  });
```

### What Changed:
| Aspect | Before | After |
|--------|--------|-------|
| File Format | ArrayBuffer/Uint8Array | File object (direct) |
| File Name | `bon-{id}-{timestamp}.ext` | `{timestamp}-{random}.ext` |
| Upsert | `true` | `false` |
| Cache | Not set | 3600 seconds |
| Error Handling | Basic | Detailed with validation |
| Path Storage | Not saved | Saved to database |

---

## Database Update

The `bons_commandes_offers` table now properly stores:
- `image_url` - Public URL for display
- `image_path` - Storage path for management

Both fields are populated when an image is uploaded.

---

## Testing Checklist

After applying the policies:

- [ ] Click manage button on a bon
- [ ] Go to "Offers" tab
- [ ] Click image upload area
- [ ] Select an image (PNG, JPG, max 5MB)
- [ ] Image should upload successfully
- [ ] Green checkmark should appear
- [ ] Message shows "✅ Image uploaded successfully!"
- [ ] No console errors

---

## Troubleshooting

### If Still Getting 400 Error:

1. **Check Authentication**
   ```typescript
   // In browser console
   const { data } = await supabase.auth.getUser();
   console.log('User:', data.user);
   ```

2. **Verify Bucket Exists**
   - Go to Storage → Buckets
   - Confirm "offers" bucket is listed
   - Confirm it's "Public"

3. **Check Policies Applied**
   - Go to offers bucket → Policies
   - You should see 4 policies listed
   - Verify each one is enabled

4. **Clear Browser Cache**
   - Press F12 → Application → Storage → Clear All
   - Refresh page

5. **Check Supabase Project**
   - Verify project ID: `vcelsivddzkopucoouwi`
   - Verify bucket name: `offers`
   - Check no typos

---

## File Upload Flow (Updated)

```
User selects file from input
    ↓
handleImageUpload() called
    ↓
Validate file:
  - Max size: 5MB
  - Type: image/*
    ↓
Generate sanitized filename
  - Format: {timestamp}-{random}.ext
    ↓
Upload to Supabase storage
  - Bucket: "offers"
  - Use File object directly
  - Include cache headers
    ↓
Get public URL
    ↓
Store in state:
  - image_url: public URL
  - image_path: storage path
    ↓
Show success message with ✅
    ↓
User clicks "Save All Offers"
    ↓
Insert into bons_commandes_offers table
  - All fields including image_url and image_path
    ↓
Show confirmation
```

---

## Database Schema (For Reference)

```sql
CREATE TABLE bons_commandes_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_commande_id uuid NOT NULL,
  supplier_name varchar NOT NULL,
  offer_date timestamp DEFAULT CURRENT_TIMESTAMP,
  image_path varchar,          -- NEW: Storage path
  image_url varchar,           -- Public URL
  description text,
  notes text,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (bon_commande_id) REFERENCES bons_commandes(id)
);
```

---

## Next Steps

1. Apply the RLS policies (via SQL or UI)
2. Test image upload in the application
3. Verify images appear with green checkmark
4. Save offers and check database
5. Confirm image URLs are accessible

---

## Support Reference

- **Supabase Project**: vcelsivddzkopucoouwi
- **Storage Bucket**: offers (Public)
- **Database Table**: bons_commandes_offers
- **Upload Function**: handleImageUpload() in BonsCommandesPage.tsx
- **Save Function**: handleSaveOffers() in BonsCommandesPage.tsx

---

**Last Updated**: April 10, 2026  
**Status**: ✅ Code Updated | ⏳ Awaiting Policy Configuration
