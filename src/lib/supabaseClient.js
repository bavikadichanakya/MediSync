import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise fallback to the provided keys
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hvhugkrniinmhtiiblzx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2aHVna3JuaWlubWh0aWlibHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mzk2NzYsImV4cCI6MjA5ODMxNTY3Nn0.jZYDl0rYZ8j7M5_Y5dUhnOSXuZO-EMO1gzAHlRSjbho';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
