// ============================================
// POST /api/v1/auth/reset-password
// Verify OTP and set new password
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api/response';
import { verifyOtp } from '@/lib/auth/otp';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { revokeAllUserSessions } from '@/lib/auth/session-store';
import { createAuditLog } from '@/lib/api/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, new_password } = body;

    // Validate
    const errors: { code: string; message: string; field?: string }[] = [];
    if (!email) errors.push({ code: 'VALIDATION_ERROR', message: 'Email is required', field: 'email' });
    if (!otp) errors.push({ code: 'VALIDATION_ERROR', message: 'OTP is required', field: 'otp' });
    if (!new_password) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'New password is required', field: 'new_password' });
    } else {
      const pwdErrors = validatePasswordStrength(new_password);
      for (const err of pwdErrors) {
        errors.push({ code: 'VALIDATION_ERROR', message: err, field: 'new_password' });
      }
    }

    if (errors.length > 0) {
      return apiError(errors, 400);
    }

    // Verify OTP
    const result = await verifyOtp(email, otp, 'reset_password');
    if (!result.success) {
      return apiError({ code: 'INVALID_OTP', message: result.message }, 400);
    }

    // Find user
    const user = await db.user.findFirst({
      where: { email, isActive: true },
    });

    if (!user) {
      return apiError({ code: 'NOT_FOUND', message: 'No account found with this email' }, 404);
    }

    // Hash new password and update
    const passwordHash = await hashPassword(new_password);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Revoke all existing sessions (force re-login on all devices)
    const revokedCount = await revokeAllUserSessions(user.id);

    // Audit
    await createAuditLog({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'update',
      entity: 'user',
      entityId: user.id,
      metadata: { action: 'password_reset', sessions_revoked: revokedCount },
    });

    return apiSuccess({
      message: 'Password reset successfully. Please login with your new password.',
      sessions_revoked: revokedCount,
    });
  } catch (error) {
    console.error('[Auth/ResetPassword]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Password reset failed' }, 500);
  }
}
