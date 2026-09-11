// ============================================
// TrimedCast LEAN — /api/forecast
// Lists stored forecasts. Optional ?festivalSessionId= filter.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const festivalSessionId = url.searchParams.get('festivalSessionId');

  const where = festivalSessionId ? { festivalSessionId } : {};
  const forecasts = await db.forecast.findMany({
    where,
    orderBy: [{ festivalSessionId: 'asc' }, { skuCode: 'asc' }],
    take: 500,
  });

  // Parse the points JSON for the response
  const enriched = forecasts.map((f) => {
    const points = JSON.parse(f.pointsJson);
    return {
      id: f.id,
      skuCode: f.skuCode,
      productName: f.productName,
      festivalSessionId: f.festivalSessionId,
      mape: f.mape,
      mae: f.mae,
      rmse: f.rmse,
      bias: f.bias,
      accuracyRating: f.accuracyRating,
      n: f.n,
      totalForecastQty: f.totalForecastQty,
      model: f.model,
      historyPoints: f.historyPoints,
      horizonMonths: f.horizonMonths,
      generatedAt: f.generatedAt.toISOString(),
      points,
    };
  });

  return NextResponse.json({ forecasts: enriched, count: enriched.length });
}
