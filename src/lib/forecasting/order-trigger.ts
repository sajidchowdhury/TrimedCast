// ============================================
// TrimedCast Order Trigger Calculator (CORE IP)
// Calculates: WHEN to order = reorder_hit_date - total_lead_time
// Considers: China mfg + shipment + BD customs + CNY impact
// ============================================

import { getBDSeason, type BDSeason } from './models';

// --- Lead Time Configuration ---

export interface LeadTimeConfig {
  // Manufacturing (China)
  manufacturingDays: number;    // typically 90 days
  manufacturingVariance: number; // variance in days

  // Shipping method
  shippingMethod: 'sea' | 'air';
  seaTransitDays: number;       // typically 52 days (Shanghai/Yiwu → Chittagong)
  airTransitDays: number;       // typically 8 days
  shippingVariance: number;

  // BD Customs
  customsClearanceDays: number; // typically 10 days (sea), 3 days (air)
  customsVariance: number;

  // Internal processing
  internalProcessingDays: number; // PO creation, QC, etc.
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

// --- CNY (Chinese New Year) Impact Model ---

export interface CNYInfo {
  year: number;
  date: Date;        // Exact date of CNY
  startDate: Date;   // Factory shutdown start (~Jan 20)
  endDate: Date;     // Factory shutdown end (~Feb 20, sometimes Mar 1)
  shutdownDays: number;
  rushStart: Date;   // Rush order deadline (~Dec 20 previous year)
}

// CNY dates for next several years
export const CNY_DATES: CNYInfo[] = [
  { year: 2025, date: new Date('2025-01-29'), startDate: new Date('2025-01-20'), endDate: new Date('2025-02-20'), shutdownDays: 31, rushStart: new Date('2024-12-20') },
  { year: 2026, date: new Date('2026-02-17'), startDate: new Date('2026-01-20'), endDate: new Date('2026-02-25'), shutdownDays: 36, rushStart: new Date('2025-12-20') },
  { year: 2027, date: new Date('2027-02-06'), startDate: new Date('2027-01-20'), endDate: new Date('2027-02-20'), shutdownDays: 31, rushStart: new Date('2026-12-20') },
  { year: 2028, date: new Date('2028-01-26'), startDate: new Date('2028-01-15'), endDate: new Date('2028-02-20'), shutdownDays: 36, rushStart: new Date('2027-12-15') },
  { year: 2029, date: new Date('2029-02-13'), startDate: new Date('2029-01-20'), endDate: new Date('2029-02-25'), shutdownDays: 36, rushStart: new Date('2028-12-20') },
  { year: 2030, date: new Date('2030-02-03'), startDate: new Date('2030-01-20'), endDate: new Date('2030-02-20'), shutdownDays: 31, rushStart: new Date('2029-12-20') },
];

export function getCNYForYear(year: number): CNYInfo | null {
  return CNY_DATES.find(c => c.year === year) || null;
}

export function getCNYForDate(date: Date): CNYInfo | null {
  return CNY_DATES.find(c => date >= c.startDate && date <= c.endDate) || null;
}

export function isCNYShutdown(date: Date): boolean {
  return getCNYForDate(date) !== null;
}

/**
 * Calculate CNY delay for an order
 * If an order's manufacturing period overlaps with CNY shutdown,
 * add the shutdown days to the effective lead time
 */
export function calculateCNYDelay(
  orderDate: Date,
  manufacturingEnd: Date
): { delayDays: number; cnyInfo: CNYInfo | null; strategy: string } {
  for (const cny of CNY_DATES) {
    // Check if manufacturing period overlaps with CNY shutdown
    if (manufacturingEnd >= cny.startDate && orderDate <= cny.endDate) {
      // Calculate overlap
      const overlapStart = new Date(Math.max(manufacturingEnd.getTime(), cny.startDate.getTime()));
      const overlapEnd = new Date(Math.min(orderDate.getTime() + (manufacturingEnd.getTime() - orderDate.getTime()), cny.endDate.getTime()));

      // If order is placed before rush deadline, can be expedited
      const isBeforeRush = orderDate < cny.rushStart;

      if (isBeforeRush) {
        // Strategy 1: Rush order before CNY (place order before Dec 20)
        return {
          delayDays: Math.round(cny.shutdownDays * 0.3), // partial delay if rushed
          cnyInfo: cny,
          strategy: `RUSH ORDER: Place before ${cny.rushStart.toISOString().split('T')[0]} to beat CNY shutdown. Expect ~${Math.round(cny.shutdownDays * 0.3)} day delay.`,
        };
      } else if (orderDate >= cny.endDate) {
        // Strategy 2: Post-CNY order (wait until factories reopen)
        return {
          delayDays: 0, // no delay, factories are back
          cnyInfo: cny,
          strategy: `POST-CNY: Order after factories reopen (${cny.endDate.toISOString().split('T')[0]}). No additional delay.`,
        };
      } else {
        // Strategy 3: Accept CNY delay (most common scenario)
        const daysToReopen = Math.max(0, Math.round((cny.endDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          delayDays: daysToReopen,
          cnyInfo: cny,
          strategy: `CNY DELAY: Order will be delayed ~${daysToReopen} days due to CNY shutdown (${cny.startDate.toISOString().split('T')[0]} to ${cny.endDate.toISOString().split('T')[0]}). Consider pre-ordering or air freight.`,
        };
      }
    }
  }

  return { delayDays: 0, cnyInfo: null, strategy: 'No CNY impact detected.' };
}

// --- Order Trigger Calculator ---

export interface OrderTriggerInput {
  productId: string;
  productSku: string;
  productName: string;
  currentStock: number;
  reservedStock: number;
  safetyStock: number;
  reorderPoint: number;
  avgDailyDemand: number;
  leadTimeConfig?: LeadTimeConfig;
  shippingMethod?: 'sea' | 'air';
  serviceLevel?: number; // e.g., 0.95
}

export interface OrderTriggerResult {
  productId: string;
  productSku: string;
  productName: string;

  // Stock status
  currentStock: number;
  availableStock: number;
  safetyStock: number;
  reorderPoint: number;
  daysOfStock: number; // days until stockout at current demand
  stockStatus: 'healthy' | 'low' | 'critical' | 'stockout';

  // Lead time
  totalLeadTimeDays: number;
  leadTimeBreakdown: {
    manufacturing: number;
    shipping: number;
    customs: number;
    internal: number;
  };

  // Order trigger dates
  reorderHitDate: Date;       // date when stock will hit reorder point
  orderTriggerDate: Date;     // when to place order = reorderHitDate - leadTime
  expectedDeliveryDate: Date; // when order will arrive = orderTriggerDate + leadTime

  // CNY impact
  cnyRisk: boolean;
  cnyDelayDays: number;
  cnyStrategy: string;
  adjustedOrderDate: Date;    // order date adjusted for CNY

  // Quantity
  suggestedOrderQty: number;
  orderTrigger: 'reorder_point' | 'seasonal_uplift' | 'cny_urgency' | 'stockout_risk';
  priority: 'urgent' | 'high' | 'normal' | 'low';

  // Season
  currentSeason: BDSeason;
  seasonNote: string;
}

export function calculateOrderTrigger(input: OrderTriggerInput): OrderTriggerResult {
  const {
    productId, productSku, productName,
    currentStock, reservedStock, safetyStock, reorderPoint,
    avgDailyDemand,
    serviceLevel = 0.95,
  } = input;

  const availableStock = currentStock - reservedStock;
  const leadTimeConfig = { ...DEFAULT_LEAD_TIME, ...(input.leadTimeConfig || {}) };
  if (input.shippingMethod) leadTimeConfig.shippingMethod = input.shippingMethod;

  const leadTime = calculateTotalLeadTime(leadTimeConfig);
  const today = new Date();

  // Days of stock remaining
  const daysOfStock = avgDailyDemand > 0 ? Math.floor(availableStock / avgDailyDemand) : 999;

  // Stock status
  let stockStatus: OrderTriggerResult['stockStatus'];
  if (availableStock <= 0) stockStatus = 'stockout';
  else if (availableStock <= safetyStock) stockStatus = 'critical';
  else if (availableStock <= reorderPoint) stockStatus = 'low';
  else stockStatus = 'healthy';

  // Reorder hit date: when stock will reach reorder point
  const daysToReorderPoint = avgDailyDemand > 0
    ? Math.max(0, Math.floor((availableStock - reorderPoint) / avgDailyDemand))
    : 999;
  const reorderHitDate = new Date(today);
  reorderHitDate.setDate(reorderHitDate.getDate() + daysToReorderPoint);

  // Order trigger date: place order this many days before reorder hit
  const orderTriggerDate = new Date(reorderHitDate);
  orderTriggerDate.setDate(orderTriggerDate.getDate() - leadTime.total);

  // Expected delivery
  const expectedDeliveryDate = new Date(orderTriggerDate);
  expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + leadTime.total);

  // CNY impact
  const manufacturingEnd = new Date(orderTriggerDate);
  manufacturingEnd.setDate(manufacturingEnd.getDate() + leadTimeConfig.manufacturingDays);
  const cnyResult = calculateCNYDelay(orderTriggerDate, manufacturingEnd);

  const adjustedOrderDate = new Date(orderTriggerDate);
  if (cnyResult.delayDays > 0) {
    adjustedOrderDate.setDate(adjustedOrderDate.getDate() - cnyResult.delayDays);
  }

  // Determine order trigger reason and priority
  let orderTrigger: OrderTriggerResult['orderTrigger'];
  let priority: OrderTriggerResult['priority'];

  if (stockStatus === 'stockout' || stockStatus === 'critical') {
    orderTrigger = 'stockout_risk';
    priority = 'urgent';
  } else if (cnyResult.delayDays > 0 && daysToReorderPoint < 60) {
    orderTrigger = 'cny_urgency';
    priority = 'high';
  } else if (stockStatus === 'low') {
    orderTrigger = 'reorder_point';
    priority = 'high';
  } else {
    const currentSeason = getBDSeason(today.getMonth() + 1);
    // Pre-winter stocking (Oct) = seasonal uplift trigger
    if (currentSeason.season === 'pre_winter' || (currentSeason.season === 'summer' && today.getMonth() + 1 === 5)) {
      orderTrigger = 'seasonal_uplift';
      priority = 'normal';
    } else {
      orderTrigger = 'reorder_point';
      priority = 'low';
    }
  }

  // Suggested order quantity: EOQ-like based on demand during lead time + safety buffer
  const demandDuringLeadTime = avgDailyDemand * leadTime.total;
  const suggestedOrderQty = Math.max(
    Math.round(demandDuringLeadTime + safetyStock - availableStock),
    Math.round(avgDailyDemand * 30) // minimum 30-day supply
  );

  const currentSeason = getBDSeason(today.getMonth() + 1);
  const seasonNote = getSeasonNote(currentSeason.season);

  return {
    productId, productSku, productName,
    currentStock, availableStock, safetyStock, reorderPoint,
    daysOfStock, stockStatus,
    totalLeadTimeDays: leadTime.total,
    leadTimeBreakdown: leadTime.breakdown,
    reorderHitDate, orderTriggerDate, expectedDeliveryDate,
    cnyRisk: cnyResult.delayDays > 0,
    cnyDelayDays: cnyResult.delayDays,
    cnyStrategy: cnyResult.strategy,
    adjustedOrderDate,
    suggestedOrderQty,
    orderTrigger, priority,
    currentSeason: currentSeason.season,
    seasonNote,
  };
}

function getSeasonNote(season: BDSeason): string {
  switch (season) {
    case 'winter': return 'Peak demand season — ensure adequate stock coverage. Consider 20% buffer above normal.';
    case 'summer': return 'Moderate demand. Focus on engine-related parts (pistons, filters) with higher wear in heat.';
    case 'monsoon': return 'Low demand period. Reduce stock orders but maintain tire inventory (puncture repairs).';
    case 'pre_winter': return 'Preparation season — begin stocking up. Place orders NOW for winter delivery considering lead times.';
  }
}

// --- Batch Order Trigger for all products ---

export function calculateBatchOrderTriggers(
  inputs: OrderTriggerInput[]
): OrderTriggerResult[] {
  return inputs
    .map(calculateOrderTrigger)
    .sort((a, b) => {
      // Sort by priority: urgent > high > normal > low
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}
