// ============================================
// GET /api/v1/billing/feature-check
// Check if a feature is available for the tenant's current plan
// Session 14: Usage Metering & Feature Check
// ============================================

import { NextRequest } from 'next/server';
import { apiSuccess, apiError, unauthorizedError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import {
  checkFeatureAccess,
  getTierDefinition,
  resolveTierSlug,
  type TierSlug,
} from '@/lib/api/billing';

// All known features for bulk check
const ALL_FEATURES = [
  'regression_forecasting',
  'prophet_forecasting',
  'ensemble_forecasting',
  'single_warehouse',
  'multi_warehouse',
  'ask_ai',
  'custom_seasonal_models',
  'api_access',
  'sso',
  'excel_import',
  'csv_import',
  'dashboard',
  'dashboard_sharing',
  'webhook_notifications',
  'per_tenant_backup',
  'custom_domain',
  'email_support',
  'priority_support',
  'dedicated_support',
];

export async function GET(request: NextRequest) {
  try {
    // 1. Get auth context (require auth)
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Get tenant plan
    const { db } = await import('@/lib/db');
    const tenant = await db.tenant.findUnique({
      where: { id: context.tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      return apiError({ code: 'NOT_FOUND', message: 'Tenant not found' }, 404);
    }

    const tierSlug = resolveTierSlug(tenant.plan);
    const tierDef = getTierDefinition(tenant.plan);

    // 3. Get feature from query param
    const feature = request.nextUrl.searchParams.get('feature');

    // 4. If no feature param, return all feature checks for the tenant's tier
    if (!feature) {
      const featureChecks = ALL_FEATURES.map((f) => {
        const result = checkFeatureAccess(tenant.plan, f);
        return {
          feature: f,
          allowed: result.allowed,
          tier: result.tier,
          ...(result.reason ? { reason: result.reason } : {}),
          ...(result.upgradeTo ? { upgrade_to: result.upgradeTo } : {}),
        };
      });

      return apiSuccess({
        tier: {
          slug: tierSlug,
          name: tierDef.name,
        },
        features: featureChecks,
      });
    }

    // 5. Check feature access for the specified feature
    const result = checkFeatureAccess(tenant.plan, feature);

    // 6. Return apiSuccess with feature check result
    return apiSuccess({
      feature: result.feature,
      allowed: result.allowed,
      tier: result.tier,
      ...(result.reason ? { reason: result.reason } : {}),
      ...(result.upgradeTo ? { upgrade_to: result.upgradeTo } : {}),
    });
  } catch (error) {
    console.error('[Billing/FeatureCheck/GET]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to check feature access' },
      500
    );
  }
}
