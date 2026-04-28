# Settings Interface - Logo Upload Implementation Guide

## 📋 Overview

This guide provides complete instructions to fix the logo upload functionality in the Settings interface for both user profiles and general administration.

**Problem:** Logo images were not being persisted to the database - they only existed as temporary base64 data URLs.

**Solution:** Implement Supabase Storage for persistent image hosting with database references.

---

## 🎯 What This Adds

### Database Changes
- **users table**: Add `logo_url` column for user profile logos
- **enterprise_settings table**: New table for storing enterprise/company settings
- **Storage bucket**: `logos` bucket in Supabase Storage for image hosting

### Component Updates
- **SettingsPage.tsx**: Enhanced with Supabase Storage integration
- **AdminSettingsPage.tsx**: New dedicated admin settings interface
- **Error handling**: Validation for file type and size
- **Loading states**: Visual feedback during upload

### Key Features
✅ Persistent logo storage in Supabase  
✅ Automatic file validation (type & size)  
✅ Real-time preview before saving  
✅ Admin-only enterprise settings  
✅ Error messages and success notifications  
✅ Loading indicators during upload  

---

## 🔧 Implementation Steps

### Step 1: Execute SQL Migration

Run this SQL in your Supabase dashboard (SQL Editor):

```sql
-- SQL Migration: Add Logo Support to Users Table

-- 1. Add logo_url column to users table
ALTER TABLE public.users
ADD COLUMN logo_url character varying;

-- 2. Create an enterprise_settings table
CREATE TABLE IF NOT EXISTS public.enterprise_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  logo_url character varying,
  company_name character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_by_id uuid,
  CONSTRAINT enterprise_settings_pkey PRIMARY KEY (id),
  CONSTRAINT enterprise_settings_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES auth.users(id)
);

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS idx_users_logo_url ON public.users(logo_url);
CREATE INDEX IF NOT EXISTS idx_enterprise_settings_created_by ON public.enterprise_settings(created_by_id);

-- 4. Enable RLS
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin users to manage enterprise settings" ON public.enterprise_settings
  FOR ALL USING (
    auth.uid() = created_by_id OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow all authenticated users to view enterprise settings" ON public.enterprise_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_enterprise_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enterprise_settings_updated_at
  BEFORE UPDATE ON public.enterprise_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_enterprise_settings_updated_at();
```

### Step 2: Create Storage Bucket in Supabase

Go to **Supabase Dashboard** → **Storage** → Create a new bucket:

**Bucket Name:** `logos`  
**Public:** Enable (toggle ON)  

### Step 3: Create Storage Policies

In **Supabase Dashboard** → **Storage** → **logos** → **Policies**, add these:

#### Read Policy (Public Access)
```sql
-- Allow public read access to logos
CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');
```

#### Upload Policy
```sql
-- Allow authenticated users to upload logos
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');
```

#### Update Policy
```sql
-- Allow users to update their logos
CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
```

#### Delete Policy
```sql
-- Allow users to delete their logos
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
```

### Step 4: Update SettingsPage Component

1. **Backup** the current `src/pages/SettingsPage.tsx`
2. **Copy** the content from `SettingsPage.WITH_LOGO_SAVE.tsx`
3. **Paste** into `src/pages/SettingsPage.tsx`

Key changes in this version:
- Added `uploadLogoToSupabase()` function
- File validation (type & size)
- Supabase Storage integration
- Database persistence in `users` table
- Loading states during upload
- Error handling

### Step 5: Create Admin Settings Page

Create a route in your app that uses `AdminSettingsPage.tsx`:

**File:** `src/pages/AdminSettingsPage.tsx`

This component is specifically for general administration settings.

### Step 6: Update Routes (if needed)

Add route for admin settings page:

```tsx
// In your router setup
import AdminSettingsPage from '@/pages/AdminSettingsPage';

// Add this route
{
  path: '/admin/settings',
  element: <AdminSettingsPage />,
  requiredRole: 'admin'
}
```

---

## 📱 Usage Guide

### For Users (Profile Settings)

1. Open **Settings** → **Profile Settings**
2. Scroll down to see enterprise settings (if admin)
3. Click **"Upload Logo"** button
4. Select an image file:
   - ✅ Supported: JPG, PNG, WebP, GIF
   - ✅ Max size: 5MB
5. Click **"Save Enterprise Settings"**
6. Logo is now persisted to Supabase!

### For Admins (Enterprise Settings)

1. Open **Settings** (user profile)
2. Scroll to **Enterprise Settings** section
3. Update **Enterprise Name**
4. Upload new **Company Logo**
5. Click **"Save Enterprise Settings"**
6. Settings saved to both Supabase Storage and database

### For General Administration

1. Open **Admin Settings** (new route)
2. Update company logo and name
3. Click **"Save Enterprise Settings"**
4. Accessible only to admin role users

---

## 🔐 Security Features

- **File Type Validation**: Only image files (JPG, PNG, WebP, GIF)
- **File Size Limit**: Maximum 5MB per logo
- **RLS Policies**: Database access controlled by user role
- **Storage Policies**: Only authenticated users can upload
- **Authentication Required**: All operations require valid session

---

## 🛠️ Troubleshooting

### Issue: Logo not saving
**Solution:**
1. Check Supabase Storage bucket exists and is public
2. Verify storage policies are correctly created
3. Check browser console for errors
4. Ensure user is authenticated

### Issue: Upload fails with "File size" error
**Solution:**
- Maximum file size is 5MB
- Compress image before uploading
- Try a different image format

### Issue: Invalid image format error
**Solution:**
- Only JPG, PNG, WebP, GIF are supported
- Convert image to one of these formats
- Try a different image file

### Issue: Logo preview shows but doesn't save
**Solution:**
1. Check SQL migration was executed
2. Verify enterprise_settings table was created
3. Check user has admin role for enterprise settings
4. Review browser network tab for API errors

---

## 📊 Data Flow

```
User Upload
    ↓
File Validation (type & size)
    ↓
Supabase Storage Upload
    ↓
Get Public URL from Storage
    ↓
Save URL to Database
    ├── users.logo_url (for profile)
    └── enterprise_settings.logo_url (for company)
    ↓
Update Context & UI
    ↓
Success Notification
```

---

## 💾 Database Schema

### users table (NEW COLUMN)
```sql
logo_url character varying
```

### enterprise_settings table (NEW TABLE)
```sql
id uuid (PRIMARY KEY)
logo_url character varying
company_name character varying (NOT NULL)
created_at timestamp with time zone
updated_at timestamp with time zone
created_by_id uuid (FOREIGN KEY → auth.users)
```

---

## 🚀 Performance Considerations

- Logo images stored in Supabase Storage (CDN)
- Automatic image optimization by Supabase
- Database stores only URLs (not images)
- Lazy loading recommended for logo display
- Cache control set to 3600 seconds (1 hour)

---

## 📝 Translation Keys Needed

Add these to your i18n files (ar.json, fr.json):

```json
{
  "settings": {
    "invalid_image_format": "صيغة صورة غير صحيحة",
    "image_too_large": "حجم الصورة كبير جداً",
    "upload_failed": "فشل التحميل",
    "save_failed": "فشل الحفظ",
    "uploading": "جاري التحميل...",
    "saving": "جاري الحفظ...",
    "supported_formats": "الصيغ المدعومة: JPG, PNG, WebP, GIF",
    "max_file_size": "الحد الأقصى للحجم: 5MB"
  }
}
```

---

## ✅ Testing Checklist

- [ ] SQL migration executed successfully
- [ ] Storage bucket "logos" created and public
- [ ] Storage policies created
- [ ] SettingsPage component updated
- [ ] AdminSettingsPage component created
- [ ] Logo upload works without errors
- [ ] Logo persists after page reload
- [ ] Logo displays in profile settings
- [ ] Admin enterprise settings saves correctly
- [ ] File validation works (size & type)
- [ ] Error messages display properly
- [ ] Loading states show during upload
- [ ] RTL/LTR layout preserved

---

## 🔄 Rollback Instructions

If needed, revert changes:

```sql
-- Drop enterprise_settings table
DROP TABLE IF EXISTS public.enterprise_settings CASCADE;

-- Remove logo_url from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS logo_url;

-- Remove storage bucket (via Supabase dashboard)
-- Storage > logos > Delete bucket
```

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Review Supabase logs
3. Verify all SQL migrations executed
4. Check storage bucket permissions
5. Ensure user has correct role

---

**Status:** ✅ Implementation Ready  
**Last Updated:** April 6, 2026  
**Version:** 1.0
