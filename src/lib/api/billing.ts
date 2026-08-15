// ============================================
// TrimedCast API - SaaS Billing Utilities
// Subscription Tiers, Feature Gating, Usage Metering
// Session 14: Multi-Tenancy & SaaS Architecture
// Session 15: Enhanced Billing + Subscription Lifecycle
// ============================================

import { db } from '@/lib/db';

// --- Tier Definitions ---

export type TierSlug = 'starter' | 'professional' | 'enterprise';

export interface TierDefinition {
  slug: TierSlug;
  name: string;
  priceCents: number;
  priceUsd: number;
  stripePriceId: string;
  maxSkus: number;       // -1 = unlimited
  maxUsers: number;      // -1 = unlimited
  maxWarehouses: number;
  features: string[];
  limits: Record<string, number | null>; // null = unlimited
}

export const TIERS: Record<TierSlug, TierDefinition> = {
  starter: {
    slug: 'starter',
    name: 'Starter',
    priceCents: 2900,
    priceUsd: 29.00,
    stripePriceId: 'price_starter_monthly',
    maxSkus: 200,
    maxUsers: 3,
    maxWarehouses: 1,
    features: [
      'regression_forecasting',
      'single_warehouse',
      'csv_import',
      'email_support',
      'dashboard',
    ],
    limits: {
      ai_queries_per_month: 0,
      forecast_runs_per_month: 50,
      import_runs_per_month: 5,
    },
  },
  professional: {
    slug: 'professional',
    name: 'Professional',
    priceCents: 7900,
    priceUsd: 79.00,
    stripePriceId: 'price_pro_monthly',
    maxSkus: 1000,
    maxUsers: 10,
    maxWarehouses: 5,
    features: [
      'regression_forecasting',
      'prophet_forecasting',
      'multi_warehouse',
      'csv_import',
      'excel_import',
      'ask_ai',
      'dashboard',
      'dashboard_sharing',
      'priority_support',
    ],
    limits: {
      ai_queries_per_month: 50,
      forecast_runs_per_month: 200,
      import_runs_per_month: 20,
    },
  },
  enterprise: {
    slug: 'enterprise',
    name: 'Enterprise',
    priceCents: 19900,
    priceUsd: 199.00,
    stripePriceId: 'price_enterprise_monthly',
    maxSkus: -1,     // unlimited
    maxUsers: -1,    // unlimited
    maxWarehouses: -1,
    features: [
      'regression_forecasting',
      'prophet_forecasting',
      'ensemble_forecasting',
      'multi_warehouse',
      'csv_import',
      'excel_import',
      'ask_ai',
      'custom_seasonal_models',
      'api_access',
      'sso',
      'per_tenant_backup',
      'custom_domain',
      'dashboard',
      'dashboard_sharing',
      'webhook_notifications',
      'dedicated_support',
    ],
    limits: {
      ai_queries_per_month: null,    // unlimited
      forecast_runs_per_month: null,  // unlimited
      import_runs_per_month: null,    // unlimited
    },
  },
};

// Map plan field values to tier slugs
const PLAN_TO_TIER: Record<string, TierSlug> = {
  starter: 'starter',
  professional: 'professional',
  pro: 'professional',
  enterprise: 'enterprise',
};

export function resolveTierSlug(plan: string): TierSlug {
  return PLAN_TO_TIER[plan] || 'starter';
}

export function getTierDefinition(plan: string): TierDefinition {
  return TIERS[resolveTierSlug(plan)];
}

// --- Feature Gating ---

export interface FeatureCheckResult {
  allowed: boolean;
  feature: string;
  tier: TierSlug;
  reason?: string;
  upgradeTo?: TierSlug[];
}

// Feature to tier mapping (which tiers have access)
const FEATURE_TIER_MAP: Record<string, TierSlug[]> = {
  // Forecasting models
  regression_forecasting: ['starter', 'professional', 'enterprise'],
  prophet_forecasting: ['professional', 'enterprise'],
  ensemble_forecasting: ['enterprise'],
  
  // Capabilities
  single_warehouse: ['starter', 'professional', 'enterprise'],
  multi_warehouse: ['professional', 'enterprise'],
  ask_ai: ['professional', 'enterprise'],
  custom_seasonal_models: ['enterprise'],
  api_access: ['enterprise'],
  sso: ['enterprise'],
  excel_import: ['professional', 'enterprise'],
  csv_import: ['starter', 'professional', 'enterprise'],
  dashboard: ['starter', 'professional', 'enterprise'],
  dashboard_sharing: ['professional', 'enterprise'],
  webhook_notifications: ['enterprise'],
  per_tenant_backup: ['enterprise'],
  custom_domain: ['enterprise'],
  
  // Support
  email_support: ['starter'],
  priority_support: ['professional'],
  dedicated_support: ['enterprise'],
};

export function checkFeatureAccess(plan: string, feature: string): FeatureCheckResult {
  const tier = resolveTierSlug(plan);
  const allowedTiers = FEATURE_TIER_MAP[feature];
  
  if (!allowedTiers) {
    return {
      allowed: false,
      feature,
      tier,
      reason: `Unknown feature: ${feature}`,
    };
  }
  
  if (allowedTiers.includes(tier)) {
    return { allowed: true, feature, tier };
  }
  
  return {
    allowed: false,
    feature,
    tier,
    reason: `Feature '${feature}' is not available on the ${TIERS[tier].name} plan`,
    upgradeTo: allowedTiers as TierSlug[],
  };
}

export function hasFeature(plan: string, feature: string): boolean {
  return checkFeatureAccess(plan, feature).allowed;
}

// --- Usage Metering ---

export type UsageEventType = 'forecast_run' | 'ai_query' | 'sku_created' | 'import_run' | 'report_generated';

export interface UsagePeriod {
  periodStart: Date;
  periodEnd: Date;
}

export function getCurrentPeriod(): UsagePeriod {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { periodStart, periodEnd };
}

export async function recordUsageEvent(
  tenantId: string,
  eventType: UsageEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.usageEvent.create({
    data: {
      tenantId,
      eventType,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export interface UsageCounts {
  forecast_runs: number;
  ai_queries: number;
  sku_count: number;
  import_runs: number;
  report_generated: number;
  period_start: string;
  period_end: string;
}

export async function getCurrentPeriodUsage(tenantId: string): Promise<UsageCounts> {
  const { periodStart, periodEnd } = getCurrentPeriod();
  
  // Get usage event counts for current billing period
  const events = await db.usageEvent.groupBy({
    by: ['eventType'],
    where: {
      tenantId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    _count: { eventType: true },
  });
  
  // Map event types to counts
  const eventCounts: Record<string, number> = {};
  for (const event of events) {
    eventCounts[event.eventType] = event._count.eventType;
  }
  
  // Get current SKU count
  const skuCount = await db.product.count({
    where: { tenantId, isActive: true },
  });
  
  return {
    forecast_runs: eventCounts['forecast_run'] || 0,
    ai_queries: eventCounts['ai_query'] || 0,
    sku_count: skuCount,
    import_runs: eventCounts['import_run'] || 0,
    report_generated: eventCounts['report_generated'] || 0,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  };
}

export interface UsageLimitCheck {
  allowed: boolean;
  limitType: string;
  current: number;
  limit: number | null; // null = unlimited
  remaining: number | null; // null = unlimited
}

export async function checkUsageLimit(
  tenantId: string,
  plan: string,
  limitType: 'ai_queries' | 'forecast_runs' | 'import_runs' | 'sku_count'
): Promise<UsageLimitCheck> {
  const tier = getTierDefinition(plan);
  const usage = await getCurrentPeriodUsage(tenantId);
  
  let current: number;
  let limit: number | null;
  
  switch (limitType) {
    case 'ai_queries':
      current = usage.ai_queries;
      limit = tier.limits.ai_queries_per_month;
      break;
    case 'forecast_runs':
      current = usage.forecast_runs;
      limit = tier.limits.forecast_runs_per_month;
      break;
    case 'import_runs':
      current = usage.import_runs;
      limit = tier.limits.import_runs_per_month;
      break;
    case 'sku_count':
      current = usage.sku_count;
      limit = tier.maxSkus === -1 ? null : tier.maxSkus;
      break;
    default:
      return { allowed: true, limitType, current: 0, limit: null, remaining: null };
  }
  
  const allowed = limit === null || current < limit;
  const remaining = limit === null ? null : Math.max(0, limit - current);
  
  return { allowed, limitType, current, limit, remaining };
}

// --- Tenant Status / Lifecycle ---

export type TenantStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'deleting';

export interface TenantStatusCheck {
  status: TenantStatus;
  canWrite: boolean;  // Can perform mutations
  canRead: boolean;   // Can read data
  reason?: string;
  daysUntilSuspension?: number;
  daysUntilDeletion?: number;
}

export function evaluateTenantStatus(tenant: {
  status: string;
  isActive: boolean;
  trialEndsAt: Date | null;
  suspendedAt: Date | null;
  cancelledAt: Date | null;
  deletionRequestedAt: Date | null;
  deletionScheduledAt: Date | null;
}): TenantStatusCheck {
  const now = new Date();
  const status = tenant.status as TenantStatus;
  
  // Deleting — no access
  if (status === 'deleting' || tenant.deletionRequestedAt) {
    const daysUntilDeletion = tenant.deletionScheduledAt
      ? Math.ceil((tenant.deletionScheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 30;
    return {
      status: 'deleting',
      canWrite: false,
      canRead: true, // Allow data export during deletion period
      reason: 'Account is scheduled for deletion',
      daysUntilDeletion,
    };
  }
  
  // Cancelled — read-only until period end
  if (status === 'cancelled') {
    return {
      status: 'cancelled',
      canWrite: false,
      canRead: true,
      reason: 'Subscription cancelled — read-only access until period end',
    };
  }
  
  // Suspended — read-only
  if (status === 'suspended') {
    return {
      status: 'suspended',
      canWrite: false,
      canRead: true,
      reason: 'Account suspended — read-only access only',
    };
  }
  
  // Past due — allow with warning
  if (status === 'past_due') {
    return {
      status: 'past_due',
      canWrite: true,
      canRead: true,
      reason: 'Payment past due — please update payment method',
      daysUntilSuspension: 7, // 7-day grace period
    };
  }
  
  // Trial — check if expired
  if (status === 'trial') {
    if (tenant.trialEndsAt && new Date(tenant.trialEndsAt) < now) {
      return {
        status: 'trial',
        canWrite: false,
        canRead: true,
        reason: 'Trial period expired — subscribe to continue',
        daysUntilSuspension: 0,
      };
    }
    return {
      status: 'trial',
      canWrite: true,
      canRead: true,
    };
  }
  
  // Active — full access
  if (!tenant.isActive) {
    return {
      status: 'active',
      canWrite: false,
      canRead: true,
      reason: 'Tenant is inactive',
    };
  }
  
  return {
    status: 'active',
    canWrite: true,
    canRead: true,
  };
}

// --- Subscription Lifecycle ---

export async function createSubscription(
  tenantId: string,
  tier: TierSlug,
  trialDays = 14
): Promise<{ subscriptionId: string; trialEndsAt: Date }> {
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  
  const tierDef = TIERS[tier];
  
  const subscription = await db.subscription.create({
    data: {
      tenantId,
      tier,
      status: 'trial',
      stripePriceId: tierDef.stripePriceId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt,
      unitAmountCents: tierDef.priceCents,
      currency: 'usd',
      nextPaymentAt: trialEndsAt,
    },
  });
  
  // Update tenant status
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      plan: tier,
      status: 'trial',
      trialEndsAt,
      stripePriceId: tierDef.stripePriceId,
    },
  });
  
  return { subscriptionId: subscription.id, trialEndsAt };
}

export async function activateSubscription(subscriptionId: string): Promise<void> {
  const now = new Date();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  
  const subscription = await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      lastPaymentAt: now,
      nextPaymentAt: periodEnd,
      paymentFailCount: 0,
      gracePeriodEnd: null,
    },
  });
  
  await db.tenant.update({
    where: { id: subscription.tenantId },
    data: {
      status: 'active',
      suspendedAt: null,
      suspensionReason: null,
    },
  });
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const now = new Date();
  
  const subscription = await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'cancelled',
      cancelledAt: now,
      endsAt: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
    },
  });
  
  // Don't immediately suspend — access until end of period
  await db.tenant.update({
    where: { id: subscription.tenantId },
    data: {
      status: 'cancelled',
      cancelledAt: now,
    },
  });
}

export async function suspendTenant(tenantId: string, reason: string): Promise<void> {
  const now = new Date();
  
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'suspended',
      suspendedAt: now,
      suspensionReason: reason,
      isActive: false,
    },
  });
  
  // Also update subscription status
  const subscription = await db.subscription.findUnique({ where: { tenantId } });
  if (subscription) {
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: 'past_due', gracePeriodEnd: null },
    });
  }
}

export async function reactivateTenant(tenantId: string): Promise<void> {
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'active',
      suspendedAt: null,
      suspensionReason: null,
      isActive: true,
    },
  });
  
  const subscription = await db.subscription.findUnique({ where: { tenantId } });
  if (subscription) {
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: 'active', paymentFailCount: 0, gracePeriodEnd: null },
    });
  }
}

// --- Revenue Calculations (SaaS Admin) ---

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  cancelledTenants: number;
  churnRate: number;
  avgRevenuePerTenant: number;
  tierDistribution: Record<string, number>;
}

export async function calculateRevenueMetrics(): Promise<RevenueMetrics> {
  const [
    activeTenants,
    trialTenants,
    suspendedTenants,
    cancelledTenants,
    totalTenants,
    tierGroups,
  ] = await Promise.all([
    db.tenant.count({ where: { status: 'active' } }),
    db.tenant.count({ where: { status: 'trial' } }),
    db.tenant.count({ where: { status: 'suspended' } }),
    db.tenant.count({ where: { status: 'cancelled' } }),
    db.tenant.count({ where: { status: { not: 'deleting' } } }),
    db.tenant.groupBy({
      by: ['plan'],
      where: { status: 'active' },
      _count: { plan: true },
    }),
  ]);
  
  // Calculate MRR
  const tierDistribution: Record<string, number> = {};
  let mrr = 0;
  for (const group of tierGroups) {
    const count = group._count.plan;
    tierDistribution[group.plan] = count;
    const tier = getTierDefinition(group.plan);
    mrr += count * tier.priceUsd;
  }
  
  // Calculate churn rate (cancelled this month / total at start)
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const churnedThisMonth = await db.tenant.count({
    where: {
      status: 'cancelled',
      cancelledAt: { gte: startOfMonth },
    },
  });
  const churnRate = totalTenants > 0 ? (churnedThisMonth / totalTenants) * 100 : 0;
  
  return {
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    activeTenants,
    trialTenants,
    suspendedTenants,
    cancelledTenants,
    churnRate: Math.round(churnRate * 100) / 100,
    avgRevenuePerTenant: activeTenants > 0 ? Math.round((mrr / activeTenants) * 100) / 100 : 0,
    tierDistribution,
  };
}

// --- Invoice Generation ---

export async function generateInvoice(tenantId: string): Promise<{
  invoiceId: string;
  totalCents: number;
  lineItems: Array<{ description: string; amount_cents: number }>;
}> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { subscription: true },
  });
  
  if (!tenant || !tenant.subscription) {
    throw new Error('Tenant or subscription not found');
  }
  
  const tier = getTierDefinition(tenant.plan);
  const usage = await getCurrentPeriodUsage(tenantId);
  
  // Base subscription line
  const lineItems: Array<{ description: string; amount_cents: number }> = [
    {
      description: `TrimedCast ${tier.name} Plan — Monthly`,
      amount_cents: tier.priceCents,
    },
  ];
  
  // AI query overage for Pro tier
  if (tier.slug === 'professional' && usage.ai_queries > 50) {
    const overageCount = usage.ai_queries - 50;
    const overageCents = overageCount * 10; // $0.10 per overage query
    lineItems.push({
      description: `AI Query Overage — ${overageCount} queries @ $0.10 each`,
      amount_cents: overageCents,
    });
  }
  
  const totalCents = lineItems.reduce((sum, item) => sum + item.amount_cents, 0);
  
  // Generate invoice number
  const invoiceCount = await db.invoice.count({ where: { tenantId } });
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;
  
  const { periodStart, periodEnd } = getCurrentPeriod();
  
  const invoice = await db.invoice.create({
    data: {
      tenantId,
      subscriptionId: tenant.subscription.id,
      number: invoiceNumber,
      status: 'open',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      subtotalCents: totalCents,
      totalCents,
      currency: 'usd',
      lineItems: JSON.stringify(lineItems),
      usageSummary: JSON.stringify(usage),
      periodStart,
      periodEnd,
    },
  });
  
  return { invoiceId: invoice.id, totalCents, lineItems };
}

// ============================================
// Session 15: Enhanced Billing Features
// ============================================

// --- 1. Subscription Lifecycle Transitions ---

export type SubscriptionLifecycleStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled';

export interface SubscriptionTransitionAction {
  from: SubscriptionLifecycleStatus;
  to: SubscriptionLifecycleStatus;
  action: string;
  description: string;
}

// Define all valid lifecycle transitions
export const SUBSCRIPTION_TRANSITIONS: SubscriptionTransitionAction[] = [
  { from: 'trial', to: 'active', action: 'activate', description: 'Trial converted to active subscription' },
  { from: 'trial', to: 'suspended', action: 'trial_expired', description: 'Trial expired without activation' },
  { from: 'active', to: 'past_due', action: 'payment_failure', description: 'Payment failure on renewal' },
  { from: 'active', to: 'cancelled', action: 'cancel', description: 'Subscription cancelled by user' },
  { from: 'past_due', to: 'active', action: 'payment_recovered', description: 'Payment recovered after failure' },
  { from: 'past_due', to: 'suspended', action: 'grace_period_expired', description: 'Grace period (7 days) expired without payment' },
  { from: 'cancelled', to: 'active', action: 'resume', description: 'Subscription resumed before period end' },
  { from: 'suspended', to: 'active', action: 'reactivate', description: 'Suspended subscription reactivated' },
];

export interface SubscriptionTransitionResult {
  success: boolean;
  fromStatus: string;
  toStatus: string;
  action: string;
  error?: string;
}

/**
 * Validates and executes a subscription lifecycle transition
 */
export async function subscriptionTransition(
  subscriptionId: string,
  targetAction: string
): Promise<SubscriptionTransitionResult> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { tenant: true },
  });

  if (!subscription) {
    return {
      success: false,
      fromStatus: 'unknown',
      toStatus: 'unknown',
      action: targetAction,
      error: 'Subscription not found',
    };
  }

  const currentStatus = subscription.status as SubscriptionLifecycleStatus;

  // Find matching transition
  const transition = SUBSCRIPTION_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.action === targetAction
  );

  if (!transition) {
    return {
      success: false,
      fromStatus: currentStatus,
      toStatus: currentStatus,
      action: targetAction,
      error: `Invalid transition: '${currentStatus}' → action '${targetAction}' is not allowed`,
    };
  }

  // Special validation: cancelled → active only before period end
  if (transition.from === 'cancelled' && transition.action === 'resume') {
    const now = new Date();
    if (subscription.endsAt && now > subscription.endsAt) {
      return {
        success: false,
        fromStatus: currentStatus,
        toStatus: currentStatus,
        action: targetAction,
        error: 'Cannot resume — subscription period has already ended',
      };
    }
  }

  const now = new Date();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  // Execute the transition — update subscription
  const updateData: Record<string, unknown> = {
    status: transition.to,
    updatedAt: now,
  };

  switch (transition.action) {
    case 'activate':
      updateData.currentPeriodStart = now;
      updateData.currentPeriodEnd = periodEnd;
      updateData.lastPaymentAt = now;
      updateData.nextPaymentAt = periodEnd;
      updateData.paymentFailCount = 0;
      updateData.gracePeriodEnd = null;
      break;
    case 'trial_expired':
      // No additional fields needed
      break;
    case 'payment_failure':
      updateData.paymentFailCount = (subscription.paymentFailCount || 0) + 1;
      updateData.gracePeriodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'cancel':
      updateData.cancelledAt = now;
      updateData.endsAt = periodEnd;
      break;
    case 'payment_recovered':
      updateData.paymentFailCount = 0;
      updateData.gracePeriodEnd = null;
      updateData.lastPaymentAt = now;
      updateData.nextPaymentAt = periodEnd;
      break;
    case 'grace_period_expired':
      updateData.gracePeriodEnd = null;
      break;
    case 'resume':
      updateData.cancelledAt = null;
      updateData.endsAt = null;
      updateData.currentPeriodStart = now;
      updateData.currentPeriodEnd = periodEnd;
      updateData.lastPaymentAt = now;
      updateData.nextPaymentAt = periodEnd;
      break;
    case 'reactivate':
      updateData.paymentFailCount = 0;
      updateData.gracePeriodEnd = null;
      updateData.lastPaymentAt = now;
      updateData.nextPaymentAt = periodEnd;
      updateData.currentPeriodStart = now;
      updateData.currentPeriodEnd = periodEnd;
      break;
  }

  await db.subscription.update({
    where: { id: subscriptionId },
    data: updateData,
  });

  // Update tenant status to match
  const tenantStatusMap: Record<string, string> = {
    trial: 'trial',
    active: 'active',
    past_due: 'past_due',
    suspended: 'suspended',
    cancelled: 'cancelled',
  };

  const tenantUpdateData: Record<string, unknown> = {
    status: tenantStatusMap[transition.to] || transition.to,
  };

  if (transition.to === 'active') {
    tenantUpdateData.isActive = true;
    tenantUpdateData.suspendedAt = null;
    tenantUpdateData.suspensionReason = null;
  } else if (transition.to === 'suspended') {
    tenantUpdateData.isActive = false;
    tenantUpdateData.suspendedAt = now;
    tenantUpdateData.suspensionReason = transition.description;
  } else if (transition.to === 'cancelled') {
    tenantUpdateData.cancelledAt = now;
  }

  await db.tenant.update({
    where: { id: subscription.tenantId },
    data: tenantUpdateData,
  });

  return {
    success: true,
    fromStatus: currentStatus,
    toStatus: transition.to,
    action: targetAction,
  };
}

/**
 * Returns valid next states and the actions that trigger them for a given current status
 */
export function getValidTransitions(currentStatus: string): Array<{ status: SubscriptionLifecycleStatus; action: string; description: string }> {
  return SUBSCRIPTION_TRANSITIONS
    .filter((t) => t.from === currentStatus)
    .map((t) => ({
      status: t.to,
      action: t.action,
      description: t.description,
    }));
}

/**
 * Auto-evaluates a tenant's subscription and transitions it if needed
 * - trial expired → suspended
 * - past_due grace period expired → suspended
 */
export async function evaluateAndTransitionSubscription(
  tenantId: string
): Promise<SubscriptionTransitionResult | null> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { subscription: true },
  });

  if (!tenant || !tenant.subscription) {
    return null;
  }

  const now = new Date();
  const subscription = tenant.subscription;
  const currentStatus = subscription.status as SubscriptionLifecycleStatus;

  // Check: trial expired → suspend
  if (currentStatus === 'trial') {
    if (subscription.trialEndsAt && now > subscription.trialEndsAt) {
      return subscriptionTransition(subscription.id, 'trial_expired');
    }
  }

  // Check: past_due grace period expired → suspend
  if (currentStatus === 'past_due') {
    if (subscription.gracePeriodEnd && now > subscription.gracePeriodEnd) {
      return subscriptionTransition(subscription.id, 'grace_period_expired');
    }
    // Also check if 7 days since last payment failure (fallback if gracePeriodEnd not set)
    if (!subscription.gracePeriodEnd && subscription.updatedAt) {
      const daysSinceFailure = (now.getTime() - subscription.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceFailure >= 7) {
        return subscriptionTransition(subscription.id, 'grace_period_expired');
      }
    }
  }

  // No transition needed
  return null;
}

// --- 2. CheckSubscriptionTier Guard ---

export interface TierGuardParams {
  tenantId: string;
  feature: string;
  action?: string; // for logging
}

export interface TierGuardResult {
  allowed: boolean;
  tier: TierSlug;
  subscriptionStatus: string;
  reason?: string;
  upgradeTo?: TierSlug[];
  usageExceeded?: boolean;
}

/**
 * Tier-based access guard for API routes
 * Checks: tenant status, feature availability, usage limits
 */
export async function checkSubscriptionTierGuard(
  params: TierGuardParams
): Promise<TierGuardResult> {
  const { tenantId, feature, action } = params;

  // 1. Get tenant and subscription
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { subscription: true },
  });

  if (!tenant) {
    return {
      allowed: false,
      tier: 'starter',
      subscriptionStatus: 'unknown',
      reason: 'Tenant not found',
    };
  }

  const subscriptionStatus = tenant.subscription?.status || tenant.status;
  const tier = resolveTierSlug(tenant.plan);

  // 2. Check if tenant status allows the action
  if (tenant.status === 'suspended' || tenant.status === 'deleting') {
    return {
      allowed: false,
      tier,
      subscriptionStatus,
      reason: `Tenant status '${tenant.status}' does not allow this action`,
    };
  }

  if (tenant.status === 'cancelled') {
    return {
      allowed: false,
      tier,
      subscriptionStatus,
      reason: 'Subscription is cancelled — access is read-only until period end',
    };
  }

  if (tenant.status === 'trial') {
    // Check if trial is expired
    if (tenant.trialEndsAt && new Date(tenant.trialEndsAt) < new Date()) {
      return {
        allowed: false,
        tier,
        subscriptionStatus,
        reason: 'Trial period has expired — subscribe to continue',
      };
    }
  }

  // 3. Check if the feature is available in the tier
  const featureCheck = checkFeatureAccess(tenant.plan, feature);
  if (!featureCheck.allowed) {
    return {
      allowed: false,
      tier,
      subscriptionStatus,
      reason: featureCheck.reason,
      upgradeTo: featureCheck.upgradeTo,
    };
  }

  // 4. Check if usage limits are exceeded (for usage-limited features)
  const featureToUsageLimit: Record<string, 'ai_queries' | 'forecast_runs' | 'import_runs' | 'sku_count' | null> = {
    ask_ai: 'ai_queries',
    regression_forecasting: 'forecast_runs',
    prophet_forecasting: 'forecast_runs',
    ensemble_forecasting: 'forecast_runs',
    csv_import: 'import_runs',
    excel_import: 'import_runs',
  };

  const usageLimitType = featureToUsageLimit[feature];
  if (usageLimitType) {
    const usageCheck = await checkUsageLimit(tenantId, tenant.plan, usageLimitType);
    if (!usageCheck.allowed) {
      return {
        allowed: false,
        tier,
        subscriptionStatus,
        reason: `Usage limit exceeded for ${usageLimitType}: ${usageCheck.current}/${usageCheck.limit}`,
        usageExceeded: true,
      };
    }
  }

  // Log the action if provided (fire-and-forget audit)
  if (action) {
    db.auditLog.create({
      data: {
        tenantId,
        action: 'access_check',
        entity: 'billing_guard',
        metadata: JSON.stringify({ feature, action, allowed: true, tier }),
      },
    }).catch(() => { /* ignore audit log failures */ });
  }

  return {
    allowed: true,
    tier,
    subscriptionStatus,
  };
}

// --- 3. Usage Alerts ---

export interface UsageAlert {
  type: string; // 'ai_queries', 'forecast_runs', 'sku_count', 'import_runs'
  severity: 'warning' | 'critical' | 'exceeded';
  current: number;
  limit: number | null;
  percentUsed: number;
  message: string;
}

/**
 * Returns alerts when usage is approaching or exceeding limits
 * - warning: 80% of limit
 * - critical: 95% of limit
 * - exceeded: >= 100%
 */
export async function getUsageAlerts(
  tenantId: string,
  plan: string
): Promise<UsageAlert[]> {
  const tier = getTierDefinition(plan);
  const usage = await getCurrentPeriodUsage(tenantId);
  const alerts: UsageAlert[] = [];

  const checks: Array<{
    type: string;
    current: number;
    limit: number | null;
    label: string;
  }> = [
    { type: 'ai_queries', current: usage.ai_queries, limit: tier.limits.ai_queries_per_month, label: 'AI Queries' },
    { type: 'forecast_runs', current: usage.forecast_runs, limit: tier.limits.forecast_runs_per_month, label: 'Forecast Runs' },
    { type: 'sku_count', current: usage.sku_count, limit: tier.maxSkus === -1 ? null : tier.maxSkus, label: 'SKU Count' },
    { type: 'import_runs', current: usage.import_runs, limit: tier.limits.import_runs_per_month, label: 'Import Runs' },
  ];

  for (const check of checks) {
    // Skip if limit is 0 (feature not available) or null (unlimited)
    if (check.limit === null || check.limit === 0) continue;

    const percentUsed = (check.current / check.limit) * 100;

    if (percentUsed >= 100) {
      alerts.push({
        type: check.type,
        severity: 'exceeded',
        current: check.current,
        limit: check.limit,
        percentUsed: Math.round(percentUsed * 10) / 10,
        message: `${check.label} limit exceeded: ${check.current}/${check.limit} (${Math.round(percentUsed)}%). Upgrade your plan for more capacity.`,
      });
    } else if (percentUsed >= 95) {
      alerts.push({
        type: check.type,
        severity: 'critical',
        current: check.current,
        limit: check.limit,
        percentUsed: Math.round(percentUsed * 10) / 10,
        message: `${check.label} almost at limit: ${check.current}/${check.limit} (${Math.round(percentUsed)}%). Consider upgrading your plan.`,
      });
    } else if (percentUsed >= 80) {
      alerts.push({
        type: check.type,
        severity: 'warning',
        current: check.current,
        limit: check.limit,
        percentUsed: Math.round(percentUsed * 10) / 10,
        message: `${check.label} usage is high: ${check.current}/${check.limit} (${Math.round(percentUsed)}%).`,
      });
    }
  }

  return alerts;
}

// --- 4. Payment Method Management ---

export interface PaymentMethodInfo {
  type: string;
  lastFour: string;
  expiryMonth: number | null;
  expiryYear: number | null;
  isExpired: boolean;
}

/**
 * Update tenant's payment method
 */
export async function updatePaymentMethod(
  tenantId: string,
  paymentMethod: {
    type: string;
    lastFour: string;
    expiryMonth: number;
    expiryYear: number;
  }
): Promise<PaymentMethodInfo> {
  const now = new Date();
  const isExpired = (paymentMethod.expiryYear < now.getFullYear()) ||
    (paymentMethod.expiryYear === now.getFullYear() && paymentMethod.expiryMonth < now.getMonth() + 1);

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      pmType: paymentMethod.type,
      pmLastFour: paymentMethod.lastFour,
    },
  });

  return {
    type: paymentMethod.type,
    lastFour: paymentMethod.lastFour,
    expiryMonth: paymentMethod.expiryMonth,
    expiryYear: paymentMethod.expiryYear,
    isExpired,
  };
}

/**
 * Get current payment method info for a tenant
 */
export async function getPaymentMethod(tenantId: string): Promise<PaymentMethodInfo | null> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      pmType: true,
      pmLastFour: true,
    },
  });

  if (!tenant || !tenant.pmType) {
    return null;
  }

  const now = new Date();
  // Since we only store type and lastFour in the schema, we return what we have
  // In a real implementation, expiry would come from Stripe
  return {
    type: tenant.pmType,
    lastFour: tenant.pmLastFour || '****',
    expiryMonth: null,
    expiryYear: null,
    isExpired: false, // Would be computed from actual Stripe data
  };
}

// --- 5. Webhook Signature Verification (Simulated) ---

/**
 * Simulates Stripe webhook signature verification
 * For demo purposes, returns true if a secret is provided
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // In production, this would use Stripe's verifyHeaderAsymmetric function
  // to validate the webhook signature against the endpoint secret
  // For demo: just check that all three params are provided and non-empty
  if (!secret || secret.trim().length === 0) {
    return false;
  }
  if (!payload || payload.trim().length === 0) {
    return false;
  }
  if (!signature || signature.trim().length === 0) {
    return false;
  }
  return true;
}

// --- 6. Billing Portal Configuration ---

export interface BillingPortalConfig {
  subscription: {
    id: string;
    tier: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    cancelledAt: string | null;
    endsAt: string | null;
    lastPaymentAt: string | null;
    nextPaymentAt: string | null;
  } | null;
  tier: TierDefinition;
  usage: UsageCounts;
  alerts: UsageAlert[];
  invoices: {
    total: number;
    lastInvoice: {
      id: string;
      number: string | null;
      status: string;
      totalCents: number;
      dueDate: string | null;
    } | null;
  };
  paymentMethod: PaymentMethodInfo | null;
  validTransitions: Array<{ status: string; actions: string[] }>;
  features: Array<{ feature: string; allowed: boolean }>;
}

/**
 * Returns full configuration for the billing portal UI
 */
export async function getBillingPortalConfig(tenantId: string): Promise<BillingPortalConfig> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscription: true,
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const tier = getTierDefinition(tenant.plan);
  const usage = await getCurrentPeriodUsage(tenantId);
  const alerts = await getUsageAlerts(tenantId, tenant.plan);
  const paymentMethod = await getPaymentMethod(tenantId);

  // Build subscription info
  const subscription = tenant.subscription
    ? {
        id: tenant.subscription.id,
        tier: tenant.subscription.tier,
        status: tenant.subscription.status,
        currentPeriodStart: tenant.subscription.currentPeriodStart?.toISOString() || null,
        currentPeriodEnd: tenant.subscription.currentPeriodEnd?.toISOString() || null,
        trialEndsAt: tenant.subscription.trialEndsAt?.toISOString() || null,
        cancelledAt: tenant.subscription.cancelledAt?.toISOString() || null,
        endsAt: tenant.subscription.endsAt?.toISOString() || null,
        lastPaymentAt: tenant.subscription.lastPaymentAt?.toISOString() || null,
        nextPaymentAt: tenant.subscription.nextPaymentAt?.toISOString() || null,
      }
    : null;

  // Invoice summary
  const totalInvoices = await db.invoice.count({ where: { tenantId } });
  const lastInvoice = tenant.invoices.length > 0
    ? {
        id: tenant.invoices[0].id,
        number: tenant.invoices[0].number,
        status: tenant.invoices[0].status,
        totalCents: tenant.invoices[0].totalCents,
        dueDate: tenant.invoices[0].dueDate?.toISOString() || null,
      }
    : null;

  // Valid transitions for current status
  const currentSubStatus = tenant.subscription?.status || tenant.status;
  const validTransitionList = getValidTransitions(currentSubStatus);
  const validTransitions = [
    {
      status: currentSubStatus,
      actions: validTransitionList.map((t) => t.action),
    },
  ];

  // Feature access map
  const features = Object.keys(FEATURE_TIER_MAP).map((feature) => ({
    feature,
    allowed: checkFeatureAccess(tenant.plan, feature).allowed,
  }));

  return {
    subscription,
    tier,
    usage,
    alerts,
    invoices: {
      total: totalInvoices,
      lastInvoice,
    },
    paymentMethod,
    validTransitions,
    features,
  };
}

// --- 7. Enhanced Revenue Metrics ---

export interface DetailedRevenueMetrics {
  mrr: number;
  arr: number;
  mrrByTier: Record<string, number>;
  trialConversionRate: number;
  avgRevenuePerTenant: number;
  churnRate: number;
  lifetimeValueEstimate: number;
  tenantCountByStatus: Record<string, number>;
  usageAggregation: {
    totalForecastRuns: number;
    totalAiQueries: number;
    totalSkuCount: number;
    totalImportRuns: number;
    byTier: Record<string, { forecastRuns: number; aiQueries: number; skuCount: number; importRuns: number }>;
  };
}

/**
 * Returns detailed SaaS admin metrics including MRR by tier,
 * trial conversion rate, LTV, and usage aggregation
 */
export async function getDetailedRevenueMetrics(): Promise<DetailedRevenueMetrics> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Tenant counts by status
  const [activeCount, trialCount, pastDueCount, suspendedCount, cancelledCount, deletingCount] = await Promise.all([
    db.tenant.count({ where: { status: 'active' } }),
    db.tenant.count({ where: { status: 'trial' } }),
    db.tenant.count({ where: { status: 'past_due' } }),
    db.tenant.count({ where: { status: 'suspended' } }),
    db.tenant.count({ where: { status: 'cancelled' } }),
    db.tenant.count({ where: { status: 'deleting' } }),
  ]);

  const tenantCountByStatus: Record<string, number> = {
    active: activeCount,
    trial: trialCount,
    past_due: pastDueCount,
    suspended: suspendedCount,
    cancelled: cancelledCount,
    deleting: deletingCount,
  };

  // MRR by tier
  const tierGroups = await db.tenant.groupBy({
    by: ['plan'],
    where: { status: 'active' },
    _count: { plan: true },
  });

  const mrrByTier: Record<string, number> = { starter: 0, professional: 0, enterprise: 0 };
  let mrr = 0;
  for (const group of tierGroups) {
    const count = group._count.plan;
    const tier = getTierDefinition(group.plan);
    const tierMrr = count * tier.priceUsd;
    mrrByTier[tier.slug] = (mrrByTier[tier.slug] || 0) + tierMrr;
    mrr += tierMrr;
  }

  const arr = mrr * 12;
  const avgRevenuePerTenant = activeCount > 0 ? mrr / activeCount : 0;

  // Trial conversion rate: (tenants who were trial and became active this month) / (trials that ended this month)
  const trialsEndedThisMonth = await db.tenant.count({
    where: {
      trialEndsAt: { gte: startOfMonth, lte: now },
    },
  });
  const trialsConvertedThisMonth = await db.tenant.count({
    where: {
      status: 'active',
      trialEndsAt: { gte: startOfMonth, lte: now },
    },
  });
  const trialConversionRate = trialsEndedThisMonth > 0
    ? (trialsConvertedThisMonth / trialsEndedThisMonth) * 100
    : 0;

  // Churn rate: cancelled this month / (active + cancelled this month)
  const churnedThisMonth = await db.tenant.count({
    where: {
      status: 'cancelled',
      cancelledAt: { gte: startOfMonth },
    },
  });
  const churnRate = (activeCount + churnedThisMonth) > 0
    ? (churnedThisMonth / (activeCount + churnedThisMonth)) * 100
    : 0;

  // Lifetime value estimate: ARPU / churn rate (if churn > 0)
  const monthlyChurnRate = churnRate / 100;
  const lifetimeValueEstimate = monthlyChurnRate > 0 ? avgRevenuePerTenant / monthlyChurnRate : 0;

  // Usage aggregation across all tenants
  const [totalForecastRuns, totalAiQueries, totalSkuCount, totalImportRuns] = await Promise.all([
    db.usageEvent.count({
      where: { eventType: 'forecast_run', createdAt: { gte: thirtyDaysAgo } },
    }),
    db.usageEvent.count({
      where: { eventType: 'ai_query', createdAt: { gte: thirtyDaysAgo } },
    }),
    db.product.count({ where: { isActive: true } }),
    db.usageEvent.count({
      where: { eventType: 'import_run', createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  // Usage by tier — aggregate per tier
  const usageByTier: Record<string, { forecastRuns: number; aiQueries: number; skuCount: number; importRuns: number }> = {};
  for (const tierSlug of ['starter', 'professional', 'enterprise'] as TierSlug[]) {
    const tierTenants = await db.tenant.findMany({
      where: { plan: tierSlug, status: { not: 'deleting' } },
      select: { id: true },
    });
    const tierTenantIds = tierTenants.map((t) => t.id);

    if (tierTenantIds.length === 0) {
      usageByTier[tierSlug] = { forecastRuns: 0, aiQueries: 0, skuCount: 0, importRuns: 0 };
      continue;
    }

    const [fr, aq, sc, ir] = await Promise.all([
      db.usageEvent.count({
        where: { tenantId: { in: tierTenantIds }, eventType: 'forecast_run', createdAt: { gte: thirtyDaysAgo } },
      }),
      db.usageEvent.count({
        where: { tenantId: { in: tierTenantIds }, eventType: 'ai_query', createdAt: { gte: thirtyDaysAgo } },
      }),
      db.product.count({
        where: { tenantId: { in: tierTenantIds }, isActive: true },
      }),
      db.usageEvent.count({
        where: { tenantId: { in: tierTenantIds }, eventType: 'import_run', createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    usageByTier[tierSlug] = { forecastRuns: fr, aiQueries: aq, skuCount: sc, importRuns: ir };
  }

  return {
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(arr * 100) / 100,
    mrrByTier: {
      starter: Math.round(mrrByTier.starter * 100) / 100,
      professional: Math.round(mrrByTier.professional * 100) / 100,
      enterprise: Math.round(mrrByTier.enterprise * 100) / 100,
    },
    trialConversionRate: Math.round(trialConversionRate * 100) / 100,
    avgRevenuePerTenant: Math.round(avgRevenuePerTenant * 100) / 100,
    churnRate: Math.round(churnRate * 100) / 100,
    lifetimeValueEstimate: Math.round(lifetimeValueEstimate * 100) / 100,
    tenantCountByStatus,
    usageAggregation: {
      totalForecastRuns,
      totalAiQueries,
      totalSkuCount,
      totalImportRuns,
      byTier: usageByTier,
    },
  };
}

// --- 8. Invoice Detail Retrieval ---

export interface InvoiceLineItem {
  description: string;
  amount_cents: number;
  quantity?: number;
  unit_amount_cents?: number;
}

export interface InvoiceUsageSummary {
  forecast_runs: number;
  ai_queries: number;
  sku_count: number;
  import_runs: number;
  period_start?: string;
  period_end?: string;
}

export interface InvoiceDetail {
  id: string;
  number: string | null;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  lineItems: InvoiceLineItem[];
  usageSummary: InvoiceUsageSummary | null;
  periodStart: string | null;
  periodEnd: string | null;
  paymentMethod: string | null;
  paymentRef: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Returns full invoice with line items parsed and usage summary
 */
export async function getInvoiceDetail(
  invoiceId: string,
  tenantId: string
): Promise<InvoiceDetail> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Security: ensure the invoice belongs to the tenant
  if (invoice.tenantId !== tenantId) {
    throw new Error('Invoice does not belong to this tenant');
  }

  // Parse line items JSON
  let lineItems: InvoiceLineItem[] = [];
  try {
    if (invoice.lineItems) {
      lineItems = JSON.parse(invoice.lineItems) as InvoiceLineItem[];
    }
  } catch {
    lineItems = [];
  }

  // Parse usage summary JSON
  let usageSummary: InvoiceUsageSummary | null = null;
  try {
    if (invoice.usageSummary) {
      usageSummary = JSON.parse(invoice.usageSummary) as InvoiceUsageSummary;
    }
  } catch {
    usageSummary = null;
  }

  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    dueDate: invoice.dueDate?.toISOString() || null,
    paidAt: invoice.paidAt?.toISOString() || null,
    subtotalCents: invoice.subtotalCents,
    discountCents: invoice.discountCents,
    taxCents: invoice.taxCents,
    totalCents: invoice.totalCents,
    currency: invoice.currency,
    lineItems,
    usageSummary,
    periodStart: invoice.periodStart?.toISOString() || null,
    periodEnd: invoice.periodEnd?.toISOString() || null,
    paymentMethod: invoice.paymentMethod,
    paymentRef: invoice.paymentRef,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}
