// ============================================
// PUT /api/v1/auth/password
// Change own password
// Any authenticated user
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, unauthorizedError, validationError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
import { verifyPassword, hashPassword, validatePasswordStrength } from '@/lib/auth/password';
export const runtime = 'nodejs';


export async function PUT(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const body = await request.json();
    const { current_password, new_password } = body;

    // Validate required fields
    if (!current_password) {
      return validationError('current_password', 'Current password is required');
    }
    if (!new_password) {
      return validationError('new_password', 'New password is required');
    }

    // Get user with password hash
    const user = await db.user.findUnique({
      where: { id: context.userId },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user) {
      return unauthorizedError();
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(current_password, user.passwordHash);
    if (!isCurrentValid) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'Current password is incorrect', field: 'current_password' },
        400
      );
    }

    // Validate new password strength
    const strengthErrors = validatePasswordStrength(new_password);
    if (strengthErrors.length > 0) {
      return apiError(
        strengthErrors.map(msg => ({
          code: 'VALIDATION_ERROR',
          message: msg,
          field: 'new_password',
        })),
        400
      );
    }

    // Check new password is different from current
    const isSameAsOld = await verifyPassword(new_password, user.passwordHash);
    if (isSameAsOld) {
      return validationError('new_password', 'New password must be different from current password');
    }

    // Hash and update
    const newHash = await hashPassword(new_password);
    await db.user.update({
      where: { id: context.userId },
      data: { passwordHash: newHash },
    });

    // Audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'user',
      entityId: context.userId,
      metadata: { action: 'change_password' },
    });

    return apiSuccess({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('[Auth/Password/PUT]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to change password' }, 500);
  }
}
