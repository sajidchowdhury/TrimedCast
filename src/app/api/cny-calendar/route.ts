// ============================================
// GET /api/cny-calendar
// Returns CNY shutdown calendar for 2025-2030
// Section 12.1 API: Get CNY Calendar
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { CNY_DATES } from '@/lib/forecasting/order-trigger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get('year');

    let cnyData = CNY_DATES;

    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        // Return current year and next 2 years
        cnyData = CNY_DATES.filter(c => c.year >= year && c.year <= year + 2);
      }
    }

    const years = cnyData.map(cny => ({
      year: cny.year,
      lunarNewYear: cny.date.toISOString().split('T')[0],
      shutdownStart: cny.startDate.toISOString().split('T')[0],
      shutdownEnd: cny.endDate.toISOString().split('T')[0],
      effectiveStart: cny.effectiveStart.toISOString().split('T')[0],
      effectiveEnd: cny.effectiveEnd.toISOString().split('T')[0],
      shutdownDays: cny.shutdownDays,
      rushDeadline: cny.rushStart.toISOString().split('T')[0],
      // Current status
      isCurrentlyActive: new Date() >= cny.startDate && new Date() <= cny.endDate,
      isUpcoming: new Date() < cny.startDate,
      daysUntilShutdown: Math.max(0, Math.round(
        (cny.effectiveStart.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )),
    }));

    // Find current or next CNY
    const now = new Date();
    const currentCny = CNY_DATES.find(c => now >= c.effectiveStart && now <= c.effectiveEnd);
    const nextCny = CNY_DATES.find(c => c.effectiveStart > now);

    return NextResponse.json({
      years,
      current: currentCny ? {
        year: currentCny.year,
        shutdownStart: currentCny.startDate.toISOString().split('T')[0],
        shutdownEnd: currentCny.endDate.toISOString().split('T')[0],
        daysRemaining: Math.max(0, Math.round(
          (currentCny.effectiveEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )),
      } : null,
      next: nextCny ? {
        year: nextCny.year,
        shutdownStart: nextCny.startDate.toISOString().split('T')[0],
        shutdownEnd: nextCny.endDate.toISOString().split('T')[0],
        daysUntil: Math.round(
          (nextCny.effectiveStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      } : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch CNY calendar', details: String(error) },
      { status: 500 }
    );
  }
}
