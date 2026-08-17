// ============================================
// POST /api/v1/billing/subscribe
// Subscribe a tenant to a plan (or upgrade/downgrade)
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiCreated,
  validationError,
  unauthorizedError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import {
  TIERS,
  TierSlug,
  createSubscription,
  getTierDefinition,
} from '@/lib/api/billing';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


const VALID_TIERS: TierSlug[] = ['starter', 'professional', 'enterprise'];

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Validate input
    const body = await request.json();
    const { tier, payment_method_id } = body as {
      tier?: string;
      payment_method_id?: string;
    };

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

    // 3. Check if tenant already has a subscription
    const existingSubscription = await db.subscription.findUnique({
      where: { tenantId: context.tenantId },
    });

    if (existingSubscription) {
      // 4. Update existing subscription (upgrade/downgrade)
      const oldTier = existingSubscription.tier as TierSlug;

      const updatedSubscription = await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          tier: tierSlug,
          unitAmountCents: tierDef.priceCents,
          stripePriceId: tierDef.stripePriceId,
        },
      });

      // Update tenant plan field
      await db.tenant.update({
        where: { id: context.tenantId },
        data: { plan: tierSlug },
      });

      // Create audit log
      await createAuditLog({
        tenantId: context.tenantId,
        userId: context.userId,
        action: 'update',
        entity: 'subscription',
        entityId: existingSubscription.id,
        changes: {
          before: { tier: oldTier },
          after: { tier: tierSlug },
        },
        metadata: {
          type: 'tier_change',
          from: oldTier,
          to: tierSlug,
          payment_method_id: payment_method_id || null,
        },
      });

      return apiSuccess({
        subscription: {
          id: updatedSubscription.id,
          tier: updatedSubscription.tier,
          status: updatedSubscription.status,
          unit_amount_cents: updatedSubscription.unitAmountCents,
          currency: updatedSubscription.currency,
          current_period_start: updatedSubscription.currentPeriodStart,
          current_period_end: updatedSubscription.currentPeriodEnd,
          trial_ends_at: updatedSubscription.trialEndsAt,
          updated_at: updatedSubscription.updatedAt,
        },
        tier_definition: tierDef,
        action: 'tier_changed',
        previous_tier: oldTier,
      });
    }

    // 5. Create new subscription
    const result = await createSubscription(context.tenantId, tierSlug);

    // Create audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'create',
      entity: 'subscription',
      entityId: result.subscriptionId,
      metadata: {
        type: 'new_subscription',
        tier: tierSlug,
        trial_ends_at: result.trialEndsAt,
        payment_method_id: payment_method_id || null,
      },
    });

    // 6. Fetch the newly created subscription for response
    const subscription = await db.subscription.findUnique({
      where: { id: result.subscriptionId },
    });

    return apiCreated({
      subscription: {
        id: subscription!.id,
        tier: subscription!.tier,
        status: subscription!.status,
        unit_amount_cents: subscription!.unitAmountCents,
        currency: subscription!.currency,
        current_period_start: subscription!.currentPeriodStart,
        current_period_end: subscription!.currentPeriodEnd,
        trial_ends_at: subscription!.trialEndsAt,
        created_at: subscription!.createdAt,
      },
      tier_definition: tierDef,
      action: 'subscribed',
    });
  } catch (error) {
    console.error('[Billing/Subscribe]', error);
    return internalError('Failed to process subscription');
  }
}
