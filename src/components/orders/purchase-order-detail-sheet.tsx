'use client';

// ============================================
// TrimedCast - Purchase Order Detail Sheet
// Session 19: Purchase Order Management Dashboard
// Slide-out panel with PO details, timeline
// stepper, items table, and status actions
// ============================================

import React from 'react';
import {
  FileText,
  Send,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  Flag,
  Calendar,
  Clock,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PurchaseOrder, POStatus } from './types';
import { PO_STATUS_CONFIG, getNextStatusOptions, getCNYStrategyLabel } from './types';

// --- Props ---
interface PurchaseOrderDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder | null;
  onUpdateStatus: (id: string, newStatus: POStatus) => void;
}

// --- Date Formatter ---
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}

// --- Timeline Steps ---
const TIMELINE_STEPS: POStatus[] = ['draft', 'submitted', 'confirmed', 'in_transit', 'received'];

function TimelineStepper({ currentStatus }: { currentStatus: POStatus }) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <XCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-600 dark:text-red-400 font-medium">Order Cancelled</span>
      </div>
    );
  }

  const currentIndex = TIMELINE_STEPS.indexOf(currentStatus);

  return (
    <div className="flex items-center justify-between gap-1 py-3">
      {TIMELINE_STEPS.map((step, index) => {
        const config = PO_STATUS_CONFIG[step];
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <React.Fragment key={step}>
            {/* Step Dot + Label */}
            <div className="flex flex-col items-center gap-1 min-w-[50px]">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCurrent
                      ? 'bg-primary border-primary text-primary-foreground animate-pulse'
                      : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>
              <span className={`text-[9px] text-center leading-tight ${
                isCurrent ? 'font-semibold text-foreground' : isPending ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {config.label}
              </span>
            </div>

            {/* Connecting Line */}
            {index < TIMELINE_STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mt-[-12px]">
                <div className={`h-full rounded-full ${
                  isCompleted ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                }`} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// --- Status Icon ---
function StatusIcon({ status }: { status: POStatus }) {
  switch (status) {
    case 'draft': return <FileText className="h-3 w-3" />;
    case 'submitted': return <Send className="h-3 w-3" />;
    case 'confirmed': return <CheckCircle2 className="h-3 w-3" />;
    case 'in_transit': return <Truck className="h-3 w-3" />;
    case 'received': return <PackageCheck className="h-3 w-3" />;
    case 'cancelled': return <XCircle className="h-3 w-3" />;
  }
}

// --- Main Component ---
export function PurchaseOrderDetailSheet({
  open,
  onOpenChange,
  order,
  onUpdateStatus,
}: PurchaseOrderDetailSheetProps) {
  if (!order) return null;

  const config = PO_STATUS_CONFIG[order.status];
  const nextOptions = getNextStatusOptions(order.status);

  const statusColorClasses: Record<string, string> = {
    slate: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400',
    blue: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
    indigo: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    red: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono">{order.po_number}</span>
            <Badge variant="outline" className={`text-[10px] gap-1 ${statusColorClasses[config.color] ?? ''}`}>
              <StatusIcon status={order.status} />
              {config.label}
            </Badge>
          </SheetTitle>
          <SheetDescription className="text-xs">
            {config.labelBn}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-5 pb-6">
          {/* Timeline Stepper */}
          <TimelineStepper currentStatus={order.status} />

          <Separator />

          {/* Order Info */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Order Information
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div><span className="text-muted-foreground">Order Date:</span></div>
              <div className="font-medium">{formatDate(order.order_date)}</div>

              <div><span className="text-muted-foreground">Expected Delivery:</span></div>
              <div className="font-medium">{formatDate(order.expected_delivery)}</div>

              <div><span className="text-muted-foreground">Lead Time:</span></div>
              <div className="font-medium font-mono">{order.lead_time_days ?? '-'} days</div>

              <div><span className="text-muted-foreground">Items:</span></div>
              <div className="font-medium font-mono">{order.items.length}</div>
            </div>
          </div>

          <Separator />

          {/* CNY Risk Banner */}
          {order.cny_risk && (
            <>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-1">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    Chinese New Year Risk
                  </span>
                </div>
                <p className="text-xs text-red-600/80 dark:text-red-400/80">
                  This order is affected by CNY factory shutdown. Strategy may involve early ordering or alternative shipping.
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Supplier Info */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Supplier
            </h3>
            {order.supplier ? (
              <div className="text-xs space-y-1">
                <p className="font-medium">{order.supplier.name}</p>
                <p className="text-muted-foreground">{order.supplier.country}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No supplier assigned</p>
            )}
          </div>

          <Separator />

          {/* Items Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <FileText className="h-3 w-3" /> Order Items
            </h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">SKU</TableHead>
                    <TableHead className="text-[10px]">Product</TableHead>
                    <TableHead className="text-[10px] text-right">Qty</TableHead>
                    <TableHead className="text-[10px] text-right">Unit Cost</TableHead>
                    <TableHead className="text-[10px] text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-[10px]">{item.sku_code ?? '-'}</TableCell>
                      <TableCell className="text-[10px] max-w-[120px] truncate">{item.product_name ?? '-'}</TableCell>
                      <TableCell className="text-[10px] text-right font-mono">{item.quantity}</TableCell>
                      <TableCell className="text-[10px] text-right font-mono">{'\u09F3'}{item.unitCost.toLocaleString()}</TableCell>
                      <TableCell className="text-[10px] text-right font-mono font-medium">
                        {'\u09F3'}{(item.quantity * item.unitCost).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator />

          {/* Total Amount */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
            <span className="text-sm font-medium">Total Amount</span>
            <span className="text-xl font-bold font-mono">
              {order.total_amount != null ? `\u09F3${order.total_amount.toLocaleString()}` : '-'}
            </span>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3 w-3" /> Actions
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {nextOptions.map((opt) => (
                <Button
                  key={opt.status}
                  size="sm"
                  className="gap-1"
                  variant={opt.status === 'cancelled' ? 'destructive' : 'default'}
                  onClick={() => onUpdateStatus(order.id, opt.status)}
                >
                  {opt.status === 'cancelled' ? (
                    <XCircle className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRightIcon />
                  )}
                  {opt.status === 'cancelled' ? 'Cancel Order' : opt.label}
                </Button>
              ))}
              {nextOptions.length === 0 && order.status !== 'cancelled' && (
                <p className="text-xs text-muted-foreground">No further actions available</p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Small chevron helper
function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
  );
}
