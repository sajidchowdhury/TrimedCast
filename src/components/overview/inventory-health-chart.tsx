'use client';

// ============================================
// TrimedCast — Inventory Health Chart
// Session 20: Control Tower Dashboard
// ============================================

import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InventoryHealthChartProps {
  totalSkus: number;
  stockoutRiskCount: number;
  overstockCount: number;
}

export function InventoryHealthChart({ totalSkus, stockoutRiskCount, overstockCount }: InventoryHealthChartProps) {
  // Calculate segments
  const atRisk = stockoutRiskCount;
  const overstock = overstockCount;
  const lowStock = 12; // Mock value
  const healthy = totalSkus - atRisk - overstock - lowStock;

  const segments = [
    { label: 'Healthy', count: healthy, color: 'bg-emerald-500', textColor: 'text-emerald-600', bgColor: 'bg-emerald-500/10', icon: CheckCircle },
    { label: 'Low Stock', count: lowStock, color: 'bg-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-500/10', icon: AlertTriangle },
    { label: 'At Risk', count: atRisk, color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-500/10', icon: XCircle },
    { label: 'Overstock', count: overstock, color: 'bg-sky-500', textColor: 'text-sky-600', bgColor: 'bg-sky-500/10', icon: Package },
  ];

  const total = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            Inventory Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stacked horizontal bar */}
          <div className="w-full h-8 rounded-lg overflow-hidden flex">
            {segments.map((segment) => {
              const pct = (segment.count / total) * 100;
              return (
                <div
                  key={segment.label}
                  className={`${segment.color} transition-all duration-500 flex items-center justify-center`}
                  style={{ width: `${pct}%` }}
                >
                  {pct >= 8 && (
                    <span className="text-[10px] font-medium text-white drop-shadow-sm">
                      {Math.round(pct)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend / Stat boxes */}
          <div className="grid grid-cols-2 gap-2">
            {segments.map((segment) => {
              const Icon = segment.icon;
              const pct = ((segment.count / total) * 100).toFixed(1);
              return (
                <div
                  key={segment.label}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg ${segment.bgColor} border border-transparent`}
                >
                  <Icon className={`h-4 w-4 ${segment.textColor}`} />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{segment.label}</p>
                    <p className={`text-sm font-semibold ${segment.textColor}`}>
                      {segment.count} <span className="text-[10px] font-normal text-muted-foreground">SKUs ({pct}%)</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
