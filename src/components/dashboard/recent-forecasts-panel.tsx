'use client';

// ============================================
// Recent Forecasts Panel — Last 5 forecast results
// Product, season, predicted qty, MAPE
// ============================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, CalendarDays } from 'lucide-react';
import { type RecentForecast } from '@/lib/dashboard/store';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface RecentForecastsPanelProps {
  forecasts: RecentForecast[];
  className?: string;
}

const SEASON_COLORS: Record<string, string> = {
  winter: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  summer: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  monsoon: 'bg-teal-500/15 text-teal-700 dark:text-teal-400',
  pre_winter: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
};

export function RecentForecastsPanel({ forecasts, className }: RecentForecastsPanelProps) {
  if (forecasts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recent Forecasts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">No forecasts generated yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Recent Forecasts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {forecasts.map((forecast, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{forecast.product_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {forecast.season && (
                  <Badge className={cn('text-[10px] px-1.5 h-4', SEASON_COLORS[forecast.season] || 'bg-muted')}>
                    {forecast.season.replace('_', '-')}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Qty: {forecast.predicted_qty.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              {forecast.mape !== null && (
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-muted-foreground" />
                  <span className={cn(
                    'text-xs font-medium tabular-nums',
                    forecast.mape <= 10 ? 'text-emerald-600' : forecast.mape <= 20 ? 'text-amber-600' : 'text-red-600',
                  )}>
                    {forecast.mape}%
                  </span>
                </div>
              )}
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(forecast.created_at), 'MMM d')}
              </span>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
