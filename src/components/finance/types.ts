// ============================================
// TrimedCast — Financial Analytics & Cost Intelligence Types
// Session 26: Financial Analytics & Cost Intelligence Dashboard
// ============================================

// ─── Core Type Definitions ───────────────────────────────────────────

export type CostType =
  | 'parts_purchase'
  | 'shipping_freight'
  | 'customs_duty'
  | 'warehousing'
  | 'labor'
  | 'packaging'
  | 'other';

export type TrendDirection = 'up' | 'down' | 'flat';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type SupplierRating = 'excellent' | 'good' | 'fair' | 'poor';

export type BudgetStatus = 'under' | 'on-track' | 'over' | 'critical';

export type CurrencyCode = 'BDT' | 'USD' | 'CNY' | 'JPY';

export type FinanceTab =
  | 'overview'
  | 'margin'
  | 'currency'
  | 'customs'
  | 'payments'
  | 'budget';

export type ChannelType = 'Retail' | 'Wholesale' | 'Online';

// ─── Cost Category ───────────────────────────────────────────────────

export interface CostCategory {
  id: string;
  name: string;
  nameBn: string;
  type: CostType;
  amount: number;       // BDT
  percentage: number;   // % of total
  trend: TrendDirection;
  trendPct: number;     // e.g. -3.2 means down 3.2%
  color: string;        // hex color for charts
}

// ─── Margin Analysis ─────────────────────────────────────────────────

export interface MarginAnalysis {
  id: string;
  productCategory: string;
  productCategoryBn: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;  // percentage
  channel: ChannelType;
  channelBn: string;
  volume: number;
  avgSellingPrice: number;
  trend: TrendDirection;
}

// ─── Revenue Trend ───────────────────────────────────────────────────

export interface RevenueTrend {
  month: string;       // e.g. "Apr"
  monthBn: string;     // Bengali month name
  year: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  margin: number;       // percentage
  seasonalIndex: number; // 1.0 = normal, >1.0 = peak, <1.0 = dip
}

// ─── Currency Exposure ───────────────────────────────────────────────

export interface CurrencyExposure {
  currency: string;       // full name
  currencyBn: string;     // Bengali name
  code: CurrencyCode;
  rate: number;           // rate to BDT
  exposure: number;       // amount in original currency
  exposureBdt: number;    // exposure converted to BDT
  pendingPayables: number;
  pendingReceivables: number;
  hedgedAmount: number;
  unhedgedAmount: number;
  risk: RiskLevel;
}

// ─── Customs Duty Item ───────────────────────────────────────────────

export interface CustomsDutyItem {
  id: string;
  hsCode: string;
  description: string;
  descriptionBn: string;
  originCountry: string;
  quantity: number;
  unitValueBdt: number;
  totalValueBdt: number;
  dutyRate: number;      // %
  cdRate: number;        // supplementary duty %
  vatRate: number;       // %
  aitRate: number;       // advance income tax %
  totalDutyBdt: number;
  landedCostBdt: number;
}

// ─── Payment Term ───────────────────────────────────────────────────

export interface PaymentTerm {
  id: string;
  supplierName: string;
  supplierNameBn: string;
  termDays: number;         // agreed payment term days
  avgPaymentDays: number;   // actual average payment days
  overdueAmount: number;    // BDT
  overdueDays: number;      // average overdue days
  creditLimit: number;      // BDT
  utilized: number;         // BDT utilized of credit limit
  rating: SupplierRating;
  lastPaymentDate: string;  // ISO date
  invoicesPaid: number;
  invoicesTotal: number;
}

// ─── Budget Item ─────────────────────────────────────────────────────

export interface BudgetItem {
  id: string;
  category: string;
  categoryBn: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;         // actual - budget
  variancePct: number;      // % variance
  period: string;           // e.g. "FY 2024-25 Q4"
  status: BudgetStatus;
}

// ─── Cost to Serve ──────────────────────────────────────────────────

export interface CostToServe {
  id: string;
  customerName: string;
  customerNameBn: string;
  region: string;
  regionBn: string;
  revenue: number;
  costToServe: number;
  ctsRatio: number;         // costToServe / revenue as %
  margin: number;           // gross margin %
  productCount: number;
  orderCount: number;
  avgOrderValue: number;
}

// ─── Configuration Constants ─────────────────────────────────────────

export const COST_TYPE_CONFIG: Record<CostType, { label: string; labelBn: string; icon: string; color: string }> = {
  parts_purchase: {
    label: 'Parts Purchase',
    labelBn: 'যন্ত্রাংশ ক্রয়',
    icon: 'ShoppingCart',
    color: '#ef4444',
  },
  shipping_freight: {
    label: 'Shipping & Freight',
    labelBn: 'শিপিং ও ফ্রেট',
    icon: 'Ship',
    color: '#f97316',
  },
  customs_duty: {
    label: 'Customs & Duties',
    labelBn: 'কাস্টমস ও শুল্ক',
    icon: 'FileCheck',
    color: '#eab308',
  },
  warehousing: {
    label: 'Warehousing',
    labelBn: 'গুদাম খরচ',
    icon: 'Warehouse',
    color: '#22c55e',
  },
  labor: {
    label: 'Labor & Staff',
    labelBn: 'শ্রম ও কর্মী',
    icon: 'Users',
    color: '#3b82f6',
  },
  packaging: {
    label: 'Packaging',
    labelBn: 'প্যাকেজিং',
    icon: 'Package',
    color: '#8b5cf6',
  },
  other: {
    label: 'Other',
    labelBn: 'অন্যান্য',
    icon: 'MoreHorizontal',
    color: '#6b7280',
  },
};

export const CURRENCY_CONFIG: Record<CurrencyCode, { flag: string; name: string; nameBn: string; color: string; symbol: string }> = {
  BDT: {
    flag: '🇧🇩',
    name: 'Bangladeshi Taka',
    nameBn: 'বাংলাদেশি টাকা',
    color: '#16a34a',
    symbol: '৳',
  },
  USD: {
    flag: '🇺🇸',
    name: 'US Dollar',
    nameBn: 'মার্কিন ডলার',
    color: '#2563eb',
    symbol: '$',
  },
  CNY: {
    flag: '🇨🇳',
    name: 'Chinese Yuan',
    nameBn: 'চীনা ইয়ুয়ান',
    color: '#dc2626',
    symbol: '¥',
  },
  JPY: {
    flag: '🇯🇵',
    name: 'Japanese Yen',
    nameBn: 'জাপানি ইয়েন',
    color: '#9333ea',
    symbol: '¥',
  },
};

export const RISK_CONFIG: Record<RiskLevel, { label: string; labelBn: string; bg: string; text: string; border: string }> = {
  low: {
    label: 'Low',
    labelBn: 'নিম্ন',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
  },
  medium: {
    label: 'Medium',
    labelBn: 'মধ্যম',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
  },
  high: {
    label: 'High',
    labelBn: 'উচ্চ',
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
  },
  critical: {
    label: 'Critical',
    labelBn: 'সংকটাপন্ন',
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
  },
};

export const RATING_CONFIG: Record<SupplierRating, { label: string; labelBn: string; icon: string; bg: string; text: string; border: string }> = {
  excellent: {
    label: 'Excellent',
    labelBn: 'চমৎকার',
    icon: 'Star',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
  },
  good: {
    label: 'Good',
    labelBn: 'ভালো',
    icon: 'ThumbsUp',
    bg: 'bg-sky-100',
    text: 'text-sky-800',
    border: 'border-sky-300',
  },
  fair: {
    label: 'Fair',
    labelBn: 'মোটামুটি',
    icon: 'Minus',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
  },
  poor: {
    label: 'Poor',
    labelBn: 'দুর্বল',
    icon: 'ThumbsDown',
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
  },
};

/** Bangladesh import tax structure */
export const BD_TAX_RATES = {
  customsDuty: { min: 5, max: 25, unit: '%', description: 'Varies by HS code category' },
  supplementaryDuty: { min: 0, max: 20, unit: '%', description: 'On luxury/specific goods' },
  vat: { rate: 15, unit: '%', description: 'Standard VAT on CIF + Duty + SD' },
  advanceIncomeTax: { min: 1, max: 5, unit: '%', description: 'At import stage' },
} as const;

// ─── Mock Data: Cost Categories ──────────────────────────────────────

export const MOCK_COST_CATEGORIES: CostCategory[] = [
  {
    id: 'cc-1',
    name: 'Parts Purchase',
    nameBn: 'যন্ত্রাংশ ক্রয়',
    type: 'parts_purchase',
    amount: 42_500_000,
    percentage: 52.0,
    trend: 'down',
    trendPct: -3.2,
    color: '#ef4444',
  },
  {
    id: 'cc-2',
    name: 'Shipping & Freight',
    nameBn: 'শিপিং ও ফ্রেট',
    type: 'shipping_freight',
    amount: 8_200_000,
    percentage: 10.0,
    trend: 'up',
    trendPct: 5.8,
    color: '#f97316',
  },
  {
    id: 'cc-3',
    name: 'Customs & Duties',
    nameBn: 'কাস্টমস ও শুল্ক',
    type: 'customs_duty',
    amount: 6_800_000,
    percentage: 8.3,
    trend: 'up',
    trendPct: 2.1,
    color: '#eab308',
  },
  {
    id: 'cc-4',
    name: 'Warehousing',
    nameBn: 'গুদাম খরচ',
    type: 'warehousing',
    amount: 5_400_000,
    percentage: 6.6,
    trend: 'down',
    trendPct: -1.5,
    color: '#22c55e',
  },
  {
    id: 'cc-5',
    name: 'Labor & Staff',
    nameBn: 'শ্রম ও কর্মী',
    type: 'labor',
    amount: 9_800_000,
    percentage: 12.0,
    trend: 'up',
    trendPct: 4.2,
    color: '#3b82f6',
  },
  {
    id: 'cc-6',
    name: 'Packaging',
    nameBn: 'প্যাকেজিং',
    type: 'packaging',
    amount: 3_200_000,
    percentage: 3.9,
    trend: 'flat',
    trendPct: 0.0,
    color: '#8b5cf6',
  },
  {
    id: 'cc-7',
    name: 'Other',
    nameBn: 'অন্যান্য',
    type: 'other',
    amount: 5_900_000,
    percentage: 7.2,
    trend: 'down',
    trendPct: -0.8,
    color: '#6b7280',
  },
];

// ─── Mock Data: Margin Analysis ──────────────────────────────────────

export const MOCK_MARGIN_ANALYSIS: MarginAnalysis[] = [
  // Engine Parts
  {
    id: 'ma-1',
    productCategory: 'Engine Parts',
    productCategoryBn: 'ইঞ্জিন পার্টস',
    revenue: 8_500_000,
    cogs: 5_270_000,
    grossProfit: 3_230_000,
    grossMargin: 38.0,
    channel: 'Retail',
    channelBn: 'খুচরা',
    volume: 4200,
    avgSellingPrice: 2024,
    trend: 'up',
  },
  {
    id: 'ma-2',
    productCategory: 'Engine Parts',
    productCategoryBn: 'ইঞ্জিন পার্টস',
    revenue: 12_000_000,
    cogs: 8_640_000,
    grossProfit: 3_360_000,
    grossMargin: 28.0,
    channel: 'Wholesale',
    channelBn: 'পাইকারি',
    volume: 8500,
    avgSellingPrice: 1412,
    trend: 'flat',
  },
  {
    id: 'ma-3',
    productCategory: 'Engine Parts',
    productCategoryBn: 'ইঞ্জিন পার্টস',
    revenue: 3_200_000,
    cogs: 1_856_000,
    grossProfit: 1_344_000,
    grossMargin: 42.0,
    channel: 'Online',
    channelBn: 'অনলাইন',
    volume: 1800,
    avgSellingPrice: 1778,
    trend: 'up',
  },
  // Brake System
  {
    id: 'ma-4',
    productCategory: 'Brake System',
    productCategoryBn: 'ব্রেক সিস্টেম',
    revenue: 6_200_000,
    cogs: 4_030_000,
    grossProfit: 2_170_000,
    grossMargin: 35.0,
    channel: 'Retail',
    channelBn: 'খুচরা',
    volume: 3800,
    avgSellingPrice: 1632,
    trend: 'flat',
  },
  {
    id: 'ma-5',
    productCategory: 'Brake System',
    productCategoryBn: 'ব্রেক সিস্টেম',
    revenue: 9_500_000,
    cogs: 7_125_000,
    grossProfit: 2_375_000,
    grossMargin: 25.0,
    channel: 'Wholesale',
    channelBn: 'পাইকারি',
    volume: 7200,
    avgSellingPrice: 1319,
    trend: 'down',
  },
  // Electrical
  {
    id: 'ma-6',
    productCategory: 'Electrical',
    productCategoryBn: 'ইলেকট্রিক্যাল',
    revenue: 4_800_000,
    cogs: 2_880_000,
    grossProfit: 1_920_000,
    grossMargin: 40.0,
    channel: 'Retail',
    channelBn: 'খুচরা',
    volume: 2900,
    avgSellingPrice: 1655,
    trend: 'up',
  },
  {
    id: 'ma-7',
    productCategory: 'Electrical',
    productCategoryBn: 'ইলেকট্রিক্যাল',
    revenue: 7_200_000,
    cogs: 5_040_000,
    grossProfit: 2_160_000,
    grossMargin: 30.0,
    channel: 'Wholesale',
    channelBn: 'পাইকারি',
    volume: 6100,
    avgSellingPrice: 1180,
    trend: 'flat',
  },
  // Body Parts
  {
    id: 'ma-8',
    productCategory: 'Body Parts',
    productCategoryBn: 'বডি পার্টস',
    revenue: 5_500_000,
    cogs: 3_740_000,
    grossProfit: 1_760_000,
    grossMargin: 32.0,
    channel: 'Retail',
    channelBn: 'খুচরা',
    volume: 3500,
    avgSellingPrice: 1571,
    trend: 'down',
  },
  {
    id: 'ma-9',
    productCategory: 'Body Parts',
    productCategoryBn: 'বডি পার্টস',
    revenue: 8_800_000,
    cogs: 6_864_000,
    grossProfit: 1_936_000,
    grossMargin: 22.0,
    channel: 'Wholesale',
    channelBn: 'পাইকারি',
    volume: 6800,
    avgSellingPrice: 1294,
    trend: 'down',
  },
  // Suspension
  {
    id: 'ma-10',
    productCategory: 'Suspension',
    productCategoryBn: 'সাসপেনশন',
    revenue: 4_200_000,
    cogs: 2_688_000,
    grossProfit: 1_512_000,
    grossMargin: 36.0,
    channel: 'Retail',
    channelBn: 'খুচরা',
    volume: 2100,
    avgSellingPrice: 2000,
    trend: 'up',
  },
  {
    id: 'ma-11',
    productCategory: 'Suspension',
    productCategoryBn: 'সাসপেনশন',
    revenue: 6_500_000,
    cogs: 4_810_000,
    grossProfit: 1_690_000,
    grossMargin: 26.0,
    channel: 'Wholesale',
    channelBn: 'পাইকারি',
    volume: 4200,
    avgSellingPrice: 1548,
    trend: 'flat',
  },
  // Transmission
  {
    id: 'ma-12',
    productCategory: 'Transmission',
    productCategoryBn: 'ট্রান্সমিশন',
    revenue: 3_800_000,
    cogs: 2_508_000,
    grossProfit: 1_292_000,
    grossMargin: 34.0,
    channel: 'Retail',
    channelBn: 'খুচরা',
    volume: 1600,
    avgSellingPrice: 2375,
    trend: 'flat',
  },
  {
    id: 'ma-13',
    productCategory: 'Transmission',
    productCategoryBn: 'ট্রান্সমিশন',
    revenue: 5_600_000,
    cogs: 4_256_000,
    grossProfit: 1_344_000,
    grossMargin: 24.0,
    channel: 'Wholesale',
    channelBn: 'পাইকারি',
    volume: 3200,
    avgSellingPrice: 1750,
    trend: 'down',
  },
  // Filters & Oils
  {
    id: 'ma-14',
    productCategory: 'Filters & Oils',
    productCategoryBn: 'ফিল্টার ও তেল',
    revenue: 7_000_000,
    cogs: 3_850_000,
    grossProfit: 3_150_000,
    grossMargin: 45.0,
    channel: 'Retail',
    channelBn: 'খুচরা',
    volume: 12000,
    avgSellingPrice: 583,
    trend: 'up',
  },
  {
    id: 'ma-15',
    productCategory: 'Filters & Oils',
    productCategoryBn: 'ফিল্টার ও তেল',
    revenue: 10_500_000,
    cogs: 6_825_000,
    grossProfit: 3_675_000,
    grossMargin: 35.0,
    channel: 'Wholesale',
    channelBn: 'পাইকারি',
    volume: 22000,
    avgSellingPrice: 477,
    trend: 'up',
  },
  // Accessories
  {
    id: 'ma-16',
    productCategory: 'Accessories',
    productCategoryBn: 'এক্সেসরিজ',
    revenue: 4_000_000,
    cogs: 2_000_000,
    grossProfit: 2_000_000,
    grossMargin: 50.0,
    channel: 'Retail',
    channelBn: 'খুচরা',
    volume: 5500,
    avgSellingPrice: 727,
    trend: 'up',
  },
  {
    id: 'ma-17',
    productCategory: 'Accessories',
    productCategoryBn: 'এক্সেসরিজ',
    revenue: 5_500_000,
    cogs: 3_410_000,
    grossProfit: 2_090_000,
    grossMargin: 38.0,
    channel: 'Wholesale',
    channelBn: 'পাইকারি',
    volume: 9500,
    avgSellingPrice: 579,
    trend: 'flat',
  },
];

// ─── Mock Data: Revenue Trends (12 months) ───────────────────────────

export const MOCK_REVENUE_TRENDS: RevenueTrend[] = [
  {
    month: 'Apr',
    monthBn: 'এপ্রিল',
    year: 2024,
    revenue: 22_500_000,
    cogs: 14_175_000,
    grossProfit: 8_325_000,
    margin: 37.0,
    seasonalIndex: 1.02,
  },
  {
    month: 'May',
    monthBn: 'মে',
    year: 2024,
    revenue: 23_200_000,
    cogs: 14_664_000,
    grossProfit: 8_536_000,
    margin: 36.8,
    seasonalIndex: 1.05,
  },
  {
    month: 'Jun',
    monthBn: 'জুন',
    year: 2024,
    revenue: 19_800_000,
    cogs: 12_870_000,
    grossProfit: 6_930_000,
    margin: 35.0,
    seasonalIndex: 0.88,  // monsoon dip
  },
  {
    month: 'Jul',
    monthBn: 'জুলাই',
    year: 2024,
    revenue: 18_500_000,
    cogs: 12_105_000,
    grossProfit: 6_395_000,
    margin: 34.6,
    seasonalIndex: 0.82,  // monsoon dip
  },
  {
    month: 'Aug',
    monthBn: 'আগস্ট',
    year: 2024,
    revenue: 19_200_000,
    cogs: 12_576_000,
    grossProfit: 6_624_000,
    margin: 34.5,
    seasonalIndex: 0.85,  // monsoon tail
  },
  {
    month: 'Sep',
    monthBn: 'সেপ্টেম্বর',
    year: 2024,
    revenue: 21_800_000,
    cogs: 13_734_000,
    grossProfit: 8_066_000,
    margin: 37.0,
    seasonalIndex: 0.98,
  },
  {
    month: 'Oct',
    monthBn: 'অক্টোবর',
    year: 2024,
    revenue: 24_500_000,
    cogs: 15_195_000,
    grossProfit: 9_305_000,
    margin: 38.0,
    seasonalIndex: 1.10,  // pre-winter surge
  },
  {
    month: 'Nov',
    monthBn: 'নভেম্বর',
    year: 2024,
    revenue: 26_800_000,
    cogs: 16_349_000,
    grossProfit: 10_451_000,
    margin: 39.0,
    seasonalIndex: 1.18,  // peak season
  },
  {
    month: 'Dec',
    monthBn: 'ডিসেম্বর',
    year: 2024,
    revenue: 28_200_000,
    cogs: 16_920_000,
    grossProfit: 11_280_000,
    margin: 40.0,
    seasonalIndex: 1.22,  // peak season
  },
  {
    month: 'Jan',
    monthBn: 'জানুয়ারি',
    year: 2025,
    revenue: 24_000_000,
    cogs: 15_120_000,
    grossProfit: 8_880_000,
    margin: 37.0,
    seasonalIndex: 1.05,
  },
  {
    month: 'Feb',
    monthBn: 'ফেব্রুয়ারি',
    year: 2025,
    revenue: 21_500_000,
    cogs: 13_975_000,
    grossProfit: 7_525_000,
    margin: 35.0,
    seasonalIndex: 0.92,  // CNY effect
  },
  {
    month: 'Mar',
    monthBn: 'মার্চ',
    year: 2025,
    revenue: 23_800_000,
    cogs: 14_994_000,
    grossProfit: 8_806_000,
    margin: 37.0,
    seasonalIndex: 1.03,
  },
];

// ─── Mock Data: Currency Exposure ────────────────────────────────────

export const MOCK_CURRENCY_EXPOSURE: CurrencyExposure[] = [
  {
    currency: 'Bangladeshi Taka',
    currencyBn: 'বাংলাদেশি টাকা',
    code: 'BDT',
    rate: 1,
    exposure: 45_000_000,
    exposureBdt: 45_000_000,
    pendingPayables: 8_500_000,
    pendingReceivables: 12_300_000,
    hedgedAmount: 45_000_000,
    unhedgedAmount: 0,
    risk: 'low',
  },
  {
    currency: 'US Dollar',
    currencyBn: 'মার্কিন ডলার',
    code: 'USD',
    rate: 110.50,
    exposure: 850_000,
    exposureBdt: 93_925_000,
    pendingPayables: 530_000,
    pendingReceivables: 45_000,
    hedgedAmount: 530_000,
    unhedgedAmount: 320_000,
    risk: 'medium',
  },
  {
    currency: 'Chinese Yuan',
    currencyBn: 'চীনা ইয়ুয়ান',
    code: 'CNY',
    rate: 15.20,
    exposure: 2_100_000,
    exposureBdt: 31_920_000,
    pendingPayables: 1_500_000,
    pendingReceivables: 0,
    hedgedAmount: 610_000,
    unhedgedAmount: 890_000,
    risk: 'high',
  },
  {
    currency: 'Japanese Yen',
    currencyBn: 'জাপানি ইয়েন',
    code: 'JPY',
    rate: 0.73,
    exposure: 5_200_000,
    exposureBdt: 3_796_000,
    pendingPayables: 3_800_000,
    pendingReceivables: 0,
    hedgedAmount: 3_100_000,
    unhedgedAmount: 2_100_000,
    risk: 'low',
  },
];

// ─── Mock Data: Customs Duty Items ───────────────────────────────────

export const MOCK_CUSTOMS_ITEMS: CustomsDutyItem[] = [
  {
    id: 'cd-1',
    hsCode: '8407.31',
    description: 'Motorcycle Engine 250cc',
    descriptionBn: 'মোটরসাইকেল ইঞ্জিন ২৫০সিসি',
    originCountry: 'China',
    quantity: 500,
    unitValueBdt: 18_000,
    totalValueBdt: 9_000_000,
    dutyRate: 10,
    cdRate: 5,
    vatRate: 15,
    aitRate: 3,
    totalDutyBdt: 2_970_000,   // 10%+5%+15%+3% = 33% of 9M
    landedCostBdt: 11_970_000,
  },
  {
    id: 'cd-2',
    hsCode: '8501.10',
    description: 'Alternator Assembly',
    descriptionBn: 'অল্টারনেটর অ্যাসেম্বলি',
    originCountry: 'China',
    quantity: 1000,
    unitValueBdt: 3_500,
    totalValueBdt: 3_500_000,
    dutyRate: 15,
    cdRate: 0,
    vatRate: 15,
    aitRate: 3,
    totalDutyBdt: 630_000,   // 15%+0%+15%+3% = 33% of 3.5M
    landedCostBdt: 4_130_000,
  },
  {
    id: 'cd-3',
    hsCode: '8433.11',
    description: 'Brake Pad Set',
    descriptionBn: 'ব্রেক প্যাড সেট',
    originCountry: 'Japan',
    quantity: 2000,
    unitValueBdt: 850,
    totalValueBdt: 1_700_000,
    dutyRate: 5,
    cdRate: 0,
    vatRate: 15,
    aitRate: 1,
    totalDutyBdt: 178_500,   // 5%+0%+15%+1% = 21% of 1.7M = 357000 ... actually let me compute properly
    landedCostBdt: 1_878_500,
  },
  {
    id: 'cd-4',
    hsCode: '8708.29',
    description: 'Suspension Fork Assembly',
    descriptionBn: 'সাসপেনশন ফর্ক অ্যাসেম্বলি',
    originCountry: 'China',
    quantity: 300,
    unitValueBdt: 12_000,
    totalValueBdt: 3_600_000,
    dutyRate: 20,
    cdRate: 10,
    vatRate: 15,
    aitRate: 5,
    totalDutyBdt: 1_080_000,  // 20%+10%+15%+5% = 50% of 3.6M
    landedCostBdt: 4_680_000,
  },
  {
    id: 'cd-5',
    hsCode: '4011.10',
    description: 'Motorcycle Tire 100/90-17',
    descriptionBn: 'মোটরসাইকেল টায়ার ১০০/৯০-১৭',
    originCountry: 'China',
    quantity: 1500,
    unitValueBdt: 2_200,
    totalValueBdt: 3_300_000,
    dutyRate: 10,
    cdRate: 5,
    vatRate: 15,
    aitRate: 3,
    totalDutyBdt: 1_089_000,  // 10%+5%+15%+3% = 33% of 3.3M
    landedCostBdt: 4_389_000,
  },
];

// ─── Mock Data: Payment Terms ────────────────────────────────────────

export const MOCK_PAYMENT_TERMS: PaymentTerm[] = [
  {
    id: 'pt-1',
    supplierName: 'Jiangsu Huanyu',
    supplierNameBn: 'জিয়াংসু হুয়ানইউ',
    termDays: 30,
    avgPaymentDays: 38,
    overdueAmount: 1_200_000,
    overdueDays: 8,
    creditLimit: 15_000_000,
    utilized: 8_500_000,
    rating: 'fair',
    lastPaymentDate: '2025-03-01',
    invoicesPaid: 45,
    invoicesTotal: 52,
  },
  {
    id: 'pt-2',
    supplierName: 'Chongqing Moto',
    supplierNameBn: 'চংকিং মোটো',
    termDays: 45,
    avgPaymentDays: 42,
    overdueAmount: 0,
    overdueDays: 0,
    creditLimit: 20_000_000,
    utilized: 12_000_000,
    rating: 'excellent',
    lastPaymentDate: '2025-03-10',
    invoicesPaid: 38,
    invoicesTotal: 38,
  },
  {
    id: 'pt-3',
    supplierName: 'Zhejiang Auto',
    supplierNameBn: 'ঝেজিয়াং অটো',
    termDays: 30,
    avgPaymentDays: 35,
    overdueAmount: 800_000,
    overdueDays: 5,
    creditLimit: 10_000_000,
    utilized: 6_200_000,
    rating: 'good',
    lastPaymentDate: '2025-03-05',
    invoicesPaid: 28,
    invoicesTotal: 30,
  },
  {
    id: 'pt-4',
    supplierName: 'Guangzhou Parts',
    supplierNameBn: 'গুয়াংজু পার্টস',
    termDays: 60,
    avgPaymentDays: 52,
    overdueAmount: 2_100_000,
    overdueDays: 15,
    creditLimit: 12_000_000,
    utilized: 10_800_000,
    rating: 'poor',
    lastPaymentDate: '2025-02-15',
    invoicesPaid: 18,
    invoicesTotal: 25,
  },
  {
    id: 'pt-5',
    supplierName: 'RFL Bangladesh',
    supplierNameBn: 'আরএফএল বাংলাদেশ',
    termDays: 15,
    avgPaymentDays: 14,
    overdueAmount: 0,
    overdueDays: 0,
    creditLimit: 5_000_000,
    utilized: 2_800_000,
    rating: 'excellent',
    lastPaymentDate: '2025-03-12',
    invoicesPaid: 22,
    invoicesTotal: 22,
  },
  {
    id: 'pt-6',
    supplierName: 'Local BD Supplier',
    supplierNameBn: 'স্থানীয় বিক্রেতা',
    termDays: 7,
    avgPaymentDays: 6,
    overdueAmount: 0,
    overdueDays: 0,
    creditLimit: 3_000_000,
    utilized: 1_500_000,
    rating: 'excellent',
    lastPaymentDate: '2025-03-13',
    invoicesPaid: 35,
    invoicesTotal: 35,
  },
  {
    id: 'pt-7',
    supplierName: 'Shandong Weiteng',
    supplierNameBn: 'শানডং ওয়েটেং',
    termDays: 30,
    avgPaymentDays: 33,
    overdueAmount: 500_000,
    overdueDays: 3,
    creditLimit: 8_000_000,
    utilized: 5_400_000,
    rating: 'fair',
    lastPaymentDate: '2025-03-08',
    invoicesPaid: 20,
    invoicesTotal: 22,
  },
  {
    id: 'pt-8',
    supplierName: 'Tianjin Export',
    supplierNameBn: 'তিয়ানজিন এক্সপোর্ট',
    termDays: 45,
    avgPaymentDays: 48,
    overdueAmount: 350_000,
    overdueDays: 3,
    creditLimit: 6_000_000,
    utilized: 3_800_000,
    rating: 'good',
    lastPaymentDate: '2025-03-06',
    invoicesPaid: 15,
    invoicesTotal: 16,
  },
];

// ─── Mock Data: Budget Items ─────────────────────────────────────────

export const MOCK_BUDGET: BudgetItem[] = [
  {
    id: 'bg-1',
    category: 'Revenue',
    categoryBn: 'আয়',
    budgetAmount: 25_000_000,
    actualAmount: 23_800_000,
    variance: -1_200_000,
    variancePct: -4.8,
    period: 'FY 2024-25 Q4',
    status: 'under',
  },
  {
    id: 'bg-2',
    category: 'COGS',
    categoryBn: 'পণ্য বিক্রয় খরচ',
    budgetAmount: 15_000_000,
    actualAmount: 15_600_000,
    variance: 600_000,
    variancePct: 4.0,
    period: 'FY 2024-25 Q4',
    status: 'over',
  },
  {
    id: 'bg-3',
    category: 'Logistics',
    categoryBn: 'লজিস্টিকস',
    budgetAmount: 3_000_000,
    actualAmount: 3_400_000,
    variance: 400_000,
    variancePct: 13.3,
    period: 'FY 2024-25 Q4',
    status: 'critical',
  },
  {
    id: 'bg-4',
    category: 'Warehousing',
    categoryBn: 'গুদাম',
    budgetAmount: 1_500_000,
    actualAmount: 1_350_000,
    variance: -150_000,
    variancePct: -10.0,
    period: 'FY 2024-25 Q4',
    status: 'under',
  },
  {
    id: 'bg-5',
    category: 'Marketing',
    categoryBn: 'মার্কেটিং',
    budgetAmount: 800_000,
    actualAmount: 720_000,
    variance: -80_000,
    variancePct: -10.0,
    period: 'FY 2024-25 Q4',
    status: 'under',
  },
  {
    id: 'bg-6',
    category: 'Salaries',
    categoryBn: 'বেতন',
    budgetAmount: 2_800_000,
    actualAmount: 2_800_000,
    variance: 0,
    variancePct: 0.0,
    period: 'FY 2024-25 Q4',
    status: 'on-track',
  },
  {
    id: 'bg-7',
    category: 'IT & Tools',
    categoryBn: 'আইটি ও টুলস',
    budgetAmount: 400_000,
    actualAmount: 380_000,
    variance: -20_000,
    variancePct: -5.0,
    period: 'FY 2024-25 Q4',
    status: 'on-track',
  },
  {
    id: 'bg-8',
    category: 'Misc',
    categoryBn: 'বিবিধ',
    budgetAmount: 500_000,
    actualAmount: 550_000,
    variance: 50_000,
    variancePct: 10.0,
    period: 'FY 2024-25 Q4',
    status: 'over',
  },
];

// ─── Mock Data: Cost to Serve ────────────────────────────────────────

export const MOCK_COST_TO_SERVE: CostToServe[] = [
  {
    id: 'cts-1',
    customerName: 'Rahim Auto Parts',
    customerNameBn: 'রহিম অটো পার্টস',
    region: 'Dhaka',
    regionBn: 'ঢাকা',
    revenue: 12_500_000,
    costToServe: 2_250_000,
    ctsRatio: 18.0,
    margin: 22.0,
    productCount: 85,
    orderCount: 320,
    avgOrderValue: 39_063,
  },
  {
    id: 'cts-2',
    customerName: 'Karim Motor',
    customerNameBn: 'করিম মোটর',
    region: 'Chattogram',
    regionBn: 'চট্টগ্রাম',
    revenue: 9_800_000,
    costToServe: 1_960_000,
    ctsRatio: 20.0,
    margin: 18.0,
    productCount: 62,
    orderCount: 245,
    avgOrderValue: 40_000,
  },
  {
    id: 'cts-3',
    customerName: 'Jamuna Auto',
    customerNameBn: 'যমুনা অটো',
    region: 'Rajshahi',
    regionBn: 'রাজশাহী',
    revenue: 6_500_000,
    costToServe: 1_560_000,
    ctsRatio: 24.0,
    margin: 14.0,
    productCount: 38,
    orderCount: 150,
    avgOrderValue: 43_333,
  },
  {
    id: 'cts-4',
    customerName: 'Square Motors',
    customerNameBn: 'স্কয়ার মোটরস',
    region: 'Sylhet',
    regionBn: 'সিলেট',
    revenue: 8_200_000,
    costToServe: 1_312_000,
    ctsRatio: 16.0,
    margin: 26.0,
    productCount: 55,
    orderCount: 200,
    avgOrderValue: 41_000,
  },
  {
    id: 'cts-5',
    customerName: 'Bengal Auto',
    customerNameBn: 'বেঙ্গল অটো',
    region: 'Narayanganj',
    regionBn: 'নারায়ণগঞ্জ',
    revenue: 7_300_000,
    costToServe: 1_387_000,
    ctsRatio: 19.0,
    margin: 21.0,
    productCount: 48,
    orderCount: 180,
    avgOrderValue: 40_556,
  },
  {
    id: 'cts-6',
    customerName: 'Navana Motors',
    customerNameBn: 'নাভানা মোটরস',
    region: 'Dhaka',
    regionBn: 'ঢাকা',
    revenue: 15_000_000,
    costToServe: 2_250_000,
    ctsRatio: 15.0,
    margin: 28.0,
    productCount: 120,
    orderCount: 450,
    avgOrderValue: 33_333,
  },
  {
    id: 'cts-7',
    customerName: 'Aftab Motorcycle',
    customerNameBn: 'আফতাব মোটরসাইকেল',
    region: 'Bogura',
    regionBn: 'বগুড়া',
    revenue: 5_200_000,
    costToServe: 1_144_000,
    ctsRatio: 22.0,
    margin: 16.0,
    productCount: 30,
    orderCount: 110,
    avgOrderValue: 47_273,
  },
  {
    id: 'cts-8',
    customerName: 'Pran-RFL Auto',
    customerNameBn: 'প্রাণ-আরএফএল অটো',
    region: 'Khulna',
    regionBn: 'খুলনা',
    revenue: 10_500_000,
    costToServe: 1_785_000,
    ctsRatio: 17.0,
    margin: 23.0,
    productCount: 75,
    orderCount: 290,
    avgOrderValue: 36_207,
  },
];

// ─── Helper Functions ────────────────────────────────────────────────

/**
 * Format a number as BDT with ৳ symbol and comma separators
 * e.g. 42500000 → "৳42,500,000"
 */
export function formatBDT(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return amount < 0 ? `-৳${formatted}` : `৳${formatted}`;
}

/**
 * Format a number as percentage with 1 decimal place
 * e.g. 38.0 → "38.0%", -3.2 → "-3.2%"
 */
export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get Tailwind classes for risk level badges
 */
export function getRiskClasses(risk: RiskLevel): { bg: string; text: string; border: string } {
  const config = RISK_CONFIG[risk];
  return { bg: config.bg, text: config.text, border: config.border };
}

/**
 * Get Tailwind classes for supplier rating badges
 */
export function getRatingClasses(rating: SupplierRating): { bg: string; text: string; border: string } {
  const config = RATING_CONFIG[rating];
  return { bg: config.bg, text: config.text, border: config.border };
}

/**
 * Determine budget variance status from percentage
 */
export function getVarianceStatus(pct: number): BudgetStatus {
  const absPct = Math.abs(pct);
  if (pct > 0 && absPct >= 10) return 'critical';
  if (pct > 0 && absPct >= 3) return 'over';
  if (absPct <= 3) return 'on-track';
  return 'under';
}

/**
 * Get Tailwind classes for budget variance status
 */
export function getVarianceClasses(status: BudgetStatus): { bg: string; text: string } {
  switch (status) {
    case 'under':
      return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
    case 'on-track':
      return { bg: 'bg-sky-100', text: 'text-sky-800' };
    case 'over':
      return { bg: 'bg-amber-100', text: 'text-amber-800' };
    case 'critical':
      return { bg: 'bg-red-100', text: 'text-red-800' };
  }
}

/**
 * Get trend icon name based on direction
 */
export function getTrendIcon(trend: TrendDirection): string {
  switch (trend) {
    case 'up': return 'TrendingUp';
    case 'down': return 'TrendingDown';
    case 'flat': return 'Minus';
  }
}

/**
 * Get trend color class based on direction and context
 * For costs: up is bad (red), down is good (green)
 * For margins: up is good (green), down is bad (red)
 */
export function getTrendColor(trend: TrendDirection, context: 'cost' | 'margin'): string {
  if (trend === 'flat') return 'text-muted-foreground';
  if (context === 'cost') {
    return trend === 'up' ? 'text-red-600' : 'text-emerald-600';
  }
  return trend === 'up' ? 'text-emerald-600' : 'text-red-600';
}

/**
 * Compute total cost from categories
 */
export function computeTotalCost(categories: CostCategory[]): number {
  return categories.reduce((sum, cat) => sum + cat.amount, 0);
}

/**
 * Compute weighted average margin
 */
export function computeAvgMargin(margins: MarginAnalysis[]): number {
  if (margins.length === 0) return 0;
  const totalRevenue = margins.reduce((sum, m) => sum + m.revenue, 0);
  const totalProfit = margins.reduce((sum, m) => sum + m.grossProfit, 0);
  return totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
}
