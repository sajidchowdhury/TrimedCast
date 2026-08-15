'use client';

// ============================================
// Executive Summary Card — Recommended orders summary
// Total spend, urgency breakdown, CNY risk count
// Uses GET /api/v1/recommended-orders/summary
// ============================================

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingCart,
  AlertTriangle,
  DollarSign,
  Clock,
  TrendingUp,
  Zap,
  ArrowDownCircle,
  Package,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDashboardStore } from '@/lib/dashboard/store';
import { cn } from '@/lib/utils';

interface SummaryData {
  total_orders: number;
  total_spend: number;
  by_urgency: Record<string, number>;
  by_season: Record<string, number>;
  cny_at_risk_count: number;
  earliest_trigger_date: string | null;
  latest_trigger_date: string | null;
}

interface ExecutiveSummaryCardProps {
  className?: string;
}

export function ExecutiveSummaryCard({ className }: ExecutiveSummaryCardProps) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { setOrdersCnyAtRisk } = useDashboardStore();

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/v1/recommended-orders/summary');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setOrdersCnyAtRisk(json.data?.cny_at_risk_count || 0);
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [setOrdersCnyAtRisk]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  const total = data?.total_orders || 0;
  const spend = data?.total_spend || 0;
  const cnyRisk = data?.cny_at_risk_count || 0;
  const byUrgency = data?.by_urgency || {};

  const formatBDT = (val: number) => {
    if (val >= 1_00_00_000) return `৳${(val / 1_00_00_000).toFixed(1)}L`;
    if (val >= 1_00_000) return `৳${(val / 1_00_000).toFixed(1)}K`;
    return `৳${val.toLocaleString('en-IN')}`;
  };

  const cards = [
    {
      title: 'Total Orders',
      value: total.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-foreground',
      bgColor: 'bg-primary/10',
      subtitle: 'Pending recommendations',
    },
    {
      title: 'Total Spend',
      value: formatBDT(spend),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
      subtitle: 'Estimated procurement cost',
    },
    {
      title: 'CNY at Risk',
      value: cnyRisk.toString(),
      icon: AlertTriangle,
      color: cnyRisk > 0 ? 'text-red-600' : 'text-emerald-600',
      bgColor: cnyRisk > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
      subtitle: cnyRisk > 0 ? 'Needs resolution strategy' : 'All orders safe',
    },
    {
      title: 'Urgency Mix',
      value: `${byUrgency.critical || 0}C / ${byUrgency.high || 0}H`,
      icon: Zap,
      color: (byUrgency.critical || 0) > 0 ? 'text-red-600' : 'text-amber-600',
      bgColor: (byUrgency.critical || 0) > 0 ? 'bg-red-500/10' : 'bg-amber-500/10',
      subtitle: `+${byUrgency.normal || 0} normal`,
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-3', className)}>
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{card.title}</p>
                  <p className="text-xl font-bold tabular-nums mt-1">{card.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{card.subtitle}</p>
                </div>
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', card.bgColor)}>
                  <card.icon className={cn('h-4 w-4', card.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
