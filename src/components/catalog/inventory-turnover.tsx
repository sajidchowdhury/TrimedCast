'use client';

// ============================================
// TrimedCast — Inventory Turnover Analysis Component
// Session 28: Product Catalog & Inventory Intelligence
// ============================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Award,
  AlertCircle,
  RotateCw,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useCatalogStore } from '@/stores/catalog-store';
import type { InventoryTurnover, Improvement } from '@/components/catalog/types';

// ─── Constants ─────────────────────────────────────────────────

const INDUSTRY_BENCHMARK = 4.2; // BD auto parts industry avg turnover

// ─── Helpers ───────────────────────────────────────────────────

function formatBDT(value: number): string {
  return '৳' + value.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatRate(value: number): string {
  return value.toFixed(1) + 'x';
}

function getTurnoverColor(rate: number): { text: string; bg: string; bar: string } {
  if (rate > 6) return { text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-500', bar: 'bg-emerald-500' };
  if (rate > 3) return { text: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-500', bar: 'bg-sky-500' };
  if (rate > 1.5) return { text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-500', bar: 'bg-amber-500' };
  return { text: 'text-red-700 dark:text-red-300', bg: 'bg-red-500', bar: 'bg-red-500' };
}

function getImprovementIcon(improvement: Improvement, pct: number): React.ReactNode {
  if (improvement === 'up') {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400">
        <ArrowUp className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{pct.toFixed(1)}%</span>
      </span>
    );
  }
  if (improvement === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 text-red-700 dark:text-red-400">
        <ArrowDown className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{pct.toFixed(1)}%</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground">
      <Minus className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{pct.toFixed(1)}%</span>
    </span>
  );
}

// ─── Animation Variants ────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Component ─────────────────────────────────────────────────

export function InventoryTurnoverAnalysis() {
  const turnover = useCatalogStore((s) => s.turnover);

  // Sorted by turnover rate descending
  const sortedTurnover = useMemo(() => {
    return [...turnover].sort((a, b) => b.turnoverRate - a.turnoverRate);
  }, [turnover]);

  // Overall metrics
  const avgTurnoverRate = useMemo(() => {
    if (turnover.length === 0) return 0;
    const total = turnover.reduce((sum, t) => sum + t.turnoverRate, 0);
    return Math.round((total / turnover.length) * 10) / 10;
  }, [turnover]);

  const bestCategory = useMemo((): InventoryTurnover | null => {
    if (sortedTurnover.length === 0) return null;
    return sortedTurnover[0];
  }, [sortedTurnover]);

  const worstCategory = useMemo((): InventoryTurnover | null => {
    if (sortedTurnover.length === 0) return null;
    return sortedTurnover[sortedTurnover.length - 1];
  }, [sortedTurnover]);

  // Max turnover for bar chart scaling
  const maxTurnover = useMemo(() => {
    if (sortedTurnover.length === 0) return 10;
    return Math.max(...sortedTurnover.map((t) => t.turnoverRate), INDUSTRY_BENCHMARK);
  }, [sortedTurnover]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Turnover</h2>
          <p className="text-sm text-muted-foreground">ইনভেন্টরি টার্নওভার</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <RotateCw className="h-3.5 w-3.5 mr-1.5" />
          {turnover.length} Categories
        </Badge>
      </motion.div>

      {/* ── Overall Metrics (3 cards) ───────────────────────── */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {/* Avg Turnover Rate */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Turnover Rate</p>
                  <p className="text-3xl font-bold mt-1">{formatRate(avgTurnoverRate)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Industry avg: {formatRate(INDUSTRY_BENCHMARK)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center">
                  <RotateCw className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Best Category */}
        <motion.div variants={itemVariants}>
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Best Category</p>
                  <p className="text-lg font-bold mt-1 text-emerald-700 dark:text-emerald-300">
                    {bestCategory?.category ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bestCategory?.categoryBn ?? ''} · {bestCategory ? formatRate(bestCategory.turnoverRate) : ''}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Worst Category */}
        <motion.div variants={itemVariants}>
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Worst Category</p>
                  <p className="text-lg font-bold mt-1 text-red-700 dark:text-red-300">
                    {worstCategory?.category ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {worstCategory?.categoryBn ?? ''} · {worstCategory ? formatRate(worstCategory.turnoverRate) : ''}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Category Table (desktop) / Cards (mobile) ──────── */}
      <motion.div variants={itemVariants}>
        {/* Desktop Table */}
        <div className="hidden md:block">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Category</TableHead>
                    <TableHead className="text-center">Turnover Rate</TableHead>
                    <TableHead className="text-center">Avg Days to Sell</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                    <TableHead className="text-right">COGS 12M</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTurnover.map((item, idx) => {
                    const colorConfig = getTurnoverColor(item.turnoverRate);
                    return (
                      <TableRow key={item.category}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{item.category}</span>
                            <span className="text-xs text-muted-foreground">{item.categoryBn}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={`${colorConfig.text} font-semibold`}
                          >
                            {formatRate(item.turnoverRate)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {item.avgDaysToSell} days
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatBDT(item.stockValue)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatBDT(item.cogs12m)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getImprovementIcon(item.improvement, item.improvementPct)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {sortedTurnover.map((item) => {
            const colorConfig = getTurnoverColor(item.turnoverRate);
            return (
              <Card key={item.category}>
                <CardContent className="pt-4 pb-4 space-y-3">
                  {/* Category name */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{item.category}</p>
                      <p className="text-xs text-muted-foreground">{item.categoryBn}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`${colorConfig.text} font-semibold`}
                    >
                      {formatRate(item.turnoverRate)}
                    </Badge>
                  </div>
                  {/* Metrics row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Days to Sell</p>
                      <p className="text-sm font-semibold">{item.avgDaysToSell}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Stock Value</p>
                      <p className="text-sm font-semibold">{formatBDT(item.stockValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">COGS 12M</p>
                      <p className="text-sm font-semibold">{formatBDT(item.cogs12m)}</p>
                    </div>
                  </div>
                  {/* Trend */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Trend</span>
                    {getImprovementIcon(item.improvement, item.improvementPct)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* ── Turnover Bar Chart (horizontal) ─────────────────── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Turnover by Category</CardTitle>
                <p className="text-xs text-muted-foreground">Sorted by turnover rate (highest first)</p>
              </div>
              <Badge variant="outline" className="text-xs gap-1">
                <Target className="h-3 w-3" />
                Industry: {formatRate(INDUSTRY_BENCHMARK)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-3">
              {sortedTurnover.map((item, idx) => {
                const colorConfig = getTurnoverColor(item.turnoverRate);
                const barWidth = (item.turnoverRate / maxTurnover) * 100;
                const benchmarkWidth = (INDUSTRY_BENCHMARK / maxTurnover) * 100;

                return (
                  <div key={item.category} className="space-y-1">
                    {/* Label row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{item.category}</span>
                        <span className="text-xs text-muted-foreground">{item.categoryBn}</span>
                      </div>
                      <span className={`text-sm font-bold ${colorConfig.text}`}>
                        {formatRate(item.turnoverRate)}
                      </span>
                    </div>
                    {/* Bar row */}
                    <div className="relative w-full">
                      <div className="w-full bg-muted rounded-full h-5 overflow-hidden">
                        <motion.div
                          className={`h-5 rounded-full ${colorConfig.bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.06 }}
                        />
                      </div>
                      {/* Industry benchmark line */}
                      <div
                        className="absolute top-0 h-5 flex items-center"
                        style={{ left: `${benchmarkWidth}%` }}
                      >
                        <div className="w-0.5 h-5 bg-foreground/40" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Benchmark legend */}
            <Separator className="my-4" />
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-foreground/40" />
              <span className="text-xs text-muted-foreground">
                BD auto parts industry avg: {formatRate(INDUSTRY_BENCHMARK)}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Industry Benchmark Comparison Card ──────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
          <CardContent className="pt-5 pb-5">
            <div className="flex gap-3">
              <div className="shrink-0 h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-sm">Industry Benchmark Comparison</p>
                <p className="text-sm text-muted-foreground">
                  BD auto parts industry avg: <span className="font-bold">{formatRate(INDUSTRY_BENCHMARK)}</span>
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sortedTurnover.map((item) => {
                    const isAbove = item.turnoverRate >= INDUSTRY_BENCHMARK;
                    return (
                      <Badge
                        key={item.category}
                        variant={isAbove ? 'default' : 'destructive'}
                        className="text-xs gap-1"
                      >
                        {isAbove ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {item.category}: {formatRate(item.turnoverRate)}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />
    </motion.div>
  );
}

export default InventoryTurnoverAnalysis;
