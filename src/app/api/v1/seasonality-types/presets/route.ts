// ============================================
// GET /api/v1/seasonality-types/presets
// Return BD seasonality presets + BD months + BD holidays
// No auth needed (static reference data)
// ============================================

import { apiSuccess, apiError } from '@/lib/api/response';
import { DEMO_SEASONALITY_TYPES } from '@/lib/demo-data/content';

export const runtime = 'nodejs';

// --- BD Months Reference ---
const BD_MONTHS = [
  { number: 1,  name: 'January',   nameBn: 'জানুয়ারি',    season: 'winter' },
  { number: 2,  name: 'February',  nameBn: 'ফেব্রুয়ারি',   season: 'winter' },
  { number: 3,  name: 'March',     nameBn: 'মার্চ',        season: 'pre_monsoon' },
  { number: 4,  name: 'April',     nameBn: 'এপ্রিল',       season: 'pre_monsoon' },
  { number: 5,  name: 'May',       nameBn: 'মে',          season: 'pre_monsoon' },
  { number: 6,  name: 'June',      nameBn: 'জুন',         season: 'monsoon' },
  { number: 7,  name: 'July',      nameBn: 'জুলাই',        season: 'monsoon' },
  { number: 8,  name: 'August',    nameBn: 'আগস্ট',        season: 'monsoon' },
  { number: 9,  name: 'September', nameBn: 'সেপ্টেম্বর',    season: 'monsoon' },
  { number: 10, name: 'October',   nameBn: 'অক্টোবর',      season: 'post_monsoon' },
  { number: 11, name: 'November',  nameBn: 'নভেম্বর',      season: 'post_monsoon' },
  { number: 12, name: 'December',  nameBn: 'ডিসেম্বর',      season: 'winter' },
];

// --- BD Holidays Reference ---
const BD_HOLIDAYS = [
  { month: 1,  name: 'New Year',                nameBn: 'নববর্ষ',         type: 'national' },
  { month: 2,  name: 'International Mother Language Day', nameBn: 'আন্তর্জাতিক মাতৃভাষা দিবস', type: 'national' },
  { month: 3,  name: 'Independence Day',         nameBn: 'স্বাধীনতা দিবস',     type: 'national' },
  { month: 3,  name: 'Eid ul-Fitr (approx)',     nameBn: 'ঈদুল ফিতর',        type: 'religious', seasonality: 'eid_peak' },
  { month: 4,  name: 'Eid ul-Fitr (extended)',   nameBn: 'ঈদুল ফিতর (বর্ধিত)', type: 'religious', seasonality: 'eid_peak' },
  { month: 4,  name: 'Bengali New Year (Pohela Boishakh)', nameBn: 'পহেলা বৈশাখ', type: 'national' },
  { month: 5,  name: 'May Day',                  nameBn: 'মে ডে',          type: 'national' },
  { month: 8,  name: 'Eid ul-Adha (approx)',     nameBn: 'ঈদুল আযহা',        type: 'religious', seasonality: 'eid_peak' },
  { month: 8,  name: 'National Mourning Day',    nameBn: 'জাতীয় শোক দিবস',   type: 'national' },
  { month: 9,  name: 'Eid ul-Adha (extended)',   nameBn: 'ঈদুল আযহা (বর্ধিত)', type: 'religious', seasonality: 'eid_peak' },
  { month: 12, name: 'Victory Day',              nameBn: 'বিজয় দিবস',       type: 'national' },
  { month: 1,  name: 'Chinese New Year',         nameBn: 'চীনা নববর্ষ',      type: 'international', seasonality: 'cny_shutdown' },
  { month: 2,  name: 'Chinese New Year (extended)', nameBn: 'চীনা নববর্ষ (বর্ধিত)', type: 'international', seasonality: 'cny_shutdown' },
];

export async function GET() {
  try {
    // Parse months from JSON strings in presets
    const presets = DEMO_SEASONALITY_TYPES.map((p) => ({
      ...p,
      months: JSON.parse(p.months),
    }));

    return apiSuccess({
      presets,
      months: BD_MONTHS,
      holidays: BD_HOLIDAYS,
    });
  } catch (error) {
    console.error('[SeasonalityTypes/presets/GET]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch seasonality presets' },
      500
    );
  }
}
