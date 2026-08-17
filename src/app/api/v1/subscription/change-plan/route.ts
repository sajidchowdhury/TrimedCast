// ============================================
// POST /api/v1/subscription/change-plan
// Change subscription plan (upgrade or downgrade) - works in demo mode
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  validationError,
  notFoundError,
  conflictError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';

// BDT Tier Pricing
const TIER_PRICING: Record<string, Record<string, number>> = {
  starter: { monthly: 2400, yearly: 28800 },
  professional: { monthly: 6900, yearly: 82800 },
  enterprise: { monthly: 17400, yearly: 208800 },
};

const VALID_TIERS = ['starter', 'professional', 'enterprise'] as const;
const VALID_CYCLES = ['monthly', 'yearly'] as const;
type Tier = (typeof VALID_TIERS)[number];
type BillingCycle = (typeof VALID_CYCLES)[number];

const TIER_ORDER: Record<Tier, number> = { starter: 0, professional: 1, enterprise: 2 };

interface ChangePlanBody {
  tier: string;
  billingCycle?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate body
    let body: ChangePlanBody;
    try {
      body = await request.json();
    } catch {
      return validationError('body', 'Invalid JSON body');
    }

    const { tier, billingCycle } = body;

    if (!tier) return validationError('tier', 'Tier is required');
    if (!VALID_TIERS.includes(tier as Tier)) {
      return validationError('tier', 'Invalid tier. Must be one of: starter, professional, enterprise');
    }
    if (billingCycle && !VALID_CYCLES.includes(billingCycle as BillingCycle)) {
      return validationError('billingCycle', 'Invalid billing cycle. Must be one of: monthly, yearly');
    }

    const newTier = tier as Tier;
    const newCycle = (billingCycle as BillingCycle) || 'monthly';
    const newUnitAmount = TIER_PRICING[newTier][newCycle];

    // 2. Try auth
    const ctx = await getAuthContext();

    if (!ctx.isAuthenticated) {
      // Demo mode
      const now = new Date();
      const periodEnd = new Date(now);
      if (newCycle === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      return apiSuccess({
        subscription: {
          id: 'demo-sub-001',
          tier: newTier,
          status: 'active',
          billingCycle: newCycle,
          unitAmount: newUnitAmount,
          currency: 'BDT',
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          nextPaymentAt: periodEnd.toISOString(),
          updatedAt: now.toISOString(),
        },
        change: {
          type: 'plan_change',
          toTier: newTier,
          toCycle: newCycle,
          toAmount: newUnitAmount,
          effectiveImmediately: true,
          effectiveAt: now.toISOString(),
        },
        message: `Plan changed to ${newTier} (${newCycle}) immediately.`,
        isDemo: true,
      });
    }

    // 3. Fetch current subscription
    const subscription = await db.subscription.findUnique({
      where: { tenantId: ctx.tenantId },
    });

    if (!subscription) return notFoundError('Subscription');

    if (subscription.status !== 'active' && subscription.status !== 'trial') {
      return conflictError(`Cannot change plan for subscription in '${subscription.status}' status.`);
    }

    const currentTier = subscription.tier as Tier;

    if (currentTier === newTier && subscription.billingCycle === newCycle) {
      return validationError('tier', 'New tier and billing cycle are the same as current');
    }

    // 4. Determine upgrade or downgrade
    const isUpgrade = TIER_ORDER[newTier] > TIER_ORDER[currentTier];
    const isDowngrade = TIER_ORDER[newTier] < TIER_ORDER[currentTier];
    const changeType = isUpgrade ? 'upgrade' : isDowngrade ? 'downgrade' : 'cycle_change';

    // 5. Update subscription
    const now = new Date();
    const updateData: Record<string, unknown> = {
      tier: newTier,
      unitAmount: newUnitAmount,
      billingCycle: newCycle,
    };

    if (isDowngrade && subscription.currentPeriodEnd) {
      updateData.metadata = JSON.stringify({
        pendingTierChange: {
          fromTier: currentTier,
          toTier: newTier,
          fromCycle: subscription.billingCycle,
          toCycle: newCycle,
          effectiveAt: subscription.currentPeriodEnd.toISOString(),
        },
      });
      updateData.tier = currentTier;
      updateData.unitAmount = subscription.unitAmount;
      updateData.billingCycle = subscription.billingCycle;
    } else {
      updateData.currentPeriodStart = now;
      const end = new Date(now);
      if (newCycle === 'monthly') end.setMonth(end.getMonth() + 1);
      else end.setFullYear(end.getFullYear() + 1);
      updateData.currentPeriodEnd = end;
      updateData.nextPaymentAt = end;
    }

    const updatedSubscription = await db.subscription.update({
      where: { id: subscription.id },
      data: updateData,
    });

    // 6. Update tenant plan (for immediate changes)
    if (!isDowngrade) {
      await db.tenant.update({
        where: { id: ctx.tenantId },
        data: { plan: newTier },
      });
    }

    // 7. Record SubscriptionEvent
    await db.subscriptionEvent.create({
      data: {
        tenantId: ctx.tenantId,
        subscriptionId: subscription.id,
        eventType: 'plan_changed',
        fromStatus: subscription.status,
        toStatus: updatedSubscription.status,
        fromTier: currentTier,
        toTier: newTier,
        metadata: JSON.stringify({
          changeType,
          fromCycle: subscription.billingCycle,
          toCycle: newCycle,
          fromAmount: subscription.unitAmount,
          toAmount: newUnitAmount,
          effectiveImmediately: !isDowngrade,
          effectiveAt: isDowngrade ? subscription.currentPeriodEnd?.toISOString() : now.toISOString(),
        }),
        performedBy: ctx.userId,
      },
    });

    // 8. Return updated subscription
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
        nextPaymentAt: updatedSubscription.nextPaymentAt?.toISOString() ?? null,
        updatedAt: updatedSubscription.updatedAt.toISOString(),
      },
      change: {
        type: changeType,
        fromTier: currentTier,
        toTier: newTier,
        fromCycle: subscription.billingCycle,
        toCycle: newCycle,
        fromAmount: subscription.unitAmount,
        toAmount: newUnitAmount,
        effectiveImmediately: !isDowngrade,
        effectiveAt: isDowngrade ? subscription.currentPeriodEnd?.toISOString() ?? null : now.toISOString(),
      },
      message: isDowngrade
        ? `Downgrade to ${newTier} will take effect at the end of your current billing period.`
        : `Plan changed to ${newTier} (${newCycle}) immediately.`,
    });
  } catch (error) {
    console.error('[Subscription/ChangePlan/POST]', error);
    return internalError('Failed to change subscription plan');
  }
}
