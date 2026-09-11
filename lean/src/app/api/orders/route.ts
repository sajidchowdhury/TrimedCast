// ============================================
// TrimedCast LEAN — /api/orders
// Lists stored order recommendations. Optional ?festivalSessionId= filter.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const festivalSessionId = url.searchParams.get('festivalSessionId');

  const where = festivalSessionId ? { festivalSessionId } : {};
  const orders = await db.recommendedOrder.findMany({
    where,
    orderBy: [{ urgency: 'asc' }, { skuCode: 'asc' }],
    take: 500,
  });

  // Enrich with product + forecast details
  const enriched = await Promise.all(
    orders.map(async (o) => {
      const product = await db.product.findUnique({ where: { skuCode: o.skuCode } });
      const forecast = await db.forecast.findFirst({
        where: { skuCode: o.skuCode, festivalSessionId: o.festivalSessionId },
      });
      return {
        id: o.id,
        skuCode: o.skuCode,
        productName: product?.productName ?? o.skuCode,
        festivalSessionId: o.festivalSessionId,
        forecastQty: o.forecastQty,
        mape: o.mape,
        recommendedQty: o.recommendedQty,
        safetyStock: o.safetyStock,
        reorderPoint: o.reorderPoint,
        orderTriggerDate: o.orderTriggerDate?.toISOString().slice(0, 10) ?? null,
        expectedDelivery: o.expectedDelivery?.toISOString().slice(0, 10) ?? null,
        urgency: o.urgency,
        recommendedMode: o.recommendedMode,
        cnyStrategy: o.cnyStrategy,
        unitCostBdt: product?.unitCostBdt ?? null,
        sellingPrice: product?.sellingPrice ?? null,
        createdAt: o.createdAt.toISOString(),
        // forecast detail for sparkline
        forecastPoints: forecast ? JSON.parse(forecast.pointsJson) : [],
      };
    }),
  );

  return NextResponse.json({ orders: enriched, count: enriched.length });
}
