'use client';

// ============================================
// Orders Page — Session 19 enhanced
// THE PRIMARY OUTPUT — visual "when/what/how much to order"
// Executive Summary + CNY Banner + Orders Table + Gantt + CNY Risk
// ============================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// Session 19 dashboard components
import { ExecutiveSummaryCard } from '../executive-summary-card';
import { CNYRiskBanner } from '../cny-risk-banner';
import { DashboardOrdersTable } from '../dashboard-orders-table';
import { DashboardOrderTimelineGantt } from '../dashboard-gantt';

// Existing components
import { CNYCalendar } from '@/components/forecast/cny-calendar';
import { SeasonalBestPanel } from '@/components/forecast/seasonal-best-panel';
import { CNYRiskDashboard } from '@/components/forecast/cny-risk-dashboard';

import {
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Clock,
  Package,
  BarChart3,
  GitBranch,
} from 'lucide-react';
import { useDashboardStore } from '@/lib/dashboard/store';
import { cn } from '@/lib/utils';

export function OrdersPage() {
  const [tab, setTab] = useState<'orders' | 'timeline' | 'cny' | 'seasonal'>('orders');
  const { ordersCnyAtRisk } = useDashboardStore();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-amber-500" />
            Order Triggers & Recommendations
          </h2>
          <p className="text-sm text-muted-foreground">When to order, how much, and from which supplier</p>
        </div>
      </div>

      {/* Executive Summary Card */}
      <ExecutiveSummaryCard />

      {/* CNY Risk Banner */}
      <CNYRiskBanner cnyAtRiskCount={ordersCnyAtRisk} />

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-border pb-2 overflow-x-auto">
        {[
          { key: 'orders' as const, label: 'Recommended Orders', icon: ShoppingCart },
          { key: 'timeline' as const, label: 'Order Timeline', icon: GitBranch },
          { key: 'cny' as const, label: 'CNY Risk', icon: AlertTriangle },
          { key: 'seasonal' as const, label: 'Seasonal Best', icon: TrendingUp },
        ].map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? 'default' : 'ghost'}
            size="sm"
            className="text-xs shrink-0"
            onClick={() => setTab(t.key)}
          >
            <t.icon className="h-3.5 w-3.5 mr-1" />
            {t.label}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {/* Recommended Orders Table with filtering and Convert to PO */}
          <DashboardOrdersTable />
        </div>
      )}

      {tab === 'timeline' && (
        <div className="space-y-4">
          {/* Order Timeline Gantt chart */}
          <DashboardOrderTimelineGantt />
        </div>
      )}

      {tab === 'cny' && (
        <div className="space-y-4">
          <CNYCalendar />
          <CNYRiskDashboard />
        </div>
      )}

      {tab === 'seasonal' && (
        <SeasonalBestPanel />
      )}
    </div>
  );
}
