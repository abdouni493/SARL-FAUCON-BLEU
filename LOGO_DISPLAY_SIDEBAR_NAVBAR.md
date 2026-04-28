# 🎨 LOGO DISPLAY - Sidebar + Navbar Circle

## Overview

Once SQL migration and storage bucket are set up, the logo will display in 3 places:

```
┌─────────────────────────────────────┐
│         NAVBAR                      │
│  [Logo Circle] App Name  Logout     │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  [Logo]  │  Dashboard               │
│  Sidebar │  Commands                │
│  Image   │  Settings                │
└─────────────────────────────────────┘
```

---

## 1. Navbar Circle Logo (Top Right)

### Display Location
- Top navigation bar
- Right side (before Logout button)
- Circular frame

### Size
- `w-10 h-10` = 40px × 40px
- `rounded-full` = perfect circle

### Styling
```tsx
<div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-400 shadow-md">
  <img 
    src={logoUrl} 
    alt="Company Logo"
    className="w-full h-full object-cover"
  />
</div>
```

### Where It Gets Logo From
- Fetches from database: `enterprise_settings.logo_url`
- Storage path: `https://vcelsivddzkopucoouwi.supabase.co/storage/v1/object/public/logos/logo_...png`

### When It Updates
- On page load (retrieves from DB)
- After logo upload in Settings
- Persists on browser refresh

---

## 2. Sidebar Logo (Left Panel)

### Display Location
- Top of sidebar
- Below company name
- Larger size for branding

### Size
- `w-32 h-16` = 128px × 64px (or similar)
- `rounded-lg` = rounded corners

### Styling
```tsx
<div className="w-32 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-300 shadow-sm">
  <img 
    src={logoUrl} 
    alt="Company Logo"
    className="w-full h-full object-cover"
  />
</div>
```

### Where It Gets Logo From
- Fetches from database: `enterprise_settings.logo_url`
- Same storage URL as navbar

### When It Updates
- On page load (retrieves from DB)
- After logo upload in Settings
- Persists on browser refresh

---

## 3. Settings Page Logo (Preview)

### Display Location
- Settings page
- Enterprise Settings section
- Logo upload preview

### Size
- `w-32 h-32` = 128px × 128px
- `rounded-xl` = rounded corners
- `border-2` = visible border

### Styling
```tsx
<div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-amber-300 bg-slate-100 shadow-lg">
  <img 
    src={logoPreview} 
    alt="Logo preview"
    className="w-full h-full object-cover"
  />
</div>
```

---

## Data Flow

```
User Uploads Logo
        ↓
File selected from computer
        ↓
Upload to Supabase Storage: /logos/logo_[id]_[timestamp]_[name].png
        ↓
Get public URL
        ↓
Save URL to database: enterprise_settings.logo_url
        ↓
Update UI in Settings (preview shows)
        ↓
Navbar fetches & displays
        ↓
Sidebar fetches & displays
        ↓
Persists across page refresh
```

---

## Database Storage

### Table
```
Table: enterprise_settings
Column: logo_url (TEXT)
Example value: https://vcelsivddzkopucoouwi.supabase.co/storage/v1/object/public/logos/logo_6ca491f6-ac4e-4d22-baa0-9b6208f3a3cc_1234567890_wallhaven-qzvm65.png
```

### Query to Retrieve
```sql
SELECT logo_url FROM enterprise_settings 
WHERE created_by_id = '6ca491f6-ac4e-4d22-baa0-9b6208f3a3cc'
```

### Saving Flow
1. Upload file to storage
2. Get public URL
3. UPDATE enterprise_settings SET logo_url = '[url]'
4. Success message

---

## Files That Need Logo

### 1. **Navbar Component** (displays circle logo)
- File: `src/components/Navbar.tsx` or similar
- Shows: `w-10 h-10 rounded-full` logo circle
- Updates: When enterprise_settings changes

### 2. **Sidebar Component** (displays large logo)
- File: `src/components/Sidebar.tsx` or similar
- Shows: `w-32 h-16` logo image
- Updates: When enterprise_settings changes

### 3. **Settings Page** (upload & preview)
- File: `src/pages/SettingsPage.tsx`
- Shows: Upload button + preview (32×32)
- Saves: To database

---

## How Code Retrieves Logo

### In DataContext.tsx (or similar)
```typescript
const [enterpriseSettings, setEnterpriseSettings] = useState({
  name: '',
  logoUrl: '', // Stores the URL from database
});

// On component mount
useEffect(() => {
  if (user?.id) {
    const { data } = await supabase
      .from('enterprise_settings')
      .select('logo_url')
      .eq('created_by_id', user.id)
      .single();
    
    setEnterpriseSettings(prev => ({
      ...prev,
      logoUrl: data?.logo_url || ''
    }));
  }
}, [user?.id]);
```

### In Navbar/Sidebar
```typescript
import { useData } from '@/contexts/DataContext';

export function Navbar() {
  const { enterpriseSettings } = useData();
  
  return (
    <div>
      {enterpriseSettings.logoUrl ? (
        <img 
          src={enterpriseSettings.logoUrl}
          alt="Logo"
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-blue-500" />
      )}
    </div>
  );
}
```

---

## Upload Flow

### In SettingsPage.tsx
```typescript
const uploadLogoToSupabase = async (file: File) => {
  try {
    // 1. Upload file to storage
    const { data, error } = await supabase.storage
      .from('logos')
      .upload(`logo_${user.id}_${Date.now()}_${file.name}`, file);
    
    if (error) throw error;
    
    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(data.path);
    
    // 3. Save URL to database
    await supabase
      .from('enterprise_settings')
      .update({ logo_url: publicUrl })
      .eq('created_by_id', user.id);
    
    // 4. Update context
    setEnterpriseSettings(prev => ({
      ...prev,
      logoUrl: publicUrl
    }));
    
    // 5. Show success
    setSaved(true);
  } catch (error) {
    setLogoError(error.message);
  }
};
```

---

## After Setup (Checklist)

Once SQL + Bucket are ready:

- [ ] Upload logo in Settings
- [ ] Logo shows in Settings preview
- [ ] Logo URL saves to database
- [ ] Refresh page (F5)
- [ ] Logo still shows in Settings
- [ ] Navbar shows logo circle
- [ ] Sidebar shows logo image
- [ ] Click through pages
- [ ] Logo displays on every page

---

## Styling Examples

### Navbar Logo (Circle)
```html
<div className="flex items-center gap-3">
  <!-- Logo Circle -->
  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-400 shadow-md bg-white">
    {logoUrl ? (
      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-500" />
    )}
  </div>
  
  <!-- App Name -->
  <h1 className="text-xl font-bold">My Company</h1>
</div>
```

### Sidebar Logo (Large)
```html
<div className="w-32 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-300 shadow-sm">
  {logoUrl ? (
    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
      <Building2 className="w-8 h-8 text-slate-600" />
    </div>
  )}
</div>
```

### Settings Logo Preview (Large + Border)
```html
<div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-amber-300 bg-slate-100 shadow-lg">
  {logoPreview ? (
    <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full bg-gradient-to-br from-amber-200 to-orange-200" />
  )}
</div>
```

---

## Image Optimization

### Best Logo Format
- **PNG** (transparent background)
- **JPG** (solid background)
- **WebP** (modern, smaller file size)

### Recommended Size
- Upload: 1024×1024 or larger
- Display: Responsive (CSS handles scaling)

### File Size
- Recommended: < 1 MB
- Maximum: 5 MB (set in validation)

---

## Fallback When No Logo

If no logo uploaded yet:
- Navbar: Colored circle (gradient)
- Sidebar: Icon placeholder
- Settings: Empty preview with icon

---

## Next Steps

1. ✅ Execute SQL migration (CRITICAL)
2. ✅ Create storage bucket (CRITICAL)
3. ✅ Refresh browser
4. ✅ Upload logo in Settings
5. ✅ See it display everywhere
6. ✅ Refresh page
7. ✅ Logo persists ✨

---

**Status**: Ready to display once database/storage are set up!
