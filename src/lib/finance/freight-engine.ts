// ============================================
// TrimedCast LEAN — Freight decision engine (Air vs Sea)
// Computes the per-SKU cost/lead-time trade-off and recommends
// a shipping mode based on urgency, margin, and the CNY strategy.
//
// Uses the lead-time decomposition (sea 155d / air 104d) and the
// BD customs calculator (HS 8512: 25% Duty + 15% VAT-on-tax + 5% AIT)
// to compute landed cost for both modes side by side.
// ============================================

import {
  calculateLandedCost,
  DEFAULT_FREIGHT,
  marginPct,
  type LandedCostBreakdown,
} from './customs-calculator';
import { LEAD_TIME_DECOMPOSITION } from '../forecasting/eoq-safety-stock';

export interface FreightComparisonInput {
  skuCode: string;
  productName: string;
  unitCostBdt: number;
  sellingPrice: number;     // BDT per unit
  orderQty: number;          // the recommended order quantity
  shipmentMode: 'sea' | 'air'; // the mode derived from purchase history
  daysUntilStockout: number;  // from the order-trigger algorithm
  cnyStrategy?: string;       // from the order-trigger algorithm
  urgency?: string;
  hsCode?: string;            // default '8512'
}

export interface FreightModeBreakdown {
  mode: 'sea' | 'air';
  leadTimeDays: number;
  leadTimeBreakdown: { manufacturing: number; shipment: number; customs: number; internal: number };
  freightPerUnitBdt: number;
  insurancePerUnitBdt: number;
  landedCost: LandedCostBreakdown;
  landedCostPerUnit: number;
  totalShipmentCostBdt: number;   // freight × orderQty
  totalLandedCostBdt: number;     // landedCostPerUnit × orderQty
  marginPerUnitBdt: number;
  marginPct: number;
  totalMarginBdt: number;
}

export interface FreightComparison {
  skuCode: string;
  productName: string;
  sea: FreightModeBreakdown;
  air: FreightModeBreakdown;
  // Trade-off
  leadTimeSavedByAir: number;      // days (positive = air is faster)
  costPremiumPerUnitBdt: number;   // BDT (positive = air is more expensive)
  costPremiumTotalBdt: number;
  costPremiumPct: number;           // air premium as % of sea landed cost
  // Recommendation
  recommendedMode: 'sea' | 'air';
  recommendationReason: string;
  // Context
  daysUntilStockout: number;
  urgency: string;
  cnyStrategy: string;
  marginPctSea: number;
  marginPctAir: number;
  canAbsorbAirPremium: boolean;    // margin ≥ 30%
  isUrgent: boolean;                // stockout ≤ 30 days
}

const LEAD_TIME = LEAD_TIME_DECOMPOSITION;

function buildModeBreakdown(
  mode: 'sea' | 'air',
  input: FreightComparisonInput,
): FreightModeBreakdown {
  const lt = LEAD_TIME[mode];
  const freightPerUnit = mode === 'sea' ? DEFAULT_FREIGHT.seaPerUnitBdt : DEFAULT_FREIGHT.airPerUnitBdt;
  const insurance = input.unitCostBdt * 0.01; // ~1% default

  const landed = calculateLandedCost({
    unitCostBdt: input.unitCostBdt,
    freightPerUnitBdt: freightPerUnit,
    insurancePerUnitBdt: insurance,
    hsCode: input.hsCode || '8512',
  });

  const landedCostPerUnit = landed.landedCostPerUnit;
  const totalShipmentCost = freightPerUnit * input.orderQty;
  const totalLandedCost = landedCostPerUnit * input.orderQty;
  const marginPerUnit = input.sellingPrice - landedCostPerUnit;
  const marginPctVal = marginPct(input.sellingPrice, landedCostPerUnit);

  return {
    mode,
    leadTimeDays: lt.total,
    leadTimeBreakdown: { ...lt },
    freightPerUnitBdt: freightPerUnit,
    insurancePerUnitBdt: insurance,
    landedCost: landed,
    landedCostPerUnit,
    totalShipmentCostBdt: Math.round(totalShipmentCost),
    totalLandedCostBdt: Math.round(totalLandedCost),
    marginPerUnitBdt: Math.round(marginPerUnit * 100) / 100,
    marginPct: Math.round(marginPctVal * 100) / 100,
    totalMarginBdt: Math.round(marginPerUnit * input.orderQty),
  };
}

/**
 * Compute the air-vs-sea comparison + recommendation for a SKU.
 *
 * Recommendation logic:
 *   - URGENT (stockout ≤ 30 days) AND margin ≥ 30% → AIR (air-escape)
 *   - URGENT (stockout ≤ 30 days) AND margin < 30% → SEA (can't afford air; alert)
 *   - CNY strategy === 'air_escape' → AIR
 *   - Not urgent + sea viable (stockout > lead_time_sea + buffer) → SEA (cheaper)
 *   - Not urgent + sea NOT viable (stockout < lead_time_sea) → AIR (forced)
 */
export function compareFreightModes(input: FreightComparisonInput): FreightComparison {
  const sea = buildModeBreakdown('sea', input);
  const air = buildModeBreakdown('air', input);

  const leadTimeSavedByAir = sea.leadTimeDays - air.leadTimeDays; // positive = air faster
  const costPremiumPerUnitBdt = air.landedCostPerUnit - sea.landedCostPerUnit;
  const costPremiumTotalBdt = costPremiumPerUnitBdt * input.orderQty;
  const costPremiumPct = sea.landedCostPerUnit > 0
    ? (costPremiumPerUnitBdt / sea.landedCostPerUnit) * 100
    : 0;

  const canAbsorbAirPremium = sea.marginPct >= 30;
  const isUrgent = input.daysUntilStockout <= 30;

  // --- Recommendation ---
  let recommendedMode: 'sea' | 'air';
  let recommendationReason: string;

  if (input.cnyStrategy === 'air_escape') {
    recommendedMode = 'air';
    recommendationReason = `CNY air-escape: stockout within ${input.daysUntilStockout}d and margin ${sea.marginPct.toFixed(0)}% absorbs air premium`;
  } else if (isUrgent && canAbsorbAirPremium) {
    recommendedMode = 'air';
    recommendationReason = `Urgent (stockout ${input.daysUntilStockout}d) + margin ${sea.marginPct.toFixed(0)}% ≥ 30% → air absorbs premium, saves ${leadTimeSavedByAir}d`;
  } else if (isUrgent && !canAbsorbAirPremium) {
    recommendedMode = 'sea';
    recommendationReason = `Urgent but margin ${sea.marginPct.toFixed(0)}% < 30% → air premium (৳${costPremiumPerUnitBdt.toFixed(0)}/unit) not absorbable; sea only option (alert: may stockout)`;
  } else if (input.daysUntilStockout > sea.leadTimeDays + 7) {
    // Plenty of time → sea is cheaper
    recommendedMode = 'sea';
    recommendationReason = `Not urgent (stockout ${input.daysUntilStockout}d > sea lead ${sea.leadTimeDays}d) → sea saves ৳${costPremiumTotalBdt.toFixed(0)} (${costPremiumPct.toFixed(0)}% cheaper)`;
  } else if (input.daysUntilStockout <= sea.leadTimeDays + 7 && input.daysUntilStockout > air.leadTimeDays) {
    // Sea won't arrive in time, air will
    recommendedMode = 'air';
    recommendationReason = `Sea lead time (${sea.leadTimeDays}d) exceeds stockout (${input.daysUntilStockout}d) → air required to avoid stockout`;
  } else {
    // Default: sea (cheaper)
    recommendedMode = 'sea';
    recommendationReason = `Default to sea (stockout ${input.daysUntilStockout}d allows sea lead ${sea.leadTimeDays}d); saves ৳${costPremiumTotalBdt.toFixed(0)}`;
  }

  return {
    skuCode: input.skuCode,
    productName: input.productName,
    sea,
    air,
    leadTimeSavedByAir,
    costPremiumPerUnitBdt: Math.round(costPremiumPerUnitBdt * 100) / 100,
    costPremiumTotalBdt: Math.round(costPremiumTotalBdt),
    costPremiumPct: Math.round(costPremiumPct * 100) / 100,
    recommendedMode,
    recommendationReason,
    daysUntilStockout: input.daysUntilStockout,
    urgency: input.urgency || 'normal',
    cnyStrategy: input.cnyStrategy || 'none',
    marginPctSea: sea.marginPct,
    marginPctAir: air.marginPct,
    canAbsorbAirPremium,
    isUrgent,
  };
}

/** Format BDT currency for display. */
export function formatBdt(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-IN')}`;
}
