// ============================================
// POST /api/v1/ai/query
// AI-powered natural language query about TrimedCast data
// Uses z-ai-web-dev-sdk LLM with TrimedCast-specific system prompt
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';
import { getBDSeason, BD_SEASONS } from '@/lib/forecasting/models';
import { isCNYShutdown, isCNYRisk, CNY_CALENDAR } from '@/lib/forecasting/prophet-engine';

// =============================================
// System Prompt
// =============================================

const TRIMEDCAST_SYSTEM_PROMPT = `You are TrimedCast AI, an intelligent assistant for the TrimedCast Seasonal Demand & Inventory Forecasting System -- a multi-tenant SaaS platform for Bangladesh motorcycle parts businesses.

Your expertise covers:
- **BD Market Context**: 4 seasons (Winter Nov-Feb, Summer Mar-May, Monsoon Jun-Sep, Pre-Winter Oct), Bengali holidays (Eid, Durga Puja, Pohela Boishakh), BDT currency formatting
- **Forecasting**: Prophet model with BD custom seasonalities, exponential smoothing, seasonal decomposition, ensemble forecasting, MAPE/MAE/RMSE metrics
- **Inventory Optimization**: EOQ calculation, safety stock (SS = k*sqrt(mu_t*sigma_d^2 + mu_d^2*sigma_t^2)), reorder points, stock status classification
- **Order Triggers**: Lead time decomposition (manufacturing + shipping + customs), CNY (Chinese New Year) risk detection and resolution, urgency classification
- **S&OP**: Consensus forecasting workflow (validation, approval, operationalization, governance)
- **Supply Chain**: China-BD corridor, sea vs air shipping, CNY shutdown impact (Jan 20-Feb 20)

Answer queries with data-backed insights. Use Bangladesh-specific context. Format currency as BDT (Tk). When answering about stockout risk, reference safety stock levels and lead times. When discussing seasonal patterns, reference BD season calendar.

Be concise and actionable. Use bullet points and tables where appropriate. Always provide specific numbers when available from the data context.`;

// =============================================
// Context Type Detection
// =============================================

type ContextType = 'stockout_risk' | 'forecast_accuracy' | 'order_timing' | 'seasonal' | 'general';

function detectContextType(query: string): ContextType {
  const lower = query.toLowerCase();

  // Stockout risk patterns
  if (/stockout|stock.?risk|stock.?short|run.?out|safety.?stock|reorder.?point/.test(lower)) {
    return 'stockout_risk';
  }

  // Forecast accuracy patterns
  if (/mape|accuracy|forecast.?error|model.?perf|rmse|mae|bias/.test(lower)) {
    return 'forecast_accuracy';
  }

  // Order timing patterns
  if (/order.?timing|when.?order|cny|chinese.?new.?year|lead.?time|urgent|priority/.test(lower)) {
    return 'order_timing';
  }

  // Seasonal patterns
  if (/season|winter|monsoon|summer|pre.?winter|demand.?pattern|holiday|eid|puja|boishakh/.test(lower)) {
    return 'seasonal';
  }

  return 'general';
}

// =============================================
// Data Gathering Functions
// =============================================

async function gatherStockoutRiskData(tenantId: string): Promise<string> {
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

  if (atRisk.length === 0) {
    return 'No products currently at stockout risk. All available stock levels are above safety stock thresholds.';
  }

  const lines = atRisk.map(inv => {
    const p = inv.product;
    const lt = p.leadTimeDays ?? p.supplier?.leadTimeDays ?? 90;
    const dailyRate = inv.safetyStock && inv.safetyStock > 0 && lt > 0
      ? Math.round(inv.safetyStock / lt * 100) / 100
      : 0;
    const deficit = (inv.safetyStock || 0) - inv.availableStock;
    return `- ${p.sku} (${p.name}): Available ${inv.availableStock}, Safety Stock ${inv.safetyStock || 0}, Deficit ${deficit}, Lead Time ${lt}d, Est Daily Demand ${dailyRate}, Cost Tk ${p.unitCost || 0}`;
  });

  return `STOCKOUT RISK PRODUCTS (${atRisk.length} items):\n${lines.join('\n')}`;
}

async function gatherForecastAccuracyData(tenantId: string): Promise<string> {
  const forecasts = await db.forecast.findMany({
    where: { tenantId },
    include: {
      product: { select: { sku: true, name: true, category: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (forecasts.length === 0) {
    return 'No forecast data available.';
  }

  // Group by model
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

  // Flag high-MAPE products
  const highMape = forecasts
    .filter(f => f.mape !== null && f.mape > 15)
    .slice(0, 10)
    .map(f => `  * ${f.product.sku} (${f.product.name}): MAPE ${f.mape}%, Model ${f.model}`);

  const highMapeSection = highMape.length > 0
    ? `\n\nHIGH MAPE FORECASTS (>15%):\n${highMape.join('\n')}`
    : '';

  return `FORECAST ACCURACY SUMMARY:\n${modelLines.join('\n')}\n\nTotal Forecasts: ${forecasts.length}${highMapeSection}`;
}

async function gatherOrderTimingData(tenantId: string): Promise<string> {
  const now = new Date();
  const orders = await db.recommendedOrder.findMany({
    where: {
      tenantId,
      status: 'pending',
    },
    include: {
      product: {
        select: { sku: true, name: true, category: true, unitCost: true },
      },
    },
    orderBy: { orderDate: 'asc' },
    take: 30,
  });

  const cnyStatus = isCNYShutdown(now) ? 'ACTIVE - Factory shutdown in effect'
    : isCNYRisk(now) ? 'RISK - Within buffer period before shutdown'
    : 'Clear - No CNY impact currently';

  if (orders.length === 0) {
    return `ORDER TIMING:\nNo pending recommended orders.\n\nCNY STATUS: ${cnyStatus}\nCNY Shutdown: Jan 20 - Feb 20, Buffer: ${CNY_CALENDAR.bufferDays} days`;
  }

  const urgentOrders = orders.filter(o => o.urgency === 'critical' || o.urgency === 'high');
  const cnyOrders = orders.filter(o => o.cnyRisk);

  const orderLines = orders.slice(0, 15).map(o =>
    `- ${o.product.sku} (${o.product.name}): Qty ${o.quantity}, Urgency ${o.urgency}, Lead Time ${o.totalLeadTime || '?'}d, Shipment ${o.shipmentMode}${o.cnyRisk ? ' [CNY RISK]' : ''}, Cost Tk ${o.totalCost || 0}`
  );

  return `ORDER TIMING:\nPending Orders: ${orders.length}\nUrgent (Critical/High): ${urgentOrders.length}\nCNY-Affected: ${cnyOrders.length}\n\nCNY STATUS: ${cnyStatus}\nCNY Shutdown: Jan 20 - Feb 20, Buffer: ${CNY_CALENDAR.bufferDays} days\n\nTOP PENDING ORDERS:\n${orderLines.join('\n')}`;
}

async function gatherSeasonalData(_tenantId: string): Promise<string> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentSeason = getBDSeason(currentMonth);

  const seasonLines = BD_SEASONS.map(s =>
    `- ${s.label}: Multiplier ${s.demandMultiplier}x${s.season === currentSeason.season ? ' [CURRENT]' : ''} - ${s.description}`
  );

  // Check upcoming holidays
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

  return `SEASONAL CONTEXT:\nCurrent Season: ${currentSeason.label} (Multiplier ${currentSeason.demandMultiplier}x)\n\nBD SEASON CALENDAR:\n${seasonLines.join('\n')}\n\nUPCOMING HOLIDAYS (Next 3 months):\n${holidayLines.join('\n')}\n\nCNY STATUS: ${cnyStatus}\nCNY Shutdown Window: Jan 20 - Feb 20`;
}

async function gatherGeneralData(tenantId: string): Promise<string> {
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

  return `DASHBOARD KPIs:
- Total Active SKUs: ${totalSkus}
- Total Stock Value: Tk ${Math.round(totalValue).toLocaleString()}
- Stockout Risk Items: ${stockoutRisk}
- Pending Recommended Orders: ${pendingOrders}
- Pending Purchase Orders: ${pendingPOs}
- Avg Forecast MAPE: ${avgMape !== null ? `${avgMape}%` : 'N/A'}
- Forecast Accuracy: ${avgMape !== null ? `${(100 - avgMape).toFixed(1)}%` : 'N/A'}
- Current Season: ${currentSeason.label} (${currentSeason.demandMultiplier}x demand)`;
}

async function gatherDataContext(tenantId: string, contextType: ContextType): Promise<string> {
  switch (contextType) {
    case 'stockout_risk':
      return await gatherStockoutRiskData(tenantId);
    case 'forecast_accuracy':
      return await gatherForecastAccuracyData(tenantId);
    case 'order_timing':
      return await gatherOrderTimingData(tenantId);
    case 'seasonal':
      return await gatherSeasonalData(tenantId);
    case 'general':
    default:
      return await gatherGeneralData(tenantId);
  }
}

// =============================================
// POST Handler
// =============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, context_type, tenant_id } = body as {
      query?: string;
      context_type?: ContextType;
      tenant_id?: string;
    };

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Resolve tenant
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated
      ? context.tenantId
      : (tenant_id ? await resolveTenant(tenant_id) : await resolveTenant());

    // Detect context type (explicit or auto-detected)
    const effectiveContextType: ContextType = context_type || detectContextType(query);

    // Gather relevant data
    const dataContext = await gatherDataContext(tenantId, effectiveContextType);

    // Build messages for LLM
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: TRIMEDCAST_SYSTEM_PROMPT + '\n\n---\n\nCURRENT DATA CONTEXT:\n' + dataContext,
        },
        { role: 'user', content: query },
      ],
      thinking: { type: 'disabled' },
    });

    const answer = completion.choices?.[0]?.message?.content || 'Unable to generate a response.';

    // Track usage event
    try {
      await db.usageEvent.create({
        data: {
          tenantId,
          eventType: 'ai_query',
          metadata: JSON.stringify({
            query: query.slice(0, 200),
            contextType: effectiveContextType,
            responseLength: answer.length,
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
        query,
        context_type: effectiveContextType,
        data_used: {
          type: effectiveContextType,
          tenant_id: tenantId,
          context_length: dataContext.length,
        },
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
