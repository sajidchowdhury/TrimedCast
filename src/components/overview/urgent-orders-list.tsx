'use client';

// ============================================
// TrimedCast — Urgent Orders List
// Session 20: Control Tower Dashboard
// ============================================

import { motion } from 'framer-motion';
import { AlertTriangle, ChevronRight, Calendar, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UrgentOrder } from './types';
import { format } from 'date-fns';

interface UrgentOrdersListProps {
  orders: UrgentOrder[];
}

const urgencyConfig: Record<string, { label: string; variant: 'destructive' | 'outline'; className: string; pulse?: boolean }> = {
  critical: { label: 'CRITICAL', variant: 'destructive', className: 'bg-red-500/10 text-red-700 border-red-500/20', pulse: true },
  high: { label: 'HIGH', variant: 'outline', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  normal: { label: 'NORMAL', variant: 'outline', className: 'bg-sky-500/10 text-sky-700 border-sky-500/20' },
  low: { label: 'LOW', variant: 'outline', className: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
};

export function UrgentOrdersList({ orders }: UrgentOrdersListProps) {
  const criticalCount = orders.filter((o) => o.urgency === 'critical').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            </div>
            Urgent Orders
            {orders.length > 0 && (
              <Badge variant="outline" className="text-xs py-0 px-1.5 bg-amber-500/10 text-amber-700 border-amber-500/20">
                {orders.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-emerald-500/10 mb-3">
                <AlertTriangle className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-emerald-600">All Clear</p>
              <p className="text-xs text-muted-foreground mt-1">No urgent orders pending</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {orders.slice(0, 5).map((order, i) => {
                const config = urgencyConfig[order.urgency] || urgencyConfig.normal;
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">{order.product_name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1 shrink-0 ${config.className} ${config.pulse ? 'animate-pulse' : ''}`}
                        >
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {order.sku_code}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(order.order_trigger_date), 'MMM d')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold">{order.recommended_qty}</p>
                      <p className="text-[10px] text-muted-foreground">units</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {orders.length > 5 && (
            <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground">
              View All ({orders.length}) <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          )}

          {criticalCount > 0 && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-600 font-medium">
                {criticalCount} critical order{criticalCount > 1 ? 's' : ''} need immediate attention
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
