'use client';

// ============================================
// Inventory Page — EOQ, Safety Stock, Stock Status
// ============================================

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EOQSafetyStockPanel } from '@/components/forecast/eoq-safety-stock-panel';
import { ServiceLevelTable } from '@/components/forecast/service-level-table';
import { StockProjection } from '@/components/forecast/stock-projection';
import { Package, Shield, Calculator, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function InventoryPage() {
  const [tab, setTab] = useState<'eoq' | 'service' | 'projection'>('eoq');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-sky-500" />
            Inventory Management
          </h2>
          <p className="text-sm text-muted-foreground">Stock levels, EOQ, safety stock, and reorder parameters</p>
        </div>
      </div>

      {/* Stock status summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-200 dark:border-emerald-900/50">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Healthy Stock</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">—</Badge>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground">Low Stock</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">—</Badge>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900/50">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Stockout Risk</span>
            <Badge variant="destructive" className="ml-auto text-[10px]">—</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { key: 'eoq' as const, label: 'EOQ & Safety Stock', icon: Calculator },
          { key: 'service' as const, label: 'Service Levels', icon: Shield },
          { key: 'projection' as const, label: 'Stock Projection', icon: TrendingDown },
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
      {tab === 'eoq' && <EOQSafetyStockPanel />}
      {tab === 'service' && <ServiceLevelTable />}
      {tab === 'projection' && <StockProjection />}
    </div>
  );
}
