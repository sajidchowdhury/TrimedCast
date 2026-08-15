'use client';

// ============================================
// Inventory Page — Session 20 enhanced
// Full Inventory Grid + Lead Time Simulator
// + EOQ/Safety Stock + Service Levels + Stock Projection
// ============================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Package, Ship, Calculator, Shield, TrendingDown } from 'lucide-react';

// Session 20 components
import { InventoryGrid } from '../inventory-grid';
import { LeadTimeSimulator } from '../lead-time-simulator';

// Existing forecast components
import { EOQSafetyStockPanel } from '@/components/forecast/eoq-safety-stock-panel';
import { ServiceLevelTable } from '@/components/forecast/service-level-table';
import { StockProjection } from '@/components/forecast/stock-projection';

export function InventoryPage() {
  const [tab, setTab] = useState<'grid' | 'simulator' | 'eoq' | 'service' | 'projection'>('grid');

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

      {/* Tab navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        {[
          { key: 'grid' as const, label: 'Inventory Grid', icon: Package },
          { key: 'simulator' as const, label: 'Sea vs Air', icon: Ship },
          { key: 'eoq' as const, label: 'EOQ & Safety Stock', icon: Calculator },
          { key: 'service' as const, label: 'Service Levels', icon: Shield },
          { key: 'projection' as const, label: 'Stock Projection', icon: TrendingDown },
        ].map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? 'default' : 'ghost'}
            size="sm"
            className="text-xs shrink-0"
            onClick={() => setTab(t.key)}
          >
            <t.icon className="h-3.5 w-3.5 mr-1" />
            {t.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {tab === 'grid' && <InventoryGrid />}
      {tab === 'simulator' && <LeadTimeSimulator />}
      {tab === 'eoq' && <EOQSafetyStockPanel />}
      {tab === 'service' && <ServiceLevelTable />}
      {tab === 'projection' && <StockProjection />}
    </div>
  );
}
