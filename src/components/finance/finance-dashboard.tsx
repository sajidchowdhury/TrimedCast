'use client';

// ============================================
// TrimedCast — Financial Analytics Dashboard Orchestrator
// Session 26: Financial Analytics & Cost Intelligence Dashboard
// ============================================

import { useEffect } from 'react';
import { DollarSign, LayoutDashboard, Percent, Globe2, Calculator, CreditCard, Scale, AlertCircle, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFinanceStore } from '@/stores/finance-store';
import type { FinanceTab } from '@/components/finance/types';

// ─── Sub-Component Imports ───────────────────────────────────────────
import { CostBreakdown } from '@/components/finance/cost-breakdown';
import { MarginAnalysisPanel } from '@/components/finance/margin-analysis';
import { RevenueTrends } from '@/components/finance/revenue-trends';
import { CurrencyExposurePanel } from '@/components/finance/currency-exposure';
import { CustomsCalculator } from '@/components/finance/customs-calculator';
import { PaymentTermsPanel } from '@/components/finance/payment-terms';
import { BudgetVsActualPanel } from '@/components/finance/budget-vs-actual';
import { CostToServePanel } from '@/components/finance/cost-to-serve';

// ─── Tab Configuration ───────────────────────────────────────────────

const TAB_CONFIG: { value: FinanceTab; label: string; icon: React.ReactNode }[] = [
  { value: 'overview', label: 'Overview', icon: <LayoutDashboard className="size-3.5" /> },
  { value: 'margin', label: 'Margin', icon: <Percent className="size-3.5" /> },
  { value: 'currency', label: 'Currency', icon: <Globe2 className="size-3.5" /> },
  { value: 'customs', label: 'Customs', icon: <Calculator className="size-3.5" /> },
  { value: 'payments', label: 'Payments', icon: <CreditCard className="size-3.5" /> },
  { value: 'budget', label: 'Budget', icon: <Scale className="size-3.5" /> },
];

// ─── Skeleton Placeholder ────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-40 bg-muted animate-pulse rounded-md" />
      </div>
      {/* Content skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-48 w-full bg-muted animate-pulse rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}

// ─── Error Banner ────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <AlertCircle className="size-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-md p-1 hover:bg-destructive/10 transition-colors"
        aria-label="Dismiss error"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ─── Main Dashboard Component ────────────────────────────────────────

export function FinanceDashboard() {
  const {
    isLoading,
    error,
    activeTab,
    fetchAll,
    setActiveTab,
    clearError,
  } = useFinanceStore();

  // Fetch all data on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as FinanceTab);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <DollarSign className="size-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Financial Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            আর্থিক বিশ্লেষণ — Cost intelligence &amp; supply chain finance for TrimedCast Bangladesh
          </p>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────── */}
      {error && (
        <ErrorBanner
          message={error}
          onDismiss={clearError}
        />
      )}

      {/* ── Loading State ─────────────────────────────────(─────── */}
      {isLoading && !error && <DashboardSkeleton />}

      {/* ── Tabbed Dashboard ────────────────────────────────────── */}
      {!isLoading && (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Tab Navigation */}
          <div className="w-full overflow-x-auto">
            <TabsList className="w-full sm:w-auto">
              {TAB_CONFIG.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── Overview Tab ──────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CostBreakdown />
              <RevenueTrends />
            </div>
          </TabsContent>

          {/* ── Margin Tab ────────────────────────────────────── */}
          <TabsContent value="margin" className="space-y-6">
            <MarginAnalysisPanel />
          </TabsContent>

          {/* ── Currency Tab ───────────────────────────────────── */}
          <TabsContent value="currency" className="space-y-6">
            <CurrencyExposurePanel />
          </TabsContent>

          {/* ── Customs Tab ────────────────────────────────────── */}
          <TabsContent value="customs" className="space-y-6">
            <CustomsCalculator />
          </TabsContent>

          {/* ── Payments Tab ───────────────────────────────────── */}
          <TabsContent value="payments" className="space-y-6">
            <PaymentTermsPanel />
          </TabsContent>

          {/* ── Budget Tab ─────────────────────────────────────── */}
          <TabsContent value="budget" className="space-y-6">
            <div className="space-y-6">
              <BudgetVsActualPanel />
              <CostToServePanel />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default FinanceDashboard;
