// ============================================
// GET /api/v1/dashboard
// Main dashboard aggregation — all KPIs in one call
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';

function getBDSeason(date: Date = new Date()): { current: string; next: string; daysToNext: number } {
  const month = date.getMonth() + 1; // 1-12
  let current: string;
  let next: string;
  let nextStartMonth: number;

  if (month >= 11 || month <= 2) {
    current = 'winter'; next = 'summer'; nextStartMonth = 3;
  } else if (month >= 3 && month <= 5) {
    current = 'summer'; next = 'monsoon'; nextStartMonth = 6;
  } else if (month >= 6 && month <= 9) {
    current = 'monsoon'; next = 'pre_winter'; nextStartMonth = 10;
  } else {
    current = 'pre_winter'; next = 'winter'; nextStartMonth = 11;
  }

  // Calculate days to next season
  const nextStart = new Date(date.getFullYear(), nextStartMonth - 1, 1);
  if (nextStart < date) nextStart.setFullYear(nextStart.getFullYear() + 1);
  const daysToNext = Math.ceil((nextStart.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  return { current, next, daysToNext };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    // Parallel queries for performance
    const [
      totalSkus,
      inventoryData,
      pendingPOs,
      pendingSOs,
      recentForecasts,
      urgentOrders,
      sopCycle,
    ] = await Promise.all([
      // Total active SKUs
      db.product.count({ where: { tenantId, isActive: true } }),

      // Inventory data
      db.inventory.findMany({
        where: { tenantId },
        include: { product: { select: { unitCost: true } } },
      }),

      // Pending purchase orders
      db.purchaseOrder.count({ where: { tenantId, status: { in: ['draft', 'sent', 'confirmed', 'in_transit'] } } }),

      // Pending sales orders
      db.salesOrder.count({ where: { tenantId, status: { in: ['pending', 'confirmed'] } } }),

      // Recent forecasts
      db.forecast.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { name: true, sku: true } } },
      }),

      // Urgent recommended orders
      db.recommendedOrder.findMany({
        where: { tenantId, urgency: { in: ['critical', 'high'] }, status: 'pending' },
        take: 5,
        orderBy: { orderDate: 'asc' },
        include: { product: { select: { name: true, sku: true } } },
      }),

      // Current SOP cycle
      db.sopCycle.findFirst({
        where: { tenantId, status: 'active' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Calculate KPIs
    const stockoutRiskCount = inventoryData.filter(
      (inv) => inv.availableStock <= (inv.safetyStock || 0)
    ).length;

    const overstockCount = inventoryData.filter(
      (inv) => inv.maxStockLevel && inv.currentStock > inv.maxStockLevel
    ).length;

    const totalStockValue = inventoryData.reduce((sum, inv) => {
      const unitCost = inv.product.unitCost || 0;
      return sum + (inv.currentStock * unitCost);
    }, 0);

    // Average MAPE from recent forecasts
    const forecastsWithMape = recentForecasts.filter((f) => f.mape !== null);
    const avgMape = forecastsWithMape.length > 0
      ? forecastsWithMape.reduce((sum, f) => sum + (f.mape || 0), 0) / forecastsWithMape.length
      : null;

    const seasonalInfo = getBDSeason();

    return apiSuccess({
      sop_cycle: sopCycle ? {
        id: sopCycle.id,
        cycle_name: sopCycle.name,
        current_stage: sopCycle.stage,
        status: sopCycle.status,
      } : null,
      kpis: {
        total_skus: totalSkus,
        total_stock_value_bdt: Math.round(totalStockValue),
        stockout_risk_count: stockoutRiskCount,
        overstock_count: overstockCount,
        pending_purchase_orders: pendingPOs,
        pending_sales_orders: pendingSOs,
        avg_mape: avgMape ? Math.round(avgMape * 10) / 10 : null,
        forecast_accuracy_pct: avgMape ? Math.round((100 - avgMape) * 10) / 10 : null,
      },
      urgent_orders: urgentOrders.map((ro) => ({
        id: ro.id,
        product_name: ro.product.name,
        sku_code: ro.product.sku,
        recommended_qty: ro.quantity,
        order_trigger_date: ro.orderDate,
        urgency: ro.urgency,
      })),
      recent_forecasts: recentForecasts.map((f) => ({
        product_name: f.product.name,
        season: f.seasonDetected,
        predicted_qty: f.predictedQty,
        mape: f.mape,
        created_at: f.createdAt,
      })),
      seasonal_summary: {
        current_season: seasonalInfo.current,
        next_season: seasonalInfo.next,
        days_to_next_season: seasonalInfo.daysToNext,
      },
    });
  } catch (error) {
    console.error('[Dashboard/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard data' }, 500);
  }
}
