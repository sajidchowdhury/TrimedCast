'use client';

// ============================================
// TrimedCast — Supplier Risk Assessment Component
// Session 27: Supplier Risk Assessment & Mitigation
// ============================================

import { useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useProcurementStore } from '@/stores/procurement-store';
import type {
  SupplierRisk,
  SupplierRiskAssessment,
  RiskFactor,
  MitigationAction,
  MitigationPriority,
  MitigationStatus,
} from '@/components/procurement/types';
import {
  RISK_LEVEL_CONFIG,
  COUNTRY_FLAGS,
} from '@/components/procurement/types';

// ─── Animation Variants ─────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: 'easeOut' } },
};

// ─── Severity Ordering ─────────────────────────────────────────────

const SEVERITY_ORDER: Record<SupplierRisk, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ─── Risk Color Helpers ────────────────────────────────────────────

function riskDotColor(severity: SupplierRisk): string {
  switch (severity) {
    case 'low':
      return 'bg-emerald-500';
    case 'medium':
      return 'bg-amber-500';
    case 'high':
      return 'bg-red-500';
    case 'critical':
      return 'bg-red-600';
  }
}

function riskDotPulse(severity: SupplierRisk): string {
  return severity === 'critical' ? 'animate-pulse' : '';
}

function riskBorderColor(risk: SupplierRisk): string {
  switch (risk) {
    case 'low':
      return 'border-l-emerald-500';
    case 'medium':
      return 'border-l-amber-500';
    case 'high':
      return 'border-l-orange-500';
    case 'critical':
      return 'border-l-rose-500';
  }
}

function riskCardAccent(risk: SupplierRisk): string {
  switch (risk) {
    case 'low':
      return 'from-emerald-50 to-white dark:from-emerald-950/20 dark:to-transparent';
    case 'medium':
      return 'from-amber-50 to-white dark:from-amber-950/20 dark:to-transparent';
    case 'high':
      return 'from-orange-50 to-white dark:from-orange-950/20 dark:to-transparent';
    case 'critical':
      return 'from-rose-50 to-white dark:from-rose-950/20 dark:to-transparent';
  }
}

function riskBadgeClasses(risk: SupplierRisk): string {
  switch (risk) {
    case 'low':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700';
    case 'medium':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700';
    case 'critical':
      return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700';
  }
}

function priorityBadgeClasses(priority: MitigationPriority): string {
  switch (priority) {
    case 'low':
      return 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700';
    case 'medium':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700';
    case 'high':
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700';
    case 'critical':
      return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700';
  }
}

function statusBadgeClasses(status: MitigationStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700';
    case 'in-progress':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700';
  }
}

function statusLabel(status: MitigationStatus): string {
  switch (status) {
    case 'pending':
      return 'Not Started';
    case 'in-progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
  }
}

function statusIcon(status: MitigationStatus) {
  switch (status) {
    case 'pending':
      return <XCircle className="h-3 w-3" />;
    case 'in-progress':
      return <Clock className="h-3 w-3" />;
    case 'completed':
      return <CheckCircle className="h-3 w-3" />;
  }
}

function riskShieldIcon(risk: SupplierRisk) {
  switch (risk) {
    case 'low':
      return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
    case 'medium':
      return <Shield className="h-4 w-4 text-amber-600" />;
    case 'high':
      return <ShieldAlert className="h-4 w-4 text-orange-600" />;
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-rose-600" />;
  }
}

// ─── Summary Card Component ────────────────────────────────────────

function SummaryCard({
  label,
  labelBn,
  count,
  risk,
}: {
  label: string;
  labelBn: string;
  count: number;
  risk: SupplierRisk;
}) {
  const config = RISK_LEVEL_CONFIG[risk];
  return (
    <motion.div variants={itemVariants}>
      <Card className={`border-l-4 ${riskBorderColor(risk)} overflow-hidden`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="text-xs text-muted-foreground/70">{labelBn}</p>
            </div>
            {riskShieldIcon(risk)}
          </div>
          <p className={`mt-2 text-3xl font-bold ${config.color}`}>{count}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Risk Factor Row ───────────────────────────────────────────────

function RiskFactorRow({ factor }: { factor: RiskFactor }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-1.5 flex-shrink-0">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${riskDotColor(factor.severity)} ${riskDotPulse(factor.severity)}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium">{factor.name}</span>
          <span className="text-xs text-muted-foreground">{factor.nameBn}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
          {factor.description}
        </p>
      </div>
    </div>
  );
}

// ─── Mitigation Action Row ─────────────────────────────────────────

function MitigationActionRow({ action }: { action: MitigationAction }) {
  const completed = action.status === 'completed' ? 1 : 0;
  return (
    <div className="flex items-start gap-2 py-2">
      <div className="mt-0.5 flex-shrink-0">{statusIcon(action.status)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm">{action.action}</span>
        </div>
        <p className="text-xs text-muted-foreground">{action.actionBn}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${priorityBadgeClasses(action.priority)}`}
          >
            {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)} Priority
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${statusBadgeClasses(action.status)}`}
          >
            {statusLabel(action.status)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ─── Risk Assessment Card ──────────────────────────────────────────

function RiskAssessmentCard({
  assessment,
  countryCode,
  index,
}: {
  assessment: SupplierRiskAssessment;
  countryCode: string;
  index: number;
}) {
  const { overallRisk, factors, mitigationActions, lastAssessed, supplierName } = assessment;
  const config = RISK_LEVEL_CONFIG[overallRisk];
  const flag = COUNTRY_FLAGS[countryCode] ?? '';

  // Sort factors by severity descending
  const sortedFactors = useMemo(
    () => [...factors].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [factors],
  );

  // Mitigation progress
  const completedCount = mitigationActions.filter((a) => a.status === 'completed').length;
  const totalCount = mitigationActions.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Format date
  const formattedDate = new Date(lastAssessed).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div variants={cardVariants}>
      <Card
        className={`border-l-4 ${riskBorderColor(overallRisk)} overflow-hidden bg-gradient-to-br ${riskCardAccent(overallRisk)}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl" role="img" aria-label={countryCode}>
                {flag}
              </span>
              <CardTitle className="text-base font-semibold leading-tight">
                {supplierName}
              </CardTitle>
            </div>
            <Badge
              className={`text-xs font-semibold px-3 py-1 border ${riskBadgeClasses(overallRisk)}`}
            >
              {config.label} Risk
              <span className="ml-1 text-[10px] opacity-70">({config.labelBn})</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── Risk Factors ──────────────────────────────────── */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Risk Factors
            </h4>
            <ScrollArea className="max-h-48">
              <div className="space-y-0.5">
                {sortedFactors.map((factor, i) => (
                  <RiskFactorRow key={i} factor={factor} />
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* ── Mitigation Actions ────────────────────────────── */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mitigation Actions
              </h4>
              <span className="text-xs text-muted-foreground">
                {completedCount}/{totalCount} completed
              </span>
            </div>
            <Progress
              value={progressPct}
              className={`h-1.5 mb-3 ${
                overallRisk === 'critical'
                  ? '[&>[data-slot=progress-indicator]]:bg-rose-500'
                  : overallRisk === 'high'
                    ? '[&>[data-slot=progress-indicator]]:bg-orange-500'
                    : overallRisk === 'medium'
                      ? '[&>[data-slot=progress-indicator]]:bg-amber-500'
                      : '[&>[data-slot=progress-indicator]]:bg-emerald-500'
              }`}
            />
            <ScrollArea className="max-h-48">
              <div className="space-y-0.5">
                {mitigationActions.map((action, i) => (
                  <MitigationActionRow key={i} action={action} />
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* ── Last Assessed ─────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Last Assessed</span>
            <span className="text-xs font-medium">{formattedDate}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Risk Matrix ───────────────────────────────────────────────────

function RiskMatrix({ assessments }: { assessments: SupplierRiskAssessment[] }) {
  // Map each assessment to a quadrant
  // Likelihood: high/critical → High, low/medium → Low
  // Impact: high/critical → High, low/medium → Low
  type Quadrant = 'low-low' | 'low-high' | 'high-low' | 'high-high';

  function getQuadrant(risk: SupplierRisk): Quadrant {
    const isHighLikelihood = risk === 'high' || risk === 'critical';
    const isHighImpact = risk === 'high' || risk === 'critical';
    if (isHighImpact && isHighLikelihood) return 'high-high';
    if (isHighImpact && !isHighLikelihood) return 'high-low';
    if (!isHighImpact && isHighLikelihood) return 'low-high';
    return 'low-low';
  }

  const quadrants: Record<Quadrant, SupplierRiskAssessment[]> = {
    'low-low': [],
    'low-high': [],
    'high-low': [],
    'high-high': [],
  };

  assessments.forEach((a) => {
    quadrants[getQuadrant(a.overallRisk)].push(a);
  });

  const quadrantStyles: Record<Quadrant, string> = {
    'low-low': 'bg-emerald-50 dark:bg-emerald-950/20',
    'low-high': 'bg-amber-50 dark:bg-amber-950/20',
    'high-low': 'bg-amber-50 dark:bg-amber-950/20',
    'high-high': 'bg-rose-50 dark:bg-rose-950/20',
  };

  const dotColor: Record<Quadrant, string> = {
    'low-low': 'bg-emerald-500',
    'low-high': 'bg-amber-500',
    'high-low': 'bg-amber-500',
    'high-high': 'bg-rose-500',
  };

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Risk Matrix
            <span className="text-xs font-normal text-muted-foreground">
              / ঝুঁকি ম্যাট্রিক্স
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex">
            {/* Y-axis label */}
            <div className="flex flex-col items-center justify-center pr-2">
              <span className="text-[10px] font-medium text-muted-foreground -rotate-90 whitespace-nowrap tracking-wider uppercase">
                Impact
              </span>
            </div>

            <div className="flex-1">
              {/* Grid */}
              <div className="grid grid-cols-2 gap-1">
                {/* Top row: High Impact */}
                <div
                  className={`relative rounded-md p-3 min-h-[80px] ${quadrantStyles['high-low']} border border-border/50`}
                >
                  <span className="absolute top-1 left-1.5 text-[9px] text-muted-foreground">
                    High / Low
                  </span>
                  <div className="mt-4 flex flex-wrap gap-1.5 justify-center items-center">
                    {quadrants['high-low'].map((a) => (
                      <span
                        key={a.supplierId}
                        className={`inline-block h-3 w-3 rounded-full ${dotColor['high-low']} ring-2 ring-white dark:ring-gray-900`}
                        title={a.supplierName}
                      />
                    ))}
                  </div>
                </div>
                <div
                  className={`relative rounded-md p-3 min-h-[80px] ${quadrantStyles['high-high']} border border-border/50`}
                >
                  <span className="absolute top-1 left-1.5 text-[9px] text-muted-foreground">
                    High / High
                  </span>
                  <div className="mt-4 flex flex-wrap gap-1.5 justify-center items-center">
                    {quadrants['high-high'].map((a) => (
                      <span
                        key={a.supplierId}
                        className={`inline-block h-3 w-3 rounded-full ${dotColor['high-high']} ring-2 ring-white dark:ring-gray-900 animate-pulse`}
                        title={a.supplierName}
                      />
                    ))}
                  </div>
                </div>

                {/* Bottom row: Low Impact */}
                <div
                  className={`relative rounded-md p-3 min-h-[80px] ${quadrantStyles['low-low']} border border-border/50`}
                >
                  <span className="absolute top-1 left-1.5 text-[9px] text-muted-foreground">
                    Low / Low
                  </span>
                  <div className="mt-4 flex flex-wrap gap-1.5 justify-center items-center">
                    {quadrants['low-low'].map((a) => (
                      <span
                        key={a.supplierId}
                        className={`inline-block h-3 w-3 rounded-full ${dotColor['low-low']} ring-2 ring-white dark:ring-gray-900`}
                        title={a.supplierName}
                      />
                    ))}
                  </div>
                </div>
                <div
                  className={`relative rounded-md p-3 min-h-[80px] ${quadrantStyles['low-high']} border border-border/50`}
                >
                  <span className="absolute top-1 left-1.5 text-[9px] text-muted-foreground">
                    Low / High
                  </span>
                  <div className="mt-4 flex flex-wrap gap-1.5 justify-center items-center">
                    {quadrants['low-high'].map((a) => (
                      <span
                        key={a.supplierId}
                        className={`inline-block h-3 w-3 rounded-full ${dotColor['low-high']} ring-2 ring-white dark:ring-gray-900`}
                        title={a.supplierName}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* X-axis label */}
              <div className="mt-2 text-center">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Likelihood →
                </span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {assessments.map((a) => (
              <div key={a.supplierId} className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    a.overallRisk === 'critical' || a.overallRisk === 'high'
                      ? 'bg-rose-500'
                      : a.overallRisk === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                />
                <span className="truncate max-w-[140px]">{a.supplierName}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function RiskAssessment() {
  const riskAssessments = useProcurementStore((s) => s.riskAssessments);
  const suppliers = useProcurementStore((s) => s.suppliers);

  // Build a lookup from supplierId → countryCode
  const supplierCountryMap = useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach((s) => map.set(s.id, s.countryCode));
    return map;
  }, [suppliers]);

  // Risk level counts
  const riskCounts = useMemo(() => {
    const counts: Record<SupplierRisk, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    riskAssessments.forEach((a) => {
      counts[a.overallRisk]++;
    });
    return counts;
  }, [riskAssessments]);

  // Check if any critical or high risk
  const hasCriticalOrHigh = riskCounts.critical > 0 || riskCounts.high > 0;

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Supplier Risk Assessment</h2>
          <p className="text-sm text-muted-foreground">সরবরাহকারী ঝুঁকি মূল্যায়ন</p>
        </div>
        <Badge
          className={`text-xs font-semibold px-3 py-1 ${
            hasCriticalOrHigh
              ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700'
              : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
          } ${hasCriticalOrHigh ? 'animate-pulse' : ''}`}
        >
          <AlertTriangle className="mr-1 h-3 w-3" />
          Risk Monitor
        </Badge>
      </motion.div>

      {/* ── Summary Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Low Risk"
          labelBn="নিম্ন ঝুঁকি"
          count={riskCounts.low}
          risk="low"
        />
        <SummaryCard
          label="Medium Risk"
          labelBn="মধ্যম ঝুঁকি"
          count={riskCounts.medium}
          risk="medium"
        />
        <SummaryCard
          label="High Risk"
          labelBn="উচ্চ ঝুঁকি"
          count={riskCounts.high}
          risk="high"
        />
        <SummaryCard
          label="Critical Risk"
          labelBn="সংকটাপন্ন ঝুঁকি"
          count={riskCounts.critical}
          risk="critical"
        />
      </div>

      {/* ── Risk Assessment Cards ───────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {riskAssessments.map((assessment, index) => (
          <RiskAssessmentCard
            key={assessment.supplierId}
            assessment={assessment}
            countryCode={supplierCountryMap.get(assessment.supplierId) ?? ''}
            index={index}
          />
        ))}
      </div>

      {/* ── Risk Matrix ─────────────────────────────────────────── */}
      <RiskMatrix assessments={riskAssessments} />
    </motion.div>
  );
}

export default RiskAssessment;
