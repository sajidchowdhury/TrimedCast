// ============================================
// GET /api/v1/recommended-orders/summary
// Executive aggregation for dashboard
// ============================================

import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';

export async function GET() {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    // Get all pending recommended orders
    const orders = await db.recommendedOrder.findMany({
      where: { tenantId, status: 'pending' },
      include: {
        product: { select: { seasonalityType: true } },
      },
    });

    // Aggregate by urgency
    const byUrgency: Record<string, number> = { critical: 0, high: 0, normal: 0, low: 0 };
    for (const order of orders) {
      byUrgency[order.urgency] = (byUrgency[order.urgency] || 0) + 1;
    }

    // Aggregate by season
    const bySeason: Record<string, number> = {};
    for (const order of orders) {
      const season = order.product.seasonalityType || 'all_season';
      bySeason[season] = (bySeason[season] || 0) + 1;
    }

    // Total recommended spend
    const totalSpend = orders.reduce((sum, o) => sum + (o.totalCost || 0), 0);

    // CNY at risk count
    const cnyAtRiskCount = orders.filter((o) => o.cnyRisk).length;

    // Date range
    const triggerDates = orders.map((o) => o.orderDate.getTime()).filter((d) => !isNaN(d));
    const earliestTriggerDate = triggerDates.length > 0
      ? new Date(Math.min(...triggerDates)).toISOString().split('T')[0]
      : null;
    const latestTriggerDate = triggerDates.length > 0
      ? new Date(Math.max(...triggerDates)).toISOString().split('T')[0]
      : null;

    return apiSuccess({
      total_recommendations: orders.length,
      total_recommended_spend_bdt: Math.round(totalSpend),
      by_urgency: byUrgency,
      by_season: bySeason,
      cny_at_risk_count: cnyAtRiskCount,
      earliest_trigger_date: earliestTriggerDate,
      latest_trigger_date: latestTriggerDate,
    });
  } catch (error) {
    console.error('[RecommendedOrders/Summary]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get recommendation summary' }, 500);
  }
}
