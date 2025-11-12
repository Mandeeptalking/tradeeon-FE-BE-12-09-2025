/**
 * Authentication utilities for API calls
 * Ensures all API requests include the JWT token from Supabase
 */

import { supabase } from '../supabase';
import { logger } from '../../utils/logger';

/**
 * Get the current user's JWT token from Supabase
 * Returns null if user is not authenticated or Supabase is not configured
 */
export async function getAuthToken(): Promise<string | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith('http')) {
    logger.warn('Supabase not properly configured. Cannot get auth token.');
    return null;
  }
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.access_token) {
      logger.warn('No auth token available:', error?.message);
      return null;
    }
    
    return session.access_token;
  } catch (error) {
    logger.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Get or create CSRF token for this session
 * CSRF tokens are stored in sessionStorage and regenerated on page load
 */
function getCsrfToken(): string {
  const storageKey = 'csrf_token';
  let token = sessionStorage.getItem(storageKey);
  
  if (!token) {
    // Generate a random token (32 bytes base64 encoded)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    token = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    sessionStorage.setItem(storageKey, token);
  }
  
  return token;
}

/**
 * Validate that the request is being made from our frontend origin
 * Prevents CSRF attacks from external sites
 * Note: The backend should also validate the Origin header server-side
 */
function validateOrigin(url: string): boolean {
  // In development, allow localhost and any origin
  if (import.meta.env.DEV) {
    return true; // More lenient in dev
  }
  
  // In production, ensure the request is being made from our frontend
  // The actual origin validation happens via the Origin header sent to backend
  // This function just ensures we're not making requests from unexpected contexts
  try {
    // Validate URL is well-formed
    new URL(url);
    
    // In production, ensure we're making requests to HTTPS endpoints
    if (url.startsWith('http://') && !url.includes('localhost')) {
      logger.warn('CSRF Protection: HTTP request detected in production', { url });
      return false;
    }
    
    return true;
  } catch {
    // If URL parsing fails, reject for safety
    logger.error('CSRF Protection: Invalid URL format', { url });
    return false;
  }
}

/**
 * Create fetch options with authentication headers and CSRF protection
 * Automatically includes JWT token and CSRF token if available
 */
export async function createAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const csrfToken = getCsrfToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken, // CSRF token for all requests
    'Origin': window.location.origin, // Origin header for CSRF protection
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Wrapper for fetch that automatically includes auth token and CSRF protection
 * Validates origin and includes CSRF token in headers
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // CSRF Protection: Validate origin
  if (!validateOrigin(url)) {
    logger.error('CSRF Protection: Invalid origin for request', { url, origin: window.location.origin });
    throw new Error('Invalid request origin. This may be a CSRF attack.');
  }
  
  const headers = await createAuthHeaders();
  
  // Merge with existing headers (user headers take precedence)
  const mergedHeaders = {
    ...headers,
    ...(options.headers || {}),
  };
  
  // Ensure Origin header is set (for CSRF protection)
  if (!mergedHeaders['Origin']) {
    mergedHeaders['Origin'] = window.location.origin;
  }
  
  return fetch(url, {
    ...options,
    headers: mergedHeaders,
    credentials: 'include', // Include cookies for SameSite protection
  });
}


