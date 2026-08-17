// ============================================
// POST /api/orders/pipeline
// Run the full order trigger pipeline for a season
// Section 9: Complete System Pipeline — End-to-End
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
import {
  runOrderTriggerPipeline,
  type OrderTriggerInput,
  type PipelineResult,
} from '@/lib/forecasting/order-trigger';
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId: tenantIdSlug = 'demo-bd-motors',
      season = 'winter',
      year = new Date().getFullYear() + 1,
      topN = 50,
    } = body;

    const tenantId = await resolveTenantId(tenantIdSlug);

    // Validate season
    const validSeasons = ['winter', 'summer', 'monsoon', 'pre_winter'] as const;
    const targetSeason = validSeasons.includes(season as typeof validSeasons[number])
      ? season as typeof validSeasons[number]
      : 'winter';

    // Load all products with inventory and supplier data
    const products = await db.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        inventory: true,
        supplier: true,
      },
    });

    // Load recent sales for consumption rate calculation
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

    // Get pending PO quantities per product
    const pendingPOs = await db.purchaseOrder.findMany({
      where: { tenantId, status: { in: ['confirmed', 'in_production', 'shipped'] } },
    });

    const poQtyMap = new Map<string, number>();
    for (const po of pendingPOs) {
      const items = po.items as Array<{ productId?: string; qty?: number }> | null;
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.productId) {
            poQtyMap.set(item.productId, (poQtyMap.get(item.productId) || 0) + (item.qty || 0));
          }
        }
      }
    }

    // Build unit cost map
    const unitCosts: Record<string, number> = {};
    for (const p of products) {
      if (p.unitCost) unitCosts[p.sku] = p.unitCost;
    }

    // Build OrderTriggerInput array
    const triggerInputs: OrderTriggerInput[] = products.map(product => {
      const inv = product.inventory;
      const currentStock = inv?.currentStock ?? 0;
      const safetyStock = inv?.safetyStock ?? Math.round(currentStock * 0.1);
      const reorderPoint = inv?.reorderPoint ?? Math.round(currentStock * 0.3);
      const totalSalesQty = salesMap.get(product.id) || 0;
      const avgDailyDemand = totalSalesQty / 90;

      return {
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        category: product.category,
        currentStock,
        reservedStock: inv?.reservedStock ?? 0,
        safetyStock,
        maxStock: inv?.maxStock ?? currentStock * 3,
        reorderPoint,
        avgDailyDemand: avgDailyDemand || 0.5,
        forecastedDemand: Math.round(avgDailyDemand * 120),
        qtyOnOrder: poQtyMap.get(product.id) || 0,
        eoq: product.eoq || 100,
        moq: product.moq || 50,
        leadTimeConfig: {
          manufacturingDays: product.supplier?.leadTimeDays ?? 90,
        },
      };
    });

    // Run the full pipeline
    const startTime = Date.now();
    const pipelineResult: PipelineResult = runOrderTriggerPipeline(
      tenantId,
      triggerInputs,
      targetSeason,
      year,
      unitCosts,
      topN,
    );
    const durationMs = Date.now() - startTime;

    // Save results as RecommendedOrder records
    const savedOrders = [];
    for (const p of pipelineResult.products) {
      const product = products.find(pr => pr.sku === p.productSku);
      if (!product) continue;

      try {
        const ro = await db.recommendedOrder.upsert({
          where: {
            id: 'pipeline-temp-id', // Will create new
          },
          create: {
            tenantId,
            productId: product.id,
            orderTrigger: p.orderTriggerDate,
            totalLeadTime: p.totalLeadTimeDays,
            reorderHitDate: p.expectedAvailableDate,
            priority: p.urgency,
            status: 'pending',
            justification: `Pipeline: ${targetSeason}_${year}. Urgency: ${p.urgency}. CNY: ${p.cnyRisk ? p.cnyStrategy : 'none'}. Qty: ${p.recommendedQty}.`,
            suggestedQty: p.recommendedQty,
          },
          update: {},
        });
        savedOrders.push(ro);
      } catch {
        // Skip if upsert fails for this product
      }
    }

    return NextResponse.json({
      ...pipelineResult,
      executionTimeMs: durationMs,
      savedOrderCount: savedOrders.length,
      message: `Pipeline completed for ${targetSeason} ${year}. ${pipelineResult.summary.totalProducts} products analyzed, ${pipelineResult.summary.totalRecommendedUnits} units recommended.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Pipeline execution failed', details: String(error) },
      { status: 500 }
    );
  }
}
