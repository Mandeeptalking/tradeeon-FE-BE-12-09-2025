/**
 * Output encoding utilities
 * Ensures user-generated content is safely displayed
 * React automatically escapes JSX content, but this provides additional safety
 */

/**
 * HTML entity encoding for user content
 * Converts special characters to HTML entities
 */
export function encodeHtmlEntities(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Encode text for safe display in HTML attributes
 */
export function encodeForAttribute(text: string): string {
  return encodeHtmlEntities(text);
}

/**
 * Encode text for safe display in URL
 */
export function encodeForUrl(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  
  return encodeURIComponent(text);
}

/**
 * Safe display helper - ensures content is properly encoded
 * Use this when displaying user-generated content that might contain HTML
 */
export function safeDisplay(text: string | number | null | undefined): string {
  if (text === null || text === undefined) {
    return '';
  }
  
  if (typeof text === 'number') {
    return String(text);
  }
  
  // React automatically escapes JSX content, but this provides extra safety
  // for cases where content might be used in attributes or other contexts
  return encodeHtmlEntities(String(text));
}

/**
 * Format and safely display currency values
 */
export function safeCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '$0.00';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue) || !isFinite(numValue)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

/**
 * Format and safely display numbers
 */
export function safeNumber(
  value: number | string | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined) {
    return '0';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue) || !isFinite(numValue)) {
    return '0';
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(numValue);
}
