/**
 * Authentication utilities for API calls
 * Ensures all API requests include the JWT token from Supabase
 */

import { supabase } from '../supabase';

/**
 * Get the current user's JWT token from Supabase
 * Returns null if user is not authenticated
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.access_token) {
      console.warn('No auth token available:', error?.message);
      return null;
    }
    
    return session.access_token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Create fetch options with authentication headers
 * Automatically includes JWT token if available
 */
export async function createAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Wrapper for fetch that automatically includes auth token
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await createAuthHeaders();
  
  // Merge with existing headers
  const mergedHeaders = {
    ...headers,
    ...(options.headers || {}),
  };
  
  return fetch(url, {
    ...options,
    headers: mergedHeaders,
  });
}


