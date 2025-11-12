/**
 * Output encoding utilities
 * Prevents XSS attacks by properly encoding user-generated content
 */

/**
 * Encode HTML entities to prevent XSS
 */
export function encodeHtml(text: string): string {
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
  
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Encode attribute values to prevent XSS in HTML attributes
 */
export function encodeAttribute(value: string): string {
  if (typeof value !== 'string') {
    return '';
  }
  
  return encodeHtml(value)
    .replace(/\s/g, '&#32;') // Encode spaces
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Encode URL parameters to prevent injection
 */
export function encodeUrlParam(value: string): string {
  if (typeof value !== 'string') {
    return '';
  }
  
  return encodeURIComponent(value);
}

/**
 * Sanitize and encode text for display in React (React already escapes, but this adds extra safety)
 */
export function safeText(text: string | number | null | undefined): string {
  if (text === null || text === undefined) {
    return '';
  }
  
  if (typeof text === 'number') {
    return String(text);
  }
  
  return encodeHtml(String(text));
}

