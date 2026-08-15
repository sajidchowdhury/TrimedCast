'use client';

// ============================================
// Lead Time Simulator — Sea vs Air Toggle
// Section 6: Technical Logic for Sea vs Air Lead Time
// Instant safety stock recalculation, impact summary,
// cost comparison chart, and visual buffer inventory
// ============================================

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Ship,
  Plane,
  Calculator,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  Package,
  Clock,
  DollarSign,
  Warehouse,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

type ShippingMode = 'sea' | 'air';

interface SampleProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  avgDailyDemand: number;
  unitCost: number;
  leadTimeSea: number;
  leadTimeAir: number;
  supplier: string;
  reliability: number;
}

interface SimulationResult {
  leadTime: number;
  safetyStock: number;
  bufferInventory: number;
  holdingCostMonthly: number;
  eoq: number;
  reorderPoint: number;
}

interface SimulationPair {
  sea: SimulationResult;
  air: SimulationResult;
}

// ============================================
// Sample Data
// ============================================

const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    id: '1',
    sku: 'BJP-110',
    name: 'Bajaj Pulsar Piston Kit',
    category: 'piston',
    currentStock: 250,
    avgDailyDemand: 8,
    unitCost: 850,
    leadTimeSea: 90,
    leadTimeAir: 35,
    supplier: 'Jingke Auto',
    reliability: 0.92,
  },
  {
    id: '2',
    sku: 'HCG-125',
    name: 'Honda CG Chain Set',
    category: 'chain',
    currentStock: 180,
    avgDailyDemand: 5,
    unitCost: 1200,
    leadTimeSea: 85,
    leadTimeAir: 30,
    supplier: 'Yuxing Chain',
    reliability: 0.88,
  },
  {
    id: '3',
    sku: 'YBR-125',
    name: 'Yamaha Brake Pad Set',
    category: 'brake',
    currentStock: 320,
    avgDailyDemand: 12,
    unitCost: 450,
    leadTimeSea: 88,
    leadTimeAir: 32,
    supplier: 'Tianming Brakes',
    reliability: 0.90,
  },
  {
    id: '4',
    sku: 'DISC-150',
    name: 'Disc Brake Rotor 150cc',
    category: 'brake',
    currentStock: 95,
    avgDailyDemand: 3,
    unitCost: 2200,
    leadTimeSea: 92,
    leadTimeAir: 38,
    supplier: 'Lixing Machinery',
    reliability: 0.85,
  },
  {
    id: '5',
    sku: 'FILT-100',
    name: 'Oil Filter Universal',
    category: 'filter',
    currentStock: 500,
    avgDailyDemand: 18,
    unitCost: 180,
    leadTimeSea: 80,
    leadTimeAir: 28,
    supplier: 'Guangzhou Auto',
    reliability: 0.94,
  },
  {
    id: '6',
    sku: 'CLCH-135',
    name: 'Clutch Plate Assembly',
    category: 'clutch',
    currentStock: 140,
    avgDailyDemand: 6,
    unitCost: 950,
    leadTimeSea: 87,
    leadTimeAir: 33,
    supplier: 'Jingke Auto',
    reliability: 0.91,
  },
  {
    id: '7',
    sku: 'BEAR-200',
    name: 'Wheel Bearing Kit 200cc',
    category: 'bearing',
    currentStock: 210,
    avgDailyDemand: 7,
    unitCost: 680,
    leadTimeSea: 90,
    leadTimeAir: 35,
    supplier: 'NSK China',
    reliability: 0.96,
  },
  {
    id: '8',
    sku: 'SPRK-110',
    name: 'Spark Plug Set (4pc)',
    category: 'ignition',
    currentStock: 450,
    avgDailyDemand: 15,
    unitCost: 320,
    leadTimeSea: 82,
    leadTimeAir: 30,
    supplier: 'NGK China',
    reliability: 0.97,
  },
];

// ============================================
// Calculation Helpers
// ============================================

const SAFETY_FACTOR_K = 1.65; // 95% service level
const CARRY_RATE_ANNUAL = 0.25; // 25% annual carrying cost
const ORDER_COST = 2500; // BDT per order (fixed ordering cost)
const SIGMA_D_FACTOR = 0.25; // std dev of demand as fraction of mean
const SIGMA_T_SEA = 15; // std dev of lead time for sea (days)
const SIGMA_T_AIR = 5; // std dev of lead time for air (days)

function calcSafetyStock(
  k: number,
  muT: number,
  sigmaT: number,
  muD: number,
  sigmaD: number
): number {
  return k * Math.sqrt(muT * sigmaD * sigmaD + muD * muD * sigmaT * sigmaT);
}

function calcEOQ(D: number, S: number, h: number): number {
  return Math.sqrt((2 * D * S) / h);
}

function calcHoldingCost(
  avgInventory: number,
  unitCost: number,
  carryRate: number
): number {
  return (avgInventory * unitCost * carryRate) / 12; // monthly
}

function calcReorderPoint(muD: number, leadTime: number, safetyStock: number): number {
  return muD * leadTime + safetyStock;
}

function simulateProduct(
  product: SampleProduct,
  mode: ShippingMode
): SimulationResult {
  const leadTime = mode === 'sea' ? product.leadTimeSea : product.leadTimeAir;
  const sigmaT = mode === 'sea' ? SIGMA_T_SEA : SIGMA_T_AIR;
  const muD = product.avgDailyDemand;
  const sigmaD = muD * SIGMA_D_FACTOR;

  const safetyStock = calcSafetyStock(SAFETY_FACTOR_K, leadTime, sigmaT, muD, sigmaD);
  const bufferInventory = safetyStock; // buffer = safety stock for this model
  const annualDemand = muD * 365;
  const unitHoldingCost = product.unitCost * CARRY_RATE_ANNUAL;
  const eoq = calcEOQ(annualDemand, ORDER_COST, unitHoldingCost);
  const avgInventory = eoq / 2 + safetyStock;
  const holdingCostMonthly = calcHoldingCost(avgInventory, product.unitCost, CARRY_RATE_ANNUAL);
  const reorderPoint = calcReorderPoint(muD, leadTime, safetyStock);

  return {
    leadTime,
    safetyStock: Math.round(safetyStock),
    bufferInventory: Math.round(bufferInventory),
    holdingCostMonthly: Math.round(holdingCostMonthly),
    eoq: Math.round(eoq),
    reorderPoint: Math.round(reorderPoint),
  };
}

// ============================================
// BDT Formatting
// ============================================

function formatBDT(value: number): string {
  if (value >= 1_00_00_000) {
    return `BDT ${(value / 1_00_00_000).toFixed(2)}L`;
  }
  if (value >= 1_00_000) {
    return `BDT ${(value / 1_00_000).toFixed(1)}K`;
  }
  return `BDT ${value.toLocaleString('en-IN')}`;
}

function formatBDTShort(value: number): string {
  if (value >= 1_00_00_000) {
    return `${(value / 1_00_00_000).toFixed(1)}L`;
  }
  if (value >= 1_00_000) {
    return `${(value / 1_00_000).toFixed(1)}K`;
  }
  return value.toLocaleString('en-IN');
}

// ============================================
// Impact Metric Row
// ============================================

interface ImpactRowProps {
  label: string;
  beforeValue: number;
  afterValue: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  isLowerBetter?: boolean;
  formatFn?: (v: number) => string;
}

function ImpactMetricRow({
  label,
  beforeValue,
  afterValue,
  unit,
  icon: Icon,
  isLowerBetter = true,
  formatFn,
}: ImpactRowProps) {
  const diff = afterValue - beforeValue;
  const isPositive = diff > 0;
  const isImproved = isLowerBetter ? !isPositive : isPositive;
  const pctChange = beforeValue !== 0 ? ((diff / beforeValue) * 100).toFixed(1) : '0';
  const display = formatFn || ((v: number) => v.toLocaleString('en-IN'));

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm tabular-nums font-medium">{display(beforeValue)}</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm tabular-nums font-semibold">{display(afterValue)}</span>
        <Badge
          variant={isImproved ? 'secondary' : 'destructive'}
          className={cn(
            'text-[10px] px-1.5 h-4 font-semibold',
            isImproved && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
          )}
        >
          {diff > 0 ? '+' : ''}{pctChange}%
        </Badge>
        <span className="text-[10px] text-muted-foreground w-6">{unit}</span>
      </div>
    </div>
  );
}

// ============================================
// Visual Buffer Inventory Bar
// ============================================

interface BufferBarProps {
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  maxStock: number;
  mode: ShippingMode;
}

function BufferInventoryBar({
  currentStock,
  safetyStock,
  reorderPoint,
  maxStock,
  mode,
}: BufferBarProps) {
  const cap = Math.max(maxStock, currentStock, reorderPoint * 1.2);
  const stockPct = Math.min((currentStock / cap) * 100, 100);
  const ssPct = (safetyStock / cap) * 100;
  const ropPct = (reorderPoint / cap) * 100;

  // Zone boundaries (as percentages of the bar)
  const redZoneEnd = ssPct;
  const yellowZoneEnd = ropPct;

  const isInRedZone = currentStock <= safetyStock;
  const isInYellowZone = currentStock > safetyStock && currentStock <= reorderPoint;
  const isInGreenZone = currentStock > reorderPoint;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Buffer Inventory Level</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Below SS
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Near ROP
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Healthy
          </span>
        </div>
      </div>
      <div className="relative h-8 rounded-lg overflow-hidden border border-border">
        {/* Background zones */}
        <div
          className="absolute inset-y-0 left-0 bg-red-500/15"
          style={{ width: `${redZoneEnd}%` }}
        />
        <div
          className="absolute inset-y-0 bg-amber-500/15"
          style={{ left: `${redZoneEnd}%`, width: `${yellowZoneEnd - redZoneEnd}%` }}
        />
        <div
          className="absolute inset-y-0 bg-emerald-500/10"
          style={{ left: `${yellowZoneEnd}%`, right: 0 }}
        />

        {/* Safety stock marker */}
        <div
          className="absolute inset-y-0 w-0.5 bg-red-500/70 z-10"
          style={{ left: `${ssPct}%` }}
        />

        {/* Reorder point marker */}
        <div
          className="absolute inset-y-0 w-0.5 bg-amber-500/70 z-10"
          style={{ left: `${ropPct}%` }}
        />

        {/* Current stock bar */}
        <motion.div
          className={cn(
            'absolute inset-y-1 rounded-md z-20',
            isInRedZone && 'bg-red-500/70',
            isInYellowZone && 'bg-amber-500/70',
            isInGreenZone && 'bg-emerald-500/70',
          )}
          initial={{ width: 0 }}
          animate={{ width: `${stockPct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {/* Stock level label */}
        <div
          className="absolute inset-y-0 flex items-center z-30"
          style={{ left: `${Math.min(stockPct, 95)}%` }}
        >
          <span className="text-[9px] font-bold text-foreground ml-1 whitespace-nowrap">
            {currentStock}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>0</span>
        <span className="text-red-600 dark:text-red-400">SS: {safetyStock}</span>
        <span className="text-amber-600 dark:text-amber-400">ROP: {reorderPoint}</span>
        <span>{Math.round(cap)}</span>
      </div>
    </div>
  );
}

// ============================================
// Cost Comparison Chart
// ============================================

interface CostChartProps {
  seaResult: SimulationResult;
  airResult: SimulationResult;
  unitCost: number;
}

function CostComparisonChart({ seaResult, airResult, unitCost }: CostChartProps) {
  const annualDemandSea = seaResult.eoq; // proxy for annual demand from EOQ
  const orderCostSea = ORDER_COST; // per order
  const ordersPerYearSea = Math.round((365 * 8) / seaResult.eoq); // approximate
  const totalOrderCostSea = ordersPerYearSea * orderCostSea;

  const ordersPerYearAir = Math.round((365 * 8) / airResult.eoq);
  const totalOrderCostAir = ordersPerYearAir * orderCostSea;

  const chartData = [
    {
      category: 'Holding Cost',
      Sea: seaResult.holdingCostMonthly,
      Air: airResult.holdingCostMonthly,
    },
    {
      category: 'Order Cost',
      Sea: Math.round(totalOrderCostSea / 12),
      Air: Math.round(totalOrderCostAir / 12),
    },
    {
      category: 'Total Cost',
      Sea: seaResult.holdingCostMonthly + Math.round(totalOrderCostSea / 12),
      Air: airResult.holdingCostMonthly + Math.round(totalOrderCostAir / 12),
    },
  ];

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 4 }}
          barCategoryGap="20%"
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
            tickFormatter={(v: number) => formatBDTShort(v)}
          />
          <RechartsTooltip
            formatter={(value: number) => [formatBDT(value), '']}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-popover)',
              color: 'var(--color-popover-foreground)',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="Sea" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {chartData.map((_, index) => (
              <Cell
                key={`sea-${index}`}
                fill="var(--color-chart-1)"
                className="fill-chart-1"
              />
            ))}
          </Bar>
          <Bar dataKey="Air" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {chartData.map((_, index) => (
              <Cell
                key={`air-${index}`}
                fill="var(--color-chart-2)"
                className="fill-chart-2"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// Segmented Control Toggle
// ============================================

interface SegmentedToggleProps {
  value: ShippingMode;
  onChange: (mode: ShippingMode) => void;
}

function ShippingModeToggle({ value, onChange }: SegmentedToggleProps) {
  return (
    <div className="relative flex items-center rounded-lg border border-border bg-muted/50 p-1 w-fit">
      {/* Sliding indicator */}
      <motion.div
        className="absolute inset-y-1 rounded-md bg-card shadow-sm border border-border"
        layout
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          width: 'calc(50% - 4px)',
          left: value === 'sea' ? 4 : 'calc(50% + 0px)',
        }}
      />
      <button
        onClick={() => onChange('sea')}
        className={cn(
          'relative z-10 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
          value === 'sea'
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Ship className="h-4 w-4" />
        <span>Sea</span>
        {value === 'sea' && (
          <Badge variant="secondary" className="text-[9px] px-1 h-3.5 ml-0.5">
            90d
          </Badge>
        )}
      </button>
      <button
        onClick={() => onChange('air')}
        className={cn(
          'relative z-10 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
          value === 'air'
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Plane className="h-4 w-4" />
        <span>Air</span>
        {value === 'air' && (
          <Badge variant="secondary" className="text-[9px] px-1 h-3.5 ml-0.5">
            35d
          </Badge>
        )}
      </button>
    </div>
  );
}

// ============================================
// Lead Time Breakdown Mini Display
// ============================================

interface LeadTimeBreakdownProps {
  mode: ShippingMode;
}

function LeadTimeBreakdown({ mode }: LeadTimeBreakdownProps) {
  const segments =
    mode === 'sea'
      ? [
          { label: 'Mfg', days: 45, color: 'bg-sky-500/70' },
          { label: 'Ship', days: 35, color: 'bg-teal-500/70' },
          { label: 'Customs', days: 10, color: 'bg-amber-500/70' },
        ]
      : [
          { label: 'Mfg', days: 45, color: 'bg-sky-500/70' },
          { label: 'Ship', days: 5, color: 'bg-violet-500/70' },
          { label: 'Customs', days: 5, color: 'bg-amber-500/70' },
        ];

  const total = segments.reduce((sum, s) => sum + s.days, 0);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Lead Time Breakdown</span>
        <span className="font-semibold text-foreground">{total} days</span>
      </div>
      <div className="flex h-4 rounded-md overflow-hidden border border-border">
        {segments.map((seg) => {
          const widthPct = (seg.days / total) * 100;
          return (
            <motion.div
              key={`${mode}-${seg.label}`}
              className={cn('flex items-center justify-center', seg.color)}
              initial={{ width: 0 }}
              animate={{ width: `${widthPct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {widthPct > 12 && (
                <span className="text-[8px] font-bold text-white whitespace-nowrap">
                  {seg.label} {seg.days}d
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Before/After Visual Bars
// ============================================

interface ComparisonBarProps {
  label: string;
  seaValue: number;
  airValue: number;
  unit?: string;
  formatFn?: (v: number) => string;
}

function ComparisonBar({ label, seaValue, airValue, unit = '', formatFn }: ComparisonBarProps) {
  const max = Math.max(seaValue, airValue, 1);
  const display = formatFn || ((v: number) => v.toLocaleString('en-IN'));

  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="space-y-1">
        {/* Sea bar */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-6 text-right text-muted-foreground shrink-0">Sea</span>
          <div className="flex-1 h-3 bg-muted rounded-sm overflow-hidden">
            <motion.div
              className="h-full rounded-sm bg-chart-1"
              initial={{ width: 0 }}
              animate={{ width: `${(seaValue / max) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[10px] tabular-nums w-16 text-right shrink-0">
            {display(seaValue)}{unit}
          </span>
        </div>
        {/* Air bar */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-6 text-right text-muted-foreground shrink-0">Air</span>
          <div className="flex-1 h-3 bg-muted rounded-sm overflow-hidden">
            <motion.div
              className="h-full rounded-sm bg-chart-2"
              initial={{ width: 0 }}
              animate={{ width: `${(airValue / max) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            />
          </div>
          <span className="text-[10px] tabular-nums w-16 text-right shrink-0">
            {display(airValue)}{unit}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component: LeadTimeSimulator
// ============================================

interface LeadTimeSimulatorProps {
  className?: string;
}

export function LeadTimeSimulator({ className }: LeadTimeSimulatorProps) {
  const [mode, setMode] = useState<ShippingMode>('sea');
  const [selectedProductId, setSelectedProductId] = useState<string>(SAMPLE_PRODUCTS[0].id);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const selectedProduct = useMemo(
    () => SAMPLE_PRODUCTS.find((p) => p.id === selectedProductId) ?? SAMPLE_PRODUCTS[0],
    [selectedProductId]
  );

  // Simulation results for both modes
  const simulationPair: SimulationPair = useMemo(
    () => ({
      sea: simulateProduct(selectedProduct, 'sea'),
      air: simulateProduct(selectedProduct, 'air'),
    }),
    [selectedProduct]
  );

  const currentResult = mode === 'sea' ? simulationPair.sea : simulationPair.air;
  const previousResult = mode === 'sea' ? simulationPair.air : simulationPair.sea;

  // Handle toggle with brief recalculation animation
  const handleModeChange = useCallback((newMode: ShippingMode) => {
    if (newMode === mode) return;
    setIsRecalculating(true);
    setMode(newMode);
    // Brief visual feedback for recalculation
    setTimeout(() => setIsRecalculating(false), 400);
  }, [mode]);

  // Cost savings when switching to air
  const savingsMonthly = simulationPair.sea.holdingCostMonthly - simulationPair.air.holdingCostMonthly;
  const savingsPct =
    simulationPair.sea.holdingCostMonthly > 0
      ? ((savingsMonthly / simulationPair.sea.holdingCostMonthly) * 100).toFixed(1)
      : '0';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with segmented toggle */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Lead Time Simulator</CardTitle>
                <CardDescription>Sea vs Air shipping mode comparison</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShippingModeToggle value={mode} onChange={handleModeChange} />
              {isRecalculating && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin" />
                  <span className="text-xs text-primary font-medium">Recalculating...</span>
                </motion.div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Product selector + current product info */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-64 shrink-0">
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_PRODUCTS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono text-xs">{p.sku}</span>
                        <span className="truncate">{p.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedProduct.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Stock: <strong className="text-foreground">{selectedProduct.currentStock}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Demand: <strong className="text-foreground">{selectedProduct.avgDailyDemand}/day</strong>
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Cost: <strong className="text-foreground">{formatBDT(selectedProduct.unitCost)}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Warehouse className="h-3 w-3" />
                  {selectedProduct.supplier}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                  Reliability {(selectedProduct.reliability * 100).toFixed(0)}%
                </Badge>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Lead time breakdown */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedProduct.id}-${mode}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LeadTimeBreakdown mode={mode} />
            </motion.div>
          </AnimatePresence>

          <Separator />

          {/* Impact Summary Panel */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Impact Summary</h4>
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px] px-1.5 h-4',
                  mode === 'air'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                )}
              >
                {mode === 'air' ? 'Switching to Air' : 'Switching to Sea'}
              </Badge>
            </div>
            <div className="bg-muted/30 rounded-lg px-3 divide-y divide-border">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedProduct.id}-${mode}-impact`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                >
                  <ImpactMetricRow
                    label="Lead Time"
                    beforeValue={previousResult.leadTime}
                    afterValue={currentResult.leadTime}
                    unit="days"
                    icon={Clock}
                    isLowerBetter
                  />
                  <ImpactMetricRow
                    label="Safety Stock"
                    beforeValue={previousResult.safetyStock}
                    afterValue={currentResult.safetyStock}
                    unit="units"
                    icon={Package}
                    isLowerBetter
                  />
                  <ImpactMetricRow
                    label="Buffer Inventory"
                    beforeValue={previousResult.bufferInventory}
                    afterValue={currentResult.bufferInventory}
                    unit="units"
                    icon={Warehouse}
                    isLowerBetter
                  />
                  <ImpactMetricRow
                    label="Holding Cost"
                    beforeValue={previousResult.holdingCostMonthly}
                    afterValue={currentResult.holdingCostMonthly}
                    unit="BDT/mo"
                    icon={DollarSign}
                    isLowerBetter
                    formatFn={(v) => formatBDT(v)}
                  />
                  <ImpactMetricRow
                    label="EOQ"
                    beforeValue={previousResult.eoq}
                    afterValue={currentResult.eoq}
                    unit="units"
                    icon={Calculator}
                    isLowerBetter={false}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Savings callout when in air mode */}
          <AnimatePresence>
            {mode === 'air' && savingsMonthly > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <TrendingDown className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      Monthly savings of {formatBDT(savingsMonthly)}
                    </span>
                    <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80 ml-2">
                      ({savingsPct}% reduction in holding cost)
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Separator />

          {/* Visual Buffer Inventory Bar */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Inventory Position ({mode === 'sea' ? 'Sea' : 'Air'} mode parameters)
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedProduct.id}-${mode}-buffer`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <BufferInventoryBar
                  currentStock={selectedProduct.currentStock}
                  safetyStock={currentResult.safetyStock}
                  reorderPoint={currentResult.reorderPoint}
                  maxStock={Math.round(
                    currentResult.eoq + currentResult.safetyStock * 1.5
                  )}
                  mode={mode}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Bottom row: Cost Comparison Chart + Before/After Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost Comparison Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Cost Comparison</CardTitle>
            </div>
            <CardDescription>Monthly cost breakdown by shipping mode</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedProduct.id}-chart`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CostComparisonChart
                  seaResult={simulationPair.sea}
                  airResult={simulationPair.air}
                  unitCost={selectedProduct.unitCost}
                />
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Before/After Visual Bars */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Sea vs Air Metrics</CardTitle>
            </div>
            <CardDescription>Visual comparison of key parameters</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedProduct.id}-bars`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <ComparisonBar
                  label="Lead Time (days)"
                  seaValue={simulationPair.sea.leadTime}
                  airValue={simulationPair.air.leadTime}
                  unit="d"
                />
                <ComparisonBar
                  label="Safety Stock (units)"
                  seaValue={simulationPair.sea.safetyStock}
                  airValue={simulationPair.air.safetyStock}
                />
                <ComparisonBar
                  label="Holding Cost (BDT/mo)"
                  seaValue={simulationPair.sea.holdingCostMonthly}
                  airValue={simulationPair.air.holdingCostMonthly}
                  formatFn={(v) => formatBDTShort(v)}
                />
                <ComparisonBar
                  label="Reorder Point"
                  seaValue={simulationPair.sea.reorderPoint}
                  airValue={simulationPair.air.reorderPoint}
                />
                <ComparisonBar
                  label="EOQ"
                  seaValue={simulationPair.sea.eoq}
                  airValue={simulationPair.air.eoq}
                />
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* Formula reference footer */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[10px] text-muted-foreground">
            <span className="font-medium">Formulas:</span>
            <span>
              SS = k * sqrt(mu_t * sigma_d^2 + mu_d^2 * sigma_t^2)
            </span>
            <span className="hidden sm:inline">|</span>
            <span>
              EOQ = sqrt(2DS / h)
            </span>
            <span className="hidden sm:inline">|</span>
            <span>
              k = 1.65 (95% SL) | h = 25% annual | sigma_T: Sea=15d, Air=5d
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LeadTimeSimulator;
