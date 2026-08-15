'use client';

// ============================================
// Season Toggle — BD 4-season filter for forecasts
// Switch season and see forecast update
// ============================================

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Snowflake, Sun, CloudRain, CloudSun, CalendarDays } from 'lucide-react';
import type { BDSeason } from '@/lib/forecasting/models';
import { cn } from '@/lib/utils';

interface SeasonOption {
  id: BDSeason;
  label: string;
  bengali: string;
  months: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  activeBg: string;
}

const SEASONS: SeasonOption[] = [
  {
    id: 'winter',
    label: 'Winter',
    bengali: 'শীতকাল',
    months: 'Nov–Feb',
    icon: Snowflake,
    color: 'text-sky-600',
    bgColor: 'bg-sky-500/10',
    activeBg: 'bg-sky-500/20 border-sky-500/50',
  },
  {
    id: 'summer',
    label: 'Summer',
    bengali: 'গ্রীষ্মকাল',
    months: 'Mar–May',
    icon: Sun,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    activeBg: 'bg-orange-500/20 border-orange-500/50',
  },
  {
    id: 'monsoon',
    label: 'Monsoon',
    bengali: 'বর্ষাকাল',
    months: 'Jun–Sep',
    icon: CloudRain,
    color: 'text-teal-600',
    bgColor: 'bg-teal-500/10',
    activeBg: 'bg-teal-500/20 border-teal-500/50',
  },
  {
    id: 'pre_winter',
    label: 'Pre-Winter',
    bengali: 'হেমন্তকাল',
    months: 'Oct–Nov',
    icon: CloudSun,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    activeBg: 'bg-amber-500/20 border-amber-500/50',
  },
];

interface SeasonToggleProps {
  activeSeason: BDSeason | null;
  onSeasonChange: (season: BDSeason | null) => void;
  currentSeason?: BDSeason;
  className?: string;
}

export function SeasonToggle({
  activeSeason,
  onSeasonChange,
  currentSeason,
  className,
}: SeasonToggleProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Season Filter
        </span>
        {activeSeason && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] h-5 px-1.5"
            onClick={() => onSeasonChange(null)}
          >
            Show All
          </Button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {SEASONS.map((season) => {
          const isActive = activeSeason === season.id;
          const isCurrent = currentSeason === season.id;
          const Icon = season.icon;

          return (
            <button
              key={season.id}
              onClick={() => onSeasonChange(isActive ? null : season.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left flex-1',
                isActive
                  ? cn(season.activeBg, 'border')
                  : 'border-border bg-card hover:bg-muted/50',
              )}
            >
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md shrink-0',
                isActive ? season.bgColor : season.bgColor,
              )}>
                <Icon className={cn('h-3.5 w-3.5', season.color)} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className={cn(
                    'text-xs font-medium',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}>
                    {season.label}
                  </span>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-[8px] px-1 h-3 shrink-0">
                      NOW
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{season.months}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Helper to get current BD season
export function getCurrentBDSeason(): BDSeason {
  const month = new Date().getMonth() + 1;
  if (month >= 11 || month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'summer';
  if (month >= 6 && month <= 9) return 'monsoon';
  return 'pre_winter';
}
