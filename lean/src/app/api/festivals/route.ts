// ============================================
// TrimedCast LEAN — /api/festivals
// GET: list festivals (auto-seeds if empty, ?reseed=true to reseed)
// POST: create a custom festival/event
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildFestivalSeeds, daysUntil } from '@/lib/sessions/festival-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const reseed = url.searchParams.get('reseed') === 'true';

  if (reseed) {
    await db.festivalSession.deleteMany({});
  }

  let festivals = await db.festivalSession.findMany({
    orderBy: { peakDate: 'asc' },
  });

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

// --- Create a custom festival/event ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      type = 'custom',
      peakDate,
      windowStart,
      windowEnd,
      demandEffect,
    } = body;

    // Validate
    if (!name || !peakDate || !demandEffect) {
      return NextResponse.json(
        { success: false, error: 'name, peakDate, and demandEffect are required.' },
        { status: 400 },
      );
    }
    const effect = Number(demandEffect);
    if (isNaN(effect) || effect < 0 || effect > 5) {
      return NextResponse.json(
        { success: false, error: 'demandEffect must be a number between 0 and 5 (e.g. 1.10 = +10% lift, 0.70 = -30% drop).' },
        { status: 400 },
      );
    }

    const peak = new Date(peakDate);
    const wStart = windowStart ? new Date(windowStart) : new Date(peak.getTime() - 20 * 24 * 60 * 60 * 1000);
    const wEnd = windowEnd ? new Date(windowEnd) : peak;

    const created = await db.festivalSession.create({
      data: {
        name,
        type: type || 'custom',
        peakDate: peak,
        windowStart: wStart,
        windowEnd: wEnd,
        demandEffect: effect,
        year: peak.getUTCFullYear(),
      },
    });

    return NextResponse.json({
      success: true,
      festival: {
        id: created.id,
        name: created.name,
        type: created.type,
        peakDate: created.peakDate.toISOString().slice(0, 10),
        windowStart: created.windowStart.toISOString().slice(0, 10),
        windowEnd: created.windowEnd.toISOString().slice(0, 10),
        demandEffect: created.demandEffect,
        year: created.year,
        daysUntil: daysUntil(created.peakDate.toISOString().slice(0, 10)),
        isUpcoming: created.peakDate > new Date(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[festivals POST] error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
