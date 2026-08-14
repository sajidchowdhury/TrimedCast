'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StockProjectionProps {
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  avgDailyDemand: number;
  orderArrivalDate: string; // ISO date string
  orderQty: number;
  horizonDays?: number; // default 180
  productName?: string;
}

interface ChartDataPoint {
  date: string;          // ISO date string for data key
  label: string;         // display label (Mon DD)
  stock: number;         // actual stock level (clamped >= 0)
  rawStock: number;      // stock level before clamping (can be negative)
  adequate: number | null;
  low: number | null;
  critical: number | null;
  status: 'adequate' | 'low' | 'critical' | 'stockout';
  isArrival: boolean;
}

interface ProjectionEvents {
  stockoutDate: string | null;
  safetyHitDate: string | null;
  reorderHitDate: string | null;
  arrivalDate: string | null;
  daysUntilStockout: number;
  daysUntilArrival: number;
  stockoutGap: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatus(
  stock: number,
  safetyStock: number,
  reorderPoint: number,
): 'adequate' | 'low' | 'critical' | 'stockout' {
  if (stock <= 0) return 'stockout';
  if (stock <= safetyStock) return 'critical';
  if (stock <= reorderPoint) return 'low';
  return 'adequate';
}

// ---------------------------------------------------------------------------
// Data generation
// ---------------------------------------------------------------------------

function generateProjection(
  currentStock: number,
  safetyStock: number,
  reorderPoint: number,
  avgDailyDemand: number,
  orderArrivalDate: string,
  orderQty: number,
  horizonDays: number,
): { data: ChartDataPoint[]; events: ProjectionEvents } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = toISODate(today);

  // Parse arrival date
  const arrivalISO = orderArrivalDate.split('T')[0]; // take date portion only

  let stock = currentStock;
  const data: ChartDataPoint[] = [];
  let stockoutDate: string | null = null;
  let safetyHitDate: string | null = null;
  let reorderHitDate: string | null = null;
  let arrivalReached = false;

  for (let day = 0; day <= horizonDays; day++) {
    const dateObj = addDays(today, day);
    const iso = toISODate(dateObj);
    const isArrival = iso === arrivalISO;

    // Order arrives — add qty before recording this day's stock
    if (isArrival) {
      stock += orderQty;
      arrivalReached = true;
    }

    const clampedStock = Math.max(0, stock);
    const status = getStatus(clampedStock, safetyStock, reorderPoint);

    // Zone values: only set the zone the stock currently occupies
    let adequate: number | null = null;
    let low: number | null = null;
    let critical: number | null = null;

    if (status === 'adequate') {
      adequate = clampedStock;
    } else if (status === 'low') {
      low = clampedStock;
    } else {
      // critical or stockout
      critical = clampedStock;
    }

    data.push({
      date: iso,
      label: formatShortDate(iso),
      stock: clampedStock,
      rawStock: stock,
      adequate,
      low,
      critical,
      status,
      isArrival,
    });

    // Track events (first occurrence only)
    if (status === 'stockout' && !stockoutDate) {
      stockoutDate = iso;
    }
    if ((status === 'critical' || status === 'stockout') && !safetyHitDate) {
      safetyHitDate = iso;
    }
    if ((status === 'low' || status === 'critical' || status === 'stockout') && !reorderHitDate) {
      reorderHitDate = iso;
    }

    // Deplete stock for the next day
    stock -= avgDailyDemand;
  }

  // Compute derived stats
  const daysUntilStockout = stockoutDate
    ? Math.round(
        (new Date(stockoutDate + 'T00:00:00').getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : horizonDays + 1; // no stockout in horizon

  const daysUntilArrival = Math.max(
    0,
    Math.round(
      (new Date(arrivalISO + 'T00:00:00').getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  // Gap: days between stockout and arrival (0 if arrival before stockout)
  let stockoutGap = 0;
  if (stockoutDate) {
    const gap =
      (new Date(arrivalISO + 'T00:00:00').getTime() -
        new Date(stockoutDate + 'T00:00:00').getTime()) /
      (1000 * 60 * 60 * 24);
    stockoutGap = gap > 0 ? Math.round(gap) : 0;
  }

  const events: ProjectionEvents = {
    stockoutDate,
    safetyHitDate,
    reorderHitDate,
    arrivalDate: arrivalISO,
    daysUntilStockout,
    daysUntilArrival,
    stockoutGap,
  };

  return { data, events };
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  adequate: 'Adequate',
  low: 'Low Stock',
  critical: 'Critical',
  stockout: 'Stockout',
};

const STATUS_COLORS: Record<string, string> = {
  adequate: '#10B981',
  low: '#F59E0B',
  critical: '#EF4444',
  stockout: '#EF4444',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color?: string }>;
  label?: string;
  chartData?: ChartDataPoint[];
}

function CustomTooltip({ active, payload, label, chartData }: CustomTooltipProps) {
  if (!active || !label) return null;

  const point = chartData?.find((d) => d.date === label);
  if (!point) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-gray-800 mb-1.5">
        {formatFullDate(point.date)}
      </p>
      <div className="flex items-center gap-2 py-0.5">
        <div
          className="w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: STATUS_COLORS[point.status] }}
        />
        <span className="text-gray-600">Stock Level</span>
        <span className="font-medium text-gray-800 ml-auto">
          {Math.round(point.stock)}
        </span>
      </div>
      <div className="flex items-center gap-2 py-0.5 mt-1">
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0"
          style={{
            borderColor: STATUS_COLORS[point.status],
            color: STATUS_COLORS[point.status],
          }}
        >
          {STATUS_LABELS[point.status]}
        </Badge>
      </div>
      {point.isArrival && (
        <p className="mt-1.5 text-emerald-600 font-medium flex items-center gap-1">
          <Package className="h-3 w-3" />
          Order Arrives
        </p>
      )}
    </div>
  );
}

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
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StockProjection({
  currentStock,
  safetyStock,
  reorderPoint,
  avgDailyDemand,
  orderArrivalDate,
  orderQty,
  horizonDays = 180,
  productName,
}: StockProjectionProps) {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 200 : 250;

  const { data, events } = useMemo(
    () =>
      generateProjection(
        currentStock,
        safetyStock,
        reorderPoint,
        avgDailyDemand,
        orderArrivalDate,
        orderQty,
        horizonDays,
      ),
    [
      currentStock,
      safetyStock,
      reorderPoint,
      avgDailyDemand,
      orderArrivalDate,
      orderQty,
      horizonDays,
    ],
  );

  // Determine a good Y-axis domain
  const maxStock = useMemo(() => Math.max(...data.map((d) => d.stock)), [data]);
  const yMax = useMemo(() => Math.ceil(maxStock * 1.1 / 50) * 50, [maxStock]); // round up to next 50

  // Subsample data if too many points (aim for ~90 visible points for performance)
  const sampledData = useMemo(() => {
    if (data.length <= 120) return data;
    const step = Math.ceil(data.length / 120);
    // Always keep key events
    const keyDates = new Set(data.filter((d) => d.isArrival).map((d) => d.date));
    return data.filter(
      (d, i) => i % step === 0 || i === data.length - 1 || keyDates.has(d.date),
    );
  }, [data]);

  // Summary text
  const summaryText = useMemo(() => {
    const parts: string[] = [];
    if (events.safetyHitDate) {
      parts.push(
        `Stock will reach safety level on ${formatShortDate(events.safetyHitDate)}.`,
      );
    }
    parts.push(`Order arrives ${formatShortDate(events.arrivalDate ?? '')}.`);
    if (events.stockoutDate) {
      if (events.stockoutGap > 0) {
        parts.push(
          `Stockout occurs ${formatShortDate(events.stockoutDate)} — gap of ${events.stockoutGap} days before arrival.`,
        );
      } else {
        parts.push('Order arrives before stockout.');
      }
    }
    return parts.join(' ');
  }, [events]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-slate-600" />
              Stock Projection
              {productName && (
                <span className="text-sm font-normal text-gray-500">
                  — {productName}
                </span>
              )}
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {horizonDays}-day horizon
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── Mini stat cards ── */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-2"
          >
            {/* Current Stock */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 mb-1">
                <Package className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Current Stock
                </span>
              </div>
              <p className="text-xl font-bold text-slate-800">
                {Math.round(currentStock)}
              </p>
            </div>

            {/* Days Until Stockout */}
            <div className="p-2.5 rounded-lg border border-slate-100"
              style={{
                backgroundColor:
                  events.daysUntilStockout < 30 ? '#FEF2F2' : '#F8FAFC',
                borderColor:
                  events.daysUntilStockout < 30 ? '#FECACA' : '#F1F5F9',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle
                  className="h-3.5 w-3.5"
                  style={{
                    color:
                      events.daysUntilStockout < 30 ? '#EF4444' : '#94A3B8',
                  }}
                />
                <span className="text-[10px] uppercase tracking-wider"
                  style={{
                    color:
                      events.daysUntilStockout < 30 ? '#DC2626' : '#64748B',
                  }}
                >
                  Days to Stockout
                </span>
              </div>
              <p
                className="text-xl font-bold"
                style={{
                  color:
                    events.daysUntilStockout < 30 ? '#DC2626' : '#1E293B',
                }}
              >
                {events.daysUntilStockout > horizonDays
                  ? `${horizonDays}+`
                  : events.daysUntilStockout}
              </p>
            </div>

            {/* Days Until Arrival */}
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[10px] text-emerald-600 uppercase tracking-wider">
                  Days to Arrival
                </span>
              </div>
              <p className="text-xl font-bold text-emerald-700">
                {events.daysUntilArrival}
              </p>
            </div>

            {/* Stockout Gap */}
            <div className="p-2.5 rounded-lg border border-slate-100"
              style={{
                backgroundColor:
                  events.stockoutGap > 0 ? '#FEF2F2' : '#F0FDF4',
                borderColor:
                  events.stockoutGap > 0 ? '#FECACA' : '#BBF7D0',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown
                  className="h-3.5 w-3.5"
                  style={{
                    color: events.stockoutGap > 0 ? '#EF4444' : '#10B981',
                  }}
                />
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{
                    color: events.stockoutGap > 0 ? '#DC2626' : '#059669',
                  }}
                >
                  Stockout Gap
                </span>
              </div>
              <p
                className="text-xl font-bold"
                style={{
                  color: events.stockoutGap > 0 ? '#DC2626' : '#059669',
                }}
              >
                {events.stockoutGap}d
              </p>
            </div>
          </motion.div>

          {/* ── Chart ── */}
          <motion.div variants={itemVariants} className="w-full" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sampledData}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="gradAdequate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => formatShortDate(v)}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#d1d5db' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, yMax]}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#d1d5db' }}
                  width={45}
                />
                <Tooltip
                  content={<CustomTooltip chartData={data} />}
                />

                {/* Reference lines */}
                <ReferenceLine
                  y={safetyStock}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: 'Safety Stock',
                    position: 'insideTopRight',
                    fill: '#EF4444',
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                />
                <ReferenceLine
                  y={reorderPoint}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: 'Reorder Point',
                    position: 'insideTopRight',
                    fill: '#F59E0B',
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                />

                {/* Today line */}
                <ReferenceLine
                  x={toISODate(new Date())}
                  stroke="#9CA3AF"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: 'Today',
                    position: 'insideTopLeft',
                    fill: '#9CA3AF',
                    fontSize: 10,
                  }}
                />

                {/* Order arrival line */}
                {events.arrivalDate && (
                  <ReferenceLine
                    x={events.arrivalDate}
                    stroke="#10B981"
                    strokeWidth={1.5}
                    label={{
                      value: 'Order Arrives',
                      position: 'insideTopLeft',
                      fill: '#10B981',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}

                {/* Full stock line (stroke only, transparent fill) */}
                <Area
                  type="stepAfter"
                  dataKey="stock"
                  stroke="#475569"
                  strokeWidth={1.5}
                  fill="transparent"
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 1.5, stroke: '#475569', fill: '#fff' }}
                  connectNulls={false}
                  name="stock"
                />

                {/* Zone fills */}
                <Area
                  type="stepAfter"
                  dataKey="adequate"
                  stroke="transparent"
                  fill="url(#gradAdequate)"
                  strokeWidth={0}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Area
                  type="stepAfter"
                  dataKey="low"
                  stroke="transparent"
                  fill="url(#gradLow)"
                  strokeWidth={0}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Area
                  type="stepAfter"
                  dataKey="critical"
                  stroke="transparent"
                  fill="url(#gradCritical)"
                  strokeWidth={0}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* ── Legend ── */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center gap-4 text-xs text-gray-600"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10B981' }} />
              <span>Adequate (above reorder point)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#F59E0B' }} />
              <span>Low (between reorder &amp; safety)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#EF4444' }} />
              <span>Critical (below safety stock)</span>
            </div>
          </motion.div>

          {/* ── Summary text ── */}
          <motion.div
            variants={itemVariants}
            className="text-xs text-gray-500 bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed"
          >
            {summaryText}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
