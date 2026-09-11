// ============================================
// TrimedCast LEAN — /api/shipping-calendar
// Returns China + Bangladesh holidays, weekend info, recommendations,
// and computes the ACTUAL lead time (baseline + holiday + weekend delays)
// for a given order-trigger date + shipment mode.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getShippingConsiderations,
  computeActualLeadTime,
  ALL_HOLIDAYS,
} from '@/lib/finance/shipping-calendar';
import { LEAD_TIME_DECOMPOSITION } from '@/lib/forecasting/eoq-safety-stock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orderDate = url.searchParams.get('orderDate'); // ISO yyyy-mm-dd
  const mode = (url.searchParams.get('mode') as 'sea' | 'air') || 'sea';

  const considerations = getShippingConsiderations();

  // If an order date is provided, compute the actual lead time
  let actualLeadTime = null;
  if (orderDate) {
    const baseline = LEAD_TIME_DECOMPOSITION[mode].total;
    actualLeadTime = computeActualLeadTime(baseline, orderDate, mode);
  }

  return NextResponse.json({
    considerations,
    actualLeadTime,
    allHolidays: ALL_HOLIDAYS,
    leadTimeDecomposition: LEAD_TIME_DECOMPOSITION,
  });
}
