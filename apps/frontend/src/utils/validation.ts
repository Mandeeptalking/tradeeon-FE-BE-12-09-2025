/**
 * Input validation and sanitization utilities
 * Prevents XSS and injection attacks
 */

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove event handlers (onclick, onerror, etc.)
    .replace(/on\w+\s*=/gi, '')
    // Remove data: URLs that could be used for XSS
    .replace(/data:text\/html/gi, '')
    // Trim whitespace
    .trim();
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate API key format (Binance keys are typically 64 characters alphanumeric)
 */
export function validateApiKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  // Binance API keys: 32-128 alphanumeric characters
  return /^[A-Za-z0-9]{32,128}$/.test(key.trim());
}

/**
 * Validate API secret format
 */
export function validateApiSecret(secret: string): boolean {
  if (!secret || typeof secret !== 'string') {
    return false;
  }
  
  // Binance secrets: typically 64 characters hexadecimal
  return /^[A-Za-z0-9]{32,128}$/.test(secret.trim());
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize and validate symbol (trading pair)
 */
export function validateSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') {
    return false;
  }
  
  // Trading symbols are typically uppercase alphanumeric pairs (e.g., BTCUSDT)
  return /^[A-Z0-9]{2,20}$/.test(symbol.trim().toUpperCase());
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(value: string | number): number | null {
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? null : value;
  }
  
  if (typeof value !== 'string') {
    return null;
  }
  
  const num = parseFloat(value.trim());
  return isNaN(num) || !isFinite(num) ? null : num;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const parsed = new URL(url);
    // Only allow HTTPS in production
    if (import.meta.env.PROD && parsed.protocol !== 'https:') {
      return false;
    }
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

