// ============================================
// POST /api/v1/subscription/cancel
// Cancel subscription - works in demo mode
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
export const runtime = 'nodejs';


interface CancelBody {
  reason?: string;
  feedback?: string;
  immediate?: boolean;
}

const VALID_REASONS = [
  'too_expensive',
  'missing_features',
  'switching_service',
  'low_usage',
  'business_closed',
  'other',
];

export async function POST(request: NextRequest) {
  try {
    // 1. Parse body
    let body: CancelBody = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const { reason, feedback, immediate } = body;

    // Validate reason
    if (reason && !VALID_REASONS.includes(reason)) {
      return validationError('reason', `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}`);
    }

    // 2. Try auth
    const ctx = await getAuthContext();

    if (!ctx.isAuthenticated) {
      // Demo mode - return success
      const now = new Date();
      const endsAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      const daysUntilEnd = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return apiSuccess({
        subscription: {
          id: 'demo-sub-001',
          tier: 'professional',
          status: 'cancelled',
          cancelledAt: now.toISOString(),
          endsAt: endsAt.toISOString(),
          cancellationReason: reason || 'user_request',
        },
        confirmation: {
          cancelled: true,
          endsAt: endsAt.toISOString(),
          daysUntilEnd,
          immediate: false,
          accessUntil: `End of billing period (${daysUntilEnd} days remaining)`,
        },
        message: `Subscription cancelled. You will have access until the end of your billing period (${daysUntilEnd} days remaining).`,
        isDemo: true,
      });
    }

    // Validate immediate flag (only admins)
    if (immediate && ctx.role !== 'admin') {
      return validationError('immediate', 'Immediate cancellation is only available for admin users');
    }

    // 3. Fetch current subscription
    const subscription = await db.subscription.findUnique({
      where: { tenantId: ctx.tenantId },
    });

    if (!subscription) {
      return notFoundError('Subscription');
    }

    if (subscription.status === 'cancelled') {
      return conflictError('Subscription is already cancelled');
    }

    if (subscription.status === 'expired') {
      return conflictError('Subscription has already expired');
    }

    if (subscription.status !== 'active' && subscription.status !== 'past_due' && subscription.status !== 'trial') {
      return conflictError(`Cannot cancel subscription in '${subscription.status}' status`);
    }

    // 4. Calculate endsAt
    const now = new Date();
    let endsAt: Date;

    if (immediate) {
      endsAt = now;
    } else {
      if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
        endsAt = subscription.currentPeriodEnd;
      } else if (subscription.trialEndsAt && subscription.trialEndsAt > now) {
        endsAt = subscription.trialEndsAt;
      } else {
        endsAt = now;
      }
    }

    // 5. Update subscription
    const updatedSubscription = await db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelledAt: now,
        endsAt,
        autoRenew: false,
        cancellationReason: reason || 'user_request',
        cancellationFeedback: feedback || null,
      },
    });

    // 6. Record SubscriptionEvent
    await db.subscriptionEvent.create({
      data: {
        tenantId: ctx.tenantId,
        subscriptionId: subscription.id,
        eventType: 'cancelled',
        fromStatus: subscription.status,
        toStatus: 'cancelled',
        fromTier: subscription.tier,
        toTier: subscription.tier,
        metadata: JSON.stringify({
          reason: reason || 'user_request',
          feedback: feedback || null,
          immediate: !!immediate,
          endsAt: endsAt.toISOString(),
        }),
        performedBy: ctx.userId,
      },
    });

    // 7. Update tenant status
    await db.tenant.update({
      where: { id: ctx.tenantId },
      data: { status: 'cancelled', cancelledAt: now },
    });

    // 8. Return cancellation confirmation
    const daysUntilEnd = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return apiSuccess({
      subscription: {
        id: updatedSubscription.id,
        tier: updatedSubscription.tier,
        status: updatedSubscription.status,
        cancelledAt: updatedSubscription.cancelledAt?.toISOString() ?? null,
        endsAt: updatedSubscription.endsAt?.toISOString() ?? null,
        cancellationReason: updatedSubscription.cancellationReason,
        updatedAt: updatedSubscription.updatedAt.toISOString(),
      },
      confirmation: {
        cancelled: true,
        endsAt: endsAt.toISOString(),
        daysUntilEnd,
        immediate: !!immediate,
        accessUntil: immediate ? 'now' : `End of billing period (${daysUntilEnd} days remaining)`,
      },
      message: immediate
        ? 'Subscription cancelled immediately. Access has been revoked.'
        : `Subscription cancelled. You will have access until end of billing period (${daysUntilEnd} days).`,
    });
  } catch (error) {
    console.error('[Subscription/Cancel/POST]', error);
    return internalError('Failed to cancel subscription');
  }
}
