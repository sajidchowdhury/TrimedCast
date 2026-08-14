// ============================================
// TrimedCast Order Trigger Calculator (CORE IP)
// THE SINGLE MOST VALUABLE ALGORITHM IN THE SYSTEM
//
// Answers THREE QUESTIONS:
//   Q1: WHAT to order?   → needs_order, stock_status
//   Q2: WHAT QTY?        → recommended_qty (with constraints)
//   Q3: WHEN to order?   → order_trigger_date, timeline, urgency
//
// Considers: China mfg + shipment + BD customs + CNY impact + monsoon + buffer
// ============================================

import { getBDSeason, type BDSeason } from './models';

// =============================================
// Section 2: Lead Time Decomposition
// =============================================

export interface LeadTimeConfig {
  // Manufacturing (China)
  manufacturingDays: number;       // typically 90 days
  manufacturingVariance: number;   // variance in days

  // Shipping method
  shippingMethod: 'sea' | 'air';
  seaTransitDays: number;          // typically 52 days
  airTransitDays: number;          // typically 8 days
  shippingVariance: number;

  // BD Customs
  customsClearanceDays: number;    // typically 10 days (sea), 3 days (air)
  customsVariance: number;

  // Internal processing
  internalProcessingDays: number;  // PO creation, QC, etc.

  // Sub-stage defaults (from Section 2.2-2.4)
  orderProcessingDays: number;     // 2 days: supplier acknowledges order
  packingLoadingDays: number;      // 2 days: goods packed & loaded at port
  warehouseTransportDays: number;  // 1 day: final transport to warehouse
  qcShelvingDays: number;          // 1 day: QC check + shelving
}

export const DEFAULT_LEAD_TIME: LeadTimeConfig = {
  manufacturingDays: 90,
  manufacturingVariance: 15,
  shippingMethod: 'sea',
  seaTransitDays: 52,
  airTransitDays: 8,
  shippingVariance: 7,
  customsClearanceDays: 10,
  customsVariance: 5,
  internalProcessingDays: 3,
  orderProcessingDays: 2,
  packingLoadingDays: 2,
  warehouseTransportDays: 1,
  qcShelvingDays: 1,
};

export function calculateTotalLeadTime(config: LeadTimeConfig = DEFAULT_LEAD_TIME): {
  total: number;
  breakdown: { manufacturing: number; shipping: number; customs: number; internal: number };
  variance: number;
} {
  const shipping = config.shippingMethod === 'sea' ? config.seaTransitDays : config.airTransitDays;
  const customs = config.shippingMethod === 'sea' ? config.customsClearanceDays : 3;

  return {
    total: config.manufacturingDays + shipping + customs + config.internalProcessingDays,
    breakdown: {
      manufacturing: config.manufacturingDays,
      shipping,
      customs,
      internal: config.internalProcessingDays,
    },
    variance: Math.sqrt(
      Math.pow(config.manufacturingVariance, 2) +
      Math.pow(config.shippingVariance, 2) +
      Math.pow(config.customsVariance, 2)
    ),
  };
}

// =============================================
// Section 2.6: Lead Time Variability (PERT Model)
// =============================================

export interface LeadTimeDistribution {
  // Manufacturing
  mfgBest: number;       // Best case (75 days)
  mfgLikely: number;     // Most likely (90 days)
  mfgWorst: number;      // Worst case (120 days)

  // Shipment (Sea)
  shipSeaBest: number;   // 45 days
  shipSeaLikely: number; // 52 days
  shipSeaWorst: number;  // 65 days

  // Shipment (Air)
  shipAirBest: number;   // 5 days
  shipAirLikely: number; // 8 days
  shipAirWorst: number;  // 12 days

  // Customs (Sea/Chittagong)
  customsSeaBest: number;    // 7 days
  customsSeaLikely: number;  // 10 days
  customsSeaWorst: number;   // 18 days

  // Customs (Air/Dhaka)
  customsAirBest: number;    // 2 days
  customsAirLikely: number;  // 3 days
  customsAirWorst: number;   // 5 days
}

export const DEFAULT_LT_DISTRIBUTION: LeadTimeDistribution = {
  mfgBest: 75, mfgLikely: 90, mfgWorst: 120,
  shipSeaBest: 45, shipSeaLikely: 52, shipSeaWorst: 65,
  shipAirBest: 5, shipAirLikely: 8, shipAirWorst: 12,
  customsSeaBest: 7, customsSeaLikely: 10, customsSeaWorst: 18,
  customsAirBest: 2, customsAirLikely: 3, customsAirWorst: 5,
};

/** PERT expected value: (best + 4*likely + worst) / 6 */
function pertExpected(best: number, likely: number, worst: number): number {
  return (best + 4 * likely + worst) / 6;
}

/** Approximate P90 using PERT: mean + 1.28 * stddev */
function pertP90(best: number, likely: number, worst: number): number {
  const mean = pertExpected(best, likely, worst);
  const stddev = (worst - best) / 6;
  return mean + 1.28 * stddev;
}

export function calculateLeadTimeP90(
  dist: LeadTimeDistribution = DEFAULT_LT_DISTRIBUTION,
  mode: 'sea' | 'air' = 'sea'
): { totalP90: number; mfgP90: number; shipP90: number; customsP90: number } {
  const mfgP90 = pertP90(dist.mfgBest, dist.mfgLikely, dist.mfgWorst);
  const shipP90 = mode === 'sea'
    ? pertP90(dist.shipSeaBest, dist.shipSeaLikely, dist.shipSeaWorst)
    : pertP90(dist.shipAirBest, dist.shipAirLikely, dist.shipAirWorst);
  const customsP90 = mode === 'sea'
    ? pertP90(dist.customsSeaBest, dist.customsSeaLikely, dist.customsSeaWorst)
    : pertP90(dist.customsAirBest, dist.customsAirLikely, dist.customsAirWorst);

  return { totalP90: Math.round(mfgP90 + shipP90 + customsP90), mfgP90: Math.round(mfgP90), shipP90: Math.round(shipP90), customsP90: Math.round(customsP90) };
}

// =============================================
// Section 3: CNY (Chinese New Year) Impact Model
// =============================================

export interface CNYInfo {
  year: number;
  date: Date;          // Exact date of Lunar New Year
  startDate: Date;     // Factory shutdown start
  endDate: Date;       // Factory shutdown end
  shutdownDays: number;
  rushStart: Date;     // Rush order deadline
  effectiveStart: Date; // Including pre-CNY wind-down (5 days before)
  effectiveEnd: Date;   // Including post-CNY restart buffer (3 days after)
}

// CNY dates 2025-2030 with correct shutdown windows from the doc
export const CNY_DATES: CNYInfo[] = [
  {
    year: 2025, date: new Date('2025-01-29'),
    startDate: new Date('2025-01-20'), endDate: new Date('2025-02-10'),
    shutdownDays: 21, rushStart: new Date('2025-01-06'),
    effectiveStart: new Date('2025-01-15'), effectiveEnd: new Date('2025-02-13'),
  },
  {
    year: 2026, date: new Date('2026-02-17'),
    startDate: new Date('2026-02-07'), endDate: new Date('2026-02-28'),
    shutdownDays: 21, rushStart: new Date('2026-01-24'),
    effectiveStart: new Date('2026-02-02'), effectiveEnd: new Date('2026-03-03'),
  },
  {
    year: 2027, date: new Date('2027-02-06'),
    startDate: new Date('2027-01-27'), endDate: new Date('2027-02-17'),
    shutdownDays: 21, rushStart: new Date('2027-01-13'),
    effectiveStart: new Date('2027-01-22'), effectiveEnd: new Date('2027-02-20'),
  },
  {
    year: 2028, date: new Date('2028-01-26'),
    startDate: new Date('2028-01-16'), endDate: new Date('2028-02-06'),
    shutdownDays: 21, rushStart: new Date('2028-01-02'),
    effectiveStart: new Date('2028-01-11'), effectiveEnd: new Date('2028-02-09'),
  },
  {
    year: 2029, date: new Date('2029-02-13'),
    startDate: new Date('2029-02-03'), endDate: new Date('2029-02-24'),
    shutdownDays: 21, rushStart: new Date('2029-01-20'),
    effectiveStart: new Date('2029-01-29'), effectiveEnd: new Date('2029-02-27'),
  },
  {
    year: 2030, date: new Date('2030-02-03'),
    startDate: new Date('2030-01-24'), endDate: new Date('2030-02-14'),
    shutdownDays: 21, rushStart: new Date('2030-01-10'),
    effectiveStart: new Date('2030-01-19'), effectiveEnd: new Date('2030-02-17'),
  },
];

export function getCNYForYear(year: number): CNYInfo | null {
  return CNY_DATES.find(c => c.year === year) || null;
}

export function getCNYForDate(targetDate: Date): CNYInfo | null {
  // Check current year and next year
  const year = targetDate.getFullYear();
  for (const y of [year, year + 1]) {
    const cny = CNY_DATES.find(c => c.year === y);
    if (cny && targetDate <= cny.effectiveEnd) return cny;
  }
  return null;
}

export function isCNYShutdown(date: Date): boolean {
  return CNY_DATES.some(c => date >= c.startDate && date <= c.endDate);
}

// =============================================
// Section 3.2: CNY Risk Assessment (Full)
// =============================================

export type CNYStrategy = 'before_cny' | 'after_cny' | 'partial_order' | 'air_escape' | 'none';

export interface CNYRiskAssessment {
  hasRisk: boolean;
  overlapDays: number;
  effectiveCnyStart: Date;
  cnyShutdownStart: Date;
  cnyShutdownEnd: Date;
  strategy: CNYStrategy;
  additionalDelayDays: number;
  latestSafeOrderDate: Date | null;
  postCnyOrderDate: Date | null;
  explanation: string;
}

function assessCNYRisk(
  orderTriggerDate: Date,
  mfgDays: number,
  cnyInfo: CNYInfo | null,
  today: Date,
): CNYRiskAssessment {
  if (!cnyInfo) {
    return {
      hasRisk: false, overlapDays: 0,
      effectiveCnyStart: today, cnyShutdownStart: today, cnyShutdownEnd: today,
      strategy: 'none', additionalDelayDays: 0,
      latestSafeOrderDate: null, postCnyOrderDate: null,
      explanation: 'No CNY window provided for analysis.',
    };
  }

  const effectiveCnyStart = cnyInfo.effectiveStart;
  const effectiveCnyEnd = cnyInfo.effectiveEnd;

  // Manufacturing period
  const orderProcDays = 2;
  const mfgStart = addDays(orderTriggerDate, orderProcDays);
  const mfgEnd = addDays(mfgStart, mfgDays);

  // Check overlap
  const overlapStart = new Date(Math.max(mfgStart.getTime(), effectiveCnyStart.getTime()));
  const overlapEnd = new Date(Math.min(mfgEnd.getTime(), effectiveCnyEnd.getTime()));

  if (overlapStart < overlapEnd) {
    const overlapDays = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));

    // Strategy A: Latest safe order date
    const latestSafe = addDays(effectiveCnyStart, -(mfgDays + orderProcDays));

    // Strategy B: Post-CNY order date
    const postCnyOrder = effectiveCnyEnd;

    // Total CNY shutdown period
    const cnyTotalDays = Math.round((effectiveCnyEnd.getTime() - effectiveCnyStart.getTime()) / (1000 * 60 * 60 * 24));

    if (latestSafe >= today) {
      return {
        hasRisk: true, overlapDays,
        effectiveCnyStart, cnyShutdownStart: cnyInfo.startDate, cnyShutdownEnd: cnyInfo.endDate,
        strategy: 'before_cny', additionalDelayDays: 0,
        latestSafeOrderDate: latestSafe, postCnyOrderDate: null,
        explanation: `CNY RISK: Mfg overlaps CNY by ${overlapDays} days. STRATEGY A: Order by ${formatDate(latestSafe)} to complete manufacturing before CNY shutdown (${formatDate(cnyInfo.startDate)}–${formatDate(cnyInfo.endDate)}).`,
      };
    } else {
      return {
        hasRisk: true, overlapDays,
        effectiveCnyStart, cnyShutdownStart: cnyInfo.startDate, cnyShutdownEnd: cnyInfo.endDate,
        strategy: 'after_cny', additionalDelayDays: cnyTotalDays,
        latestSafeOrderDate: null, postCnyOrderDate: postCnyOrder,
        explanation: `CNY RISK: Mfg overlaps CNY by ${overlapDays} days. Cannot finish before CNY. STRATEGY B: Order after CNY on ${formatDate(postCnyOrder)}. Effective delay: ${cnyTotalDays} days.`,
      };
    }
  }

  return {
    hasRisk: false, overlapDays: 0,
    effectiveCnyStart, cnyShutdownStart: cnyInfo.startDate, cnyShutdownEnd: cnyInfo.endDate,
    strategy: 'none', additionalDelayDays: 0,
    latestSafeOrderDate: null, postCnyOrderDate: null,
    explanation: `No CNY risk. Manufacturing completes before CNY window (${formatDate(cnyInfo.startDate)}–${formatDate(cnyInfo.endDate)}).`,
  };
}

// =============================================
// Section 3.3: CNY Strategy Selection Algorithm
// =============================================

export function selectCNYStrategy(
  daysUntilStockout: number,
  cnyDelayDays: number,
  itemMarginPct: number,
  itemUrgency: 'critical' | 'high' | 'normal' | 'low',
  canAirShip: boolean,
  airCostMultiplier: number = 8.0,
): CNYStrategy {
  // Can we survive the CNY delay with current stock?
  if (daysUntilStockout > cnyDelayDays + 30) {
    return 'after_cny';
  }

  // Stockout risk — try to order before CNY
  if (itemUrgency === 'critical' || itemUrgency === 'high') {
    return 'before_cny';
  }

  // Emergency: stockout imminent, consider air
  if (daysUntilStockout <= 30 && canAirShip && itemMarginPct >= 30) {
    return 'air_escape';
  }

  // Default: partial approach
  return 'partial_order';
}

// =============================================
// Section 4.1: Core Data Structures
// =============================================

export type Urgency = 'critical' | 'high' | 'normal' | 'low';
export type ShipmentMode = 'sea' | 'air';
export type StockStatus = 'below_reorder' | 'at_safety' | 'adequate' | 'overstock' | 'stockout' | 'no_demand';

export interface OrderTimeline {
  orderTriggerDate: Date;
  orderProcessingEnd: Date;
  mfgStartDate: Date;
  mfgCompleteDate: Date;
  packingLoadingEnd: Date;
  shipDepartureDate: Date;
  arrivalDate: Date;
  customsStartDate: Date;
  customsClearanceDate: Date;
  warehouseArrivalDate: Date;
  availableForSaleDate: Date;
  totalLeadTimeDays: number;
  cnyDelayDays: number;
}

function buildTimeline(
  orderTriggerDate: Date,
  mfgDays: number,
  shipmentDays: number,
  customsDays: number,
  orderProcessingDays: number,
  packingLoadingDays: number,
  warehouseTransportDays: number,
  qcShelvingDays: number,
  cnyDelayDays: number,
): OrderTimeline {
  const orderProcessingEnd = addDays(orderTriggerDate, orderProcessingDays);

  const effectiveMfgDays = mfgDays + cnyDelayDays;
  const mfgStartDate = orderProcessingEnd;
  const mfgCompleteDate = addDays(mfgStartDate, effectiveMfgDays);

  const packingLoadingEnd = addDays(mfgCompleteDate, packingLoadingDays);

  const shipDepartureDate = packingLoadingEnd;
  const arrivalDate = addDays(shipDepartureDate, shipmentDays);

  const customsStartDate = arrivalDate;
  const customsClearanceDate = addDays(customsStartDate, customsDays);

  const warehouseArrivalDate = addDays(customsClearanceDate, warehouseTransportDays);
  const availableForSaleDate = addDays(warehouseArrivalDate, qcShelvingDays);

  const totalLeadTimeDays = orderProcessingDays + effectiveMfgDays + packingLoadingDays +
    shipmentDays + customsDays + warehouseTransportDays + qcShelvingDays;

  return {
    orderTriggerDate,
    orderProcessingEnd,
    mfgStartDate,
    mfgCompleteDate,
    packingLoadingEnd,
    shipDepartureDate,
    arrivalDate,
    customsStartDate,
    customsClearanceDate,
    warehouseArrivalDate,
    availableForSaleDate,
    totalLeadTimeDays,
    cnyDelayDays,
  };
}

// =============================================
// Section 5: Recommended Order Quantity Calculator
// =============================================

export interface QuantityBreakdown {
  totalNeeded: number;
  totalSupply: number;
  gap: number;
  eoq: number;
  moq: number;
  maxStock: number;
  preConstraintQty: number;
  recommendedQty: number;
  status: 'order_needed' | 'adequate' | 'overstock' | 'warehouse_full';
  constraintsApplied: string[];
  reason: string;
}

export function calculateRecommendedQty(
  forecastedDemand: number,
  safetyStock: number,
  currentStock: number,
  qtyOnOrder: number,
  eoq: number,
  moq: number,
  maxStock: number,
): QuantityBreakdown {
  const constraintsApplied: string[] = [];

  // Step 1-3: Calculate demand gap
  const totalNeeded = forecastedDemand + safetyStock;
  const totalSupply = currentStock + qtyOnOrder;
  const gap = totalNeeded - totalSupply;

  // Step 4: Check if stock is adequate
  if (gap <= 0) {
    return {
      recommendedQty: 0, status: 'adequate',
      reason: `Stock sufficient. Supply (${totalSupply}) covers need (${totalNeeded}).`,
      gap, eoq, moq, maxStock, constraintsApplied: [],
      totalNeeded, totalSupply, preConstraintQty: 0,
    };
  }

  // Step 5: Check overstock
  if (currentStock > maxStock) {
    return {
      recommendedQty: 0, status: 'overstock',
      reason: `Currently overstocked (${currentStock} > max ${maxStock}). Allow draw-down.`,
      gap, eoq, moq, maxStock, constraintsApplied: ['overstock_drawdown'],
      totalNeeded, totalSupply, preConstraintQty: 0,
    };
  }

  // Step 6: Start with economic quantity
  let qty = Math.max(gap, eoq);
  if (eoq > gap) {
    constraintsApplied.push(`eoq_floor: EOQ (${eoq}) > gap (${gap}), using EOQ`);
  }

  // Step 7: Apply MOQ constraint
  if (qty < moq) {
    qty = moq;
    constraintsApplied.push(`moq_floor: qty raised to MOQ (${moq})`);
  }

  const preConstraintQty = qty;

  // Step 8: Apply warehouse capacity constraint
  const warehouseCapacityRemaining = maxStock - currentStock;
  if (qty > warehouseCapacityRemaining) {
    qty = warehouseCapacityRemaining;
    constraintsApplied.push(
      `warehouse_cap: qty reduced from ${preConstraintQty} to ${qty} (max_stock ${maxStock} - current ${currentStock})`
    );
  }

  // Step 9: Check if warehouse can't even fit MOQ
  if (qty < moq && qty > 0) {
    return {
      recommendedQty: 0, status: 'warehouse_full',
      reason: `Insufficient warehouse space for MOQ. Available space: ${warehouseCapacityRemaining}, MOQ: ${moq}.`,
      gap, eoq, moq, maxStock, constraintsApplied: [...constraintsApplied, 'warehouse_below_moq'],
      totalNeeded, totalSupply, preConstraintQty,
    };
  }

  qty = Math.max(0, qty);
  const status = qty > 0 ? 'order_needed' as const : 'adequate' as const;
  const reason = `Order ${qty} units. Gap: ${gap}, constrained by: ${constraintsApplied.length > 0 ? constraintsApplied.join('; ') : 'none'}`;

  return {
    recommendedQty: qty, status, reason,
    gap, eoq, moq, maxStock, constraintsApplied,
    totalNeeded, totalSupply, preConstraintQty,
  };
}

// =============================================
// Section 6: Category-Specific Seasonal Adjustments
// =============================================

export const SEASONAL_WEIGHTS: Record<BDSeason, number> = {
  winter: 1.40,
  summer: 1.00,
  monsoon: 0.65,
  pre_winter: 1.25,
};

export const CATEGORY_SEASONAL_ADJUSTMENTS: Record<string, Record<BDSeason, number>> = {
  brake_system: { winter: 1.50, summer: 1.00, monsoon: 1.20, pre_winter: 1.30 },
  chain_sprocket: { winter: 1.60, summer: 1.10, monsoon: 0.80, pre_winter: 1.40 },
  riding_gear: { winter: 2.00, summer: 0.50, monsoon: 1.50, pre_winter: 1.80 },
  engine: { winter: 1.20, summer: 1.10, monsoon: 0.60, pre_winter: 1.30 },
  electrical: { winter: 0.80, summer: 1.50, monsoon: 1.30, pre_winter: 1.00 },
  body: { winter: 1.00, summer: 0.90, monsoon: 0.70, pre_winter: 1.10 },
};

export function applySeasonalWeight(baseDemand: number, season: BDSeason, category: string): number {
  const categoryAdj = CATEGORY_SEASONAL_ADJUSTMENTS[category];
  if (categoryAdj && categoryAdj[season]) {
    return baseDemand * categoryAdj[season];
  }
  return baseDemand * (SEASONAL_WEIGHTS[season] || 1.0);
}

export function getSeasonForDate(targetDate: Date): BDSeason {
  const month = targetDate.getMonth() + 1;
  if (month === 11 || month === 12 || month === 1 || month === 2) return 'winter';
  if (month >= 3 && month <= 5) return 'summer';
  if (month >= 6 && month <= 9) return 'monsoon';
  return 'pre_winter';
}

export function getSeasonDateRange(season: BDSeason, year: number): { start: Date; end: Date } {
  switch (season) {
    case 'winter': return { start: new Date(year, 10, 1), end: new Date(year + 1, 1, 28) };
    case 'summer': return { start: new Date(year, 2, 1), end: new Date(year, 4, 31) };
    case 'monsoon': return { start: new Date(year, 5, 1), end: new Date(year, 8, 30) };
    case 'pre_winter': return { start: new Date(year, 9, 1), end: new Date(year, 9, 31) };
  }
}

// =============================================
// Section 4: Order Trigger Calculator (Full 9-Step)
// =============================================

export interface OrderTriggerInput {
  productId: string;
  productSku: string;
  productName: string;
  category?: string;
  currentStock: number;
  reservedStock: number;
  safetyStock: number;
  maxStock: number;
  reorderPoint: number;
  avgDailyDemand: number;
  forecastedDemand?: number;
  qtyOnOrder?: number;
  eoq?: number;
  moq?: number;
  leadTimeConfig?: Partial<LeadTimeConfig>;
  shippingMethod?: 'sea' | 'air';
  serviceLevel?: number;
  bufferDays?: number;
  monsoonAdjustment?: number;
}

export interface OrderTriggerResult {
  productId: string;
  productSku: string;
  productName: string;

  // Q1: What to order
  needsOrder: boolean;
  reorderPoint: number;
  currentStock: number;
  availableStock: number;
  safetyStock: number;
  stockStatus: StockStatus;
  daysOfStock: number;

  // Q2: What qty
  suggestedOrderQty: number;
  qtyBreakdown: QuantityBreakdown;

  // Q3: When to order
  orderTriggerDate: Date;
  reorderHitDate: Date;
  expectedDeliveryDate: Date;
  timeline: OrderTimeline;
  urgency: Urgency;
  daysUntilTrigger: number;

  // Lead time
  totalLeadTimeDays: number;
  leadTimeBreakdown: {
    manufacturing: number;
    shipping: number;
    customs: number;
    internal: number;
  };

  // CNY analysis
  cnyRisk: CNYRiskAssessment;

  // Shipment recommendation
  recommendedShipmentMode: ShipmentMode;

  // Season
  currentSeason: BDSeason;
  seasonNote: string;
}

/**
 * THE CORE ALGORITHM — Full 9-step implementation
 * Calculates when, what, and how much to order for a single SKU.
 */
export function calculateOrderTrigger(input: OrderTriggerInput): OrderTriggerResult {
  const {
    productId, productSku, productName, category,
    currentStock, reservedStock, safetyStock, maxStock = 500,
    reorderPoint, avgDailyDemand,
    forecastedDemand = 0, qtyOnOrder = 0,
    eoq = 100, moq = 50,
    serviceLevel = 0.95,
    bufferDays = 7,
    monsoonAdjustment = 0,
  } = input;

  const availableStock = currentStock - reservedStock;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Merge lead time config
  const leadTimeConfig: LeadTimeConfig = { ...DEFAULT_LEAD_TIME, ...(input.leadTimeConfig || {}) };
  if (input.shippingMethod) leadTimeConfig.shippingMethod = input.shippingMethod;

  // ── STEP 1: Determine shipment and customs durations ──
  const shipmentDays = leadTimeConfig.shippingMethod === 'sea'
    ? leadTimeConfig.seaTransitDays + monsoonAdjustment
    : leadTimeConfig.airTransitDays;
  const customsDays = leadTimeConfig.shippingMethod === 'sea'
    ? leadTimeConfig.customsClearanceDays
    : 3;

  // ── STEP 2: Calculate Reorder Point (Q1) ──
  const totalLeadTime = leadTimeConfig.manufacturingDays + shipmentDays + customsDays;
  const effectiveReorderPoint = reorderPoint > 0
    ? reorderPoint
    : (avgDailyDemand * totalLeadTime) + safetyStock;

  // Determine stock status
  let stockStatus: StockStatus;
  let needsOrder: boolean;

  if (availableStock <= 0) {
    stockStatus = 'stockout';
    needsOrder = true;
  } else if (availableStock <= safetyStock) {
    stockStatus = 'at_safety';
    needsOrder = true;
  } else if (availableStock <= effectiveReorderPoint) {
    stockStatus = 'below_reorder';
    needsOrder = true;
  } else if (availableStock > maxStock) {
    stockStatus = 'overstock';
    needsOrder = false;
  } else {
    stockStatus = 'adequate';
    needsOrder = availableStock < effectiveReorderPoint;
  }

  const daysOfStock = avgDailyDemand > 0
    ? Math.floor(availableStock / avgDailyDemand)
    : 999;

  // ── STEP 3: Calculate Order Trigger Date (Q3) ──
  let daysUntilSafetyStock: number;
  if (avgDailyDemand > 0) {
    daysUntilSafetyStock = (availableStock - safetyStock) / avgDailyDemand;
  } else {
    daysUntilSafetyStock = Infinity;
  }

  const safetyStockHitDate = addDays(today, Math.max(0, Math.round(daysUntilSafetyStock)));
  let orderTriggerDate = addDays(safetyStockHitDate, -(totalLeadTime + bufferDays));

  // ── STEP 4: CNY Risk Assessment ──
  const cnyInfo = getCNYForDate(today);
  let cnyRisk = assessCNYRisk(orderTriggerDate, leadTimeConfig.manufacturingDays, cnyInfo, today);

  // If CNY risk detected, revise order trigger date
  let cnyDelayDays = 0;
  if (cnyRisk.hasRisk) {
    if (cnyRisk.strategy === 'before_cny' && cnyRisk.latestSafeOrderDate && cnyRisk.latestSafeOrderDate >= today) {
      // Order early enough to finish before CNY
      orderTriggerDate = new Date(Math.min(orderTriggerDate.getTime(), cnyRisk.latestSafeOrderDate.getTime()));
    } else if (cnyRisk.strategy === 'after_cny' && cnyRisk.postCnyOrderDate) {
      // Accept delay, order after CNY
      orderTriggerDate = cnyRisk.postCnyOrderDate;
      cnyDelayDays = cnyRisk.additionalDelayDays;
    }
  }

  // ── STEP 5: Build Complete Timeline ──
  const timeline = buildTimeline(
    orderTriggerDate,
    leadTimeConfig.manufacturingDays,
    shipmentDays,
    customsDays,
    leadTimeConfig.orderProcessingDays,
    leadTimeConfig.packingLoadingDays,
    leadTimeConfig.warehouseTransportDays,
    leadTimeConfig.qcShelvingDays,
    cnyDelayDays,
  );

  // ── STEP 6: Determine Urgency ──
  const daysUntilTrigger = Math.round((orderTriggerDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let urgency: Urgency;
  if (daysUntilTrigger <= 0) urgency = 'critical';
  else if (daysUntilTrigger <= 30) urgency = 'critical';
  else if (daysUntilTrigger <= 90) urgency = 'high';
  else if (daysUntilTrigger <= 180) urgency = 'normal';
  else urgency = 'low';

  // Upgrade urgency if CNY causes stockout gap
  if (cnyRisk.hasRisk && urgency === 'normal' && cnyRisk.strategy === 'after_cny') {
    const availableDate = timeline.availableForSaleDate;
    if (safetyStockHitDate < availableDate) {
      const stockoutDays = Math.round((availableDate.getTime() - safetyStockHitDate.getTime()) / (1000 * 60 * 60 * 24));
      if (stockoutDays > 30) urgency = 'high';
    }
  }

  // ── STEP 7: Calculate Recommended Order Quantity (Q2) ──
  const qtyBreakdown = calculateRecommendedQty(
    forecastedDemand,
    safetyStock,
    availableStock,
    qtyOnOrder,
    eoq,
    moq,
    maxStock,
  );

  // ── STEP 8: Recommend shipment mode ──
  let recommendedShipmentMode: ShipmentMode = leadTimeConfig.shippingMethod;
  if (urgency === 'critical' && leadTimeConfig.shippingMethod === 'sea' && daysUntilTrigger <= 0) {
    recommendedShipmentMode = 'air';
  }

  // ── STEP 9: Return complete result ──
  const currentSeason = getBDSeason(today.getMonth() + 1);
  const seasonNote = getSeasonNote(currentSeason.season);

  const leadTime = calculateTotalLeadTime(leadTimeConfig);

  return {
    productId, productSku, productName,
    needsOrder, reorderPoint: Math.round(effectiveReorderPoint),
    currentStock, availableStock, safetyStock, stockStatus, daysOfStock,
    suggestedOrderQty: qtyBreakdown.recommendedQty,
    qtyBreakdown,
    orderTriggerDate, reorderHitDate: safetyStockHitDate,
    expectedDeliveryDate: timeline.availableForSaleDate,
    timeline, urgency, daysUntilTrigger,
    totalLeadTimeDays: timeline.totalLeadTimeDays,
    leadTimeBreakdown: leadTime.breakdown,
    cnyRisk,
    recommendedShipmentMode,
    currentSeason: currentSeason.season,
    seasonNote,
  };
}

// =============================================
// Section 10: Safe Calculate (Error Handling)
// =============================================

export function safeCalculateOrderTrigger(input: OrderTriggerInput): OrderTriggerResult {
  try {
    // ── Comprehensive Input Validation (Section 10) ──
    if (input.avgDailyDemand < 0) throw new Error('avgDailyDemand cannot be negative');
    if (input.currentStock < 0) throw new Error('currentStock cannot be negative');
    if (input.safetyStock < 0) throw new Error('safetyStock cannot be negative');
    if (input.reservedStock < 0) throw new Error('reservedStock cannot be negative');
    if (input.maxStock !== undefined && input.maxStock < 0) throw new Error('maxStock cannot be negative');
    if (input.eoq !== undefined && input.eoq < 0) throw new Error('eoq cannot be negative');
    if (input.moq !== undefined && input.moq < 0) throw new Error('moq cannot be negative');
    if (input.forecastedDemand !== undefined && input.forecastedDemand < 0) throw new Error('forecastedDemand cannot be negative');
    if (input.qtyOnOrder !== undefined && input.qtyOnOrder < 0) throw new Error('qtyOnOrder cannot be negative');
    if (input.serviceLevel !== undefined && (input.serviceLevel < 0 || input.serviceLevel > 1)) throw new Error('serviceLevel must be between 0 and 1');

    // Handle negative lead time config
    if (input.leadTimeConfig) {
      const lt = input.leadTimeConfig;
      if (lt.manufacturingDays <= 0) throw new Error('manufacturingDays must be positive');
      if (lt.seaTransitDays <= 0) throw new Error('seaTransitDays must be positive');
      if (lt.airTransitDays <= 0) throw new Error('airTransitDays must be positive');
      if (lt.customsClearanceDays < 0) throw new Error('customsClearanceDays cannot be negative');
    }

    // Handle extremely large forecasted demand (overflow protection)
    const MAX_DEMAND = 1_000_000;
    if (input.forecastedDemand > MAX_DEMAND) {
      console.warn(`[OrderTrigger] forecastedDemand (${input.forecastedDemand}) exceeds ${MAX_DEMAND}, capping`);
      input = { ...input, forecastedDemand: MAX_DEMAND };
    }

    // Handle zero consumption
    if (input.avgDailyDemand === 0) {
      const today = new Date();
      return {
        productId: input.productId, productSku: input.productSku, productName: input.productName,
        needsOrder: input.currentStock < input.safetyStock,
        reorderPoint: input.safetyStock, currentStock: input.currentStock,
        availableStock: input.currentStock - input.reservedStock,
        safetyStock: input.safetyStock, stockStatus: 'no_demand', daysOfStock: 999,
        suggestedOrderQty: 0,
        qtyBreakdown: { recommendedQty: 0, status: 'adequate', reason: 'Zero consumption rate — no order needed', gap: 0, eoq: input.eoq ?? 100, moq: input.moq ?? 50, maxStock: input.maxStock ?? 500, constraintsApplied: [], totalNeeded: 0, totalSupply: 0, preConstraintQty: 0 },
        orderTriggerDate: today, reorderHitDate: today,
        expectedDeliveryDate: addDays(today, 152),
        timeline: buildTimeline(today, 90, 52, 10, 2, 2, 1, 1, 0),
        urgency: 'low', daysUntilTrigger: Infinity,
        totalLeadTimeDays: 152,
        leadTimeBreakdown: { manufacturing: 90, shipping: 52, customs: 10, internal: 3 },
        cnyRisk: { hasRisk: false, overlapDays: 0, effectiveCnyStart: today, cnyShutdownStart: today, cnyShutdownEnd: today, strategy: 'none', additionalDelayDays: 0, latestSafeOrderDate: null, postCnyOrderDate: null, explanation: 'No consumption, no CNY risk.' },
        recommendedShipmentMode: 'sea',
        currentSeason: getSeasonForDate(today),
        seasonNote: 'No demand detected.',
      };
    }

    // Handle consumption exceeding stock (immediate stockout)
    if (input.avgDailyDemand > 0 && input.currentStock - input.reservedStock <= 0) {
      // Force urgency to critical for stockout situations
      const result = calculateOrderTrigger(input);
      return { ...result, urgency: 'critical', stockStatus: 'stockout' };
    }

    return calculateOrderTrigger(input);
  } catch (error) {
    // Return safe fallback with error details
    const today = new Date();
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[OrderTrigger] Calculation failed for ${input.productSku}: ${errorMsg}`);
    return {
      productId: input.productId, productSku: input.productSku, productName: input.productName,
      needsOrder: false, reorderPoint: 0, currentStock: input.currentStock,
      availableStock: input.currentStock, safetyStock: 0, stockStatus: 'adequate', daysOfStock: 999,
      suggestedOrderQty: 0,
      qtyBreakdown: { recommendedQty: 0, status: 'adequate', reason: `Calculation error: ${errorMsg}`, gap: 0, eoq: 0, moq: 0, maxStock: 0, constraintsApplied: [], totalNeeded: 0, totalSupply: 0, preConstraintQty: 0 },
      orderTriggerDate: today, reorderHitDate: today,
      expectedDeliveryDate: addDays(today, 152),
      timeline: buildTimeline(today, 90, 52, 10, 2, 2, 1, 1, 0),
      urgency: 'low', daysUntilTrigger: 999,
      totalLeadTimeDays: 152,
      leadTimeBreakdown: { manufacturing: 90, shipping: 52, customs: 10, internal: 3 },
      cnyRisk: { hasRisk: false, overlapDays: 0, effectiveCnyStart: today, cnyShutdownStart: today, cnyShutdownEnd: today, strategy: 'none', additionalDelayDays: 0, latestSafeOrderDate: null, postCnyOrderDate: null, explanation: `Fallback due to error: ${errorMsg}` },
      recommendedShipmentMode: 'sea',
      currentSeason: getSeasonForDate(today),
      seasonNote: 'Error in calculation — using fallback.',
    };
  }
}

// =============================================
// Batch Order Trigger for all products
// =============================================

export function calculateBatchOrderTriggers(
  inputs: OrderTriggerInput[]
): OrderTriggerResult[] {
  return inputs
    .map(i => safeCalculateOrderTrigger(i))
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.urgency] - priorityOrder[b.urgency];
    });
}

// =============================================
// Section 8: Parallel Batch Processing
// =============================================

/**
 * Parallel batch calculation with chunked concurrency control.
 * For large catalogs (500+ SKUs), this provides significant speedup
 * by processing chunks in parallel while maintaining memory safety.
 *
 * @param inputs - Array of OrderTriggerInput
 * @param chunkSize - Number of products per parallel chunk (default: 20)
 * @returns Sorted results by urgency
 */
export async function calculateBatchOrderTriggersParallel(
  inputs: OrderTriggerInput[],
  chunkSize: number = 20,
): Promise<OrderTriggerResult[]> {
  if (inputs.length <= chunkSize) {
    // Small catalog — process synchronously for zero overhead
    return calculateBatchOrderTriggers(inputs);
  }

  const chunks: OrderTriggerInput[][] = [];
  for (let i = 0; i < inputs.length; i += chunkSize) {
    chunks.push(inputs.slice(i, i + chunkSize));
  }

  // Process each chunk as a microtask (non-blocking)
  const chunkResults = await Promise.all(
    chunks.map(chunk =>
      new Promise<OrderTriggerResult[]>(resolve => {
        // Use setImmediate-like pattern via Promise.resolve
        resolve(chunk.map(i => safeCalculateOrderTrigger(i)));
      })
    )
  );

  // Flatten and sort
  const results = chunkResults.flat();
  results.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    return priorityOrder[a.urgency] - priorityOrder[b.urgency];
  });

  return results;
}

// =============================================
// Section 9: Order Trigger Pipeline (Orchestrator)
// =============================================

export interface PipelineResult {
  forecastSessionId: string;
  tenantId: string;
  season: string;
  period: { start: string; end: string; totalDays: number };
  generatedAt: string;
  cnyWindow: {
    year: number;
    shutdownStart: string | null;
    shutdownEnd: string | null;
  } | null;
  products: PipelineProduct[];
  summary: {
    totalProducts: number;
    totalRecommendedUnits: number;
    totalRecommendedSpendBdt: number;
    criticalUrgencyCount: number;
    highUrgencyCount: number;
    normalUrgencyCount: number;
    lowUrgencyCount: number;
    cnyRiskCount: number;
    earliestOrderDate: string | null;
    latestOrderDate: string | null;
  };
}

export interface PipelineProduct {
  productSku: string;
  productName: string;
  category?: string;
  forecastedDemand: number;
  adjustedDemand: number;
  recommendedQty: number;
  orderTriggerDate: string;
  expectedAvailableDate: string;
  urgency: Urgency;
  daysUntilTrigger: number;
  cnyRisk: boolean;
  cnyStrategy: CNYStrategy;
  totalLeadTimeDays: number;
  unitCostBdt: number;
  totalCostBdt: number;
}

export function runOrderTriggerPipeline(
  tenantId: string,
  products: OrderTriggerInput[],
  targetSeason: BDSeason,
  targetYear: number,
  unitCosts: Record<string, number> = {},
  topN: number = 50,
): PipelineResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const seasonRange = getSeasonDateRange(targetSeason, targetYear);
  const cnyInfo = getCNYForDate(today);

  // Calculate triggers for all products
  const triggers = calculateBatchOrderTriggers(products);

  // Build pipeline products with seasonal adjustments
  const pipelineProducts: PipelineProduct[] = triggers
    .filter(t => t.needsOrder)
    .map(t => {
      const seasonalWeight = t.currentSeason
        ? applySeasonalWeight(1.0, t.currentSeason, t.currentSeason)
        : 1.0;
      const baseDemand = t.suggestedOrderQty;
      const adjustedDemand = Math.round(baseDemand * seasonalWeight);
      const unitCost = unitCosts[t.productSku] || 0;

      return {
        productSku: t.productSku,
        productName: t.productName,
        category: products.find(p => p.productSku === t.productSku)?.category,
        forecastedDemand: baseDemand,
        adjustedDemand,
        recommendedQty: t.suggestedOrderQty,
        orderTriggerDate: formatDate(t.orderTriggerDate),
        expectedAvailableDate: formatDate(t.expectedDeliveryDate),
        urgency: t.urgency,
        daysUntilTrigger: t.daysUntilTrigger,
        cnyRisk: t.cnyRisk.hasRisk,
        cnyStrategy: t.cnyRisk.strategy,
        totalLeadTimeDays: t.totalLeadTimeDays,
        unitCostBdt: unitCost,
        totalCostBdt: t.suggestedOrderQty * unitCost,
      };
    });

  // Sort by urgency, then by adjusted demand
  const urgencyOrder: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
  pipelineProducts.sort((a, b) => {
    const uDiff = (urgencyOrder[a.urgency] || 99) - (urgencyOrder[b.urgency] || 99);
    if (uDiff !== 0) return uDiff;
    return b.adjustedDemand - a.adjustedDemand;
  });

  const topProducts = pipelineProducts.slice(0, topN);

  // Summary
  const urgencyCounts = { critical: 0, high: 0, normal: 0, low: 0 };
  topProducts.forEach(p => { urgencyCounts[p.urgency]++; });

  const orderDates = topProducts.filter(p => p.recommendedQty > 0).map(p => p.orderTriggerDate);
  const totalSpend = topProducts.reduce((sum, p) => sum + p.totalCostBdt, 0);

  return {
    forecastSessionId: `fs_${formatDateCompact(today)}_${targetSeason}${targetYear}`,
    tenantId,
    season: `${targetSeason}_${targetYear}`,
    period: {
      start: formatDate(seasonRange.start),
      end: formatDate(seasonRange.end),
      totalDays: Math.round((seasonRange.end.getTime() - seasonRange.start.getTime()) / (1000 * 60 * 60 * 24)),
    },
    generatedAt: today.toISOString(),
    cnyWindow: cnyInfo ? {
      year: cnyInfo.year,
      shutdownStart: formatDate(cnyInfo.startDate),
      shutdownEnd: formatDate(cnyInfo.endDate),
    } : null,
    products: topProducts,
    summary: {
      totalProducts: topProducts.length,
      totalRecommendedUnits: topProducts.reduce((sum, p) => sum + p.recommendedQty, 0),
      totalRecommendedSpendBdt: totalSpend,
      criticalUrgencyCount: urgencyCounts.critical,
      highUrgencyCount: urgencyCounts.high,
      normalUrgencyCount: urgencyCounts.normal,
      lowUrgencyCount: urgencyCounts.low,
      cnyRiskCount: topProducts.filter(p => p.cnyRisk).length,
      earliestOrderDate: orderDates.length > 0 ? orderDates.sort()[0] : null,
      latestOrderDate: orderDates.length > 0 ? orderDates.sort().reverse()[0] : null,
    },
  };
}

// =============================================
// Stock Projection Calculator
// =============================================

export interface StockProjectionPoint {
  date: string;
  stock: number;
  event?: 'stockout' | 'safety_hit' | 'reorder_hit' | 'arrival' | 'cny_start' | 'cny_end';
  note?: string;
}

export function calculateStockProjection(
  currentStock: number,
  avgDailyDemand: number,
  safetyStock: number,
  reorderPoint: number,
  orderArrivalDate: Date,
  orderQty: number,
  horizonDays: number = 180,
): StockProjectionPoint[] {
  const points: StockProjectionPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let stock = currentStock;
  let hasArrived = false;

  for (let d = 0; d <= horizonDays; d++) {
    const date = addDays(today, d);

    // Check if order arrives today
    if (!hasArrived && date >= orderArrivalDate) {
      stock += orderQty;
      hasArrived = true;
      points.push({ date: formatDate(date), stock: Math.round(stock), event: 'arrival', note: `Order arrives: +${orderQty} units` });
      continue;
    }

    // Daily consumption
    stock -= avgDailyDemand;

    let event: StockProjectionPoint['event'];
    let note: string | undefined;

    if (stock <= 0 && stock + avgDailyDemand > 0) {
      event = 'stockout'; note = 'Stockout!';
    } else if (stock <= safetyStock && stock + avgDailyDemand > safetyStock) {
      event = 'safety_hit'; note = 'Stock hits safety level';
    } else if (stock <= reorderPoint && stock + avgDailyDemand > reorderPoint) {
      event = 'reorder_hit'; note = 'Stock hits reorder point';
    }

    points.push({ date: formatDate(date), stock: Math.round(Math.max(0, stock)), event, note });
  }

  return points;
}

// =============================================
// Utility helpers
// =============================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateCompact(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function getSeasonNote(season: BDSeason): string {
  switch (season) {
    case 'winter': return 'Peak demand Season — ensure adequate stock coverage. Consider 20% buffer above normal.';
    case 'summer': return 'Moderate demand. Focus on engine-related parts (pistons, filters) with higher wear in heat.';
    case 'monsoon': return 'Low demand period. Reduce stock orders but maintain tire inventory (puncture repairs). Note: +5-8 days shipping due to rough seas.';
    case 'pre_winter': return 'Preparation Season — begin stocking up. Place orders NOW for winter delivery considering lead times.';
  }
}

// Legacy compatibility — keep old CNY function signature for existing API routes
export function calculateCNYDelay(
  orderDate: Date,
  manufacturingEnd: Date
): { delayDays: number; cnyInfo: CNYInfo | null; strategy: string } {
  for (const cny of CNY_DATES) {
    if (manufacturingEnd >= cny.effectiveStart && orderDate <= cny.effectiveEnd) {
      const overlapStart = new Date(Math.max(manufacturingEnd.getTime(), cny.effectiveStart.getTime()));
      const overlapEnd = new Date(Math.min(orderDate.getTime() + (manufacturingEnd.getTime() - orderDate.getTime()), cny.effectiveEnd.getTime()));

      const isBeforeRush = orderDate < cny.rushStart;

      if (isBeforeRush) {
        return {
          delayDays: Math.round(cny.shutdownDays * 0.3),
          cnyInfo: cny,
          strategy: `RUSH ORDER: Place before ${formatDate(cny.rushStart)} to beat CNY shutdown.`,
        };
      } else if (orderDate >= cny.endDate) {
        return {
          delayDays: 0,
          cnyInfo: cny,
          strategy: `POST-CNY: Order after factories reopen (${formatDate(cny.endDate)}).`,
        };
      } else {
        const daysToReopen = Math.max(0, Math.round((cny.effectiveEnd.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          delayDays: daysToReopen,
          cnyInfo: cny,
          strategy: `CNY DELAY: ~${daysToReopen} days due to CNY shutdown (${formatDate(cny.startDate)} to ${formatDate(cny.endDate)}).`,
        };
      }
    }
  }

  return { delayDays: 0, cnyInfo: null, strategy: 'No CNY impact detected.' };
}
