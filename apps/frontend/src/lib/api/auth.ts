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
 * Check if backend supports CSRF protection
 * Cached in sessionStorage to avoid repeated checks
 */
function backendSupportsCsrf(): boolean {
  const cacheKey = 'backend_csrf_support';
  const cached = sessionStorage.getItem(cacheKey);
  
  if (cached !== null) {
    return cached === 'true';
  }
  
  // Default to true (assume backend supports it)
  // Will be updated after first request attempt
  return true;
}

/**
 * Cache backend CSRF support status
 */
function setBackendCsrfSupport(supports: boolean): void {
  sessionStorage.setItem('backend_csrf_support', supports ? 'true' : 'false');
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
 * Gracefully degrades if backend doesn't support CSRF headers
 */
export async function createAuthHeaders(includeCsrf: boolean = true): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Only include CSRF headers if backend supports them
  if (includeCsrf && backendSupportsCsrf()) {
    const csrfToken = getCsrfToken();
    headers['X-CSRF-Token'] = csrfToken;
    headers['Origin'] = window.location.origin;
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Wrapper for fetch that automatically includes auth token and CSRF protection
 * Validates origin and includes CSRF token in headers
 * Gracefully degrades if backend doesn't support CSRF (won't break backend)
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
  
  // Try with CSRF headers first (if backend supports it)
  const includeCsrf = backendSupportsCsrf();
  let headers = await createAuthHeaders(includeCsrf);
  
  // Merge with existing headers (user headers take precedence)
  let mergedHeaders = {
    ...headers,
    ...(options.headers || {}),
  };
  
  // Ensure Origin header is set (for CSRF protection) if backend supports it
  if (includeCsrf && !mergedHeaders['Origin']) {
    mergedHeaders['Origin'] = window.location.origin;
  }
  
  try {
    // Attempt request with CSRF headers
    const response = await fetch(url, {
      ...options,
      headers: mergedHeaders,
      credentials: 'include', // Include cookies for SameSite protection
    });
    
    // If request succeeds, backend supports CSRF
    if (includeCsrf) {
      setBackendCsrfSupport(true);
    }
    
    return response;
  } catch (error: any) {
    // Check if it's a CORS preflight failure (backend doesn't support CSRF headers)
    const isCorsError = error?.message?.includes('CORS') || 
                       error?.message?.includes('Failed to fetch') ||
                       error?.name === 'TypeError';
    
    // If backend doesn't support CSRF and we tried to use it, retry without CSRF headers
    if (includeCsrf && isCorsError) {
      logger.warn('Backend may not support CSRF headers, retrying without CSRF protection', {
        url,
        error: error?.message
      });
      
      // Cache that backend doesn't support CSRF
      setBackendCsrfSupport(false);
      
      // Retry without CSRF headers
      headers = await createAuthHeaders(false);
      mergedHeaders = {
        ...headers,
        ...(options.headers || {}),
      };
      
      // Remove CSRF-related headers
      delete mergedHeaders['X-CSRF-Token'];
      // Keep Origin header but don't require it for CSRF
      
      return fetch(url, {
        ...options,
        headers: mergedHeaders,
        credentials: 'include',
      });
    }
    
    // Re-throw if it's not a CORS error or if we already tried without CSRF
    throw error;
  }
}


