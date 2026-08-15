'use client';

// ============================================
// Forecast Page — Session 18 + Session 20 enhanced
// Consensus Forecast Chart + Metrics Table + Season Toggle
// + Forecast vs Actual + Product Selector
// + Promo Index Module (Session 20)
// ============================================

import { useState, useEffect } from 'react';
import { useForecastStore } from '@/lib/forecasting/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import type { BDSeason } from '@/lib/forecasting/models';

// Session 18 components
import { ConsensusForecastChart } from '../consensus-forecast-chart';
import { ForecastMetricsTable } from '../forecast-metrics-table';
import { SeasonToggle, getCurrentBDSeason } from '../season-toggle';
import { ForecastVsActualChart } from '../forecast-vs-actual-chart';
import { ProductSelector } from '../product-selector';

// Session 20 component
import { PromoIndexModule } from '../promo-index-module';

// Existing forecast components
import { SeasonalPattern } from '@/components/forecast/seasonal-pattern';
import { LeadTimeViz } from '@/components/forecast/lead-time-viz';
import { OrderTriggerCard } from '@/components/forecast/order-trigger-card';
import { ModelComparison } from '@/components/forecast/model-comparison';
import { AdvancedForecastPanel } from '@/components/forecast/advanced-forecast-panel';
import { StockProjection } from '@/components/forecast/stock-projection';

import {
  TrendingUp, RefreshCw, Brain, BarChart3, Target,
  LineChart, Layers, Settings2, Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ForecastPage() {
  const {
    forecastResult,
    forecastLoading,
    selectedProductId,
    generateForecast,
    setSelectedProductId,
    fetchProducts,
    products,
  } = useForecastStore();

  const [activeSeason, setActiveSeason] = useState<BDSeason | null>(null);
  const [view, setView] = useState<'consensus' | 'comparison' | 'advanced' | 'promo'>('consensus');
  const currentSeason = getCurrentBDSeason();

  // Load products on mount
  useEffect(() => {
    if (products.length === 0) fetchProducts();
  }, [products.length, fetchProducts]);

  // Extract data from forecast result
  const forecastPoints = forecastResult?.forecast?.points || [];
  const metrics = forecastResult?.forecast?.metrics;
  const individualResults = forecastResult?.forecast?.individualResults;
  const selectedProduct = forecastResult?.product;
  const dataPoints = forecastResult?.dataPoints;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Forecast Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">Seasonal demand forecasting with consensus model</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
            {[
              { key: 'consensus' as const, label: 'Consensus', icon: Layers },
              { key: 'comparison' as const, label: 'Compare', icon: BarChart3 },
              { key: 'promo' as const, label: 'Promo', icon: Megaphone },
              { key: 'advanced' as const, label: 'Advanced', icon: Settings2 },
            ].map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-sm transition-all',
                  view === v.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <v.icon className="h-3 w-3" />
                {v.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => generateForecast()}
            disabled={forecastLoading || !selectedProductId}
          >
            {forecastLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Brain className="h-3.5 w-3.5 mr-1" />
            )}
            Generate
          </Button>
        </div>
      </div>

      {/* Product selector */}
      <ProductSelector />

      {/* Season toggle */}
      <SeasonToggle
        activeSeason={activeSeason}
        onSeasonChange={setActiveSeason}
        currentSeason={currentSeason}
      />

      {/* Loading state */}
      {forecastLoading && (
        <div className="space-y-4">
          <Skeleton className="h-[450px] w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-[200px] rounded-lg" />
            <Skeleton className="h-[200px] rounded-lg" />
          </div>
        </div>
      )}

      {/* CONSENSUS VIEW */}
      {!forecastLoading && view === 'consensus' && (
        <div className="space-y-4">
          {/* Consensus Forecast Chart */}
          <ConsensusForecastChart
            points={forecastPoints}
            activeSeason={activeSeason}
          />

          {/* Forecast Accuracy Metrics Table */}
          {metrics && (
            <ForecastMetricsTable
              metrics={metrics}
              dataPoints={dataPoints}
            />
          )}

          {/* No forecast yet state */}
          {!forecastResult && !forecastLoading && (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground mb-1">No Forecast Generated Yet</p>
                <p className="text-xs text-muted-foreground mb-3">Select a product above and click Generate to create a seasonal demand forecast</p>
                {selectedProductId && (
                  <Button size="sm" onClick={() => generateForecast()}>
                    <Brain className="h-3.5 w-3.5 mr-1" />
                    Generate Forecast
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Secondary panels */}
          {forecastResult && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SeasonalPattern currentSeason={currentSeason} />
                <LeadTimeViz />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <OrderTriggerCard />
                <StockProjection />
              </div>

              {/* Model comparison inline */}
              {individualResults && individualResults.length > 0 && (
                <ModelComparison
                  individualResults={individualResults}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* COMPARISON VIEW */}
      {!forecastLoading && view === 'comparison' && (
        <div className="space-y-4">
          {/* Forecast vs Actual chart */}
          <ForecastVsActualChart
            productId={selectedProductId || undefined}
            productName={selectedProduct?.name || undefined}
          />

          {/* Model comparison table */}
          {individualResults && individualResults.length > 0 && (
            <ModelComparison
              individualResults={individualResults}
            />
          )}

          {/* Seasonal pattern alongside */}
          <SeasonalPattern currentSeason={currentSeason} />
        </div>
      )}

      {/* PROMO INDEX VIEW — Session 20 */}
      {!forecastLoading && view === 'promo' && (
        <PromoIndexModule />
      )}

      {/* ADVANCED VIEW */}
      {!forecastLoading && view === 'advanced' && (
        <AdvancedForecastPanel />
      )}
    </div>
  );
}
