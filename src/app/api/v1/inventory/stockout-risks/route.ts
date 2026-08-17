// ============================================
// GET /api/v1/inventory/stockout-risks
// Products where qty_available <= safety_stock_qty
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, parsePagination } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();
    const url = new URL(request.url);

    const { skip, take } = parsePagination(url);
    const daysThreshold = parseInt(url.searchParams.get('days') || '14', 10);

    // Get all inventory with available stock <= safety stock
    const atRisk = await db.inventory.findMany({
      where: {
        tenantId,
        availableStock: { lte: db.inventory.fields.safetyStock?.name ? undefined : 999999 },
      },
      include: {
        product: {
          select: {
            id: true, sku: true, name: true, category: true,
          },
        },
      },
      orderBy: { availableStock: 'asc' },
    });

    // Filter in application code where availableStock <= safetyStock
    const filtered = atRisk.filter(
      (inv) => inv.availableStock <= (inv.safetyStock || 0)
    );

    // Calculate days until stockout based on consumption rate
    // Use recent sales data to estimate daily consumption
    const data = await Promise.all(
      filtered.map(async (inv) => {
        // Get last 30 days sales to estimate consumption rate
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentSales = await db.salesHistory.findMany({
          where: {
            tenantId,
            productId: inv.productId,
            date: { gte: thirtyDaysAgo },
          },
        });

        const totalQtySold = recentSales.reduce((sum, s) => sum + s.quantity, 0);
        const dailyConsumptionRate = totalQtySold / 30;
        const daysUntilStockout = dailyConsumptionRate > 0
          ? inv.availableStock / dailyConsumptionRate
          : Infinity;

        return {
          product_id: inv.productId,
          sku_code: inv.product.sku,
          product_name: inv.product.name,
          qty_available: inv.availableStock,
          safety_stock_qty: inv.safetyStock,
          daily_consumption_rate: Math.round(dailyConsumptionRate * 100) / 100,
          days_until_stockout: daysUntilStockout === Infinity ? null : Math.round(daysUntilStockout * 10) / 10,
          is_within_threshold: daysUntilStockout <= daysThreshold,
        };
      })
    );

    // Sort by days until stockout (most urgent first)
    const sorted = data
      .filter((d) => d.days_until_stockout !== null)
      .sort((a, b) => (a.days_until_stockout ?? 0) - (b.days_until_stockout ?? 0));

    return apiSuccess(sorted);
  } catch (error) {
    console.error('[Inventory/StockoutRisks]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to calculate stockout risks' }, 500);
  }
}
