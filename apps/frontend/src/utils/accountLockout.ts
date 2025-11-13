/**
 * Account lockout utility to prevent brute force attacks
 * Uses localStorage to track failed login attempts
 */

const LOCKOUT_KEY_PREFIX = 'failed_login_attempts_';
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const MAX_FAILED_ATTEMPTS = 5;

interface LockoutInfo {
  attempts: number;
  lockedUntil: number;
  lastAttempt: number;
}

/**
 * Get lockout key for an email
 */
function getLockoutKey(email: string): string {
  return `${LOCKOUT_KEY_PREFIX}${email.toLowerCase()}`;
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(email: string): void {
  const key = getLockoutKey(email);
  const now = Date.now();
  
  const existing = localStorage.getItem(key);
  let lockoutInfo: LockoutInfo;

  if (existing) {
    try {
      lockoutInfo = JSON.parse(existing);
      
      // If lockout period has passed, reset
      if (now > lockoutInfo.lockedUntil) {
        lockoutInfo = {
          attempts: 1,
          lockedUntil: 0,
          lastAttempt: now,
        };
      } else {
        // Increment attempts
        lockoutInfo.attempts += 1;
        lockoutInfo.lastAttempt = now;

        // If max attempts reached, lock account
        if (lockoutInfo.attempts >= MAX_FAILED_ATTEMPTS) {
          lockoutInfo.lockedUntil = now + LOCKOUT_DURATION;
        }
      }
    } catch {
      // Invalid data, reset
      lockoutInfo = {
        attempts: 1,
        lockedUntil: 0,
        lastAttempt: now,
      };
    }
  } else {
    lockoutInfo = {
      attempts: 1,
      lockedUntil: 0,
      lastAttempt: now,
    };
  }

  localStorage.setItem(key, JSON.stringify(lockoutInfo));
}

/**
 * Clear failed attempts (on successful login)
 */
export function clearFailedAttempts(email: string): void {
  const key = getLockoutKey(email);
  localStorage.removeItem(key);
}

/**
 * Check if account is locked
 */
export function isAccountLocked(email: string): { locked: boolean; remainingTime?: number } {
  const key = getLockoutKey(email);
  const now = Date.now();
  
  const existing = localStorage.getItem(key);
  if (!existing) {
    return { locked: false };
  }

  try {
    const lockoutInfo: LockoutInfo = JSON.parse(existing);
    
    // If lockout period has passed, account is no longer locked
    if (now > lockoutInfo.lockedUntil) {
      localStorage.removeItem(key);
      return { locked: false };
    }

    // Account is locked
    const remainingTime = Math.ceil((lockoutInfo.lockedUntil - now) / 1000); // seconds
    return { locked: true, remainingTime };
  } catch {
    // Invalid data, clear it
    localStorage.removeItem(key);
    return { locked: false };
  }
}

/**
 * Get remaining attempts before lockout
 */
export function getRemainingAttempts(email: string): number {
  const key = getLockoutKey(email);
  const existing = localStorage.getItem(key);
  
  if (!existing) {
    return MAX_FAILED_ATTEMPTS;
  }

  try {
    const lockoutInfo: LockoutInfo = JSON.parse(existing);
    const now = Date.now();
    
    // If lockout period has passed, reset
    if (now > lockoutInfo.lockedUntil) {
      return MAX_FAILED_ATTEMPTS;
    }

    return Math.max(0, MAX_FAILED_ATTEMPTS - lockoutInfo.attempts);
  } catch {
    return MAX_FAILED_ATTEMPTS;
  }
}

/**
 * Format remaining time in minutes and seconds
 */
export function formatRemainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`;
  }
  return `${secs} second${secs !== 1 ? 's' : ''}`;
}

