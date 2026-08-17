'use client';

// ============================================
// TrimedCast - Purchase Order Table
// Session 19: Purchase Order Management Dashboard
// Responsive table with status filters, search,
// status badges, and action dropdown
// ============================================

import React from 'react';
import {
  FileText,
  Send,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  Search,
  MoreHorizontal,
  Eye,
  Flag,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PurchaseOrder, POStatus } from './types';
import { PO_STATUS_CONFIG, getNextStatusOptions } from './types';

// --- Props ---
interface PurchaseOrderTableProps {
  orders: PurchaseOrder[];
  searchQuery: string;
  statusFilter: string;
  cnyRiskFilter: boolean;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (status: string) => void;
  onCnyRiskFilterChange: (cnyRisk: boolean) => void;
  onViewDetail: (order: PurchaseOrder) => void;
  onUpdateStatus: (id: string, newStatus: POStatus) => void;
  totalByStatus: Record<string, number>;
}

// --- Status Icon Helper ---
function StatusIcon({ status }: { status: POStatus }) {
  const config = PO_STATUS_CONFIG[status];
  switch (config.icon) {
    case 'FileText': return <FileText className="h-3 w-3" />;
    case 'Send': return <Send className="h-3 w-3" />;
    case 'CheckCircle2': return <CheckCircle2 className="h-3 w-3" />;
    case 'Truck': return <Truck className="h-3 w-3" />;
    case 'PackageCheck': return <PackageCheck className="h-3 w-3" />;
    case 'XCircle': return <XCircle className="h-3 w-3" />;
    default: return null;
  }
}

// --- Status Badge ---
function StatusBadge({ status }: { status: POStatus }) {
  const config = PO_STATUS_CONFIG[status];

  const colorClasses: Record<string, string> = {
    slate: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400',
    blue: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
    indigo: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    red: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
  };

  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${colorClasses[config.color] ?? ''}`}>
      <StatusIcon status={status} />
      {config.label}
    </Badge>
  );
}

// --- Action Label Helper ---
function getActionLabel(status: POStatus): string {
  switch (status) {
    case 'submitted': return 'Submit';
    case 'confirmed': return 'Confirm';
    case 'in_transit': return 'Mark In Transit';
    case 'received': return 'Mark Received';
    case 'cancelled': return 'Cancel';
    default: return status;
  }
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

// --- Main Component ---
export function PurchaseOrderTable({
  orders,
  searchQuery,
  statusFilter,
  cnyRiskFilter,
  onSearchChange,
  onStatusFilterChange,
  onCnyRiskFilterChange,
  onViewDetail,
  onUpdateStatus,
  totalByStatus,
}: PurchaseOrderTableProps) {
  const statusTabs = [
    { value: '', label: 'All', count: Object.values(totalByStatus).reduce((a, b) => a + b, 0) },
    { value: 'draft', label: 'Draft', count: totalByStatus['draft'] ?? 0 },
    { value: 'submitted', label: 'Submitted', count: totalByStatus['submitted'] ?? 0 },
    { value: 'confirmed', label: 'Confirmed', count: totalByStatus['confirmed'] ?? 0 },
    { value: 'in_transit', label: 'In Transit', count: totalByStatus['in_transit'] ?? 0 },
    { value: 'received', label: 'Received', count: totalByStatus['received'] ?? 0 },
    { value: 'cancelled', label: 'Cancelled', count: totalByStatus['cancelled'] ?? 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Search + CNY Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by PO number, supplier, product..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 border rounded-md px-2.5 py-1">
          <Switch
            checked={cnyRiskFilter}
            onCheckedChange={onCnyRiskFilterChange}
            className="scale-75 origin-left"
            id="cny-risk-filter"
          />
          <Label htmlFor="cny-risk-filter" className="text-xs cursor-pointer whitespace-nowrap gap-1 flex items-center">
            <Flag className="h-3 w-3 text-red-500" />
            CNY Risk
          </Label>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {statusTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onStatusFilterChange(tab.value)}
          >
            {tab.label}
            <span className="ml-0.5 text-[10px] opacity-70">({tab.count})</span>
          </Button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {orders.length} order{orders.length !== 1 ? 's' : ''} found
      </p>

      {orders.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">PO #</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total (BDT)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CNY</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() => onViewDetail(order)}
                  >
                    <TableCell className="font-mono text-xs font-medium">
                      {order.po_number}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(order.order_date)}</TableCell>
                    <TableCell className="text-xs">
                      {order.supplier?.name ?? '-'}
                      {order.supplier && (
                        <span className="text-muted-foreground ml-1">({order.supplier.country})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs">{order.items.length}</TableCell>
                    <TableCell className="text-right text-xs font-mono font-medium">
                      {order.total_amount != null ? `\u09F3${order.total_amount.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      {order.cny_risk ? (
                        <Badge className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20 gap-1">
                          <Flag className="h-3 w-3" />
                          CNY
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(order.expected_delivery)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetail(order); }}>
                            <Eye className="h-3.5 w-3.5 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {getNextStatusOptions(order.status).map((opt) => (
                            <DropdownMenuItem
                              key={opt.status}
                              onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, opt.status); }}
                              className={opt.status === 'cancelled' ? 'text-red-600 focus:text-red-600' : ''}
                            >
                              <ChevronRight className="h-3.5 w-3.5 mr-2" />
                              {getActionLabel(opt.status)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile/Tablet Card Layout */}
          <div className="lg:hidden space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border rounded-lg p-3 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onViewDetail(order)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-mono">{order.po_number}</p>
                    <p className="text-[10px] text-muted-foreground">{order.supplier?.name ?? 'No supplier'}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={order.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetail(order); }}>
                          <Eye className="h-3.5 w-3.5 mr-2" />View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {getNextStatusOptions(order.status).map((opt) => (
                          <DropdownMenuItem
                            key={opt.status}
                            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, opt.status); }}
                            className={opt.status === 'cancelled' ? 'text-red-600 focus:text-red-600' : ''}
                          >
                            <ChevronRight className="h-3.5 w-3.5 mr-2" />{getActionLabel(opt.status)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {order.cny_risk && (
                    <Badge className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20 gap-1">
                      <Flag className="h-3 w-3" />CNY Risk
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDate(order.order_date)}</span>
                  {order.total_amount != null && (
                    <span className="font-mono font-medium text-foreground">
                      {'\u09F3'}{order.total_amount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">No purchase orders found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery || statusFilter || cnyRiskFilter
              ? 'No orders match your filters. Try adjusting your search or filters.'
              : 'Create your first purchase order to start managing procurement.'}
          </p>
        </div>
      )}
    </div>
  );
}
