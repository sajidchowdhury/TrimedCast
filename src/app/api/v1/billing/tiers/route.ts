// ============================================
// GET /api/v1/billing/tiers
// List all available subscription tiers
// ============================================

import { apiSuccess } from '@/lib/api/response';
import { TIERS, TierSlug } from '@/lib/api/billing';

export async function GET() {
  try {
    const tierSlugs: TierSlug[] = ['starter', 'professional', 'enterprise'];

    const tiers = tierSlugs.map((slug) => {
      const def = TIERS[slug];
      return {
        slug: def.slug,
        name: def.name,
        pricing: {
          price_cents: def.priceCents,
          price_usd: def.priceUsd,
          currency: 'usd',
          stripe_price_id: def.stripePriceId,
        },
        limits: {
          max_skus: def.maxSkus === -1 ? null : def.maxSkus,
          max_users: def.maxUsers === -1 ? null : def.maxUsers,
          max_warehouses: def.maxWarehouses === -1 ? null : def.maxWarehouses,
          ai_queries_per_month: def.limits.ai_queries_per_month,
          forecast_runs_per_month: def.limits.forecast_runs_per_month,
          import_runs_per_month: def.limits.import_runs_per_month,
        },
        features: def.features,
      };
    });

    // Feature matrix for comparison
    const featureMatrix = [
      { feature: 'regression_forecasting', starter: true, professional: true, enterprise: true },
      { feature: 'prophet_forecasting', starter: false, professional: true, enterprise: true },
      { feature: 'ensemble_forecasting', starter: false, professional: false, enterprise: true },
      { feature: 'single_warehouse', starter: true, professional: true, enterprise: true },
      { feature: 'multi_warehouse', starter: false, professional: true, enterprise: true },
      { feature: 'csv_import', starter: true, professional: true, enterprise: true },
      { feature: 'excel_import', starter: false, professional: true, enterprise: true },
      { feature: 'ask_ai', starter: false, professional: true, enterprise: true },
      { feature: 'custom_seasonal_models', starter: false, professional: false, enterprise: true },
      { feature: 'api_access', starter: false, professional: false, enterprise: true },
      { feature: 'sso', starter: false, professional: false, enterprise: true },
      { feature: 'per_tenant_backup', starter: false, professional: false, enterprise: true },
      { feature: 'custom_domain', starter: false, professional: false, enterprise: true },
      { feature: 'dashboard', starter: true, professional: true, enterprise: true },
      { feature: 'dashboard_sharing', starter: false, professional: true, enterprise: true },
      { feature: 'webhook_notifications', starter: false, professional: false, enterprise: true },
      { feature: 'email_support', starter: true, professional: false, enterprise: false },
      { feature: 'priority_support', starter: false, professional: true, enterprise: false },
      { feature: 'dedicated_support', starter: false, professional: false, enterprise: true },
    ];

    return apiSuccess({
      tiers,
      feature_matrix: featureMatrix,
    });
  } catch (error) {
    console.error('[Billing/Tiers]', error);
    return apiSuccess({ tiers: [], feature_matrix: [] });
  }
}
