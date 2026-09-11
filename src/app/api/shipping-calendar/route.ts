// ============================================
// TrimedCast LEAN — /api/shipping-calendar
// Reads from the database (settings + holidays) so everything is
// client-editable. Falls back to defaults if DB is empty.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_RECOMMENDATIONS = [
  'Plan orders 2-3 weeks before Chinese New Year (late Jan/early Feb) — factories close for 7+ days.',
  'Avoid L/C opening during Eid weeks — BD banks are closed 3+ days, delaying payment to Chinese suppliers.',
  'Durga Puja (October) reduces Chattogram port operations for 6 days — plan customs clearance before/after.',
  "Golden Week (Oct 1-7) is China's second-biggest shutdown — same impact as CNY for October orders.",
  'Friday + Saturday are BD weekends; Sunday is China\'s weekend. Only Sun-Thu are working days in BOTH countries.',
  'For urgent shipments, air freight bypasses ocean transit delays but NOT manufacturing holidays or customs closures.',
];

export async function GET() {
  // Load settings from DB
  let settings = await db.forecastSetting.findFirst();
  if (!settings) {
    settings = await db.forecastSetting.create({ data: { recommendationsJson: JSON.stringify(DEFAULT_RECOMMENDATIONS) } });
  }

  // Load holidays from DB (seeded automatically if empty)
  let holidays = await db.holiday.findMany({ orderBy: { startISO: 'asc' } });
  if (holidays.length === 0) {
    // Trigger the seeding by calling the holidays GET endpoint logic
    // (the holidays route seeds on GET if empty — just return empty for now,
    // the ShippingConsiderations component will refetch after seeding)
    holidays = [];
  }

  const chinaHolidays = holidays.filter((h) => h.country === 'china');
  const bdHolidays = holidays.filter((h) => h.country === 'bangladesh');

  // Parse recommendations
  let recommendations = DEFAULT_RECOMMENDATIONS;
  try {
    const parsed = JSON.parse(settings.recommendationsJson || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) recommendations = parsed;
  } catch { /* use defaults */ }

  const leadTime = {
    manufacturing: settings.manufacturingLeadDays,
    shipmentSea: settings.shipmentSeaDays,
    shipmentAir: settings.shipmentAirDays,
    customsSea: settings.customsSeaDays,
    customsAir: settings.customsAirDays,
    internal: settings.internalProcessingDays,
    totalSea: settings.manufacturingLeadDays + settings.shipmentSeaDays + settings.customsSeaDays + settings.internalProcessingDays,
    totalAir: settings.manufacturingLeadDays + settings.shipmentAirDays + settings.customsAirDays + settings.internalProcessingDays,
  };

  const weekend = {
    chinaWorkingDays: settings.chinaWorkingDays,
    chinaOffDay: settings.chinaOffDay,
    bdWorkingDays: settings.bdWorkingDays,
    bdOffDays: settings.bdOffDays,
    weeklyAdminDelayDays: settings.weeklyAdminDelayDays,
    overlap: 'Sun–Thu (only these are working days in BOTH countries)',
  };

  return NextResponse.json({
    leadTime,
    weekend,
    recommendations,
    chinaHolidays: chinaHolidays.map((h) => ({
      name: h.name, country: h.country, type: h.type,
      startISO: h.startISO, endISO: h.endISO, durationDays: h.durationDays,
      impact: h.impact, affects: h.affects,
    })),
    bdHolidays: bdHolidays.map((h) => ({
      name: h.name, country: h.country, type: h.type,
      startISO: h.startISO, endISO: h.endISO, durationDays: h.durationDays,
      impact: h.impact, affects: h.affects,
    })),
  });
}
