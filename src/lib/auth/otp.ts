// ============================================
// TrimedCast - OTP Generation & Verification
// 6-digit OTP with rate limiting & expiry
// ============================================

import { db } from '@/lib/db';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;
const OTP_RATE_LIMIT_PER_HOUR = 5;

/**
 * Generate a random 6-digit OTP code
 */
export function generateOtpCode(): string {
  // Generate crypto-safe random 6-digit code
  const min = 100000;
  const max = 999999;
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = min + (array[0] % (max - min + 1));
  return code.toString();
}

/**
 * Create and store an OTP for email verification
 * Returns the OTP code (to be sent via email)
 */
export async function createOtp(
  email: string,
  purpose: 'signup' | 'login' | 'reset_password' | 'invite',
  tenantId?: string,
  phone?: string
): Promise<string> {
  // Rate limit: max 5 OTPs per email per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentOtps = await db.otpVerification.count({
    where: {
      email,
      purpose,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentOtps >= OTP_RATE_LIMIT_PER_HOUR) {
    throw new Error(
      `Too many OTP requests. Please try again later. (Max ${OTP_RATE_LIMIT_PER_HOUR} per hour)`
    );
  }

  // Invalidate any previous unverified OTPs for this email+purpose
  await db.otpVerification.updateMany({
    where: {
      email,
      purpose,
      isVerified: false,
      expiresAt: { gt: new Date() },
    },
    data: { expiresAt: new Date() }, // Expire them immediately
  });

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await db.otpVerification.create({
    data: {
      email,
      code,
      purpose,
      tenantId,
      phone,
      expiresAt,
    },
  });

  return code;
}

/**
 * Verify an OTP code
 * Returns { success, message }
 */
export async function verifyOtp(
  email: string,
  code: string,
  purpose: string
): Promise<{ success: boolean; message: string; otpId?: string }> {
  // Find the most recent valid OTP
  const otp = await db.otpVerification.findFirst({
    where: {
      email,
      purpose,
      isVerified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    return { success: false, message: 'No valid OTP found. Please request a new one.' };
  }

  // Check attempt limit
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return { success: false, message: 'Too many attempts. Please request a new OTP.' };
  }

  // Increment attempt count
  await db.otpVerification.update({
    where: { id: otp.id },
    data: { attempts: otp.attempts + 1 },
  });

  // Check code match
  if (otp.code !== code) {
    const remaining = OTP_MAX_ATTEMPTS - (otp.attempts + 1);
    return {
      success: false,
      message: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
    };
  }

  // Mark as verified
  await db.otpVerification.update({
    where: { id: otp.id },
    data: { isVerified: true },
  });

  return { success: true, message: 'OTP verified successfully.', otpId: otp.id };
}

/**
 * Check if an email has a verified OTP for a given purpose
 */
export async function isOtpVerified(email: string, purpose: string): Promise<boolean> {
  const verified = await db.otpVerification.findFirst({
    where: {
      email,
      purpose,
      isVerified: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return !!verified;
}

/**
 * Get seconds until next OTP can be sent (for rate limiting UI)
 */
export async function getOtpCooldownSeconds(email: string, purpose: string): Promise<number> {
  const latest = await db.otpVerification.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: 'desc' },
  });

  if (!latest) return 0;

  const cooldownMs = 60 * 1000; // 60 second cooldown between sends
  const elapsed = Date.now() - latest.createdAt.getTime();
  const remaining = Math.max(0, cooldownMs - elapsed);

  return Math.ceil(remaining / 1000);
}

/**
 * Clean up expired OTPs (run periodically)
 */
export async function cleanupExpiredOtps(): Promise<number> {
  const result = await db.otpVerification.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      isVerified: false,
    },
  });
  return result.count;
}
