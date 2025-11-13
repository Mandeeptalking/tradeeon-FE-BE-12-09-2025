/**
 * Connection error message utilities
 * Provides user-friendly error messages and recovery suggestions
 */

export interface ErrorDetails {
  message: string;
  suggestion?: string;
  code?: string;
}

/**
 * Map technical errors to user-friendly messages with recovery suggestions
 */
export function getConnectionErrorMessage(error: any): ErrorDetails {
  const errorMessage = error?.message || error?.response?.data?.detail || 'Unknown error';
  const errorCode = error?.code || error?.response?.status;
  const lowerMessage = errorMessage.toLowerCase();

  // Network/Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('aborted')) {
    return {
      message: 'Connection timeout - The request took too long to complete',
      suggestion: 'Please check your internet connection and try again. If the problem persists, the exchange API may be experiencing issues.',
      code: 'TIMEOUT',
    };
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('failed to fetch')) {
    return {
      message: 'Network error - Unable to reach the server',
      suggestion: 'Please check your internet connection and ensure the backend server is running. Try again in a few moments.',
      code: 'NETWORK_ERROR',
    };
  }

  // Authentication errors
  if (errorCode === 401 || lowerMessage.includes('authentication') || lowerMessage.includes('unauthorized')) {
    return {
      message: 'Authentication failed - Your session may have expired',
      suggestion: 'Please sign out and sign in again, then try connecting your exchange.',
      code: 'AUTH_FAILED',
    };
  }

  // Binance-specific errors
  if (lowerMessage.includes('invalid api-key') || lowerMessage.includes('invalid api key')) {
    return {
      message: 'Invalid API Key - The API key you provided is incorrect',
      suggestion: 'Please verify your API key in Binance API Management. Make sure you copied the entire key without any extra spaces.',
      code: 'INVALID_API_KEY',
    };
  }

  if (lowerMessage.includes('invalid signature') || lowerMessage.includes('signature')) {
    return {
      message: 'Invalid API Secret - The API secret does not match your API key',
      suggestion: 'Please verify your API secret in Binance API Management. Make sure you copied the entire secret correctly.',
      code: 'INVALID_SECRET',
    };
  }

  if (lowerMessage.includes('ip') && lowerMessage.includes('whitelist')) {
    return {
      message: 'IP Not Whitelisted - Your server IP address is not authorized',
      suggestion: 'Please add the IP address 52.77.227.148 to your Binance API key whitelist in Binance API Management, then try again.',
      code: 'IP_NOT_WHITELISTED',
    };
  }

  if (lowerMessage.includes('permission') || lowerMessage.includes('scope') || lowerMessage.includes('no account access')) {
    return {
      message: 'Insufficient Permissions - Your API key does not have the required permissions',
      suggestion: 'Please enable "Enable Reading" and "Enable Spot & Margin Trading" permissions for your API key in Binance API Management.',
      code: 'INSUFFICIENT_PERMISSIONS',
    };
  }

  if (lowerMessage.includes('not enabled') || lowerMessage.includes('disabled')) {
    return {
      message: 'Feature Not Enabled - The requested feature is not enabled on your account',
      suggestion: 'Please enable the required features in your Binance account settings, then try again.',
      code: 'FEATURE_DISABLED',
    };
  }

  // Database errors
  if (lowerMessage.includes('foreign key') || lowerMessage.includes('user_id')) {
    return {
      message: 'Account Error - Your user profile is not set up correctly',
      suggestion: 'Please sign out and sign in again. If the problem persists, contact support.',
      code: 'USER_PROFILE_ERROR',
    };
  }

  if (lowerMessage.includes('duplicate') || lowerMessage.includes('already exists')) {
    return {
      message: 'Connection Already Exists - You already have a connection for this exchange',
      suggestion: 'You can edit or rotate keys for your existing connection instead of creating a new one.',
      code: 'DUPLICATE_CONNECTION',
    };
  }

  // Rate limiting
  if (errorCode === 429 || lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return {
      message: 'Rate Limit Exceeded - Too many requests',
      suggestion: 'Please wait a few moments before trying again. The connection test is rate-limited to prevent abuse.',
      code: 'RATE_LIMIT',
    };
  }

  // Server errors
  if (errorCode >= 500) {
    return {
      message: 'Server Error - The server encountered an unexpected error',
      suggestion: 'Please try again in a few moments. If the problem persists, the server may be experiencing issues.',
      code: 'SERVER_ERROR',
    };
  }

  // Default error
  return {
    message: errorMessage,
    suggestion: 'Please verify your API credentials and try again. If the problem persists, check that your API key has the required permissions.',
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  const errorMessage = error?.message || '';
  const errorCode = error?.response?.status;
  const lowerMessage = errorMessage.toLowerCase();

  // Retryable errors
  const retryablePatterns = [
    'timeout',
    'network',
    'fetch',
    'econnreset',
    'etimedout',
    'server error',
    '503',
    '502',
    '504',
  ];

  // Non-retryable errors (don't retry these)
  const nonRetryablePatterns = [
    'invalid api',
    'invalid signature',
    'authentication',
    'unauthorized',
    '401',
    '403',
    '404',
    'permission',
    'scope',
  ];

  // Check non-retryable first
  if (nonRetryablePatterns.some(pattern => lowerMessage.includes(pattern) || String(errorCode) === pattern)) {
    return false;
  }

  // Check retryable patterns
  if (retryablePatterns.some(pattern => lowerMessage.includes(pattern) || String(errorCode) === pattern)) {
    return true;
  }

  // Server errors (5xx) are retryable
  if (errorCode >= 500 && errorCode < 600) {
    return true;
  }

  // Default: don't retry unknown errors
  return false;
}

