// ============================================
// DELETE /api/v1/users/sessions/[id]
// Revoke a specific session (log out other device)
// Must belong to current user
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, unauthorizedError, notFoundError, forbiddenError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // Find the session
    const session = await db.userSession.findUnique({
      where: { id },
    });

    if (!session) {
      return notFoundError('Session');
    }

    // Must belong to current user
    if (session.userId !== context.userId) {
      return forbiddenError();
    }

    if (!session.isActive) {
      return apiError(
        { code: 'BAD_REQUEST', message: 'Session is already revoked' },
        400
      );
    }

    // Revoke the session
    await db.userSession.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'user_session',
      entityId: id,
      metadata: { action: 'revoke_session', ip_address: session.ipAddress },
    });

    return apiSuccess({
      message: 'Session revoked successfully',
      session_id: id,
    });
  } catch (error) {
    console.error('[Users/Sessions/[id]/DELETE]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to revoke session' }, 500);
  }
}
