// ============================================
// TrimedCast LEAN — Festival / Session calendar
// The client cares about: Eid-ul-Fitr, Eid-ul-Adha, Durga Puja,
// Summer, Winter, and the CNY supply disruption.
//
// Eid dates are computed DAY-PRECISE via the civil tabular Hijri
// calendar (hijri-converter), fixing Gap #1 from the original codebase
// which hardcoded Eid to Gregorian months.
// ============================================

import {
  getEidUlFitrDate,
  getEidUlAdhaDate,
  getDurgaPujaDate,
  getCNYWindow,
} from '@/lib/calendar/hijri';

export interface FestivalSeed {
  name: string;
  type: 'religious' | 'climatic' | 'supply';
  peakDate: string;     // ISO yyyy-mm-dd
  windowStart: string;  // ISO yyyy-mm-dd
  windowEnd: string;    // ISO yyyy-mm-dd
  demandEffect: number; // multiplier (1.10 = +10% lift, 0.70 = -30% drop)
  year: number;
}

/** Helper: format a Date as ISO yyyy-mm-dd. */
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Helper: build a window of N days before a peak date. */
function windowBefore(peakISO: string, daysBefore: number): string {
  const d = new Date(peakISO);
  d.setDate(d.getDate() - daysBefore);
  return iso(d);
}

/**
 * Build the festival seed list dynamically using day-precise Hijri dates.
 * Generates sessions for the current year and the next 2 years so the
 * calendar stays valid as time passes.
 */
export function buildFestivalSeeds(currentYear: number = new Date().getFullYear()): FestivalSeed[] {
  const seeds: FestivalSeed[] = [];
  const years = [currentYear, currentYear + 1, currentYear + 2];

  for (const year of years) {
    // Durga Puja — Bengali lunar calendar (maintained date table)
    const dp = getDurgaPujaDate(year);
    if (dp.year === year) {
      const peak = dp.iso;
      seeds.push({
        name: `Durga Puja ${year}`,
        type: 'religious',
        peakDate: peak,
        windowStart: windowBefore(peak, 20),
        windowEnd: peak,
        demandEffect: 1.10, // +10% lift
        year,
      });
    }

    // Eid-ul-Fitr — 1 Shawwal (Hijri month 10)
    const eFitr = getEidUlFitrDate(year);
    if (eFitr.year === year) {
      const peak = eFitr.iso;
      seeds.push({
        name: `Eid-ul-Fitr ${year}`,
        type: 'religious',
        peakDate: peak,
        windowStart: windowBefore(peak, 20),
        windowEnd: peak,
        demandEffect: 0.70, // -30% drop
        year,
      });
    }

    // Eid-ul-Adha — 10 Dhu al-Hijjah (Hijri month 12)
    const eAdha = getEidUlAdhaDate(year);
    if (eAdha.year === year) {
      const peak = eAdha.iso;
      seeds.push({
        name: `Eid-ul-Adha ${year}`,
        type: 'religious',
        peakDate: peak,
        windowStart: windowBefore(peak, 20),
        windowEnd: peak,
        demandEffect: 0.75, // -25% drop
        year,
      });
    }

    // CNY supply disruption (fixed window Jan 20 – Feb 20)
    const cny = getCNYWindow(year);
    seeds.push({
      name: `CNY ${year}`,
      type: 'supply',
      peakDate: cny.startISO,
      windowStart: cny.startISO,
      windowEnd: cny.endISO,
      demandEffect: 0.85, // supply-side reduction
      year,
    });
  }

  // Climatic sessions — Winter (Nov-Feb) and Summer (May-Jul)
  for (const year of years) {
    seeds.push({
      name: `Winter ${year}-${(year + 1).toString().slice(2)}`,
      type: 'climatic',
      peakDate: `${year}-12-15`,
      windowStart: `${year}-11-01`,
      windowEnd: `${year + 1}-02-28`,
      demandEffect: 1.40, // +40% peak riding season
      year,
    });
    seeds.push({
      name: `Summer ${year}`,
      type: 'climatic',
      peakDate: `${year}-06-15`,
      windowStart: `${year}-05-01`,
      windowEnd: `${year}-07-31`,
      demandEffect: 1.00, // baseline
      year,
    });
  }

  // Sort by peak date
  return seeds.sort((a, b) => a.peakDate.localeCompare(b.peakDate));
}

/** Backward-compat static export for the next 12-18 months. */
export const FESTIVAL_SEEDS: FestivalSeed[] = buildFestivalSeeds(2026);

/** Human-readable description of the demand effect. */
export function describeEffect(effect: number): string {
  if (effect === 1.0) return 'Baseline (no change)';
  const pct = Math.round((effect - 1) * 100);
  return pct > 0 ? `+${pct}% lift` : `${pct}% drop`;
}

/** Days until a given ISO date from today. */
export function daysUntil(isoDate: string): number {
  const target = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

/** Format an ISO date for display. */
export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
