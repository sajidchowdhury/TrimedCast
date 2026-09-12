// ============================================
// TrimedCast LEAN — Auth helpers
// Password hashing (bcrypt) + session token generation + cookie utils
// ============================================

import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'trimedcast-session';
const SESSION_DURATION_DAYS = 30;
const BCRYPT_ROUNDS = 10;

/** Hash a password using bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Verify a password against a hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Generate a random session token. */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Get session expiry date. */
export function getSessionExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DURATION_DAYS);
  return d;
}

/** Set the session cookie (HTTP-only). */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: getSessionExpiry(),
  });
}

/** Clear the session cookie. */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Get the session token from the cookie. */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/** Validate basic email format. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate basic phone format (BD: 11 digits starting with 01, or with +880). */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(?:\+8801|01)[0-9]{9}$/.test(cleaned);
}
