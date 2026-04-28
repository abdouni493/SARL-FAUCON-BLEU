import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vcelsivddzkopucoouwi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZWxzaXZkZHprb3B1Y29vdXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3Mjc2MjUsImV4cCI6MjA5MDMwMzYyNX0.atWpRAQO0as-ZIYZe9FfHto6S_5ewOOtKDcycpI9KI4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
