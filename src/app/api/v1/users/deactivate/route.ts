// ============================================
// POST /api/v1/users/deactivate
// Admin deactivates a team member
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, unauthorizedError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { revokeAllUserSessions } from '@/lib/auth/session-store';
import { createAuditLog } from '@/lib/api/audit';

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    if (context.role !== 'admin') {
      return apiError({ code: 'FORBIDDEN', message: 'Only admins can deactivate users' }, 403);
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'user_id is required' }, 400);
    }

    // Can't deactivate yourself
    if (user_id === context.userId) {
      return apiError({ code: 'BAD_REQUEST', message: 'You cannot deactivate your own account' }, 400);
    }

    // Find the user
    const user = await db.user.findFirst({
      where: { id: user_id, tenantId: context.tenantId },
    });

    if (!user) {
      return apiError({ code: 'NOT_FOUND', message: 'User not found in your team' }, 404);
    }

    if (!user.isActive) {
      return apiError({ code: 'BAD_REQUEST', message: 'User is already deactivated' }, 400);
    }

    // Deactivate and revoke sessions
    await db.user.update({
      where: { id: user_id },
      data: { isActive: false },
    });

    const revokedCount = await revokeAllUserSessions(user_id);

    // Audit
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'user',
      entityId: user_id,
      metadata: { action: 'deactivate', sessions_revoked: revokedCount },
    });

    return apiSuccess({
      message: 'Team member deactivated successfully',
      user_id,
      sessions_revoked: revokedCount,
    });
  } catch (error) {
    console.error('[Users/Deactivate]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to deactivate user' }, 500);
  }
}
