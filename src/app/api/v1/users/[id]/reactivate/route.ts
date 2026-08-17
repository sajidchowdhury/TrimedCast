// ============================================
// POST /api/v1/users/[id]/reactivate
// Reactivate a deactivated user
// Admin only
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from '@/lib/api/response';
import { getAuthContext, canDo } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // Admin only
    if (!canDo(context, 'users.manage')) {
      return forbiddenError();
    }

    // Find user within tenant scope
    const user = await db.user.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!user) {
      return notFoundError('User');
    }

    // Check if already active
    if (user.isActive) {
      return apiError(
        { code: 'BAD_REQUEST', message: 'User is already active' },
        400
      );
    }

    // Reactivate
    await db.user.update({
      where: { id },
      data: { isActive: true },
    });

    // Audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'user',
      entityId: id,
      metadata: { action: 'reactivate' },
    });

    return apiSuccess({
      message: 'User reactivated successfully',
      user_id: id,
    });
  } catch (error) {
    console.error('[Users/[id]/reactivate/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to reactivate user' }, 500);
  }
}
