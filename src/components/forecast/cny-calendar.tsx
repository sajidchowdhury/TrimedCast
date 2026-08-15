'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CNYPeriod {
  year: number;
  lunarNewYear: string;
  shutdownStart: string;
  shutdownEnd: string;
  effectiveStart: string;
  effectiveEnd: string;
  rushDeadline: string;
  shutdownDays: number;
  isCurrentlyActive: boolean;
  isUpcoming: boolean;
  daysUntilShutdown: number;
}

interface CNYCalendarData {
  years: CNYPeriod[];
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
  } | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

function getStatus(period: CNYPeriod, current: CNYCalendarData['current']): 'ACTIVE' | 'UPCOMING' | 'PAST' {
  const now = new Date();
  const shutdownStart = new Date(period.shutdownStart);
  const shutdownEnd = new Date(period.shutdownEnd);

  if (current && current.year === period.year) return 'ACTIVE';
  if (now < shutdownStart) return 'UPCOMING';
  return 'PAST';
}

/** Return 0-12 representing the month position within the year for the timeline bar. */
function monthFraction(dateStr: string): number {
  const d = new Date(dateStr);
  return d.getMonth() + d.getDate() / 30;
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

/* ------------------------------------------------------------------ */
/*  Status badge colours                                               */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-red-100 text-red-700 border-red-300',
  UPCOMING: 'bg-amber-100 text-amber-700 border-amber-300',
  PAST: 'bg-slate-100 text-slate-500 border-slate-200',
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TimelineBar({ period }: { period: CNYPeriod }) {
  const startFrac = monthFraction(period.shutdownStart) / 12;
  const endFrac = monthFraction(period.shutdownEnd) / 12;
  const leftPct = Math.max(startFrac * 100, 0);
  const widthPct = Math.max((endFrac - startFrac) * 100, 2);

  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  return (
    <div className="w-full">
      <div className="relative h-6 rounded-full bg-slate-100 overflow-hidden">
        {/* Shutdown shaded region */}
        <div
          className="absolute top-0 h-full rounded-full bg-red-400/70"
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />
        {/* Month markers */}
        <div className="absolute inset-0 flex">
          {months.map((m, i) => (
            <div
              key={i}
              className="flex-1 flex items-center justify-center text-[8px] text-slate-400 font-medium select-none"
            >
              {m}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PeriodRow({
  period,
  status,
  isCurrent,
}: {
  period: CNYPeriod;
  status: 'ACTIVE' | 'UPCOMING' | 'PAST';
  isCurrent: boolean;
}) {
  return (
    <motion.div variants={itemVariants} className="group">
      {/* Desktop: horizontal row */}
      <div className="hidden lg:flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-slate-50 transition-colors">
        {/* Year badge */}
        <span
          className={`text-sm font-bold w-12 text-center flex-shrink-0 ${
            status === 'ACTIVE'
              ? 'text-red-600'
              : status === 'UPCOMING'
                ? 'text-amber-600'
                : 'text-slate-400'
          }`}
        >
          {period.year}
        </span>

        {/* Lunar New Year date */}
        <span className="text-xs text-slate-500 w-24 flex-shrink-0">
          {fmtFull(period.lunarNewYearDate)}
        </span>

        {/* Shutdown window */}
        <span className="text-xs font-medium text-slate-700 w-28 flex-shrink-0">
          {fmtShort(period.shutdownStart)} – {fmtShort(period.shutdownEnd)}
        </span>

        {/* Timeline bar */}
        <div className="flex-1 min-w-[120px]">
          <TimelineBar period={period} />
        </div>

        {/* Rush deadline badge */}
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] whitespace-nowrap flex-shrink-0"
        >
          <Clock className="h-3 w-3 mr-0.5" />
          Rush by {fmtShort(period.rushDeadline)}
        </Badge>

        {/* Restart badge */}
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] whitespace-nowrap flex-shrink-0"
        >
          <CheckCircle className="h-3 w-3 mr-0.5" />
          Restarts {fmtShort(period.restartDate)}
        </Badge>

        {/* Shutdown days */}
        <span className="text-xs font-medium text-slate-600 w-16 text-right flex-shrink-0">
          {period.shutdownDays} days
        </span>

        {/* Status badge */}
        <Badge
          variant="outline"
          className={`${STATUS_STYLES[status]} text-[10px] flex-shrink-0`}
        >
          {status}
        </Badge>
      </div>

      {/* Mobile: stacked card */}
      <div className="lg:hidden p-3 rounded-lg border border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-bold ${
              status === 'ACTIVE'
                ? 'text-red-600'
                : status === 'UPCOMING'
                  ? 'text-amber-600'
                  : 'text-slate-400'
            }`}
          >
            CNY {period.year}
          </span>
          <Badge
            variant="outline"
            className={`${STATUS_STYLES[status]} text-[10px]`}
          >
            {status}
          </Badge>
        </div>

        <div className="text-xs text-slate-500">
          Lunar New Year: <span className="text-slate-700 font-medium">{fmtFull(period.lunarNewYearDate)}</span>
        </div>

        <div className="text-xs text-slate-500">
          Shutdown: <span className="text-slate-700 font-medium">{fmtShort(period.shutdownStart)} – {fmtShort(period.shutdownEnd)}</span>
          <span className="ml-2 text-slate-400">({period.shutdownDays} days)</span>
        </div>

        <TimelineBar period={period} />

        <div className="flex flex-wrap gap-2 pt-1">
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
          >
            <Clock className="h-3 w-3 mr-0.5" />
            Rush by {fmtShort(period.rushDeadline)}
          </Badge>
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
          >
            <CheckCircle className="h-3 w-3 mr-0.5" />
            Restarts {fmtShort(period.restartDate)}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function CNYCalendar() {
  const [data, setData] = useState<CNYCalendarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scrollYear, setScrollYear] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/cny-calendar')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: CNYCalendarData) => {
        if (!cancelled) {
          setData(json);
          setScrollYear(json.periods?.[0]?.year ?? 2025);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load CNY calendar');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Loading state */
  if (!data && !error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-red-500" />
            Chinese New Year Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4 animate-pulse" />
            Loading CNY calendar data…
          </div>
        </CardContent>
      </Card>
    );
  }

  /* Error state */
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-red-500" />
            Chinese New Year Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const periods = data!.years || [];
  const current = data!.current;
  const next = data!.next;

  if (periods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-red-500" />
            Chinese New Year Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500">No CNY calendar data available.</div>
        </CardContent>
      </Card>
    );
  }

  /* Visible window: show 3 years at a time, scrollable */
  const windowSize = 3;
  const minYear = periods[0]?.year ?? 2025;
  const maxYear = periods[periods.length - 1]?.year ?? 2030;
  const clampedScroll = Math.max(minYear, Math.min(scrollYear, maxYear - windowSize + 1));
  const visiblePeriods = periods.filter(
    (p) => p.year >= clampedScroll && p.year < clampedScroll + windowSize,
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-red-500" />
            Chinese New Year Calendar
          </CardTitle>
          <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
            {minYear}–{maxYear}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ---- Current CNY callout ---- */}
        {current && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-bold text-red-800">
                CNY {current.year} SHUTDOWN ACTIVE
              </span>
              <Badge variant="destructive" className="text-[10px] ml-auto">
                {current.daysRemaining} days remaining
              </Badge>
            </div>
            <p className="text-xs text-red-600 pl-7">
              All Chinese supplier manufacturing is paused. Orders will be delayed.
            </p>
          </motion.div>
        )}

        {/* ---- Next CNY warning (within 90 days) ---- */}
        {next && next.daysUntilShutdown <= 90 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-bold text-amber-800">
                CNY {next.year} Approaching — {next.daysUntilShutdown} days until shutdown
              </span>
            </div>
            <p className="text-xs text-amber-700 pl-7">
              Place rush orders before {fmtFull(next.rushDeadline)}
            </p>
          </motion.div>
        )}

        {/* ---- Timeline rows ---- */}
        <div className="space-y-1">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={clampedScroll <= minYear}
              onClick={() => setScrollYear(clampedScroll - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-slate-500">
              {clampedScroll} – {clampedScroll + windowSize - 1}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={clampedScroll >= maxYear - windowSize + 1}
              onClick={() => setScrollYear(clampedScroll + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Desktop column headers */}
          <div className="hidden lg:flex items-center gap-3 px-4 pb-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100">
            <span className="w-12 text-center flex-shrink-0">Year</span>
            <span className="w-24 flex-shrink-0">Lunar Date</span>
            <span className="w-28 flex-shrink-0">Shutdown</span>
            <span className="flex-1 min-w-[120px]">Timeline</span>
            <span className="flex-shrink-0">Rush</span>
            <span className="flex-shrink-0">Restart</span>
            <span className="w-16 text-right flex-shrink-0">Days</span>
            <span className="flex-shrink-0">Status</span>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key={clampedScroll}
          >
            {visiblePeriods.map((period) => {
              const status = getStatus(period, current);
              const isCurrent = current?.year === period.year;
              return (
                <PeriodRow
                  key={period.year}
                  period={period}
                  status={status}
                  isCurrent={isCurrent}
                />
              );
            })}
          </motion.div>
        </div>

        {/* ---- Impact on Supply Chain ---- */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="pt-2 border-t border-slate-100"
        >
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Impact on Supply Chain
          </h4>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-xs text-slate-600">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
              Factories shut down for 2-4 weeks around Lunar New Year
            </li>
            <li className="flex items-start gap-2 text-xs text-slate-600">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              Effective delay: 20-30 days added to any order touching CNY
            </li>
            <li className="flex items-start gap-2 text-xs text-slate-600">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              Pre-CNY rush: Suppliers prioritize older orders, new orders may get delayed further
            </li>
          </ul>
        </motion.div>
      </CardContent>
    </Card>
  );
}
