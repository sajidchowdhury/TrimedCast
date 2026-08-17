// ============================================
// TrimedCast — Forecast Results Dashboard Types
// Session 21: Demand Forecasting Results
// ============================================

export interface ForecastResult {
  id: string;
  product: { sku_code: string; name: string };
  season: string | null;
  forecast_method: string;
  baseline_demand: number;
  seasonal_adjusted_demand: number;
  consensus_demand: number;
  lower_bound: number | null;
  upper_bound: number | null;
  mape: number | null;
  confidence: number | null;
  is_recalibrated: boolean;
  cny_risk_flag: boolean;
  forecast_date: string;
  created_at: string;
}

export interface ForecastTimePoint {
  date: string;
  actual: number | null;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
}

export interface DecompositionData {
  date: string;
  observed: number;
  trend: number;
  seasonal: number;
  residual: number;
}

export interface ModelComparison {
  method: string;
  mape: number;
  rmse: number;
  mae: number;
  accuracy: number;
  predicted_qty: number;
}

// Forecast method configs
export const FORECAST_METHODS = [
  { value: 'prophet', label: 'Prophet', labelBn: 'প্রফেট', color: '#6366f1' },
  { value: 'arima', label: 'ARIMA', labelBn: 'এআরআইএমএ', color: '#f59e0b' },
  { value: 'ets', label: 'ETS', labelBn: 'ইটিএস', color: '#10b981' },
  { value: 'ensemble', label: 'Ensemble', labelBn: 'এনসেম্বল', color: '#8b5cf6' },
  { value: 'consensus', label: 'Consensus', labelBn: 'ঐকমত্য', color: '#ec4899' },
  { value: 'naive', label: 'Naive', labelBn: 'সরল', color: '#64748b' },
] as const;

export const ACCURACY_RATING = {
  excellent: { min: 0, max: 10, label: 'Excellent', labelBn: 'চমৎকার', color: 'emerald' },
  good: { min: 10, max: 20, label: 'Good', labelBn: 'ভালো', color: 'sky' },
  fair: { min: 20, max: 30, label: 'Fair', labelBn: 'মধ্যম', color: 'amber' },
  poor: { min: 30, max: 100, label: 'Poor', labelBn: 'দুর্বল', color: 'red' },
} as const;

export function getAccuracyRating(mape: number | null): { label: string; labelBn: string; color: string } {
  if (mape === null) return { label: 'N/A', labelBn: 'N/A', color: 'slate' };
  for (const rating of Object.values(ACCURACY_RATING)) {
    if (mape >= rating.min && mape < rating.max) {
      return { label: rating.label, labelBn: rating.labelBn, color: rating.color };
    }
  }
  return { label: 'Poor', labelBn: 'দুর্বল', color: 'red' };
}

export function getMethodConfig(method: string) {
  return FORECAST_METHODS.find((m) => m.value === method) ?? { value: method, label: method, labelBn: method, color: '#64748b' };
}

// Bangladesh seasons
export const BD_SEASONS = [
  { value: 'winter', label: 'Winter', labelBn: 'শীত', icon: '❄️', months: 'Nov–Feb', bgClass: 'bg-sky-50 dark:bg-sky-950/30', textClass: 'text-sky-700 dark:text-sky-300', borderClass: 'border-sky-200 dark:border-sky-800' },
  { value: 'summer', label: 'Summer', labelBn: 'গ্রীষ্ম', icon: '☀️', months: 'Mar–May', bgClass: 'bg-amber-50 dark:bg-amber-950/30', textClass: 'text-amber-700 dark:text-amber-300', borderClass: 'border-amber-200 dark:border-amber-800' },
  { value: 'monsoon', label: 'Monsoon', labelBn: 'বর্ষা', icon: '🌧️', months: 'Jun–Sep', bgClass: 'bg-teal-50 dark:bg-teal-950/30', textClass: 'text-teal-700 dark:text-teal-300', borderClass: 'border-teal-200 dark:border-teal-800' },
  { value: 'pre-winter', label: 'Pre-Winter', labelBn: 'হেমন্ত', icon: '🍂', months: 'Oct–Nov', bgClass: 'bg-orange-50 dark:bg-orange-950/30', textClass: 'text-orange-700 dark:text-orange-300', borderClass: 'border-orange-200 dark:border-orange-800' },
] as const;

// ============================================
// Mock Data
// ============================================

export const MOCK_FORECASTS: ForecastResult[] = [
  {
    id: 'fc-001',
    product: { sku_code: 'EP-HON-001', name: 'Honda Piston Ring Set' },
    season: 'winter',
    forecast_method: 'ensemble',
    baseline_demand: 450,
    seasonal_adjusted_demand: 520,
    consensus_demand: 510,
    lower_bound: 420,
    upper_bound: 600,
    mape: 8.2,
    confidence: 0.95,
    is_recalibrated: false,
    cny_risk_flag: false,
    forecast_date: '2025-08-01',
    created_at: '2025-08-17T10:30:00Z',
  },
  {
    id: 'fc-002',
    product: { sku_code: 'EP-YAM-002', name: 'Yamaha Clutch Plate Assembly' },
    season: 'monsoon',
    forecast_method: 'prophet',
    baseline_demand: 320,
    seasonal_adjusted_demand: 380,
    consensus_demand: 370,
    lower_bound: 300,
    upper_bound: 440,
    mape: 5.2,
    confidence: 0.97,
    is_recalibrated: false,
    cny_risk_flag: false,
    forecast_date: '2025-08-01',
    created_at: '2025-08-17T10:30:00Z',
  },
  {
    id: 'fc-003',
    product: { sku_code: 'EP-BAJ-003', name: 'Bajaj Spark Plug OEM' },
    season: 'summer',
    forecast_method: 'arima',
    baseline_demand: 680,
    seasonal_adjusted_demand: 720,
    consensus_demand: 710,
    lower_bound: 620,
    upper_bound: 800,
    mape: 12.5,
    confidence: 0.90,
    is_recalibrated: false,
    cny_risk_flag: true,
    forecast_date: '2025-07-15',
    created_at: '2025-08-16T14:20:00Z',
  },
  {
    id: 'fc-004',
    product: { sku_code: 'EP-HON-004', name: 'Honda CD70 Brake Shoe' },
    season: 'winter',
    forecast_method: 'ets',
    baseline_demand: 550,
    seasonal_adjusted_demand: 620,
    consensus_demand: 600,
    lower_bound: 500,
    upper_bound: 700,
    mape: 15.1,
    confidence: 0.88,
    is_recalibrated: true,
    cny_risk_flag: false,
    forecast_date: '2025-07-01',
    created_at: '2025-08-15T09:15:00Z',
  },
  {
    id: 'fc-005',
    product: { sku_code: 'EP-TVS-005', name: 'TVS Apache Filter Kit' },
    season: 'monsoon',
    forecast_method: 'ensemble',
    baseline_demand: 280,
    seasonal_adjusted_demand: 350,
    consensus_demand: 340,
    lower_bound: 260,
    upper_bound: 420,
    mape: 7.3,
    confidence: 0.96,
    is_recalibrated: false,
    cny_risk_flag: false,
    forecast_date: '2025-08-01',
    created_at: '2025-08-17T10:30:00Z',
  },
  {
    id: 'fc-006',
    product: { sku_code: 'EP-SUZ-006', name: 'Suzuki GS150 Chain Sprocket' },
    season: 'pre-winter',
    forecast_method: 'consensus',
    baseline_demand: 190,
    seasonal_adjusted_demand: 230,
    consensus_demand: 225,
    lower_bound: 170,
    upper_bound: 280,
    mape: 22.4,
    confidence: 0.82,
    is_recalibrated: true,
    cny_risk_flag: true,
    forecast_date: '2025-06-01',
    created_at: '2025-08-14T16:45:00Z',
  },
  {
    id: 'fc-007',
    product: { sku_code: 'EP-HON-007', name: 'Honda Dio Valve Set' },
    season: 'summer',
    forecast_method: 'prophet',
    baseline_demand: 410,
    seasonal_adjusted_demand: 460,
    consensus_demand: 450,
    lower_bound: 380,
    upper_bound: 520,
    mape: 9.8,
    confidence: 0.93,
    is_recalibrated: false,
    cny_risk_flag: false,
    forecast_date: '2025-08-01',
    created_at: '2025-08-17T10:30:00Z',
  },
  {
    id: 'fc-008',
    product: { sku_code: 'EP-BAJ-008', name: 'Bajaj Pulsar Gasket Kit' },
    season: 'winter',
    forecast_method: 'arima',
    baseline_demand: 340,
    seasonal_adjusted_demand: 390,
    consensus_demand: 385,
    lower_bound: 310,
    upper_bound: 460,
    mape: 28.1,
    confidence: 0.75,
    is_recalibrated: true,
    cny_risk_flag: true,
    forecast_date: '2025-05-01',
    created_at: '2025-08-13T11:00:00Z',
  },
  {
    id: 'fc-009',
    product: { sku_code: 'EP-YAM-009', name: 'Yamaha FZ Carburetor Assembly' },
    season: 'monsoon',
    forecast_method: 'ets',
    baseline_demand: 150,
    seasonal_adjusted_demand: 180,
    consensus_demand: 175,
    lower_bound: 130,
    upper_bound: 220,
    mape: 18.6,
    confidence: 0.85,
    is_recalibrated: false,
    cny_risk_flag: false,
    forecast_date: '2025-07-01',
    created_at: '2025-08-15T09:15:00Z',
  },
  {
    id: 'fc-010',
    product: { sku_code: 'EP-TVS-010', name: 'TVS Jupiter Bearing Kit' },
    season: 'pre-winter',
    forecast_method: 'ensemble',
    baseline_demand: 240,
    seasonal_adjusted_demand: 290,
    consensus_demand: 280,
    lower_bound: 210,
    upper_bound: 350,
    mape: 6.5,
    confidence: 0.94,
    is_recalibrated: false,
    cny_risk_flag: false,
    forecast_date: '2025-08-01',
    created_at: '2025-08-17T10:30:00Z',
  },
];

// 24 monthly time series points (Jan 2024 – Dec 2025)
// First 18 months have actuals, last 6 are future (null actual)
export const MOCK_TIME_SERIES: ForecastTimePoint[] = [
  { date: '2024-01', actual: 310, predicted: 320, lower_bound: 280, upper_bound: 360 },
  { date: '2024-02', actual: 290, predicted: 300, lower_bound: 260, upper_bound: 340 },
  { date: '2024-03', actual: 340, predicted: 330, lower_bound: 290, upper_bound: 370 },
  { date: '2024-04', actual: 380, predicted: 370, lower_bound: 330, upper_bound: 410 },
  { date: '2024-05', actual: 420, predicted: 410, lower_bound: 370, upper_bound: 450 },
  { date: '2024-06', actual: 450, predicted: 440, lower_bound: 400, upper_bound: 480 },
  { date: '2024-07', actual: 470, predicted: 480, lower_bound: 440, upper_bound: 520 },
  { date: '2024-08', actual: 500, predicted: 490, lower_bound: 450, upper_bound: 530 },
  { date: '2024-09', actual: 460, predicted: 470, lower_bound: 430, upper_bound: 510 },
  { date: '2024-10', actual: 400, predicted: 390, lower_bound: 350, upper_bound: 430 },
  { date: '2024-11', actual: 360, predicted: 350, lower_bound: 310, upper_bound: 390 },
  { date: '2024-12', actual: 330, predicted: 340, lower_bound: 300, upper_bound: 380 },
  { date: '2025-01', actual: 320, predicted: 330, lower_bound: 290, upper_bound: 370 },
  { date: '2025-02', actual: 300, predicted: 310, lower_bound: 270, upper_bound: 350 },
  { date: '2025-03', actual: 350, predicted: 360, lower_bound: 320, upper_bound: 400 },
  { date: '2025-04', actual: 400, predicted: 390, lower_bound: 350, upper_bound: 430 },
  { date: '2025-05', actual: 430, predicted: 440, lower_bound: 400, upper_bound: 480 },
  { date: '2025-06', actual: 480, predicted: 470, lower_bound: 430, upper_bound: 510 },
  // Future months (no actuals)
  { date: '2025-07', actual: null, predicted: 500, lower_bound: 460, upper_bound: 540 },
  { date: '2025-08', actual: null, predicted: 510, lower_bound: 470, upper_bound: 550 },
  { date: '2025-09', actual: null, predicted: 480, lower_bound: 440, upper_bound: 520 },
  { date: '2025-10', actual: null, predicted: 420, lower_bound: 380, upper_bound: 460 },
  { date: '2025-11', actual: null, predicted: 370, lower_bound: 330, upper_bound: 410 },
  { date: '2025-12', actual: null, predicted: 340, lower_bound: 300, upper_bound: 380 },
];

// 24 monthly decomposition points
export const MOCK_DECOMPOSITION: DecompositionData[] = [
  { date: '2024-01', observed: 310, trend: 340, seasonal: -30, residual: 0 },
  { date: '2024-02', observed: 290, trend: 335, seasonal: -45, residual: 0 },
  { date: '2024-03', observed: 340, trend: 338, seasonal: -5, residual: 7 },
  { date: '2024-04', observed: 380, trend: 345, seasonal: 25, residual: 10 },
  { date: '2024-05', observed: 420, trend: 355, seasonal: 55, residual: 10 },
  { date: '2024-06', observed: 450, trend: 365, seasonal: 75, residual: 10 },
  { date: '2024-07', observed: 470, trend: 375, seasonal: 85, residual: 10 },
  { date: '2024-08', observed: 500, trend: 385, seasonal: 100, residual: 15 },
  { date: '2024-09', observed: 460, trend: 393, seasonal: 60, residual: 7 },
  { date: '2024-10', observed: 400, trend: 398, seasonal: -5, residual: 7 },
  { date: '2024-11', observed: 360, trend: 402, seasonal: -50, residual: 8 },
  { date: '2024-12', observed: 330, trend: 405, seasonal: -80, residual: 5 },
  { date: '2025-01', observed: 320, trend: 408, seasonal: -95, residual: 7 },
  { date: '2025-02', observed: 300, trend: 410, seasonal: -120, residual: 10 },
  { date: '2025-03', observed: 350, trend: 415, seasonal: -75, residual: 10 },
  { date: '2025-04', observed: 400, trend: 420, seasonal: -30, residual: 10 },
  { date: '2025-05', observed: 430, trend: 428, seasonal: -8, residual: 10 },
  { date: '2025-06', observed: 480, trend: 435, seasonal: 35, residual: 10 },
  { date: '2025-07', observed: 500, trend: 443, seasonal: 50, residual: 7 },
  { date: '2025-08', observed: 510, trend: 450, seasonal: 55, residual: 5 },
  { date: '2025-09', observed: 480, trend: 455, seasonal: 20, residual: 5 },
  { date: '2025-10', observed: 420, trend: 458, seasonal: -45, residual: 7 },
  { date: '2025-11', observed: 370, trend: 460, seasonal: -95, residual: 5 },
  { date: '2025-12', observed: 340, trend: 462, seasonal: -130, residual: 8 },
];

// 5 model comparisons
export const MOCK_MODEL_COMPARISON: ModelComparison[] = [
  { method: 'prophet', mape: 8.2, rmse: 28.5, mae: 22.1, accuracy: 91.8, predicted_qty: 490 },
  { method: 'arima', mape: 12.5, rmse: 42.3, mae: 33.7, accuracy: 87.5, predicted_qty: 510 },
  { method: 'ets', mape: 15.1, rmse: 51.2, mae: 40.8, accuracy: 84.9, predicted_qty: 475 },
  { method: 'ensemble', mape: 7.3, rmse: 24.1, mae: 18.5, accuracy: 92.7, predicted_qty: 505 },
  { method: 'naive', mape: 22.8, rmse: 75.6, mae: 61.4, accuracy: 77.2, predicted_qty: 520 },
];
