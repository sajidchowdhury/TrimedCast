// ============================================
// POST /api/v1/admin/tenants/[id]/override-tier
// Override subscription tier for a tenant
// Session 16: Scaling + Production Hardening
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/api/audit';

const VALID_TIERS = ['starter', 'professional', 'enterprise'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required to override tier');
    }

    const { id: tenantId } = await params;
    const body = await request.json();
    const { tier, reason } = body;

    if (!tier || !VALID_TIERS.includes(tier)) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: `Tier must be one of: ${VALID_TIERS.join(', ')}` },
        400
      );
    }

    if (!reason || typeof reason !== 'string') {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'Reason is required for tier override' },
        400
      );
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });

    if (!tenant) {
      return notFoundError('Tenant');
    }

    const previousTier = tenant.subscription?.tier || tenant.plan;

    // Update tenant plan
    await db.tenant.update({
      where: { id: tenantId },
      data: { plan: tier },
    });

    // Update subscription if exists
    if (tenant.subscription) {
      await db.subscription.update({
        where: { id: tenant.subscription.id },
        data: { tier },
      });
    }

    // Audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'subscription',
      entityId: tenantId,
      changes: {
        before: { tier: previousTier },
        after: { tier },
      },
      metadata: { reason, overrideBy: context.userId },
    });

    return apiSuccess({
      message: 'Tier overridden successfully',
      tenantId,
      previousTier,
      newTier: tier,
      reason,
    });
  } catch (error) {
    console.error('[Admin/Tenants/OverrideTier/POST]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to override tier' },
      500
    );
  }
}
