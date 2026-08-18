'use client';

// ============================================
// TrimedCast — Model Comparison Chart
// Session 21: Demand Forecasting Results
// ============================================

import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useForecastResultStore } from '@/stores/forecast-result-store';
import { FORECAST_METHODS } from './types';

export function ModelComparisonChart() {
  const { modelComparison } = useForecastResultStore();

  // Find best method (lowest MAPE)
  const bestMethod = modelComparison.reduce(
    (best, curr) => (curr.mape < best.mape ? curr : best),
    modelComparison[0],
  );

  // Prepare chart data
  const chartData = modelComparison.map((m) => {
    const config = FORECAST_METHODS.find((fm) => fm.value === m.method);
    return {
      method: config?.label ?? m.method,
      MAPE: m.mape,
      RMSE: m.rmse,
      MAE: m.mae,
      color: config?.color ?? '#64748b',
    };
  });

  const colors = ['#6366f1', '#f59e0b', '#10b981'];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          Model Comparison
          <span className="text-xs text-muted-foreground font-normal">/ মডেল তুলনা</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bar Chart */}
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="method" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, padding: 8 }}
                formatter={(value: number) => [value.toFixed(1), '']}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="MAPE" fill={colors[0]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="RMSE" fill={colors[1]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="MAE" fill={colors[2]} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison Table */}
        <div className="rounded-lg border border-border/50 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left p-2 font-medium">Method</th>
                <th className="text-right p-2 font-medium">MAPE</th>
                <th className="text-right p-2 font-medium">RMSE</th>
                <th className="text-right p-2 font-medium">MAE</th>
                <th className="text-right p-2 font-medium">Accuracy</th>
                <th className="text-right p-2 font-medium">Predicted Qty</th>
              </tr>
            </thead>
            <tbody>
              {modelComparison.map((m) => {
                const config = FORECAST_METHODS.find((fm) => fm.value === m.method);
                const isBest = m.method === bestMethod.method;
                return (
                  <tr key={m.method} className={`border-b border-border/30 ${isBest ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                    <td className="p-2 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config?.color ?? '#64748b' }} />
                      {config?.label ?? m.method}
                      {isBest && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                    </td>
                    <td className="p-2 text-right font-mono">{m.mape}%</td>
                    <td className="p-2 text-right font-mono">{m.rmse.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono">{m.mae.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono">{m.accuracy}%</td>
                    <td className="p-2 text-right font-mono">{m.predicted_qty.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
