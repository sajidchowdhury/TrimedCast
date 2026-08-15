'use client';

// ============================================
// Consensus Forecast Chart — Multi-layered visualization
// Per UI/UX Specification Section 8:
// - Actual Sales: Orange Bars (Historical demand)
// - Statistical Forecast: Solid Blue Line (Baseline model)
// - Adjusted Consensus Forecast: Dotted Blue Line (Includes qualitative inputs)
// - Confidence Interval: Semi-transparent Blue Shaded Area
// ============================================

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
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
import type { ForecastPointClient } from '@/lib/forecasting/store';
import type { BDSeason } from '@/lib/forecasting/models';
import { cn } from '@/lib/utils';

const SEASON_LABELS: Record<string, string> = {
  winter: 'Winter (Nov–Feb)',
  summer: 'Summer (Mar–May)',
  monsoon: 'Monsoon (Jun–Sep)',
  pre_winter: 'Pre-Winter (Oct–Nov)',
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

interface ChartDataPoint {
  date: string;
  historical: number | null;
  baseline: number | null;
  consensus: number | null;
  upperBound: number | null;
  lowerBound: number | null;
  season: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    color?: string;
    dataKey?: string;
  }>;
  label?: string;
  chartData?: ChartDataPoint[];
}

function ConsensusTooltip({ active, payload, label, chartData }: CustomTooltipProps) {
  if (!active || !payload || !label) return null;

  const dataPoint = chartData?.find((d) => d.date === label);
  const seasonLabel = dataPoint?.season ? SEASON_LABELS[dataPoint.season] : null;

  const SERIES_LABELS: Record<string, { label: string; icon: string }> = {
    historical: { label: 'Actual Sales', icon: '■' },
    baseline: { label: 'Statistical Forecast', icon: '━' },
    consensus: { label: 'Consensus Forecast', icon: '┈' },
    upperBound: { label: 'Upper Bound (95%)', icon: '·' },
    lowerBound: { label: 'Lower Bound (95%)', icon: '·' },
  };

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-semibold text-foreground mb-1">{formatDate(label)}</p>
      {seasonLabel && (
        <p className="text-muted-foreground mb-1.5 text-[10px]">{seasonLabel}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => {
          if (entry.value === null || entry.value === undefined) return null;
          const info = SERIES_LABELS[entry.dataKey || entry.name];
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: entry.color || '#6b7280' }}
              />
              <span className="text-muted-foreground truncate">
                {info?.label || entry.name}
              </span>
              <span className="font-medium text-foreground ml-auto tabular-nums">
                {Math.round(entry.value).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ConsensusForecastChartProps {
  points: ForecastPointClient[];
  historicalData?: { date: string; value: number }[];
  consensusAdjustments?: { date: string; value: number }[];
  activeSeason?: BDSeason | null;
  className?: string;
}

export function ConsensusForecastChart({
  points,
  historicalData,
  consensusAdjustments,
  activeSeason,
  className,
}: ConsensusForecastChartProps) {
  const chartData = useMemo((): ChartDataPoint[] => {
    // Build historical points
    const histPoints = (historicalData || []).map((d) => ({
      date: d.date,
      historical: d.value,
      baseline: null as number | null,
      consensus: null as number | null,
      upperBound: null as number | null,
      lowerBound: null as number | null,
      season: '' as string,
    }));

    // Build forecast points: baseline = statistical forecast, consensus = adjusted
    const forecastPoints = points.map((p) => {
      // Find consensus adjustment for this date
      const adj = consensusAdjustments?.find((a) => a.date === p.date);
      return {
        date: p.date,
        historical: null as number | null,
        baseline: p.predicted, // Statistical forecast (baseline)
        consensus: adj ? adj.value : Math.round(p.predicted * 1.02), // Consensus = baseline + adjustments (default 2% uplift)
        upperBound: p.upperBound,
        lowerBound: p.lowerBound,
        season: p.season,
      };
    });

    let combined = [...histPoints, ...forecastPoints];

    // Filter by active season if provided
    if (activeSeason) {
      combined = combined.filter((d) => {
        if (!d.season && !d.historical) return true; // Keep forecast points
        if (d.season === activeSeason) return true;
        // For historical points, determine season from date
        if (d.historical !== null) {
          const month = new Date(d.date).getMonth() + 1;
          if (activeSeason === 'winter' && (month >= 11 || month <= 2)) return true;
          if (activeSeason === 'summer' && month >= 3 && month <= 5) return true;
          if (activeSeason === 'monsoon' && month >= 6 && month <= 9) return true;
          if (activeSeason === 'pre_winter' && month === 10) return true;
        }
        return false;
      });
    }

    return combined;
  }, [points, historicalData, consensusAdjustments, activeSeason]);

  // Downsample for readability
  const sampledData = useMemo(() => {
    if (chartData.length <= 120) return chartData;
    const step = Math.ceil(chartData.length / 120);
    return chartData.filter((_, i) => i % step === 0 || i === chartData.length - 1);
  }, [chartData]);

  // Find the date where forecast starts (for reference line)
  const forecastStartDate = useMemo(() => {
    const firstForecast = sampledData.find((d) => d.baseline !== null);
    return firstForecast?.date;
  }, [sampledData]);

  if (sampledData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No forecast data available. Generate a forecast to see the chart.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Consensus Forecast</CardTitle>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-orange-500 rounded-sm" /> Actual Sales
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 bg-blue-600" /> Statistical
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-0 border-t border-dashed border-blue-400" style={{ borderTop: '2px dashed #60a5fa' }} /> Consensus
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-blue-200/40 rounded-sm" /> 95% CI
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sampledData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradConfidenceBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 10, className: 'fill-muted-foreground' }}
                tickLine={false}
                axisLine={{ className: 'stroke-border' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, className: 'fill-muted-foreground' }}
                tickLine={false}
                axisLine={{ className: 'stroke-border' }}
                width={50}
              />
              <Tooltip content={<ConsensusTooltip chartData={chartData} />} />

              {/* Forecast start reference line */}
              {forecastStartDate && (
                <ReferenceLine
                  x={forecastStartDate}
                  stroke="#9ca3af"
                  strokeDasharray="4 4"
                  label={{ value: 'Forecast →', position: 'top', fontSize: 10, fill: '#9ca3af' }}
                />
              )}

              {/* Confidence interval - upper bound (shaded area) */}
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="transparent"
                fill="url(#gradConfidenceBlue)"
                strokeWidth={0}
                dot={false}
                connectNulls={false}
                name="upperBound"
              />

              {/* Confidence interval - lower bound (cuts off the fill below) */}
              <Area
                type="monotone"
                dataKey="lowerBound"
                stroke="transparent"
                fill="#000"
                fillOpacity={0}
                strokeWidth={0}
                dot={false}
                connectNulls={false}
                name="lowerBound"
              />

              {/* Actual Sales — Orange Bars */}
              <Bar
                dataKey="historical"
                fill="#f97316"
                stroke="#ea580c"
                strokeWidth={0.5}
                barSize={6}
                name="historical"
                isAnimationActive={true}
              />

              {/* Statistical Forecast — Solid Blue Line */}
              <Line
                type="monotone"
                dataKey="baseline"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#2563eb', fill: '#fff' }}
                name="baseline"
              />

              {/* Adjusted Consensus Forecast — Dotted Blue Line */}
              <Line
                type="monotone"
                dataKey="consensus"
                stroke="#60a5fa"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                connectNulls={false}
                activeDot={{ r: 3, strokeWidth: 2, stroke: '#60a5fa', fill: '#fff' }}
                name="consensus"
              />

              <Legend
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    historical: 'Actual Sales',
                    baseline: 'Statistical Forecast',
                    consensus: 'Consensus Forecast',
                    upperBound: '95% CI',
                    lowerBound: '',
                  };
                  return labels[value] || value;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
