'use client';

// ============================================
// TrimedCast — Sales Order Table
// Session 23: Sales Order Management
// ============================================

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  Truck,
  Package,
  XCircle,
  Filter,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  SO_CHANNELS,
  BD_REGIONS,
  getChannelDisplay,
  getRegionDisplay,
  formatBDT,
} from './types';

interface SOTableProps {
  onViewOrder: (order: SalesOrder) => void;
}

export function SOTable({ onViewOrder }: SOTableProps) {
  const {
    statusFilter,
    channelFilter,
    regionFilter,
    searchQuery,
    setStatusFilter,
    setChannelFilter,
    setRegionFilter,
    setSearchQuery,
    filteredOrders,
    updateOrderStatus,
    cancelOrder,
  } = useSalesOrderStore();

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const orders = filteredOrders();

  // Status badge color mapping
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

  // Valid status transitions
  function getValidActions(status: SOStatus) {
    const actions: { label: string; icon: React.ElementType; action: SOStatus; show: boolean }[] = [
      { label: 'Confirm', icon: CheckCircle2, action: 'confirmed', show: status === 'pending' },
      { label: 'Ship', icon: Truck, action: 'shipped', show: status === 'confirmed' },
      { label: 'Mark Delivered', icon: Package, action: 'delivered', show: status === 'shipped' },
      { label: 'Cancel', icon: XCircle, action: 'cancelled', show: status === 'pending' || status === 'confirmed' },
    ];
    return actions.filter((a) => a.show);
  }

  const statuses: (SOStatus | 'all')[] = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  return (
    <div className="space-y-4">
      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => {
          const isActive = statusFilter === s;
          const label = s === 'all' ? 'All' : SO_STATUS_CONFIG[s].label;
          const labelBn = s === 'all' ? 'সব' : SO_STATUS_CONFIG[s].labelBn;
          return (
            <Button
              key={s}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className={`text-xs h-8 ${isActive ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
            >
              {label}
              <span className="ml-1 opacity-60 hidden sm:inline">({labelBn})</span>
            </Button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Mobile filter toggle */}
        <Button
          variant="outline"
          size="sm"
          className="sm:hidden h-9"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filters
        </Button>

        <div className={`flex gap-2 ${mobileFilterOpen ? 'flex-col sm:flex-row' : 'hidden sm:flex'}`}>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Channels</SelectItem>
              {SO_CHANNELS.map((ch) => (
                <SelectItem key={ch.value} value={ch.value}>
                  {ch.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Regions</SelectItem>
              {BD_REGIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {orders.length} order{orders.length !== 1 ? 's' : ''} found
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs font-semibold">Order #</TableHead>
              <TableHead className="text-xs font-semibold">Date</TableHead>
              <TableHead className="text-xs font-semibold">Customer</TableHead>
              <TableHead className="text-xs font-semibold">Channel</TableHead>
              <TableHead className="text-xs font-semibold">Region</TableHead>
              <TableHead className="text-xs font-semibold text-center">Items</TableHead>
              <TableHead className="text-xs font-semibold text-right">Total (BDT)</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  No sales orders found.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const ch = getChannelDisplay(order.channel);
                const reg = getRegionDisplay(order.region);
                const validActions = getValidActions(order.status);
                return (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => onViewOrder(order)}
                  >
                    <TableCell className="font-mono text-xs font-medium">{order.order_no}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(order.date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{order.customer_id ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {ch.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {reg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-center">{order.items.length}</TableCell>
                    <TableCell className="text-xs font-semibold text-right">
                      {formatBDT(order.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${getStatusBadge(order.status)}`}
                      >
                        {SO_STATUS_CONFIG[order.status].label}
                      </Badge>
                    </TableCell>
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
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => onViewOrder(order)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {validActions.length > 0 && <DropdownMenuSeparator />}
                          {validActions.map((act) => (
                            <DropdownMenuItem
                              key={act.action}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (act.action === 'cancelled') {
                                  cancelOrder(order.id);
                                } else {
                                  updateOrderStatus(order.id, act.action);
                                }
                              }}
                              className={act.action === 'cancelled' ? 'text-red-600' : ''}
                            >
                              <act.icon className="h-4 w-4 mr-2" />
                              {act.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No sales orders found.
          </div>
        ) : (
          orders.map((order) => {
            const ch = getChannelDisplay(order.channel);
            const reg = getRegionDisplay(order.region);
            const validActions = getValidActions(order.status);
            return (
              <div
                key={order.id}
                className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => onViewOrder(order)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-sm font-semibold">{order.order_no}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {order.customer_id ?? '—'}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${getStatusBadge(order.status)}`}
                  >
                    {SO_STATUS_CONFIG[order.status].label}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {ch.label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {reg.label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(order.date), 'dd MMM yyyy')} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-sm font-bold">{formatBDT(order.total_amount)}</div>
                </div>

                {validActions.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    {validActions.map((act) => (
                      <Button
                        key={act.action}
                        variant="outline"
                        size="sm"
                        className="text-[11px] h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (act.action === 'cancelled') {
                            cancelOrder(order.id);
                          } else {
                            updateOrderStatus(order.id, act.action);
                          }
                        }}
                      >
                        <act.icon className="h-3 w-3 mr-1" />
                        {act.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
