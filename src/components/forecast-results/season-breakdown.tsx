'use client';

// ============================================
// TrimedCast — Season Breakdown
// Session 21: Demand Forecasting Results
// ============================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFilteredForecasts } from '@/stores/forecast-result-store';
import { BD_SEASONS } from './types';

export function SeasonBreakdown() {
  const filteredForecasts = useFilteredForecasts();

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          Season Breakdown
          <span className="text-xs text-muted-foreground font-normal">/ মৌসুম বিবরণ</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {BD_SEASONS.map((season) => {
          const seasonForecasts = filteredForecasts.filter((f) => f.season === season.value);
          const count = seasonForecasts.length;
          const withMape = seasonForecasts.filter((f) => f.mape !== null);
          const avgMape = withMape.length > 0
            ? withMape.reduce((sum, f) => sum + (f.mape ?? 0), 0) / withMape.length
            : null;

          return (
            <div
              key={season.value}
              className={`rounded-lg border p-3 ${season.borderClass} ${season.bgClass} transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{season.icon}</span>
                  <div>
                    <p className={`text-sm font-medium ${season.textClass}`}>{season.label}</p>
                    <p className="text-[10px] text-muted-foreground">{season.labelBn} · {season.months}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {avgMape !== null ? `Avg MAPE: ${avgMape.toFixed(1)}%` : 'No data'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
