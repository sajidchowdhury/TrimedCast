'use client';

// ============================================
// Analytics Page — Category analysis, seasonal grid
// ============================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategorySeasonalGrid } from '@/components/forecast/category-seasonal-grid';
import { CNYCalendar } from '@/components/forecast/cny-calendar';
import { BarChart3, Calendar, TrendingUp, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function AnalyticsPage() {
  const [tab, setTab] = useState<'seasonal' | 'cny' | 'trends'>('seasonal');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            Analytics & Insights
          </h2>
          <p className="text-sm text-muted-foreground">Category performance, seasonal patterns, and market trends</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { key: 'seasonal' as const, label: 'Seasonal Grid', icon: PieChart },
          { key: 'cny' as const, label: 'CNY Calendar', icon: Calendar },
          { key: 'trends' as const, label: 'Trends', icon: TrendingUp },
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

      {tab === 'seasonal' && <CategorySeasonalGrid />}
      {tab === 'cny' && <CNYCalendar />}
      {tab === 'trends' && (
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Trend analysis coming in Phase 6 (AI & Advanced Features)</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
