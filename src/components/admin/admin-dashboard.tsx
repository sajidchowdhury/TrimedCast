'use client';

// ============================================
// TrimedCast — Admin Dashboard (Main Orchestrator)
// Session 24: Multi-Tenant Admin Panel
// ============================================

import { useEffect } from 'react';
import { Shield, LayoutDashboard, Building2, Server, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAdminStore } from '@/stores/admin-store';
import { RevenueOverview } from './revenue-overview';
import { PlatformMetricsPanel } from './platform-metrics';
import { TenantsTable } from './tenants-table';
import { SystemHealthPanel } from './system-health-panel';
import { SecurityOverview } from './security-overview';
import {
  MOCK_REVENUE,
  MOCK_METRICS,
  MOCK_HEALTH,
  MOCK_TENANTS,
} from './types';

export function AdminDashboard() {
  const {
    tenants,
    revenue,
    metrics,
    health,
    security,
    isLoading,
    fetchAll,
    fetchHealth,
    suspendTenant,
    reactivateTenant,
  } = useAdminStore();

  // Load all data on mount
  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Use mock data as fallback
  const displayRevenue = revenue ?? MOCK_REVENUE;
  const displayMetrics = metrics ?? MOCK_METRICS;
  const displayHealth = health ?? MOCK_HEALTH;
  const displayTenants = tenants.length > 0 ? tenants : MOCK_TENANTS;

  if (isLoading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center animate-pulse">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">অ্যাডমিন প্যানেল</p>
          </div>
          <Badge variant="secondary" className="ml-2">
            Super Admin
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="tenants" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tenants</span>
            <span className="sm:hidden">Tenants</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5">
            <Server className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">System</span>
            <span className="sm:hidden">System</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Revenue</span>
            <span className="sm:hidden">Revenue</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview — Revenue + Platform Metrics side by side */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueOverview revenue={displayRevenue} />
            <PlatformMetricsPanel metrics={displayMetrics} />
          </div>
        </TabsContent>

        {/* Tab 2: Tenants — Tenants Table */}
        <TabsContent value="tenants" className="mt-6">
          <TenantsTable
            tenants={displayTenants}
            onSuspend={(id) => void suspendTenant(id)}
            onReactivate={(id) => void reactivateTenant(id)}
          />
        </TabsContent>

        {/* Tab 3: System — Health + Security side by side */}
        <TabsContent value="system" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemHealthPanel
              health={displayHealth}
              onRefresh={() => void fetchHealth()}
            />
            {security && <SecurityOverview security={security} />}
          </div>
        </TabsContent>

        {/* Tab 4: Revenue — Full breakdown */}
        <TabsContent value="revenue" className="mt-6">
          <RevenueOverview revenue={displayRevenue} />
          {/* Additional revenue details */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <RevenueDetailCard
              title="Active Tenants"
              value={String(displayRevenue.activeTenants)}
              subtitle="Generating revenue"
              color="emerald"
            />
            <RevenueDetailCard
              title="Trial Tenants"
              value={String(displayRevenue.trialTenants)}
              subtitle="Converting to paid"
              color="sky"
            />
            <RevenueDetailCard
              title="Suspended"
              value={String(displayRevenue.suspendedTenants)}
              subtitle="Revenue at risk"
              color="red"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RevenueDetailCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    emerald: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10',
    sky: 'border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-900/10',
    red: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10',
  };

  return (
    <div
      className={`rounded-lg border p-4 ${colorClasses[color] ?? 'border-border'}`}
    >
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}
