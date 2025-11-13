/**
 * Password strength checker utility
 */

export interface PasswordStrength {
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  label: string; // 'Very Weak', 'Weak', 'Fair', 'Good', 'Very Strong'
  feedback: string[]; // Array of feedback messages
  color: string; // Tailwind color class
}

/**
 * Check password strength and return detailed feedback
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Use at least 8 characters');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }

  // Number check
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }

  // Special character check
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add special characters (!@#$%^&*)');
  }

  // Determine label and color
  let label: string;
  let color: string;

  if (score <= 1) {
    label = 'Very Weak';
    color = 'text-red-400';
  } else if (score === 2) {
    label = 'Weak';
    color = 'text-orange-400';
  } else if (score === 3) {
    label = 'Fair';
    color = 'text-yellow-400';
  } else if (score === 4) {
    label = 'Good';
    color = 'text-blue-400';
  } else {
    label = 'Very Strong';
    color = 'text-green-400';
  }

  return {
    score,
    label,
    feedback: feedback.length > 0 ? feedback : ['Strong password!'],
    color,
  };
}

/**
 * Validate password meets minimum requirements
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*)' };
  }

  return { valid: true };
}

