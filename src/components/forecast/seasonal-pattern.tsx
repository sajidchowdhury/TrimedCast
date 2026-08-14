'use client';

import { Card, CardContent } from '@/components/ui/card';
import { BD_SEASONS, type BDSeason, type SeasonInfo } from '@/lib/forecasting/models';

interface SeasonalPatternProps {
  currentSeason?: BDSeason;
}

const SEASON_STYLES: Record<BDSeason, { bg: string; border: string; text: string; bar: string; badge: string }> = {
  winter: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  summer: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700',
  },
  monsoon: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    bar: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700',
  },
  pre_winter: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    bar: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-700',
  },
};

function getCurrentBDSeason(): BDSeason {
  const month = new Date().getMonth() + 1;
  for (const s of BD_SEASONS) {
    if (s.months.includes(month)) return s.season;
  }
  return 'winter';
}

export function SeasonalPattern({ currentSeason }: SeasonalPatternProps) {
  const activeSeason = currentSeason || getCurrentBDSeason();
  const maxMultiplier = Math.max(...BD_SEASONS.map((s) => s.demandMultiplier));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {BD_SEASONS.map((season: SeasonInfo) => {
        const styles = SEASON_STYLES[season.season];
        const isActive = season.season === activeSeason;
        const barWidth = (season.demandMultiplier / maxMultiplier) * 100;

        return (
          <Card
            key={season.season}
            className={`${styles.bg} ${styles.border} ${isActive ? 'ring-2 ring-offset-1' : ''} ${
              isActive ? (season.season === 'winter' ? 'ring-emerald-400' :
                         season.season === 'summer' ? 'ring-amber-400' :
                         season.season === 'monsoon' ? 'ring-blue-400' :
                         'ring-orange-400') : ''
            } transition-all`}
          >
            <CardContent className="p-4 space-y-3">
              {/* Season name */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold text-sm ${styles.text}`}>
                    {season.label}
                  </h3>
                  {isActive && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${styles.badge}`}>
                      Current
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">{season.labelBn}</p>
              </div>

              {/* Months */}
              <div className="flex gap-1">
                {season.months.map((m) => (
                  <span
                    key={m}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${styles.badge} font-medium`}
                  >
                    {new Date(2024, m - 1).toLocaleString('en', { month: 'short' })}
                  </span>
                ))}
              </div>

              {/* Demand multiplier bar */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-gray-500">Demand</span>
                  <span className={`text-sm font-bold ${styles.text}`}>
                    {season.demandMultiplier}×
                  </span>
                </div>
                <div className="h-3 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${styles.bar} rounded-full transition-all duration-500`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>

              {/* Description */}
              <p className="text-[11px] text-gray-600 leading-relaxed">
                {season.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
