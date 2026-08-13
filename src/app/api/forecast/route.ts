// ============================================
// TrimedCast API - Forecast Generation
// POST: Generate forecast for a product
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  movingAverage,
  exponentialSmoothing,
  seasonalDecomposition,
  prophetLike,
  ensembleForecast,
  calculateEOQ,
  calculateSafetyStock,
  type TimeSeriesPoint,
  type ForecastResult,
  type EnsembleWeights,
  DEFAULT_WEIGHTS,
} from '@/lib/forecasting/models';
import {
  calculateOrderTrigger,
  calculateTotalLeadTime,
  DEFAULT_LEAD_TIME,
  type OrderTriggerInput,
} from '@/lib/forecasting/order-trigger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId = 'default',
      productId,
      model = 'ensemble',
      horizonDays = 90,
      serviceLevel = 0.95,
      shippingMethod = 'sea',
      weights,
    } = body;

    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });
    }

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

    const timeSeries: TimeSeriesPoint[] = salesData.map(s => ({
      date: s.date.toISOString().split('T')[0],
      value: s.quantity,
    }));

    const aggregated = new Map<string, number>();
    for (const point of timeSeries) {
      aggregated.set(point.date, (aggregated.get(point.date) || 0) + point.value);
    }
    const aggregatedSeries: TimeSeriesPoint[] = Array.from(aggregated.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));

    const results: ForecastResult[] = [];
    const modelNames: string[] = [];

    if (model === 'ensemble' || model === 'moving_average') {
      try { results.push(movingAverage(aggregatedSeries, 3, horizonDays)); modelNames.push('moving_average'); } catch {}
    }
    if (model === 'ensemble' || model === 'exponential_smoothing') {
      try { results.push(exponentialSmoothing(aggregatedSeries, 0.3, 0.1, 0.2, horizonDays)); modelNames.push('exponential_smoothing'); } catch {}
    }
    if (model === 'ensemble' || model === 'seasonal_decomposition') {
      try { results.push(seasonalDecomposition(aggregatedSeries, horizonDays)); modelNames.push('seasonal_decomposition'); } catch {}
    }
    if (model === 'ensemble' || model === 'prophet_like') {
      try { results.push(prophetLike(aggregatedSeries, horizonDays)); modelNames.push('prophet_like'); } catch {}
    }

    let forecast: ForecastResult;
    if (model === 'ensemble' && results.length > 1) {
      const ensembleWeights: EnsembleWeights = weights || DEFAULT_WEIGHTS;
      forecast = ensembleForecast(results, ensembleWeights);
    } else if (results.length > 0) {
      forecast = results[results.length - 1];
    } else {
      return NextResponse.json({ success: false, error: 'No models could be fitted' }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    const inventory = await db.inventory.findFirst({ where: { tenantId, productId } });

    const avgDailyDemand = aggregatedSeries.length > 0
      ? aggregatedSeries.reduce((sum, p) => sum + p.value, 0) / aggregatedSeries.length
      : 0;

    const orderTriggerInput: OrderTriggerInput = {
      productId,
      productSku: product?.sku || '',
      productName: product?.name || '',
      currentStock: inventory?.currentStock || 0,
      reservedStock: inventory?.reservedStock || 0,
      safetyStock: inventory?.safetyStock || 15,
      reorderPoint: inventory?.reorderPoint || 30,
      avgDailyDemand,
      shippingMethod,
      serviceLevel,
    };

    const orderTrigger = calculateOrderTrigger(orderTriggerInput);

    const annualDemand = avgDailyDemand * 365;
    const eoq = calculateEOQ({
      annualDemand,
      orderingCost: 5000,
      holdingCostPerUnit: (product?.unitCost || 100) * 0.25,
    });

    const demandStdDev = aggregatedSeries.length > 1
      ? Math.sqrt(aggregatedSeries.reduce((sum, p) => sum + Math.pow(p.value - avgDailyDemand, 2), 0) / aggregatedSeries.length)
      : avgDailyDemand * 0.3;

    const safetyStockResult = calculateSafetyStock({
      avgDemand: avgDailyDemand,
      demandStdDev,
      avgLeadTime: orderTrigger.totalLeadTimeDays,
      leadTimeStdDev: 15,
      serviceLevel,
    });

    const leadTimeConfig = { ...DEFAULT_LEAD_TIME, shippingMethod: shippingMethod as 'sea' | 'air' };
    const leadTime = calculateTotalLeadTime(leadTimeConfig);

    return NextResponse.json({
      success: true,
      data: {
        product: { id: productId, sku: product?.sku, name: product?.name },
        forecast: {
          model: forecast.model,
          metrics: forecast.metrics,
          points: forecast.points,
          modelsRun: modelNames,
          individualResults: results.map(r => ({
            model: r.model,
            metrics: r.metrics,
          })),
        },
        orderTrigger: {
          ...orderTrigger,
          reorderHitDate: orderTrigger.reorderHitDate.toISOString().split('T')[0],
          orderTriggerDate: orderTrigger.orderTriggerDate.toISOString().split('T')[0],
          expectedDeliveryDate: orderTrigger.expectedDeliveryDate.toISOString().split('T')[0],
          adjustedOrderDate: orderTrigger.adjustedOrderDate.toISOString().split('T')[0],
        },
        eoq,
        safetyStock: safetyStockResult,
        leadTime: {
          total: leadTime.total,
          breakdown: leadTime.breakdown,
          shippingMethod,
        },
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
