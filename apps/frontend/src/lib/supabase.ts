import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create supabase client only if env vars are available and valid
// This allows the app to load even if Supabase isn't configured yet
let supabase: ReturnType<typeof createClient> | null = null;

// Check if we have valid Supabase credentials
const hasValidSupabaseConfig = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  supabaseAnonKey.length > 20 &&
  !supabaseUrl.includes('your_supabase') &&
  !supabaseAnonKey.includes('your_supabase');

if (hasValidSupabaseConfig) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    supabase = null;
  }
} else {
  // Silently continue without Supabase - app will work but auth features won't
  if (import.meta.env.DEV) {
    console.warn('Supabase environment variables not set. Some features may not work.');
  }
}

export { supabase };

// Database types
export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}