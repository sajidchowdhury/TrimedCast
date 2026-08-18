'use client';

// ============================================
// TrimedCast — Product Lifecycle & Demand Variability
// Session 28: Product Catalog & Inventory Intelligence
// ============================================

import { motion } from 'framer-motion';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  ArrowRight,
  Sparkline,
  Megaphone,
  Shield,
  Percent,
  Power,
  BarChart3,
  Flame,
  Waves,
  Shuffle,
  CircleDot,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useCatalogStore } from '@/stores/catalog-store';
import type {
  LifecycleProduct,
  DemandVariability,
  LifecycleStage,
  RevenueTrend,
  LifecycleAction,
  DemandPattern,
} from '@/components/catalog/types';
import {
  formatBDT,
  LIFECECYCLE_CONFIG,
  DEMAND_PATTERN_CONFIG,
  getLifecycleClasses,
  getDemandPatternClasses,
} from '@/components/catalog/types';

// ─── Animation Variants ──────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Lifecycle Stage Config (local, richer) ─────────────────────

const LIFECYCLE_STAGES: LifecycleStage[] = [
  'introduction',
  'growth',
  'maturity',
  'decline',
  'discontinued',
];

const STAGE_DISPLAY: Record<LifecycleStage, { label: string; labelBn: string; color: string; bg: string; text: string }> = {
  introduction: {
    label: 'Introduction',
    labelBn: 'প্রবেশ পর্যায়',
    color: 'blue',
    bg: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
  },
  growth: {
    label: 'Growth',
    labelBn: 'বৃদ্ধি পর্যায়',
    color: 'emerald',
    bg: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  maturity: {
    label: 'Maturity',
    labelBn: 'পরিণতি পর্যায়',
    color: 'sky',
    bg: 'bg-sky-500',
    text: 'text-sky-700 dark:text-sky-300',
  },
  decline: {
    label: 'Decline',
    labelBn: 'পতন পর্যায়',
    color: 'amber',
    bg: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  discontinued: {
    label: 'Discontinued',
    labelBn: 'বন্ধ',
    color: 'red',
    bg: 'bg-red-500',
    text: 'text-red-700 dark:text-red-300',
  },
};

// Funnel widths: narrower at intro/discontinued, wider at maturity
const FUNNEL_WIDTHS: Record<LifecycleStage, string> = {
  introduction: 'w-[40%]',
  growth: 'w-[65%]',
  maturity: 'w-[85%]',
  decline: 'w-[65%]',
  discontinued: 'w-[40%]',
};

// ─── Revenue Trend Config ───────────────────────────────────────

const TREND_CONFIG: Record<RevenueTrend, { icon: React.ReactNode; color: string }> = {
  up: { icon: <TrendingUp className="h-4 w-4" />, color: 'text-emerald-600 dark:text-emerald-400' },
  down: { icon: <TrendingDown className="h-4 w-4" />, color: 'text-red-600 dark:text-red-400' },
  flat: { icon: <Minus className="h-4 w-4" />, color: 'text-gray-500 dark:text-gray-400' },
  stable: { icon: <Activity className="h-4 w-4" />, color: 'text-sky-600 dark:text-sky-400' },
};

// ─── Lifecycle Action Config ────────────────────────────────────

const ACTION_STYLES: Record<LifecycleAction, { bg: string; text: string; icon: React.ReactNode }> = {
  promote: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: <Megaphone className="h-3 w-3" />,
  },
  maintain: {
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    text: 'text-sky-700 dark:text-sky-300',
    icon: <Shield className="h-3 w-3" />,
  },
  discount: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    icon: <Percent className="h-3 w-3" />,
  },
  'phase-out': {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    icon: <Power className="h-3 w-3" />,
  },
};

// ─── Demand Pattern Config ──────────────────────────────────────

const PATTERN_STYLES: Record<DemandPattern, { bg: string; text: string; icon: React.ReactNode }> = {
  stable: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: <Activity className="h-3 w-3" />,
  },
  seasonal: {
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    text: 'text-sky-700 dark:text-sky-300',
    icon: <Waves className="h-3 w-3" />,
  },
  erratic: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    icon: <Shuffle className="h-3 w-3" />,
  },
  intermittent: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    icon: <CircleDot className="h-3 w-3" />,
  },
};

const PATTERN_LABELS: Record<DemandPattern, string> = {
  stable: 'স্থিতিশীল',
  seasonal: 'মৌসুমী',
  erratic: 'অনিয়মিত',
  intermittent: 'বিচ্ছিন্ন',
};

// ─── Sparkline SVG ──────────────────────────────────────────────

function MiniSparkline({
  data,
  width = 100,
  height = 28,
  color = 'currentColor',
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data
    .map((val, i) => {
      const x = i * stepX;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Mini Bar Chart SVG ─────────────────────────────────────────

function MiniBarChart({
  data,
  width = 120,
  height = 32,
  barColor = 'currentColor',
}: {
  data: number[];
  width?: number;
  height?: number;
  barColor?: string;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const barW = Math.max((width / data.length) - 2, 2);
  const gap = 2;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {data.map((val, i) => {
        const barH = (val / max) * (height - 2);
        const x = i * (barW + gap);
        const y = height - barH;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={barH}
            fill={barColor}
            rx={1}
            opacity={0.7 + (val / max) * 0.3}
          />
        );
      })}
    </svg>
  );
}

// ─── Generate mock 12-month data ────────────────────────────────

function generateRevenueData(trend: RevenueTrend, avgMonthly: number): number[] {
  const base = avgMonthly;
  const months: number[] = [];
  for (let i = 0; i < 12; i++) {
    const noise = (Math.random() - 0.5) * base * 0.2;
    let val: number;
    switch (trend) {
      case 'up':
        val = base * (0.6 + (i / 12) * 0.8) + noise;
        break;
      case 'down':
        val = base * (1.2 - (i / 12) * 0.7) + noise;
        break;
      case 'stable':
        val = base + noise;
        break;
      case 'flat':
      default:
        val = base + noise * 0.5;
        break;
    }
    months.push(Math.max(Math.round(val), 0));
  }
  return months;
}

function generateDemandData(pattern: DemandPattern, avg: number, max: number, min: number, zeroMonths: number): number[] {
  const months: number[] = [];
  const zeroIndices = new Set<number>();
  // Place zero-demand months somewhat evenly
  for (let z = 0; z < zeroMonths && z < 12; z++) {
    zeroIndices.add(Math.floor((z / zeroMonths) * 12));
  }

  for (let i = 0; i < 12; i++) {
    if (zeroIndices.has(i)) {
      months.push(0);
      continue;
    }
    switch (pattern) {
      case 'stable':
        months.push(avg + Math.round((Math.random() - 0.5) * (max - min) * 0.3));
        break;
      case 'seasonal': {
        const seasonalFactor = 1 + 0.5 * Math.sin((i / 12) * Math.PI * 2);
        months.push(Math.round(avg * seasonalFactor));
        break;
      }
      case 'erratic':
        months.push(Math.round(min + Math.random() * (max - min)));
        break;
      case 'intermittent':
        months.push(Math.random() > 0.4 ? Math.round(min + Math.random() * (max - min) * 0.6) : 0);
        break;
    }
  }
  return months;
}

// ─── Component ──────────────────────────────────────────────────

export function ProductLifecyclePanel() {
  const { lifecycle, demandVar } = useCatalogStore();

  // Count products per stage
  const stageCounts = LIFECYCLE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = lifecycle.filter((lp) => lp.stage === stage).length;
      return acc;
    },
    {} as Record<LifecycleStage, number>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
          <RefreshCw className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Product Lifecycle</h2>
          <p className="text-sm text-muted-foreground">পণ্য জীবনচক্র</p>
        </div>
      </motion.div>

      {/* Lifecycle Funnel */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Lifecycle Funnel</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col items-center gap-1">
              {LIFECYCLE_STAGES.map((stage, idx) => {
                const config = STAGE_DISPLAY[stage];
                const count = stageCounts[stage];
                return (
                  <motion.div
                    key={stage}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.12, duration: 0.5 }}
                    className={`relative ${FUNNEL_WIDTHS[stage]} flex items-center justify-center rounded-md py-2.5 ${config.bg} text-white`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{LIFECECYCLE_CONFIG[stage].icon}</span>
                      <span className="font-semibold text-sm">{config.label}</span>
                      <Badge className="bg-white/20 text-white border-white/30 text-xs">
                        {count} products
                      </Badge>
                    </div>
                    {idx < LIFECYCLE_STAGES.length - 1 && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10">
                        <ArrowRight className="h-3 w-3 text-muted-foreground rotate-90" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Lifecycle Product Cards (2-col grid on desktop) */}
      <motion.div variants={containerVariants} className="space-y-3">
        <motion.h3 variants={itemVariants} className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-sky-500" />
          Lifecycle Products
        </motion.h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lifecycle.map((lp: LifecycleProduct, idx: number) => (
            <LifecycleProductCard key={lp.product.id} lp={lp} index={idx} />
          ))}
        </div>
      </motion.div>

      {/* Demand Variability Section */}
      <motion.div variants={containerVariants} className="space-y-3">
        <Separator />
        <motion.h3 variants={itemVariants} className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-500" />
          Demand Variability
        </motion.h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demandVar.map((dv: DemandVariability, idx: number) => (
            <DemandVariabilityCard key={dv.product.id} dv={dv} index={idx} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Lifecycle Product Card ─────────────────────────────────────

function LifecycleProductCard({ lp, index }: { lp: LifecycleProduct; index: number }) {
  const { product, stage, stageBn, monthsInStage, predictedNextStage, revenueTrend, action, actionBn } = lp;

  const stageInfo = STAGE_DISPLAY[stage];
  const lifecycleStyles = getLifecycleClasses(stage);
  const trend = TREND_CONFIG[revenueTrend];
  const actionStyle = ACTION_STYLES[action];

  // Generate mock 12-month revenue data for sparkline
  const revenueData = generateRevenueData(revenueTrend, product.avgMonthlyDemand * product.unitPrice / 100);

  const sparklineColor =
    revenueTrend === 'up'
      ? '#10b981'
      : revenueTrend === 'down'
        ? '#ef4444'
        : revenueTrend === 'stable'
          ? '#0ea5e9'
          : '#9ca3af';

  return (
    <motion.div variants={itemVariants}>
      <Card className="h-full border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          {/* Product Name + SKU + Bengali */}
          <div className="space-y-0.5">
            <p className="font-semibold text-sm leading-tight">{product.name}</p>
            <p className="text-xs text-muted-foreground">{product.nameBn}</p>
            <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
          </div>

          {/* Current Stage Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`gap-1 text-xs ${lifecycleStyles.bg} ${lifecycleStyles.text}`}
            >
              <span>{LIFECECYCLE_CONFIG[stage].icon}</span>
              {stageBn}
            </Badge>

            {/* Months in Stage */}
            <span className="text-xs text-muted-foreground">
              {monthsInStage} mo
            </span>
          </div>

          {/* Predicted Next Stage */}
          {predictedNextStage && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowRight className="h-3 w-3" />
              <span>Next:</span>
              <Badge
                variant="outline"
                className={`text-[10px] ${getLifecycleClasses(predictedNextStage).bg} ${getLifecycleClasses(predictedNextStage).text}`}
              >
                {STAGE_DISPLAY[predictedNextStage].labelBn}
              </Badge>
            </div>
          )}

          {/* Revenue Trend Arrow */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Revenue Trend</span>
            <span className={`flex items-center gap-1 ${trend.color}`}>
              {trend.icon}
            </span>
          </div>

          {/* Recommended Action Badge */}
          <Badge
            variant="outline"
            className={`gap-1 text-xs w-fit ${actionStyle.bg} ${actionStyle.text}`}
          >
            {actionStyle.icon}
            {actionBn}
          </Badge>

          {/* 12-month Mini Sparkline */}
          <div className="pt-1">
            <p className="text-[10px] text-muted-foreground mb-1">12-Month Revenue</p>
            <MiniSparkline
              data={revenueData}
              width={140}
              height={28}
              color={sparklineColor}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Demand Variability Card ────────────────────────────────────

function DemandVariabilityCard({ dv, index }: { dv: DemandVariability; index: number }) {
  const { product, cv, demandPattern, avgDemand, maxDemand, minDemand, zeroDemandMonths } = dv;

  const patternStyle = PATTERN_STYLES[demandPattern];
  const patternLabel = PATTERN_LABELS[demandPattern];
  const demandClasses = getDemandPatternClasses(demandPattern);

  // Generate mock 12-month demand data for bar chart
  const demandData = generateDemandData(demandPattern, avgDemand, maxDemand, minDemand, zeroDemandMonths);

  const barColor =
    demandPattern === 'stable'
      ? '#10b981'
      : demandPattern === 'seasonal'
        ? '#0ea5e9'
        : demandPattern === 'erratic'
          ? '#f59e0b'
          : '#ef4444';

  return (
    <motion.div variants={itemVariants}>
      <Card className="h-full border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          {/* Product Name */}
          <div className="space-y-0.5">
            <p className="font-semibold text-sm leading-tight">{product.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
          </div>

          {/* CV Value + Pattern Badge */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">CV (Coefficient of Variation)</p>
              <p className="text-lg font-bold text-foreground">{cv.toFixed(2)}</p>
            </div>
            <Badge
              variant="outline"
              className={`gap-1 text-xs ${demandClasses.bg} ${demandClasses.text}`}
            >
              {patternStyle.icon}
              {patternLabel}
            </Badge>
          </div>

          {/* Demand Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">Avg</p>
              <p className="text-sm font-semibold">{avgDemand}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">Max</p>
              <p className="text-sm font-semibold text-foreground">{maxDemand}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground">Min</p>
              <p className="text-sm font-semibold text-foreground">{minDemand}</p>
            </div>
          </div>

          {/* Zero Demand Months */}
          {zeroDemandMonths > 0 && (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
                {zeroDemandMonths} zero-demand months
              </Badge>
            </div>
          )}

          {/* Mini Bar Chart */}
          <div className="pt-1">
            <p className="text-[10px] text-muted-foreground mb-1">12-Month Demand Profile</p>
            <MiniBarChart
              data={demandData}
              width={120}
              height={32}
              barColor={barColor}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ProductLifecyclePanel;
