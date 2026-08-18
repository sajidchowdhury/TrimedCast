'use client';

// ============================================
// TrimedCast — Revenue Trends Chart
// Session 26: Financial Analytics & Cost Intelligence Dashboard
// ============================================

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertCircle, Calendar, BarChart3, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFinanceStore } from '@/stores/finance-store';
import type { RevenueTrend } from '@/components/finance/types';
import { formatBDT, formatPct } from '@/components/finance/types';

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Chart Constants ─────────────────────────────────────────────────

const CHART_W = 900;
const CHART_H = 340;
const PAD_LEFT = 70;
const PAD_RIGHT = 50;
const PAD_TOP = 20;
const PAD_BOTTOM = 50;
const PLOT_W = CHART_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = CHART_H - PAD_TOP - PAD_BOTTOM;

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

// ─── Helpers ─────────────────────────────────────────────────────────

function formatShortBDT(amount: number): string {
  if (amount >= 1_000_000) return `৳${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `৳${(amount / 1_000).toFixed(0)}K`;
  return `৳${amount}`;
}

function yScale(max: number): { ticks: number[]; niceMax: number } {
  const rawStep = max / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / mag;
  let niceStep: number;
  if (residual <= 1.5) niceStep = mag;
  else if (residual <= 3) niceStep = 2 * mag;
  else if (residual <= 7) niceStep = 5 * mag;
  else niceStep = 10 * mag;

  const niceMax = niceStep * 5;
  const ticks = Array.from({ length: 6 }, (_, i) => i * niceStep);
  return { ticks, niceMax };
}

// ─── Area Chart (SVG) ────────────────────────────────────────────────

function RevenueAreaChart({ trends }: { trends: RevenueTrend[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const maxRevenue = useMemo(() => Math.max(...trends.map((t) => t.revenue), 1), [trends]);
  const { ticks, niceMax } = useMemo(() => yScale(maxRevenue), [maxRevenue]);

  const xStep = PLOT_W / (MONTHS.length - 1);
  const toX = (i: number) => PAD_LEFT + i * xStep;
  const toY = (v: number) => PAD_TOP + PLOT_H - (v / niceMax) * PLOT_H;

  // Build area paths
  const revenuePoints = trends.map((t, i) => `${toX(i)},${toY(t.revenue)}`);
  const cogsPoints = trends.map((t, i) => `${toX(i)},${toY(t.cogs)}`);
  const profitPoints = trends.map((t, i) => `${toX(i)},${toY(t.grossProfit)}`);
  const marginPoints = trends.map((t, i) => `${toX(i)},${toY(t.margin * niceMax / 50)}`);

  // Area path strings (close to bottom for fill)
  const revenueArea = `M ${revenuePoints.join(' L ')} L ${toX(trends.length - 1)},${PAD_TOP + PLOT_H} L ${toX(0)},${PAD_TOP + PLOT_H} Z`;
  const cogsArea = `M ${cogsPoints.join(' L ')} L ${toX(trends.length - 1)},${PAD_TOP + PLOT_H} L ${toX(0)},${PAD_TOP + PLOT_H} Z`;
  const profitArea = `M ${profitPoints.join(' L ')} L ${toX(trends.length - 1)},${PAD_TOP + PLOT_H} L ${toX(0)},${PAD_TOP + PLOT_H} Z`;

  // Line path strings
  const revenueLine = `M ${revenuePoints.join(' L ')}`;
  const cogsLine = `M ${cogsPoints.join(' L ')}`;
  const profitLine = `M ${profitPoints.join(' L ')}`;
  const marginLine = `M ${marginPoints.join(' L ')}`;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full h-auto min-w-[600px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                y1={toY(tick)}
                x2={PAD_LEFT + PLOT_W}
                y2={toY(tick)}
                stroke="hsl(var(--muted))"
                strokeWidth={0.5}
                strokeDasharray="4 4"
              />
              <text
                x={PAD_LEFT - 8}
                y={toY(tick) + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                style={{ fontSize: '10px' }}
              >
                {formatShortBDT(tick)}
              </text>
            </g>
          ))}

          {/* Y-axis label */}
          <text
            x={14}
            y={PAD_TOP + PLOT_H / 2}
            textAnchor="middle"
            transform={`rotate(-90, 14, ${PAD_TOP + PLOT_H / 2})`}
            className="fill-muted-foreground"
            style={{ fontSize: '10px' }}
          >
            ৳ Amount (BDT)
          </text>

          {/* COGS area (drawn first, behind) */}
          <path d={cogsArea} fill="#0ea5e9" opacity={0.15} />
          <path d={cogsLine} fill="none" stroke="#0ea5e9" strokeWidth={1.5} opacity={0.7} />

          {/* Revenue area */}
          <path d={revenueArea} fill="#10b981" opacity={0.2} />
          <path d={revenueLine} fill="none" stroke="#10b981" strokeWidth={2} />

          {/* Gross Profit area (visible gap layer) */}
          <path d={profitArea} fill="#f59e0b" opacity={0.12} />
          <path d={profitLine} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 3" />

          {/* Margin line overlay (right axis) */}
          <path d={marginLine} fill="none" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.8} />

          {/* X-axis: months */}
          {trends.map((t, i) => {
            const isCNY = t.month === 'Feb' && t.year === 2025;
            const isHigh = t.seasonalIndex > 1.1;
            const isLow = t.seasonalIndex < 0.9;

            return (
              <g key={i}>
                {/* Tick line */}
                <line
                  x1={toX(i)}
                  y1={PAD_TOP + PLOT_H}
                  x2={toX(i)}
                  y2={PAD_TOP + PLOT_H + 6}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                />
                {/* Month label */}
                <text
                  x={toX(i)}
                  y={PAD_TOP + PLOT_H + 18}
                  textAnchor="middle"
                  className={isCNY ? 'fill-red-500' : 'fill-muted-foreground'}
                  style={{ fontSize: '10px', fontWeight: isCNY ? 'bold' : 'normal' }}
                >
                  {t.month}
                </text>
                {/* Year label */}
                <text
                  x={toX(i)}
                  y={PAD_TOP + PLOT_H + 30}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: '9px' }}
                >
                  {t.year}
                </text>

                {/* Seasonal index indicator dots */}
                {isHigh && (
                  <circle
                    cx={toX(i)}
                    cy={PAD_TOP - 8}
                    r={3}
                    fill="#10b981"
                    opacity={0.7}
                  />
                )}
                {isLow && (
                  <circle
                    cx={toX(i)}
                    cy={PAD_TOP - 8}
                    r={3}
                    fill="#ef4444"
                    opacity={0.7}
                  />
                )}
                {isCNY && (
                  <g>
                    <circle
                      cx={toX(i)}
                      cy={toY(t.revenue) - 14}
                      r={4}
                      fill="#ef4444"
                      opacity={0.8}
                    />
                    <text
                      x={toX(i)}
                      y={toY(t.revenue) - 24}
                      textAnchor="middle"
                      className="fill-red-500"
                      style={{ fontSize: '9px', fontWeight: 'bold' }}
                    >
                      CNY ↓
                    </text>
                  </g>
                )}

                {/* Data points for revenue */}
                <circle
                  cx={toX(i)}
                  cy={toY(t.revenue)}
                  r={hoverIdx === i ? 5 : 3}
                  fill="#10b981"
                  stroke="white"
                  strokeWidth={1.5}
                  style={{ transition: 'r 0.15s ease', cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                />

                {/* Hover crosshair */}
                {hoverIdx === i && (
                  <g>
                    <line
                      x1={toX(i)}
                      y1={PAD_TOP}
                      x2={toX(i)}
                      y2={PAD_TOP + PLOT_H}
                      stroke="hsl(var(--foreground))"
                      strokeWidth={0.5}
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* Hover tooltip box */}
          {hoverIdx !== null && trends[hoverIdx] && (() => {
            const t = trends[hoverIdx];
            const bx = toX(hoverIdx);
            const boxW = 140;
            const boxH = 80;
            const boxX = bx + 10 + boxW > CHART_W - PAD_RIGHT ? bx - boxW - 10 : bx + 10;
            const boxY = PAD_TOP + 10;

            return (
              <g>
                <rect
                  x={boxX}
                  y={boxY}
                  width={boxW}
                  height={boxH}
                  rx={6}
                  fill="hsl(var(--card))"
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                />
                <text x={boxX + 8} y={boxY + 16} style={{ fontSize: '10px', fontWeight: 'bold' }} className="fill-foreground">
                  {t.month} {t.year}
                </text>
                <circle cx={boxX + 12} cy={boxY + 30} r={3} fill="#10b981" />
                <text x={boxX + 20} y={boxY + 34} style={{ fontSize: '9px' }} className="fill-foreground">
                  Rev: {formatShortBDT(t.revenue)}
                </text>
                <circle cx={boxX + 12} cy={boxY + 44} r={3} fill="#0ea5e9" />
                <text x={boxX + 20} y={boxY + 48} style={{ fontSize: '9px' }} className="fill-foreground">
                  COGS: {formatShortBDT(t.cogs)}
                </text>
                <circle cx={boxX + 12} cy={boxY + 58} r={3} fill="#f59e0b" />
                <text x={boxX + 20} y={boxY + 62} style={{ fontSize: '9px' }} className="fill-foreground">
                  Profit: {formatShortBDT(t.grossProfit)}
                </text>
                <text x={boxX + 20} y={boxY + 74} style={{ fontSize: '9px' }} className="fill-muted-foreground">
                  Margin: {formatPct(t.margin)}
                </text>
              </g>
            );
          })()}

          {/* Right Y-axis for margin % */}
          <text
            x={CHART_W - 8}
            y={PAD_TOP + 4}
            textAnchor="end"
            className="fill-muted-foreground"
            style={{ fontSize: '9px' }}
          >
            50%
          </text>
          <text
            x={CHART_W - 8}
            y={PAD_TOP + PLOT_H + 4}
            textAnchor="end"
            className="fill-muted-foreground"
            style={{ fontSize: '9px' }}
          >
            0%
          </text>
          <text
            x={CHART_W - 8}
            y={PAD_TOP + PLOT_H / 2}
            textAnchor="end"
            className="fill-muted-foreground"
            style={{ fontSize: '9px' }}
          >
            25%
          </text>
        </svg>
      </div>

      {/* Chart Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />
          COGS
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
          Gross Profit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-violet-500" style={{ borderTop: '1px dashed #8b5cf6' }} />
          Margin %
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 opacity-70" />
          Seasonal peak
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 opacity-70" />
          Seasonal dip
        </span>
      </div>
    </TooltipProvider>
  );
}

// ─── Key Insights ────────────────────────────────────────────────────

function KeyInsights({ trends }: { trends: RevenueTrend[] }) {
  const insights = useMemo(() => {
    if (trends.length === 0) return null;

    const peak = trends.reduce((a, b) => (a.revenue > b.revenue ? a : b));
    const low = trends.reduce((a, b) => (a.revenue < b.revenue ? a : b));
    const avgRevenue = trends.reduce((s, t) => s + t.revenue, 0) / trends.length;
    const cnyMonth = trends.find((t) => t.month === 'Feb' && t.year === 2025);

    return { peak, low, avgRevenue, cnyMonth };
  }, [trends]);

  if (!insights) return null;

  const items = [
    {
      icon: TrendingUp,
      iconColor: 'text-emerald-600',
      bg: 'bg-emerald-50',
      label: 'Peak Month',
      value: `${insights.peak.month} ${insights.peak.year}`,
      detail: formatBDT(insights.peak.revenue),
    },
    {
      icon: TrendingDown,
      iconColor: 'text-red-600',
      bg: 'bg-red-50',
      label: 'Low Month',
      value: `${insights.low.month} ${insights.low.year}`,
      detail: formatBDT(insights.low.revenue),
    },
    {
      icon: BarChart3,
      iconColor: 'text-sky-600',
      bg: 'bg-sky-50',
      label: 'Avg Monthly Revenue',
      value: formatBDT(Math.round(insights.avgRevenue)),
      detail: 'per month',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <motion.div
            key={item.label}
            variants={itemVariants}
            className={`rounded-lg border p-3 ${item.bg}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <item.icon className={`h-4 w-4 ${item.iconColor}`} />
              <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
            </div>
            <p className="text-lg font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.detail}</p>
          </motion.div>
        ))}
      </div>

      {/* CNY Impact Annotation */}
      {insights.cnyMonth && (
        <motion.div variants={itemVariants} className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">CNY Impact — February {insights.cnyMonth.year}</p>
            <p className="text-xs text-red-700 mt-0.5">
              Chinese New Year factory closures reduced supply chain throughput.
              Revenue dropped to {formatBDT(insights.cnyMonth.revenue)} with seasonal index of{' '}
              {insights.cnyMonth.seasonalIndex.toFixed(2)} (below-normal period).
              Margin held at {formatPct(insights.cnyMonth.margin)} despite volume dip.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function RevenueTrends() {
  const revenueTrends = useFinanceStore((s) => s.revenueTrends);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Revenue Trends</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">আয় প্রবণতা</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">12 months</Badge>
            <Badge variant="outline" className="text-xs">FY 2024-25</Badge>
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-5">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Area Chart */}
          <motion.div variants={itemVariants}>
            <RevenueAreaChart trends={revenueTrends} />
          </motion.div>

          {/* Key Insights */}
          <motion.div variants={itemVariants} className="mt-4">
            <Separator className="mb-4" />
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Key Insights</p>
            </div>
            <KeyInsights trends={revenueTrends} />
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
