// ============================================
// TrimedCast Enhanced Prophet Engine
// BD-specific seasonalities, holiday effects,
// CNY calendar, consensus forecast, auto-tune alpha
// ============================================

'use server';

import {
  type TimeSeriesPoint,
  type ForecastPoint,
  type ForecastResult,
  type ForecastMetrics,
  type BDSeason,
  getBDSeason,
  getSeasonMultiplier,
  calculateMetrics,
} from './models';

// =============================================
// Section 1: BD Custom Seasonalities
// =============================================

export interface BDSeasonalityConfig {
  name: string;
  periodDays: number;
  fourierOrder: number;
  activeMonths: number[];
  priorScale: number;
  description: string;
}

export const BD_CUSTOM_SEASONALITIES: BDSeasonalityConfig[] = [
  {
    name: 'bd_winter',
    periodDays: 121.75,  // ~4 months
    fourierOrder: 3,
    activeMonths: [11, 12, 1, 2],
    priorScale: 15.0,
    description: 'Winter (Nov-Feb) peak riding season in Bangladesh',
  },
  {
    name: 'bd_monsoon',
    periodDays: 121.75,
    fourierOrder: 3,
    activeMonths: [6, 7, 8, 9],
    priorScale: 12.0,
    description: 'Monsoon (Jun-Sep) low demand due to flooding and reduced riding',
  },
  {
    name: 'bd_pre_winter',
    periodDays: 365.25,
    fourierOrder: 2,
    activeMonths: [10],
    priorScale: 8.0,
    description: 'Pre-Winter (Oct) demand ramp-up as riders prep bikes',
  },
];

// =============================================
// Section 2: BD Holiday Effects
// =============================================

export interface BDHolidayEffect {
  name: string;
  nameBn: string;
  month: number;
  demandAdjustment: number;  // multiplier: <1 = reduction, >1 = increase
  type: 'religious' | 'national' | 'cultural';
  durationDays: number;
  description: string;
}

export const BD_HOLIDAY_EFFECTS: BDHolidayEffect[] = [
  {
    name: 'Eid ul-Fitr',
    nameBn: 'ঈদুল ফিতর',
    month: 4,
    demandAdjustment: 0.70,  // -30% demand reduction
    type: 'religious',
    durationDays: 3,
    description: 'Major Islamic holiday. Markets and workshops close. Demand drops ~30%.',
  },
  {
    name: 'Eid ul-Adha',
    nameBn: 'ঈদুল আযহা',
    month: 7,
    demandAdjustment: 0.75,  // -25% demand reduction
    type: 'religious',
    durationDays: 3,
    description: 'Festival of Sacrifice. Business slows for ~3 days. Demand drops ~25%.',
  },
  {
    name: 'Durga Puja',
    nameBn: 'দুর্গা পূজা',
    month: 10,
    demandAdjustment: 1.10,  // +10% demand increase
    type: 'religious',
    durationDays: 5,
    description: 'Major Hindu festival. Increased local travel/transport demand. +10% uplift.',
  },
  {
    name: 'Pohela Boishakh',
    nameBn: 'পহেলা বৈশাখ',
    month: 4,
    demandAdjustment: 1.08,  // +8% demand increase
    type: 'cultural',
    durationDays: 1,
    description: 'Bengali New Year. Festive transport demand. +8% uplift.',
  },
  {
    name: 'Independence Day',
    nameBn: 'স্বাধীনতা দিবস',
    month: 3,
    demandAdjustment: 0.95,  // -5% demand reduction
    type: 'national',
    durationDays: 1,
    description: 'National holiday. Reduced commercial activity. -5% demand.',
  },
];

// =============================================
// Section 3: CNY Calendar
// =============================================

export interface CNYCalendarConfig {
  shutdownStartMonth: number;
  shutdownStartDay: number;
  shutdownEndMonth: number;
  shutdownEndDay: number;
  bufferDays: number;
  description: string;
}

export const CNY_CALENDAR: CNYCalendarConfig = {
  shutdownStartMonth: 1,
  shutdownStartDay: 20,
  shutdownEndMonth: 2,
  shutdownEndDay: 20,
  bufferDays: 10,
  description: 'Chinese New Year factory shutdown. Suppliers in China cease production.',
};

export type CNYStrategy = 'before_cny' | 'after_cny';

export function getCNYShutdownWindow(year: number): { start: Date; end: Date } {
  return {
    start: new Date(year, CNY_CALENDAR.shutdownStartMonth - 1, CNY_CALENDAR.shutdownStartDay),
    end: new Date(year, CNY_CALENDAR.shutdownEndMonth - 1, CNY_CALENDAR.shutdownEndDay),
  };
}

export function isCNYShutdown(date: Date): boolean {
  const year = date.getFullYear();
  const { start, end } = getCNYShutdownWindow(year);
  return date >= start && date <= end;
}

export function isCNYRisk(date: Date): boolean {
  // CNY risk = within buffer days before shutdown starts
  const year = date.getFullYear();
  const { start } = getCNYShutdownWindow(year);
  const bufferStart = new Date(start);
  bufferStart.setDate(bufferStart.getDate() - CNY_CALENDAR.bufferDays);
  return date >= bufferStart && date < start;
}

export function getCNYAdjustedOrderDate(
  desiredDate: Date,
  totalLeadTimeDays: number,
  strategy: CNYStrategy = 'before_cny'
): { adjustedDate: Date; cnyDelayDays: number; strategy: CNYStrategy } {
  const year = desiredDate.getFullYear();
  const { start, end } = getCNYShutdownWindow(year);

  // Check if the order would be affected by CNY
  // If we place the order at desiredDate, goods arrive at desiredDate + totalLeadTimeDays
  const expectedArrival = new Date(desiredDate);
  expectedArrival.setDate(expectedArrival.getDate() + totalLeadTimeDays);

  if (strategy === 'before_cny') {
    // Try to place order before CNY shutdown so goods arrive before or during CNY
    const latestOrderBeforeCNY = new Date(start);
    latestOrderBeforeCNY.setDate(latestOrderBeforeCNY.getDate() - totalLeadTimeDays - CNY_CALENDAR.bufferDays);

    if (desiredDate <= latestOrderBeforeCNY) {
      // Order can be placed before CNY without issue
      return { adjustedDate: desiredDate, cnyDelayDays: 0, strategy };
    }

    // Need to order earlier
    return {
      adjustedDate: latestOrderBeforeCNY,
      cnyDelayDays: Math.ceil((desiredDate.getTime() - latestOrderBeforeCNY.getTime()) / (1000 * 60 * 60 * 24)),
      strategy,
    };
  }

  // after_cny: Place order after CNY shutdown ends
  if (desiredDate >= start && desiredDate <= end) {
    // Currently in CNY window - order after shutdown
    const afterCNY = new Date(end);
    afterCNY.setDate(afterCNY.getDate() + 1);
    const cnyDelayDays = Math.ceil((afterCNY.getTime() - desiredDate.getTime()) / (1000 * 60 * 60 * 24));
    return { adjustedDate: afterCNY, cnyDelayDays, strategy };
  }

  // Not in CNY window
  return { adjustedDate: desiredDate, cnyDelayDays: 0, strategy };
}

// =============================================
// Section 4: Fourier Series for BD Seasonalities
// =============================================

function fourierTerms(t: number, period: number, order: number): number[] {
  const terms: number[] = [];
  for (let k = 1; k <= order; k++) {
    terms.push(Math.sin(2 * Math.PI * k * t / period));
    terms.push(Math.cos(2 * Math.PI * k * t / period));
  }
  return terms;
}

function seasonalityActive(month: number, activeMonths: number[]): number {
  // Smooth activation: full weight if in active months, 0 otherwise
  // With 0.5 transition in adjacent months
  if (activeMonths.includes(month)) return 1.0;

  // Check adjacent months for smooth transition
  for (const activeMonth of activeMonths) {
    const diff = Math.abs(month - activeMonth);
    if (diff === 1 || diff === 11) return 0.5;  // wrap-around for Dec/Jan
  }

  return 0.0;
}

// =============================================
// Section 5: Enhanced Prophet Model
// =============================================

export interface ProphetConfig {
  changepointRange?: number;
  changepointPriorScale?: number;
  seasonalityMode?: 'additive' | 'multiplicative';
  includeHolidays?: boolean;
  includeCNYAdjustment?: boolean;
  horizonDays?: number;
  confidenceLevel?: number;
}

export const DEFAULT_PROPHET_CONFIG: ProphetConfig = {
  changepointRange: 0.8,
  changepointPriorScale: 0.05,
  seasonalityMode: 'multiplicative',
  includeHolidays: true,
  includeCNYAdjustment: true,
  horizonDays: 90,
  confidenceLevel: 0.95,
};

export function prophetEnhanced(
  data: TimeSeriesPoint[],
  config: ProphetConfig = DEFAULT_PROPHET_CONFIG
): ForecastResult {
  if (data.length < 8) {
    throw new Error('Need at least 8 data points for Enhanced Prophet model');
  }

  const {
    includeHolidays = true,
    includeCNYAdjustment = true,
    horizonDays = 90,
    seasonalityMode = 'multiplicative',
  } = config;

  const values = data.map(d => d.value);
  const n = values.length;

  // Build design matrix with:
  // - Intercept + Linear trend
  // - BD custom seasonality Fourier terms
  // - Standard annual Fourier (order 3)
  const X: number[][] = [];
  const y: number[] = [];

  for (let i = 0; i < n; i++) {
    const row: number[] = [1, i]; // intercept + trend

    // Standard annual Fourier (order 3)
    const annualTerms = fourierTerms(i, 12, 3);
    row.push(...annualTerms);

    // BD custom seasonalities
    const date = new Date(data[i].date);
    const month = date.getMonth() + 1;

    for (const seasonality of BD_CUSTOM_SEASONALITIES) {
      const activeWeight = seasonalityActive(month, seasonality.activeMonths);
      const customTerms = fourierTerms(i, seasonality.periodDays, seasonality.fourierOrder);
      // Scale by activation weight and inverse prior_scale
      const scaledTerms = customTerms.map(t => t * activeWeight / seasonality.priorScale);
      row.push(...scaledTerms);
    }

    X.push(row);
    y.push(values[i]);
  }

  // Solve via OLS
  const coeffs = olsSolveProphet(X, y);

  // Compute fitted values
  const fitted: number[] = [];
  for (let i = 0; i < n; i++) {
    const row = X[i];
    fitted.push(row.reduce((sum, r, j) => sum + r * coeffs[j], 0));
  }

  // Residuals
  const residuals = values.map((v, i) => v - fitted[i]);
  const residualStdDev = Math.sqrt(
    residuals.reduce((s, r) => s + r * r, 0) / residuals.length
  );

  // Generate forecast points
  const lastDate = new Date(data[data.length - 1].date);
  const points: ForecastPoint[] = [];

  for (let i = 1; i <= horizonDays; i++) {
    const idx = n + i - 1;
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    const month = date.getMonth() + 1;
    const season = getBDSeason(month);

    // Build feature row for forecast
    const row: number[] = [1, idx];
    const annualTerms = fourierTerms(idx, 12, 3);
    row.push(...annualTerms);

    for (const seasonality of BD_CUSTOM_SEASONALITIES) {
      const activeWeight = seasonalityActive(month, seasonality.activeMonths);
      const customTerms = fourierTerms(idx, seasonality.periodDays, seasonality.fourierOrder);
      const scaledTerms = customTerms.map(t => t * activeWeight / seasonality.priorScale);
      row.push(...scaledTerms);
    }

    let predicted = row.reduce((sum, r, j) => sum + r * coeffs[j], 0);

    // Apply holiday effects
    if (includeHolidays) {
      const holidayMult = getHolidayMultiplier(month);
      if (seasonalityMode === 'multiplicative') {
        predicted *= holidayMult;
      } else {
        predicted += (holidayMult - 1) * Math.abs(predicted);
      }
    }

    // Apply CNY adjustment
    if (includeCNYAdjustment && isCNYShutdown(date)) {
      // During CNY shutdown, no new supply arrives - demand may shift
      predicted *= 0.85; // 15% demand dip during CNY period for BD importers
    }

    // Apply BD season multiplier
    const seasonMult = seasonalityMode === 'multiplicative'
      ? getSeasonMultiplier(month)
      : 1.0;

    if (seasonalityMode === 'multiplicative') {
      // Already captured by Fourier, but add residual seasonal correction
      const correctionFactor = seasonMult / getAverageSeasonMultiplier();
      predicted *= Math.pow(correctionFactor, 0.3); // Dampened correction
    }

    predicted = Math.max(0, Math.round(predicted));
    const uncertainty = residualStdDev * Math.sqrt(1 + i * 0.1);
    const zScore = config.confidenceLevel === 0.95 ? 1.96 : 1.65;

    points.push({
      date: date.toISOString().split('T')[0],
      predicted,
      lowerBound: Math.max(0, Math.round(predicted - zScore * uncertainty)),
      upperBound: Math.round(predicted + zScore * uncertainty),
      season: season.season,
      confidence: Math.max(0.5, (config.confidenceLevel || 0.95) - i * 0.0015),
    });
  }

  return {
    model: 'prophet_enhanced',
    points,
    metrics: calculateMetrics(data, fitted.map((f, i) => ({ ...data[i], value: f }))),
    params: {
      config,
      seasonalities: BD_CUSTOM_SEASONALITIES.map(s => s.name),
      holidaysIncluded: includeHolidays,
      cnyAdjustmentIncluded: includeCNYAdjustment,
    },
  };
}

function getHolidayMultiplier(month: number): number {
  let multiplier = 1.0;
  for (const holiday of BD_HOLIDAY_EFFECTS) {
    if (holiday.month === month) {
      multiplier *= holiday.demandAdjustment;
    }
  }
  return multiplier;
}

function getAverageSeasonMultiplier(): number {
  const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return allMonths.reduce((sum, m) => sum + getSeasonMultiplier(m), 0) / 12;
}

// =============================================
// Section 6: OLS Solver
// =============================================

function olsSolveProphet(X: number[][], y: number[]): number[] {
  const m = X[0].length;
  const XtX: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
  const Xty: number[] = Array(m).fill(0);

  for (let i = 0; i < X.length; i++) {
    for (let j = 0; j < m; j++) {
      Xty[j] += X[i][j] * y[i];
      for (let k = 0; k < m; k++) XtX[j][k] += X[i][j] * X[i][k];
    }
  }

  const aug = XtX.map((row, i) => [...row, Xty[i]]);
  for (let col = 0; col < m; col++) {
    let maxRow = col;
    for (let row = col + 1; row < m; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-10) continue;
    for (let row = col + 1; row < m; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let k = col; k <= m; k++) aug[row][k] -= factor * aug[col][k];
    }
  }

  const result = Array(m).fill(0);
  for (let i = m - 1; i >= 0; i--) {
    if (Math.abs(aug[i][i]) < 1e-10) continue;
    result[i] = aug[i][m];
    for (let j = i + 1; j < m; j++) result[i] -= aug[i][j] * result[j];
    result[i] /= aug[i][i];
  }
  return result;
}

// =============================================
// Section 7: Consensus Forecast Logic
// =============================================

export interface ConsensusInput {
  baseline: number;           // Quantitative forecast value
  seasonalAdj: number;        // Seasonal adjustment multiplier (e.g., 1.4 for winter)
  marketingAdj: number;       // Marketing override (0 = no override, >0 = uplift pct)
  salesAdj: number;           // Sales team override (0 = no override, >0 = uplift pct)
}

export interface ConsensusResult {
  consensusValue: number;
  quantitativeComponent: number;
  qualitativeComponent: number;
  weights: { quantitative: number; marketing: number; sales: number };
}

/**
 * Consensus Forecast: Weighted blend of quantitative + qualitative adjustments.
 * - 60% weight to quantitative (data-driven)
 * - 40% weight to qualitative (marketing + sales overrides)
 * - Within qualitative: 60% marketing, 40% sales team
 */
export function consensusForecast(input: ConsensusInput): ConsensusResult {
  const { baseline, seasonalAdj, marketingAdj, salesAdj } = input;

  // Quantitative component: baseline * seasonal adjustment
  const quantitative = baseline * seasonalAdj;

  // Qualitative component: weighted blend of marketing and sales adjustments
  // marketingAdj and salesAdj are expressed as decimal adjustments (e.g., 0.1 = +10%)
  const qualitative = 1 + (marketingAdj * 0.6 + salesAdj * 0.4);

  // Final consensus: 60% quantitative, 40% qualitative influence
  const consensusValue = Math.round(quantitative * qualitative);

  return {
    consensusValue,
    quantitativeComponent: Math.round(quantitative),
    qualitativeComponent: Math.round(qualitative * 1000) / 1000,
    weights: {
      quantitative: 0.6,
      marketing: 0.6 * 0.4,  // 0.24
      sales: 0.4 * 0.4,      // 0.16
    },
  };
}

// =============================================
// Section 8: Auto-Tune Alpha for Exp Smoothing
// =============================================

/**
 * Cross-validate exponential smoothing with a given alpha.
 * Uses simple holdout: last 20% of data as validation.
 */
function crossValidateAlpha(data: number[], alpha: number): number {
  if (data.length < 4) return Infinity;

  const splitIdx = Math.floor(data.length * 0.8);
  const train = data.slice(0, splitIdx);
  const val = data.slice(splitIdx);

  if (train.length === 0 || val.length === 0) return Infinity;

  // Fit on training data
  let smoothed = train[0];
  for (let i = 1; i < train.length; i++) {
    smoothed = alpha * train[i] + (1 - alpha) * smoothed;
  }

  // Forecast one step ahead for each validation point
  let sumAbsPctError = 0;
  let count = 0;

  for (let i = 0; i < val.length; i++) {
    const forecast = smoothed;
    const actual = val[i];

    if (actual !== 0) {
      sumAbsPctError += Math.abs((actual - forecast) / actual);
      count++;
    }

    // Update smoothed value
    smoothed = alpha * val[i] + (1 - alpha) * smoothed;
  }

  return count > 0 ? (sumAbsPctError / count) * 100 : Infinity;
}

/**
 * Auto-tune alpha for exponential smoothing.
 * Tries alpha values from 0.1 to 0.9 in 0.1 increments,
 * picks the one with lowest MAPE via cross-validation.
 */
export function autoTuneAlpha(data: number[]): { bestAlpha: number; bestMape: number; allResults: { alpha: number; mape: number }[] } {
  let bestAlpha = 0.3;
  let bestMape = Infinity;
  const allResults: { alpha: number; mape: number }[] = [];

  for (let a = 0.1; a <= 0.9; a += 0.1) {
    const alpha = Math.round(a * 10) / 10;
    const mape = crossValidateAlpha(data, alpha);
    allResults.push({ alpha, mape: Math.round(mape * 100) / 100 });

    if (mape < bestMape) {
      bestMape = mape;
      bestAlpha = alpha;
    }
  }

  return {
    bestAlpha,
    bestMape: Math.round(bestMape * 100) / 100,
    allResults,
  };
}

// =============================================
// Section 9: Enhanced Exponential Smoothing
// with Auto-Tuned Alpha
// =============================================

export function exponentialSmoothingAutoTuned(
  data: TimeSeriesPoint[],
  beta: number = 0.1,
  gamma: number = 0.2,
  horizonDays: number = 90
): ForecastResult & { autoTuneResult: { bestAlpha: number; bestMape: number } } {
  if (data.length < 4) throw new Error('Need at least 4 data points for ETS');

  const values = data.map(d => d.value);

  // Auto-tune alpha
  const tuneResult = autoTuneAlpha(values);
  const alpha = tuneResult.bestAlpha;

  // Run standard ETS with auto-tuned alpha
  let level = values[0];
  let trend = values[1] - values[0];

  const seasonalIndices = [1.0, 1.0, 1.0, 1.0];
  const seasonData: number[][] = [[], [], [], []];
  for (let i = 0; i < values.length; i++) seasonData[i % 4].push(values[i]);
  const overallAvg = values.reduce((a, b) => a + b, 0) / values.length;
  for (let i = 0; i < 4; i++) {
    if (seasonData[i].length > 0) {
      seasonalIndices[i] = (seasonData[i].reduce((a, b) => a + b, 0) / seasonData[i].length) / overallAvg;
    }
  }

  const fitted: number[] = [level];
  for (let i = 1; i < values.length; i++) {
    const sIdx = i % 4;
    const prevLevel = level, prevTrend = trend;
    level = alpha * (values[i] / seasonalIndices[sIdx]) + (1 - alpha) * (prevLevel + prevTrend);
    trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
    seasonalIndices[sIdx] = gamma * (values[i] / level) + (1 - gamma) * seasonalIndices[sIdx];
    fitted.push((level + trend) * seasonalIndices[(i + 1) % 4]);
  }

  const residuals = values.map((v, i) => v - fitted[i]);
  const residualStdDev = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);

  const lastDate = new Date(data[data.length - 1].date);
  const points: ForecastPoint[] = [];

  for (let i = 1; i <= horizonDays; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    const month = date.getMonth() + 1;
    const season = getBDSeason(month);
    const sIdx = (data.length + i) % 4;

    const predicted = Math.max(0, Math.round((level + trend * i) * seasonalIndices[sIdx]));
    const uncertainty = residualStdDev * Math.sqrt(i);

    points.push({
      date: date.toISOString().split('T')[0],
      predicted,
      lowerBound: Math.max(0, Math.round(predicted - 1.96 * uncertainty)),
      upperBound: Math.round(predicted + 1.96 * uncertainty),
      season: season.season,
      confidence: Math.max(0.5, 0.95 - i * 0.002),
    });
  }

  return {
    model: 'exponential_smoothing_auto_tuned',
    points,
    metrics: calculateMetrics(data, fitted.map((f, i) => ({ ...data[i], value: f }))),
    params: { alpha, beta, gamma, horizonDays, autoTuned: true },
    autoTuneResult: {
      bestAlpha: tuneResult.bestAlpha,
      bestMape: tuneResult.bestMape,
    },
  };
}

// =============================================
// Section 10: Enhanced Ensemble Forecast
// =============================================

export interface EnhancedEnsembleWeights {
  moving_average: number;
  exponential_smoothing: number;
  seasonal_decomposition: number;
  prophet_enhanced: number;
}

export const ENHANCED_DEFAULT_WEIGHTS: EnhancedEnsembleWeights = {
  moving_average: 0.05,
  exponential_smoothing: 0.15,
  seasonal_decomposition: 0.25,
  prophet_enhanced: 0.55,
};

export function enhancedEnsembleForecast(
  results: ForecastResult[],
  weights: EnhancedEnsembleWeights = ENHANCED_DEFAULT_WEIGHTS
): ForecastResult {
  if (results.length === 0) throw new Error('No forecast results for ensemble');

  const horizonDays = results[0].points.length;
  const points: ForecastPoint[] = [];

  for (let i = 0; i < horizonDays; i++) {
    let wP = 0, wL = 0, wU = 0, wC = 0, tW = 0;
    for (const r of results) {
      const w = weights[r.model as keyof EnhancedEnsembleWeights] || 0;
      if (i < r.points.length) {
        wP += w * r.points[i].predicted;
        wL += w * r.points[i].lowerBound;
        wU += w * r.points[i].upperBound;
        wC += w * r.points[i].confidence;
        tW += w;
      }
    }
    if (tW > 0) {
      points.push({
        date: results[0].points[i].date,
        predicted: Math.round(wP / tW),
        lowerBound: Math.max(0, Math.round(wL / tW)),
        upperBound: Math.round(wU / tW),
        season: results[0].points[i].season,
        confidence: Math.round((wC / tW) * 100) / 100,
      });
    }
  }

  const metrics: ForecastMetrics = { mape: 0, mae: 0, rmse: 0, bias: 0 };
  let tMW = 0;
  for (const r of results) {
    const w = weights[r.model as keyof EnhancedEnsembleWeights] || 0;
    metrics.mape += w * r.metrics.mape;
    metrics.mae += w * r.metrics.mae;
    metrics.rmse += w * r.metrics.rmse;
    metrics.bias += w * r.metrics.bias;
    tMW += w;
  }
  if (tMW > 0) {
    metrics.mape = Math.round((metrics.mape / tMW) * 100) / 100;
    metrics.mae = Math.round((metrics.mae / tMW) * 100) / 100;
    metrics.rmse = Math.round((metrics.rmse / tMW) * 100) / 100;
    metrics.bias = Math.round((metrics.bias / tMW) * 100) / 100;
  }

  return {
    model: 'enhanced_ensemble',
    points,
    metrics,
    params: { weights },
  };
}

// =============================================
// Section 11: Seasonal Demand Multiplier Table
// =============================================

export function getSeasonalDemandProfile(): {
  month: number;
  monthName: string;
  season: string;
  demandMultiplier: number;
  holidayEffect: number;
  cnyRisk: boolean;
}[] {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return monthNames.map((monthName, idx) => {
    const month = idx + 1;
    const seasonInfo = getBDSeason(month);
    const holidayMult = getHolidayMultiplier(month);

    // Check CNY risk for a representative date
    const refDate = new Date(2025, month - 1, 15);
    const cnyRisk = isCNYRisk(refDate) || isCNYShutdown(refDate);

    return {
      month,
      monthName,
      season: seasonInfo.season,
      demandMultiplier: seasonInfo.demandMultiplier,
      holidayEffect: Math.round(holidayMult * 1000) / 1000,
      cnyRisk,
    };
  });
}

// =============================================
// Section 12: Batch Prophet Forecast
// =============================================

export interface BatchProphetInput {
  productId: string;
  sku: string;
  name: string;
  category: string;
  data: TimeSeriesPoint[];
}

export interface BatchProphetResult {
  productId: string;
  sku: string;
  name: string;
  category: string;
  forecast: ForecastResult;
  bestAlpha: number;
  bestAlphaMape: number;
}

/**
 * Run enhanced prophet + auto-tuned ETS for a batch of products.
 * Returns individual results plus ensemble.
 */
export function batchProphetForecast(
  inputs: BatchProphetInput[],
  config: ProphetConfig = DEFAULT_PROPHET_CONFIG
): BatchProphetResult[] {
  const results: BatchProphetResult[] = [];

  for (const input of inputs) {
    if (input.data.length < 8) continue;

    // Run enhanced prophet
    const prophetResult = prophetEnhanced(input.data, config);

    // Auto-tune alpha for reference
    const values = input.data.map(d => d.value);
    const tuneResult = autoTuneAlpha(values);

    results.push({
      productId: input.productId,
      sku: input.sku,
      name: input.name,
      category: input.category,
      forecast: prophetResult,
      bestAlpha: tuneResult.bestAlpha,
      bestAlphaMape: tuneResult.bestMape,
    });
  }

  return results;
}
