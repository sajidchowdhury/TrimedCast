// ============================================
// TrimedCast LEAN — /api/festivals
// List the upcoming festival sessions for the dashboard.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FESTIVAL_SEEDS, buildFestivalSeeds, daysUntil } from '@/lib/sessions/festival-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const reseed = url.searchParams.get('reseed') === 'true';

  if (reseed) {
    // Delete all existing festival sessions and re-seed with day-precise Hijri dates
    await db.festivalSession.deleteMany({});
  }

  let festivals = await db.festivalSession.findMany({
    orderBy: { peakDate: 'asc' },
  });

  // seed on-demand if empty (or after a reseed)
  if (festivals.length === 0) {
    const seeds = buildFestivalSeeds(new Date().getFullYear());
    await db.$transaction(
      seeds.map((f) =>
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
    festivals = await db.festivalSession.findMany({ orderBy: { peakDate: 'asc' } });
  }

  const now = new Date();
  const enriched = festivals.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    peakDate: f.peakDate.toISOString().slice(0, 10),
    windowStart: f.windowStart.toISOString().slice(0, 10),
    windowEnd: f.windowEnd.toISOString().slice(0, 10),
    demandEffect: f.demandEffect,
    year: f.year,
    daysUntil: daysUntil(f.peakDate.toISOString().slice(0, 10)),
    isUpcoming: f.peakDate > now,
  }));

  return NextResponse.json({ festivals: enriched });
}
