'use client';

// ============================================
// TrimedCast — Season & SOP Banner
// Session 20: Control Tower Dashboard
// ============================================

import { motion } from 'framer-motion';
import {
  Snowflake,
  Sun,
  CloudRain,
  Leaf,
  ArrowRight,
  Workflow,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SeasonalSummary, SopCycle } from './types';
import { BD_SEASONS, SOP_STAGES, SOP_STAGE_ORDER } from './types';

interface SeasonSopBannerProps {
  seasonalSummary: SeasonalSummary;
  sopCycle: SopCycle | null;
}

const seasonIcons: Record<string, React.ElementType> = {
  Snowflake,
  Sun,
  CloudRain,
  Leaf,
};

const seasonBgGradients: Record<string, string> = {
  blue: 'from-blue-500/8 via-blue-500/4 to-transparent',
  amber: 'from-amber-500/8 via-amber-500/4 to-transparent',
  emerald: 'from-emerald-500/8 via-emerald-500/4 to-transparent',
  orange: 'from-orange-500/8 via-orange-500/4 to-transparent',
};

const seasonBorderColors: Record<string, string> = {
  blue: 'border-blue-500/20',
  amber: 'border-amber-500/20',
  emerald: 'border-emerald-500/20',
  orange: 'border-orange-500/20',
};

export function SeasonSopBanner({ seasonalSummary, sopCycle }: SeasonSopBannerProps) {
  const currentSeason = BD_SEASONS[seasonalSummary.current_season] || BD_SEASONS.monsoon;
  const nextSeason = BD_SEASONS[seasonalSummary.next_season] || BD_SEASONS.pre_winter;
  const CurrentIcon = seasonIcons[currentSeason.icon] || CloudRain;
  const NextIcon = seasonIcons[nextSeason.icon] || Leaf;

  // SOP progress
  const sopStageIndex = sopCycle
    ? SOP_STAGE_ORDER.indexOf(sopCycle.current_stage)
    : -1;
  const sopProgress = sopStageIndex >= 0 ? ((sopStageIndex + 1) / SOP_STAGE_ORDER.length) * 100 : 0;
  const sopStageLabel = sopCycle ? (SOP_STAGES[sopCycle.current_stage] || sopCycle.current_stage) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <Card className={`overflow-hidden border ${seasonBorderColors[currentSeason.color] || 'border-emerald-500/20'}`}>
        <div className={`bg-gradient-to-r ${seasonBgGradients[currentSeason.color] || seasonBgGradients.emerald}`}>
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left: Season Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${
                  currentSeason.color === 'emerald' ? 'from-emerald-500/20 to-emerald-600/10' :
                  currentSeason.color === 'amber' ? 'from-amber-500/20 to-amber-600/10' :
                  currentSeason.color === 'blue' ? 'from-blue-500/20 to-blue-600/10' :
                  'from-orange-500/20 to-orange-600/10'
                }`}>
                  <CurrentIcon className={`h-5 w-5 ${
                    currentSeason.color === 'emerald' ? 'text-emerald-600' :
                    currentSeason.color === 'amber' ? 'text-amber-600' :
                    currentSeason.color === 'blue' ? 'text-blue-600' :
                    'text-orange-600'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">{currentSeason.label}</span>
                    <span className="text-sm text-muted-foreground">({currentSeason.labelBn})</span>
                    <Badge variant="outline" className="text-xs py-0 px-1.5">{currentSeason.months}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span>{seasonalSummary.days_to_next_season} days to</span>
                    <NextIcon className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{nextSeason.label}</span>
                    <span className="text-muted-foreground">({nextSeason.labelBn})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: SOP Cycle */}
            {sopCycle && (
              <div className="flex items-center gap-3 pl-4 border-l">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Workflow className="h-4 w-4 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{sopCycle.cycle_name}</span>
                    <Badge variant="outline" className="text-xs py-0 px-1.5 bg-violet-500/10 text-violet-600 border-violet-500/20">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${sopProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {sopStageLabel} <ArrowRight className="h-3 w-3 inline" />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
