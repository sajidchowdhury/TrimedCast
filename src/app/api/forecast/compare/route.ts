// ============================================
// TrimedCast API - Forecast vs Actual Comparison
// GET: Compare forecast predictions with actual sales data
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdRaw = searchParams.get('tenantId') || 'demo-bd-motors';
    const tenantId = await resolveTenantId(tenantIdRaw);
    const productId = searchParams.get('productId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
        { status: 400 }
      );
    }

    // Build date filter
    const dateFilter: Record<string, unknown> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Fetch forecast records for this product
    const forecastWhere: Record<string, unknown> = { tenantId, productId };
    if (Object.keys(dateFilter).length > 0) {
      forecastWhere.forecastDate = dateFilter;
    }

    const forecasts = await db.forecast.findMany({
      where: forecastWhere,
      orderBy: { forecastDate: 'asc' },
    });

    // Fetch actual sales history for the same period
    const salesWhere: Record<string, unknown> = { tenantId, productId };
    if (Object.keys(dateFilter).length > 0) {
      salesWhere.date = dateFilter;
    }

    const salesHistory = await db.salesHistory.findMany({
      where: salesWhere,
      orderBy: { date: 'asc' },
    });

    if (forecasts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No forecast data found for this product in the given period' },
        { status: 404 }
      );
    }

    // Aggregate sales by date for matching
    const salesByDate = new Map<string, number>();
    for (const sale of salesHistory) {
      const dateKey = sale.date.toISOString().split('T')[0];
      salesByDate.set(dateKey, (salesByDate.get(dateKey) || 0) + sale.quantity);
    }

    // Build month-by-month comparison
    const monthlyData = new Map<string, {
      month: string;
      forecastTotal: number;
      actualTotal: number;
      count: number;
      errors: number[];
      absPctErrors: number[];
    }>();

    for (const forecast of forecasts) {
      const dateKey = forecast.forecastDate.toISOString().split('T')[0];
      const monthKey = dateKey.substring(0, 7); // YYYY-MM
      const actualQty = salesByDate.get(dateKey) || 0;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          forecastTotal: 0,
          actualTotal: 0,
          count: 0,
          errors: [],
          absPctErrors: [],
        });
      }

      const monthEntry = monthlyData.get(monthKey)!;
      monthEntry.forecastTotal += forecast.predictedQty;
      monthEntry.actualTotal += actualQty;
      monthEntry.count += 1;

      const error = forecast.predictedQty - actualQty;
      monthEntry.errors.push(error);

      if (actualQty > 0) {
        monthEntry.absPctErrors.push(Math.abs(error / actualQty) * 100);
      }
    }

    // Calculate accuracy metrics per month
    const comparison = Array.from(monthlyData.values()).map(m => {
      const n = m.errors.length;
      const mape = m.absPctErrors.length > 0
        ? m.absPctErrors.reduce((a, b) => a + b, 0) / m.absPctErrors.length
        : null;
      const mae = n > 0
        ? m.errors.reduce((sum, e) => sum + Math.abs(e), 0) / n
        : 0;
      const rmse = n > 0
        ? Math.sqrt(m.errors.reduce((sum, e) => sum + e * e, 0) / n)
        : 0;
      const bias = n > 0
        ? m.errors.reduce((sum, e) => sum + e, 0) / n
        : 0;

      return {
        month: m.month,
        forecastTotal: Math.round(m.forecastTotal),
        actualTotal: Math.round(m.actualTotal),
        difference: Math.round(m.forecastTotal - m.actualTotal),
        mape: mape !== null ? Math.round(mape * 100) / 100 : null,
        mae: Math.round(mae * 100) / 100,
        rmse: Math.round(rmse * 100) / 100,
        bias: Math.round(bias * 100) / 100,
        dataPointCount: m.count,
      };
    });

    // Calculate overall metrics
    const allErrors: number[] = [];
    const allAbsPctErrors: number[] = [];
    let totalForecast = 0;
    let totalActual = 0;

    for (const forecast of forecasts) {
      const dateKey = forecast.forecastDate.toISOString().split('T')[0];
      const actualQty = salesByDate.get(dateKey) || 0;
      const error = forecast.predictedQty - actualQty;
      allErrors.push(error);
      if (actualQty > 0) {
        allAbsPctErrors.push(Math.abs(error / actualQty) * 100);
      }
      totalForecast += forecast.predictedQty;
      totalActual += actualQty;
    }

    const overallN = allErrors.length;
    const overallMape = allAbsPctErrors.length > 0
      ? allAbsPctErrors.reduce((a, b) => a + b, 0) / allAbsPctErrors.length
      : 0;
    const overallMae = overallN > 0
      ? allErrors.reduce((sum, e) => sum + Math.abs(e), 0) / overallN
      : 0;
    const overallRmse = overallN > 0
      ? Math.sqrt(allErrors.reduce((sum, e) => sum + e * e, 0) / overallN)
      : 0;
    const overallBias = overallN > 0
      ? allErrors.reduce((sum, e) => sum + e, 0) / overallN
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        productId,
        period: {
          from: startDate || forecasts[0].forecastDate.toISOString().split('T')[0],
          to: endDate || forecasts[forecasts.length - 1].forecastDate.toISOString().split('T')[0],
        },
        comparison,
        overall: {
          totalForecastPoints: forecasts.length,
          totalSalesRecords: salesHistory.length,
          totalForecastQty: Math.round(totalForecast),
          totalActualQty: Math.round(totalActual),
          totalDifference: Math.round(totalForecast - totalActual),
          mape: Math.round(overallMape * 100) / 100,
          mae: Math.round(overallMae * 100) / 100,
          rmse: Math.round(overallRmse * 100) / 100,
          bias: Math.round(overallBias * 100) / 100,
          accuracyRating: getAccuracyRating(overallMape),
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getAccuracyRating(mape: number): string {
  if (mape <= 10) return 'excellent';
  if (mape <= 15) return 'good';
  if (mape <= 25) return 'acceptable';
  if (mape <= 40) return 'poor';
  return 'unacceptable';
}
