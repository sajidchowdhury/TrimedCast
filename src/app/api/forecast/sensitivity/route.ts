// ============================================
// TrimedCast API - Service Level Sensitivity Analysis
// POST: Run sensitivity analysis for a product
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
import {
  runServiceLevelSensitivity,
  calculateEOQWithConstraints,
  calculateLeadTimeStats,
  calculateErrorMetrics,
  SERVICE_LEVEL_TABLE,
  DEFAULT_ORDERING_COST_BDT,
  DEFAULT_HOLDING_COST_PCT,
} from '@/lib/forecasting/eoq-safety-stock';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId: tenantIdRaw = 'default',
      productId,
      shipmentMode = 'sea',
      orderingCost = DEFAULT_ORDERING_COST_BDT,
      holdingCostPct = DEFAULT_HOLDING_COST_PCT,
    } = body;
    const tenantId = await resolveTenantId(tenantIdRaw);

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        inventory: true,
        salesHistory: {
          take: 365,
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const inventory = product.inventory[0];
    const currentStock = inventory?.currentStock || 0;

    // Calculate annual demand
    const totalSales = product.salesHistory.reduce((sum, s) => sum + s.quantity, 0);
    const annualDemand = Math.max(1, totalSales * (365 / Math.max(1, product.salesHistory.length)));
    const avgDailyDemand = annualDemand / 365;

    // Calculate EOQ
    const eoqResult = calculateEOQWithConstraints({
      annualDemand,
      unitCost: product.unitCost || 100,
      orderingCost,
      holdingCostPct,
      supplierMoq: product.moq || product.minOrderQty,
      maxStockQty: product.maxStock,
      currentStock,
    });

    // Get lead time stats
    const purchaseHistory = await db.purchaseHistory.findMany({
      where: { tenantId, productId },
      select: { leadTimeActual: true },
    });
    const leadTimes = purchaseHistory
      .filter(ph => ph.leadTimeActual && ph.leadTimeActual > 0)
      .map(ph => ph.leadTimeActual as number);
    const leadTimeStats = calculateLeadTimeStats(leadTimes, shipmentMode);

    // Get MAE from forecast errors
    const forecasts = await db.forecast.findMany({
      where: {
        tenantId,
        productId,
        forecastDate: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { forecastDate: 'asc' },
    });
    let mae = avgDailyDemand * 0.3; // Default
    if (forecasts.length >= 3 && product.salesHistory.length >= 3) {
      const salesByMonth = new Map<string, number>();
      for (const s of product.salesHistory) {
        const key = s.date.toISOString().split('T')[0].substring(0, 7);
        salesByMonth.set(key, (salesByMonth.get(key) || 0) + s.quantity);
      }
      const forecastByMonth = new Map<string, number>();
      for (const f of forecasts) {
        const key = f.forecastDate.toISOString().split('T')[0].substring(0, 7);
        forecastByMonth.set(key, (forecastByMonth.get(key) || 0) + f.predictedQty);
      }
      const actuals: number[] = [];
      const predicted: number[] = [];
      for (const [month, actual] of salesByMonth) {
        const pred = forecastByMonth.get(month);
        if (pred !== undefined) {
          actuals.push(actual);
          predicted.push(pred);
        }
      }
      if (actuals.length >= 3) {
        const metrics = calculateErrorMetrics({ actual: actuals, predicted });
        mae = metrics.mae;
      }
    }

    // Run sensitivity analysis
    const sensitivity = runServiceLevelSensitivity(
      eoqResult.eoq,
      mae,
      leadTimeStats.meanLeadTime,
      leadTimeStats.sigmaLt,
      avgDailyDemand,
      shipmentMode,
      orderingCost,
      holdingCostPct,
      product.unitCost || 100,
    );

    return NextResponse.json({
      success: true,
      data: {
        product: { id: product.id, sku: product.sku, name: product.name, category: product.category },
        eoq: eoqResult,
        leadTimeStats,
        sensitivity,
        serviceLevelTable: SERVICE_LEVEL_TABLE,
        shipmentMode,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
