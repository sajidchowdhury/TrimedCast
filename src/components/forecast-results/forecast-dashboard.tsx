'use client';

// ============================================
// TrimedCast — Forecast Dashboard (Main Orchestrator)
// Session 21: Demand Forecasting Results
// ============================================

import { useEffect } from 'react';
import { Brain, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useForecastResultStore } from '@/stores/forecast-result-store';
import { ForecastSummaryCards } from './forecast-summary-cards';
import { ForecastTable } from './forecast-table';
import { ForecastDetailPanel } from './forecast-detail-panel';
import { ModelComparisonChart } from './model-comparison-chart';
import { AccuracyDistribution } from './accuracy-distribution';
import { SeasonBreakdown } from './season-breakdown';

export function ForecastDashboard() {
  const { isLoading, error, fetchForecasts, clearError } = useForecastResultStore();

  useEffect(() => {
    fetchForecasts();
  }, [fetchForecasts]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="p-3 rounded-full bg-red-500/10">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearError}>Dismiss</Button>
          <Button size="sm" onClick={fetchForecasts}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Brain className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Demand Forecasting</h1>
            <p className="text-sm text-muted-foreground">চাহিদা পূর্বাভাস — Forecast Results Dashboard</p>
          </div>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <ForecastSummaryCards />

      {/* Season Breakdown + Accuracy Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SeasonBreakdown />
        <AccuracyDistribution />
      </div>

      {/* Forecast Results Table */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Forecast Results</h2>
        <ForecastTable />
      </div>

      {/* Model Comparison Chart */}
      <ModelComparisonChart />

      {/* Detail Panel (Sheet) */}
      <ForecastDetailPanel />
    </div>
  );
}
