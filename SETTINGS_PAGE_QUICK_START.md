# Settings Page - Quick Start Guide (5 Minutes)

## TL;DR - Get Started Now

### What You Need to Do (4 Steps)

**Step 1: Run SQL Migration (2 minutes)**
```
1. Open Supabase Dashboard
2. SQL Editor → New Query
3. Copy-paste: SQL_SETTINGS_PAGE_WITH_LOGO.sql
4. Click RUN
5. Wait for all checkmarks ✓
```

**Step 2: Create Storage Bucket (1 minute)**
```
1. Supabase → Storage
2. Create Bucket
3. Name: "logos"
4. Make PUBLIC
5. Click Create
```

**Step 3: Refresh Browser (10 seconds)**
```
Press F5 in your browser
```

**Step 4: Test Upload (2 minutes)**
```
1. Go to Settings page
2. Click Upload Logo
3. Select image (JPG/PNG/GIF)
4. Click Save
5. Refresh (F5) → Should persist ✓
```

---

## What Changed

### Before ❌
- Logo only as preview (data URL)
- Logo lost on refresh
- No database persistence
- Settings not saved

### After ✅
- Logo uploaded to Supabase Storage
- Logo URL saved in database
- Logo persists on refresh
- Settings saved permanently
- Logo displays in sidebar & header

---

## The Features

### Enterprise Settings (Admin Only)
```
┌─────────────────────────────────────┐
│ 📋 Enterprise Settings              │
├─────────────────────────────────────┤
│ Company Name: [ERP System ______]   │
│                                     │
│ Company Logo:                       │
│ ┌──────────┐                        │
│ │ Preview  │  [Upload Logo Button]  │
│ │  Image   │                        │
│ └──────────┘                        │
│                                     │
│ JPG, PNG, WebP, GIF - Max 5MB      │
│                                     │
│ [Save Enterprise Settings] Button   │
│ ✓ Changes saved successfully!       │
└─────────────────────────────────────┘
```

### Profile Settings
- Full Name
- Username  
- Email
- Save button

### Password Settings
- Current Password
- New Password
- Confirm Password
- Change Password button

### Account Info
- Role (Admin/User)
- Account Created date

### Backup & Restore
- Create Backup button
- Restore Backup button
- Warning: Backup restore replaces all data

---

## Database Flow

```
User clicks "Upload Logo"
        ↓
    [Preview]  ← Shows instantly
        ↓
User clicks "Save"
        ↓
Upload to Supabase Storage
    (logos/logo_<userid>_<timestamp>_<filename>.jpg)
        ↓
Get Public URL
        ↓
Save to Database
    (enterprise_settings.logo_url)
        ↓
Update Context
        ↓
Sidebar refreshes with logo
Header refreshes with logo
        ↓
✓ Success message
        ↓
Refresh Page (F5)
        ↓
Load from Database
        ↓
Logo persists! ✓
```

---

## Troubleshooting in 30 Seconds

| Problem | Solution |
|---------|----------|
| Logo won't save | Run SQL migration again |
| Logo won't persist on refresh | Check RLS policies in SQL |
| Upload button disabled forever | Check browser console for errors |
| Logo shows but not in sidebar | Refresh page and check AppLayout.tsx |
| File upload rejected | Only JPG/PNG/WebP/GIF, max 5MB |
| 403 Forbidden error | RLS policies not set correctly |

---

## File Locations

```
src/pages/SettingsPage.tsx
    ↓ Uses Supabase for:
        - Logo upload (Storage)
        - Logo URL save (Database)
        - Profile data (Database)

src/lib/supabase.ts
    ↓ Provides:
        - Storage access (logos bucket)
        - Database access (enterprise_settings)

src/contexts/DataContext.tsx
    ↓ Manages:
        - enterpriseSettings state
        - logoUrl display in sidebar
        - Real-time updates
```

---

## SQL Commands Quick Reference

```sql
-- Check if table exists:
SELECT EXISTS(SELECT 1 FROM information_schema.tables 
  WHERE table_name='enterprise_settings');

-- Check RLS status:
SELECT tablename, rowsecurity FROM pg_tables 
  WHERE tablename='enterprise_settings';

-- Check policies:
SELECT policyname, cmd FROM pg_policies 
  WHERE schemaname='public' AND tablename='enterprise_settings';

-- Check your settings:
SELECT * FROM enterprise_settings WHERE created_by_id = '(your-user-id)';

-- Check logo upload in storage:
SELECT * FROM storage.objects WHERE bucket_id = 'logos';
```

---

## What Gets Saved

### In Database (enterprise_settings table)
```sql
{
  id: "uuid-generated",
  company_name: "Your Company Name",
  logo_url: "https://...supabase.co/storage/v1/object/public/logos/...",
  created_by_id: "your-user-id",
  created_at: "2026-04-06T10:30:00Z",
  updated_at: "2026-04-06T10:30:00Z"  ← Auto-updated on save
}
```

### In Storage (logos/ bucket)
```
logos/
  ├─ logo_<user-id>_<timestamp>_original-filename.jpg
  ├─ logo_<user-id>_<timestamp>_profile-pic.png
  └─ logo_<user-id>_<timestamp>_company-logo.gif
```

### In Context (DataContext.tsx)
```javascript
{
  enterpriseSettings: {
    name: "Your Company Name",
    logoUrl: "https://...public/logos/..."
  }
}
// Used by Sidebar, Header, AppLayout
```

---

## Testing Steps (2 Minutes)

```
1. Settings page opens ✓
2. See "Enterprise Settings" section ✓
3. Click "Upload Logo" ✓
4. Select image ✓
5. See preview ✓
6. Click "Save" ✓
7. See success message ✓
8. Press F5 (refresh) ✓
9. Logo still there! ✓
10. Check sidebar → Logo shows ✓
```

---

## Common Questions

**Q: Will logo upload break on refresh?**
A: No! Saved to database + Supabase Storage = Persists forever

**Q: Can other users see my logo?**
A: No! RLS policies ensure each admin only sees their own

**Q: What happens if I upload a 6MB file?**
A: Rejected with error: "Image size must be less than 5MB"

**Q: Do I need to do anything special in code?**
A: No! SettingsPage.tsx handles everything automatically

**Q: What file types work?**
A: JPG, PNG, WebP, GIF only (validated on upload)

**Q: Can I have multiple logos?**
A: One logo per admin user (stored by created_by_id)

**Q: Does logo show everywhere?**
A: Anywhere using `enterpriseSettings.logoUrl` from context

---

## Estimated Time Breakdown

| Task | Time |
|------|------|
| SQL Migration | 2 min |
| Create Storage Bucket | 1 min |
| Browser Refresh | 10 sec |
| Test Upload | 2 min |
| **TOTAL** | **~5 min** |

---

## Success Checklist ✅

- [ ] SQL executed without errors
- [ ] logos bucket created (PUBLIC)
- [ ] Can upload image
- [ ] Image persists on F5 refresh
- [ ] Logo shows in sidebar
- [ ] Company name saves
- [ ] Error messages clear
- [ ] Works on mobile
- [ ] Works in dark mode
- [ ] Multi-language works

**If all checked → Implementation complete! 🎉**

---

## Still Need Help?

1. **SQL didn't work?** → Re-run migration, check for duplicate policies
2. **Logo won't upload?** → Check Storage bucket exists and is PUBLIC
3. **Logo won't persist?** → Check RLS policies with SQL query above
4. **Can't see logo anywhere?** → Refresh page and check AppLayout/Sidebar components

---

**Ready?** Open Supabase Dashboard and run the SQL! It takes 2 minutes. 🚀
