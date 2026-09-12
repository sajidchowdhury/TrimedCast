// ============================================
// TrimedCast LEAN — Prophet-inspired forecasting engine
// Pure TypeScript (no Python microservice). Decomposes a monthly time
// series into trend + annual Fourier seasonality + festival demand effects,
// fitted by ordinary least squares (OLS) via Gaussian elimination.
//
// This is the lean version of the TrimedCast prophet-engine.ts, scoped to
// exactly what the client needs: per-SKU per-session demand forecasts with
// accuracy metrics. No consensus pipeline, no auto-recalibration, no AI
// scenario preview (all deferred per the lean scope).
// ============================================

import type { FestivalSeed } from '@/lib/sessions/festival-calendar';

// --- Types ---

export interface TimeSeriesPoint {
  date: string;  // ISO yyyy-mm-dd (1st of month)
  value: number; // qty sold that month
}

export interface ForecastPoint {
  date: string;        // ISO yyyy-mm-dd
  month: number;       // 1-12
  year: number;
  predicted: number;   // point forecast (rounded, >= 0)
  lowerBound: number;  // confidence interval lower
  upperBound: number;  // confidence interval upper
  festivalName: string | null;  // overlapping festival, if any
  festivalEffect: number;       // multiplier applied (1.0 = none)
}

export interface ForecastMetrics {
  mape: number;  // Mean Absolute Percentage Error (%)
  mae: number;   // Mean Absolute Error
  rmse: number;  // Root Mean Squared Error
  mse: number;   // Mean Squared Error
  bias: number;  // Mean signed error (positive = over-forecast)
  accuracyRating: 'excellent' | 'good' | 'fair' | 'poor' | 'unusable';
  n: number;     // number of points evaluated
}

export interface ForecastResult {
  skuCode: string;
  productName: string;
  points: ForecastPoint[];
  metrics: ForecastMetrics;
  model: string;
  historyPoints: number;
  festivalSessionId: string | null;
  festivalSessionName: string | null;
  generatedAt: string;
}

// --- Festival effect lookup ---

/**
 * Find the festival effect that applies to a given month+year.
 * Returns { name, effect } or null. The effect applies if the month
 * overlaps any festival's demand window.
 */
export function festivalEffectForMonth(
  year: number,
  month: number,
  festivals: FestivalSeed[],
): { name: string; effect: number } | null {
  // Build a date approx mid-month to test window overlap
  const testDate = new Date(Date.UTC(year, month - 1, 15));
  for (const f of festivals) {
    const start = new Date(f.windowStart + 'T00:00:00Z');
    const end = new Date(f.windowEnd + 'T23:59:59Z');
    if (testDate >= start && testDate <= end) {
      return { name: f.name, effect: f.demandEffect };
    }
  }
  return null;
}

// --- Fourier series ---

/** Generate Fourier terms sin/cos(2πkt/period) for k=1..order. */
function fourierTerms(t: number, period: number, order: number): number[] {
  const terms: number[] = [];
  for (let k = 1; k <= order; k++) {
    terms.push(Math.sin((2 * Math.PI * k * t) / period));
    terms.push(Math.cos((2 * Math.PI * k * t) / period));
  }
  return terms;
}

// --- OLS solver (Gaussian elimination with partial pivoting) ---

function olsSolve(X: number[][], y: number[]): number[] {
  const n = X.length;
  const m = X[0].length;
  if (n < m) throw new Error(`Insufficient data: ${n} rows for ${m} parameters`);

  // Build XtX and Xty
  const XtX: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
  const Xty: number[] = Array(m).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      Xty[j] += X[i][j] * y[i];
      for (let k = 0; k < m; k++) XtX[j][k] += X[i][j] * X[i][k];
    }
  }

  // Augment XtX with Xty → [XtX | Xty]
  const aug = XtX.map((row, i) => [...row, Xty[i]]);

  // Forward elimination with partial pivoting
  for (let col = 0; col < m; col++) {
    let maxRow = col;
    for (let row = col + 1; row < m; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    if (maxRow !== col) [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-12) continue; // singular column, skip
    for (let row = col + 1; row < m; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let k = col; k <= m; k++) aug[row][k] -= factor * aug[col][k];
    }
  }

  // Back substitution
  const result = Array(m).fill(0);
  for (let i = m - 1; i >= 0; i--) {
    if (Math.abs(aug[i][i]) < 1e-12) continue;
    result[i] = aug[i][m];
    for (let j = i + 1; j < m; j++) result[i] -= aug[i][j] * result[j];
    result[i] /= aug[i][i];
  }
  return result;
}

// --- Accuracy metrics ---

/** MAPE 5-tier rating per the TrimedCast spec. */
export function rateAccuracy(mape: number): ForecastMetrics['accuracyRating'] {
  if (mape < 5) return 'excellent';
  if (mape < 10) return 'good';
  if (mape < 20) return 'fair';
  if (mape < 50) return 'poor';
  return 'unusable';
}

export function calculateMetrics(
  actual: number[],
  fitted: number[],
): ForecastMetrics {
  const n = Math.min(actual.length, fitted.length);
  if (n === 0) {
    return { mape: 0, mae: 0, rmse: 0, mse: 0, bias: 0, accuracyRating: 'unusable', n: 0 };
  }
  let sumAPE = 0, sumAE = 0, sumSE = 0, sumE = 0, countPE = 0;
  for (let i = 0; i < n; i++) {
    const error = actual[i] - fitted[i];
    sumAE += Math.abs(error);
    sumSE += error * error;
    sumE += error;
    if (actual[i] !== 0) {
      sumAPE += Math.abs(error / actual[i]);
      countPE++;
    }
  }
  const mape = countPE > 0 ? (sumAPE / countPE) * 100 : 0;
  return {
    mape: Math.round(mape * 100) / 100,
    mae: Math.round((sumAE / n) * 100) / 100,
    mse: Math.round((sumSE / n) * 100) / 100,
    rmse: Math.round(Math.sqrt(sumSE / n) * 100) / 100,
    bias: Math.round((sumE / n) * 100) / 100,
    accuracyRating: rateAccuracy(mape),
    n,
  };
}

// --- Main forecast function ---

export interface ProphetConfig {
  fourierOrder?: number;        // annual seasonality order (default 3)
  includeFestivals?: boolean;   // apply festival multipliers (default true)
  horizonMonths?: number;      // how many months to forecast (default 6)
  confidenceLevel?: number;    // 0.90 or 0.95 (default 0.95)
}

export const DEFAULT_CONFIG: Required<ProphetConfig> = {
  fourierOrder: 3,
  includeFestivals: true,
  horizonMonths: 6,
  confidenceLevel: 0.95,
};

/**
 * Forecast a monthly time series using a Prophet-inspired model:
 *   y(t) = intercept + slope*t + Σ Fourier(annual) + festival effects
 *
 * Features per point t (months since first observation):
 *   [1, t, sin(2π*1*t/12), cos(2π*1*t/12), ..., sin(2π*K*t/12), cos(2π*K*t/12)]
 *
 * Festival effects are applied multiplicatively after the OLS fit,
 * matching the original TrimedCast multiplicative seasonality mode.
 *
 * @param history       Monthly time series (oldest first)
 * @param festivals     Festival sessions to apply
 * @param config        Model config
 */
export function forecast(
  skuCode: string,
  productName: string,
  history: TimeSeriesPoint[],
  festivals: FestivalSeed[],
  config: ProphetConfig = {},
  festivalSessionId: string | null = null,
  festivalSessionName: string | null = null,
): ForecastResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // --- Cold-start handling ---
  // The original engine requires ≥8 points. For the client's first year of
  // data (12 monthly cols), we'll often have exactly 12 — fine. If less
  // than 8, fall back to moving average so we still return something usable.
  if (history.length < 3) {
    return coldStartForecast(skuCode, productName, history, festivals, cfg, festivalSessionId, festivalSessionName);
  }

  const useProphet = history.length >= 8;
  const n = history.length;

  // Build design matrix
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [1, i]; // intercept + linear trend
    row.push(...fourierTerms(i, 12, cfg.fourierOrder));
    X.push(row);
    y.push(Math.max(0, history[i].value));
  }

  let coeffs: number[];
  let fitted: number[];
  if (useProphet) {
    coeffs = olsSolve(X, y);
    fitted = X.map((row) => Math.max(0, row.reduce((s, r, j) => s + r * coeffs[j], 0)));
  } else {
    // Moving average fallback for short series
    const window = Math.min(3, n);
    const avg = y.slice(-window).reduce((a, b) => a + b, 0) / window;
    coeffs = [];
    fitted = y.map(() => avg);
  }

  // Residuals → confidence band
  const residuals = y.map((v, i) => v - fitted[i]);
  const residualStd = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, residuals.length));
  const zScore = cfg.confidenceLevel >= 0.95 ? 1.96 : 1.65;

  // --- Forecast horizon ---
  const lastDate = new Date(history[n - 1].date + 'T00:00:00Z');
  const points: ForecastPoint[] = [];

  for (let h = 1; h <= cfg.horizonMonths; h++) {
    const idx = n + h - 1;
    const date = new Date(Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth() + h, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;

    let predicted: number;
    if (useProphet) {
      const row: number[] = [1, idx, ...fourierTerms(idx, 12, cfg.fourierOrder)];
      predicted = row.reduce((s, r, j) => s + r * coeffs[j], 0);
    } else {
      predicted = fitted[fitted.length - 1];
    }

    // Apply festival effect (multiplicative)
    let festivalName: string | null = null;
    let festivalEffect = 1.0;
    if (cfg.includeFestivals) {
      const fe = festivalEffectForMonth(year, month, festivals);
      if (fe) {
        festivalName = fe.name;
        festivalEffect = fe.effect;
        predicted *= festivalEffect;
      }
    }

    predicted = Math.max(0, Math.round(predicted));
    const uncertainty = residualStd * Math.sqrt(1 + h * 0.15); // grows with horizon
    points.push({
      date: date.toISOString().slice(0, 10),
      month,
      year,
      predicted,
      lowerBound: Math.max(0, Math.round(predicted - zScore * uncertainty)),
      upperBound: Math.round(predicted + zScore * uncertainty),
      festivalName,
      festivalEffect,
    });
  }

  const metrics = calculateMetrics(y, fitted);

  return {
    skuCode,
    productName,
    points,
    metrics,
    model: useProphet ? 'prophet-ts-lean' : 'moving-average',
    historyPoints: n,
    festivalSessionId,
    festivalSessionName,
    generatedAt: new Date().toISOString(),
  };
}

/** Cold-start forecast for SKUs with < 3 history points. */
function coldStartForecast(
  skuCode: string,
  productName: string,
  history: TimeSeriesPoint[],
  festivals: FestivalSeed[],
  cfg: Required<ProphetConfig>,
  festivalSessionId: string | null,
  festivalSessionName: string | null,
): ForecastResult {
  const baseline = history.length > 0
    ? history.reduce((s, p) => s + p.value, 0) / history.length
    : 0;

  const lastDate = history.length > 0
    ? new Date(history[history.length - 1].date + 'T00:00:00Z')
    : new Date();
  const points: ForecastPoint[] = [];

  for (let h = 1; h <= cfg.horizonMonths; h++) {
    const date = new Date(Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth() + h, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;

    let predicted = baseline;
    let festivalName: string | null = null;
    let festivalEffect = 1.0;
    if (cfg.includeFestivals) {
      const fe = festivalEffectForMonth(year, month, festivals);
      if (fe) {
        festivalName = fe.name;
        festivalEffect = fe.effect;
        predicted *= festivalEffect;
      }
    }
    predicted = Math.max(0, Math.round(predicted));
    const uncertainty = baseline * 0.3; // 30% uncertainty for cold start
    points.push({
      date: date.toISOString().slice(0, 10),
      month,
      year,
      predicted,
      lowerBound: Math.max(0, Math.round(predicted - 1.65 * uncertainty)),
      upperBound: Math.round(predicted + 1.65 * uncertainty),
      festivalName,
      festivalEffect,
    });
  }

  return {
    skuCode,
    productName,
    points,
    metrics: {
      mape: 0, mae: 0, rmse: 0, mse: 0, bias: 0,
      accuracyRating: 'unusable', n: history.length,
    },
    model: 'cold-start-baseline',
    historyPoints: history.length,
    festivalSessionId,
    festivalSessionName,
    generatedAt: new Date().toISOString(),
  };
}
