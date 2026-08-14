'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { motion } from 'framer-motion';
import { Target, TrendingUp, TrendingDown, Activity, Gauge, BarChart3 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

// --- Types ---

interface ComparisonMonth {
  month: string;
  forecastTotal: number;
  actualTotal: number;
  difference: number;
  mape: number | null;
  mae: number;
  rmse: number;
  bias: number;
  dataPointCount: number;
}

interface OverallMetrics {
  totalForecastPoints: number;
  totalSalesRecords: number;
  totalForecastQty: number;
  totalActualQty: number;
  totalDifference: number;
  mape: number;
  mae: number;
  rmse: number;
  bias: number;
  accuracyRating: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable';
}

interface CompareResponse {
  productId: string;
  period: { from: string; to: string };
  comparison: ComparisonMonth[];
  overall: OverallMetrics;
}

interface ForecastVsActualProps {
  productId: string;
  productName: string;
  tenantId: string;
}

// --- Helpers ---

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${MONTH_LABELS[month] || month} ${year}`;
}

function formatMonthShort(monthKey: string): string {
  const [, month] = monthKey.split('-');
  return MONTH_LABELS[month] || month;
}

function getMapeColor(mape: number | null): string {
  if (mape === null) return 'text-gray-400';
  if (mape < 10) return 'text-emerald-600';
  if (mape < 20) return 'text-amber-600';
  return 'text-red-600';
}

function getMapeBg(mape: number | null): string {
  if (mape === null) return 'bg-gray-100';
  if (mape < 10) return 'bg-emerald-50';
  if (mape < 20) return 'bg-amber-50';
  return 'bg-red-50';
}

function getMapeBadgeClasses(mape: number | null): string {
  if (mape === null) return 'bg-gray-100 text-gray-600';
  if (mape < 10) return 'bg-emerald-100 text-emerald-700';
  if (mape < 20) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function getRatingConfig(rating: string): { label: string; classes: string; icon: string } {
  switch (rating) {
    case 'excellent':
      return { label: 'Excellent', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '✦' };
    case 'good':
      return { label: 'Good', classes: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: '✓' };
    case 'acceptable':
      return { label: 'Acceptable', classes: 'bg-amber-100 text-amber-700 border-amber-200', icon: '~' };
    case 'poor':
      return { label: 'Poor', classes: 'bg-red-100 text-red-700 border-red-200', icon: '!' };
    default:
      return { label: 'Unacceptable', classes: 'bg-red-200 text-red-800 border-red-300', icon: '✗' };
  }
}

function getRowAccuracyClass(mape: number | null): string {
  if (mape === null) return '';
  if (mape < 10) return 'bg-emerald-50/40';
  if (mape < 20) return '';
  if (mape < 30) return 'bg-amber-50/30';
  return 'bg-red-50/30';
}

// --- Custom Tooltip ---

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
    dataKey?: string;
  }>;
  label?: string;
  comparisonData?: ComparisonMonth[];
}

function CustomTooltip({ active, payload, label, comparisonData }: CustomTooltipProps) {
  if (!active || !payload || !label) return null;

  const monthData = comparisonData?.find((d) => d.month === label);
  const error = monthData?.difference ?? 0;
  const errorPct = monthData?.mape;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-semibold text-gray-800 mb-1.5">{formatMonth(label)}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div
            className="w-2.5 h-0.5 rounded-sm"
            style={{ backgroundColor: entry.color || '#6b7280' }}
          />
          <span className="text-gray-600">
            {entry.dataKey === 'actualTotal'
              ? 'Actual Sales'
              : entry.dataKey === 'forecastTotal'
                ? 'Forecast'
                : entry.dataKey === 'upperBound'
                  ? 'Upper Bound'
                  : entry.dataKey === 'lowerBound'
                    ? 'Lower Bound'
                    : entry.name}
          </span>
          <span className="font-medium text-gray-800 ml-auto">
            {Math.round(entry.value).toLocaleString()}
          </span>
        </div>
      ))}
      {/* Error info */}
      <div className="border-t border-gray-100 mt-1.5 pt-1.5 space-y-0.5">
        <div className="flex justify-between">
          <span className="text-gray-500">Error</span>
          <span className={`font-medium ${error > 0 ? 'text-blue-600' : error < 0 ? 'text-amber-600' : 'text-gray-600'}`}>
            {error > 0 ? '+' : ''}{error.toLocaleString()}
          </span>
        </div>
        {errorPct !== null && errorPct !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-500">Error %</span>
            <span className={`font-medium ${getMapeColor(errorPct)}`}>
              {errorPct.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Skeleton ---

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Metrics skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-7 w-20 mb-1" />
              <Skeleton className="h-3 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Chart skeleton */}
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
      {/* Table skeleton */}
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main Component ---

export function ForecastVsActual({ productId, productName, tenantId }: ForecastVsActualProps) {
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Compute date range: last 12 months
  const dateRange = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0); // last day of previous month
    return {
      startDate: from.toISOString().split('T')[0],
      endDate: to.toISOString().split('T')[0],
    };
  }, []);

  // Fetch comparison data
  useEffect(() => {
    let cancelled = false;

    async function fetchCompare() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          tenantId,
          productId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        });
        const res = await fetch(`/api/forecast/compare?${params}`);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Failed to fetch comparison data (${res.status})`);
        }
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Failed to fetch comparison data');
        }
        if (!cancelled) {
          setData(json.data as CompareResponse);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch comparison data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCompare();
    return () => { cancelled = true; };
  }, [tenantId, productId, dateRange.startDate, dateRange.endDate]);

  // Prepare chart data with confidence bounds
  const chartData = useMemo(() => {
    if (!data?.comparison) return [];
    return data.comparison.map((m) => {
      const margin = m.mape !== null ? Math.max(m.mae, m.rmse * 0.5) : m.mae;
      return {
        month: m.month,
        actualTotal: m.actualTotal,
        forecastTotal: m.forecastTotal,
        upperBound: m.forecastTotal + margin,
        lowerBound: Math.max(0, m.forecastTotal - margin),
      };
    });
  }, [data]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  // --- Render ---

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <div className="text-red-500 mb-2">
            <Target className="h-8 w-8 mx-auto" />
          </div>
          <p className="text-sm text-red-600 font-medium">Failed to load comparison data</p>
          <p className="text-xs text-red-400 mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.comparison.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BarChart3 className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 font-medium">No comparison data available</p>
          <p className="text-xs text-gray-400 mt-1">
            Generate and save a forecast for {productName} to see accuracy comparison
          </p>
        </CardContent>
      </Card>
    );
  }

  const overall = data.overall;
  const ratingConfig = getRatingConfig(overall.accuracyRating);
  const biasLabel = overall.bias > 0 ? 'Over-forecast' : overall.bias < 0 ? 'Under-forecast' : 'Unbiased';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Product header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">Forecast vs Actual</span>
          <span className="text-xs text-gray-400">—</span>
          <span className="text-xs text-gray-500">{productName}</span>
        </div>
        <p className="text-xs text-gray-400">
          {formatMonth(data.period.from)} → {formatMonth(data.period.to)} · {overall.totalForecastPoints} forecast points vs {overall.totalSalesRecords} sales records
        </p>
      </motion.div>

      {/* Accuracy Metrics Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* MAPE */}
          <Card className={getMapeBg(overall.mape)}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Gauge className="h-3 w-3 text-gray-400" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">MAPE</span>
              </div>
              <p className={`text-xl font-bold ${getMapeColor(overall.mape)}`}>
                {overall.mape.toFixed(1)}%
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Mean Abs. % Error</p>
            </CardContent>
          </Card>

          {/* MAE */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Activity className="h-3 w-3 text-gray-400" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">MAE</span>
              </div>
              <p className="text-xl font-bold text-gray-800">
                {overall.mae.toFixed(1)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Mean Abs. Error</p>
            </CardContent>
          </Card>

          {/* RMSE */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3 w-3 text-gray-400" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">RMSE</span>
              </div>
              <p className="text-xl font-bold text-gray-800">
                {overall.rmse.toFixed(1)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Root Mean Sq. Error</p>
            </CardContent>
          </Card>

          {/* Bias */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                {overall.bias > 0
                  ? <TrendingUp className="h-3 w-3 text-blue-400" />
                  : overall.bias < 0
                    ? <TrendingDown className="h-3 w-3 text-amber-400" />
                    : <Activity className="h-3 w-3 text-gray-400" />}
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Bias</span>
              </div>
              <p className={`text-xl font-bold ${overall.bias > 0 ? 'text-blue-600' : overall.bias < 0 ? 'text-amber-600' : 'text-gray-800'}`}>
                {overall.bias > 0 ? '+' : ''}{overall.bias.toFixed(1)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{biasLabel}</p>
            </CardContent>
          </Card>

          {/* Rating */}
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="h-3 w-3 text-gray-400" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Rating</span>
              </div>
              <Badge className={`${ratingConfig.classes} text-xs px-2.5 py-1 border`}>
                <span className="mr-1">{ratingConfig.icon}</span>
                {ratingConfig.label}
              </Badge>
              <p className="text-[10px] text-gray-400 mt-1">
                {overall.totalForecastQty.toLocaleString()} forecast vs {overall.totalActualQty.toLocaleString()} actual
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Dual-line Chart */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Comparison Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Actual sales vs forecast predictions with confidence interval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={isMobile ? 'h-[250px]' : 'h-[350px]'}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradConfidenceBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonthShort}
                    tick={{ fontSize: isMobile ? 9 : 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#d1d5db' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: isMobile ? 9 : 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#d1d5db' }}
                    width={isMobile ? 35 : 50}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  />
                  <Tooltip content={<CustomTooltip comparisonData={data.comparison} />} />
                  <Legend
                    formatter={(value: string) => {
                      const labels: Record<string, string> = {
                        actualTotal: 'Actual Sales',
                        forecastTotal: 'Forecast',
                        upperBound: 'Upper Bound',
                        lowerBound: 'Lower Bound',
                      };
                      return labels[value] || value;
                    }}
                  />
                  {/* Confidence interval area (render first so it's behind lines) */}
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stroke="transparent"
                    fill="url(#gradConfidenceBand)"
                    strokeWidth={0}
                    dot={false}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="transparent"
                    fill="transparent"
                    strokeWidth={0}
                    dot={false}
                    connectNulls={false}
                  />
                  {/* Forecast line - dashed blue */}
                  <Line
                    type="monotone"
                    dataKey="forecastTotal"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    connectNulls={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#3b82f6', fill: '#fff' }}
                  />
                  {/* Upper/lower bound reference lines (subtle) */}
                  <Line
                    type="monotone"
                    dataKey="upperBound"
                    stroke="#93c5fd"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="#93c5fd"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    dot={false}
                    connectNulls={false}
                  />
                  {/* Actual sales line - solid amber/orange with dots */}
                  <Line
                    type="monotone"
                    dataKey="actualTotal"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1.5 }}
                    connectNulls={false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#f59e0b', fill: '#fff' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Monthly Breakdown Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              Monthly Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              Detailed accuracy metrics per month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Forecast</TableHead>
                  <TableHead className="text-right">Error</TableHead>
                  <TableHead className="text-right">Error %</TableHead>
                  <TableHead className="text-center">Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.comparison.map((m) => {
                  const errorPct = m.mape;
                  return (
                    <TableRow key={m.month} className={getRowAccuracyClass(errorPct)}>
                      <TableCell className="font-medium text-sm">
                        {formatMonth(m.month)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.actualTotal.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.forecastTotal.toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${m.difference > 0 ? 'text-blue-600' : m.difference < 0 ? 'text-amber-600' : ''}`}>
                        {m.difference > 0 ? '+' : ''}{m.difference.toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${getMapeColor(errorPct)}`}>
                        {errorPct !== null ? `${errorPct.toFixed(1)}%` : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {errorPct !== null ? (
                          <Badge className={`${getMapeBadgeClasses(errorPct)} text-[9px] h-4 px-1.5`}>
                            {errorPct < 10 ? 'Excellent' : errorPct < 20 ? 'Good' : errorPct < 30 ? 'Fair' : 'Poor'}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
