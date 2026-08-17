// ============================================
// GET  /api/v1/billing/subscription  — Get current subscription
// PUT  /api/v1/billing/subscription  — Update subscription tier
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  validationError,
  unauthorizedError,
  notFoundError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import {
  TIERS,
  TierSlug,
  getTierDefinition,
} from '@/lib/api/billing';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


const VALID_TIERS: TierSlug[] = ['starter', 'professional', 'enterprise'];

// --- GET: Fetch current subscription ---
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

    // 3. Not found
    if (!subscription) {
      return notFoundError('Subscription');
    }

    // 4. Return with tier definition
    const tierDef = getTierDefinition(subscription.tier);

    return apiSuccess({
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        unit_amount_cents: subscription.unitAmountCents,
        currency: subscription.currency,
        stripe_price_id: subscription.stripePriceId,
        current_period_start: subscription.currentPeriodStart,
        current_period_end: subscription.currentPeriodEnd,
        trial_ends_at: subscription.trialEndsAt,
        cancelled_at: subscription.cancelledAt,
        ends_at: subscription.endsAt,
        last_payment_at: subscription.lastPaymentAt,
        next_payment_at: subscription.nextPaymentAt,
        payment_fail_count: subscription.paymentFailCount,
        grace_period_end: subscription.gracePeriodEnd,
        created_at: subscription.createdAt,
        updated_at: subscription.updatedAt,
      },
      tier_definition: tierDef,
    });
  } catch (error) {
    console.error('[Billing/Subscription/GET]', error);
    return internalError('Failed to fetch subscription');
  }
}

// --- PUT: Update subscription tier (upgrade/downgrade) ---
export async function PUT(request: NextRequest) {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Validate input
    const body = await request.json();
    const { tier } = body as { tier?: string };

    if (!tier) {
      return validationError('tier', 'Tier is required');
    }

    if (!VALID_TIERS.includes(tier as TierSlug)) {
      return validationError(
        'tier',
        'Invalid tier. Must be one of: starter, professional, enterprise'
      );
    }

    const tierSlug = tier as TierSlug;
    const tierDef = TIERS[tierSlug];

    // 3. Fetch current subscription
    const subscription = await db.subscription.findUnique({
      where: { tenantId: context.tenantId },
    });

    if (!subscription) {
      return notFoundError('Subscription');
    }

    const oldTier = subscription.tier as TierSlug;

    // 4. Update subscription tier
    const updatedSubscription = await db.subscription.update({
      where: { id: subscription.id },
      data: {
        tier: tierSlug,
        unitAmountCents: tierDef.priceCents,
        stripePriceId: tierDef.stripePriceId,
      },
    });

    // 5. Update tenant plan field
    await db.tenant.update({
      where: { id: context.tenantId },
      data: { plan: tierSlug },
    });

    // 6. Create audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'subscription',
      entityId: subscription.id,
      changes: {
        before: { tier: oldTier },
        after: { tier: tierSlug },
      },
      metadata: {
        type: 'tier_change',
        from: oldTier,
        to: tierSlug,
      },
    });

    // 7. Return updated subscription
    return apiSuccess({
      subscription: {
        id: updatedSubscription.id,
        tier: updatedSubscription.tier,
        status: updatedSubscription.status,
        unit_amount_cents: updatedSubscription.unitAmountCents,
        currency: updatedSubscription.currency,
        stripe_price_id: updatedSubscription.stripePriceId,
        current_period_start: updatedSubscription.currentPeriodStart,
        current_period_end: updatedSubscription.currentPeriodEnd,
        trial_ends_at: updatedSubscription.trialEndsAt,
        updated_at: updatedSubscription.updatedAt,
      },
      tier_definition: tierDef,
      previous_tier: oldTier,
    });
  } catch (error) {
    console.error('[Billing/Subscription/PUT]', error);
    return internalError('Failed to update subscription');
  }
}
