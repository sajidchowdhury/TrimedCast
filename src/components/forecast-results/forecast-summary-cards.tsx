'use client';

// ============================================
// TrimedCast — Forecast Summary Cards
// Session 21: Demand Forecasting Results
// ============================================

import { Brain, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFilteredForecasts, useAverageMape } from '@/stores/forecast-result-store';
import { FORECAST_METHODS, getAccuracyRating } from './types';

export function ForecastSummaryCards() {
  const filteredForecasts = useFilteredForecasts();
  const avgMape = useAverageMape();

  const totalForecasts = filteredForecasts.length;
  const rating = getAccuracyRating(avgMape);
  const methodsUsed = [...new Set(filteredForecasts.map((f) => f.forecast_method))];
  const cnyFlagged = filteredForecasts.filter((f) => f.cny_risk_flag).length;

  const ratingColorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    red: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
    slate: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  };

  const cards = [
    {
      title: 'Total Forecasts',
      titleBn: 'মোট পূর্বাভাস',
      value: totalForecasts.toString(),
      icon: Brain,
      iconClass: 'text-emerald-500',
      bgClass: 'bg-emerald-500/10',
      sub: `${filteredForecasts.filter((f) => f.is_recalibrated).length} recalibrated`,
    },
    {
      title: 'Avg Accuracy (MAPE)',
      titleBn: 'গড় নির্ভুলতা',
      value: avgMape.toFixed(1) + '%',
      icon: Target,
      iconClass: 'text-sky-500',
      bgClass: 'bg-sky-500/10',
      sub: rating.label,
      badge: rating.labelBn,
      badgeClass: ratingColorMap[rating.color] ?? '',
    },
    {
      title: 'Methods Used',
      titleBn: 'ব্যবহৃত পদ্ধতি',
      value: methodsUsed.length.toString(),
      icon: TrendingUp,
      iconClass: 'text-violet-500',
      bgClass: 'bg-violet-500/10',
      methodDots: methodsUsed,
    },
    {
      title: 'CNY Flagged',
      titleBn: 'CNY ঝুঁকি',
      value: cnyFlagged.toString(),
      icon: AlertTriangle,
      iconClass: cnyFlagged > 0 ? 'text-red-500' : 'text-slate-400',
      bgClass: cnyFlagged > 0 ? 'bg-red-500/10' : 'bg-slate-500/10',
      sub: cnyFlagged > 0 ? 'Needs attention' : 'All clear',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                  {card.sub && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {card.sub}
                      {card.badge && (
                        <Badge variant="outline" className={`text-[10px] px-1 py-0 ${card.badgeClass}`}>
                          {card.badge}
                        </Badge>
                      )}
                    </p>
                  )}
                  {card.methodDots && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {card.methodDots.map((m) => {
                        const config = FORECAST_METHODS.find((fm) => fm.value === m);
                        return (
                          <div
                            key={m}
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: config?.color ?? '#64748b' }}
                            title={config?.label ?? m}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className={`p-2 rounded-lg ${card.bgClass}`}>
                  <Icon className={`h-4 w-4 ${card.iconClass}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
