'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ForecastPointClient } from '@/lib/forecasting/store';
import type { BDSeason } from '@/lib/forecasting/models';

const SEASON_COLORS: Record<BDSeason, { stroke: string; fill: string; label: string }> = {
  winter: { stroke: '#059669', fill: '#d1fae5', label: 'Winter (Nov–Feb)' },
  summer: { stroke: '#d97706', fill: '#fef3c7', label: 'Summer (Mar–May)' },
  monsoon: { stroke: '#2563eb', fill: '#dbeafe', label: 'Monsoon (Jun–Sep)' },
  pre_winter: { stroke: '#ea580c', fill: '#ffedd5', label: 'Pre-Winter (Oct)' },
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
  predicted: number | null;
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
  }>;
  label?: string;
  chartData?: ChartDataPoint[];
}

function CustomTooltip({ active, payload, label, chartData }: CustomTooltipProps) {
  if (!active || !payload || !label) return null;

  const dataPoint = chartData?.find((d) => d.date === label);
  const seasonInfo = dataPoint?.season ? SEASON_COLORS[dataPoint.season as BDSeason] : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{formatDate(label)}</p>
      {seasonInfo && (
        <p className="text-gray-500 mb-1">{seasonInfo.label}</p>
      )}
      {payload.map((entry, i) => {
        if (entry.value === null || entry.value === undefined) return null;
        return (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: entry.color || '#6b7280' }}
            />
            <span className="text-gray-600 capitalize">
              {entry.name === 'historical' ? 'Historical' :
               entry.name === 'predicted' ? 'Predicted' :
               entry.name === 'upperBound' ? 'Upper Bound' :
               entry.name === 'lowerBound' ? 'Lower Bound' : entry.name}
            </span>
            <span className="font-medium text-gray-800 ml-auto">
              {Math.round(entry.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface ForecastChartProps {
  points: ForecastPointClient[];
  historicalData?: { date: string; value: number }[];
}

export function ForecastChart({ points, historicalData }: ForecastChartProps) {
  const chartData = useMemo((): ChartDataPoint[] => {
    const histPoints = (historicalData || []).map((d) => ({
      date: d.date,
      historical: d.value,
      predicted: null as number | null,
      upperBound: null as number | null,
      lowerBound: null as number | null,
      season: '' as string,
    }));

    const forecastPoints = points.map((p) => ({
      date: p.date,
      historical: null as number | null,
      predicted: p.predicted,
      upperBound: p.upperBound,
      lowerBound: p.lowerBound,
      season: p.season,
    }));

    return [...histPoints, ...forecastPoints];
  }, [points, historicalData]);

  // Sample data if too many points (show ~90 max for readability)
  const sampledData = useMemo(() => {
    if (chartData.length <= 90) return chartData;
    const step = Math.ceil(chartData.length / 90);
    return chartData.filter((_, i) => i % step === 0 || i === chartData.length - 1);
  }, [chartData]);

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sampledData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPredicted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gradConfidence" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#d1d5db' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#d1d5db' }}
            width={50}
          />
          <Tooltip content={<CustomTooltip chartData={chartData} />} />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                historical: 'Historical',
                predicted: 'Predicted',
                upperBound: 'Upper Bound (95%)',
                lowerBound: 'Lower Bound (95%)',
              };
              return labels[value] || value;
            }}
          />
          {/* Confidence interval upper */}
          <Area
            type="monotone"
            dataKey="upperBound"
            stroke="#94a3b8"
            strokeDasharray="2 2"
            fill="url(#gradConfidence)"
            strokeWidth={1}
            dot={false}
            connectNulls={false}
          />
          {/* Predicted line */}
          <Area
            type="monotone"
            dataKey="predicted"
            stroke="#059669"
            fill="url(#gradPredicted)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#059669', fill: '#fff' }}
          />
          {/* Confidence interval lower */}
          <Area
            type="monotone"
            dataKey="lowerBound"
            stroke="#94a3b8"
            strokeDasharray="2 2"
            fill="transparent"
            strokeWidth={1}
            dot={false}
            connectNulls={false}
          />
          {/* Historical data */}
          <Area
            type="monotone"
            dataKey="historical"
            stroke="#475569"
            fill="transparent"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            activeDot={{ r: 3, strokeWidth: 2, stroke: '#475569', fill: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
