// ============================================
// POST /api/v1/subscription/resume
// Resume a cancelled subscription - works in demo mode
// ============================================

import { db } from '@/lib/db';
import {
  apiSuccess,
  notFoundError,
  conflictError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
export const runtime = 'nodejs';


export async function POST() {
  try {
    // 1. Try auth
    const ctx = await getAuthContext();

    if (!ctx.isAuthenticated) {
      // Demo mode
      const now = new Date();
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      return apiSuccess({
        subscription: {
          id: 'demo-sub-001',
          tier: 'professional',
          status: 'active',
          billingCycle: 'monthly',
          unitAmount: 6900,
          currency: 'BDT',
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          autoRenew: true,
          lastPaymentAt: now.toISOString(),
          nextPaymentAt: periodEnd.toISOString(),
        },
        message: 'Subscription has been resumed successfully. Auto-renewal is enabled.',
        isDemo: true,
      });
    }

    // 2. Fetch current subscription
    const subscription = await db.subscription.findUnique({
      where: { tenantId: ctx.tenantId },
    });

    if (!subscription) {
      return notFoundError('Subscription');
    }

    if (subscription.status !== 'cancelled') {
      return conflictError(
        `Cannot resume subscription in '${subscription.status}' status. Only cancelled subscriptions can be resumed.`
      );
    }

    if (subscription.endsAt && new Date() > subscription.endsAt) {
      return conflictError(
        'Cannot resume — subscription period has already ended. Please start a new subscription instead.'
      );
    }

    // 3. Resume subscription
    const now = new Date();
    const updatedSubscription = await db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'active',
        cancelledAt: null,
        endsAt: null,
        autoRenew: true,
        cancellationReason: null,
        cancellationFeedback: null,
      },
    });

    // 4. Update tenant status
    await db.tenant.update({
      where: { id: ctx.tenantId },
      data: { status: 'active', cancelledAt: null },
    });

    // 5. Record SubscriptionEvent
    await db.subscriptionEvent.create({
      data: {
        tenantId: ctx.tenantId,
        subscriptionId: subscription.id,
        eventType: 'resumed',
        fromStatus: 'cancelled',
        toStatus: 'active',
        fromTier: subscription.tier,
        toTier: subscription.tier,
        metadata: JSON.stringify({
          previousCancelledAt: subscription.cancelledAt?.toISOString(),
          resumptionReason: 'user_request',
        }),
        performedBy: ctx.userId,
      },
    });

    // 6. Return resumed subscription
    return apiSuccess({
      subscription: {
        id: updatedSubscription.id,
        tier: updatedSubscription.tier,
        status: updatedSubscription.status,
        billingCycle: updatedSubscription.billingCycle,
        unitAmount: updatedSubscription.unitAmount,
        currency: updatedSubscription.currency,
        currentPeriodStart: updatedSubscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd?.toISOString() ?? null,
        autoRenew: updatedSubscription.autoRenew,
        lastPaymentAt: updatedSubscription.lastPaymentAt?.toISOString() ?? null,
        nextPaymentAt: updatedSubscription.nextPaymentAt?.toISOString() ?? null,
        updatedAt: updatedSubscription.updatedAt.toISOString(),
      },
      message: 'Subscription has been resumed successfully. Auto-renewal is enabled.',
    });
  } catch (error) {
    console.error('[Subscription/Resume/POST]', error);
    return internalError('Failed to resume subscription');
  }
}
