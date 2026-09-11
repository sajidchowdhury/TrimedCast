// ============================================
// TrimedCast LEAN — /api/session-dashboard
// The unified pilot dashboard data: composes all 6 capabilities for
// the next upcoming festival session.
//
// Returns: the next session, KPI summary, per-SKU recommendations
// (forecast + order qty + trigger date + freight mode + landed cost),
// critical SKUs, and step-completion flags.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compareFreightModes } from '@/lib/finance/freight-engine';
import { daysUntil, describeEffect } from '@/lib/sessions/festival-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const festivalSessionId = url.searchParams.get('festivalSessionId');

  // 1. Find the next upcoming festival
  const now = new Date();
  let session = festivalSessionId
    ? await db.festivalSession.findUnique({ where: { id: festivalSessionId } })
    : await db.festivalSession.findFirst({
        where: { peakDate: { gt: now } },
        orderBy: { peakDate: 'asc' },
      });

  if (!session) {
    // Fall back to the nearest festival overall
    session = await db.festivalSession.findFirst({ orderBy: { peakDate: 'asc' } });
  }
  if (!session) {
    return NextResponse.json({ error: 'No festival sessions found.' }, { status: 404 });
  }

  const peakISO = session.peakDate.toISOString().slice(0, 10);

  // 2. Load forecasts, orders, products, inventory for this session
  const [forecasts, orders, products] = await Promise.all([
    db.forecast.findMany({ where: { festivalSessionId: session.id } }),
    db.recommendedOrder.findMany({
      where: { festivalSessionId: session.id },
      orderBy: [{ urgency: 'asc' }, { skuCode: 'asc' }],
    }),
    db.product.findMany({ orderBy: { skuCode: 'asc' } }),
  ]);

  // 3. Build the unified per-SKU rows (join forecast + order + freight)
  const rows = await Promise.all(
    orders.map(async (o) => {
      const product = products.find((p) => p.skuCode === o.skuCode);
      const forecast = forecasts.find((f) => f.skuCode === o.skuCode);
      const unitCost = product?.unitCostBdt ?? 100;
      const sellingPrice = product?.sellingPrice ?? unitCost * 1.4;
      const daysUntilStockout =
        o.urgency === 'critical' ? 25 :
        o.urgency === 'high' ? 60 :
        o.urgency === 'normal' ? 120 : 240;

      const freight = compareFreightModes({
        skuCode: o.skuCode,
        productName: product?.productName ?? o.skuCode,
        unitCostBdt: unitCost,
        sellingPrice,
        orderQty: o.recommendedQty,
        shipmentMode: o.recommendedMode as 'sea' | 'air',
        daysUntilStockout,
        cnyStrategy: o.cnyStrategy ?? undefined,
        urgency: o.urgency,
        hsCode: product?.hsCode ?? '8512',
      });

      return {
        skuCode: o.skuCode,
        productName: product?.productName ?? o.skuCode,
        colorDetails: product?.colorDetails ?? null,
        // (a) forecast
        forecastQty: o.forecastQty ?? 0,
        mape: o.mape ?? 0,
        accuracyRating: forecast?.accuracyRating ?? '—',
        // (c) order quantity
        recommendedQty: o.recommendedQty,
        safetyStock: o.safetyStock,
        reorderPoint: o.reorderPoint,
        // (d) order timing
        orderTriggerDate: o.orderTriggerDate?.toISOString().slice(0, 10) ?? null,
        expectedDelivery: o.expectedDelivery?.toISOString().slice(0, 10) ?? null,
        urgency: o.urgency,
        cnyStrategy: o.cnyStrategy ?? 'none',
        // (e) freight
        recommendedMode: o.recommendedMode,
        seaLandedCost: freight.sea.landedCostPerUnit,
        airLandedCost: freight.air.landedCostPerUnit,
        costPremiumPct: freight.costPremiumPct,
        // (f) line cost
        landedCostPerUnit: o.recommendedMode === 'air' ? freight.air.landedCostPerUnit : freight.sea.landedCostPerUnit,
        marginPct: o.recommendedMode === 'air' ? freight.air.marginPct : freight.sea.marginPct,
        marginPerUnit: o.recommendedMode === 'air' ? freight.air.marginPerUnitBdt : freight.sea.marginPerUnitBdt,
        totalLandedCost: o.recommendedMode === 'air' ? freight.air.totalLandedCostBdt : freight.sea.totalLandedCostBdt,
        unitCostBdt: unitCost,
        sellingPrice,
      };
    }),
  );

  // 4. KPI summary
  const kpis = {
    skuCount: rows.length,
    totalOrderQty: rows.reduce((s, r) => s + r.recommendedQty, 0),
    totalForecastQty: rows.reduce((s, r) => s + r.forecastQty, 0),
    totalLandedCost: rows.reduce((s, r) => s + r.totalLandedCost, 0),
    totalMargin: rows.reduce((s, r) => s + (r.marginPerUnit * r.recommendedQty), 0),
    criticalCount: rows.filter((r) => r.urgency === 'critical').length,
    highCount: rows.filter((r) => r.urgency === 'high').length,
    seaCount: rows.filter((r) => r.recommendedMode === 'sea').length,
    airCount: rows.filter((r) => r.recommendedMode === 'air').length,
    avgMape: rows.length > 0 ? Math.round((rows.reduce((s, r) => s + r.mape, 0) / rows.length) * 100) / 100 : 0,
  };

  // 5. Step-completion flags (so the UI shows what's been generated)
  const steps = {
    excelUploaded: products.length > 0,
    forecastGenerated: forecasts.length > 0,
    ordersGenerated: orders.length > 0,
    freightAnalyzed: rows.length > 0, // freight computed inline, always true if orders exist
  };

  return NextResponse.json({
    session: {
      id: session.id,
      name: session.name,
      type: session.type,
      peakDate: peakISO,
      windowStart: session.windowStart.toISOString().slice(0, 10),
      windowEnd: session.windowEnd.toISOString().slice(0, 10),
      demandEffect: session.demandEffect,
      effectDescription: describeEffect(session.demandEffect),
      daysUntil: daysUntil(peakISO),
    },
    kpis,
    steps,
    rows,
    criticalSkus: rows.filter((r) => r.urgency === 'critical').slice(0, 5),
  });
}
