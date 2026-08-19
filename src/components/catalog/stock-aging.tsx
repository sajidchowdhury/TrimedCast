'use client';

// ============================================
// TrimedCast — Stock Aging Analysis Component
// Session 28: Product Catalog & Inventory Intelligence
// ============================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Package,
  TrendingDown,
  AlertTriangle,
  Skull,
  Info,
  Lightbulb,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCatalogStore } from '@/stores/catalog-store';
import type { StockAgingBucket } from '@/components/catalog/types';

// ─── Aging Bucket Visual Config ────────────────────────────────

interface AgingBucketConfig {
  key: string;
  label: string;
  labelBn: string;
  bg: string;
  bgMuted: string;
  text: string;
  border: string;
  barColor: string;
  icon: React.ReactNode;
}

const AGING_BUCKET_CONFIG: AgingBucketConfig[] = [
  {
    key: '0-30',
    label: '0-30 days',
    labelBn: 'ফ্রেশ',
    bg: 'bg-emerald-500',
    bgMuted: 'bg-emerald-100 dark:bg-emerald-950',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
    barColor: 'bg-emerald-500',
    icon: <Package className="h-4 w-4" />,
  },
  {
    key: '31-60',
    label: '31-60 days',
    labelBn: 'মাঝারি',
    bg: 'bg-sky-500',
    bgMuted: 'bg-sky-100 dark:bg-sky-950',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-300 dark:border-sky-700',
    barColor: 'bg-sky-500',
    icon: <Clock className="h-4 w-4" />,
  },
  {
    key: '61-90',
    label: '61-90 days',
    labelBn: 'পুরনো',
    bg: 'bg-amber-500',
    bgMuted: 'bg-amber-100 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    barColor: 'bg-amber-500',
    icon: <TrendingDown className="h-4 w-4" />,
  },
  {
    key: '91-180',
    label: '91-180 days',
    labelBn: 'অতি পুরনো',
    bg: 'bg-orange-500',
    bgMuted: 'bg-orange-100 dark:bg-orange-950',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
    barColor: 'bg-orange-500',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    key: '180+',
    label: '180+ days',
    labelBn: 'মৃত',
    bg: 'bg-red-500',
    bgMuted: 'bg-red-100 dark:bg-red-950',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    barColor: 'bg-red-500',
    icon: <Skull className="h-4 w-4" />,
  },
];

// ─── Helpers ───────────────────────────────────────────────────

function formatBDT(value: number): string {
  return '৳' + value.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPct(value: number): string {
  return value.toFixed(1) + '%';
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

export function StockAgingAnalysis() {
  const stockAging = useCatalogStore((s) => s.stockAging);

  // Build a lookup by bucket key
  const agingMap = useMemo(() => {
    const map = new Map<string, StockAgingBucket>();
    for (const bucket of stockAging) {
      map.set(bucket.bucket, bucket);
    }
    return map;
  }, [stockAging]);

  // Total aged stock value
  const totalAgedStockValue = useMemo(() => {
    return stockAging.reduce((sum, b) => sum + b.stockValue, 0);
  }, [stockAging]);

  // Insight percentages
  const freshPct = useMemo(() => {
    const fresh = agingMap.get('0-30');
    return fresh ? fresh.pctOfTotal : 0;
  }, [agingMap]);

  const attentionPct = useMemo(() => {
    const b91 = agingMap.get('91-180');
    const b180 = agingMap.get('180+');
    return (b91 ? b91.pctOfTotal : 0) + (b180 ? b180.pctOfTotal : 0);
  }, [agingMap]);

  // 91-180 and 180+ stock values for recommendations
  const oldStockValue = useMemo(() => {
    const b = agingMap.get('91-180');
    return b ? b.stockValue : 0;
  }, [agingMap]);

  const deadStockValue = useMemo(() => {
    const b = agingMap.get('180+');
    return b ? b.stockValue : 0;
  }, [agingMap]);

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
          <h2 className="text-2xl font-bold tracking-tight">Stock Aging Analysis</h2>
          <p className="text-sm text-muted-foreground">স্টক এজিং বিশ্লেষণ</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
          {stockAging.length} Buckets
        </Badge>
      </motion.div>

      {/* ── Total Aged Stock Value ──────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-2 border-dashed border-muted">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Aged Stock Value</p>
                <p className="text-3xl font-bold mt-1">{formatBDT(totalAgedStockValue)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 5 Aging Bucket Cards ────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {AGING_BUCKET_CONFIG.map((config) => {
          const data = agingMap.get(config.key);
          const productCount = data?.productCount ?? 0;
          const stockValue = data?.stockValue ?? 0;
          const pctOfTotal = data?.pctOfTotal ?? 0;

          return (
            <motion.div key={config.key} variants={itemVariants}>
              <Card className={`overflow-hidden border ${config.border}`}>
                <div className={`h-1.5 ${config.bg}`} />
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className={`text-sm font-semibold ${config.text}`}>
                      {config.label}
                    </CardTitle>
                    <div className={`${config.bgMuted} rounded-md p-1.5`}>
                      {config.icon}
                    </div>
                  </div>
                  <p className={`text-xs ${config.text} opacity-75`}>{config.labelBn}</p>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">{productCount}</span>
                    <span className="text-xs text-muted-foreground">products</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold">{formatBDT(stockValue)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <motion.div
                      className={`h-1.5 rounded-full ${config.barColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pctOfTotal}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {formatPct(pctOfTotal)} of total
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Stacked Horizontal Bar ──────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Aging Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">Proportional breakdown by age bucket</p>
          </CardHeader>
          <CardContent className="pb-4">
            {/* Stacked bar */}
            <div className="flex w-full h-10 rounded-lg overflow-hidden">
              {AGING_BUCKET_CONFIG.map((config) => {
                const data = agingMap.get(config.key);
                const pct = data?.pctOfTotal ?? 0;
                return (
                  <motion.div
                    key={config.key}
                    className={`${config.barColor} relative group`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
                    title={`${config.label}: ${formatPct(pct)}`}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold text-white drop-shadow-sm">
                        {formatPct(pct)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {AGING_BUCKET_CONFIG.map((config) => {
                const data = agingMap.get(config.key);
                const pct = data?.pctOfTotal ?? 0;
                return (
                  <div key={config.key} className="flex items-center gap-1.5">
                    <div className={`h-2.5 w-2.5 rounded-sm ${config.barColor}`} />
                    <span className="text-xs text-muted-foreground">
                      {config.label} ({formatPct(pct)})
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Aging Trend Insight ─────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30">
          <CardContent className="pt-5 pb-5">
            <div className="flex gap-3">
              <div className="shrink-0 h-10 w-10 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center">
                <Info className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Aging Trend Insight</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {formatPct(freshPct)}
                  </span>{' '}
                  of stock is fresh (&lt;30 days),{' '}
                  <span className="font-medium text-red-700 dark:text-red-400">
                    {formatPct(attentionPct)}
                  </span>{' '}
                  needs attention (&gt;90 days)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Recommendation Cards ────────────────────────────── */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 91-180 day recommendation */}
        <motion.div variants={itemVariants}>
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <Lightbulb className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">91-180 Day Stock</CardTitle>
                  <p className="text-xs text-muted-foreground">অতি পুরনো স্টক</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-sm text-muted-foreground mb-3">
                <span className="font-semibold text-foreground">{formatBDT(oldStockValue)}</span>{' '}
                tied up in aged inventory
              </p>
              <div className="bg-orange-50 dark:bg-orange-950/40 rounded-md px-3 py-2">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Consider promotional pricing or bundle offers
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  �প্রমোশনাল প্রাইসিং বা বান্ডেল অফার বিবেচনা করুন
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 180+ day recommendation */}
        <motion.div variants={itemVariants}>
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">180+ Day Stock</CardTitle>
                  <p className="text-xs text-muted-foreground">মৃত স্টক</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-sm text-muted-foreground mb-3">
                <span className="font-semibold text-foreground">{formatBDT(deadStockValue)}</span>{' '}
                at risk of becoming dead stock
              </p>
              <div className="bg-red-50 dark:bg-red-950/40 rounded-md px-3 py-2">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Review for markdown, return to supplier, or disposal
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  মার্কডাউন, সাপ্লায়ার ফেরত বা নিষ্পত্তি পর্যালোচনা করুন
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <Separator />
    </motion.div>
  );
}

export default StockAgingAnalysis;
