// ============================================
// TrimedCast LEAN — /api/festivals/[id]
// PUT: edit a festival/event
// DELETE: delete a festival/event
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { daysUntil } from '@/lib/sessions/festival-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const data: {
      name?: string;
      type?: string;
      peakDate?: Date;
      windowStart?: Date;
      windowEnd?: Date;
      demandEffect?: number;
      year?: number;
    } = {};

    if (body.name !== undefined) data.name = String(body.name);
    if (body.type !== undefined) data.type = String(body.type);
    if (body.peakDate !== undefined) {
      data.peakDate = new Date(body.peakDate);
      data.year = data.peakDate.getUTCFullYear();
    }
    if (body.windowStart !== undefined) data.windowStart = new Date(body.windowStart);
    if (body.windowEnd !== undefined) data.windowEnd = new Date(body.windowEnd);
    if (body.demandEffect !== undefined) {
      const effect = Number(body.demandEffect);
      if (isNaN(effect) || effect < 0 || effect > 5) {
        return NextResponse.json(
          { success: false, error: 'demandEffect must be a number between 0 and 5.' },
          { status: 400 },
        );
      }
      data.demandEffect = effect;
    }

    const updated = await db.festivalSession.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      festival: {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        peakDate: updated.peakDate.toISOString().slice(0, 10),
        windowStart: updated.windowStart.toISOString().slice(0, 10),
        windowEnd: updated.windowEnd.toISOString().slice(0, 10),
        demandEffect: updated.demandEffect,
        year: updated.year,
        daysUntil: daysUntil(updated.peakDate.toISOString().slice(0, 10)),
        isUpcoming: updated.peakDate > new Date(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[festivals PUT] error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await db.festivalSession.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[festivals DELETE] error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
