// ============================================
// PUT /api/v1/tenants/{id}/suspend
// Suspend a tenant (executive role required)
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, validationError, unauthorizedError, forbiddenError, notFoundError, internalError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { suspendTenant } from '@/lib/api/billing';
import { createAuditLog } from '@/lib/api/audit';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Require auth + executive role
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    if (context.role !== 'executive') {
      return forbiddenError('Only executive role can suspend tenants');
    }

    // 2. Validate request body
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return validationError('reason', 'reason is required when suspending a tenant');
    }

    // Verify tenant exists
    const tenant = await db.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return notFoundError('Tenant');
    }

    // Prevent self-suspension
    if (tenant.id === context.tenantId) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'Cannot suspend your own tenant' }, 400);
    }

    const previousStatus = tenant.status;

    // 3. Suspend tenant
    await suspendTenant(id, reason);

    // 4. Audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'status_change',
      entity: 'tenant',
      entityId: id,
      changes: {
        before: { status: previousStatus },
        after: { status: 'suspended' },
      },
      metadata: { reason },
    });

    return apiSuccess({
      id,
      status: 'suspended',
      reason,
      suspendedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Tenants/[id]/suspend]', error);
    return internalError('Failed to suspend tenant');
  }
}
