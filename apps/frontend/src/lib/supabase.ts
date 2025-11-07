import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Create supabase client only if env vars are available and valid
// This allows the app to load even if Supabase isn't configured yet
let supabase: ReturnType<typeof createClient> | null = null;

// Debug logging in development - ALWAYS log to help diagnose
console.log('🔍 Supabase Environment Check:', {
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  rawUrl: import.meta.env.VITE_SUPABASE_URL,
  rawKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'MISSING',
  hasUrl: !!supabaseUrl,
  urlLength: supabaseUrl.length,
  urlValue: supabaseUrl || 'EMPTY',
  urlStartsWithHttp: supabaseUrl.startsWith('http'),
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey.length,
  keyLengthValid: supabaseAnonKey.length > 20,
  urlValid: !supabaseUrl.includes('your_supabase'),
  keyValid: !supabaseAnonKey.includes('your_supabase')
});

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
    console.log('✅ Supabase client initialized successfully');
  } catch (error) {
    // Failed to initialize Supabase
    console.error('❌ Failed to initialize Supabase client:', error);
    supabase = null;
    // Show alert in browser
    if (typeof window !== 'undefined') {
      console.error('🔴 CRITICAL: Supabase initialization failed. Authentication will not work.');
    }
  }
} else {
  // Log detailed error - ALWAYS log, not just in dev
  const reason = !supabaseUrl ? 'Missing VITE_SUPABASE_URL' :
                 !supabaseAnonKey ? 'Missing VITE_SUPABASE_ANON_KEY' :
                 !supabaseUrl.startsWith('http') ? 'Invalid URL format' :
                 supabaseAnonKey.length <= 20 ? 'Key too short' :
                 supabaseUrl.includes('your_supabase') ? 'Placeholder URL detected' :
                 supabaseAnonKey.includes('your_supabase') ? 'Placeholder key detected' :
                 'Unknown error';
  
  console.error('❌ Supabase client not initialized. Configuration check failed:', {
    supabaseUrl: supabaseUrl || 'MISSING',
    supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
    urlValid: supabaseUrl && supabaseUrl.startsWith('http'),
    keyValid: supabaseAnonKey && supabaseAnonKey.length > 20,
    reason: reason
  });
  console.warn('💡 FIX: Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in apps/frontend/.env');
  console.warn('💡 FIX: Restart your dev server after adding/changing .env variables');
  console.warn('💡 FIX: Hard refresh browser (Ctrl+Shift+R) after restarting server');
  
  // Show alert in browser
  if (typeof window !== 'undefined') {
    console.error('🔴 CRITICAL: Supabase is not configured. Sign up/Sign in will not work.');
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