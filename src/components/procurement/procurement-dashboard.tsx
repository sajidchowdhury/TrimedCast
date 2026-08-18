'use client';

// ============================================
// TrimedCast — Procurement & Supplier Management Dashboard
// Session 27: Main Orchestrating Dashboard
// ============================================

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Building2,
  FileText,
  Scale,
  ShieldAlert,
  AlertCircle,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import type {
  ProcurementTab,
  SupplierScorecard as SupplierScorecardType,
  ScorecardDimension,
  SupplierTier,
} from '@/components/procurement/types';
import {
  TIER_CONFIG,
  getScoreColor,
  getScoreLabel,
} from '@/components/procurement/types';
import { useProcurementStore } from '@/stores/procurement-store';

import { SupplierDirectory } from './supplier-directory';
import { RFQManagement } from './rfq-management';
import { CostComparison } from './cost-comparison';
import { RiskAssessment } from './risk-assessment';
import { POTracking } from './po-tracking';

// ─── Tab Value Mapping ────────────────────────────────────────────────
// The dashboard uses 5 tabs; we map them to the store's ProcurementTab.
// 'suppliers' is a new tab not in ProcurementTab; we handle it locally.

type DashboardTab = 'suppliers' | 'scorecard' | 'rfq' | 'cost-comparison' | 'risk';

function dashboardTabToStoreTab(tab: DashboardTab): ProcurementTab {
  switch (tab) {
    case 'suppliers':
      return 'scorecard'; // suppliers maps to scorecard in store
    case 'scorecard':
      return 'scorecard';
    case 'rfq':
      return 'rfq';
    case 'cost-comparison':
      return 'cost-comparison';
    case 'risk':
      return 'risk';
  }
}

// ─── Small SVG Gauge for Scorecard Grid ───────────────────────────────

function MiniScoreGauge({ score, size = 56 }: { score: number; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? '#10b981'
      : score >= 60
        ? '#0ea5e9'
        : score >= 40
          ? '#f59e0b'
          : '#f43f5e';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className={`absolute text-sm font-bold ${getScoreColor(score)}`}
      >
        {score}
      </span>
    </div>
  );
}

// ─── Dimension Mini Bar ───────────────────────────────────────────────

function DimensionMiniBar({
  label,
  dimension,
}: {
  label: string;
  dimension: ScorecardDimension;
}) {
  const barColor =
    dimension.score >= 80
      ? 'bg-emerald-500'
      : dimension.score >= 60
        ? 'bg-sky-500'
        : dimension.score >= 40
          ? 'bg-amber-500'
          : 'bg-rose-500';

  const TrendIcon =
    dimension.trend === 'up'
      ? TrendingUp
      : dimension.trend === 'down'
        ? TrendingDown
        : Minus;

  const trendColor =
    dimension.trend === 'up'
      ? 'text-emerald-500'
      : dimension.trend === 'down'
        ? 'text-rose-500'
        : 'text-muted-foreground';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground w-[90px] truncate">
        {label}
      </span>
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${dimension.score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-[11px] font-semibold w-6 text-right ${getScoreColor(dimension.score)}`}>
        {dimension.score}
      </span>
      <TrendIcon className={`size-3 ${trendColor} shrink-0`} />
    </div>
  );
}

// ─── Tier Badge for Grid ──────────────────────────────────────────────

function TierBadgeMini({ tier }: { tier: SupplierTier }) {
  const config = TIER_CONFIG[tier];
  return (
    <Badge
      variant="outline"
      className={`${config.bgColor} ${config.color} ${config.borderColor} text-[10px] px-1.5 py-0`}
    >
      {config.label}
    </Badge>
  );
}

// ─── Scorecard Grid Card ──────────────────────────────────────────────

function ScorecardGridCard({
  scorecard,
  supplierName,
  tier,
  index,
}: {
  scorecard: SupplierScorecardType;
  supplierName: string;
  tier: SupplierTier;
  index: number;
}) {
  const dimensionLabels: Record<string, string> = {
    onTimeDelivery: 'On-Time Delivery',
    quality: 'Quality',
    cost: 'Cost',
    responsiveness: 'Responsiveness',
    flexibility: 'Flexibility',
  };

  const dimensions = Object.entries(scorecard.dimensions) as [string, ScorecardDimension][];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="py-0 gap-0">
        <CardContent className="p-4 space-y-3">
          {/* Header: Name + Tier + Gauge */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold truncate">{supplierName}</h3>
              <div className="mt-1">
                <TierBadgeMini tier={tier} />
              </div>
            </div>
            <MiniScoreGauge score={scorecard.overallScore} />
          </div>

          <Separator />

          {/* Overall Score Label */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Overall</span>
            <span className={`text-xs font-semibold ${getScoreColor(scorecard.overallScore)}`}>
              {getScoreLabel(scorecard.overallScore)}
            </span>
          </div>

          {/* 5 Dimension Mini Bars */}
          <div className="space-y-2">
            {dimensions.map(([key, dim]) => (
              <DimensionMiniBar
                key={key}
                label={dimensionLabels[key] || key}
                dimension={dim}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Skeleton Loaders ─────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-9 w-full max-w-lg rounded-lg" />

      {/* Content skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────

export function ProcurementDashboard() {
  const {
    suppliers,
    scorecards,
    isLoading,
    error,
    activeTab,
    fetchAll,
    setActiveTab,
    clearError,
  } = useProcurementStore();

  const [currentTab, setCurrentTab] = useState<DashboardTab>('suppliers');
  const [errorDismissed, setErrorDismissed] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    const tab = value as DashboardTab;
    setCurrentTab(tab);
    setActiveTab(dashboardTabToStoreTab(tab));
  };

  // Build scorecard data with supplier lookup
  const scorecardsWithSuppliers = scorecards.map((sc) => {
    const supplier = suppliers.find((s) => s.id === sc.supplierId);
    return {
      scorecard: sc,
      supplierName: supplier?.name ?? 'Unknown Supplier',
      tier: supplier?.tier ?? 'approved' as SupplierTier,
    };
  });

  // Sort scorecards by overall score descending
  const sortedScorecards = [...scorecardsWithSuppliers].sort(
    (a, b) => b.scorecard.overallScore - a.scorecard.overallScore
  );

  const showError = error && !errorDismissed;

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Users className="size-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Procurement & Suppliers
          </h1>
          <p className="text-sm text-muted-foreground">
            ক্রয় ও সরবরাহকারী
          </p>
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showError && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
                  Failed to load procurement data
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                  {error}
                </p>
              </div>
              <button
                onClick={() => {
                  clearError();
                  setErrorDismissed(true);
                }}
                className="shrink-0 p-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                aria-label="Dismiss error"
              >
                <X className="size-4 text-rose-600" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading State ─────────────────────────────────────────── */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        /* ── Tabs ──────────────────────────────────────────────────── */
        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="suppliers" className="gap-1.5 text-xs">
              <Building2 className="size-3.5" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger value="scorecard" className="gap-1.5 text-xs">
              <Users className="size-3.5" />
              Scorecards
            </TabsTrigger>
            <TabsTrigger value="rfq" className="gap-1.5 text-xs">
              <FileText className="size-3.5" />
              RFQ
            </TabsTrigger>
            <TabsTrigger value="cost-comparison" className="gap-1.5 text-xs">
              <Scale className="size-3.5" />
              Cost Compare
            </TabsTrigger>
            <TabsTrigger value="risk" className="gap-1.5 text-xs">
              <ShieldAlert className="size-3.5" />
              Risk
            </TabsTrigger>
          </TabsList>

          {/* ── Suppliers Tab ──────────────────────────────────────── */}
          <TabsContent value="suppliers">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SupplierDirectory />
            </motion.div>
          </TabsContent>

          {/* ── Scorecards Tab ─────────────────────────────────────── */}
          <TabsContent value="scorecard">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Supplier Scorecards
                </h2>
                <p className="text-sm text-muted-foreground">
                  সরবরাহকারী স্কোরকার্ড
                </p>
              </div>

              {sortedScorecards.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="size-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No scorecard data available.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedScorecards.map((item, index) => (
                    <ScorecardGridCard
                      key={item.scorecard.supplierId}
                      scorecard={item.scorecard}
                      supplierName={item.supplierName}
                      tier={item.tier}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* ── RFQ Tab ────────────────────────────────────────────── */}
          <TabsContent value="rfq">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <RFQManagement />
            </motion.div>
          </TabsContent>

          {/* ── Cost Compare Tab ───────────────────────────────────── */}
          <TabsContent value="cost-comparison">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CostComparison />
            </motion.div>
          </TabsContent>

          {/* ── Risk Tab ───────────────────────────────────────────── */}
          <TabsContent value="risk">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <RiskAssessment />
              <Separator />
              <POTracking />
            </motion.div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
