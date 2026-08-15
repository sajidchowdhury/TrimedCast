'use client';

import { motion, type Variants } from 'framer-motion';
import { Grid3X3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ── Data (from spec Section 6.2) ──────────────────────────────────────────────

const categories = [
  { key: 'brake_system', label: 'Brake System', icon: '🛞', weights: { winter: 1.50, summer: 1.00, monsoon: 1.20, pre_winter: 1.30 } },
  { key: 'chain_sprocket', label: 'Chain & Sprocket', icon: '⛓️', weights: { winter: 1.60, summer: 1.10, monsoon: 0.80, pre_winter: 1.40 } },
  { key: 'riding_gear', label: 'Riding Gear', icon: '🧥', weights: { winter: 2.00, summer: 0.50, monsoon: 1.50, pre_winter: 1.80 } },
  { key: 'engine', label: 'Engine Parts', icon: '⚙️', weights: { winter: 1.20, summer: 1.10, monsoon: 0.60, pre_winter: 1.30 } },
  { key: 'electrical', label: 'Electrical', icon: '⚡', weights: { winter: 0.80, summer: 1.50, monsoon: 1.30, pre_winter: 1.00 } },
  { key: 'body', label: 'Body Parts', icon: '🔧', weights: { winter: 1.00, summer: 0.90, monsoon: 0.70, pre_winter: 1.10 } },
] as const;

const seasons = [
  { key: 'winter', label: 'Winter', labelBn: 'শীত', months: 'Nov–Feb', color: '#10B981' },
  { key: 'summer', label: 'Summer', labelBn: 'গ্রীষ্ম', months: 'Mar–May', color: '#F59E0B' },
  { key: 'monsoon', label: 'Monsoon', labelBn: 'বর্ষা', months: 'Jun–Sep', color: '#3B82F6' },
  { key: 'pre_winter', label: 'Pre-Winter', labelBn: 'হেমন্ত', months: 'Oct', color: '#F97316' },
] as const;

type SeasonKey = (typeof seasons)[number]['key'];
type CategoryKey = (typeof categories)[number]['key'];

// ── Color helpers ─────────────────────────────────────────────────────────────

function getCellColors(weight: number) {
  if (weight < 0.8) {
    return { bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.35)', text: '#DC2626' };
  }
  if (weight <= 1.0) {
    return { bg: 'rgba(249, 115, 22, 0.14)', border: 'rgba(249, 115, 22, 0.30)', text: '#EA580C' };
  }
  if (weight <= 1.3) {
    return { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.25)', text: '#16A34A' };
  }
  if (weight <= 1.6) {
    return { bg: 'rgba(34, 197, 94, 0.22)', border: 'rgba(34, 197, 94, 0.40)', text: '#15803D' };
  }
  return { bg: 'rgba(34, 197, 94, 0.34)', border: 'rgba(34, 197, 94, 0.55)', text: '#166534' };
}

function getBarColor(weight: number) {
  if (weight < 0.8) return '#EF4444';
  if (weight <= 1.0) return '#F97316';
  if (weight <= 1.3) return '#4ADE80';
  if (weight <= 1.6) return '#22C55E';
  return '#15803D';
}

function TrendIcon({ weight }: { weight: number }) {
  const size = 12;
  if (weight > 1.0) return <TrendingUp size={size} className="text-green-600" />;
  if (weight < 1.0) return <TrendingDown size={size} className="text-red-500" />;
  return <Minus size={size} className="text-gray-400" />;
}

// ── Legend items ──────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  { color: 'rgba(239, 68, 68, 0.30)', border: 'rgba(239, 68, 68, 0.55)', label: 'Below base demand (< 0.8×)' },
  { color: 'rgba(249, 115, 22, 0.22)', border: 'rgba(249, 115, 22, 0.45)', label: 'Near base (0.8–1.0×)' },
  { color: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.25)', label: 'Above base (1.0–1.3×)' },
  { color: 'rgba(34, 197, 94, 0.22)', border: 'rgba(34, 197, 94, 0.40)', label: 'High demand (1.3–1.6×)' },
  { color: 'rgba(34, 197, 94, 0.34)', border: 'rgba(34, 197, 94, 0.55)', label: 'Peak demand (> 1.6×)' },
];

// ── Key insights ─────────────────────────────────────────────────────────────

const KEY_INSIGHTS = [
  { emoji: '🛞', text: 'Brake System demand increases 50% in Winter AND 20% in Monsoon (wet brakes wear faster)' },
  { emoji: '🧥', text: 'Riding Gear peaks at 2× in Winter but drops to 0.5× in Summer' },
  { emoji: '⚡', text: 'Electrical is counter-cyclical: peaks in Summer (1.5×) due to heat-related failures' },
];

// ── Animation variants ───────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
};

const cellVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } },
};

const rowLabelVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } },
};

// ── Component ────────────────────────────────────────────────────────────────

export function CategorySeasonalGrid() {
  const maxWeight = 2.0; // max possible for bar scaling

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Grid3X3 size={18} className="text-emerald-600" />
          <CardTitle className="text-base font-semibold">
            Category × Season Demand Matrix
          </CardTitle>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Seasonal adjustment multipliers per product category for Bangladesh climate seasons
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Grid ──────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="min-w-[640px]">
            {/* Column headers */}
            <div className="grid grid-cols-[180px_repeat(4,1fr)] gap-1.5 mb-1.5">
              {/* Top-left corner label */}
              <div />

              {seasons.map((season) => (
                <div
                  key={season.key}
                  className="flex flex-col items-center gap-1 py-2 px-1"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: season.color }}
                    />
                    <span className="text-xs font-semibold text-gray-700">{season.label}</span>
                  </div>
                  <span className="text-[11px] text-gray-400">{season.labelBn}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 font-normal border-gray-200 text-gray-500"
                  >
                    {season.months}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Rows */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-1.5"
            >
              {categories.map((cat, rowIdx) => (
                <div
                  key={cat.key}
                  className="grid grid-cols-[180px_repeat(4,1fr)] gap-1.5 items-stretch"
                >
                  {/* Row label */}
                  <motion.div
                    variants={rowLabelVariants}
                    className="flex items-center gap-2 pr-2 py-2"
                  >
                    <span className="text-lg leading-none">{cat.icon}</span>
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {cat.label}
                    </span>
                  </motion.div>

                  {/* Cells */}
                  {seasons.map((season, colIdx) => {
                    const weight = cat.weights[season.key as SeasonKey];
                    const colors = getCellColors(weight);
                    const barPercent = (weight / maxWeight) * 100;
                    const barColor = getBarColor(weight);

                    return (
                      <motion.div
                        key={season.key}
                        variants={cellVariants}
                        className="flex flex-col items-center justify-center gap-1 py-2.5 px-1.5 rounded-lg transition-colors"
                        style={{
                          backgroundColor: colors.bg,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {/* Trend icon + value */}
                        <div className="flex items-center gap-1">
                          <TrendIcon weight={weight} />
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ color: colors.text }}
                          >
                            {weight.toFixed(2)}×
                          </span>
                        </div>

                        {/* Magnitude bar */}
                        <div className="w-full max-w-[72px] h-1.5 bg-white/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${barPercent}%`,
                              backgroundColor: barColor,
                            }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* ── Legend ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center pt-2 border-t border-gray-100">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3.5 h-3.5 rounded-sm shrink-0"
                style={{ backgroundColor: item.color, border: `1px solid ${item.border}` }}
              />
              <span className="text-[11px] text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>

        {/* ── Key Insights ─────────────────────────────────────────────── */}
        <div className="space-y-2 pt-3 border-t border-gray-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Key Insights
          </p>
          {KEY_INSIGHTS.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.12, type: 'spring', stiffness: 200, damping: 22 }}
              className="flex items-start gap-2 rounded-md bg-gray-50 border border-gray-100 px-3 py-2"
            >
              <span className="text-base leading-none mt-0.5">{insight.emoji}</span>
              <p className="text-xs text-gray-600 leading-relaxed">{insight.text}</p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
