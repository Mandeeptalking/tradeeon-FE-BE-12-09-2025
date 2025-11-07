import { createClient } from '@supabase/supabase-js';

// Get and trim environment variables
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Debug logging
console.log('🔍 Supabase Config:', {
  hasUrl: !!supabaseUrl,
  urlLength: supabaseUrl.length,
  urlValue: supabaseUrl || 'MISSING',
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey.length,
  keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
  rawEnvUrl: import.meta.env.VITE_SUPABASE_URL,
  rawEnvKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
});

// Validate and create client
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl || 'MISSING');
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING');
  console.error('   Make sure .env file exists in apps/frontend/');
  console.error('   Restart dev server after changing .env');
}

// Create client if we have valid credentials
let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    supabase = null;
  }
} else {
  console.error('❌ Invalid Supabase configuration');
  console.error('   supabaseUrl:', supabaseUrl || 'MISSING');
  console.error('   supabaseAnonKey:', supabaseAnonKey ? 'SET' : 'MISSING');
  console.error('   supabaseUrl starts with http:', supabaseUrl?.startsWith('http'));
  supabase = null;
}

export { supabase };
