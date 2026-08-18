'use client';

// ============================================
// TrimedCast — Cost to Serve Analysis Component
// Session 26: Financial Analytics & Cost Intelligence
// ============================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  TrendingUp,
  TrendingDown,
  MapPin,
  Package,
  ShoppingCart,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { useFinanceStore } from '@/stores/finance-store';
import type { CostToServe } from '@/components/finance/types';
import { formatBDT, formatPct } from '@/components/finance/types';

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Helpers ─────────────────────────────────────────────────────────

function getCtsColor(ratio: number): string {
  if (ratio < 16) return 'text-emerald-600';
  if (ratio < 20) return 'text-sky-600';
  if (ratio < 24) return 'text-amber-600';
  return 'text-red-600';
}

function getCtsBg(ratio: number): string {
  if (ratio < 16) return 'bg-emerald-50';
  if (ratio < 20) return 'bg-sky-50';
  if (ratio < 24) return 'bg-amber-50';
  return 'bg-red-50';
}

function getCtsBadgeClasses(ratio: number): string {
  if (ratio < 16) return 'bg-emerald-100 text-emerald-800 border-emerald-300 border';
  if (ratio < 20) return 'bg-sky-100 text-sky-800 border-sky-300 border';
  if (ratio < 24) return 'bg-amber-100 text-amber-800 border-amber-300 border';
  return 'bg-red-100 text-red-800 border-red-300 border';
}

function getCtsBarColor(ratio: number): string {
  if (ratio < 16) return 'bg-emerald-500';
  if (ratio < 20) return 'bg-sky-500';
  if (ratio < 24) return 'bg-amber-500';
  return 'bg-red-500';
}

function getCtsZone(ratio: number): string {
  if (ratio < 16) return 'emerald';
  if (ratio < 20) return 'sky';
  if (ratio < 24) return 'amber';
  return 'red';
}

// ─── Component ───────────────────────────────────────────────────────

export function CostToServePanel() {
  const costToServe = useFinanceStore((s) => s.costToServe);

  // ── Computed summaries ────────────────────────────────────────────
  const summaries = useMemo(() => {
    if (costToServe.length === 0) {
      return { avgCts: 0, bestName: '-', bestNameBn: '-', worstName: '-', worstNameBn: '-' };
    }
    const avgCts = costToServe.reduce((s, c) => s + c.ctsRatio, 0) / costToServe.length;
    const sorted = [...costToServe].sort((a, b) => a.ctsRatio - b.ctsRatio);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    return {
      avgCts,
      bestName: best.customerName,
      bestNameBn: best.customerNameBn,
      worstName: worst.customerName,
      worstNameBn: worst.customerNameBn,
    };
  }, [costToServe]);

  // ── Distribution zones ────────────────────────────────────────────
  const distribution = useMemo(() => {
    const zones = { emerald: 0, sky: 0, amber: 0, red: 0 };
    for (const c of costToServe) {
      const zone = getCtsZone(c.ctsRatio);
      zones[zone]++;
    }
    return zones;
  }, [costToServe]);

  const totalCustomers = costToServe.length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100">
          <Target className="h-5 w-5 text-rose-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Cost to Serve</h2>
          <p className="text-sm text-muted-foreground">সেবা খরচ</p>
        </div>
      </motion.div>

      {/* ── Summary Cards ──────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
      >
        {/* Avg CTS Ratio */}
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs font-medium text-muted-foreground">Avg CTS Ratio</p>
            <p className={`mt-1 text-lg font-bold ${getCtsColor(summaries.avgCts)}`}>
              {summaries.avgCts.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">গড় সেবা খরচ অনুপাত</p>
          </CardContent>
        </Card>

        {/* Best Customer */}
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="flex items-center gap-1.5 text-emerald-500">
              <TrendingUp className="h-3.5 w-3.5" />
              <p className="text-xs font-medium">Best Customer</p>
            </div>
            <p className="mt-1 text-sm font-bold text-emerald-700">{summaries.bestName}</p>
            <p className="text-xs text-muted-foreground">{summaries.bestNameBn}</p>
          </CardContent>
        </Card>

        {/* Worst Customer */}
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="flex items-center gap-1.5 text-red-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              <p className="text-xs font-medium">Worst Customer</p>
            </div>
            <p className="mt-1 text-sm font-bold text-red-700">{summaries.worstName}</p>
            <p className="text-xs text-muted-foreground">{summaries.worstNameBn}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Customer Cards ─────────────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {costToServe.map((cts, idx) => (
          <CustomerCard key={cts.id} cts={cts} index={idx} />
        ))}
      </motion.div>

      {/* ── CTS Distribution ───────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm font-semibold">CTS Distribution</CardTitle>
            <CardDescription>
              সেবা খরচ বন্টন — গ্রাহক সংখ্যা অনুযায়ী জোন
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <div className="space-y-3">
              {/* Stacked horizontal bar */}
              <div className="flex h-8 rounded-lg overflow-hidden">
                {totalCustomers > 0 && (
                  <>
                    {/* Emerald zone <16% */}
                    <div
                      className="bg-emerald-400 flex items-center justify-center transition-all"
                      style={{ width: `${(distribution.emerald / totalCustomers) * 100}%` }}
                    >
                      {distribution.emerald > 0 && (
                        <span className="text-xs font-bold text-emerald-900">
                          {distribution.emerald}
                        </span>
                      )}
                    </div>
                    {/* Sky zone 16-20% */}
                    <div
                      className="bg-sky-400 flex items-center justify-center transition-all"
                      style={{ width: `${(distribution.sky / totalCustomers) * 100}%` }}
                    >
                      {distribution.sky > 0 && (
                        <span className="text-xs font-bold text-sky-900">
                          {distribution.sky}
                        </span>
                      )}
                    </div>
                    {/* Amber zone 20-24% */}
                    <div
                      className="bg-amber-400 flex items-center justify-center transition-all"
                      style={{ width: `${(distribution.amber / totalCustomers) * 100}%` }}
                    >
                      {distribution.amber > 0 && (
                        <span className="text-xs font-bold text-amber-900">
                          {distribution.amber}
                        </span>
                      )}
                    </div>
                    {/* Red zone >=24% */}
                    <div
                      className="bg-red-400 flex items-center justify-center transition-all"
                      style={{ width: `${(distribution.red / totalCustomers) * 100}%` }}
                    >
                      {distribution.red > 0 && (
                        <span className="text-xs font-bold text-red-900">
                          {distribution.red}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                  <span className="text-muted-foreground">&lt;16% Excellent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-sky-400" />
                  <span className="text-muted-foreground">16-20% Good</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                  <span className="text-muted-foreground">20-24% Fair</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-red-400" />
                  <span className="text-muted-foreground">&ge;24% Poor</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─── Customer Card Sub-component ─────────────────────────────────────

function CustomerCard({ cts, index }: { cts: CostToServe; index: number }) {
  // Mini bar chart: Revenue vs CTS
  const maxVal = Math.max(cts.revenue, cts.costToServe, 1);
  const revenueWidth = (cts.revenue / maxVal) * 100;
  const ctsWidth = (cts.costToServe / maxVal) * 100;
  const netMargin = cts.margin - cts.ctsRatio;

  return (
    <motion.div variants={itemVariants}>
      <Card className="py-4 h-full">
        <CardContent className="px-4 space-y-3">
          {/* Customer Name + CTS Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{cts.customerName}</p>
              <p className="text-xs text-muted-foreground">{cts.customerNameBn}</p>
            </div>
            <Badge className={`${getCtsBadgeClasses(cts.ctsRatio)} text-[10px] px-1.5 shrink-0`}>
              {cts.ctsRatio.toFixed(1)}%
            </Badge>
          </div>

          <Separator />

          {/* Region */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{cts.region}</span>
            <span className="text-muted-foreground/60">({cts.regionBn})</span>
          </div>

          {/* Revenue & CTS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</p>
              <p className="text-sm font-semibold font-mono">{formatBDT(cts.revenue)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cost to Serve</p>
              <p className="text-sm font-semibold font-mono">{formatBDT(cts.costToServe)}</p>
            </div>
          </div>

          {/* CTS Ratio */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">CTS Ratio</p>
            <p className={`text-sm font-bold ${getCtsColor(cts.ctsRatio)}`}>
              {cts.ctsRatio.toFixed(1)}%
            </p>
          </div>

          {/* Net Margin */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net Margin (after CTS)</p>
            <p className={`text-sm font-semibold ${netMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {netMargin.toFixed(1)}%
            </p>
          </div>

          {/* Product & Order Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px] gap-1">
              <Package className="h-3 w-3" />
              {cts.productCount} products
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1">
              <ShoppingCart className="h-3 w-3" />
              {cts.orderCount} orders
            </Badge>
          </div>

          {/* Avg Order Value */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Order Value</p>
            <p className="text-xs font-semibold font-mono">{formatBDT(cts.avgOrderValue)}</p>
          </div>

          {/* Mini Bar: Revenue vs CTS */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-10">Rev</span>
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${revenueWidth}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-10">CTS</span>
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${getCtsBarColor(cts.ctsRatio)}`}
                  style={{ width: `${ctsWidth}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default CostToServePanel;
