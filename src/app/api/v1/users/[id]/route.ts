// ============================================
// PUT /api/v1/users/[id]
// Admin updates a team member (name, phone, role)
// Admin only, tenant-scoped
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  validationError,
} from '@/lib/api/response';
import { getAuthContext, canDo } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
import { validatePhone, normalizePhone } from '@/lib/auth/password';
import { revokeAllUserSessions } from '@/lib/auth/session-store';
export const runtime = 'nodejs';


const VALID_ROLES = [
  'admin',
  'warehouse_manager',
  'sales_manager',
  'marketing_manager',
  'finance',
  'executive',
  'viewer',
];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // Admin only (users.manage permission)
    if (!canDo(context, 'users.manage')) {
      return forbiddenError();
    }

    // Can't edit own account through this endpoint
    if (id === context.userId) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'Use /auth/profile to update your own account' },
        400
      );
    }

    const body = await request.json();
    const { name, phone, role } = body;

    // At least one field must be provided
    if (name === undefined && phone === undefined && role === undefined) {
      return validationError('body', 'At least one of name, phone, or role is required');
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return validationError('name', 'Name must be at least 2 characters');
      }
    }

    // Validate phone if provided
    if (phone !== undefined && phone !== null && phone !== '') {
      if (!validatePhone(phone)) {
        return validationError('phone', 'Invalid BD phone number format');
      }
    }

    // Validate role if provided
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return validationError('role', `Role must be one of: ${VALID_ROLES.join(', ')}`);
      }
    }

    // Find user within tenant scope
    const existing = await db.user.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!existing) {
      return notFoundError('User');
    }

    // Build update data
    const updateData: { name?: string; phone?: string | null; role?: string } = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone && phone !== '' ? normalizePhone(phone) : null;
    if (role !== undefined) updateData.role = role;

    // Update user
    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Audit log
    const changes: { before: Record<string, unknown>; after: Record<string, unknown> } = {
      before: {},
      after: {},
    };
    if (name !== undefined) {
      changes.before.name = existing.name;
      changes.after.name = user.name;
    }
    if (phone !== undefined) {
      changes.before.phone = existing.phone;
      changes.after.phone = user.phone;
    }
    if (role !== undefined) {
      changes.before.role = existing.role;
      changes.after.role = user.role;
    }

    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'user',
      entityId: id,
      changes,
      metadata: { action: 'admin_update_member' },
    });

    return apiSuccess({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_active: user.isActive,
      updated_at: user.updatedAt,
    });
  } catch (error) {
    console.error('[Users/[id]/PUT]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update user' }, 500);
  }
}

// ============================================
// DELETE /api/v1/users/[id]
// Remove user from team
// Admin only, tenant-scoped
// Can't delete self
// Revokes all sessions first
// Soft delete (isActive=false) if user has audit logs, hard delete otherwise
// ============================================

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

    // Admin only
    if (!canDo(context, 'users.manage')) {
      return forbiddenError();
    }

    // Can't delete self
    if (id === context.userId) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'You cannot delete your own account' },
        400
      );
    }

    // Find user within tenant scope
    const user = await db.user.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!user) {
      return notFoundError('User');
    }

    // Check if user has audit logs
    const auditLogCount = await db.auditLog.count({
      where: { userId: id },
    });

    // Audit log BEFORE deletion (so the user ID is still valid)
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'delete',
      entity: 'user',
      entityId: id,
      changes: {
        before: {
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.isActive,
        },
      },
      metadata: {
        action: 'remove_from_team',
        deletion_type: auditLogCount > 0 ? 'soft' : 'hard',
      },
    });

    // Revoke all sessions first
    const revokedSessions = await revokeAllUserSessions(id);

    if (auditLogCount > 0) {
      // Soft delete: user has audit trail, keep record but deactivate
      await db.user.update({
        where: { id },
        data: { isActive: false },
      });

      return apiSuccess({
        message: 'User removed from team (deactivated — has audit history)',
        user_id: id,
        deletion_type: 'soft',
        sessions_revoked: revokedSessions,
      });
    } else {
      // Hard delete: no audit trail, safe to remove completely
      await db.user.delete({
        where: { id },
      });

      return apiSuccess({
        message: 'User permanently deleted',
        user_id: id,
        deletion_type: 'hard',
        sessions_revoked: revokedSessions,
      });
    }
  } catch (error) {
    console.error('[Users/[id]/DELETE]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete user' }, 500);
  }
}
