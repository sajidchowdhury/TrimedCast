// ============================================
// POST /api/v1/auth/forgot-password
// Send OTP to email for password reset
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api/response';
import { createOtp } from '@/lib/auth/otp';
import { validateEmail } from '@/lib/auth/password';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !validateEmail(email)) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'Valid email address is required', field: 'email' }, 400);
    }

    // Check if user exists with this email (don't reveal if email exists or not for security)
    const user = await db.user.findFirst({
      where: { email, isActive: true },
    });

    // Always return success to prevent email enumeration attacks
    // But only send OTP if user actually exists
    if (!user) {
      // Return success anyway (security best practice)
      return apiSuccess({
        message: 'If an account with this email exists, an OTP has been sent.',
        email,
        expires_in_minutes: 5,
      });
    }

    // Create OTP for password reset
    try {
      const otpCode = await createOtp(email, 'reset_password', user.tenantId);

      // Send OTP via email
      await sendOtpEmail(email, otpCode, 'reset_password');

      const isDev = process.env.NODE_ENV === 'development';

      return apiSuccess({
        message: 'If an account with this email exists, an OTP has been sent.',
        email,
        expires_in_minutes: 5,
        // In development, include OTP for testing
        ...(isDev ? { _dev_otp: otpCode } : {}),
      });
    } catch (otpError) {
      if (otpError instanceof Error && otpError.message.includes('Too many')) {
        return apiError({ code: 'RATE_LIMITED', message: otpError.message }, 429);
      }
      // Still return success to prevent enumeration
      return apiSuccess({
        message: 'If an account with this email exists, an OTP has been sent.',
        email,
        expires_in_minutes: 5,
      });
    }
  } catch (error) {
    console.error('[Auth/ForgotPassword]', error);
    // Return generic success even on error (security)
    return apiSuccess({ message: 'If an account with this email exists, an OTP has been sent.' });
  }
}
