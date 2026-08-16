'use client';

// ============================================
// TrimedCast Sea vs Air Comparison Tool
// Side-by-side comparison of Sea vs Air shipment modes
// with timeline visualization, metrics table, and recommendation
// ============================================

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Ship,
  Plane,
  Factory,
  FileCheck,
  Warehouse,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Minus,
  Clock,
  DollarSign,
  Shield,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceArea,
} from 'recharts';
import {
  compareSeaVsAir,
  LEAD_TIME_CONFIG,
  FREIGHT_COST,
  CNY_WINDOW,
  type ScenarioBaseState,
  type SeaVsAirComparison as SeaVsAirCompType,
} from '@/lib/forecasting/scenario-engine';
import { useForecastStore } from '@/lib/forecasting/store';
import { getBDSeason } from '@/lib/forecasting/models';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface LeadTimeBreakdown {
  manufacturing: number;
  shipping: number;
  customs: number;
  internal: number;
  total: number;
  stdDev: number;
}

interface ModeMetrics {
  label: string;
  leadTime: LeadTimeBreakdown;
  freightCostPerUnit: number;
  safetyStock: number;
  reorderPoint: number;
  holdingCostPerMonth: number;
  totalOrderCost: number;
  cnyRisk: boolean;
}

// ============================================
// Demo base state
// ============================================

const DEMO_BASE_STATE: ScenarioBaseState = {
  avgMonthlyDemand: 250,
  demandStdDev: 50,
  leadTimeMode: 'sea',
  avgLeadTimeDays: 90,
  leadTimeStdDev: 15,
  serviceLevel: 0.95,
  unitPrice: 850,
  unitCost: 520,
  promoIndex: 0.2,
  orderQuantity: 300,
  orderingCost: 5000,
  holdingCostPct: 0.20,
  annualDemand: 3000,
};

// ============================================
// Helper: Check if current date falls in CNY window
// ============================================

function isCurrentlyInCNYWindow(): boolean {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (month === CNY_WINDOW.startMonth && day >= CNY_WINDOW.startDay) return true;
  if (month === CNY_WINDOW.endMonth && day <= CNY_WINDOW.endDay) return true;
  if (month > CNY_WINDOW.startMonth && month < CNY_WINDOW.endMonth) return true;
  return false;
}

// ============================================
// Helper: Format BDT
// ============================================

function formatBDT(value: number): string {
  return `BDT ${Math.round(value).toLocaleString()}`;
}

function formatDelta(value: number, asBDT = false): string {
  const prefix = value > 0 ? '+' : '';
  if (asBDT) return `${prefix}${formatBDT(value)}`;
  return `${prefix}${Math.round(value).toLocaleString()}`;
}

function formatDeltaPercent(value: number): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

// ============================================
// Sub-component: Mode Comparison Card
// ============================================

function ModeCard({ metrics, accentColor, icon }: {
  metrics: ModeMetrics;
  accentColor: 'teal' | 'amber';
  icon: React.ReactNode;
}) {
  const colorClasses = accentColor === 'teal'
    ? {
        border: 'border-teal-200 dark:border-teal-800',
        bg: 'bg-teal-50 dark:bg-teal-950/30',
        badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
        accent: 'text-teal-600 dark:text-teal-400',
        accentBg: 'bg-teal-500',
      }
    : {
        border: 'border-amber-200 dark:border-amber-800',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
        accent: 'text-amber-600 dark:text-amber-400',
        accentBg: 'bg-amber-500',
      };

  const breakdown = metrics.leadTime;

  return (
    <Card className={cn('relative overflow-hidden', colorClasses.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {metrics.label} Shipment
          </CardTitle>
          {metrics.cnyRisk && (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertTriangle className="h-3 w-3" />
              CNY Risk
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Lead time: {breakdown.total} days | Std Dev: {breakdown.stdDev} days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Lead time breakdown bar */}
        <div className="space-y-1.5">
          <div className="flex h-7 rounded-lg overflow-hidden bg-muted">
            <div
              className="bg-slate-500 flex items-center justify-center text-white text-[10px] font-medium"
              style={{ width: `${(breakdown.manufacturing / breakdown.total) * 100}%` }}
              title={`Mfg: ${breakdown.manufacturing}d`}
            >
              {breakdown.manufacturing}d
            </div>
            <div
              className={cn('flex items-center justify-center text-white text-[10px] font-medium', colorClasses.accentBg)}
              style={{ width: `${(breakdown.shipping / breakdown.total) * 100}%` }}
              title={`Ship: ${breakdown.shipping}d`}
            >
              {breakdown.shipping}d
            </div>
            <div
              className="bg-orange-400 flex items-center justify-center text-white text-[10px] font-medium"
              style={{ width: `${(breakdown.customs / breakdown.total) * 100}%` }}
              title={`Customs: ${breakdown.customs}d`}
            >
              {breakdown.customs}d
            </div>
            <div
              className="bg-emerald-500 flex items-center justify-center text-white text-[10px] font-medium"
              style={{ width: `${(breakdown.internal / breakdown.total) * 100}%` }}
              title={`Internal: ${breakdown.internal}d`}
            >
              {breakdown.internal}d
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><Factory className="h-2.5 w-2.5" /> Mfg</span>
            <span className="flex items-center gap-0.5"><Ship className="h-2.5 w-2.5" /> Ship</span>
            <span className="flex items-center gap-0.5"><FileCheck className="h-2.5 w-2.5" /> Customs</span>
            <span className="flex items-center gap-0.5"><Warehouse className="h-2.5 w-2.5" /> Internal</span>
          </div>
        </div>

        <Separator />

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-2">
          <MetricItem
            label="Safety Stock"
            value={`${metrics.safetyStock} units`}
            icon={<Shield className="h-3.5 w-3.5" />}
          />
          <MetricItem
            label="Reorder Point"
            value={`${metrics.reorderPoint} units`}
            icon={<ArrowRight className="h-3.5 w-3.5" />}
          />
          <MetricItem
            label="Holding Cost/mo"
            value={formatBDT(metrics.holdingCostPerMonth)}
            icon={<DollarSign className="h-3.5 w-3.5" />}
          />
          <MetricItem
            label="Freight Cost/unit"
            value={formatBDT(metrics.freightCostPerUnit)}
            icon={<Clock className="h-3.5 w-3.5" />}
          />
        </div>

        {/* Total order cost */}
        <div className={cn('rounded-lg p-2.5 text-center', colorClasses.bg)}>
          <p className="text-[10px] text-muted-foreground mb-0.5">Total Order Cost (Recommended Qty)</p>
          <p className={cn('text-lg font-bold', colorClasses.accent)}>
            {formatBDT(metrics.totalOrderCost)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

// ============================================
// Sub-component: Comparison Metrics Table
// ============================================

function ComparisonTable({ sea, air }: { sea: ModeMetrics; air: ModeMetrics }) {
  const rows = [
    {
      metric: 'Lead Time',
      unit: 'days',
      sea: sea.leadTime.total,
      air: air.leadTime.total,
      lowerIsBetter: true,
    },
    {
      metric: 'Safety Stock',
      unit: 'units',
      sea: sea.safetyStock,
      air: air.safetyStock,
      lowerIsBetter: true,
    },
    {
      metric: 'Reorder Point',
      unit: 'units',
      sea: sea.reorderPoint,
      air: air.reorderPoint,
      lowerIsBetter: true,
    },
    {
      metric: 'Holding Cost/mo',
      unit: 'BDT',
      sea: sea.holdingCostPerMonth,
      air: air.holdingCostPerMonth,
      lowerIsBetter: true,
    },
    {
      metric: 'Freight Cost/unit',
      unit: 'BDT',
      sea: sea.freightCostPerUnit,
      air: air.freightCostPerUnit,
      lowerIsBetter: true,
    },
    {
      metric: 'Total Order Cost',
      unit: 'BDT',
      sea: sea.totalOrderCost,
      air: air.totalOrderCost,
      lowerIsBetter: true,
    },
    {
      metric: 'CNY Risk',
      unit: '',
      sea: sea.cnyRisk ? 1 : 0,
      air: air.cnyRisk ? 1 : 0,
      lowerIsBetter: true,
      isBoolean: true,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Minus className="h-4 w-4" />
          Comparison Metrics
        </CardTitle>
        <CardDescription className="text-xs">
          Green = improvement, Red = degradation when switching Sea to Air
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Metric</TableHead>
              <TableHead className="text-right">Sea</TableHead>
              <TableHead className="text-right">Air</TableHead>
              <TableHead className="text-right">Delta</TableHead>
              <TableHead className="text-right">Delta %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const delta = row.air - row.sea;
              const deltaPct = row.sea !== 0 ? (delta / Math.abs(row.sea)) * 100 : 0;
              const isImprovement = row.lowerIsBetter ? delta < 0 : delta > 0;
              const isDegradation = row.lowerIsBetter ? delta > 0 : delta < 0;

              if (row.isBoolean) {
                return (
                  <TableRow key={row.metric}>
                    <TableCell className="font-medium">{row.metric}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.sea === 1 ? 'destructive' : 'secondary'} className="text-[10px]">
                        {row.sea === 1 ? 'At Risk' : 'Clear'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.air === 1 ? 'destructive' : 'secondary'} className="text-[10px]">
                        {row.air === 1 ? 'At Risk' : 'Clear'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">-</TableCell>
                  </TableRow>
                );
              }

              return (
                <TableRow key={row.metric}>
                  <TableCell className="font-medium">
                    {row.metric}
                    {row.unit && <span className="text-muted-foreground text-[10px] ml-1">({row.unit})</span>}
                  </TableCell>
                  <TableCell className="text-right">{Math.round(row.sea).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{Math.round(row.air).toLocaleString()}</TableCell>
                  <TableCell className={cn(
                    'text-right font-medium',
                    isImprovement && 'text-emerald-600 dark:text-emerald-400',
                    isDegradation && 'text-red-600 dark:text-red-400',
                  )}>
                    {formatDelta(delta)}
                  </TableCell>
                  <TableCell className={cn(
                    'text-right font-medium',
                    isImprovement && 'text-emerald-600 dark:text-emerald-400',
                    isDegradation && 'text-red-600 dark:text-red-400',
                  )}>
                    {formatDeltaPercent(deltaPct)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================
// Sub-component: Timeline Visualization (Gantt-like)
// ============================================

function TimelineViz({ seaLT, airLT, showCNYZone }: {
  seaLT: LeadTimeBreakdown;
  airLT: LeadTimeBreakdown;
  showCNYZone: boolean;
}) {
  const maxDays = seaLT.total + 10; // Sea is always longer
  const cnyStart = 20; // Approximate CNY start day in timeline
  const cnyEnd = 50;

  const seaPhases = [
    { name: 'Mfg', days: seaLT.manufacturing, color: '#64748b' },
    { name: 'Ship', days: seaLT.shipping, color: '#14b8a6' },
    { name: 'Customs', days: seaLT.customs, color: '#f97316' },
    { name: 'Internal', days: seaLT.internal, color: '#10b981' },
  ];

  const airPhases = [
    { name: 'Mfg', days: airLT.manufacturing, color: '#64748b' },
    { name: 'Ship', days: airLT.shipping, color: '#f59e0b' },
    { name: 'Customs', days: airLT.customs, color: '#f97316' },
    { name: 'Internal', days: airLT.internal, color: '#10b981' },
  ];

  // Build recharts data - each bar represents a phase, positioned by offset
  interface TimelineBarData {
    name: string;
    offset: number;
    width: number;
    fill: string;
    mode: string;
  }

  const buildBarData = (phases: { name: string; days: number; color: string }[], mode: string): TimelineBarData[] => {
    const data: TimelineBarData[] = [];
    let offset = 0;
    for (const phase of phases) {
      data.push({
        name: `${phase.name} (${phase.days}d)`,
        offset,
        width: phase.days,
        fill: phase.color,
        mode,
      });
      offset += phase.days;
    }
    return data;
  };

  const seaData = buildBarData(seaPhases, 'Sea');
  const airData = buildBarData(airPhases, 'Air');

  // For recharts: create a flat dataset where each entry is a phase segment
  const chartData = seaPhases.map((phase, i) => ({
    phase: phase.name,
    seaDays: phase.days,
    airDays: airPhases[i].days,
    seaColor: phase.color,
    airColor: airPhases[i].color,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Timeline Comparison
        </CardTitle>
        <CardDescription className="text-xs">
          Gantt-style view showing lead time phases for both modes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sea timeline */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Ship className="h-3.5 w-3.5 text-teal-500" />
            <span className="text-xs font-medium">Sea Freight</span>
            <Badge variant="secondary" className="text-[10px]">{seaLT.total} days total</Badge>
          </div>
          <div className="relative h-8 rounded-md overflow-hidden bg-muted">
            {seaData.map((segment, i) => (
              <div
                key={i}
                className="absolute top-0 h-full flex items-center justify-center text-white text-[10px] font-medium"
                style={{
                  left: `${(segment.offset / maxDays) * 100}%`,
                  width: `${(segment.width / maxDays) * 100}%`,
                  backgroundColor: segment.fill,
                }}
                title={segment.name}
              >
                {segment.width >= 10 && segment.name}
              </div>
            ))}
            {showCNYZone && (
              <div
                className="absolute top-0 h-full bg-red-500/20 border-l border-r border-red-400"
                style={{
                  left: `${(cnyStart / maxDays) * 100}%`,
                  width: `${((cnyEnd - cnyStart) / maxDays) * 100}%`,
                }}
              />
            )}
          </div>
        </div>

        {/* Air timeline */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Plane className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium">Air Freight</span>
            <Badge variant="secondary" className="text-[10px]">{airLT.total} days total</Badge>
          </div>
          <div className="relative h-8 rounded-md overflow-hidden bg-muted">
            {airData.map((segment, i) => (
              <div
                key={i}
                className="absolute top-0 h-full flex items-center justify-center text-white text-[10px] font-medium"
                style={{
                  left: `${(segment.offset / maxDays) * 100}%`,
                  width: `${(segment.width / maxDays) * 100}%`,
                  backgroundColor: segment.fill,
                }}
                title={segment.name}
              >
                {segment.width >= 5 && segment.name}
              </div>
            ))}
          </div>
        </div>

        {/* Day scale */}
        <div className="flex justify-between text-[10px] text-muted-foreground px-0">
          {Array.from({ length: Math.ceil(maxDays / 15) + 1 }, (_, i) => i * 15).map((day) => (
            <span key={day}>{day}d</span>
          ))}
        </div>

        {/* Phase breakdown bar chart */}
        <div className="mt-2">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              barCategoryGap="20%"
            >
              <XAxis
                dataKey="phase"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Days', angle: -90, position: 'insideLeft', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
                formatter={(value: number, name: string) => [`${value} days`, name]}
              />
              {showCNYZone && (
                <ReferenceArea
                  x1="Ship"
                  stroke="rgba(239, 68, 68, 0.2)"
                  fill="rgba(239, 68, 68, 0.1)"
                />
              )}
              <Bar dataKey="seaDays" name="Sea" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`sea-${index}`} fill={entry.seaColor} />
                ))}
              </Bar>
              <Bar dataKey="airDays" name="Air" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`air-${index}`} fill={entry.airColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* CNY zone legend */}
        {showCNYZone && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <div className="w-4 h-3 rounded-sm bg-red-500/20 border border-red-400" />
            <span>CNY Risk Zone (Jan {CNY_WINDOW.startDay} - Feb {CNY_WINDOW.endDay}): Sea freight may face 10-15 day delays</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Sub-component: Recommendation Banner
// ============================================

function RecommendationBanner({ comparison, baseState }: {
  comparison: SeaVsAirCompType;
  baseState: ScenarioBaseState;
}) {
  const seaLT = LEAD_TIME_CONFIG.sea.total;
  const airLT = LEAD_TIME_CONFIG.air.total;
  const leadTimeReduction = seaLT - airLT;
  const leadTimePctReduction = ((leadTimeReduction / seaLT) * 100).toFixed(0);

  const freightDelta = FREIGHT_COST.air - FREIGHT_COST.sea;
  const freightPctIncrease = ((freightDelta / FREIGHT_COST.sea) * 100).toFixed(0);

  const orderQty = baseState.orderQuantity;
  const additionalFreightCost = freightDelta * orderQty;

  // Calculate holding cost savings from scenario engine results
  const seaHoldingImpact = comparison.sea.impacts.find(i => i.metric === 'Monthly Holding Cost');
  const airHoldingImpact = comparison.air.impacts.find(i => i.metric === 'Monthly Holding Cost');
  const holdingCostSavings = seaHoldingImpact && airHoldingImpact
    ? Math.abs(seaHoldingImpact.scenario - airHoldingImpact.scenario)
    : 0;

  const recommendedMode = comparison.recommendation;
  const netSavings = comparison.netSavingsBDT;

  // Determine urgency from stockout probabilities
  const seaStockoutProb = comparison.riskAnalysis.seaStockoutProbability;
  const isHighUrgency = seaStockoutProb > 0.08;

  const isAirRecommended = recommendedMode === 'air';

  return (
    <Card className={cn(
      'overflow-hidden',
      isAirRecommended
        ? 'border-amber-200 dark:border-amber-800'
        : 'border-teal-200 dark:border-teal-800',
    )}>
      <div className={cn(
        'px-4 py-2.5',
        isAirRecommended
          ? 'bg-amber-50 dark:bg-amber-950/30'
          : 'bg-teal-50 dark:bg-teal-950/30',
      )}>
        <div className="flex items-center gap-2 mb-2">
          {isAirRecommended ? (
            <>
              <Plane className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                Air Shipment Recommended
              </span>
            </>
          ) : (
            <>
              <Ship className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <span className="text-sm font-bold text-teal-700 dark:text-teal-300">
                Sea Shipment Recommended
              </span>
            </>
          )}
        </div>
        <div className="space-y-1.5 text-xs text-foreground/80">
          <p>
            Switching to air shipment reduces lead time by <strong>{leadTimeReduction} days (-{leadTimePctReduction}%)</strong> but
            increases per-unit cost by <strong>{formatBDT(freightDelta)} (+{freightPctIncrease}%)</strong>.
          </p>
          <p>
            Net impact for {orderQty} units: <strong className="text-red-600 dark:text-red-400">{formatBDT(additionalFreightCost)}</strong> additional
            freight cost, <strong className="text-emerald-600 dark:text-emerald-400">{formatBDT(holdingCostSavings)}/mo</strong> holding cost savings.
          </p>
          <Separator className="my-2" />
          {isHighUrgency ? (
            <p className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <strong>Air shipment recommended despite higher cost due to stockout risk.</strong>
            </p>
          ) : (
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
              <strong>Sea shipment recommended -- cost savings outweigh urgency.</strong>
            </p>
          )}
          {netSavings !== 0 && (
            <p className="text-muted-foreground">
              Annual net cost difference: {formatBDT(Math.abs(netSavings))} ({netSavings > 0 ? 'air is cheaper' : 'sea is cheaper'} overall)
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

export function SeaVsAirComparison() {
  const { forecastResult } = useForecastStore();

  // Build base state from store or use demo
  const baseState: ScenarioBaseState = useMemo(() => {
    if (forecastResult) {
      const ot = forecastResult.orderTrigger;
      const lt = forecastResult.leadTime;
      const eoq = forecastResult.eoq;
      const ss = forecastResult.safetyStock;

      return {
        avgMonthlyDemand: ot.suggestedOrderQty > 0 ? ot.suggestedOrderQty / 3 : 250,
        demandStdDev: 50,
        leadTimeMode: lt.shippingMethod === 'air' ? 'air' : 'sea',
        avgLeadTimeDays: lt.total,
        leadTimeStdDev: lt.shippingMethod === 'air' ? 5 : 15,
        serviceLevel: ss.serviceLevel,
        unitPrice: 850,
        unitCost: 520,
        promoIndex: 0.2,
        orderQuantity: eoq.eoq > 0 ? eoq.eoq : 300,
        orderingCost: 5000,
        holdingCostPct: 0.20,
        annualDemand: eoq.eoq > 0 ? eoq.eoq * 10 : 3000,
      };
    }
    return DEMO_BASE_STATE;
  }, [forecastResult]);

  // Run comparison
  const comparison = useMemo(() => {
    return compareSeaVsAir(baseState);
  }, [baseState]);

  // Check CNY risk
  const cnyRisk = isCurrentlyInCNYWindow();

  // Build mode metrics from scenario engine results
  const seaMetrics: ModeMetrics = useMemo(() => {
    const seaSS = comparison.sea.impacts.find(i => i.metric === 'Safety Stock');
    const seaROP = comparison.sea.impacts.find(i => i.metric === 'Reorder Point');
    const seaHolding = comparison.sea.impacts.find(i => i.metric === 'Monthly Holding Cost');
    const seaFreight = comparison.sea.impacts.find(i => i.metric === 'Freight Cost/Unit');

    const safetyStock = seaSS ? Math.round(seaSS.scenario) : 0;
    const reorderPoint = seaROP ? Math.round(seaROP.scenario) : 0;
    const holdingCostMo = seaHolding ? seaHolding.scenario : 0;
    const freightUnit = seaFreight ? seaFreight.scenario : FREIGHT_COST.sea;

    // Total order cost = freight * qty + holding * months_in_lead_time
    const totalOrderCost = freightUnit * baseState.orderQuantity +
      holdingCostMo * (LEAD_TIME_CONFIG.sea.total / 30);

    return {
      label: 'Sea',
      leadTime: {
        manufacturing: LEAD_TIME_CONFIG.sea.manufacturing,
        shipping: LEAD_TIME_CONFIG.sea.shipping,
        customs: LEAD_TIME_CONFIG.sea.customs,
        internal: LEAD_TIME_CONFIG.sea.internal,
        total: LEAD_TIME_CONFIG.sea.total,
        stdDev: LEAD_TIME_CONFIG.sea.stdDev,
      },
      freightCostPerUnit: freightUnit,
      safetyStock,
      reorderPoint,
      holdingCostPerMonth: holdingCostMo,
      totalOrderCost,
      cnyRisk,
    };
  }, [comparison, baseState, cnyRisk]);

  const airMetrics: ModeMetrics = useMemo(() => {
    const airSS = comparison.air.impacts.find(i => i.metric === 'Safety Stock');
    const airROP = comparison.air.impacts.find(i => i.metric === 'Reorder Point');
    const airHolding = comparison.air.impacts.find(i => i.metric === 'Monthly Holding Cost');
    const airFreight = comparison.air.impacts.find(i => i.metric === 'Freight Cost/Unit');

    const safetyStock = airSS ? Math.round(airSS.scenario) : 0;
    const reorderPoint = airROP ? Math.round(airROP.scenario) : 0;
    const holdingCostMo = airHolding ? airHolding.scenario : 0;
    const freightUnit = airFreight ? airFreight.scenario : FREIGHT_COST.air;

    const totalOrderCost = freightUnit * baseState.orderQuantity +
      holdingCostMo * (LEAD_TIME_CONFIG.air.total / 30);

    return {
      label: 'Air',
      leadTime: {
        manufacturing: LEAD_TIME_CONFIG.air.manufacturing,
        shipping: LEAD_TIME_CONFIG.air.shipping,
        customs: LEAD_TIME_CONFIG.air.customs,
        internal: LEAD_TIME_CONFIG.air.internal,
        total: LEAD_TIME_CONFIG.air.total,
        stdDev: LEAD_TIME_CONFIG.air.stdDev,
      },
      freightCostPerUnit: freightUnit,
      safetyStock,
      reorderPoint,
      holdingCostPerMonth: holdingCostMo,
      totalOrderCost,
      cnyRisk: false, // Air is not affected by CNY
    };
  }, [comparison, baseState]);

  // Product name
  const productName = forecastResult?.product?.name || 'Demo Product';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Ship className="h-4 w-4 text-teal-500" />
            Sea vs Air Comparison
          </h3>
          <p className="text-xs text-muted-foreground">
            Side-by-side shipment mode analysis for {productName}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] gap-1">
          <Info className="h-3 w-3" />
          What-If Scenario
        </Badge>
      </div>

      {/* Mode Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModeCard
          metrics={seaMetrics}
          accentColor="teal"
          icon={<Ship className="h-4 w-4 text-teal-500" />}
        />
        <ModeCard
          metrics={airMetrics}
          accentColor="amber"
          icon={<Plane className="h-4 w-4 text-amber-500" />}
        />
      </div>

      {/* Comparison Metrics Table */}
      <ComparisonTable sea={seaMetrics} air={airMetrics} />

      {/* Timeline Visualization */}
      <TimelineViz
        seaLT={seaMetrics.leadTime}
        airLT={airMetrics.leadTime}
        showCNYZone={cnyRisk}
      />

      {/* Recommendation Banner */}
      <RecommendationBanner comparison={comparison} baseState={baseState} />

      {/* Risk flags */}
      {(comparison.sea.riskFlags.length > 0 || comparison.air.riskFlags.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Risk Considerations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparison.sea.riskFlags.map((flag, i) => (
                <div key={`sea-${i}`} className="flex items-start gap-2 text-xs">
                  <Ship className="h-3 w-3 text-teal-500 mt-0.5 shrink-0" />
                  <span>{flag}</span>
                </div>
              ))}
              {comparison.air.riskFlags.map((flag, i) => (
                <div key={`air-${i}`} className="flex items-start gap-2 text-xs">
                  <Plane className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
