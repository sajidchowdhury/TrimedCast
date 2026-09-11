// ============================================
// TrimedCast LEAN — /api/settings
// GET: lead-time decomposition + weekend info + recommendations
// PUT: update any of these (client-editable, saved to DB)
// Seeds defaults on first access if empty.
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
  // Get or create the single ForecastSetting record
  let settings = await db.forecastSetting.findFirst();
  if (!settings) {
    settings = await db.forecastSetting.create({
      data: { recommendationsJson: JSON.stringify(DEFAULT_RECOMMENDATIONS) },
    });
  }

  // Parse recommendations
  let recommendations: string[] = DEFAULT_RECOMMENDATIONS;
  try {
    recommendations = JSON.parse(settings.recommendationsJson || '[]');
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      recommendations = DEFAULT_RECOMMENDATIONS;
    }
  } catch { recommendations = DEFAULT_RECOMMENDATIONS; }

  return NextResponse.json({
    leadTime: {
      manufacturing: settings.manufacturingLeadDays,
      shipmentSea: settings.shipmentSeaDays,
      shipmentAir: settings.shipmentAirDays,
      customsSea: settings.customsSeaDays,
      customsAir: settings.customsAirDays,
      internal: settings.internalProcessingDays,
      totalSea: settings.manufacturingLeadDays + settings.shipmentSeaDays + settings.customsSeaDays + settings.internalProcessingDays,
      totalAir: settings.manufacturingLeadDays + settings.shipmentAirDays + settings.customsAirDays + settings.internalProcessingDays,
    },
    eoq: {
      orderingCostPerOrder: settings.orderingCostPerOrder,
      holdingCostPct: settings.holdingCostPct,
      serviceLevel: settings.serviceLevel,
      reviewPeriodDays: settings.reviewPeriodDays,
      bufferDays: settings.bufferDays,
    },
    weekend: {
      chinaWorkingDays: settings.chinaWorkingDays,
      chinaOffDay: settings.chinaOffDay,
      bdWorkingDays: settings.bdWorkingDays,
      bdOffDays: settings.bdOffDays,
      weeklyAdminDelayDays: settings.weeklyAdminDelayDays,
    },
    recommendations,
  });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    let settings = await db.forecastSetting.findFirst();
    if (!settings) {
      settings = await db.forecastSetting.create({ data: {} });
    }

    const data: Record<string, unknown> = {};

    // Lead-time fields
    if (body.manufacturing !== undefined) data.manufacturingLeadDays = Number(body.manufacturing);
    if (body.shipmentSea !== undefined) data.shipmentSeaDays = Number(body.shipmentSea);
    if (body.shipmentAir !== undefined) data.shipmentAirDays = Number(body.shipmentAir);
    if (body.customsSea !== undefined) data.customsSeaDays = Number(body.customsSea);
    if (body.customsAir !== undefined) data.customsAirDays = Number(body.customsAir);
    if (body.internal !== undefined) data.internalProcessingDays = Number(body.internal);

    // EOQ fields
    if (body.orderingCostPerOrder !== undefined) data.orderingCostPerOrder = Number(body.orderingCostPerOrder);
    if (body.holdingCostPct !== undefined) data.holdingCostPct = Number(body.holdingCostPct);
    if (body.serviceLevel !== undefined) data.serviceLevel = Number(body.serviceLevel);
    if (body.reviewPeriodDays !== undefined) data.reviewPeriodDays = Number(body.reviewPeriodDays);
    if (body.bufferDays !== undefined) data.bufferDays = Number(body.bufferDays);

    // Weekend fields
    if (body.chinaWorkingDays !== undefined) data.chinaWorkingDays = String(body.chinaWorkingDays);
    if (body.chinaOffDay !== undefined) data.chinaOffDay = String(body.chinaOffDay);
    if (body.bdWorkingDays !== undefined) data.bdWorkingDays = String(body.bdWorkingDays);
    if (body.bdOffDays !== undefined) data.bdOffDays = String(body.bdOffDays);
    if (body.weeklyAdminDelayDays !== undefined) data.weeklyAdminDelayDays = Number(body.weeklyAdminDelayDays);

    // Recommendations
    if (body.recommendations !== undefined) {
      data.recommendationsJson = JSON.stringify(body.recommendations);
    }

    const updated = await db.forecastSetting.update({
      where: { id: settings.id },
      data,
    });

    return NextResponse.json({ success: true, updatedAt: updated.updatedAt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[settings PUT] error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
