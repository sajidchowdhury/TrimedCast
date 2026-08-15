// ============================================
// PUT /api/v1/tenants/{id}/reactivate
// Reactivate a suspended tenant (executive role required)
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, unauthorizedError, forbiddenError, notFoundError, internalError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { reactivateTenant } from '@/lib/api/billing';
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
      return forbiddenError('Only executive role can reactivate tenants');
    }

    // Verify tenant exists and is suspended
    const tenant = await db.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return notFoundError('Tenant');
    }

    if (tenant.status !== 'suspended') {
      return apiSuccess({
        id,
        status: tenant.status,
        message: 'Tenant is not suspended — no action taken',
      });
    }

    const previousStatus = tenant.status;

    // 2. Reactivate tenant
    await reactivateTenant(id);

    // 3. Audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'status_change',
      entity: 'tenant',
      entityId: id,
      changes: {
        before: { status: previousStatus },
        after: { status: 'active' },
      },
      metadata: { action: 'reactivate' },
    });

    return apiSuccess({
      id,
      status: 'active',
      reactivatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Tenants/[id]/reactivate]', error);
    return internalError('Failed to reactivate tenant');
  }
}
