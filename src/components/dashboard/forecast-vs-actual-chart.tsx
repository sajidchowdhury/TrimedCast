'use client';

// ============================================
// Forecast vs Actual Chart — Dashboard-integrated version
// Compares forecast predictions against actual sales
// Uses existing /api/forecast/compare endpoint
// ============================================

import { useEffect, useState } from 'react';
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
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonMonth {
  month: string;
  forecastTotal: number;
  actualTotal: number;
  difference: number;
  mape: number;
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
  accuracyRating: string;
}

interface CompareData {
  productId: string;
  period: { start: string; end: string };
  comparison: ComparisonMonth[];
  overall: OverallMetrics;
}

interface FvaTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; dataKey?: string }>;
  label?: string;
}

function FvaTooltip({ active, payload, label }: FvaTooltipProps) {
  if (!active || !payload || !label) return null;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, i) => {
          if (entry.value === null || entry.value === undefined) return null;
          const names: Record<string, string> = {
            actual: 'Actual Sales',
            forecast: 'Forecast',
            upperBound: 'Upper Bound',
            lowerBound: 'Lower Bound',
          };
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{names[entry.dataKey || ''] || entry.name}</span>
              <span className="font-medium text-foreground ml-auto tabular-nums">{Math.round(entry.value).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ForecastVsActualChartProps {
  productId?: string;
  productName?: string;
  className?: string;
}

export function ForecastVsActualChart({
  productId,
  productName,
  className,
}: ForecastVsActualChartProps) {
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      const res = await fetch(
        `/api/forecast/compare?tenantId=demo-bd-motors&productId=${productId}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`
      );
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to fetch comparison data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [productId]);

  // Build chart data with confidence bounds
  const chartData = data?.comparison.map((c) => {
    const margin = Math.max(c.mae, c.rmse * 0.5);
    return {
      month: c.month,
      actual: c.actualTotal,
      forecast: c.forecastTotal,
      upperBound: c.forecastTotal + margin,
      lowerBound: Math.max(0, c.forecastTotal - margin),
    };
  }) || [];

  const overall = data?.overall;

  if (!productId) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Select a product to see forecast vs actual comparison</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            Forecast vs Actual
            {productName && <span className="text-muted-foreground font-normal">— {productName}</span>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {overall && (
              <Badge variant={overall.mape <= 15 ? 'default' : 'secondary'} className="text-[10px]">
                {overall.accuracyRating}
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {loading && (
          <div className="space-y-3 p-4">
            <Skeleton className="h-[250px] w-full rounded-lg" />
          </div>
        )}

        {error && (
          <div className="p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Chart */}
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradFvaBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, className: 'fill-muted-foreground' }}
                    tickLine={false}
                    axisLine={{ className: 'stroke-border' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, className: 'fill-muted-foreground' }}
                    tickLine={false}
                    axisLine={{ className: 'stroke-border' }}
                    width={50}
                  />
                  <Tooltip content={<FvaTooltip />} />

                  {/* Confidence band */}
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stroke="transparent"
                    fill="url(#gradFvaBand)"
                    strokeWidth={0}
                    dot={false}
                    name="upperBound"
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="transparent"
                    fill="transparent"
                    strokeWidth={0}
                    dot={false}
                    name="lowerBound"
                  />

                  {/* Actual — Amber line with dots */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1.5 }}
                    activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                    name="actual"
                  />

                  {/* Forecast — Blue dashed line */}
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                    name="forecast"
                  />

                  <Legend
                    formatter={(value: string) => {
                      const labels: Record<string, string> = {
                        actual: 'Actual Sales',
                        forecast: 'Forecast',
                        upperBound: '95% CI',
                        lowerBound: '',
                      };
                      return labels[value] || value;
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Summary metrics */}
            {overall && (
              <div className="grid grid-cols-5 gap-2 mt-3 px-2">
                <MetricPill label="MAPE" value={`${overall.mape.toFixed(1)}%`} />
                <MetricPill label="MAE" value={overall.mae.toFixed(0)} />
                <MetricPill label="RMSE" value={overall.rmse.toFixed(0)} />
                <MetricPill label="Bias" value={`${overall.bias >= 0 ? '+' : ''}${overall.bias.toFixed(0)}`} />
                <MetricPill label="Points" value={overall.totalForecastPoints.toString()} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-1.5 rounded-md bg-muted/50">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold tabular-nums">{value}</p>
    </div>
  );
}
