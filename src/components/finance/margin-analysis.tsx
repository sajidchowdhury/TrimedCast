'use client';

// ============================================
// TrimedCast — Margin Analysis Panel
// Session 26: Financial Analytics & Cost Intelligence Dashboard
// ============================================

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowUpDown, TrendingUp, TrendingDown, Minus, BarChart3, DollarSign, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFinanceStore } from '@/stores/finance-store';
import type { MarginAnalysis, TrendDirection } from '@/components/finance/types';
import { formatBDT, formatPct } from '@/components/finance/types';

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Helpers ─────────────────────────────────────────────────────────

function marginColor(margin: number): string {
  if (margin > 35) return 'text-emerald-600';
  if (margin > 25) return 'text-sky-600';
  if (margin > 20) return 'text-amber-600';
  return 'text-red-600';
}

function marginBg(margin: number): string {
  if (margin > 35) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (margin > 25) return 'bg-sky-100 text-sky-800 border-sky-300';
  if (margin > 20) return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-red-100 text-red-800 border-red-300';
}

function TrendIcon({ trend }: { trend: TrendDirection }) {
  if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />;
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-600" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

// ─── Margin Distribution Bar ─────────────────────────────────────────

function MarginDistributionBar({ margins }: { margins: MarginAnalysis[] }) {
  // Group by product category, compute weighted margin
  const categoryData = useMemo(() => {
    const map = new Map<string, { category: string; categoryBn: string; revenue: number; grossProfit: number }>();
    for (const m of margins) {
      const existing = map.get(m.productCategory);
      if (existing) {
        existing.revenue += m.revenue;
        existing.grossProfit += m.grossProfit;
      } else {
        map.set(m.productCategory, {
          category: m.productCategory,
          categoryBn: m.productCategoryBn,
          revenue: m.revenue,
          grossProfit: m.grossProfit,
        });
      }
    }
    return Array.from(map.values())
      .map((d) => ({
        ...d,
        margin: d.revenue > 0 ? (d.grossProfit / d.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.margin - a.margin);
  }, [margins]);

  const totalRevenue = categoryData.reduce((s, d) => s + d.revenue, 0);
  const barColors = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#ec4899', '#14b8a6'];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Margin Distribution by Category</p>
      {/* Stacked bar */}
      <div className="flex h-6 rounded-full overflow-hidden">
        {categoryData.map((d, i) => {
          const widthPct = totalRevenue > 0 ? (d.revenue / totalRevenue) * 100 : 0;
          return (
            <motion.div
              key={d.category}
              className="relative group"
              style={{ backgroundColor: barColors[i % barColors.length], width: `${widthPct}%` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.05 }}
              title={`${d.category}: ${formatPct(d.margin)} margin, ${formatBDT(d.revenue)} revenue`}
            >
              {/* Hover label */}
              <div className="absolute inset-x-0 -top-8 hidden group-hover:flex justify-center">
                <span className="text-[10px] bg-foreground text-background px-1.5 py-0.5 rounded whitespace-nowrap">
                  {d.category} {formatPct(d.margin)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {categoryData.map((d, i) => (
          <div key={d.category} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: barColors[i % barColors.length] }}
            />
            <span>{d.category}</span>
            <span className="font-medium text-foreground">{formatPct(d.margin)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Summary Cards ───────────────────────────────────────────────────

function SummaryCards({ margins, avgMargin }: { margins: MarginAnalysis[]; avgMargin: number }) {
  // Best category = highest margin
  const bestCategory = useMemo(() => {
    if (margins.length === 0) return { name: '—', nameBn: '—' };
    const best = margins.reduce((a, b) => (a.grossMargin > b.grossMargin ? a : b));
    return { name: best.productCategory, nameBn: best.productCategoryBn };
  }, [margins]);

  const totalRevenue = useMemo(() => margins.reduce((s, m) => s + m.revenue, 0), [margins]);

  const cards = [
    {
      label: 'Avg Gross Margin',
      labelBn: 'গড় স্থূল মার্জিন',
      value: formatPct(avgMargin),
      icon: BarChart3,
      iconColor: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Best Category',
      labelBn: 'সেরা ক্যাটাগরি',
      value: bestCategory.name,
      valueBn: bestCategory.nameBn,
      icon: Award,
      iconColor: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Total Revenue',
      labelBn: 'মোট আয়',
      value: formatBDT(totalRevenue),
      icon: DollarSign,
      iconColor: 'text-sky-600',
      bg: 'bg-sky-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          variants={itemVariants}
          className={`rounded-xl border p-4 ${c.bg}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <c.icon className={`h-4 w-4 ${c.iconColor}`} />
            <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
          </div>
          <p className="text-xl font-bold tracking-tight">{c.value}</p>
          {c.valueBn && <p className="text-xs text-muted-foreground mt-0.5">{c.valueBn}</p>}
          <p className="text-[10px] text-muted-foreground mt-0.5">{c.labelBn}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Mobile Margin Card ──────────────────────────────────────────────

function MarginMobileCard({ m }: { m: MarginAnalysis }) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">{m.productCategory}</p>
          <p className="text-xs text-muted-foreground">{m.productCategoryBn}</p>
        </div>
        <Badge variant="outline" className={`text-xs ${marginBg(m.grossMargin)}`}>
          {formatPct(m.grossMargin)}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{m.channel}</span>
        <span>·</span>
        <span>{m.channelBn}</span>
        <TrendIcon trend={m.trend} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Revenue</p>
          <p className="font-semibold tabular-nums">{formatBDT(m.revenue)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">COGS</p>
          <p className="font-semibold tabular-nums">{formatBDT(m.cogs)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Profit</p>
          <p className="font-semibold tabular-nums">{formatBDT(m.grossProfit)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function MarginAnalysisPanel() {
  const margins = useFinanceStore((s) => s.margins);
  const avgMargin = useFinanceStore((s) => s.avgMargin());
  const filteredMargins = useFinanceStore((s) => s.filteredMargins());
  const searchQuery = useFinanceStore((s) => s.searchQuery);
  const setSearchQuery = useFinanceStore((s) => s.setSearchQuery);

  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Sort filtered margins by grossMargin
  const sorted = useMemo(() => {
    const arr = [...filteredMargins];
    arr.sort((a, b) => sortDir === 'desc' ? b.grossMargin - a.grossMargin : a.grossMargin - b.grossMargin);
    return arr;
  }, [filteredMargins, sortDir]);

  const toggleSort = () => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Margin Analysis</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">মার্জিন বিশ্লেষণ</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {margins.length} categories
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-5">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Summary Cards */}
          <motion.div variants={itemVariants}>
            <SummaryCards margins={margins} avgMargin={avgMargin} />
          </motion.div>

          {/* Search + Sort */}
          <motion.div variants={itemVariants} className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search category or channel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <button
              onClick={toggleSort}
              className="inline-flex items-center gap-1 rounded-md border px-3 h-9 text-xs font-medium hover:bg-muted/50 transition-colors"
              title={sortDir === 'desc' ? 'Sort: Highest first' : 'Sort: Lowest first'}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortDir === 'desc' ? 'High → Low' : 'Low → High'}
            </button>
          </motion.div>

          {/* Desktop Table */}
          <motion.div variants={itemVariants} className="mt-4 hidden md:block">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Product Category</TableHead>
                    <TableHead className="text-xs">Channel</TableHead>
                    <TableHead className="text-xs text-right">Revenue</TableHead>
                    <TableHead className="text-xs text-right">COGS</TableHead>
                    <TableHead className="text-xs text-right">Gross Profit</TableHead>
                    <TableHead className="text-xs text-right">Margin %</TableHead>
                    <TableHead className="text-xs text-center">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((m) => (
                    <TableRow key={m.id} className="group">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{m.productCategory}</p>
                          <p className="text-[10px] text-muted-foreground">{m.productCategoryBn}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{m.channel}</p>
                          <p className="text-[10px] text-muted-foreground">{m.channelBn}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{formatBDT(m.revenue)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{formatBDT(m.cogs)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium">{formatBDT(m.grossProfit)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`text-xs tabular-nums ${marginBg(m.grossMargin)}`}>
                          {formatPct(m.grossMargin)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <TrendIcon trend={m.trend} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </motion.div>

          {/* Mobile Cards */}
          <motion.div variants={itemVariants} className="mt-4 md:hidden space-y-2">
            <ScrollArea className="max-h-96">
              {sorted.map((m) => (
                <MarginMobileCard key={m.id} m={m} />
              ))}
            </ScrollArea>
          </motion.div>

          {/* Margin Distribution Bar */}
          <motion.div variants={itemVariants} className="mt-4">
            <Separator className="mb-4" />
            <MarginDistributionBar margins={margins} />
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
