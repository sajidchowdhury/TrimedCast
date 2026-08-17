// ============================================
// TrimedCast API - Seasonal Best Products
// GET: Predict best-selling products for next season
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
import { getBDSeason, type BDSeason, type SeasonInfo, BD_SEASONS } from '@/lib/forecasting/models';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdRaw = searchParams.get('tenantId') || 'demo-bd-motors';
    const tenantId = await resolveTenantId(tenantIdRaw);
    const targetSeasonParam = searchParams.get('targetSeason');

    // Determine target season
    let targetSeason: SeasonInfo;
    if (targetSeasonParam && BD_SEASONS.some(s => s.season === targetSeasonParam)) {
      targetSeason = getBDSeason(
        BD_SEASONS.find(s => s.season === targetSeasonParam)!.months[0]
      );
    } else {
      // Default: next season from today
      targetSeason = getNextSeason();
    }

    // Fetch all products with inventory and sales data
    const products = await db.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        inventory: {
          where: { tenantId },
          select: {
            currentStock: true,
            availableStock: true,
            safetyStock: true,
            reorderPoint: true,
          },
        },
        salesHistory: {
          where: { tenantId },
          select: {
            quantity: true,
            date: true,
            season: true,
          },
        },
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No products found for this tenant' },
        { status: 404 }
      );
    }

    interface ProductPrediction {
      productId: string;
      sku: string;
      name: string;
      category: string;
      unitCost: number | null;
      sellingPrice: number | null;
      seasonalDemandMultiplier: number;
      recentTrend: number;
      predictedDemand: number;
      currentStock: number;
      stockGap: number;
      stockGapValue: number;
      isStockoutRisk: boolean;
      historicalSeasonalAvg: number;
      recentMonthlyAvg: number;
    }

    const predictions: ProductPrediction[] = [];
    const now = new Date();

    for (const product of products) {
      const inv = product.inventory[0];
      const currentStock = inv?.currentStock || 0;
      const salesData = product.salesHistory;

      if (salesData.length === 0) continue; // Skip products with no sales

      // Aggregate sales by date
      const dailySales = new Map<string, number>();
      for (const sale of salesData) {
        const dateKey = sale.date.toISOString().split('T')[0];
        dailySales.set(dateKey, (dailySales.get(dateKey) || 0) + sale.quantity);
      }

      // Calculate recent trend (last 3 months avg daily demand)
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const recentSales = salesData.filter(s => s.date >= threeMonthsAgo);
      const recentTotal = recentSales.reduce((sum, s) => sum + s.quantity, 0);
      const recentDays = Math.max(1, Math.ceil(
        (now.getTime() - threeMonthsAgo.getTime()) / (1000 * 60 * 60 * 24)
      ));
      const recentDailyAvg = recentTotal / recentDays;
      const recentMonthlyAvg = recentDailyAvg * 30;

      // Calculate historical seasonal average for the target season
      const seasonalSales = salesData.filter(s => {
        // Check if the sale month falls within the target season months
        const saleMonth = s.date.getMonth() + 1;
        return targetSeason.months.includes(saleMonth);
      });

      let historicalSeasonalAvg = 0;
      if (seasonalSales.length > 0) {
        // Group by year-month to get monthly totals
        const monthlyTotals = new Map<string, number>();
        for (const sale of seasonalSales) {
          const monthKey = sale.date.toISOString().substring(0, 7);
          monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + sale.quantity);
        }
        const monthlyValues = Array.from(monthlyTotals.values());
        historicalSeasonalAvg = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length;
      }

      // Predicted demand for target season:
      // Use seasonal multiplier × recent trend, weighted with historical seasonal data
      const seasonalDemandMultiplier = targetSeason.demandMultiplier;
      let predictedDemand: number;

      if (historicalSeasonalAvg > 0) {
        // Blend: 60% historical seasonal avg, 40% multiplier × recent trend
        const multiplierPrediction = seasonalDemandMultiplier * recentMonthlyAvg;
        predictedDemand = 0.6 * historicalSeasonalAvg + 0.4 * multiplierPrediction;
      } else {
        // Only use multiplier approach
        predictedDemand = seasonalDemandMultiplier * recentMonthlyAvg;
      }

      // Stock gap analysis
      const stockGap = Math.max(0, predictedDemand - currentStock);
      const stockGapValue = stockGap * (product.unitCost || 0);
      const isStockoutRisk = currentStock < (inv?.safetyStock || 0) || stockGap > predictedDemand * 0.5;

      predictions.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        unitCost: product.unitCost,
        sellingPrice: product.sellingPrice,
        seasonalDemandMultiplier,
        recentTrend: Math.round(recentMonthlyAvg * 100) / 100,
        predictedDemand: Math.round(predictedDemand),
        currentStock,
        stockGap: Math.round(stockGap),
        stockGapValue: Math.round(stockGapValue * 100) / 100,
        isStockoutRisk,
        historicalSeasonalAvg: Math.round(historicalSeasonalAvg),
        recentMonthlyAvg: Math.round(recentMonthlyAvg),
      });
    }

    // Sort by predicted demand descending
    predictions.sort((a, b) => b.predictedDemand - a.predictedDemand);

    // Summary stats
    const totalPredictedDemand = predictions.reduce((sum, p) => sum + p.predictedDemand, 0);
    const totalStockGap = predictions.reduce((sum, p) => sum + p.stockGap, 0);
    const totalStockGapValue = predictions.reduce((sum, p) => sum + p.stockGapValue, 0);
    const stockoutRiskCount = predictions.filter(p => p.isStockoutRisk).length;
    const top10PredictedDemand = predictions.slice(0, 10).reduce((sum, p) => sum + p.predictedDemand, 0);

    return NextResponse.json({
      success: true,
      data: {
        targetSeason: {
          season: targetSeason.season,
          label: targetSeason.label,
          labelBn: targetSeason.labelBn,
          months: targetSeason.months,
          demandMultiplier: targetSeason.demandMultiplier,
          description: targetSeason.description,
        },
        products: predictions,
        summary: {
          totalProducts: predictions.length,
          totalPredictedDemand: Math.round(totalPredictedDemand),
          totalStockGap: Math.round(totalStockGap),
          totalStockGapValue: Math.round(totalStockGapValue * 100) / 100,
          stockoutRiskCount,
          top10SharePercent: totalPredictedDemand > 0
            ? Math.round((top10PredictedDemand / totalPredictedDemand) * 10000) / 100
            : 0,
        },
        currentSeason: {
          season: getBDSeason(now.getMonth() + 1).season,
          label: getBDSeason(now.getMonth() + 1).label,
        },
        calculatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getNextSeason(): SeasonInfo {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentSeason = getBDSeason(currentMonth);

  // Determine next season by looking ahead
  const seasonOrder: BDSeason[] = ['winter', 'summer', 'monsoon', 'pre_winter'];

  const currentIdx = seasonOrder.indexOf(currentSeason.season);
  const nextIdx = (currentIdx + 1) % seasonOrder.length;
  const nextSeasonName = seasonOrder[nextIdx];

  return BD_SEASONS.find(s => s.season === nextSeasonName) || BD_SEASONS[0];
}
