// ============================================
// POST /api/v1/auth/register
// Step 1: Register new tenant (sends OTP to email)
// ============================================

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { createOtp } from '@/lib/auth/otp';
import { validateEmail, validatePhone, validatePasswordStrength } from '@/lib/auth/password';
import { isValidDivision, VALID_DIVISIONS } from '@/lib/auth/ac-id';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop_name, email, phone, division, password } = body;

    // Validate required fields
    const errors: { code: string; message: string; field: string }[] = [];

    if (!shop_name || shop_name.trim().length < 2) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'Shop name is required (min 2 characters)', field: 'shop_name' });
    }

    if (!email || !validateEmail(email)) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'Valid email address is required', field: 'email' });
    }

    if (phone && !validatePhone(phone)) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'Invalid BD phone number format', field: 'phone' });
    }

    if (!division || !isValidDivision(division)) {
      errors.push({ code: 'VALIDATION_ERROR', message: `Division must be one of: ${VALID_DIVISIONS.join(', ')}`, field: 'division' });
    }

    if (!password) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'Password is required', field: 'password' });
    } else {
      const passwordErrors = validatePasswordStrength(password);
      for (const err of passwordErrors) {
        errors.push({ code: 'VALIDATION_ERROR', message: err, field: 'password' });
      }
    }

    if (errors.length > 0) {
      return apiError(errors, 400);
    }

    // Create OTP (this also rate-limits)
    try {
      const otpCode = await createOtp(email, 'signup', undefined, phone);

      // TODO: Send OTP via email (Session 3: Email Service Integration)
      // For now, return the OTP in development mode
      const isDev = process.env.NODE_ENV === 'development';

      return apiSuccess({
        message: 'OTP sent to your email address',
        email,
        expires_in_minutes: 5,
        // In development, include OTP for testing
        ...(isDev ? { _dev_otp: otpCode } : {}),
      }, undefined, 201);
    } catch (otpError) {
      if (otpError instanceof Error && otpError.message.includes('Too many')) {
        return apiError({ code: 'RATE_LIMITED', message: otpError.message }, 429);
      }
      throw otpError;
    }
  } catch (error) {
    console.error('[Auth/Register]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Registration failed' }, 500);
  }
}
