// ============================================
// POST /api/ai/scenario-preview
// What-If Scenario Simulation API
// Supports lead_time_mode, promo_index, service_level, order_quantity_override modifications
// Uses forecasting models for calculations and LLM for natural language explanation
// Session 22: Scenario Preview API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';
import { checkRateLimit } from '@/lib/api/rate-limit';
import {
  getSafetyFactor,
  calculateEOQWithConstraints,
  calculateSafetyStockEnhanced,
  DEFAULT_ORDERING_COST_BDT,
  DEFAULT_HOLDING_COST_PCT,
} from '@/lib/forecasting/eoq-safety-stock';
import { getBDSeason } from '@/lib/forecasting/models';

// =============================================
// Constants for BD-China Supply Chain
// =============================================

/** Total lead time for sea shipment (days): manufacturing + shipping + customs */
const SEA_TOTAL_LEAD_TIME = 90;

/** Total lead time for air shipment (days): manufacturing + air freight + customs */
const AIR_TOTAL_LEAD_TIME = 35;

/** Sea shipping cost per unit (BDT) */
const SEA_SHIPPING_COST_PER_UNIT = 45;

/** Air freight cost per unit (BDT) */
const AIR_FREIGHT_COST_PER_UNIT = 315;

/** Default sigma_LT for sea */
const DEFAULT_SIGMA_LT_SEA = 15;

/** Default sigma_LT for air */
const DEFAULT_SIGMA_LT_AIR = 5;

/** Default MAE for safety stock calc when not available */
const DEFAULT_MAE = 10;

/** Default review period days */
const DEFAULT_REVIEW_PERIOD = 10;

// =============================================
// Types
// =============================================

interface ScenarioBaseState {
  product_id: string;
  current_lead_time_mode: 'sea' | 'air';
  current_safety_stock: number;
}

interface ScenarioModifications {
  lead_time_mode?: 'sea' | 'air';
  promo_index?: number;
  service_level?: number;
  order_quantity_override?: number;
}

interface ImpactSummary {
  lead_time_change_days?: number;
  safety_stock_change?: number;
  holding_cost_savings_monthly_bdt?: number;
  air_freight_additional_cost_bdt?: number;
  net_impact?: string;
  demand_change_pct?: number;
  revenue_impact_bdt?: number;
  inventory_requirement_change?: number;
}

interface ShadowForecastPoint {
  month: string;
  baseline_safety_stock: number;
  scenario_safety_stock: number;
}

// =============================================
// Scenario Engine: Lead Time Mode Change
// =============================================

async function calculateLeadTimeModeImpact(
  tenantId: string,
  baseState: ScenarioBaseState,
  targetMode: 'sea' | 'air'
): Promise<{
  impactSummary: ImpactSummary;
  shadowForecast: ShadowForecastPoint[];
  productData: Record<string, unknown>;
}> {
  // Fetch product and inventory data
  const product = await db.product.findUnique({
    where: { id: baseState.product_id },
    include: {
      inventory: { where: { tenantId } },
      supplier: true,
      forecasts: {
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      },
      salesHistory: {
        where: { tenantId },
        orderBy: { date: 'desc' },
        take: 12,
      },
    },
  });

  if (!product) {
    throw new Error(`Product not found: ${baseState.product_id}`);
  }

  const inventory = product.inventory[0];
  const currentStock = inventory?.currentStock || 0;

  // Calculate current lead time
  const currentLeadTime = baseState.current_lead_time_mode === 'sea'
    ? SEA_TOTAL_LEAD_TIME
    : AIR_TOTAL_LEAD_TIME;
  const targetLeadTime = targetMode === 'sea'
    ? SEA_TOTAL_LEAD_TIME
    : AIR_TOTAL_LEAD_TIME;
  const leadTimeDelta = targetLeadTime - currentLeadTime;

  // Calculate baseline safety stock (current)
  const currentSigmaLt = baseState.current_lead_time_mode === 'sea'
    ? DEFAULT_SIGMA_LT_SEA
    : DEFAULT_SIGMA_LT_AIR;
  const targetSigmaLt = targetMode === 'sea'
    ? DEFAULT_SIGMA_LT_SEA
    : DEFAULT_SIGMA_LT_AIR;

  // Get forecast data for MAE and annual demand
  const mae = product.forecasts.length > 0 && product.forecasts[0].mape !== null
    ? (product.forecasts[0].predictedQty * (product.forecasts[0].mape || 10) / 100)
    : DEFAULT_MAE;

  const annualDemand = product.forecasts.length > 0
    ? Math.round(product.forecasts.reduce((sum, f) => sum + f.predictedQty, 0) / product.forecasts.length * 12)
    : 1200; // Default annual demand

  const unitCost = product.unitCost || 100;

  // Calculate EOQ
  const eoqResult = calculateEOQWithConstraints({
    annualDemand,
    unitCost,
    orderingCost: DEFAULT_ORDERING_COST_BDT,
    holdingCostPct: DEFAULT_HOLDING_COST_PCT,
    supplierMoq: product.minOrderQty,
    maxStockQty: product.maxStock,
    currentStock,
  });

  // Calculate baseline safety stock
  const baselineSSResult = calculateSafetyStockEnhanced({
    eoq: eoqResult.eoq,
    mae,
    meanLeadTimeDays: currentLeadTime,
    sigmaLt: currentSigmaLt,
    shipmentMode: baseState.current_lead_time_mode,
    serviceLevel: 0.95,
    reviewPeriodDays: DEFAULT_REVIEW_PERIOD,
  });

  // Calculate scenario safety stock
  const scenarioSSResult = calculateSafetyStockEnhanced({
    eoq: eoqResult.eoq,
    mae,
    meanLeadTimeDays: targetLeadTime,
    sigmaLt: targetSigmaLt,
    shipmentMode: targetMode,
    serviceLevel: 0.95,
    reviewPeriodDays: DEFAULT_REVIEW_PERIOD,
  });

  const safetyStockDelta = scenarioSSResult.safetyStock - baselineSSResult.safetyStock;

  // Calculate holding cost change
  const holdingCostPerUnit = unitCost * DEFAULT_HOLDING_COST_PCT;
  const holdingCostChangeMonthly = (safetyStockDelta * holdingCostPerUnit) / 12;

  // Calculate shipping cost delta
  const orderQty = eoqResult.eoq;
  let freightCostDelta = 0;
  if (targetMode === 'air' && baseState.current_lead_time_mode === 'sea') {
    freightCostDelta = orderQty * (AIR_FREIGHT_COST_PER_UNIT - SEA_SHIPPING_COST_PER_UNIT);
  } else if (targetMode === 'sea' && baseState.current_lead_time_mode === 'air') {
    freightCostDelta = orderQty * (SEA_SHIPPING_COST_PER_UNIT - AIR_FREIGHT_COST_PER_UNIT);
  }

  // Build net impact string
  const netImpactParts: string[] = [];
  if (Math.abs(leadTimeDelta) > 0) {
    const direction = leadTimeDelta < 0 ? 'reduces' : 'increases';
    netImpactParts.push(`${direction} lead time by ${Math.abs(leadTimeDelta)} days`);
  }
  if (safetyStockDelta !== 0) {
    const direction = safetyStockDelta < 0 ? 'reduces' : 'increases';
    netImpactParts.push(`${direction} safety stock by ${Math.abs(safetyStockDelta)} units`);
  }
  if (Math.abs(freightCostDelta) > 0) {
    if (freightCostDelta > 0) {
      netImpactParts.push(`increases shipping cost by BDT ${Math.round(freightCostDelta).toLocaleString()}`);
    } else {
      netImpactParts.push(`saves shipping cost of BDT ${Math.round(Math.abs(freightCostDelta)).toLocaleString()}`);
    }
  }
  if (Math.abs(holdingCostChangeMonthly) > 0) {
    if (holdingCostChangeMonthly < 0) {
      netImpactParts.push(`saves holding cost of BDT ${Math.round(Math.abs(holdingCostChangeMonthly)).toLocaleString()}/month`);
    } else {
      netImpactParts.push(`increases holding cost by BDT ${Math.round(holdingCostChangeMonthly).toLocaleString()}/month`);
    }
  }

  const netImpact = netImpactParts.length > 0
    ? netImpactParts.join(', ') + (leadTimeDelta < 0 ? ' but reduces stockout risk window' : '')
    : 'No significant impact detected';

  // Build shadow forecast (6 months)
  const shadowForecast: ShadowForecastPoint[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStr = monthDate.toISOString().slice(0, 7);
    const season = getBDSeason(monthDate.getMonth() + 1);

    // Apply seasonal adjustment to safety stock
    const baselineSS = Math.round(baselineSSResult.safetyStock * season.demandMultiplier);
    const scenarioSS = Math.round(scenarioSSResult.safetyStock * season.demandMultiplier);

    shadowForecast.push({
      month: monthStr,
      baseline_safety_stock: baselineSS,
      scenario_safety_stock: scenarioSS,
    });
  }

  const impactSummary: ImpactSummary = {
    lead_time_change_days: leadTimeDelta,
    safety_stock_change: safetyStockDelta,
    holding_cost_savings_monthly_bdt: Math.round(-holdingCostChangeMonthly),
    air_freight_additional_cost_bdt: Math.round(freightCostDelta),
    net_impact: netImpact,
  };

  const productData = {
    sku: product.sku,
    name: product.name,
    category: product.category,
    unitCost: product.unitCost,
    currentStock,
    annualDemand,
    eoq: eoqResult.eoq,
    baselineSafetyStock: baselineSSResult.safetyStock,
    scenarioSafetyStock: scenarioSSResult.safetyStock,
    baselineReorderPoint: baselineSSResult.reorderPoint,
    scenarioReorderPoint: scenarioSSResult.reorderPoint,
  };

  return { impactSummary, shadowForecast, productData };
}

// =============================================
// Scenario Engine: Promo Index Change
// =============================================

async function calculatePromoIndexImpact(
  tenantId: string,
  productId: string,
  promoIndex: number
): Promise<{
  impactSummary: ImpactSummary;
  shadowForecast: ShadowForecastPoint[];
  productData: Record<string, unknown>;
}> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      inventory: { where: { tenantId } },
      forecasts: {
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      },
    },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const inventory = product.inventory[0];
  const unitCost = product.unitCost || 100;
  const sellingPrice = product.sellingPrice || unitCost * 1.3;

  // Baseline demand (no promo = index 1.0)
  const baselineDemand = product.forecasts.length > 0
    ? Math.round(product.forecasts.reduce((sum, f) => sum + f.predictedQty, 0) / product.forecasts.length)
    : 100;

  // Promo-adjusted demand
  const promoDemand = Math.round(baselineDemand * promoIndex);
  const demandChangePct = Math.round((promoIndex - 1) * 100);

  // Revenue impact (monthly)
  const baselineRevenue = baselineDemand * sellingPrice;
  const promoRevenue = promoDemand * sellingPrice;
  const revenueImpact = promoRevenue - baselineRevenue;

  // Safety stock change due to demand change
  const annualDemandBase = baselineDemand * 12;
  const annualDemandPromo = promoDemand * 12;

  const currentStock = inventory?.currentStock || 0;

  const eoqBase = calculateEOQWithConstraints({
    annualDemand: annualDemandBase,
    unitCost,
    supplierMoq: product.minOrderQty,
    maxStockQty: product.maxStock,
    currentStock,
  });

  const eoqPromo = calculateEOQWithConstraints({
    annualDemand: annualDemandPromo,
    unitCost,
    supplierMoq: product.minOrderQty,
    maxStockQty: product.maxStock,
    currentStock,
  });

  const ssBase = calculateSafetyStockEnhanced({
    eoq: eoqBase.eoq,
    mae: DEFAULT_MAE,
    meanLeadTimeDays: SEA_TOTAL_LEAD_TIME,
    sigmaLt: DEFAULT_SIGMA_LT_SEA,
    shipmentMode: 'sea',
    serviceLevel: 0.95,
  });

  const ssPromo = calculateSafetyStockEnhanced({
    eoq: eoqPromo.eoq,
    mae: DEFAULT_MAE,
    meanLeadTimeDays: SEA_TOTAL_LEAD_TIME,
    sigmaLt: DEFAULT_SIGMA_LT_SEA,
    shipmentMode: 'sea',
    serviceLevel: 0.95,
  });

  const inventoryRequirementChange = ssPromo.safetyStock - ssBase.safetyStock;

  // Shadow forecast
  const shadowForecast: ShadowForecastPoint[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStr = monthDate.toISOString().slice(0, 7);
    const season = getBDSeason(monthDate.getMonth() + 1);

    const baselineSS = Math.round(ssBase.safetyStock * season.demandMultiplier);
    const scenarioSS = Math.round(ssPromo.safetyStock * season.demandMultiplier);

    shadowForecast.push({
      month: monthStr,
      baseline_safety_stock: baselineSS,
      scenario_safety_stock: scenarioSS,
    });
  }

  const impactSummary: ImpactSummary = {
    demand_change_pct: demandChangePct,
    revenue_impact_bdt: Math.round(revenueImpact),
    inventory_requirement_change: inventoryRequirementChange,
    net_impact: `Promo index ${promoIndex} changes demand by ${demandChangePct > 0 ? '+' : ''}${demandChangePct}%, revenue impact BDT ${Math.round(revenueImpact).toLocaleString()}/month, safety stock changes by ${inventoryRequirementChange} units`,
  };

  const productData = {
    sku: product.sku,
    name: product.name,
    category: product.category,
    unitCost: product.unitCost,
    sellingPrice: product.sellingPrice,
    baselineMonthlyDemand: baselineDemand,
    promoMonthlyDemand: promoDemand,
    baselineEOQ: eoqBase.eoq,
    promoEOQ: eoqPromo.eoq,
  };

  return { impactSummary, shadowForecast, productData };
}

// =============================================
// Scenario Engine: Service Level Change
// =============================================

async function calculateServiceLevelImpact(
  tenantId: string,
  productId: string,
  targetServiceLevel: number
): Promise<{
  impactSummary: ImpactSummary;
  shadowForecast: ShadowForecastPoint[];
  productData: Record<string, unknown>;
}> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      inventory: { where: { tenantId } },
      forecasts: {
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      },
    },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const inventory = product.inventory[0];
  const unitCost = product.unitCost || 100;
  const currentStock = inventory?.currentStock || 0;
  const currentSS = inventory?.safetyStock || 0;

  const annualDemand = product.forecasts.length > 0
    ? Math.round(product.forecasts.reduce((sum, f) => sum + f.predictedQty, 0) / product.forecasts.length * 12)
    : 1200;

  const eoqResult = calculateEOQWithConstraints({
    annualDemand,
    unitCost,
    supplierMoq: product.minOrderQty,
    maxStockQty: product.maxStock,
    currentStock,
  });

  // Baseline (current service level = 0.95)
  const baselineServiceLevel = 0.95;
  const baselineSS = calculateSafetyStockEnhanced({
    eoq: eoqResult.eoq,
    mae: DEFAULT_MAE,
    meanLeadTimeDays: SEA_TOTAL_LEAD_TIME,
    sigmaLt: DEFAULT_SIGMA_LT_SEA,
    shipmentMode: 'sea',
    serviceLevel: baselineServiceLevel,
  });

  // Scenario
  const clampedServiceLevel = Math.min(0.999, Math.max(0.90, targetServiceLevel));
  const scenarioSS = calculateSafetyStockEnhanced({
    eoq: eoqResult.eoq,
    mae: DEFAULT_MAE,
    meanLeadTimeDays: SEA_TOTAL_LEAD_TIME,
    sigmaLt: DEFAULT_SIGMA_LT_SEA,
    shipmentMode: 'sea',
    serviceLevel: clampedServiceLevel,
  });

  const safetyStockDelta = scenarioSS.safetyStock - baselineSS.safetyStock;
  const holdingCostPerUnit = unitCost * DEFAULT_HOLDING_COST_PCT;
  const holdingCostChangeMonthly = (safetyStockDelta * holdingCostPerUnit) / 12;

  // Shadow forecast
  const shadowForecast: ShadowForecastPoint[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStr = monthDate.toISOString().slice(0, 7);
    const season = getBDSeason(monthDate.getMonth() + 1);

    const baseSS = Math.round(baselineSS.safetyStock * season.demandMultiplier);
    const scenSS = Math.round(scenarioSS.safetyStock * season.demandMultiplier);

    shadowForecast.push({
      month: monthStr,
      baseline_safety_stock: baseSS,
      scenario_safety_stock: scenSS,
    });
  }

  const impactSummary: ImpactSummary = {
    safety_stock_change: safetyStockDelta,
    holding_cost_savings_monthly_bdt: Math.round(-holdingCostChangeMonthly),
    net_impact: `Changing service level from ${(baselineServiceLevel * 100).toFixed(1)}% to ${(clampedServiceLevel * 100).toFixed(1)}% changes safety stock by ${safetyStockDelta} units (${safetyStockDelta > 0 ? 'increases' : 'decreases'} holding cost by BDT ${Math.round(Math.abs(holdingCostChangeMonthly)).toLocaleString()}/month). Safety factor k changes from ${baselineSS.safetyFactorK} to ${scenarioSS.safetyFactorK}.`,
  };

  const productData = {
    sku: product.sku,
    name: product.name,
    category: product.category,
    unitCost: product.unitCost,
    currentSafetyStock: currentSS,
    baselineSafetyStock: baselineSS.safetyStock,
    scenarioSafetyStock: scenarioSS.safetyStock,
    baselineReorderPoint: baselineSS.reorderPoint,
    scenarioReorderPoint: scenarioSS.reorderPoint,
    baselineServiceLevel,
    scenarioServiceLevel: clampedServiceLevel,
    baselineK: baselineSS.safetyFactorK,
    scenarioK: scenarioSS.safetyFactorK,
  };

  return { impactSummary, shadowForecast, productData };
}

// =============================================
// Scenario Engine: Order Quantity Override
// =============================================

async function calculateOrderQuantityOverrideImpact(
  tenantId: string,
  productId: string,
  overrideQty: number
): Promise<{
  impactSummary: ImpactSummary;
  shadowForecast: ShadowForecastPoint[];
  productData: Record<string, unknown>;
}> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      inventory: { where: { tenantId } },
      forecasts: {
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      },
    },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const inventory = product.inventory[0];
  const unitCost = product.unitCost || 100;
  const currentStock = inventory?.currentStock || 0;

  const annualDemand = product.forecasts.length > 0
    ? Math.round(product.forecasts.reduce((sum, f) => sum + f.predictedQty, 0) / product.forecasts.length * 12)
    : 1200;

  const holdingCostPerUnit = unitCost * DEFAULT_HOLDING_COST_PCT;

  // Baseline EOQ
  const baselineEOQ = calculateEOQWithConstraints({
    annualDemand,
    unitCost,
    supplierMoq: product.minOrderQty,
    maxStockQty: product.maxStock,
    currentStock,
  });

  // Calculate costs for override quantity
  const ordersPerYearOverride = annualDemand / overrideQty;
  const totalOrderingCostOverride = ordersPerYearOverride * DEFAULT_ORDERING_COST_BDT;
  const totalHoldingCostOverride = (overrideQty / 2) * holdingCostPerUnit;
  const totalCostOverride = totalOrderingCostOverride + totalHoldingCostOverride;

  const costDelta = totalCostOverride - baselineEOQ.totalInventoryCost;

  // Safety stock with override EOQ
  const ssBaseline = calculateSafetyStockEnhanced({
    eoq: baselineEOQ.eoq,
    mae: DEFAULT_MAE,
    meanLeadTimeDays: SEA_TOTAL_LEAD_TIME,
    sigmaLt: DEFAULT_SIGMA_LT_SEA,
    shipmentMode: 'sea',
    serviceLevel: 0.95,
  });

  const ssOverride = calculateSafetyStockEnhanced({
    eoq: overrideQty,
    mae: DEFAULT_MAE,
    meanLeadTimeDays: SEA_TOTAL_LEAD_TIME,
    sigmaLt: DEFAULT_SIGMA_LT_SEA,
    shipmentMode: 'sea',
    serviceLevel: 0.95,
  });

  // Shadow forecast
  const shadowForecast: ShadowForecastPoint[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStr = monthDate.toISOString().slice(0, 7);
    const season = getBDSeason(monthDate.getMonth() + 1);

    const baseSS = Math.round(ssBaseline.safetyStock * season.demandMultiplier);
    const scenSS = Math.round(ssOverride.safetyStock * season.demandMultiplier);

    shadowForecast.push({
      month: monthStr,
      baseline_safety_stock: baseSS,
      scenario_safety_stock: scenSS,
    });
  }

  const impactSummary: ImpactSummary = {
    safety_stock_change: ssOverride.safetyStock - ssBaseline.safetyStock,
    net_impact: `Overriding order quantity from EOQ=${baselineEOQ.eoq} to ${overrideQty} changes annual inventory cost by BDT ${Math.round(costDelta).toLocaleString()} (${costDelta > 0 ? 'increase' : 'decrease'}). Ordering cost: BDT ${Math.round(totalOrderingCostOverride).toLocaleString()}, Holding cost: BDT ${Math.round(totalHoldingCostOverride).toLocaleString()}, Total: BDT ${Math.round(totalCostOverride).toLocaleString()}. EOQ optimal cost: BDT ${Math.round(baselineEOQ.totalInventoryCost).toLocaleString()}.`,
  };

  const productData = {
    sku: product.sku,
    name: product.name,
    category: product.category,
    unitCost: product.unitCost,
    baselineEOQ: baselineEOQ.eoq,
    overrideQty,
    baselineTotalCost: baselineEOQ.totalInventoryCost,
    overrideTotalCost: totalCostOverride,
    costDelta: Math.round(costDelta),
  };

  return { impactSummary, shadowForecast, productData };
}

// =============================================
// LLM Explanation Generator
// =============================================

async function generateScenarioExplanation(
  query: string,
  modifications: ScenarioModifications,
  impactSummary: ImpactSummary,
  productData: Record<string, unknown>
): Promise<string> {
  try {
    const zai = await ZAI.create();

    const prompt = `Given this What-If scenario question about a Bangladesh motorcycle parts supply chain:

QUERY: ${query}

MODIFICATIONS: ${JSON.stringify(modifications)}

IMPACT CALCULATION RESULTS: ${JSON.stringify(impactSummary)}

PRODUCT DATA: ${JSON.stringify(productData)}

Provide a clear, concise explanation of the impact. Use specific numbers. Format currency as BDT. Reference the EOQ and Safety Stock models where relevant. Keep it under 200 words. Do not use emoji.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are TrimedCast AI, explaining supply chain scenario impacts. Be specific with numbers. Use BDT for currency. Keep explanations concise and actionable.',
        },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    });

    return completion.choices?.[0]?.message?.content || 'Scenario calculated. See impact_summary for details.';
  } catch (error) {
    console.error('[Scenario/Explanation] LLM failed:', error);
    return 'Scenario calculated successfully. See impact_summary for detailed numeric results.';
  }
}

// =============================================
// POST Handler
// =============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      base_state,
      modifications,
    } = body as {
      query?: string;
      base_state?: ScenarioBaseState;
      modifications?: ScenarioModifications;
    };

    // Validate required fields
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!base_state || !base_state.product_id) {
      return NextResponse.json(
        { success: false, error: 'base_state.product_id is required' },
        { status: 400 }
      );
    }

    if (!modifications || Object.keys(modifications).length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one modification is required (lead_time_mode, promo_index, service_level, or order_quantity_override)' },
        { status: 400 }
      );
    }

    // Resolve tenant
    const authContext = await getAuthContext();
    const tenantId = authContext.isAuthenticated
      ? authContext.tenantId
      : await resolveTenant();

    // Rate limiting
    const rlResult = checkRateLimit(tenantId, 'ai');
    if (!rlResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Validate product belongs to tenant
    const product = await db.product.findFirst({
      where: { id: base_state.product_id, tenantId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found or does not belong to this tenant' },
        { status: 404 }
      );
    }

    // Execute scenario based on modification type
    let impactSummary: ImpactSummary;
    let shadowForecast: ShadowForecastPoint[];
    let productData: Record<string, unknown>;

    // Determine which modification to apply (priority: lead_time_mode > promo_index > service_level > order_quantity_override)
    if (modifications.lead_time_mode && ['sea', 'air'].includes(modifications.lead_time_mode)) {
      if (modifications.lead_time_mode === base_state.current_lead_time_mode) {
        return NextResponse.json(
          { success: false, error: `Product is already on ${base_state.current_lead_time_mode} shipment mode. No change detected.` },
          { status: 400 }
        );
      }
      const result = await calculateLeadTimeModeImpact(
        tenantId,
        base_state,
        modifications.lead_time_mode
      );
      impactSummary = result.impactSummary;
      shadowForecast = result.shadowForecast;
      productData = result.productData;
    } else if (modifications.promo_index !== undefined) {
      if (modifications.promo_index < 0 || modifications.promo_index > 1) {
        return NextResponse.json(
          { success: false, error: 'promo_index must be between 0.0 and 1.0' },
          { status: 400 }
        );
      }
      const result = await calculatePromoIndexImpact(
        tenantId,
        base_state.product_id,
        modifications.promo_index
      );
      impactSummary = result.impactSummary;
      shadowForecast = result.shadowForecast;
      productData = result.productData;
    } else if (modifications.service_level !== undefined) {
      if (modifications.service_level < 0.90 || modifications.service_level > 0.99) {
        return NextResponse.json(
          { success: false, error: 'service_level must be between 0.90 and 0.99' },
          { status: 400 }
        );
      }
      const result = await calculateServiceLevelImpact(
        tenantId,
        base_state.product_id,
        modifications.service_level
      );
      impactSummary = result.impactSummary;
      shadowForecast = result.shadowForecast;
      productData = result.productData;
    } else if (modifications.order_quantity_override !== undefined) {
      if (modifications.order_quantity_override < 1) {
        return NextResponse.json(
          { success: false, error: 'order_quantity_override must be a positive integer' },
          { status: 400 }
        );
      }
      const result = await calculateOrderQuantityOverrideImpact(
        tenantId,
        base_state.product_id,
        modifications.order_quantity_override
      );
      impactSummary = result.impactSummary;
      shadowForecast = result.shadowForecast;
      productData = result.productData;
    } else {
      return NextResponse.json(
        { success: false, error: 'No valid modification type detected. Supported: lead_time_mode, promo_index, service_level, order_quantity_override' },
        { status: 400 }
      );
    }

    // Generate LLM explanation
    const answer = await generateScenarioExplanation(
      query,
      modifications,
      impactSummary,
      productData
    );

    // Track usage
    try {
      await db.usageEvent.create({
        data: {
          tenantId,
          eventType: 'ai_scenario_preview',
          metadata: JSON.stringify({
            query: query.slice(0, 200),
            productId: base_state.product_id,
            modifications,
          }),
        },
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      data: {
        answer,
        impact_summary: impactSummary,
        shadow_forecast_data: shadowForecast,
        product_data: productData,
        modifications_applied: modifications,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[AI/ScenarioPreview/POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process scenario preview',
      },
      { status: 500 }
    );
  }
}
