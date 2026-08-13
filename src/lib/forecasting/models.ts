// ============================================
// TrimedCast Forecasting Engine
// BD Motorcycle Parts Seasonal Demand Forecasting
// ============================================

// --- BD Season Model ---

export type BDSeason = 'winter' | 'summer' | 'monsoon' | 'pre_winter';

export interface SeasonInfo {
  season: BDSeason;
  months: number[];
  label: string;
  labelBn: string;
  demandMultiplier: number;
  description: string;
}

export const BD_SEASONS: SeasonInfo[] = [
  {
    season: 'winter',
    months: [11, 12, 1, 2],
    label: 'Winter (Nov–Feb)',
    labelBn: 'শীত (নভেম্বর–ফেব্রুয়ারি)',
    demandMultiplier: 1.4,
    description: 'Peak riding season. Dry roads, comfortable weather = highest parts demand.',
  },
  {
    season: 'summer',
    months: [3, 4, 5],
    label: 'Summer (Mar–May)',
    labelBn: 'গ্রীষ্ম (মার্চ–মে)',
    demandMultiplier: 1.1,
    description: 'Moderate demand. Heat increases engine wear (pistons, filters). Pre-monsoon prep.',
  },
  {
    season: 'monsoon',
    months: [6, 7, 8, 9],
    label: 'Monsoon (Jun–Sep)',
    labelBn: 'বর্ষা (জুন–সেপ্টেম্বর)',
    demandMultiplier: 0.7,
    description: 'Low riding = low parts demand. But tire demand stays (puncture repairs).',
  },
  {
    season: 'pre_winter',
    months: [10],
    label: 'Pre-Winter (Oct)',
    labelBn: 'হেমন্ত (অক্টোবর)',
    demandMultiplier: 1.2,
    description: 'Demand starts climbing. Riders prep bikes for winter. Service workshops busy.',
  },
];

export function getBDSeason(month: number): SeasonInfo {
  return BD_SEASONS.find(s => s.months.includes(month)) || BD_SEASONS[0];
}

export function getSeasonMultiplier(month: number): number {
  return getBDSeason(month).demandMultiplier;
}

// --- BD Holidays ---

export interface BDHoliday {
  name: string;
  nameBn: string;
  month: number;
  demandImpact: number;
  type: 'religious' | 'national' | 'cultural';
}

export const BD_HOLIDAYS: BDHoliday[] = [
  { name: 'Eid ul-Fitr', nameBn: 'ঈদুল ফিতর', month: 4, demandImpact: 1.5, type: 'religious' },
  { name: 'Eid ul-Adha', nameBn: 'ঈদুল আযহা', month: 7, demandImpact: 1.3, type: 'religious' },
  { name: 'Durga Puja', nameBn: 'দুর্গা পূজা', month: 10, demandImpact: 1.15, type: 'religious' },
  { name: 'Pohela Boishakh', nameBn: 'পহেলা বৈশাখ', month: 4, demandImpact: 1.2, type: 'cultural' },
  { name: 'Independence Day', nameBn: 'স্বাধীনতা দিবস', month: 3, demandImpact: 1.05, type: 'national' },
  { name: 'Victory Day', nameBn: 'বিজয় দিবস', month: 12, demandImpact: 1.05, type: 'national' },
];

// --- Time Series Data Point ---

export interface TimeSeriesPoint {
  date: string;
  value: number;
  season?: BDSeason;
}

// --- Forecast Result ---

export interface ForecastPoint {
  date: string;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  season: BDSeason;
  confidence: number;
}

export interface ForecastResult {
  model: string;
  points: ForecastPoint[];
  metrics: ForecastMetrics;
  params: Record<string, unknown>;
}

export interface ForecastMetrics {
  mape: number;
  mae: number;
  rmse: number;
  bias: number;
}

// ============================================
// Model 1: Moving Average (Simple Baseline)
// ============================================

export function movingAverage(
  data: TimeSeriesPoint[],
  windowSize: number = 3,
  horizonDays: number = 90
): ForecastResult {
  if (data.length < windowSize) {
    throw new Error(`Need at least ${windowSize} data points for MA(${windowSize})`);
  }

  const lastValues = data.slice(-windowSize).map(d => d.value);
  const avg = lastValues.reduce((a, b) => a + b, 0) / windowSize;
  const stdDev = Math.sqrt(lastValues.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / windowSize);

  const lastDate = new Date(data[data.length - 1].date);
  const points: ForecastPoint[] = [];

  for (let i = 1; i <= horizonDays; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    const month = date.getMonth() + 1;
    const season = getBDSeason(month);

    const predicted = Math.round(avg * season.demandMultiplier);

    points.push({
      date: date.toISOString().split('T')[0],
      predicted,
      lowerBound: Math.max(0, Math.round(predicted - 1.96 * stdDev)),
      upperBound: Math.round(predicted + 1.96 * stdDev),
      season: season.season,
      confidence: 0.95,
    });
  }

  const fitted = data.slice(-Math.min(horizonDays, data.length)).map(d => ({
    ...d,
    value: avg * getSeasonMultiplier(new Date(d.date).getMonth() + 1),
  }));

  return {
    model: 'moving_average',
    points,
    metrics: calculateMetrics(data, fitted),
    params: { windowSize, horizonDays },
  };
}

// ============================================
// Model 2: Exponential Smoothing (ETS)
// ============================================

export function exponentialSmoothing(
  data: TimeSeriesPoint[],
  alpha: number = 0.3,
  beta: number = 0.1,
  gamma: number = 0.2,
  horizonDays: number = 90
): ForecastResult {
  if (data.length < 4) throw new Error('Need at least 4 data points for ETS');

  const values = data.map(d => d.value);
  let level = values[0];
  let trend = values[1] - values[0];

  const seasonalIndices = [1.0, 1.0, 1.0, 1.0];
  const seasonData: number[][] = [[], [], [], []];
  for (let i = 0; i < values.length; i++) seasonData[i % 4].push(values[i]);
  const overallAvg = values.reduce((a, b) => a + b, 0) / values.length;
  for (let i = 0; i < 4; i++) {
    if (seasonData[i].length > 0) seasonalIndices[i] = (seasonData[i].reduce((a, b) => a + b, 0) / seasonData[i].length) / overallAvg;
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
    const date = new Date(lastDate); date.setDate(date.getDate() + i);
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
    model: 'exponential_smoothing',
    points,
    metrics: calculateMetrics(data, fitted.map((f, i) => ({ ...data[i], value: f }))),
    params: { alpha, beta, gamma, horizonDays },
  };
}

// ============================================
// Model 3: Seasonal Decomposition (BD-specific)
// ============================================

export function seasonalDecomposition(
  data: TimeSeriesPoint[],
  horizonDays: number = 90
): ForecastResult {
  if (data.length < 12) throw new Error('Need at least 12 data points for seasonal decomposition');

  const values = data.map(d => d.value);
  const period = 4;

  // Trend via centered moving average
  const trend: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period / 2 || i >= values.length - period / 2) {
      trend.push(values[i]);
    } else {
      const sum = values.slice(i - Math.floor(period / 2), i + Math.ceil(period / 2)).reduce((a, b) => a + b, 0);
      trend.push(sum / period);
    }
  }

  // Seasonal indices
  const detrended = values.map((v, i) => trend[i] !== 0 ? v / trend[i] : 1);
  const seasonalFactors: number[] = new Array(period).fill(0);
  const seasonalCounts: number[] = new Array(period).fill(0);
  for (let i = 0; i < detrended.length; i++) {
    const sIdx = i % period;
    seasonalFactors[sIdx] += detrended[i];
    seasonalCounts[sIdx]++;
  }
  for (let i = 0; i < period; i++) {
    seasonalFactors[i] = seasonalCounts[i] > 0 ? seasonalFactors[i] / seasonalCounts[i] : 1;
  }
  const avgFactor = seasonalFactors.reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < period; i++) seasonalFactors[i] /= avgFactor;

  // Linear trend on deseasonalized data
  const deseasonalized = values.map((v, i) => v / seasonalFactors[i % period]);
  const n = deseasonalized.length;
  const xMean = (n - 1) / 2;
  const yMean = deseasonalized.reduce((a, b) => a + b, 0) / n;
  let slopeNum = 0, slopeDen = 0;
  for (let i = 0; i < n; i++) {
    slopeNum += (i - xMean) * (deseasonalized[i] - yMean);
    slopeDen += (i - xMean) * (i - xMean);
  }
  const slope = slopeDen !== 0 ? slopeNum / slopeDen : 0;
  const intercept = yMean - slope * xMean;

  const lastDate = new Date(data[data.length - 1].date);
  const points: ForecastPoint[] = [];
  const residuals = values.map((v, i) => v - (intercept + slope * i) * seasonalFactors[i % period]);
  const residualStdDev = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);

  for (let i = 1; i <= horizonDays; i++) {
    const idx = n + i - 1;
    const date = new Date(lastDate); date.setDate(date.getDate() + i);
    const month = date.getMonth() + 1;
    const season = getBDSeason(month);
    const sIdx = idx % period;

    const predicted = Math.max(0, Math.round((intercept + slope * idx) * seasonalFactors[sIdx]));
    const uncertainty = residualStdDev * Math.sqrt(1 + i / n);

    points.push({
      date: date.toISOString().split('T')[0],
      predicted,
      lowerBound: Math.max(0, Math.round(predicted - 1.96 * uncertainty)),
      upperBound: Math.round(predicted + 1.96 * uncertainty),
      season: season.season,
      confidence: Math.max(0.5, 0.95 - i * 0.001),
    });
  }

  const fittedVals = values.map((_, i) => (intercept + slope * i) * seasonalFactors[i % period]);
  return {
    model: 'seasonal_decomposition',
    points,
    metrics: calculateMetrics(data, fittedVals.map((f, i) => ({ ...data[i], value: f }))),
    params: { period, slope, intercept, seasonalFactors, horizonDays },
  };
}

// ============================================
// Model 4: Prophet-Like (Simplified)
// Trend + Seasonality + Holiday Effects
// ============================================

export function prophetLike(
  data: TimeSeriesPoint[],
  horizonDays: number = 90,
  changepointRange: number = 0.8
): ForecastResult {
  if (data.length < 8) throw new Error('Need at least 8 data points for Prophet-like model');

  const values = data.map(d => d.value);
  const n = values.length;
  const fourierOrder = 2;
  const period = 12;

  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const row = [1, i];
    for (let k = 1; k <= fourierOrder; k++) {
      row.push(Math.sin(2 * Math.PI * k * i / period));
      row.push(Math.cos(2 * Math.PI * k * i / period));
    }
    X.push(row);
    y.push(values[i]);
  }

  const coeffs = olsSolve(X, y);

  const holidayEffects: Record<number, number> = {};
  for (const holiday of BD_HOLIDAYS) holidayEffects[holiday.month] = holiday.demandImpact;

  const fitted: number[] = [];
  for (let i = 0; i < n; i++) {
    const row = [1, i];
    for (let k = 1; k <= fourierOrder; k++) {
      row.push(Math.sin(2 * Math.PI * k * i / period));
      row.push(Math.cos(2 * Math.PI * k * i / period));
    }
    fitted.push(row.reduce((sum, r, j) => sum + r * coeffs[j], 0));
  }

  const residuals = values.map((v, i) => v - fitted[i]);
  const residualStdDev = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);

  const lastDate = new Date(data[data.length - 1].date);
  const points: ForecastPoint[] = [];

  for (let i = 1; i <= horizonDays; i++) {
    const idx = n + i - 1;
    const date = new Date(lastDate); date.setDate(date.getDate() + i);
    const month = date.getMonth() + 1;
    const season = getBDSeason(month);

    const row = [1, idx];
    for (let k = 1; k <= fourierOrder; k++) {
      row.push(Math.sin(2 * Math.PI * k * idx / period));
      row.push(Math.cos(2 * Math.PI * k * idx / period));
    }
    let predicted = row.reduce((sum, r, j) => sum + r * coeffs[j], 0);
    predicted *= (holidayEffects[month] || 1);

    predicted = Math.max(0, Math.round(predicted));
    const uncertainty = residualStdDev * Math.sqrt(1 + i * 0.1);

    points.push({
      date: date.toISOString().split('T')[0],
      predicted,
      lowerBound: Math.max(0, Math.round(predicted - 1.96 * uncertainty)),
      upperBound: Math.round(predicted + 1.96 * uncertainty),
      season: season.season,
      confidence: Math.max(0.5, 0.95 - i * 0.0015),
    });
  }

  return {
    model: 'prophet_like',
    points,
    metrics: calculateMetrics(data, fitted.map((f, i) => ({ ...data[i], value: f }))),
    params: { fourierOrder, changepointRange, horizonDays },
  };
}

// ============================================
// Model 5: EOQ (Economic Order Quantity)
// ============================================

export interface EOQParams {
  annualDemand: number;
  orderingCost: number;
  holdingCostPerUnit: number;
}

export interface EOQResult {
  eoq: number;
  ordersPerYear: number;
  orderCycleDays: number;
  totalOrderingCost: number;
  totalHoldingCost: number;
  totalCost: number;
}

export function calculateEOQ(params: EOQParams): EOQResult {
  const { annualDemand, orderingCost, holdingCostPerUnit } = params;
  if (annualDemand <= 0 || orderingCost <= 0 || holdingCostPerUnit <= 0) {
    return { eoq: 0, ordersPerYear: 0, orderCycleDays: 0, totalOrderingCost: 0, totalHoldingCost: 0, totalCost: 0 };
  }
  const eoq = Math.sqrt(2 * annualDemand * orderingCost / holdingCostPerUnit);
  const ordersPerYear = annualDemand / eoq;
  return {
    eoq: Math.round(eoq),
    ordersPerYear: Math.round(ordersPerYear * 10) / 10,
    orderCycleDays: Math.round(365 / ordersPerYear),
    totalOrderingCost: Math.round(ordersPerYear * orderingCost),
    totalHoldingCost: Math.round((eoq / 2) * holdingCostPerUnit),
    totalCost: Math.round(ordersPerYear * orderingCost + (eoq / 2) * holdingCostPerUnit),
  };
}

// ============================================
// Model 6: Safety Stock
// ============================================

export interface SafetyStockParams {
  avgDemand: number;
  demandStdDev: number;
  avgLeadTime: number;
  leadTimeStdDev: number;
  serviceLevel: number;
}

export interface SafetyStockResult {
  safetyStock: number;
  reorderPoint: number;
  serviceLevel: number;
  zScore: number;
  components: { demandVariability: number; leadTimeVariability: number };
}

export function calculateSafetyStock(params: SafetyStockParams): SafetyStockResult {
  const { avgDemand, demandStdDev, avgLeadTime, leadTimeStdDev, serviceLevel } = params;
  const zScore = inverseNormalCDF(serviceLevel);
  const demandComponent = avgLeadTime * Math.pow(demandStdDev, 2);
  const leadTimeComponent = Math.pow(avgDemand, 2) * Math.pow(leadTimeStdDev, 2);
  const safetyStock = zScore * Math.sqrt(demandComponent + leadTimeComponent);
  return {
    safetyStock: Math.round(safetyStock),
    reorderPoint: Math.round(avgDemand * avgLeadTime + safetyStock),
    serviceLevel,
    zScore: Math.round(zScore * 100) / 100,
    components: {
      demandVariability: Math.round(demandComponent * 100) / 100,
      leadTimeVariability: Math.round(leadTimeComponent * 100) / 100,
    },
  };
}

// ============================================
// Helpers: OLS, Inverse Normal CDF, Metrics
// ============================================

function olsSolve(X: number[][], y: number[]): number[] {
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

function inverseNormalCDF(p: number): number {
  if (p <= 0) return -3.5; if (p >= 1) return 3.5; if (p === 0.5) return 0;
  const a1 = -3.9696830286653, a2 = 1.5730690123124, a3 = -0.2498139276149;
  const a4 = 0.0393196967758, a5 = 0.0000210294767;
  const b1 = -0.0815778758059, b2 = 0.0069077209127, b3 = -0.0001453316988;
  const b4 = 0.0000014450119, b5 = -0.0000000076544;
  const t = p < 0.5 ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p));
  const c = t + (a1 + (a2 + (a3 + (a4 + a5 * t) * t) * t) * t) / (1 + (b1 + (b2 + (b3 + (b4 + b5 * t) * t) * t) * t) * t);
  return p < 0.5 ? -c : c;
}

export function calculateMetrics(actual: TimeSeriesPoint[], fitted: TimeSeriesPoint[]): ForecastMetrics {
  const n = Math.min(actual.length, fitted.length);
  if (n === 0) return { mape: 0, mae: 0, rmse: 0, bias: 0 };
  let sumAPE = 0, sumAE = 0, sumSE = 0, sumE = 0, countPE = 0;
  for (let i = 0; i < n; i++) {
    const error = actual[i].value - fitted[i].value;
    sumAE += Math.abs(error); sumSE += error * error; sumE += error;
    if (actual[i].value !== 0) { sumAPE += Math.abs(error / actual[i].value); countPE++; }
  }
  return {
    mape: countPE > 0 ? Math.round((sumAPE / countPE) * 10000) / 100 : 0,
    mae: Math.round(sumAE / n * 100) / 100,
    rmse: Math.round(Math.sqrt(sumSE / n) * 100) / 100,
    bias: Math.round((sumE / n) * 100) / 100,
  };
}

// ============================================
// Ensemble: Weighted Average of Models
// ============================================

export interface EnsembleWeights {
  moving_average: number;
  exponential_smoothing: number;
  seasonal_decomposition: number;
  prophet_like: number;
}

export const DEFAULT_WEIGHTS: EnsembleWeights = {
  moving_average: 0.1,
  exponential_smoothing: 0.2,
  seasonal_decomposition: 0.3,
  prophet_like: 0.4,
};

export function ensembleForecast(results: ForecastResult[], weights: EnsembleWeights = DEFAULT_WEIGHTS): ForecastResult {
  if (results.length === 0) throw new Error('No forecast results');
  const horizonDays = results[0].points.length;
  const points: ForecastPoint[] = [];

  for (let i = 0; i < horizonDays; i++) {
    let wP = 0, wL = 0, wU = 0, wC = 0, tW = 0;
    for (const r of results) {
      const w = weights[r.model as keyof EnsembleWeights] || 0;
      if (i < r.points.length) { wP += w * r.points[i].predicted; wL += w * r.points[i].lowerBound; wU += w * r.points[i].upperBound; wC += w * r.points[i].confidence; tW += w; }
    }
    if (tW > 0) points.push({
      date: results[0].points[i].date,
      predicted: Math.round(wP / tW),
      lowerBound: Math.max(0, Math.round(wL / tW)),
      upperBound: Math.round(wU / tW),
      season: results[0].points[i].season,
      confidence: Math.round((wC / tW) * 100) / 100,
    });
  }

  const metrics: ForecastMetrics = { mape: 0, mae: 0, rmse: 0, bias: 0 };
  let tMW = 0;
  for (const r of results) {
    const w = weights[r.model as keyof EnsembleWeights] || 0;
    metrics.mape += w * r.metrics.mape; metrics.mae += w * r.metrics.mae; metrics.rmse += w * r.metrics.rmse; metrics.bias += w * r.metrics.bias; tMW += w;
  }
  if (tMW > 0) { metrics.mape = Math.round((metrics.mape / tMW) * 100) / 100; metrics.mae = Math.round((metrics.mae / tMW) * 100) / 100; metrics.rmse = Math.round((metrics.rmse / tMW) * 100) / 100; metrics.bias = Math.round((metrics.bias / tMW) * 100) / 100; }

  return { model: 'ensemble', points, metrics, params: { weights } };
}
