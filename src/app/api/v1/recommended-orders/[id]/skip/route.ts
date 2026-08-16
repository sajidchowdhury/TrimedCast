// ============================================
// POST /api/v1/recommended-orders/{id}/skip
// Skip a recommended order with reason
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, notFoundError, forbiddenError, apiError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'recommended_orders.crud')) {
      return forbiddenError();
    }

    const recommendedOrder = await db.recommendedOrder.findFirst({
      where: { id, tenantId, status: 'pending' },
    });

    if (!recommendedOrder) {
      return notFoundError('Pending recommended order');
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'reason is required when skipping a recommendation', field: 'reason' }, 400);
    }

    // Mark as skipped
    await db.recommendedOrder.update({
      where: { id },
      data: {
        status: 'skipped',
        justification: reason,
      },
    });

    await createAuditLog({
      tenantId,
      userId: context.userId || undefined,
      action: 'reject',
      entity: 'recommended_order',
      entityId: id,
      metadata: { reason },
    });

    return apiSuccess({
      id,
      status: 'skipped',
      reason,
      message: 'Recommended order skipped',
    });
  } catch (error) {
    console.error('[RecommendedOrders/[id]/skip]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to skip recommended order' }, 500);
  }
}
