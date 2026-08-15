// ============================================
// GET /api/v1/forecasts/compare
// Forecast vs Actual comparison for charting
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();
    const url = new URL(request.url);

    const productId = url.searchParams.get('product_id');
    const months = parseInt(url.searchParams.get('months') || '12', 10);

    if (!productId) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'product_id is required', field: 'product_id' }, 400);
    }

    // Get product info
    const product = await db.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, sku: true, name: true },
    });

    if (!product) {
      return apiError({ code: 'NOT_FOUND', message: 'Product not found' }, 404);
    }

    // Get forecasts for this product
    const forecasts = await db.forecast.findMany({
      where: { tenantId, productId },
      orderBy: { forecastDate: 'desc' },
      take: months,
    });

    // Get actual sales for the same period
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const salesHistory = await db.salesHistory.findMany({
      where: {
        tenantId,
        productId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Group sales by month
    const salesByMonth = new Map<string, number>();
    for (const sale of salesHistory) {
      const monthKey = sale.date.toISOString().substring(0, 7); // YYYY-MM
      salesByMonth.set(monthKey, (salesByMonth.get(monthKey) || 0) + sale.quantity);
    }

    // Build comparison data
    // For each month in the range, match forecast vs actual
    const comparison = [];
    const allMonths = new Set<string>();

    // Add months from forecasts
    for (const f of forecasts) {
      const monthKey = f.forecastDate.toISOString().substring(0, 7);
      allMonths.add(monthKey);
    }

    // Add months from sales
    for (const [monthKey] of salesByMonth) {
      allMonths.add(monthKey);
    }

    // Sort months
    const sortedMonths = Array.from(allMonths).sort();

    for (const month of sortedMonths) {
      const forecasted = forecasts.find((f) => f.forecastDate.toISOString().substring(0, 7) === month)?.predictedQty || 0;
      const actual = salesByMonth.get(month) || 0;
      const variance = actual - forecasted;
      const variancePct = forecasted > 0 ? (variance / forecasted) * 100 : 0;

      comparison.push({
        month,
        forecasted: Math.round(forecasted),
        actual,
        variance: Math.round(variance),
        variance_pct: Math.round(variancePct * 100) / 100,
      });
    }

    // Calculate aggregate metrics
    const validComparisons = comparison.filter((c) => c.actual > 0 && c.forecasted > 0);
    const mape = validComparisons.length > 0
      ? validComparisons.reduce((sum, c) => sum + Math.abs(c.variance_pct), 0) / validComparisons.length
      : null;
    const mae = validComparisons.length > 0
      ? validComparisons.reduce((sum, c) => sum + Math.abs(c.variance), 0) / validComparisons.length
      : null;
    const rmse = validComparisons.length > 0
      ? Math.sqrt(validComparisons.reduce((sum, c) => sum + Math.pow(c.variance, 2), 0) / validComparisons.length)
      : null;

    return apiSuccess({
      product: { sku_code: product.sku, name: product.name },
      comparison,
      metrics: {
        mape: mape !== null ? Math.round(mape * 100) / 100 : null,
        mae: mae !== null ? Math.round(mae * 100) / 100 : null,
        rmse: rmse !== null ? Math.round(rmse * 100) / 100 : null,
      },
    });
  } catch (error) {
    console.error('[Forecasts/Compare]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to compare forecasts' }, 500);
  }
}
