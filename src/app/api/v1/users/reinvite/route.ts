// ============================================
// POST /api/v1/users/reinvite
// Resend invitation to pending user
// Admin only
// Only for users with inviteToken (not yet accepted)
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, unauthorizedError, notFoundError, validationError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
import { sendInviteEmail } from '@/lib/email';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // Admin only
    if (context.role !== 'admin') {
      return apiError({ code: 'FORBIDDEN', message: 'Only admins can resend invitations' }, 403);
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return validationError('user_id', 'user_id is required');
    }

    // Find user within tenant scope
    const user = await db.user.findFirst({
      where: { id: user_id, tenantId: context.tenantId },
    });

    if (!user) {
      return notFoundError('User');
    }

    // Must have an invite token (pending invitation)
    if (!user.inviteToken) {
      return apiError(
        { code: 'BAD_REQUEST', message: 'This user has already accepted their invitation' },
        400
      );
    }

    // Generate new invite token and expiry
    const inviteBytes = new Uint8Array(32);
    crypto.getRandomValues(inviteBytes);
    const newInviteToken = Array.from(inviteBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update user with new invite token
    await db.user.update({
      where: { id: user_id },
      data: {
        inviteToken: newInviteToken,
        inviteExpiresAt,
      },
    });

    // Send invite email (fire and forget)
    const inviter = await db.user.findUnique({
      where: { id: context.userId },
      select: { name: true },
    });
    const tenant = await db.tenant.findUnique({
      where: { id: context.tenantId },
      select: { shopName: true, acId: true },
    });

    sendInviteEmail(
      user.email,
      inviter?.name || 'Admin',
      tenant?.shopName || tenant?.acId || 'TrimedCast',
      tenant?.acId || '',
      newInviteToken,
      user.role
    ).catch(err => console.error('[Users/Reinvite] Email failed:', err));

    // Audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'user',
      entityId: user_id,
      metadata: { action: 'resend_invite', email: user.email },
    });

    const isDev = process.env.NODE_ENV === 'development';

    return apiSuccess({
      message: 'Invitation resent successfully',
      user_id,
      email: user.email,
      invite_expires_at: inviteExpiresAt,
      // In development, include invite token for testing
      ...(isDev ? { _dev_invite_token: newInviteToken } : {}),
    });
  } catch (error) {
    console.error('[Users/Reinvite/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to resend invitation' }, 500);
  }
}
