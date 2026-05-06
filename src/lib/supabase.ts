import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://drvngvfijnvyazxqebto.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRydm5ndmZpam52eWF6eHFlYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNTQ5NjMsImV4cCI6MjA5MzYzMDk2M30.iufyijF-jn2d1l7rtGoddLzx1HE0qaopUjsQEyTpVj8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
