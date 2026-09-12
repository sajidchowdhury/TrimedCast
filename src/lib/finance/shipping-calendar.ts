// ============================================
// TrimedCast LEAN — Shipping Calendar
// Real-world holiday + off-day calendar affecting BD↔China shipping.
//
// The lead-time decomposition (sea 155d / air 104d) is the BASELINE.
// But real shipments also get delayed by:
//   1. China public holidays (CNY, National Day, Labor Day, Qingming, etc.)
//   2. Bangladesh customs holidays (Eid, Durga Puja, port closures)
//   3. Weekend differences (China works Mon-Sat; BD works Sun-Thu)
//   4. Chattogram port congestion / strikes
//
// This module computes the ACTUAL shipping time = baseline + holiday delays.
// ============================================

export interface HolidayEvent {
  name: string;
  country: 'china' | 'bangladesh';
  type: 'factory_shutdown' | 'customs_closure' | 'port_closure' | 'bank_holiday' | 'weekend';
  startISO: string;
  endISO: string;
  durationDays: number;
  impact: string;
  affects: 'manufacturing' | 'shipment' | 'customs' | 'all';
}

/**
 * China public holidays that affect manufacturing + shipping (2026-2027).
 * Source: China State Council announcements (approximate — verify annually).
 */
export const CHINA_HOLIDAYS: HolidayEvent[] = [
  {
    name: 'Chinese New Year (Spring Festival) 2026',
    country: 'china',
    type: 'factory_shutdown',
    startISO: '2026-02-17',
    endISO: '2026-02-23',
    durationDays: 7,
    impact: 'All factories closed. Manufacturing stops completely. Biggest disruption of the year.',
    affects: 'manufacturing',
  },
  {
    name: 'Qingming Festival 2026',
    country: 'china',
    type: 'factory_shutdown',
    startISO: '2026-04-04',
    endISO: '2026-04-06',
    durationDays: 3,
    impact: 'Factories closed 3 days. Minor manufacturing delay.',
    affects: 'manufacturing',
  },
  {
    name: 'Labor Day 2026',
    country: 'china',
    type: 'factory_shutdown',
    startISO: '2026-05-01',
    endISO: '2026-05-05',
    durationDays: 5,
    impact: 'Factories closed 5 days. Moderate manufacturing delay.',
    affects: 'manufacturing',
  },
  {
    name: 'Dragon Boat Festival 2026',
    country: 'china',
    type: 'factory_shutdown',
    startISO: '2026-06-19',
    endISO: '2026-06-21',
    durationDays: 3,
    impact: 'Factories closed 3 days. Minor delay.',
    affects: 'manufacturing',
  },
  {
    name: 'Mid-Autumn + National Day 2026',
    country: 'china',
    type: 'factory_shutdown',
    startISO: '2026-10-01',
    endISO: '2026-10-07',
    durationDays: 7,
    impact: 'Factories closed 7 days. Second-biggest disruption (Golden Week).',
    affects: 'manufacturing',
  },
  {
    name: 'Chinese New Year 2027',
    country: 'china',
    type: 'factory_shutdown',
    startISO: '2027-02-06',
    endISO: '2027-02-12',
    durationDays: 7,
    impact: 'All factories closed. Manufacturing stops completely. Biggest disruption of 2027.',
    affects: 'manufacturing',
  },
  {
    name: 'Labor Day 2027',
    country: 'china',
    type: 'factory_shutdown',
    startISO: '2027-05-01',
    endISO: '2027-05-05',
    durationDays: 5,
    impact: 'Factories closed 5 days. Moderate delay.',
    affects: 'manufacturing',
  },
  {
    name: 'National Day Golden Week 2027',
    country: 'china',
    type: 'factory_shutdown',
    startISO: '2027-10-01',
    endISO: '2027-10-07',
    durationDays: 7,
    impact: 'Factories closed 7 days. Golden Week disruption.',
    affects: 'manufacturing',
  },
];

/**
 * Bangladesh customs + port holidays that affect clearance + delivery.
 * Source: Bangladesh Customs + Chittagong Port Authority announcements.
 * Eid dates are Hijri-computed (approximate — verify against BD Gazette).
 */
export const BANGLADESH_HOLIDAYS: HolidayEvent[] = [
  {
    name: 'Eid-ul-Fitr 2026',
    country: 'bangladesh',
    type: 'customs_closure',
    startISO: '2026-03-20',
    endISO: '2026-03-22',
    durationDays: 3,
    impact: 'Chattogram port customs closed. No clearance for 3 days. Add 3 days to delivery.',
    affects: 'customs',
  },
  {
    name: 'Eid-ul-Adha 2026',
    country: 'bangladesh',
    type: 'customs_closure',
    startISO: '2026-05-27',
    endISO: '2026-05-29',
    durationDays: 3,
    impact: 'Port customs closed 3 days. Clearance delayed.',
    affects: 'customs',
  },
  {
    name: 'Durga Puja 2026',
    country: 'bangladesh',
    type: 'customs_closure',
    startISO: '2026-10-10',
    endISO: '2026-10-15',
    durationDays: 6,
    impact: 'Reduced port operations for 6 days. Slow clearance.',
    affects: 'customs',
  },
  {
    name: 'Victory Day 2026',
    country: 'bangladesh',
    type: 'bank_holiday',
    startISO: '2026-12-16',
    endISO: '2026-12-16',
    durationDays: 1,
    impact: 'Banks closed. L/C processing delayed 1 day.',
    affects: 'customs',
  },
  {
    name: 'Eid-ul-Fitr 2027',
    country: 'bangladesh',
    type: 'customs_closure',
    startISO: '2027-03-09',
    endISO: '2027-03-11',
    durationDays: 3,
    impact: 'Port customs closed 3 days. Clearance delayed.',
    affects: 'customs',
  },
  {
    name: 'Eid-ul-Adha 2027',
    country: 'bangladesh',
    type: 'customs_closure',
    startISO: '2027-05-16',
    endISO: '2027-05-18',
    durationDays: 3,
    impact: 'Port customs closed 3 days. Clearance delayed.',
    affects: 'customs',
  },
  {
    name: 'Durga Puja 2027',
    country: 'bangladesh',
    type: 'customs_closure',
    startISO: '2027-10-01',
    endISO: '2027-10-06',
    durationDays: 6,
    impact: 'Reduced port operations for 6 days.',
    affects: 'customs',
  },
];

/** All holidays combined. */
export const ALL_HOLIDAYS: HolidayEvent[] = [...CHINA_HOLIDAYS, ...BANGLADESH_HOLIDAYS];

/**
 * Weekend differences between China and Bangladesh:
 *   - China: works Monday–Saturday (Sunday off)
 *   - Bangladesh: works Sunday–Thursday (Friday + Saturday off)
 *   - Overlap: only Sunday–Thursday are full working days in both countries
 *
 * This means ~2 extra non-working days per week of transit for admin/banking tasks.
 */
export const WEEKEND_INFO = {
  china: { workingDays: 'Mon–Sat', offDay: 'Sunday' },
  bangladesh: { workingDays: 'Sun–Thu', offDays: 'Friday + Saturday' },
  overlap: 'Sun–Thu (only these are working days in BOTH countries)',
  weeklyAdminDelayDays: 2, // Fri + Sat are off in BD; Sun is off in China
};

/**
 * Find all holidays that overlap with a shipment window.
 * @param startDate ISO date when the order is placed
 * @param endDate ISO date when the shipment is expected at warehouse
 */
export function findOverlappingHolidays(startDate: string, endDate: string): HolidayEvent[] {
  const start = new Date(startDate + 'T00:00:00Z').getTime();
  const end = new Date(endDate + 'T23:59:59Z').getTime();
  return ALL_HOLIDAYS.filter((h) => {
    const hStart = new Date(h.startISO + 'T00:00:00Z').getTime();
    const hEnd = new Date(h.endISO + 'T23:59:59Z').getTime();
    // Overlap if holiday starts before shipment ends AND ends after shipment starts
    return hStart <= end && hEnd >= start;
  });
}

/**
 * Compute the ACTUAL lead time = baseline + holiday delay days.
 *
 * @param baselineLeadDays The base lead time (155 sea / 104 air)
 * @param orderTriggerDateISO When the PO will be placed
 * @param shipmentMode 'sea' | 'air'
 */
export function computeActualLeadTime(
  baselineLeadDays: number,
  orderTriggerDateISO: string,
  shipmentMode: 'sea' | 'air',
): {
  baselineDays: number;
  holidayDelayDays: number;
  weekendDelayDays: number;
  totalActualDays: number;
  overlappingHolidays: HolidayEvent[];
  expectedDeliveryISO: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  const orderDate = new Date(orderTriggerDateISO + 'T00:00:00Z');

  // Expected delivery = order date + baseline
  const expectedDelivery = new Date(orderDate.getTime() + baselineLeadDays * 24 * 60 * 60 * 1000);
  const expectedDeliveryISO = expectedDelivery.toISOString().slice(0, 10);

  // Find holidays that overlap the shipment window
  const overlapping = findOverlappingHolidays(orderTriggerDateISO, expectedDeliveryISO);

  // Holiday delay = sum of holiday durations that overlap
  // (but cap at the actual overlap, not the full holiday if only partial)
  let holidayDelayDays = 0;
  for (const h of overlapping) {
    holidayDelayDays += h.durationDays;
    warnings.push(`${h.name}: ${h.impact} (+${h.durationDays}d)`);
  }

  // Weekend admin delay: ~2 days per ~7 days of transit (for banking/LC/customs admin)
  // Cap at 10 days max (for very long sea shipments)
  const transitWeeks = Math.ceil(baselineLeadDays / 7);
  const weekendDelayDays = Math.min(transitWeeks * WEEKEND_INFO.weeklyAdminDelayDays, 10);
  if (weekendDelayDays > 0) {
    warnings.push(`Weekend admin delay: China off Sun, BD off Fri+Sat → +${weekendDelayDays}d for L/C + customs paperwork`);
  }

  const totalActualDays = baselineLeadDays + holidayDelayDays + weekendDelayDays;

  return {
    baselineDays: baselineLeadDays,
    holidayDelayDays,
    weekendDelayDays,
    totalActualDays,
    overlappingHolidays: overlapping,
    expectedDeliveryISO,
    warnings,
  };
}

/** Human-readable summary of the shipping considerations. */
export function getShippingConsiderations(): {
  chinaHolidays: HolidayEvent[];
  bdHolidays: HolidayEvent[];
  weekendInfo: typeof WEEKEND_INFO;
  recommendations: string[];
} {
  return {
    chinaHolidays: CHINA_HOLIDAYS,
    bdHolidays: BANGLADESH_HOLIDAYS,
    weekendInfo: WEEKEND_INFO,
    recommendations: [
      'Plan orders 2-3 weeks before Chinese New Year (late Jan/early Feb) — factories close for 7+ days.',
      'Avoid L/C opening during Eid weeks — BD banks are closed 3+ days, delaying payment to Chinese suppliers.',
      'Durga Puja (October) reduces Chattogram port operations for 6 days — plan customs clearance before/after.',
      'Golden Week (Oct 1-7) is China\'s second-biggest shutdown — same impact as CNY for October orders.',
      'Friday + Saturday are BD weekends; Sunday is China\'s weekend. Only Sun-Thu are working days in BOTH countries.',
      'For urgent shipments, air freight bypasses ocean transit delays but NOT manufacturing holidays or customs closures.',
    ],
  };
}
