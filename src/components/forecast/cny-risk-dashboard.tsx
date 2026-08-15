'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  TrendingDown,
  Zap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CNYRiskDashboardProps {
  cnyCalendar: {
    years: any[];
    current: {
      year: number;
      shutdownStart: string;
      shutdownEnd: string;
      daysRemaining: number;
    } | null;
    next: {
      year: number;
      shutdownStart: string;
      shutdownEnd: string;
      daysUntil: number;
      rushDeadline?: string;
    } | null;
  };
  affectedProducts: {
    skuCode: string;
    productName: string;
    urgency: string;
    cnyStrategy: string;
    overlapDays: number;
    additionalDelayDays: number;
    latestSafeOrderDate?: string;
    explanation: string;
  }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtFull(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function daysUntil(dateStr: string): number {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UrgencyDot({ urgency }: { urgency: string }) {
  const colorMap: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-amber-500',
    normal: 'bg-yellow-400',
    low: 'bg-emerald-400',
  };
  return (
    <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${colorMap[urgency] ?? 'bg-slate-300'}`} />
  );
}

/** Visual timeline bar showing safe/risky zones relative to CNY shutdown. */
function SafeRiskyBar({
  shutdownStart,
  shutdownEnd,
  rushDeadline,
}: {
  shutdownStart: string;
  shutdownEnd: string;
  rushDeadline?: string;
}) {
  const totalDays = daysBetween(shutdownStart, shutdownEnd) + 60; // padding before/after
  const startMs = new Date(shutdownStart).getTime() - 30 * 86400000;
  const totalMs = totalDays * 86400000;

  const pctPos = (iso: string): number => {
    return ((new Date(iso).getTime() - startMs) / totalMs) * 100;
  };

  const shutdownStartPct = pctPos(shutdownStart);
  const shutdownEndPct = pctPos(shutdownEnd);
  const rushPct = rushDeadline ? pctPos(rushDeadline) : null;
  const todayPct = ((Date.now() - startMs) / totalMs) * 100;

  return (
    <div className="relative h-6 w-full rounded-full bg-emerald-100 overflow-hidden">
      {/* CNY shutdown zone (risky) */}
      <div
        className="absolute top-0 h-full bg-red-400/70"
        style={{ left: `${shutdownStartPct}%`, width: `${shutdownEndPct - shutdownStartPct}%` }}
      />

      {/* Rush deadline marker */}
      {rushPct !== null && rushPct >= 0 && rushPct <= 100 && (
        <div
          className="absolute top-0 h-full w-0.5 bg-amber-500 z-10"
          style={{ left: `${rushPct}%` }}
        >
          <span className="absolute -top-3.5 left-1 text-[8px] text-amber-600 font-semibold whitespace-nowrap">
            Rush
          </span>
        </div>
      )}

      {/* Today marker */}
      {todayPct >= 0 && todayPct <= 100 && (
        <div
          className="absolute top-0 h-full w-0.5 bg-slate-800 z-20"
          style={{ left: `${todayPct}%` }}
        >
          <span className="absolute -top-3.5 left-1 text-[8px] text-slate-600 font-semibold whitespace-nowrap">
            Now
          </span>
        </div>
      )}

      {/* Labels */}
      <div className="absolute inset-0 flex items-center">
        <span className="text-[8px] text-emerald-700 font-medium pl-1 select-none">Safe</span>
        <span
          className="absolute text-[8px] text-red-100 font-semibold select-none"
          style={{ left: `${(shutdownStartPct + shutdownEndPct) / 2}%`, transform: 'translateX(-50%)' }}
        >
          CNY Shutdown
        </span>
        <span className="absolute right-1 text-[8px] text-emerald-700 font-medium select-none">Safe</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CNYRiskDashboard({ cnyCalendar, affectedProducts }: CNYRiskDashboardProps) {
  const current = cnyCalendar.current;
  const next = cnyCalendar.next;

  // Strategy breakdown
  const strategyBreakdown = useMemo(() => {
    const before = affectedProducts.filter((p) => p.cnyStrategy === 'before_cny').length;
    const after = affectedProducts.filter((p) => p.cnyStrategy === 'after_cny').length;
    return { before, after };
  }, [affectedProducts]);

  // Total additional delay
  const totalDelayDays = useMemo(() => {
    return affectedProducts.reduce((sum, p) => sum + p.additionalDelayDays, 0);
  }, [affectedProducts]);

  // Safe order deadline: earliest latestSafeOrderDate among before_cny products
  const safeOrderDeadline = useMemo(() => {
    const beforeProducts = affectedProducts.filter(
      (p) => p.cnyStrategy === 'before_cny' && p.latestSafeOrderDate,
    );
    if (beforeProducts.length === 0) return null;
    beforeProducts.sort(
      (a, b) => new Date(a.latestSafeOrderDate!).getTime() - new Date(b.latestSafeOrderDate!).getTime(),
    );
    return beforeProducts[0].latestSafeOrderDate!;
  }, [affectedProducts]);

  // Sort affected products: critical first
  const sortedAffected = useMemo(() => {
    const order: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
    return [...affectedProducts].sort((a, b) => (order[a.urgency] ?? 99) - (order[b.urgency] ?? 99));
  }, [affectedProducts]);

  const isShutdownActive = current !== null && current.daysRemaining > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            CNY Risk Dashboard
          </CardTitle>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              isShutdownActive
                ? 'bg-red-100 text-red-700 border-red-300'
                : next && next.daysUntil <= 90
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {isShutdownActive ? 'ACTIVE' : next && next.daysUntil <= 90 ? 'APPROACHING' : 'MONITORING'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ---- CNY Window Status ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Current CNY */}
          {current && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`rounded-lg p-3 border ${
                isShutdownActive
                  ? 'bg-red-50 border-red-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {isShutdownActive ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-slate-400" />
                )}
                <span className="text-xs font-semibold text-slate-700">
                  CNY {current.year}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mb-1">
                {fmtShort(current.shutdownStart)} – {fmtShort(current.shutdownEnd)}
              </div>
              {isShutdownActive ? (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-red-500" />
                  <span className="text-xs font-semibold text-red-600">
                    {current.daysRemaining} days remaining
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Shutdown ended</span>
              )}
            </motion.div>
          )}

          {/* Next CNY */}
          {next && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="rounded-lg p-3 border bg-amber-50 border-amber-200"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">
                  CNY {next.year} — {next.daysUntil} days away
                </span>
              </div>
              <div className="text-[11px] text-amber-600 mb-1">
                {fmtShort(next.shutdownStart)} – {fmtShort(next.shutdownEnd)}
              </div>
              {next.rushDeadline && (
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-500" />
                  <span className="text-[11px] text-amber-700 font-medium">
                    Rush by {fmtShort(next.rushDeadline)}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* ---- Safe/Risky Timeline Bar ---- */}
        {next && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-1"
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Timeline — Safe vs Risky Zone
            </div>
            <SafeRiskyBar
              shutdownStart={next.shutdownStart}
              shutdownEnd={next.shutdownEnd}
              rushDeadline={next.rushDeadline}
            />
          </motion.div>
        )}

        {/* ---- Strategy Breakdown + Stats ---- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <div className="text-lg font-bold text-red-600">{affectedProducts.length}</div>
            <div className="text-[10px] text-slate-500">Affected Products</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <div className="text-lg font-bold text-amber-600">{strategyBreakdown.before}</div>
            <div className="text-[10px] text-slate-500">Order Before CNY</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <div className="text-lg font-bold text-slate-600">{strategyBreakdown.after}</div>
            <div className="text-[10px] text-slate-500">Order After CNY</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <div className="text-lg font-bold text-red-500">+{totalDelayDays}d</div>
            <div className="text-[10px] text-slate-500">Total Delay Impact</div>
          </div>
        </div>

        {/* ---- Safe Order Deadline ---- */}
        {safeOrderDeadline && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-emerald-800">
                Safe Order Deadline: {fmtFull(safeOrderDeadline)}
              </div>
              <div className="text-[10px] text-emerald-600">
                Place &quot;Order Before CNY&quot; products by this date to avoid shutdown delays
                ({daysUntil(safeOrderDeadline) > 0 ? `${daysUntil(safeOrderDeadline)} days from now` : 'deadline passed'})
              </div>
            </div>
          </motion.div>
        )}

        {/* ---- Affected Products List ---- */}
        {sortedAffected.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Affected Products ({sortedAffected.length})
            </div>

            <div className="max-h-[240px] overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                {sortedAffected.map((product) => (
                  <motion.div
                    key={product.skuCode}
                    variants={itemVariants}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <UrgencyDot urgency={product.urgency} />
                    <span className="text-[11px] font-mono font-medium text-slate-700 w-20 truncate flex-shrink-0">
                      {product.skuCode}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate flex-1 min-w-0">
                      {product.productName}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 flex-shrink-0 ${
                        product.cnyStrategy === 'before_cny'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {product.cnyStrategy === 'before_cny' ? 'Before' : 'After'}
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] text-red-500 font-medium flex-shrink-0 w-14 text-right">
                          +{product.additionalDelayDays}d
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[280px]">
                        {product.explanation}
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 w-10 text-right">
                      {product.overlapDays}d overlap
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ---- Empty state ---- */}
        {affectedProducts.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-6 flex flex-col items-center gap-1">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <span>No products affected by CNY shutdown</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
