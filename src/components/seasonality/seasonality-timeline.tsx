'use client';

// ============================================
// TrimedCast - Seasonality Timeline Component
// 12-month horizontal year timeline visualization
// with colored bars, holiday markers, combined multipliers
// ============================================

import React from 'react';
import { PartyPopper } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SeasonalityType } from './types';
import {
  MONTH_SHORT_EN,
  MONTH_SHORT_BN,
  BD_HOLIDAYS,
} from './types';

interface SeasonalityTimelineProps {
  types: SeasonalityType[];
  showBn?: boolean;
}

// Holiday type to color mapping
const HOLIDAY_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  religious: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-600' },
  cultural: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-600' },
  national: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-600' },
  international: { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-300 dark:border-sky-600' },
};

export function SeasonalityTimeline({
  types,
  showBn = false,
}: SeasonalityTimelineProps) {
  const activeTypes = types.filter((t) => t.is_active);

  // Calculate combined multiplier for each month
  const getCombinedMultiplier = (month: number): number => {
    const applicable = activeTypes.filter((t) => t.months.includes(month));
    if (applicable.length === 0) return 1.0;
    return applicable.reduce((product, t) => product * t.multiplier, 1.0);
  };

  // Get types active in a specific month
  const getTypesForMonth = (month: number): SeasonalityType[] => {
    return activeTypes.filter((t) => t.months.includes(month));
  };

  // Get holidays for a specific month
  const getHolidaysForMonth = (month: number) => {
    return BD_HOLIDAYS.filter((h) => h.month === month);
  };

  const maxCombined = Math.max(
    ...Array.from({ length: 12 }, (_, i) => getCombinedMultiplier(i + 1)),
    1.0,
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PartyPopper className="h-4 w-4 text-amber-500" />
            Year Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {activeTypes.length} active
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month headers */}
        <div className="grid grid-cols-12 gap-0.5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
            const monthLabel = showBn ? MONTH_SHORT_BN[month - 1] : MONTH_SHORT_EN[month - 1];
            const combined = getCombinedMultiplier(month);
            const holidays = getHolidaysForMonth(month);

            return (
              <div key={month} className="flex flex-col items-center gap-1">
                {/* Month label */}
                <span className="text-[10px] font-medium text-muted-foreground">
                  {monthLabel}
                </span>

                {/* Seasonality bars for each type */}
                <div className="w-full space-y-0.5 min-h-[24px]">
                  {activeTypes.map((type) => {
                    const isActiveInMonth = type.months.includes(month);
                    return (
                      <div
                        key={type.id}
                        className={`h-2 rounded-sm transition-all ${
                          isActiveInMonth ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{
                          backgroundColor: isActiveInMonth ? (type.color ?? '#6b7280') : 'transparent',
                        }}
                      />
                    );
                  })}
                </div>

                {/* Holiday markers */}
                {holidays.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-0.5">
                          {holidays.map((h) => {
                            const colors = HOLIDAY_TYPE_COLORS[h.type] ?? HOLIDAY_TYPE_COLORS.national;
                            return (
                              <span
                                key={h.name}
                                className={`inline-block w-1.5 h-1.5 rounded-full ${colors.bg} ${colors.border} border`}
                                style={{ backgroundColor: h.type === 'religious' ? '#f59e0b' : h.type === 'cultural' ? '#8b5cf6' : h.type === 'national' ? '#10b981' : '#0ea5e9' }}
                              />
                            );
                          })}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {holidays.map((h) => (
                          <div key={h.name}>
                            {showBn ? h.nameBn : h.name}
                          </div>
                        ))}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Combined multiplier */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`text-[9px] font-mono font-semibold cursor-default ${
                          combined > 1
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : combined < 1
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-zinc-500'
                        }`}
                      >
                        {combined.toFixed(1)}×
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs max-w-48">
                      <div className="font-medium mb-1">
                        Month {monthLabel}: {combined.toFixed(2)}× combined
                      </div>
                      {getTypesForMonth(month).map((t) => (
                        <div key={t.id} className="flex items-center gap-1">
                          <span
                            className="h-2 w-2 rounded-full inline-block"
                            style={{ backgroundColor: t.color ?? '#6b7280' }}
                          />
                          {showBn && t.label_bn ? t.label_bn : t.label}: {t.multiplier.toFixed(1)}×
                        </div>
                      ))}
                      {getTypesForMonth(month).length === 0 && (
                        <div className="text-muted-foreground">No active patterns</div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          })}
        </div>

        {/* Combined multiplier bar chart */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Combined Demand Multiplier by Month
          </div>
          <div className="grid grid-cols-12 gap-0.5 items-end h-16">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
              const combined = getCombinedMultiplier(month);
              const barHeight = Math.max((combined / maxCombined) * 100, 4);
              const isAbove = combined > 1;
              const isBelow = combined < 1;

              return (
                <TooltipProvider key={month}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center gap-0.5 cursor-default">
                        <div
                          className={`w-full rounded-t-sm transition-all ${
                            isAbove
                              ? 'bg-emerald-500/70 dark:bg-emerald-400/70'
                              : isBelow
                                ? 'bg-red-500/70 dark:bg-red-400/70'
                                : 'bg-zinc-300 dark:bg-zinc-600'
                          }`}
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {showBn ? MONTH_SHORT_BN[month - 1] : MONTH_SHORT_EN[month - 1]}: {combined.toFixed(2)}×
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
          {/* Baseline at 1.0× */}
          <div className="relative h-0">
            <div
              className="absolute left-0 right-0 border-t border-dashed border-zinc-300 dark:border-zinc-600"
              style={{ bottom: `${(1 / maxCombined) * 100}%` }}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {/* Type legend */}
          <div className="flex flex-wrap gap-2">
            {activeTypes.map((type) => (
              <div key={type.id} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: type.color ?? '#6b7280' }}
                />
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {showBn && type.label_bn ? type.label_bn : type.label}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({type.multiplier.toFixed(1)}×)
                </span>
              </div>
            ))}
          </div>

          {/* Holiday legend */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground font-medium mr-1">BD Holidays:</span>
            {BD_HOLIDAYS.map((h) => {
              const colors = HOLIDAY_TYPE_COLORS[h.type] ?? HOLIDAY_TYPE_COLORS.national;
              return (
                <TooltipProvider key={h.name}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 gap-0.5 ${colors.text} ${colors.border}`}>
                        <span
                          className="h-1.5 w-1.5 rounded-full inline-block"
                          style={{ backgroundColor: h.type === 'religious' ? '#f59e0b' : h.type === 'cultural' ? '#8b5cf6' : h.type === 'national' ? '#10b981' : '#0ea5e9' }}
                        />
                        {showBn ? h.nameBn : h.name}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {showBn ? h.name : h.nameBn} — {MONTH_SHORT_EN[h.month - 1]} ({h.type})
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
