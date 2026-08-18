'use client';

// ============================================
// TrimedCast — Payment Terms Analysis Component
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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import { useFinanceStore } from '@/stores/finance-store';
import type { PaymentTerm, SupplierRating } from '@/components/finance/types';
import {
  formatBDT,
  RATING_CONFIG,
} from '@/components/finance/types';

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

function getPaymentDayColor(avgDays: number, termDays: number): string {
  const diff = avgDays - termDays;
  if (diff <= 0) return 'text-emerald-600';
  if (diff <= 5) return 'text-amber-600';
  return 'text-red-600';
}

function getPaymentDayBg(avgDays: number, termDays: number): string {
  const diff = avgDays - termDays;
  if (diff <= 0) return 'bg-emerald-50';
  if (diff <= 5) return 'bg-amber-50';
  return 'bg-red-50';
}

function getRatingBadgeClasses(rating: SupplierRating): string {
  const config = RATING_CONFIG[rating];
  return `${config.bg} ${config.text} ${config.border} border`;
}

function getCreditUtilColor(pct: number): string {
  if (pct <= 60) return 'bg-emerald-500';
  if (pct <= 80) return 'bg-amber-500';
  return 'bg-red-500';
}

function getCreditUtilTrack(pct: number): string {
  if (pct <= 60) return '[&>div]:bg-emerald-500';
  if (pct <= 80) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-red-500';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Component ───────────────────────────────────────────────────────

export function PaymentTermsPanel() {
  const paymentTerms = useFinanceStore((s) => s.paymentTerms);

  // ── Computed summaries ────────────────────────────────────────────
  const summaries = useMemo(() => {
    const totalOutstanding = paymentTerms.reduce((s, p) => s + p.overdueAmount, 0);
    const overdueAmount = paymentTerms
      .filter((p) => p.overdueAmount > 0)
      .reduce((s, p) => s + p.overdueAmount, 0);
    const totalWeight = paymentTerms.reduce((s, p) => s + p.utilized, 0);
    const weightedAvgDays =
      totalWeight > 0
        ? paymentTerms.reduce((s, p) => s + p.avgPaymentDays * p.utilized, 0) / totalWeight
        : 0;
    const onTimeCount = paymentTerms.filter(
      (p) => p.avgPaymentDays <= p.termDays
    ).length;
    const onTimeRate =
      paymentTerms.length > 0 ? (onTimeCount / paymentTerms.length) * 100 : 0;

    return { totalOutstanding, overdueAmount, weightedAvgDays, onTimeRate };
  }, [paymentTerms]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
          <CreditCard className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Payment Terms</h2>
          <p className="text-sm text-muted-foreground">পেমেন্ট শর্তাবলী</p>
        </div>
      </motion.div>

      {/* ── Summary Cards ──────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
      >
        {/* Total Outstanding */}
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Total Outstanding</span>
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">
              {formatBDT(summaries.totalOutstanding)}
            </p>
            <p className="text-xs text-muted-foreground">মোট বকেয়া</p>
          </CardContent>
        </Card>

        {/* Overdue Amount */}
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">Overdue</span>
            </div>
            <p className="mt-2 text-lg font-bold text-red-600">
              {formatBDT(summaries.overdueAmount)}
            </p>
            <p className="text-xs text-muted-foreground">অতিরিক্ত মেয়াদোত্তীর্ণ</p>
          </CardContent>
        </Card>

        {/* Avg Payment Days */}
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs font-medium">Avg Payment Days</span>
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">
              {summaries.weightedAvgDays.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">days</span>
            </p>
            <p className="text-xs text-muted-foreground">গড় পেমেন্ট দিন</p>
          </CardContent>
        </Card>

        {/* On-Time Rate */}
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">On-Time Rate</span>
            </div>
            <p className="mt-2 text-lg font-bold text-emerald-600">
              {summaries.onTimeRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">সময়মতো হার</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Supplier Cards ─────────────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {paymentTerms.map((pt, idx) => (
          <SupplierCard key={pt.id} pt={pt} index={idx} />
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── Supplier Card Sub-component ─────────────────────────────────────

function SupplierCard({ pt, index }: { pt: PaymentTerm; index: number }) {
  const creditUtilPct = pt.creditLimit > 0 ? (pt.utilized / pt.creditLimit) * 100 : 0;
  const invoicePct = pt.invoicesTotal > 0 ? (pt.invoicesPaid / pt.invoicesTotal) * 100 : 0;
  const paymentColor = getPaymentDayColor(pt.avgPaymentDays, pt.termDays);
  const paymentBg = getPaymentDayBg(pt.avgPaymentDays, pt.termDays);
  const isOnTime = pt.avgPaymentDays <= pt.termDays;
  const ratingConfig = RATING_CONFIG[pt.rating];

  return (
    <motion.div
      variants={itemVariants}
      custom={index}
    >
      <Card className="py-4 h-full">
        <CardContent className="px-4 space-y-3">
          {/* Supplier Name + Rating */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{pt.supplierName}</p>
              <p className="text-xs text-muted-foreground">{pt.supplierNameBn}</p>
            </div>
            <Badge className={`${getRatingBadgeClasses(pt.rating)} text-[10px] px-1.5 shrink-0`}>
              {ratingConfig.label}
            </Badge>
          </div>

          <Separator />

          {/* Credit Term + Avg Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Credit Term</p>
              <p className="text-sm font-semibold">
                {pt.termDays} <span className="text-xs font-normal text-muted-foreground">days / দিন</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Payment</p>
              <p className={`text-sm font-semibold ${paymentColor}`}>
                {pt.avgPaymentDays} <span className="text-xs font-normal">days / দিন</span>
              </p>
            </div>
          </div>

          {/* Overdue Amount */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Overdue Amount</p>
            {pt.overdueAmount > 0 ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <p className="text-sm font-semibold text-red-600">{formatBDT(pt.overdueAmount)}</p>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-600">Clear</p>
              </div>
            )}
          </div>

          {/* Credit Utilization Bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Credit Utilization</p>
              <p className="text-xs font-medium">{creditUtilPct.toFixed(0)}%</p>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getCreditUtilColor(creditUtilPct)}`}
                style={{ width: `${Math.min(creditUtilPct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-0.5">
              <p className="text-[10px] text-muted-foreground">{formatBDT(pt.utilized)}</p>
              <p className="text-[10px] text-muted-foreground">{formatBDT(pt.creditLimit)}</p>
            </div>
          </div>

          {/* Invoices Paid */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Invoices Paid
              </p>
              <p className="text-xs font-medium">
                {pt.invoicesPaid} of {pt.invoicesTotal}
              </p>
            </div>
            <Progress value={invoicePct} className="h-1.5" />
          </div>

          {/* Last Payment Date */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            <span>Last: {formatDate(pt.lastPaymentDate)}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default PaymentTermsPanel;
