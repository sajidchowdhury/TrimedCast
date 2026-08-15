'use client';

// ============================================
// Season Indicator — BD season display with countdown
// Shows current season, next season, and days remaining
// ============================================

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Snowflake, Sun, CloudRain, CloudSun, CalendarDays } from 'lucide-react';
import { type SeasonalSummary } from '@/lib/dashboard/store';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const SEASON_CONFIG: Record<string, {
  label: string;
  bengali: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  months: string;
}> = {
  winter: {
    label: 'Winter',
    bengali: 'শীতকাল',
    icon: Snowflake,
    color: 'text-sky-600',
    bgColor: 'bg-sky-500/10',
    months: 'Nov–Feb',
  },
  summer: {
    label: 'Summer',
    bengali: 'গ্রীষ্মকাল',
    icon: Sun,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    months: 'Mar–May',
  },
  monsoon: {
    label: 'Monsoon',
    bengali: 'বর্ষাকাল',
    icon: CloudRain,
    color: 'text-teal-600',
    bgColor: 'bg-teal-500/10',
    months: 'Jun–Sep',
  },
  pre_winter: {
    label: 'Pre-Winter',
    bengali: 'হেমন্তকাল',
    icon: CloudSun,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    months: 'Oct–Nov',
  },
};

interface SeasonIndicatorProps {
  seasonal: SeasonalSummary;
  className?: string;
}

export function SeasonIndicator({ seasonal, className }: SeasonIndicatorProps) {
  const currentConfig = SEASON_CONFIG[seasonal.current_season] || SEASON_CONFIG.summer;
  const nextConfig = SEASON_CONFIG[seasonal.next_season] || SEASON_CONFIG.winter;

  const CurrentIcon = currentConfig.icon;
  const NextIcon = nextConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Current Season */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', currentConfig.bgColor)}>
                  <CurrentIcon className={cn('h-6 w-6', currentConfig.color)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Current Season</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{currentConfig.label}</span>
                    <span className="text-sm text-muted-foreground font-medium">{currentConfig.bengali}</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {currentConfig.months}
              </Badge>
            </div>
          </div>

          {/* Next Season Countdown */}
          <div className="p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', nextConfig.bgColor)}>
                  <NextIcon className={cn('h-4 w-4', nextConfig.color)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Next: {nextConfig.label}</p>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-semibold tabular-nums">
                      {seasonal.days_to_next_season} days
                    </span>
                  </div>
                </div>
              </div>

              {/* Countdown bar */}
              <div className="w-24">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full', nextConfig.color.replace('text-', 'bg-'))}
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.max(5, 100 - (seasonal.days_to_next_season / 90) * 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
