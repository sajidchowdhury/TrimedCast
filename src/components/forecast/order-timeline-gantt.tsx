'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Factory,
  Ship,
  Anchor,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Filter,
  GanttChart,
  Plane,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GanttProduct {
  skuCode: string;
  productName: string;
  category?: string;
  urgency: 'critical' | 'high' | 'normal' | 'low';
  orderTriggerDate: string; // ISO date
  availableDate: string; // ISO date
  timeline: {
    orderTriggerDate: string;
    mfgStartDate: string;
    mfgCompleteDate: string;
    shipDepartureDate: string;
    arrivalDate: string;
    customsClearanceDate: string;
    availableForSaleDate: string;
    totalLeadTimeDays: number;
    cnyDelayDays: number;
  };
  cnyRisk: boolean;
  cnyStrategy?: string;
  recommendedQty: number;
  shippingMethod: 'sea' | 'air';
}

export interface OrderTimelineGanttProps {
  products: GanttProduct[];
  cnyPeriods?: { start: string; end: string; year: number }[];
  showToday?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const URGENCY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const URGENCY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-amber-100 text-amber-700 border-amber-300',
  normal: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-300',
};

const PHASE_COLORS = {
  manufacturing: '#3B82F6',
  shipping: '#10B981',
  customs: '#F59E0B',
} as const;

const ROW_HEIGHT = 44;
const LEFT_PANEL_WIDTH = 220;
const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDate(iso: string): Date {
  return new Date(iso);
}

function toMs(date: Date): number {
  return date.getTime();
}

function fmtShort(iso: string): string {
  const d = parseDate(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UrgencyBadge({ urgency }: { urgency: string }) {
  return (
    <Badge variant="outline" className={`${URGENCY_STYLES[urgency] ?? ''} text-[10px] px-1.5 py-0`}>
      {urgency}
    </Badge>
  );
}

function PhaseBar({
  label,
  color,
  leftPct,
  widthPct,
  startDate,
  endDate,
  days,
}: {
  label: string;
  color: string;
  leftPct: number;
  widthPct: number;
  startDate: string;
  endDate: string;
  days: number;
}) {
  if (widthPct < 0.1) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          className="absolute top-1 bottom-1 rounded-sm cursor-pointer flex items-center justify-center overflow-hidden"
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: color }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {widthPct > 8 && (
            <span className="text-[9px] font-medium text-white truncate px-1 select-none">
              {label}
            </span>
          )}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <span className="font-semibold">{label}</span>: {fmtShort(startDate)} → {fmtShort(endDate)} ({days}d)
      </TooltipContent>
    </Tooltip>
  );
}

function MarkerTrigger({ leftPct, date }: { leftPct: number; date: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="absolute top-0 flex flex-col items-center z-10"
          style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
        >
          <span className="text-red-500 text-[10px] select-none leading-none mt-0.5">▼</span>
          <span className="text-[8px] text-red-500 font-medium select-none whitespace-nowrap">
            {fmtShort(date)}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Order Trigger: {fmtShort(date)}
      </TooltipContent>
    </Tooltip>
  );
}

function MarkerAvailable({ leftPct, date }: { leftPct: number; date: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="absolute bottom-0 flex flex-col items-center z-10"
          style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
        >
          <span className="text-[8px] text-emerald-600 font-medium select-none whitespace-nowrap">
            {fmtShort(date)}
          </span>
          <span className="text-emerald-600 text-[11px] select-none leading-none">✓</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        Available for Sale: {fmtShort(date)}
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OrderTimelineGantt({
  products,
  cnyPeriods = [],
  showToday = true,
}: OrderTimelineGanttProps) {
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  // ---- Sort & filter products ----
  const sortedProducts = useMemo(() => {
    let list = [...products];
    if (urgencyFilter !== 'all') {
      list = list.filter((p) => p.urgency === urgencyFilter);
    }
    list.sort((a, b) => (URGENCY_ORDER[a.urgency] ?? 99) - (URGENCY_ORDER[b.urgency] ?? 99));
    return list;
  }, [products, urgencyFilter]);

  // ---- Pagination ----
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  const pagedProducts = sortedProducts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ---- Calculate date range ----
  const { rangeStart, rangeEnd, rangeMs, months } = useMemo(() => {
    if (sortedProducts.length === 0) {
      const now = new Date();
      const s = new Date(now); s.setDate(s.getDate() - 30);
      const e = new Date(now); e.setDate(e.getDate() + 60);
      return {
        rangeStart: s,
        rangeEnd: e,
        rangeMs: e.getTime() - s.getTime(),
        months: [fmtMonthYear(s)],
      };
    }

    let minMs = Infinity;
    let maxMs = -Infinity;
    for (const p of sortedProducts) {
      const t = p.timeline;
      const dates = [
        t.orderTriggerDate, t.mfgStartDate, t.mfgCompleteDate,
        t.shipDepartureDate, t.arrivalDate, t.customsClearanceDate,
        t.availableForSaleDate,
      ];
      for (const d of dates) {
        const ms = toMs(parseDate(d));
        if (ms < minMs) minMs = ms;
        if (ms > maxMs) maxMs = ms;
      }
    }
    // Include CNY periods in range
    for (const c of cnyPeriods) {
      const s = toMs(parseDate(c.start));
      const e = toMs(parseDate(c.end));
      if (s < minMs) minMs = s;
      if (e > maxMs) maxMs = e;
    }
    // 30-day padding
    const PAD = 30 * 86400000;
    const rangeStart = new Date(minMs - PAD);
    const rangeEnd = new Date(maxMs + PAD);
    const rangeMs = rangeEnd.getTime() - rangeStart.getTime();

    // Generate month labels
    const monthLabels: { label: string; posPct: number }[] = [];
    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cursor.getTime() < rangeEnd.getTime()) {
      const pct = ((cursor.getTime() - rangeStart.getTime()) / rangeMs) * 100;
      monthLabels.push({ label: fmtMonthYear(cursor), posPct: pct });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return { rangeStart, rangeEnd, rangeMs, months: monthLabels };
  }, [sortedProducts, cnyPeriods]);

  // ---- Position helper ----
  const pctPos = (iso: string): number => {
    return ((toMs(parseDate(iso)) - toMs(rangeStart)) / rangeMs) * 100;
  };

  const pctWidth = (startIso: string, endIso: string): number => {
    return ((toMs(parseDate(endIso)) - toMs(parseDate(startIso))) / rangeMs) * 100;
  };

  // ---- Today line position ----
  const todayPct = useMemo(() => {
    if (!showToday) return null;
    const now = Date.now();
    const pct = ((now - toMs(rangeStart)) / rangeMs) * 100;
    return pct >= 0 && pct <= 100 ? pct : null;
  }, [showToday, rangeStart, rangeMs]);

  // ---- CNY zone positions ----
  const cnyZones = useMemo(() => {
    const startMs = toMs(rangeStart);
    return cnyPeriods.map((c) => ({
      left: ((toMs(parseDate(c.start)) - startMs) / rangeMs) * 100,
      width: ((toMs(parseDate(c.end)) - toMs(parseDate(c.start))) / rangeMs) * 100,
      year: c.year,
    }));
  }, [cnyPeriods, rangeStart, rangeMs]);

  const chartHeight = pagedProducts.length * ROW_HEIGHT + 4;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <GanttChart className="h-4 w-4 text-blue-500" />
            Order Timeline Gantt
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Urgency filter */}
            <Select value={urgencyFilter} onValueChange={(v) => { setUrgencyFilter(v); setPage(0); }}>
              <SelectTrigger size="sm" className="w-[130px]">
                <Filter className="h-3.5 w-3.5 mr-1 text-slate-400" />
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgencies</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
              {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {sortedProducts.length === 0 ? (
          <div className="text-sm text-slate-500 py-8 text-center">No products to display.</div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mb-3 text-[10px] text-slate-600">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: PHASE_COLORS.manufacturing }} />
                Manufacturing
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: PHASE_COLORS.shipping }} />
                Shipment
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: PHASE_COLORS.customs }} />
                Customs
              </span>
              <span className="flex items-center gap-1">
                <span className="text-red-500 text-xs">▼</span> Order Trigger
              </span>
              <span className="flex items-center gap-1">
                <span className="text-emerald-600 text-xs">✓</span> Available
              </span>
              {cnyPeriods.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-2 rounded-sm bg-red-500/15 border border-red-300/40" />
                  CNY Shutdown
                </span>
              )}
            </div>

            {/* Scrollable chart area */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <div className="min-w-[700px]">
                {/* Month header row */}
                <div className="relative border-b border-slate-200 bg-slate-50/50" style={{ marginLeft: LEFT_PANEL_WIDTH }}>
                  <div className="relative h-7">
                    {months.map((m, i) => (
                      <div
                        key={i}
                        className="absolute top-0 h-full flex items-end pb-1 text-[10px] text-slate-500 font-medium select-none border-l border-slate-200 pl-1"
                        style={{ left: `${m.posPct}%` }}
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rows */}
                <div className="relative" style={{ height: chartHeight }}>
                  {/* CNY shutdown zones (full height overlay) */}
                  {cnyZones.map((z, i) => (
                    <div
                      key={`cny-${i}`}
                      className="absolute top-0 bottom-0 bg-red-500/15 border-l border-r border-red-300/30 z-0"
                      style={{
                        left: `calc(${LEFT_PANEL_WIDTH}px + ${z.left}%)`,
                        width: `${z.width}%`,
                      }}
                    >
                      {z.width > 3 && (
                        <span className="absolute top-1 left-1 text-[8px] text-red-500 font-semibold rotate-0 select-none">
                          CNY {z.year}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Today line */}
                  {todayPct !== null && (
                    <div
                      className="absolute top-0 bottom-0 z-20 pointer-events-none"
                      style={{ left: `calc(${LEFT_PANEL_WIDTH}px + ${todayPct}%)` }}
                    >
                      <div className="h-full w-0 border-l-2 border-dashed border-slate-400" />
                      <span className="absolute -top-6 left-1 text-[9px] text-slate-500 font-medium whitespace-nowrap select-none">
                        Today
                      </span>
                    </div>
                  )}

                  {/* Product rows */}
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="absolute inset-0"
                  >
                    {pagedProducts.map((product, idx) => {
                      const t = product.timeline;
                      const y = idx * ROW_HEIGHT;

                      const mfgLeft = pctPos(t.mfgStartDate);
                      const mfgWidth = pctWidth(t.mfgStartDate, t.mfgCompleteDate);
                      const mfgDays = diffDays(t.mfgStartDate, t.mfgCompleteDate);

                      const shipLeft = pctPos(t.shipDepartureDate);
                      const shipWidth = pctWidth(t.shipDepartureDate, t.arrivalDate);
                      const shipDays = diffDays(t.shipDepartureDate, t.arrivalDate);

                      const customsLeft = pctPos(t.arrivalDate);
                      const customsWidth = pctWidth(t.arrivalDate, t.customsClearanceDate);
                      const customsDays = diffDays(t.arrivalDate, t.customsClearanceDate);

                      const triggerPct = pctPos(t.orderTriggerDate);
                      const availablePct = pctPos(t.availableForSaleDate);

                      return (
                        <motion.div
                          key={product.skuCode}
                          variants={rowVariants}
                          className="absolute left-0 right-0 flex items-stretch border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                          style={{ top: y, height: ROW_HEIGHT }}
                        >
                          {/* Left panel: SKU + name + urgency */}
                          <div
                            className="flex-shrink-0 border-r border-slate-200 px-2 py-1 flex flex-col justify-center gap-0.5 bg-white z-10"
                            style={{ width: LEFT_PANEL_WIDTH }}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[11px] font-mono font-semibold text-slate-700 truncate">
                                {product.skuCode}
                              </span>
                              <UrgencyBadge urgency={product.urgency} />
                              {product.cnyRisk && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    CNY Risk: +{t.cnyDelayDays}d delay
                                    {product.cnyStrategy ? ` — ${product.cnyStrategy}` : ''}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {product.shippingMethod === 'air' && (
                                <Plane className="h-3 w-3 text-sky-500 flex-shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 truncate leading-tight">
                              {product.productName}
                            </span>
                          </div>

                          {/* Chart area */}
                          <div className="flex-1 relative">
                            {/* Manufacturing bar */}
                            <PhaseBar
                              label="Mfg"
                              color={PHASE_COLORS.manufacturing}
                              leftPct={mfgLeft}
                              widthPct={mfgWidth}
                              startDate={t.mfgStartDate}
                              endDate={t.mfgCompleteDate}
                              days={mfgDays}
                            />
                            {/* Shipping bar */}
                            <PhaseBar
                              label={product.shippingMethod === 'air' ? 'Air' : 'Ship'}
                              color={PHASE_COLORS.shipping}
                              leftPct={shipLeft}
                              widthPct={shipWidth}
                              startDate={t.shipDepartureDate}
                              endDate={t.arrivalDate}
                              days={shipDays}
                            />
                            {/* Customs bar */}
                            <PhaseBar
                              label="Customs"
                              color={PHASE_COLORS.customs}
                              leftPct={customsLeft}
                              widthPct={customsWidth}
                              startDate={t.arrivalDate}
                              endDate={t.customsClearanceDate}
                              days={customsDays}
                            />

                            {/* Order trigger marker */}
                            <MarkerTrigger leftPct={triggerPct} date={t.orderTriggerDate} />

                            {/* Available date marker */}
                            <MarkerAvailable leftPct={availablePct} date={t.availableForSaleDate} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>

                {/* Summary row */}
                <div className="flex items-center border-t border-slate-200 bg-slate-50/30 px-2 py-1.5 text-[10px] text-slate-500" style={{ paddingLeft: LEFT_PANEL_WIDTH + 8 }}>
                  <Factory className="h-3 w-3 mr-1 text-blue-500" />
                  <span>Mfg</span>
                  <span className="mx-2">|</span>
                  <Ship className="h-3 w-3 mr-1 text-emerald-500" />
                  <span>Ship</span>
                  <span className="mx-2">|</span>
                  <Anchor className="h-3 w-3 mr-1 text-amber-500" />
                  <span>Customs</span>
                  <span className="mx-2">|</span>
                  <span className="font-medium">Total Lead: </span>
                  <span>varies per product</span>
                </div>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-500">
                  Page {page + 1} of {totalPages} ({sortedProducts.length} products)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i}
                      variant={page === i ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setPage(i)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
