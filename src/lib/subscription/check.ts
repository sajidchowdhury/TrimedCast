// ============================================
// TrimedCast - Subscription Status Check
// API-level check that resolves tenant
// subscription to effective tier + limits
// ============================================

import { db } from '@/lib/db';
import {
  type TrimedCastTier,
  type GatedFeature,
  TIERS,
  TRIAL_CONFIG,
} from './tiers';
import {
  type GateCheckResult,
  type TierLimitsResult,
  checkFeatureGate,
  checkNumericLimit,
  getEffectiveTierLimits,
  resolveTrimedCastTier,
  isTenantInTrial,
  getTrialDaysRemaining,
  isTrialExpired,
} from './gates';

// --- Types ---

export interface SubscriptionStatus {
  tier: TrimedCastTier;
  tierName: string;
  tierNameBn: string;
  isTrial: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
  trialEndsAt: Date | null;
  subscriptionStatus: string; // 'trial' | 'active' | 'past_due' | etc.
  effectiveFeatures: GatedFeature[];
  limits: {
    forecastMonths: number;
    maxProducts: number;
    maxUsers: number;
  };
  priceBdt: number;
  priceLabel: string;
}

// --- Check Feature Access (DB-backed) ---

/**
 * Check if a tenant can access a feature.
 * This does a DB lookup for the tenant, then applies gate logic.
 */
export async function checkTenantFeatureAccess(
  tenantId: string,
  feature: GatedFeature
): Promise<GateCheckResult> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, status: true, trialEndsAt: true },
  });

  if (!tenant) {
    return {
      allowed: false,
      feature,
      tier: 'free',
      isTrial: false,
      reason: 'Tenant not found',
    };
  }

  const tier = resolveTrimedCastTier(tenant.plan);
  const inTrial = isTenantInTrial(tenant.status, tenant.trialEndsAt);

  return checkFeatureGate(feature, tier, inTrial);
}

/**
 * Check if a tenant has exceeded a numeric limit.
 */
export async function checkTenantNumericLimit(
  tenantId: string,
  feature: 'forecast_months' | 'max_products',
  current: number
): Promise<GateCheckResult> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, status: true, trialEndsAt: true },
  });

  if (!tenant) {
    return {
      allowed: false,
      feature,
      tier: 'free',
      isTrial: false,
      reason: 'Tenant not found',
      current,
    };
  }

  const tier = resolveTrimedCastTier(tenant.plan);
  const inTrial = isTenantInTrial(tenant.status, tenant.trialEndsAt);

  return checkNumericLimit(feature, tier, inTrial, current);
}

// --- Get Full Subscription Status ---

/**
 * Get the complete subscription status for a tenant.
 * Used by API endpoints and UI components.
 */
export async function getTenantSubscriptionStatus(
  tenantId: string
): Promise<SubscriptionStatus> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      status: true,
      trialStartsAt: true,
      trialEndsAt: true,
    },
  });

  if (!tenant) {
    // Default: free tier, no trial
    return {
      tier: 'free',
      tierName: TIERS.free.name,
      tierNameBn: TIERS.free.nameBn,
      isTrial: false,
      isTrialExpired: false,
      trialDaysRemaining: 0,
      trialEndsAt: null,
      subscriptionStatus: 'unknown',
      effectiveFeatures: TIERS.free.features,
      limits: {
        forecastMonths: TIERS.free.forecastMonths,
        maxProducts: TIERS.free.maxSkus,
        maxUsers: TIERS.free.maxUsers,
      },
      priceBdt: 0,
      priceLabel: TIERS.free.priceLabel,
    };
  }

  const tier = resolveTrimedCastTier(tenant.plan);
  const inTrial = isTenantInTrial(tenant.status, tenant.trialEndsAt);
  const trialExpired = isTrialExpired(tenant.status, tenant.trialEndsAt);
  const trialDays = getTrialDaysRemaining(tenant.trialEndsAt);
  const effectiveTierDef = TIERS[inTrial ? 'pro' : tier];

  return {
    tier,
    tierName: effectiveTierDef.name,
    tierNameBn: effectiveTierDef.nameBn,
    isTrial: inTrial,
    isTrialExpired: trialExpired,
    trialDaysRemaining: trialDays,
    trialEndsAt: tenant.trialEndsAt,
    subscriptionStatus: tenant.status,
    effectiveFeatures: effectiveTierDef.features,
    limits: {
      forecastMonths: effectiveTierDef.forecastMonths,
      maxProducts: effectiveTierDef.maxSkus,
      maxUsers: effectiveTierDef.maxUsers,
    },
    priceBdt: effectiveTierDef.priceBdt,
    priceLabel: effectiveTierDef.priceLabel,
  };
}

// --- Utility ---

/**
 * Quick check: is a feature available?
 * (Throws away reason/limit details — just yes/no)
 */
export async function isFeatureAvailable(
  tenantId: string,
  feature: GatedFeature
): Promise<boolean> {
  const result = await checkTenantFeatureAccess(tenantId, feature);
  return result.allowed;
}

// Re-export for convenience
export {
  checkFeatureGate,
  checkNumericLimit,
  getEffectiveTierLimits,
  resolveTrimedCastTier,
  isTenantInTrial,
  getTrialDaysRemaining,
  isTrialExpired,
  TRIAL_CONFIG,
  TIERS,
};
export type { GateCheckResult, TierLimitsResult };
