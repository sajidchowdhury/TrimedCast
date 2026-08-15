// ============================================
// GET /api/orders/timeline
// Returns detailed order timeline for a single product
// Section 12.1 API: Get product order timeline
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
import {
  calculateOrderTrigger,
  calculateStockProjection,
  getSeasonForDate,
  type OrderTriggerInput,
} from '@/lib/forecasting/order-trigger';
import { getBDSeason } from '@/lib/forecasting/models';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantIdSlug = searchParams.get('tenantId') || 'demo-bd-motors';
    const productId = searchParams.get('productId');
    const season = searchParams.get('season') as 'winter' | 'summer' | 'monsoon' | 'pre_winter' | null;
    const shippingMethod = (searchParams.get('shippingMethod') as 'sea' | 'air') || 'sea';

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const tenantId = await resolveTenantId(tenantIdSlug);

    // Load product with inventory
    const product = await db.product.findFirst({
      where: { id: productId, tenantId },
      include: {
        inventory: true,
        supplier: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const inventory = product.inventory;
    const currentStock = inventory?.currentStock ?? 0;
    const reservedStock = inventory?.reservedStock ?? 0;
    const safetyStock = inventory?.safetyStock ?? Math.round(currentStock * 0.1);
    const reorderPoint = inventory?.reorderPoint ?? Math.round(currentStock * 0.3);
    const maxStock = inventory?.maxStock ?? currentStock * 3;

    // Calculate daily demand from recent sales
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const salesData = await db.salesHistory.findMany({
      where: {
        productId: product.id,
        tenantId,
        date: { gte: ninetyDaysAgo },
      },
    });

    const totalSalesQty = salesData.reduce((sum, s) => sum + s.quantity, 0);
    const avgDailyDemand = totalSalesQty / 90;

    // Get qty on order
    const pendingOrders = await db.purchaseOrder.findMany({
      where: {
        tenantId,
        status: { in: ['confirmed', 'in_production', 'shipped'] },
      },
    });

    let qtyOnOrder = 0;
    for (const po of pendingOrders) {
      const items = po.items as Array<{ productId?: string; productSku?: string; qty?: number }> | null;
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.productId === productId || item.productSku === product.sku) {
            qtyOnOrder += item.qty || 0;
          }
        }
      }
    }

    // Calculate order trigger
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
      avgDailyDemand: avgDailyDemand || 0.5,
      qtyOnOrder,
      eoq: product.eoq || 100,
      moq: product.moq || 50,
      shippingMethod,
      forecastedDemand: Math.round(avgDailyDemand * 120),
    };

    const result = calculateOrderTrigger(triggerInput);

    // Calculate stock projection
    const stockProjection = calculateStockProjection(
      currentStock,
      avgDailyDemand || 0.5,
      safetyStock,
      reorderPoint,
      result.expectedDeliveryDate,
      result.suggestedOrderQty,
      180,
    );

    // Format timeline
    const timeline = result.timeline;
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    return NextResponse.json({
      skuCode: product.sku,
      productName: product.name,
      category: product.category,
      urgency: result.urgency,
      daysUntilTrigger: result.daysUntilTrigger,
      stockStatus: result.stockStatus,
      needsOrder: result.needsOrder,

      // Stock levels
      currentStock,
      availableStock: currentStock - reservedStock,
      safetyStock,
      reorderPoint: Math.round(result.reorderPoint),
      daysOfStock: result.daysOfStock,

      // Timeline milestones
      timeline: {
        orderTriggerDate: fmt(timeline.orderTriggerDate),
        orderProcessingEnd: fmt(timeline.orderProcessingEnd),
        mfgStartDate: fmt(timeline.mfgStartDate),
        mfgCompleteDate: fmt(timeline.mfgCompleteDate),
        packingLoadingEnd: fmt(timeline.packingLoadingEnd),
        shipDepartureDate: fmt(timeline.shipDepartureDate),
        arrivalDate: fmt(timeline.arrivalDate),
        customsStartDate: fmt(timeline.customsStartDate),
        customsClearanceDate: fmt(timeline.customsClearanceDate),
        warehouseArrivalDate: fmt(timeline.warehouseArrivalDate),
        availableForSaleDate: fmt(timeline.availableForSaleDate),
        totalLeadTimeDays: timeline.totalLeadTimeDays,
        cnyDelayDays: timeline.cnyDelayDays,
      },

      // Lead time breakdown
      leadTimeBreakdown: result.leadTimeBreakdown,
      totalLeadTimeDays: result.totalLeadTimeDays,

      // CNY analysis
      cnyRisk: {
        hasRisk: result.cnyRisk.hasRisk,
        overlapDays: result.cnyRisk.overlapDays,
        strategy: result.cnyRisk.strategy,
        additionalDelayDays: result.cnyRisk.additionalDelayDays,
        latestSafeOrderDate: result.cnyRisk.latestSafeOrderDate ? fmt(result.cnyRisk.latestSafeOrderDate) : null,
        postCnyOrderDate: result.cnyRisk.postCnyOrderDate ? fmt(result.cnyRisk.postCnyOrderDate) : null,
        explanation: result.cnyRisk.explanation,
      },

      // Quantity
      recommendedQty: result.suggestedOrderQty,
      qtyBreakdown: result.qtyBreakdown,

      // Shipment recommendation
      recommendedShipmentMode: result.recommendedShipmentMode,

      // Stock projection
      stockProjection: stockProjection.filter((_, i) => i % 3 === 0), // Every 3rd day for brevity

      // Season
      currentSeason: result.currentSeason,
      seasonNote: result.seasonNote,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to calculate timeline', details: String(error) },
      { status: 500 }
    );
  }
}
