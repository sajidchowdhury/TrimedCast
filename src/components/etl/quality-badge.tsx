'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { type QualityStats } from '@/lib/etl/import-types';
import { calculateQualityScore, getQualityLabel, getQualityBreakdown } from '@/lib/etl/quality-score';

interface QualityBadgeProps {
  score: number;
  size?: 'sm' | 'lg';
  showBreakdown?: boolean;
  stats?: QualityStats | null;
}

function getColorClasses(score: number): { text: string; bg: string; border: string; progress: string } {
  if (score >= 90) return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', progress: 'bg-emerald-500' };
  if (score >= 75) return { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', progress: 'bg-green-500' };
  if (score >= 60) return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', progress: 'bg-amber-500' };
  if (score >= 40) return { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', progress: 'bg-orange-500' };
  return { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', progress: 'bg-red-500' };
}

export function QualityBadge({ score, size = 'lg', showBreakdown = false, stats = null }: QualityBadgeProps) {
  const { label, color, description } = getQualityLabel(score);
  const colors = getColorClasses(score);
  const roundedScore = Math.round(score);

  if (size === 'sm') {
    return (
      <Badge
        variant="outline"
        className={`${colors.text} ${colors.bg} ${colors.border} text-xs font-medium`}
      >
        {roundedScore}/100 {label}
      </Badge>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${colors.bg} ${colors.border}`}>
      <div className="flex items-center gap-4">
        {/* Score Circle */}
        <div className={`flex-shrink-0 w-20 h-20 rounded-full border-4 ${colors.border} flex items-center justify-center`}>
          <span className={`text-2xl font-bold ${colors.text}`}>{roundedScore}</span>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold ${colors.text}`}>{label}</span>
            <span className="text-sm text-gray-500">Quality Score</span>
          </div>
          <p className="text-xs text-gray-500 mb-2">{description}</p>
          <Progress value={score} className="h-2" />
        </div>
      </div>

      {/* Breakdown */}
      {showBreakdown && stats && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(() => {
            const breakdown = getQualityBreakdown(stats);
            return (
              <>
                <MiniStat label="Data Quality (40%)" value={breakdown.dataQuality} max={40} color={colors.progress} />
                <MiniStat label="Insertion (30%)" value={breakdown.insertionSuccess} max={30} color={colors.progress} />
                <MiniStat label="Dedup (20%)" value={breakdown.dedupQuality} max={20} color={colors.progress} />
                <MiniStat label="Mapping (10%)" value={breakdown.mappingCompleteness} max={10} color={colors.progress} />
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs font-medium">{value.toFixed(1)}/{max}</div>
    </div>
  );
}
