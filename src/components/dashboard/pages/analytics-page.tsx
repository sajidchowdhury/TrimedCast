'use client';

// ============================================
// Analytics Page — Category analysis, seasonal grid, What-If
// + Sea vs Air Comparison + Promo What-If Slider
// ============================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategorySeasonalGrid } from '@/components/forecast/category-seasonal-grid';
import { CNYCalendar } from '@/components/forecast/cny-calendar';
import { WhatIfScenarioPanel } from '@/components/forecast/what-if-scenario-panel';
import { SeaVsAirComparison } from '@/components/forecast/sea-vs-air-comparison';
import { PromoWhatIfSlider } from '@/components/forecast/promo-whatif-slider';
import { BarChart3, Calendar, GitBranch, PieChart, Ship, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function AnalyticsPage() {
  const [tab, setTab] = useState<'whatif' | 'seavsair' | 'promo' | 'seasonal' | 'cny'>('seavsair');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            Analytics & Insights
          </h2>
          <p className="text-sm text-muted-foreground">Category performance, seasonal patterns, and scenario simulation</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        {[
          { key: 'seavsair' as const, label: 'Sea vs Air', icon: Ship },
          { key: 'promo' as const, label: 'Promo Slider', icon: Megaphone },
          { key: 'whatif' as const, label: 'What-If Scenario', icon: GitBranch },
          { key: 'seasonal' as const, label: 'Seasonal Grid', icon: PieChart },
          { key: 'cny' as const, label: 'CNY Calendar', icon: Calendar },
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

      {tab === 'seavsair' && <SeaVsAirComparison />}
      {tab === 'promo' && <PromoWhatIfSlider />}
      {tab === 'whatif' && <WhatIfScenarioPanel />}
      {tab === 'seasonal' && <CategorySeasonalGrid />}
      {tab === 'cny' && <CNYCalendar />}
    </div>
  );
}
