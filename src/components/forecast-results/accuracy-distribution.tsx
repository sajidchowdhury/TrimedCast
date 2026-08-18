'use client';

// ============================================
// TrimedCast — Accuracy Distribution
// Session 21: Demand Forecasting Results
// ============================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccuracyDistribution, useFilteredForecasts } from '@/stores/forecast-result-store';

const SEGMENTS = [
  { key: 'excellent', label: 'Excellent', labelBn: 'চমৎকার', range: '<10%', color: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-300' },
  { key: 'good', label: 'Good', labelBn: 'ভালো', range: '10-20%', color: 'bg-sky-500', textColor: 'text-sky-700 dark:text-sky-300' },
  { key: 'fair', label: 'Fair', labelBn: 'মধ্যম', range: '20-30%', color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-300' },
  { key: 'poor', label: 'Poor', labelBn: 'দুর্বল', range: '>30%', color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300' },
] as const;

export function AccuracyDistribution() {
  const distribution = useAccuracyDistribution();
  const filteredForecasts = useFilteredForecasts();
  const totalWithMape = filteredForecasts.filter((f) => f.mape !== null).length;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          Accuracy Distribution
          <span className="text-xs text-muted-foreground font-normal">/ নির্ভুলতা বণ্টন</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stacked bar */}
        <div className="flex h-6 rounded-full overflow-hidden bg-muted/30">
          {SEGMENTS.map((seg) => {
            const count = distribution[seg.key];
            const pct = totalWithMape > 0 ? (count / totalWithMape) * 100 : 0;
            return (
              <div
                key={seg.key}
                className={`${seg.color} transition-all duration-300`}
                style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                title={`${seg.label}: ${count} (${pct.toFixed(0)}%)`}
              />
            );
          })}
        </div>

        {/* Legend with counts */}
        <div className="grid grid-cols-2 gap-2">
          {SEGMENTS.map((seg) => {
            const count = distribution[seg.key];
            return (
              <div key={seg.key} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${seg.color}`} />
                <span className="text-xs text-muted-foreground">{seg.label}</span>
                <span className={`text-xs font-semibold ${seg.textColor}`}>{count}</span>
                <span className="text-[10px] text-muted-foreground">({seg.range})</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
