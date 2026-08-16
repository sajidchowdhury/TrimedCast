// ============================================
// TrimedCast - Password Hashing Utility
// bcrypt-based password hashing for production
// ============================================

import { hash, compare } from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

/**
 * Verify a plain-text password against a hash
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

/**
 * Validate password strength
 * Returns array of validation errors (empty = valid)
 */
export function validatePasswordStrength(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    errors.push('Password must be at most 128 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return errors;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate BD phone number format
 * Accepts: +880 1XXX-XXXXXX, 01XXXXXXXXX, 8801XXXXXXXXX
 */
export function validatePhone(phone: string): boolean {
  // Strip spaces and dashes for validation
  const cleaned = phone.replace(/[\s-]/g, '');
  
  // Patterns:
  // 01XXXXXXXXX (11 digits starting with 01)
  // +8801XXXXXXXXX (14 digits starting with +8801)
  // 8801XXXXXXXXX (13 digits starting with 8801)
  const bdPhoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;
  return bdPhoneRegex.test(cleaned);
}

/**
 * Normalize BD phone number to +880 format
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '');
  
  if (cleaned.startsWith('+880')) return cleaned;
  if (cleaned.startsWith('880')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+88${cleaned}`;
  
  return cleaned;
}
