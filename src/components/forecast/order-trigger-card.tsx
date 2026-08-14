'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { OrderTriggerClient } from '@/lib/forecasting/store';
import {
  Package,
  CalendarClock,
  Truck,
  AlertTriangle,
  ShoppingCart,
  Clock,
  Info,
} from 'lucide-react';

interface OrderTriggerCardProps {
  trigger: OrderTriggerClient;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  low: 'bg-amber-100 text-amber-700 border-amber-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
  stockout: 'bg-red-200 text-red-900 border-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  healthy: 'Healthy',
  low: 'Low Stock',
  critical: 'Critical',
  stockout: 'Stockout',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500 text-white',
  high: 'bg-amber-500 text-white',
  normal: 'bg-emerald-500 text-white',
  low: 'bg-slate-400 text-white',
};

const TRIGGER_LABELS: Record<string, string> = {
  reorder_point: 'Reorder Point',
  seasonal_uplift: 'Seasonal Uplift',
  cny_urgency: 'CNY Urgency',
  stockout_risk: 'Stockout Risk',
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function OrderTriggerCard({ trigger }: OrderTriggerCardProps) {
  const leadTimeTotal = trigger.leadTimeBreakdown.manufacturing +
    trigger.leadTimeBreakdown.shipping +
    trigger.leadTimeBreakdown.customs +
    trigger.leadTimeBreakdown.internal;

  const segments = [
    { label: 'MFG', value: trigger.leadTimeBreakdown.manufacturing, color: 'bg-slate-400' },
    { label: 'Ship', value: trigger.leadTimeBreakdown.shipping, color: 'bg-blue-400' },
    { label: 'Cust', value: trigger.leadTimeBreakdown.customs, color: 'bg-amber-400' },
    { label: 'Int', value: trigger.leadTimeBreakdown.internal, color: 'bg-emerald-400' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
            Order Trigger
          </CardTitle>
          <Badge className={PRIORITY_COLORS[trigger.priority]}>
            {trigger.priority.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product info */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Package className="h-5 w-5 text-slate-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{trigger.productName}</p>
            <p className="text-xs text-gray-500">{trigger.productSku}</p>
          </div>
          <Badge variant="outline" className={STATUS_COLORS[trigger.stockStatus]}>
            {STATUS_LABELS[trigger.stockStatus]}
          </Badge>
        </div>

        {/* Stock numbers */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-slate-50">
            <p className="text-lg font-bold text-slate-700">{trigger.availableStock}</p>
            <p className="text-[10px] text-slate-500">Available</p>
          </div>
          <div className="p-2 rounded bg-slate-50">
            <p className="text-lg font-bold text-slate-700">{trigger.safetyStock}</p>
            <p className="text-[10px] text-slate-500">Safety Stock</p>
          </div>
          <div className="p-2 rounded bg-slate-50">
            <p className="text-lg font-bold text-slate-700">{trigger.daysOfStock}</p>
            <p className="text-[10px] text-slate-500">Days Left</p>
          </div>
        </div>

        {/* Key dates */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span className="text-gray-600">Order Trigger:</span>
            <span className="font-medium ml-auto">{formatDate(trigger.orderTriggerDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-gray-600">Expected Delivery:</span>
            <span className="font-medium ml-auto">{formatDate(trigger.expectedDeliveryDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-gray-600">Reorder Hit:</span>
            <span className="font-medium ml-auto">{formatDate(trigger.reorderHitDate)}</span>
          </div>
        </div>

        {/* Lead time bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Lead Time: {leadTimeTotal} days
            </span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
            {segments.map((seg, i) => (
              <div
                key={i}
                className={`${seg.color} flex items-center justify-center text-[9px] font-medium text-white transition-all`}
                style={{ width: `${(seg.value / leadTimeTotal) * 100}%` }}
                title={`${seg.label}: ${seg.value}d`}
              >
                {seg.value > 5 && `${seg.value}d`}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {segments.map((seg, i) => (
              <span key={i} className="text-[9px] text-gray-400">
                {seg.label} {seg.value}d
              </span>
            ))}
          </div>
        </div>

        {/* CNY Risk */}
        {trigger.cnyRisk && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-semibold text-red-700">CNY Risk Detected</span>
              <Badge variant="destructive" className="text-[10px]">
                +{trigger.cnyDelayDays}d delay
              </Badge>
            </div>
            <p className="text-xs text-red-600">{trigger.cnyStrategy}</p>
          </div>
        )}

        {/* Suggested order */}
        <div className="flex items-center justify-between bg-emerald-50 rounded-lg p-3">
          <div>
            <p className="text-xs text-emerald-600">Suggested Order Qty</p>
            <p className="text-xl font-bold text-emerald-700">{trigger.suggestedOrderQty}</p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">
              {TRIGGER_LABELS[trigger.orderTrigger]}
            </Badge>
          </div>
        </div>

        {/* Season note */}
        <div className="flex items-start gap-2 text-xs text-gray-500">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>{trigger.seasonNote}</span>
        </div>
      </CardContent>
    </Card>
  );
}
