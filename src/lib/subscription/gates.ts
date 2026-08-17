// ============================================
// TrimedCast - Feature Gate Logic
// Determines what features are available
// based on subscription tier + trial status
// ============================================

import {
  type TrimedCastTier,
  type GatedFeature,
  TIERS,
  TRIAL_CONFIG,
} from './tiers';

// --- Result Types ---

export interface GateCheckResult {
  allowed: boolean;
  feature: GatedFeature;
  tier: TrimedCastTier;
  isTrial: boolean;
  reason?: string;
  reasonBn?: string;
  limit?: number | boolean | null;
  current?: number;
}

export interface TierLimitsResult {
  tier: TrimedCastTier;
  isTrial: boolean;
  trialDaysRemaining: number;
  forecastMonths: number;
  maxProducts: number;   // -1 = unlimited
  maxUsers: number;      // -1 = unlimited
  features: GatedFeature[];
}

// --- Core Gate Check ---

/**
 * Check if a feature is allowed for a given tier + trial state.
 * During trial, ALL features are allowed (full Pro access).
 */
export function checkFeatureGate(
  feature: GatedFeature,
  tier: TrimedCastTier,
  isTrial: boolean
): GateCheckResult {
  // During trial, everything is allowed (full Pro access)
  if (isTrial) {
    return {
      allowed: true,
      feature,
      tier,
      isTrial: true,
      limit: TIERS.pro.limits[feature as string] ?? null,
    };
  }

  const tierDef = TIERS[tier];
  const isAllowed = tierDef.features.includes(feature);
  const limit = tierDef.limits[feature as string] ?? null;

  if (isAllowed) {
    return {
      allowed: true,
      feature,
      tier,
      isTrial: false,
      limit,
    };
  }

  // Feature is NOT allowed — generate reason
  const isFreeTier = tier === 'free';
  const reason = isFreeTier
    ? `This feature requires Pro plan. Upgrade for ৳${TIERS.pro.priceBdt.toLocaleString()}/year.`
    : `Feature '${feature}' is not available on your current plan.`;

  const reasonBn = isFreeTier
    ? `এই ফিচারের জন্য প্রো প্ল্যান লাগবে। ৳${TIERS.pro.priceBdt.toLocaleString()}/বছর আপগ্রেড করুন।`
    : `এই ফিচার আপনার বর্তমান প্ল্যানে নেই।`;

  return {
    allowed: false,
    feature,
    tier,
    isTrial: false,
    reason,
    reasonBn,
    limit,
  };
}

/**
 * Check if a numeric limit is exceeded (e.g., product count, forecast months)
 */
export function checkNumericLimit(
  feature: 'forecast_months' | 'max_products',
  tier: TrimedCastTier,
  isTrial: boolean,
  current: number
): GateCheckResult {
  // During trial, use Pro limits
  const effectiveTier = isTrial ? 'pro' : tier;
  const tierDef = TIERS[effectiveTier];

  let limit: number;
  if (feature === 'forecast_months') {
    limit = tierDef.forecastMonths;
  } else if (feature === 'max_products') {
    limit = tierDef.maxSkus; // -1 = unlimited
  } else {
    limit = -1;
  }

  const allowed = limit === -1 || current <= limit;

  if (allowed) {
    return {
      allowed: true,
      feature,
      tier,
      isTrial,
      limit,
      current,
    };
  }

  const isFreeAfterTrial = !isTrial && tier === 'free';
  const reason = isFreeAfterTrial
    ? `Free plan allows ${limit} ${feature === 'forecast_months' ? 'months' : 'products'}. You have ${current}. Upgrade to Pro for unlimited.`
    : `Limit exceeded: ${current} > ${limit}`;

  const reasonBn = isFreeAfterTrial
    ? `ফ্রি প্ল্যানে ${limit} ${feature === 'forecast_months' ? 'মাস' : 'পণ্য'}। আপনার ${current}। আনলিমিটেড প্রো আপগ্রেড করুন।`
    : `সীমা অতিক্রম: ${current} > ${limit}`;

  return {
    allowed: false,
    feature,
    tier,
    isTrial,
    reason,
    reasonBn,
    limit,
    current,
  };
}

// --- Get Full Tier Limits ---

/**
 * Get the complete effective tier limits for a tenant,
 * accounting for trial status.
 */
export function getEffectiveTierLimits(
  tier: TrimedCastTier,
  trialEndsAt: Date | null
): TierLimitsResult {
  const now = new Date();
  const isTrial = trialEndsAt ? trialEndsAt > now : false;
  const trialDaysRemaining = isTrial
    ? Math.ceil((trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // During trial, use Pro tier limits
  const effectiveTier = isTrial ? 'pro' : tier;
  const tierDef = TIERS[effectiveTier];

  return {
    tier,
    isTrial,
    trialDaysRemaining,
    forecastMonths: tierDef.forecastMonths,
    maxProducts: tierDef.maxSkus,
    maxUsers: tierDef.maxUsers,
    features: tierDef.features,
  };
}

// --- Resolve Tier from Tenant Plan ---

/**
 * Map the Tenant.plan field to a TrimedCastTier.
 * The Tenant.plan can be 'starter', 'professional', 'pro', 'enterprise', etc.
 * For TrimedCast BD model: starter/free → 'free', professional/pro → 'pro'
 */
export function resolveTrimedCastTier(plan: string): TrimedCastTier {
  const normalized = plan.toLowerCase().trim();
  if (normalized === 'professional' || normalized === 'pro') {
    return 'pro';
  }
  // Everything else is free (starter, trial without pro subscription, etc.)
  return 'free';
}

/**
 * Determine if the tenant is currently in trial.
 * Trial = tenant.status === 'trial' AND trialEndsAt is in the future
 */
export function isTenantInTrial(
  tenantStatus: string,
  trialEndsAt: Date | null
): boolean {
  if (tenantStatus !== 'trial') return false;
  if (!trialEndsAt) return false;
  return trialEndsAt > new Date();
}

/**
 * Calculate trial days remaining
 */
export function getTrialDaysRemaining(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const now = new Date();
  if (trialEndsAt <= now) return 0;
  return Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if trial has expired but tenant hasn't upgraded yet
 * (grace period before downgrading to free)
 */
export function isTrialExpired(
  tenantStatus: string,
  trialEndsAt: Date | null
): boolean {
  if (tenantStatus !== 'trial') return false;
  if (!trialEndsAt) return true;
  return trialEndsAt <= new Date();
}
