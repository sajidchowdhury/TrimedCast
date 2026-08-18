'use client';

// ============================================
// TrimedCast — ABC-XYZ Classification Analysis
// Session 28: Product Catalog & Inventory Intelligence Dashboard
// ============================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Layers,
  Grid3X3,
  ChevronDown,
  ChevronRight,
  Target,
  Zap,
  AlertTriangle,
  CircleDot,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import type {
  Product,
  ABCClass,
  XYZClass,
  ABCAnalysis,
} from '@/components/catalog/types';
import {
  formatBDT,
  getABCClasses,
  getXYZClasses,
  ABC_CONFIG,
  XYZ_CONFIG,
  MOCK_PRODUCTS,
  MOCK_ABC_ANALYSIS,
  MOCK_CATEGORY_SUMMARIES,
} from '@/components/catalog/types';
import {
  useCatalogStore,
} from '@/stores/catalog-store';

// ─── Animation Variants ──────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35 } },
};

// ─── ABC Class Card Colors ───────────────────────────────────

const ABC_CARD_COLORS: Record<ABCClass, { bg: string; border: string; accent: string; text: string; largeText: string }> = {
  A: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-300 dark:border-emerald-700',
    accent: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    largeText: 'text-emerald-600 dark:text-emerald-400',
  },
  B: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-300 dark:border-sky-700',
    accent: 'bg-sky-500',
    text: 'text-sky-700 dark:text-sky-300',
    largeText: 'text-sky-600 dark:text-sky-400',
  },
  C: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-700',
    accent: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    largeText: 'text-amber-600 dark:text-amber-400',
  },
};

const XYZ_CARD_COLORS: Record<XYZClass, { bg: string; border: string; accent: string; text: string; largeText: string }> = {
  X: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-300 dark:border-emerald-700',
    accent: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    largeText: 'text-emerald-600 dark:text-emerald-400',
  },
  Y: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-300 dark:border-sky-700',
    accent: 'bg-sky-500',
    text: 'text-sky-700 dark:text-sky-300',
    largeText: 'text-sky-600 dark:text-sky-400',
  },
  Z: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-700',
    accent: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    largeText: 'text-amber-600 dark:text-amber-400',
  },
};

// ─── Matrix cell colors by combined importance ───────────────

const MATRIX_CELL_COLORS: Record<string, { bg: string; text: string }> = {
  AX: { bg: 'bg-emerald-600', text: 'text-white' },
  AY: { bg: 'bg-emerald-400', text: 'text-white' },
  AZ: { bg: 'bg-emerald-300', text: 'text-emerald-900' },
  BX: { bg: 'bg-sky-500', text: 'text-white' },
  BY: { bg: 'bg-sky-300', text: 'text-sky-900' },
  BZ: { bg: 'bg-sky-200', text: 'text-sky-900' },
  CX: { bg: 'bg-amber-400', text: 'text-white' },
  CY: { bg: 'bg-amber-300', text: 'text-amber-900' },
  CZ: { bg: 'bg-amber-200', text: 'text-amber-900' },
};

// ─── Pareto Chart (SVG) ──────────────────────────────────────

function ParetoChart({ products }: { products: Product[] }) {
  const sorted = useMemo(() => {
    return [...products].sort((a, b) => b.totalRevenue12m - a.totalRevenue12m);
  }, [products]);

  const { bars, cumulativeLine, maxRevenue } = useMemo(() => {
    const totalRevenue = sorted.reduce((s, p) => s + p.totalRevenue12m, 0);
    // Build cumulative sums using reduce to avoid reassignment
    const barData = sorted.reduce<{ index: number; revenue: number; cumPct: number; abcClass: ABCClass; name: string }[]>(
      (acc, p, i) => {
        const prevCum = acc.length > 0 ? acc[acc.length - 1].cumPct * totalRevenue / 100 : 0;
        const cumSum = prevCum + p.totalRevenue12m;
        acc.push({
          index: i,
          revenue: p.totalRevenue12m,
          cumPct: (cumSum / totalRevenue) * 100,
          abcClass: p.abcClass,
          name: p.name,
        });
        return acc;
      },
      []
    );

    const maxRev = Math.max(...sorted.map((p) => p.totalRevenue12m));
    return { bars: barData, cumulativeLine: barData, maxRevenue: maxRev };
  }, [sorted]);

  const W = 800;
  const H = 350;
  const padL = 50;
  const padR = 50;
  const padT = 20;
  const padB = 50;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = chartW / bars.length;
  const barGap = 1;

  const abcBarColor = (cls: ABCClass) => {
    if (cls === 'A') return '#10b981'; // emerald-500
    if (cls === 'B') return '#0ea5e9'; // sky-500
    return '#f59e0b'; // amber-500
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px] h-auto">
        {/* Y-axis labels (revenue) */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <g key={pct}>
            <line
              x1={padL}
              y1={padT + chartH * (1 - pct)}
              x2={W - padR}
              y2={padT + chartH * (1 - pct)}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />
            <text
              x={padL - 5}
              y={padT + chartH * (1 - pct) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {pct === 0 ? '0' : `${(pct * 100).toFixed(0)}%`}
            </text>
          </g>
        ))}

        {/* Bars */}
        {bars.map((bar, i) => {
          const barHeight = (bar.revenue / maxRevenue) * chartH;
          const x = padL + i * barW + barGap;
          return (
            <rect
              key={i}
              x={x}
              y={padT + chartH - barHeight}
              width={barW - barGap * 2}
              height={barHeight}
              fill={abcBarColor(bar.abcClass)}
              rx={1}
              opacity={0.85}
            />
          );
        })}

        {/* Cumulative % line */}
        <polyline
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="4 2"
          points={cumulativeLine
            .map((d, i) => {
              const x = padL + i * barW + barW / 2;
              const y = padT + chartH * (1 - d.cumPct / 100);
              return `${x},${y}`;
            })
            .join(' ')}
        />

        {/* 80% threshold line */}
        <line
          x1={padL}
          y1={padT + chartH * 0.2}
          x2={W - padR}
          y2={padT + chartH * 0.2}
          stroke="#ef4444"
          strokeWidth={1.5}
          strokeDasharray="6 3"
          opacity={0.7}
        />
        <text
          x={W - padR + 5}
          y={padT + chartH * 0.2 + 4}
          className="fill-red-500 text-[9px] font-medium"
        >
          80%
        </text>

        {/* Legend */}
        <rect x={padL + 10} y={H - 20} width={10} height={10} fill="#10b981" rx={2} />
        <text x={padL + 24} y={H - 11} className="fill-muted-foreground text-[10px]">A</text>
        <rect x={padL + 50} y={H - 20} width={10} height={10} fill="#0ea5e9" rx={2} />
        <text x={padL + 64} y={H - 11} className="fill-muted-foreground text-[10px]">B</text>
        <rect x={padL + 90} y={H - 20} width={10} height={10} fill="#f59e0b" rx={2} />
        <text x={padL + 104} y={H - 11} className="fill-muted-foreground text-[10px]">C</text>
        <line x1={padL + 130} y1={H - 15} x2={padL + 155} y2={H - 15} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" />
        <text x={padL + 160} y={H - 11} className="fill-muted-foreground text-[10px]">Cumulative %</text>
      </svg>
    </div>
  );
}

// ─── ABC-XYZ Matrix Cell ─────────────────────────────────────

function MatrixCell({
  abcClass,
  xyzClass,
  products,
}: {
  abcClass: ABCClass;
  xyzClass: XYZClass;
  products: Product[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const cellProducts = useMemo(
    () =>
      products.filter(
        (p) => p.abcClass === abcClass && p.xyzClass === xyzClass
      ),
    [abcClass, xyzClass, products]
  );

  const key = `${abcClass}${xyzClass}`;
  const colors = MATRIX_CELL_COLORS[key] || { bg: 'bg-slate-200', text: 'text-slate-700' };

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className={`rounded-lg p-3 cursor-pointer transition-all ${colors.bg} ${colors.text} min-h-[80px]`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold">{key}</span>
        <span className="text-lg font-bold">{cellProducts.length}</span>
      </div>
      {cellProducts.length === 0 && (
        <p className="text-[10px] opacity-60">No products</p>
      )}
      <AnimatePresence>
        {isExpanded && cellProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 pt-2 border-t border-current/20"
          >
            {cellProducts.map((p) => (
              <p key={p.id} className="text-[10px] leading-relaxed truncate">
                {p.name}
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Category Breakdown Bar ──────────────────────────────────

function CategoryBreakdown({ products }: { products: Product[] }) {
  const categoryData = useMemo(() => {
    const categories = MOCK_CATEGORY_SUMMARIES.map((cat) => {
      const catProducts = products.filter((p) => p.category === cat.category);
      const aCount = catProducts.filter((p) => p.abcClass === 'A').length;
      const bCount = catProducts.filter((p) => p.abcClass === 'B').length;
      const cCount = catProducts.filter((p) => p.abcClass === 'C').length;
      const total = aCount + bCount + cCount;
      return {
        category: cat.category,
        categoryBn: cat.categoryBn,
        total,
        a: aCount,
        b: bCount,
        c: cCount,
        aPct: total > 0 ? (aCount / total) * 100 : 0,
        bPct: total > 0 ? (bCount / total) * 100 : 0,
        cPct: total > 0 ? (cCount / total) * 100 : 0,
      };
    });
    return categories;
  }, [products]);

  return (
    <div className="space-y-3">
      {categoryData.map((cat) => (
        <div key={cat.category} className="group">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-sm font-medium">{cat.category}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {cat.categoryBn}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {cat.total} products
            </span>
          </div>
          <div className="flex h-6 rounded-md overflow-hidden">
            {cat.aPct > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${cat.aPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="bg-emerald-500 flex items-center justify-center"
              >
                {cat.a > 0 && (
                  <span className="text-[9px] text-white font-medium">
                    A:{cat.a}
                  </span>
                )}
              </motion.div>
            )}
            {cat.bPct > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${cat.bPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                className="bg-sky-500 flex items-center justify-center"
              >
                {cat.b > 0 && (
                  <span className="text-[9px] text-white font-medium">
                    B:{cat.b}
                  </span>
                )}
              </motion.div>
            )}
            {cat.cPct > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${cat.cPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                className="bg-amber-500 flex items-center justify-center"
              >
                {cat.c > 0 && (
                  <span className="text-[9px] text-white font-medium">
                    C:{cat.c}
                  </span>
                )}
              </motion.div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function ABCXYZAnalysis() {
  const store = useCatalogStore();
  const products = store.products.length > 0 ? store.products : MOCK_PRODUCTS;
  const abcAnalysis = store.abcAnalysis.length > 0 ? store.abcAnalysis : MOCK_ABC_ANALYSIS;

  // ── XYZ computed stats ───────────────────────────────────
  const xyzStats = useMemo(() => {
    const xProducts = products.filter((p) => p.xyzClass === 'X');
    const yProducts = products.filter((p) => p.xyzClass === 'Y');
    const zProducts = products.filter((p) => p.xyzClass === 'Z');

    const avgCV = (prods: Product[]) =>
      prods.length > 0
        ? prods.reduce((s, p) => s + p.cv, 0) / prods.length
        : 0;

    return [
      {
        cls: 'X' as XYZClass,
        count: xProducts.length,
        avgCV: avgCV(xProducts),
        description: 'Stable Demand — CV < 0.5',
        products: xProducts,
      },
      {
        cls: 'Y' as XYZClass,
        count: yProducts.length,
        avgCV: avgCV(yProducts),
        description: 'Variable Demand — 0.5 ≤ CV < 1.0',
        products: yProducts,
      },
      {
        cls: 'Z' as XYZClass,
        count: zProducts.length,
        avgCV: avgCV(zProducts),
        description: 'Erratic Demand — CV ≥ 1.0',
        products: zProducts,
      },
    ];
  }, [products]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* ── Header ─────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ABC-XYZ Classification</h2>
          <p className="text-sm text-muted-foreground">এবিসি-এক্সওয়াইজেড শ্রেণীবিন্যাস</p>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* ── ABC Analysis Section ────────────────────────── */}
      {/* ═══════════════════════════════════════════════════ */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-emerald-500" />
          <h3 className="text-lg font-semibold">ABC Analysis — Revenue Classification</h3>
        </div>

        {/* ── ABC Class Cards ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {(['A', 'B', 'C'] as ABCClass[]).map((cls) => {
            const data = abcAnalysis.find((a) => a.class === cls);
            const config = ABC_CONFIG[cls];
            const colors = ABC_CARD_COLORS[cls];
            if (!data) return null;

            return (
              <motion.div
                key={cls}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Card className={`border-2 ${colors.border} ${colors.bg}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`text-4xl font-black ${colors.largeText}`}>
                          {cls}
                        </span>
                      </div>
                      <Badge variant="outline" className={`${colors.bg} ${colors.text} text-xs`}>
                        {config.revenuePct} revenue
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-2">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{data.description}</p>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold">{data.productCount}</p>
                        <p className="text-[10px] text-muted-foreground">Products</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{data.revenuePct}%</p>
                        <p className="text-[10px] text-muted-foreground">Revenue %</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{data.revenueCumPct}%</p>
                        <p className="text-[10px] text-muted-foreground">Cumulative</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* ── Pareto Chart ──────────────────────────────── */}
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Pareto Chart — Products by Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ParetoChart products={products} />
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* ── XYZ Analysis Section ────────────────────────── */}
      {/* ═══════════════════════════════════════════════════ */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-sky-500" />
          <h3 className="text-lg font-semibold">XYZ Analysis — Demand Variability</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {xyzStats.map((stat) => {
            const config = XYZ_CONFIG[stat.cls];
            const colors = XYZ_CARD_COLORS[stat.cls];

            return (
              <motion.div
                key={stat.cls}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Card className={`border-2 ${colors.border} ${colors.bg}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <span className={`text-4xl font-black ${colors.largeText}`}>
                        {stat.cls}
                      </span>
                      <Badge variant="outline" className={`${colors.bg} ${colors.text} text-xs`}>
                        {config.cvRange}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-2">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold">{stat.count}</p>
                        <p className="text-[10px] text-muted-foreground">Products</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{stat.avgCV.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">Avg CV</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* ── Combined ABC-XYZ Matrix ─────────────────────── */}
      {/* ═══════════════════════════════════════════════════ */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <Grid3X3 className="h-4 w-4 text-violet-500" />
          <h3 className="text-lg font-semibold">Combined ABC-XYZ Matrix</h3>
          <span className="text-xs text-muted-foreground">(click cell to expand products)</span>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="max-w-md mx-auto">
              {/* Column headers */}
              <div className="grid grid-cols-4 gap-2 mb-2">
                <div /> {/* empty corner */}
                {(['X', 'Y', 'Z'] as XYZClass[]).map((xyz) => {
                  const colors = XYZ_CARD_COLORS[xyz];
                  return (
                    <div
                      key={xyz}
                      className={`text-center text-sm font-bold ${colors.largeText}`}
                    >
                      {xyz}
                      <p className="text-[10px] font-normal text-muted-foreground">
                        {XYZ_CONFIG[xyz].label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Matrix rows */}
              {(['A', 'B', 'C'] as ABCClass[]).map((abc) => {
                const colors = ABC_CARD_COLORS[abc];
                return (
                  <div key={abc} className="grid grid-cols-4 gap-2 mb-2">
                    <div
                      className={`flex items-center justify-center rounded-lg ${colors.bg} ${colors.text}`}
                    >
                      <div className="text-center">
                        <span className="text-lg font-bold">{abc}</span>
                        <p className="text-[10px] font-normal opacity-70">
                          {ABC_CONFIG[abc].label}
                        </p>
                      </div>
                    </div>
                    {(['X', 'Y', 'Z'] as XYZClass[]).map((xyz) => (
                      <MatrixCell
                        key={`${abc}${xyz}`}
                        abcClass={abc}
                        xyzClass={xyz}
                        products={products}
                      />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-600" /> High Priority
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-sky-500" /> Medium Priority
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-400" /> Low Priority
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* ── Category Breakdown ──────────────────────────── */}
      {/* ═══════════════════════════════════════════════════ */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-amber-500" />
          <h3 className="text-lg font-semibold">Category ABC Distribution</h3>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <CategoryBreakdown products={products} />

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-500" /> A — High Value
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-sky-500" /> B — Medium Value
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-500" /> C — Low Value
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.section>
    </motion.div>
  );
}

export default ABCXYZAnalysis;
