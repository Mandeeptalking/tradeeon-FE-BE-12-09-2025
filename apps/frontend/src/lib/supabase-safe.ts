/**
 * Safe Supabase wrapper that always checks for null
 * Use this instead of importing supabase directly
 */

import { supabase } from './supabase';

/**
 * Safely get supabase client
 * Returns null if not initialized and logs error
 */
export function getSupabaseClient() {
  if (!supabase) {
    console.error('❌ Supabase client is null!');
    console.error('   This usually means environment variables are not loaded.');
    console.error('   Check: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return null;
  }
  return supabase;
}

/**
 * Safely access supabase.auth
 * Returns null if supabase is not initialized
 */
export function getSupabaseAuth() {
  const client = getSupabaseClient();
  return client?.auth || null;
}

/**
 * Check if supabase is available
 */
export function isSupabaseAvailable(): boolean {
  return supabase !== null;
}

