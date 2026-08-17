// ============================================
// GET /api/v1/billing/subscription/lifecycle
// Get subscription lifecycle state and valid transitions
// ============================================

import { db } from '@/lib/db';
import {
  apiSuccess,
  unauthorizedError,
  notFoundError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { getValidTransitions, getTierDefinition } from '@/lib/api/billing';
export const runtime = 'nodejs';


export async function GET() {
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

    // 3. Get valid transitions for current status
    const validTransitions = getValidTransitions(subscription.status);

    // 4. Build timeline info
    const tierDef = getTierDefinition(subscription.tier);

    const timeline = {
      created_at: subscription.createdAt,
      current_period_start: subscription.currentPeriodStart,
      current_period_end: subscription.currentPeriodEnd,
      trial_ends_at: subscription.trialEndsAt,
      cancelled_at: subscription.cancelledAt,
      ends_at: subscription.endsAt,
      last_payment_at: subscription.lastPaymentAt,
      next_payment_at: subscription.nextPaymentAt,
      grace_period_end: subscription.gracePeriodEnd,
    };

    // 5. Return lifecycle state
    return apiSuccess({
      status: subscription.status,
      tier: subscription.tier,
      valid_transitions: validTransitions,
      timeline,
      tier_definition: tierDef,
    });
  } catch (error) {
    console.error('[Billing/Subscription/Lifecycle]', error);
    return internalError('Failed to fetch subscription lifecycle');
  }
}
