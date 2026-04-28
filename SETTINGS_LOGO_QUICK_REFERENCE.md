# Settings Logo Upload - Quick Setup Guide

## ⚡ Quick Summary

**Problem:** Logo uploads not persisting to database  
**Solution:** Implement Supabase Storage + Database persistence  
**Time Required:** 15-20 minutes  

---

## 🚀 Quick Implementation (3 Steps)

### Step 1️⃣: Run SQL (2 minutes)

Copy and run in Supabase SQL Editor:

```sql
ALTER TABLE public.users ADD COLUMN logo_url character varying;

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

CREATE INDEX IF NOT EXISTS idx_users_logo_url ON public.users(logo_url);
CREATE INDEX IF NOT EXISTS idx_enterprise_settings_created_by ON public.enterprise_settings(created_by_id);

ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin users to manage enterprise settings" ON public.enterprise_settings
  FOR ALL USING (auth.uid() = created_by_id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow all authenticated users to view enterprise settings" ON public.enterprise_settings
  FOR SELECT USING (auth.role() = 'authenticated');

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

### Step 2️⃣: Setup Storage (3 minutes)

**Supabase Dashboard:**

1. Go to **Storage** → **New Bucket**
2. Name: `logos` → Enable Public → Create
3. Go to **Bucket Policies**
4. Add these 4 policies (copy from SETTINGS_LOGO_UPLOAD_IMPLEMENTATION.md)

### Step 3️⃣: Update Code (5 minutes)

**File: `src/pages/SettingsPage.tsx`**

Replace with content from `SettingsPage.WITH_LOGO_SAVE.tsx`

**File: `src/pages/AdminSettingsPage.tsx`** (NEW)

Create with provided content for admin-only settings

---

## 📋 Files Provided

| File | Purpose |
|------|---------|
| `SQL_ADD_LOGO_STORAGE.sql` | Database schema changes |
| `SettingsPage.WITH_LOGO_SAVE.tsx` | Updated settings component |
| `AdminSettingsPage.tsx` | Admin-only settings page |
| `SETTINGS_LOGO_UPLOAD_IMPLEMENTATION.md` | Detailed guide |

---

## ✨ Features Included

✅ **Persistent Storage** - Logos saved to Supabase  
✅ **File Validation** - Type (JPG, PNG, WebP, GIF) & size (5MB max)  
✅ **Preview** - See image before saving  
✅ **Error Handling** - Clear error messages  
✅ **Loading States** - Visual feedback during upload  
✅ **Admin Only** - Enterprise settings for admins  
✅ **RLS Policies** - Secure database access  

---

## 🧪 Quick Test

1. Admin opens Settings
2. Uploads new company logo
3. Clicks "Save Enterprise Settings"
4. Refreshes page
5. Logo still displays ✅

---

## 🔑 Key Differences from Old Code

### Old Code (NOT working)
```tsx
const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLogoPreview(result);  // ❌ Only base64, no persistence
    };
    reader.readAsDataURL(file);
  }
};

const handleSaveEnterpriseSettings = () => {
  updateEnterpriseSettings({ name: enterpriseName, logoUrl: logoPreview });
  // ❌ Saved to context only, not database
};
```

### New Code (WORKING)
```tsx
const uploadLogoToSupabase = async (file: File): Promise<string | null> => {
  // ✅ Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('logos')
    .upload(filePath, file, { cacheControl: '3600', upsert: true });
  
  // ✅ Get public URL
  const { data: urlData } = supabase.storage
    .from('logos')
    .getPublicUrl(filePath);
  
  return urlData?.publicUrl || null;
};

const handleSaveEnterpriseSettings = async () => {
  // ✅ Upload file to storage
  const logoUrl = await uploadLogoToSupabase(logoFile);
  
  // ✅ Save URL to database
  const { error } = await supabase
    .from('enterprise_settings')
    .upsert({ logo_url: logoUrl, company_name: enterpriseName, ... });
};
```

---

## 🛑 Troubleshooting

### Logo still not saving after steps?
1. ✅ Check: SQL migration executed (users table has logo_url)
2. ✅ Check: enterprise_settings table exists
3. ✅ Check: "logos" storage bucket is PUBLIC
4. ✅ Check: Storage policies created
5. ✅ Check: Browser console for errors

### "Invalid image format" error?
- Supported: JPG, PNG, WebP, GIF
- Upload one of these formats

### "Image too large" error?
- Maximum: 5MB
- Compress image or use smaller file

### Upload hangs/never completes?
- Check browser network tab
- Verify storage policies exist
- Check Supabase service status

---

## 📲 Mobile Responsiveness

Code includes responsive design:
- Desktop: Logo preview 32x32
- Tablet: Full width forms
- Mobile: Stack layout

---

## 🌍 Internationalization

All labels support i18n. If text shows untranslated:

Add to `ar.json` and `fr.json`:
```json
{
  "settings.invalid_image_format": "...",
  "settings.image_too_large": "...",
  "settings.upload_failed": "...",
  "settings.uploading": "...",
  "settings.saving": "...",
  "settings.supported_formats": "...",
  "settings.max_file_size": "..."
}
```

---

## 🔒 Security

- ✅ File type validation
- ✅ File size limit (5MB)
- ✅ Authentication required
- ✅ RLS policies on database
- ✅ Storage access policies
- ✅ User isolation via created_by_id

---

## 📊 What Happens After Save

1. User uploads file
2. Validates file (type & size)
3. Uploads to Supabase Storage (`logos/`)
4. Gets public URL from storage
5. Saves URL to database (`enterprise_settings.logo_url`)
6. Updates React context
7. Shows success message
8. Logo persists across sessions

---

## 💡 Pro Tips

- Upload logos < 500KB for faster loading
- Use PNG for transparent backgrounds
- Admin can manage enterprise branding
- Each upload gets unique filename (prevents collisions)
- Storage CDN provides fast global access

---

## ✅ Implementation Checklist

- [ ] SQL migration executed
- [ ] Storage bucket created ("logos")
- [ ] Storage policies created (4 policies)
- [ ] SettingsPage.tsx updated
- [ ] AdminSettingsPage.tsx created
- [ ] Test admin logo upload
- [ ] Test logo persistence on refresh
- [ ] Test file validation
- [ ] Test error handling
- [ ] Add i18n keys if needed

---

## 🎯 After Implementation

Users can now:
- ✅ Upload company logos
- ✅ See instant preview
- ✅ Save logos permanently
- ✅ See saved logo on next visit
- ✅ Update logo anytime

Admins can:
- ✅ Manage enterprise settings
- ✅ Update company branding
- ✅ Control logo from admin panel
- ✅ Access from separate admin settings page

---

**Ready to implement?** Start with Step 1! 🚀

For detailed guide: See `SETTINGS_LOGO_UPLOAD_IMPLEMENTATION.md`
