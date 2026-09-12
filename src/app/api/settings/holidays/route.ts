// ============================================
// TrimedCast LEAN — /api/settings/holidays
// GET: list all holidays (seeded from defaults if empty)
// POST: create a new holiday
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Default holidays (from the shipping-calendar module)
const DEFAULT_HOLIDAYS = [
  { name: 'Chinese New Year 2026', country: 'china', type: 'factory_shutdown', startISO: '2026-02-17', endISO: '2026-02-23', durationDays: 7, impact: 'All factories closed. Manufacturing stops completely. Biggest disruption of the year.', affects: 'manufacturing' },
  { name: 'Qingming Festival 2026', country: 'china', type: 'factory_shutdown', startISO: '2026-04-04', endISO: '2026-04-06', durationDays: 3, impact: 'Factories closed 3 days. Minor manufacturing delay.', affects: 'manufacturing' },
  { name: 'Labor Day 2026', country: 'china', type: 'factory_shutdown', startISO: '2026-05-01', endISO: '2026-05-05', durationDays: 5, impact: 'Factories closed 5 days. Moderate manufacturing delay.', affects: 'manufacturing' },
  { name: 'Dragon Boat Festival 2026', country: 'china', type: 'factory_shutdown', startISO: '2026-06-19', endISO: '2026-06-21', durationDays: 3, impact: 'Factories closed 3 days. Minor delay.', affects: 'manufacturing' },
  { name: 'National Day Golden Week 2026', country: 'china', type: 'factory_shutdown', startISO: '2026-10-01', endISO: '2026-10-07', durationDays: 7, impact: "Factories closed 7 days. Second-biggest disruption (Golden Week).", affects: 'manufacturing' },
  { name: 'Chinese New Year 2027', country: 'china', type: 'factory_shutdown', startISO: '2027-02-06', endISO: '2027-02-12', durationDays: 7, impact: 'All factories closed. Manufacturing stops completely. Biggest disruption of 2027.', affects: 'manufacturing' },
  { name: 'Labor Day 2027', country: 'china', type: 'factory_shutdown', startISO: '2027-05-01', endISO: '2027-05-05', durationDays: 5, impact: 'Factories closed 5 days. Moderate delay.', affects: 'manufacturing' },
  { name: 'National Day Golden Week 2027', country: 'china', type: 'factory_shutdown', startISO: '2027-10-01', endISO: '2027-10-07', durationDays: 7, impact: 'Factories closed 7 days. Golden Week disruption.', affects: 'manufacturing' },
  { name: 'Eid-ul-Fitr 2026', country: 'bangladesh', type: 'customs_closure', startISO: '2026-03-20', endISO: '2026-03-22', durationDays: 3, impact: 'Chattogram port customs closed. No clearance for 3 days. Add 3 days to delivery.', affects: 'customs' },
  { name: 'Eid-ul-Adha 2026', country: 'bangladesh', type: 'customs_closure', startISO: '2026-05-27', endISO: '2026-05-29', durationDays: 3, impact: 'Port customs closed 3 days. Clearance delayed.', affects: 'customs' },
  { name: 'Durga Puja 2026', country: 'bangladesh', type: 'customs_closure', startISO: '2026-10-10', endISO: '2026-10-15', durationDays: 6, impact: 'Reduced port operations for 6 days. Slow clearance.', affects: 'customs' },
  { name: 'Victory Day 2026', country: 'bangladesh', type: 'bank_holiday', startISO: '2026-12-16', endISO: '2026-12-16', durationDays: 1, impact: 'Banks closed. L/C processing delayed 1 day.', affects: 'customs' },
  { name: 'Eid-ul-Fitr 2027', country: 'bangladesh', type: 'customs_closure', startISO: '2027-03-09', endISO: '2027-03-11', durationDays: 3, impact: 'Port customs closed 3 days. Clearance delayed.', affects: 'customs' },
  { name: 'Eid-ul-Adha 2027', country: 'bangladesh', type: 'customs_closure', startISO: '2027-05-16', endISO: '2027-05-18', durationDays: 3, impact: 'Port customs closed 3 days. Clearance delayed.', affects: 'customs' },
  { name: 'Durga Puja 2027', country: 'bangladesh', type: 'customs_closure', startISO: '2027-10-01', endISO: '2027-10-06', durationDays: 6, impact: 'Reduced port operations for 6 days.', affects: 'customs' },
];

export async function GET() {
  let holidays = await db.holiday.findMany({ orderBy: { startISO: 'asc' } });

  // Seed defaults if empty
  if (holidays.length === 0) {
    await db.$transaction(
      DEFAULT_HOLIDAYS.map((h) => db.holiday.create({ data: h })),
    );
    holidays = await db.holiday.findMany({ orderBy: { startISO: 'asc' } });
  }

  return NextResponse.json({ holidays });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, country, type, startISO, endISO, durationDays, impact, affects } = body;

    if (!name || !startISO || !endISO || !durationDays) {
      return NextResponse.json(
        { success: false, error: 'name, startISO, endISO, durationDays are required.' },
        { status: 400 },
      );
    }

    const created = await db.holiday.create({
      data: {
        name,
        country: country || 'china',
        type: type || 'factory_shutdown',
        startISO,
        endISO,
        durationDays: Number(durationDays),
        impact: impact || '',
        affects: affects || 'manufacturing',
      },
    });

    return NextResponse.json({ success: true, holiday: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
