// ============================================
// GET /api/v1/billing/usage
// Current billing period usage metrics
// Session 14: Usage Metering & Feature Check
// ============================================

import { NextRequest } from 'next/server';
import { apiSuccess, apiError, unauthorizedError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import {
  getCurrentPeriodUsage,
  getTierDefinition,
  type UsageCounts,
} from '@/lib/api/billing';

export async function GET(request: NextRequest) {
  try {
    // 1. Get auth context (require auth)
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Get current period usage
    const usage: UsageCounts = await getCurrentPeriodUsage(context.tenantId);

    // 3. Get tenant to resolve plan
    const { db } = await import('@/lib/db');
    const tenant = await db.tenant.findUnique({
      where: { id: context.tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      return apiError({ code: 'NOT_FOUND', message: 'Tenant not found' }, 404);
    }

    // 4. Get tier definition for the tenant's plan
    const tier = getTierDefinition(tenant.plan);

    // 5. Build usage response with current count, limit, and remaining for each type
    const usageDetails = {
      forecast_runs: {
        current: usage.forecast_runs,
        limit: tier.limits.forecast_runs_per_month,
        remaining:
          tier.limits.forecast_runs_per_month === null
            ? null
            : Math.max(0, tier.limits.forecast_runs_per_month - usage.forecast_runs),
      },
      ai_queries: {
        current: usage.ai_queries,
        limit: tier.limits.ai_queries_per_month,
        remaining:
          tier.limits.ai_queries_per_month === null
            ? null
            : Math.max(0, tier.limits.ai_queries_per_month - usage.ai_queries),
      },
      sku_count: {
        current: usage.sku_count,
        limit: tier.maxSkus === -1 ? null : tier.maxSkus,
        remaining:
          tier.maxSkus === -1 ? null : Math.max(0, tier.maxSkus - usage.sku_count),
      },
      import_runs: {
        current: usage.import_runs,
        limit: tier.limits.import_runs_per_month,
        remaining:
          tier.limits.import_runs_per_month === null
            ? null
            : Math.max(0, tier.limits.import_runs_per_month - usage.import_runs),
      },
      report_generated: {
        current: usage.report_generated,
        limit: null, // No explicit limit for reports
        remaining: null,
      },
    };

    // 6. Return apiSuccess
    return apiSuccess({
      usage: usageDetails,
      period_start: usage.period_start,
      period_end: usage.period_end,
      tier: {
        slug: tier.slug,
        name: tier.name,
        price_usd: tier.priceUsd,
      },
    });
  } catch (error) {
    console.error('[Billing/Usage/GET]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch usage metrics' },
      500
    );
  }
}
