// ============================================
// TrimedCast LEAN — /api/orders/generate
// Runs EOQ + Safety Stock + the 9-step Order Trigger algorithm
// for every SKU against the selected festival session.
// Stores results in the RecommendedOrder table.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeOrderQuantity, calculateLeadTimeStats } from '@/lib/forecasting/eoq-safety-stock';
import { computeOrderTrigger, isoDate } from '@/lib/forecasting/order-trigger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const festivalSessionId = (body.festivalSessionId as string) || null;
    const serviceLevel = Number(body.serviceLevel) || 0.95;

    if (!festivalSessionId) {
      return NextResponse.json(
        { success: false, error: 'festivalSessionId is required.' },
        { status: 400 },
      );
    }

    // Load the festival session
    const festival = await db.festivalSession.findUnique({ where: { id: festivalSessionId } });
    if (!festival) {
      return NextResponse.json({ success: false, error: 'Festival session not found.' }, { status: 404 });
    }

    // Load forecasts for this session (must have been generated in Phase 2)
    const forecasts = await db.forecast.findMany({
      where: { festivalSessionId },
    });
    if (forecasts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No forecasts found for this session. Generate forecasts first (Phase 2).' },
        { status: 422 },
      );
    }

    let generated = 0;
    let skipped = 0;
    const warnings: string[] = [];

    // Delete prior recommendations for this session (idempotent)
    await db.recommendedOrder.deleteMany({ where: { festivalSessionId } });

    for (const f of forecasts) {
      const product = await db.product.findUnique({ where: { skuCode: f.skuCode } });
      if (!product) {
        skipped++;
        warnings.push(`Product ${f.skuCode} not found; skipped.`);
        continue;
      }

      // Inventory
      const inventory = await db.inventory.findUnique({ where: { skuCode: f.skuCode } });
      const qtyOnHand = inventory?.qtyOnHand ?? 0;

      // Lead-time stats from purchase history
      const purchases = await db.purchase.findMany({
        where: { skuCode: f.skuCode, actualLeadTimeDays: { not: null } },
      });
      const leadTimes = purchases
        .map((p) => p.actualLeadTimeDays)
        .filter((t): t is number => t !== null && t > 0);
      // Determine the dominant shipment mode from purchase history
      const seaCount = purchases.filter((p) => p.shipmentMode === 'sea').length;
      const airCount = purchases.filter((p) => p.shipmentMode === 'air').length;
      const shipmentMode = airCount > seaCount ? 'air' : 'sea';
      const leadTimeStats = calculateLeadTimeStats(leadTimes, shipmentMode);

      // Default unit cost if not set (BD automotive accessories)
      const unitCost = product.unitCostBdt ?? 100; // 100 BDT default
      const sellingPrice = product.sellingPrice ?? 0;

      // --- EOQ + Safety Stock ---
      const orderQty = computeOrderQuantity(
        f.totalForecastQty,
        f.horizonMonths,
        unitCost,
        f.mae,
        qtyOnHand,
        shipmentMode,
        leadTimeStats,
        { serviceLevel },
      );

      // --- Order Trigger (9-step) ---
      const trigger = computeOrderTrigger({
        skuCode: f.skuCode,
        productName: f.productName,
        qtyOnHand,
        reorderPoint: orderQty.safetyStock.reorderPoint,
        forecastQty: f.totalForecastQty,
        horizonMonths: f.horizonMonths,
        mae: f.mae,
        unitCost,
        sellingPrice,
        shipmentMode,
        festivalPeakDate: festival.peakDate,
      });

      // Store the recommendation
      await db.recommendedOrder.create({
        data: {
          skuCode: f.skuCode,
          festivalSessionId,
          forecastQty: f.totalForecastQty,
          mape: f.mape,
          recommendedQty: orderQty.recommendedQty,
          safetyStock: orderQty.safetyStock.safetyStock,
          reorderPoint: orderQty.safetyStock.reorderPoint,
          orderTriggerDate: trigger.cnyAdjustedTriggerDate,
          expectedDelivery: trigger.expectedDeliveryDate,
          urgency: trigger.urgency,
          recommendedMode: trigger.recommendedMode,
          cnyStrategy: trigger.cnyStrategy,
        },
      });
      generated++;
    }

    return NextResponse.json({
      success: true,
      festivalSessionId,
      festivalSessionName: festival.name,
      generated,
      skipped,
      warnings,
      serviceLevel,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[orders/generate] error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
