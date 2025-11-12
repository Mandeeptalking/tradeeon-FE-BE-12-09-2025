# Frontend Security Fixes

## Implementation Guide

### Fix 1: Remove Console.log in Production

Create `apps/frontend/src/utils/logger.ts`:
```typescript
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  error: (...args: any[]) => {
    if (isDev) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  },
};
```

Replace all `console.*` calls with `logger.*`.

### Fix 2: Enforce HTTPS in Production

Update `apps/frontend/src/lib/api/auth.ts`:
```typescript
function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE;
  
  // In production, enforce HTTPS
  if (import.meta.env.PROD) {
    if (!apiUrl || !apiUrl.startsWith('https://')) {
      throw new Error('API URL must use HTTPS in production');
    }
    return apiUrl;
  }
  
  // Development fallback
  return apiUrl || 'http://localhost:8000';
}

const API_BASE_URL = getApiBaseUrl();
```

### Fix 3: Add Content Security Policy

Update `apps/frontend/index.html`:
```html
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' https://*.supabase.co https://api.tradeeon.com https://*.binance.com wss://*.binance.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  ">
  <meta http-equiv="X-Content-Type-Options" content="nosniff">
  <meta http-equiv="X-Frame-Options" content="DENY">
  <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
  <!-- ... rest of head ... -->
</head>
```

### Fix 4: Sanitize Error Messages

Create `apps/frontend/src/utils/errorHandler.ts`:
```typescript
export function sanitizeErrorMessage(error: any): string {
  const errorMessage = error?.message || String(error);
  
  // Remove sensitive patterns
  const sensitivePatterns = [
    /token/i,
    /password/i,
    /secret/i,
    /key/i,
    /api[_-]?key/i,
    /authorization/i,
    /bearer/i,
  ];
  
  // Don't expose internal errors
  if (errorMessage.includes('localhost') || 
      errorMessage.includes('127.0.0.1') ||
      errorMessage.match(/^[A-Za-z0-9_-]+\.supabase\.co/)) {
    return 'An error occurred. Please try again or contact support.';
  }
  
  // Generic error messages
  if (errorMessage.includes('NetworkError') || 
      errorMessage.includes('Failed to fetch')) {
    return 'Unable to connect to server. Please check your internet connection.';
  }
  
  return errorMessage;
}
```

### Fix 5: Add Input Validation

Create `apps/frontend/src/utils/validation.ts`:
```typescript
export function sanitizeInput(input: string): string {
  // Remove potential XSS patterns
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateApiKey(key: string): boolean {
  // Binance API keys are typically 64 characters
  return /^[A-Za-z0-9]{32,128}$/.test(key);
}
```

### Fix 6: Implement Rate Limiting

Create `apps/frontend/src/utils/rateLimiter.ts`:
```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  canMakeRequest(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }
}

export const rateLimiter = new RateLimiter();

export function withRateLimit<T>(
  key: string,
  maxRequests: number,
  windowMs: number,
  fn: () => Promise<T>
): Promise<T> {
  if (!rateLimiter.canMakeRequest(key, maxRequests, windowMs)) {
    throw new Error('Too many requests. Please wait a moment.');
  }
  return fn();
}
```

### Fix 7: Secure localStorage Usage

Update `apps/frontend/src/components/alerts/AlertList.tsx`:
```typescript
// Don't store sensitive data in localStorage
// Use encrypted storage or backend storage instead
const STORAGE_KEY = 'tradeeon_alerts';

function getStoredAlerts(): any[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Validate structure
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function setStoredAlerts(alerts: any[]): void {
  try {
    // Don't store sensitive fields
    const sanitized = alerts.map(alert => ({
      id: alert.id,
      name: alert.name,
      status: alert.status,
      // Don't store API keys, tokens, or other sensitive data
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Silently fail
  }
}
```

