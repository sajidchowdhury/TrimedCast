'use client';

// ============================================
// TrimedCast — Overview Dashboard (Main Layout)
// Session 20: Control Tower Dashboard
// ============================================

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2, WifiOff, LayoutDashboard } from 'lucide-react';
import { useOverviewStore } from '@/stores/overview-store';
import { KPIHeroCards } from './kpi-hero-cards';
import { SeasonSopBanner } from './season-sop-banner';
import { InventoryHealthChart } from './inventory-health-chart';
import { UrgentOrdersList } from './urgent-orders-list';
import { RecentActivityFeed } from './recent-activity-feed';
import { ModuleLinksGrid } from './module-links-grid';
import { AlertCenter } from './alert-center';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// Auto-refresh interval: 5 minutes
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Banner skeleton */}
      <Skeleton className="h-20 w-full rounded-lg" />
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-lg" />
        ))}
      </div>
      {/* Middle rows skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-52 w-full rounded-lg" />
        <Skeleton className="h-52 w-full rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
      {/* Module links skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function OverviewDashboard() {
  const { data, isLoading, error, fetchDashboard, refreshDashboard, lastRefresh } = useOverviewStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial fetch
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboard();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshDashboard();
    setIsRefreshing(false);
  };

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <LayoutDashboard className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Control Tower</h2>
              <p className="text-xs text-muted-foreground">Loading dashboard data...</p>
            </div>
          </div>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dashboard Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <LayoutDashboard className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Control Tower</h2>
            <p className="text-xs text-muted-foreground">
              {lastRefresh
                ? `Last updated ${lastRefresh.toLocaleTimeString()}`
                : 'Real-time overview'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-500/10 px-2 py-1 rounded-md">
              <WifiOff className="h-3 w-3" />
              Using cached data
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Error with retry */}
      {error && !data && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium">Unable to load dashboard data</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Season & SOP Banner */}
          <SeasonSopBanner
            seasonalSummary={data.seasonal_summary}
            sopCycle={data.sop_cycle}
          />

          {/* KPI Hero Cards */}
          <KPIHeroCards kpis={data.kpis} />

          {/* Inventory Health + Alert Center */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InventoryHealthChart
              totalSkus={data.kpis.total_skus}
              stockoutRiskCount={data.kpis.stockout_risk_count}
              overstockCount={data.kpis.overstock_count}
            />
            <AlertCenter />
          </div>

          {/* Urgent Orders + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <UrgentOrdersList orders={data.urgent_orders} />
            <RecentActivityFeed />
          </div>

          {/* Module Quick Links */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.3 }}
              className="flex items-center gap-2 mb-3"
            >
              <h3 className="text-sm font-semibold text-muted-foreground">Quick Access</h3>
              <span className="text-xs text-muted-foreground">— Navigate to modules</span>
            </motion.div>
            <ModuleLinksGrid />
          </div>

          {/* Loading overlay for refresh */}
          {isLoading && (
            <div className="fixed bottom-4 right-4 z-50">
              <div className="flex items-center gap-2 bg-background/80 backdrop-blur-md border px-3 py-2 rounded-lg shadow-lg text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Refreshing...
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
