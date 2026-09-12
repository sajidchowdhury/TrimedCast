// ============================================
// TrimedCast LEAN — /api/settings/holidays/[id]
// PUT: edit a holiday
// DELETE: delete a holiday
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name);
    if (body.country !== undefined) data.country = String(body.country);
    if (body.type !== undefined) data.type = String(body.type);
    if (body.startISO !== undefined) data.startISO = String(body.startISO);
    if (body.endISO !== undefined) data.endISO = String(body.endISO);
    if (body.durationDays !== undefined) data.durationDays = Number(body.durationDays);
    if (body.impact !== undefined) data.impact = String(body.impact);
    if (body.affects !== undefined) data.affects = String(body.affects);

    const updated = await db.holiday.update({ where: { id }, data });
    return NextResponse.json({ success: true, holiday: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await db.holiday.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
