// ============================================
// POST /api/v1/auth/accept-invite
// Invited user accepts invitation and sets password
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api/response';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { createAuthSession } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, name } = body;

    // Validate
    const errors: { code: string; message: string; field?: string }[] = [];
    if (!token) errors.push({ code: 'VALIDATION_ERROR', message: 'Invite token is required', field: 'token' });
    if (!password) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'Password is required', field: 'password' });
    } else {
      const pwdErrors = validatePasswordStrength(password);
      for (const err of pwdErrors) {
        errors.push({ code: 'VALIDATION_ERROR', message: err, field: 'password' });
      }
    }

    if (errors.length > 0) {
      return apiError(errors, 400);
    }

    // Find user by invite token
    const user = await db.user.findFirst({
      where: {
        inviteToken: token,
        inviteExpiresAt: { gt: new Date() },
      },
      include: { tenant: true },
    });

    if (!user) {
      return apiError({ code: 'INVALID_TOKEN', message: 'Invalid or expired invitation token' }, 400);
    }

    if (user.isActive) {
      return apiError({ code: 'CONFLICT', message: 'This invitation has already been accepted' }, 409);
    }

    // Set password and activate user
    const passwordHash = await hashPassword(password);
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        name: name || user.name,
        isActive: true,
        inviteToken: null,
        inviteExpiresAt: null,
      },
    });

    // Create session
    const ipAddress = request.headers.get('x-forwarded-for') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    const sessionToken = await createAuthSession(updatedUser.id, user.tenantId, ipAddress, userAgent);

    // Audit
    await createAuditLog({
      tenantId: user.tenantId,
      userId: updatedUser.id,
      action: 'update',
      entity: 'user',
      entityId: updatedUser.id,
      metadata: { action: 'accept_invite', invited_by: user.invitedBy },
    });

    return apiSuccess({
      message: 'Invitation accepted! Welcome to TrimedCast.',
      token: sessionToken,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
      tenant: {
        id: user.tenant.id,
        ac_id: user.tenant.acId,
        name: user.tenant.name,
        shop_name: user.tenant.shopName,
        division: user.tenant.division,
      },
    });
  } catch (error) {
    console.error('[Auth/AcceptInvite]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to accept invitation' }, 500);
  }
}
