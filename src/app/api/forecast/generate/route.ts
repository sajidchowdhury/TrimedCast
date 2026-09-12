// ============================================
// TrimedCast LEAN — /api/forecast/generate
// Runs the Prophet-inspired forecast for every SKU against the
// selected festival session. Stores results in the Forecast table.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forecast } from '@/lib/forecasting/forecast-engine';
import { buildFestivalSeeds, type FestivalSeed } from '@/lib/sessions/festival-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const festivalSessionId = (body.festivalSessionId as string) || null;

    // Load products + their sales history
    const products = await db.product.findMany({ orderBy: { skuCode: 'asc' } });
    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No products found. Upload an Excel file first (Phase 1).' },
        { status: 422 },
      );
    }

    // Load the festival session (if specified) for naming + effect + horizon
    let festivalSessionName: string | null = null;
    let festivalPeakDate: Date | null = null;
    const requestedHorizon = Number(body.horizonMonths) || 0;
    const includeFestivals = body.includeFestivals !== false;

    if (festivalSessionId) {
      const fs = await db.festivalSession.findUnique({ where: { id: festivalSessionId } });
      if (fs) {
        festivalSessionName = fs.name;
        festivalPeakDate = fs.peakDate;
      }
    }

    // Build festival seeds from the DB (already day-precise Hijri-seeded)
    const dbFestivals = await db.festivalSession.findMany({ orderBy: { peakDate: 'asc' } });
    const festivalSeeds: FestivalSeed[] = dbFestivals.map((f) => ({
      name: f.name,
      type: f.type as FestivalSeed['type'],
      peakDate: f.peakDate.toISOString().slice(0, 10),
      windowStart: f.windowStart.toISOString().slice(0, 10),
      windowEnd: f.windowEnd.toISOString().slice(0, 10),
      demandEffect: f.demandEffect,
      year: f.year,
    }));

    if (festivalSeeds.length === 0) {
      // Re-seed if empty (shouldn't happen post-Phase-1, but defensive)
      const freshSeeds = buildFestivalSeeds();
      await db.$transaction(
        freshSeeds.map((f) =>
          db.festivalSession.create({
            data: {
              name: f.name,
              type: f.type,
              peakDate: new Date(f.peakDate),
              windowStart: new Date(f.windowStart),
              windowEnd: new Date(f.windowEnd),
              demandEffect: f.demandEffect,
              year: f.year,
            },
          }),
        ),
      );
      festivalSeeds.push(...freshSeeds);
    }

    let generated = 0;
    let skipped = 0;
    const warnings: string[] = [];

    // Delete prior forecasts for this session (so re-generation is idempotent)
    if (festivalSessionId) {
      await db.forecast.deleteMany({ where: { festivalSessionId } });
    }

    for (const product of products) {
      // Build monthly time series for this SKU
      const sales = await db.sale.findMany({
        where: { skuCode: product.skuCode },
        orderBy: { saleDate: 'asc' },
      });

      // Aggregate to monthly (in case of duplicate month rows)
      const monthlyMap = new Map<string, number>();
      for (const s of sales) {
        const key = s.saleDate.toISOString().slice(0, 7); // yyyy-mm
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + s.qtySold);
      }
      const history = Array.from(monthlyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([ym, qty]) => ({ date: `${ym}-01`, value: qty }));

      if (history.length === 0) {
        skipped++;
        warnings.push(`No sales history for ${product.skuCode}; skipped.`);
        continue;
      }

      // Compute the horizon: either the explicit request, or extend
      // from the last data point to the festival peak date (+1 month buffer)
      let horizonMonths = requestedHorizon;
      if (horizonMonths <= 0 && festivalPeakDate) {
        const lastDate = new Date(history[history.length - 1].date + 'T00:00:00Z');
        const monthsToPeak =
          (festivalPeakDate.getUTCFullYear() - lastDate.getUTCFullYear()) * 12 +
          (festivalPeakDate.getUTCMonth() - lastDate.getUTCMonth());
        horizonMonths = Math.min(Math.max(monthsToPeak + 1, 3), 24); // 3 min, 24 max
      }
      if (horizonMonths <= 0) horizonMonths = 6;

      const result = forecast(
        product.skuCode,
        product.productName,
        history,
        festivalSeeds,
        { horizonMonths, includeFestivals },
        festivalSessionId,
        festivalSessionName,
      );

      const totalForecastQty = result.points.reduce((s, p) => s + p.predicted, 0);

      await db.forecast.create({
        data: {
          skuCode: product.skuCode,
          festivalSessionId,
          productName: product.productName,
          pointsJson: JSON.stringify(result.points),
          mape: result.metrics.mape,
          mae: result.metrics.mae,
          rmse: result.metrics.rmse,
          mse: result.metrics.mse,
          bias: result.metrics.bias,
          accuracyRating: result.metrics.accuracyRating,
          n: result.metrics.n,
          totalForecastQty,
          model: result.model,
          historyPoints: result.historyPoints,
          horizonMonths,
        },
      });
      generated++;
    }

    return NextResponse.json({
      success: true,
      festivalSessionId,
      festivalSessionName,
      generated,
      skipped,
      warnings,
      includeFestivals,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[forecast/generate] error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
