'use client';

// ============================================
// TrimedCast — PO Tracking by Supplier
// Session 27: Supplier Scorecard & Procurement Dashboard
// ============================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  CheckCircle2,
  DollarSign,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

import type { PurchaseOrderBySupplier } from '@/components/procurement/types';
import { formatBDT } from '@/components/procurement/types';
import { useProcurementStore } from '@/stores/procurement-store';

// ─── Animation Variants ──────────────────────────────────────────────

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' as const },
  }),
};

const summaryVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.08, duration: 0.3 },
  }),
};

// ─── On-Time Rate Bar ────────────────────────────────────────────────

function OnTimeBar({ rate }: { rate: number }) {
  const barColor =
    rate >= 90
      ? 'bg-emerald-500'
      : rate >= 75
        ? 'bg-amber-500'
        : 'bg-rose-500';

  const textColor =
    rate >= 90
      ? 'text-emerald-600'
      : rate >= 75
        ? 'text-amber-600'
        : 'text-rose-600';

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-xs font-semibold w-8 text-right ${textColor}`}>
        {rate}%
      </span>
    </div>
  );
}

// ─── Overdue Badge ───────────────────────────────────────────────────

function OverdueBadge({ count }: { count: number }) {
  if (count > 0) {
    return (
      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
        {count} Overdue
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
    >
      On Track
    </Badge>
  );
}

// ─── Mobile Card Row ─────────────────────────────────────────────────

function MobilePOCard({
  po,
  index,
}: {
  po: PurchaseOrderBySupplier;
  index: number;
}) {
  return (
    <motion.div custom={index} variants={rowVariants} initial="hidden" animate="visible">
      <Card className="py-0 gap-0">
        <CardHeader className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{po.supplierName}</CardTitle>
            <OverdueBadge count={po.overduePOs} />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Open POs</p>
              <p className="text-sm font-semibold">{po.openPOs}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Completed</p>
              <p className="text-sm font-semibold">{po.completedPOs}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total Value</p>
              <p className="text-sm font-semibold">{formatBDT(po.totalValue)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Avg Lead Time</p>
              <p className="text-sm font-semibold">{po.avgLeadTime} days</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">On-Time Rate</p>
            </div>
          </div>
          <OnTimeBar rate={po.onTimeRate} />
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function POTracking() {
  const { poBySupplier } = useProcurementStore();

  // Sort by totalValue descending
  const sortedPOs = useMemo(
    () => [...poBySupplier].sort((a, b) => b.totalValue - a.totalValue),
    [poBySupplier]
  );

  // Summary stats
  const totalOpen = useMemo(() => sortedPOs.reduce((s, p) => s + p.openPOs, 0), [sortedPOs]);
  const totalCompleted = useMemo(() => sortedPOs.reduce((s, p) => s + p.completedPOs, 0), [sortedPOs]);
  const totalValue = useMemo(() => sortedPOs.reduce((s, p) => s + p.totalValue, 0), [sortedPOs]);
  const avgOnTime = useMemo(() => {
    if (sortedPOs.length === 0) return 0;
    return Math.round(sortedPOs.reduce((s, p) => s + p.onTimeRate, 0) / sortedPOs.length);
  }, [sortedPOs]);

  const summaryCards = [
    {
      title: 'Open POs',
      titleBn: 'খোলা পিও',
      value: totalOpen,
      icon: FileText,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      title: 'Completed POs',
      titleBn: 'সম্পন্ন পিও',
      value: totalCompleted,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Total Value',
      titleBn: 'মোট মূল্য',
      value: formatBDT(totalValue),
      icon: DollarSign,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Avg On-Time Rate',
      titleBn: 'গড় সময়মত হার',
      value: `${avgOnTime}%`,
      icon: Clock,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">PO Tracking by Supplier</h2>
        <p className="text-sm text-muted-foreground">সরবরাহকারী অনুযায়ী পিও ট্র্যাকিং</p>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              custom={i}
              variants={summaryVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className="py-3 gap-3">
                <CardContent className="px-4 py-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                      <Icon className={`size-4 ${card.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground truncate">
                        {card.title}
                      </p>
                      <p className="text-lg font-bold truncate">
                        {card.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ── Desktop Table ─────────────────────────────────────────── */}
      <div className="hidden md:block">
        <Card className="py-0 gap-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Supplier</TableHead>
                  <TableHead className="text-center">Open POs</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-center">Avg Lead Time</TableHead>
                  <TableHead className="min-w-[160px]">On-Time Rate</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPOs.map((po, i) => (
                  <motion.tr
                    key={po.supplierId}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium text-sm">
                      {po.supplierName}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {po.openPOs}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {po.completedPOs}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      {formatBDT(po.totalValue)}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {po.avgLeadTime}d
                    </TableCell>
                    <TableCell>
                      <OnTimeBar rate={po.onTimeRate} />
                    </TableCell>
                    <TableCell className="text-center">
                      <OverdueBadge count={po.overduePOs} />
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── Mobile Cards ──────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {sortedPOs.map((po, i) => (
          <MobilePOCard key={po.supplierId} po={po} index={i} />
        ))}
      </div>

      {/* ── Empty State ──────────────────────────────────────────── */}
      {sortedPOs.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-muted-foreground"
        >
          <FileText className="size-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No purchase order data available.</p>
        </motion.div>
      )}
    </div>
  );
}
