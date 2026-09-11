// ============================================
// TrimedCast LEAN — EOQ + Safety Stock engine
// Implements the Economic Order Quantity with three real-world
// constraints (MOQ, max stock, warehouse capacity) and the
// TrimedCast Safety Stock formula:
//   SS = (EOQ / R) + (MAE_daily × μ_LT × σ_LT) × k
//   ROP = (daily_demand × lead_time) + safety_stock
// ============================================

// --- Service level → safety factor (k / z-score) ---

export const SERVICE_LEVEL_FACTORS: Record<number, number> = {
  0.90: 1.28,   // Low-criticality (decorative)
  0.95: 1.65,   // Standard (default)
  0.975: 1.96,  // High-turnover (brake pads, filters)
  0.99: 2.33,   // Critical (brake assemblies)
  0.999: 3.09,  // Life-critical (brake discs, steering)
};

export const SERVICE_LEVEL_TABLE = [
  { serviceLevel: 0.90, k: 1.28, useCase: 'Low-criticality (decorative, optional)' },
  { serviceLevel: 0.95, k: 1.65, useCase: 'Standard (default for most parts)' },
  { serviceLevel: 0.975, k: 1.96, useCase: 'High-turnover (brake pads, spark plugs)' },
  { serviceLevel: 0.99, k: 2.33, useCase: 'Critical (brake assemblies, engine)' },
  { serviceLevel: 0.999, k: 3.09, useCase: 'Life-critical (brake discs, steering)' },
];

export function getSafetyFactor(serviceLevel: number): number {
  if (SERVICE_LEVEL_FACTORS[serviceLevel] !== undefined) return SERVICE_LEVEL_FACTORS[serviceLevel];
  // Linear interpolation between nearest defined levels
  const levels = Object.keys(SERVICE_LEVEL_FACTORS).map(Number).sort((a, b) => a - b);
  if (serviceLevel <= levels[0]) return SERVICE_LEVEL_FACTORS[levels[0]];
  if (serviceLevel >= levels[levels.length - 1]) return SERVICE_LEVEL_FACTORS[levels[levels.length - 1]];
  for (let i = 0; i < levels.length - 1; i++) {
    if (levels[i] <= serviceLevel && serviceLevel <= levels[i + 1]) {
      const ratio = (serviceLevel - levels[i]) / (levels[i + 1] - levels[i]);
      const kLow = SERVICE_LEVEL_FACTORS[levels[i]];
      const kHigh = SERVICE_LEVEL_FACTORS[levels[i + 1]];
      return Math.round((kLow + ratio * (kHigh - kLow)) * 100) / 100;
    }
  }
  return 1.65;
}

// --- Defaults (BD motorcycle-parts import lane) ---

export const DEFAULT_ORDERING_COST_BDT = 500;       // per purchase order
export const DEFAULT_HOLDING_COST_PCT = 0.20;       // 20% of unit cost / year
// Breakdown: warehouse 5% + insurance 2% + obsolescence 8% + capital 5%
export const DEFAULT_REVIEW_PERIOD_DAYS = 10;
export const DEFAULT_SERVICE_LEVEL = 0.95;

// Lead-time decomposition (China → Bangladesh)
export const LEAD_TIME_DECOMPOSITION = {
  sea: { manufacturing: 90, shipment: 52, customs: 10, internal: 3, total: 155 },
  air: { manufacturing: 90, shipment: 8, customs: 3, internal: 3, total: 104 },
} as const;

// Default σ_LT when < 5 historical orders
export const DEFAULT_SIGMA_LT = { sea: 15.0, air: 5.0 };
export const DEFAULT_MEAN_LT = { sea: 152, air: 101 };

// --- Lead-time statistics (from purchase history) ---

export interface LeadTimeStats {
  meanLeadTime: number;
  sigmaLt: number;
  dataPoints: number;
  usedDefaults: boolean;
}

/**
 * Compute mean + σ_LT from actual purchase_history lead times.
 * Falls back to BD defaults if < 5 observations.
 */
export function calculateLeadTimeStats(
  actualLeadTimes: number[],
  shipmentMode: 'sea' | 'air' = 'sea',
): LeadTimeStats {
  const valid = actualLeadTimes.filter((t) => t > 0 && t < 400);
  const MIN_ORDERS = 5;
  if (valid.length < MIN_ORDERS) {
    return {
      meanLeadTime: DEFAULT_MEAN_LT[shipmentMode],
      sigmaLt: DEFAULT_SIGMA_LT[shipmentMode],
      dataPoints: valid.length,
      usedDefaults: true,
    };
  }
  const n = valid.length;
  const mean = valid.reduce((s, t) => s + t, 0) / n;
  const variance = valid.reduce((s, t) => s + (t - mean) ** 2, 0) / (n - 1);
  return {
    meanLeadTime: Math.round(mean * 10) / 10,
    sigmaLt: Math.round(Math.sqrt(variance) * 100) / 100,
    dataPoints: n,
    usedDefaults: false,
  };
}

// --- EOQ with constraints ---

export interface EOQInput {
  annualDemand: number;          // forecasted units/year
  unitCost: number;               // BDT per unit
  orderingCost?: number;          // BDT per PO (default 500)
  holdingCostPct?: number;        // fraction of unit cost (default 0.20)
  supplierMoq?: number;           // minimum order quantity
  maxStockQty?: number;           // warehouse slot limit
  warehouseCapacityRemaining?: number;
  currentStock?: number;
}

export interface EOQOutput {
  eoq: number;
  eoqUnconstrained: number;
  holdingCostPerUnit: number;
  ordersPerYear: number;
  orderCycleDays: number;
  totalOrderingCost: number;
  totalHoldingCost: number;
  totalInventoryCost: number;
  constraintsApplied: string[];
  inputs: EOQInput;
}

export function calculateEOQ(input: EOQInput): EOQOutput {
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

  if (annualDemand <= 0 || unitCost <= 0) {
    return {
      eoq: 0, eoqUnconstrained: 0, holdingCostPerUnit: 0, ordersPerYear: 0,
      orderCycleDays: 0, totalOrderingCost: 0, totalHoldingCost: 0,
      totalInventoryCost: 0, constraintsApplied: ['Invalid inputs (zero demand or cost)'], inputs: input,
    };
  }

  const holdingCostPerUnit = unitCost * holdingCostPct;
  const eoqUnconstrained = Math.sqrt((2 * orderingCost * annualDemand) / holdingCostPerUnit);

  let eoq = eoqUnconstrained;
  const constraintsApplied: string[] = [];

  // Constraint 1: max_stock_qty
  if (maxStockQty && maxStockQty > 0 && eoq > maxStockQty) {
    eoq = maxStockQty;
    constraintsApplied.push(`Capped to max_stock_qty=${maxStockQty}`);
  }
  // Constraint 2: supplier MOQ
  if (supplierMoq && supplierMoq > 0 && eoq < supplierMoq) {
    eoq = supplierMoq;
    constraintsApplied.push(`Raised to supplier_moq=${supplierMoq}`);
  }
  // Constraint 3: warehouse capacity remaining
  if (warehouseCapacityRemaining && warehouseCapacityRemaining > 0 && eoq > warehouseCapacityRemaining) {
    eoq = warehouseCapacityRemaining;
    constraintsApplied.push(`Capped to warehouse_capacity=${warehouseCapacityRemaining}`);
  }
  // Constraint 4: current stock + EOQ must not exceed max
  if (maxStockQty && currentStock > 0 && eoq + currentStock > maxStockQty) {
    const adj = Math.max(0, maxStockQty - currentStock);
    if (adj < eoq) {
      eoq = adj;
      constraintsApplied.push(`Adjusted: stock(${currentStock})+EOQ exceeds max(${maxStockQty}), reduced to ${adj}`);
    }
  }

  const ordersPerYear = eoq > 0 ? annualDemand / eoq : 0;
  const orderCycleDays = ordersPerYear > 0 ? 365 / ordersPerYear : 0;
  const totalOrderingCost = ordersPerYear * orderingCost;
  const totalHoldingCost = (eoq / 2) * holdingCostPerUnit;

  return {
    eoq: Math.round(eoq),
    eoqUnconstrained: Math.round(eoqUnconstrained),
    holdingCostPerUnit: Math.round(holdingCostPerUnit * 100) / 100,
    ordersPerYear: Math.round(ordersPerYear * 100) / 100,
    orderCycleDays: Math.round(orderCycleDays * 10) / 10,
    totalOrderingCost: Math.round(totalOrderingCost * 100) / 100,
    totalHoldingCost: Math.round(totalHoldingCost * 100) / 100,
    totalInventoryCost: Math.round((totalOrderingCost + totalHoldingCost) * 100) / 100,
    constraintsApplied,
    inputs: input,
  };
}

// --- Safety Stock + Reorder Point ---

export interface SafetyStockInput {
  eoq: number;
  mae: number;                    // forecast Mean Absolute Error (monthly)
  meanLeadTimeDays: number;       // μ_LT
  sigmaLt: number;                // σ_LT
  shipmentMode: 'sea' | 'air';
  serviceLevel?: number;
  reviewPeriodDays?: number;
  avgDailyDemand?: number;
}

export interface SafetyStockOutput {
  safetyStock: number;
  reorderPoint: number;
  componentCycleStock: number;     // EOQ / R
  componentUncertainty: number;    // (MAE_daily × μ_LT × σ_LT) × k
  safetyFactorK: number;
  serviceLevel: number;
  dailyDemand: number;
  leadTimeDays: number;
  maeUsed: number;
  inputs: SafetyStockInput;
}

/**
 * TrimedCast Safety Stock formula:
 *   SS = (EOQ / R) + (MAE_daily × μ_LT × σ_LT) × k
 *   ROP = (daily_demand × lead_time) + safety_stock
 *
 * MAE is normalized to daily (÷30) to prevent unrealistic values
 * when lead times are long (152 days sea).
 */
export function calculateSafetyStock(input: SafetyStockInput): SafetyStockOutput {
  const {
    eoq, mae, meanLeadTimeDays, sigmaLt, shipmentMode,
    serviceLevel = DEFAULT_SERVICE_LEVEL,
    reviewPeriodDays = DEFAULT_REVIEW_PERIOD_DAYS,
    avgDailyDemand = 0,
  } = input;

  const k = getSafetyFactor(serviceLevel);
  const maeDaily = mae / 30; // normalize monthly MAE to daily

  const componentCycleStock = reviewPeriodDays > 0 ? eoq / reviewPeriodDays : 0;
  const componentUncertainty = maeDaily * meanLeadTimeDays * sigmaLt * k;

  const safetyStock = Math.round(componentCycleStock + componentUncertainty);
  const dailyDemand = avgDailyDemand > 0 ? avgDailyDemand : 0;
  const reorderPoint = Math.round(dailyDemand * meanLeadTimeDays + safetyStock);

  return {
    safetyStock: Math.max(0, safetyStock),
    reorderPoint: Math.max(0, reorderPoint),
    componentCycleStock: Math.round(componentCycleStock * 100) / 100,
    componentUncertainty: Math.round(componentUncertainty * 100) / 100,
    safetyFactorK: k,
    serviceLevel,
    dailyDemand,
    leadTimeDays: meanLeadTimeDays,
    maeUsed: Math.round(maeDaily * 100) / 100,
    inputs: input,
  };
}

// --- Combined: EOQ + Safety Stock in one call ---

export interface OrderQuantityResult {
  eoq: EOQOutput;
  safetyStock: SafetyStockOutput;
  /** The final recommended order quantity = max(EOQ, ROP - currentStock) */
  recommendedQty: number;
  /** Annual demand used (from forecast) */
  annualDemand: number;
  /** Shipment mode used */
  shipmentMode: 'sea' | 'air';
}

/**
 * Compute the full order-quantity recommendation: EOQ + safety stock + ROP,
 * returning the recommended order quantity for the upcoming session.
 */
export function computeOrderQuantity(
  forecastQty: number,        // total forecast units for the session horizon
  horizonMonths: number,      // forecast horizon
  unitCost: number,
  mae: number,
  currentStock: number,
  shipmentMode: 'sea' | 'air',
  leadTimeStats: LeadTimeStats,
  options: {
    serviceLevel?: number;
    supplierMoq?: number;
    maxStockQty?: number;
    warehouseCapacityRemaining?: number;
    orderingCost?: number;
    holdingCostPct?: number;
  } = {},
): OrderQuantityResult {
  // Annualize the forecast demand
  const annualDemand = horizonMonths > 0 ? (forecastQty / horizonMonths) * 12 : forecastQty;

  const eoq = calculateEOQ({
    annualDemand,
    unitCost,
    orderingCost: options.orderingCost,
    holdingCostPct: options.holdingCostPct,
    supplierMoq: options.supplierMoq,
    maxStockQty: options.maxStockQty,
    warehouseCapacityRemaining: options.warehouseCapacityRemaining,
    currentStock,
  });

  // Average daily demand from annual
  const avgDailyDemand = annualDemand / 365;

  const safetyStock = calculateSafetyStock({
    eoq: eoq.eoq,
    mae,
    meanLeadTimeDays: leadTimeStats.meanLeadTime,
    sigmaLt: leadTimeStats.sigmaLt,
    shipmentMode,
    serviceLevel: options.serviceLevel,
    avgDailyDemand,
  });

  // Recommended order qty: if current stock is below ROP, order enough to
  // cover the forecast + safety stock - what we have; otherwise order EOQ
  const shortfall = safetyStock.reorderPoint - currentStock;
  const recommendedQty = Math.max(eoq.eoq, Math.max(0, shortfall));

  return {
    eoq,
    safetyStock,
    recommendedQty: Math.round(recommendedQty),
    annualDemand: Math.round(annualDemand),
    shipmentMode,
  };
}
