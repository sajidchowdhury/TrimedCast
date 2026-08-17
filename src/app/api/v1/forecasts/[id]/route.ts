// ============================================
// GET /api/v1/forecasts/{id} - Get single forecast
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, notFoundError, apiError } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';
export const runtime = 'nodejs';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    const forecast = await db.forecast.findFirst({
      where: { id, tenantId },
      include: {
        product: {
          select: { id: true, sku: true, name: true, category: true, unitCost: true, sellingPrice: true },
        },
      },
    });

    if (!forecast) return notFoundError('Forecast');

    return apiSuccess({
      id: forecast.id,
      product: { sku_code: forecast.product.sku, name: forecast.product.name, category: forecast.product.category },
      season: forecast.seasonDetected,
      forecast_method: forecast.model,
      predicted_qty: forecast.predictedQty,
      lower_bound: forecast.lowerBound,
      upper_bound: forecast.upperBound,
      confidence: forecast.confidence,
      mape: forecast.mape,
      is_recalibrated: forecast.isRecalibrated,
      cny_risk_flag: forecast.cnyRiskFlag,
      forecast_date: forecast.forecastDate,
      created_at: forecast.createdAt,
    });
  } catch (error) {
    console.error('[Forecasts/[id]/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch forecast' }, 500);
  }
}
