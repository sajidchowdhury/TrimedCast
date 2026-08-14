// ============================================
// TrimedCast Advanced Forecasting Models
// Session 7: Prophet + Seasonal Enhancements
// ============================================

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

// ============================================
// 1. OLS Solver (exported for reuse)
// ============================================

export function olsSolve(X: number[][], y: number[]): number[] {
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
    for (let row = col + 1; row < m; row++) if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
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

// ============================================
// 2. BD Holiday Calendar with Exact Dates
// ============================================

export interface BDHolidayExact {
  name: string;
  nameBn: string;
  type: 'religious' | 'national' | 'cultural';
  dates: Record<number, { start: string; end: string }>; // year -> {start, end} ISO date strings
  demandEffect: number; // -0.3 to +0.15 (negative = demand drop, positive = demand uplift)
}

export const BD_HOLIDAY_CALENDAR: BDHolidayExact[] = [
  {
    name: 'Eid ul-Fitr',
    nameBn: 'ঈদুল ফিতর',
    type: 'religious',
    dates: {
      2024: { start: '2024-04-10', end: '2024-04-12' },
      2025: { start: '2025-03-30', end: '2025-04-01' },
      2026: { start: '2026-03-20', end: '2026-03-22' },
      2027: { start: '2027-03-09', end: '2027-03-11' },
    },
    demandEffect: 0.15,
  },
  {
    name: 'Eid ul-Adha',
    nameBn: 'ঈদুল আযহা',
    type: 'religious',
    dates: {
      2024: { start: '2024-06-17', end: '2024-06-19' },
      2025: { start: '2025-06-06', end: '2025-06-08' },
      2026: { start: '2026-05-26', end: '2026-05-28' },
      2027: { start: '2027-05-16', end: '2027-05-18' },
    },
    demandEffect: 0.10,
  },
  {
    name: 'Durga Puja',
    nameBn: 'দুর্গা পূজা',
    type: 'religious',
    dates: {
      2024: { start: '2024-10-10', end: '2024-10-13' },
      2025: { start: '2025-09-29', end: '2025-10-02' },
      2026: { start: '2026-09-18', end: '2026-09-21' },
      2027: { start: '2027-10-07', end: '2027-10-10' },
    },
    demandEffect: 0.08,
  },
  {
    name: 'Independence Day',
    nameBn: 'স্বাধীনতা দিবস',
    type: 'national',
    dates: {
      2024: { start: '2024-03-26', end: '2024-03-26' },
      2025: { start: '2025-03-26', end: '2025-03-26' },
      2026: { start: '2026-03-26', end: '2026-03-26' },
      2027: { start: '2027-03-26', end: '2027-03-26' },
    },
    demandEffect: -0.05,
  },
  {
    name: 'Pohela Boishakh',
    nameBn: 'পহেলা বৈশাখ',
    type: 'cultural',
    dates: {
      2024: { start: '2024-04-14', end: '2024-04-14' },
      2025: { start: '2025-04-14', end: '2025-04-14' },
      2026: { start: '2026-04-14', end: '2026-04-14' },
      2027: { start: '2027-04-14', end: '2027-04-14' },
    },
    demandEffect: 0.10,
  },
];

/** Prophet-compatible holiday definition for a given year */
export interface ProphetHoliday {
  holiday: string;
  ds: string;   // date string
  lower_window: number;
  upper_window: number;
}

export function getHolidaysForYear(year: number): ProphetHoliday[] {
  const holidays: ProphetHoliday[] = [];
  for (const h of BD_HOLIDAY_CALENDAR) {
    const dateRange = h.dates[year];
    if (!dateRange) continue;
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      holidays.push({
        holiday: h.name,
        ds: d.toISOString().split('T')[0],
        lower_window: -1,
        upper_window: 1,
      });
    }
  }
  return holidays;
}

/**
 * Adjusts a predicted value based on holiday proximity.
 * Uses a linear decay over a 3-day window around the holiday.
 */
export function applyHolidayEffect(predicted: number, date: string | Date): { adjusted: number; activeHolidays: string[] } {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const targetMs = targetDate.getTime();
  const activeHolidays: string[] = [];
  let totalEffect = 0;

  for (const h of BD_HOLIDAY_CALENDAR) {
    for (const year of Object.keys(h.dates)) {
      const range = h.dates[Number(year)];
      const startMs = new Date(range.start).getTime();
      const endMs = new Date(range.end).getTime();
      const dayMs = 86400000;

      // Check proximity: within holiday range or within ±3 days
      const threeDaysBefore = startMs - 3 * dayMs;
      const threeDaysAfter = endMs + 3 * dayMs;

      if (targetMs >= threeDaysBefore && targetMs <= threeDaysAfter) {
        activeHolidays.push(h.name);

        if (targetMs >= startMs && targetMs <= endMs) {
          // During holiday: full effect
          totalEffect += h.demandEffect;
        } else if (targetMs < startMs) {
          // Before holiday: linear ramp-up over 3 days
          const daysBefore = (startMs - targetMs) / dayMs;
          totalEffect += h.demandEffect * (1 - daysBefore / 3);
        } else {
          // After holiday: linear decay over 3 days
          const daysAfter = (targetMs - endMs) / dayMs;
          totalEffect += h.demandEffect * (1 - daysAfter / 3);
        }
      }
    }
  }

  const adjusted = Math.max(0, predicted * (1 + totalEffect));
  return { adjusted, activeHolidays };
}

// ============================================
// 3. Prophet Model with BD Custom Seasonalities
// ============================================

export interface ProphetBDSeasonalComponent {
  name: string;
  period: number;
  fourierOrder: number;
  activeMonths: number[];
}

export const PROPHET_BD_SEASONALITIES: ProphetBDSeasonalComponent[] = [
  {
    name: 'yearly',
    period: 365.25,
    fourierOrder: 3,
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // always active
  },
  {
    name: 'bd_winter',
    period: 365.25 / 3, // ~121.75 days
    fourierOrder: 3,
    activeMonths: [11, 12, 1, 2], // active Nov–Feb
  },
  {
    name: 'bd_monsoon',
    period: 365.25 / 3,
    fourierOrder: 3,
    activeMonths: [6, 7, 8, 9], // active Jun–Sep
  },
  {
    name: 'bd_pre_winter',
    period: 365.25,
    fourierOrder: 2,
    activeMonths: [10], // active Oct only
  },
];

/**
 * Build Fourier regressors for a given day index and month.
 * Only includes seasonalities active in that month.
 */
function buildFourierRow(dayIndex: number, month: number, seasonalities: ProphetBDSeasonalComponent[]): number[] {
  const row: number[] = [];
  for (const s of seasonalities) {
    if (!s.activeMonths.includes(month)) {
      // Not active: fill with zeros
      for (let k = 1; k <= s.fourierOrder; k++) {
        row.push(0);
        row.push(0);
      }
    } else {
      for (let k = 1; k <= s.fourierOrder; k++) {
        row.push(Math.sin(2 * Math.PI * k * dayIndex / s.period));
        row.push(Math.cos(2 * Math.PI * k * dayIndex / s.period));
      }
    }
  }
  return row;
}

export function prophetBD(
  data: TimeSeriesPoint[],
  horizonDays: number = 90,
  seasonalityMode: 'additive' | 'multiplicative' = 'multiplicative',
  includeHolidays: boolean = true,
): ForecastResult {
  if (data.length < 4) throw new Error('Need at least 4 data points for Prophet BD model');

  const values = data.map(d => d.value);
  const n = values.length;
  const startDate = new Date(data[0].date);
  const seasonalities = PROPHET_BD_SEASONALITIES;

  // Build design matrix: [1, t, fourier_terms...]
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const date = new Date(data[i].date);
    const month = date.getMonth() + 1;
    const dayIndex = Math.round((date.getTime() - startDate.getTime()) / 86400000);
    const fourierRow = buildFourierRow(dayIndex, month, seasonalities);
    X.push([1, dayIndex, ...fourierRow]);
    y.push(values[i]);
  }

  const coeffs = olsSolve(X, y);

  // Compute fitted values
  const fitted: number[] = [];
  for (let i = 0; i < n; i++) {
    fitted.push(X[i].reduce((sum, x, j) => sum + x * coeffs[j], 0));
  }

  const residuals = values.map((v, i) => v - fitted[i]);
  const residualStdDev = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);

  // Forecast
  const lastDate = new Date(data[data.length - 1].date);
  const points: ForecastPoint[] = [];
  const seasonalComponents: Record<string, number[]> = {
    yearly: [],
    bd_winter: [],
    bd_monsoon: [],
    bd_pre_winter: [],
  };

  for (let i = 1; i <= horizonDays; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    const month = date.getMonth() + 1;
    const season = getBDSeason(month);
    const dayIndex = Math.round((date.getTime() - startDate.getTime()) / 86400000);
    const fourierRow = buildFourierRow(dayIndex, month, seasonalities);
    const row = [1, dayIndex, ...fourierRow];

    let predicted = row.reduce((sum, x, j) => sum + x * coeffs[j], 0);

    // Extract seasonal component contributions
    let colOffset = 2; // skip intercept + trend
    for (const s of seasonalities) {
      let componentVal = 0;
      for (let k = 1; k <= s.fourierOrder; k++) {
        const sinCoeff = coeffs[colOffset];
        const cosCoeff = coeffs[colOffset + 1];
        componentVal += sinCoeff * row[colOffset] + cosCoeff * row[colOffset + 1];
        colOffset += 2;
      }
      seasonalComponents[s.name].push(componentVal);
    }

    // Apply multiplicative seasonality mode
    if (seasonalityMode === 'multiplicative') {
      const seasonMult = getSeasonMultiplier(month);
      predicted *= seasonMult;
    }

    // Apply holiday effects
    if (includeHolidays) {
      const { adjusted } = applyHolidayEffect(predicted, date);
      predicted = adjusted;
    }

    predicted = Math.max(0, Math.round(predicted));
    const uncertainty = residualStdDev * Math.sqrt(1 + i * 0.1);

    points.push({
      date: date.toISOString().split('T')[0],
      predicted,
      lowerBound: Math.max(0, Math.round(predicted - 1.96 * uncertainty)),
      upperBound: Math.round(predicted + 1.96 * uncertainty),
      season: season.season,
      confidence: Math.max(0.5, 0.95 - i * 0.001),
    });
  }

  return {
    model: 'prophet_bd',
    points,
    metrics: calculateMetrics(data, fitted.map((f, i) => ({ ...data[i], value: f }))),
    params: {
      seasonalities: seasonalities.map(s => ({ name: s.name, period: s.period, fourierOrder: s.fourierOrder, activeMonths: s.activeMonths })),
      seasonalityMode,
      includeHolidays,
      horizonDays,
      seasonalComponents,
    },
  };
}

// ============================================
// 4. Exponential Smoothing with Auto-Tune Alpha
// ============================================

export interface AutoTuneResult {
  bestAlpha: number;
  bestBeta: number;
  bestGamma: number;
  bestMape: number;
  backtestMetrics: ForecastMetrics;
  alphaTrials: { alpha: number; mape: number }[];
}

/**
 * Single exponential smoothing (SES) forecast for a given alpha.
 */
function sesForecast(values: number[], alpha: number, horizon: number): { fitted: number[]; forecast: number[] } {
  const fitted: number[] = [values[0]];
  let level = values[0];
  for (let i = 1; i < values.length; i++) {
    level = alpha * values[i] + (1 - alpha) * level;
    fitted.push(level);
  }
  const forecast = Array(horizon).fill(level);
  return { fitted, forecast };
}

/**
 * Holt-Winters (double + triple exponential smoothing).
 */
function holtWintersForecast(
  values: number[],
  alpha: number,
  beta: number,
  gamma: number,
  seasonLength: number,
  horizon: number,
): { fitted: number[]; forecast: number[] } {
  if (values.length < seasonLength * 2) {
    return sesForecast(values, alpha, horizon);
  }

  // Initialize
  let level = values.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;
  let trend = (values.slice(seasonLength, seasonLength * 2).reduce((a, b) => a + b, 0) -
    values.slice(0, seasonLength).reduce((a, b) => a + b, 0)) / (seasonLength * seasonLength);

  const seasonalIndices: number[] = [];
  const overallAvg = values.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;
  for (let i = 0; i < seasonLength; i++) {
    seasonalIndices.push(overallAvg > 0 ? values[i] / overallAvg : 1);
  }
  // Normalize
  const sAvg = seasonalIndices.reduce((a, b) => a + b, 0) / seasonLength;
  for (let i = 0; i < seasonLength; i++) seasonalIndices[i] /= sAvg;

  const fitted: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const sIdx = i % seasonLength;
    const oneStep = (level + trend) * seasonalIndices[sIdx];
    fitted.push(oneStep);

    const prevLevel = level;
    const prevTrend = trend;
    level = alpha * (values[i] / seasonalIndices[sIdx]) + (1 - alpha) * (prevLevel + prevTrend);
    trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
    seasonalIndices[sIdx] = gamma * (values[i] / Math.max(level, 0.001)) + (1 - gamma) * seasonalIndices[sIdx];
  }

  const forecast: number[] = [];
  for (let i = 1; i <= horizon; i++) {
    const sIdx = (values.length + i - 1) % seasonLength;
    forecast.push((level + trend * i) * seasonalIndices[sIdx]);
  }

  return { fitted, forecast };
}

/** Compute MAPE between actual and fitted values */
function computeMape(actual: number[], fitted: number[]): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < Math.min(actual.length, fitted.length); i++) {
    if (actual[i] !== 0) {
      sum += Math.abs((actual[i] - fitted[i]) / actual[i]);
      count++;
    }
  }
  return count > 0 ? (sum / count) * 100 : Infinity;
}

export function exponentialSmoothingAutoTune(
  data: TimeSeriesPoint[],
  horizonDays: number = 90,
  mode: 'ses' | 'holt' | 'holt_winters' = 'holt_winters',
): ForecastResult & { autoTune: AutoTuneResult } {
  if (data.length < 4) throw new Error('Need at least 4 data points for auto-tune ETS');

  const values = data.map(d => d.value);
  const n = values.length;

  // 80/20 split for backtesting
  const splitIdx = Math.floor(n * 0.8);
  const trainValues = values.slice(0, splitIdx);
  const testValues = values.slice(splitIdx);

  const seasonLength = 4; // quarterly seasonality for BD
  const alphaTrials: { alpha: number; mape: number }[] = [];
  let bestAlpha = 0.3;
  let bestBeta = 0.1;
  let bestGamma = 0.2;
  let bestMape = Infinity;

  // Auto-tune alpha from 0.1 to 0.9
  for (let a = 0.1; a <= 0.9; a += 0.1) {
    const alpha = Math.round(a * 10) / 10;
    let fitted: number[];

    if (mode === 'ses') {
      const result = sesForecast(trainValues, alpha, testValues.length);
      fitted = result.forecast.slice(0, testValues.length);
    } else if (mode === 'holt') {
      const result = holtWintersForecast(trainValues, alpha, 0.1, 0.0, 1, testValues.length);
      fitted = result.forecast.slice(0, testValues.length);
    } else {
      const result = holtWintersForecast(trainValues, alpha, 0.1, 0.2, seasonLength, testValues.length);
      fitted = result.forecast.slice(0, testValues.length);
    }

    const mape = computeMape(testValues, fitted);
    alphaTrials.push({ alpha, mape });

    if (mape < bestMape) {
      bestMape = mape;
      bestAlpha = alpha;
    }
  }

  // Further tune beta and gamma for Holt-Winters
  if (mode === 'holt' || mode === 'holt_winters') {
    for (let b = 0.05; b <= 0.5; b += 0.05) {
      const beta = Math.round(b * 100) / 100;
      const gamma = mode === 'holt_winters' ? 0.2 : 0;
      const result = holtWintersForecast(trainValues, bestAlpha, beta, gamma, mode === 'holt_winters' ? seasonLength : 1, testValues.length);
      const mape = computeMape(testValues, result.forecast.slice(0, testValues.length));
      if (mape < bestMape) {
        bestMape = mape;
        bestBeta = beta;
      }
    }
  }

  if (mode === 'holt_winters') {
    for (let g = 0.05; g <= 0.5; g += 0.05) {
      const gamma = Math.round(g * 100) / 100;
      const result = holtWintersForecast(trainValues, bestAlpha, bestBeta, gamma, seasonLength, testValues.length);
      const mape = computeMape(testValues, result.forecast.slice(0, testValues.length));
      if (mape < bestMape) {
        bestMape = mape;
        bestGamma = gamma;
      }
    }
  }

  // Fit full model with best params
  const { fitted: fullFitted, forecast } = mode === 'ses'
    ? sesForecast(values, bestAlpha, horizonDays)
    : holtWintersForecast(values, bestAlpha, bestBeta, mode === 'holt_winters' ? bestGamma : 0, mode === 'holt_winters' ? seasonLength : 1, horizonDays);

  const residuals = values.map((v, i) => v - fullFitted[i]);
  const residualStdDev = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);

  const lastDate = new Date(data[data.length - 1].date);
  const points: ForecastPoint[] = [];

  for (let i = 0; i < horizonDays; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i + 1);
    const month = date.getMonth() + 1;
    const season = getBDSeason(month);

    const predicted = Math.max(0, Math.round(forecast[i]));
    const uncertainty = residualStdDev * Math.sqrt(1 + (i + 1));

    points.push({
      date: date.toISOString().split('T')[0],
      predicted,
      lowerBound: Math.max(0, Math.round(predicted - 1.96 * uncertainty)),
      upperBound: Math.round(predicted + 1.96 * uncertainty),
      season: season.season,
      confidence: Math.max(0.5, 0.95 - (i + 1) * 0.002),
    });
  }

  const backtestMetrics: ForecastMetrics = {
    mape: Math.round(bestMape * 100) / 100,
    mae: 0,
    rmse: 0,
    bias: 0,
  };

  // Compute backtest MAE, RMSE, bias
  const backtestFitted = mode === 'ses'
    ? sesForecast(trainValues, bestAlpha, testValues.length).forecast.slice(0, testValues.length)
    : holtWintersForecast(trainValues, bestAlpha, bestBeta, mode === 'holt_winters' ? bestGamma : 0, mode === 'holt_winters' ? seasonLength : 1, testValues.length).forecast.slice(0, testValues.length);

  let sumAE = 0, sumSE = 0, sumE = 0;
  for (let i = 0; i < testValues.length; i++) {
    const err = testValues[i] - (backtestFitted[i] || 0);
    sumAE += Math.abs(err);
    sumSE += err * err;
    sumE += err;
  }
  backtestMetrics.mae = Math.round((sumAE / testValues.length) * 100) / 100;
  backtestMetrics.rmse = Math.round(Math.sqrt(sumSE / testValues.length) * 100) / 100;
  backtestMetrics.bias = Math.round((sumE / testValues.length) * 100) / 100;

  return {
    model: 'ets_autotune',
    points,
    metrics: calculateMetrics(data, fullFitted.map((f, i) => ({ ...data[i], value: f }))),
    params: {
      mode,
      bestAlpha,
      bestBeta: mode !== 'ses' ? bestBeta : undefined,
      bestGamma: mode === 'holt_winters' ? bestGamma : undefined,
      horizonDays,
    },
    autoTune: {
      bestAlpha,
      bestBeta,
      bestGamma,
      bestMape: Math.round(bestMape * 100) / 100,
      backtestMetrics,
      alphaTrials,
    },
  };
}

// ============================================
// 5. Multi-Linear Regression Model
// D(F) = β₀ + β₁(Price) + β₂(PromoIndex)
// ============================================

export interface RegressionDataPoint {
  date: string;
  price: number;
  promoIndex: number;
  qtySold: number;
}

export interface RegressionResult {
  beta0: number;
  beta1: number;
  beta2: number;
  rSquared: number;
  pValues: { beta0: number; beta1: number; beta2: number };
  confidence: 'high' | 'medium' | 'low';
  validationNotes: string[];
}

export function regressionModel(data: RegressionDataPoint[]): RegressionResult {
  if (data.length < 3) throw new Error('Need at least 3 data points for regression');

  // OLS: y = β₀ + β₁*Price + β₂*PromoIndex
  const X: number[][] = data.map(d => [1, d.price, d.promoIndex]);
  const y: number[] = data.map(d => d.qtySold);

  const coeffs = olsSolve(X, y);
  const beta0 = coeffs[0];
  const beta1 = coeffs[1];
  const beta2 = coeffs[2];

  // Compute R²
  const yMean = y.reduce((a, b) => a + b, 0) / y.length;
  const yPred = X.map(row => row.reduce((sum, x, j) => sum + x * coeffs[j], 0));
  const ssTotal = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
  const ssResidual = y.reduce((sum, yi, i) => sum + (yi - yPred[i]) ** 2, 0);
  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  // Approximate p-values using t-statistics
  const n = data.length;
  const k = 3; // number of coefficients
  const mse = ssResidual / Math.max(n - k, 1);

  // Compute (X'X)^{-1} diagonal for standard errors
  const XtX: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < X.length; i++) {
    for (let j = 0; j < k; j++) {
      for (let l = 0; l < k; l++) {
        XtX[j][l] += X[i][j] * X[i][l];
      }
    }
  }

  // Invert XtX to get variance-covariance matrix (using Gauss-Jordan)
  const aug = XtX.map((row, i) => {
    const identityRow = Array(k).fill(0);
    identityRow[i] = 1;
    return [...row, ...identityRow];
  });
  for (let col = 0; col < k; col++) {
    let maxRow = col;
    for (let row = col + 1; row < k; row++) if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-10) continue;
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * k; j++) aug[col][j] /= pivot;
    for (let row = 0; row < k; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * k; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  // Diagonal of inverse = variance of coefficients
  const seBeta0 = Math.sqrt(Math.max(0, mse * aug[0][k]));
  const seBeta1 = Math.sqrt(Math.max(0, mse * aug[1][k + 1]));
  const seBeta2 = Math.sqrt(Math.max(0, mse * aug[2][k + 2]));

  // t-statistics
  const tBeta0 = seBeta0 > 0 ? beta0 / seBeta0 : 0;
  const tBeta1 = seBeta1 > 0 ? beta1 / seBeta1 : 0;
  const tBeta2 = seBeta2 > 0 ? beta2 / seBeta2 : 0;

  // Approximate two-tailed p-value from t-distribution (using normal approx)
  const tToPvalue = (t: number): number => {
    const absT = Math.abs(t);
    // Approximation for two-tailed p-value
    const p = 2 * (1 - normalCDF(absT));
    return Math.min(1, Math.max(0, p));
  };

  const pValues = {
    beta0: tToPvalue(tBeta0),
    beta1: tToPvalue(tBeta1),
    beta2: tToPvalue(tBeta2),
  };

  // Validation
  const validationNotes: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'high';

  if (rSquared < 0.3) {
    validationNotes.push(`R² = ${rSquared.toFixed(3)} is below 0.3 threshold — model has low explanatory power`);
    confidence = 'low';
  } else if (rSquared < 0.5) {
    validationNotes.push(`R² = ${rSquared.toFixed(3)} is moderate — model explains some variance`);
    confidence = 'medium';
  } else {
    validationNotes.push(`R² = ${rSquared.toFixed(3)} is good — model explains most variance`);
  }

  if (beta1 >= 0) {
    validationNotes.push('β₁ (Price) should be negative — higher price should reduce demand');
    confidence = confidence === 'high' ? 'medium' : 'low';
  } else {
    validationNotes.push('β₁ (Price) is negative as expected — demand decreases with price');
  }

  if (beta2 <= 0) {
    validationNotes.push('β₂ (PromoIndex) should be positive — promotions should increase demand');
    confidence = confidence === 'high' ? 'medium' : 'low';
  } else {
    validationNotes.push('β₂ (PromoIndex) is positive as expected — promotions increase demand');
  }

  if (pValues.beta1 > 0.05) {
    validationNotes.push('β₁ is not statistically significant (p > 0.05)');
  }
  if (pValues.beta2 > 0.05) {
    validationNotes.push('β₂ is not statistically significant (p > 0.05)');
  }

  return {
    beta0: Math.round(beta0 * 100) / 100,
    beta1: Math.round(beta1 * 100) / 100,
    beta2: Math.round(beta2 * 100) / 100,
    rSquared: Math.round(rSquared * 1000) / 1000,
    pValues: {
      beta0: Math.round(pValues.beta0 * 1000) / 1000,
      beta1: Math.round(pValues.beta1 * 1000) / 1000,
      beta2: Math.round(pValues.beta2 * 1000) / 1000,
    },
    confidence,
    validationNotes,
  };
}

/** Predict demand from regression coefficients */
export function regressionPredict(model: RegressionResult, price: number, promoIndex: number): number {
  return Math.max(0, Math.round(model.beta0 + model.beta1 * price + model.beta2 * promoIndex));
}

/** Standard normal CDF approximation */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

// ============================================
// 6. Consensus Forecast Logic
// ============================================

export interface MarketingAdjustment {
  promoUplift: number;   // e.g., 0.15 for 15% uplift
  eventImpact: number;   // e.g., 0.10 for 10% event impact
  description: string;
}

export interface ConsensusStage {
  name: string;
  value: number;
  adjustment: number;
  note: string;
}

export interface ConsensusResult {
  finalForecast: number;
  stages: ConsensusStage[];
  governanceNotes: string[];
  bestModel: string;
}

export function consensusForecast(params: {
  baselineForecast: number;
  baselineModel: string;
  seasonalMultiplier: number;
  seasonalModel: string;
  marketingAdjustments?: MarketingAdjustment;
  salesOverride?: number;
  salesOverrideWeight?: number; // 0-1, how much to trust sales override
}): ConsensusResult {
  const {
    baselineForecast,
    baselineModel,
    seasonalMultiplier,
    seasonalModel,
    marketingAdjustments,
    salesOverride,
    salesOverrideWeight = 0.3,
  } = params;

  const stages: ConsensusStage[] = [];
  const governanceNotes: string[] = [];

  // Stage 1: Baseline
  const baselineValue = baselineForecast;
  stages.push({
    name: 'Baseline',
    value: baselineValue,
    adjustment: 0,
    note: `Baseline from ${baselineModel}: ${baselineValue.toFixed(1)} units`,
  });

  // Stage 2: Apply seasonal multiplier
  const afterSeasonal = baselineValue * seasonalMultiplier;
  stages.push({
    name: 'Seasonal Adjustment',
    value: afterSeasonal,
    adjustment: afterSeasonal - baselineValue,
    note: `Seasonal multiplier from ${seasonalModel}: ×${seasonalMultiplier.toFixed(3)} (${seasonalMultiplier > 1 ? 'uplift' : 'dip'})`,
  });

  // Stage 3: Apply marketing adjustments
  let afterMarketing = afterSeasonal;
  if (marketingAdjustments) {
    const totalMarketingUplift = 1 + marketingAdjustments.promoUplift + marketingAdjustments.eventImpact;
    afterMarketing = afterSeasonal * totalMarketingUplift;
    stages.push({
      name: 'Marketing Adjustment',
      value: afterMarketing,
      adjustment: afterMarketing - afterSeasonal,
      note: `Promo uplift: +${(marketingAdjustments.promoUplift * 100).toFixed(1)}%, Event impact: +${(marketingAdjustments.eventImpact * 100).toFixed(1)}% — ${marketingAdjustments.description}`,
    });
    governanceNotes.push(`Marketing applied: promo +${(marketingAdjustments.promoUplift * 100).toFixed(1)}%, event +${(marketingAdjustments.eventImpact * 100).toFixed(1)}%`);
  } else {
    governanceNotes.push('No marketing adjustments applied');
  }

  // Stage 4: Sales team override
  let finalValue = afterMarketing;
  if (salesOverride !== undefined && salesOverride !== null) {
    // Weighted blend: (1-w)*model + w*override
    finalValue = (1 - salesOverrideWeight) * afterMarketing + salesOverrideWeight * salesOverride;
    stages.push({
      name: 'Sales Override Blend',
      value: finalValue,
      adjustment: finalValue - afterMarketing,
      note: `Sales override: ${salesOverride.toFixed(1)} units (weight: ${(salesOverrideWeight * 100).toFixed(0)}%) — blended with model forecast`,
    });
    governanceNotes.push(`Sales override blended at ${(salesOverrideWeight * 100).toFixed(0)}% weight: model=${afterMarketing.toFixed(1)}, override=${salesOverride.toFixed(1)}`);
  } else {
    governanceNotes.push('No sales team override provided');
  }

  // Determine best model attribution
  const bestModel = salesOverride ? `${seasonalModel} + sales_override` : seasonalModel;

  return {
    finalForecast: Math.round(finalValue),
    stages,
    governanceNotes,
    bestModel,
  };
}

// ============================================
// 7. Helper: Generate ForecastResult from Consensus
// ============================================

export function consensusToForecastResult(
  data: TimeSeriesPoint[],
  consensusPerDay: { date: string; value: number; season: BDSeason }[],
  horizonDays: number,
): ForecastResult {
  const values = data.map(d => d.value);
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const stdDev = values.length > 1
    ? Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length)
    : avg * 0.2;

  const points: ForecastPoint[] = consensusPerDay.slice(0, horizonDays).map((c, i) => ({
    date: c.date,
    predicted: Math.round(c.value),
    lowerBound: Math.max(0, Math.round(c.value - 1.96 * stdDev * Math.sqrt(1 + i * 0.05))),
    upperBound: Math.round(c.value + 1.96 * stdDev * Math.sqrt(1 + i * 0.05)),
    season: c.season,
    confidence: Math.max(0.5, 0.95 - i * 0.001),
  }));

  // Rough metrics — consensus vs historical average
  const metrics: ForecastMetrics = {
    mape: stdDev > 0 && avg > 0 ? Math.round((stdDev / avg) * 10000) / 100 : 0,
    mae: Math.round(stdDev * 100) / 100,
    rmse: Math.round(stdDev * 100) / 100,
    bias: 0,
  };

  return {
    model: 'consensus',
    points,
    metrics,
    params: { horizonDays, consensusStages: consensusPerDay.length },
  };
}
