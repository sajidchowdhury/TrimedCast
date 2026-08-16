// ============================================
// GET /api/v1/forecasts - List forecasts with filtering
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiPaginated, apiError, parsePagination } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();
    const url = new URL(request.url);
    const { page, perPage, skip, take } = parsePagination(url);

    const season = url.searchParams.get('season');
    const productId = url.searchParams.get('product_id');
    const method = url.searchParams.get('method');
    const isApproved = url.searchParams.get('is_approved');

    const where: Record<string, unknown> = {
      tenantId,
      ...(season ? { seasonDetected: season } : {}),
      ...(productId ? { productId } : {}),
      ...(method ? { model: method } : {}),
      ...(isApproved !== null && isApproved !== undefined ? {} : {}),
    };

    const [forecasts, total] = await Promise.all([
      db.forecast.findMany({
        where,
        skip,
        take,
        include: {
          product: { select: { id: true, sku: true, name: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.forecast.count({ where }),
    ]);

    const data = forecasts.map((f) => ({
      id: f.id,
      product: { sku_code: f.product.sku, name: f.product.name },
      season: f.seasonDetected,
      forecast_method: f.model,
      baseline_demand: f.predictedQty,
      seasonal_adjusted_demand: f.lowerBound ? Math.round((f.predictedQty + f.lowerBound) / 2) : f.predictedQty,
      consensus_demand: f.predictedQty,
      lower_bound: f.lowerBound,
      upper_bound: f.upperBound,
      mape: f.mape,
      confidence: f.confidence,
      is_recalibrated: f.isRecalibrated,
      cny_risk_flag: f.cnyRiskFlag,
      forecast_date: f.forecastDate,
      created_at: f.createdAt,
    }));

    return apiPaginated(data, page, perPage, total, tenantId);
  } catch (error) {
    console.error('[Forecasts/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch forecasts' }, 500);
  }
}
