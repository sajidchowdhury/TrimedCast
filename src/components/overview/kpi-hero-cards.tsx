'use client';

// ============================================
// TrimedCast — KPI Hero Cards
// Session 20: Control Tower Dashboard
// ============================================

import { motion } from 'framer-motion';
import {
  Wallet,
  Activity,
  Clock,
  Target,
  TrendingUp,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { DashboardKPIs } from './types';

interface KPIHeroCardsProps {
  kpis: DashboardKPIs;
}

function formatBDT(value: number): string {
  if (value >= 10000000) {
    return `৳${(value / 10000000).toFixed(2)} Cr`;
  }
  if (value >= 100000) {
    return `৳${(value / 100000).toFixed(1)} L`;
  }
  return `৳${value.toLocaleString()}`;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
  }),
};

export function KPIHeroCards({ kpis }: KPIHeroCardsProps) {
  const healthyCount = kpis.total_skus - kpis.stockout_risk_count - kpis.overstock_count;
  const healthPct = ((healthyCount / kpis.total_skus) * 100).toFixed(1);

  const cards = [
    {
      title: 'Inventory Value',
      value: formatBDT(kpis.total_stock_value_bdt),
      icon: Wallet,
      accentColor: 'emerald',
      subMetrics: [
        { label: 'SKUs', value: kpis.total_skus.toString() },
        { label: 'Trend', value: '+4.2% MoM', positive: true },
      ],
    },
    {
      title: 'Stock Health',
      value: `${healthPct}%`,
      icon: Activity,
      accentColor: kpis.stockout_risk_count > 5 ? 'amber' : 'emerald',
      subMetrics: [
        { label: 'At Risk', value: kpis.stockout_risk_count.toString(), positive: false },
        { label: 'Overstock', value: kpis.overstock_count.toString(), positive: false },
      ],
      custom: (
        <div className="flex items-center gap-2 mt-1">
          <div className="relative w-10 h-10">
            <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted/30"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${(healthyCount / kpis.total_skus) * 97.4} 97.4`}
                className="text-emerald-500"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="text-emerald-600 font-medium">{healthyCount}</span> healthy
          </div>
        </div>
      ),
    },
    {
      title: 'Pending Orders',
      value: (kpis.pending_purchase_orders + kpis.pending_sales_orders).toString(),
      icon: Clock,
      accentColor: 'violet',
      subMetrics: [
        { label: 'POs', value: kpis.pending_purchase_orders.toString() },
        { label: 'SOs', value: kpis.pending_sales_orders.toString() },
      ],
    },
    {
      title: 'Forecast Accuracy',
      value: kpis.forecast_accuracy_pct !== null ? `${kpis.forecast_accuracy_pct}%` : 'N/A',
      icon: Target,
      accentColor: kpis.forecast_accuracy_pct !== null && kpis.forecast_accuracy_pct >= 80 ? 'emerald' : 'amber',
      subMetrics: [
        { label: 'MAPE', value: kpis.avg_mape !== null ? `${kpis.avg_mape}%` : 'N/A' },
        { label: 'Rating', value: kpis.forecast_accuracy_pct !== null && kpis.forecast_accuracy_pct >= 85 ? 'Good' : 'Fair', positive: kpis.forecast_accuracy_pct !== null && kpis.forecast_accuracy_pct >= 85 },
      ],
    },
  ];

  const accentMap: Record<string, string> = {
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    violet: 'border-l-violet-500',
    sky: 'border-l-sky-500',
    rose: 'border-l-rose-500',
  };

  const iconBgMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-600',
    violet: 'bg-violet-500/10 text-violet-600',
    sky: 'bg-sky-500/10 text-sky-600',
    rose: 'bg-rose-500/10 text-rose-600',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card
              className={`border-l-4 ${accentMap[card.accentColor]} p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-default`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${iconBgMap[card.accentColor]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {i === 0 && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    +4.2%
                  </span>
                )}
                {i === 1 && kpis.stockout_risk_count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-3 w-3" />
                    {kpis.stockout_risk_count} risk
                  </span>
                )}
                {i === 3 && kpis.avg_mape !== null && kpis.avg_mape > 10 && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <Package className="h-3 w-3" />
                    Recalibrate
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
              </div>

              {card.custom && <div className="mt-2">{card.custom}</div>}

              <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                {card.subMetrics.map((sm) => (
                  <div key={sm.label} className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{sm.label}:</span>
                    <span
                      className={`text-xs font-semibold ${
                        sm.positive === true
                          ? 'text-emerald-600'
                          : sm.positive === false
                          ? 'text-amber-600'
                          : 'text-foreground'
                      }`}
                    >
                      {sm.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
