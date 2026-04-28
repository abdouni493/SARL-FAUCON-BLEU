-- SQL Migration: Add Logo Support to Users Table
-- This migration adds columns to store logo URLs for user profiles and enterprise settings

-- 1. Add logo_url column to users table
ALTER TABLE public.users
ADD COLUMN logo_url character varying;

-- 2. Create an enterprise_settings table if it doesn't exist
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

-- 3. Create a storage bucket policy for logos if needed (run in Supabase dashboard)
-- This creates a public bucket for logos
/*
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

CREATE POLICY "Allow public read access to logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "Allow authenticated users to upload logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own logos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow users to delete their own logos" ON storage.objects
  FOR DELETE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
*/

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_logo_url ON public.users(logo_url);
CREATE INDEX IF NOT EXISTS idx_enterprise_settings_created_by ON public.enterprise_settings(created_by_id);

-- 5. Add RLS policies for enterprise_settings table
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

-- 6. Add trigger to update updated_at timestamp
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

-- Notes:
-- 1. Logo images will be stored in Supabase Storage bucket 'logos'
-- 2. The logo_url will be the public URL returned by Supabase Storage
-- 3. Max file size is recommended to be 5MB per logo
-- 4. Supported formats: JPG, PNG, WebP, GIF
