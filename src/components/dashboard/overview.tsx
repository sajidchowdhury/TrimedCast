'use client';

// ============================================
// Dashboard Overview — Main dashboard landing page
// S&OP Progress Bar + KPI Cards + Season Indicator
// + Urgent Orders + Recent Forecasts + Quick Actions
// ============================================

import { useEffect, useState } from 'react';
import { useDashboardStore } from '@/lib/dashboard/store';
import { SopProgressBar } from './sop-progress-bar';
import { KpiCards } from './kpi-cards';
import { SeasonIndicator } from './season-indicator';
import { UrgentOrdersPanel } from './urgent-orders-panel';
import { RecentForecastsPanel } from './recent-forecasts-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  ShoppingCart,
  Upload,
  Package,
  Brain,
  Zap,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export function DashboardOverview() {
  const { data, isLoading, error, fetchDashboardData } = useDashboardStore();
  const [sopRhythm, setSopRhythm] = useState<'monthly' | 'biweekly'>('monthly');

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Error state
  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Activity className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Failed to load dashboard</p>
            <p className="text-xs text-muted-foreground mb-3">{error}</p>
            <Button size="sm" onClick={fetchDashboardData}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpis = data?.kpis ?? {
    total_skus: 0, total_stock_value_bdt: 0, stockout_risk_count: 0,
    overstock_count: 0, pending_purchase_orders: 0, pending_sales_orders: 0,
    avg_mape: null, forecast_accuracy_pct: null,
  };

  const seasonal = data?.seasonal_summary ?? {
    current_season: 'summer', next_season: 'monsoon', days_to_next_season: 30,
  };

  const urgentOrders = data?.urgent_orders ?? [];
  const recentForecasts = data?.recent_forecasts ?? [];

  return (
    <div className="space-y-5">
      {/* S&OP Progress Bar */}
      <Card>
        <CardContent className="p-4 md:p-5">
          <SopProgressBar
            currentStage={data?.sop_cycle?.current_stage}
            cycleName={data?.sop_cycle?.cycle_name}
            rhythm={sopRhythm}
            onRhythmChange={setSopRhythm}
          />
          {data?.sop_cycle && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] capitalize">
                {data.sop_cycle.current_stage?.replace('_', ' ')}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {data.sop_cycle.status}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <KpiCards kpis={kpis} isLoading={isLoading && !data} />

      {/* Season + Right side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Season Indicator */}
        <div className="lg:col-span-1">
          <SeasonIndicator seasonal={seasonal} />
        </div>

        {/* Center: Urgent Orders */}
        <div className="lg:col-span-1">
          <UrgentOrdersPanel orders={urgentOrders} />
        </div>

        {/* Right: Recent Forecasts */}
        <div className="lg:col-span-1">
          <RecentForecastsPanel forecasts={recentForecasts} />
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction
              icon={TrendingUp}
              label="Generate Forecast"
              description="Run seasonal demand forecast"
              color="text-emerald-600"
              bgColor="bg-emerald-500/10"
            />
            <QuickAction
              icon={ShoppingCart}
              label="View Orders"
              description="Recommended order triggers"
              color="text-amber-600"
              bgColor="bg-amber-500/10"
            />
            <QuickAction
              icon={Upload}
              label="Import Data"
              description="Upload Excel data files"
              color="text-sky-600"
              bgColor="bg-sky-500/10"
            />
            <QuickAction
              icon={Brain}
              label="Ask AI"
              description="Natural language queries"
              color="text-purple-600"
              bgColor="bg-purple-500/10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Market Intelligence Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-500" />
            Bangladesh Market Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Seasonal Pattern</p>
              <p className="text-sm text-foreground">
                {seasonal.current_season === 'winter' && 'Winter demand peak — motorcycle parts surge for dry season riding'}
                {seasonal.current_season === 'summer' && 'Summer demand — moderate parts demand, AC/cooling parts rise'}
                {seasonal.current_season === 'monsoon' && 'Monsoon slowdown — reduced riding, brake parts demand increases'}
                {seasonal.current_season === 'pre_winter' && 'Pre-winter buildup — inventory pre-positioning for peak season'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Supply Chain Alert</p>
              <p className="text-sm text-foreground">
                China supplier lead times averaging 90 days. Monitor CNY holiday schedule for Q1 orders.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Forecast Health</p>
              <p className="text-sm text-foreground">
                {kpis.avg_mape !== null
                  ? `Model MAPE at ${kpis.avg_mape}% — ${kpis.avg_mape <= 10 ? 'Excellent accuracy' : kpis.avg_mape <= 20 ? 'Acceptable accuracy, consider recalibration' : 'High error, recalibration recommended'}`
                  : 'No forecast accuracy data available yet. Generate forecasts to see metrics.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  description,
  color,
  bgColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}) {
  const { setActivePage } = useDashboardStore();

  const pageMap: Record<string, string> = {
    'Generate Forecast': 'forecast',
    'View Orders': 'orders',
    'Import Data': 'import',
    'Ask AI': 'forecast',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        const page = pageMap[label];
        if (page) setActivePage(page as any);
      }}
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors text-left w-full"
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bgColor}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </motion.button>
  );
}
