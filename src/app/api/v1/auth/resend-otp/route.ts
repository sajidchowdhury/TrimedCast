// ============================================
// POST /api/v1/auth/resend-otp
// Resend OTP with cooldown
// ============================================

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { createOtp, getOtpCooldownSeconds } from '@/lib/auth/otp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, purpose } = body;

    if (!email) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'Email is required', field: 'email' }, 400);
    }

    // Check cooldown
    const cooldown = await getOtpCooldownSeconds(email, purpose || 'signup');
    if (cooldown > 0) {
      return apiSuccess({
        message: `Please wait ${cooldown} seconds before requesting a new OTP`,
        cooldown_seconds: cooldown,
        can_resend: false,
      });
    }

    // Create and send new OTP
    try {
      const otpCode = await createOtp(email, purpose || 'signup');

      // TODO: Send OTP via email (Session 3: Email Service Integration)
      const isDev = process.env.NODE_ENV === 'development';

      return apiSuccess({
        message: 'New OTP sent to your email address',
        email,
        expires_in_minutes: 5,
        cooldown_seconds: 60,
        can_resend: false,
        // In development, include OTP for testing
        ...(isDev ? { _dev_otp: otpCode } : {}),
      });
    } catch (otpError) {
      if (otpError instanceof Error && otpError.message.includes('Too many')) {
        return apiError({ code: 'RATE_LIMITED', message: otpError.message }, 429);
      }
      throw otpError;
    }
  } catch (error) {
    console.error('[Auth/ResendOtp]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to resend OTP' }, 500);
  }
}
