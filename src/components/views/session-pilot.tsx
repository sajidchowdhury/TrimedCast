'use client';

// ============================================
// TrimedCast LEAN — Session Pilot (Phase 5)
// The unified festival-pilot dashboard: composes all 6 capabilities
// for the next upcoming session into one view the client can act on.
//
// (a) Excel upload  → (b) Forecast  → (c) Order qty
// (d) Order timing  → (e) Air vs sea → (f) Line cost
// ============================================

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDate } from '@/lib/sessions/festival-calendar';
import {
  CalendarClock, Package, ShoppingCart, TrendingUp, Plane, Ship,
  Calculator, AlertCircle, Sparkles, Loader2, CheckCircle2, ArrowRight,
  Clock, Target, AlertTriangle, DollarSign,
} from 'lucide-react';

interface SessionInfo {
  id: string;
  name: string;
  type: string;
  peakDate: string;
  windowStart: string;
  windowEnd: string;
  demandEffect: number;
  effectDescription: string;
  daysUntil: number;
}

interface SessionKPIs {
  skuCount: number;
  totalOrderQty: number;
  totalForecastQty: number;
  totalLandedCost: number;
  totalMargin: number;
  criticalCount: number;
  highCount: number;
  seaCount: number;
  airCount: number;
  avgMape: number;
}

interface SessionSteps {
  excelUploaded: boolean;
  forecastGenerated: boolean;
  ordersGenerated: boolean;
  freightAnalyzed: boolean;
}

interface SessionRow {
  skuCode: string;
  productName: string;
  colorDetails: string | null;
  forecastQty: number;
  mape: number;
  accuracyRating: string;
  recommendedQty: number;
  safetyStock: number;
  reorderPoint: number;
  orderTriggerDate: string | null;
  expectedDelivery: string | null;
  urgency: string;
  cnyStrategy: string;
  recommendedMode: string;
  seaLandedCost: number;
  airLandedCost: number;
  costPremiumPct: number;
  landedCostPerUnit: number;
  marginPct: number;
  marginPerUnit: number;
  totalLandedCost: number;
  unitCostBdt: number;
  sellingPrice: number;
}

interface SessionDashboardData {
  session: SessionInfo;
  kpis: SessionKPIs;
  steps: SessionSteps;
  rows: SessionRow[];
  criticalSkus: SessionRow[];
}

const URGENCY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-muted/40 text-muted-foreground border-border',
};

const ACCURACY_COLORS: Record<string, string> = {
  excellent: 'text-emerald-600',
  good: 'text-green-600',
  fair: 'text-amber-600',
  poor: 'text-orange-600',
  unusable: 'text-red-600',
};

export function SessionPilot() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const setView = useAppStore((s) => s.setView);
  const [data, setData] = useState<SessionDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/session-dashboard');
        if (!res.ok) { if (!cancelled) setData(null); return; }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [dataVersion]);

  const runFullPipeline = async () => {
    if (!data?.session.id) return;
    setGenerating(true);
    const sessionId = data.session.id;
    try {
      // Step 1: Generate forecasts
      toast.info('Generating forecasts…');
      const fRes = await fetch('/api/forecast/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ festivalSessionId: sessionId }),
      });
      const fJson = await fRes.json();
      if (!fRes.ok || !fJson.success) {
        toast.error('Forecast failed', { description: fJson.error });
        return;
      }
      toast.success(`Forecast: ${fJson.generated} SKUs`);

      // Step 2: Generate order recommendations
      toast.info('Generating order recommendations…');
      const oRes = await fetch('/api/orders/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ festivalSessionId: sessionId, serviceLevel: 0.95 }),
      });
      const oJson = await oRes.json();
      if (!oRes.ok || !oJson.success) {
        toast.error('Orders failed', { description: oJson.error });
        return;
      }
      toast.success(`Orders: ${oJson.generated} SKUs`);

      // Step 3: Reload the session dashboard (freight is computed inline)
      const res = await fetch('/api/session-dashboard');
      if (res.ok) setData(await res.json());
      toast.success('Pipeline complete', { description: 'All 6 capabilities ready for the session pilot.' });
    } catch (e) {
      toast.error('Pipeline failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally { setGenerating(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium">No session data</p>
          <p className="text-xs text-muted-foreground mt-1">Upload Excel to start the pilot.</p>
          <Button size="sm" className="mt-3" onClick={() => setView('upload')}>Upload Excel</Button>
        </CardContent>
      </Card>
    );
  }

  const { session, kpis, steps, rows, criticalSkus } = data;
  const allReady = steps.excelUploaded && steps.forecastGenerated && steps.ordersGenerated;

  return (
    <div className="space-y-5">
      {/* Session banner */}
      <Card className="overflow-hidden border-primary/30">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            <div className="flex-1 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={session.type === 'supply' ? 'destructive' : 'default'}>
                  {session.type}
                </Badge>
                <span className="text-xs text-muted-foreground">Next session · pilot target</span>
              </div>
              <h2 className="text-xl font-semibold">{session.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Peak: {formatDate(session.peakDate)} · Window: {formatDate(session.windowStart)} – {formatDate(session.windowEnd)}
              </p>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="text-sm">{session.effectDescription}</Badge>
                {session.daysUntil > 0 ? (
                  <span className="text-sm font-medium text-orange-600 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {session.daysUntil} days away
                  </span>
                ) : (
                  <span className="text-sm font-medium text-red-600">In progress / passed</span>
                )}
              </div>
            </div>
            <div className="border-t md:border-t-0 md:border-l p-5 md:w-56 flex flex-col justify-center gap-2">
              {!allReady ? (
                <Button onClick={runFullPipeline} disabled={generating} size="sm">
                  {generating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running pipeline…</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />Run full pipeline</>
                  )}
                </Button>
              ) : (
                <Button onClick={runFullPipeline} disabled={generating} variant="outline" size="sm">
                  {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Refresh
                </Button>
              )}
              <div className="text-[10px] text-muted-foreground text-center">
                {allReady ? 'All capabilities ready' : 'Generates forecast + orders + freight'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline steps */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium">Pipeline status</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StepFlag done={steps.excelUploaded} label="Excel uploaded" icon={Package} onClick={() => setView('upload')} />
            <StepFlag done={steps.forecastGenerated} label="Forecast generated" icon={TrendingUp} onClick={() => setView('forecast')} />
            <StepFlag done={steps.ordersGenerated} label="Orders generated" icon={ShoppingCart} onClick={() => setView('orders')} />
            <StepFlag done={steps.freightAnalyzed} label="Freight analyzed" icon={Plane} onClick={() => setView('freight')} />
          </div>
        </CardContent>
      </Card>

      {/* KPI summary */}
      {allReady && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard icon={Package} label="SKUs to order" value={kpis.skuCount.toString()} sub={`${kpis.totalForecastQty.toLocaleString()} forecast units`} tint="text-blue-600 bg-blue-50" />
            <KPICard icon={ShoppingCart} label="Total order qty" value={kpis.totalOrderQty.toLocaleString()} sub="units to purchase" tint="text-purple-600 bg-purple-50" />
            <KPICard icon={DollarSign} label="Total landed cost" value={`৳${kpis.totalLandedCost.toLocaleString('en-IN')}`} sub={`margin ৳${kpis.totalMargin.toLocaleString('en-IN')}`} tint="text-emerald-600 bg-emerald-50" />
            <KPICard icon={AlertTriangle} label="Critical SKUs" value={kpis.criticalCount.toString()} sub={`${kpis.highCount} high urgency`} tint="text-red-600 bg-red-50" />
          </div>

          {/* Mode split + accuracy */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Shipping mode split</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Ship className="h-4 w-4 text-blue-500" />
                    <span className="text-lg font-bold tabular-nums">{kpis.seaCount}</span>
                    <span className="text-xs text-muted-foreground">sea</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-orange-500" />
                    <span className="text-lg font-bold tabular-nums">{kpis.airCount}</span>
                    <span className="text-xs text-muted-foreground">air</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Forecast accuracy</span>
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="text-lg font-bold tabular-nums">{kpis.avgMape}% <span className="text-xs font-normal text-muted-foreground">avg MAPE</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Session readiness</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                </div>
                <div className="text-lg font-bold text-green-600">Ready to pilot</div>
                <div className="text-[10px] text-muted-foreground">All 6 capabilities active</div>
              </CardContent>
            </Card>
          </div>

          {/* Critical SKUs */}
          {criticalSkus.length > 0 && (
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  Critical SKUs — order now
                </CardTitle>
                <CardDescription>
                  {criticalSkus.length} SKU{criticalSkus.length > 1 ? 's' : ''} with trigger dates ≤ 30 days. Place these POs immediately.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-red-100/50 text-xs text-red-800">
                      <tr>
                        <th className="text-left font-medium px-4 py-2">SKU</th>
                        <th className="text-left font-medium px-4 py-2">Product</th>
                        <th className="text-right font-medium px-4 py-2">Order Qty</th>
                        <th className="text-right font-medium px-4 py-2">Trigger Date</th>
                        <th className="text-center font-medium px-4 py-2">Mode</th>
                        <th className="text-right font-medium px-4 py-2">Landed/unit</th>
                        <th className="text-right font-medium px-4 py-2">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {criticalSkus.map((r) => (
                        <tr key={r.skuCode} className="hover:bg-red-100/30">
                          <td className="px-4 py-2 font-mono text-xs font-medium">{r.skuCode}</td>
                          <td className="px-4 py-2 max-w-xs truncate">{r.productName}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold">{r.recommendedQty.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-xs">{formatDate(r.orderTriggerDate)}</td>
                          <td className="px-4 py-2 text-center">
                            {r.recommendedMode === 'air' ? (
                              <Badge variant="outline" className="text-[10px] bg-orange-50"><Plane className="h-3 w-3 mr-1" />Air</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-blue-50"><Ship className="h-3 w-3 mr-1" />Sea</Badge>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-xs">৳{r.landedCostPerUnit.toFixed(0)}</td>
                          <td className={`px-4 py-2 text-right tabular-nums text-xs font-medium ${r.marginPct >= 30 ? 'text-green-600' : r.marginPct >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                            {r.marginPct.toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full per-SKU pilot table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per-SKU Session Plan — All 6 Capabilities</CardTitle>
              <CardDescription>
                {rows.length} SKUs · forecast + order qty + trigger date + freight mode + landed cost
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-4 py-2.5">SKU</th>
                      <th className="text-left font-medium px-4 py-2.5">Product</th>
                      <th className="text-right font-medium px-4 py-2.5 bg-blue-50/50" title="(b) Forecast">Forecast</th>
                      <th className="text-center font-medium px-4 py-2.5 bg-blue-50/50" title="MAPE">MAPE</th>
                      <th className="text-right font-medium px-4 py-2.5 bg-purple-50/50" title="(c) Order qty">Order Qty</th>
                      <th className="text-right font-medium px-4 py-2.5 bg-purple-50/50" title="Safety stock">Safety</th>
                      <th className="text-right font-medium px-4 py-2.5 bg-amber-50/50" title="(d) Trigger date">Trigger Date</th>
                      <th className="text-right font-medium px-4 py-2.5 bg-amber-50/50" title="Expected delivery">Delivery</th>
                      <th className="text-center font-medium px-4 py-2.5 bg-amber-50/50" title="Urgency">Urgency</th>
                      <th className="text-center font-medium px-4 py-2.5 bg-orange-50/50" title="(e) Freight mode">Mode</th>
                      <th className="text-right font-medium px-4 py-2.5 bg-emerald-50/50" title="(f) Landed cost">Landed/unit</th>
                      <th className="text-right font-medium px-4 py-2.5 bg-emerald-50/50" title="Margin %">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r) => (
                      <tr key={r.skuCode} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-mono text-xs font-medium">{r.skuCode}</td>
                        <td className="px-4 py-2.5 max-w-xs truncate">{r.productName}</td>
                        {/* (b) forecast */}
                        <td className="px-4 py-2.5 text-right tabular-nums bg-blue-50/30">
                          {r.forecastQty.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-center tabular-nums bg-blue-50/30">
                          <span className={`text-xs ${ACCURACY_COLORS[r.accuracyRating] || ''}`}>
                            {r.mape > 0 ? `${r.mape}%` : '—'}
                          </span>
                        </td>
                        {/* (c) order qty */}
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold bg-purple-50/30">
                          {r.recommendedQty.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-xs bg-purple-50/30">
                          {r.safetyStock.toLocaleString()}
                        </td>
                        {/* (d) trigger date */}
                        <td className="px-4 py-2.5 text-right tabular-nums text-xs bg-amber-50/30">
                          {formatDate(r.orderTriggerDate)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-xs bg-amber-50/30">
                          {formatDate(r.expectedDelivery)}
                        </td>
                        <td className="px-4 py-2.5 text-center bg-amber-50/30">
                          <Badge variant="outline" className={`text-[10px] ${URGENCY_COLORS[r.urgency] || ''}`}>
                            {r.urgency}
                          </Badge>
                        </td>
                        {/* (e) freight */}
                        <td className="px-4 py-2.5 text-center bg-orange-50/30">
                          {r.recommendedMode === 'air' ? (
                            <Plane className="h-3.5 w-3.5 text-orange-500 inline" />
                          ) : (
                            <Ship className="h-3.5 w-3.5 text-blue-500 inline" />
                          )}
                        </td>
                        {/* (f) line cost */}
                        <td className="px-4 py-2.5 text-right tabular-nums bg-emerald-50/30">
                          ৳{r.landedCostPerUnit.toFixed(0)}
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums font-medium bg-emerald-50/30 ${
                          r.marginPct >= 30 ? 'text-green-600' : r.marginPct >= 15 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {r.marginPct.toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardContent className="p-3 flex flex-wrap items-center gap-3 text-[11px]">
              <span className="font-medium">Capability color key:</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-100" /> (b) Forecast</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-100" /> (c) Order qty</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-100" /> (d) Order timing</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-100" /> (e) Freight</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-100" /> (f) Line cost</span>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KPICard({
  icon: Icon, label, value, sub, tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub: string; tint: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className={`flex h-8 w-8 items-center justify-center rounded-md ${tint}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function StepFlag({
  done, label, icon: Icon, onClick,
}: {
  done: boolean; label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors ${
        done ? 'border-green-200 bg-green-50/50' : 'border-muted bg-muted/20 hover:bg-muted/40'
      }`}
    >
      <div className={`flex h-7 w-7 items-center justify-center rounded-md ${
        done ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
      }`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{label}</div>
        <div className={`text-[10px] ${done ? 'text-green-600' : 'text-muted-foreground'}`}>
          {done ? 'Done' : 'Click to run'}
        </div>
      </div>
    </button>
  );
}
