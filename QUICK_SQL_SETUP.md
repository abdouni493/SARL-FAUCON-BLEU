# QUICK SQL SETUP - 2 MINUTES

## Copy This SQL

```sql
CREATE TABLE IF NOT EXISTS public.enterprise_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url character varying,
  company_name character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_by_id uuid NOT NULL REFERENCES auth.users(id),
  CONSTRAINT unique_created_by UNIQUE(created_by_id)
);

ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own enterprise settings"
ON public.enterprise_settings FOR SELECT
USING (created_by_id = auth.uid());

CREATE POLICY "Users can insert their own enterprise settings"
ON public.enterprise_settings FOR INSERT
WITH CHECK (created_by_id = auth.uid());

CREATE POLICY "Users can update their own enterprise settings"
ON public.enterprise_settings FOR UPDATE
USING (created_by_id = auth.uid())
WITH CHECK (created_by_id = auth.uid());

CREATE POLICY "Users can delete their own enterprise settings"
ON public.enterprise_settings FOR DELETE
USING (created_by_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_enterprise_settings_created_by 
ON public.enterprise_settings(created_by_id);

CREATE OR REPLACE FUNCTION public.update_enterprise_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enterprise_settings_updated_at ON public.enterprise_settings;
CREATE TRIGGER trigger_enterprise_settings_updated_at
  BEFORE UPDATE ON public.enterprise_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_enterprise_settings_updated_at();
```

## How to Execute

### 1. Open Supabase Dashboard
- Go to https://app.supabase.com
- Select your project

### 2. Go to SQL Editor
- Left sidebar → "SQL Editor"
- Click "+ New Query"

### 3. Paste SQL
- Copy SQL above
- Paste into editor

### 4. Execute
- Click "Run" button (or Ctrl+Enter)
- Wait for confirmation

### 5. Test
- Go back to your React app
- Press F5 to refresh
- ✅ Should load without 406 errors

## What This Does

| Item | Purpose |
|------|---------|
| `CREATE TABLE` | Creates enterprise_settings table |
| `created_by_id NOT NULL` | Makes created_by_id required |
| `UNIQUE(created_by_id)` | One record per user |
| `ENABLE ROW LEVEL SECURITY` | Turns on RLS |
| `CREATE POLICY` (x4) | User can only access own data |
| `CREATE INDEX` | Speeds up queries |
| `CREATE TRIGGER` | Auto-updates the updated_at timestamp |

## Expected Result

After execution:
```
✓ CREATE TABLE
✓ ALTER TABLE  
✓ CREATE POLICY (x4)
✓ CREATE INDEX
✓ CREATE TRIGGER
```

Then refresh your browser and the app should work!

## That's It!

No more 406 errors. Logo persistence will work perfectly.
