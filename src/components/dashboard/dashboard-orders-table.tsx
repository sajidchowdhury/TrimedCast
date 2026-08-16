'use client';

// ============================================
// Dashboard Recommended Orders Table
// Fetches from /api/v1/recommended-orders with filters
// Filtering by season, urgency, model
// Convert to PO action button
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShoppingCart,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Zap,
  Clock,
  Package,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RecommendedOrderRow {
  id: string;
  product: { id: string; name: string; sku: string };
  quantity: number;
  suggestedQty: number;
  orderTrigger: string;
  urgency: string;
  priority: string;
  status: string;
  cnyRisk: boolean;
  shipmentMode: string;
  totalLeadTime: number;
  expectedDeliveryDate: string;
  totalCost: number;
  season: string;
}

interface OrdersResponse {
  orders: RecommendedOrderRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

type UrgencyFilter = 'all' | 'critical' | 'high' | 'normal' | 'low';
type SeasonFilter = 'all' | 'winter' | 'summer' | 'monsoon' | 'pre_winter';
type StatusFilter = 'all' | 'pending' | 'converted' | 'skipped';

const URGENCY_STYLES: Record<string, { color: string; bg: string }> = {
  critical: { color: 'text-red-600', bg: 'bg-red-500/10' },
  high: { color: 'text-amber-600', bg: 'bg-amber-500/10' },
  normal: { color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  low: { color: 'text-muted-foreground', bg: 'bg-muted' },
};

const STATUS_STYLES: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { color: 'text-amber-600', icon: Clock },
  converted: { color: 'text-emerald-600', icon: CheckCircle2 },
  skipped: { color: 'text-muted-foreground', icon: XCircle },
};

interface DashboardOrdersTableProps {
  className?: string;
}

export function DashboardOrdersTable({ className }: DashboardOrdersTableProps) {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [page, setPage] = useState(1);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '15');
      if (urgencyFilter !== 'all') params.set('urgency', urgencyFilter);
      if (seasonFilter !== 'all') params.set('season', seasonFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/v1/recommended-orders?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, urgencyFilter, seasonFilter, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleConvertToPO = async (orderId: string) => {
    setConverting(orderId);
    try {
      const res = await fetch(`/api/v1/recommended-orders/${orderId}/convert-to-po`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Order converted to Purchase Order');
        fetchOrders();
      } else {
        toast.error(json.errors?.[0]?.message || 'Failed to convert');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setConverting(null);
    }
  };

  const orders = data?.orders || [];
  const pagination = data?.pagination;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-amber-500" />
            Recommended Orders
            {pagination && (
              <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                {pagination.total} total
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Urgency filter */}
            <Select value={urgencyFilter} onValueChange={(v: any) => { setUrgencyFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[110px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            {/* Season filter */}
            <Select value={seasonFilter} onValueChange={(v: any) => { setSeasonFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[120px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Seasons</SelectItem>
                <SelectItem value="winter">Winter</SelectItem>
                <SelectItem value="summer">Summer</SelectItem>
                <SelectItem value="monsoon">Monsoon</SelectItem>
                <SelectItem value="pre_winter">Pre-Winter</SelectItem>
              </SelectContent>
            </Select>
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[110px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchOrders} disabled={loading}>
              <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading && (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="p-8 text-center">
            <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No recommended orders found</p>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-xs">Qty</TableHead>
                    <TableHead className="text-xs">Trigger Date</TableHead>
                    <TableHead className="text-xs">Lead Time</TableHead>
                    <TableHead className="text-xs">Delivery</TableHead>
                    <TableHead className="text-xs">Cost (BDT)</TableHead>
                    <TableHead className="text-xs">Urgency</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs w-[80px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order, i) => {
                    const urgencyStyle = URGENCY_STYLES[order.urgency] || URGENCY_STYLES.normal;
                    const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
                    const StatusIcon = statusStyle.icon;

                    return (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.15 }}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="text-xs">
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[180px]">{order.product.name}</p>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-muted-foreground">{order.product.sku}</span>
                              {order.cnyRisk && (
                                <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                              )}
                              {order.shipmentMode === 'air' && (
                                <Badge className="text-[8px] px-1 h-3 bg-sky-500/10 text-sky-600">AIR</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium tabular-nums">
                          {order.suggestedQty?.toLocaleString() || order.quantity?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {order.orderTrigger ? format(new Date(order.orderTrigger), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {order.totalLeadTime}d
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {order.expectedDeliveryDate ? format(new Date(order.expectedDeliveryDate), 'MMM d') : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-medium tabular-nums">
                          {order.totalCost ? `৳${order.totalCost.toLocaleString('en-IN')}` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-[10px] px-1.5 h-4 capitalize', urgencyStyle.bg, urgencyStyle.color, 'border-0')}>
                            {order.urgency}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <StatusIcon className={cn('h-3 w-3', statusStyle.color)} />
                            <span className={cn('text-[10px] capitalize', statusStyle.color)}>{order.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] h-6 px-2"
                              onClick={() => handleConvertToPO(order.id)}
                              disabled={converting === order.id}
                            >
                              {converting === order.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  Convert
                                  <ArrowRight className="h-3 w-3 ml-0.5" />
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
