// ============================================
// TrimedCast API - Auto-Recalibration
// POST: Check MAPE threshold and flag products needing recalibration
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
export const runtime = 'nodejs';


interface RecalibrationResult {
  productId: string;
  productSku: string;
  productName: string;
  category: string;
  currentModel: string;
  mape: number;
  mae: number;
  rmse: number;
  needsRecalibration: boolean;
  lastForecastDate: string | null;
  lastCalibrationDate: string | null;
  recommendation: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId: tenantIdRaw = 'demo-bd-motors',
      mapeThreshold = 15,
    } = body;
    const tenantId = await resolveTenantId(tenantIdRaw);

    // Get all products that have forecast data
    const productsWithForecasts = await db.product.findMany({
      where: {
        tenantId,
        isActive: true,
        forecasts: { some: { tenantId } },
      },
      include: {
        forecasts: {
          where: { tenantId },
          orderBy: { forecastDate: 'desc' },
          take: 1,
          select: {
            model: true,
            mape: true,
            forecastDate: true,
            createdAt: true,
          },
        },
        salesHistory: {
          where: { tenantId },
          select: { quantity: true, date: true },
        },
      },
    });

    if (productsWithForecasts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No products with forecast data found' },
        { status: 404 }
      );
    }

    const results: RecalibrationResult[] = [];
    const auditEntries: { productId: string; mape: number }[] = [];

    for (const product of productsWithForecasts) {
      // Get forecast settings for this product
      const settings = await db.forecastSetting.findFirst({
        where: { tenantId, productId: product.id },
      });

      const lastForecast = product.forecasts[0];
      const storedMape = lastForecast?.mape;

      // Calculate actual vs forecast MAPE if we have enough data
      let calculatedMape = storedMape;

      if (!calculatedMape || calculatedMape === 0) {
        // Need to calculate MAPE from recent forecast vs actual data
        const recentForecasts = await db.forecast.findMany({
          where: {
            tenantId,
            productId: product.id,
            forecastDate: { lte: new Date() }, // Only past forecasts
          },
          orderBy: { forecastDate: 'desc' },
          take: 30, // Last 30 data points
        });

        if (recentForecasts.length > 0) {
          // Aggregate sales by date
          const salesByDate = new Map<string, number>();
          for (const sale of product.salesHistory) {
            const dateKey = sale.date.toISOString().split('T')[0];
            salesByDate.set(dateKey, (salesByDate.get(dateKey) || 0) + sale.quantity);
          }

          let sumAbsPctError = 0;
          let pctErrorCount = 0;
          let sumAbsError = 0;
          let sumSquaredError = 0;

          for (const forecast of recentForecasts) {
            const dateKey = forecast.forecastDate.toISOString().split('T')[0];
            const actualQty = salesByDate.get(dateKey);

            if (actualQty !== undefined && actualQty > 0) {
              const error = forecast.predictedQty - actualQty;
              sumAbsPctError += Math.abs(error / actualQty) * 100;
              pctErrorCount++;
              sumAbsError += Math.abs(error);
              sumSquaredError += error * error;
            }
          }

          if (pctErrorCount > 0) {
            calculatedMape = Math.round((sumAbsPctError / pctErrorCount) * 100) / 100;

            // Also calculate MAE and RMSE for this product
            const mae = Math.round((sumAbsError / recentForecasts.length) * 100) / 100;
            const rmse = Math.round(Math.sqrt(sumSquaredError / recentForecasts.length) * 100) / 100;

            const needsRecalibration = calculatedMape > mapeThreshold;

            const result: RecalibrationResult = {
              productId: product.id,
              productSku: product.sku,
              productName: product.name,
              category: product.category,
              currentModel: lastForecast?.model || settings?.model || 'unknown',
              mape: calculatedMape,
              mae,
              rmse,
              needsRecalibration,
              lastForecastDate: lastForecast?.forecastDate?.toISOString().split('T')[0] || null,
              lastCalibrationDate: settings?.lastCalibrationDate?.toISOString().split('T')[0] || null,
              recommendation: getRecommendation(calculatedMape, mapeThreshold, lastForecast?.model),
            };

            results.push(result);

            if (needsRecalibration) {
              auditEntries.push({ productId: product.id, mape: calculatedMape });
            }
          }
        }
      } else {
        // Use stored MAPE
        const needsRecalibration = calculatedMape > mapeThreshold;

        results.push({
          productId: product.id,
          productSku: product.sku,
          productName: product.name,
          category: product.category,
          currentModel: lastForecast?.model || settings?.model || 'unknown',
          mape: calculatedMape,
          mae: 0, // Not available from stored data
          rmse: 0,
          needsRecalibration,
          lastForecastDate: lastForecast?.forecastDate?.toISOString().split('T')[0] || null,
          lastCalibrationDate: settings?.lastCalibrationDate?.toISOString().split('T')[0] || null,
          recommendation: getRecommendation(calculatedMape, mapeThreshold, lastForecast?.model),
        });

        if (needsRecalibration) {
          auditEntries.push({ productId: product.id, mape: calculatedMape });
        }
      }
    }

    // Create audit log entries for products needing recalibration
    if (auditEntries.length > 0) {
      await db.auditLog.create({
        data: {
          tenantId,
          action: 'update',
          entity: 'forecast',
          changes: JSON.stringify({
            type: 'recalibration_check',
            mapeThreshold,
            productsNeedingRecalibration: auditEntries.length,
            products: auditEntries,
          }),
          metadata: JSON.stringify({
            totalProductsChecked: results.length,
            flaggedCount: auditEntries.length,
          }),
        },
      });
    }

    // Sort: needs recalibration first, then by MAPE descending
    results.sort((a, b) => {
      if (a.needsRecalibration !== b.needsRecalibration) {
        return a.needsRecalibration ? -1 : 1;
      }
      return b.mape - a.mape;
    });

    const needsCount = results.filter(r => r.needsRecalibration).length;

    return NextResponse.json({
      success: true,
      data: {
        products: results,
        summary: {
          totalChecked: results.length,
          needsRecalibration: needsCount,
          withinThreshold: results.length - needsCount,
          mapeThreshold,
          averageMape: results.length > 0
            ? Math.round((results.reduce((sum, r) => sum + r.mape, 0) / results.length) * 100) / 100
            : 0,
          worstMape: results.length > 0 ? results[0].mape : 0,
        },
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getRecommendation(mape: number, threshold: number, currentModel?: string | null): string {
  if (mape <= threshold * 0.5) {
    return `Excellent accuracy (MAPE ${mape}%). Current model performing well. No action needed.`;
  }
  if (mape <= threshold) {
    return `Good accuracy (MAPE ${mape}%). Within threshold. Monitor for drift.`;
  }
  if (mape <= threshold * 2) {
    const altModel = currentModel === 'ensemble' ? 'Try increasing ensemble weights for better-performing models'
      : 'Consider switching to ensemble model for better accuracy';
    return `MAPE ${mape}% exceeds ${threshold}% threshold. ${altModel}. Review recent sales patterns for anomalies.`;
  }
  return `CRITICAL: MAPE ${mape}% is ${Math.round(mape / threshold)}x the threshold. Immediate recalibration required. Check for data quality issues, demand shocks, or structural changes.`;
}
