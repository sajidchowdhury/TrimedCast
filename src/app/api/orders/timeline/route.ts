// ============================================
// GET /api/orders/timeline  — existing (product order timeline via query params)
// POST /api/orders/timeline — ENHANCED (full OrderTriggerResult from DB)
//
// Returns complete OrderTriggerResult including:
//   - Timeline, CNY risk, stock projection, quantity breakdown
//   - 180-day stock projection
//   - All lead time milestones
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
import {
  safeCalculateOrderTrigger,
  calculateStockProjection,
  getSeasonForDate,
  type OrderTriggerInput,
  type OrderTriggerResult,
} from '@/lib/forecasting/order-trigger';
import { getBDSeason } from '@/lib/forecasting/models';

// ── Shared helper: format date ──
const fmt = (d: Date) => d.toISOString().split('T')[0];

// ── Shared helper: load product data from DB and calculate trigger ──
async function loadAndCalculate(
  productId: string,
  tenantId: string,
  shippingMethod: 'sea' | 'air' = 'sea',
  serviceLevel: number = 0.95,
) {
  // Load product with inventory and supplier
  const product = await db.product.findFirst({
    where: { id: productId, tenantId },
    include: {
      inventory: true,
      supplier: true,
    },
  });

  if (!product) return null;

  const inventory = product.inventory[0] ?? product.inventory;
  const currentStock = inventory?.currentStock ?? 0;
  const reservedStock = inventory?.reservedStock ?? 0;
  const safetyStock = inventory?.safetyStock ?? Math.max(1, Math.round(currentStock * 0.1));
  const reorderPoint = inventory?.reorderPoint ?? Math.round(currentStock * 0.3);
  const maxStock = inventory?.maxStock ?? product.maxStock ?? Math.max(currentStock * 3, 100);

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
  const avgDailyDemand = totalSalesQty > 0 ? totalSalesQty / 90 : 0;
  const effectiveDailyDemand = avgDailyDemand || 0.5;

  // Get qty on order from pending POs
  const pendingOrders = await db.purchaseOrder.findMany({
    where: {
      tenantId,
      status: { in: ['confirmed', 'in_production', 'shipped', 'in_transit'] },
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

  // Calculate order trigger with full parameters
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
    qtyOnOrder,
    eoq: product.eoq || 100,
    moq: product.moq || product.minOrderQty || 50,
    shippingMethod,
    serviceLevel,
    forecastedDemand: Math.round(effectiveDailyDemand * 120),
    leadTimeConfig: {
      manufacturingDays: product.leadTimeDays ?? product.supplier?.leadTimeDays ?? 90,
    },
  };

  const result: OrderTriggerResult = safeCalculateOrderTrigger(triggerInput);

  // Calculate 180-day stock projection
  const stockProjection = calculateStockProjection(
    currentStock,
    effectiveDailyDemand,
    safetyStock,
    Math.round(result.reorderPoint),
    result.expectedDeliveryDate,
    result.suggestedOrderQty,
    180,
  );

  return { product, result, stockProjection, triggerInput };
}

// ── Shared helper: serialize the full result ──
function serializeResult(
  product: NonNullable<Awaited<ReturnType<typeof loadAndCalculate>>>['product'],
  result: OrderTriggerResult,
  stockProjection: ReturnType<typeof calculateStockProjection>,
) {
  const timeline = result.timeline;

  return {
    productId: product.id,
    skuCode: product.sku,
    productName: product.name,
    category: product.category,
    unitCost: product.unitCost ?? null,

    // Order decision
    needsOrder: result.needsOrder,
    urgency: result.urgency,
    daysUntilTrigger: result.daysUntilTrigger,
    stockStatus: result.stockStatus,

    // Stock levels
    currentStock: result.currentStock,
    availableStock: result.availableStock,
    safetyStock: result.safetyStock,
    reorderPoint: Math.round(result.reorderPoint),
    daysOfStock: result.daysOfStock,

    // Quantity recommendation
    recommendedQty: result.suggestedOrderQty,
    qtyBreakdown: result.qtyBreakdown,
    totalCostBdt: Math.round(result.suggestedOrderQty * (product.unitCost ?? 0) * 100) / 100,

    // Timeline milestones (full)
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

    // CNY analysis (full)
    cnyRisk: {
      hasRisk: result.cnyRisk.hasRisk,
      overlapDays: result.cnyRisk.overlapDays,
      effectiveCnyStart: fmt(result.cnyRisk.effectiveCnyStart),
      cnyShutdownStart: fmt(result.cnyRisk.cnyShutdownStart),
      cnyShutdownEnd: fmt(result.cnyRisk.cnyShutdownEnd),
      strategy: result.cnyRisk.strategy,
      additionalDelayDays: result.cnyRisk.additionalDelayDays,
      latestSafeOrderDate: result.cnyRisk.latestSafeOrderDate ? fmt(result.cnyRisk.latestSafeOrderDate) : null,
      postCnyOrderDate: result.cnyRisk.postCnyOrderDate ? fmt(result.cnyRisk.postCnyOrderDate) : null,
      explanation: result.cnyRisk.explanation,
    },

    // Shipment recommendation
    recommendedShipmentMode: result.recommendedShipmentMode,

    // Stock projection (180-day, sampled every 3rd day for brevity)
    stockProjection: stockProjection.filter((_, i) => i % 3 === 0),

    // Season context
    currentSeason: result.currentSeason,
    seasonNote: result.seasonNote,

    // Key dates
    orderTriggerDate: fmt(result.orderTriggerDate),
    reorderHitDate: fmt(result.reorderHitDate),
    expectedDeliveryDate: fmt(result.expectedDeliveryDate),
  };
}

// ============================================
// GET /api/orders/timeline (existing)
// ============================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantIdSlug = searchParams.get('tenantId') || 'demo-bd-motors';
    const productId = searchParams.get('productId');
    const shippingMethod = (searchParams.get('shippingMethod') as 'sea' | 'air') || 'sea';

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const tenantId = await resolveTenantId(tenantIdSlug);
    const data = await loadAndCalculate(productId, tenantId, shippingMethod);

    if (!data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: serializeResult(data.product, data.result, data.stockProjection),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to calculate timeline', details: String(error) },
      { status: 500 },
    );
  }
}

// ============================================
// POST /api/orders/timeline (ENHANCED)
// Full OrderTriggerResult including timeline,
// CNY risk, stock projection, quantity breakdown
// with 180-day stock projection
// ============================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productId,
      tenantId: tenantIdSlug = 'demo-bd-motors',
      shippingMethod = 'sea',
      serviceLevel = 0.95,
    } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 },
      );
    }

    const validShipping: string[] = ['sea', 'air'];
    if (!validShipping.includes(shippingMethod)) {
      return NextResponse.json(
        { error: 'shippingMethod must be "sea" or "air"' },
        { status: 400 },
      );
    }

    if (typeof serviceLevel !== 'number' || serviceLevel < 0.5 || serviceLevel > 0.999) {
      return NextResponse.json(
        { error: 'serviceLevel must be between 0.5 and 0.999' },
        { status: 400 },
      );
    }

    const tenantId = await resolveTenantId(tenantIdSlug);
    const data = await loadAndCalculate(
      productId,
      tenantId,
      shippingMethod as 'sea' | 'air',
      serviceLevel,
    );

    if (!data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: serializeResult(data.product, data.result, data.stockProjection),
      meta: {
        calculatedAt: new Date().toISOString(),
        inputs: { productId, tenantId, shippingMethod, serviceLevel },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate timeline',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
