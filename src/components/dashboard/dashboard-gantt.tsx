'use client';

// ============================================
// Dashboard Order Timeline Gantt
// Fetches recommended orders and renders as Gantt chart
// Mfg (blue) → Ship (green) → Customs (amber) bars
// CNY shutdown zones, today line, order trigger markers
// ============================================

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  RefreshCw,
  Package,
  Clock,
  Plane,
  Ship,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInDays, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimelineOrder {
  id: string;
  product: { name: string; sku: string };
  urgency: string;
  orderTrigger: string;
  totalLeadTime: number;
  expectedDeliveryDate: string;
  cnyRisk: boolean;
  shipmentMode: string;
  suggestedQty: number;
  totalCost: number;
}

const SEGMENT_COLORS = {
  manufacturing: { bg: '#3b82f6', label: 'Mfg' },
  shipping: { bg: '#10b981', label: 'Ship' },
  customs: { bg: '#f59e0b', label: 'Customs' },
};

const URGENCY_ROW_COLORS: Record<string, string> = {
  critical: 'bg-red-500/5',
  high: 'bg-amber-500/5',
  normal: '',
  low: '',
};

interface DashboardGanttProps {
  className?: string;
}

export function DashboardOrderTimelineGantt({ className }: DashboardGanttProps) {
  const [orders, setOrders] = useState<TimelineOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/v1/recommended-orders?pageSize=30&status=pending');
        const json = await res.json();
        if (json.success && json.data?.orders) {
          setOrders(json.data.orders);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Compute date range
  const { startDate, endDate, totalDays } = useMemo(() => {
    if (orders.length === 0) {
      const now = new Date();
      return { startDate: now, endDate: addDays(now, 180), totalDays: 180 };
    }
    let minDate = new Date();
    let maxDate = addDays(new Date(), 30);
    for (const order of orders) {
      const trigger = new Date(order.orderTrigger);
      const delivery = new Date(order.expectedDeliveryDate);
      if (trigger < minDate) minDate = trigger;
      if (delivery > maxDate) maxDate = delivery;
    }
    // Add padding
    minDate = addDays(minDate, -15);
    maxDate = addDays(maxDate, 15);
    const total = differenceInDays(maxDate, minDate);
    return { startDate: minDate, endDate: maxDate, totalDays: Math.max(total, 30) };
  }, [orders]);

  const filteredOrders = urgencyFilter === 'all'
    ? orders
    : orders.filter((o) => o.urgency === urgencyFilter);

  const todayOffset = differenceInDays(new Date(), startDate);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No pending orders to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Order Timeline
            <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
              {filteredOrders.length} orders
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {['all', 'critical', 'high', 'normal'].map((u) => (
                <Button
                  key={u}
                  variant={urgencyFilter === u ? 'default' : 'ghost'}
                  size="sm"
                  className="text-[10px] h-6 px-2"
                  onClick={() => setUrgencyFilter(u)}
                >
                  {u === 'all' ? 'All' : u.charAt(0).toUpperCase() + u.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {/* Month headers */}
          <div className="flex border-b border-border">
            <div className="w-[200px] shrink-0 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              Product
            </div>
            <div className="flex-1 relative h-6 min-w-[600px]">
              {Array.from({ length: Math.ceil(totalDays / 30) }).map((_, i) => {
                const monthStart = addDays(startDate, i * 30);
                const offset = differenceInDays(monthStart, startDate);
                const leftPct = (offset / totalDays) * 100;
                if (leftPct > 100) return null;
                return (
                  <span
                    key={i}
                    className="absolute top-0 text-[10px] text-muted-foreground"
                    style={{ left: `${leftPct}%` }}
                  >
                    {format(monthStart, 'MMM')}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Order rows */}
          {filteredOrders.map((order, i) => {
            const triggerDate = new Date(order.orderTrigger);
            const deliveryDate = new Date(order.expectedDeliveryDate);
            const triggerOffset = differenceInDays(triggerDate, startDate);
            const deliveryOffset = differenceInDays(deliveryDate, startDate);
            const totalLT = order.totalLeadTime || 90;

            // Segment proportions (typical BD supply chain)
            const mfgDays = Math.round(totalLT * 0.45);
            const shipDays = Math.round(totalLT * 0.35);
            const customsDays = totalLT - mfgDays - shipDays;

            const triggerPct = (triggerOffset / totalDays) * 100;
            const deliveryPct = (deliveryOffset / totalDays) * 100;
            const barWidth = deliveryPct - triggerPct;

            const mfgPct = barWidth * (mfgDays / totalLT);
            const shipPct = barWidth * (shipDays / totalLT);
            const customsPct = barWidth * (customsDays / totalLT);

            return (
              <div
                key={order.id}
                className={cn(
                  'flex border-b border-border hover:bg-muted/20 transition-colors',
                  URGENCY_ROW_COLORS[order.urgency],
                )}
              >
                {/* Product info */}
                <div className="w-[200px] shrink-0 px-3 py-2">
                  <p className="text-xs font-medium truncate">{order.product.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-[10px] text-muted-foreground">{order.product.sku}</span>
                    {order.urgency === 'critical' && (
                      <Badge variant="destructive" className="text-[8px] px-1 h-3">CRIT</Badge>
                    )}
                    {order.urgency === 'high' && (
                      <Badge className="text-[8px] px-1 h-3 bg-amber-500/10 text-amber-600">HIGH</Badge>
                    )}
                    {order.cnyRisk && (
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    )}
                    {order.shipmentMode === 'air' ? (
                      <Plane className="h-3 w-3 text-sky-500" />
                    ) : (
                      <Ship className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Gantt bar area */}
                <div className="flex-1 relative h-10 min-w-[600px]">
                  {/* Manufacturing segment */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.03, duration: 0.4 }}
                    className="absolute top-2 h-6 rounded-l-sm"
                    style={{
                      left: `${triggerPct}%`,
                      width: `${mfgPct}%`,
                      backgroundColor: SEGMENT_COLORS.manufacturing.bg,
                      transformOrigin: 'left',
                    }}
                    title={`Mfg: ${mfgDays}d`}
                  />

                  {/* Shipping segment */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.03 + 0.1, duration: 0.4 }}
                    className="absolute top-2 h-6"
                    style={{
                      left: `${triggerPct + mfgPct}%`,
                      width: `${shipPct}%`,
                      backgroundColor: SEGMENT_COLORS.shipping.bg,
                      transformOrigin: 'left',
                    }}
                    title={`Ship: ${shipDays}d`}
                  />

                  {/* Customs segment */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.03 + 0.2, duration: 0.4 }}
                    className="absolute top-2 h-6 rounded-r-sm"
                    style={{
                      left: `${triggerPct + mfgPct + shipPct}%`,
                      width: `${customsPct}%`,
                      backgroundColor: SEGMENT_COLORS.customs.bg,
                      transformOrigin: 'left',
                    }}
                    title={`Customs: ${customsDays}d`}
                  />

                  {/* Order trigger marker ▼ */}
                  <div
                    className="absolute top-0 text-[10px] text-red-500"
                    style={{ left: `${triggerPct}%` }}
                    title={`Order: ${format(triggerDate, 'MMM d')}`}
                  >
                    ▼
                  </div>

                  {/* Available date marker ✓ */}
                  <div
                    className="absolute bottom-0 text-[10px] text-emerald-500"
                    style={{ left: `${deliveryPct}%` }}
                    title={`Available: ${format(deliveryDate, 'MMM d')}`}
                  >
                    ✓
                  </div>
                </div>
              </div>
            );
          })}

          {/* Today line */}
          {todayOffset > 0 && todayOffset < totalDays && (
            <div
              className="absolute top-0 bottom-0 w-px border-l border-dashed border-gray-400 z-10 pointer-events-none"
              style={{ left: `calc(200px + ${(todayOffset / totalDays) * 100}% * (1 - 200px / 100%))` }}
            />
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: SEGMENT_COLORS.manufacturing.bg }} />
              Manufacturing
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: SEGMENT_COLORS.shipping.bg }} />
              Shipping
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: SEGMENT_COLORS.customs.bg }} />
              Customs
            </span>
            <span className="text-red-500">▼ Trigger</span>
            <span className="text-emerald-500">✓ Available</span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              CNY Risk
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
