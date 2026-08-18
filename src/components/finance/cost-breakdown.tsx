'use client';

// ============================================
// TrimedCast — Cost Breakdown Analysis
// Session 26: Financial Analytics & Cost Intelligence Dashboard
// ============================================

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFinanceStore } from '@/stores/finance-store';
import type { CostCategory, CostType } from '@/components/finance/types';
import { COST_TYPE_CONFIG, formatBDT, formatPct } from '@/components/finance/types';

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Donut Chart Props ───────────────────────────────────────────────

interface DonutSegment {
  type: CostType;
  category: CostCategory;
  startAngle: number; // radians
  endAngle: number;
}

interface DonutChartProps {
  categories: CostCategory[];
  totalCost: number;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}

// ─── Donut Chart (Pure SVG) ──────────────────────────────────────────

function DonutChart({ categories, totalCost, hoveredIndex, onHover }: DonutChartProps) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 100;
  const innerR = 60;
  const gap = 0.02; // small gap between segments in radians

  const segments = useMemo<DonutSegment[]>(() => {
    // Compute cumulative angles to avoid mutation inside map
    const startAngle = -Math.PI / 2; // start at top
    const cumulativeAngles: number[] = [startAngle];
    for (const cat of categories) {
      const prev = cumulativeAngles[cumulativeAngles.length - 1];
      cumulativeAngles.push(prev + (cat.percentage / 100) * 2 * Math.PI);
    }
    return categories.map((cat, i) => {
      const angleStart = cumulativeAngles[i];
      const sweep = cumulativeAngles[i + 1] - angleStart;
      return {
        type: cat.type,
        category: cat,
        startAngle: angleStart + gap / 2,
        endAngle: angleStart + sweep - gap / 2,
      };
    });
  }, [categories]);

  function arcPath(innerRadius: number, outerRadius: number, start: number, end: number): string {
    const x1 = cx + outerRadius * Math.cos(start);
    const y1 = cy + outerRadius * Math.sin(start);
    const x2 = cx + outerRadius * Math.cos(end);
    const y2 = cy + outerRadius * Math.sin(end);
    const x3 = cx + innerRadius * Math.cos(end);
    const y3 = cy + innerRadius * Math.sin(end);
    const x4 = cx + innerRadius * Math.cos(start);
    const y4 = cy + innerRadius * Math.sin(start);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return [
      `M ${x1} ${y1}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');
  }

  return (
    <TooltipProvider delayDuration={150}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="select-none"
      >
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="hsl(var(--muted))" strokeWidth={outerR - innerR} opacity={0.15} />

        {/* Segments */}
        {segments.map((seg, i) => {
          const isHovered = hoveredIndex === i;
          const scale = isHovered ? 1.04 : 1;
          const opacity = hoveredIndex !== null && !isHovered ? 0.55 : 1;
          const config = COST_TYPE_CONFIG[seg.type];
          const d = arcPath(innerR, outerR, seg.startAngle, seg.endAngle);

          return (
            <Tooltip key={seg.type}>
              <TooltipTrigger asChild>
                <g
                  style={{
                    transform: `translate(${cx}px, ${cy}px) scale(${scale}) translate(${-cx}px, ${-cy}px)`,
                    transformOrigin: `${cx}px ${cy}px`,
                    transition: 'transform 0.2s ease, opacity 0.2s ease',
                    opacity,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => onHover(i)}
                  onMouseLeave={() => onHover(null)}
                >
                  <path d={d} fill={config.color} />
                </g>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="font-semibold">{seg.category.name} / {seg.category.nameBn}</div>
                <div>{formatBDT(seg.category.amount)} · {formatPct(seg.category.percentage)}</div>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground text-lg font-bold" style={{ fontSize: '18px' }}>
          {formatBDT(totalCost)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground text-xs" style={{ fontSize: '11px' }}>
          Total Cost
        </text>
      </svg>
    </TooltipProvider>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function CostBreakdown() {
  const costCategories = useFinanceStore((s) => s.costCategories);
  const totalCost = useFinanceStore((s) => s.totalCost());

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Sort categories by amount descending
  const sorted = useMemo(
    () => [...costCategories].sort((a, b) => b.amount - a.amount),
    [costCategories]
  );

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Cost Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">খরচ বিশ্লেষণ</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tracking-tight">{formatBDT(totalCost)}</p>
            <p className="text-xs text-muted-foreground">Total Operating Cost</p>
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        <motion.div
          className="flex flex-col lg:flex-row gap-6 items-center lg:items-start"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Donut Chart */}
          <motion.div variants={itemVariants} className="flex-shrink-0">
            <DonutChart
              categories={sorted}
              totalCost={totalCost}
              hoveredIndex={hoveredIndex}
              onHover={setHoveredIndex}
            />
          </motion.div>

          {/* Category List */}
          <motion.div variants={itemVariants} className="flex-1 w-full space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
            {sorted.map((cat, i) => {
              const config = COST_TYPE_CONFIG[cat.type];
              const isUp = cat.trend === 'up';
              const isDown = cat.trend === 'down';

              return (
                <motion.div
                  key={cat.id}
                  variants={itemVariants}
                  className={`group rounded-lg border p-3 transition-colors ${
                    hoveredIndex === i
                      ? 'border-foreground/20 bg-muted/50'
                      : 'border-transparent hover:bg-muted/30'
                  }`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: color dot + name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: config.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{cat.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{cat.nameBn}</p>
                      </div>
                    </div>

                    {/* Right: amount + trend */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold tabular-nums">{formatBDT(cat.amount)}</span>
                      <div className={`flex items-center gap-0.5 text-xs font-medium ${
                        isUp ? 'text-red-600' : isDown ? 'text-emerald-600' : 'text-muted-foreground'
                      }`}>
                        {isUp && <ArrowUp className="h-3 w-3" />}
                        {isDown && <ArrowDown className="h-3 w-3" />}
                        {!isUp && !isDown && <Minus className="h-3 w-3" />}
                        <span>{formatPct(Math.abs(cat.trendPct))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Percentage bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: config.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percentage}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                      {formatPct(cat.percentage)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
