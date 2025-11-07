import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

// Create a dummy client that will fail gracefully if env vars are missing
// This ensures supabase is NEVER null
const createDummyClient = (): SupabaseClient => {
  try {
    // Create a real client with dummy credentials - this ensures auth property exists
    return createClient('https://dummy.supabase.co', 'dummy-key-that-will-fail-on-use');
  } catch (error) {
    // If even dummy client creation fails, create a minimal object with auth stub
    console.error('Failed to create even dummy client:', error);
    // Return a minimal client object that won't crash
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }
};

// Create client - ALWAYS create one, even if invalid
let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    console.error('   Falling back to dummy client');
    supabase = createDummyClient();
  }
} else {
  console.error('❌ Invalid Supabase configuration');
  console.error('   supabaseUrl:', supabaseUrl || 'MISSING');
  console.error('   supabaseAnonKey:', supabaseAnonKey ? 'SET' : 'MISSING');
  console.error('   supabaseUrl starts with http:', supabaseUrl?.startsWith('http'));
  console.error('   ⚠️ Using dummy client - authentication will not work!');
  supabase = createDummyClient();
}

// Export - supabase is now ALWAYS defined (never null)
export { supabase };
