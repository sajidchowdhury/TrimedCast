// ============================================
// POST /api/v1/billing/subscription/activate
// Activate a trial subscription (trial → active)
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

    if (!subscription) {
      return notFoundError('Subscription');
    }

    // 3. Validate subscription is in 'trial' status
    if (subscription.status !== 'trial') {
      return conflictError(
        `Cannot activate subscription in '${subscription.status}' status. Only trial subscriptions can be activated.`
      );
    }

    // 4. Execute transition
    const result = await subscriptionTransition(subscription.id, 'activate');

    if (!result.success) {
      return conflictError(result.error || 'Transition failed');
    }

    // 5. Fetch updated subscription
    const updatedSubscription = await db.subscription.findUnique({
      where: { id: subscription.id },
    });

    const tierDef = getTierDefinition(updatedSubscription!.tier);

    // 6. Audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'status_change',
      entity: 'subscription',
      entityId: subscription.id,
      changes: {
        before: { status: 'trial' },
        after: { status: 'active' },
      },
      metadata: {
        type: 'subscription_activated',
        from: 'trial',
        to: 'active',
      },
    });

    // 7. Return updated subscription
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
        updated_at: updatedSubscription!.updatedAt,
      },
      tier_definition: tierDef,
    });
  } catch (error) {
    console.error('[Billing/Subscription/Activate]', error);
    return internalError('Failed to activate subscription');
  }
}
