'use client';

// ============================================
// TrimedCast — Budget vs Actual Comparison Component
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Scale,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from 'lucide-react';
import { useFinanceStore } from '@/stores/finance-store';
import type { BudgetItem, BudgetStatus } from '@/components/finance/types';
import {
  formatBDT,
  formatPct,
  getVarianceClasses,
} from '@/components/finance/types';

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Helpers ─────────────────────────────────────────────────────────

function getStatusIcon(status: BudgetStatus) {
  switch (status) {
    case 'under':
      return <ArrowDownRight className="h-3.5 w-3.5" />;
    case 'on-track':
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case 'over':
      return <ArrowUpRight className="h-3.5 w-3.5" />;
    case 'critical':
      return <AlertTriangle className="h-3.5 w-3.5" />;
  }
}

function getStatusLabel(status: BudgetStatus): string {
  switch (status) {
    case 'under':
      return 'Under';
    case 'on-track':
      return 'On Track';
    case 'over':
      return 'Over';
    case 'critical':
      return 'Critical';
  }
}

function getStatusLabelBn(status: BudgetStatus): string {
  switch (status) {
    case 'under':
      return 'কম';
    case 'on-track':
      return 'সঠিক';
    case 'over':
      return 'বেশি';
    case 'critical':
      return 'সংকটাপন্ন';
  }
}

function getBarColor(status: BudgetStatus): string {
  switch (status) {
    case 'under':
      return 'bg-emerald-500';
    case 'on-track':
      return 'bg-sky-500';
    case 'over':
      return 'bg-amber-500';
    case 'critical':
      return 'bg-red-500';
  }
}

function getVarianceTextColor(variance: number): string {
  if (variance < 0) return 'text-emerald-600';
  if (variance === 0) return 'text-sky-600';
  return 'text-red-600';
}

// ─── Component ───────────────────────────────────────────────────────

export function BudgetVsActualPanel() {
  const budget = useFinanceStore((s) => s.budget);

  // ── Computed summaries ────────────────────────────────────────────
  const overall = useMemo(() => {
    const totalBudget = budget.reduce((s, b) => s + b.budgetAmount, 0);
    const totalActual = budget.reduce((s, b) => s + b.actualAmount, 0);
    const totalVariance = totalActual - totalBudget;
    const variancePct = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;
    return { totalBudget, totalActual, totalVariance, variancePct };
  }, [budget]);

  // Max budget for bar scaling
  const maxBudget = useMemo(
    () => Math.max(...budget.map((b) => Math.max(b.budgetAmount, b.actualAmount)), 1),
    [budget]
  );

  const isOverallOver = overall.totalVariance > 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
            <Scale className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Budget vs Actual</h2>
            <p className="text-sm text-muted-foreground">বাজেট বনাম প্রকৃত</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          FY 2024-25 Q4
        </Badge>
      </motion.div>

      {/* ── Overall Summary Cards ──────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
      >
        {/* Total Budget */}
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs font-medium text-muted-foreground">Total Budget</p>
            <p className="mt-1 text-lg font-bold">{formatBDT(overall.totalBudget)}</p>
            <p className="text-xs text-muted-foreground">মোট বাজেট</p>
          </CardContent>
        </Card>

        {/* Total Actual */}
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs font-medium text-muted-foreground">Total Actual</p>
            <p className="mt-1 text-lg font-bold">{formatBDT(overall.totalActual)}</p>
            <p className="text-xs text-muted-foreground">মোট প্রকৃত</p>
          </CardContent>
        </Card>

        {/* Overall Variance */}
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs font-medium text-muted-foreground">Overall Variance</p>
            <p className={`mt-1 text-lg font-bold ${getVarianceTextColor(overall.totalVariance)}`}>
              {overall.totalVariance >= 0 ? '+' : ''}{formatBDT(overall.totalVariance)}
              <span className="text-sm font-normal ml-1">({overall.variancePct >= 0 ? '+' : ''}{overall.variancePct.toFixed(1)}%)</span>
            </p>
            <p className="text-xs text-muted-foreground">সামগ্রিক ব্যবধান</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Budget Items — Desktop Table ───────────────────────────── */}
      <motion.div variants={itemVariants} className="hidden md:block">
        <Card className="py-4">
          <CardContent className="px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Category</TableHead>
                  <TableHead className="text-right">Budget (৳)</TableHead>
                  <TableHead className="text-right">Actual (৳)</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="w-[200px]">Comparison</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budget.map((item, idx) => (
                  <BudgetTableRow
                    key={item.id}
                    item={item}
                    maxBudget={maxBudget}
                    index={idx}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Budget Items — Mobile Cards ────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-3 md:hidden"
      >
        {budget.map((item, idx) => (
          <BudgetCard key={item.id} item={item} maxBudget={maxBudget} index={idx} />
        ))}
      </motion.div>

      {/* ── Variance Chart (Horizontal Bar) ────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm font-semibold">Variance by Category</CardTitle>
            <CardDescription>ব্যবধান শতাংশ — শূন্যের বামে = কম, ডানে = বেশি</CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <div className="space-y-2.5">
              {budget.map((item) => {
                const maxAbsVariance = Math.max(
                  ...budget.map((b) => Math.abs(b.variancePct)),
                  1
                );
                const barWidth = (Math.abs(item.variancePct) / maxAbsVariance) * 50;
                const isOver = item.variancePct > 0;

                return (
                  <div key={item.id} className="flex items-center gap-2">
                    <p className="text-xs w-24 truncate text-right text-muted-foreground">
                      {item.category}
                    </p>
                    <div className="flex-1 h-5 relative bg-muted/30 rounded">
                      {/* Center line */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                      {/* Bar */}
                      <div
                        className={`absolute top-0.5 h-4 rounded-sm transition-all ${
                          isOver ? 'bg-red-400/80' : 'bg-emerald-400/80'
                        }`}
                        style={{
                          left: isOver ? '50%' : `${50 - barWidth}%`,
                          width: `${barWidth}%`,
                        }}
                      />
                    </div>
                    <p
                      className={`text-xs w-16 font-medium ${
                        isOver ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {item.variancePct >= 0 ? '+' : ''}
                      {item.variancePct.toFixed(1)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─── Budget Table Row ────────────────────────────────────────────────

function BudgetTableRow({
  item,
  maxBudget,
  index,
}: {
  item: BudgetItem;
  maxBudget: number;
  index: number;
}) {
  const budgetWidth = (item.budgetAmount / maxBudget) * 100;
  const actualWidth = (item.actualAmount / maxBudget) * 100;
  const vClasses = getVarianceClasses(item.status);

  return (
    <motion.tr
      variants={itemVariants}
      className="border-b last:border-0"
    >
      <TableCell>
        <p className="font-medium text-sm">{item.category}</p>
        <p className="text-xs text-muted-foreground">{item.categoryBn}</p>
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {formatBDT(item.budgetAmount)}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {formatBDT(item.actualAmount)}
      </TableCell>
      <TableCell className="text-right">
        <p className={`text-sm font-medium ${getVarianceTextColor(item.variance)}`}>
          {item.variance >= 0 ? '+' : ''}{formatBDT(item.variance)}
        </p>
        <p className={`text-xs ${getVarianceTextColor(item.variance)}`}>
          ({item.variancePct >= 0 ? '+' : ''}{item.variancePct.toFixed(1)}%)
        </p>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          {/* Budget bar */}
          <div className="flex items-center gap-1.5">
            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-muted-foreground/30"
                style={{ width: `${budgetWidth}%` }}
              />
            </div>
          </div>
          {/* Actual bar */}
          <div className="flex items-center gap-1.5">
            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${getBarColor(item.status)} ${
                  item.status === 'critical' ? 'animate-pulse' : ''
                }`}
                style={{ width: `${actualWidth}%` }}
              />
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Badge className={`${vClasses.bg} ${vClasses.text} text-[10px] gap-0.5`}>
          {getStatusIcon(item.status)}
          {getStatusLabel(item.status)}
        </Badge>
      </TableCell>
    </motion.tr>
  );
}

// ─── Budget Mobile Card ──────────────────────────────────────────────

function BudgetCard({
  item,
  maxBudget,
  index,
}: {
  item: BudgetItem;
  maxBudget: number;
  index: number;
}) {
  const budgetWidth = (item.budgetAmount / maxBudget) * 100;
  const actualWidth = (item.actualAmount / maxBudget) * 100;
  const vClasses = getVarianceClasses(item.status);

  return (
    <motion.div variants={itemVariants}>
      <Card className="py-4">
        <CardContent className="px-4 space-y-3">
          {/* Category + Status */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{item.category}</p>
              <p className="text-xs text-muted-foreground">{item.categoryBn}</p>
            </div>
            <Badge className={`${vClasses.bg} ${vClasses.text} text-[10px] gap-0.5`}>
              {getStatusIcon(item.status)}
              {getStatusLabel(item.status)}
            </Badge>
          </div>

          <Separator />

          {/* Budget & Actual */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Budget</p>
              <p className="text-sm font-semibold font-mono">{formatBDT(item.budgetAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Actual</p>
              <p className="text-sm font-semibold font-mono">{formatBDT(item.actualAmount)}</p>
            </div>
          </div>

          {/* Variance */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Variance</p>
            <p className={`text-sm font-semibold ${getVarianceTextColor(item.variance)}`}>
              {item.variance >= 0 ? '+' : ''}{formatBDT(item.variance)}
              <span className="text-xs font-normal ml-1">
                ({item.variancePct >= 0 ? '+' : ''}{item.variancePct.toFixed(1)}%)
              </span>
            </p>
          </div>

          {/* Dual Bar */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-10">Budget</span>
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-muted-foreground/30"
                  style={{ width: `${budgetWidth}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-10">Actual</span>
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${getBarColor(item.status)} ${
                    item.status === 'critical' ? 'animate-pulse' : ''
                  }`}
                  style={{ width: `${actualWidth}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default BudgetVsActualPanel;
