/**
 * Secure logger utility
 * Only logs in development mode to prevent sensitive data exposure in production
 */

// Safely check if we're in development mode
const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      try {
        console.log(...args);
      } catch (e) {
        // Silently fail if console is not available
      }
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors, but sanitize in production
    try {
      if (isDev) {
        console.error(...args);
      } else {
        // In production, only log error type, not sensitive data
        const sanitized = args.map(arg => {
          if (typeof arg === 'string') {
            // Remove sensitive patterns
            return arg
              .replace(/token[=:]\s*[^\s,}]+/gi, 'token=***')
              .replace(/password[=:]\s*[^\s,}]+/gi, 'password=***')
              .replace(/secret[=:]\s*[^\s,}]+/gi, 'secret=***')
              .replace(/key[=:]\s*[^\s,}]+/gi, 'key=***')
              .replace(/authorization[=:]\s*[^\s,}]+/gi, 'authorization=***');
          }
          return arg;
        });
        console.error(...sanitized);
      }
    } catch (e) {
      // Silently fail if console is not available
    }
  },
  
  warn: (...args: any[]) => {
    if (isDev) {
      try {
        console.warn(...args);
      } catch (e) {
        // Silently fail if console is not available
      }
    }
  },
  
  debug: (...args: any[]) => {
    if (isDev) {
      try {
        console.debug(...args);
      } catch (e) {
        // Silently fail if console is not available
      }
    }
  },
  
  info: (...args: any[]) => {
    if (isDev) {
      try {
        console.info(...args);
      } catch (e) {
        // Silently fail if console is not available
      }
    }
  },
};

