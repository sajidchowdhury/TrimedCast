// ============================================
// TrimedCast - Seasonality Type Definitions
// Types, constants, and presets for seasonality
// management (BD motorcycle parts context)
// ============================================

// --- SeasonalityType as returned from API ---
export interface SeasonalityType {
  id: string;
  name: string;
  label: string;
  label_bn?: string | null;
  description?: string | null;
  multiplier: number;
  months: number[]; // parsed from JSON
  color?: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// --- Create input ---
export interface CreateSeasonalityTypeInput {
  name?: string; // auto-generated from label if omitted
  label: string;
  label_bn?: string;
  description?: string;
  multiplier: number;
  months: number[];
  color?: string;
  is_active?: boolean;
}

// --- Update input ---
export interface UpdateSeasonalityTypeInput {
  label?: string;
  label_bn?: string;
  description?: string;
  multiplier?: number;
  months?: number[];
  color?: string;
  is_active?: boolean;
}

// --- Bengali + English month names ---
export const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTH_NAMES_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

export const MONTH_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const MONTH_SHORT_BN = [
  'জানু', 'ফেব', 'মার্চ', 'এপ্রি', 'মে', 'জুন',
  'জুলা', 'আগ', 'সেপ', 'অক্ট', 'নভ', 'ডিস',
];

// --- BD Holidays (name, nameBn, month, type) ---
export const BD_HOLIDAYS = [
  { name: 'Eid ul-Fitr', nameBn: 'ঈদুল ফিতর', month: 3, type: 'religious' },
  { name: 'Eid ul-Adha', nameBn: 'ঈদুল আযহা', month: 6, type: 'religious' },
  { name: 'Durga Puja', nameBn: 'দুর্গা পূজা', month: 10, type: 'religious' },
  { name: 'Pohela Boishakh', nameBn: 'পহেলা বৈশাখ', month: 4, type: 'cultural' },
  { name: 'Independence Day', nameBn: 'স্বাধীনতা দিবস', month: 3, type: 'national' },
  { name: 'Victory Day', nameBn: 'বিজয় দিবস', month: 12, type: 'national' },
  { name: 'Chinese New Year', nameBn: 'চীনা নববর্ষ', month: 1, type: 'international' },
] as const;

// --- Color palette for seasonality types ---
export const PRESET_COLORS = [
  '#10b981', '#f43f5e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#0ea5e9',
];

// --- Multiplier range ---
export const MULTIPLIER_MIN = 0.1;
export const MULTIPLIER_MAX = 5.0;

// --- BD seasonality presets (for quick add) ---
export const SEASONALITY_PRESETS = [
  {
    name: 'winter_peak',
    label: 'Winter Peak Demand',
    labelBn: 'শীতকালীন চাহিদা বৃদ্ধি',
    description: 'Oct-Feb demand spike for brake pads, chains, suspension parts',
    multiplier: 1.8,
    months: [10, 11, 12, 1, 2],
    color: '#10b981',
  },
  {
    name: 'monsoon_dip',
    label: 'Monsoon Demand Dip',
    labelBn: 'মৌসুমী চাহিদা হ্রাস',
    description: 'Jun-Sep reduced riding, lower parts demand',
    multiplier: 0.5,
    months: [6, 7, 8, 9],
    color: '#f43f5e',
  },
  {
    name: 'eid_peak',
    label: 'Eid Peak Demand',
    labelBn: 'ঈদের চাহিদা বৃদ্ধি',
    description: 'Ramadan/Eid shopping surge - body parts, accessories, oil',
    multiplier: 1.6,
    months: [3, 4],
    color: '#f59e0b',
  },
  {
    name: 'cny_shutdown',
    label: 'CNY Supplier Shutdown',
    labelBn: 'চীনা নববর্ষ সাপ্লায়ার বন্ধ',
    description: 'Jan-Feb Chinese New Year - suppliers closed, no new orders',
    multiplier: 0.3,
    months: [1, 2],
    color: '#ef4444',
  },
  {
    name: 'puja_peak',
    label: 'Puja Season Demand',
    labelBn: 'পূজার মৌসুমে চাহিদা',
    description: 'Oct Durga Puja - body parts and decorative accessories',
    multiplier: 1.4,
    months: [10],
    color: '#8b5cf6',
  },
  {
    name: 'pre_winter',
    label: 'Pre-Winter Stock-Up',
    labelBn: 'শীতকাল পূর্ব মজুত',
    description: 'Sep-Oct: shops stock up before winter peak',
    multiplier: 1.2,
    months: [9, 10],
    color: '#06b6d4',
  },
] as const;
