// ============================================
// TrimedCast Prophet-Enhanced Scenario Engine
// Session 22: What-If Analysis for Supply Chain Decisions
//
// Pure TypeScript calculation engine (no React, no API routes).
// Reuses existing forecasting models from models.ts and eoq-safety-stock.ts.
//
// Provides:
//   - Scenario simulation for lead time mode (sea/air)
//   - Promo index impact on demand
//   - Service level sensitivity
//   - Price elasticity and revenue impact
//   - Order quantity vs EOQ comparison
//   - Shadow forecast generation with BD season multipliers
//   - Sea vs Air total cost of ownership comparison
// ============================================

import {
  calculateEOQ,
  calculateSafetyStock,
  getBDSeason,
  getSeasonMultiplier,
  type BDSeason,
} from './models';

import { getSafetyFactor } from './eoq-safety-stock';

// =============================================
// Section 1: Types and Interfaces
// =============================================

/** Types of modifications that can be applied in a scenario */
export type ScenarioModificationType =
  | 'lead_time_mode'
  | 'promo_index'
  | 'service_level'
  | 'order_quantity'
  | 'price';

/** A single modification applied in a scenario */
export interface ScenarioModification {
  type: ScenarioModificationType;
  currentValue: number | string;
  newValue: number | string;
  label: string;
}

/** The directional impact of a scenario change */
export type ImpactDirection = 'positive' | 'negative' | 'neutral';

/** Impact of a scenario change on a specific metric */
export interface ScenarioImpact {
  metric: string;
  baseline: number;
  scenario: number;
  change: number;
  changePercent: number;
  unit: string;
  direction: ImpactDirection;
}

/** A single point in a shadow forecast (baseline vs scenario) */
export interface ShadowForecastPoint {
  month: string;
  baseline: number;
  scenario: number;
  lowerBound: number;
  upperBound: number;
}

/** The complete result of running a scenario */
export interface ScenarioResult {
  modifications: ScenarioModification[];
  impacts: ScenarioImpact[];
  shadowForecast: ShadowForecastPoint[];
  recommendation: string;
  riskFlags: string[];
  totalCostImpact: number; // BDT
  confidenceLevel: number;
}

/** Lead time mode: sea freight or air freight */
export type LeadTimeMode = 'sea' | 'air';

/** Base state of the product/supply chain for scenario analysis */
export interface ScenarioBaseState {
  /** Average monthly demand (units/month) */
  avgMonthlyDemand: number;
  /** Demand standard deviation (units/month) */
  demandStdDev: number;
  /** Current lead time mode */
  leadTimeMode: LeadTimeMode;
  /** Average lead time in days */
  avgLeadTimeDays: number;
  /** Lead time standard deviation in days */
  leadTimeStdDev: number;
  /** Current service level (0-1) */
  serviceLevel: number;
  /** Current price per unit in BDT */
  unitPrice: number;
  /** Unit cost / purchase price in BDT */
  unitCost: number;
  /** Current promo index (0-1 scale, 0 = no promo, 1 = max promo) */
  promoIndex: number;
  /** Current order quantity */
  orderQuantity: number;
  /** Ordering cost per order in BDT */
  orderingCost: number;
  /** Holding cost as fraction of unit cost (e.g., 0.20) */
  holdingCostPct: number;
  /** Annual demand in units/year */
  annualDemand: number;
}

/** Side-by-side comparison result for Sea vs Air */
export interface SeaVsAirComparison {
  sea: ScenarioResult;
  air: ScenarioResult;
  recommendation: LeadTimeMode;
  netSavingsBDT: number;
  riskAnalysis: {
    seaStockoutProbability: number;
    airStockoutProbability: number;
    seaCnyRisk: boolean;
    airCnyRisk: boolean;
    seaTotalCostOfOwnership: number;
    airTotalCostOfOwnership: number;
  };
}

// =============================================
// Section 2: Constants
// =============================================

/** Lead time configuration for sea and air modes */
export const LEAD_TIME_CONFIG = {
  sea: {
    manufacturing: 30,
    shipping: 45,
    customs: 10,
    internal: 5,
    total: 90,
    stdDev: 15,
  },
  air: {
    manufacturing: 15,
    shipping: 12,
    customs: 5,
    internal: 3,
    total: 35,
    stdDev: 5,
  },
} as const;

/** Freight cost per unit in BDT */
export const FREIGHT_COST = {
  sea: 45,   // BDT per unit
  air: 315,  // BDT per unit
} as const;

/** Chinese New Year window (potential shipping delay) */
export const CNY_WINDOW = {
  startMonth: 1,
  startDay: 20,
  endMonth: 2,
  endDay: 20,
} as const;

/** Demand model coefficients: D(F) = beta_0 + beta_1 * Price + beta_2 * PromoIndex */
export const DEMAND_MODEL_BETAS = {
  beta0: 150,    // Base demand intercept
  beta1: -2.5,   // Price coefficient (negative: higher price = lower demand)
  beta2: 300,    // Promo index coefficient (positive: more promo = higher demand)
} as const;

/** Month names for BD calendar */
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Default shadow forecast horizon in months */
const DEFAULT_FORECAST_HORIZON_MONTHS = 6;

// =============================================
// Section 3: Helper Functions
// =============================================

/** Clamp a number to a minimum value */
function clampMin(value: number, min: number): number {
  return Math.max(min, value);
}

/** Clamp a number between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Round to N decimal places */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Determine impact direction from change value */
function getDirection(change: number): ImpactDirection {
  if (change > 0.005) return 'positive';
  if (change < -0.005) return 'negative';
  return 'neutral';
}

/** Create a ScenarioImpact object */
function createImpact(
  metric: string,
  baseline: number,
  scenario: number,
  unit: string
): ScenarioImpact {
  const change = scenario - baseline;
  const changePercent = baseline !== 0 ? (change / Math.abs(baseline)) * 100 : 0;
  return {
    metric,
    baseline: roundTo(baseline, 2),
    scenario: roundTo(scenario, 2),
    change: roundTo(change, 2),
    changePercent: roundTo(changePercent, 2),
    unit,
    direction: getDirection(change),
  };
}

/** Calculate demand using the demand model formula */
function calculateDemand(price: number, promoIndex: number): number {
  const demand = DEMAND_MODEL_BETAS.beta0
    + DEMAND_MODEL_BETAS.beta1 * price
    + DEMAND_MODEL_BETAS.beta2 * promoIndex;
  return clampMin(demand, 0);
}

/** Get the current month (1-12) for forecast generation */
function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

/** Get month index for N months ahead */
function getFutureMonth(monthsAhead: number): { month: number; year: number; label: string } {
  const now = new Date();
  const future = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  const month = future.getMonth() + 1;
  const year = future.getFullYear();
  const label = `${MONTH_NAMES[month - 1]} ${year}`;
  return { month, year, label };
}

/** Calculate safety stock using standard formula: SS = k * sqrt(mu_t * sigma_d^2 + mu_d^2 * sigma_t^2) */
function calculateSafetyStockStandard(
  avgDemand: number,
  demandStdDev: number,
  avgLeadTimeDays: number,
  leadTimeStdDev: number,
  serviceLevel: number
): number {
  const k = getSafetyFactor(serviceLevel);
  const demandComponent = avgLeadTimeDays * Math.pow(demandStdDev, 2);
  const leadTimeComponent = Math.pow(avgDemand, 2) * Math.pow(leadTimeStdDev, 2);
  return clampMin(k * Math.sqrt(demandComponent + leadTimeComponent), 0);
}

/** Calculate monthly holding cost from safety stock */
function monthlyHoldingCost(safetyStock: number, unitCost: number, holdingPct: number): number {
  return safetyStock * unitCost * holdingPct / 12;
}

/** Calculate total cost of ordering: (D/Q)*K + (Q/2)*h */
function totalOrderingCost(
  annualDemand: number,
  orderQty: number,
  orderingCost: number,
  holdingCostPerUnit: number
): number {
  if (orderQty <= 0 || annualDemand <= 0) return 0;
  const ordering = (annualDemand / orderQty) * orderingCost;
  const holding = (orderQty / 2) * holdingCostPerUnit;
  return ordering + holding;
}

/** Check if a date falls within CNY window */
function isInCNYWindow(month: number, day: number): boolean {
  if (month === CNY_WINDOW.startMonth && day >= CNY_WINDOW.startDay) return true;
  if (month === CNY_WINDOW.endMonth && day <= CNY_WINDOW.endDay) return true;
  if (CNY_WINDOW.startMonth < CNY_WINDOW.endMonth) {
    if (month > CNY_WINDOW.startMonth && month < CNY_WINDOW.endMonth) return true;
  } else {
    // CNY spans year boundary
    if (month > CNY_WINDOW.startMonth || month < CNY_WINDOW.endMonth) return true;
  }
  return false;
}

/** Estimate stockout probability from service level */
function stockoutProbability(serviceLevel: number): number {
  return clamp(1 - serviceLevel, 0, 1);
}

// =============================================
// Section 4: Lead Time Scenario
// =============================================

/**
 * Run a What-If scenario changing the lead time mode (sea vs air).
 *
 * Sea: total LT = 90 days (Mfg=30, Ship=45, Customs=10, Internal=5)
 * Air: total LT = 35 days (Mfg=15, Ship=12, Customs=5, Internal=3)
 *
 * Recalculates safety stock, holding cost, freight cost, and generates
 * a 6-month shadow forecast with BD seasonal multipliers.
 */
export function runLeadTimeScenario(
  baseState: ScenarioBaseState,
  newMode: LeadTimeMode
): ScenarioResult {
  const config = LEAD_TIME_CONFIG[newMode];
  const oldConfig = LEAD_TIME_CONFIG[baseState.leadTimeMode];

  // Calculate baseline safety stock
  const baselineSS = calculateSafetyStockStandard(
    baseState.avgMonthlyDemand,
    baseState.demandStdDev,
    baseState.avgLeadTimeDays,
    baseState.leadTimeStdDev,
    baseState.serviceLevel
  );

  // Calculate scenario safety stock with new lead time parameters
  const scenarioSS = calculateSafetyStockStandard(
    baseState.avgMonthlyDemand,
    baseState.demandStdDev,
    config.total,
    config.stdDev,
    baseState.serviceLevel
  );

  // Holding cost savings (monthly)
  const baselineHoldingCost = monthlyHoldingCost(
    baselineSS, baseState.unitCost, baseState.holdingCostPct
  );
  const scenarioHoldingCost = monthlyHoldingCost(
    scenarioSS, baseState.unitCost, baseState.holdingCostPct
  );
  const holdingCostChange = scenarioHoldingCost - baselineHoldingCost;

  // Freight cost delta
  const oldFreight = FREIGHT_COST[baseState.leadTimeMode];
  const newFreight = FREIGHT_COST[newMode];
  const freightCostPerUnitDelta = newFreight - oldFreight;
  const annualFreightCostDelta = freightCostPerUnitDelta * baseState.annualDemand;

  // Reorder point changes
  const baselineROP = baseState.avgMonthlyDemand * (baseState.avgLeadTimeDays / 30) + baselineSS;
  const scenarioROP = baseState.avgMonthlyDemand * (config.total / 30) + scenarioSS;

  // Lead time reduction
  const leadTimeReduction = baseState.avgLeadTimeDays - config.total;

  // Total cost impact (annual): holding cost change * 12 + freight delta
  const totalCostImpact = holdingCostChange * 12 + annualFreightCostDelta;

  // Impacts
  const impacts: ScenarioImpact[] = [
    createImpact('Safety Stock', baselineSS, scenarioSS, 'units'),
    createImpact('Reorder Point', baselineROP, scenarioROP, 'units'),
    createImpact('Monthly Holding Cost', baselineHoldingCost, scenarioHoldingCost, 'BDT'),
    createImpact('Freight Cost/Unit', oldFreight, newFreight, 'BDT'),
    createImpact('Annual Freight Cost', oldFreight * baseState.annualDemand, newFreight * baseState.annualDemand, 'BDT'),
    createImpact('Lead Time', baseState.avgLeadTimeDays, config.total, 'days'),
  ];

  // Modifications
  const modifications: ScenarioModification[] = [
    {
      type: 'lead_time_mode',
      currentValue: baseState.leadTimeMode,
      newValue: newMode,
      label: `Lead Time Mode: ${baseState.leadTimeMode} -> ${newMode}`,
    },
  ];

  // Risk flags
  const riskFlags: string[] = [];
  if (newMode === 'sea') {
    riskFlags.push('Sea freight: 90-day lead time increases exposure to demand variability');
    riskFlags.push('Sea freight: CNY window (Jan 20 - Feb 20) may add 10-15 day delay');
  }
  if (newMode === 'air' && baseState.leadTimeMode === 'sea') {
    riskFlags.push('Air freight cost is 7x higher than sea (BDT 315 vs BDT 45 per unit)');
  }
  if (scenarioSS > baselineSS * 1.5) {
    riskFlags.push(`Safety stock increases by ${roundTo(((scenarioSS - baselineSS) / baselineSS) * 100, 1)}% -- verify warehouse capacity`);
  }
  if (leadTimeReduction > 0 && annualFreightCostDelta > 0) {
    riskFlags.push(`Lead time reduces by ${leadTimeReduction} days but annual freight cost increases by BDT ${roundTo(annualFreightCostDelta, 0)}`);
  }

  // Recommendation
  let recommendation: string;
  if (newMode === 'air' && baseState.leadTimeMode === 'sea') {
    const breakEvenMonths = annualFreightCostDelta > 0
      ? Math.ceil(Math.abs(holdingCostChange * 12) / annualFreightCostDelta * 12)
      : 0;
    if (totalCostImpact < 0) {
      recommendation = `Switching to air freight saves BDT ${roundTo(Math.abs(totalCostImpact), 0)}/year in total cost despite higher freight. Recommended for high-value or time-sensitive parts.`;
    } else {
      recommendation = `Switching to air freight costs BDT ${roundTo(totalCostImpact, 0)}/year more. Lead time reduces by ${leadTimeReduction} days. Consider for stockout-prone items or CNY season only.`;
    }
  } else if (newMode === 'sea' && baseState.leadTimeMode === 'air') {
    if (totalCostImpact < 0) {
      recommendation = `Switching to sea freight saves BDT ${roundTo(Math.abs(totalCostImpact), 0)}/year. However, lead time increases by ${Math.abs(leadTimeReduction)} days. Ensure sufficient safety stock buffer.`;
    } else {
      recommendation = `Switching to sea freight increases total cost by BDT ${roundTo(totalCostImpact, 0)}/year due to higher safety stock requirements. Not recommended unless freight savings are substantial.`;
    }
  } else {
    recommendation = `No change in lead time mode. Current mode: ${newMode}.`;
  }

  // Shadow forecast
  const shadowForecast = generateShadowForecast(
    baseState,
    {
      ...baseState,
      leadTimeMode: newMode,
      avgLeadTimeDays: config.total,
      leadTimeStdDev: config.stdDev,
    },
    DEFAULT_FORECAST_HORIZON_MONTHS
  );

  // Confidence level
  const confidenceLevel = newMode === 'air' ? 0.85 : 0.75; // Air is more predictable

  return {
    modifications,
    impacts,
    shadowForecast,
    recommendation,
    riskFlags,
    totalCostImpact: roundTo(totalCostImpact, 2),
    confidenceLevel,
  };
}

// =============================================
// Section 5: Promo Index Scenario
// =============================================

/**
 * Run a What-If scenario changing the promo index.
 *
 * Applies demand formula: D(F) = beta_0 + beta_1 * Price + beta_2 * PromoIndex
 * Default betas: beta_0=150, beta_1=-2.5, beta_2=300
 */
export function runPromoIndexScenario(
  baseState: ScenarioBaseState,
  newPromoIndex: number
): ScenarioResult {
  const clampedPromoIndex = clamp(newPromoIndex, 0, 1);

  // Calculate baseline and scenario demand
  const baselineDemand = calculateDemand(baseState.unitPrice, baseState.promoIndex);
  const scenarioDemand = calculateDemand(baseState.unitPrice, clampedPromoIndex);

  // Demand change
  const demandChange = scenarioDemand - baselineDemand;
  const demandChangePercent = baselineDemand !== 0
    ? (demandChange / baselineDemand) * 100
    : 0;

  // Revenue impact (monthly)
  const baselineRevenue = baselineDemand * baseState.unitPrice;
  const scenarioRevenue = scenarioDemand * baseState.unitPrice;
  const revenueChange = scenarioRevenue - baselineRevenue;

  // Annual revenue impact
  const annualRevenueChange = revenueChange * 12;

  // Inventory requirement change (safety stock scales with demand)
  const demandScaleFactor = baselineDemand !== 0 ? scenarioDemand / baselineDemand : 1;
  const baselineSS = calculateSafetyStockStandard(
    baseState.avgMonthlyDemand,
    baseState.demandStdDev,
    baseState.avgLeadTimeDays,
    baseState.leadTimeStdDev,
    baseState.serviceLevel
  );
  const scenarioSS = baselineSS * demandScaleFactor;

  // Holding cost change
  const baselineHoldingCost = monthlyHoldingCost(baselineSS, baseState.unitCost, baseState.holdingCostPct);
  const scenarioHoldingCost = monthlyHoldingCost(scenarioSS, baseState.unitCost, baseState.holdingCostPct);

  // Annual demand change
  const baselineAnnualDemand = baselineDemand * 12;
  const scenarioAnnualDemand = scenarioDemand * 12;

  // Total cost impact = holding cost change * 12 - revenue change * 12
  // (promo increases revenue but also increases holding cost)
  const totalCostImpact = (scenarioHoldingCost - baselineHoldingCost) * 12 - annualRevenueChange;

  const impacts: ScenarioImpact[] = [
    createImpact('Monthly Demand', baselineDemand, scenarioDemand, 'units'),
    createImpact('Monthly Revenue', baselineRevenue, scenarioRevenue, 'BDT'),
    createImpact('Annual Revenue', baselineRevenue * 12, scenarioRevenue * 12, 'BDT'),
    createImpact('Safety Stock', baselineSS, scenarioSS, 'units'),
    createImpact('Monthly Holding Cost', baselineHoldingCost, scenarioHoldingCost, 'BDT'),
    createImpact('Annual Demand', baselineAnnualDemand, scenarioAnnualDemand, 'units'),
  ];

  const modifications: ScenarioModification[] = [
    {
      type: 'promo_index',
      currentValue: roundTo(baseState.promoIndex, 2),
      newValue: roundTo(clampedPromoIndex, 2),
      label: `Promo Index: ${roundTo(baseState.promoIndex, 2)} -> ${roundTo(clampedPromoIndex, 2)}`,
    },
  ];

  // Risk flags
  const riskFlags: string[] = [];
  if (clampedPromoIndex > baseState.promoIndex) {
    riskFlags.push(`Increased promo index drives ${roundTo(demandChangePercent, 1)}% demand lift -- verify supplier capacity`);
    if (scenarioSS > baselineSS * 1.3) {
      riskFlags.push(`Safety stock requirement increases by ${roundTo(((scenarioSS - baselineSS) / baselineSS) * 100, 1)}% -- ensure warehouse space`);
    }
  }
  if (clampedPromoIndex < baseState.promoIndex) {
    riskFlags.push(`Reduced promo index decreases demand by ${roundTo(Math.abs(demandChangePercent), 1)}% -- watch for excess inventory`);
  }
  if (scenarioDemand <= 0) {
    riskFlags.push('CRITICAL: Scenario demand drops to zero -- promo index too low for current price');
  }

  // Recommendation
  let recommendation: string;
  if (revenueChange > 0) {
    recommendation = `Increasing promo index to ${roundTo(clampedPromoIndex, 2)} boosts monthly revenue by BDT ${roundTo(revenueChange, 0)} (${roundTo(demandChangePercent, 1)}% demand lift). Balance against increased inventory holding costs of BDT ${roundTo(scenarioHoldingCost - baselineHoldingCost, 0)}/month.`;
  } else if (revenueChange < 0) {
    recommendation = `Decreasing promo index to ${roundTo(clampedPromoIndex, 2)} reduces monthly revenue by BDT ${roundTo(Math.abs(revenueChange), 0)}. Only recommended if reducing inventory carrying costs is the priority.`;
  } else {
    recommendation = 'No change in promo index. Current promo level is maintained.';
  }

  // Shadow forecast
  const shadowForecast = generateShadowForecast(
    baseState,
    {
      ...baseState,
      promoIndex: clampedPromoIndex,
      avgMonthlyDemand: scenarioDemand,
      annualDemand: scenarioAnnualDemand,
    },
    DEFAULT_FORECAST_HORIZON_MONTHS
  );

  const confidenceLevel = 0.80;

  return {
    modifications,
    impacts,
    shadowForecast,
    recommendation,
    riskFlags,
    totalCostImpact: roundTo(totalCostImpact, 2),
    confidenceLevel,
  };
}

// =============================================
// Section 6: Service Level Scenario
// =============================================

/**
 * Run a What-If scenario changing the service level.
 *
 * Maps service level to z-score and recalculates safety stock.
 * 90% -> 1.28, 95% -> 1.65, 97.5% -> 1.96, 99% -> 2.33
 */
export function runServiceLevelScenario(
  baseState: ScenarioBaseState,
  newServiceLevel: number
): ScenarioResult {
  const clampedServiceLevel = clamp(newServiceLevel, 0.5, 0.999);

  // Baseline calculations
  const baselineZScore = getSafetyFactor(baseState.serviceLevel);
  const baselineSS = calculateSafetyStockStandard(
    baseState.avgMonthlyDemand,
    baseState.demandStdDev,
    baseState.avgLeadTimeDays,
    baseState.leadTimeStdDev,
    baseState.serviceLevel
  );

  // Scenario calculations
  const scenarioZScore = getSafetyFactor(clampedServiceLevel);
  const scenarioSS = calculateSafetyStockStandard(
    baseState.avgMonthlyDemand,
    baseState.demandStdDev,
    baseState.avgLeadTimeDays,
    baseState.leadTimeStdDev,
    clampedServiceLevel
  );

  // Holding cost change
  const baselineHoldingCost = monthlyHoldingCost(baselineSS, baseState.unitCost, baseState.holdingCostPct);
  const scenarioHoldingCost = monthlyHoldingCost(scenarioSS, baseState.unitCost, baseState.holdingCostPct);
  const annualHoldingCostChange = (scenarioHoldingCost - baselineHoldingCost) * 12;

  // Reorder point
  const baselineROP = baseState.avgMonthlyDemand * (baseState.avgLeadTimeDays / 30) + baselineSS;
  const scenarioROP = baseState.avgMonthlyDemand * (baseState.avgLeadTimeDays / 30) + scenarioSS;

  // Stockout probability change
  const baselineStockout = stockoutProbability(baseState.serviceLevel);
  const scenarioStockout = stockoutProbability(clampedServiceLevel);

  // Total cost impact = annual holding cost change (service level doesn't directly affect freight/ordering)
  const totalCostImpact = annualHoldingCostChange;

  const impacts: ScenarioImpact[] = [
    createImpact('Z-Score (k)', baselineZScore, scenarioZScore, ''),
    createImpact('Safety Stock', baselineSS, scenarioSS, 'units'),
    createImpact('Reorder Point', baselineROP, scenarioROP, 'units'),
    createImpact('Monthly Holding Cost', baselineHoldingCost, scenarioHoldingCost, 'BDT'),
    createImpact('Annual Holding Cost', baselineHoldingCost * 12, scenarioHoldingCost * 12, 'BDT'),
    createImpact('Stockout Probability', baselineStockout * 100, scenarioStockout * 100, '%'),
  ];

  const modifications: ScenarioModification[] = [
    {
      type: 'service_level',
      currentValue: roundTo(baseState.serviceLevel, 3),
      newValue: roundTo(clampedServiceLevel, 3),
      label: `Service Level: ${roundTo(baseState.serviceLevel * 100, 1)}% -> ${roundTo(clampedServiceLevel * 100, 1)}%`,
    },
  ];

  // Risk flags
  const riskFlags: string[] = [];
  if (clampedServiceLevel > baseState.serviceLevel) {
    riskFlags.push(`Higher service level increases safety stock by ${roundTo(((scenarioSS - baselineSS) / clampMin(baselineSS, 1)) * 100, 1)}%`);
    if (scenarioSS > baselineSS * 2) {
      riskFlags.push('WARNING: Safety stock more than doubles -- verify warehouse capacity');
    }
    riskFlags.push(`Stockout risk decreases from ${roundTo(baselineStockout * 100, 1)}% to ${roundTo(scenarioStockout * 100, 1)}%`);
  }
  if (clampedServiceLevel < baseState.serviceLevel) {
    riskFlags.push(`Lower service level reduces safety stock by ${roundTo(((baselineSS - scenarioSS) / clampMin(baselineSS, 1)) * 100, 1)}%`);
    riskFlags.push(`Stockout risk increases from ${roundTo(baselineStockout * 100, 1)}% to ${roundTo(scenarioStockout * 100, 1)}%`);
    if (scenarioStockout > 0.10) {
      riskFlags.push('WARNING: Stockout probability exceeds 10% -- risk of lost sales and customer dissatisfaction');
    }
  }

  // Recommendation
  let recommendation: string;
  if (clampedServiceLevel > baseState.serviceLevel) {
    recommendation = `Increasing service level to ${roundTo(clampedServiceLevel * 100, 1)}% adds BDT ${roundTo(annualHoldingCostChange, 0)}/year in holding costs but reduces stockout probability to ${roundTo(scenarioStockout * 100, 1)}%. Recommended for critical or high-margin parts.`;
  } else if (clampedServiceLevel < baseState.serviceLevel) {
    recommendation = `Decreasing service level to ${roundTo(clampedServiceLevel * 100, 1)}% saves BDT ${roundTo(Math.abs(annualHoldingCostChange), 0)}/year but stockout probability rises to ${roundTo(scenarioStockout * 100, 1)}%. Only suitable for low-criticality parts with flexible demand.`;
  } else {
    recommendation = 'No change in service level. Current level is maintained.';
  }

  // Shadow forecast
  const shadowForecast = generateShadowForecast(
    baseState,
    {
      ...baseState,
      serviceLevel: clampedServiceLevel,
    },
    DEFAULT_FORECAST_HORIZON_MONTHS
  );

  const confidenceLevel = 0.90; // Service level model is well-understood

  return {
    modifications,
    impacts,
    shadowForecast,
    recommendation,
    riskFlags,
    totalCostImpact: roundTo(totalCostImpact, 2),
    confidenceLevel,
  };
}

// =============================================
// Section 7: Price Scenario
// =============================================

/**
 * Run a What-If scenario changing the unit price.
 *
 * Applies demand formula with new price and calculates:
 * - Demand elasticity impact
 * - Revenue change = new_demand * new_price - old_demand * old_price
 * - Margin impact
 */
export function runPriceScenario(
  baseState: ScenarioBaseState,
  newPrice: number
): ScenarioResult {
  const clampedPrice = clampMin(newPrice, 0);

  // Calculate baseline and scenario demand
  const baselineDemand = calculateDemand(baseState.unitPrice, baseState.promoIndex);
  const scenarioDemand = calculateDemand(clampedPrice, baseState.promoIndex);

  // Demand elasticity
  const priceChange = clampedPrice - baseState.unitPrice;
  const demandChange = scenarioDemand - baselineDemand;
  const priceChangePercent = baseState.unitPrice !== 0
    ? (priceChange / baseState.unitPrice) * 100
    : 0;
  const demandChangePercent = baselineDemand !== 0
    ? (demandChange / baselineDemand) * 100
    : 0;

  // Price elasticity of demand
  const elasticity = priceChangePercent !== 0
    ? demandChangePercent / priceChangePercent
    : 0;

  // Revenue impact
  const baselineRevenue = baselineDemand * baseState.unitPrice;
  const scenarioRevenue = scenarioDemand * clampedPrice;
  const revenueChange = scenarioRevenue - baselineRevenue;
  const annualRevenueChange = revenueChange * 12;

  // Margin impact (contribution margin)
  const baselineMargin = baselineDemand * (baseState.unitPrice - baseState.unitCost);
  const scenarioMargin = scenarioDemand * (clampedPrice - baseState.unitCost);
  const marginChange = scenarioMargin - baselineMargin;
  const annualMarginChange = marginChange * 12;

  // Safety stock adjustment (demand change affects safety stock)
  const demandScaleFactor = baselineDemand !== 0 ? scenarioDemand / baselineDemand : 1;
  const baselineSS = calculateSafetyStockStandard(
    baseState.avgMonthlyDemand,
    baseState.demandStdDev,
    baseState.avgLeadTimeDays,
    baseState.leadTimeStdDev,
    baseState.serviceLevel
  );
  const scenarioSS = baselineSS * clampMin(demandScaleFactor, 0);

  // Holding cost change
  const baselineHoldingCost = monthlyHoldingCost(baselineSS, baseState.unitCost, baseState.holdingCostPct);
  const scenarioHoldingCost = monthlyHoldingCost(scenarioSS, baseState.unitCost, baseState.holdingCostPct);

  // Total cost impact = -margin change + holding cost change
  const totalCostImpact = -annualMarginChange + (scenarioHoldingCost - baselineHoldingCost) * 12;

  const impacts: ScenarioImpact[] = [
    createImpact('Monthly Demand', baselineDemand, scenarioDemand, 'units'),
    createImpact('Monthly Revenue', baselineRevenue, scenarioRevenue, 'BDT'),
    createImpact('Annual Revenue', baselineRevenue * 12, scenarioRevenue * 12, 'BDT'),
    createImpact('Monthly Contribution Margin', baselineMargin, scenarioMargin, 'BDT'),
    createImpact('Annual Margin', baselineMargin * 12, scenarioMargin * 12, 'BDT'),
    createImpact('Price Elasticity', 0, elasticity, ''),
    createImpact('Safety Stock', baselineSS, scenarioSS, 'units'),
  ];

  const modifications: ScenarioModification[] = [
    {
      type: 'price',
      currentValue: roundTo(baseState.unitPrice, 2),
      newValue: roundTo(clampedPrice, 2),
      label: `Unit Price: BDT ${roundTo(baseState.unitPrice, 2)} -> BDT ${roundTo(clampedPrice, 2)}`,
    },
  ];

  // Risk flags
  const riskFlags: string[] = [];
  if (clampedPrice > baseState.unitPrice) {
    riskFlags.push(`Price increase of ${roundTo(priceChangePercent, 1)}% reduces demand by ${roundTo(Math.abs(demandChangePercent), 1)}% (elasticity: ${roundTo(elasticity, 2)})`);
    if (scenarioDemand <= 0) {
      riskFlags.push('CRITICAL: Demand drops to zero at this price point -- price is too high');
    }
    if (revenueChange < 0) {
      riskFlags.push('WARNING: Revenue decreases despite price increase -- demand is elastic, price increase is counterproductive');
    }
  }
  if (clampedPrice < baseState.unitPrice) {
    riskFlags.push(`Price decrease of ${roundTo(Math.abs(priceChangePercent), 1)}% increases demand by ${roundTo(demandChangePercent, 1)}%`);
    if (scenarioMargin < baselineMargin) {
      riskFlags.push('WARNING: Contribution margin decreases -- volume gain does not offset lower margin per unit');
    }
    if (clampedPrice < baseState.unitCost) {
      riskFlags.push('CRITICAL: Price below unit cost -- selling at a loss');
    }
  }
  if (Math.abs(elasticity) > 1) {
    riskFlags.push(`Demand is elastic (|e|=${roundTo(Math.abs(elasticity), 2)} > 1) -- small price changes have large demand impact`);
  }

  // Recommendation
  let recommendation: string;
  if (revenueChange > 0 && marginChange > 0) {
    recommendation = `Price change to BDT ${roundTo(clampedPrice, 2)} increases both revenue (+BDT ${roundTo(revenueChange, 0)}/month) and margin (+BDT ${roundTo(marginChange, 0)}/month). Recommended.`;
  } else if (revenueChange > 0 && marginChange <= 0) {
    recommendation = `Price change to BDT ${roundTo(clampedPrice, 2)} increases revenue but decreases margin. Not recommended unless volume growth is strategic.`;
  } else if (revenueChange <= 0 && marginChange > 0) {
    recommendation = `Price change to BDT ${roundTo(clampedPrice, 2)} decreases revenue but increases margin per unit. Consider if inventory carrying costs are a concern.`;
  } else {
    recommendation = `Price change to BDT ${roundTo(clampedPrice, 2)} decreases both revenue and margin. Not recommended.`;
  }

  // Shadow forecast
  const shadowForecast = generateShadowForecast(
    baseState,
    {
      ...baseState,
      unitPrice: clampedPrice,
      avgMonthlyDemand: scenarioDemand,
      annualDemand: scenarioDemand * 12,
    },
    DEFAULT_FORECAST_HORIZON_MONTHS
  );

  const confidenceLevel = 0.75; // Price elasticity model has moderate uncertainty

  return {
    modifications,
    impacts,
    shadowForecast,
    recommendation,
    riskFlags,
    totalCostImpact: roundTo(totalCostImpact, 2),
    confidenceLevel,
  };
}

// =============================================
// Section 8: Order Quantity Scenario
// =============================================

/**
 * Run a What-If scenario changing the order quantity.
 *
 * Compares with EOQ optimal and calculates:
 * - Total cost for both quantities: (D/Q)*K + (Q/2)*h
 * - Identifies if over/under-ordering vs optimal
 * - Waste/shortage risk
 */
export function runOrderQuantityScenario(
  baseState: ScenarioBaseState,
  newQuantity: number
): ScenarioResult {
  const clampedQuantity = clampMin(newQuantity, 1);

  // Calculate EOQ optimal
  const holdingCostPerUnit = baseState.unitCost * baseState.holdingCostPct;
  const eoqResult = calculateEOQ({
    annualDemand: baseState.annualDemand,
    orderingCost: baseState.orderingCost,
    holdingCostPerUnit,
  });

  const optimalEOQ = eoqResult.eoq;

  // Total cost for baseline quantity
  const baselineTotalCost = totalOrderingCost(
    baseState.annualDemand,
    baseState.orderQuantity,
    baseState.orderingCost,
    holdingCostPerUnit
  );

  // Total cost for scenario quantity
  const scenarioTotalCost = totalOrderingCost(
    baseState.annualDemand,
    clampedQuantity,
    baseState.orderingCost,
    holdingCostPerUnit
  );

  // Total cost at EOQ optimal
  const optimalTotalCost = totalOrderingCost(
    baseState.annualDemand,
    optimalEOQ,
    baseState.orderingCost,
    holdingCostPerUnit
  );

  // Cost deviation from optimal
  const baselineDeviation = baselineTotalCost - optimalTotalCost;
  const scenarioDeviation = scenarioTotalCost - optimalTotalCost;

  // Ordering frequency
  const baselineOrdersPerYear = baseState.annualDemand / clampMin(baseState.orderQuantity, 1);
  const scenarioOrdersPerYear = baseState.annualDemand / clampedQuantity;
  const optimalOrdersPerYear = baseState.annualDemand / clampMin(optimalEOQ, 1);

  // Order cycle days
  const baselineCycleDays = Math.round(365 / clampMin(baselineOrdersPerYear, 0.01));
  const scenarioCycleDays = Math.round(365 / clampMin(scenarioOrdersPerYear, 0.01));
  const optimalCycleDays = Math.round(365 / clampMin(optimalOrdersPerYear, 0.01));

  // Over/under-ordering analysis
  const quantityVsOptimal = clampedQuantity - optimalEOQ;
  const isOverOrdering = quantityVsOptimal > 0;
  const isUnderOrdering = quantityVsOptimal < 0;

  // Waste risk: over-ordering leads to excess inventory
  const excessInventory = isOverOrdering ? quantityVsOptimal : 0;
  const wasteRiskCost = excessInventory * baseState.unitCost * baseState.holdingCostPct / 2;

  // Shortage risk: under-ordering leads to more frequent stockouts
  const shortageRisk = isUnderOrdering
    ? clampMin((optimalEOQ - clampedQuantity) / optimalEOQ, 0)
    : 0;

  // Total cost impact (annual)
  const totalCostImpact = scenarioTotalCost - baselineTotalCost;

  const impacts: ScenarioImpact[] = [
    createImpact('Order Quantity', baseState.orderQuantity, clampedQuantity, 'units'),
    createImpact('Annual Total Cost', baselineTotalCost, scenarioTotalCost, 'BDT'),
    createImpact('Cost vs EOQ Optimal', baselineDeviation, scenarioDeviation, 'BDT'),
    createImpact('Orders per Year', baselineOrdersPerYear, scenarioOrdersPerYear, ''),
    createImpact('Order Cycle', baselineCycleDays, scenarioCycleDays, 'days'),
    createImpact('EOQ Optimal', optimalEOQ, optimalEOQ, 'units'),
  ];

  const modifications: ScenarioModification[] = [
    {
      type: 'order_quantity',
      currentValue: baseState.orderQuantity,
      newValue: clampedQuantity,
      label: `Order Quantity: ${baseState.orderQuantity} -> ${clampedQuantity} units (EOQ optimal: ${optimalEOQ})`,
    },
  ];

  // Risk flags
  const riskFlags: string[] = [];
  if (isOverOrdering) {
    riskFlags.push(`Over-ordering by ${quantityVsOptimal} units vs EOQ optimal -- excess holding cost: BDT ${roundTo(wasteRiskCost, 0)}/year`);
    if (clampedQuantity > optimalEOQ * 2) {
      riskFlags.push('WARNING: Order quantity is more than 2x the EOQ optimal -- significant capital tied up in inventory');
    }
  }
  if (isUnderOrdering) {
    riskFlags.push(`Under-ordering by ${Math.abs(quantityVsOptimal)} units vs EOQ -- shortage risk: ${roundTo(shortageRisk * 100, 1)}%`);
    if (scenarioOrdersPerYear > 24) {
      riskFlags.push('WARNING: More than 24 orders/year -- administrative burden and potential ordering cost escalation');
    }
  }
  if (scenarioDeviation > optimalTotalCost * 0.1) {
    riskFlags.push(`Total cost exceeds EOQ optimal by ${roundTo((scenarioDeviation / optimalTotalCost) * 100, 1)}% -- consider adjusting to EOQ of ${optimalEOQ} units`);
  }

  // Recommendation
  let recommendation: string;
  const costImprovement = baselineTotalCost - scenarioTotalCost;
  if (costImprovement > 0) {
    recommendation = `Changing order quantity to ${clampedQuantity} units saves BDT ${roundTo(costImprovement, 0)}/year in total cost. ${clampedQuantity === optimalEOQ ? 'This matches the EOQ optimal.' : `EOQ optimal is ${optimalEOQ} units (saves an additional BDT ${roundTo(scenarioDeviation, 0)}/year).`}`;
  } else if (costImprovement < 0) {
    recommendation = `Changing order quantity to ${clampedQuantity} units increases total cost by BDT ${roundTo(Math.abs(costImprovement), 0)}/year. The EOQ optimal of ${optimalEOQ} units would minimize cost at BDT ${roundTo(optimalTotalCost, 0)}/year.`;
  } else {
    recommendation = `Current order quantity of ${baseState.orderQuantity} is at the optimal. EOQ = ${optimalEOQ} units.`;
  }

  // Shadow forecast (order quantity doesn't change demand pattern, but affects inventory levels)
  const shadowForecast = generateShadowForecast(
    baseState,
    {
      ...baseState,
      orderQuantity: clampedQuantity,
    },
    DEFAULT_FORECAST_HORIZON_MONTHS
  );

  const confidenceLevel = 0.92; // EOQ model is mathematically precise

  return {
    modifications,
    impacts,
    shadowForecast,
    recommendation,
    riskFlags,
    totalCostImpact: roundTo(totalCostImpact, 2),
    confidenceLevel,
  };
}

// =============================================
// Section 9: Shadow Forecast Generation
// =============================================

/**
 * Generate a shadow forecast comparing baseline and scenario states
 * over the next N months with BD seasonal multipliers.
 *
 * For each month:
 *   - Baseline forecast = base_demand * season_multiplier
 *   - Scenario forecast = scenario_demand * season_multiplier
 *   - Confidence bounds based on demand variability
 */
export function generateShadowForecast(
  baseState: ScenarioBaseState,
  scenarioState: ScenarioBaseState,
  months: number = DEFAULT_FORECAST_HORIZON_MONTHS
): ShadowForecastPoint[] {
  const points: ShadowForecastPoint[] = [];

  for (let i = 1; i <= months; i++) {
    const { month, label } = getFutureMonth(i);
    const seasonMultiplier = getSeasonMultiplier(month);

    // Baseline forecast
    const baseline = clampMin(baseState.avgMonthlyDemand * seasonMultiplier, 0);

    // Scenario forecast
    const scenario = clampMin(scenarioState.avgMonthlyDemand * seasonMultiplier, 0);

    // Confidence bounds (based on scenario forecast + demand variability)
    const uncertainty = scenarioState.demandStdDev * seasonMultiplier;
    const lowerBound = clampMin(scenario - 1.96 * uncertainty, 0);
    const upperBound = scenario + 1.96 * uncertainty;

    points.push({
      month: label,
      baseline: roundTo(baseline, 1),
      scenario: roundTo(scenario, 1),
      lowerBound: roundTo(lowerBound, 1),
      upperBound: roundTo(upperBound, 1),
    });
  }

  return points;
}

// =============================================
// Section 10: Impact Summary Generator
// =============================================

/**
 * Aggregate all impacts into a human-readable summary with:
 * - Net BDT impact (positive or negative)
 * - Risk flags for critical changes
 * - Recommendation text
 */
export function generateImpactSummary(
  baseState: ScenarioBaseState,
  scenarioResult: ScenarioResult
): {
  summaryText: string;
  netImpactBDT: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  keyFindings: string[];
} {
  const { impacts, riskFlags, totalCostImpact } = scenarioResult;

  // Key findings from significant impacts
  const keyFindings: string[] = [];
  for (const impact of impacts) {
    if (Math.abs(impact.changePercent) > 5) {
      const direction = impact.changePercent > 0 ? 'increases' : 'decreases';
      keyFindings.push(
        `${impact.metric} ${direction} by ${roundTo(Math.abs(impact.changePercent), 1)}% (${roundTo(impact.baseline, 2)} -> ${roundTo(impact.scenario, 2)} ${impact.unit})`
      );
    }
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  const criticalFlags = riskFlags.filter(f => f.startsWith('CRITICAL') || f.startsWith('WARNING'));
  if (criticalFlags.length >= 2 || riskFlags.some(f => f.startsWith('CRITICAL'))) {
    riskLevel = 'critical';
  } else if (criticalFlags.length >= 1 || riskFlags.length >= 3) {
    riskLevel = 'high';
  } else if (riskFlags.length >= 1 || Math.abs(totalCostImpact) > 50000) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // Net BDT impact
  const netImpactBDT = roundTo(totalCostImpact, 2);

  // Summary text
  const costDirection = totalCostImpact > 0 ? 'cost increase' : 'cost savings';
  const summaryText = [
    `Net impact: BDT ${roundTo(Math.abs(totalCostImpact), 0)} ${costDirection} per year.`,
    `${keyFindings.length} significant change(s) detected across ${impacts.length} metrics.`,
    `Risk level: ${riskLevel.toUpperCase()}. ${riskFlags.length} risk flag(s) identified.`,
    scenarioResult.recommendation,
  ].join(' ');

  return {
    summaryText,
    netImpactBDT,
    riskLevel,
    keyFindings,
  };
}

// =============================================
// Section 11: Sea vs Air Comparison
// =============================================

/**
 * Run a side-by-side comparison of Sea vs Air freight for the given base state.
 *
 * Returns both scenario results, a recommendation, net savings,
 * and risk analysis including CNY risk and total cost of ownership.
 */
export function compareSeaVsAir(baseState: ScenarioBaseState): SeaVsAirComparison {
  // Run scenarios for both modes (always compare from the same baseline)
  const neutralBaseState: ScenarioBaseState = {
    ...baseState,
    leadTimeMode: 'sea', // Treat sea as the baseline for comparison
    avgLeadTimeDays: LEAD_TIME_CONFIG.sea.total,
    leadTimeStdDev: LEAD_TIME_CONFIG.sea.stdDev,
  };

  const seaResult = runLeadTimeScenario(neutralBaseState, 'sea');
  const airResult = runLeadTimeScenario(neutralBaseState, 'air');

  // Total cost of ownership for each mode (annual)
  const seaSafetyStock = calculateSafetyStockStandard(
    baseState.avgMonthlyDemand,
    baseState.demandStdDev,
    LEAD_TIME_CONFIG.sea.total,
    LEAD_TIME_CONFIG.sea.stdDev,
    baseState.serviceLevel
  );
  const airSafetyStock = calculateSafetyStockStandard(
    baseState.avgMonthlyDemand,
    baseState.demandStdDev,
    LEAD_TIME_CONFIG.air.total,
    LEAD_TIME_CONFIG.air.stdDev,
    baseState.serviceLevel
  );

  // Annual holding cost
  const seaAnnualHolding = seaSafetyStock * baseState.unitCost * baseState.holdingCostPct;
  const airAnnualHolding = airSafetyStock * baseState.unitCost * baseState.holdingCostPct;

  // Annual freight cost
  const seaAnnualFreight = FREIGHT_COST.sea * baseState.annualDemand;
  const airAnnualFreight = FREIGHT_COST.air * baseState.annualDemand;

  // EOQ-based ordering cost (same for both modes)
  const holdingCostPerUnit = baseState.unitCost * baseState.holdingCostPct;
  const eoqResult = calculateEOQ({
    annualDemand: baseState.annualDemand,
    orderingCost: baseState.orderingCost,
    holdingCostPerUnit,
  });

  // Total cost of ownership = holding + freight + ordering
  const seaTotalCostOfOwnership = seaAnnualHolding + seaAnnualFreight + eoqResult.totalCost;
  const airTotalCostOfOwnership = airAnnualHolding + airAnnualFreight + eoqResult.totalCost;

  // Net savings (positive = air is cheaper, negative = sea is cheaper)
  const netSavings = seaTotalCostOfOwnership - airTotalCostOfOwnership;

  // Stockout probability for each mode
  const seaStockoutProb = stockoutProbability(baseState.serviceLevel);
  const airStockoutProb = stockoutProbability(baseState.serviceLevel);
  // Air has lower effective stockout due to shorter lead time
  const seaEffectiveStockout = seaStockoutProb * (1 + LEAD_TIME_CONFIG.sea.stdDev / LEAD_TIME_CONFIG.sea.total);
  const airEffectiveStockout = airStockoutProb * (1 + LEAD_TIME_CONFIG.air.stdDev / LEAD_TIME_CONFIG.air.total);

  // CNY risk: sea freight is affected during CNY window
  const currentMonth = getCurrentMonth();
  const currentDay = new Date().getDate();
  const isCurrentlyCNY = isInCNYWindow(currentMonth, currentDay);
  const seaCnyRisk = isCurrentlyCNY || currentMonth <= 2; // CNY season risk for sea
  const airCnyRisk = false; // Air is less affected by CNY

  // Recommendation
  let recommendation: LeadTimeMode;
  if (netSavings > 0) {
    // Air is cheaper overall
    recommendation = 'air';
  } else {
    // Sea is cheaper overall
    recommendation = 'sea';
  }

  // Override: if CNY risk is high and the cost difference is small, recommend air
  if (seaCnyRisk && Math.abs(netSavings) < seaTotalCostOfOwnership * 0.15) {
    recommendation = 'air';
  }

  return {
    sea: seaResult,
    air: airResult,
    recommendation,
    netSavingsBDT: roundTo(netSavings, 2),
    riskAnalysis: {
      seaStockoutProbability: roundTo(seaEffectiveStockout, 4),
      airStockoutProbability: roundTo(airEffectiveStockout, 4),
      seaCnyRisk,
      airCnyRisk,
      seaTotalCostOfOwnership: roundTo(seaTotalCostOfOwnership, 2),
      airTotalCostOfOwnership: roundTo(airTotalCostOfOwnership, 2),
    },
  };
}

// =============================================
// Section 12: Multi-Scenario Runner
// =============================================

/** A set of modifications to apply simultaneously */
export interface MultiScenarioConfig {
  leadTimeMode?: LeadTimeMode;
  promoIndex?: number;
  serviceLevel?: number;
  unitPrice?: number;
  orderQuantity?: number;
}

/**
 * Run multiple scenario modifications simultaneously and aggregate results.
 * Applies each modification in sequence, accumulating impacts.
 */
export function runMultiScenario(
  baseState: ScenarioBaseState,
  config: MultiScenarioConfig
): ScenarioResult {
  const allModifications: ScenarioModification[] = [];
  const allImpacts: ScenarioImpact[] = [];
  const allRiskFlags: string[] = [];
  let currentState = { ...baseState };
  let totalCostImpact = 0;
  let minConfidence = 1;

  // Apply lead time mode change
  if (config.leadTimeMode && config.leadTimeMode !== baseState.leadTimeMode) {
    const result = runLeadTimeScenario(currentState, config.leadTimeMode);
    allModifications.push(...result.modifications);
    allImpacts.push(...result.impacts);
    allRiskFlags.push(...result.riskFlags);
    totalCostImpact += result.totalCostImpact;
    minConfidence = Math.min(minConfidence, result.confidenceLevel);

    const ltConfig = LEAD_TIME_CONFIG[config.leadTimeMode];
    currentState = {
      ...currentState,
      leadTimeMode: config.leadTimeMode,
      avgLeadTimeDays: ltConfig.total,
      leadTimeStdDev: ltConfig.stdDev,
    };
  }

  // Apply promo index change
  if (config.promoIndex !== undefined && config.promoIndex !== baseState.promoIndex) {
    const result = runPromoIndexScenario(currentState, config.promoIndex);
    allModifications.push(...result.modifications);
    allImpacts.push(...result.impacts);
    allRiskFlags.push(...result.riskFlags);
    totalCostImpact += result.totalCostImpact;
    minConfidence = Math.min(minConfidence, result.confidenceLevel);

    const newDemand = calculateDemand(currentState.unitPrice, config.promoIndex);
    currentState = {
      ...currentState,
      promoIndex: config.promoIndex,
      avgMonthlyDemand: newDemand,
      annualDemand: newDemand * 12,
    };
  }

  // Apply service level change
  if (config.serviceLevel !== undefined && config.serviceLevel !== baseState.serviceLevel) {
    const result = runServiceLevelScenario(currentState, config.serviceLevel);
    allModifications.push(...result.modifications);
    allImpacts.push(...result.impacts);
    allRiskFlags.push(...result.riskFlags);
    totalCostImpact += result.totalCostImpact;
    minConfidence = Math.min(minConfidence, result.confidenceLevel);

    currentState = {
      ...currentState,
      serviceLevel: config.serviceLevel,
    };
  }

  // Apply price change
  if (config.unitPrice !== undefined && config.unitPrice !== baseState.unitPrice) {
    const result = runPriceScenario(currentState, config.unitPrice);
    allModifications.push(...result.modifications);
    allImpacts.push(...result.impacts);
    allRiskFlags.push(...result.riskFlags);
    totalCostImpact += result.totalCostImpact;
    minConfidence = Math.min(minConfidence, result.confidenceLevel);

    const newDemand = calculateDemand(config.unitPrice, currentState.promoIndex);
    currentState = {
      ...currentState,
      unitPrice: config.unitPrice,
      avgMonthlyDemand: newDemand,
      annualDemand: newDemand * 12,
    };
  }

  // Apply order quantity change
  if (config.orderQuantity !== undefined && config.orderQuantity !== baseState.orderQuantity) {
    const result = runOrderQuantityScenario(currentState, config.orderQuantity);
    allModifications.push(...result.modifications);
    allImpacts.push(...result.impacts);
    allRiskFlags.push(...result.riskFlags);
    totalCostImpact += result.totalCostImpact;
    minConfidence = Math.min(minConfidence, result.confidenceLevel);

    currentState = {
      ...currentState,
      orderQuantity: config.orderQuantity,
    };
  }

  // Generate combined shadow forecast
  const shadowForecast = generateShadowForecast(
    baseState,
    currentState,
    DEFAULT_FORECAST_HORIZON_MONTHS
  );

  // Generate combined recommendation
  const impactSummary = generateImpactSummary(baseState, {
    modifications: allModifications,
    impacts: allImpacts,
    shadowForecast,
    recommendation: '',
    riskFlags: allRiskFlags,
    totalCostImpact,
    confidenceLevel: minConfidence,
  });

  return {
    modifications: allModifications,
    impacts: allImpacts,
    shadowForecast,
    recommendation: impactSummary.summaryText,
    riskFlags: Array.from(new Set(allRiskFlags)), // Deduplicate
    totalCostImpact: roundTo(totalCostImpact, 2),
    confidenceLevel: minConfidence,
  };
}

// =============================================
// Section 13: BD Season Calendar Export
// =============================================

/**
 * BD season calendar: maps each month (1-12) to its season info.
 * Reuses BD_SEASONS from models.ts via getBDSeason().
 */
export function getBDSeasonCalendar(): Record<number, { season: BDSeason; multiplier: number; label: string }> {
  const calendar: Record<number, { season: BDSeason; multiplier: number; label: string }> = {};
  for (let month = 1; month <= 12; month++) {
    const info = getBDSeason(month);
    calendar[month] = {
      season: info.season,
      multiplier: info.demandMultiplier,
      label: info.label,
    };
  }
  return calendar;
}
