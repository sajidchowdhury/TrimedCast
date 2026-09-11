'use client';

// ============================================
// TrimedCast LEAN — Air vs Sea Freight view (Phase 4)
// Per-SKU comparison of sea (155d, ~৳5/unit) vs air (104d, ~৳35/unit)
// with the recommended shipping mode + the cost/lead-time trade-off.
// Expandable detail: full landed-cost breakdown for both modes.
// ============================================

import { useEffect, useState, Fragment } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDate } from '@/lib/sessions/festival-calendar';
import {
  Plane, Ship, TrendingDown, Clock, Calculator, ChevronRight, AlertCircle,
} from 'lucide-react';
import { ShippingConsiderations } from '@/components/views/shipping-considerations';

interface ModeBreakdown {
  mode: 'sea' | 'air';
  leadTimeDays: number;
  leadTimeBreakdown: { manufacturing: number; shipment: number; customs: number; internal: number };
  freightPerUnitBdt: number;
  landedCostPerUnit: number;
  totalLandedCostBdt: number;
  marginPerUnitBdt: number;
  marginPct: number;
  totalMarginBdt: number;
}

interface Comparison {
  id: string;
  skuCode: string;
  productName: string;
  orderQty: number;
  urgency: string;
  cnyStrategy: string;
  sea: ModeBreakdown;
  air: ModeBreakdown;
  leadTimeSavedByAir: number;
  costPremiumPerUnitBdt: number;
  costPremiumTotalBdt: number;
  costPremiumPct: number;
  recommendedMode: 'sea' | 'air';
  recommendationReason: string;
  daysUntilStockout: number;
  canAbsorbAirPremium: boolean;
  isUrgent: boolean;
}

interface FreightData {
  comparisons: Comparison[];
  count: number;
  summary: {
    seaRecommended: number;
    airRecommended: number;
    totalSeaCostBdt: number;
    totalAirCostBdt: number;
    savingBySeaBdt: number;
    avgCostPremiumPct: number;
  };
}

export function FreightView() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const setView = useAppStore((s) => s.setView);
  const [data, setData] = useState<FreightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Use the first upcoming festival session
        const fRes = await fetch('/api/festivals');
        const fJson = await fRes.json();
        const upcoming = (fJson.festivals || []).filter((f: { isUpcoming: boolean }) => f.isUpcoming);
        if (upcoming.length === 0) {
          if (!cancelled) setData(null);
          return;
        }
        const festivalId = upcoming[0].id;
        const res = await fetch(`/api/freight/analyze?festivalSessionId=${festivalId}`);
        if (!res.ok) {
          if (!cancelled) setData(null);
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dataVersion]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || data.count === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">No freight analysis available</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-md">
            You need to upload Excel (Phase 1), generate forecasts (Phase 2), and generate
            order recommendations (Phase 3) before the freight analysis can run.
          </p>
          <Button onClick={() => setView('upload')}>Start with Excel upload</Button>
        </CardContent>
      </Card>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            Air vs Sea Freight Decision
          </CardTitle>
          <CardDescription>
            Side-by-side comparison of the 8× cost premium vs the 51-day lead-time saving,
            with a per-SKU recommended shipping mode based on urgency, margin, and CNY strategy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <SummaryCard
              icon={Ship}
              label="Sea recommended"
              value={s.seaRecommended.toString()}
              sub="SKUs"
              tint="text-blue-600 bg-blue-50"
            />
            <SummaryCard
              icon={Plane}
              label="Air recommended"
              value={s.airRecommended.toString()}
              sub="SKUs"
              tint="text-orange-600 bg-orange-50"
            />
            <SummaryCard
              icon={Clock}
              label="Lead-time saved by air"
              value="51 days"
              sub="air vs sea"
              tint="text-emerald-600 bg-emerald-50"
            />
            <SummaryCard
              icon={TrendingDown}
              label="Saving if all sea"
              value={`৳${s.savingBySeaBdt.toLocaleString('en-IN')}`}
              sub="BDT vs all air"
              tint="text-green-600 bg-green-50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-SKU Freight Comparison</CardTitle>
          <CardDescription>
            {data.count} SKUs · avg air premium {s.avgCostPremiumPct}% over sea landed cost
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">SKU</th>
                  <th className="text-left font-medium px-4 py-2.5">Product</th>
                  <th className="text-right font-medium px-4 py-2.5">Order Qty</th>
                  <th className="text-right font-medium px-4 py-2.5">Sea Lead</th>
                  <th className="text-right font-medium px-4 py-2.5">Air Lead</th>
                  <th className="text-right font-medium px-4 py-2.5">Sea Cost/unit</th>
                  <th className="text-right font-medium px-4 py-2.5">Air Cost/unit</th>
                  <th className="text-right font-medium px-4 py-2.5">Premium</th>
                  <th className="text-center font-medium px-4 py-2.5">Recommended</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.comparisons.map((c) => {
                  const isOpen = expanded === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : c.id)}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs font-medium">{c.skuCode}</td>
                        <td className="px-4 py-2.5 max-w-xs truncate">{c.productName}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{c.orderQty.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                          {c.sea.leadTimeDays}d
                          <span className="text-[10px] text-muted-foreground block">{c.sea.marginPct.toFixed(0)}% margin</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                          {c.air.leadTimeDays}d
                          <span className="text-[10px] text-muted-foreground block">{c.air.marginPct.toFixed(0)}% margin</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                          ৳{c.sea.landedCostPerUnit.toFixed(0)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                          ৳{c.air.landedCostPerUnit.toFixed(0)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                          +{c.costPremiumPct}%
                          <span className="text-[10px] text-muted-foreground block">
                            ৳{c.costPremiumTotalBdt.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {c.recommendedMode === 'air' ? (
                            <Badge variant="default" className="bg-orange-500 text-[10px]">
                              <Plane className="h-3 w-3 mr-1" />Air
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-blue-500 text-[10px]">
                              <Ship className="h-3 w-3 mr-1" />Sea
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-muted/20">
                          <td colSpan={10} className="px-4 py-4">
                            <FreightDetail c={c} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Shipping considerations — lead-time logic + holiday calendar + recommendations */}
      <ShippingConsiderations />
    </div>
  );
}

function SummaryCard({
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
        <div className="mt-2 text-lg font-bold tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function FreightDetail({ c }: { c: Comparison }) {
  return (
    <div className="space-y-4">
      {/* Recommendation reason */}
      <div className={`rounded-lg border p-3 text-sm ${
        c.recommendedMode === 'air' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-start gap-2">
          {c.recommendedMode === 'air' ? <Plane className="h-4 w-4 text-orange-600 mt-0.5" /> : <Ship className="h-4 w-4 text-blue-600 mt-0.5" />}
          <div>
            <span className="font-medium">Recommendation: {c.recommendedMode.toUpperCase()}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{c.recommendationReason}</p>
          </div>
        </div>
      </div>

      {/* Trade-off metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Lead-time saved (air)" value={`${c.leadTimeSavedByAir} days`} sub="air is faster" />
        <Metric label="Cost premium (air)" value={`+৳${c.costPremiumPerUnitBdt.toFixed(0)}/unit`} sub={`${c.costPremiumPct}% over sea`} />
        <Metric label="Total premium (air)" value={`৳${c.costPremiumTotalBdt.toLocaleString('en-IN')}`} sub={`for ${c.orderQty} units`} />
        <Metric
          label="Can absorb air?"
          value={c.canAbsorbAirPremium ? 'Yes (margin ≥30%)' : 'No (margin <30%)'}
          sub={c.isUrgent ? `Urgent: stockout ${c.daysUntilStockout}d` : `Not urgent: ${c.daysUntilStockout}d`}
        />
      </div>

      {/* Side-by-side mode breakdown */}
      <div className="grid sm:grid-cols-2 gap-3">
        <ModeCard mode="sea" data={c.sea} recommended={c.recommendedMode === 'sea'} />
        <ModeCard mode="air" data={c.air} recommended={c.recommendedMode === 'air'} />
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border bg-background px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ModeCard({ mode, data, recommended }: { mode: 'sea' | 'air'; data: ModeBreakdown; recommended: boolean }) {
  const isAir = mode === 'air';
  const Icon = isAir ? Plane : Ship;
  return (
    <div className={`rounded-lg border p-3 ${recommended ? (isAir ? 'border-orange-300 bg-orange-50/50' : 'border-blue-300 bg-blue-50/50') : 'bg-background'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${isAir ? 'text-orange-500' : 'text-blue-500'}`} />
          <span className="text-sm font-medium uppercase">{mode}</span>
        </div>
        {recommended && <Badge variant="outline" className="text-[9px] bg-background">Recommended</Badge>}
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Lead time</span><span className="tabular-nums">{data.leadTimeDays} days</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Mfg / Ship / Customs</span><span className="tabular-nums">{data.leadTimeBreakdown.manufacturing} / {data.leadTimeBreakdown.shipment} / {data.leadTimeBreakdown.customs}d</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Freight/unit</span><span className="tabular-nums">৳{data.freightPerUnitBdt}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Landed cost/unit</span><span className="tabular-nums font-medium">৳{data.landedCostPerUnit.toFixed(0)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total landed cost</span><span className="tabular-nums">৳{data.totalLandedCostBdt.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between border-t pt-1 mt-1"><span className="text-muted-foreground">Margin/unit</span><span className="tabular-nums">৳{data.marginPerUnitBdt.toFixed(0)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Margin %</span><span className="tabular-nums font-medium">{data.marginPct.toFixed(1)}%</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total margin</span><span className="tabular-nums">৳{data.totalMarginBdt.toLocaleString('en-IN')}</span></div>
      </div>
    </div>
  );
}
