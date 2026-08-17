// ============================================
// TrimedCast - Subscription Lifecycle Engine
// Core subscription state machine with BDT pricing
// Session 14: Subscription Management + Renewal + Expiry
// ============================================

import { db } from '@/lib/db';

// --- BDT Tier Pricing (Bangladesh Taka) ---

export type TierSlug = 'starter' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'suspended';

export interface TierPricing {
  slug: TierSlug;
  name: string;
  monthlyBDT: number;
  yearlyBDT: number;
  yearlyDiscountPercent: number;
  yearlyDiscountedBDT: number;
}

/**
 * BDT Tier Pricing — exact values per specification
 * Starter:       ৳2,400/mo   ৳28,800/yr (17% off = ৳23,904)
 * Professional:  ৳6,900/mo   ৳82,800/yr (17% off = ৳68,724)
 * Enterprise:   ৳17,400/mo  ৳208,800/yr (17% off = ৳173,304)
 */
export const TIER_PRICING: Record<TierSlug, TierPricing> = {
  starter: {
    slug: 'starter',
    name: 'Starter',
    monthlyBDT: 2400,
    yearlyBDT: 28800,
    yearlyDiscountPercent: 17,
    yearlyDiscountedBDT: 23904,
  },
  professional: {
    slug: 'professional',
    name: 'Professional',
    monthlyBDT: 6900,
    yearlyBDT: 82800,
    yearlyDiscountPercent: 17,
    yearlyDiscountedBDT: 68724,
  },
  enterprise: {
    slug: 'enterprise',
    name: 'Enterprise',
    monthlyBDT: 17400,
    yearlyBDT: 208800,
    yearlyDiscountPercent: 17,
    yearlyDiscountedBDT: 173304,
  },
};

// --- Constants ---

export const GRACE_PERIOD_DAYS = 7;
export const DATA_RETENTION_DAYS = 30;
export const MAX_PAYMENT_RETRIES = 3;

// Exponential backoff delays in days: 1d, 2d, 4d
export const PAYMENT_RETRY_DELAYS = [1, 2, 4];

// --- Date Helpers ---

/**
 * Format a Date to ISO date string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Get the number of days between two dates (rounded down)
 */
export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Get the price for a tier and billing cycle in BDT
 */
export function getTierPrice(tier: TierSlug, cycle: BillingCycle): number {
  const pricing = TIER_PRICING[tier];
  if (!pricing) throw new Error(`Unknown tier: ${tier}`);
  return cycle === 'monthly' ? pricing.monthlyBDT : pricing.yearlyDiscountedBDT;
}

/**
 * Calculate next period end date based on billing cycle
 */
export function calculatePeriodEnd(startDate: Date, cycle: BillingCycle): Date {
  if (cycle === 'monthly') {
    return new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate());
  }
  // Yearly
  return new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
}

// --- Subscription Event Logging ---

export interface RecordEventParams {
  subscriptionId: string;
  tenantId: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromTier?: string | null;
  toTier?: string | null;
  metadata?: Record<string, unknown> | null;
  performedBy?: string | null;
}

/**
 * Record a subscription lifecycle event to the SubscriptionEvent table
 */
export async function recordSubscriptionEvent(params: RecordEventParams): Promise<string> {
  const event = await db.subscriptionEvent.create({
    data: {
      tenantId: params.tenantId,
      subscriptionId: params.subscriptionId,
      eventType: params.eventType,
      fromStatus: params.fromStatus ?? null,
      toStatus: params.toStatus ?? null,
      fromTier: params.fromTier ?? null,
      toTier: params.toTier ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      performedBy: params.performedBy ?? null,
    },
  });

  return event.id;
}

// --- Process: Subscription Renewal ---

export interface RenewalResult {
  success: boolean;
  subscriptionId: string;
  action: string;
  newPeriodStart?: Date;
  newPeriodEnd?: Date;
  error?: string;
}

/**
 * Process auto-renewal when a subscription period ends
 * - Creates a payment record
 * - Updates subscription period dates
 * - Records the lifecycle event
 */
export async function processSubscriptionRenewal(
  subscriptionId: string,
  performedBy?: string
): Promise<RenewalResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return { success: false, subscriptionId, action: 'renewal', error: 'Subscription not found' };
  }

  // Only active or past_due subscriptions can be renewed
  if (subscription.status !== 'active' && subscription.status !== 'past_due') {
    return {
      success: false,
      subscriptionId,
      action: 'renewal',
      error: `Cannot renew subscription in '${subscription.status}' status`,
    };
  }

  const now = new Date();
  const cycle = subscription.billingCycle as BillingCycle;
  const tier = subscription.tier as TierSlug;
  const amountBDT = getTierPrice(tier, cycle);
  const newPeriodStart = now;
  const newPeriodEnd = calculatePeriodEnd(now, cycle);

  // Create payment record
  const payment = await db.subscriptionPayment.create({
    data: {
      tenantId: subscription.tenantId,
      amount: amountBDT,
      currency: 'BDT',
      method: subscription.tenant.pmType || 'card',
      status: 'completed',
      periodStart: newPeriodStart,
      periodEnd: newPeriodEnd,
      metadata: JSON.stringify({ type: 'auto_renewal', tier, cycle }),
    },
  });

  // Update subscription
  const updatedSub = await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'active',
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
      lastPaymentAt: now,
      nextPaymentAt: newPeriodEnd,
      paymentFailCount: 0,
      gracePeriodEnd: null,
      paymentRetryAt: null,
      lastRenewalAttempt: now,
      unitAmount: amountBDT,
    },
  });

  // Update tenant status to active
  await db.tenant.update({
    where: { id: subscription.tenantId },
    data: {
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
    eventType: 'renewed',
    fromStatus: subscription.status,
    toStatus: 'active',
    metadata: {
      amountBDT,
      cycle,
      tier,
      paymentId: payment.id,
      periodStart: formatDateISO(newPeriodStart),
      periodEnd: formatDateISO(newPeriodEnd),
    },
    performedBy,
  });

  return {
    success: true,
    subscriptionId,
    action: 'renewal',
    newPeriodStart,
    newPeriodEnd,
  };
}

// --- Process: Payment Failure ---

export interface PaymentFailureResult {
  success: boolean;
  subscriptionId: string;
  action: string;
  failCount: number;
  gracePeriodEnd?: Date;
  retryAt?: Date;
  error?: string;
}

/**
 * Handle a failed payment:
 * - Increment fail count
 * - Set 7-day grace period on first failure
 * - Schedule retry with exponential backoff
 * - Transition to past_due if currently active
 */
export async function processPaymentFailure(
  subscriptionId: string,
  reason?: string,
  performedBy?: string
): Promise<PaymentFailureResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return { success: false, subscriptionId, action: 'payment_failure', failCount: 0, error: 'Subscription not found' };
  }

  // Only active or past_due can have payment failures
  if (subscription.status !== 'active' && subscription.status !== 'past_due') {
    return {
      success: false,
      subscriptionId,
      action: 'payment_failure',
      failCount: subscription.paymentFailCount,
      error: `Cannot process payment failure for subscription in '${subscription.status}' status`,
    };
  }

  const now = new Date();
  const newFailCount = subscription.paymentFailCount + 1;
  const previousStatus = subscription.status as SubscriptionStatus;

  // Calculate grace period end (only set on first failure)
  const gracePeriodEnd = subscription.gracePeriodEnd ?? addDays(now, GRACE_PERIOD_DAYS);

  // Calculate next retry with exponential backoff
  let retryAt: Date | null = null;
  if (newFailCount <= MAX_PAYMENT_RETRIES) {
    const retryDelayDays = PAYMENT_RETRY_DELAYS[Math.min(newFailCount - 1, PAYMENT_RETRY_DELAYS.length - 1)];
    retryAt = addDays(now, retryDelayDays);
  }

  // Update subscription
  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'past_due',
      paymentFailCount: newFailCount,
      gracePeriodEnd,
      paymentRetryAt: retryAt,
      lastRenewalAttempt: now,
    },
  });

  // Update tenant status to past_due
  if (subscription.tenant.status !== 'past_due') {
    await db.tenant.update({
      where: { id: subscription.tenantId },
      data: {
        status: 'past_due',
      },
    });
  }

  // Record event
  await recordSubscriptionEvent({
    subscriptionId,
    tenantId: subscription.tenantId,
    eventType: 'payment_failed',
    fromStatus: previousStatus,
    toStatus: 'past_due',
    metadata: {
      failCount: newFailCount,
      gracePeriodEnd: formatDateISO(gracePeriodEnd),
      retryAt: retryAt ? formatDateISO(retryAt) : null,
      reason: reason || 'payment_declined',
      maxRetriesExceeded: newFailCount >= MAX_PAYMENT_RETRIES,
    },
    performedBy,
  });

  return {
    success: true,
    subscriptionId,
    action: 'payment_failure',
    failCount: newFailCount,
    gracePeriodEnd,
    retryAt: retryAt ?? undefined,
  };
}

// --- Process: Payment Recovery ---

export interface PaymentRecoveryResult {
  success: boolean;
  subscriptionId: string;
  action: string;
  error?: string;
}

/**
 * Recover from past_due after a successful payment
 * - Reset fail count, clear grace period
 * - Transition back to active
 */
export async function processPaymentRecovery(
  subscriptionId: string,
  performedBy?: string
): Promise<PaymentRecoveryResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return { success: false, subscriptionId, action: 'payment_recovery', error: 'Subscription not found' };
  }

  // Only past_due subscriptions can be recovered
  if (subscription.status !== 'past_due') {
    return {
      success: false,
      subscriptionId,
      action: 'payment_recovery',
      error: `Cannot recover subscription in '${subscription.status}' status — only past_due can be recovered`,
    };
  }

  const now = new Date();
  const cycle = subscription.billingCycle as BillingCycle;
  const newPeriodEnd = calculatePeriodEnd(now, cycle);

  // Update subscription
  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'active',
      paymentFailCount: 0,
      gracePeriodEnd: null,
      paymentRetryAt: null,
      lastPaymentAt: now,
      nextPaymentAt: newPeriodEnd,
      currentPeriodStart: now,
      currentPeriodEnd: newPeriodEnd,
    },
  });

  // Update tenant status
  await db.tenant.update({
    where: { id: subscription.tenantId },
    data: {
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
    eventType: 'payment_recovered',
    fromStatus: 'past_due',
    toStatus: 'active',
    metadata: {
      recoveredAt: formatDateISO(now),
      newPeriodEnd: formatDateISO(newPeriodEnd),
    },
    performedBy,
  });

  return { success: true, subscriptionId, action: 'payment_recovery' };
}

// --- Process: Grace Period Expiry ---

export interface GracePeriodExpiryResult {
  success: boolean;
  subscriptionId: string;
  action: string;
  newStatus: string;
  error?: string;
}

/**
 * After 7-day grace period expires without payment:
 * - Suspend the subscription
 * - If max retries exceeded, expire the subscription
 */
export async function processGracePeriodExpiry(
  subscriptionId: string,
  performedBy?: string
): Promise<GracePeriodExpiryResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return { success: false, subscriptionId, action: 'grace_period_expiry', newStatus: '', error: 'Subscription not found' };
  }

  if (subscription.status !== 'past_due') {
    return {
      success: false,
      subscriptionId,
      action: 'grace_period_expiry',
      newStatus: subscription.status,
      error: `Grace period expiry only applies to past_due subscriptions, not '${subscription.status}'`,
    };
  }

  const now = new Date();

  // If max retries exceeded, expire the subscription
  if (subscription.paymentFailCount >= MAX_PAYMENT_RETRIES) {
    const dataRetentionEnd = addDays(now, DATA_RETENTION_DAYS);

    await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'expired',
        expiredAt: now,
        dataRetentionEnd,
        gracePeriodEnd: null,
        paymentRetryAt: null,
        endsAt: now,
      },
    });

    await db.tenant.update({
      where: { id: subscription.tenantId },
      data: {
        status: 'suspended',
        isActive: false,
        suspendedAt: now,
        suspensionReason: 'subscription_expired',
      },
    });

    await recordSubscriptionEvent({
      subscriptionId,
      tenantId: subscription.tenantId,
      eventType: 'expired',
      fromStatus: 'past_due',
      toStatus: 'expired',
      metadata: {
        reason: 'grace_period_expired_max_retries',
        dataRetentionEnd: formatDateISO(dataRetentionEnd),
        failCount: subscription.paymentFailCount,
      },
      performedBy,
    });

    return { success: true, subscriptionId, action: 'grace_period_expiry', newStatus: 'expired' };
  }

  // Otherwise suspend and keep for retry
  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'suspended',
      gracePeriodEnd: null,
    },
  });

  await db.tenant.update({
    where: { id: subscription.tenantId },
    data: {
      status: 'suspended',
      isActive: false,
      suspendedAt: now,
      suspensionReason: 'subscription_past_due',
    },
  });

  await recordSubscriptionEvent({
    subscriptionId,
    tenantId: subscription.tenantId,
    eventType: 'grace_period_ended',
    fromStatus: 'past_due',
    toStatus: 'suspended',
    metadata: {
      reason: 'grace_period_expired',
      failCount: subscription.paymentFailCount,
    },
    performedBy,
  });

  return { success: true, subscriptionId, action: 'grace_period_expiry', newStatus: 'suspended' };
}

// --- Process: Subscription Expiry ---

export interface ExpiryResult {
  success: boolean;
  subscriptionId: string;
  action: string;
  dataRetentionEnd?: Date;
  error?: string;
}

/**
 * Mark a subscription as expired and set data retention end date (30 days)
 * After data retention, the subscription will be downgraded to starter
 */
export async function processSubscriptionExpiry(
  subscriptionId: string,
  reason?: string,
  performedBy?: string
): Promise<ExpiryResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return { success: false, subscriptionId, action: 'expiry', error: 'Subscription not found' };
  }

  // Already expired — no-op
  if (subscription.status === 'expired') {
    return { success: false, subscriptionId, action: 'expiry', error: 'Subscription is already expired' };
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

  // Update tenant
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
    },
    performedBy,
  });

  return {
    success: true,
    subscriptionId,
    action: 'expiry',
    dataRetentionEnd,
  };
}

// --- Process: Subscription Downgrade ---

export interface DowngradeResult {
  success: boolean;
  subscriptionId: string;
  action: string;
  fromTier: string;
  toTier: string;
  error?: string;
}

/**
 * Downgrade an expired subscription to the starter tier
 * Called after the 30-day data retention period ends
 */
export async function processSubscriptionDowngrade(
  subscriptionId: string,
  targetTier: TierSlug = 'starter',
  performedBy?: string
): Promise<DowngradeResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return { success: false, subscriptionId, action: 'downgrade', fromTier: '', toTier: targetTier, error: 'Subscription not found' };
  }

  // Only expired subscriptions can be downgraded
  if (subscription.status !== 'expired') {
    return {
      success: false,
      subscriptionId,
      action: 'downgrade',
      fromTier: subscription.tier,
      toTier: targetTier,
      error: `Cannot downgrade subscription in '${subscription.status}' status — only expired can be downgraded`,
    };
  }

  // Already at target tier — no-op
  if (subscription.tier === targetTier) {
    return {
      success: false,
      subscriptionId,
      action: 'downgrade',
      fromTier: subscription.tier,
      toTier: targetTier,
      error: 'Subscription is already at the target tier',
    };
  }

  const now = new Date();
  const fromTier = subscription.tier;
  const newPrice = getTierPrice(targetTier, 'monthly');

  // Update subscription
  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      tier: targetTier,
      unitAmount: newPrice,
      downgradedAt: now,
      status: 'active',
      expiredAt: null,
      dataRetentionEnd: null,
      autoRenew: true,
      currentPeriodStart: now,
      currentPeriodEnd: calculatePeriodEnd(now, 'monthly'),
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
      newPriceBDT: newPrice,
    },
    performedBy,
  });

  return {
    success: true,
    subscriptionId,
    action: 'downgrade',
    fromTier,
    toTier: targetTier,
  };
}

// --- Process: Plan Change (Upgrade / Downgrade) ---

export interface PlanChangeResult {
  success: boolean;
  subscriptionId: string;
  action: string;
  fromTier: string;
  toTier: string;
  prorationCredit?: number;
  prorationCharge?: number;
  effectiveDate?: Date;
  error?: string;
}

/**
 * Change subscription plan with proration
 * - Upgrades: take effect immediately, charge prorated difference
 * - Downgrades: take effect at end of current period, credit prorated difference
 */
export async function processPlanChange(
  subscriptionId: string,
  newTier: TierSlug,
  newCycle?: BillingCycle,
  performedBy?: string
): Promise<PlanChangeResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return { success: false, subscriptionId, action: 'plan_change', fromTier: '', toTier: newTier, error: 'Subscription not found' };
  }

  // Only active or trial subscriptions can change plans
  if (subscription.status !== 'active' && subscription.status !== 'trial') {
    return {
      success: false,
      subscriptionId,
      action: 'plan_change',
      fromTier: subscription.tier,
      toTier: newTier,
      error: `Cannot change plan for subscription in '${subscription.status}' status`,
    };
  }

  const fromTier = subscription.tier as TierSlug;
  const toTier = newTier;
  const cycle = newCycle || (subscription.billingCycle as BillingCycle);

  // Same tier — no-op unless cycle changed
  if (fromTier === toTier && cycle === subscription.billingCycle) {
    return {
      success: false,
      subscriptionId,
      action: 'plan_change',
      fromTier,
      toTier,
      error: 'Subscription is already on this plan and billing cycle',
    };
  }

  const now = new Date();
  const currentPrice = getTierPrice(fromTier, subscription.billingCycle as BillingCycle);
  const newPrice = getTierPrice(toTier, cycle);

  // Determine if this is an upgrade or downgrade based on monthly price
  const currentMonthly = fromTier === 'starter' ? 2400 : fromTier === 'professional' ? 6900 : 17400;
  const newMonthly = toTier === 'starter' ? 2400 : toTier === 'professional' ? 6900 : 17400;
  const isUpgrade = newMonthly > currentMonthly;

  // Calculate proration
  let prorationCredit = 0;
  let prorationCharge = 0;
  let effectiveDate: Date;

  if (isUpgrade) {
    // Immediate upgrade: charge prorated difference
    effectiveDate = now;
    if (subscription.currentPeriodEnd) {
      const remainingDays = daysBetween(now, subscription.currentPeriodEnd);
      const totalDays = daysBetween(
        subscription.currentPeriodStart || now,
        subscription.currentPeriodEnd
      );
      if (totalDays > 0) {
        const dailyRate = currentPrice / totalDays;
        const newDailyRate = newPrice / totalDays;
        prorationCharge = Math.round((newDailyRate - dailyRate) * remainingDays);
      }
    }

    // Apply upgrade immediately
    await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        tier: toTier,
        billingCycle: cycle,
        unitAmount: newPrice,
        currentPeriodStart: now,
        currentPeriodEnd: calculatePeriodEnd(now, cycle),
        nextPaymentAt: calculatePeriodEnd(now, cycle),
      },
    });

    await db.tenant.update({
      where: { id: subscription.tenantId },
      data: { plan: toTier },
    });
  } else {
    // Downgrade: takes effect at end of current period
    effectiveDate = subscription.currentPeriodEnd || now;

    if (subscription.currentPeriodEnd) {
      const remainingDays = daysBetween(now, subscription.currentPeriodEnd);
      const totalDays = daysBetween(
        subscription.currentPeriodStart || now,
        subscription.currentPeriodEnd
      );
      if (totalDays > 0) {
        const dailyRate = currentPrice / totalDays;
        const newDailyRate = newPrice / totalDays;
        prorationCredit = Math.round((dailyRate - newDailyRate) * remainingDays);
      }
    }

    // Schedule downgrade at period end (store in metadata)
    await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        metadata: JSON.stringify({
          pendingTierChange: toTier,
          pendingCycleChange: cycle,
          effectiveDate: formatDateISO(effectiveDate),
        }),
      },
    });
  }

  // Record event
  await recordSubscriptionEvent({
    subscriptionId,
    tenantId: subscription.tenantId,
    eventType: 'plan_changed',
    fromStatus: subscription.status,
    toStatus: subscription.status,
    fromTier,
    toTier,
    metadata: {
      changeType: isUpgrade ? 'upgrade' : 'downgrade',
      fromCycle: subscription.billingCycle,
      toCycle: cycle,
      fromPriceBDT: currentPrice,
      toPriceBDT: newPrice,
      prorationCredit,
      prorationCharge,
      effectiveDate: formatDateISO(effectiveDate),
      immediate: isUpgrade,
    },
    performedBy,
  });

  return {
    success: true,
    subscriptionId,
    action: 'plan_change',
    fromTier,
    toTier,
    prorationCredit: prorationCredit || undefined,
    prorationCharge: prorationCharge || undefined,
    effectiveDate,
  };
}

// --- Process: Cancellation ---

export interface CancellationResult {
  success: boolean;
  subscriptionId: string;
  action: string;
  endsAt?: Date;
  error?: string;
}

/**
 * Cancel a subscription with reason and feedback
 * - Sets endsAt to end of current billing period
 * - Tenant retains access until endsAt
 */
export async function processCancellation(
  subscriptionId: string,
  reason?: string,
  feedback?: string,
  performedBy?: string
): Promise<CancellationResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return { success: false, subscriptionId, action: 'cancellation', error: 'Subscription not found' };
  }

  // Already cancelled
  if (subscription.status === 'cancelled') {
    return { success: false, subscriptionId, action: 'cancellation', error: 'Subscription is already cancelled' };
  }

  // Only active, past_due, or trial can be cancelled
  if (subscription.status !== 'active' && subscription.status !== 'past_due' && subscription.status !== 'trial') {
    return {
      success: false,
      subscriptionId,
      action: 'cancellation',
      error: `Cannot cancel subscription in '${subscription.status}' status`,
    };
  }

  const now = new Date();
  const previousStatus = subscription.status as SubscriptionStatus;

  // End at current period end (or immediately if trial)
  const endsAt = subscription.status === 'trial'
    ? now
    : subscription.currentPeriodEnd || addDays(now, 30);

  // Update subscription
  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'cancelled',
      cancelledAt: now,
      endsAt,
      autoRenew: false,
      cancellationReason: reason || 'user_request',
      cancellationFeedback: feedback || null,
      gracePeriodEnd: null,
      paymentRetryAt: null,
    },
  });

  // Update tenant — access continues until endsAt
  await db.tenant.update({
    where: { id: subscription.tenantId },
    data: {
      status: 'cancelled',
      cancelledAt: now,
    },
  });

  // Record event
  await recordSubscriptionEvent({
    subscriptionId,
    tenantId: subscription.tenantId,
    eventType: 'cancelled',
    fromStatus: previousStatus,
    toStatus: 'cancelled',
    metadata: {
      reason: reason || 'user_request',
      feedback: feedback || null,
      endsAt: formatDateISO(endsAt),
      accessUntil: formatDateISO(endsAt),
    },
    performedBy,
  });

  return {
    success: true,
    subscriptionId,
    action: 'cancellation',
    endsAt,
  };
}

// --- Process: Resume ---

export interface ResumeResult {
  success: boolean;
  subscriptionId: string;
  action: string;
  newPeriodEnd?: Date;
  error?: string;
}

/**
 * Resume a cancelled subscription before the period end
 * - Re-enables auto-renew
 * - Clears cancellation fields
 */
export async function processResume(
  subscriptionId: string,
  performedBy?: string
): Promise<ResumeResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return { success: false, subscriptionId, action: 'resume', error: 'Subscription not found' };
  }

  // Only cancelled subscriptions can be resumed
  if (subscription.status !== 'cancelled') {
    return {
      success: false,
      subscriptionId,
      action: 'resume',
      error: `Cannot resume subscription in '${subscription.status}' status — only cancelled can be resumed`,
    };
  }

  // Check if period has already ended
  const now = new Date();
  if (subscription.endsAt && now > subscription.endsAt) {
    return {
      success: false,
      subscriptionId,
      action: 'resume',
      error: 'Cannot resume — subscription period has already ended',
    };
  }

  const cycle = subscription.billingCycle as BillingCycle;
  const newPeriodEnd = subscription.currentPeriodEnd || calculatePeriodEnd(now, cycle);

  // Update subscription
  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'active',
      autoRenew: true,
      cancelledAt: null,
      endsAt: null,
      cancellationReason: null,
      cancellationFeedback: null,
      nextPaymentAt: newPeriodEnd,
    },
  });

  // Update tenant
  await db.tenant.update({
    where: { id: subscription.tenantId },
    data: {
      status: 'active',
      isActive: true,
      cancelledAt: null,
      suspendedAt: null,
      suspensionReason: null,
    },
  });

  // Record event
  await recordSubscriptionEvent({
    subscriptionId,
    tenantId: subscription.tenantId,
    eventType: 'resumed',
    fromStatus: 'cancelled',
    toStatus: 'active',
    metadata: {
      resumedAt: formatDateISO(now),
      periodEnd: formatDateISO(newPeriodEnd),
    },
    performedBy,
  });

  return {
    success: true,
    subscriptionId,
    action: 'resume',
    newPeriodEnd,
  };
}

// --- Get: Subscription Status ---

export interface SubscriptionStatusInfo {
  id: string;
  tenantId: string;
  tier: string;
  status: string;
  billingCycle: string;
  autoRenew: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  endsAt: string | null;
  expiredAt: string | null;
  downgradedAt: string | null;
  dataRetentionEnd: string | null;
  unitAmount: number | null;
  currency: string;
  paymentFailCount: number;
  gracePeriodEnd: string | null;
  nextPaymentAt: string | null;
  lastPaymentAt: string | null;
  // Computed fields
  daysUntilExpiry: number | null;
  inGracePeriod: boolean;
  gracePeriodDaysRemaining: number | null;
  isExpired: boolean;
  isActive: boolean;
  isCancelled: boolean;
  isPastDue: boolean;
  isTrial: boolean;
  nextAction: string | null; // What needs to happen next
}

/**
 * Get full subscription status with computed fields
 */
export async function getSubscriptionStatus(
  subscriptionId: string
): Promise<SubscriptionStatusInfo | null> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) return null;

  const now = new Date();

  // Compute days until expiry
  let daysUntilExpiry: number | null = null;
  if (subscription.endsAt) {
    daysUntilExpiry = daysBetween(now, subscription.endsAt);
  } else if (subscription.currentPeriodEnd) {
    daysUntilExpiry = daysBetween(now, subscription.currentPeriodEnd);
  }

  // Compute grace period info
  const inGracePeriod = subscription.status === 'past_due' &&
    subscription.gracePeriodEnd !== null &&
    now < subscription.gracePeriodEnd;

  const gracePeriodDaysRemaining = inGracePeriod && subscription.gracePeriodEnd
    ? daysBetween(now, subscription.gracePeriodEnd)
    : null;

  // Determine next action
  let nextAction: string | null = null;
  switch (subscription.status) {
    case 'trial':
      if (subscription.trialEndsAt && now >= subscription.trialEndsAt) {
        nextAction = 'activate_or_suspend';
      }
      break;
    case 'active':
      if (subscription.currentPeriodEnd && now >= subscription.currentPeriodEnd) {
        nextAction = subscription.autoRenew ? 'renew' : 'expire';
      }
      break;
    case 'past_due':
      if (subscription.gracePeriodEnd && now >= subscription.gracePeriodEnd) {
        nextAction = 'suspend_or_expire';
      } else if (subscription.paymentRetryAt && now >= subscription.paymentRetryAt) {
        nextAction = 'retry_payment';
      }
      break;
    case 'cancelled':
      if (subscription.endsAt && now >= subscription.endsAt) {
        nextAction = 'expire';
      }
      break;
    case 'expired':
      if (subscription.dataRetentionEnd && now >= subscription.dataRetentionEnd) {
        nextAction = 'downgrade';
      }
      break;
    case 'suspended':
      nextAction = 'reactivate_or_expire';
      break;
  }

  return {
    id: subscription.id,
    tenantId: subscription.tenantId,
    tier: subscription.tier,
    status: subscription.status,
    billingCycle: subscription.billingCycle,
    autoRenew: subscription.autoRenew,
    currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
    trialEndsAt: subscription.trialEndsAt?.toISOString() || null,
    cancelledAt: subscription.cancelledAt?.toISOString() || null,
    endsAt: subscription.endsAt?.toISOString() || null,
    expiredAt: subscription.expiredAt?.toISOString() || null,
    downgradedAt: subscription.downgradedAt?.toISOString() || null,
    dataRetentionEnd: subscription.dataRetentionEnd?.toISOString() || null,
    unitAmount: subscription.unitAmount,
    currency: subscription.currency,
    paymentFailCount: subscription.paymentFailCount,
    gracePeriodEnd: subscription.gracePeriodEnd?.toISOString() || null,
    nextPaymentAt: subscription.nextPaymentAt?.toISOString() || null,
    lastPaymentAt: subscription.lastPaymentAt?.toISOString() || null,
    // Computed
    daysUntilExpiry,
    inGracePeriod,
    gracePeriodDaysRemaining,
    isExpired: subscription.status === 'expired',
    isActive: subscription.status === 'active',
    isCancelled: subscription.status === 'cancelled',
    isPastDue: subscription.status === 'past_due',
    isTrial: subscription.status === 'trial',
    nextAction,
  };
}

// --- Get: Subscription Timeline ---

export interface TimelineEvent {
  id: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  fromTier: string | null;
  toTier: string | null;
  metadata: Record<string, unknown> | null;
  performedBy: string | null;
  createdAt: string;
}

/**
 * Get all SubscriptionEvents for a subscription (timeline)
 */
export async function getSubscriptionTimeline(
  subscriptionId: string
): Promise<TimelineEvent[]> {
  const events = await db.subscriptionEvent.findMany({
    where: { subscriptionId },
    orderBy: { createdAt: 'desc' },
  });

  return events.map((event) => ({
    id: event.id,
    eventType: event.eventType,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    fromTier: event.fromTier,
    toTier: event.toTier,
    metadata: event.metadata ? (JSON.parse(event.metadata) as Record<string, unknown>) : null,
    performedBy: event.performedBy,
    createdAt: event.createdAt.toISOString(),
  }));
}

// --- Process: Batch Subscriptions (for cron) ---

export interface BatchProcessResult {
  processed: number;
  results: Array<{
    subscriptionId: string;
    tenantId: string;
    action: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Process all subscriptions that need attention (for cron job)
 * - Trials that expired
 * - Active subscriptions past period end needing renewal
 * - Past_due subscriptions past grace period
 * - Cancelled subscriptions past endsAt
 * - Expired subscriptions past data retention
 */
export async function processBatchSubscriptions(): Promise<BatchProcessResult> {
  const now = new Date();
  const results: BatchProcessResult['results'] = [];

  // 1. Expired trials
  const expiredTrials = await db.subscription.findMany({
    where: {
      status: 'trial',
      trialEndsAt: { lte: now },
    },
    include: { tenant: true },
  });

  for (const sub of expiredTrials) {
    try {
      // Suspend the tenant
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
      results.push({ subscriptionId: sub.id, tenantId: sub.tenantId, action: 'trial_expired', success: true });
    } catch (err) {
      results.push({ subscriptionId: sub.id, tenantId: sub.tenantId, action: 'trial_expired', success: false, error: String(err) });
    }
  }

  // 2. Active subscriptions past period end
  const expiredPeriods = await db.subscription.findMany({
    where: {
      status: 'active',
      currentPeriodEnd: { lte: now },
      autoRenew: true,
    },
  });

  for (const sub of expiredPeriods) {
    try {
      const renewalResult = await processSubscriptionRenewal(sub.id);
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'auto_renewal',
        success: renewalResult.success,
        error: renewalResult.error,
      });
    } catch (err) {
      results.push({ subscriptionId: sub.id, tenantId: sub.tenantId, action: 'auto_renewal', success: false, error: String(err) });
    }
  }

  // 3. Active subscriptions past period end WITHOUT auto-renew → expire
  const noAutoRenewExpiring = await db.subscription.findMany({
    where: {
      status: 'active',
      currentPeriodEnd: { lte: now },
      autoRenew: false,
    },
  });

  for (const sub of noAutoRenewExpiring) {
    try {
      const expiryResult = await processSubscriptionExpiry(sub.id, 'auto_renew_disabled');
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'expire_no_autorenew',
        success: expiryResult.success,
        error: expiryResult.error,
      });
    } catch (err) {
      results.push({ subscriptionId: sub.id, tenantId: sub.tenantId, action: 'expire_no_autorenew', success: false, error: String(err) });
    }
  }

  // 4. Past_due subscriptions past grace period
  const gracePeriodExpired = await db.subscription.findMany({
    where: {
      status: 'past_due',
      gracePeriodEnd: { lte: now },
    },
  });

  for (const sub of gracePeriodExpired) {
    try {
      const result = await processGracePeriodExpiry(sub.id);
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'grace_period_expiry',
        success: result.success,
        error: result.error,
      });
    } catch (err) {
      results.push({ subscriptionId: sub.id, tenantId: sub.tenantId, action: 'grace_period_expiry', success: false, error: String(err) });
    }
  }

  // 5. Cancelled subscriptions past endsAt → expire
  const cancelledExpired = await db.subscription.findMany({
    where: {
      status: 'cancelled',
      endsAt: { lte: now },
    },
  });

  for (const sub of cancelledExpired) {
    try {
      const result = await processSubscriptionExpiry(sub.id, 'cancelled_period_ended');
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'cancelled_expiry',
        success: result.success,
        error: result.error,
      });
    } catch (err) {
      results.push({ subscriptionId: sub.id, tenantId: sub.tenantId, action: 'cancelled_expiry', success: false, error: String(err) });
    }
  }

  // 6. Expired subscriptions past data retention → downgrade
  const dataRetentionExpired = await db.subscription.findMany({
    where: {
      status: 'expired',
      dataRetentionEnd: { lte: now },
      downgradedAt: null,
    },
  });

  for (const sub of dataRetentionExpired) {
    try {
      const result = await processSubscriptionDowngrade(sub.id);
      results.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        action: 'post_expiry_downgrade',
        success: result.success,
        error: result.error,
      });
    } catch (err) {
      results.push({ subscriptionId: sub.id, tenantId: sub.tenantId, action: 'post_expiry_downgrade', success: false, error: String(err) });
    }
  }

  return {
    processed: results.length,
    results,
  };
}
