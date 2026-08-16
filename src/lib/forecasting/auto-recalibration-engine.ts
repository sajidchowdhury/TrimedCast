// ============================================
// TrimedCast Auto-Recalibration Engine
// Pure TypeScript implementation of auto-recalibration
// logic from Forecasting Engine Specification Section 4.
//
// Features:
//   - Full metrics calculation (MAPE, MAE, MSE, RMSE, Bias, std dev)
//   - MAPE rating classification
//   - Alert flag generation when thresholds breached
//   - 4-trigger auto-recalibration engine
//   - Rolling-origin backtest
//   - Product-level recalibration status checking
// ============================================

// =============================================
// Section 1: Types
// =============================================

/** Full metrics result including alerts */
export interface MetricsResult {
  mape: number;
  mae: number;
  mse: number;
  rmse: number;
  bias: number;
  historicalStd: number;
  mapeRating: 'excellent' | 'good' | 'fair' | 'poor' | 'unusable';
  alerts: MetricAlert[];
  nObservations: number;
}

/** A single metric alert */
export interface MetricAlert {
  level: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
}

/** A single recalibration action taken */
export interface RecalibrationAction {
  trigger: number;
  triggerName: string;
  description: string;
  beforeValue: Record<string, unknown>;
  afterValue: Record<string, unknown>;
}

/** Result of running auto-recalibration for one SKU */
export interface RecalibrationResult {
  tenantId: string;
  skuId: string;
  metrics: MetricsResult;
  actionsTaken: RecalibrationAction[];
  newConfig: Record<string, unknown>;
  recalibrationNeeded: boolean;
}

/** Result of a rolling-origin backtest */
export interface BacktestResult {
  productId: string;
  trainPct: number;
  resultsByModel: Record<string, MetricsResult>;
  bestModel: string;
  bestMAPE: number;
  totalDataPoints: number;
}

/** A product needing recalibration */
export interface RecalibrationCandidate {
  tenantId: string;
  skuId: string;
  productName: string;
  currentMAPE: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  mapeRating: MetricsResult['mapeRating'];
  recommendedActions: string[];
}

/** Grouped recalibration status */
export interface RecalibrationStatusResult {
  totalProducts: number;
  productsNeedingRecalibration: number;
  byUrgency: Record<'critical' | 'high' | 'medium' | 'low', number>;
  candidates: RecalibrationCandidate[];
  checkedAt: string;
}

// =============================================
// Section 2: Configuration
// =============================================

/** Thresholds for recalibration triggers */
export interface RecalibrationThresholds {
  /** MAPE threshold for Trigger 1 (default 10%) */
  mapeThreshold: number;
  /** RMSE/MAE ratio threshold for Trigger 2 (default 1.15) */
  outlierRatioThreshold: number;
  /** MAE vs historical std dev for Trigger 3 (default 1.0) */
  maeVsStdThreshold: number;
  /** Bias vs MAE ratio threshold for Trigger 4 (default 0.1) */
  biasRatioThreshold: number;
  /** Alpha adjustment step for auto-tune (default 0.05) */
  alphaStep: number;
  /** Maximum alpha value (default 0.95) */
  maxAlpha: number;
  /** Minimum alpha value (default 0.05) */
  minAlpha: number;
  /** Default changepoint prior scale for Prophet (default 0.05) */
  defaultChangepointPriorScale: number;
  /** Sigma threshold increase factor for outlier detection (default 1.5) */
  sigmaIncreaseFactor: number;
}

export const DEFAULT_RECALIBRATION_THRESHOLDS: RecalibrationThresholds = {
  mapeThreshold: 10,
  outlierRatioThreshold: 1.15,
  maeVsStdThreshold: 1.0,
  biasRatioThreshold: 0.1,
  alphaStep: 0.05,
  maxAlpha: 0.95,
  minAlpha: 0.05,
  defaultChangepointPriorScale: 0.05,
  sigmaIncreaseFactor: 1.5,
};

// =============================================
// Section 3: Metrics Calculation
// =============================================

/**
 * Classify MAPE into a rating category.
 *
 * - excellent: 0-5%
 * - good: 5-10%
 * - fair: 10-20%
 * - poor: 20-50%
 * - unusable: >50%
 *
 * @param mape - MAPE value in percentage
 * @returns Rating category
 */
export function classifyMAPE(mape: number): MetricsResult['mapeRating'] {
  if (mape <= 5)  return 'excellent';
  if (mape <= 10) return 'good';
  if (mape <= 20) return 'fair';
  if (mape <= 50) return 'poor';
  return 'unusable';
}

/**
 * Calculate full metrics with alerts.
 *
 * Computes: MAPE, MAE, MSE, RMSE, Bias, Historical std dev,
 * MAPE rating, and alert flags.
 *
 * @param actuals - Array of actual values
 * @param forecasts - Array of forecast values (same length)
 * @param thresholds - Optional custom thresholds for alerts
 * @returns Full metrics result
 */
export function calculateAllMetrics(
  actuals: number[],
  forecasts: number[],
  thresholds: Partial<RecalibrationThresholds> = {}
): MetricsResult {
  const config = { ...DEFAULT_RECALIBRATION_THRESHOLDS, ...thresholds };
  const alerts: MetricAlert[] = [];

  // Edge cases
  if (actuals.length === 0 || forecasts.length === 0) {
    return {
      mape: 0,
      mae: 0,
      mse: 0,
      rmse: 0,
      bias: 0,
      historicalStd: 0,
      mapeRating: 'excellent',
      alerts: [{
        level: 'warning',
        metric: 'nObservations',
        value: 0,
        threshold: 1,
        message: 'No observations provided for metrics calculation',
      }],
      nObservations: 0,
    };
  }

  const n = Math.min(actuals.length, forecasts.length);
  let sumAbsPctError = 0;
  let sumAbsError = 0;
  let sumSquaredError = 0;
  let sumError = 0;
  let pctErrorCount = 0;

  for (let i = 0; i < n; i++) {
    const error = forecasts[i] - actuals[i];
    sumAbsError += Math.abs(error);
    sumSquaredError += error * error;
    sumError += error;

    if (actuals[i] !== 0) {
      sumAbsPctError += Math.abs(error / actuals[i]);
      pctErrorCount++;
    }
  }

  // MAPE (percentage)
  const mape = pctErrorCount > 0
    ? (sumAbsPctError / pctErrorCount) * 100
    : 0;

  // MAE
  const mae = sumAbsError / n;

  // MSE
  const mse = sumSquaredError / n;

  // RMSE
  const rmse = Math.sqrt(mse);

  // Bias (mean error)
  const bias = sumError / n;

  // Historical standard deviation of actuals
  const actualMean = actuals.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const historicalStd = Math.sqrt(
    actuals.slice(0, n).reduce((sum, v) => sum + Math.pow(v - actualMean, 2), 0) / n
  );

  // MAPE rating
  const mapeRating = classifyMAPE(mape);

  // Generate alerts based on thresholds

  // Alert: High MAPE
  if (mape > config.mapeThreshold) {
    const level = mape > config.mapeThreshold * 2 ? 'critical' : 'warning';
    alerts.push({
      level,
      metric: 'MAPE',
      value: mape,
      threshold: config.mapeThreshold,
      message: `MAPE ${mape.toFixed(1)}% exceeds ${config.mapeThreshold}% threshold`,
    });
  }

  // Alert: Outlier dominance (RMSE significantly larger than MAE)
  if (mae > 0 && rmse / mae > config.outlierRatioThreshold) {
    alerts.push({
      level: 'warning',
      metric: 'RMSE/MAE',
      value: rmse / mae,
      threshold: config.outlierRatioThreshold,
      message: `Outlier dominance detected: RMSE/MAE ratio ${(rmse / mae).toFixed(2)} > ${config.outlierRatioThreshold}`,
    });
  }

  // Alert: Worse than average (MAE > historical std dev)
  if (historicalStd > 0 && mae > historicalStd * config.maeVsStdThreshold) {
    const level = mae > historicalStd * 2 ? 'critical' : 'warning';
    alerts.push({
      level,
      metric: 'MAE',
      value: mae,
      threshold: historicalStd * config.maeVsStdThreshold,
      message: `MAE ${mae.toFixed(1)} exceeds historical std dev ${historicalStd.toFixed(1)}`,
    });
  }

  // Alert: Systematic bias
  if (mae > 0 && Math.abs(bias) / mae > config.biasRatioThreshold) {
    const level = Math.abs(bias) / mae > config.biasRatioThreshold * 3 ? 'critical' : 'warning';
    alerts.push({
      level,
      metric: 'Bias',
      value: Math.abs(bias),
      threshold: mae * config.biasRatioThreshold,
      message: `Systematic bias detected: |Bias|/MAE = ${(Math.abs(bias) / mae).toFixed(3)} > ${config.biasRatioThreshold}`,
    });
  }

  return {
    mape: Math.round(mape * 100) / 100,
    mae: Math.round(mae * 100) / 100,
    mse: Math.round(mse * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    bias: Math.round(bias * 100) / 100,
    historicalStd: Math.round(historicalStd * 100) / 100,
    mapeRating,
    alerts,
    nObservations: n,
  };
}

// =============================================
// Section 4: Auto-Recalibration Engine
// =============================================

/**
 * Run the 4-trigger auto-recalibration engine.
 *
 * Trigger 1: High MAPE > 10%
 *   -> Auto-tune alpha, adjust Prophet changepoint_prior_scale
 *
 * Trigger 2: Outlier dominance (RMSE > 1.15 * MAE)
 *   -> Increase sigma threshold
 *
 * Trigger 3: Worse than average (MAE > historical sigma)
 *   -> Flag for audit
 *
 * Trigger 4: Systematic bias (|Bias| > 0.1 * MAE)
 *   -> Apply bias correction
 *
 * @param params.tenantId - Tenant identifier
 * @param params.skuId - SKU identifier
 * @param params.actuals - Historical actual demand values
 * @param params.forecasts - Historical forecast values
 * @param params.currentAlpha - Current smoothing alpha (default 0.3)
 * @param params.currentChangepointPriorScale - Current Prophet changepoint prior scale
 * @param params.currentSigmaThreshold - Current sigma threshold for outlier detection
 * @param params.thresholds - Optional custom thresholds
 * @returns Recalibration result with actions taken and new config
 */
export function runRecalibration(params: {
  tenantId: string;
  skuId: string;
  actuals: number[];
  forecasts: number[];
  currentAlpha?: number;
  currentChangepointPriorScale?: number;
  currentSigmaThreshold?: number;
  thresholds?: Partial<RecalibrationThresholds>;
}): RecalibrationResult {
  const {
    tenantId,
    skuId,
    actuals,
    forecasts,
    currentAlpha = 0.3,
    currentChangepointPriorScale = 0.05,
    currentSigmaThreshold = 2.0,
    thresholds = {},
  } = params;

  const config = { ...DEFAULT_RECALIBRATION_THRESHOLDS, ...thresholds };
  const actions: RecalibrationAction[] = [];
  const newConfig: Record<string, unknown> = {
    alpha: currentAlpha,
    changepointPriorScale: currentChangepointPriorScale,
    sigmaThreshold: currentSigmaThreshold,
    biasCorrection: 0,
  };

  // Calculate full metrics
  const metrics = calculateAllMetrics(actuals, forecasts, config);

  // Trigger 1: High MAPE -> auto-tune alpha, adjust changepoint_prior_scale
  if (metrics.mape > config.mapeThreshold) {
    // Auto-tune alpha: increase alpha to make model more responsive
    // Higher alpha = more weight on recent observations
    let newAlpha = currentAlpha + config.alphaStep;

    // If MAPE is very high, increase alpha more aggressively
    if (metrics.mape > config.mapeThreshold * 2) {
      newAlpha = currentAlpha + config.alphaStep * 3;
    }

    // Clamp alpha
    newAlpha = Math.min(config.maxAlpha, Math.max(config.minAlpha, newAlpha));

    // Adjust changepoint_prior_scale: increase to allow more trend changes
    const mapeRatio = metrics.mape / config.mapeThreshold;
    const newCPS = Math.min(0.5, currentChangepointPriorScale * (1 + (mapeRatio - 1) * 0.3));

    actions.push({
      trigger: 1,
      triggerName: 'HIGH_MAPE',
      description: `MAPE ${metrics.mape.toFixed(1)}% exceeds ${config.mapeThreshold}% threshold. ` +
        `Auto-tuning alpha from ${currentAlpha.toFixed(2)} to ${newAlpha.toFixed(2)}, ` +
        `changepoint_prior_scale from ${currentChangepointPriorScale.toFixed(3)} to ${newCPS.toFixed(3)}.`,
      beforeValue: {
        alpha: currentAlpha,
        changepointPriorScale: currentChangepointPriorScale,
      },
      afterValue: {
        alpha: newAlpha,
        changepointPriorScale: newCPS,
      },
    });

    newConfig.alpha = newAlpha;
    newConfig.changepointPriorScale = newCPS;
  }

  // Trigger 2: Outlier dominance -> increase sigma threshold
  if (metrics.mae > 0 && metrics.rmse / metrics.mae > config.outlierRatioThreshold) {
    const newSigmaThreshold = currentSigmaThreshold * config.sigmaIncreaseFactor;

    actions.push({
      trigger: 2,
      triggerName: 'OUTLIER_DOMINANCE',
      description: `RMSE/MAE ratio ${(metrics.rmse / metrics.mae).toFixed(2)} exceeds ${config.outlierRatioThreshold}. ` +
        `Increasing sigma threshold from ${currentSigmaThreshold.toFixed(1)} to ${newSigmaThreshold.toFixed(1)} ` +
        `to reduce outlier sensitivity.`,
      beforeValue: { sigmaThreshold: currentSigmaThreshold },
      afterValue: { sigmaThreshold: newSigmaThreshold },
    });

    newConfig.sigmaThreshold = newSigmaThreshold;
  }

  // Trigger 3: Worse than average -> flag for audit
  if (metrics.historicalStd > 0 && metrics.mae > metrics.historicalStd * config.maeVsStdThreshold) {
    actions.push({
      trigger: 3,
      triggerName: 'WORSE_THAN_AVERAGE',
      description: `MAE ${metrics.mae.toFixed(1)} exceeds historical std dev ${metrics.historicalStd.toFixed(1)}. ` +
        `Flagged for audit. Model performance is worse than naive average forecast.`,
      beforeValue: { mae: metrics.mae, historicalStd: metrics.historicalStd },
      afterValue: { flaggedForAudit: true },
    });

    newConfig.flaggedForAudit = true;
  }

  // Trigger 4: Systematic bias -> apply bias correction
  if (metrics.mae > 0 && Math.abs(metrics.bias) / metrics.mae > config.biasRatioThreshold) {
    // Bias correction: subtract the mean bias from forecasts
    // Negative bias = forecasts too high (over-forecast), positive = too low (under-forecast)
    const biasCorrection = -metrics.bias; // Counter-bias

    actions.push({
      trigger: 4,
      triggerName: 'SYSTEMATIC_BIAS',
      description: `Systematic bias detected: |Bias|/MAE = ${(Math.abs(metrics.bias) / metrics.mae).toFixed(3)} > ${config.biasRatioThreshold}. ` +
        `Applying bias correction of ${biasCorrection.toFixed(1)} units. ` +
        `Bias direction: ${metrics.bias > 0 ? 'under-forecast' : 'over-forecast'}.`,
      beforeValue: { bias: metrics.bias, biasRatio: Math.abs(metrics.bias) / metrics.mae },
      afterValue: { biasCorrection, correctedBias: 0 },
    });

    newConfig.biasCorrection = biasCorrection;
  }

  const recalibrationNeeded = actions.length > 0;

  return {
    tenantId,
    skuId,
    metrics,
    actionsTaken: actions,
    newConfig,
    recalibrationNeeded,
  };
}

// =============================================
// Section 5: Bias Correction Application
// =============================================

/**
 * Apply bias correction to a set of forecasts.
 *
 * @param forecasts - Array of forecast values
 * @param biasCorrection - Bias correction amount (from recalibration)
 * @returns Corrected forecast values
 */
export function applyBiasCorrection(
  forecasts: number[],
  biasCorrection: number
): number[] {
  return forecasts.map(f => Math.max(0, Math.round(f + biasCorrection)));
}

/**
 * Apply full recalibration config to forecasts.
 *
 * Applies bias correction and optionally adjusts with new alpha
 * via exponential smoothing re-fit.
 *
 * @param actuals - Recent actual demand values
 * @param forecasts - Current forecast values
 * @param config - New config from recalibration result
 * @returns Adjusted forecast values
 */
export function applyRecalibrationConfig(
  actuals: number[],
  forecasts: number[],
  config: Record<string, unknown>
): number[] {
  let adjusted = [...forecasts];

  // Apply bias correction
  if (typeof config.biasCorrection === 'number' && config.biasCorrection !== 0) {
    adjusted = applyBiasCorrection(adjusted, config.biasCorrection);
  }

  // Apply alpha re-smoothing if we have actuals
  if (typeof config.alpha === 'number' && actuals.length > 1) {
    const alpha = config.alpha as number;
    // Re-smooth using the new alpha
    let smoothed = actuals[0];
    for (let i = 1; i < actuals.length; i++) {
      smoothed = alpha * actuals[i] + (1 - alpha) * smoothed;
    }
    // Blend the smoothed value with the forecast
    // Use the last actual as anchor and blend forward
    for (let i = 0; i < adjusted.length; i++) {
      const blendWeight = Math.max(0.1, Math.min(0.5, alpha * 0.5));
      adjusted[i] = Math.round(
        (1 - blendWeight) * adjusted[i] + blendWeight * smoothed
      );
    }
  }

  return adjusted;
}

// =============================================
// Section 6: Rolling Origin Backtest
// =============================================

/** Backtest configuration */
export interface BacktestConfig {
  /** Training data percentage (default 0.8 = 80%) */
  trainPct: number;
  /** Minimum number of data points required */
  minDataPoints: number;
  /** Rolling window size (default 6) */
  rollingWindowSize: number;
}

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  trainPct: 0.8,
  minDataPoints: 12,
  rollingWindowSize: 6,
};

/**
 * Simple forecast model for backtest comparison.
 * Each model is a function that trains on data and returns forecasts.
 */
export type BacktestModel = {
  name: string;
  fit: (train: number[], horizon: number) => number[];
};

/** Built-in simple models for backtest */
const BUILTIN_MODELS: BacktestModel[] = [
  {
    name: 'moving_average',
    fit: (train: number[], horizon: number): number[] => {
      if (train.length < 3) return Array(horizon).fill(train[train.length - 1] ?? 0);
      const avg = train.slice(-3).reduce((a, b) => a + b, 0) / 3;
      return Array(horizon).fill(Math.round(avg));
    },
  },
  {
    name: 'exp_smoothing',
    fit: (train: number[], horizon: number): number[] => {
      if (train.length < 2) return Array(horizon).fill(train[train.length - 1] ?? 0);
      const alpha = 0.3;
      let smoothed = train[0];
      for (let i = 1; i < train.length; i++) {
        smoothed = alpha * train[i] + (1 - alpha) * smoothed;
      }
      return Array(horizon).fill(Math.round(smoothed));
    },
  },
  {
    name: 'naive',
    fit: (train: number[], horizon: number): number[] => {
      const last = train[train.length - 1] ?? 0;
      return Array(horizon).fill(Math.round(last));
    },
  },
  {
    name: 'seasonal_naive',
    fit: (train: number[], horizon: number): number[] => {
      if (train.length < 12) {
        const last = train[train.length - 1] ?? 0;
        return Array(horizon).fill(Math.round(last));
      }
      // Use same month from previous year
      return Array.from({ length: horizon }, (_, i) => {
        const idx = train.length - 12 + (i % 12);
        return Math.round(train[idx] ?? train[train.length - 1] ?? 0);
      });
    },
  },
];

/**
 * Run rolling-origin backtest.
 *
 * Train on first 80%, test on last 20%.
 * Rolling window evaluation.
 * Compare models and pick best by MAPE.
 *
 * @param params.productId - Product identifier
 * @param params.data - Full time series of actual values
 * @param params.models - Optional custom models (default: built-in 4 models)
 * @param params.config - Optional backtest configuration
 * @returns Backtest result with per-model metrics and best model selection
 */
export function runBacktest(params: {
  productId: string;
  data: number[];
  models?: BacktestModel[];
  config?: Partial<BacktestConfig>;
}): BacktestResult {
  const { productId, data, models = BUILTIN_MODELS } = params;
  const config = { ...DEFAULT_BACKTEST_CONFIG, ...params.config };

  // Edge cases
  if (data.length < config.minDataPoints) {
    return {
      productId,
      trainPct: config.trainPct,
      resultsByModel: {},
      bestModel: 'insufficient_data',
      bestMAPE: Infinity,
      totalDataPoints: data.length,
    };
  }

  // Split into train and test
  const splitIdx = Math.floor(data.length * config.trainPct);
  const train = data.slice(0, splitIdx);
  const test = data.slice(splitIdx);

  if (train.length === 0 || test.length === 0) {
    return {
      productId,
      trainPct: config.trainPct,
      resultsByModel: {},
      bestModel: 'insufficient_data',
      bestMAPE: Infinity,
      totalDataPoints: data.length,
    };
  }

  // Evaluate each model
  const resultsByModel: Record<string, MetricsResult> = {};
  let bestModel = '';
  let bestMAPE = Infinity;

  for (const model of models) {
    // Rolling window evaluation
    const allActuals: number[] = [];
    const allForecasts: number[] = [];

    const windowSize = Math.min(config.rollingWindowSize, test.length);

    for (let start = 0; start <= test.length - windowSize; start++) {
      // Extend training data with test data seen so far
      const extendedTrain = [...train, ...test.slice(0, start)];
      const horizon = windowSize;

      try {
        const forecasts = model.fit(extendedTrain, horizon);

        for (let j = 0; j < horizon && start + j < test.length; j++) {
          allActuals.push(test[start + j]);
          allForecasts.push(forecasts[j] ?? 0);
        }
      } catch {
        // Model failed on this window, skip
        continue;
      }
    }

    if (allActuals.length > 0) {
      const metrics = calculateAllMetrics(allActuals, allForecasts);
      resultsByModel[model.name] = metrics;

      if (metrics.mape < bestMAPE) {
        bestMAPE = metrics.mape;
        bestModel = model.name;
      }
    }
  }

  // If no model succeeded, fall back to naive
  if (bestModel === '') {
    bestModel = 'naive';
    bestMAPE = resultsByModel['naive']?.mape ?? Infinity;
  }

  return {
    productId,
    trainPct: config.trainPct,
    resultsByModel,
    bestModel,
    bestMAPE: Math.round(bestMAPE * 100) / 100,
    totalDataPoints: data.length,
  };
}

// =============================================
// Section 7: Backtest with Custom Alpha Sweep
// =============================================

/** Extended backtest result with alpha sweep */
export interface AlphaSweepResult {
  alpha: number;
  mape: number;
  mae: number;
}

/**
 * Run backtest with alpha sweep for exponential smoothing.
 *
 * Tests multiple alpha values to find the optimal smoothing parameter.
 *
 * @param data - Time series data
 * @param alphaRange - Array of alpha values to test
 * @param config - Optional backtest configuration
 * @returns Array of alpha -> MAPE results
 */
export function runAlphaSweepBacktest(
  data: number[],
  alphaRange: number[] = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
  config: Partial<BacktestConfig> = {}
): AlphaSweepResult[] {
  const btConfig = { ...DEFAULT_BACKTEST_CONFIG, ...config };

  if (data.length < btConfig.minDataPoints) {
    return alphaRange.map(alpha => ({ alpha, mape: Infinity, mae: Infinity }));
  }

  const splitIdx = Math.floor(data.length * btConfig.trainPct);
  const train = data.slice(0, splitIdx);
  const test = data.slice(splitIdx);

  if (train.length === 0 || test.length === 0) {
    return alphaRange.map(alpha => ({ alpha, mape: Infinity, mae: Infinity }));
  }

  return alphaRange.map(alpha => {
    const model: BacktestModel = {
      name: `exp_smoothing_a${alpha}`,
      fit: (t: number[], h: number): number[] => {
        if (t.length < 2) return Array(h).fill(t[t.length - 1] ?? 0);
        let smoothed = t[0];
        for (let i = 1; i < t.length; i++) {
          smoothed = alpha * t[i] + (1 - alpha) * smoothed;
        }
        return Array(h).fill(Math.round(smoothed));
      },
    };

    // Simple evaluation: forecast from train, compare to test
    try {
      const forecasts = model.fit(train, test.length);
      const metrics = calculateAllMetrics(test, forecasts);
      return {
        alpha,
        mape: metrics.mape,
        mae: metrics.mae,
      };
    } catch {
      return { alpha, mape: Infinity, mae: Infinity };
    }
  });
}

// =============================================
// Section 8: Product Recalibration Status Check
// =============================================

/**
 * Determine urgency level for a product based on MAPE.
 *
 * @param mape - Current MAPE value
 * @param threshold - MAPE threshold (default 10%)
 * @returns Urgency level
 */
export function determineUrgency(
  mape: number,
  threshold: number = 10
): 'critical' | 'high' | 'medium' | 'low' {
  const ratio = mape / threshold;

  if (ratio <= 1.0)  return 'low';
  if (ratio <= 1.5)  return 'medium';
  if (ratio <= 2.5)  return 'high';
  return 'critical';
}

/**
 * Generate recommended actions based on metrics.
 *
 * @param metrics - Full metrics result
 * @returns Array of recommended action descriptions
 */
export function generateRecommendedActions(metrics: MetricsResult): string[] {
  const actions: string[] = [];

  if (metrics.mapeRating === 'poor' || metrics.mapeRating === 'unusable') {
    actions.push('Switch to ensemble model or re-run Prophet with adjusted changepoint prior');
  }

  if (metrics.mapeRating === 'fair') {
    actions.push('Review recent demand patterns for structural changes');
  }

  // Check for bias
  if (metrics.mae > 0 && Math.abs(metrics.bias) / metrics.mae > 0.1) {
    if (metrics.bias > 0) {
      actions.push('Address under-forecasting bias: consider increasing seasonal weights or adding marketing uplift');
    } else {
      actions.push('Address over-forecasting bias: consider reducing seasonal weights or lowering base forecast');
    }
  }

  // Check for outlier issues
  if (metrics.mae > 0 && metrics.rmse / metrics.mae > 1.15) {
    actions.push('Investigate outliers in recent data: check for one-time events, data errors, or promo spikes');
  }

  // Check MAE vs historical variability
  if (metrics.historicalStd > 0 && metrics.mae > metrics.historicalStd) {
    actions.push('Model performance worse than naive average: consider model switch or manual override');
  }

  if (actions.length === 0) {
    actions.push('Monitor accuracy trends; no immediate action required');
  }

  return actions;
}

/**
 * Check which products need recalibration.
 *
 * This is a pure computation version that works with
 * pre-loaded data rather than querying the database.
 *
 * @param products - Array of product data with actuals and forecasts
 * @param mapeThreshold - MAPE threshold for flagging (default 10%)
 * @returns Grouped recalibration status
 */
export function checkRecalibrationStatus(products: Array<{
  tenantId: string;
  skuId: string;
  productName: string;
  actuals: number[];
  forecasts: number[];
}>): RecalibrationStatusResult {
  const candidates: RecalibrationCandidate[] = [];
  const byUrgency: Record<'critical' | 'high' | 'medium' | 'low', number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const product of products) {
    if (product.actuals.length === 0 || product.forecasts.length === 0) {
      continue;
    }

    const metrics = calculateAllMetrics(product.actuals, product.forecasts);
    const urgency = determineUrgency(metrics.mape);
    const recommendedActions = generateRecommendedActions(metrics);

    // Only include products that are not excellent
    if (metrics.mapeRating !== 'excellent') {
      candidates.push({
        tenantId: product.tenantId,
        skuId: product.skuId,
        productName: product.productName,
        currentMAPE: metrics.mape,
        urgency,
        mapeRating: metrics.mapeRating,
        recommendedActions,
      });
    }

    byUrgency[urgency]++;
  }

  // Sort by urgency (critical first)
  const urgencyOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  candidates.sort((a, b) => urgencyOrder[b.urgency] - urgencyOrder[a.urgency]);

  return {
    totalProducts: products.length,
    productsNeedingRecalibration: candidates.length,
    byUrgency,
    candidates,
    checkedAt: new Date().toISOString(),
  };
}

// =============================================
// Section 9: Forecast Accuracy Tracking
// =============================================

/** Accuracy trend data point */
export interface AccuracyTrendPoint {
  period: string;
  mape: number;
  mae: number;
  bias: number;
  nObservations: number;
}

/** Accuracy trend analysis result */
export interface AccuracyTrendResult {
  trend: 'improving' | 'stable' | 'degrading';
  slope: number;            // MAPE change per period
  currentMAPE: number;
  averageMAPE: number;
  bestMAPE: number;
  worstMAPE: number;
  periodsAnalyzed: number;
  data: AccuracyTrendPoint[];
}

/**
 * Analyze accuracy trend over time.
 *
 * Uses linear regression on MAPE values to determine
 * if accuracy is improving, stable, or degrading.
 *
 * @param trendData - Array of periodic accuracy measurements
 * @returns Trend analysis result
 */
export function analyzeAccuracyTrend(
  trendData: AccuracyTrendPoint[]
): AccuracyTrendResult {
  if (trendData.length < 2) {
    return {
      trend: 'stable',
      slope: 0,
      currentMAPE: trendData[0]?.mape ?? 0,
      averageMAPE: trendData[0]?.mape ?? 0,
      bestMAPE: trendData[0]?.mape ?? 0,
      worstMAPE: trendData[0]?.mape ?? 0,
      periodsAnalyzed: trendData.length,
      data: trendData,
    };
  }

  const mapes = trendData.map(d => d.mape);
  const n = mapes.length;

  // Linear regression for slope
  const xMean = (n - 1) / 2;
  const yMean = mapes.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (mapes[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  const slope = den !== 0 ? num / den : 0;

  // Classify trend
  let trend: AccuracyTrendResult['trend'];
  if (slope < -0.5) trend = 'improving';     // MAPE decreasing
  else if (slope > 0.5) trend = 'degrading';  // MAPE increasing
  else trend = 'stable';

  return {
    trend,
    slope: Math.round(slope * 1000) / 1000,
    currentMAPE: mapes[n - 1],
    averageMAPE: Math.round(yMean * 100) / 100,
    bestMAPE: Math.round(Math.min(...mapes) * 100) / 100,
    worstMAPE: Math.round(Math.max(...mapes) * 100) / 100,
    periodsAnalyzed: n,
    data: trendData,
  };
}

// =============================================
// Section 10: Combined Recalibration + Backtest
// =============================================

/** Combined result of recalibration + backtest */
export interface FullRecalibrationReport {
  recalibration: RecalibrationResult;
  backtest: BacktestResult | null;
  accuracyTrend: AccuracyTrendResult | null;
  recommendation: string;
}

/**
 * Run a full recalibration report combining metrics,
 * recalibration, backtest, and trend analysis.
 *
 * @param params - Recalibration parameters (same as runRecalibration)
 * @param historicalData - Optional full historical data for backtest
 * @param trendData - Optional accuracy trend data points
 * @returns Full recalibration report
 */
export function runFullRecalibrationReport(
  params: Parameters<typeof runRecalibration>[0],
  historicalData?: number[],
  trendData?: AccuracyTrendPoint[]
): FullRecalibrationReport {
  // Run recalibration
  const recalibration = runRecalibration(params);

  // Run backtest if historical data provided
  let backtest: BacktestResult | null = null;
  if (historicalData && historicalData.length >= 12) {
    backtest = runBacktest({
      productId: params.skuId,
      data: historicalData,
    });
  }

  // Analyze trend if data provided
  let accuracyTrend: AccuracyTrendResult | null = null;
  if (trendData && trendData.length >= 2) {
    accuracyTrend = analyzeAccuracyTrend(trendData);
  }

  // Generate recommendation
  let recommendation = '';

  if (!recalibration.recalibrationNeeded) {
    recommendation = `Forecast accuracy is acceptable (MAPE ${recalibration.metrics.mape.toFixed(1)}%, ` +
      `rating: ${recalibration.metrics.mapeRating}). No recalibration needed.`;
  } else {
    const parts: string[] = [];

    parts.push(`Recalibration needed (MAPE ${recalibration.metrics.mape.toFixed(1)}%, ` +
      `rating: ${recalibration.metrics.mapeRating}).`);

    for (const action of recalibration.actionsTaken) {
      parts.push(`Trigger ${action.trigger} (${action.triggerName}): ${action.description}`);
    }

    if (backtest && backtest.bestModel) {
      parts.push(`Backtest recommends ${backtest.bestModel} model ` +
        `(best MAPE: ${backtest.bestMAPE.toFixed(1)}%).`);
    }

    if (accuracyTrend) {
      parts.push(`Accuracy trend: ${accuracyTrend.trend} ` +
        `(slope: ${accuracyTrend.slope > 0 ? '+' : ''}${accuracyTrend.slope.toFixed(2)} per period).`);
    }

    recommendation = parts.join(' ');
  }

  return {
    recalibration,
    backtest,
    accuracyTrend,
    recommendation,
  };
}

// =============================================
// Section 11: Utility Functions
// =============================================

/**
 * Calculate percentage of forecasts within a tolerance band.
 *
 * @param actuals - Array of actual values
 * @param forecasts - Array of forecast values
 * @param tolerancePct - Tolerance percentage (e.g., 20 for +/-20%)
 * @returns Percentage of forecasts within tolerance
 */
export function pctWithinTolerance(
  actuals: number[],
  forecasts: number[],
  tolerancePct: number
): number {
  if (actuals.length === 0) return 0;

  let within = 0;
  let count = 0;

  for (let i = 0; i < Math.min(actuals.length, forecasts.length); i++) {
    if (actuals[i] !== 0) {
      const pctError = Math.abs((forecasts[i] - actuals[i]) / actuals[i]) * 100;
      if (pctError <= tolerancePct) within++;
      count++;
    }
  }

  return count > 0 ? Math.round((within / count) * 10000) / 100 : 0;
}

/**
 * Calculate Theil's U statistic.
 *
 * U = RMSE(forecast) / RMSE(naive)
 * U < 1: forecast better than naive
 * U = 1: forecast same as naive
 * U > 1: forecast worse than naive
 *
 * @param actuals - Array of actual values
 * @param forecasts - Array of forecast values
 * @returns Theil's U statistic
 */
export function calculateTheilsU(
  actuals: number[],
  forecasts: number[]
): number {
  const n = Math.min(actuals.length, forecasts.length);
  if (n < 2) return 1;

  // Forecast RMSE
  let sumFCErr = 0;
  let fcCount = 0;
  for (let i = 0; i < n; i++) {
    sumFCErr += Math.pow((forecasts[i] - actuals[i]) / actuals[i - 1] || 1, 2);
    fcCount++;
  }

  // Naive forecast RMSE (random walk: forecast = last actual)
  let sumNaiveErr = 0;
  let naiveCount = 0;
  for (let i = 1; i < n; i++) {
    const naiveForecast = actuals[i - 1];
    if (actuals[i - 1] !== 0) {
      sumNaiveErr += Math.pow((actuals[i] - naiveForecast) / actuals[i - 1], 2);
      naiveCount++;
    }
  }

  if (naiveCount === 0 || sumNaiveErr === 0) return 1;

  const forecastRMSE = Math.sqrt(sumFCErr / fcCount);
  const naiveRMSE = Math.sqrt(sumNaiveErr / naiveCount);

  return Math.round((forecastRMSE / naiveRMSE) * 1000) / 1000;
}

/**
 * Calculate forecast value added (FVA).
 *
 * FVA = MAPE(naive) - MAPE(forecast)
 * Positive FVA = forecast adds value over naive
 * Negative FVA = forecast is worse than naive
 *
 * @param actuals - Array of actual values
 * @param forecasts - Array of forecast values
 * @returns FVA value (percentage points)
 */
export function calculateFVA(
  actuals: number[],
  forecasts: number[]
): number {
  const n = Math.min(actuals.length, forecasts.length);
  if (n < 2) return 0;

  // Forecast MAPE
  const forecastMetrics = calculateAllMetrics(actuals, forecasts);

  // Naive MAPE
  const naiveForecasts: number[] = [];
  for (let i = 1; i < n; i++) {
    naiveForecasts.push(actuals[i - 1]);
  }
  const naiveMetrics = calculateAllMetrics(
    actuals.slice(1, n),
    naiveForecasts
  );

  return Math.round((naiveMetrics.mape - forecastMetrics.mape) * 100) / 100;
}

/**
 * Generate a summary string for a metrics result.
 *
 * @param metrics - Metrics to summarize
 * @returns Human-readable summary
 */
export function summarizeMetrics(metrics: MetricsResult): string {
  const lines: string[] = [];
  lines.push(`MAPE: ${metrics.mape.toFixed(1)}% (${metrics.mapeRating})`);
  lines.push(`MAE: ${metrics.mae.toFixed(1)}`);
  lines.push(`RMSE: ${metrics.rmse.toFixed(1)}`);
  lines.push(`Bias: ${metrics.bias.toFixed(1)} (${metrics.bias > 0 ? 'under' : 'over'}-forecast)`);
  lines.push(`Historical Std Dev: ${metrics.historicalStd.toFixed(1)}`);
  lines.push(`Observations: ${metrics.nObservations}`);

  if (metrics.alerts.length > 0) {
    lines.push(`Alerts: ${metrics.alerts.length}`);
    for (const alert of metrics.alerts) {
      lines.push(`  - [${alert.level}] ${alert.message}`);
    }
  }

  return lines.join('\n');
}
