'use client';

// ============================================
// TrimedCast — Cost Comparison Across Suppliers
// Session 27: Multi-Source Analysis, Savings Indicators
// ============================================

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Scale,
  Star,
  TrendingDown,
  Zap,
  CheckCircle2,
  Package,
  Loader2,
} from 'lucide-react';
import type { CostComparison, CostComparisonSupplier } from '@/components/procurement/types';
import { formatBDT } from '@/components/procurement/types';
import { useProcurementStore } from '@/stores/procurement-store';

// ─── Helpers ────────────────────────────────────────────────────────────

/** Find the supplier with the lowest unit price */
function getBestPriceSupplier(suppliers: CostComparisonSupplier[]): CostComparisonSupplier | null {
  if (suppliers.length === 0) return null;
  return suppliers.reduce((best, s) => (s.unitPrice < best.unitPrice ? s : best), suppliers[0]);
}

/** Find the supplier with the shortest lead time */
function getBestLeadTimeSupplier(suppliers: CostComparisonSupplier[]): CostComparisonSupplier | null {
  if (suppliers.length === 0) return null;
  return suppliers.reduce((best, s) => (s.leadTimeDays < best.leadTimeDays ? s : best), suppliers[0]);
}

/** Find the recommended supplier */
function getRecommendedSupplier(suppliers: CostComparisonSupplier[]): CostComparisonSupplier | null {
  return suppliers.find((s) => s.recommended) ?? null;
}

/** Calculate savings per unit vs the highest-priced supplier */
function getSavingsInfo(suppliers: CostComparisonSupplier[]): {
  bestSupplier: string;
  savingsPerUnit: number;
  savingsPercent: number;
} | null {
  if (suppliers.length < 2) return null;
  const prices = suppliers.map((s) => s.unitPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  if (maxPrice === 0) return null;
  const bestSupplier = suppliers.find((s) => s.unitPrice === minPrice)?.supplierName ?? '';
  return {
    bestSupplier,
    savingsPerUnit: maxPrice - minPrice,
    savingsPercent: Math.round(((maxPrice - minPrice) / maxPrice) * 100),
  };
}

// ─── Quality Score Bar ──────────────────────────────────────────────────

function QualityScoreBar({ score }: { score: number }) {
  const barColor =
    score >= 90 ? 'bg-emerald-500' : score >= 80 ? 'bg-sky-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-500 font-medium">{score}</span>
    </div>
  );
}

// ─── Single Part Comparison Card ────────────────────────────────────────

function PartComparisonCard({
  comparison,
  index,
}: {
  comparison: CostComparison;
  index: number;
}) {
  const { partName, partNameBn, specifications, suppliers } = comparison;

  const bestPrice = getBestPriceSupplier(suppliers);
  const bestLeadTime = getBestLeadTimeSupplier(suppliers);
  const recommended = getRecommendedSupplier(suppliers);
  const savings = getSavingsInfo(suppliers);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.08,
        ease: 'easeOut',
      }}
    >
      <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-slate-500" />
                {partName}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">{partNameBn}</p>
              <p className="text-[11px] text-slate-400 mt-1">{specifications}</p>
            </div>

            {/* Savings indicator */}
            {savings && savings.savingsPerUnit > 0 && (
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] px-2 py-0.5 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Save {formatBDT(savings.savingsPerUnit)}/unit ({savings.savingsPercent}% cheaper)
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-4">
          {/* Comparison Table */}
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <ScrollArea className="max-h-72">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs">Supplier</TableHead>
                    <TableHead className="text-xs text-right">Unit Price</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">Lead Time</TableHead>
                    <TableHead className="text-xs text-right hidden md:table-cell">MOQ</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Quality</TableHead>
                    <TableHead className="text-xs text-right hidden lg:table-cell">Landed Cost</TableHead>
                    <TableHead className="text-xs text-center w-10">★</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => {
                    const isBestPrice = supplier.supplierId === bestPrice?.supplierId;
                    const isBestLeadTime = supplier.supplierId === bestLeadTime?.supplierId;
                    const isRecommended = supplier.recommended;
                    const isRecSupplier = recommended?.supplierId === supplier.supplierId;

                    return (
                      <TableRow
                        key={supplier.supplierId}
                        className={`
                          ${isRecSupplier ? 'bg-emerald-50/60 border-l-2 border-l-emerald-500' : 'hover:bg-slate-50/50'}
                        `}
                      >
                        {/* Supplier Name */}
                        <TableCell className="text-xs">
                          <div className="font-medium text-slate-800">{supplier.supplierName}</div>
                        </TableCell>

                        {/* Unit Price */}
                        <TableCell className="text-xs text-right">
                          <span
                            className={`font-semibold ${isBestPrice ? 'text-emerald-600' : 'text-slate-700'}`}
                          >
                            {formatBDT(supplier.unitPrice)}
                          </span>
                          {isBestPrice && (
                            <span className="text-[9px] text-emerald-500 ml-1">best</span>
                          )}
                        </TableCell>

                        {/* Lead Time */}
                        <TableCell className="text-xs text-right hidden sm:table-cell">
                          <span
                            className={isBestLeadTime ? 'text-sky-600 font-semibold' : 'text-slate-600'}
                          >
                            {supplier.leadTimeDays}d
                          </span>
                          {isBestLeadTime && (
                            <span className="text-[9px] text-sky-500 ml-1">fastest</span>
                          )}
                        </TableCell>

                        {/* MOQ */}
                        <TableCell className="text-xs text-right text-slate-600 hidden md:table-cell">
                          {supplier.moq.toLocaleString()}
                        </TableCell>

                        {/* Quality Score */}
                        <TableCell className="text-xs hidden sm:table-cell">
                          <QualityScoreBar score={supplier.qualityScore} />
                        </TableCell>

                        {/* Landed Cost */}
                        <TableCell className="text-xs text-right font-medium text-slate-700 hidden lg:table-cell">
                          {formatBDT(supplier.landedCost)}
                        </TableCell>

                        {/* Recommended Star */}
                        <TableCell className="text-xs text-center">
                          {isRecommended ? (
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 inline" />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Recommended supplier summary */}
          {recommended && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-md px-3 py-1.5 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-medium">Recommended:</span>
              <span>{recommended.supplierName}</span>
              <span className="text-emerald-500">—</span>
              <span>
                {formatBDT(recommended.unitPrice)}/unit, {recommended.leadTimeDays} days lead time
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Overall Recommendation Summary ─────────────────────────────────────

function OverallRecommendation({ comparisons }: { comparisons: CostComparison[] }) {
  const recommendations = comparisons
    .map((c) => {
      const rec = c.suppliers.find((s) => s.recommended);
      return rec ? { part: c.partName, supplier: rec.supplierName, landedCost: rec.landedCost } : null;
    })
    .filter(Boolean) as { part: string; supplier: string; landedCost: number }[];

  if (recommendations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: comparisons.length * 0.08 + 0.15, ease: 'easeOut' }}
    >
      <Card className="border border-emerald-200 bg-emerald-50/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-emerald-600" />
            Overall Recommendation / সামগ্রিক সুপারিশ
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="space-y-1.5">
            {recommendations.map((rec) => (
              <div
                key={rec.part}
                className="flex items-center justify-between text-xs bg-white/70 rounded-md px-3 py-1.5 border border-emerald-100"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                  <span className="font-medium text-slate-700">{rec.part}</span>
                </div>
                <span className="text-emerald-700 font-semibold">
                  Best value: {rec.supplier}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Cost Comparison Component ─────────────────────────────────────

export function CostComparison() {
  const { costComparisons, fetchCostComparisons } = useProcurementStore();

  // Fetch on mount if empty
  useEffect(() => {
    if (costComparisons.length === 0) {
      fetchCostComparisons();
    }
  }, [costComparisons.length, fetchCostComparisons]);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-bold text-slate-800">
            Cost Comparison
          </h2>
          <span className="text-sm text-slate-500">/ খরচ তুলনা</span>
        </div>
        <Badge className="bg-purple-50 text-purple-700 border border-purple-300 px-2.5 py-0.5 text-xs font-semibold">
          Multi-Source Analysis
        </Badge>
      </div>

      {/* ── Comparison Cards ── */}
      <div className="space-y-3">
        {costComparisons.map((comparison, index) => (
          <PartComparisonCard
            key={comparison.partName}
            comparison={comparison}
            index={index}
          />
        ))}

        {costComparisons.length === 0 && (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading cost comparisons...
          </div>
        )}
      </div>

      {/* ── Overall Recommendation ── */}
      {costComparisons.length > 0 && (
        <>
          <Separator />
          <OverallRecommendation comparisons={costComparisons} />
        </>
      )}
    </div>
  );
}

export default CostComparison;
