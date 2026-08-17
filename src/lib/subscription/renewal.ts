// ============================================
// TrimedCast - Subscription Renewal Processing
// Auto-renewal, manual renewal, payment retry,
// renewal reminders, and proration calculations
// Session 14: Subscription Management + Renewal + Expiry
// ============================================

import { db } from '@/lib/db';
import {
  TierSlug,
  BillingCycle,
  SubscriptionStatus,
  TIER_PRICING,
  GRACE_PERIOD_DAYS,
  MAX_PAYMENT_RETRIES,
  PAYMENT_RETRY_DELAYS,
  DATA_RETENTION_DAYS,
  formatDateISO,
  addDays,
  daysBetween,
  getTierPrice,
  calculatePeriodEnd,
  recordSubscriptionEvent,
} from './engine';

// --- Configuration ---

/** Days before renewal to send a reminder */
const RENEWAL_REMINDER_DAYS = 7;

/** Simulate payment success in sandbox/demo mode (default: true) */
let sandboxMode = true;

/**
 * Enable or disable sandbox mode for payment simulation
 */
export function setSandboxMode(enabled: boolean): void {
  sandboxMode = enabled;
}

/**
 * Check if running in sandbox mode
 */
export function isSandboxMode(): boolean {
  return sandboxMode;
}

// --- Types ---

export interface RenewalAttemptResult {
  success: boolean;
  subscriptionId: string;
  tenantId: string;
  paymentId?: string;
  amountBDT?: number;
  newPeriodStart?: Date;
  newPeriodEnd?: Date;
  error?: string;
}

export interface RenewalReminderResult {
  shouldSend: boolean;
  subscriptionId: string;
  tenantId: string;
  daysUntilRenewal: number;
  reminderSent: boolean;
}

export interface AutoRenewalResult {
  processed: number;
  results: RenewalAttemptResult[];
}

export interface ManualRenewalResult {
  success: boolean;
  subscriptionId: string;
  paymentId?: string;
  amountBDT?: number;
  newPeriodEnd?: Date;
  error?: string;
}

export interface PaymentRetryResult {
  success: boolean;
  subscriptionId: string;
  retryNumber: number;
  nextRetryAt?: Date;
  maxRetriesReached: boolean;
  error?: string;
}

export interface RenewalStatusInfo {
  subscriptionId: string;
  tenantId: string;
  tier: string;
  billingCycle: string;
  autoRenew: boolean;
  nextRenewalDate: string | null;
  nextPaymentDate: string | null;
  lastPaymentDate: string | null;
  daysUntilRenewal: number | null;
  renewalReminderSent: boolean;
  paymentFailCount: number;
  inGracePeriod: boolean;
  gracePeriodEnd: string | null;
  amountBDT: number | null;
  currency: string;
}

export interface ProrationResult {
  currentTier: TierSlug;
  newTier: TierSlug;
  currentCycle: BillingCycle;
  newCycle: BillingCycle;
  currentPriceBDT: number;
  newPriceBDT: number;
  unusedDays: number;
  totalDaysInPeriod: number;
  creditBDT: number;       // Credit for unused portion of current plan
  chargeBDT: number;       // Charge for new plan (prorated)
  netAmountBDT: number;    // Net amount (charge - credit), positive = owe, negative = credit
  effectiveDate: string;
  isUpgrade: boolean;
}

// --- Simulated Payment ---

/**
 * Simulate a payment in sandbox mode
 * Returns true for success, false for failure
 * In sandbox: 90% success rate for demo realism
 */
function simulatePayment(): boolean {
  if (!sandboxMode) {
    // In production, this would call the real payment gateway
    // For now, throw to indicate production integration is needed
    throw new Error('Production payment gateway not configured — enable sandbox mode');
  }
  // 90% success rate in sandbox
  return Math.random() < 0.9;
}

// --- attemptRenewal ---

/**
 * Try to renew a subscription:
 * - Validates subscription is in a renewable state
 * - Simulates/Processes payment
 * - On success: creates payment record, updates subscription, records event
 * - On failure: calls processPaymentFailure
 */
export async function attemptRenewal(
  subscriptionId: string,
  performedBy?: string
): Promise<RenewalAttemptResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return { success: false, subscriptionId, tenantId: '', error: 'Subscription not found' };
  }

  // Validate status — only active or past_due can be renewed
  if (subscription.status !== 'active' && subscription.status !== 'past_due') {
    return {
      success: false,
      subscriptionId,
      tenantId: subscription.tenantId,
      error: `Cannot renew subscription in '${subscription.status}' status`,
    };
  }

  // Check auto-renew is enabled
  if (!subscription.autoRenew && subscription.status === 'active') {
    return {
      success: false,
      subscriptionId,
      tenantId: subscription.tenantId,
      error: 'Auto-renewal is disabled for this subscription',
    };
  }

  const now = new Date();
  const tier = subscription.tier as TierSlug;
  const cycle = subscription.billingCycle as BillingCycle;
  const amountBDT = getTierPrice(tier, cycle);
  const newPeriodStart = now;
  const newPeriodEnd = calculatePeriodEnd(now, cycle);

  // Attempt payment
  let paymentSuccess: boolean;
  try {
    paymentSuccess = simulatePayment();
  } catch (err) {
    return {
      success: false,
      subscriptionId,
      tenantId: subscription.tenantId,
      error: `Payment gateway error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!paymentSuccess) {
    // Payment failed — process failure
    const { processPaymentFailure } = await import('./engine');
    await processPaymentFailure(subscriptionId, 'renewal_payment_declined', performedBy);

    return {
      success: false,
      subscriptionId,
      tenantId: subscription.tenantId,
      error: 'Payment declined during renewal attempt',
    };
  }

  // Payment succeeded — create payment record
  const payment = await db.subscriptionPayment.create({
    data: {
      tenantId: subscription.tenantId,
      amount: amountBDT,
      currency: 'BDT',
      method: subscription.tenant.pmType || 'card',
      status: 'completed',
      periodStart: newPeriodStart,
      periodEnd: newPeriodEnd,
      metadata: JSON.stringify({
        type: subscription.status === 'past_due' ? 'recovery_renewal' : 'auto_renewal',
        tier,
        cycle,
        sandboxMode,
      }),
    },
  });

  // Update subscription
  const previousStatus = subscription.status;
  await db.subscription.update({
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
      renewalReminderSent: false,
      unitAmount: amountBDT,
    },
  });

  // Update tenant
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
    eventType: previousStatus === 'past_due' ? 'payment_recovered' : 'renewed',
    fromStatus: previousStatus,
    toStatus: 'active',
    metadata: {
      amountBDT,
      cycle,
      tier,
      paymentId: payment.id,
      periodStart: formatDateISO(newPeriodStart),
      periodEnd: formatDateISO(newPeriodEnd),
      sandboxMode,
    },
    performedBy,
  });

  return {
    success: true,
    subscriptionId,
    tenantId: subscription.tenantId,
    paymentId: payment.id,
    amountBDT,
    newPeriodStart,
    newPeriodEnd,
  };
}

// --- scheduleRenewalReminder ---

/**
 * Check if a renewal reminder should be sent (7 days before renewal)
 * Returns info about whether a reminder is due
 */
export async function scheduleRenewalReminder(
  subscriptionId: string
): Promise<RenewalReminderResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return { shouldSend: false, subscriptionId, tenantId: '', daysUntilRenewal: -1, reminderSent: false };
  }

  const now = new Date();
  const nextPayment = subscription.nextPaymentAt || subscription.currentPeriodEnd;

  if (!nextPayment) {
    return {
      shouldSend: false,
      subscriptionId,
      tenantId: subscription.tenantId,
      daysUntilRenewal: -1,
      reminderSent: subscription.renewalReminderSent,
    };
  }

  const daysUntilRenewal = daysBetween(now, nextPayment);

  // Send reminder if:
  // - Within RENEWAL_REMINDER_DAYS of next payment
  // - Haven't already sent a reminder for this cycle
  // - Subscription is active (not already past_due, cancelled, etc.)
  const shouldSend =
    daysUntilRenewal <= RENEWAL_REMINDER_DAYS &&
    daysUntilRenewal >= 0 &&
    !subscription.renewalReminderSent &&
    subscription.status === 'active' &&
    subscription.autoRenew;

  // Mark reminder as sent
  if (shouldSend) {
    await db.subscription.update({
      where: { id: subscriptionId },
      data: { renewalReminderSent: true },
    });
  }

  return {
    shouldSend,
    subscriptionId,
    tenantId: subscription.tenantId,
    daysUntilRenewal,
    reminderSent: subscription.renewalReminderSent,
  };
}

// --- processAutoRenewal ---

/**
 * Process auto-renewal for all subscriptions approaching period end
 * Called by cron job — finds subscriptions where nextPaymentAt is within processing window
 */
export async function processAutoRenewal(
  lookAheadDays: number = 1
): Promise<AutoRenewalResult> {
  const now = new Date();
  const cutoffDate = addDays(now, lookAheadDays);

  // Find active subscriptions with auto-renew that are due for renewal
  const dueSubscriptions = await db.subscription.findMany({
    where: {
      status: 'active',
      autoRenew: true,
      nextPaymentAt: {
        lte: cutoffDate,
      },
    },
    orderBy: { nextPaymentAt: 'asc' },
  });

  const results: RenewalAttemptResult[] = [];

  for (const sub of dueSubscriptions) {
    try {
      const result = await attemptRenewal(sub.id);
      results.push(result);
    } catch (err) {
      results.push({
        success: false,
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        error: `Renewal processing error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return {
    processed: results.length,
    results,
  };
}

// --- processManualRenewal ---

/**
 * Process a manual renewal request from a user
 * - Validates the subscription can be manually renewed
 * - Processes payment (always attempts, even if past_due)
 * - Creates payment record and updates subscription
 */
export async function processManualRenewal(
  subscriptionId: string,
  paymentMethod?: string,
  performedBy?: string
): Promise<ManualRenewalResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return { success: false, subscriptionId, error: 'Subscription not found' };
  }

  // Manual renewal allowed for: active, past_due, suspended (expired needs recovery)
  const allowedStatuses: SubscriptionStatus[] = ['active', 'past_due', 'suspended'];
  if (!allowedStatuses.includes(subscription.status as SubscriptionStatus)) {
    return {
      success: false,
      subscriptionId,
      error: `Manual renewal not allowed for subscription in '${subscription.status}' status`,
    };
  }

  const now = new Date();
  const tier = subscription.tier as TierSlug;
  const cycle = subscription.billingCycle as BillingCycle;
  const amountBDT = getTierPrice(tier, cycle);
  const newPeriodStart = now;
  const newPeriodEnd = calculatePeriodEnd(now, cycle);
  const method = paymentMethod || subscription.tenant.pmType || 'card';

  // In manual renewal, we assume payment is provided/confirmed
  // Create payment record as completed (user initiated)
  const payment = await db.subscriptionPayment.create({
    data: {
      tenantId: subscription.tenantId,
      amount: amountBDT,
      currency: 'BDT',
      method,
      status: 'completed',
      periodStart: newPeriodStart,
      periodEnd: newPeriodEnd,
      metadata: JSON.stringify({
        type: 'manual_renewal',
        tier,
        cycle,
        sandboxMode,
        previousStatus: subscription.status,
      }),
    },
  });

  const previousStatus = subscription.status;

  // Update subscription
  await db.subscription.update({
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
      renewalReminderSent: false,
      unitAmount: amountBDT,
      autoRenew: true,
      // Clear cancellation if manually renewing a cancelled sub
      cancelledAt: null,
      endsAt: null,
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
      suspendedAt: null,
      suspensionReason: null,
      cancelledAt: null,
    },
  });

  // Record event
  await recordSubscriptionEvent({
    subscriptionId,
    tenantId: subscription.tenantId,
    eventType: 'renewed',
    fromStatus: previousStatus,
    toStatus: 'active',
    metadata: {
      type: 'manual_renewal',
      amountBDT,
      cycle,
      tier,
      paymentId: payment.id,
      method,
      periodStart: formatDateISO(newPeriodStart),
      periodEnd: formatDateISO(newPeriodEnd),
    },
    performedBy,
  });

  return {
    success: true,
    subscriptionId,
    paymentId: payment.id,
    amountBDT,
    newPeriodEnd,
  };
}

// --- processPaymentRetry ---

/**
 * Retry a failed payment with exponential backoff
 * - Check if retry is due (paymentRetryAt <= now)
 * - Attempt payment
 * - On success: recover subscription
 * - On failure: increment fail count, schedule next retry or expire
 */
export async function processPaymentRetry(
  subscriptionId: string,
  performedBy?: string
): Promise<PaymentRetryResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return { success: false, subscriptionId, retryNumber: 0, maxRetriesReached: false, error: 'Subscription not found' };
  }

  // Only past_due subscriptions can have payment retries
  if (subscription.status !== 'past_due') {
    return {
      success: false,
      subscriptionId,
      retryNumber: subscription.paymentFailCount,
      maxRetriesReached: subscription.paymentFailCount >= MAX_PAYMENT_RETRIES,
      error: `Payment retry not applicable for subscription in '${subscription.status}' status`,
    };
  }

  // Check if retry is due
  const now = new Date();
  if (subscription.paymentRetryAt && now < subscription.paymentRetryAt) {
    return {
      success: false,
      subscriptionId,
      retryNumber: subscription.paymentFailCount,
      maxRetriesReached: false,
      error: `Payment retry not due until ${formatDateISO(subscription.paymentRetryAt)}`,
    };
  }

  // Check if max retries already reached
  if (subscription.paymentFailCount >= MAX_PAYMENT_RETRIES) {
    return {
      success: false,
      subscriptionId,
      retryNumber: subscription.paymentFailCount,
      maxRetriesReached: true,
      error: 'Maximum payment retries exceeded',
    };
  }

  // Attempt payment
  const paymentSuccess = simulatePayment();

  if (paymentSuccess) {
    // Payment succeeded — recover
    const { processPaymentRecovery } = await import('./engine');
    await processPaymentRecovery(subscriptionId, performedBy);

    // Create payment record
    const tier = subscription.tier as TierSlug;
    const cycle = subscription.billingCycle as BillingCycle;
    const amountBDT = getTierPrice(tier, cycle);
    const newPeriodEnd = calculatePeriodEnd(now, cycle);

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
          type: 'payment_retry_success',
          retryNumber: subscription.paymentFailCount,
          sandboxMode,
        }),
      },
    });

    await recordSubscriptionEvent({
      subscriptionId,
      tenantId: subscription.tenantId,
      eventType: 'payment_recovered',
      fromStatus: 'past_due',
      toStatus: 'active',
      metadata: {
        retryNumber: subscription.paymentFailCount,
        paymentId: payment.id,
        amountBDT,
      },
      performedBy,
    });

    return {
      success: true,
      subscriptionId,
      retryNumber: subscription.paymentFailCount,
      maxRetriesReached: false,
    };
  }

  // Payment still failing
  const newFailCount = subscription.paymentFailCount + 1;
  const maxReached = newFailCount >= MAX_PAYMENT_RETRIES;

  let nextRetryAt: Date | null = null;
  if (!maxReached) {
    const retryDelayDays = PAYMENT_RETRY_DELAYS[Math.min(newFailCount - 1, PAYMENT_RETRY_DELAYS.length - 1)];
    nextRetryAt = addDays(now, retryDelayDays);
  }

  // Update subscription
  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      paymentFailCount: newFailCount,
      paymentRetryAt: nextRetryAt,
      lastRenewalAttempt: now,
    },
  });

  // Record event
  await recordSubscriptionEvent({
    subscriptionId,
    tenantId: subscription.tenantId,
    eventType: 'payment_failed',
    fromStatus: 'past_due',
    toStatus: 'past_due',
    metadata: {
      retryNumber: newFailCount,
      nextRetryAt: nextRetryAt ? formatDateISO(nextRetryAt) : null,
      maxRetriesReached: maxReached,
      sandboxMode,
    },
    performedBy,
  });

  return {
    success: false,
    subscriptionId,
    retryNumber: newFailCount,
    nextRetryAt: nextRetryAt ?? undefined,
    maxRetriesReached: maxReached,
    error: maxReached ? 'Maximum payment retries reached' : 'Payment retry failed',
  };
}

// --- getRenewalStatus ---

/**
 * Get renewal status information for a subscription
 */
export async function getRenewalStatus(
  subscriptionId: string
): Promise<RenewalStatusInfo | null> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) return null;

  const now = new Date();
  const nextPayment = subscription.nextPaymentAt || subscription.currentPeriodEnd;
  const daysUntilRenewal = nextPayment ? daysBetween(now, nextPayment) : null;

  const inGracePeriod =
    subscription.status === 'past_due' &&
    subscription.gracePeriodEnd !== null &&
    now < subscription.gracePeriodEnd;

  return {
    subscriptionId: subscription.id,
    tenantId: subscription.tenantId,
    tier: subscription.tier,
    billingCycle: subscription.billingCycle,
    autoRenew: subscription.autoRenew,
    nextRenewalDate: subscription.currentPeriodEnd?.toISOString() || null,
    nextPaymentDate: subscription.nextPaymentAt?.toISOString() || null,
    lastPaymentDate: subscription.lastPaymentAt?.toISOString() || null,
    daysUntilRenewal,
    renewalReminderSent: subscription.renewalReminderSent,
    paymentFailCount: subscription.paymentFailCount,
    inGracePeriod,
    gracePeriodEnd: subscription.gracePeriodEnd?.toISOString() || null,
    amountBDT: subscription.unitAmount,
    currency: subscription.currency,
  };
}

// --- toggleAutoRenew ---

export interface ToggleAutoRenewResult {
  success: boolean;
  subscriptionId: string;
  autoRenew: boolean;
  error?: string;
}

/**
 * Enable or disable auto-renewal for a subscription
 */
export async function toggleAutoRenew(
  subscriptionId: string,
  enabled: boolean,
  performedBy?: string
): Promise<ToggleAutoRenewResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return { success: false, subscriptionId, autoRenew: false, error: 'Subscription not found' };
  }

  // Only active subscriptions can toggle auto-renew
  if (subscription.status !== 'active' && subscription.status !== 'trial') {
    return {
      success: false,
      subscriptionId,
      autoRenew: subscription.autoRenew,
      error: `Cannot change auto-renewal for subscription in '${subscription.status}' status`,
    };
  }

  // Already in desired state
  if (subscription.autoRenew === enabled) {
    return {
      success: true,
      subscriptionId,
      autoRenew: enabled,
    };
  }

  await db.subscription.update({
    where: { id: subscriptionId },
    data: { autoRenew: enabled },
  });

  // Record event
  await recordSubscriptionEvent({
    subscriptionId,
    tenantId: subscription.tenantId,
    eventType: enabled ? 'auto_renew_enabled' : 'auto_renew_disabled',
    fromStatus: subscription.status,
    toStatus: subscription.status,
    metadata: {
      autoRenew: enabled,
    },
    performedBy,
  });

  return {
    success: true,
    subscriptionId,
    autoRenew: enabled,
  };
}

// --- calculateProration ---

/**
 * Calculate prorated amount for plan changes mid-cycle
 * - Credit for unused days on current plan
 * - Charge for remaining days on new plan
 * - Net amount: positive = customer owes, negative = credit
 */
export function calculateProration(params: {
  currentTier: TierSlug;
  newTier: TierSlug;
  currentCycle: BillingCycle;
  newCycle: BillingCycle;
  periodStart: Date;
  periodEnd: Date;
  changeDate: Date;
}): ProrationResult {
  const {
    currentTier,
    newTier,
    currentCycle,
    newCycle,
    periodStart,
    periodEnd,
    changeDate,
  } = params;

  const currentPriceBDT = getTierPrice(currentTier, currentCycle);
  const newPriceBDT = getTierPrice(newTier, newCycle);

  const totalDaysInPeriod = daysBetween(periodStart, periodEnd);
  const unusedDays = daysBetween(changeDate, periodEnd);

  // Ensure non-negative
  const safeUnusedDays = Math.max(0, unusedDays);
  const safeTotalDays = Math.max(1, totalDaysInPeriod); // Prevent division by zero

  // Daily rates
  const currentDailyRate = currentPriceBDT / safeTotalDays;
  const newDailyRate = newPriceBDT / safeTotalDays;

  // Credit for unused portion of current plan
  const creditBDT = Math.round(currentDailyRate * safeUnusedDays);

  // Charge for remaining days on new plan
  const chargeBDT = Math.round(newDailyRate * safeUnusedDays);

  // Net amount: positive = customer owes more, negative = customer gets credit
  const netAmountBDT = chargeBDT - creditBDT;

  // Determine if upgrade based on monthly equivalent price
  const currentMonthly = TIER_PRICING[currentTier].monthlyBDT;
  const newMonthly = TIER_PRICING[newTier].monthlyBDT;
  const isUpgrade = newMonthly > currentMonthly;

  return {
    currentTier,
    newTier,
    currentCycle,
    newCycle,
    currentPriceBDT,
    newPriceBDT,
    unusedDays: safeUnusedDays,
    totalDaysInPeriod: safeTotalDays,
    creditBDT,
    chargeBDT,
    netAmountBDT,
    effectiveDate: formatDateISO(changeDate),
    isUpgrade,
  };
}
