'use client';

// ============================================
// TrimedCast — Platform Metrics
// Session 24: Multi-Tenant Admin Panel
// ============================================

import {
  Building2,
  Users,
  Package,
  BarChart3,
  Brain,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type PlatformMetrics } from './types';

interface PlatformMetricsProps {
  metrics: PlatformMetrics;
}

export function PlatformMetricsPanel({ metrics }: PlatformMetricsProps) {
  const cards = [
    {
      title: 'Total Tenants',
      value: String(metrics.totalTenants),
      icon: Building2,
      iconClass: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400',
    },
    {
      title: 'Active Tenants',
      value: `${metrics.activeTenants}`,
      subtitle: `of ${metrics.totalTenants}`,
      icon: Building2,
      iconClass: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      title: 'Total Users',
      value: metrics.totalUsers.toLocaleString('en-IN'),
      icon: Users,
      iconClass: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400',
    },
    {
      title: 'Products Tracked',
      value: metrics.totalProducts.toLocaleString('en-IN'),
      icon: Package,
      iconClass: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      title: 'Forecast Runs',
      value: metrics.forecastRunsThisMonth.toLocaleString('en-IN'),
      subtitle: 'This month',
      icon: BarChart3,
      iconClass: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      title: 'AI Queries',
      value: String(metrics.aiQueriesThisMonth),
      subtitle: 'This month',
      icon: Brain,
      iconClass: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {cards.map((card) => {
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
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Avg MAPE */}
      <Card className="gap-3 py-4">
        <CardHeader className="pb-0 pt-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Avg MAPE Across Platform</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-0">
          {metrics.avgMape !== null ? (
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{metrics.avgMape}%</span>
              <span
                className={`text-xs font-medium mb-1 ${
                  metrics.avgMape <= 15
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : metrics.avgMape <= 25
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                }`}
              >
                {metrics.avgMape <= 15 ? 'Excellent' : metrics.avgMape <= 25 ? 'Good' : 'Needs Review'}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Mean Absolute Percentage Error — lower is better
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
