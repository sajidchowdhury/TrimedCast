'use client';

// ============================================
// Orders Page — Recommended Orders + Order Triggers
// ============================================

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RecommendedOrdersTable } from '@/components/forecast/recommended-orders-table';
import { OrderTimelineGantt } from '@/components/forecast/order-timeline-gantt';
import { CNYRiskDashboard } from '@/components/forecast/cny-risk-dashboard';
import { SeasonalBestPanel } from '@/components/forecast/seasonal-best-panel';
import { ShoppingCart, AlertTriangle, TrendingUp, Package } from 'lucide-react';
import { useState } from 'react';

export function OrdersPage() {
  const [tab, setTab] = useState<'recommended' | 'timeline' | 'cny' | 'seasonal'>('recommended');

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

      {/* Tab navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { key: 'recommended' as const, label: 'Recommended Orders', icon: ShoppingCart },
          { key: 'timeline' as const, label: 'Order Timeline', icon: Package },
          { key: 'cny' as const, label: 'CNY Risk', icon: AlertTriangle },
          { key: 'seasonal' as const, label: 'Seasonal Best', icon: TrendingUp },
        ].map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? 'default' : 'ghost'}
            size="sm"
            className="text-xs"
            onClick={() => setTab(t.key)}
          >
            <t.icon className="h-3.5 w-3.5 mr-1" />
            {t.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {tab === 'recommended' && <RecommendedOrdersTable />}
      {tab === 'timeline' && <OrderTimelineGantt />}
      {tab === 'cny' && <CNYRiskDashboard />}
      {tab === 'seasonal' && <SeasonalBestPanel />}
    </div>
  );
}
