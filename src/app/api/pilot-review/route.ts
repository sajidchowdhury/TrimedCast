// ============================================
// TrimedCast LEAN — /api/pilot-review
// Phase 6: summarizes the pilot results + lists the deferred-scope
// capabilities with their reactivation triggers, so the client can
// review what worked and decide what to build next.
// ============================================

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The 14 capabilities deferred per the lean scope, with their
// reactivation triggers (from Section 2.2 of the Lean Roadmap).
const DEFERRED_SCOPE = [
  { capability: 'Subscription billing (bKash/Nagad/SSLCommerz)', phase: 'Platform', trigger: 'When tenant count exceeds 50 or revenue exceeds $5k MRR', priority: 'low', reason: 'Client confirmed manual WhatsApp-based access; no billing needed for v1' },
  { capability: 'Multi-tenancy (tenant_id, RLS)', phase: 'Platform', trigger: 'When a second client signs up', priority: 'low', reason: 'Single client, single deployment for v1' },
  { capability: 'Seven-role RBAC', phase: 'Platform', trigger: 'When the client adds a second team member', priority: 'medium', reason: 'Single admin user suffices for v1' },
  { capability: 'Two-factor authentication (TOTP)', phase: 'Security', trigger: 'Before holding real financial data, or for enterprise sales', priority: 'medium', reason: 'Single admin, low attack surface for v1' },
  { capability: 'AI scenario preview (LLM)', phase: 'Forecast', trigger: 'After the first 3 sessions prove forecast accuracy', priority: 'medium', reason: 'Nice-to-have, not a core requirement' },
  { capability: 'Auto-recalibration engine', phase: 'Forecast', trigger: 'When SKU count exceeds 200 or MAPE exceeds 15%', priority: 'medium', reason: 'Manual forecast refresh suffices initially' },
  { capability: 'Audit log + security events', phase: 'Security', trigger: 'Before SOC 2 or enterprise sales', priority: 'low', reason: 'No compliance requirement yet' },
  { capability: 'Observability stack (Sentry, Better Stack)', phase: 'Ops', trigger: 'When production traffic exceeds 100 users', priority: 'low', reason: 'Console logging suffices for v1 scale' },
  { capability: 'Volumetric weight + FCL/LCL calculator', phase: 'Freight', trigger: 'When client adds bulky or low-density SKUs', priority: 'low', reason: "Client's SKUs are small/dense; per-unit cost suffices" },
  { capability: 'Custom seasonality types (beyond built-in)', phase: 'Forecast', trigger: 'When client adds a new festival not in the built-in list', priority: 'low', reason: 'The 4 client sessions are all built-in' },
  { capability: 'Consensus pipeline (qualitative override)', phase: 'Forecast', trigger: 'When the sales team wants to inject manual adjustments', priority: 'high', reason: 'Use pure quantitative forecast for v1 — but if MAPE is high, reactivate first' },
  { capability: 'Marketing adjustments (promo_index)', phase: 'Forecast', trigger: 'When client starts running price promotions', priority: 'low', reason: 'Client does not run promotions yet' },
  { capability: 'Currency exposure / hedging recommendations', phase: 'Finance', trigger: 'When client imports from multiple currency zones', priority: 'low', reason: 'Single-currency (BDT) for v1' },
  { capability: 'Bengali i18n UI', phase: 'Platform', trigger: 'When client requests Bengali UI', priority: 'medium', reason: "Client's team is comfortable in English" },
] as const;

export async function GET() {
  // 1. Load the pilot session (next upcoming)
  const now = new Date();
  let session = await db.festivalSession.findFirst({
    where: { peakDate: { gt: now } },
    orderBy: { peakDate: 'asc' },
  });
  if (!session) {
    session = await db.festivalSession.findFirst({ orderBy: { peakDate: 'asc' } });
  }

  // 2. Load pilot data
  const [forecasts, orders, products, imports] = await Promise.all([
    db.forecast.findMany(session ? { where: { festivalSessionId: session.id } } : {}),
    db.recommendedOrder.findMany(session ? { where: { festivalSessionId: session.id } } : {}),
    db.product.findMany(),
    db.dataImport.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  // 3. Accuracy summary
  const accuracyBuckets = { excellent: 0, good: 0, fair: 0, poor: 0, unusable: 0 };
  let totalMape = 0;
  let mapeCount = 0;
  for (const f of forecasts) {
    if (f.mape > 0) {
      totalMape += f.mape;
      mapeCount++;
    }
    if (f.accuracyRating in accuracyBuckets) {
      accuracyBuckets[f.accuracyRating as keyof typeof accuracyBuckets]++;
    }
  }
  const avgMape = mapeCount > 0 ? Math.round((totalMape / mapeCount) * 100) / 100 : 0;

  // 4. Fulfillment stats
  const skuCount = products.length;
  const forecastCount = forecasts.length;
  const orderCount = orders.length;
  const fulfillmentRate = skuCount > 0 ? Math.round((orderCount / skuCount) * 100) : 0;

  // 5. Critical / high urgency counts
  const criticalCount = orders.filter((o) => o.urgency === 'critical').length;
  const highCount = orders.filter((o) => o.urgency === 'high').length;
  const cnyAffected = orders.filter((o) => o.cnyStrategy && o.cnyStrategy !== 'none').length;

  // 6. Total order qty + landed cost (from the orders)
  const totalOrderQty = orders.reduce((s, o) => s + o.recommendedQty, 0);

  // 7. Top accuracy issues (SKUs with poor/fair/unusable ratings)
  const accuracyIssues = forecasts
    .filter((f) => f.accuracyRating === 'poor' || f.accuracyRating === 'unusable' || f.mape > 15)
    .map((f) => ({ skuCode: f.skuCode, productName: f.productName, mape: f.mape, rating: f.accuracyRating }))
    .sort((a, b) => b.mape - a.mape)
    .slice(0, 5);

  // 8. Next steps recommendations (based on pilot data)
  const nextSteps: { priority: 'high' | 'medium' | 'low'; action: string; reason: string }[] = [];

  if (avgMape > 15 && mapeCount > 0) {
    nextSteps.push({
      priority: 'high',
      action: 'Reactivate the Consensus Pipeline (qualitative override)',
      reason: `Average MAPE is ${avgMape}% (> 15% threshold). Let the sales team inject market knowledge to improve accuracy.`,
    });
  }
  if (cnyAffected > 0) {
    nextSteps.push({
      priority: 'high',
      action: `Review CNY strategies for ${cnyAffected} SKU${cnyAffected > 1 ? 's' : ''}`,
      reason: 'These SKUs have order-trigger dates overlapping the Chinese New Year shutdown. Confirm the before_cny / after_cny / air_escape strategy with the supplier.',
    });
  }
  if (criticalCount > 0) {
    nextSteps.push({
      priority: 'high',
      action: `Place ${criticalCount} critical purchase orders immediately`,
      reason: 'These SKUs have trigger dates in the past or within 30 days. Every day of delay increases stockout risk.',
    });
  }
  if (skuCount > 200) {
    nextSteps.push({
      priority: 'medium',
      action: 'Reactivate the Auto-recalibration Engine',
      reason: `SKU count (${skuCount}) exceeds 200. Weekly auto-recalibration will keep forecasts accurate without manual refresh.`,
    });
  }
  nextSteps.push({
    priority: 'medium',
    action: 'Schedule the monthly check-in',
    reason: 'Review forecast accuracy monthly for the first 3 months. Re-tune the festival calendar as new Eid dates are published.',
  });
  nextSteps.push({
    priority: 'low',
    action: 'Collect client feedback on usability',
    reason: 'Ask the operations team: could they understand and act on the dashboard without engineering support?',
  });

  return NextResponse.json({
    session: session ? {
      id: session.id,
      name: session.name,
      peakDate: session.peakDate.toISOString().slice(0, 10),
    } : null,
    pilotSummary: {
      skuCount,
      forecastCount,
      orderCount,
      fulfillmentRate,
      criticalCount,
      highCount,
      cnyAffected,
      totalOrderQty,
      avgMape,
      mapeCount,
      accuracyBuckets,
    },
    accuracyIssues,
    nextSteps,
    deferredScope: DEFERRED_SCOPE,
    importHistory: imports.map((i) => ({
      id: i.id,
      fileName: i.fileName,
      status: i.status,
      rowCount: i.rowCount,
      skuCount: i.skuCount,
      createdAt: i.createdAt.toISOString(),
    })),
  });
}
