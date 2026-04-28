/**
 * Shared validation utilities for auth flows.
 * Ensures consistent password policies and input validation across
 * signup, invite-signup, and password reset flows.
 */

export interface PasswordValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validates a password against production-grade requirements.
 * Rules:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function validatePassword(password: string): PasswordValidation {
  if (!password) {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters.' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter.' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number.' };
  }
  return { valid: true };
}

/**
 * Validates an email address format.
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates that a redirect path is safe (relative, no open redirect).
 */
export function isSafeRedirectPath(path: string): boolean {
  if (!path) return false;
  // Must start with /
  if (!path.startsWith('/')) return false;
  // Must not contain protocol-relative URLs
  if (path.startsWith('//')) return false;
  // Must not contain absolute URLs disguised as paths
  if (/^\/[a-zA-Z]+:/.test(path)) return false;
  return true;
}
