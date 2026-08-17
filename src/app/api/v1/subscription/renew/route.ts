// ============================================
// POST /api/v1/subscription/renew
// Manual renewal of subscription - works in demo mode
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

interface RenewBody {
  paymentMethod?: string;
}

const VALID_PAYMENT_METHODS = ['bkash', 'nagad', 'card', 'bank_transfer', 'sslcommerz'];

export async function POST(request: NextRequest) {
  try {
    // 1. Parse body
    let body: RenewBody = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const { paymentMethod } = body;

    if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return validationError('paymentMethod', `Invalid payment method. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`);
    }

    // 2. Try auth
    const ctx = await getAuthContext();

    if (!ctx.isAuthenticated) {
      // Demo mode - simulate renewal
      const now = new Date();
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      const resolvedMethod = paymentMethod || 'bkash';

      return apiSuccess({
        subscription: {
          id: 'demo-sub-001',
          tier: 'professional',
          status: 'active',
          billingCycle: 'monthly',
          unitAmount: 6900,
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          lastPaymentAt: now.toISOString(),
          nextPaymentAt: periodEnd.toISOString(),
        },
        payment: {
          id: 'demo-pay-001',
          amount: 6900,
          currency: 'BDT',
          method: resolvedMethod,
          status: 'completed',
        },
        invoice: {
          id: 'demo-inv-003',
          number: 'INV-2025-003',
          status: 'paid',
          total: 6900,
          currency: 'BDT',
        },
        message: 'Subscription renewed successfully. Next payment due on ' + periodEnd.toLocaleDateString(),
        isDemo: true,
      });
    }

    // 3. Fetch current subscription
    const subscription = await db.subscription.findUnique({
      where: { tenantId: ctx.tenantId },
    });

    if (!subscription) {
      return notFoundError('Subscription');
    }

    if (subscription.status === 'cancelled') {
      return conflictError('Cannot renew a cancelled subscription. Please resume it first.');
    }

    if (subscription.status === 'expired') {
      return conflictError('Cannot renew an expired subscription. Please start a new subscription.');
    }

    if (subscription.status !== 'active' && subscription.status !== 'past_due' && subscription.status !== 'trial') {
      return conflictError(`Cannot renew subscription in '${subscription.status}' status`);
    }

    // 4. Calculate new period dates
    const now = new Date();
    const periodStart = subscription.currentPeriodEnd
      ? new Date(Math.max(subscription.currentPeriodEnd.getTime(), now.getTime()))
      : now;

    const periodEnd = new Date(periodStart);
    if (subscription.billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // 5. Calculate amount
    const tier = subscription.tier;
    const cycle = subscription.billingCycle as 'monthly' | 'yearly';
    const amount = TIER_PRICING[tier]?.[cycle] || subscription.unitAmount || 0;

    // 6. Resolve payment method
    const tenant = await db.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { pmType: true },
    });
    const resolvedPaymentMethod = paymentMethod || tenant?.pmType || 'bkash';

    // 7. Create SubscriptionPayment record (demo: auto-succeed)
    const payment = await db.subscriptionPayment.create({
      data: {
        tenantId: ctx.tenantId,
        amount,
        currency: 'BDT',
        method: resolvedPaymentMethod,
        status: 'completed',
        periodStart,
        periodEnd,
        metadata: JSON.stringify({
          renewalType: 'manual',
          tier,
          billingCycle: cycle,
          initiatedBy: ctx.userId,
        }),
      },
    });

    // 8. Update subscription
    const updatedSubscription = await db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        lastPaymentAt: now,
        nextPaymentAt: periodEnd,
        paymentFailCount: 0,
        paymentRetryAt: null,
        gracePeriodEnd: null,
        lastRenewalAttempt: now,
        renewalReminderSent: false,
      },
    });

    // 9. Update tenant status
    await db.tenant.update({
      where: { id: ctx.tenantId },
      data: { status: 'active', suspendedAt: null, suspensionReason: null },
    });

    // 10. Create invoice
    const invoiceCount = await db.invoice.count({ where: { tenantId: ctx.tenantId } });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;

    const invoice = await db.invoice.create({
      data: {
        tenantId: ctx.tenantId,
        subscriptionId: subscription.id,
        number: invoiceNumber,
        status: 'paid',
        dueDate: periodStart,
        paidAt: now,
        subtotal: amount,
        discount: 0,
        tax: 0,
        total: amount,
        currency: 'BDT',
        lineItems: JSON.stringify([{
          description: `TrimedCast ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan - ${cycle === 'yearly' ? 'Annual' : 'Monthly'}`,
          amount,
          quantity: 1,
          unit_amount: amount,
        }]),
        usageSummary: JSON.stringify({
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        }),
        periodStart,
        periodEnd,
        paymentMethod: resolvedPaymentMethod,
        paymentRef: payment.id,
      },
    });

    // 11. Record SubscriptionEvent
    await db.subscriptionEvent.create({
      data: {
        tenantId: ctx.tenantId,
        subscriptionId: subscription.id,
        eventType: 'renewed',
        fromStatus: subscription.status,
        toStatus: 'active',
        fromTier: subscription.tier,
        toTier: subscription.tier,
        metadata: JSON.stringify({
          renewalType: 'manual',
          paymentMethod: resolvedPaymentMethod,
          amount,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          paymentId: payment.id,
          invoiceId: invoice.id,
        }),
        performedBy: ctx.userId,
      },
    });

    // 12. Return renewal confirmation
    return apiSuccess({
      subscription: {
        id: updatedSubscription.id,
        tier: updatedSubscription.tier,
        status: updatedSubscription.status,
        billingCycle: updatedSubscription.billingCycle,
        unitAmount: updatedSubscription.unitAmount,
        currentPeriodStart: updatedSubscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd?.toISOString() ?? null,
        lastPaymentAt: updatedSubscription.lastPaymentAt?.toISOString() ?? null,
        nextPaymentAt: updatedSubscription.nextPaymentAt?.toISOString() ?? null,
        updatedAt: updatedSubscription.updatedAt.toISOString(),
      },
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
      },
      invoice: {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        total: invoice.total,
        currency: invoice.currency,
      },
      message: `Subscription renewed successfully. Next payment due on ${periodEnd.toLocaleDateString()}.`,
    });
  } catch (error) {
    console.error('[Subscription/Renew/POST]', error);
    return internalError('Failed to renew subscription');
  }
}
