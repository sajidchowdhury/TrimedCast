'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Package,
  Factory,
  Ship,
  Anchor,
  ShieldCheck,
  Warehouse,
  CalendarClock,
  Truck,
  AlertTriangle,
  Clock,
  Plane,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrderTimelineProps {
  orderDate: string; // ISO date
  leadTimeBreakdown: {
    manufacturing: number;
    shipping: number;
    customs: number;
    internal: number;
  };
  shippingMethod: 'sea' | 'air';
  cnyRisk?: boolean;
  cnyDelayDays?: number;
  cnyPeriod?: { start: string; end: string }; // CNY shutdown dates
  compact?: boolean; // compact mode for embedding in table rows
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(iso: string, days: number): Date {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateFull(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Milestone definition
// ---------------------------------------------------------------------------

interface Milestone {
  label: string;
  icon: React.ReactNode;
  date: Date;
  /** Cumulative day offset from order date */
  dayOffset: number;
  color: string;
}

// ---------------------------------------------------------------------------
// Segment colors matching the spec
// ---------------------------------------------------------------------------

const SEGMENT_COLORS = {
  manufacturing: 'bg-blue-600',
  manufacturingLight: 'bg-blue-400',
  shipping: 'bg-emerald-500',
  shippingLight: 'bg-emerald-300',
  customs: 'bg-amber-500',
  customsLight: 'bg-amber-300',
  internal: 'bg-gray-400',
  internalLight: 'bg-gray-200',
} as const;

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const barVariants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

// ---------------------------------------------------------------------------
// Compact Timeline (single line bar with milestone dots, no labels)
// ---------------------------------------------------------------------------

function CompactTimeline({
  milestones,
  totalDays,
  todayOffset,
  cnyOffset,
  cnyWidth,
}: {
  milestones: Milestone[];
  totalDays: number;
  todayOffset: number | null;
  cnyOffset: number | null;
  cnyWidth: number | null;
}) {
  return (
    <div className="relative w-full py-1">
      {/* Background track */}
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
        {milestones.slice(0, -1).map((m, i) => {
          const next = milestones[i + 1];
          const segDays = next.dayOffset - m.dayOffset;
          const widthPct = (segDays / totalDays) * 100;
          const colorClass =
            i === 0
              ? SEGMENT_COLORS.manufacturing
              : i === 1
                ? SEGMENT_COLORS.shipping
                : i === 2
                  ? SEGMENT_COLORS.customs
                  : SEGMENT_COLORS.internal;
          return (
            <motion.div
              key={i}
              className={`${colorClass} first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${widthPct}%`, transformOrigin: 'left' }}
              variants={barVariants}
              initial="hidden"
              animate="visible"
            />
          );
        })}
      </div>

      {/* CNY overlay */}
      {cnyOffset !== null && cnyWidth !== null && (
        <div
          className="absolute top-1 h-3 bg-red-400/40 rounded-sm"
          style={{
            left: `${(cnyOffset / totalDays) * 100}%`,
            width: `${(cnyWidth / totalDays) * 100}%`,
          }}
        />
      )}

      {/* Today marker */}
      {todayOffset !== null && todayOffset >= 0 && todayOffset <= totalDays && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-800"
          style={{ left: `${(todayOffset / totalDays) * 100}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-800" />
        </div>
      )}

      {/* Milestone dots */}
      <div className="absolute inset-0 flex items-center">
        {milestones.map((m, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <motion.div
                className="absolute w-3 h-3 rounded-full border-2 border-white shadow-sm cursor-default"
                style={{
                  left: `${(m.dayOffset / totalDays) * 100}%`,
                  transform: 'translateX(-50%)',
                  backgroundColor:
                    i === 0
                      ? '#475569'
                      : i === milestones.length - 1
                        ? '#10b981'
                        : '#3b82f6',
                }}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-medium">{m.label}</p>
              <p className="text-[10px] opacity-80">{formatDateFull(m.date)}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full Timeline (horizontal bar with milestone dots, dates, icons, labels)
// ---------------------------------------------------------------------------

function FullTimeline({
  milestones,
  segments,
  totalDays,
  todayOffset,
  cnyOffset,
  cnyWidth,
  orderDate,
  cnyRisk,
  cnyDelayDays,
  cnyPeriod,
  shippingMethod,
}: {
  milestones: Milestone[];
  segments: { label: string; days: number; color: string; icon: React.ReactNode }[];
  totalDays: number;
  todayOffset: number | null;
  cnyOffset: number | null;
  cnyWidth: number | null;
  orderDate: string;
  cnyRisk?: boolean;
  cnyDelayDays?: number;
  cnyPeriod?: { start: string; end: string };
  shippingMethod: 'sea' | 'air';
}) {
  const deliveryDate = milestones[milestones.length - 1].date;
  const totalWithCny = totalDays + (cnyDelayDays ?? 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4 text-blue-500" />
          Order Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div
          className="space-y-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Summary Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Lead Time</p>
              <p className="text-xl font-bold text-slate-800">
                {totalWithCny} <span className="text-xs font-normal text-slate-500">days</span>
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Order Date</p>
              <p className="text-sm font-semibold text-slate-700">{formatDateFull(new Date(orderDate))}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Expected Delivery</p>
              <p className="text-sm font-semibold text-slate-700">{formatDateFull(deliveryDate)}</p>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">CNY Risk</p>
              {cnyRisk ? (
                <Badge variant="destructive" className="mt-1">
                  <AlertTriangle className="h-3 w-3 mr-0.5" />
                  Yes (+{cnyDelayDays ?? 0}d)
                </Badge>
              ) : (
                <Badge variant="secondary" className="mt-1 bg-emerald-100 text-emerald-700">
                  No
                </Badge>
              )}
            </div>
          </motion.div>

          {/* Desktop: Horizontal Gantt */}
          <motion.div variants={itemVariants} className="hidden sm:block">
            <HorizontalGantt
              milestones={milestones}
              segments={segments}
              totalDays={totalDays}
              todayOffset={todayOffset}
              cnyOffset={cnyOffset}
              cnyWidth={cnyWidth}
              cnyPeriod={cnyPeriod}
              shippingMethod={shippingMethod}
            />
          </motion.div>

          {/* Mobile: Vertical Stack */}
          <motion.div variants={itemVariants} className="block sm:hidden">
            <VerticalGantt
              milestones={milestones}
              segments={segments}
              totalDays={totalDays}
              todayOffset={todayOffset}
            />
          </motion.div>

          {/* Segment Legend */}
          <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
            {segments.map((seg, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`inline-block w-3 h-2 rounded-sm ${seg.color}`} />
                {seg.label} ({seg.days}d)
              </div>
            ))}
            {cnyRisk && cnyDelayDays && cnyDelayDays > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <span className="inline-block w-3 h-2 rounded-sm bg-red-400/60" />
                CNY Delay (+{cnyDelayDays}d)
              </div>
            )}
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Horizontal Gantt (desktop)
// ---------------------------------------------------------------------------

function HorizontalGantt({
  milestones,
  segments,
  totalDays,
  todayOffset,
  cnyOffset,
  cnyWidth,
  cnyPeriod,
  shippingMethod,
}: {
  milestones: Milestone[];
  segments: { label: string; days: number; color: string; icon: React.ReactNode }[];
  totalDays: number;
  todayOffset: number | null;
  cnyOffset: number | null;
  cnyWidth: number | null;
  cnyPeriod?: { start: string; end: string };
  shippingMethod: 'sea' | 'air';
}) {
  return (
    <div className="relative pt-10 pb-8">
      {/* Colored bar segments */}
      <div className="flex h-8 rounded-lg overflow-hidden">
        {segments.map((seg, i) => {
          const widthPct = (seg.days / totalDays) * 100;
          return (
            <motion.div
              key={i}
              className={`${seg.color} flex items-center justify-center text-white text-[11px] font-medium relative`}
              style={{ width: `${widthPct}%`, transformOrigin: 'left' }}
              variants={barVariants}
              initial="hidden"
              animate="visible"
              title={`${seg.label}: ${seg.days} days`}
            >
              {widthPct > 8 && (
                <span className="truncate px-1">
                  {seg.label} {seg.days}d
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* CNY Shutdown overlay */}
      {cnyOffset !== null && cnyWidth !== null && (
        <motion.div
          className="absolute top-10 h-8 bg-red-500/25 border-l-2 border-r-2 border-red-500/60 flex items-center justify-center rounded-sm"
          style={{
            left: `${(cnyOffset / totalDays) * 100}%`,
            width: `${(cnyWidth / totalDays) * 100}%`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <span className="text-[9px] font-semibold text-red-700 bg-red-100/80 px-1.5 py-0.5 rounded whitespace-nowrap">
            CNY Shutdown
          </span>
        </motion.div>
      )}

      {/* Today marker */}
      {todayOffset !== null && todayOffset >= 0 && todayOffset <= totalDays && (
        <motion.div
          className="absolute top-6 bottom-0 w-0.5 bg-slate-700 z-10"
          style={{ left: `${(todayOffset / totalDays) * 100}%` }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-slate-700 bg-white px-1 rounded shadow-sm whitespace-nowrap">
            Today
          </div>
        </motion.div>
      )}

      {/* Milestone dots with icons above and dates below */}
      {milestones.map((m, i) => {
        const leftPct = (m.dayOffset / totalDays) * 100;
        return (
          <motion.div
            key={i}
            className="absolute flex flex-col items-center"
            style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Icon above */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm mb-1 ${
                i === 0
                  ? 'bg-slate-100 text-slate-600'
                  : i === milestones.length - 1
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-blue-50 text-blue-600'
              }`}
            >
              {m.icon}
            </div>

            {/* Dot on the bar */}
            <div
              className={`w-4 h-4 rounded-full border-[3px] border-white shadow-md z-10 ${
                i === 0
                  ? 'bg-slate-500'
                  : i === milestones.length - 1
                    ? 'bg-emerald-500'
                    : 'bg-blue-500'
              }`}
            />

            {/* Date label below */}
            <span className="text-[10px] text-slate-500 mt-1 whitespace-nowrap font-medium">
              {formatDate(m.date)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vertical Gantt (mobile)
// ---------------------------------------------------------------------------

function VerticalGantt({
  milestones,
  segments,
  totalDays,
  todayOffset,
}: {
  milestones: Milestone[];
  segments: { label: string; days: number; color: string; icon: React.ReactNode }[];
  totalDays: number;
  todayOffset: number | null;
}) {
  return (
    <div className="relative pl-10 space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-200" />

      {/* Today position (if within range) */}
      {todayOffset !== null && todayOffset >= 0 && todayOffset <= totalDays && (
        <div
          className="absolute left-0 right-0 h-0.5 bg-slate-400 z-10"
          style={{ top: `${(todayOffset / totalDays) * 100}%` }}
        >
          <span className="absolute -left-10 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-slate-600">
            Now
          </span>
        </div>
      )}

      {milestones.map((m, i) => {
        const seg = i < segments.length ? segments[i] : null;
        const isLast = i === milestones.length - 1;
        return (
          <motion.div
            key={i}
            className="relative flex items-start gap-3 pb-4"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Dot on the line */}
            <div
              className={`absolute left-[-21px] w-5 h-5 rounded-full border-[3px] border-white shadow-sm z-10 ${
                i === 0
                  ? 'bg-slate-500'
                  : isLast
                    ? 'bg-emerald-500'
                    : 'bg-blue-500'
              }`}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    i === 0
                      ? 'bg-slate-100 text-slate-600'
                      : isLast
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {m.icon}
                </div>
                <span className="text-sm font-medium text-slate-700">{m.label}</span>
                <span className="text-[10px] text-slate-400 ml-auto">{formatDateFull(m.date)}</span>
              </div>
              {seg && (
                <div className="flex items-center gap-2 mt-1 ml-8">
                  <span className={`inline-block w-full h-2 rounded-sm ${seg.color}`} style={{ maxWidth: '120px' }} />
                  <span className="text-[10px] text-slate-500">
                    {seg.label}: {seg.days}d
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export function OrderTimeline({
  orderDate,
  leadTimeBreakdown,
  shippingMethod,
  cnyRisk = false,
  cnyDelayDays = 0,
  cnyPeriod,
  compact = false,
}: OrderTimelineProps) {
  const { milestones, segments, totalDays, todayOffset, cnyOffset, cnyWidth } = useMemo(() => {
    const bd = leadTimeBreakdown;
    const total = bd.manufacturing + bd.shipping + bd.customs + bd.internal;

    // Cumulative offsets for each milestone
    const offsets = [
      0,
      bd.manufacturing,
      bd.manufacturing + bd.shipping,
      bd.manufacturing + bd.shipping + bd.customs,
      bd.manufacturing + bd.shipping + bd.customs + bd.internal,
    ];
    // The 6th milestone is same as 5th (Available = after internal processing)
    // But per spec: 6 milestones from Order to Availability
    // Offsets: 0, mfg, mfg+ship, mfg+ship+customs, mfg+ship+customs+internal
    // But the 6th milestone "Available" is at the same offset as the 5th "Customs Cleared" + internal

    const milestoneDates = offsets.map((off) => addDays(orderDate, off));

    const milestoneList: Milestone[] = [
      {
        label: 'Order Placed',
        icon: <Package className="h-3.5 w-3.5" />,
        date: milestoneDates[0],
        dayOffset: offsets[0],
        color: 'slate',
      },
      {
        label: 'Mfg Complete',
        icon: <Factory className="h-3.5 w-3.5" />,
        date: milestoneDates[1],
        dayOffset: offsets[1],
        color: 'blue',
      },
      {
        label: 'Shipped',
        icon: shippingMethod === 'air' ? <Plane className="h-3.5 w-3.5" /> : <Ship className="h-3.5 w-3.5" />,
        date: milestoneDates[2],
        dayOffset: offsets[2],
        color: 'emerald',
      },
      {
        label: 'Arrived at Port',
        icon: <Anchor className="h-3.5 w-3.5" />,
        date: milestoneDates[2],
        dayOffset: offsets[2],
        color: 'emerald',
      },
      {
        label: 'Customs Cleared',
        icon: <ShieldCheck className="h-3.5 w-3.5" />,
        date: milestoneDates[3],
        dayOffset: offsets[3],
        color: 'amber',
      },
      {
        label: 'Available',
        icon: <Warehouse className="h-3.5 w-3.5" />,
        date: milestoneDates[4],
        dayOffset: offsets[4],
        color: 'emerald',
      },
    ];

    // Fix: "Arrived at Port" is at the end of shipping, which is offsets[2]
    // But shipping includes transit, so "Shipped" is start of shipping, "Arrived" is end of shipping
    // Let me recalculate: Shipped = after manufacturing starts shipping (offsets[1])
    // Arrived at Port = after shipping completes (offsets[2])
    milestoneList[2] = {
      ...milestoneList[2],
      date: addDays(orderDate, offsets[1]), // Shipped date = after manufacturing
      dayOffset: offsets[1],
    };
    milestoneList[3] = {
      ...milestoneList[3],
      date: addDays(orderDate, offsets[2]), // Arrived at Port = after shipping
      dayOffset: offsets[2],
    };

    const segmentList = [
      {
        label: 'Manufacturing',
        days: bd.manufacturing,
        color: SEGMENT_COLORS.manufacturing,
        icon: <Factory className="h-3 w-3" />,
      },
      {
        label: shippingMethod === 'air' ? 'Air Shipping' : 'Sea Shipping',
        days: bd.shipping,
        color: SEGMENT_COLORS.shipping,
        icon: shippingMethod === 'air' ? <Plane className="h-3 w-3" /> : <Ship className="h-3 w-3" />,
      },
      {
        label: 'Customs',
        days: bd.customs,
        color: SEGMENT_COLORS.customs,
        icon: <ShieldCheck className="h-3 w-3" />,
      },
      {
        label: 'Internal',
        days: bd.internal,
        color: SEGMENT_COLORS.internal,
        icon: <Warehouse className="h-3 w-3" />,
      },
    ];

    // Today offset (days from order date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const orderD = new Date(orderDate);
    orderD.setHours(0, 0, 0, 0);
    const todayOff = daysBetween(orderD, today);

    // CNY overlay calculation
    let cnyOff: number | null = null;
    let cnyW: number | null = null;
    if (cnyPeriod) {
      const cnyStart = new Date(cnyPeriod.start);
      cnyStart.setHours(0, 0, 0, 0);
      const cnyEnd = new Date(cnyPeriod.end);
      cnyEnd.setHours(0, 0, 0, 0);
      const cnyStartOff = daysBetween(orderD, cnyStart);
      const cnyEndOff = daysBetween(orderD, cnyEnd);
      // Only show if within timeline range
      if (cnyEndOff > 0 && cnyStartOff < total) {
        cnyOff = Math.max(0, cnyStartOff);
        cnyW = Math.min(total, cnyEndOff) - cnyOff;
      }
    }

    return {
      milestones: milestoneList,
      segments: segmentList,
      totalDays: total,
      todayOffset: todayOff >= 0 && todayOff <= total ? todayOff : null,
      cnyOffset: cnyOff,
      cnyWidth: cnyW,
    };
  }, [orderDate, leadTimeBreakdown, shippingMethod, cnyPeriod]);

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full min-w-[200px]">
            <CompactTimeline
              milestones={milestones}
              totalDays={totalDays}
              todayOffset={todayOffset}
              cnyOffset={cnyOffset}
              cnyWidth={cnyWidth}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="font-medium">Order Timeline</p>
          <p className="text-[10px] opacity-80">
            {totalDays + (cnyDelayDays ?? 0)}d total &middot; {shippingMethod === 'air' ? 'Air' : 'Sea'} freight
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <FullTimeline
      milestones={milestones}
      segments={segments}
      totalDays={totalDays}
      todayOffset={todayOffset}
      cnyOffset={cnyOffset}
      cnyWidth={cnyWidth}
      orderDate={orderDate}
      cnyRisk={cnyRisk}
      cnyDelayDays={cnyDelayDays}
      cnyPeriod={cnyPeriod}
      shippingMethod={shippingMethod}
    />
  );
}
