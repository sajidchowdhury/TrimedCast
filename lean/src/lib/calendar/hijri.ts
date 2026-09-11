// ============================================
// TrimedCast LEAN — Hijri calendar conversion for Eid dates
// Fixes Gap #1: the original code hardcoded Eid to Gregorian months
// (April for Eid-ul-Fitr, July for Eid-ul-Adha). Because Eid follows
// the Islamic lunar calendar (~11 days shorter than Gregorian), the
// hardcoded month is wrong for most years. This module computes
// day-precise Eid dates via the civil tabular Hijri calendar.
// ============================================

import { toGregorian } from 'hijri-converter';

export interface GregorianDate {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  iso: string;  // yyyy-mm-dd
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toISO(gy: number, gm: number, gd: number): string {
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

/**
 * The Hijri year that overlaps a given Gregorian year.
 * The Islamic (Hijri) year is ~354 days, so it shifts ~11 days earlier
 * each Gregorian year. The offset: Hijri year ≈ Gregorian year - 579.
 *   2027 - 579 = 1448 → Eid-ul-Fitr 1 Shawwal 1448 = 2027-03-09 ✓
 *   2026 - 579 = 1447 → Eid-ul-Fitr 1 Shawwal 1447 = 2026-03-20 ✓
 */
export function hijriYearForGregorian(gy: number): number {
  return gy - 579;
}

/**
 * Eid-ul-Fitr = 1 Shawwal (month 10) of the Hijri year.
 * Returns the Gregorian date for a given Gregorian year.
 */
export function getEidUlFitrDate(gregorianYear: number): GregorianDate {
  const hy = hijriYearForGregorian(gregorianYear);
  const { gy, gm, gd } = toGregorian(hy, 10, 1);
  return { year: gy, month: gm, day: gd, iso: toISO(gy, gm, gd) };
}

/**
 * Eid-ul-Adha = 10 Dhu al-Hijjah (month 12) of the Hijri year.
 * Returns the Gregorian date for a given Gregorian year.
 */
export function getEidUlAdhaDate(gregorianYear: number): GregorianDate {
  const hy = hijriYearForGregorian(gregorianYear);
  const { gy, gm, gd } = toGregorian(hy, 12, 10);
  return { year: gy, month: gm, day: gd, iso: toISO(gy, gm, gd) };
}

/**
 * Durga Puja follows the Bengali lunar calendar; dates vary slightly
 * year to year (Dashami usually falls Oct 10–25). Use a maintained
 * date table refreshed annually from the BD Government Gazette.
 */
const DURGA_PUJA_DATES: Record<number, string> = {
  2024: '2024-10-13',
  2025: '2025-10-02',
  2026: '2026-10-20',
  2027: '2027-10-10',
  2028: '2028-09-29',
  2029: '2029-10-18',
};

export function getDurgaPujaDate(gregorianYear: number): GregorianDate {
  const iso = DURGA_PUJA_DATES[gregorianYear] || `${gregorianYear}-10-15`;
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m, day: d, iso };
}

/**
 * Chinese New Year factory shutdown window (Jan 20 – Feb 20, approximate).
 * The exact CNY date shifts each year; this is a conservative fixed window
 * that covers the typical shutdown period for BD distributors.
 */
export function getCNYWindow(gregorianYear: number): { startISO: string; endISO: string } {
  return {
    startISO: `${gregorianYear}-01-20`,
    endISO: `${gregorianYear}-02-20`,
  };
}
