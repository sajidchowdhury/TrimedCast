// ============================================
// TrimedCast - Subscription Expiry & Data Retention
// Handles subscription expiry, data retention periods,
// post-expiry downgrades, and recovery within retention
// Session 14: Subscription Management + Renewal + Expiry
// ============================================

import { db } from '@/lib/db';
import {
  TierSlug,
  BillingCycle,
  SubscriptionStatus,
  DATA_RETENTION_DAYS,
  formatDateISO,
  addDays,
  daysBetween,
  getTierPrice,
  calculatePeriodEnd,
  recordSubscriptionEvent,
} from './engine';

// --- Types ---

export interface ExpiryCheckResult {
  subscriptionId: string;
  tenantId: string;
  shouldExpire: boolean;
  reason: string | null;
  currentStatus: string;
  endsAt: string | null;
  daysUntilExpiry: number | null;
}

export interface ExpireSubscriptionResult {
  success: boolean;
  subscriptionId: string;
  tenantId: string;
  expiredAt: Date;
  dataRetentionEnd: Date;
  error?: string;
}

export interface DataRetentionCheckResult {
  subscriptionId: string;
  tenantId: string;
  isRetentionPeriodOver: boolean;
  dataRetentionEnd: string | null;
  daysUntilRetentionEnd: number | null;
  tier: string;
  downgradedAt: string | null;
}

export interface DowngradeResult {
  success: boolean;
  subscriptionId: string;
  tenantId: string;
  fromTier: string;
  toTier: string;
  downgradedAt: Date;
  error?: string;
}

export interface ExpiryStatusInfo {
  subscriptionId: string;
  tenantId: string;
  tier: string;
  status: string;
  isExpired: boolean;
  expiredAt: string | null;
  daysUntilExpiry: number | null;
  dataRetentionEnd: string | null;
  inDataRetentionPeriod: boolean;
  daysUntilRetentionEnd: number | null;
  downgradedAt: string | null;
  canRecover: boolean;
  cancellationReason: string | null;
}

export interface RecoverResult {
  success: boolean;
  subscriptionId: string;
  tenantId: string;
  newPeriodEnd: Date;
  recoveredTier: string;
  error?: string;
}

export interface ScheduleResult {
  scheduled: number;
  subscriptions: Array<{
    subscriptionId: string;
    tenantId: string;
    reason: string;
    processAt: string;
  }>;
}

export interface BatchExpiryResult {
  processed: number;
  results: Array<{
    subscriptionId: string;
    tenantId: string;
    action: string;
    success: boolean;
    error?: string;
  }>;
}

// --- checkSubscriptionExpiry ---

/**
 * Check if a subscription should expire
 * Evaluates various conditions that lead to expiry:
 * - Active subscription past period end with auto-renew disabled
 * - Cancelled subscription past endsAt
 * - Past_due subscription past grace period with max retries exceeded
 * - Trial subscription past trial end without activation
 */
export async function checkSubscriptionExpiry(
  subscriptionId: string
): Promise<ExpiryCheckResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return {
      subscriptionId,
      tenantId: '',
      shouldExpire: false,
      reason: 'Subscription not found',
      currentStatus: 'unknown',
      endsAt: null,
      daysUntilExpiry: null,
    };
  }

  const now = new Date();
  let shouldExpire = false;
  let reason: string | null = null;
  let daysUntilExpiry: number | null = null;

  switch (subscription.status as SubscriptionStatus) {
    case 'active': {
      // Active subscription expires if past period end and auto-renew is off
      if (subscription.currentPeriodEnd && now >= subscription.currentPeriodEnd) {
        if (!subscription.autoRenew) {
          shouldExpire = true;
          reason = 'period_ended_no_autorenew';
        }
        daysUntilExpiry = daysBetween(now, subscription.currentPeriodEnd);
      } else if (subscription.currentPeriodEnd) {
        daysUntilExpiry = daysBetween(now, subscription.currentPeriodEnd);
      }
      break;
    }

    case 'cancelled': {
      // Cancelled subscription expires when endsAt is reached
      if (subscription.endsAt) {
        daysUntilExpiry = daysBetween(now, subscription.endsAt);
        if (now >= subscription.endsAt) {
          shouldExpire = true;
          reason = 'cancelled_period_ended';
        }
      }
      break;
    }

    case 'past_due': {
      // Past due expires after grace period with max retries exceeded
      if (subscription.gracePeriodEnd && now >= subscription.gracePeriodEnd) {
        shouldExpire = true;
        reason = 'grace_period_expired';
        daysUntilExpiry = 0;
      } else if (subscription.gracePeriodEnd) {
        daysUntilExpiry = daysBetween(now, subscription.gracePeriodEnd);
      }
      break;
    }

    case 'suspended': {
      // Suspended subscriptions can expire if they've been suspended too long
      // Check for data retention end as the expiry marker
      if (subscription.dataRetentionEnd && now >= subscription.dataRetentionEnd) {
        shouldExpire = true;
        reason = 'data_retention_period_over';
        daysUntilExpiry = 0;
      } else if (subscription.dataRetentionEnd) {
        daysUntilExpiry = daysBetween(now, subscription.dataRetentionEnd);
      }
      break;
    }

    case 'trial': {
      // Trial doesn't "expire" in the traditional sense — it transitions to suspended
      if (subscription.trialEndsAt) {
        daysUntilExpiry = daysBetween(now, subscription.trialEndsAt);
      }
      break;
    }

    case 'expired': {
      // Already expired
      daysUntilExpiry = 0;
      reason = 'already_expired';
      break;
    }
  }

  return {
    subscriptionId,
    tenantId: subscription.tenantId,
    shouldExpire,
    reason,
    currentStatus: subscription.status,
    endsAt: subscription.endsAt?.toISOString() || null,
    daysUntilExpiry,
  };
}

// --- expireSubscription ---

/**
 * Mark a subscription as expired
 * - Sets expiredAt to now
 * - Sets dataRetentionEnd to 30 days from now
 * - Updates tenant status to suspended
 * - Records the lifecycle event
 */
export async function expireSubscription(
  subscriptionId: string,
  reason?: string,
  performedBy?: string
): Promise<ExpireSubscriptionResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return {
      success: false,
      subscriptionId,
      tenantId: '',
      expiredAt: new Date(),
      dataRetentionEnd: addDays(new Date(), DATA_RETENTION_DAYS),
      error: 'Subscription not found',
    };
  }

  // Already expired — return current state
  if (subscription.status === 'expired') {
    return {
      success: false,
      subscriptionId,
      tenantId: subscription.tenantId,
      expiredAt: subscription.expiredAt || new Date(),
      dataRetentionEnd: subscription.dataRetentionEnd || addDays(new Date(), DATA_RETENTION_DAYS),
      error: 'Subscription is already expired',
    };
  }

  const now = new Date();
  const dataRetentionEnd = addDays(now, DATA_RETENTION_DAYS);
  const previousStatus = subscription.status as SubscriptionStatus;

  // Update subscription
  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'expired',
      expiredAt: now,
      dataRetentionEnd,
      endsAt: now,
      autoRenew: false,
      gracePeriodEnd: null,
      paymentRetryAt: null,
    },
  });

  // Update tenant to suspended (not deleting — data retained)
  await db.tenant.update({
    where: { id: subscription.tenantId },
    data: {
      status: 'suspended',
      isActive: false,
      suspendedAt: now,
      suspensionReason: 'subscription_expired',
    },
  });

  // Record event
  await recordSubscriptionEvent({
    subscriptionId,
    tenantId: subscription.tenantId,
    eventType: 'expired',
    fromStatus: previousStatus,
    toStatus: 'expired',
    metadata: {
      reason: reason || 'subscription_period_ended',
      dataRetentionEnd: formatDateISO(dataRetentionEnd),
      previousTier: subscription.tier,
      canRecoverUntil: formatDateISO(dataRetentionEnd),
    },
    performedBy,
  });

  return {
    success: true,
    subscriptionId,
    tenantId: subscription.tenantId,
    expiredAt: now,
    dataRetentionEnd,
  };
}

// --- checkDataRetention ---

/**
 * Check if the data retention period is over for an expired subscription
 * After 30 days, the subscription should be downgraded to starter
 */
export async function checkDataRetention(
  subscriptionId: string
): Promise<DataRetentionCheckResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return {
      subscriptionId,
      tenantId: '',
      isRetentionPeriodOver: false,
      dataRetentionEnd: null,
      daysUntilRetentionEnd: null,
      tier: '',
      downgradedAt: null,
    };
  }

  const now = new Date();
  const dataRetentionEnd = subscription.dataRetentionEnd;
  let isRetentionPeriodOver = false;
  let daysUntilRetentionEnd: number | null = null;

  if (dataRetentionEnd) {
    daysUntilRetentionEnd = daysBetween(now, dataRetentionEnd);
    isRetentionPeriodOver = now >= dataRetentionEnd;
  } else if (subscription.status === 'expired' && subscription.expiredAt) {
    // Fallback: calculate from expiredAt if dataRetentionEnd not set
    const computedEnd = addDays(subscription.expiredAt, DATA_RETENTION_DAYS);
    daysUntilRetentionEnd = daysBetween(now, computedEnd);
    isRetentionPeriodOver = now >= computedEnd;
  }

  return {
    subscriptionId,
    tenantId: subscription.tenantId,
    isRetentionPeriodOver,
    dataRetentionEnd: dataRetentionEnd?.toISOString() || null,
    daysUntilRetentionEnd,
    tier: subscription.tier,
    downgradedAt: subscription.downgradedAt?.toISOString() || null,
  };
}

// --- downgradeExpiredSubscription ---

/**
 * Downgrade an expired subscription to the starter (free) tier
 * Called after the 30-day data retention period ends
 * The tenant retains access but at the lowest tier
 */
export async function downgradeExpiredSubscription(
  subscriptionId: string,
  targetTier: TierSlug = 'starter',
  performedBy?: string
): Promise<DowngradeResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return {
      success: false,
      subscriptionId,
      tenantId: '',
      fromTier: '',
      toTier: targetTier,
      downgradedAt: new Date(),
      error: 'Subscription not found',
    };
  }

  // Must be expired to downgrade
  if (subscription.status !== 'expired') {
    return {
      success: false,
      subscriptionId,
      tenantId: subscription.tenantId,
      fromTier: subscription.tier,
      toTier: targetTier,
      downgradedAt: new Date(),
      error: `Cannot downgrade subscription in '${subscription.status}' status — must be expired`,
    };
  }

  // Already downgraded
  if (subscription.downgradedAt) {
    return {
      success: false,
      subscriptionId,
      tenantId: subscription.tenantId,
      fromTier: subscription.tier,
      toTier: targetTier,
      downgradedAt: subscription.downgradedAt,
      error: 'Subscription has already been downgraded',
    };
  }

  // Data retention period must be over
  const now = new Date();
  if (subscription.dataRetentionEnd && now < subscription.dataRetentionEnd) {
    return {
      success: false,
      subscriptionId,
      tenantId: subscription.tenantId,
      fromTier: subscription.tier,
      toTier: targetTier,
      downgradedAt: new Date(),
      error: `Data retention period not yet over — ends ${formatDateISO(subscription.dataRetentionEnd)}`,
    };
  }

  const fromTier = subscription.tier;
  const newPrice = getTierPrice(targetTier, 'monthly');
  const newPeriodEnd = calculatePeriodEnd(now, 'monthly');

  // Update subscription — re-activate at starter tier
  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      tier: targetTier,
      status: 'active',
      unitAmount: newPrice,
      billingCycle: 'monthly',
      downgradedAt: now,
      expiredAt: null,
      dataRetentionEnd: null,
      endsAt: null,
      autoRenew: true,
      currentPeriodStart: now,
      currentPeriodEnd: newPeriodEnd,
      nextPaymentAt: newPeriodEnd,
      lastPaymentAt: now,
      paymentFailCount: 0,
      gracePeriodEnd: null,
      paymentRetryAt: null,
    },
  });

  // Update tenant
  await db.tenant.update({
    where: { id: subscription.tenantId },
    data: {
      plan: targetTier,
      status: 'active',
      isActive: true,
      suspendedAt: null,
      suspensionReason: null,
    },
  });

  // Record event
  await recordSubscriptionEvent({
    subscriptionId,
    tenantId: subscription.tenantId,
    eventType: 'downgraded',
    fromStatus: 'expired',
    toStatus: 'active',
    fromTier,
    toTier: targetTier,
    metadata: {
      reason: 'post_expiry_downgrade',
      dataRetentionExpired: true,
      previousTier: fromTier,
      newPriceBDT: newPrice,
      newBillingCycle: 'monthly',
    },
    performedBy,
  });

  return {
    success: true,
    subscriptionId,
    tenantId: subscription.tenantId,
    fromTier,
    toTier: targetTier,
    downgradedAt: now,
  };
}

// --- getExpiryStatus ---

/**
 * Get comprehensive expiry information for a subscription
 */
export async function getExpiryStatus(
  subscriptionId: string
): Promise<ExpiryStatusInfo | null> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) return null;

  const now = new Date();
  const isExpired = subscription.status === 'expired';

  // Compute days until expiry
  let daysUntilExpiry: number | null = null;
  if (subscription.endsAt) {
    daysUntilExpiry = daysBetween(now, subscription.endsAt);
  } else if (subscription.currentPeriodEnd && subscription.status === 'active') {
    daysUntilExpiry = daysBetween(now, subscription.currentPeriodEnd);
  }

  // Compute data retention info
  let inDataRetentionPeriod = false;
  let daysUntilRetentionEnd: number | null = null;

  if (subscription.dataRetentionEnd) {
    daysUntilRetentionEnd = daysBetween(now, subscription.dataRetentionEnd);
    inDataRetentionPeriod = isExpired && now < subscription.dataRetentionEnd;
  } else if (isExpired && subscription.expiredAt) {
    const computedEnd = addDays(subscription.expiredAt, DATA_RETENTION_DAYS);
    daysUntilRetentionEnd = daysBetween(now, computedEnd);
    inDataRetentionPeriod = now < computedEnd;
  }

  // Can recover: expired but still within data retention period and not yet downgraded
  const canRecover = isExpired && inDataRetentionPeriod && !subscription.downgradedAt;

  return {
    subscriptionId: subscription.id,
    tenantId: subscription.tenantId,
    tier: subscription.tier,
    status: subscription.status,
    isExpired,
    expiredAt: subscription.expiredAt?.toISOString() || null,
    daysUntilExpiry,
    dataRetentionEnd: subscription.dataRetentionEnd?.toISOString() || null,
    inDataRetentionPeriod,
    daysUntilRetentionEnd,
    downgradedAt: subscription.downgradedAt?.toISOString() || null,
    canRecover,
    cancellationReason: subscription.cancellationReason,
  };
}

// --- recoverExpiredSubscription ---

/**
 * Reactivate an expired subscription within the data retention period
 * - Only possible if data retention hasn't ended
 * - Restores the previous tier and billing cycle
 * - Sets up a new billing period
 */
export async function recoverExpiredSubscription(
  subscriptionId: string,
  newBillingCycle?: BillingCycle,
  performedBy?: string
): Promise<RecoverResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return {
      success: false,
      subscriptionId,
      tenantId: '',
      newPeriodEnd: new Date(),
      recoveredTier: '',
      error: 'Subscription not found',
    };
  }

  // Must be expired to recover
  if (subscription.status !== 'expired') {
    return {
      success: false,
      subscriptionId,
      tenantId: subscription.tenantId,
      newPeriodEnd: new Date(),
      recoveredTier: subscription.tier,
      error: `Cannot recover subscription in '${subscription.status}' status — must be expired`,
    };
  }

  // Already downgraded — cannot recover
  if (subscription.downgradedAt) {
    return {
      success: false,
      subscriptionId,
      tenantId: subscription.tenantId,
      newPeriodEnd: new Date(),
      recoveredTier: subscription.tier,
      error: 'Cannot recover — subscription has already been downgraded after data retention period',
    };
  }

  // Check data retention period
  const now = new Date();
  if (subscription.dataRetentionEnd && now >= subscription.dataRetentionEnd) {
    return {
      success: false,
      subscriptionId,
      tenantId: subscription.tenantId,
      newPeriodEnd: new Date(),
      recoveredTier: subscription.tier,
      error: `Data retention period has ended — recovery is no longer possible (ended ${formatDateISO(subscription.dataRetentionEnd)})`,
    };
  }

  // Recover the subscription
  const tier = subscription.tier as TierSlug;
  const cycle = newBillingCycle || 'monthly';
  const amountBDT = getTierPrice(tier, cycle);
  const newPeriodEnd = calculatePeriodEnd(now, cycle);

  // Create payment record for recovery
  const payment = await db.subscriptionPayment.create({
    data: {
      tenantId: subscription.tenantId,
      amount: amountBDT,
      currency: 'BDT',
      method: subscription.tenant.pmType || 'card',
      status: 'completed',
      periodStart: now,
      periodEnd: newPeriodEnd,
      metadata: JSON.stringify({
        type: 'expiry_recovery',
        tier,
        cycle,
        previousExpiredAt: subscription.expiredAt?.toISOString(),
      }),
    },
  });

  // Update subscription — re-activate with same tier
  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'active',
      billingCycle: cycle,
      unitAmount: amountBDT,
      currentPeriodStart: now,
      currentPeriodEnd: newPeriodEnd,
      nextPaymentAt: newPeriodEnd,
      lastPaymentAt: now,
      autoRenew: true,
      // Clear expiry fields
      expiredAt: null,
      dataRetentionEnd: null,
      endsAt: null,
      // Clear failure fields
      paymentFailCount: 0,
      gracePeriodEnd: null,
      paymentRetryAt: null,
      // Clear cancellation fields
      cancelledAt: null,
      cancellationReason: null,
      cancellationFeedback: null,
    },
  });

  // Update tenant
  await db.tenant.update({
    where: { id: subscription.tenantId },
    data: {
      status: 'active',
      isActive: true,
      plan: tier,
      suspendedAt: null,
      suspensionReason: null,
      cancelledAt: null,
    },
  });

  // Record event
  await recordSubscriptionEvent({
    subscriptionId,
    tenantId: subscription.tenantId,
    eventType: 'recovered',
    fromStatus: 'expired',
    toStatus: 'active',
    metadata: {
      type: 'expiry_recovery',
      tier,
      cycle,
      amountBDT,
      paymentId: payment.id,
      periodStart: formatDateISO(now),
      periodEnd: formatDateISO(newPeriodEnd),
    },
    performedBy,
  });

  return {
    success: true,
    subscriptionId,
    tenantId: subscription.tenantId,
    newPeriodEnd,
    recoveredTier: tier,
  };
}

// --- scheduleExpiryProcessing ---

/**
 * Queue subscriptions that are due for expiry processing
 * Returns a list of subscriptions that need to be processed
 * Useful for a cron job to know what to process
 */
export async function scheduleExpiryProcessing(): Promise<ScheduleResult> {
  const now = new Date();
  const subscriptions: ScheduleResult['subscriptions'] = [];

  // 1. Active subscriptions past period end without auto-renew
  const noAutoRenewExpiring = await db.subscription.findMany({
    where: {
      status: 'active',
      autoRenew: false,
      currentPeriodEnd: { lte: now },
    },
  });

  for (const sub of noAutoRenewExpiring) {
    subscriptions.push({
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      reason: 'period_ended_no_autorenew',
      processAt: formatDateISO(now),
    });
  }

  // 2. Cancelled subscriptions past endsAt
  const cancelledExpiring = await db.subscription.findMany({
    where: {
      status: 'cancelled',
      endsAt: { lte: now },
    },
  });

  for (const sub of cancelledExpiring) {
    subscriptions.push({
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      reason: 'cancelled_period_ended',
      processAt: formatDateISO(now),
    });
  }

  // 3. Expired subscriptions past data retention (need downgrade)
  const retentionExpiring = await db.subscription.findMany({
    where: {
      status: 'expired',
      dataRetentionEnd: { lte: now },
      downgradedAt: null,
    },
  });

  for (const sub of retentionExpiring) {
    subscriptions.push({
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      reason: 'data_retention_ended',
      processAt: formatDateISO(sub.dataRetentionEnd || now),
    });
  }

  // 4. Past_due with grace period expired
  const gracePeriodExpired = await db.subscription.findMany({
    where: {
      status: 'past_due',
      gracePeriodEnd: { lte: now },
    },
  });

  for (const sub of gracePeriodExpired) {
    subscriptions.push({
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      reason: 'grace_period_expired',
      processAt: formatDateISO(sub.gracePeriodEnd || now),
    });
  }

  // 5. Upcoming expiries (within next 3 days) — for notifications
  const threeDaysFromNow = addDays(now, 3);
  const upcomingExpiries = await db.subscription.findMany({
    where: {
      status: 'active',
      autoRenew: false,
      currentPeriodEnd: {
        gt: now,
        lte: threeDaysFromNow,
      },
    },
  });

  for (const sub of upcomingExpiries) {
    subscriptions.push({
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      reason: 'upcoming_expiry_notification',
      processAt: formatDateISO(sub.currentPeriodEnd || now),
    });
  }

  return {
    scheduled: subscriptions.length,
    subscriptions,
  };
}

// --- processExpiryBatch ---

/**
 * Batch process all subscriptions that need expiry handling
 * Called by a cron job to process:
 * 1. Active subscriptions past period end → expire
 * 2. Cancelled subscriptions past endsAt → expire
 * 3. Expired subscriptions past data retention → downgrade
 * 4. Past_due subscriptions past grace period → suspend/expire
 */
export async function processExpiryBatch(): Promise<BatchExpiryResult> {
  const now = new Date();
  const results: BatchExpiryResult['results'] = [];

  // 1. Active subscriptions past period end without auto-renew → expire
  const noAutoRenewExpiring = await db.subscription.findMany({
    where: {
      status: 'active',
      autoRenew: false,
      currentPeriodEnd: { lte: now },
    },
  });

  for (const sub of noAutoRenewExpiring) {
    try {
      const result = await expireSubscription(sub.id, 'period_ended_no_autorenew');
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'expire_no_autorenew',
        success: result.success,
        error: result.error,
      });
    } catch (err) {
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'expire_no_autorenew',
        success: false,
        error: String(err),
      });
    }
  }

  // 2. Cancelled subscriptions past endsAt → expire
  const cancelledExpiring = await db.subscription.findMany({
    where: {
      status: 'cancelled',
      endsAt: { lte: now },
    },
  });

  for (const sub of cancelledExpiring) {
    try {
      const result = await expireSubscription(sub.id, 'cancelled_period_ended');
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'expire_cancelled',
        success: result.success,
        error: result.error,
      });
    } catch (err) {
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'expire_cancelled',
        success: false,
        error: String(err),
      });
    }
  }

  // 3. Past_due subscriptions past grace period → expire or suspend
  const gracePeriodExpired = await db.subscription.findMany({
    where: {
      status: 'past_due',
      gracePeriodEnd: { lte: now },
    },
  });

  for (const sub of gracePeriodExpired) {
    try {
      // If max retries exceeded → expire
      // Otherwise → suspend (handled by processGracePeriodExpiry in engine.ts)
      if (sub.paymentFailCount >= 3) {
        const result = await expireSubscription(sub.id, 'grace_period_expired_max_retries');
        results.push({
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          action: 'expire_grace_period',
          success: result.success,
          error: result.error,
        });
      } else {
        // Suspend the subscription
        await db.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'suspended',
            gracePeriodEnd: null,
          },
        });
        await db.tenant.update({
          where: { id: sub.tenantId },
          data: {
            status: 'suspended',
            isActive: false,
            suspendedAt: now,
            suspensionReason: 'subscription_past_due',
          },
        });
        await recordSubscriptionEvent({
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          eventType: 'grace_period_ended',
          fromStatus: 'past_due',
          toStatus: 'suspended',
          metadata: { reason: 'grace_period_expired' },
        });
        results.push({
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          action: 'suspend_grace_period',
          success: true,
        });
      }
    } catch (err) {
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'grace_period_process',
        success: false,
        error: String(err),
      });
    }
  }

  // 4. Expired subscriptions past data retention → downgrade to starter
  const retentionExpired = await db.subscription.findMany({
    where: {
      status: 'expired',
      dataRetentionEnd: { lte: now },
      downgradedAt: null,
    },
  });

  for (const sub of retentionExpired) {
    try {
      const result = await downgradeExpiredSubscription(sub.id);
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'downgrade_post_expiry',
        success: result.success,
        error: result.error,
      });
    } catch (err) {
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'downgrade_post_expiry',
        success: false,
        error: String(err),
      });
    }
  }

  // 5. Trial subscriptions past trial end → suspend (not expire, but related)
  const expiredTrials = await db.subscription.findMany({
    where: {
      status: 'trial',
      trialEndsAt: { lte: now },
    },
  });

  for (const sub of expiredTrials) {
    try {
      await db.subscription.update({
        where: { id: sub.id },
        data: { status: 'suspended' },
      });
      await db.tenant.update({
        where: { id: sub.tenantId },
        data: {
          status: 'suspended',
          isActive: false,
          suspendedAt: now,
          suspensionReason: 'trial_expired',
        },
      });
      await recordSubscriptionEvent({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        eventType: 'trial_expired',
        fromStatus: 'trial',
        toStatus: 'suspended',
        metadata: { reason: 'trial_period_ended' },
      });
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'trial_expired_suspend',
        success: true,
      });
    } catch (err) {
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'trial_expired_suspend',
        success: false,
        error: String(err),
      });
    }
  }

  return {
    processed: results.length,
    results,
  };
}
