// ============================================
// TrimedCast EOQ & Safety Stock Engine
// Session 8: Order Trigger & Lead Time Logic
//
// Implements:
//   - EOQ with constraints (MOQ, max_stock, warehouse capacity)
//   - Safety Stock: SS = (EOQ/R) + (MAE × μₜ × σ_LT) × k
//   - σ_LT from purchase_history actual_lead_time_days
//   - Service level → safety factor k mapping
//   - Enhanced error metrics (MAPE, MAE, MSE, RMSE)
//   - Auto-recalibration trigger when MAPE > threshold
// ============================================

// =============================================
// Section 1: Service Level → Safety Factor (k)
// =============================================

/** Service level to z-score (safety factor k) mapping table */
export const SERVICE_LEVEL_FACTORS: Record<number, number> = {
  0.90: 1.28,   // Low-criticality parts (decorative, optional accessories)
  0.95: 1.65,   // Standard parts (default for most motorcycle parts)
  0.975: 1.96,  // High-turnover parts (brake pads, spark plugs, oil filters)
  0.99: 2.33,   // Critical parts (brake assemblies, engine components)
  0.999: 3.09,  // Life-critical parts (brake discs, steering components)
};

export interface ServiceLevelInfo {
  serviceLevel: number;
  k: number;
  description: string;
  useCase: string;
}

export const SERVICE_LEVEL_TABLE: ServiceLevelInfo[] = [
  { serviceLevel: 0.90, k: 1.28, description: '90% service level', useCase: 'Low-criticality parts (decorative, optional accessories)' },
  { serviceLevel: 0.95, k: 1.65, description: '95% service level', useCase: 'Standard parts (default for most motorcycle parts)' },
  { serviceLevel: 0.975, k: 1.96, description: '97.5% service level', useCase: 'High-turnover parts (brake pads, spark plugs, oil filters)' },
  { serviceLevel: 0.99, k: 2.33, description: '99% service level', useCase: 'Critical parts (brake assemblies, engine components — stockout = safety risk)' },
  { serviceLevel: 0.999, k: 3.09, description: '99.9% service level', useCase: 'Life-critical parts (brake discs, steering components)' },
];

/**
 * Map service level to safety factor (z-score/k).
 * Supports exact matches and linear interpolation between defined levels.
 * Clamps to [1.28, 3.09] for out-of-range values.
 */
export function getSafetyFactor(serviceLevel: number): number {
  // Exact match
  if (SERVICE_LEVEL_FACTORS[serviceLevel] !== undefined) {
    return SERVICE_LEVEL_FACTORS[serviceLevel];
  }

  // Linear interpolation between two nearest defined levels
  const levels = Object.keys(SERVICE_LEVEL_FACTORS).map(Number).sort((a, b) => a - b);

  // Below range — clamp
  if (serviceLevel < levels[0]) return SERVICE_LEVEL_FACTORS[levels[0]];
  // Above range — clamp
  if (serviceLevel > levels[levels.length - 1]) return SERVICE_LEVEL_FACTORS[levels[levels.length - 1]];

  // Find bracketing levels
  for (let i = 0; i < levels.length - 1; i++) {
    if (levels[i] <= serviceLevel && serviceLevel <= levels[i + 1]) {
      const ratio = (serviceLevel - levels[i]) / (levels[i + 1] - levels[i]);
      const kLow = SERVICE_LEVEL_FACTORS[levels[i]];
      const kHigh = SERVICE_LEVEL_FACTORS[levels[i + 1]];
      return Math.round((kLow + ratio * (kHigh - kLow)) * 100) / 100;
    }
  }

  // Fallback
  return 1.65;
}

// =============================================
// Section 2: EOQ with Constraints
// =============================================

export interface EOQInput {
  /** Forecasted annual demand (units/year) from Prophet/Regression */
  annualDemand: number;
  /** Purchase price per unit in BDT */
  unitCost: number;
  /** Fixed cost per purchase order in BDT (default: 500 BDT) */
  orderingCost?: number;
  /** Holding cost as fraction of unit_cost (default: 0.20 = 20%) */
  holdingCostPct?: number;
  /** Supplier Minimum Order Quantity (MOQ) */
  supplierMoq?: number;
  /** Maximum stock quantity for this product (warehouse slot limit) */
  maxStockQty?: number;
  /** Remaining warehouse capacity in units */
  warehouseCapacityRemaining?: number;
  /** Current stock on hand (for context) */
  currentStock?: number;
}

export interface EOQOutput {
  /** Final EOQ after all constraints applied */
  eoq: number;
  /** EOQ before constraints */
  eoqUnconstrained: number;
  /** Holding cost per unit per year (BDT) */
  holdingCostPerUnit: number;
  /** Number of orders per year */
  ordersPerYear: number;
  /** Days between orders */
  orderCycleDays: number;
  /** Total annual ordering cost (BDT) */
  totalOrderingCost: number;
  /** Total annual holding cost (BDT) */
  totalHoldingCost: number;
  /** Total annual inventory cost (BDT) */
  totalInventoryCost: number;
  /** List of constraints that were applied */
  constraintsApplied: string[];
  /** Cost savings vs ordering at MOQ (BDT) */
  costSavingsVsMoq: number;
  /** All inputs echoed back */
  inputs: EOQInput;
}

/** Default ordering cost for BD motorcycle parts import */
export const DEFAULT_ORDERING_COST_BDT = 500;

/** Default holding cost percentage: 20% of unit cost
 *  Breakdown: warehouse space (5%), insurance (2%),
 *  obsolescence risk (8%), capital opportunity cost (5%) */
export const DEFAULT_HOLDING_COST_PCT = 0.20;

/**
 * Calculate EOQ with BD-specific constraints.
 *
 * EOQ = sqrt(2 × K × D / h)
 *
 * Constraints applied in order:
 * 1. EOQ must not exceed max_stock_qty
 * 2. EOQ must not be less than supplier MOQ
 * 3. EOQ must consider remaining warehouse capacity
 */
export function calculateEOQWithConstraints(input: EOQInput): EOQOutput {
  const {
    annualDemand,
    unitCost,
    orderingCost = DEFAULT_ORDERING_COST_BDT,
    holdingCostPct = DEFAULT_HOLDING_COST_PCT,
    supplierMoq,
    maxStockQty,
    warehouseCapacityRemaining,
    currentStock = 0,
  } = input;

  // Guard: zero/negative inputs
  if (annualDemand <= 0 || unitCost <= 0 || orderingCost <= 0 || holdingCostPct <= 0) {
    return {
      eoq: 0,
      eoqUnconstrained: 0,
      holdingCostPerUnit: 0,
      ordersPerYear: 0,
      orderCycleDays: 0,
      totalOrderingCost: 0,
      totalHoldingCost: 0,
      totalInventoryCost: 0,
      constraintsApplied: ['Invalid inputs (zero/negative demand, cost, or holding pct)'],
      costSavingsVsMoq: 0,
      inputs: input,
    };
  }

  // Calculate holding cost per unit per year: h = unit_cost × holding_cost_pct
  const holdingCostPerUnit = unitCost * holdingCostPct;

  // Standard EOQ formula: sqrt(2 × K × D / h)
  const eoqUnconstrained = Math.sqrt((2 * orderingCost * annualDemand) / holdingCostPerUnit);

  // Apply constraints
  let eoq = eoqUnconstrained;
  const constraintsApplied: string[] = [];

  // Constraint 1: EOQ must not exceed max_stock_qty
  if (maxStockQty !== undefined && maxStockQty > 0 && eoq > maxStockQty) {
    eoq = maxStockQty;
    constraintsApplied.push(`EOQ capped to max_stock_qty=${maxStockQty}`);
  }

  // Constraint 2: EOQ must not be less than supplier MOQ
  if (supplierMoq !== undefined && supplierMoq > 0 && eoq < supplierMoq) {
    eoq = supplierMoq;
    constraintsApplied.push(`EOQ raised to supplier_moq=${supplierMoq}`);
  }

  // Constraint 3: EOQ must consider remaining warehouse capacity
  if (warehouseCapacityRemaining !== undefined && warehouseCapacityRemaining > 0 && eoq > warehouseCapacityRemaining) {
    eoq = warehouseCapacityRemaining;
    constraintsApplied.push(`EOQ capped to warehouse_capacity_remaining=${warehouseCapacityRemaining}`);
  }

  // Constraint 4: EOQ + current stock should not exceed max_stock
  if (maxStockQty !== undefined && currentStock > 0 && (eoq + currentStock) > maxStockQty) {
    const adjustedEoq = Math.max(0, maxStockQty - currentStock);
    if (adjustedEoq < eoq) {
      eoq = adjustedEoq;
      constraintsApplied.push(`EOQ adjusted: current_stock(${currentStock}) + EOQ exceeds max_stock(${maxStockQty}), reduced to ${adjustedEoq}`);
    }
  }

  // Calculate derived values
  const ordersPerYear = eoq > 0 ? annualDemand / eoq : 0;
  const orderCycleDays = ordersPerYear > 0 ? 365 / ordersPerYear : 0;
  const totalOrderingCost = ordersPerYear * orderingCost;
  const totalHoldingCost = (eoq / 2) * holdingCostPerUnit;
  const totalInventoryCost = totalOrderingCost + totalHoldingCost;

  // Cost comparison vs ordering at MOQ
  let costSavingsVsMoq = 0;
  if (supplierMoq && supplierMoq > 0 && supplierMoq !== eoq) {
    const moqOrdersPerYear = annualDemand / supplierMoq;
    const moqTotalCost = (moqOrdersPerYear * orderingCost) + ((supplierMoq / 2) * holdingCostPerUnit);
    costSavingsVsMoq = moqTotalCost - totalInventoryCost;
  }

  return {
    eoq: Math.round(eoq),
    eoqUnconstrained: Math.round(eoqUnconstrained),
    holdingCostPerUnit: Math.round(holdingCostPerUnit * 100) / 100,
    ordersPerYear: Math.round(ordersPerYear * 100) / 100,
    orderCycleDays: Math.round(orderCycleDays * 10) / 10,
    totalOrderingCost: Math.round(totalOrderingCost * 100) / 100,
    totalHoldingCost: Math.round(totalHoldingCost * 100) / 100,
    totalInventoryCost: Math.round(totalInventoryCost * 100) / 100,
    constraintsApplied,
    costSavingsVsMoq: Math.round(costSavingsVsMoq * 100) / 100,
    inputs: input,
  };
}

// =============================================
// Section 3: σ_LT (Lead Time Variability)
// =============================================

export interface LeadTimeStats {
  /** Mean (average) lead time in days */
  meanLeadTime: number;
  /** Standard deviation of lead time (σ_LT) in days */
  sigmaLt: number;
  /** Number of data points used */
  dataPoints: number;
  /** Minimum lead time observed */
  minLeadTime: number;
  /** Maximum lead time observed */
  maxLeadTime: number;
  /** Median lead time */
  medianLeadTime: number;
  /** Whether defaults were used (insufficient data) */
  usedDefaults: boolean;
  /** Coefficient of variation (σ/μ) - measure of relative variability */
  coefficientOfVariation: number;
}

/** Minimum number of historical orders to compute σ_LT from actuals */
const MIN_ORDERS_FOR_SIGMA = 5;

/** Default σ_LT when insufficient data - sea route (days) */
const DEFAULT_SIGMA_LT_SEA = 15.0;

/** Default σ_LT when insufficient data - air route (days) */
const DEFAULT_SIGMA_LT_AIR = 5.0;

/** Default mean lead time for sea route (days) */
const DEFAULT_MEAN_LT_SEA = 152;

/** Default mean lead time for air route (days) */
const DEFAULT_MEAN_LT_AIR = 101;

/**
 * Calculate σ_LT (lead time standard deviation) from purchase_history actual_lead_time_days.
 *
 * If insufficient data (≥ 5 orders), uses defaults based on shipment mode.
 * Also computes comprehensive stats: mean, median, min, max, CV.
 */
export function calculateLeadTimeStats(
  actualLeadTimes: number[],
  shipmentMode: 'sea' | 'air' = 'sea'
): LeadTimeStats {
  // Filter out invalid values
  const validTimes = actualLeadTimes.filter(t => t > 0 && t < 400);

  if (validTimes.length < MIN_ORDERS_FOR_SIGMA) {
    // Use defaults
    const defaultMean = shipmentMode === 'sea' ? DEFAULT_MEAN_LT_SEA : DEFAULT_MEAN_LT_AIR;
    const defaultSigma = shipmentMode === 'sea' ? DEFAULT_SIGMA_LT_SEA : DEFAULT_SIGMA_LT_AIR;
    return {
      meanLeadTime: defaultMean,
      sigmaLt: defaultSigma,
      dataPoints: validTimes.length,
      minLeadTime: validTimes.length > 0 ? Math.min(...validTimes) : 0,
      maxLeadTime: validTimes.length > 0 ? Math.max(...validTimes) : 0,
      medianLeadTime: validTimes.length > 0 ? validTimes.sort((a, b) => a - b)[Math.floor(validTimes.length / 2)] : defaultMean,
      usedDefaults: true,
      coefficientOfVariation: defaultSigma / defaultMean,
    };
  }

  // Compute from actuals
  const n = validTimes.length;
  const mean = validTimes.reduce((sum, t) => sum + t, 0) / n;
  const variance = validTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / (n - 1); // Sample variance (ddof=1)
  const sigma = Math.sqrt(variance);
  const sorted = [...validTimes].sort((a, b) => a - b);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  return {
    meanLeadTime: Math.round(mean * 10) / 10,
    sigmaLt: Math.round(sigma * 100) / 100,
    dataPoints: n,
    minLeadTime: sorted[0],
    maxLeadTime: sorted[n - 1],
    medianLeadTime: Math.round(median * 10) / 10,
    usedDefaults: false,
    coefficientOfVariation: mean > 0 ? Math.round((sigma / mean) * 1000) / 1000 : 0,
  };
}

// =============================================
// Section 4: Safety Stock (TrimedCast Formula)
// =============================================

export interface SafetyStockInput {
  /** Economic Order Quantity (from EOQ calculator) */
  eoq: number;
  /** Mean Absolute Error of forecast model (from backtest) */
  mae: number;
  /** Mean lead time in days (μₜ) */
  meanLeadTimeDays: number;
  /** Standard deviation of lead time (σ_LT) in days */
  sigmaLt: number;
  /** Shipment mode */
  shipmentMode: 'sea' | 'air';
  /** Desired service level (0.90-0.999) */
  serviceLevel?: number;
  /** Review period R in days (default: 10) */
  reviewPeriodDays?: number;
  /** Normalize MAE to daily rate (divide by 30)? Default: true
   *  Prevents the (MAE × μₜ × σ_LT) term from producing unrealistic values
   *  when lead times are long (152 days sea) */
  normalizeMaeToDaily?: boolean;
  /** Average daily demand (for reorder point calculation) */
  avgDailyDemand?: number;
}

export interface SafetyStockOutput {
  /** Total safety stock (units) */
  safetyStock: number;
  /** Reorder point (units) */
  reorderPoint: number;
  /** Component 1: EOQ / R (cycle stock coverage during review period) */
  componentCycleStock: number;
  /** Component 2: (MAE × μₜ × σ_LT) × k (demand + lead time uncertainty) */
  componentUncertainty: number;
  /** σ_LT used (days) */
  sigmaLtDays: number;
  /** Safety factor k */
  safetyFactorK: number;
  /** Service level used */
  serviceLevel: number;
  /** Daily demand used for ROP */
  dailyDemand: number;
  /** Mean lead time used (days) */
  leadTimeDays: number;
  /** MAE used (possibly normalized to daily) */
  maeUsed: number;
  /** Whether MAE was normalized to daily rate */
  maeNormalized: boolean;
  /** All inputs echoed back */
  inputs: SafetyStockInput;
}

/** Default review period (days between inventory reviews) */
export const DEFAULT_REVIEW_PERIOD_DAYS = 10;

/** Default service level */
const DEFAULT_SERVICE_LEVEL = 0.95;

/**
 * Calculate safety stock using the TrimedCast comprehensive formula.
 *
 * SS = (EOQ / R) + (MAE × μₜ × σ_LT) × k
 *
 * Where:
 * - EOQ / R = cycle stock coverage during review period
 * - MAE × μₜ × σ_LT × k = demand + lead time uncertainty buffer
 * - k = safety factor (z-score) for desired service level
 *
 * When normalizeMaeToDaily is true (default), MAE is divided by 30
 * before the calculation, yielding more realistic safety stock values
 * for the BD-China supply chain with long lead times.
 */
export function calculateSafetyStockEnhanced(input: SafetyStockInput): SafetyStockOutput {
  const {
    eoq,
    mae,
    meanLeadTimeDays,
    sigmaLt,
    shipmentMode,
    serviceLevel = DEFAULT_SERVICE_LEVEL,
    reviewPeriodDays = DEFAULT_REVIEW_PERIOD_DAYS,
    normalizeMaeToDaily = true,
    avgDailyDemand,
  } = input;

  // Get safety factor k
  const k = getSafetyFactor(serviceLevel);

  // Normalize MAE to daily rate if enabled
  // (MAE is typically monthly; dividing by 30 converts to daily for the formula)
  const maeEffective = normalizeMaeToDaily ? mae / 30 : mae;

  // Component 1: EOQ / R (cycle stock coverage during review period)
  const componentCycleStock = reviewPeriodDays > 0 ? eoq / reviewPeriodDays : 0;

  // Component 2: (MAE × μₜ × σ_LT) × k (demand + lead time uncertainty)
  const componentUncertainty = (maeEffective * meanLeadTimeDays * sigmaLt) * k;

  // Total safety stock
  const safetyStock = componentCycleStock + componentUncertainty;

  // Calculate daily demand for ROP
  // Derive from EOQ and review period if avgDailyDemand not provided
  const dailyDemand = avgDailyDemand ?? (reviewPeriodDays > 0 ? eoq / reviewPeriodDays : 0);

  // Calculate reorder point: ROP = (daily_demand × lead_time) + safety_stock
  const reorderPoint = (dailyDemand * meanLeadTimeDays) + safetyStock;

  return {
    safetyStock: Math.round(safetyStock),
    reorderPoint: Math.round(reorderPoint),
    componentCycleStock: Math.round(componentCycleStock * 100) / 100,
    componentUncertainty: Math.round(componentUncertainty * 100) / 100,
    sigmaLtDays: Math.round(sigmaLt * 100) / 100,
    safetyFactorK: k,
    serviceLevel,
    dailyDemand: Math.round(dailyDemand * 100) / 100,
    leadTimeDays: meanLeadTimeDays,
    maeUsed: Math.round(maeEffective * 100) / 100,
    maeNormalized: normalizeMaeToDaily,
    inputs: input,
  };
}

// =============================================
// Section 5: Enhanced Error Metrics
// =============================================

export interface ErrorMetricsInput {
  /** Actual values */
  actual: number[];
  /** Forecasted/predicted values */
  predicted: number[];
}

export interface ErrorMetricsOutput {
  /** Mean Absolute Percentage Error (%) */
  mape: number;
  /** Mean Absolute Error */
  mae: number;
  /** Mean Squared Error */
  mse: number;
  /** Root Mean Squared Error */
  rmse: number;
  /** Bias (mean error) — positive = under-forecast, negative = over-forecast */
  bias: number;
  /** Number of data points */
  n: number;
  /** Accuracy rating based on MAPE */
  accuracyRating: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable';
  /** Percentage of points within 10% of actual */
  within10Pct: number;
  /** Percentage of points within 20% of actual */
  within20Pct: number;
  /** Maximum absolute error */
  maxError: number;
  /** Theil's U statistic (relative to naive forecast) */
  theilsU: number;
}

/**
 * Calculate comprehensive error metrics for forecast evaluation.
 *
 * MAPE = (1/n) × Σ|actual - predicted| / |actual| × 100
 * MAE = (1/n) × Σ|actual - predicted|
 * MSE = (1/n) × Σ(actual - predicted)²
 * RMSE = √MSE
 * Bias = (1/n) × Σ(actual - predicted)
 * Theil's U = √(Σ(predicted-actual)² / Σ(actual(t)-actual(t-1))²)
 */
export function calculateErrorMetrics(input: ErrorMetricsInput): ErrorMetricsOutput {
  const { actual, predicted } = input;
  const n = Math.min(actual.length, predicted.length);

  if (n === 0) {
    return {
      mape: 0, mae: 0, mse: 0, rmse: 0, bias: 0, n: 0,
      accuracyRating: 'unacceptable',
      within10Pct: 0, within20Pct: 0, maxError: 0, theilsU: 0,
    };
  }

  let sumAPE = 0;
  let sumAE = 0;
  let sumSE = 0;
  let sumE = 0;
  let countPE = 0;
  let within10 = 0;
  let within20 = 0;
  let maxAbsError = 0;

  for (let i = 0; i < n; i++) {
    const error = actual[i] - predicted[i];
    const absError = Math.abs(error);

    sumAE += absError;
    sumSE += error * error;
    sumE += error;
    maxAbsError = Math.max(maxAbsError, absError);

    if (actual[i] !== 0) {
      const pctError = Math.abs(error / actual[i]);
      sumAPE += pctError;
      countPE++;
      if (pctError <= 0.10) within10++;
      if (pctError <= 0.20) within20++;
    }
  }

  const mape = countPE > 0 ? (sumAPE / countPE) * 100 : 0;
  const mae = sumAE / n;
  const mse = sumSE / n;
  const rmse = Math.sqrt(mse);
  const bias = sumE / n;

  // Theil's U statistic (relative to naive random walk forecast)
  let theilsU = 0;
  if (n > 1) {
    let sumPredSq = 0;
    let sumNaiveSq = 0;
    for (let i = 1; i < n; i++) {
      sumPredSq += Math.pow(predicted[i] - actual[i], 2);
      sumNaiveSq += Math.pow(actual[i] - actual[i - 1], 2);
    }
    theilsU = sumNaiveSq > 0 ? Math.sqrt(sumPredSq / sumNaiveSq) : 0;
  }

  // Accuracy rating based on MAPE
  let accuracyRating: ErrorMetricsOutput['accuracyRating'];
  if (mape < 10) accuracyRating = 'excellent';
  else if (mape < 15) accuracyRating = 'good';
  else if (mape < 20) accuracyRating = 'acceptable';
  else if (mape < 30) accuracyRating = 'poor';
  else accuracyRating = 'unacceptable';

  return {
    mape: Math.round(mape * 100) / 100,
    mae: Math.round(mae * 100) / 100,
    mse: Math.round(mse * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    bias: Math.round(bias * 100) / 100,
    n,
    accuracyRating,
    within10Pct: Math.round((within10 / n) * 100),
    within20Pct: Math.round((within20 / n) * 100),
    maxError: Math.round(maxAbsError * 100) / 100,
    theilsU: Math.round(theilsU * 1000) / 1000,
  };
}

// =============================================
// Section 6: Auto-Recalibration Trigger
// =============================================

export interface RecalibrationCheck {
  /** Product ID */
  productId: string;
  /** Product SKU */
  productSku: string;
  /** Product name */
  productName: string;
  /** Current MAPE */
  currentMape: number;
  /** MAPE threshold */
  mapeThreshold: number;
  /** Whether recalibration is needed */
  needsRecalibration: boolean;
  /** Urgency of recalibration */
  urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
  /** Recommendation message */
  recommendation: string;
  /** Suggested actions */
  suggestedActions: string[];
  /** Current accuracy rating */
  accuracyRating: string;
  /** MAE value */
  mae: number;
  /** RMSE value */
  rmse: number;
  /** Number of data points evaluated */
  dataPoints: number;
}

/**
 * Check if a product's forecast needs recalibration.
 * Triggered when MAPE exceeds threshold (default: 10%).
 */
export function checkRecalibration(
  productId: string,
  productSku: string,
  productName: string,
  errorMetrics: ErrorMetricsOutput,
  mapeThreshold: number = 10
): RecalibrationCheck {
  const { mape, mae, rmse, n, accuracyRating } = errorMetrics;
  const needsRecalibration = mape > mapeThreshold;

  let urgency: RecalibrationCheck['urgency'] = 'none';
  const suggestedActions: string[] = [];
  let recommendation = '';

  if (!needsRecalibration) {
    urgency = 'none';
    recommendation = `MAPE ${mape.toFixed(1)}% is within threshold (${mapeThreshold}%). No action needed.`;
  } else if (mape > mapeThreshold * 3) {
    urgency = 'critical';
    recommendation = `MAPE ${mape.toFixed(1)}% is ${((mape / mapeThreshold - 1) * 100).toFixed(0)}% above threshold. Immediate recalibration required.`;
    suggestedActions.push('Switch to alternative forecast model');
    suggestedActions.push('Review data quality for outliers');
    suggestedActions.push('Consider manual override with field intelligence');
  } else if (mape > mapeThreshold * 2) {
    urgency = 'high';
    recommendation = `MAPE ${mape.toFixed(1)}% significantly exceeds threshold (${mapeThreshold}%). Recalibration recommended.`;
    suggestedActions.push('Re-run forecast with updated parameters');
    suggestedActions.push('Review recent demand patterns for structural changes');
    suggestedActions.push('Check for promo/event effects not captured');
  } else if (mape > mapeThreshold * 1.5) {
    urgency = 'medium';
    recommendation = `MAPE ${mape.toFixed(1)}% moderately exceeds threshold (${mapeThreshold}%). Schedule recalibration.`;
    suggestedActions.push('Tune model parameters (alpha, beta, gamma)');
    suggestedActions.push('Extend training window if new data available');
  } else {
    urgency = 'low';
    recommendation = `MAPE ${mape.toFixed(1)}% slightly exceeds threshold (${mapeThreshold}%). Monitor closely.`;
    suggestedActions.push('Continue monitoring for 1-2 more periods');
    suggestedActions.push('Consider ensemble weight adjustment');
  }

  return {
    productId,
    productSku,
    productName,
    currentMape: mape,
    mapeThreshold,
    needsRecalibration,
    urgency,
    recommendation,
    suggestedActions,
    accuracyRating,
    mae,
    rmse,
    dataPoints: n,
  };
}

// =============================================
// Section 7: Batch EOQ + Safety Stock Calculator
// =============================================

export interface ProductEOQSafetyStock {
  productId: string;
  productSku: string;
  productName: string;
  category: string;
  eoq: EOQOutput;
  safetyStock: SafetyStockOutput;
  leadTimeStats: LeadTimeStats;
  errorMetrics?: ErrorMetricsOutput;
  recalibration?: RecalibrationCheck;
  /** Combined recommendation */
  recommendation: {
    orderQty: number;
    reorderPoint: number;
    safetyStock: number;
    orderFrequency: string;
    totalAnnualCost: number;
  };
}

export interface BatchEOQRequest {
  tenantId: string;
  productIds?: string[];
  serviceLevel?: number;
  shipmentMode?: 'sea' | 'air';
  mapeThreshold?: number;
  /** Ordering cost override (BDT) */
  orderingCost?: number;
  /** Holding cost pct override */
  holdingCostPct?: number;
}

/**
 * Batch calculate EOQ + Safety Stock for multiple products.
 * This is the main entry point for the Session 8 engine.
 */
export function calculateBatchEOQSafetyStock(
  products: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    unitCost: number;
    annualDemand: number;
    currentStock: number;
    moq?: number;
    maxStock?: number;
    warehouseCapacity?: number;
    avgDailyDemand: number;
  }>,
  purchaseHistory: Array<{
    productId: string;
    leadTimeActual?: number | null;
  }>,
  forecastErrors: Array<{
    productId: string;
    actual: number[];
    predicted: number[];
  }>,
  options: {
    serviceLevel?: number;
    shipmentMode?: 'sea' | 'air';
    mapeThreshold?: number;
    orderingCost?: number;
    holdingCostPct?: number;
    reviewPeriodDays?: number;
  } = {}
): ProductEOQSafetyStock[] {
  const {
    serviceLevel = 0.95,
    shipmentMode = 'sea',
    mapeThreshold = 10,
    orderingCost = DEFAULT_ORDERING_COST_BDT,
    holdingCostPct = DEFAULT_HOLDING_COST_PCT,
    reviewPeriodDays = DEFAULT_REVIEW_PERIOD_DAYS,
  } = options;

  // Group lead times by product
  const leadTimesByProduct = new Map<string, number[]>();
  for (const ph of purchaseHistory) {
    if (ph.leadTimeActual && ph.leadTimeActual > 0) {
      const existing = leadTimesByProduct.get(ph.productId) || [];
      existing.push(ph.leadTimeActual);
      leadTimesByProduct.set(ph.productId, existing);
    }
  }

  // Group forecast errors by product
  const errorsByProduct = new Map<string, { actual: number[]; predicted: number[] }>();
  for (const fe of forecastErrors) {
    errorsByProduct.set(fe.productId, { actual: fe.actual, predicted: fe.predicted });
  }

  const results: ProductEOQSafetyStock[] = [];

  for (const product of products) {
    // 1. Calculate EOQ with constraints
    const eoqResult = calculateEOQWithConstraints({
      annualDemand: product.annualDemand,
      unitCost: product.unitCost,
      orderingCost,
      holdingCostPct,
      supplierMoq: product.moq,
      maxStockQty: product.maxStock,
      warehouseCapacityRemaining: product.warehouseCapacity,
      currentStock: product.currentStock,
    });

    // 2. Calculate σ_LT from purchase history
    const leadTimes = leadTimesByProduct.get(product.id) || [];
    const leadTimeStats = calculateLeadTimeStats(leadTimes, shipmentMode);

    // 3. Calculate error metrics
    const errorData = errorsByProduct.get(product.id);
    let errorMetrics: ErrorMetricsOutput | undefined;
    if (errorData && errorData.actual.length > 0) {
      errorMetrics = calculateErrorMetrics(errorData);
    }

    // 4. Calculate Safety Stock with TrimedCast formula
    const safetyStockResult = calculateSafetyStockEnhanced({
      eoq: eoqResult.eoq,
      mae: errorMetrics?.mae || (product.avgDailyDemand * 0.3), // Default: 30% of avg demand
      meanLeadTimeDays: leadTimeStats.meanLeadTime,
      sigmaLt: leadTimeStats.sigmaLt,
      shipmentMode,
      serviceLevel,
      reviewPeriodDays,
      avgDailyDemand: product.avgDailyDemand,
    });

    // 5. Check recalibration
    let recalibration: RecalibrationCheck | undefined;
    if (errorMetrics) {
      recalibration = checkRecalibration(
        product.id,
        product.sku,
        product.name,
        errorMetrics,
        mapeThreshold
      );
    }

    // 6. Build combined recommendation
    const orderFrequency = eoqResult.ordersPerYear > 0
      ? `Every ${Math.round(eoqResult.orderCycleDays)} days (${Math.round(eoqResult.ordersPerYear * 10) / 10}×/year)`
      : 'N/A';

    results.push({
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      category: product.category,
      eoq: eoqResult,
      safetyStock: safetyStockResult,
      leadTimeStats,
      errorMetrics,
      recalibration,
      recommendation: {
        orderQty: eoqResult.eoq,
        reorderPoint: safetyStockResult.reorderPoint,
        safetyStock: safetyStockResult.safetyStock,
        orderFrequency,
        totalAnnualCost: eoqResult.totalInventoryCost,
      },
    });
  }

  return results;
}

// =============================================
// Section 8: Sensitivity Analysis
// =============================================

export interface SensitivityPoint {
  serviceLevel: number;
  k: number;
  safetyStock: number;
  reorderPoint: number;
  totalCost: number;
}

/**
 * Run sensitivity analysis across service levels for a given product.
 * Shows how safety stock and reorder point change as service level varies.
 */
export function runServiceLevelSensitivity(
  eoq: number,
  mae: number,
  meanLeadTimeDays: number,
  sigmaLt: number,
  avgDailyDemand: number,
  shipmentMode: 'sea' | 'air' = 'sea',
  orderingCost: number = DEFAULT_ORDERING_COST_BDT,
  holdingCostPct: number = DEFAULT_HOLDING_COST_PCT,
  unitCost: number = 100,
): SensitivityPoint[] {
  const levels = [0.90, 0.925, 0.95, 0.975, 0.99, 0.999];
  const holdingCostPerUnit = unitCost * holdingCostPct;

  return levels.map(sl => {
    const ss = calculateSafetyStockEnhanced({
      eoq,
      mae,
      meanLeadTimeDays,
      sigmaLt,
      shipmentMode,
      serviceLevel: sl,
      avgDailyDemand,
    });

    // Approximate total cost at this service level
    const ordersPerYear = eoq > 0 ? (avgDailyDemand * 365) / eoq : 0;
    const totalCost = (ordersPerYear * orderingCost) + ((eoq / 2 + ss.safetyStock) * holdingCostPerUnit);

    return {
      serviceLevel: sl,
      k: getSafetyFactor(sl),
      safetyStock: ss.safetyStock,
      reorderPoint: ss.reorderPoint,
      totalCost: Math.round(totalCost * 100) / 100,
    };
  });
}
