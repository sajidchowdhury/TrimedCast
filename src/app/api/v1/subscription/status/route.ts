// ============================================
// GET /api/v1/subscription/status
// Returns subscription status with trial info
// and effective feature gates for frontend
// ============================================

import { NextRequest } from 'next/server';
import { apiSuccess, apiError, unauthorizedError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { getTenantSubscriptionStatus } from '@/lib/subscription/check';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const status = await getTenantSubscriptionStatus(context.tenantId);

    return apiSuccess({
      tier: status.tier,
      tier_name: status.tierName,
      tier_name_bn: status.tierNameBn,
      is_trial: status.isTrial,
      is_trial_expired: status.isTrialExpired,
      trial_days_remaining: status.trialDaysRemaining,
      trial_ends_at: status.trialEndsAt?.toISOString() ?? null,
      subscription_status: status.subscriptionStatus,
      effective_features: status.effectiveFeatures,
      limits: status.limits,
      price_bdt: status.priceBdt,
      price_label: status.priceLabel,
    });
  } catch (error) {
    console.error('[Subscription/Status]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to get subscription status' },
      500
    );
  }
}
