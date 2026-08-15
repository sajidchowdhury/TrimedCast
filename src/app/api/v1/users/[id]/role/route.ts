// ============================================
// PUT /api/v1/users/{id}/role - Update user role
// RBAC: warehouse_manager only
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, notFoundError, forbiddenError, unauthorizedError, validationError, tenantIsolationError } from '@/lib/api/response';
import { getAuthContext, canDo } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

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
    const tenantId = context.tenantId;

    // RBAC: warehouse_manager only (users.manage)
    if (!canDo(context, 'users.manage')) {
      return forbiddenError();
    }

    const body = await request.json();
    const { role } = body;

    if (!role) return validationError('role', 'role is required');

    // Validate role
    const validRoles = ['warehouse_manager', 'sales_manager', 'marketing_manager', 'finance', 'executive'];
    if (!validRoles.includes(role)) {
      return validationError('role', `role must be one of: ${validRoles.join(', ')}`);
    }

    // Find user within tenant scope
    const existing = await db.user.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('User');

    // Prevent changing own role (warehouse_manager shouldn't demote themselves)
    if (existing.id === context.userId) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'Cannot change your own role' }, 400);
    }

    const beforeRole = existing.role;
    const user = await db.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'user',
      entityId: id,
      changes: { before: { role: beforeRole }, after: { role } },
    });

    return apiSuccess({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.isActive,
    });
  } catch (error) {
    console.error('[Users/[id]/role/PUT]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update user role' }, 500);
  }
}
