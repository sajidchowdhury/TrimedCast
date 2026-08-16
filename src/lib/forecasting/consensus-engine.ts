// ============================================
// TrimedCast Consensus Forecast Engine
// 5-step consensus pipeline per Forecasting
// Engine Specification Section 3.
//
// Pipeline:
//   Step 1: Prophet Seasonal Forecast (Quantitative Baseline)
//   Step 2: Apply BD Seasonal Weights
//   Step 3: Apply Marketing Adjustments
//   Step 4: Apply Sales Field Intelligence (Manual Overrides)
//   Step 5: Final Consensus Forecast = "Single Set of Numbers"
// ============================================

// =============================================
// Section 1: Types
// =============================================

/** SKU category for seasonal weight selection */
export type SKUCategory = 'general' | 'cold_weather' | 'off_road' | 'street';

/** Confidence level for manual override blending */
export type OverrideConfidence = 'low' | 'medium' | 'high';

/** Reason codes for manual overrides */
export type OverrideReasonCode = 'COMPETITOR_OOS' | 'NEW_DEALER' | 'REGULATION' | 'EVENT' | 'OTHER';

/** A single manual override entry from the sales field */
export interface ManualOverride {
  skuId: string;
  month: string;              // Format: "YYYY-MM" e.g. "2025-01"
  overrideQty: number;
  reasonCode: OverrideReasonCode;
  reasonText: string;
  submittedBy: string;
  submittedAt: string;        // ISO 8601 timestamp
  confidenceLevel: OverrideConfidence;
}

/** Per-step breakdown for one month */
export interface ConsensusStep {
  month: string;              // "YYYY-MM"
  step1Prophet: number;       // Quantitative baseline from Prophet
  step2AfterSeasonal: number; // After applying seasonal weight
  seasonalWeightUsed: number; // The actual weight multiplier used
  step3AfterMarketing: number; // After applying marketing adjustment
  promoAdjustment: number;    // The promo adjustment delta
  step4AfterOverride: number; // After applying manual override blend
  overrideApplied: boolean;   // Whether an override was present
  consensusForecast: number;  // Final rounded forecast (Step 5)
}

/** Full result of the consensus pipeline */
export interface ConsensusResult {
  consensusForecast: Record<string, number>;  // month -> final forecast
  breakdown: ConsensusStep[];                 // Per-month step-by-step
  totalOverrideCount: number;                 // How many overrides were applied
  skuCategory: SKUCategory;                   // Category used for seasonal weights
  promoBeta2: number;                         // Marketing coefficient used
}

/** Override blend weight for a given confidence level */
export interface OverrideBlendWeights {
  statisticalWeight: number;
  overrideWeight: number;
}

/** Seasonal weight entry for one month */
export interface SeasonalWeightEntry {
  month: number;        // 1-12
  monthName: string;    // "Jan", "Feb", etc.
  general: number;      // Default weight
  cold_weather: number; // Cold-weather parts weight
  off_road: number;     // Off-road parts weight
  street: number;       // Street parts weight
}

// =============================================
// Section 2: BD Seasonal Weights Table
// =============================================

/**
 * Per-SKU seasonal weight multipliers by month.
 * From the Forecasting Engine Specification Section 3, Step 2.
 *
 * Columns: general, cold_weather, off_road, street
 */
export const BD_SEASONAL_WEIGHTS: SeasonalWeightEntry[] = [
  { month: 1,  monthName: 'Jan', general: 1.2, cold_weather: 1.8, off_road: 0.8, street: 0.7 },
  { month: 2,  monthName: 'Feb', general: 1.1, cold_weather: 1.5, off_road: 0.8, street: 0.8 },
  { month: 3,  monthName: 'Mar', general: 1.0, cold_weather: 1.0, off_road: 0.9, street: 1.0 },
  { month: 4,  monthName: 'Apr', general: 1.0, cold_weather: 0.7, off_road: 0.9, street: 1.1 },
  { month: 5,  monthName: 'May', general: 0.9, cold_weather: 0.5, off_road: 1.0, street: 1.0 },
  { month: 6,  monthName: 'Jun', general: 0.8, cold_weather: 0.3, off_road: 1.3, street: 0.7 },
  { month: 7,  monthName: 'Jul', general: 0.8, cold_weather: 0.3, off_road: 1.4, street: 0.6 },
  { month: 8,  monthName: 'Aug', general: 0.8, cold_weather: 0.3, off_road: 1.3, street: 0.7 },
  { month: 9,  monthName: 'Sep', general: 0.9, cold_weather: 0.4, off_road: 1.2, street: 0.8 },
  { month: 10, monthName: 'Oct', general: 1.1, cold_weather: 0.8, off_road: 1.0, street: 1.1 },
  { month: 11, monthName: 'Nov', general: 1.2, cold_weather: 1.6, off_road: 0.9, street: 1.0 },
  { month: 12, monthName: 'Dec', general: 1.3, cold_weather: 2.0, off_road: 0.8, street: 0.8 },
];

// =============================================
// Section 3: Override Blend Weights
// =============================================

/**
 * Blend weights by confidence level.
 *
 * - low:    0.2 override weight -> consensus = 0.8*statistical + 0.2*override
 * - medium: 0.4 override weight -> consensus = 0.6*statistical + 0.4*override
 * - high:   0.7 override weight -> consensus = 0.3*statistical + 0.7*override
 */
export const OVERRIDE_BLEND_WEIGHTS: Record<OverrideConfidence, OverrideBlendWeights> = {
  low:    { statisticalWeight: 0.8, overrideWeight: 0.2 },
  medium: { statisticalWeight: 0.6, overrideWeight: 0.4 },
  high:   { statisticalWeight: 0.3, overrideWeight: 0.7 },
};

// =============================================
// Section 4: Individual Step Functions
// =============================================

/**
 * Step 1: Prophet Seasonal Forecast (Quantitative Baseline).
 *
 * Simply passes through the Prophet forecast values.
 * This step is a no-op transform; the Prophet engine output
 * serves as the quantitative baseline for the pipeline.
 *
 * @param prophetForecast - Month -> yhat from Prophet engine
 * @returns The same map, validated and non-negative
 */
export function step1ProphetBaseline(
  prophetForecast: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [month, yhat] of Object.entries(prophetForecast)) {
    result[month] = Math.max(0, yhat);
  }
  return result;
}

/**
 * Step 2: Apply BD Seasonal Weights.
 *
 * Multiplies each month's Prophet forecast by the
 * category-specific seasonal weight.
 *
 * @param prophetForecast - Month -> yhat (Step 1 output)
 * @param skuCategory - Which category weight column to use
 * @returns Month -> after-seasonal value, plus the weights used
 */
export function step2ApplySeasonalWeights(
  prophetForecast: Record<string, number>,
  skuCategory: SKUCategory
): { afterSeasonal: Record<string, number>; weightsUsed: Record<string, number> } {
  const afterSeasonal: Record<string, number> = {};
  const weightsUsed: Record<string, number> = {};

  for (const [month, value] of Object.entries(prophetForecast)) {
    const monthNum = parseMonthNumber(month);
    const weight = getSeasonalWeight(monthNum, skuCategory);
    afterSeasonal[month] = value * weight;
    weightsUsed[month] = weight;
  }

  return { afterSeasonal, weightsUsed };
}

/**
 * Step 3: Apply Marketing Adjustments.
 *
 * Formula:
 *   promo_adjustment = beta_2 * (planned_promo_index - baseline_promo_index)
 *   after_marketing = after_seasonal + promo_adjustment
 *
 * @param afterSeasonal - Month -> value after Step 2
 * @param beta2 - Marketing coefficient (promo impact factor)
 * @param plannedPromoIndex - Planned promo index for the forecast period
 * @param baselinePromoIndex - Baseline (historical) promo index
 * @returns Month -> after-marketing value, plus adjustment deltas
 */
export function step3ApplyMarketingAdjustment(
  afterSeasonal: Record<string, number>,
  beta2: number,
  plannedPromoIndex: number,
  baselinePromoIndex: number
): { afterMarketing: Record<string, number>; promoAdjustment: number } {
  const promoAdjustment = beta2 * (plannedPromoIndex - baselinePromoIndex);
  const afterMarketing: Record<string, number> = {};

  for (const [month, value] of Object.entries(afterSeasonal)) {
    afterMarketing[month] = Math.max(0, value + promoAdjustment);
  }

  return { afterMarketing, promoAdjustment };
}

/**
 * Step 4: Apply Sales Field Intelligence (Manual Overrides).
 *
 * Blend formula by confidence level:
 *   - low:    consensus = 0.8 * statistical + 0.2 * override
 *   - medium: consensus = 0.6 * statistical + 0.4 * override
 *   - high:   consensus = 0.3 * statistical + 0.7 * override
 *
 * If no override exists for a month, the statistical value passes through unchanged.
 *
 * @param afterMarketing - Month -> value after Step 3
 * @param overrides - Array of manual override entries
 * @returns Month -> after-override value, plus flags for which months had overrides
 */
export function step4ApplyOverrides(
  afterMarketing: Record<string, number>,
  overrides: ManualOverride[]
): { afterOverride: Record<string, number>; overrideApplied: Record<string, boolean> } {
  // Index overrides by month for O(1) lookup
  // If multiple overrides exist for the same month, take the latest by submittedAt
  const overrideByMonth = new Map<string, ManualOverride>();
  for (const ovr of overrides) {
    const existing = overrideByMonth.get(ovr.month);
    if (!existing || ovr.submittedAt > existing.submittedAt) {
      overrideByMonth.set(ovr.month, ovr);
    }
  }

  const afterOverride: Record<string, number> = {};
  const overrideApplied: Record<string, boolean> = {};

  for (const [month, statisticalValue] of Object.entries(afterMarketing)) {
    const ovr = overrideByMonth.get(month);
    if (ovr) {
      const weights = OVERRIDE_BLEND_WEIGHTS[ovr.confidenceLevel];
      afterOverride[month] = weights.statisticalWeight * statisticalValue +
                             weights.overrideWeight * ovr.overrideQty;
      afterOverride[month] = Math.max(0, afterOverride[month]);
      overrideApplied[month] = true;
    } else {
      afterOverride[month] = statisticalValue;
      overrideApplied[month] = false;
    }
  }

  return { afterOverride, overrideApplied };
}

/**
 * Step 5: Final Consensus Forecast.
 *
 * Rounds the Step 4 output to whole units.
 * This is the "Single Set of Numbers" that all downstream
 * systems (EOQ, SS, ROP, purchasing) consume.
 *
 * @param afterOverride - Month -> value after Step 4
 * @returns Month -> final rounded consensus forecast
 */
export function step5FinalConsensus(
  afterOverride: Record<string, number>
): Record<string, number> {
  const consensus: Record<string, number> = {};
  for (const [month, value] of Object.entries(afterOverride)) {
    consensus[month] = Math.max(0, Math.round(value));
  }
  return consensus;
}

// =============================================
// Section 5: Main Pipeline Function
// =============================================

/**
 * Calculate Consensus Forecast through the 5-step pipeline.
 *
 * Steps:
 *   1. Prophet baseline (quantitative)
 *   2. Apply BD seasonal weights by SKU category
 *   3. Apply marketing/promo adjustments
 *   4. Apply sales field intelligence (manual overrides)
 *   5. Final consensus = "Single Set of Numbers"
 *
 * @param params.prophetForecast  - Month -> yhat from Prophet
 * @param params.skuCategory      - Category for seasonal weight selection
 * @param params.promoCoefficientBeta2 - Marketing impact coefficient
 * @param params.plannedPromoIndex     - Planned promo index
 * @param params.baselinePromoIndex    - Baseline promo index
 * @param params.manualOverrides       - Optional array of override entries
 * @returns Full consensus result with per-step breakdown
 */
export function calculateConsensusForecast(params: {
  prophetForecast: Record<string, number>;
  skuCategory: SKUCategory;
  promoCoefficientBeta2: number;
  plannedPromoIndex: number;
  baselinePromoIndex: number;
  manualOverrides?: ManualOverride[];
}): ConsensusResult {
  const {
    prophetForecast,
    skuCategory,
    promoCoefficientBeta2,
    plannedPromoIndex,
    baselinePromoIndex,
    manualOverrides = [],
  } = params;

  // Step 1: Prophet baseline
  const step1 = step1ProphetBaseline(prophetForecast);

  // Step 2: Seasonal weights
  const { afterSeasonal, weightsUsed } = step2ApplySeasonalWeights(step1, skuCategory);

  // Step 3: Marketing adjustments
  const { afterMarketing, promoAdjustment } = step3ApplyMarketingAdjustment(
    afterSeasonal,
    promoCoefficientBeta2,
    plannedPromoIndex,
    baselinePromoIndex
  );

  // Step 4: Manual overrides
  const { afterOverride, overrideApplied } = step4ApplyOverrides(afterMarketing, manualOverrides);

  // Step 5: Final consensus
  const consensusForecast = step5FinalConsensus(afterOverride);

  // Build per-month breakdown
  const months = Object.keys(prophetForecast).sort();
  const breakdown: ConsensusStep[] = months.map(month => ({
    month,
    step1Prophet: step1[month] ?? 0,
    step2AfterSeasonal: afterSeasonal[month] ?? 0,
    seasonalWeightUsed: weightsUsed[month] ?? 1,
    step3AfterMarketing: afterMarketing[month] ?? 0,
    promoAdjustment,
    step4AfterOverride: afterOverride[month] ?? 0,
    overrideApplied: overrideApplied[month] ?? false,
    consensusForecast: consensusForecast[month] ?? 0,
  }));

  // Count overrides that were actually applied
  const totalOverrideCount = Object.values(overrideApplied).filter(Boolean).length;

  return {
    consensusForecast,
    breakdown,
    totalOverrideCount,
    skuCategory,
    promoBeta2: promoCoefficientBeta2,
  };
}

// =============================================
// Section 6: Batch Consensus Forecast
// =============================================

/** Input for a single SKU in the batch */
export interface BatchConsensusInput {
  skuId: string;
  skuCategory: SKUCategory;
  prophetForecast: Record<string, number>;
  promoCoefficientBeta2: number;
  plannedPromoIndex: number;
  baselinePromoIndex: number;
  manualOverrides?: ManualOverride[];
}

/** Result for a single SKU in the batch */
export interface BatchConsensusOutput {
  skuId: string;
  result: ConsensusResult;
}

/**
 * Run consensus forecast for multiple SKUs in batch.
 *
 * @param inputs - Array of per-SKU inputs
 * @param defaultBeta2 - Default promo coefficient if not specified per-SKU
 * @returns Array of per-SKU consensus results
 */
export function batchConsensusForecast(
  inputs: BatchConsensusInput[],
  defaultBeta2: number = 0.5
): BatchConsensusOutput[] {
  return inputs.map(input => ({
    skuId: input.skuId,
    result: calculateConsensusForecast({
      prophetForecast: input.prophetForecast,
      skuCategory: input.skuCategory,
      promoCoefficientBeta2: input.promoCoefficientBeta2 ?? defaultBeta2,
      plannedPromoIndex: input.plannedPromoIndex,
      baselinePromoIndex: input.baselinePromoIndex,
      manualOverrides: input.manualOverrides,
    }),
  }));
}

// =============================================
// Section 7: Seasonal Weight Utilities
// =============================================

/**
 * Get the seasonal weight for a given month and SKU category.
 *
 * @param monthNum - Month number (1-12)
 * @param category - SKU category
 * @returns Seasonal weight multiplier
 */
export function getSeasonalWeight(monthNum: number, category: SKUCategory): number {
  const clampedMonth = Math.max(1, Math.min(12, monthNum));
  const entry = BD_SEASONAL_WEIGHTS[clampedMonth - 1];
  if (!entry) return 1.0;

  switch (category) {
    case 'cold_weather': return entry.cold_weather;
    case 'off_road':    return entry.off_road;
    case 'street':      return entry.street;
    case 'general':
    default:            return entry.general;
  }
}

/**
 * Parse month number from a "YYYY-MM" string.
 *
 * @param monthStr - Month string in "YYYY-MM" format
 * @returns Month number 1-12
 */
export function parseMonthNumber(monthStr: string): number {
  const parts = monthStr.split('-');
  if (parts.length >= 2) {
    const monthNum = parseInt(parts[1], 10);
    if (monthNum >= 1 && monthNum <= 12) return monthNum;
  }
  // Fallback: try to parse as just a month number
  const parsed = parseInt(monthStr, 10);
  if (parsed >= 1 && parsed <= 12) return parsed;
  // Default to 1 (January) if unparseable
  return 1;
}

/**
 * Get the full seasonal weight entry for a month.
 *
 * @param monthNum - Month number (1-12)
 * @returns Seasonal weight entry or undefined
 */
export function getSeasonalWeightEntry(monthNum: number): SeasonalWeightEntry | undefined {
  const clamped = Math.max(1, Math.min(12, monthNum));
  return BD_SEASONAL_WEIGHTS[clamped - 1];
}

/**
 * Get all seasonal weights for a given category as a month->weight map.
 *
 * @param category - SKU category
 * @returns Map of month number (1-12) to weight
 */
export function getSeasonalWeightProfile(
  category: SKUCategory
): Record<number, number> {
  const profile: Record<number, number> = {};
  for (const entry of BD_SEASONAL_WEIGHTS) {
    profile[entry.month] = getSeasonalWeight(entry.month, category);
  }
  return profile;
}

// =============================================
// Section 8: Override Analysis Utilities
// =============================================

/**
 * Summarize manual overrides by reason code.
 *
 * @param overrides - Array of manual overrides
 * @returns Map of reason code to count
 */
export function summarizeOverridesByReason(
  overrides: ManualOverride[]
): Record<OverrideReasonCode, number> {
  const summary: Record<OverrideReasonCode, number> = {
    COMPETITOR_OOS: 0,
    NEW_DEALER: 0,
    REGULATION: 0,
    EVENT: 0,
    OTHER: 0,
  };
  for (const ovr of overrides) {
    summary[ovr.reasonCode]++;
  }
  return summary;
}

/**
 * Summarize manual overrides by confidence level.
 *
 * @param overrides - Array of manual overrides
 * @returns Map of confidence level to count
 */
export function summarizeOverridesByConfidence(
  overrides: ManualOverride[]
): Record<OverrideConfidence, number> {
  const summary: Record<OverrideConfidence, number> = {
    low: 0,
    medium: 0,
    high: 0,
  };
  for (const ovr of overrides) {
    summary[ovr.confidenceLevel]++;
  }
  return summary;
}

/**
 * Calculate the effective override weight for a given confidence level.
 *
 * @param confidence - Override confidence level
 * @returns Blend weights (statistical and override)
 */
export function getOverrideBlendWeights(confidence: OverrideConfidence): OverrideBlendWeights {
  return OVERRIDE_BLEND_WEIGHTS[confidence];
}

/**
 * Compute the weighted average override for a month
 * (if multiple overrides exist, latest wins in the main pipeline,
 *  but this function computes the weighted average for analysis).
 *
 * @param statisticalValue - The statistical (Step 3) value
 * @param overrides - All overrides for this month
 * @returns Weighted average after-override value
 */
export function computeWeightedAverageOverride(
  statisticalValue: number,
  overrides: ManualOverride[]
): number {
  if (overrides.length === 0) return statisticalValue;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const ovr of overrides) {
    const weights = OVERRIDE_BLEND_WEIGHTS[ovr.confidenceLevel];
    // Each override contributes proportionally to its override weight
    weightedSum += weights.overrideWeight * ovr.overrideQty;
    totalWeight += weights.overrideWeight;
  }

  if (totalWeight === 0) return statisticalValue;

  // Average override value weighted by confidence
  const avgOverride = weightedSum / totalWeight;

  // Use the average confidence level for blending
  const avgOverrideWeight = totalWeight / overrides.length;
  const avgStatisticalWeight = 1 - avgOverrideWeight;

  return Math.max(0, avgStatisticalWeight * statisticalValue + avgOverrideWeight * avgOverride);
}

// =============================================
// Section 9: Consensus Variance Analysis
// =============================================

/** Per-month variance between steps */
export interface ConsensusVariance {
  month: string;
  seasonalEffect: number;    // Absolute change from seasonal weights
  seasonalEffectPct: number; // Percentage change from seasonal
  marketingEffect: number;   // Absolute change from marketing
  marketingEffectPct: number;
  overrideEffect: number;    // Absolute change from override
  overrideEffectPct: number;
  totalAdjustment: number;   // Total absolute adjustment vs Prophet
  totalAdjustmentPct: number;
}

/** Full variance analysis result */
export interface ConsensusVarianceResult {
  variances: ConsensusVariance[];
  avgSeasonalEffectPct: number;
  avgMarketingEffectPct: number;
  avgOverrideEffectPct: number;
  avgTotalAdjustmentPct: number;
  monthsWithOverrides: number;
  totalMonths: number;
}

/**
 * Analyze the variance contribution of each pipeline step.
 * Useful for understanding which adjustment has the most impact.
 *
 * @param breakdown - Per-step breakdown from consensus result
 * @returns Variance analysis
 */
export function analyzeConsensusVariance(
  breakdown: ConsensusStep[]
): ConsensusVarianceResult {
  if (breakdown.length === 0) {
    return {
      variances: [],
      avgSeasonalEffectPct: 0,
      avgMarketingEffectPct: 0,
      avgOverrideEffectPct: 0,
      avgTotalAdjustmentPct: 0,
      monthsWithOverrides: 0,
      totalMonths: 0,
    };
  }

  const variances: ConsensusVariance[] = breakdown.map(step => {
    const baseline = step.step1Prophet || 1; // Avoid division by zero

    const seasonalEffect = step.step2AfterSeasonal - step.step1Prophet;
    const seasonalEffectPct = (seasonalEffect / baseline) * 100;

    const marketingEffect = step.step3AfterMarketing - step.step2AfterSeasonal;
    const marketingEffectPct = (marketingEffect / (step.step2AfterSeasonal || 1)) * 100;

    const overrideEffect = step.step4AfterOverride - step.step3AfterMarketing;
    const overrideEffectPct = (overrideEffect / (step.step3AfterMarketing || 1)) * 100;

    const totalAdjustment = step.consensusForecast - step.step1Prophet;
    const totalAdjustmentPct = (totalAdjustment / baseline) * 100;

    return {
      month: step.month,
      seasonalEffect: Math.round(seasonalEffect * 100) / 100,
      seasonalEffectPct: Math.round(seasonalEffectPct * 100) / 100,
      marketingEffect: Math.round(marketingEffect * 100) / 100,
      marketingEffectPct: Math.round(marketingEffectPct * 100) / 100,
      overrideEffect: Math.round(overrideEffect * 100) / 100,
      overrideEffectPct: Math.round(overrideEffectPct * 100) / 100,
      totalAdjustment: Math.round(totalAdjustment * 100) / 100,
      totalAdjustmentPct: Math.round(totalAdjustmentPct * 100) / 100,
    };
  });

  const n = variances.length;
  const avgSeasonalEffectPct = variances.reduce((s, v) => s + Math.abs(v.seasonalEffectPct), 0) / n;
  const avgMarketingEffectPct = variances.reduce((s, v) => s + Math.abs(v.marketingEffectPct), 0) / n;
  const avgOverrideEffectPct = variances.reduce((s, v) => s + Math.abs(v.overrideEffectPct), 0) / n;
  const avgTotalAdjustmentPct = variances.reduce((s, v) => s + Math.abs(v.totalAdjustmentPct), 0) / n;
  const monthsWithOverrides = breakdown.filter(s => s.overrideApplied).length;

  return {
    variances,
    avgSeasonalEffectPct: Math.round(avgSeasonalEffectPct * 100) / 100,
    avgMarketingEffectPct: Math.round(avgMarketingEffectPct * 100) / 100,
    avgOverrideEffectPct: Math.round(avgOverrideEffectPct * 100) / 100,
    avgTotalAdjustmentPct: Math.round(avgTotalAdjustmentPct * 100) / 100,
    monthsWithOverrides,
    totalMonths: n,
  };
}

// =============================================
// Section 10: Consensus Validation & Quality
// =============================================

/** Quality check result for consensus forecast */
export interface ConsensusQualityCheck {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  zeroDemandMonths: string[];
  largeAdjustmentMonths: string[];
  overrideCoveragePct: number;
}

/**
 * Validate a consensus forecast result for quality issues.
 *
 * Checks:
 *   - Zero demand months (forecast = 0)
 *   - Large adjustments (>50% change from Prophet baseline)
 *   - Override coverage percentage
 *   - Negative values (should never happen but defensive check)
 *
 * @param result - Consensus result to validate
 * @param largeAdjustmentThresholdPct - Threshold for flagging large adjustments
 * @returns Quality check result
 */
export function validateConsensusQuality(
  result: ConsensusResult,
  largeAdjustmentThresholdPct: number = 50
): ConsensusQualityCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  const zeroDemandMonths: string[] = [];
  const largeAdjustmentMonths: string[] = [];

  for (const step of result.breakdown) {
    // Check for zero demand
    if (step.consensusForecast === 0) {
      zeroDemandMonths.push(step.month);
      warnings.push(`Zero demand forecast for ${step.month}`);
    }

    // Check for negative values
    if (step.consensusForecast < 0) {
      errors.push(`Negative forecast for ${step.month}: ${step.consensusForecast}`);
    }

    // Check for large adjustments
    if (step.step1Prophet > 0) {
      const adjustmentPct = Math.abs(
        (step.consensusForecast - step.step1Prophet) / step.step1Prophet * 100
      );
      if (adjustmentPct > largeAdjustmentThresholdPct) {
        largeAdjustmentMonths.push(step.month);
        warnings.push(
          `Large adjustment for ${step.month}: ${adjustmentPct.toFixed(1)}% change from baseline`
        );
      }
    }
  }

  // Override coverage
  const overrideCoveragePct = result.breakdown.length > 0
    ? (result.totalOverrideCount / result.breakdown.length) * 100
    : 0;

  if (overrideCoveragePct > 80) {
    warnings.push(
      `Very high override coverage (${overrideCoveragePct.toFixed(0)}%). ` +
      'Statistical model may need retraining.'
    );
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    warnings,
    errors,
    zeroDemandMonths,
    largeAdjustmentMonths,
    overrideCoveragePct: Math.round(overrideCoveragePct * 100) / 100,
  };
}

// =============================================
// Section 11: Sensitivity Analysis
// =============================================

/** Sensitivity scenario result */
export interface ConsensusSensitivityPoint {
  beta2: number;
  plannedPromoIndex: number;
  totalForecast: number;
  avgMonthlyForecast: number;
  promoAdjustment: number;
}

/**
 * Run sensitivity analysis on the marketing adjustment parameters.
 *
 * Sweeps beta_2 and planned promo index to understand
 * how sensitive the consensus forecast is to marketing assumptions.
 *
 * @param prophetForecast - Month -> yhat from Prophet
 * @param skuCategory - SKU category
 * @param beta2Range - Range of beta2 values to test
 * @param promoIndexRange - Range of planned promo indices to test
 * @param baselinePromoIndex - Fixed baseline promo index
 * @returns Grid of sensitivity results
 */
export function consensusSensitivityAnalysis(
  prophetForecast: Record<string, number>,
  skuCategory: SKUCategory,
  beta2Range: number[],
  promoIndexRange: number[],
  baselinePromoIndex: number
): ConsensusSensitivityPoint[] {
  const results: ConsensusSensitivityPoint[] = [];

  for (const beta2 of beta2Range) {
    for (const plannedPromoIndex of promoIndexRange) {
      const result = calculateConsensusForecast({
        prophetForecast,
        skuCategory,
        promoCoefficientBeta2: beta2,
        plannedPromoIndex,
        baselinePromoIndex,
      });

      const totalForecast = Object.values(result.consensusForecast)
        .reduce((sum, v) => sum + v, 0);
      const n = Object.keys(result.consensusForecast).length || 1;

      results.push({
        beta2,
        plannedPromoIndex,
        totalForecast,
        avgMonthlyForecast: Math.round(totalForecast / n),
        promoAdjustment: result.breakdown[0]?.promoAdjustment ?? 0,
      });
    }
  }

  return results;
}

// =============================================
// Section 12: Consensus Comparison
// =============================================

/** Comparison between two consensus results */
export interface ConsensusComparison {
  monthsCompared: number;
  totalDifference: number;
  avgDifferencePct: number;
  maxDifference: number;
  maxDifferenceMonth: string;
  monthsDirection: { up: number; down: number; unchanged: number };
  differences: Array<{
    month: string;
    forecastA: number;
    forecastB: number;
    difference: number;
    differencePct: number;
  }>;
}

/**
 * Compare two consensus forecasts (e.g., before/after overrides).
 *
 * @param resultA - First consensus result
 * @param resultB - Second consensus result
 * @returns Detailed comparison
 */
export function compareConsensusForecasts(
  resultA: ConsensusResult,
  resultB: ConsensusResult
): ConsensusComparison {
  const allMonths = new Set([
    ...Object.keys(resultA.consensusForecast),
    ...Object.keys(resultB.consensusForecast),
  ]);

  const months = Array.from(allMonths).sort();
  let totalDifference = 0;
  let totalAbsPctDiff = 0;
  let maxDifference = 0;
  let maxDifferenceMonth = '';
  let up = 0;
  let down = 0;
  let unchanged = 0;

  const differences: ConsensusComparison['differences'] = [];

  for (const month of months) {
    const a = resultA.consensusForecast[month] ?? 0;
    const b = resultB.consensusForecast[month] ?? 0;
    const diff = b - a;
    const base = Math.max(a, 1);
    const diffPct = (diff / base) * 100;

    totalDifference += Math.abs(diff);
    totalAbsPctDiff += Math.abs(diffPct);

    if (Math.abs(diff) > maxDifference) {
      maxDifference = Math.abs(diff);
      maxDifferenceMonth = month;
    }

    if (diff > 0) up++;
    else if (diff < 0) down++;
    else unchanged++;

    differences.push({
      month,
      forecastA: a,
      forecastB: b,
      difference: Math.round(diff * 100) / 100,
      differencePct: Math.round(diffPct * 100) / 100,
    });
  }

  const n = months.length || 1;

  return {
    monthsCompared: months.length,
    totalDifference: Math.round(totalDifference),
    avgDifferencePct: Math.round((totalAbsPctDiff / n) * 100) / 100,
    maxDifference: Math.round(maxDifference),
    maxDifferenceMonth,
    monthsDirection: { up, down, unchanged },
    differences,
  };
}

// =============================================
// Section 13: Override Simulation
// =============================================

/** Simulated override scenario result */
export interface OverrideSimulationResult {
  originalConsensus: Record<string, number>;
  simulatedConsensus: Record<string, number>;
  totalChange: number;
  avgChangePct: number;
  step: ConsensusStep[];
}

/**
 * Simulate the effect of adding an override without
 * modifying the actual consensus forecast.
 *
 * Useful for what-if analysis before committing overrides.
 *
 * @param params - Current consensus parameters
 * @param simulatedOverrides - Override entries to simulate
 * @returns Simulation result showing before/after
 */
export function simulateOverrideEffect(
  params: {
    prophetForecast: Record<string, number>;
    skuCategory: SKUCategory;
    promoCoefficientBeta2: number;
    plannedPromoIndex: number;
    baselinePromoIndex: number;
    existingOverrides?: ManualOverride[];
  },
  simulatedOverrides: ManualOverride[]
): OverrideSimulationResult {
  // Calculate original (with existing overrides only)
  const originalResult = calculateConsensusForecast({
    ...params,
    manualOverrides: params.existingOverrides ?? [],
  });

  // Calculate simulated (with existing + new overrides)
  const allOverrides = [...(params.existingOverrides ?? []), ...simulatedOverrides];
  const simulatedResult = calculateConsensusForecast({
    ...params,
    manualOverrides: allOverrides,
  });

  // Compute changes
  const months = Object.keys(originalResult.consensusForecast);
  let totalChange = 0;
  let totalPctChange = 0;
  let count = 0;

  for (const month of months) {
    const orig = originalResult.consensusForecast[month] ?? 0;
    const sim = simulatedResult.consensusForecast[month] ?? 0;
    totalChange += sim - orig;
    if (orig > 0) {
      totalPctChange += Math.abs((sim - orig) / orig * 100);
      count++;
    }
  }

  return {
    originalConsensus: originalResult.consensusForecast,
    simulatedConsensus: simulatedResult.consensusForecast,
    totalChange: Math.round(totalChange),
    avgChangePct: count > 0 ? Math.round((totalPctChange / count) * 100) / 100 : 0,
    step: simulatedResult.breakdown,
  };
}
