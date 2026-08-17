// ============================================
// TrimedCast API - Batch EOQ + Safety Stock Calculator
// POST: Calculate EOQ + SS for all/specified products
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
import {
  calculateEOQWithConstraints,
  calculateSafetyStockEnhanced,
  calculateLeadTimeStats,
  calculateErrorMetrics,
  checkRecalibration,
  runServiceLevelSensitivity,
  DEFAULT_ORDERING_COST_BDT,
  DEFAULT_HOLDING_COST_PCT,
  DEFAULT_REVIEW_PERIOD_DAYS,
  type ProductEOQSafetyStock,
} from '@/lib/forecasting/eoq-safety-stock';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId: tenantIdRaw = 'default',
      productIds,
      serviceLevel = 0.95,
      shipmentMode = 'sea',
      mapeThreshold = 10,
      orderingCost = DEFAULT_ORDERING_COST_BDT,
      holdingCostPct = DEFAULT_HOLDING_COST_PCT,
      reviewPeriodDays = DEFAULT_REVIEW_PERIOD_DAYS,
      includeSensitivity = false,
    } = body;
    const tenantId = await resolveTenantId(tenantIdRaw);

    // Fetch products with inventory
    const whereClause: Record<string, unknown> = { tenantId, isActive: true };
    if (productIds && productIds.length > 0) {
      whereClause.id = { in: productIds };
    }

    const products = await db.product.findMany({
      where: whereClause,
      include: {
        inventory: true,
        salesHistory: {
          take: 365,
          orderBy: { date: 'desc' },
        },
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No products found' },
        { status: 404 }
      );
    }

    // Fetch purchase history for lead time stats
    const allPurchaseHistory = await db.purchaseHistory.findMany({
      where: {
        tenantId,
        productId: { in: products.map(p => p.id) },
      },
      select: {
        productId: true,
        leadTimeActual: true,
      },
    });

    // Group lead times by product
    const leadTimesByProduct = new Map<string, number[]>();
    for (const ph of allPurchaseHistory) {
      if (ph.leadTimeActual && ph.leadTimeActual > 0) {
        const existing = leadTimesByProduct.get(ph.productId) || [];
        existing.push(ph.leadTimeActual);
        leadTimesByProduct.set(ph.productId, existing);
      }
    }

    // Fetch recent forecasts for error metrics
    const recentForecasts = await db.forecast.findMany({
      where: {
        tenantId,
        productId: { in: products.map(p => p.id) },
        forecastDate: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { forecastDate: 'asc' },
    });

    // Group forecasts by product
    const forecastsByProduct = new Map<string, Array<{ date: Date; predicted: number }>>();
    for (const f of recentForecasts) {
      const existing = forecastsByProduct.get(f.productId) || [];
      existing.push({ date: f.forecastDate, predicted: f.predictedQty });
      forecastsByProduct.set(f.productId, existing);
    }

    const results: ProductEOQSafetyStock[] = [];
    const recalibrationAlerts: Array<{
      productId: string;
      productSku: string;
      productName: string;
      currentMape: number;
      urgency: string;
      recommendation: string;
      suggestedActions: string[];
    }> = [];

    for (const product of products) {
      const inventory = product.inventory[0];
      const currentStock = inventory?.currentStock || 0;

      // Calculate annual demand from sales history
      const totalSales = product.salesHistory.reduce((sum, s) => sum + s.quantity, 0);
      const daysCovered = product.salesHistory.length > 0
        ? Math.max(1, (Date.now() - product.salesHistory[product.salesHistory.length - 1].date.getTime()) / (1000 * 60 * 60 * 24))
        : 365;
      const annualDemand = totalSales * (365 / daysCovered);
      const avgDailyDemand = annualDemand / 365;

      // 1. Calculate EOQ with constraints
      const eoqResult = calculateEOQWithConstraints({
        annualDemand: Math.max(1, annualDemand),
        unitCost: product.unitCost || 100,
        orderingCost,
        holdingCostPct,
        supplierMoq: product.moq || product.minOrderQty,
        maxStockQty: product.maxStock,
        warehouseCapacityRemaining: inventory?.maxStockLevel ? inventory.maxStockLevel - currentStock : undefined,
        currentStock,
      });

      // 2. Calculate σ_LT
      const leadTimes = leadTimesByProduct.get(product.id) || [];
      const leadTimeStats = calculateLeadTimeStats(leadTimes, shipmentMode);

      // 3. Calculate error metrics from forecast vs actual
      let errorMetricsResult: ReturnType<typeof calculateErrorMetrics> | undefined;
      const productForecasts = forecastsByProduct.get(product.id) || [];
      if (productForecasts.length >= 3 && product.salesHistory.length >= 3) {
        // Match forecasts with actuals by date
        const actuals: number[] = [];
        const predicted: number[] = [];
        const salesByDate = new Map<string, number>();
        for (const s of product.salesHistory) {
          const key = s.date.toISOString().split('T')[0].substring(0, 7); // month key
          salesByDate.set(key, (salesByDate.get(key) || 0) + s.quantity);
        }
        const forecastByMonth = new Map<string, number>();
        for (const f of productForecasts) {
          const key = f.date.toISOString().split('T')[0].substring(0, 7);
          forecastByMonth.set(key, (forecastByMonth.get(key) || 0) + f.predicted);
        }
        for (const [month, actual] of salesByDate) {
          const pred = forecastByMonth.get(month);
          if (pred !== undefined) {
            actuals.push(actual);
            predicted.push(pred);
          }
        }
        if (actuals.length >= 3) {
          errorMetricsResult = calculateErrorMetrics({ actual: actuals, predicted });
        }
      }

      // 4. Calculate Safety Stock
      const safetyStockResult = calculateSafetyStockEnhanced({
        eoq: eoqResult.eoq,
        mae: errorMetricsResult?.mae || (avgDailyDemand * 0.3),
        meanLeadTimeDays: leadTimeStats.meanLeadTime,
        sigmaLt: leadTimeStats.sigmaLt,
        shipmentMode,
        serviceLevel,
        reviewPeriodDays,
        avgDailyDemand,
      });

      // 5. Check recalibration
      let recalibrationResult: ReturnType<typeof checkRecalibration> | undefined;
      if (errorMetricsResult) {
        recalibrationResult = checkRecalibration(
          product.id,
          product.sku,
          product.name,
          errorMetricsResult,
          mapeThreshold
        );
        if (recalibrationResult.needsRecalibration) {
          recalibrationAlerts.push({
            productId: product.id,
            productSku: product.sku,
            productName: product.name,
            currentMape: recalibrationResult.currentMape,
            urgency: recalibrationResult.urgency,
            recommendation: recalibrationResult.recommendation,
            suggestedActions: recalibrationResult.suggestedActions,
          });
        }
      }

      // 6. Sensitivity analysis (optional)
      let sensitivity: ReturnType<typeof runServiceLevelSensitivity> | undefined;
      if (includeSensitivity) {
        sensitivity = runServiceLevelSensitivity(
          eoqResult.eoq,
          errorMetricsResult?.mae || (avgDailyDemand * 0.3),
          leadTimeStats.meanLeadTime,
          leadTimeStats.sigmaLt,
          avgDailyDemand,
          shipmentMode,
          orderingCost,
          holdingCostPct,
          product.unitCost || 100,
        );
      }

      // 7. Update inventory safety stock and reorder point in DB
      if (inventory) {
        await db.inventory.update({
          where: { id: inventory.id },
          data: {
            safetyStock: safetyStockResult.safetyStock,
            reorderPoint: safetyStockResult.reorderPoint,
          },
        }).catch(() => {}); // Don't fail if update fails
      }

      const orderFrequency = eoqResult.ordersPerYear > 0
        ? `Every ${Math.round(eoqResult.orderCycleDays)} days (${Math.round(eoqResult.ordersPerYear * 10) / 10}×/yr)`
        : 'N/A';

      results.push({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        category: product.category,
        eoq: eoqResult,
        safetyStock: safetyStockResult,
        leadTimeStats,
        errorMetrics: errorMetricsResult,
        recalibration: recalibrationResult,
        recommendation: {
          orderQty: eoqResult.eoq,
          reorderPoint: safetyStockResult.reorderPoint,
          safetyStock: safetyStockResult.safetyStock,
          orderFrequency,
          totalAnnualCost: eoqResult.totalInventoryCost,
        },
        ...(sensitivity ? { sensitivity } : {}),
      } as ProductEOQSafetyStock & { sensitivity?: typeof sensitivity });
    }

    // Sort by total annual cost descending
    results.sort((a, b) => b.recommendation.totalAnnualCost - a.recommendation.totalAnnualCost);

    // Summary stats
    const totalAnnualCost = results.reduce((sum, r) => sum + r.recommendation.totalAnnualCost, 0);
    const avgMape = results.filter(r => r.errorMetrics).length > 0
      ? results.filter(r => r.errorMetrics).reduce((sum, r) => sum + (r.errorMetrics?.mape || 0), 0) / results.filter(r => r.errorMetrics).length
      : 0;
    const productsNeedingRecal = results.filter(r => r.recalibration?.needsRecalibration).length;

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          totalProducts: results.length,
          totalAnnualCostBDT: Math.round(totalAnnualCost),
          avgMape: Math.round(avgMape * 100) / 100,
          productsNeedingRecalibration: productsNeedingRecal,
          recalibrationAlerts,
          serviceLevel,
          shipmentMode,
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
