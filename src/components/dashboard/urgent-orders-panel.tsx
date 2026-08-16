'use client';

// ============================================
// Urgent Orders Panel — Critical/High urgency orders
// Top 5 urgent recommended orders with quick actions
// ============================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Zap, ArrowRight, Clock } from 'lucide-react';
import { type UrgentOrder } from '@/lib/dashboard/store';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface UrgentOrdersPanelProps {
  orders: UrgentOrder[];
  className?: string;
}

const URGENCY_STYLES: Record<string, { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  critical: { color: 'text-red-600', bg: 'bg-red-500/10 border-red-200 dark:border-red-900/50', icon: Zap },
  high: { color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-200 dark:border-amber-900/50', icon: AlertTriangle },
};

export function UrgentOrdersPanel({ orders, className }: UrgentOrdersPanelProps) {
  if (orders.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-500" />
            Urgent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 py-6 text-center justify-center">
            <p className="text-sm text-muted-foreground">No urgent orders — inventory is healthy</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-red-500" />
            Urgent Orders
          </CardTitle>
          <Badge variant="destructive" className="text-[10px] px-1.5 h-4">
            {orders.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {orders.map((order, i) => {
          const style = URGENCY_STYLES[order.urgency] || URGENCY_STYLES.high;
          const UrgencyIcon = style.icon;

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className={cn(
                'flex items-center justify-between p-2.5 rounded-lg border',
                style.bg,
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UrgencyIcon className={cn('h-4 w-4 shrink-0', style.color)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{order.product_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{order.sku_code}</span>
                    <span>•</span>
                    <span>Qty: {order.recommended_qty.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(order.order_trigger_date), 'MMM d')}</span>
                </div>
                <Badge
                  variant={order.urgency === 'critical' ? 'destructive' : 'secondary'}
                  className="text-[10px] px-1 h-4 capitalize"
                >
                  {order.urgency}
                </Badge>
              </div>
            </motion.div>
          );
        })}

        <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => {}}>
          View All Recommended Orders
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
