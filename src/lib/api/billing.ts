// ============================================
// TrimedCast API - SaaS Billing Utilities
// Subscription Tiers, Feature Gating, Usage Metering
// Session 14: Multi-Tenancy & SaaS Architecture
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
