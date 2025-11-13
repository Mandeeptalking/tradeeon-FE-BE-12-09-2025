/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  backoffMultiplier?: number;
  retryableErrors?: string[]; // Error messages that should trigger retry
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: ['timeout', 'network', 'fetch', 'ECONNRESET', 'ETIMEDOUT'],
  onRetry: () => {},
};

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();
  
  return retryableErrors.some(retryable => 
    errorMessage.includes(retryable.toLowerCase()) || 
    errorName.includes(retryable.toLowerCase())
  );
}

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
  return Math.min(delay, options.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        throw lastError;
      }

      // Check if error is retryable
      if (!isRetryableError(lastError, opts.retryableErrors)) {
        throw lastError;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts);
      opts.onRetry(attempt + 1, lastError);
      
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Create a fetch wrapper with timeout and retry
 */
export async function fetchWithTimeoutAndRetry(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000, // 30 seconds default
  retryOptions: RetryOptions = {}
): Promise<Response> {
  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
  }, retryOptions);
}

