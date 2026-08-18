'use client';

// ============================================
// TrimedCast — Dead Stock & Slow Movers
// Session 28: Product Catalog & Inventory Intelligence
// ============================================

import { motion } from 'framer-motion';
import {
  Skull,
  TrendingDown,
  AlertTriangle,
  Package,
  ArrowRight,
  HandCoins,
  RotateCcw,
  Trash2,
  Tag,
  Zap,
  CircleDollarSign,
  Clock,
  BarChart3,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  useCatalogStore,
  selectDeadStockValue,
} from '@/stores/catalog-store';
import type {
  DeadStockItem,
  SuggestedAction,
  Priority,
  Product,
} from '@/components/catalog/types';
import {
  formatBDT,
  LIFECECYCLE_CONFIG,
} from '@/components/catalog/types';

// ─── Animation Variants ──────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Action Badge Config ────────────────────────────────────────

const ACTION_STYLES: Record<SuggestedAction, { bg: string; text: string; icon: React.ReactNode }> = {
  markdown: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    icon: <Tag className="h-3 w-3" />,
  },
  donate: {
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    text: 'text-sky-700 dark:text-sky-300',
    icon: <HandCoins className="h-3 w-3" />,
  },
  return: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: <RotateCcw className="h-3 w-3" />,
  },
  dispose: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    icon: <Trash2 className="h-3 w-3" />,
  },
};

const ACTION_LABELS: Record<SuggestedAction, string> = {
  markdown: 'Markdown',
  donate: 'Donate',
  return: 'Return',
  dispose: 'Dispose',
};

// ─── Priority Badge Config ──────────────────────────────────────

const PRIORITY_STYLES: Record<Priority, { bg: string; text: string; pulse?: boolean }> = {
  high: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    pulse: true,
  },
  medium: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
  },
  low: {
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    text: 'text-sky-700 dark:text-sky-300',
  },
};

// ─── Slow Mover Row ─────────────────────────────────────────────

interface SlowMoverRow {
  product: Product;
  turnover: number;
  daysOfSupply: number;
  suggestedAction: SuggestedAction;
  suggestedActionBn: string;
}

function getSlowMoverAction(turnover: number, daysOfSupply: number): { action: SuggestedAction; actionBn: string } {
  if (turnover < 0.5) return { action: 'dispose', actionBn: 'নিষ্পত্তি' };
  if (turnover < 1.0) return { action: 'return', actionBn: 'ফেরত' };
  if (daysOfSupply > 120) return { action: 'markdown', actionBn: 'মার্কডাউন' };
  return { action: 'markdown', actionBn: 'মার্কডাউন' };
}

// ─── Component ──────────────────────────────────────────────────

export function DeadStockPanel() {
  const { deadStock, products, turnover } = useCatalogStore();

  // Computed values
  const deadStockValue = deadStock.reduce((sum, d) => sum + d.stockValue, 0);
  const deadStockCount = deadStock.length;

  // Slow movers: products with turnover < 2 but > 0
  const slowMovers: SlowMoverRow[] = products
    .filter((p) => p.turnoverRate > 0 && p.turnoverRate < 2)
    .sort((a, b) => a.turnoverRate - b.turnoverRate)
    .slice(0, 10)
    .map((p) => {
      const { action, actionBn } = getSlowMoverAction(p.turnoverRate, p.daysOfSupply);
      return {
        product: p,
        turnover: p.turnoverRate,
        daysOfSupply: p.daysOfSupply,
        suggestedAction: action,
        suggestedActionBn: actionBn,
      };
    });

  const slowMoverCount = products.filter((p) => p.turnoverRate > 0 && p.turnoverRate < 2).length;

  // Recovery potential
  const totalInventoryValue = products.reduce((sum, p) => sum + p.stockQty * p.costPrice, 0);
  const recoveryPct = totalInventoryValue > 0 ? ((deadStockValue / totalInventoryValue) * 100) : 0;
  const cashFlowImprovement = recoveryPct > 0 ? Math.min(recoveryPct * 2.5, 35) : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
          <Skull className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Dead Stock & Slow Movers</h2>
          <p className="text-sm text-muted-foreground">মৃত স্টক ও ধীর গতি</p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Dead Stock Value */}
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Dead Stock Value</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {formatBDT(deadStockValue)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <CircleDollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dead Stock Products */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Dead Stock Products</p>
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
                  {deadStockCount}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900/30">
                <Skull className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slow Movers */}
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Slow Movers</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {slowMoverCount}
                </p>
                <p className="text-xs text-muted-foreground">Turnover &lt; 2</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dead Stock Item Cards */}
      <motion.div variants={containerVariants} className="space-y-4">
        <motion.h3 variants={itemVariants} className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Dead Stock Items
        </motion.h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {deadStock.map((item: DeadStockItem, idx: number) => (
            <DeadStockCard key={item.product.id} item={item} index={idx} />
          ))}
        </div>
      </motion.div>

      {/* Slow Movers Section */}
      {slowMovers.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-4">
          <Separator />
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-foreground">Slow Movers</h3>
            <Badge variant="secondary" className="text-xs">
              {slowMovers.length} products
            </Badge>
          </div>

          <Card>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Turnover</TableHead>
                    <TableHead className="text-right">Days of Supply</TableHead>
                    <TableHead>Suggested Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowMovers.map((row) => {
                    const actionStyle = ACTION_STYLES[row.suggestedAction];
                    return (
                      <TableRow key={row.product.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{row.product.name}</p>
                            <p className="text-xs text-muted-foreground">{row.product.nameBn}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.product.sku}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {row.turnover.toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {row.daysOfSupply} days
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`gap-1 ${actionStyle.bg} ${actionStyle.text} text-xs`}
                          >
                            {actionStyle.icon}
                            {row.suggestedActionBn}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </motion.div>
      )}

      {/* Recovery Potential */}
      <motion.div variants={itemVariants}>
        <Separator className="mb-4" />
        <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-950/30 dark:to-sky-950/30">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground">Recovery Potential</h4>
                <p className="text-sm text-muted-foreground">
                  Recovering <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatBDT(deadStockValue)}</span> from dead stock could improve cash flow by{' '}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{cashFlowImprovement.toFixed(1)}%</span>
                </p>
                <div className="mt-2 h-2 w-full max-w-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(cashFlowImprovement * 3, 100)}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─── Dead Stock Card Sub-component ──────────────────────────────

function DeadStockCard({ item, index }: { item: DeadStockItem; index: number }) {
  const { product, daysSinceLastSale, stockValue, suggestedAction, suggestedActionBn, priority } = item;

  const actionStyle = ACTION_STYLES[suggestedAction];
  const priorityStyle = PRIORITY_STYLES[priority];

  return (
    <motion.div
      variants={itemVariants}
      custom={index}
    >
      <Card className="h-full border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          {/* Product Name & SKU */}
          <div className="space-y-1">
            <p className="font-semibold text-sm leading-tight">{product.name}</p>
            <p className="text-xs text-muted-foreground">{product.nameBn}</p>
            <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
          </div>

          {/* Days Since Last Sale — Large Red Number */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Days Since Last Sale</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 leading-none mt-1">
                {daysSinceLastSale}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
              <Clock className="h-6 w-6 text-red-400 dark:text-red-500" />
            </div>
          </div>

          {/* Stock Value Locked */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Stock Value Locked</span>
            <span className="font-semibold text-sm text-red-600 dark:text-red-400">
              {formatBDT(stockValue)}
            </span>
          </div>

          {/* Category + Action + Priority Badges */}
          <div className="flex flex-wrap gap-1.5">
            {/* Category Badge */}
            <Badge variant="outline" className="text-xs">
              {product.category}
            </Badge>

            {/* Suggested Action Badge */}
            <Badge
              variant="outline"
              className={`gap-1 text-xs ${actionStyle.bg} ${actionStyle.text}`}
            >
              {actionStyle.icon}
              {suggestedActionBn}
            </Badge>

            {/* Priority Badge */}
            <Badge
              variant="outline"
              className={`gap-1 text-xs ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.pulse ? 'animate-pulse' : ''}`}
            >
              {priority === 'high' && <Zap className="h-3 w-3" />}
              {priority}
            </Badge>
          </div>

          {/* Stock Qty Remaining */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              Stock Remaining
            </span>
            <span className="font-semibold">{product.stockQty} units</span>
          </div>

          {/* Take Action Button */}
          <Button
            size="sm"
            className="w-full gap-1 text-xs"
            variant={priority === 'high' ? 'destructive' : 'outline'}
          >
            Take Action
            <ArrowRight className="h-3 w-3" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default DeadStockPanel;
