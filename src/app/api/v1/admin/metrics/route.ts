// ============================================
// GET /api/v1/admin/metrics
// SaaS admin dashboard metrics
// Session 14: Usage Metering & Feature Check
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  forbiddenError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { calculateRevenueMetrics } from '@/lib/api/billing';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 1. Get auth context (require auth, require executive role)
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    if (context.role !== 'executive') {
      return forbiddenError('Executive role required to access admin endpoints');
    }

    // 2. Calculate revenue metrics
    const revenueMetrics = await calculateRevenueMetrics();

    // 3. Get additional platform metrics in parallel
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      forecastRunsThisMonth,
      aiQueriesThisMonth,
      totalSkusTracked,
      avgMapeResult,
      totalTenants,
    ] = await Promise.all([
      // Total forecast runs this month
      db.usageEvent.count({
        where: {
          eventType: 'forecast_run',
          createdAt: { gte: startOfMonth },
        },
      }),

      // Total AI queries this month
      db.usageEvent.count({
        where: {
          eventType: 'ai_query',
          createdAt: { gte: startOfMonth },
        },
      }),

      // Total SKUs tracked across all tenants
      db.product.count({
        where: { isActive: true },
      }),

      // Average MAPE across platform (from Forecast model)
      db.forecast.aggregate({
        _avg: { mape: true },
        where: {
          mape: { not: null },
          createdAt: { gte: startOfMonth },
        },
      }),

      // Total tenants (all statuses)
      db.tenant.count(),
    ]);

    // 4. Return apiSuccess with all metrics
    return apiSuccess({
      revenue: {
        mrr: revenueMetrics.mrr,
        arr: revenueMetrics.arr,
        churn_rate: revenueMetrics.churnRate,
        avg_revenue_per_tenant: revenueMetrics.avgRevenuePerTenant,
      },
      tenants: {
        active: revenueMetrics.activeTenants,
        trial: revenueMetrics.trialTenants,
        suspended: revenueMetrics.suspendedTenants,
        cancelled: revenueMetrics.cancelledTenants,
        total: totalTenants,
      },
      tier_distribution: revenueMetrics.tierDistribution,
      usage: {
        forecast_runs: forecastRunsThisMonth,
        ai_queries: aiQueriesThisMonth,
        total_skus_tracked: totalSkusTracked,
      },
      forecast_quality: {
        avg_mape: avgMapeResult._avg.mape !== null
          ? Math.round(avgMapeResult._avg.mape! * 100) / 100
          : null,
      },
    });
  } catch (error) {
    console.error('[Admin/Metrics/GET]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch platform metrics' },
      500
    );
  }
}
