// ============================================
// GET /api/v1/sop-cycles/{id}/pva
// Plan-vs-Actual analysis for governance stage
// Compares forecasts vs actual sales for the
// cycle's period to calculate accuracy metrics
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  notFoundError,
} from '@/lib/api/response';
import { getAuthContext, tenantScope } from '@/lib/api/auth';

// MAPE threshold for flagging SKUs exceeding acceptable forecast error
const MAPE_THRESHOLD_PCT = 20;

interface CategoryAccuracy {
  category: string;
  forecast_total: number;
  actual_total: number;
  variance: number;
  accuracy_pct: number;
  mape_pct: number;
  sku_count: number;
}

interface SkuExceedingThreshold {
  product_id: string;
  sku: string;
  name: string;
  category: string;
  forecast_qty: number;
  actual_qty: number;
  mape_pct: number;
  variance_pct: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();

    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const tenantId = context.tenantId;
    const url = new URL(request.url);

    // Optional query param to override threshold
    const thresholdParam = url.searchParams.get('threshold_pct');
    const mapeThreshold = thresholdParam
      ? parseFloat(thresholdParam)
      : MAPE_THRESHOLD_PCT;

    // Find the S&OP cycle
    const cycle = await db.sopCycle.findFirst({
      where: {
        id,
        ...tenantScope(tenantId),
      },
    });

    if (!cycle) {
      return notFoundError('S&OP Cycle');
    }

    // PVA is most meaningful at governance stage, but allow at any stage
    // for mid-cycle monitoring

    // Fetch forecasts within the cycle period
    const forecasts = await db.forecast.findMany({
      where: {
        ...tenantScope(tenantId),
        forecastDate: {
          gte: cycle.periodStart,
          lte: cycle.periodEnd,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            category: true,
          },
        },
      },
    });

    // Fetch actual sales within the cycle period
    const salesHistory = await db.salesHistory.findMany({
      where: {
        ...tenantScope(tenantId),
        date: {
          gte: cycle.periodStart,
          lte: cycle.periodEnd,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            category: true,
          },
        },
      },
    });

    // Aggregate actuals by product
    const actualsByProduct = new Map<string, number>();
    for (const sale of salesHistory) {
      const current = actualsByProduct.get(sale.productId) || 0;
      actualsByProduct.set(sale.productId, current + sale.quantity);
    }

    // Aggregate forecasts by product (sum predicted quantities)
    const forecastsByProduct = new Map<string, { total: number; mapeValues: number[] }>();
    for (const f of forecasts) {
      const existing = forecastsByProduct.get(f.productId) || { total: 0, mapeValues: [] };
      existing.total += f.predictedQty;
      if (f.mape !== null && f.mape !== undefined) {
        existing.mapeValues.push(f.mape * 100); // Convert from decimal to percentage
      }
      forecastsByProduct.set(f.productId, existing);
    }

    // Get all unique products involved
    const allProductIds = new Set([
      ...forecastsByProduct.keys(),
      ...actualsByProduct.keys(),
    ]);

    // Fetch product details for any products only in actuals
    const missingProductIds = [...allProductIds].filter(
      (pid) => !forecasts.find((f) => f.productId === pid)
    );
    const additionalProducts = missingProductIds.length > 0
      ? await db.product.findMany({
          where: {
            id: { in: missingProductIds },
            ...tenantScope(tenantId),
          },
          select: { id: true, sku: true, name: true, category: true },
        })
      : [];

    const productMap = new Map<string, { sku: string; name: string; category: string }>();
    for (const f of forecasts) {
      productMap.set(f.productId, {
        sku: f.product.sku,
        name: f.product.name,
        category: f.product.category,
      });
    }
    for (const p of additionalProducts) {
      productMap.set(p.id, { sku: p.sku, name: p.name, category: p.category });
    }

    // --- Calculate per-SKU metrics ---
    const skuMetrics: Array<{
      productId: string;
      forecastQty: number;
      actualQty: number;
      mapePct: number;
      variancePct: number;
      category: string;
    }> = [];

    for (const productId of allProductIds) {
      const forecastQty = forecastsByProduct.get(productId)?.total || 0;
      const actualQty = actualsByProduct.get(productId) || 0;
      const mapeValues = forecastsByProduct.get(productId)?.mapeValues || [];
      const product = productMap.get(productId);

      // Calculate MAPE for this SKU
      let mapePct: number;
      if (mapeValues.length > 0) {
        // Use stored MAPE values averaged
        mapePct = mapeValues.reduce((a, b) => a + b, 0) / mapeValues.length;
      } else if (actualQty > 0 && forecastQty > 0) {
        // Calculate from aggregated values
        mapePct = Math.abs((actualQty - forecastQty) / actualQty) * 100;
      } else if (actualQty === 0 && forecastQty > 0) {
        mapePct = 100; // Forecasted but no sales — 100% error
      } else if (actualQty > 0 && forecastQty === 0) {
        mapePct = 100; // Had sales but no forecast — 100% error
      } else {
        mapePct = 0;
      }

      const variancePct = actualQty > 0
        ? ((forecastQty - actualQty) / actualQty) * 100
        : forecastQty > 0 ? 100 : 0;

      skuMetrics.push({
        productId,
        forecastQty,
        actualQty,
        mapePct: Math.round(mapePct * 100) / 100,
        variancePct: Math.round(variancePct * 100) / 100,
        category: product?.category || 'unknown',
      });
    }

    // --- Calculate overall accuracy ---
    const totalForecast = skuMetrics.reduce((sum, m) => sum + m.forecastQty, 0);
    const totalActual = skuMetrics.reduce((sum, m) => sum + m.actualQty, 0);

    let overallAccuracyPct: number;
    if (totalActual > 0) {
      const overallMape = Math.abs((totalActual - totalForecast) / totalActual) * 100;
      overallAccuracyPct = Math.max(0, Math.round((100 - overallMape) * 100) / 100);
    } else {
      overallAccuracyPct = totalForecast === 0 ? 100 : 0;
    }

    // --- Calculate by-category accuracy ---
    const categories = new Set(skuMetrics.map((m) => m.category));
    const byCategory: CategoryAccuracy[] = [];

    for (const category of categories) {
      const categorySkus = skuMetrics.filter((m) => m.category === category);
      const catForecast = categorySkus.reduce((sum, m) => sum + m.forecastQty, 0);
      const catActual = categorySkus.reduce((sum, m) => sum + m.actualQty, 0);
      const catMapeValues = categorySkus.map((m) => m.mapePct);

      let catMapePct: number;
      if (catActual > 0) {
        catMapePct = Math.abs((catActual - catForecast) / catActual) * 100;
      } else {
        catMapePct = catForecast > 0 ? 100 : 0;
      }

      const catAccuracyPct = Math.max(0, Math.round((100 - catMapePct) * 100) / 100);

      byCategory.push({
        category,
        forecast_total: Math.round(catForecast),
        actual_total: Math.round(catActual),
        variance: Math.round(catForecast - catActual),
        accuracy_pct: catAccuracyPct,
        mape_pct: Math.round(catMapePct * 100) / 100,
        sku_count: categorySkus.length,
      });
    }

    // Sort categories by MAPE descending (worst accuracy first)
    byCategory.sort((a, b) => b.mape_pct - a.mape_pct);

    // --- SKUs exceeding threshold ---
    const skusExceedingThreshold: SkuExceedingThreshold[] = skuMetrics
      .filter((m) => m.mapePct > mapeThreshold)
      .map((m) => {
        const product = productMap.get(m.productId);
        return {
          product_id: m.productId,
          sku: product?.sku || 'unknown',
          name: product?.name || 'unknown',
          category: m.category,
          forecast_qty: Math.round(m.forecastQty),
          actual_qty: m.actualQty,
          mape_pct: m.mapePct,
          variance_pct: m.variancePct,
        };
      })
      .sort((a, b) => b.mape_pct - a.mape_pct); // Worst offenders first

    // --- Summary metrics ---
    const avgMape = skuMetrics.length > 0
      ? skuMetrics.reduce((sum, m) => sum + m.mapePct, 0) / skuMetrics.length
      : 0;

    const medianMape = (() => {
      if (skuMetrics.length === 0) return 0;
      const sorted = [...skuMetrics].sort((a, b) => a.mapePct - b.mapePct);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0
        ? sorted[mid].mapePct
        : (sorted[mid - 1].mapePct + sorted[mid].mapePct) / 2;
    })();

    return apiSuccess({
      cycle_id: cycle.id,
      cycle_name: cycle.name,
      period_start: cycle.periodStart,
      period_end: cycle.periodEnd,
      current_stage: cycle.stage,
      overall_accuracy_pct: overallAccuracyPct,
      total_forecast_qty: Math.round(totalForecast),
      total_actual_qty: totalActual,
      total_variance: Math.round(totalForecast - totalActual),
      avg_mape_pct: Math.round(avgMape * 100) / 100,
      median_mape_pct: Math.round(medianMape * 100) / 100,
      mape_threshold_pct: mapeThreshold,
      sku_count: allProductIds.size,
      skus_within_threshold: skuMetrics.length - skusExceedingThreshold.length,
      skus_exceeding_threshold_count: skusExceedingThreshold.length,
      by_category: byCategory,
      skus_exceeding_threshold: skusExceedingThreshold,
    });
  } catch (error) {
    console.error('[SopCycles/[id]/Pva/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to calculate Plan-vs-Actual analysis' }, 500);
  }
}
