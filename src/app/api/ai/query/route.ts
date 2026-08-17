// ============================================
// POST /api/ai/query
// AI-powered natural language query about TrimedCast supply chain data
// Uses z-ai-web-dev-sdk LLM with TrimedCast-specific system prompt
// Implements conversation memory, rate limiting, and scenario preview
// Session 22: AI Query API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { getBDSeason, BD_SEASONS } from '@/lib/forecasting/models';
import { isCNYShutdown, isCNYRisk, CNY_CALENDAR } from '@/lib/forecasting/prophet-engine';
export const runtime = 'nodejs';


// =============================================
// Conversation Memory (per-session, in-memory)
// =============================================

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const MAX_MESSAGES_PER_SESSION = 20;

const conversationMemory = new Map<string, ConversationMessage[]>();

function getSessionMessages(sessionId: string): ConversationMessage[] {
  return conversationMemory.get(sessionId) || [];
}

function addSessionMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
  const messages = getSessionMessages(sessionId);
  messages.push({ role, content, timestamp: Date.now() });
  // Trim to max, keeping most recent messages
  if (messages.length > MAX_MESSAGES_PER_SESSION) {
    const excess = messages.length - MAX_MESSAGES_PER_SESSION;
    messages.splice(0, excess);
  }
  conversationMemory.set(sessionId, messages);
}

// Periodic cleanup: remove sessions idle for > 30 minutes
const SESSION_TTL_MS = 30 * 60 * 1000;
setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [sessionId, messages] of conversationMemory.entries()) {
    if (messages.length > 0) {
      const lastActivity = messages[messages.length - 1].timestamp;
      if (lastActivity < cutoff) {
        conversationMemory.delete(sessionId);
      }
    }
  }
}, 5 * 60 * 1000);

// =============================================
// Rate Limiting (per-tenant, in-memory)
// =============================================

const tenantQueryCounts = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_QUERIES_PER_WINDOW = 20;

function checkTenantRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const entry = tenantQueryCounts.get(tenantId);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    tenantQueryCounts.set(tenantId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= MAX_QUERIES_PER_WINDOW) {
    return false;
  }

  entry.count++;
  return true;
}

// =============================================
// System Prompt Template
// =============================================

function buildSystemPrompt(currentSeason: string, tenantName: string): string {
  return `You are TrimedCast AI, a supply chain intelligence assistant for motorcycle parts businesses in Bangladesh.

CONTEXT:
- Current Season: ${currentSeason}
- Tenant: ${tenantName}

CAPABILITIES:
1. Stockout risk analysis (identify products at risk within N days)
2. Lead time scenario simulation (sea vs air, CNY impact)
3. Forecast accuracy queries (MAPE, MAE by product/category/season)
4. Cash flow impact analysis (promo index changes, shipment mode changes)
5. Order timing recommendations (when to order, considering CNY)
6. Overstock identification (products exceeding max_stock or 1.5x forecast)

DATA ACCESS:
- You can query: products, inventory, forecasts, recommended_orders, purchase_orders, sales_history
- All queries are scoped to the current tenant
- Currency: BDT (Bangladeshi Taka)
- Seasons: Winter (Nov-Feb), Summer (Mar-May), Monsoon (Jun-Sep), Pre-Winter (Oct)

RULES:
- Always provide specific numbers and product names (not generic advice)
- For what-if scenarios, show the shadow preview data
- Flag CNY risks when order dates fall in Jan 20 - Feb 20
- Reference the mathematical models (EOQ, Safety Stock) when explaining calculations
- If data is insufficient, say so explicitly rather than guessing
- Use BDT lakh format for large numbers (e.g., BDT 1,50,000)`;
}

// =============================================
// Context Type Detection
// =============================================

type ContextType = 'stockout_risk' | 'forecast_accuracy' | 'order_timing' | 'seasonal' | 'lead_time_scenario' | 'cash_flow' | 'overstock' | 'general';

function detectContextType(query: string): ContextType {
  const lower = query.toLowerCase();

  if (/stockout|stock.?risk|stock.?short|run.?out|safety.?stock|reorder.?point/.test(lower)) {
    return 'stockout_risk';
  }

  if (/mape|accuracy|forecast.?error|model.?perf|rmse|mae|bias/.test(lower)) {
    return 'forecast_accuracy';
  }

  if (/lead.?time.?scenario|sea.?vs.?air|shipment.?mode|what.?if|scenario/.test(lower)) {
    return 'lead_time_scenario';
  }

  if (/cash.?flow|promo.?index|cost.?impact|freight/.test(lower)) {
    return 'cash_flow';
  }

  if (/overstock|excess|slow.?mov|above.?max|1\.5x/.test(lower)) {
    return 'overstock';
  }

  if (/order.?timing|when.?order|cny|chinese.?new.?year|lead.?time|urgent|priority/.test(lower)) {
    return 'order_timing';
  }

  if (/season|winter|monsoon|summer|pre.?winter|demand.?pattern|holiday|eid|puja|boishakh/.test(lower)) {
    return 'seasonal';
  }

  return 'general';
}

// =============================================
// Data Gathering Functions
// =============================================

async function gatherStockoutRiskData(tenantId: string): Promise<{ context: string; sourceData: Record<string, unknown> }> {
  const inventory = await db.inventory.findMany({
    where: { tenantId },
    include: {
      product: {
        select: {
          id: true, sku: true, name: true, category: true,
          leadTimeDays: true, unitCost: true,
          supplier: { select: { name: true, leadTimeDays: true } },
        },
      },
    },
  });

  const atRisk = inventory.filter(inv => inv.availableStock <= (inv.safetyStock || 0));

  const sourceData = {
    totalProducts: inventory.length,
    atRiskCount: atRisk.length,
    atRiskProducts: atRisk.map(inv => ({
      sku: inv.product.sku,
      name: inv.product.name,
      availableStock: inv.availableStock,
      safetyStock: inv.safetyStock || 0,
      deficit: (inv.safetyStock || 0) - inv.availableStock,
      unitCost: inv.product.unitCost || 0,
    })),
  };

  if (atRisk.length === 0) {
    return {
      context: 'No products currently at stockout risk. All available stock levels are above safety stock thresholds.',
      sourceData,
    };
  }

  const lines = atRisk.map(inv => {
    const p = inv.product;
    const lt = p.leadTimeDays ?? p.supplier?.leadTimeDays ?? 90;
    const dailyRate = inv.safetyStock && inv.safetyStock > 0 && lt > 0
      ? Math.round(inv.safetyStock / lt * 100) / 100
      : 0;
    const deficit = (inv.safetyStock || 0) - inv.availableStock;
    return `- ${p.sku} (${p.name}): Available ${inv.availableStock}, Safety Stock ${inv.safetyStock || 0}, Deficit ${deficit}, Lead Time ${lt}d, Est Daily Demand ${dailyRate}, Cost BDT ${p.unitCost || 0}`;
  });

  return {
    context: `STOCKOUT RISK PRODUCTS (${atRisk.length} items):\n${lines.join('\n')}`,
    sourceData,
  };
}

async function gatherForecastAccuracyData(tenantId: string): Promise<{ context: string; sourceData: Record<string, unknown> }> {
  const forecasts = await db.forecast.findMany({
    where: { tenantId },
    include: {
      product: { select: { sku: true, name: true, category: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (forecasts.length === 0) {
    return { context: 'No forecast data available.', sourceData: { totalForecasts: 0 } };
  }

  const byModel = new Map<string, { count: number; totalMape: number; mapeCount: number }>();
  for (const f of forecasts) {
    const existing = byModel.get(f.model) || { count: 0, totalMape: 0, mapeCount: 0 };
    existing.count++;
    if (f.mape !== null) {
      existing.totalMape += f.mape;
      existing.mapeCount++;
    }
    byModel.set(f.model, existing);
  }

  const modelLines = Array.from(byModel.entries()).map(([model, data]) => {
    const avgMape = data.mapeCount > 0 ? (data.totalMape / data.mapeCount).toFixed(1) : 'N/A';
    return `- ${model}: ${data.count} forecasts, Avg MAPE ${avgMape}%`;
  });

  const highMape = forecasts
    .filter(f => f.mape !== null && f.mape > 15)
    .slice(0, 10)
    .map(f => `  * ${f.product.sku} (${f.product.name}): MAPE ${f.mape}%, Model ${f.model}`);

  const highMapeSection = highMape.length > 0
    ? `\n\nHIGH MAPE FORECASTS (>15%):\n${highMape.join('\n')}`
    : '';

  const sourceData = {
    totalForecasts: forecasts.length,
    modelSummary: Object.fromEntries(
      Array.from(byModel.entries()).map(([model, data]) => ({
        key: model,
        val: { count: data.count, avgMape: data.mapeCount > 0 ? Math.round((data.totalMape / data.mapeCount) * 10) / 10 : null },
      })).map(({ key, val }) => [key, val])
    ),
    highMapeCount: highMape.length,
  };

  return {
    context: `FORECAST ACCURACY SUMMARY:\n${modelLines.join('\n')}\n\nTotal Forecasts: ${forecasts.length}${highMapeSection}`,
    sourceData,
  };
}

async function gatherOrderTimingData(tenantId: string): Promise<{ context: string; sourceData: Record<string, unknown> }> {
  const now = new Date();
  const orders = await db.recommendedOrder.findMany({
    where: { tenantId, status: 'pending' },
    include: {
      product: { select: { sku: true, name: true, category: true, unitCost: true } },
    },
    orderBy: { orderDate: 'asc' },
    take: 30,
  });

  const cnyStatus = isCNYShutdown(now) ? 'ACTIVE - Factory shutdown in effect'
    : isCNYRisk(now) ? 'RISK - Within buffer period before shutdown'
    : 'Clear - No CNY impact currently';

  const urgentOrders = orders.filter(o => o.urgency === 'critical' || o.urgency === 'high');
  const cnyOrders = orders.filter(o => o.cnyRisk);

  const orderLines = orders.slice(0, 15).map(o =>
    `- ${o.product.sku} (${o.product.name}): Qty ${o.quantity}, Urgency ${o.urgency}, Lead Time ${o.totalLeadTime || '?'}d, Shipment ${o.shipmentMode}${o.cnyRisk ? ' [CNY RISK]' : ''}, Cost BDT ${o.totalCost || 0}`
  );

  const sourceData = {
    pendingOrders: orders.length,
    urgentCount: urgentOrders.length,
    cnyAffectedCount: cnyOrders.length,
    cnyStatus,
    orders: orders.slice(0, 15).map(o => ({
      sku: o.product.sku,
      name: o.product.name,
      quantity: o.quantity,
      urgency: o.urgency,
      shipmentMode: o.shipmentMode,
      cnyRisk: o.cnyRisk,
      totalCost: o.totalCost,
    })),
  };

  return {
    context: `ORDER TIMING:\nPending Orders: ${orders.length}\nUrgent (Critical/High): ${urgentOrders.length}\nCNY-Affected: ${cnyOrders.length}\n\nCNY STATUS: ${cnyStatus}\nCNY Shutdown: Jan 20 - Feb 20, Buffer: ${CNY_CALENDAR.bufferDays} days\n\nTOP PENDING ORDERS:\n${orderLines.join('\n')}`,
    sourceData,
  };
}

async function gatherOverstockData(tenantId: string): Promise<{ context: string; sourceData: Record<string, unknown> }> {
  const inventory = await db.inventory.findMany({
    where: { tenantId },
    include: {
      product: {
        select: { id: true, sku: true, name: true, category: true, maxStock: true, unitCost: true },
      },
    },
  });

  const overstockItems = inventory.filter(inv =>
    inv.currentStock > (inv.maxStockLevel || inv.product.maxStock || Infinity) ||
    inv.currentStock > (inv.safetyStock || 0) * 1.5
  );

  const sourceData = {
    totalProducts: inventory.length,
    overstockCount: overstockItems.length,
    overstockProducts: overstockItems.map(inv => ({
      sku: inv.product.sku,
      name: inv.product.name,
      currentStock: inv.currentStock,
      maxStock: inv.maxStockLevel || inv.product.maxStock,
      safetyStock: inv.safetyStock || 0,
      excessUnits: inv.currentStock - (inv.maxStockLevel || inv.product.maxStock || inv.currentStock),
      unitCost: inv.product.unitCost || 0,
      excessValue: (inv.currentStock - (inv.maxStockLevel || inv.product.maxStock || inv.currentStock)) * (inv.product.unitCost || 0),
    })),
  };

  if (overstockItems.length === 0) {
    return {
      context: 'No overstock items identified. All inventory levels are within acceptable limits.',
      sourceData,
    };
  }

  const lines = overstockItems.slice(0, 20).map(inv => {
    const maxStock = inv.maxStockLevel || inv.product.maxStock || 'N/A';
    const excess = inv.currentStock - (inv.maxStockLevel || inv.product.maxStock || inv.currentStock);
    return `- ${inv.product.sku} (${inv.product.name}): Current ${inv.currentStock}, Max ${maxStock}, Safety Stock ${inv.safetyStock || 0}, Excess ${excess} units, Value BDT ${Math.round(excess * (inv.product.unitCost || 0))}`;
  });

  return {
    context: `OVERSTOCK ITEMS (${overstockItems.length} products exceeding max stock or 1.5x safety stock):\n${lines.join('\n')}`,
    sourceData,
  };
}

async function gatherCashFlowData(tenantId: string): Promise<{ context: string; sourceData: Record<string, unknown> }> {
  const [orders, promos] = await Promise.all([
    db.recommendedOrder.findMany({
      where: { tenantId, status: 'pending' },
      include: { product: { select: { sku: true, name: true, unitCost: true, category: true } } },
      orderBy: { totalCost: 'desc' },
      take: 20,
    }),
    db.promoEvent.findMany({
      where: { tenantId, isActive: true },
      take: 10,
    }),
  ]);

  const totalOrderValue = orders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
  const seaOrders = orders.filter(o => o.shipmentMode === 'sea');
  const airOrders = orders.filter(o => o.shipmentMode === 'air');
  const seaValue = seaOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
  const airValue = airOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);

  const sourceData = {
    pendingOrderValue: totalOrderValue,
    seaOrderCount: seaOrders.length,
    airOrderCount: airOrders.length,
    seaOrderValue: seaValue,
    airOrderValue: airValue,
    activePromos: promos.length,
    promos: promos.map(p => ({
      name: p.name,
      type: p.type,
      discountPct: p.discountPct,
      expectedUplift: p.expectedUplift,
    })),
  };

  const promoLines = promos.length > 0
    ? promos.map(p => `- ${p.name} (${p.type}): Discount ${p.discountPct || 0}%, Expected Uplift ${p.expectedUplift || 0}x`)
    : ['- No active promotions'];

  return {
    context: `CASH FLOW CONTEXT:\nPending Order Value: BDT ${Math.round(totalOrderValue).toLocaleString()}\nSea Orders: ${seaOrders.length} (BDT ${Math.round(seaValue).toLocaleString()})\nAir Orders: ${airOrders.length} (BDT ${Math.round(airValue).toLocaleString()})\n\nACTIVE PROMOTIONS:\n${promoLines.join('\n')}`,
    sourceData,
  };
}

async function gatherSeasonalData(_tenantId: string): Promise<{ context: string; sourceData: Record<string, unknown> }> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentSeason = getBDSeason(currentMonth);

  const seasonLines = BD_SEASONS.map(s =>
    `- ${s.label}: Multiplier ${s.demandMultiplier}x${s.season === currentSeason.season ? ' [CURRENT]' : ''} - ${s.description}`
  );

  const upcomingMonths = [currentMonth, currentMonth + 1, currentMonth + 2].map(m => ((m - 1) % 12) + 1);
  const upcomingHolidays = [
    { name: 'Eid ul-Fitr', month: 4, impact: '-30%' },
    { name: 'Eid ul-Adha', month: 7, impact: '-25%' },
    { name: 'Durga Puja', month: 10, impact: '+10%' },
    { name: 'Pohela Boishakh', month: 4, impact: '+8%' },
    { name: 'Independence Day', month: 3, impact: '-5%' },
  ].filter(h => upcomingMonths.includes(h.month));

  const holidayLines = upcomingHolidays.length > 0
    ? upcomingHolidays.map(h => `- ${h.name} (Month ${h.month}): Demand ${h.impact}`)
    : ['- No major holidays in next 3 months'];

  const cnyStatus = isCNYShutdown(now) ? 'ACTIVE' : isCNYRisk(now) ? 'RISK' : 'Clear';

  const sourceData = {
    currentSeason: currentSeason.label,
    currentMultiplier: currentSeason.demandMultiplier,
    seasons: BD_SEASONS.map(s => ({ label: s.label, multiplier: s.demandMultiplier, months: s.months })),
    upcomingHolidays: upcomingHolidays.length,
    cnyStatus,
  };

  return {
    context: `SEASONAL CONTEXT:\nCurrent Season: ${currentSeason.label} (Multiplier ${currentSeason.demandMultiplier}x)\n\nBD SEASON CALENDAR:\n${seasonLines.join('\n')}\n\nUPCOMING HOLIDAYS (Next 3 months):\n${holidayLines.join('\n')}\n\nCNY STATUS: ${cnyStatus}\nCNY Shutdown Window: Jan 20 - Feb 20`,
    sourceData,
  };
}

async function gatherGeneralData(tenantId: string): Promise<{ context: string; sourceData: Record<string, unknown> }> {
  const [
    totalSkus,
    inventoryData,
    pendingOrders,
    recentForecasts,
    pendingPOs,
  ] = await Promise.all([
    db.product.count({ where: { tenantId, isActive: true } }),
    db.inventory.findMany({
      where: { tenantId },
      include: { product: { select: { unitCost: true } } },
    }),
    db.recommendedOrder.count({
      where: { tenantId, status: 'pending' },
    }),
    db.forecast.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { mape: true, model: true },
    }),
    db.purchaseOrder.count({
      where: { tenantId, status: { in: ['draft', 'submitted', 'confirmed', 'in_transit'] } },
    }),
  ]);

  const stockoutRisk = inventoryData.filter(i => i.availableStock <= (i.safetyStock || 0)).length;
  const totalValue = inventoryData.reduce((sum, i) => sum + i.currentStock * (i.product.unitCost || 0), 0);

  const mapeValues = recentForecasts.filter(f => f.mape !== null).map(f => f.mape as number);
  const avgMape = mapeValues.length > 0
    ? Math.round((mapeValues.reduce((a, b) => a + b, 0) / mapeValues.length) * 10) / 10
    : null;

  const currentMonth = new Date().getMonth() + 1;
  const currentSeason = getBDSeason(currentMonth);

  const sourceData = {
    totalSkus,
    totalStockValue: Math.round(totalValue),
    stockoutRiskCount: stockoutRisk,
    pendingRecommendedOrders: pendingOrders,
    pendingPurchaseOrders: pendingPOs,
    avgMape,
    forecastAccuracy: avgMape !== null ? Math.round((100 - avgMape) * 10) / 10 : null,
    currentSeason: currentSeason.label,
    currentMultiplier: currentSeason.demandMultiplier,
  };

  return {
    context: `DASHBOARD KPIs:\n- Total Active SKUs: ${totalSkus}\n- Total Stock Value: BDT ${Math.round(totalValue).toLocaleString()}\n- Stockout Risk Items: ${stockoutRisk}\n- Pending Recommended Orders: ${pendingOrders}\n- Pending Purchase Orders: ${pendingPOs}\n- Avg Forecast MAPE: ${avgMape !== null ? `${avgMape}%` : 'N/A'}\n- Forecast Accuracy: ${avgMape !== null ? `${(100 - avgMape).toFixed(1)}%` : 'N/A'}\n- Current Season: ${currentSeason.label} (${currentSeason.demandMultiplier}x demand)`,
    sourceData,
  };
}

async function gatherLeadTimeScenarioData(tenantId: string): Promise<{ context: string; sourceData: Record<string, unknown> }> {
  const [inventory, orders] = await Promise.all([
    db.inventory.findMany({
      where: { tenantId },
      include: {
        product: {
          select: {
            id: true, sku: true, name: true, category: true,
            leadTimeDays: true, unitCost: true,
            supplier: { select: { name: true, leadTimeDays: true } },
          },
        },
      },
      take: 30,
    }),
    db.recommendedOrder.findMany({
      where: { tenantId, status: 'pending' },
      include: { product: { select: { sku: true, name: true, unitCost: true } } },
      take: 20,
    }),
  ]);

  const seaOrders = orders.filter(o => o.shipmentMode === 'sea');
  const airOrders = orders.filter(o => o.shipmentMode === 'air');

  const lowStockItems = inventory.filter(inv => inv.availableStock <= (inv.safetyStock || 0) * 1.5);

  const sourceData = {
    totalInventory: inventory.length,
    lowStockCount: lowStockItems.length,
    pendingSeaOrders: seaOrders.length,
    pendingAirOrders: airOrders.length,
    seaOrderValue: seaOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0),
    airOrderValue: airOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0),
  };

  const lowStockLines = lowStockItems.slice(0, 10).map(inv =>
    `- ${inv.product.sku}: Available ${inv.availableStock}, Safety Stock ${inv.safetyStock || 0}, Lead Time ${inv.product.leadTimeDays || inv.product.supplier?.leadTimeDays || 90}d`
  );

  return {
    context: `LEAD TIME SCENARIO CONTEXT:\nPending Sea Orders: ${seaOrders.length} (BDT ${Math.round(sourceData.seaOrderValue).toLocaleString()})\nPending Air Orders: ${airOrders.length} (BDT ${Math.round(sourceData.airOrderValue).toLocaleString()})\nLow Stock Items (within 1.5x SS): ${lowStockItems.length}\n\nLOW STOCK ITEMS:\n${lowStockLines.join('\n') || 'None'}\n\nNote: Sea lead time = ~90 days total, Air lead time = ~35 days total\nSea shipping cost: ~BDT 45/unit, Air freight: ~BDT 315/unit`,
    sourceData,
  };
}

async function gatherDataContext(tenantId: string, contextType: ContextType): Promise<{ context: string; sourceData: Record<string, unknown> }> {
  switch (contextType) {
    case 'stockout_risk':
      return await gatherStockoutRiskData(tenantId);
    case 'forecast_accuracy':
      return await gatherForecastAccuracyData(tenantId);
    case 'order_timing':
      return await gatherOrderTimingData(tenantId);
    case 'seasonal':
      return await gatherSeasonalData(tenantId);
    case 'lead_time_scenario':
      return await gatherLeadTimeScenarioData(tenantId);
    case 'cash_flow':
      return await gatherCashFlowData(tenantId);
    case 'overstock':
      return await gatherOverstockData(tenantId);
    case 'general':
    default:
      return await gatherGeneralData(tenantId);
  }
}

// =============================================
// Scenario Preview Detection
// =============================================

function detectScenarioPreview(query: string, contextType: ContextType): Record<string, unknown> | null {
  const lower = query.toLowerCase();

  // Detect what-if / scenario queries
  if (contextType === 'lead_time_scenario' || /what.?if|scenario|switch.*air|switch.*sea|move.*air|move.*sea/.test(lower)) {
    const targetMode = /air/.test(lower) ? 'air' : /sea/.test(lower) ? 'sea' : null;
    if (targetMode) {
      return {
        type: 'lead_time_mode_change',
        target_mode: targetMode,
        hint: 'Use the /api/ai/scenario-preview endpoint for detailed What-If analysis with numeric impact calculations.',
      };
    }
  }

  if (/promo.*change|increase.*promo|decrease.*promo|promo.*index/.test(lower)) {
    return {
      type: 'promo_index_change',
      hint: 'Use the /api/ai/scenario-preview endpoint for detailed promo impact analysis.',
    };
  }

  if (/service.?level|increase.*service|decrease.*service/.test(lower)) {
    return {
      type: 'service_level_change',
      hint: 'Use the /api/ai/scenario-preview endpoint for detailed service level impact analysis.',
    };
  }

  return null;
}

// =============================================
// POST Handler
// =============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, context: requestContext } = body as {
      query?: string;
      context?: {
        current_season?: string;
        tenant_id?: string;
        user_role?: string;
        session_id?: string;
      };
    };

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Resolve tenant
    const authContext = await getAuthContext();
    const tenantId = authContext.isAuthenticated
      ? authContext.tenantId
      : (requestContext?.tenant_id
        ? await resolveTenant(requestContext.tenant_id)
        : await resolveTenant());

    // Rate limiting: check per-tenant limit
    if (!checkTenantRateLimit(tenantId)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait before making more queries.' },
        { status: 429 }
      );
    }

    // Also check the shared rate limiter
    const rlResult = checkRateLimit(tenantId, 'ai');
    if (!rlResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait before making more queries.' },
        { status: 429 }
      );
    }

    // Detect context type
    const contextType = detectContextType(query);

    // Gather relevant data from the database
    const { context: dataContext, sourceData } = await gatherDataContext(tenantId, contextType);

    // Resolve tenant name for system prompt
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    // Determine current season
    const currentMonth = new Date().getMonth() + 1;
    const currentSeason = requestContext?.current_season || getBDSeason(currentMonth).label;

    // Build system prompt
    const systemPrompt = buildSystemPrompt(currentSeason, tenant?.name || 'Unknown');

    // Session ID for conversation memory
    const sessionId = requestContext?.session_id || `session_${tenantId}_${Date.now()}`;

    // Get conversation history
    const history = getSessionMessages(sessionId);

    // Build messages for LLM (include conversation history)
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: systemPrompt + '\n\n---\n\nCURRENT DATA CONTEXT:\n' + dataContext,
      },
    ];

    // Add conversation history
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Add current user query
    messages.push({ role: 'user', content: query });

    // Call LLM
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });

    const answer = completion.choices?.[0]?.message?.content || 'Unable to generate a response.';

    // Update conversation memory
    addSessionMessage(sessionId, 'user', query);
    addSessionMessage(sessionId, 'assistant', answer);

    // Detect scenario preview opportunity
    const scenarioPreview = detectScenarioPreview(query, contextType);

    // Track usage event
    try {
      await db.usageEvent.create({
        data: {
          tenantId,
          eventType: 'ai_query',
          metadata: JSON.stringify({
            query: query.slice(0, 200),
            contextType,
            session_id: sessionId,
            responseLength: answer.length,
            scenarioPreviewDetected: scenarioPreview !== null,
          }),
        },
      });
    } catch {
      // Non-critical: usage tracking failure should not break the query
    }

    return NextResponse.json({
      success: true,
      data: {
        answer,
        source_data: sourceData,
        scenario_preview: scenarioPreview,
        context_type: contextType,
        session_id: sessionId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[AI/Query/POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process AI query',
      },
      { status: 500 }
    );
  }
}
