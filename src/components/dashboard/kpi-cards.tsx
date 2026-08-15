'use client';

// ============================================
// KPI Cards — Dashboard key performance indicators
// Total SKUs, Stock Value, Stockout Risks, Overstock, Pending Orders, Forecast Accuracy
// ============================================

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  DollarSign,
  AlertTriangle,
  ArrowDownCircle,
  ShoppingCart,
  TrendingUp,
  Target,
  BarChart3,
} from 'lucide-react';
import { type DashboardKpis } from '@/lib/dashboard/store';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; label: string };
  variant?: 'default' | 'warning' | 'danger' | 'success';
  subtitle?: string;
}

function KpiCard({ title, value, icon: Icon, trend, variant = 'default', subtitle }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'relative overflow-hidden transition-shadow hover:shadow-md',
        variant === 'danger' && 'border-red-200 dark:border-red-900/50',
        variant === 'warning' && 'border-amber-200 dark:border-amber-900/50',
        variant === 'success' && 'border-emerald-200 dark:border-emerald-900/50',
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              variant === 'default' && 'bg-primary/10 text-primary',
              variant === 'success' && 'bg-emerald-500/10 text-emerald-600',
              variant === 'warning' && 'bg-amber-500/10 text-amber-600',
              variant === 'danger' && 'bg-red-500/10 text-red-600',
            )}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <Badge
                variant={trend.value >= 0 ? 'default' : 'destructive'}
                className="text-[10px] px-1 h-4"
              >
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </Badge>
              <span className="text-[10px] text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface KpiCardsProps {
  kpis: DashboardKpis;
  isLoading?: boolean;
}

export function KpiCards({ kpis, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-16 mb-1" />
              <div className="h-3 bg-muted rounded w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatBDT = (val: number) => {
    if (val >= 1_00_00_000) return `৳${(val / 1_00_00_000).toFixed(1)}L`;
    if (val >= 1_00_000) return `৳${(val / 1_00_000).toFixed(1)}K`;
    return `৳${val.toLocaleString('en-BD')}`;
  };

  const cards: KpiCardProps[] = [
    {
      title: 'Total SKUs',
      value: kpis.total_skus.toLocaleString(),
      icon: Package,
      variant: 'default',
      subtitle: 'Active products',
    },
    {
      title: 'Stock Value',
      value: formatBDT(kpis.total_stock_value_bdt),
      icon: DollarSign,
      variant: 'success',
      subtitle: 'Total inventory BDT',
    },
    {
      title: 'Stockout Risk',
      value: kpis.stockout_risk_count,
      icon: AlertTriangle,
      variant: kpis.stockout_risk_count > 0 ? 'danger' : 'success',
      subtitle: kpis.stockout_risk_count > 0 ? 'Needs attention' : 'All clear',
    },
    {
      title: 'Overstock',
      value: kpis.overstock_count,
      icon: ArrowDownCircle,
      variant: kpis.overstock_count > 5 ? 'warning' : 'default',
      subtitle: 'Above max level',
    },
    {
      title: 'Pending POs',
      value: kpis.pending_purchase_orders,
      icon: ShoppingCart,
      variant: 'default',
      subtitle: 'Purchase orders',
    },
    {
      title: 'Pending SOs',
      value: kpis.pending_sales_orders,
      icon: BarChart3,
      variant: 'default',
      subtitle: 'Sales orders',
    },
    {
      title: 'Avg MAPE',
      value: kpis.avg_mape !== null ? `${kpis.avg_mape}%` : '—',
      icon: Target,
      variant: (kpis.avg_mape ?? 0) > 15 ? 'danger' : (kpis.avg_mape ?? 0) > 10 ? 'warning' : 'success',
      subtitle: 'Forecast error',
    },
    {
      title: 'Accuracy',
      value: kpis.forecast_accuracy_pct !== null ? `${kpis.forecast_accuracy_pct}%` : '—',
      icon: TrendingUp,
      variant: (kpis.forecast_accuracy_pct ?? 100) >= 90 ? 'success' : (kpis.forecast_accuracy_pct ?? 100) >= 80 ? 'warning' : 'danger',
      subtitle: 'Model accuracy',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} />
      ))}
    </div>
  );
}
