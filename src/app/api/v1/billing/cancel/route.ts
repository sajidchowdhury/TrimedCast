// ============================================
// POST /api/v1/billing/cancel
// Cancel the current subscription
// ============================================

import { db } from '@/lib/db';
import {
  apiSuccess,
  unauthorizedError,
  notFoundError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { cancelSubscription } from '@/lib/api/billing';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


export async function POST() {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Fetch subscription for tenant
    const subscription = await db.subscription.findUnique({
      where: { tenantId: context.tenantId },
    });

    // 3. Not found
    if (!subscription) {
      return notFoundError('Subscription');
    }

    const previousTier = subscription.tier;
    const previousStatus = subscription.status;

    // 4. Cancel subscription
    await cancelSubscription(subscription.id);

    // 5. Create audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'status_change',
      entity: 'subscription',
      entityId: subscription.id,
      changes: {
        before: { status: previousStatus, tier: previousTier },
        after: { status: 'cancelled' },
      },
      metadata: {
        type: 'subscription_cancelled',
        tier: previousTier,
      },
    });

    // 6. Fetch updated subscription to get endsAt
    const updatedSubscription = await db.subscription.findUnique({
      where: { id: subscription.id },
    });

    return apiSuccess({
      subscription: {
        id: subscription.id,
        status: 'cancelled',
        tier: previousTier,
        cancelled_at: updatedSubscription!.cancelledAt,
        ends_at: updatedSubscription!.endsAt,
      },
      message: 'Subscription cancelled. Access continues until end of billing period.',
    });
  } catch (error) {
    console.error('[Billing/Cancel]', error);
    return internalError('Failed to cancel subscription');
  }
}
