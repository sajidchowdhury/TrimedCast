// ============================================
// POST /api/v1/billing/subscription/resume
// Resume a cancelled subscription (cancelled → active)
// ============================================

import { db } from '@/lib/db';
import {
  apiSuccess,
  unauthorizedError,
  notFoundError,
  conflictError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { subscriptionTransition, getTierDefinition } from '@/lib/api/billing';
import { createAuditLog } from '@/lib/api/audit';

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

    if (!subscription) {
      return notFoundError('Subscription');
    }

    // 3. Validate subscription is in 'cancelled' status
    if (subscription.status !== 'cancelled') {
      return conflictError(
        `Cannot resume subscription in '${subscription.status}' status. Only cancelled subscriptions can be resumed.`
      );
    }

    // 4. Validate subscription period has not ended
    if (subscription.endsAt && new Date() > subscription.endsAt) {
      return conflictError(
        'Cannot resume — subscription period has already ended'
      );
    }

    // 5. Execute transition
    const result = await subscriptionTransition(subscription.id, 'resume');

    if (!result.success) {
      return conflictError(result.error || 'Transition failed');
    }

    // 6. Fetch updated subscription
    const updatedSubscription = await db.subscription.findUnique({
      where: { id: subscription.id },
    });

    const tierDef = getTierDefinition(updatedSubscription!.tier);

    // 7. Audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'status_change',
      entity: 'subscription',
      entityId: subscription.id,
      changes: {
        before: { status: 'cancelled' },
        after: { status: 'active' },
      },
      metadata: {
        type: 'subscription_resumed',
        from: 'cancelled',
        to: 'active',
      },
    });

    // 8. Return updated subscription
    return apiSuccess({
      transition: result,
      subscription: {
        id: updatedSubscription!.id,
        tier: updatedSubscription!.tier,
        status: updatedSubscription!.status,
        unit_amount_cents: updatedSubscription!.unitAmountCents,
        currency: updatedSubscription!.currency,
        current_period_start: updatedSubscription!.currentPeriodStart,
        current_period_end: updatedSubscription!.currentPeriodEnd,
        last_payment_at: updatedSubscription!.lastPaymentAt,
        next_payment_at: updatedSubscription!.nextPaymentAt,
        cancelled_at: updatedSubscription!.cancelledAt,
        ends_at: updatedSubscription!.endsAt,
        updated_at: updatedSubscription!.updatedAt,
      },
      tier_definition: tierDef,
    });
  } catch (error) {
    console.error('[Billing/Subscription/Resume]', error);
    return internalError('Failed to resume subscription');
  }
}
