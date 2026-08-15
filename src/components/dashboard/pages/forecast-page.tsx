'use client';

// ============================================
// Forecast Page — Forecast dashboard with charts
// Integrates existing forecast components
// ============================================

import { useForecastStore } from '@/lib/forecasting/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ForecastChart } from '@/components/forecast/forecast-chart';
import { OrderTriggerCard } from '@/components/forecast/order-trigger-card';
import { SeasonalPattern } from '@/components/forecast/seasonal-pattern';
import { LeadTimeViz } from '@/components/forecast/lead-time-viz';
import { ModelComparison } from '@/components/forecast/model-comparison';
import { ForecastVsActual } from '@/components/forecast/forecast-vs-actual';
import { AdvancedForecastPanel } from '@/components/forecast/advanced-forecast-panel';
import {
  TrendingUp, RefreshCw, Target, Brain, BarChart3,
} from 'lucide-react';
import { useState } from 'react';

export function ForecastPage() {
  const store = useForecastStore();
  const [view, setView] = useState<'main' | 'advanced' | 'comparison'>('main');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Forecast Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">Seasonal demand forecasting with consensus model</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={(v: any) => setView(v)}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main">Main View</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="comparison">Comparison</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => store.generateForecast()}
            disabled={store.isGenerating}
          >
            {store.isGenerating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Brain className="h-3.5 w-3.5 mr-1" />
            )}
            Generate
          </Button>
        </div>
      </div>

      {/* Main forecast chart */}
      {view === 'main' && (
        <div className="space-y-4">
          <ForecastChart />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SeasonalPattern />
            <LeadTimeViz />
          </div>

          <OrderTriggerCard />
        </div>
      )}

      {view === 'advanced' && (
        <AdvancedForecastPanel />
      )}

      {view === 'comparison' && (
        <div className="space-y-4">
          <ForecastVsActual />
          <ModelComparison />
        </div>
      )}
    </div>
  );
}
