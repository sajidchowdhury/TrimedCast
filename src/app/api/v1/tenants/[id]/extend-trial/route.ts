// ============================================
// PUT /api/v1/tenants/{id}/extend-trial
// Extend a tenant's trial period (executive role required)
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, validationError, unauthorizedError, forbiddenError, notFoundError, internalError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
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
      return forbiddenError('Only executive role can extend trial periods');
    }

    // 2. Validate request body
    const body = await request.json();
    const { days, reason } = body;

    const errors: Array<{ code: string; message: string; field: string }> = [];

    if (days === undefined || days === null) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'days is required', field: 'days' });
    } else if (!Number.isInteger(days) || days < 1 || days > 30) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'days must be an integer between 1 and 30', field: 'days' });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'reason is required when extending a trial', field: 'reason' });
    }

    if (errors.length > 0) {
      return apiError(errors, 400);
    }

    // Verify tenant exists and is in trial
    const tenant = await db.tenant.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!tenant) {
      return notFoundError('Tenant');
    }

    if (tenant.status !== 'trial') {
      return apiError(
        { code: 'VALIDATION_ERROR', message: `Cannot extend trial: tenant status is '${tenant.status}', not 'trial'` },
        400
      );
    }

    // 3. Calculate new trial end date
    const currentTrialEnd = tenant.trialEndsAt ?? new Date();
    const newTrialEndsAt = new Date(currentTrialEnd.getTime() + days * 24 * 60 * 60 * 1000);

    // 4. Update tenant trialEndsAt
    await db.tenant.update({
      where: { id },
      data: { trialEndsAt: newTrialEndsAt },
    });

    // 5. Update subscription trialEndsAt if it exists
    if (tenant.subscription) {
      await db.subscription.update({
        where: { id: tenant.subscription.id },
        data: {
          trialEndsAt: newTrialEndsAt,
          nextPaymentAt: newTrialEndsAt,
        },
      });
    }

    // 6. Audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'tenant',
      entityId: id,
      changes: {
        before: { trialEndsAt: currentTrialEnd.toISOString() },
        after: { trialEndsAt: newTrialEndsAt.toISOString() },
      },
      metadata: { days, reason, action: 'extend_trial' },
    });

    return apiSuccess({
      id,
      trialEndsAt: newTrialEndsAt.toISOString(),
      daysExtended: days,
    });
  } catch (error) {
    console.error('[Tenants/[id]/extend-trial]', error);
    return internalError('Failed to extend trial period');
  }
}
