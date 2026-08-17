// ============================================
// POST /api/v1/subscription/process
// Process subscriptions (cron trigger)
// No auth required — called by scheduler
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  validationError,
  internalError,
} from '@/lib/api/response';
export const runtime = 'nodejs';


// BDT Tier Pricing
const TIER_PRICING: Record<string, Record<string, number>> = {
  starter: { monthly: 2400, yearly: 28800 },
  professional: { monthly: 6900, yearly: 82800 },
  enterprise: { monthly: 17400, yearly: 208800 },
};

interface ProcessBody {
  action?: 'check_renewals' | 'check_expiry' | 'check_grace_periods' | 'all';
}

interface ProcessResult {
  action: string;
  processed: number;
  details: string[];
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse body (optional)
    let body: ProcessBody = { action: 'all' };
    try {
      const parsed = await request.json();
      if (parsed?.action) {
        body = parsed;
      }
    } catch {
      // No body or invalid JSON, default to 'all'
    }

    const { action } = body;

    if (action && !['check_renewals', 'check_expiry', 'check_grace_periods', 'all'].includes(action)) {
      return validationError(
        'action',
        'Invalid action. Must be one of: check_renewals, check_expiry, check_grace_periods, all'
      );
    }

    const now = new Date();
    const results: ProcessResult[] = [];

    // 2. Process based on action
    const shouldProcessRenewals = action === 'all' || action === 'check_renewals';
    const shouldProcessExpiry = action === 'all' || action === 'check_expiry';
    const shouldProcessGracePeriods = action === 'all' || action === 'check_grace_periods';
    const shouldProcessRetention = action === 'all';

    // --- CHECK RENEWALS ---
    if (shouldProcessRenewals) {
      const renewalsResult = await processRenewals(now);
      results.push(renewalsResult);
    }

    // --- CHECK EXPIRY ---
    if (shouldProcessExpiry) {
      const expiryResult = await processExpiry(now);
      results.push(expiryResult);
    }

    // --- CHECK GRACE PERIODS ---
    if (shouldProcessGracePeriods) {
      const graceResult = await processGracePeriods(now);
      results.push(graceResult);
    }

    // --- DATA RETENTION CLEANUP ---
    if (shouldProcessRetention) {
      const retentionResult = await processDataRetention(now);
      results.push(retentionResult);
    }

    // 3. Return summary
    return apiSuccess({
      processedAt: now,
      action: action || 'all',
      results,
      summary: {
        totalProcessed: results.reduce((sum, r) => sum + r.processed, 0),
        actions: results.map((r) => ({ action: r.action, count: r.processed })),
      },
    });
  } catch (error) {
    console.error('[Subscription/Process/POST]', error);
    return internalError('Failed to process subscriptions');
  }
}

// --- Process subscriptions needing renewal ---
async function processRenewals(now: Date): Promise<ProcessResult> {
  const details: string[] = [];

  // Find active subscriptions where nextPaymentAt <= now and autoRenew=true
  const subscriptionsNeedingRenewal = await db.subscription.findMany({
    where: {
      status: 'active',
      autoRenew: true,
      nextPaymentAt: { lte: now },
    },
    include: {
      tenant: {
        select: { id: true, name: true, pmType: true },
      },
    },
  });

  for (const subscription of subscriptionsNeedingRenewal) {
    try {
      // Calculate new period
      const periodStart = subscription.currentPeriodEnd || now;
      const periodEnd = new Date(periodStart);
      if (subscription.billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const tier = subscription.tier;
      const cycle = subscription.billingCycle as 'monthly' | 'yearly';
      const amount = TIER_PRICING[tier]?.[cycle] || subscription.unitAmount || 0;
      const paymentMethod = subscription.tenant.pmType || 'bkash';

      // In demo mode: auto-succeed payment
      const payment = await db.subscriptionPayment.create({
        data: {
          tenantId: subscription.tenantId,
          amount,
          currency: 'BDT',
          method: paymentMethod,
          status: 'completed',
          periodStart,
          periodEnd,
          metadata: JSON.stringify({
            renewalType: 'auto',
            tier,
            billingCycle: cycle,
          }),
        },
      });

      // Update subscription
      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          lastPaymentAt: now,
          nextPaymentAt: periodEnd,
          lastRenewalAttempt: now,
          renewalReminderSent: false,
          paymentFailCount: 0,
        },
      });

      // Create invoice
      const invoiceCount = await db.invoice.count({
        where: { tenantId: subscription.tenantId },
      });
      const invoiceNumber = `INV-${now.getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;

      await db.invoice.create({
        data: {
          tenantId: subscription.tenantId,
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
          lineItems: JSON.stringify([
            {
              description: `TrimedCast ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan - ${cycle === 'yearly' ? 'Annual' : 'Monthly'}`,
              amount,
              quantity: 1,
              unit_amount: amount,
            },
          ]),
          periodStart,
          periodEnd,
          paymentMethod,
          paymentRef: payment.id,
        },
      });

      // Record event
      await db.subscriptionEvent.create({
        data: {
          tenantId: subscription.tenantId,
          subscriptionId: subscription.id,
          eventType: 'renewed',
          fromStatus: 'active',
          toStatus: 'active',
          fromTier: subscription.tier,
          toTier: subscription.tier,
          metadata: JSON.stringify({
            renewalType: 'auto',
            paymentId: payment.id,
            amount,
            periodEnd: periodEnd.toISOString(),
          }),
          performedBy: null, // System
        },
      });

      details.push(`Renewed subscription ${subscription.id} for tenant ${subscription.tenant.name}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      details.push(`Failed to renew subscription ${subscription.id}: ${errorMsg}`);

      // Increment fail count on the subscription
      try {
        await db.subscription.update({
          where: { id: subscription.id },
          data: {
            paymentFailCount: { increment: 1 },
            lastRenewalAttempt: now,
          },
        });
      } catch {
        // Ignore update errors in error handler
      }
    }
  }

  return {
    action: 'check_renewals',
    processed: subscriptionsNeedingRenewal.length,
    details,
  };
}

// --- Process subscription expiries ---
async function processExpiry(now: Date): Promise<ProcessResult> {
  const details: string[] = [];

  // Find active subscriptions where currentPeriodEnd <= now
  const expiredSubscriptions = await db.subscription.findMany({
    where: {
      status: 'active',
      currentPeriodEnd: { lte: now },
      autoRenew: false,
    },
  });

  // Also find past_due subscriptions where currentPeriodEnd <= now
  const pastDueExpired = await db.subscription.findMany({
    where: {
      status: 'past_due',
      currentPeriodEnd: { lte: now },
    },
  });

  const allToExpire = [...expiredSubscriptions, ...pastDueExpired];

  for (const subscription of allToExpire) {
    try {
      // Set grace period (7 days from now) before full expiry
      const gracePeriodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // If already past_due, expire now; otherwise set to past_due first
      if (subscription.status === 'past_due' && subscription.gracePeriodEnd && now >= subscription.gracePeriodEnd) {
        // Grace period has ended, expire subscription
        await db.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'expired',
            expiredAt: now,
            dataRetentionEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 day retention
          },
        });

        // Downgrade tenant to free/starter
        await db.tenant.update({
          where: { id: subscription.tenantId },
          data: {
            status: 'suspended',
            plan: 'starter',
            suspendedAt: now,
            suspensionReason: 'subscription_expired',
          },
        });

        await db.subscriptionEvent.create({
          data: {
            tenantId: subscription.tenantId,
            subscriptionId: subscription.id,
            eventType: 'expired',
            fromStatus: subscription.status,
            toStatus: 'expired',
            fromTier: subscription.tier,
            toTier: subscription.tier,
            metadata: JSON.stringify({
              reason: 'period_end_passed',
              dataRetentionEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            performedBy: null,
          },
        });

        details.push(`Expired subscription ${subscription.id} — access revoked, data retained for 30 days`);
      } else if (subscription.status === 'active') {
        // Move to past_due with grace period
        await db.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'past_due',
            gracePeriodEnd,
            paymentFailCount: { increment: 1 },
          },
        });

        await db.tenant.update({
          where: { id: subscription.tenantId },
          data: {
            status: 'past_due',
          },
        });

        await db.subscriptionEvent.create({
          data: {
            tenantId: subscription.tenantId,
            subscriptionId: subscription.id,
            eventType: 'grace_period_started',
            fromStatus: 'active',
            toStatus: 'past_due',
            fromTier: subscription.tier,
            toTier: subscription.tier,
            metadata: JSON.stringify({
              gracePeriodEnd: gracePeriodEnd.toISOString(),
              reason: 'payment_not_received',
            }),
            performedBy: null,
          },
        });

        details.push(`Subscription ${subscription.id} entered grace period until ${gracePeriodEnd.toISOString()}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      details.push(`Failed to process expiry for subscription ${subscription.id}: ${errorMsg}`);
    }
  }

  return {
    action: 'check_expiry',
    processed: allToExpire.length,
    details,
  };
}

// --- Process grace period expiries ---
async function processGracePeriods(now: Date): Promise<ProcessResult> {
  const details: string[] = [];

  // Find past_due subscriptions where gracePeriodEnd <= now
  const gracePeriodExpired = await db.subscription.findMany({
    where: {
      status: 'past_due',
      gracePeriodEnd: { lte: now },
    },
  });

  for (const subscription of gracePeriodExpired) {
    try {
      // Grace period has ended, expire subscription
      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'expired',
          expiredAt: now,
          gracePeriodEnd: null,
          dataRetentionEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Downgrade tenant
      await db.tenant.update({
        where: { id: subscription.tenantId },
        data: {
          status: 'suspended',
          plan: 'starter',
          suspendedAt: now,
          suspensionReason: 'subscription_past_due',
        },
      });

      await db.subscriptionEvent.create({
        data: {
          tenantId: subscription.tenantId,
          subscriptionId: subscription.id,
          eventType: 'expired',
          fromStatus: 'past_due',
          toStatus: 'expired',
          fromTier: subscription.tier,
          toTier: subscription.tier,
          metadata: JSON.stringify({
            reason: 'grace_period_ended',
            dataRetentionEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }),
          performedBy: null,
        },
      });

      details.push(`Grace period ended for subscription ${subscription.id} — subscription expired`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      details.push(`Failed to process grace period for subscription ${subscription.id}: ${errorMsg}`);
    }
  }

  return {
    action: 'check_grace_periods',
    processed: gracePeriodExpired.length,
    details,
  };
}

// --- Process data retention cleanups ---
async function processDataRetention(now: Date): Promise<ProcessResult> {
  const details: string[] = [];

  // Find expired subscriptions where dataRetentionEnd <= now
  const retentionExpired = await db.subscription.findMany({
    where: {
      status: 'expired',
      dataRetentionEnd: { lte: now },
      downgradedAt: null, // Not yet cleaned up
    },
  });

  for (const subscription of retentionExpired) {
    try {
      // Mark data as cleaned up
      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          downgradedAt: now,
          dataRetentionEnd: null,
        },
      });

      // Record event
      await db.subscriptionEvent.create({
        data: {
          tenantId: subscription.tenantId,
          subscriptionId: subscription.id,
          eventType: 'downgraded',
          fromStatus: 'expired',
          toStatus: 'expired',
          fromTier: subscription.tier,
          toTier: 'starter',
          metadata: JSON.stringify({
            reason: 'data_retention_period_ended',
            previousTier: subscription.tier,
            action: 'data_cleanup_performed',
          }),
          performedBy: null,
        },
      });

      details.push(`Data retention period ended for subscription ${subscription.id} — data cleanup performed`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      details.push(`Failed to process data retention for subscription ${subscription.id}: ${errorMsg}`);
    }
  }

  return {
    action: 'data_retention_cleanup',
    processed: retentionExpired.length,
    details,
  };
}
