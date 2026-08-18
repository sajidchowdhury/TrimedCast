'use client';

// ============================================
// TrimedCast - Recommended Orders Panel
// Session 19: Purchase Order Management Dashboard
// Action center for order decisions with urgency
// badges, stock gap viz, and batch actions
// ============================================

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Ship,
  Plane,
  Flag,
  Clock,
  ArrowRight,
  CheckCheck,
  Package,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { RecommendedOrder } from './types';
import { URGENCY_CONFIG, getCNYStrategyLabel } from './types';

// --- Props ---
interface RecommendedOrdersPanelProps {
  orders: RecommendedOrder[];
  urgencyFilter: string;
  statusFilter: string;
  cnyRiskFilter: boolean;
  onUrgencyFilterChange: (urgency: string) => void;
  onStatusFilterChange: (status: string) => void;
  onCnyRiskFilterChange: (cnyRisk: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onConvertToPO: (id: string) => void;
}

// --- Urgency Badge ---
function UrgencyBadge({ urgency }: { urgency: string }) {
  const config = URGENCY_CONFIG[urgency];
  if (!config) return <Badge variant="secondary" className="text-[10px]">{urgency}</Badge>;

  const colorClasses: Record<string, string> = {
    red: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    slate: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400',
  };

  return (
    <Badge
      variant="outline"
      className={`text-[10px] gap-1 ${colorClasses[config.color] ?? ''} ${config.pulse ? 'animate-pulse' : ''}`}
    >
      {config.pulse && <AlertTriangle className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

// --- Stock Gap Visualization ---
function StockGapBar({ current, reorder }: { current?: number | null; reorder?: number | null }) {
  const curr = current ?? 0;
  const rop = reorder ?? 0;
  const maxVal = Math.max(curr, rop, 1);
  const currPct = (curr / maxVal) * 100;
  const ropPct = (rop / maxVal) * 100;

  const isBelow = curr <= rop;

  return (
    <div className="w-16 space-y-0.5">
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden relative">
        <div
          className={`absolute top-0 h-full rounded-full ${isBelow ? 'bg-red-400' : 'bg-emerald-400'}`}
          style={{ width: `${currPct}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-amber-500"
          style={{ left: `${ropPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[8px] text-muted-foreground">
        <span>{curr}</span>
        <span>ROP:{rop}</span>
      </div>
    </div>
  );
}

// --- Date Formatter ---
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch {
    return '-';
  }
}

// --- Status Badge ---
function ROStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/20">Pending</Badge>;
    case 'approved':
      return <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20">Approved</Badge>;
    case 'converted':
      return <Badge variant="outline" className="text-[10px] text-sky-600 border-sky-500/20">Converted</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="text-[10px] text-red-600 border-red-500/20">Rejected</Badge>;
    case 'deferred':
      return <Badge variant="secondary" className="text-[10px]">Deferred</Badge>;
    case 'skipped':
      return <Badge variant="secondary" className="text-[10px]">Skipped</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
  }
}

// --- Main Component ---
export function RecommendedOrdersPanel({
  orders,
  urgencyFilter,
  statusFilter,
  cnyRiskFilter,
  onUrgencyFilterChange,
  onStatusFilterChange,
  onCnyRiskFilterChange,
  onApprove,
  onReject,
  onConvertToPO,
}: RecommendedOrdersPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Count by urgency (from all orders, not filtered)
  const urgencyCounts = {
    critical: orders.filter((o) => o.urgency === 'critical').length,
    high: orders.filter((o) => o.urgency === 'high').length,
    normal: orders.filter((o) => o.urgency === 'normal').length,
    low: orders.filter((o) => o.urgency === 'low').length,
  };

  const statusCounts = {
    pending: orders.filter((o) => o.status === 'pending').length,
    approved: orders.filter((o) => o.status === 'approved').length,
    converted: orders.filter((o) => o.status === 'converted').length,
    rejected: orders.filter((o) => o.status === 'rejected').length,
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const selectableIds = orders
      .filter((o) => o.status === 'pending' || o.status === 'approved')
      .map((o) => o.id);
    if (selectedIds.size === selectableIds.length && selectableIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const handleBatchApprove = () => {
    selectedIds.forEach((id) => {
      const order = orders.find((o) => o.id === id);
      if (order && order.status === 'pending') onApprove(id);
    });
    setSelectedIds(new Set());
  };

  const handleBatchConvert = () => {
    selectedIds.forEach((id) => {
      const order = orders.find((o) => o.id === id);
      if (order && order.status === 'approved') onConvertToPO(id);
    });
    setSelectedIds(new Set());
  };

  const pendingSelected = Array.from(selectedIds).filter((id) => {
    const order = orders.find((o) => o.id === id);
    return order?.status === 'pending';
  }).length;

  const approvedSelected = Array.from(selectedIds).filter((id) => {
    const order = orders.find((o) => o.id === id);
    return order?.status === 'approved';
  }).length;

  return (
    <div className="space-y-4">
      {/* Urgency Filter Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        <Button
          variant={urgencyFilter === '' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => onUrgencyFilterChange('')}
        >
          All ({orders.length})
        </Button>
        {(['critical', 'high', 'normal', 'low'] as const).map((u) => (
          <Button
            key={u}
            variant={urgencyFilter === u ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onUrgencyFilterChange(u)}
          >
            {URGENCY_CONFIG[u].label}
            <span className="text-[10px] opacity-70">({urgencyCounts[u]})</span>
          </Button>
        ))}
      </div>

      {/* Status Filter + CNY Risk */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { value: '', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'converted', label: 'Converted' },
          { value: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onStatusFilterChange(tab.value)}
          >
            {tab.label}
            {tab.value && (
              <span className="text-[10px] opacity-70">
                ({statusCounts[tab.value as keyof typeof statusCounts] ?? 0})
              </span>
            )}
          </Button>
        ))}

        <div className="flex items-center gap-1.5 border rounded-md px-2.5 py-1 ml-auto">
          <Switch
            checked={cnyRiskFilter}
            onCheckedChange={onCnyRiskFilterChange}
            className="scale-75 origin-left"
            id="ro-cny-risk-filter"
          />
          <Label htmlFor="ro-cny-risk-filter" className="text-xs cursor-pointer whitespace-nowrap gap-1 flex items-center">
            <Flag className="h-3 w-3 text-red-500" />
            CNY Risk
          </Label>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
          <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
          {pendingSelected > 0 && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBatchApprove}>
              <CheckCheck className="h-3.5 w-3.5" />
              Approve All ({pendingSelected})
            </Button>
          )}
          {approvedSelected > 0 && (
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleBatchConvert}>
              <ShoppingCart className="h-3.5 w-3.5" />
              Convert to PO ({approvedSelected})
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Results */}
      <p className="text-xs text-muted-foreground">
        {orders.length} recommended order{orders.length !== 1 ? 's' : ''}
      </p>

      {orders.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="hidden xl:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]" />
                  <TableHead>Product</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Rec. Qty</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Ship</TableHead>
                  <TableHead className="text-right">Lead</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>CNY</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const isSelectable = order.status === 'pending' || order.status === 'approved';
                  const isDimmed = order.status === 'rejected' || order.status === 'skipped' || order.status === 'deferred';

                  return (
                    <TableRow
                      key={order.id}
                      className={isDimmed ? 'opacity-50' : ''}
                    >
                      <TableCell>
                        {isSelectable && (
                          <Checkbox
                            checked={selectedIds.has(order.id)}
                            onCheckedChange={() => toggleSelect(order.id)}
                            className="h-3.5 w-3.5"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{order.product.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{order.product.sku_code}</span>
                          {order.product.motorcycle_model && (
                            <span className="text-[10px] text-muted-foreground">
                              {order.product.motorcycle_model.brand} {order.product.motorcycle_model.model}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StockGapBar current={order.current_stock} reorder={order.reorder_point} />
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">{order.recommended_qty}</TableCell>
                      <TableCell className="text-xs">{formatDate(order.order_trigger_date)}</TableCell>
                      <TableCell><UrgencyBadge urgency={order.urgency} /></TableCell>
                      <TableCell>
                        {order.shipment_mode === 'sea' ? (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Ship className="h-3 w-3" />Sea
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Plane className="h-3 w-3" />Air
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {order.total_lead_time_days ?? '-'}d
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {order.unit_cost != null ? `\u09F3${order.unit_cost.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-medium">
                        {order.total_cost != null ? `\u09F3${order.total_cost.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        {order.cny_risk ? (
                          <Badge className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20 gap-1">
                            <Flag className="h-3 w-3" />
                            {getCNYStrategyLabel(order.cny_strategy)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell><ROStatusBadge status={order.status} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {order.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] gap-0.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border-emerald-300 dark:border-emerald-600"
                                onClick={() => onApprove(order.id)}
                              >
                                <CheckCircle2 className="h-3 w-3" />Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] gap-0.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 border-red-300 dark:border-red-600"
                                onClick={() => onReject(order.id)}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {order.status === 'approved' && (
                            <Button
                              size="sm"
                              className="h-6 text-[10px] gap-1"
                              onClick={() => onConvertToPO(order.id)}
                            >
                              <ShoppingCart className="h-3 w-3" />Convert
                            </Button>
                          )}
                          {order.status === 'converted' && (
                            <Badge variant="outline" className="text-[10px] gap-1 text-sky-600 border-sky-500/20">
                              <Package className="h-3 w-3" />PO Created
                            </Badge>
                          )}
                          {(order.status === 'rejected' || order.status === 'skipped' || order.status === 'deferred') && (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Tablet/Mobile Card Layout */}
          <div className="xl:hidden space-y-3 max-h-[600px] overflow-y-auto">
            {orders.map((order) => {
              const isSelectable = order.status === 'pending' || order.status === 'approved';
              const isDimmed = order.status === 'rejected' || order.status === 'skipped' || order.status === 'deferred';

              return (
                <div
                  key={order.id}
                  className={`border rounded-lg p-3 space-y-2 ${isDimmed ? 'opacity-50' : 'hover:bg-muted/50'} transition-colors`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {isSelectable && (
                        <Checkbox
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={() => toggleSelect(order.id)}
                          className="h-3.5 w-3.5"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{order.product.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{order.product.sku_code}</p>
                      </div>
                    </div>
                    <UrgencyBadge urgency={order.urgency} />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <ROStatusBadge status={order.status} />
                    {order.shipment_mode === 'sea' ? (
                      <Badge variant="outline" className="text-[10px] gap-0.5"><Ship className="h-3 w-3" />Sea</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-0.5"><Plane className="h-3 w-3" />Air</Badge>
                    )}
                    {order.cny_risk && (
                      <Badge className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20 gap-0.5">
                        <Flag className="h-3 w-3" />CNY
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Stock:</span>{' '}
                      <span className="font-mono">{order.current_stock ?? '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rec Qty:</span>{' '}
                      <span className="font-mono font-medium">{order.recommended_qty}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>{' '}
                      <span className="font-mono font-medium">
                        {order.total_cost != null ? `\u09F3${order.total_cost.toLocaleString()}` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {order.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] gap-0.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border-emerald-300 dark:border-emerald-600"
                          onClick={() => onApprove(order.id)}
                        >
                          <CheckCircle2 className="h-3 w-3" />Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] gap-0.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 border-red-300 dark:border-red-600"
                          onClick={() => onReject(order.id)}
                        >
                          <XCircle className="h-3 w-3" />Reject
                        </Button>
                      </>
                    )}
                    {order.status === 'approved' && (
                      <Button
                        size="sm"
                        className="h-6 text-[10px] gap-1"
                        onClick={() => onConvertToPO(order.id)}
                      >
                        <ShoppingCart className="h-3 w-3" />Convert to PO
                      </Button>
                    )}
                    {order.status === 'converted' && (
                      <Badge variant="outline" className="text-[10px] gap-1 text-sky-600 border-sky-500/20">
                        <Package className="h-3 w-3" />PO Created
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-4">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">No recommended orders</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {urgencyFilter || statusFilter || cnyRiskFilter
              ? 'No orders match your filters. Try adjusting them.'
              : 'Recommended orders will appear here based on your inventory and demand forecasts.'}
          </p>
        </div>
      )}
    </div>
  );
}
