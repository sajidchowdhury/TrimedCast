'use client';

// ============================================
// TrimedCast — Supplier Scorecard Detail Panel
// Session 27: Supplier Scorecard & Procurement Dashboard
// ============================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Mail,
  Phone,
  Clock,
  DollarSign,
  Calendar,
  Package,
  CreditCard,
  Globe,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import type {
  Supplier,
  SupplierScorecard,
  ScorecardDimension,
  ScoreTrend,
} from '@/components/procurement/types';
import {
  TIER_CONFIG,
  COUNTRY_FLAGS,
  formatBDT,
  getScoreColor,
  getScoreLabel,
} from '@/components/procurement/types';

// ─── Props ───────────────────────────────────────────────────────────

interface SupplierScorecardProps {
  supplier: Supplier;
  scorecard: SupplierScorecard;
  onClose?: () => void;
}

// ─── Circular SVG Gauge ──────────────────────────────────────────────

function ScoreGauge({ score, size = 140 }: { score: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? '#10b981' // emerald-500
      : score >= 60
        ? '#0ea5e9' // sky-500
        : score >= 40
          ? '#f59e0b' // amber-500
          : '#f43f5e'; // rose-500

  const labelColor =
    score >= 80
      ? 'text-emerald-600'
      : score >= 60
        ? 'text-sky-600'
        : score >= 40
          ? 'text-amber-600'
          : 'text-rose-600';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Score arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      {/* Center text overlaid */}
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <motion.span
          className={`text-3xl font-bold ${labelColor}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-muted-foreground">{getScoreLabel(score)}</span>
      </div>
    </div>
  );
}

// ─── Dimension Bar ───────────────────────────────────────────────────

function DimensionBar({
  label,
  dimension,
  index,
}: {
  label: string;
  dimension: ScorecardDimension;
  index: number;
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
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${getScoreColor(dimension.score)}`}>
            {dimension.score}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {dimension.weight}%
          </Badge>
          <TrendIcon className={`size-3.5 ${trendColor}`} />
        </div>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${dimension.score}%` }}
          transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

// ─── Info Item ───────────────────────────────────────────────────────

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function SupplierScorecard({ supplier, scorecard, onClose }: SupplierScorecardProps) {
  const flag = COUNTRY_FLAGS[supplier.countryCode] || '';
  const tierConfig = TIER_CONFIG[supplier.tier];

  const dimensionLabels: Record<string, string> = {
    onTimeDelivery: 'On-Time Delivery',
    quality: 'Quality',
    cost: 'Cost Competitiveness',
    responsiveness: 'Responsiveness',
    flexibility: 'Flexibility',
  };

  const dimensions = useMemo(
    () => Object.entries(scorecard.dimensions) as [string, ScorecardDimension][],
    [scorecard]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="gap-0 py-0 overflow-hidden">
        {/* ── Header ──────────────────────────────────────────────── */}
        <CardHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{flag}</span>
              <div>
                <CardTitle className="text-xl">{supplier.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{supplier.nameBn}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${tierConfig.bgColor} ${tierConfig.color} ${tierConfig.borderColor}`}
              >
                {tierConfig.label}
              </Badge>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                  aria-label="Close"
                >
                  <X className="size-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-4 space-y-6">
          {/* ── Overall Score Gauge ────────────────────────────────── */}
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Overall Score
            </h3>
            <div className="relative">
              <ScoreGauge score={scorecard.overallScore} size={140} />
            </div>
          </div>

          <Separator />

          {/* ── 5 Dimension Bars ───────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Score Dimensions
            </h3>
            {dimensions.map(([key, dim], i) => (
              <DimensionBar
                key={key}
                label={dimensionLabels[key] || key}
                dimension={dim}
                index={i}
              />
            ))}
          </div>

          <Separator />

          {/* ── Strengths & Improvements ───────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="size-4" />
                Strengths
              </h3>
              <ul className="space-y-1.5">
                {scorecard.strengths.map((s, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <CheckCircle2 className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="size-4" />
                Improvements
              </h3>
              <ul className="space-y-1.5">
                {scorecard.improvements.map((s, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <AlertCircle className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          <Separator />

          {/* ── Key Info ───────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Key Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoItem icon={Package} label="Contact" value={supplier.contactName} />
              <InfoItem icon={Mail} label="Email" value={supplier.contactEmail} />
              <InfoItem icon={Phone} label="Phone" value={supplier.phone} />
              <InfoItem icon={Package} label="MOQ" value={`${supplier.moq} units`} />
              <InfoItem icon={Clock} label="Lead Time" value={`${supplier.leadTimeDays} days`} />
              <InfoItem
                icon={CreditCard}
                label="Payment Terms"
                value={`Net ${supplier.paymentTermsDays}`}
              />
              <InfoItem icon={DollarSign} label="Currency" value={supplier.currency} />
              <InfoItem
                icon={Calendar}
                label="Year Est."
                value={supplier.yearEstablished}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
