import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and Anon Key
// In a real Vercel deployment, these should come from environment variables (e.g., import.meta.env.VITE_SUPABASE_URL)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'REPLACE_WITH_YOUR_PROJECT_URL';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'REPLACE_WITH_YOUR_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);
