/**
 * Error handling utilities
 * Sanitizes error messages to prevent information disclosure
 */

/**
 * Sanitize error messages to prevent exposing sensitive information
 */
export function sanitizeErrorMessage(error: any): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }
  
  const errorMessage = error?.message || String(error);
  
  // Remove sensitive patterns
  const sensitivePatterns = [
    /token[=:]\s*[^\s,}]+/gi,
    /password[=:]\s*[^\s,}]+/gi,
    /secret[=:]\s*[^\s,}]+/gi,
    /key[=:]\s*[^\s,}]+/gi,
    /api[_-]?key[=:]\s*[^\s,}]+/gi,
    /authorization[=:]\s*[^\s,}]+/gi,
    /bearer\s+[^\s,}]+/gi,
  ];
  
  let sanitized = errorMessage;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // Don't expose internal URLs or localhost
  if (sanitized.includes('localhost') || 
      sanitized.includes('127.0.0.1') ||
      sanitized.match(/^[A-Za-z0-9_-]+\.supabase\.co/)) {
    return 'An error occurred. Please try again or contact support.';
  }
  
  // Generic error messages for common issues
  if (sanitized.includes('NetworkError') || 
      sanitized.includes('Failed to fetch') ||
      sanitized.includes('Network request failed')) {
    return 'Unable to connect to server. Please check your internet connection and try again.';
  }
  
  if (sanitized.includes('401') || sanitized.includes('Unauthorized')) {
    return 'Authentication failed. Please sign in again.';
  }
  
  if (sanitized.includes('403') || sanitized.includes('Forbidden')) {
    return 'You do not have permission to perform this action.';
  }
  
  if (sanitized.includes('404') || sanitized.includes('Not Found')) {
    return 'The requested resource was not found.';
  }
  
  if (sanitized.includes('500') || sanitized.includes('Internal Server Error')) {
    return 'A server error occurred. Please try again later or contact support.';
  }
  
  // Return sanitized message if no generic match
  return sanitized.length > 200 
    ? sanitized.substring(0, 200) + '...' 
    : sanitized;
}

/**
 * Create a safe error object for API responses
 */
export function createSafeError(error: any): {
  message: string;
  code?: string;
  status?: number;
} {
  return {
    message: sanitizeErrorMessage(error),
    code: error?.code,
    status: error?.status || error?.response?.status,
  };
}

