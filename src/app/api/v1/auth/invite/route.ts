// ============================================
// POST /api/v1/auth/invite
// Admin invites a team member via email
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, unauthorizedError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { validateEmail, validatePhone } from '@/lib/auth/password';
import { hashPassword } from '@/lib/auth/password';
import { createAuditLog } from '@/lib/api/audit';

const VALID_ROLES = ['admin', 'warehouse_manager', 'sales_manager', 'marketing_manager', 'finance', 'executive', 'viewer'];
const MAX_TEAM_MEMBERS = 5; // Pro plan limit

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // Only admins can invite
    if (context.role !== 'admin') {
      return apiError({ code: 'FORBIDDEN', message: 'Only admins can invite team members' }, 403);
    }

    const body = await request.json();
    const { email, name, role, phone } = body;

    // Validate
    const errors: { code: string; message: string; field: string }[] = [];
    if (!email || !validateEmail(email)) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'Valid email is required', field: 'email' });
    }
    if (!name || name.trim().length < 2) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'Name is required (min 2 characters)', field: 'name' });
    }
    if (!role || !VALID_ROLES.includes(role)) {
      errors.push({ code: 'VALIDATION_ERROR', message: `Role must be one of: ${VALID_ROLES.join(', ')}`, field: 'role' });
    }
    if (phone && !validatePhone(phone)) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'Invalid BD phone number', field: 'phone' });
    }

    if (errors.length > 0) {
      return apiError(errors, 400);
    }

    // Check team member limit
    const memberCount = await db.user.count({
      where: { tenantId: context.tenantId, isActive: true },
    });

    if (memberCount >= MAX_TEAM_MEMBERS) {
      return apiError({
        code: 'LIMIT_EXCEEDED',
        message: `Maximum ${MAX_TEAM_MEMBERS} team members reached. Upgrade your plan for more.`,
      }, 403);
    }

    // Check if email already exists in this tenant
    const existing = await db.user.findFirst({
      where: { email, tenantId: context.tenantId },
    });

    if (existing) {
      return apiError({
        code: 'CONFLICT',
        message: existing.isActive
          ? 'This email is already a team member'
          : 'This email was previously a team member (deactivated)',
        field: 'email',
      }, 409);
    }

    // Generate invite token
    const inviteBytes = new Uint8Array(32);
    crypto.getRandomValues(inviteBytes);
    const inviteToken = Array.from(inviteBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create user with invite token (no password yet — they set it on accept)
    const user = await db.user.create({
      data: {
        email,
        name,
        phone: phone || null,
        role,
        tenantId: context.tenantId,
        passwordHash: '', // Will be set when they accept invite
        isActive: false, // Not active until they accept
        inviteToken,
        inviteExpiresAt,
        invitedBy: context.userId,
      },
    });

    // TODO: Send invite email with accept-invite link (Session 3: Email Service)
    // Email content: "You've been invited to join [Shop Name] on TrimedCast. 
    // Click here to accept: https://trimedcast.com/accept-invite?token=xxx"
    const isDev = process.env.NODE_ENV === 'development';

    // Audit
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'create',
      entity: 'user',
      entityId: user.id,
      metadata: { action: 'invite', email, role, name },
    });

    return apiSuccess({
      message: 'Invitation sent successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.isActive,
      },
      // In development, include invite token for testing
      ...(isDev ? { _dev_invite_token: inviteToken } : {}),
    }, undefined, 201);
  } catch (error) {
    console.error('[Auth/Invite]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Invitation failed' }, 500);
  }
}
