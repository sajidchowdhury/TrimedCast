'use client';

// ============================================
// TrimedCast LEAN — Line Cost view (Phase 4)
// BD customs landed-cost breakdown per SKU: CIF + Customs Duty +
// Supplementary Duty + VAT (tax-on-tax) + AIT. Shows the landed
// cost per unit and margin for both sea and air modes side by side,
// with a donut chart of the cost components.
// ============================================

import { useEffect, useState, Fragment } from 'react';
import { useAppStore } from '@/stores/app-store';
import { usePagination } from '@/hooks/use-pagination';
import { Pagination } from '@/components/dashboard/pagination';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Calculator, ChevronRight, AlertCircle, PieChart, TrendingUp,
} from 'lucide-react';

// Re-use the Comparison type from the freight view (same API)
interface ModeBreakdown {
  mode: 'sea' | 'air';
  leadTimeDays: number;
  freightPerUnitBdt: number;
  landedCostPerUnit: number;
  totalLandedCostBdt: number;
  marginPerUnitBdt: number;
  marginPct: number;
  totalMarginBdt: number;
  landedCost: {
    cif: number;
    customsDuty: number;
    supplementaryDuty: number;
    vat: number;
    ait: number;
    totalDutyPerUnit: number;
    effectiveDutyRate: number;
    rate: { hsCode: string; description: string; customsDuty: number; supplementaryDuty: number; vat: number; ait: number };
  };
}

interface LineCostRow {
  id: string;
  skuCode: string;
  productName: string;
  orderQty: number;
  urgency: string;
  sea: ModeBreakdown;
  air: ModeBreakdown;
  costPremiumPerUnitBdt: number;
  costPremiumPct: number;
  recommendedMode: 'sea' | 'air';
  recommendationReason: string;
}

interface LineCostData {
  comparisons: LineCostRow[];
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

// Donut chart colors for cost components
const COST_COLORS = {
  unitCost: '#3b82f6',    // blue
  freight: '#f59e0b',     // amber
  insurance: '#10b981',   // emerald
  customsDuty: '#ef4444', // red
  supplementaryDuty: '#8b5cf6', // purple
  vat: '#ec4899',         // pink
  ait: '#6366f1',         // indigo
};

export function LineCostView() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const setView = useAppStore((s) => s.setView);
  const [data, setData] = useState<LineCostData | null>(null);
  const lineCostPagination = usePagination(data?.comparisons ?? [], 10);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const fRes = await fetch('/api/festivals');
        const fJson = await fRes.json();
        const upcoming = (fJson.festivals || []).filter((f: { isUpcoming: boolean }) => f.isUpcoming);
        if (upcoming.length === 0) {
          if (!cancelled) setData(null);
          return;
        }
        const res = await fetch(`/api/freight/analyze?festivalSessionId=${upcoming[0].id}`);
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
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || data.count === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">No line-cost analysis available</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-md">
            You need to upload Excel, generate forecasts, and generate order recommendations first.
          </p>
          <Button onClick={() => setView('upload')}>Start with Excel upload</Button>
        </CardContent>
      </Card>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Line Cost Analysis
          </CardTitle>
          <CardDescription>
            BD customs landed-cost breakdown: CIF + Customs Duty (25%) + Supplementary Duty +
            VAT (15% tax-on-tax) + AIT (5%). Per-SKU landed cost and margin for both sea and air.
            <span className="block mt-1 text-[11px]">HS 8512 — Electrical lighting/signalling equipment for vehicles</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Total sea landed cost" value={`৳${s.totalSeaCostBdt.toLocaleString('en-IN')}`} sub={`${s.seaRecommended} SKUs by sea`} />
            <SummaryCard label="Total air landed cost" value={`৳${s.totalAirCostBdt.toLocaleString('en-IN')}`} sub={`${s.airRecommended} SKUs by air`} />
            <SummaryCard label="Avg air premium" value={`+${s.avgCostPremiumPct}%`} sub="over sea landed cost" />
          </div>
        </CardContent>
      </Card>

      {/* Cost-component legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">Landed cost components (HS 8512)</span>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px]">
            <Legend color={COST_COLORS.unitCost} label="Unit cost (CIF base)" />
            <Legend color={COST_COLORS.freight} label="Freight (sea ৳5 / air ৳35)" />
            <Legend color={COST_COLORS.customsDuty} label="Customs Duty (25%)" />
            <Legend color={COST_COLORS.vat} label="VAT (15% on CIF+CD+SD)" />
            <Legend color={COST_COLORS.ait} label="AIT (5%)" />
          </div>
        </CardContent>
      </Card>

      {/* Per-SKU table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-SKU Landed Cost & Margin</CardTitle>
          <CardDescription>{data.count} SKUs · expand any row to see the full cost breakdown donut</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">SKU</th>
                  <th className="text-left font-medium px-4 py-2.5">Product</th>
                  <th className="text-right font-medium px-4 py-2.5">Sea Landed/unit</th>
                  <th className="text-right font-medium px-4 py-2.5">Air Landed/unit</th>
                  <th className="text-right font-medium px-4 py-2.5">Sea Margin</th>
                  <th className="text-right font-medium px-4 py-2.5">Air Margin</th>
                  <th className="text-right font-medium px-4 py-2.5">Duty Rate</th>
                  <th className="text-center font-medium px-4 py-2.5">Mode</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {lineCostPagination.paginatedItems.map((c) => {
                  const isOpen = expanded === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : c.id)}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs font-medium">{c.skuCode}</td>
                        <td className="px-4 py-2.5 max-w-xs truncate">{c.productName}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          ৳{c.sea.landedCostPerUnit.toFixed(0)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          ৳{c.air.landedCostPerUnit.toFixed(0)}
                          <span className="text-[10px] text-orange-600 block">+{c.costPremiumPct}%</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <span className={c.sea.marginPct >= 30 ? 'text-green-600' : c.sea.marginPct >= 15 ? 'text-amber-600' : 'text-red-600'}>
                            {c.sea.marginPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <span className={c.air.marginPct >= 30 ? 'text-green-600' : c.air.marginPct >= 15 ? 'text-amber-600' : 'text-red-600'}>
                            {c.air.marginPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                          {(c.sea.landedCost.effectiveDutyRate * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {c.recommendedMode}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-muted/20">
                          <td colSpan={9} className="px-4 py-4">
                            <LineCostDetail row={c} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={lineCostPagination} itemName="SKUs" />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function LineCostDetail({ row }: { row: LineCostRow }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Sea donut + breakdown */}
      <CostBreakdownCard mode="sea" data={row.sea} recommended={row.recommendedMode === 'sea'} />
      {/* Air donut + breakdown */}
      <CostBreakdownCard mode="air" data={row.air} recommended={row.recommendedMode === 'air'} />
    </div>
  );
}

function CostBreakdownCard({ mode, data, recommended }: { mode: 'sea' | 'air'; data: ModeBreakdown; recommended: boolean }) {
  const lc = data.landedCost;
  const cif = lc.cif;
  // Components for the donut (in BDT per unit)
  const components = [
    { label: 'Unit cost', value: 0, color: COST_COLORS.unitCost }, // unit cost = CIF - freight - insurance
    { label: 'Freight', value: data.freightPerUnitBdt, color: COST_COLORS.freight },
    { label: 'Customs Duty (25%)', value: lc.customsDuty, color: COST_COLORS.customsDuty },
    { label: 'VAT (15% on CIF+CD+SD)', value: lc.vat, color: COST_COLORS.vat },
    { label: 'AIT (5%)', value: lc.ait, color: COST_COLORS.ait },
  ];
  // Derive unit cost from CIF - freight - insurance (insurance ~ 1% of unit cost)
  const insurance = cif * 0.01 - data.freightPerUnitBdt; // not quite, recompute
  const unitCost = cif - data.freightPerUnitBdt - (lc.cif * 0.01);
  components[0].value = Math.max(0, unitCost);

  const total = components.reduce((s, c) => s + c.value, 0);

  // Donut chart SVG
  const size = 140;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = components.map((c) => {
    const pct = total > 0 ? c.value / total : 0;
    const dash = pct * circumference;
    const seg = { color: c.color, dash, gap: circumference - dash, offset };
    offset += dash;
    return { ...c, pct, ...seg };
  });

  return (
    <div className={`rounded-lg border p-4 ${recommended ? (mode === 'air' ? 'border-orange-300 bg-orange-50/30' : 'border-blue-300 bg-blue-50/30') : 'bg-background'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium uppercase">{mode} mode</span>
        {recommended && <Badge variant="outline" className="text-[9px]">Recommended</Badge>}
      </div>
      <div className="flex items-start gap-4">
        {/* Donut */}
        <svg width={size} height={size} className="shrink-0">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-muted" strokeWidth={stroke} />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={-seg.offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          ))}
          <text x={size / 2} y={size / 2 - 5} textAnchor="middle" className="fill-foreground text-[10px] font-medium">
            Landed
          </text>
          <text x={size / 2} y={size / 2 + 10} textAnchor="middle" className="fill-foreground text-sm font-bold">
            ৳{data.landedCostPerUnit.toFixed(0)}
          </text>
        </svg>
        {/* Breakdown list */}
        <div className="flex-1 space-y-1 text-xs">
          {components.map((c) => (
            <div key={c.label} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-muted-foreground truncate">{c.label}</span>
              </div>
              <span className="tabular-nums font-medium ml-2">৳{c.value.toFixed(1)}</span>
            </div>
          ))}
          <div className="border-t pt-1 mt-1 flex items-center justify-between">
            <span className="font-medium">Landed cost/unit</span>
            <span className="tabular-nums font-bold">৳{data.landedCostPerUnit.toFixed(0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Effective duty rate</span>
            <span className="tabular-nums">{(lc.effectiveDutyRate * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total ({data.landedCostPerUnit.toFixed(0)} × {0})</span>
            <span className="tabular-nums">৳{data.totalLandedCostBdt.toLocaleString('en-IN')}</span>
          </div>
          <div className="border-t pt-1 mt-1 flex items-center justify-between">
            <span className="flex items-center gap-1 font-medium"><TrendingUp className="h-3 w-3" />Margin/unit</span>
            <span className="tabular-nums font-medium">৳{data.marginPerUnitBdt.toFixed(0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Margin %</span>
            <span className={`tabular-nums font-bold ${data.marginPct >= 30 ? 'text-green-600' : data.marginPct >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
              {data.marginPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
