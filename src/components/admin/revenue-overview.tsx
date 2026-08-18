'use client';

// ============================================
// TrimedCast — Revenue Overview
// Session 24: Multi-Tenant Admin Panel
// ============================================

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileCheck,
  FileClock,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type RevenueMetrics, formatBDT, PLAN_CONFIG } from './types';

interface RevenueOverviewProps {
  revenue: RevenueMetrics;
}

export function RevenueOverview({ revenue }: RevenueOverviewProps) {
  const metricCards = [
    {
      title: 'MRR',
      value: formatBDT(revenue.mrr),
      subtitle: '+5.2% MoM',
      icon: DollarSign,
      iconClass: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      title: 'ARR',
      value: formatBDT(revenue.arr),
      subtitle: 'Annual Run Rate',
      icon: TrendingUp,
      iconClass: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      title: 'Churn Rate',
      value: `${revenue.churnRate}%`,
      subtitle: 'Monthly churn',
      icon: TrendingDown,
      iconClass: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      title: 'Avg Revenue/Tenant',
      value: formatBDT(revenue.avgRevenuePerTenant),
      subtitle: 'Per active tenant',
      icon: Building2,
      iconClass: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400',
    },
    {
      title: 'Paid Invoices',
      value: String(revenue.thisMonth.paidInvoices),
      subtitle: 'This month',
      icon: FileCheck,
      iconClass: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      title: 'Pending Invoices',
      value: String(revenue.thisMonth.pendingInvoices),
      subtitle: 'Awaiting payment',
      icon: FileClock,
      iconClass: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    },
  ];

  const tierEntries = [
    { key: 'starter' as const, count: revenue.tierDistribution.starter },
    { key: 'professional' as const, count: revenue.tierDistribution.professional },
    { key: 'enterprise' as const, count: revenue.tierDistribution.enterprise },
  ];
  const maxTierCount = Math.max(...tierEntries.map((t) => t.count), 1);

  const tierBarColors: Record<string, string> = {
    starter: 'bg-slate-400 dark:bg-slate-500',
    professional: 'bg-emerald-500 dark:bg-emerald-400',
    enterprise: 'bg-violet-500 dark:bg-violet-400',
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards - 2 rows of 3 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="gap-3 py-4">
              <CardHeader className="pb-0 pt-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-1.5 rounded-md ${card.iconClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-0">
                <p className="text-xl font-bold tracking-tight">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tier Distribution */}
      <Card className="gap-3 py-4">
        <CardHeader className="pb-0 pt-0">
          <CardTitle className="text-sm font-semibold">Tier Distribution</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-0 space-y-3">
          {tierEntries.map(({ key, count }) => {
            const config = PLAN_CONFIG[key];
            const pct = Math.round((count / maxTierCount) * 100);
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {config.label}{' '}
                    <span className="text-muted-foreground font-normal">({config.labelBn})</span>
                  </span>
                  <span className="text-muted-foreground">
                    {count} tenant{count !== 1 ? 's' : ''} · {config.price}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${tierBarColors[key]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
