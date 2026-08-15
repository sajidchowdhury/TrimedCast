// ============================================
// TrimedCast API - Advanced Forecast
// POST: Run advanced forecast models for a product
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
import {
  movingAverage,
  exponentialSmoothing,
  seasonalDecomposition,
  prophetLike,
  type TimeSeriesPoint,
  type ForecastResult,
} from '@/lib/forecasting/models';
import {
  prophetBD,
  exponentialSmoothingAutoTune,
  regressionModel,
  regressionPredict,
  consensusForecast,
  consensusToForecastResult,
  applyHolidayEffect,
  getHolidaysForYear,
  type RegressionDataPoint,
  type ConsensusResult,
} from '@/lib/forecasting/advanced-models';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId: tenantIdRaw = 'default',
      productId,
      methods = ['prophet_bd', 'ets_autotune', 'regression'],
      horizonDays = 90,
      includeHolidays = true,
      includeCNY = true,
    } = body;

    const tenantId = await resolveTenantId(tenantIdRaw);

    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });
    }

    // Fetch sales history
    const salesData = await db.salesHistory.findMany({
      where: { tenantId, productId },
      orderBy: { date: 'asc' },
    });

    if (salesData.length < 4) {
      return NextResponse.json(
        { success: false, error: `Need at least 4 data points, found ${salesData.length}. Import more sales history first.` },
        { status: 400 }
      );
    }

    // Build time series
    const timeSeries: TimeSeriesPoint[] = salesData.map(s => ({
      date: s.date.toISOString().split('T')[0],
      value: s.quantity,
    }));

    // Aggregate by date
    const aggregated = new Map<string, number>();
    for (const point of timeSeries) {
      aggregated.set(point.date, (aggregated.get(point.date) || 0) + point.value);
    }
    const aggregatedSeries: TimeSeriesPoint[] = Array.from(aggregated.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));

    // Fetch product info for regression
    const product = await db.product.findUnique({ where: { id: productId } });
    const inventory = await db.inventory.findFirst({ where: { tenantId, productId } });

    // Run requested models
    const results: Record<string, ForecastResult> = {};
    let consensus: ConsensusResult | null = null;
    let bestModel = '';

    // Prophet BD
    if (methods.includes('prophet_bd')) {
      try {
        results.prophet_bd = prophetBD(aggregatedSeries, horizonDays, 'multiplicative', includeHolidays);
      } catch (e) {
        results.prophet_bd = {
          model: 'prophet_bd',
          points: [],
          metrics: { mape: Infinity, mae: Infinity, rmse: Infinity, bias: 0 },
          params: { error: e instanceof Error ? e.message : 'Failed' },
        };
      }
    }

    // ETS Auto-Tune
    if (methods.includes('ets_autotune')) {
      try {
        const etsResult = exponentialSmoothingAutoTune(aggregatedSeries, horizonDays, 'holt_winters');
        results.ets_autotune = {
          model: etsResult.model,
          points: etsResult.points,
          metrics: etsResult.metrics,
          params: { ...etsResult.params, autoTune: etsResult.autoTune },
        };
      } catch (e) {
        results.ets_autotune = {
          model: 'ets_autotune',
          points: [],
          metrics: { mape: Infinity, mae: Infinity, rmse: Infinity, bias: 0 },
          params: { error: e instanceof Error ? e.message : 'Failed' },
        };
      }
    }

    // Regression
    if (methods.includes('regression')) {
      try {
        // Build regression data using price from product and synthetic promo_index
        const unitPrice = product?.sellingPrice || product?.unitCost || 100;
        const regressionData: RegressionDataPoint[] = aggregatedSeries.map((d, i) => {
          const month = new Date(d.date).getMonth() + 1;
          // Synthetic promo index: higher during Eid months (Apr, Jul) and winter
          const promoIndex = [4, 7].includes(month) ? 1.5 : [11, 12, 1, 2].includes(month) ? 1.2 : 0.8;
          return {
            date: d.date,
            price: unitPrice,
            promoIndex,
            qtySold: d.value,
          };
        });

        const regResult = regressionModel(regressionData);
        const avgPromoIndex = 1.0;
        const predictedDemand = regressionPredict(regResult, unitPrice, avgPromoIndex);

        // Create forecast points from regression prediction
        const lastDate = new Date(aggregatedSeries[aggregatedSeries.length - 1].date);
        const points = [];
        for (let i = 1; i <= horizonDays; i++) {
          const date = new Date(lastDate);
          date.setDate(date.getDate() + i);
          const month = date.getMonth() + 1;
          const promoIdx = [4, 7].includes(month) ? 1.5 : [11, 12, 1, 2].includes(month) ? 1.2 : 0.8;
          const pred = regressionPredict(regResult, unitPrice, promoIdx);
          const { adjusted } = includeHolidays ? applyHolidayEffect(pred, date) : { adjusted: pred, activeHolidays: [] };
          const seasonInfo = (() => {
            if ([11, 12, 1, 2].includes(month)) return 'winter' as const;
            if ([3, 4, 5].includes(month)) return 'summer' as const;
            if ([6, 7, 8, 9].includes(month)) return 'monsoon' as const;
            return 'pre_winter' as const;
          })();
          points.push({
            date: date.toISOString().split('T')[0],
            predicted: Math.round(adjusted),
            lowerBound: Math.max(0, Math.round(adjusted * 0.8)),
            upperBound: Math.round(adjusted * 1.2),
            season: seasonInfo,
            confidence: Math.max(0.5, 0.95 - i * 0.001),
          });
        }

        results.regression = {
          model: 'regression',
          points,
          metrics: {
            mape: regResult.rSquared > 0 ? (1 - regResult.rSquared) * 100 : 50,
            mae: 0,
            rmse: 0,
            bias: 0,
          },
          params: {
            regression: regResult,
            unitPrice,
            horizonDays,
          },
        };
      } catch (e) {
        results.regression = {
          model: 'regression',
          points: [],
          metrics: { mape: Infinity, mae: Infinity, rmse: Infinity, bias: 0 },
          params: { error: e instanceof Error ? e.message : 'Failed' },
        };
      }
    }

    // Also run basic models for consensus baseline
    let baselineResult: ForecastResult | null = null;
    try {
      baselineResult = movingAverage(aggregatedSeries, 3, horizonDays);
      results.moving_average = baselineResult;
    } catch { /* skip */ }

    try {
      results.exponential_smoothing = exponentialSmoothing(aggregatedSeries, 0.3, 0.1, 0.2, horizonDays);
    } catch { /* skip */ }

    try {
      results.seasonal_decomposition = seasonalDecomposition(aggregatedSeries, horizonDays);
    } catch { /* skip */ }

    try {
      results.prophet_like = prophetLike(aggregatedSeries, horizonDays);
    } catch { /* skip */ }

    // Find best model by MAPE (lowest, finite)
    const validResults = Object.entries(results)
      .filter(([, r]) => r.metrics.mape < Infinity && r.points.length > 0);

    if (validResults.length > 0) {
      validResults.sort((a, b) => a[1].metrics.mape - b[1].metrics.mape);
      bestModel = validResults[0][0];
    }

    // Build consensus forecast if we have results
    if (results.prophet_bd && results.prophet_bd.points.length > 0 && baselineResult) {
      const avgBaseline = baselineResult.points.length > 0
        ? baselineResult.points.reduce((s, p) => s + p.predicted, 0) / baselineResult.points.length
        : aggregatedSeries.reduce((s, d) => s + d.value, 0) / aggregatedSeries.length;

      const avgProphetBD = results.prophet_bd.points.reduce((s, p) => s + p.predicted, 0) / results.prophet_bd.points.length;
      const seasonalMultiplier = avgBaseline > 0 ? avgProphetBD / avgBaseline : 1;

      consensus = consensusForecast({
        baselineForecast: avgBaseline,
        baselineModel: 'moving_average',
        seasonalMultiplier,
        seasonalModel: 'prophet_bd',
      });

      // Also generate per-day consensus forecast points
      if (baselineResult.points.length > 0 && results.prophet_bd.points.length > 0) {
        const minLen = Math.min(baselineResult.points.length, results.prophet_bd.points.length);
        const consensusPerDay = [];
        for (let i = 0; i < minLen; i++) {
          const dayConsensus = consensusForecast({
            baselineForecast: baselineResult.points[i].predicted,
            baselineModel: 'moving_average',
            seasonalMultiplier: baselineResult.points[i].predicted > 0
              ? results.prophet_bd.points[i].predicted / baselineResult.points[i].predicted
              : 1,
            seasonalModel: 'prophet_bd',
          });
          consensusPerDay.push({
            date: baselineResult.points[i].date,
            value: dayConsensus.finalForecast,
            season: baselineResult.points[i].season,
          });
        }
        results.consensus = consensusToForecastResult(aggregatedSeries, consensusPerDay, horizonDays);
      }
    }

    // Holiday calendar for current and next year
    const currentYear = new Date().getFullYear();
    const holidays = [
      ...getHolidaysForYear(currentYear),
      ...getHolidaysForYear(currentYear + 1),
    ];

    return NextResponse.json({
      success: true,
      data: {
        results,
        consensus,
        bestModel,
        holidays,
        product: {
          id: productId,
          sku: product?.sku,
          name: product?.name,
          category: product?.category,
        },
        inventory: inventory ? {
          currentStock: inventory.currentStock,
          availableStock: inventory.availableStock,
          safetyStock: inventory.safetyStock,
          reorderPoint: inventory.reorderPoint,
        } : null,
        dataPoints: aggregatedSeries.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
