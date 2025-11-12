/**
 * Secure logger utility
 * Only logs in development mode to prevent sensitive data exposure in production
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors, but sanitize in production
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
  },
  
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
};

