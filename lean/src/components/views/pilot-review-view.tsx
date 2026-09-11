'use client';

// ============================================
// TrimedCast LEAN — Pilot Review & Handoff (Phase 6)
// The final phase: pilot results summary, accuracy analysis, deferred-
// scope reactivation panel, and the client quick-reference guide.
// ============================================

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { formatDate } from '@/lib/sessions/festival-calendar';
import {
  CheckCircle2, AlertCircle, Target, TrendingUp, Clock, Plane, Ship,
  ClipboardList, Rocket, BookOpen, ArrowRight, RefreshCw, CalendarClock,
} from 'lucide-react';

interface PilotSummary {
  skuCount: number;
  forecastCount: number;
  orderCount: number;
  fulfillmentRate: number;
  criticalCount: number;
  highCount: number;
  cnyAffected: number;
  totalOrderQty: number;
  avgMape: number;
  mapeCount: number;
  accuracyBuckets: { excellent: number; good: number; fair: number; poor: number; unusable: number };
}

interface AccuracyIssue {
  skuCode: string;
  productName: string;
  mape: number;
  rating: string;
}

interface NextStep {
  priority: 'high' | 'medium' | 'low';
  action: string;
  reason: string;
}

interface DeferredItem {
  capability: string;
  phase: string;
  trigger: string;
  priority: string;
  reason: string;
}

interface PilotReviewData {
  session: { id: string; name: string; peakDate: string } | null;
  pilotSummary: PilotSummary;
  accuracyIssues: AccuracyIssue[];
  nextSteps: NextStep[];
  deferredScope: DeferredItem[];
  importHistory: { id: string; fileName: string; status: string; rowCount: number; skuCount: number; createdAt: string }[];
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
};

const ACCURACY_COLORS: Record<string, string> = {
  excellent: 'bg-emerald-500',
  good: 'bg-green-500',
  fair: 'bg-amber-500',
  poor: 'bg-orange-500',
  unusable: 'bg-red-500',
};

export function PilotReviewView() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const setView = useAppStore((s) => s.setView);
  const [data, setData] = useState<PilotReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/pilot-review');
        if (!res.ok) { if (!cancelled) setData(null); return; }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [dataVersion]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">No pilot data</p>
          <Button size="sm" className="mt-3" onClick={() => setView('dashboard')}>Go to dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  const { pilotSummary: s, accuracyIssues, nextSteps, deferredScope, session } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Pilot Review & Handoff</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {session ? (
                  <>Pilot session: <span className="font-medium">{session.name}</span> · peak {formatDate(session.peakDate)}</>
                ) : (
                  'No pilot session found.'
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pilot results summary */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Pilot Results Summary
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ResultCard icon={Target} label="SKUs piloted" value={s.skuCount.toString()} sub={`${s.forecastCount} forecast / ${s.orderCount} orders`} tint="text-blue-600 bg-blue-50" />
          <ResultCard icon={CheckCircle2} label="Fulfillment rate" value={`${s.fulfillmentRate}%`} sub="SKUs with recommendations" tint="text-emerald-600 bg-emerald-50" />
          <ResultCard icon={TrendingUp} label="Avg forecast MAPE" value={`${s.avgMape}%`} sub={`${s.mapeCount} SKUs with metrics`} tint={s.avgMape < 15 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'} />
          <ResultCard icon={AlertCircle} label="Critical SKUs" value={s.criticalCount.toString()} sub={`${s.highCount} high · ${s.cnyAffected} CNY-affected`} tint="text-red-600 bg-red-50" />
        </div>
      </div>

      {/* Accuracy distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Forecast Accuracy Distribution
          </CardTitle>
          <CardDescription>MAPE 5-tier rating across {s.mapeCount} SKUs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {(['excellent', 'good', 'fair', 'poor', 'unusable'] as const).map((rating) => {
              const count = s.accuracyBuckets[rating];
              const pct = s.mapeCount > 0 ? Math.round((count / s.mapeCount) * 100) : 0;
              const threshold = { excellent: '< 5%', good: '< 10%', fair: '< 20%', poor: '< 50%', unusable: '> 50%' }[rating];
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-32">
                    <span className={`h-2.5 w-2.5 rounded-sm ${ACCURACY_COLORS[rating]}`} />
                    <span className="text-xs font-medium capitalize">{rating}</span>
                    <span className="text-[10px] text-muted-foreground">({threshold})</span>
                  </div>
                  <div className="flex-1">
                    <Progress value={pct} className="h-2" />
                  </div>
                  <div className="w-16 text-right text-xs tabular-nums">
                    {count} <span className="text-muted-foreground">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Accuracy issues */}
      {accuracyIssues.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-4 w-4" />
              Accuracy Issues — Investigate
            </CardTitle>
            <CardDescription>SKUs with MAPE &gt; 15% (poor or unusable rating)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-amber-50/50 text-xs text-amber-800">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">SKU</th>
                    <th className="text-left font-medium px-4 py-2">Product</th>
                    <th className="text-right font-medium px-4 py-2">MAPE</th>
                    <th className="text-center font-medium px-4 py-2">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {accuracyIssues.map((issue) => (
                    <tr key={issue.skuCode} className="hover:bg-amber-50/30">
                      <td className="px-4 py-2 font-mono text-xs font-medium">{issue.skuCode}</td>
                      <td className="px-4 py-2 max-w-xs truncate">{issue.productName}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{issue.mape}%</td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant="outline" className="text-[10px] capitalize">{issue.rating}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Recommended Next Steps
          </CardTitle>
          <CardDescription>Based on the pilot results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {nextSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <Badge variant="outline" className={`text-[10px] shrink-0 ${PRIORITY_COLORS[step.priority]}`}>
                {step.priority}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{step.action}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{step.reason}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Deferred scope reactivation panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Deferred Scope — Reactivation Triggers
          </CardTitle>
          <CardDescription>
            14 capabilities deferred per the lean scope. Each has a trigger that should reactivate it. Nothing is deleted — all remain in the original TrimedCast codebase, ready to switch on.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Capability</th>
                  <th className="text-left font-medium px-4 py-2.5">Phase</th>
                  <th className="text-left font-medium px-4 py-2.5">Why deferred</th>
                  <th className="text-left font-medium px-4 py-2.5">Reactivation trigger</th>
                  <th className="text-center font-medium px-4 py-2.5">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {deferredScope.map((item) => (
                  <tr key={item.capability} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{item.capability}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.phase}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs">{item.reason}</td>
                    <td className="px-4 py-2.5 text-xs">{item.trigger}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[item.priority] || ''}`}>
                        {item.priority}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Client Handoff / Quick Reference Guide */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Client Handoff — Quick Reference Guide
          </CardTitle>
          <CardDescription>One-page summary for the operations team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* The 6 capabilities */}
          <div>
            <h4 className="text-xs font-semibold mb-2 uppercase text-muted-foreground">The 6 capabilities (what the system does)</h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { n: 'a', label: 'Upload Excel', desc: 'Wide format (Pic No, Item, Jan–Dec) → clean SKU-month time series' },
                { n: 'b', label: 'Forecast', desc: 'Prophet-inspired engine with festival demand effects (Eid −30%, Puja +10%)' },
                { n: 'c', label: 'Order Quantity', desc: 'EOQ + safety stock with MOQ + warehouse capacity constraints' },
                { n: 'd', label: 'Order Timing', desc: '9-step trigger date + 4 CNY strategies (before/after/partial/air)' },
                { n: 'e', label: 'Air vs Sea', desc: '8× cost premium vs 51-day lead-time saving, per-SKU recommendation' },
                { n: 'f', label: 'Line Cost', desc: 'BD customs: 25% Duty + 15% VAT-on-tax + 5% AIT (HS 8512)' },
              ].map((c) => (
                <div key={c.n} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] font-mono">({c.n})</Badge>
                    <span className="text-sm font-medium">{c.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly workflow */}
          <div>
            <h4 className="text-xs font-semibold mb-2 uppercase text-muted-foreground">Monthly workflow (what to do each month)</h4>
            <ol className="space-y-2 text-sm">
              {[
                { step: '1', action: 'Upload new monthly sales data', detail: 'Dashboard → Upload Excel → select the updated workbook' },
                { step: '2', action: 'Run the full pipeline for the next session', detail: 'Dashboard → "Run full pipeline" button (generates forecast + orders + freight)' },
                { step: '3', action: 'Review the Critical SKUs alert', detail: 'Place the critical purchase orders immediately (red, ≤30 days to stockout)' },
                { step: '4', action: 'Confirm shipping mode per SKU', detail: 'Review the Air vs Sea recommendation — override if business judgment differs' },
                { step: '5', action: 'Place POs with suppliers', detail: 'Use the order-trigger date and recommended quantity from the per-SKU table' },
                { step: '6', action: 'Track delivery', detail: 'Compare actual arrival dates to the expected-delivery date; note discrepancies for next month' },
              ].map((s) => (
                <li key={s.step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {s.step}
                  </span>
                  <div>
                    <span className="text-sm font-medium">{s.action}</span>
                    <span className="text-xs text-muted-foreground block">{s.detail}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Key dates */}
          <div>
            <h4 className="text-xs font-semibold mb-2 uppercase text-muted-foreground">Key festival dates (2026–2027)</h4>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              {[
                { name: 'Durga Puja 2026', date: '20 Oct 2026', effect: '+10% lift' },
                { name: 'Winter 2026-27', date: '15 Dec 2026', effect: '+40% (peak riding)' },
                { name: 'CNY 2027 (supply)', date: '20 Jan – 20 Feb 2027', effect: '−15% supply disruption' },
                { name: 'Eid-ul-Fitr 2027', date: '09 Mar 2027', effect: '−30% demand' },
                { name: 'Eid-ul-Adha 2027', date: '16 May 2027', effect: '−25% demand' },
                { name: 'Summer 2027', date: '15 Jun 2027', effect: 'baseline' },
              ].map((f) => (
                <div key={f.name} className="flex items-center justify-between rounded border bg-background px-3 py-1.5">
                  <div>
                    <span className="font-medium">{f.name}</span>
                    <span className="text-muted-foreground ml-2">{f.date}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{f.effect}</Badge>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Eid dates are computed via the Hijri calendar (hijri-converter). Verify against the BD Government Gazette annually and re-seed via <code className="bg-muted px-1 rounded">/api/festivals?reseed=true</code> if they differ.
            </p>
          </div>

          {/* Maintenance */}
          <div>
            <h4 className="text-xs font-semibold mb-2 uppercase text-muted-foreground">Maintenance routine</h4>
            <div className="grid sm:grid-cols-3 gap-2 text-xs">
              <MaintenanceItem icon={RefreshCw} label="Monthly" detail="Upload new sales data + run the pipeline for the next session" />
              <MaintenanceItem icon={CalendarClock} label="Annually" detail="Verify Eid dates against the BD Gazette + re-seed the festival calendar" />
              <MaintenanceItem icon={ClipboardList} label="Quarterly" detail="Review deferred-scope priorities + schedule a check-in" />
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setView('dashboard')}>
              <Rocket className="h-3.5 w-3.5 mr-2" /> Open the pilot dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => setView('upload')}>
              <RefreshCw className="h-3.5 w-3.5 mr-2" /> Upload new monthly data
            </Button>
            <Button variant="outline" size="sm" onClick={() => setView('forecast')}>
              <TrendingUp className="h-3.5 w-3.5 mr-2" /> View forecasts
            </Button>
            <Button variant="outline" size="sm" onClick={() => setView('orders')}>
              <ClipboardList className="h-3.5 w-3.5 mr-2" /> View order recommendations
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Project completion banner */}
      <Card className="border-green-300 bg-green-50/30">
        <CardContent className="p-5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mx-auto mb-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-green-800">Lean Build Complete</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
            All 6 client capabilities are live, verified end-to-end, and composed into a single actionable dashboard.
            The system is ready for the client's first festival pilot.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            {['Excel Upload', 'Session Forecast', 'Order Quantity', 'Order Timing', 'Air vs Sea', 'Line Cost'].map((c) => (
              <Badge key={c} variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" /> {c}
              </Badge>
            ))}
          </div>
          <Button className="mt-4" onClick={() => setView('dashboard')}>
            Open the pilot dashboard <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultCard({
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

function MaintenanceItem({ icon: Icon, label, detail }: { icon: React.ComponentType<{ className?: string }>; label: string; detail: string }) {
  return (
    <div className="rounded border bg-background p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}
