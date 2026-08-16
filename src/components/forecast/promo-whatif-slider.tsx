'use client';

// ============================================
// TrimedCast Promo Index What-If Slider
// Interactive slider for promo index with live
// demand forecast preview, revenue impact,
// inventory requirement changes, and shadow chart
// ============================================

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Megaphone,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Package,
  Shield,
  Calculator,
  Info,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  runPromoIndexScenario,
  DEMAND_MODEL_BETAS,
  LEAD_TIME_CONFIG,
  type ScenarioBaseState,
} from '@/lib/forecasting/scenario-engine';
import {
  calculateEOQ,
  calculateSafetyStock,
  BD_SEASONS,
  getBDSeason,
  getSeasonMultiplier,
  type BDSeason,
} from '@/lib/forecasting/models';
import { getSafetyFactor } from '@/lib/forecasting/eoq-safety-stock';
import { useForecastStore } from '@/lib/forecasting/store';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface PromoPreset {
  label: string;
  value: number;
  color: string;
}

interface DemandResult {
  currentDemand: number;
  projectedDemand: number;
  demandDelta: number;
  demandDeltaPct: number;
}

interface RevenueResult {
  currentRevenue: number;
  projectedRevenue: number;
  revenueDelta: number;
  marginImpact: number;
  breakEvenUnits: number;
}

interface InventoryChange {
  currentSS: number;
  projectedSS: number;
  ssDelta: number;
  currentEOQ: number;
  projectedEOQ: number;
  eoqDelta: number;
  orderChangeText: string;
  orderChangeDirection: 'increase' | 'decrease' | 'none';
}

// ============================================
// Constants
// ============================================

const PROMO_PRESETS: PromoPreset[] = [
  { label: 'No Promo', value: 0, color: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  { label: 'Light', value: 0.2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  { label: 'Moderate', value: 0.4, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { label: 'Heavy', value: 0.7, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  { label: 'Max', value: 1.0, color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
];

const MARGIN_PCT = 0.35; // 35% margin assumption

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
// Helpers
// ============================================

function formatBDT(value: number): string {
  return `BDT ${Math.round(value).toLocaleString()}`;
}

function calculateDemand(price: number, promoIndex: number): number {
  const demand = DEMAND_MODEL_BETAS.beta0
    + DEMAND_MODEL_BETAS.beta1 * price
    + DEMAND_MODEL_BETAS.beta2 * promoIndex;
  return Math.max(demand, 0);
}

function getSliderTrackColor(value: number): string {
  if (value <= 0.3) return 'bg-emerald-500';
  if (value <= 0.6) return 'bg-amber-500';
  return 'bg-red-500';
}

function getSliderBadgeColor(value: number): string {
  if (value <= 0.3) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
  if (value <= 0.6) return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
  return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
}

// ============================================
// Sub-component: Promo Slider with Presets
// ============================================

function PromoSlider({ value, onChange }: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-amber-500" />
          Promo Index What-If
        </CardTitle>
        <CardDescription className="text-xs">
          Adjust the promo index to see real-time impact on demand, revenue, and inventory
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Large value display */}
        <div className="text-center">
          <div className={cn(
            'inline-flex items-baseline gap-1 px-4 py-2 rounded-xl',
            getSliderBadgeColor(value),
          )}>
            <span className="text-4xl font-bold">{value.toFixed(2)}</span>
            <span className="text-sm font-medium">/ 1.00</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {value === 0 ? 'No promotional activity' :
             value <= 0.3 ? 'Light promotional activity' :
             value <= 0.6 ? 'Moderate promotional activity' :
             'Heavy promotional activity'}
          </p>
        </div>

        {/* Color-coded slider track */}
        <div className="space-y-1">
          {/* Track background visualization */}
          <div className="flex h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 flex-[3]" />
            <div className="bg-amber-500 flex-[3]" />
            <div className="bg-red-500 flex-[4]" />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>0.0</span>
            <span>0.3</span>
            <span>0.6</span>
            <span>1.0</span>
          </div>

          {/* Actual slider */}
          <Slider
            value={[value]}
            onValueChange={(v) => onChange(v[0])}
            min={0}
            max={1}
            step={0.01}
            className="mt-2"
          />
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {PROMO_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant={Math.abs(value - preset.value) < 0.005 ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => onChange(preset.value)}
            >
              {preset.label}
              <span className="ml-1 text-[10px] opacity-70">({preset.value})</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Sub-component: Live Demand Forecast Display
// ============================================

function DemandForecastDisplay({ demand, basePromoIndex, newPromoIndex }: {
  demand: DemandResult;
  basePromoIndex: number;
  newPromoIndex: number;
}) {
  const isIncrease = demand.demandDelta > 0;
  const isDecrease = demand.demandDelta < 0;
  const isNoChange = demand.demandDelta === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          Live Demand Forecast
        </CardTitle>
        <CardDescription className="text-xs">
          D(F) = {DEMAND_MODEL_BETAS.beta0} + ({DEMAND_MODEL_BETAS.beta1}) * Price + ({DEMAND_MODEL_BETAS.beta2}) * PromoIndex
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current vs Projected */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3 bg-muted/50 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">Current (Promo: {basePromoIndex.toFixed(2)})</p>
            <p className="text-2xl font-bold">{Math.round(demand.currentDemand)}</p>
            <p className="text-[10px] text-muted-foreground">units/month</p>
          </div>
          <div className={cn(
            'rounded-lg p-3 text-center',
            isIncrease ? 'bg-emerald-50 dark:bg-emerald-950/30' :
            isDecrease ? 'bg-red-50 dark:bg-red-950/30' : 'bg-muted/50',
          )}>
            <p className="text-[10px] text-muted-foreground mb-1">Projected (Promo: {newPromoIndex.toFixed(2)})</p>
            <p className="text-2xl font-bold">{Math.round(demand.projectedDemand)}</p>
            <p className="text-[10px] text-muted-foreground">units/month</p>
          </div>
        </div>

        {/* Delta */}
        {!isNoChange && (
          <div className={cn(
            'flex items-center justify-center gap-2 rounded-lg p-2.5',
            isIncrease
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300',
          )}>
            {isIncrease ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            <span className="text-lg font-bold">
              {isIncrease ? '+' : ''}{Math.round(demand.demandDelta)} units
            </span>
            <span className="text-sm">
              ({demand.demandDeltaPct > 0 ? '+' : ''}{demand.demandDeltaPct.toFixed(1)}%)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Sub-component: Revenue Impact Card
// ============================================

function RevenueImpactCard({ revenue }: { revenue: RevenueResult }) {
  const isPositive = revenue.revenueDelta > 0;
  const isNegative = revenue.revenueDelta < 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-500" />
          Revenue Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3 bg-muted/50">
            <p className="text-[10px] text-muted-foreground mb-1">Revenue at Current Promo</p>
            <p className="text-sm font-bold">{formatBDT(revenue.currentRevenue)}/mo</p>
          </div>
          <div className="rounded-lg p-3 bg-muted/50">
            <p className="text-[10px] text-muted-foreground mb-1">Revenue at New Promo</p>
            <p className="text-sm font-bold">{formatBDT(revenue.projectedRevenue)}/mo</p>
          </div>
        </div>

        {/* Revenue delta */}
        <div className={cn(
          'rounded-lg p-2.5 text-center',
          isPositive ? 'bg-emerald-50 dark:bg-emerald-950/30' :
          isNegative ? 'bg-red-50 dark:bg-red-950/30' : 'bg-muted/50',
        )}>
          <p className="text-[10px] text-muted-foreground">Monthly Revenue Change</p>
          <p className={cn(
            'text-lg font-bold',
            isPositive && 'text-emerald-600 dark:text-emerald-400',
            isNegative && 'text-red-600 dark:text-red-400',
          )}>
            {revenue.revenueDelta > 0 ? '+' : ''}{formatBDT(revenue.revenueDelta)}
          </p>
        </div>

        {/* Margin impact */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Margin Impact</span>
          <span className={cn(
            'font-medium',
            revenue.marginImpact > 0 ? 'text-emerald-600 dark:text-emerald-400' :
            revenue.marginImpact < 0 ? 'text-red-600 dark:text-red-400' : '',
          )}>
            {revenue.marginImpact > 0 ? '+' : ''}{formatBDT(revenue.marginImpact)}/mo
          </span>
        </div>

        <Separator />

        {/* Break-even */}
        {revenue.breakEvenUnits > 0 && (
          <div className="rounded-lg p-2.5 bg-amber-50 dark:bg-amber-950/30">
            <div className="flex items-start gap-2">
              <Calculator className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Break-even: You need <strong>{Math.ceil(revenue.breakEvenUnits)} additional units</strong> sold
                to justify the promo cost at this level.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Sub-component: Inventory Requirement Change
// ============================================

function InventoryChangeCard({ inventory }: { inventory: InventoryChange }) {
  const isIncrease = inventory.orderChangeDirection === 'increase';
  const isDecrease = inventory.orderChangeDirection === 'decrease';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-500" />
          Inventory Requirement Change
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Safety Stock */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3 bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Current SS</span>
            </div>
            <p className="text-sm font-bold">{inventory.currentSS} units</p>
          </div>
          <div className="rounded-lg p-3 bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Projected SS</span>
            </div>
            <p className="text-sm font-bold">{inventory.projectedSS} units</p>
          </div>
        </div>

        {/* SS delta */}
        {inventory.ssDelta !== 0 && (
          <div className={cn(
            'text-center rounded-lg p-2',
            inventory.ssDelta > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30',
          )}>
            <span className={cn(
              'text-xs font-medium',
              inventory.ssDelta > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300',
            )}>
              Safety stock {inventory.ssDelta > 0 ? 'increases' : 'decreases'} by {Math.abs(Math.round(inventory.ssDelta))} units
            </span>
          </div>
        )}

        {/* EOQ */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50">
            <span className="text-muted-foreground">Current EOQ</span>
            <span className="font-medium">{inventory.currentEOQ} units</span>
          </div>
          <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50">
            <span className="text-muted-foreground">Projected EOQ</span>
            <span className="font-medium">{inventory.projectedEOQ} units</span>
          </div>
        </div>

        <Separator />

        {/* Order change summary */}
        {inventory.orderChangeDirection !== 'none' && (
          <div className={cn(
            'rounded-lg p-2.5',
            isIncrease
              ? 'bg-amber-50 dark:bg-amber-950/30'
              : 'bg-emerald-50 dark:bg-emerald-950/30',
          )}>
            <div className="flex items-start gap-2">
              {isIncrease ? (
                <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              )}
              <p className={cn(
                'text-xs',
                isIncrease
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-emerald-700 dark:text-emerald-300',
              )}>
                {inventory.orderChangeText}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Sub-component: Shadow Forecast Mini Chart
// ============================================

function ShadowForecastChart({ baseState, newPromoIndex }: {
  baseState: ScenarioBaseState;
  newPromoIndex: number;
}) {
  const chartData = useMemo(() => {
    const now = new Date();
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data: {
      month: string;
      baseline: number;
      scenario: number;
      gap: number;
      season: string;
    }[] = [];

    const baselineDemand = calculateDemand(baseState.unitPrice, baseState.promoIndex);
    const scenarioDemand = calculateDemand(baseState.unitPrice, newPromoIndex);

    for (let i = 1; i <= 6; i++) {
      const future = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const month = future.getMonth() + 1;
      const year = future.getFullYear();
      const label = `${MONTH_NAMES[month - 1]} ${year}`;

      const seasonInfo = getBDSeason(month);
      const seasonMultiplier = seasonInfo.demandMultiplier;

      // Apply season-aware promo amplification
      let promoAmplifier = 1;
      if (seasonInfo.season === 'winter') promoAmplifier = 1.4;
      else if (seasonInfo.season === 'monsoon') promoAmplifier = 0.7;

      const baseline = baselineDemand * seasonMultiplier;
      const scenario = scenarioDemand * seasonMultiplier * promoAmplifier;

      data.push({
        month: label,
        baseline: Math.round(baseline),
        scenario: Math.round(scenario),
        gap: Math.round(scenario - baseline),
        season: seasonInfo.label,
      });
    }

    return data;
  }, [baseState, newPromoIndex]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-violet-500" />
          Shadow Forecast (6-Month)
        </CardTitle>
        <CardDescription className="text-xs">
          Solid = current promo, Dashed = new promo, Shaded = demand gap
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="gapFillPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gapFillNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(value: number, name: string) => {
                if (name === 'gap') return [value > 0 ? `+${value}` : `${value}`, 'Gap'];
                return [value, name === 'baseline' ? 'Current Promo' : 'New Promo'];
              }}
              labelFormatter={(label: string, payload: { payload?: { season: string } }[]) => {
                const season = payload?.[0]?.payload?.season || '';
                return `${label}${season ? ` (${season})` : ''}`;
              }}
            />
            <Legend
              formatter={(value: string) => {
                if (value === 'baseline') return 'Current Promo';
                if (value === 'scenario') return 'New Promo';
                return value;
              }}
              iconType="line"
              wrapperStyle={{ fontSize: 10 }}
            />
            {/* Gap area between baseline and scenario */}
            <Area
              type="monotone"
              dataKey="scenario"
              stroke="none"
              fill="url(#gapFillPositive)"
              fillOpacity={1}
            />
            {/* Baseline line (solid) */}
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#64748b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#64748b' }}
              strokeDasharray=""
            />
            {/* Scenario line (dashed) */}
            <Line
              type="monotone"
              dataKey="scenario"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#8b5cf6' }}
              strokeDasharray="6 3"
            />
            <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="3 3" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================
// Sub-component: Season Impact Note
// ============================================

function SeasonImpactNote() {
  const currentMonth = new Date().getMonth() + 1;
  const currentSeason = getBDSeason(currentMonth);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="space-y-2 text-xs">
            <p className="font-medium text-foreground">Season Impact on Promo Effectiveness</p>
            <p className="text-muted-foreground">
              Promo effect is amplified during <strong className="text-emerald-600 dark:text-emerald-400">Winter (+40%)</strong> and
              reduced during <strong className="text-red-600 dark:text-red-400">Monsoon (-30%)</strong>.
              Summer and Pre-Winter have neutral impact.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {BD_SEASONS.map((season) => {
                const isActive = season.season === currentSeason.season;
                return (
                  <Badge
                    key={season.season}
                    variant={isActive ? 'default' : 'outline'}
                    className="text-[10px]"
                  >
                    {season.label} (x{season.demandMultiplier})
                    {isActive && ' *'}
                  </Badge>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              * Current season: {currentSeason.label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

export function PromoWhatIfSlider() {
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

  // Slider state
  const [promoIndex, setPromoIndex] = useState(baseState.promoIndex);

  // Run promo scenario
  const scenarioResult = useMemo(() => {
    return runPromoIndexScenario(baseState, promoIndex);
  }, [baseState, promoIndex]);

  // Calculate demand results
  const demand: DemandResult = useMemo(() => {
    const currentDemand = calculateDemand(baseState.unitPrice, baseState.promoIndex);
    const projectedDemand = calculateDemand(baseState.unitPrice, promoIndex);
    const demandDelta = projectedDemand - currentDemand;
    const demandDeltaPct = currentDemand !== 0 ? (demandDelta / currentDemand) * 100 : 0;

    return {
      currentDemand,
      projectedDemand,
      demandDelta,
      demandDeltaPct,
    };
  }, [baseState, promoIndex]);

  // Calculate revenue results
  const revenue: RevenueResult = useMemo(() => {
    const currentRevenue = demand.currentDemand * baseState.unitPrice;
    const projectedRevenue = demand.projectedDemand * baseState.unitPrice;
    const revenueDelta = projectedRevenue - currentRevenue;

    // Margin impact
    const currentMargin = demand.currentDemand * baseState.unitPrice * MARGIN_PCT;
    const projectedMargin = demand.projectedDemand * baseState.unitPrice * MARGIN_PCT;
    const marginImpact = projectedMargin - currentMargin;

    // Promo cost estimate: increasing promo increases costs
    // Simplified: promo cost = promoIndex * annualDemand * 10 BDT
    const promoCostDelta = (promoIndex - baseState.promoIndex) * baseState.annualDemand * 10;
    const breakEvenUnits = promoCostDelta > 0 ? Math.ceil(promoCostDelta / (baseState.unitPrice * MARGIN_PCT)) : 0;

    return {
      currentRevenue,
      projectedRevenue,
      revenueDelta,
      marginImpact,
      breakEvenUnits,
    };
  }, [demand, baseState, promoIndex]);

  // Calculate inventory changes
  const inventory: InventoryChange = useMemo(() => {
    const holdingCostPerUnit = baseState.unitCost * baseState.holdingCostPct;

    // Current safety stock and EOQ
    const currentSS = Math.round(
      getSafetyFactor(baseState.serviceLevel) *
      Math.sqrt(
        baseState.avgLeadTimeDays * Math.pow(baseState.demandStdDev, 2) +
        Math.pow(demand.currentDemand, 2) * Math.pow(baseState.leadTimeStdDev, 2)
      )
    );
    const currentEOQResult = calculateEOQ({
      annualDemand: Math.round(demand.currentDemand * 12),
      orderingCost: baseState.orderingCost,
      holdingCostPerUnit,
    });
    const currentEOQ = currentEOQResult.eoq;

    // Projected safety stock and EOQ
    const demandScaleFactor = demand.currentDemand !== 0 ? demand.projectedDemand / demand.currentDemand : 1;
    const projectedSS = Math.round(currentSS * demandScaleFactor);
    const projectedEOQResult = calculateEOQ({
      annualDemand: Math.round(demand.projectedDemand * 12),
      orderingCost: baseState.orderingCost,
      holdingCostPerUnit,
    });
    const projectedEOQ = projectedEOQResult.eoq;

    const ssDelta = projectedSS - currentSS;
    const eoqDelta = projectedEOQ - currentEOQ;

    // Order change text
    let orderChangeText = '';
    let orderChangeDirection: 'increase' | 'decrease' | 'none' = 'none';

    if (eoqDelta > 0) {
      orderChangeText = `Additional order of ${Math.round(eoqDelta)} units needed to meet projected demand`;
      orderChangeDirection = 'increase';
    } else if (eoqDelta < 0) {
      orderChangeText = `Order reduction of ${Math.round(Math.abs(eoqDelta))} units possible due to lower projected demand`;
      orderChangeDirection = 'decrease';
    } else {
      orderChangeText = 'No change in order quantity required';
    }

    return {
      currentSS,
      projectedSS,
      ssDelta,
      currentEOQ,
      projectedEOQ,
      eoqDelta,
      orderChangeText,
      orderChangeDirection,
    };
  }, [baseState, demand]);

  // Product name
  const productName = forecastResult?.product?.name || 'Demo Product';

  // Check for risk flags
  const hasRiskFlags = scenarioResult.riskFlags.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-amber-500" />
            Promo Index What-If Slider
          </h3>
          <p className="text-xs text-muted-foreground">
            Live forecast preview for {productName}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] gap-1">
          <Info className="h-3 w-3" />
          Real-time Simulation
        </Badge>
      </div>

      {/* Promo Slider */}
      <PromoSlider value={promoIndex} onChange={setPromoIndex} />

      {/* Live Demand + Revenue (side by side on larger screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DemandForecastDisplay
          demand={demand}
          basePromoIndex={baseState.promoIndex}
          newPromoIndex={promoIndex}
        />
        <RevenueImpactCard revenue={revenue} />
      </div>

      {/* Inventory Change */}
      <InventoryChangeCard inventory={inventory} />

      {/* Shadow Forecast Chart */}
      <ShadowForecastChart baseState={baseState} newPromoIndex={promoIndex} />

      {/* Season Impact Note */}
      <SeasonImpactNote />

      {/* Scenario engine recommendation */}
      {scenarioResult.recommendation && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-500" />
              Scenario Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-foreground/80">{scenarioResult.recommendation}</p>
          </CardContent>
        </Card>
      )}

      {/* Risk flags */}
      {hasRiskFlags && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Risk Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {scenarioResult.riskFlags.map((flag, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
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
