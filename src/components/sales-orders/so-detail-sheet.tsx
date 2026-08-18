'use client';

// ============================================
// TrimedCast — Sales Order Detail Sheet
// Session 23: Sales Order Management
// ============================================

import { useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  Truck,
  Package,
  XCircle,
  Circle,
  Loader2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSalesOrderStore } from '@/stores/sales-order-store';
import type { SalesOrder, SOStatus } from './types';
import {
  SO_STATUS_CONFIG,
  SO_STATUS_ORDER,
  getChannelDisplay,
  getRegionDisplay,
  formatBDT,
} from './types';

interface SODetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SODetailSheet({ open, onOpenChange }: SODetailSheetProps) {
  const { selectedOrder, selectOrder, updateOrderStatus, cancelOrder } = useSalesOrderStore();
  const [isUpdating, setIsUpdating] = useState(false);

  const order = selectedOrder;

  function getStatusBadge(status: SOStatus) {
    const config = SO_STATUS_CONFIG[status];
    const colorMap: Record<string, string> = {
      amber: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
      sky: 'bg-sky-500/15 text-sky-600 border-sky-500/25',
      violet: 'bg-violet-500/15 text-violet-600 border-violet-500/25',
      emerald: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
      red: 'bg-red-500/15 text-red-600 border-red-500/25',
    };
    return colorMap[config.color] ?? 'bg-gray-500/15 text-gray-600 border-gray-500/25';
  }

  function getStatusIndex(status: SOStatus): number {
    if (status === 'cancelled') return -1;
    return SO_STATUS_ORDER.indexOf(status);
  }

  async function handleStatusUpdate(newStatus: SOStatus) {
    if (!order) return;
    setIsUpdating(true);
    if (newStatus === 'cancelled') {
      await cancelOrder(order.id);
    } else {
      await updateOrderStatus(order.id, newStatus);
    }
    setIsUpdating(false);
  }

  function handleClose(open: boolean) {
    if (!open) selectOrder(null);
    onOpenChange(open);
  }

  if (!order) return null;

  const ch = getChannelDisplay(order.channel);
  const reg = getRegionDisplay(order.region);
  const currentIdx = getStatusIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  // Determine valid actions
  const canConfirm = order.status === 'pending';
  const canShip = order.status === 'confirmed';
  const canDeliver = order.status === 'shipped';
  const canCancel = order.status === 'pending' || order.status === 'confirmed';

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono">{order.order_no}</span>
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0.5 ${getStatusBadge(order.status)}`}
            >
              {SO_STATUS_CONFIG[order.status].label}
              <span className="ml-1 opacity-60">{SO_STATUS_CONFIG[order.status].labelBn}</span>
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Sales order details and lifecycle tracking
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Order Timeline — Horizontal Stepper */}
          {!isCancelled && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Order Timeline
              </h4>
              <div className="flex items-center justify-between relative">
                {/* Connecting line */}
                <div className="absolute top-4 left-8 right-8 h-0.5 bg-muted" />
                <div
                  className="absolute top-4 left-8 h-0.5 bg-emerald-500 transition-all"
                  style={{
                    width: currentIdx > 0 ? `${(currentIdx / (SO_STATUS_ORDER.length - 1)) * 100}%` : '0%',
                    maxWidth: 'calc(100% - 64px)',
                  }}
                />

                {SO_STATUS_ORDER.map((status, idx) => {
                  const isCompleted = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const isFuture = idx > currentIdx;
                  const config = SO_STATUS_CONFIG[status];

                  return (
                    <div key={status} className="flex flex-col items-center relative z-10">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : isCurrent
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500 animate-pulse'
                            : 'bg-background border-muted-foreground/30 text-muted-foreground/40'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isCurrent ? (
                          <Circle className="h-4 w-4 fill-current" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] mt-1.5 font-medium ${
                          isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground/50'
                        }`}
                      >
                        {config.label}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{config.labelBn}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-sm font-medium text-red-600">Order Cancelled</div>
                <div className="text-xs text-red-500/70">এই আদেশটি বাতিল করা হয়েছে</div>
              </div>
            </div>
          )}

          <Separator />

          {/* Order Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Order Information
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <InfoItem label="Date" value={format(new Date(order.date), 'dd MMM yyyy')} />
              <InfoItem label="Customer" value={order.customer_id ?? '—'} />
              <InfoItem
                label="Channel"
                value={ch.label}
                subValue={ch.labelBn}
              />
              <InfoItem
                label="Region"
                value={reg.label}
                subValue={reg.labelBn}
              />
            </div>
          </div>

          <Separator />

          {/* Items Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Items ({order.items.length})
            </h4>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[10px] font-semibold">Product</TableHead>
                    <TableHead className="text-[10px] font-semibold text-center">Qty</TableHead>
                    <TableHead className="text-[10px] font-semibold text-right">Price</TableHead>
                    <TableHead className="text-[10px] font-semibold text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {order.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">
                          <div className="font-medium">{item.product_name ?? 'Unknown'}</div>
                          {item.sku_code && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {item.sku_code}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-center">{item.quantity}</TableCell>
                        <TableCell className="text-xs text-right">{formatBDT(item.price)}</TableCell>
                        <TableCell className="text-xs font-semibold text-right">
                          {formatBDT(item.quantity * item.price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            </div>
          </div>

          <Separator />

          {/* Grand Total */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
            <span className="text-sm font-semibold">Grand Total</span>
            <span className="text-2xl font-bold text-emerald-500">
              {formatBDT(order.total_amount)}
            </span>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Actions
            </h4>
            <div className="flex flex-wrap gap-2">
              {canConfirm && (
                <Button
                  onClick={() => handleStatusUpdate('confirmed')}
                  disabled={isUpdating}
                  className="bg-sky-500 hover:bg-sky-600 text-white text-xs"
                >
                  {isUpdating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                  Confirm Order
                </Button>
              )}
              {canShip && (
                <Button
                  onClick={() => handleStatusUpdate('shipped')}
                  disabled={isUpdating}
                  className="bg-violet-500 hover:bg-violet-600 text-white text-xs"
                >
                  {isUpdating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Truck className="h-3.5 w-3.5 mr-1" />}
                  Ship Order
                </Button>
              )}
              {canDeliver && (
                <Button
                  onClick={() => handleStatusUpdate('delivered')}
                  disabled={isUpdating}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                >
                  {isUpdating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Package className="h-3.5 w-3.5 mr-1" />}
                  Mark Delivered
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={isUpdating}
                  className="text-red-500 border-red-500/30 hover:bg-red-500/10 text-xs"
                >
                  {isUpdating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                  Cancel Order
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Helper sub-component
function InfoItem({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</div>
      <div className="text-sm font-medium">{value}</div>
      {subValue && <div className="text-[10px] text-muted-foreground">{subValue}</div>}
    </div>
  );
}
