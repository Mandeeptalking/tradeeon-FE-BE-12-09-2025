/**
 * Rate limiting utility for API calls
 * Prevents abuse and DoS attacks
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  /**
   * Check if a request can be made based on rate limit
   */
  canMakeRequest(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => now - time < config.windowMs);
    
    if (recentRequests.length >= config.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }
  
  /**
   * Get time until next request can be made
   */
  getTimeUntilNextRequest(key: string, config: RateLimitConfig): number {
    const requests = this.requests.get(key) || [];
    if (requests.length < config.maxRequests) {
      return 0;
    }
    
    const oldestRequest = Math.min(...requests);
    const timeUntilOldestExpires = config.windowMs - (Date.now() - oldestRequest);
    return Math.max(0, timeUntilOldestExpires);
  }
  
  /**
   * Clear rate limit for a key
   */
  clear(key: string): void {
    this.requests.delete(key);
  }
  
  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.requests.clear();
  }
}

// Default rate limit: 10 requests per 1 second
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 1000,
};

export const rateLimiter = new RateLimiter();

/**
 * Execute a function with rate limiting
 */
export async function withRateLimit<T>(
  key: string,
  fn: () => Promise<T>,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<T> {
  if (!rateLimiter.canMakeRequest(key, config)) {
    const waitTime = rateLimiter.getTimeUntilNextRequest(key, config);
    throw new Error(`Too many requests. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
  }
  
  return fn();
}

/**
 * Create a rate-limited fetch wrapper
 */
export function createRateLimitedFetch(
  baseKey: string,
  config: RateLimitConfig = DEFAULT_CONFIG
) {
  return async (url: string, options?: RequestInit): Promise<Response> => {
    const key = `${baseKey}:${url}`;
    return withRateLimit(key, () => fetch(url, options), config);
  };
}

