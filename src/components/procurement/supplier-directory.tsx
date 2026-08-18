'use client';

// ============================================
// TrimedCast — Supplier Directory
// Session 27: Supplier Scorecard & Procurement Dashboard
// ============================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Building2,
  AlertTriangle,
  TrendingUp,
  Star,
  StarOff,
  ChevronRight,
  Users,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import type {
  Supplier,
  SupplierTier,
  SupplierRisk,
} from '@/components/procurement/types';
import {
  TIER_CONFIG,
  RISK_LEVEL_CONFIG,
  SUPPLIER_STATUS_CONFIG,
  COUNTRY_FLAGS,
  formatBDT,
  getScoreColor,
} from '@/components/procurement/types';
import { useProcurementStore } from '@/stores/procurement-store';
import { SupplierScorecard } from './supplier-scorecard';

// ─── Animation Variants ──────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const summaryVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.08, duration: 0.3 },
  }),
};

// ─── Mini Progress Bar ───────────────────────────────────────────────

function MiniProgress({ value, label }: { value: number; label: string }) {
  const barColor =
    value >= 80
      ? 'bg-emerald-500'
      : value >= 60
        ? 'bg-sky-500'
        : value >= 40
          ? 'bg-amber-500'
          : 'bg-rose-500';

  return (
    <div className="flex flex-col gap-0.5 min-w-[60px]">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-[11px] font-semibold ${getScoreColor(value)}`}>
        {value}%
      </span>
    </div>
  );
}

// ─── Star Rating ─────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) =>
        i < rating ? (
          <Star
            key={i}
            className="size-3 fill-amber-400 text-amber-400"
          />
        ) : (
          <StarOff
            key={i}
            className="size-3 text-muted-foreground/40"
          />
        )
      )}
    </div>
  );
}

// ─── Status Dot ──────────────────────────────────────────────────────

function StatusDot({ status }: { status: Supplier['status'] }) {
  const dotColor =
    status === 'active'
      ? 'bg-emerald-500'
      : status === 'under-review'
        ? 'bg-amber-500'
        : status === 'suspended'
          ? 'bg-rose-500'
          : 'bg-sky-500';

  const config = SUPPLIER_STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block size-2 rounded-full ${dotColor}`} />
      <span className="text-[11px] text-muted-foreground">{config.label}</span>
    </div>
  );
}

// ─── Tier Badge ──────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: SupplierTier }) {
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

// ─── Risk Badge ──────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: SupplierRisk }) {
  const config = RISK_LEVEL_CONFIG[risk];
  return (
    <Badge
      variant="outline"
      className={`${config.bgColor} ${config.color} ${config.borderColor} text-[10px] px-1.5 py-0`}
    >
      {config.label}
    </Badge>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function SupplierDirectory() {
  const {
    suppliers,
    scorecards,
    searchQuery,
    tierFilter,
    riskFilter,
    countryFilter,
    setSearchQuery,
    setTierFilter,
    setRiskFilter,
    setCountryFilter,
    filteredSuppliers,
    strategicSuppliers,
    highRiskSuppliers,
  } = useProcurementStore();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  const filtered = filteredSuppliers();
  const strategicCount = strategicSuppliers().length;
  const highRiskCount = highRiskSuppliers().length;
  const totalSpend = suppliers.reduce((sum, s) => sum + s.annualSpend, 0);

  const selectedSupplier = selectedSupplierId
    ? suppliers.find((s) => s.id === selectedSupplierId) ?? null
    : null;

  const selectedScorecard = selectedSupplierId
    ? scorecards.find((sc) => sc.supplierId === selectedSupplierId) ?? null
    : null;

  // Summary cards data
  const summaryCards = [
    {
      title: 'Total Suppliers',
      titleBn: 'মোট সরবরাহকারী',
      value: suppliers.length,
      icon: Building2,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      title: 'Strategic Tier',
      titleBn: 'কৌশলগত স্তর',
      value: strategicCount,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'High Risk',
      titleBn: 'উচ্চ ঝুঁকি',
      value: highRiskCount,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
    {
      title: 'Total Annual Spend',
      titleBn: 'মোট বার্ষিক ব্যয়',
      value: formatBDT(totalSpend),
      icon: Users,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  // Country options from data
  const countryOptions = (() => {
    const codes = [...new Set(suppliers.map((s) => s.countryCode))];
    const names: Record<string, string> = {};
    suppliers.forEach((s) => {
      names[s.countryCode] = s.country;
    });
    return codes.map((code) => ({ code, name: names[code] }));
  })();

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Supplier Directory</h2>
          <p className="text-sm text-muted-foreground">সরবরাহকারী ডিরেক্টরি</p>
        </div>
        {selectedSupplier && (
          <button
            onClick={() => setSelectedSupplierId(null)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Directory
          </button>
        )}
      </div>

      {/* ── Scorecard Detail (if selected) ────────────────────────── */}
      <AnimatePresence mode="wait">
        {selectedSupplier && selectedScorecard ? (
          <motion.div
            key="scorecard"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <SupplierScorecard
              supplier={selectedSupplier}
              scorecard={selectedScorecard}
              onClose={() => setSelectedSupplierId(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="directory"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* ── Summary Cards ────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {summaryCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    custom={i}
                    variants={summaryVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Card className="py-3 gap-3">
                      <CardContent className="px-4 py-0">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${card.bgColor}`}>
                            <Icon className={`size-4 ${card.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground truncate">
                              {card.title}
                            </p>
                            <p className="text-lg font-bold truncate">
                              {card.value}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* ── Filters Row ──────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={tierFilter}
                onValueChange={(v) => setTierFilter(v as SupplierTier | 'all')}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="strategic">Strategic</SelectItem>
                  <SelectItem value="preferred">Preferred</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="probationary">Probationary</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={riskFilter}
                onValueChange={(v) => setRiskFilter(v as SupplierRisk | 'all')}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={countryFilter}
                onValueChange={(v) => setCountryFilter(v)}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countryOptions.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {COUNTRY_FLAGS[c.code] || ''} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Supplier Cards Grid ──────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((supplier, i) => {
                  const flag = COUNTRY_FLAGS[supplier.countryCode] || '';
                  return (
                    <motion.div
                      key={supplier.id}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                    >
                      <Card
                        className="cursor-pointer hover:shadow-md transition-shadow py-0 gap-0"
                        onClick={() => setSelectedSupplierId(supplier.id)}
                      >
                        <CardHeader className="px-4 pt-4 pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-lg">{flag}</span>
                                <CardTitle className="text-sm font-semibold truncate">
                                  {supplier.name}
                                </CardTitle>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {supplier.nameBn}
                              </p>
                            </div>
                            <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-1" />
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-0">
                          {/* Location */}
                          <p className="text-xs text-muted-foreground mb-2">
                            {supplier.city}, {supplier.country}
                          </p>

                          {/* Tier + Status + Rating row */}
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <TierBadge tier={supplier.tier} />
                            <StatusDot status={supplier.status} />
                            <div className="ml-auto">
                              <StarRating rating={supplier.rating} />
                            </div>
                          </div>

                          <Separator className="mb-3" />

                          {/* Key metrics */}
                          <div className="flex items-end justify-between gap-2 mb-3">
                            <MiniProgress value={supplier.onTimeDeliveryRate} label="On-Time %" />
                            <MiniProgress value={supplier.qualityScore} label="Quality" />
                            <MiniProgress value={supplier.costCompetitiveness} label="Cost" />
                          </div>

                          <Separator className="mb-3" />

                          {/* Bottom row: spend, risk, last order */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Annual Spend</p>
                              <p className="text-sm font-semibold">
                                {formatBDT(supplier.annualSpend)}
                              </p>
                            </div>
                            <RiskBadge risk={supplier.riskLevel} />
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground">Last Order</p>
                              <p className="text-[11px] font-medium">
                                {new Date(supplier.lastOrderDate).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* ── Empty State ──────────────────────────────────────── */}
            {filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground"
              >
                <Building2 className="size-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No suppliers match the current filters.</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
