// ============================================
// TrimedCast LEAN — Order Trigger algorithm
// THE SINGLE MOST VALUABLE ALGORITHM IN THE SYSTEM.
// Computes the exact calendar date by which a purchase order must be
// placed so the shipment arrives before the current stock is exhausted,
// accounting for the full lead-time decomposition and the Chinese New
// Year supply disruption.
//
// 9 steps + 4 CNY resolution strategies + 5-milestone timeline.
// ============================================

import { LEAD_TIME_DECOMPOSITION } from './eoq-safety-stock';

// --- CNY calendar ---

export interface CNYWindow {
  start: Date;
  end: Date;
}

/** CNY factory shutdown window (approximate Jan 20 – Feb 20 each year). */
export function getCNYWindow(year: number): CNYWindow {
  return {
    start: new Date(Date.UTC(year, 0, 20)),  // Jan 20
    end: new Date(Date.UTC(year, 1, 20)),    // Feb 20
  };
}

/** Check if a date falls within the CNY shutdown. */
export function isCNYShutdown(date: Date): boolean {
  const year = date.getUTCFullYear();
  const { start, end } = getCNYWindow(year);
  return date >= start && date <= end;
}

// --- 5-milestone timeline ---

export interface ShipmentMilestone {
  label: string;
  date: Date;
  offsetDays: number; // days from the order trigger date
}

// --- CNY strategies ---

export type CNYStrategy = 'none' | 'before_cny' | 'after_cny' | 'partial_order' | 'air_escape';

export const CNY_STRATEGY_LABELS: Record<CNYStrategy, string> = {
  none: 'No CNY impact',
  before_cny: 'Order before CNY',
  after_cny: 'Order after CNY',
  partial_order: 'Partial order (air for critical, sea for rest)',
  air_escape: 'Switch to air freight',
};

// --- Order Trigger input/output ---

export interface OrderTriggerInput {
  skuCode: string;
  productName: string;
  qtyOnHand: number;
  reorderPoint: number;
  forecastQty: number;        // total forecast for the session horizon
  horizonMonths: number;
  mae: number;                 // forecast MAE (monthly)
  unitCost: number;
  sellingPrice?: number;
  shipmentMode: 'sea' | 'air';
  bufferDays?: number;         // default 7
  festivalPeakDate?: Date;    // the target session peak date
}

export interface OrderTriggerResult {
  skuCode: string;
  productName: string;
  // Step 1-2: consumption + days until reorder
  dailyConsumptionRate: number;
  daysUntilReorder: number;
  reorderHitDate: Date | null;
  // Step 4: lead time
  totalLeadTimeDays: number;
  leadTimeBreakdown: { manufacturing: number; shipment: number; customs: number; internal: number };
  // Step 5: order trigger date
  orderTriggerDate: Date | null;
  // Step 6-7: CNY
  cnyStrategy: CNYStrategy;
  cnyDelayDays: number;
  cnyAdjustedTriggerDate: Date | null;
  // Step 8: timeline
  timeline: ShipmentMilestone[];
  expectedDeliveryDate: Date | null;
  // Step 9: urgency
  urgency: 'critical' | 'high' | 'normal' | 'low';
  // Recommended shipment mode after CNY analysis (may differ from input)
  recommendedMode: 'sea' | 'air';
  // Diagnostic
  daysUntilStockout: number;
  bufferDays: number;
  notes: string[];
}

const URGENCY_THRESHOLDS = {
  critical: 30,   // <= 30 days
  high: 90,       // <= 90 days
  normal: 180,    // <= 180 days
  // low: > 180
} as const;

/**
 * The 9-step Order Trigger algorithm.
 *
 * 1. daily_consumption_rate = avg demand last 3 months / 90 days
 * 2. days_until_reorder = (qty_on_hand - reorder_point) / daily_consumption_rate
 * 3. reorder_hit_date = today + days_until_reorder
 * 4. total_lead_time = mfg + shipment + customs + internal
 * 5. order_trigger_date = reorder_hit_date - total_lead_time - buffer_days
 * 6. Assess CNY risk (does manufacturing overlap Jan 20 – Feb 20?)
 * 7. Apply CNY strategy (before_cny / after_cny / partial_order / air_escape)
 * 8. Build 5-milestone timeline
 * 9. Determine urgency
 */
export function computeOrderTrigger(input: OrderTriggerInput): OrderTriggerResult {
  const {
    skuCode,
    productName,
    qtyOnHand,
    reorderPoint,
    forecastQty,
    horizonMonths,
    mae,
    unitCost,
    sellingPrice = 0,
    shipmentMode,
    bufferDays = 7,
    festivalPeakDate,
  } = input;

  const lt = LEAD_TIME_DECOMPOSITION[shipmentMode];
  const notes: string[] = [];
  const today = new Date();

  // Step 1: daily consumption rate (from forecast, annualized then daily)
  const annualDemand = horizonMonths > 0 ? (forecastQty / horizonMonths) * 12 : forecastQty;
  const dailyConsumptionRate = annualDemand / 365;

  // Step 2: days until reorder
  let daysUntilReorder: number;
  if (dailyConsumptionRate > 0) {
    daysUntilReorder = Math.round((qtyOnHand - reorderPoint) / dailyConsumptionRate);
  } else {
    daysUntilReorder = 9999; // no demand → no reorder pressure
    notes.push('No demand data; reorder pressure unknown.');
  }

  // Step 3: reorder hit date
  const reorderHitDate = daysUntilReorder < 9999
    ? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + daysUntilReorder))
    : null;

  // Step 4: total lead time
  const totalLeadTimeDays = lt.manufacturing + lt.shipment + lt.customs + lt.internal;

  // Step 5: order trigger date = reorder_hit_date - total_lead_time - buffer
  let orderTriggerDate: Date | null = null;
  if (reorderHitDate) {
    const triggerMs = reorderHitDate.getTime() - (totalLeadTimeDays + bufferDays) * 24 * 60 * 60 * 1000;
    orderTriggerDate = new Date(triggerMs);
  }

  // Also compute days until stockout (for CNY strategy)
  const daysUntilStockout = dailyConsumptionRate > 0
    ? Math.round(qtyOnHand / dailyConsumptionRate)
    : 9999;

  // Step 6-7: CNY strategy
  let cnyStrategy: CNYStrategy = 'none';
  let cnyDelayDays = 0;
  let cnyAdjustedTriggerDate = orderTriggerDate;

  if (orderTriggerDate) {
    const triggerYear = orderTriggerDate.getUTCFullYear();
    const cny = getCNYWindow(triggerYear);
    // Does the manufacturing period (trigger → trigger + mfg_days) overlap CNY?
    const mfgEnd = new Date(orderTriggerDate.getTime() + lt.manufacturing * 24 * 60 * 60 * 1000);

    if (orderTriggerDate >= cny.start && orderTriggerDate <= cny.end) {
      // Trigger falls inside CNY
      cnyStrategy = 'after_cny';
      const afterCny = new Date(cny.end.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 days post-CNY restart
      cnyDelayDays = Math.round((afterCny.getTime() - orderTriggerDate.getTime()) / (24 * 60 * 60 * 1000));
      cnyAdjustedTriggerDate = afterCny;
      notes.push(`Trigger falls in CNY window; deferred to ${afterCny.toISOString().slice(0, 10)} (+${cnyDelayDays}d).`);
    } else if (mfgEnd >= cny.start && mfgEnd <= cny.end) {
      // Manufacturing overlaps CNY shutdown
      cnyStrategy = selectCNYStrategy(daysUntilStockout, unitCost, sellingPrice, shipmentMode);
      switch (cnyStrategy) {
        case 'before_cny': {
          // Pull the order earlier so manufacturing finishes before CNY
          const latestSafe = new Date(cny.start.getTime() - lt.manufacturing * 24 * 60 * 60 * 1000 - bufferDays * 24 * 60 * 60 * 1000);
          cnyDelayDays = Math.round((orderTriggerDate.getTime() - latestSafe.getTime()) / (24 * 60 * 60 * 1000));
          cnyAdjustedTriggerDate = latestSafe;
          notes.push(`Mfg overlaps CNY; pulled order earlier to ${latestSafe.toISOString().slice(0, 10)}.`);
          break;
        }
        case 'after_cny': {
          const afterCny = new Date(cny.end.getTime() + 3 * 24 * 60 * 60 * 1000);
          cnyDelayDays = Math.round((afterCny.getTime() - orderTriggerDate.getTime()) / (24 * 60 * 60 * 1000));
          cnyAdjustedTriggerDate = afterCny;
          notes.push(`Enough stock to bridge CNY; deferred to ${afterCny.toISOString().slice(0, 10)}.`);
          break;
        }
        case 'air_escape': {
          cnyDelayDays = 0;
          notes.push('Switched to air freight to bypass CNY manufacturing delay.');
          break;
        }
        case 'partial_order': {
          cnyDelayDays = 0;
          notes.push('Partial order: critical items by air, rest by sea after CNY.');
          break;
        }
      }
    }
  }

  // Step 8: 5-milestone timeline
  const finalTriggerDate = cnyAdjustedTriggerDate ?? orderTriggerDate;
  const recommendedMode: 'sea' | 'air' = cnyStrategy === 'air_escape' ? 'air' : shipmentMode;
  const finalLt = LEAD_TIME_DECOMPOSITION[recommendedMode];

  const timeline: ShipmentMilestone[] = [];
  if (finalTriggerDate) {
    let offset = 0;
    timeline.push({ label: 'Order placed', date: new Date(finalTriggerDate), offsetDays: offset });
    offset += 2; // PO processing
    timeline.push({ label: 'PO processed', date: addDays(finalTriggerDate, offset), offsetDays: offset });
    offset += finalLt.manufacturing + (cnyStrategy === 'after_cny' ? 31 : 0); // mfg + CNY delay
    timeline.push({ label: 'Manufacturing complete', date: addDays(finalTriggerDate, offset), offsetDays: offset });
    offset += 2; // packing/loading
    timeline.push({ label: 'Shipment departed', date: addDays(finalTriggerDate, offset), offsetDays: offset });
    offset += finalLt.shipment + finalLt.customs + finalLt.internal;
    timeline.push({ label: 'Arrived at warehouse', date: addDays(finalTriggerDate, offset), offsetDays: offset });
  }

  const expectedDeliveryDate = timeline.length > 0 ? timeline[timeline.length - 1].date : null;

  // Step 9: urgency (based on days until stockout, accounting for CNY delay)
  const effectiveDaysUntilStockout = daysUntilStockout === 9999 ? 9999 : daysUntilStockout - cnyDelayDays;
  let urgency: 'critical' | 'high' | 'normal' | 'low';
  if (effectiveDaysUntilStockout <= 0) urgency = 'critical';
  else if (effectiveDaysUntilStockout <= URGENCY_THRESHOLDS.critical) urgency = 'critical';
  else if (effectiveDaysUntilStockout <= URGENCY_THRESHOLDS.high) urgency = 'high';
  else if (effectiveDaysUntilStockout <= URGENCY_THRESHOLDS.normal) urgency = 'normal';
  else urgency = 'low';

  // If the order trigger date is in the past, urgency is critical
  if (orderTriggerDate && orderTriggerDate < today) urgency = 'critical';

  return {
    skuCode,
    productName,
    dailyConsumptionRate: Math.round(dailyConsumptionRate * 100) / 100,
    daysUntilReorder,
    reorderHitDate,
    totalLeadTimeDays,
    leadTimeBreakdown: { ...lt },
    orderTriggerDate,
    cnyStrategy,
    cnyDelayDays,
    cnyAdjustedTriggerDate,
    timeline,
    expectedDeliveryDate,
    urgency,
    recommendedMode,
    daysUntilStockout,
    bufferDays,
    notes,
  };
}

// --- CNY strategy selector ---

function selectCNYStrategy(
  daysUntilStockout: number,
  unitCost: number,
  sellingPrice: number,
  currentMode: 'sea' | 'air',
): CNYStrategy {
  const margin = sellingPrice > 0 ? (sellingPrice - unitCost) / sellingPrice : 0;
  const canAirShip = currentMode === 'air' || margin >= 0.30;

  // Strategy D: Air escape — stockout within 30 days AND margin ≥ 30%
  if (daysUntilStockout <= 30 && canAirShip && margin >= 0.30) {
    return 'air_escape';
  }
  // Strategy A: Before CNY — stockout risk during CNY + urgency critical/high
  if (daysUntilStockout <= 90) {
    return 'before_cny';
  }
  // Strategy B: After CNY — enough stock to bridge
  if (daysUntilStockout > 90) {
    return 'after_cny';
  }
  // Strategy C: Partial order — fallback for mixed portfolios
  return 'partial_order';
}

// --- helpers ---

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Format a Date as ISO yyyy-mm-dd. */
export function isoDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/** Human-readable urgency color (for UI). */
export function urgencyColor(urgency: string): string {
  switch (urgency) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'low': return 'text-muted-foreground bg-muted/40 border-border';
    default: return '';
  }
}
