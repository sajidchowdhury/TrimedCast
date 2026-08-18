'use client';

// ============================================
// TrimedCast — Currency Exposure & FX Risk Management
// Session 26: Financial Analytics & Cost Intelligence Dashboard
// ============================================

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Wallet,
  CircleDollarSign,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  useFinanceStore,
  useCurrencyRisk,
} from '@/stores/finance-store';
import type { CurrencyExposure, RiskLevel } from '@/components/finance/types';
import {
  CURRENCY_CONFIG,
  RISK_CONFIG,
  formatBDT,
  formatPct,
  getRiskClasses,
} from '@/components/finance/types';

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

const summaryVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// ─── Helper: Risk Icon ───────────────────────────────────────────────

function RiskIcon({ risk }: { risk: RiskLevel }) {
  switch (risk) {
    case 'low':
      return <ShieldCheck className="h-3.5 w-3.5" />;
    case 'medium':
      return <AlertTriangle className="h-3.5 w-3.5" />;
    case 'high':
    case 'critical':
      return <ShieldAlert className="h-3.5 w-3.5" />;
  }
}

// ─── Helper: Worst Risk Level ────────────────────────────────────────

function getWorstRisk(risks: RiskLevel[]): RiskLevel {
  const order: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
  for (const level of order) {
    if (risks.includes(level)) return level;
  }
  return 'low';
}

// ─── Currency Card Component ─────────────────────────────────────────

function CurrencyCard({ data, index }: { data: CurrencyExposure; index: number }) {
  const config = CURRENCY_CONFIG[data.code];
  const riskCfg = RISK_CONFIG[data.risk];
  const riskClasses = getRiskClasses(data.risk);

  const totalExposure = data.hedgedAmount + data.unhedgedAmount;
  const hedgedPct = totalExposure > 0 ? (data.hedgedAmount / totalExposure) * 100 : 0;
  const unhedgedPct = totalExposure > 0 ? (data.unhedgedAmount / totalExposure) * 100 : 0;

  // For BDT, payables/receivables are already in BDT; for others, convert
  const payablesBdt = data.code === 'BDT' ? data.pendingPayables : data.pendingPayables * data.rate;
  const receivablesBdt = data.code === 'BDT' ? data.pendingReceivables : data.pendingReceivables * data.rate;

  const isHighRisk = data.risk === 'high' || data.risk === 'critical';
  const isCNYHigh = data.code === 'CNY' && data.risk === 'high';

  return (
    <motion.div variants={cardVariants} layout>
      <Card className="relative overflow-hidden border shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Risk indicator strip at top */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${
            data.risk === 'low'
              ? 'bg-emerald-500'
              : data.risk === 'medium'
              ? 'bg-amber-500'
              : data.risk === 'high'
              ? 'bg-orange-500'
              : 'bg-red-500'
          }`}
        />

        <CardHeader className="pb-3 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{config.flag}</span>
              <div>
                <CardTitle className="text-base font-bold">{data.code}</CardTitle>
                <p className="text-xs text-muted-foreground">{data.currencyBn}</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`${riskClasses.bg} ${riskClasses.text} ${riskClasses.border} text-xs gap-1 ${
                isHighRisk ? 'animate-pulse' : ''
              }`}
            >
              <RiskIcon risk={data.risk} />
              {riskCfg.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Exchange Rate */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowRightLeft className="h-3 w-3" />
            <span>
              1 {data.code} = {data.rate.toFixed(2)} BDT
            </span>
          </div>

          {/* Total Exposure in BDT */}
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Exposure (BDT)</p>
            <p className="text-lg font-bold tracking-tight">{formatBDT(data.exposureBdt)}</p>
          </div>

          {/* Hedged vs Unhedged Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Hedged {formatPct(hedgedPct)}
              </span>
              <span className="text-red-500 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                Unhedged {formatPct(unhedgedPct)}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
              <motion.div
                className="h-full bg-emerald-500 rounded-l-full"
                initial={{ width: 0 }}
                animate={{ width: `${hedgedPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 }}
              />
              <motion.div
                className="h-full bg-red-500 rounded-r-full"
                initial={{ width: 0 }}
                animate={{ width: `${unhedgedPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 }}
              />
            </div>
          </div>

          <Separator />

          {/* Payables & Receivables */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Payables
              </p>
              <p className="text-sm font-semibold">{formatBDT(Math.round(payablesBdt))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Receivables
              </p>
              <p className="text-sm font-semibold">{formatBDT(Math.round(receivablesBdt))}</p>
            </div>
          </div>

          {/* CNY Volatility Warning */}
          {isCNYHigh && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="rounded-md bg-orange-50 border border-orange-200 dark:bg-orange-950/30 dark:border-orange-800/50 p-2 flex items-start gap-2"
            >
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">CNY Volatility Warning</p>
                <p className="text-xs text-orange-600 dark:text-orange-500">
                  Yuan exposure is {formatPct(unhedgedPct)} unhedged with high exchange rate volatility. Consider forward contracts.
                </p>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function CurrencyExposurePanel() {
  const { currencies, fetchCurrencies, isLoading } = useFinanceStore();
  const currencyRiskSummary = useCurrencyRisk();

  useEffect(() => {
    if (currencies.length === 0) {
      fetchCurrencies();
    }
  }, [currencies.length, fetchCurrencies]);

  // Compute summary values
  const totalFxExposure = currencies.reduce((sum, c) => sum + c.exposureBdt, 0);
  const totalUnhedged = currencies.reduce(
    (sum, c) => sum + (c.code === 'BDT' ? c.unhedgedAmount : c.unhedgedAmount * c.rate),
    0
  );
  const allRisks = currencies.map((c) => c.risk);
  const worstRisk = getWorstRisk(allRisks);
  const worstRiskCfg = RISK_CONFIG[worstRisk];
  const worstRiskClasses = getRiskClasses(worstRisk);

  // Find the most unhedged non-BDT currency for hedging recommendation
  const nonBdtCurrencies = currencies.filter((c) => c.code !== 'BDT');
  const mostUnhedged = nonBdtCurrencies.reduce<CurrencyExposure | null>((worst, c) => {
    const pct = c.hedgedAmount + c.unhedgedAmount > 0
      ? (c.unhedgedAmount / (c.hedgedAmount + c.unhedgedAmount)) * 100
      : 0;
    if (!worst) return c;
    const worstPct = worst.hedgedAmount + worst.unhedgedAmount > 0
      ? (worst.unhedgedAmount / (worst.hedgedAmount + worst.unhedgedAmount)) * 100
      : 0;
    return pct > worstPct ? c : worst;
  }, null);

  const recUnhedgedPct =
    mostUnhedged && mostUnhedged.hedgedAmount + mostUnhedged.unhedgedAmount > 0
      ? ((mostUnhedged.unhedgedAmount / (mostUnhedged.hedgedAmount + mostUnhedged.unhedgedAmount)) * 100).toFixed(0)
      : '0';

  const hedgingRecommendation = mostUnhedged
    ? `Consider hedging ${mostUnhedged.code} exposure — ${recUnhedgedPct}% unhedged with ${
        mostUnhedged.risk === 'high' || mostUnhedged.risk === 'critical'
          ? 'high volatility'
          : mostUnhedged.risk === 'medium'
          ? 'moderate volatility'
          : 'low volatility'
      }`
    : 'All exposures adequately hedged';

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Currency Exposure
          </h2>
          <p className="text-sm text-muted-foreground">মুদ্রা ঝুঁকি</p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50">
          <ShieldAlert className="h-3.5 w-3.5" />
          FX Risk Monitor
        </Badge>
      </motion.div>

      {/* Loading State */}
      {isLoading && currencies.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-5 w-20 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-7 w-28 bg-muted rounded" />
                <div className="h-2.5 w-full bg-muted rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Currency Cards Grid */}
      {!isLoading && currencies.length > 0 && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {currencies.map((currency, idx) => (
            <CurrencyCard key={currency.code} data={currency} index={idx} />
          ))}
        </motion.div>
      )}

      {/* Summary Row */}
      {!isLoading && currencies.length > 0 && (
        <motion.div
          variants={summaryVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="border shadow-sm">
            <CardContent className="py-4 px-4 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total FX Exposure */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CircleDollarSign className="h-3.5 w-3.5" />
                    Total FX Exposure
                  </p>
                  <p className="text-lg font-bold tracking-tight">{formatBDT(totalFxExposure)}</p>
                </div>

                {/* Total Unhedged */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Total Unhedged
                  </p>
                  <p className="text-lg font-bold tracking-tight text-red-600 dark:text-red-400">
                    {formatBDT(Math.round(totalUnhedged))}
                  </p>
                </div>

                {/* Risk Level */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Overall Risk Level
                  </p>
                  <Badge
                    variant="outline"
                    className={`${worstRiskClasses.bg} ${worstRiskClasses.text} ${worstRiskClasses.border} text-sm gap-1 mt-0.5 ${
                      worstRisk === 'high' || worstRisk === 'critical' ? 'animate-pulse' : ''
                    }`}
                  >
                    <RiskIcon risk={worstRisk} />
                    {worstRiskCfg.label}
                  </Badge>
                </div>

                {/* Hedging Recommendation */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Hedging Recommendation
                  </p>
                  <p className="text-sm font-medium leading-snug">{hedgingRecommendation}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
