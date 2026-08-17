// ============================================
// POST /api/orders/seasonal-pipeline
// THE MAIN ENDPOINT — Seasonal Best Products with
// Full Order Trigger Analysis
//
// Section 6.4: Seasonal Pipeline Output Format
// Section 9: Order Trigger Pipeline (Orchestrator)
//
// For each product:
//   1. Loads from DB (inventory, supplier, sales)
//   2. Applies seasonal weight (category-specific)
//   3. Calls calculateOrderTrigger with full CNY analysis
//   4. Returns sorted by urgency → adjusted demand
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
import {
  safeCalculateOrderTrigger,
  applySeasonalWeight,
  getSeasonForDate,
  getSeasonDateRange,
  getCNYForDate,
  type OrderTriggerInput,
  type OrderTriggerResult,
  type Urgency,
  type CNYStrategy,
} from '@/lib/forecasting/order-trigger';
import { getBDSeason, type BDSeason } from '@/lib/forecasting/models';
export const runtime = 'nodejs';


// ── Response Types ──

interface SeasonalPipelineProduct {
  productId: string;
  productSku: string;
  productName: string;
  category: string;

  // Demand
  baseDemand: number;
  seasonalWeight: number;
  adjustedDemand: number;

  // Order recommendation
  recommendedQty: number;
  qtyBreakdown: OrderTriggerResult['qtyBreakdown'];

  // Timeline
  orderTriggerDate: string;
  expectedAvailableDate: string;
  totalLeadTimeDays: number;
  daysUntilTrigger: number;

  // Urgency & status
  urgency: Urgency;
  stockStatus: string;
  daysOfStock: number;

  // CNY
  cnyRisk: boolean;
  cnyStrategy: CNYStrategy;
  cnyDelayDays: number;
  cnyExplanation: string;

  // Shipment
  recommendedShipmentMode: 'sea' | 'air';

  // Cost
  unitCostBdt: number;
  totalCostBdt: number;

  // Season context
  currentSeason: BDSeason;
  seasonNote: string;
}

interface SeasonalPipelineSummary {
  totalProducts: number;
  totalRecommendedUnits: number;
  totalRecommendedSpendBdt: number;
  urgencyBreakdown: Record<Urgency, number>;
  cnyRiskCount: number;
  cnyStrategyBreakdown: Record<CNYStrategy, number>;
  earliestOrderDate: string | null;
  latestOrderDate: string | null;
}

interface SeasonalPipelineResponse {
  forecastSessionId: string;
  tenantId: string;
  targetSeason: BDSeason;
  targetYear: number;
  shippingMethod: 'sea' | 'air';
  serviceLevel: number;
  period: { start: string; end: string; totalDays: number };
  generatedAt: string;
  cnyWindow: {
    year: number;
    shutdownStart: string;
    shutdownEnd: string;
  } | null;
  products: SeasonalPipelineProduct[];
  summary: SeasonalPipelineSummary;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId: tenantIdSlug,
      targetSeason: targetSeasonRaw,
      targetYear = new Date().getFullYear() + 1,
      topN = 50,
      shippingMethod = 'sea',
      serviceLevel = 0.95,
    } = body;

    // ── Resolve Tenant ──
    const tenantId = await resolveTenantId(tenantIdSlug || 'demo-bd-motors');

    // ── Validate Season ──
    const validSeasons: BDSeason[] = ['winter', 'summer', 'monsoon', 'pre_winter'];
    const targetSeason: BDSeason = validSeasons.includes(targetSeasonRaw)
      ? targetSeasonRaw
      : getSeasonForDate(new Date());

    // ── Validate Shipping Method ──
    const effectiveShippingMethod: 'sea' | 'air' = shippingMethod === 'air' ? 'air' : 'sea';

    // ── Validate Service Level ──
    const effectiveServiceLevel = Math.max(0.5, Math.min(0.999, serviceLevel));

    // ── Load Products from DB ──
    const products = await db.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        inventory: true,
        supplier: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active products found for this tenant' },
        { status: 404 },
      );
    }

    // ── Load Sales History (90 days) ──
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const salesAgg = await db.salesHistory.groupBy({
      by: ['productId'],
      where: {
        tenantId,
        date: { gte: ninetyDaysAgo },
      },
      _sum: { quantity: true },
    });

    const salesMap = new Map<string, number>();
    for (const s of salesAgg) {
      if (s.productId) salesMap.set(s.productId, s._sum.quantity || 0);
    }

    // ── Load Pending Purchase Orders ──
    const pendingPOs = await db.purchaseOrder.findMany({
      where: {
        tenantId,
        status: { in: ['confirmed', 'in_production', 'shipped', 'in_transit'] },
      },
    });

    const poQtyMap = new Map<string, number>();
    for (const po of pendingPOs) {
      const items = po.items as Array<{ productId?: string; productSku?: string; qty?: number }> | null;
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.productId) {
            poQtyMap.set(item.productId, (poQtyMap.get(item.productId) || 0) + (item.qty || 0));
          }
        }
      }
    }

    // ── Process Each Product ──
    const pipelineProducts: SeasonalPipelineProduct[] = [];

    for (const product of products) {
      const inv = product.inventory[0] ?? product.inventory;
      const currentStock = inv?.currentStock ?? 0;
      const reservedStock = inv?.reservedStock ?? 0;
      const safetyStock = inv?.safetyStock ?? Math.max(1, Math.round(currentStock * 0.1));
      const reorderPoint = inv?.reorderPoint ?? Math.round(currentStock * 0.3);
      const maxStock = inv?.maxStock ?? product.maxStock ?? Math.max(currentStock * 3, 100);

      // Daily demand from sales
      const totalSalesQty = salesMap.get(product.id) || 0;
      const avgDailyDemand = totalSalesQty > 0 ? totalSalesQty / 90 : 0;

      // Skip products with no demand and adequate stock
      if (avgDailyDemand === 0 && currentStock > safetyStock) continue;

      const effectiveDailyDemand = avgDailyDemand || 0.5;

      // ── Apply Seasonal Weight ──
      const seasonalWeight = applySeasonalWeight(1.0, targetSeason, product.category);
      const baseDemand = Math.round(effectiveDailyDemand * 120); // 120-day forecast horizon
      const adjustedDemand = Math.round(baseDemand * seasonalWeight);

      // ── Calculate Full Order Trigger ──
      const triggerInput: OrderTriggerInput = {
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        category: product.category,
        currentStock,
        reservedStock,
        safetyStock,
        maxStock,
        reorderPoint,
        avgDailyDemand: effectiveDailyDemand,
        forecastedDemand: adjustedDemand,
        qtyOnOrder: poQtyMap.get(product.id) || 0,
        eoq: product.eoq || 100,
        moq: product.moq || product.minOrderQty || 50,
        shippingMethod: effectiveShippingMethod,
        serviceLevel: effectiveServiceLevel,
        leadTimeConfig: {
          manufacturingDays: product.leadTimeDays ?? product.supplier?.leadTimeDays ?? 90,
        },
      };

      const result: OrderTriggerResult = safeCalculateOrderTrigger(triggerInput);

      // Only include products that need an order
      if (!result.needsOrder) continue;

      const unitCost = product.unitCost ?? 0;
      const fmt = (d: Date) => d.toISOString().split('T')[0];

      pipelineProducts.push({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        category: product.category,

        baseDemand,
        seasonalWeight: Math.round(seasonalWeight * 100) / 100,
        adjustedDemand,

        recommendedQty: result.suggestedOrderQty,
        qtyBreakdown: result.qtyBreakdown,

        orderTriggerDate: fmt(result.orderTriggerDate),
        expectedAvailableDate: fmt(result.expectedDeliveryDate),
        totalLeadTimeDays: result.totalLeadTimeDays,
        daysUntilTrigger: result.daysUntilTrigger,

        urgency: result.urgency,
        stockStatus: result.stockStatus,
        daysOfStock: result.daysOfStock,

        cnyRisk: result.cnyRisk.hasRisk,
        cnyStrategy: result.cnyRisk.strategy,
        cnyDelayDays: result.cnyRisk.additionalDelayDays,
        cnyExplanation: result.cnyRisk.explanation,

        recommendedShipmentMode: result.recommendedShipmentMode,

        unitCostBdt: unitCost,
        totalCostBdt: Math.round(result.suggestedOrderQty * unitCost * 100) / 100,

        currentSeason: result.currentSeason,
        seasonNote: result.seasonNote,
      });
    }

    // ── Sort: urgency priority → adjusted demand descending ──
    const urgencyOrder: Record<Urgency, number> = { critical: 0, high: 1, normal: 2, low: 3 };
    pipelineProducts.sort((a, b) => {
      const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (uDiff !== 0) return uDiff;
      return b.adjustedDemand - a.adjustedDemand;
    });

    const topProducts = pipelineProducts.slice(0, topN);

    // ── Build Summary ──
    const urgencyBreakdown: Record<Urgency, number> = { critical: 0, high: 0, normal: 0, low: 0 };
    const cnyStrategyBreakdown: Record<CNYStrategy, number> = {
      before_cny: 0, after_cny: 0, partial_order: 0, air_escape: 0, none: 0,
    };

    for (const p of topProducts) {
      urgencyBreakdown[p.urgency]++;
      cnyStrategyBreakdown[p.cnyStrategy]++;
    }

    const orderDates = topProducts
      .filter(p => p.recommendedQty > 0)
      .map(p => p.orderTriggerDate)
      .sort();

    const totalRecommendedUnits = topProducts.reduce((sum, p) => sum + p.recommendedQty, 0);
    const totalRecommendedSpendBdt = topProducts.reduce((sum, p) => sum + p.totalCostBdt, 0);

    // ── CNY Window ──
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cnyInfo = getCNYForDate(today);
    const seasonRange = getSeasonDateRange(targetSeason, targetYear);

    const fmt2 = (d: Date) => d.toISOString().split('T')[0];

    const response: SeasonalPipelineResponse = {
      forecastSessionId: `sp_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}_${targetSeason}${targetYear}`,
      tenantId,
      targetSeason,
      targetYear,
      shippingMethod: effectiveShippingMethod,
      serviceLevel: effectiveServiceLevel,
      period: {
        start: fmt2(seasonRange.start),
        end: fmt2(seasonRange.end),
        totalDays: Math.round((seasonRange.end.getTime() - seasonRange.start.getTime()) / (1000 * 60 * 60 * 24)),
      },
      generatedAt: today.toISOString(),
      cnyWindow: cnyInfo ? {
        year: cnyInfo.year,
        shutdownStart: fmt2(cnyInfo.startDate),
        shutdownEnd: fmt2(cnyInfo.endDate),
      } : null,
      products: topProducts,
      summary: {
        totalProducts: topProducts.length,
        totalRecommendedUnits,
        totalRecommendedSpendBdt: Math.round(totalRecommendedSpendBdt * 100) / 100,
        urgencyBreakdown,
        cnyRiskCount: topProducts.filter(p => p.cnyRisk).length,
        cnyStrategyBreakdown,
        earliestOrderDate: orderDates.length > 0 ? orderDates[0] : null,
        latestOrderDate: orderDates.length > 0 ? orderDates[orderDates.length - 1] : null,
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Seasonal pipeline execution failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
