// ============================================
// TrimedCast LEAN — /api/freight/analyze
// Computes the air-vs-sea comparison + landed cost breakdown for
// every SKU with a recommended order in the selected session.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compareFreightModes } from '@/lib/finance/freight-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const festivalSessionId = url.searchParams.get('festivalSessionId');

  if (!festivalSessionId) {
    return NextResponse.json(
      { error: 'festivalSessionId query parameter is required.' },
      { status: 400 },
    );
  }

  // Load recommended orders for this session
  const orders = await db.recommendedOrder.findMany({
    where: { festivalSessionId },
    orderBy: [{ urgency: 'asc' }, { skuCode: 'asc' }],
  });

  if (orders.length === 0) {
    return NextResponse.json(
      { error: 'No order recommendations found. Generate them first (Phase 3).' },
      { status: 422 },
    );
  }

  const comparisons = await Promise.all(
    orders.map(async (o) => {
      const product = await db.product.findUnique({ where: { skuCode: o.skuCode } });
      const unitCost = product?.unitCostBdt ?? 100; // default 100 BDT
      const sellingPrice = product?.sellingPrice ?? unitCost * 1.4; // default 40% margin

      // Recompute daysUntilStockout from the order context (approximate)
      // For lean v1 we use the urgency → approximate days
      const daysUntilStockout =
        o.urgency === 'critical' ? 25 :
        o.urgency === 'high' ? 60 :
        o.urgency === 'normal' ? 120 : 240;

      const comparison = compareFreightModes({
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
        id: o.id,
        skuCode: o.skuCode,
        productName: product?.productName ?? o.skuCode,
        orderQty: o.recommendedQty,
        urgency: o.urgency,
        cnyStrategy: o.cnyStrategy,
        ...comparison,
      };
    }),
  );

  // Aggregate stats
  const seaCount = comparisons.filter((c) => c.recommendedMode === 'sea').length;
  const airCount = comparisons.filter((c) => c.recommendedMode === 'air').length;
  const totalSeaCost = comparisons.reduce((s, c) => s + c.sea.totalLandedCostBdt, 0);
  const totalAirCost = comparisons.reduce((s, c) => s + c.air.totalLandedCostBdt, 0);
  const totalSavingBySea = totalAirCost - totalSeaCost;

  return NextResponse.json({
    comparisons,
    count: comparisons.length,
    summary: {
      seaRecommended: seaCount,
      airRecommended: airCount,
      totalSeaCostBdt: totalSeaCost,
      totalAirCostBdt: totalAirCost,
      savingBySeaBdt: totalSavingBySea,
      avgCostPremiumPct: comparisons.length > 0
        ? Math.round((comparisons.reduce((s, c) => s + c.costPremiumPct, 0) / comparisons.length) * 100) / 100
        : 0,
    },
  });
}
