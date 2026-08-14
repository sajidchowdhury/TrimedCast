'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis,
} from '@/components/ui/pagination';
import { OrderTimeline } from './order-timeline';
import type { RecommendedOrderRow } from './recommended-orders-types';
import {
  ShieldAlert,
  ShoppingCart,
  AlertTriangle,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Loader2,
  Package,
  TrendingUp,
  Flame,
  CalendarClock,
  Clock,
  Truck,
} from 'lucide-react';

// ============================================
// Local Types
// ============================================

interface SummaryStats {
  totalProducts: number;
  totalUrgent: number;
  totalHigh: number;
  totalNormal: number;
  totalLow: number;
  cnyRiskCount: number;
  totalSuggestedSpend: number;
}

// ============================================
// Constants
// ============================================

const TENANT_ID = 'demo-bd-motors';
const PAGE_SIZE = 15;

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; border: string; order: number }> = {
  urgent: { label: 'URGENT', bg: 'bg-red-500 text-white', border: 'border-l-4 border-l-red-500', order: 0 },
  high: { label: 'HIGH', bg: 'bg-orange-500 text-white', border: 'border-l-4 border-l-orange-500', order: 1 },
  normal: { label: 'NORMAL', bg: 'bg-blue-500 text-white', border: '', order: 2 },
  low: { label: 'LOW', bg: 'bg-slate-400 text-white', border: '', order: 3 },
};

const SEASON_COLORS: Record<string, string> = {
  winter: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  summer: 'bg-amber-100 text-amber-700 border-amber-200',
  monsoon: 'bg-blue-100 text-blue-700 border-blue-200',
  pre_winter: 'bg-orange-100 text-orange-700 border-orange-200',
};

const SEASON_LABELS: Record<string, string> = {
  winter: 'Winter',
  summer: 'Summer',
  monsoon: 'Monsoon',
  pre_winter: 'Pre-Winter',
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  converted: { label: 'Converted', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
};

type SortField = 'priority' | 'orderTriggerDate' | 'suggestedQty' | 'totalLeadTime';
type SortDir = 'asc' | 'desc';

// ============================================
// Helpers
// ============================================

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatBDT(amount: number): string {
  return '৳' + amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function stockColor(current: number, reorder: number): string {
  if (current <= 0) return 'text-red-600';
  if (current < reorder * 0.5) return 'text-red-500';
  if (current < reorder) return 'text-amber-500';
  return 'text-emerald-500';
}

// ============================================
// Expanded Row Detail
// ============================================

function ExpandedOrderDetail({ order }: { order: RecommendedOrderRow }) {
  return (
    <div className="p-4 bg-slate-50/80 rounded-lg border border-slate-200/60 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: OrderTimeline visualization */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            Shipping Timeline
          </h4>
          <OrderTimeline
            orderDate={order.orderTriggerDate}
            leadTimeBreakdown={{
              manufacturing: Math.round(order.totalLeadTime * 0.58),
              shipping: Math.round(order.totalLeadTime * 0.34),
              customs: Math.round(order.totalLeadTime * 0.06),
              internal: Math.round(order.totalLeadTime * 0.02),
            }}
            shippingMethod="sea"
            cnyRisk={order.cnyRisk}
            cnyDelayDays={order.cnyRisk ? 21 : 0}
            compact
          />
        </div>

        {/* Right: Details grid */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-500" />
            Order Details
          </h4>

          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[order.status]?.className || ''}`}>
              {STATUS_BADGE[order.status]?.label || order.status}
            </Badge>
          </div>

          {/* Stock info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-white border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Current Stock</p>
              <p className={`text-lg font-bold ${stockColor(order.currentStock, order.reorderPoint)}`}>{order.currentStock}</p>
            </div>
            <div className="p-2 rounded bg-white border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Reorder Point</p>
              <p className="text-lg font-bold text-slate-800">{order.reorderPoint}</p>
            </div>
          </div>

          {/* Key dates */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-slate-600 text-xs">Order Trigger:</span>
              <span className="font-medium text-xs ml-auto">{formatDate(order.orderTriggerDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-slate-600 text-xs">Expected Delivery:</span>
              <span className="font-medium text-xs ml-auto">{formatDate(order.expectedDeliveryDate)}</span>
            </div>
          </div>

          {/* Season */}
          <Badge variant="outline" className={`text-[10px] ${SEASON_COLORS[order.season] || 'bg-slate-100 text-slate-700'}`}>
            {SEASON_LABELS[order.season] || order.season}
          </Badge>

          {/* CNY Risk */}
          {order.cnyRisk && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-red-700">CNY Risk — Order early to avoid factory shutdown delays</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function RecommendedOrdersTable() {
  // State
  const [orders, setOrders] = useState<RecommendedOrderRow[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [cnyFilter, setCnyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/triggers?tenantId=${TENANT_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: TENANT_ID, shippingMethod: 'sea', serviceLevel: 0.95 }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const triggers = json.data.triggers || [];
          const mapped: RecommendedOrderRow[] = triggers.map((t: Record<string, unknown>) => ({
            id: (t.productId as string) + '-' + (t.productSku as string),
            productId: t.productId as string,
            productSku: (t.productSku as string) || '',
            productName: (t.productName as string) || '',
            category: '',
            currentStock: (t.currentStock as number) || 0,
            reorderPoint: (t.reorderPoint as number) || 0,
            suggestedQty: (t.suggestedOrderQty as number) || 0,
            orderTriggerDate: (t.orderTriggerDate as string) || '',
            expectedDeliveryDate: (t.expectedDeliveryDate as string) || '',
            totalLeadTime: (t.totalLeadTimeDays as number) || 0,
            priority: (t.priority as string) || 'normal',
            cnyRisk: (t.cnyRisk as boolean) || false,
            season: (t.currentSeason as string) || '',
            status: 'pending' as const,
            orderTrigger: (t.orderTrigger as string) || '',
          }));
          setOrders(mapped);
          if (json.data.summary) {
            setSummary(json.data.summary as SummaryStats);
          }
        }
      }
    } catch {
      // Silently fail - empty state will show
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Convert to PO
  const handleConvert = useCallback(async (order: RecommendedOrderRow) => {
    setConvertingId(order.id);
    try {
      const res = await fetch('/api/orders/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: TENANT_ID, recommendedOrderId: order.id }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'converted' as const } : o));
        }
      }
    } catch {
      // Silently fail
    } finally {
      setConvertingId(null);
    }
  }, []);

  // Toggle sort
  const handleSort = useCallback((field: SortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  // Filtered + sorted data
  const filtered = useMemo(() => {
    let data = [...orders];
    if (priorityFilter !== 'all') data = data.filter(o => o.priority === priorityFilter);
    if (seasonFilter !== 'all') data = data.filter(o => o.season === seasonFilter);
    if (cnyFilter === 'risk') data = data.filter(o => o.cnyRisk);
    else if (cnyFilter === 'no_risk') data = data.filter(o => !o.cnyRisk);
    if (statusFilter !== 'all') data = data.filter(o => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(o => o.productSku.toLowerCase().includes(q) || o.productName.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'priority':
          cmp = (PRIORITY_CONFIG[a.priority]?.order ?? 2) - (PRIORITY_CONFIG[b.priority]?.order ?? 2);
          break;
        case 'orderTriggerDate':
          cmp = a.orderTriggerDate.localeCompare(b.orderTriggerDate);
          break;
        case 'suggestedQty':
          cmp = a.suggestedQty - b.suggestedQty;
          break;
        case 'totalLeadTime':
          cmp = a.totalLeadTime - b.totalLeadTime;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [orders, priorityFilter, seasonFilter, cnyFilter, statusFilter, search, sortField, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const paginationRange = useMemo(() => {
    const range: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      if (safePage > 3) range.push('ellipsis');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) range.push(i);
      if (safePage < totalPages - 2) range.push('ellipsis');
      range.push(totalPages);
    }
    return range;
  }, [totalPages, safePage]);

  // Computed summary from filtered
  const filteredSummary = useMemo(() => {
    const totalUrgent = filtered.filter(o => o.priority === 'urgent').length;
    const totalHigh = filtered.filter(o => o.priority === 'high').length;
    const cnyRiskCount = filtered.filter(o => o.cnyRisk).length;
    return { total: filtered.length, totalUrgent, totalHigh, cnyRiskCount };
  }, [filtered]);

  // Sort icon helper
  function SortIcon({ field }: { field: SortField }) {
    const isActive = sortField === field;
    return (
      <ArrowUpDown className={`h-3 w-3 inline ml-1 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
    );
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-4">
      {/* ========== Summary Stats Row ========== */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-white shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Package className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Total Orders</p>
              <p className="text-lg font-bold text-slate-800">{filteredSummary.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <Flame className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Urgent</p>
              <p className="text-lg font-bold text-red-600">{filteredSummary.totalUrgent}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">High</p>
              <p className="text-lg font-bold text-orange-600">{filteredSummary.totalHigh}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Suggested Spend</p>
              <p className="text-lg font-bold text-emerald-700">
                {summary ? formatBDT(summary.totalSuggestedSpend) : '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">CNY Risk</p>
              <p className="text-lg font-bold text-red-600">{filteredSummary.cnyRiskCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========== Filter Bar ========== */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger size="sm" className="w-[130px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={seasonFilter} onValueChange={setSeasonFilter}>
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue placeholder="Season" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            <SelectItem value="winter">Winter</SelectItem>
            <SelectItem value="summer">Summer</SelectItem>
            <SelectItem value="monsoon">Monsoon</SelectItem>
            <SelectItem value="pre_winter">Pre-Winter</SelectItem>
          </SelectContent>
        </Select>

        <Select value={cnyFilter} onValueChange={setCnyFilter}>
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue placeholder="CNY Risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All CNY Risk</SelectItem>
            <SelectItem value="risk">CNY Risk Only</SelectItem>
            <SelectItem value="no_risk">No CNY Risk</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger size="sm" className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px] max-w-[300px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search SKU or product..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="h-8 pl-8 text-sm"
          />
        </div>

        {filtered.length !== orders.length && (
          <Badge variant="outline" className="text-xs text-slate-500">
            {filtered.length} of {orders.length} orders
          </Badge>
        )}
      </div>

      {/* ========== Loading State ========== */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Calculating order triggers for all products...</span>
        </div>
      )}

      {/* ========== Empty State ========== */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {orders.length === 0
              ? 'No recommended orders found. Import sales data and generate forecasts first.'
              : 'No orders match the current filters.'}
          </p>
        </div>
      )}

      {/* ========== Desktop Table View ========== */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Desktop: Table */}
          <div className="hidden md:block rounded-lg border border-slate-200 bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="w-8" />
                  <TableHead className="w-24">
                    <button className="inline-flex items-center" onClick={() => handleSort('priority')}>
                      Priority <SortIcon field="priority" />
                    </button>
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden lg:table-cell">Category</TableHead>
                  <TableHead>Stock / ROP</TableHead>
                  <TableHead>
                    <button className="inline-flex items-center" onClick={() => handleSort('suggestedQty')}>
                      Suggested Qty <SortIcon field="suggestedQty" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
                    <button className="inline-flex items-center" onClick={() => handleSort('orderTriggerDate')}>
                      Order Date <SortIcon field="orderTriggerDate" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">Delivery</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <button className="inline-flex items-center" onClick={() => handleSort('totalLeadTime')}>
                      Lead Time <SortIcon field="totalLeadTime" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">CNY</TableHead>
                  <TableHead className="hidden xl:table-cell">Season</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence initial={false}>
                  {paged.map(order => {
                    const isExpanded = expandedRow === order.id;
                    const pCfg = PRIORITY_CONFIG[order.priority] || PRIORITY_CONFIG.normal;
                    const isConverting = convertingId === order.id;

                    return (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className={`group cursor-pointer ${pCfg.border} ${
                          isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                        }`}
                        onClick={() => setExpandedRow(isExpanded ? null : order.id)}
                      >
                        {/* Expand toggle */}
                        <TableCell className="w-8" onClick={e => e.stopPropagation()}>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </TableCell>

                        {/* Priority */}
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Badge className={pCfg.bg}>{pCfg.label}</Badge>
                        </TableCell>

                        {/* Product SKU + Name */}
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div>
                            <p className="font-medium text-sm text-slate-800 truncate max-w-[200px]">{order.productName}</p>
                            <p className="text-xs text-slate-500">{order.productSku}</p>
                          </div>
                        </TableCell>

                        {/* Category */}
                        <TableCell className="hidden lg:table-cell" onClick={e => e.stopPropagation()}>
                          <span className="text-xs text-slate-600">{order.category || '—'}</span>
                        </TableCell>

                        {/* Stock / ROP */}
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-semibold text-sm ${stockColor(order.currentStock, order.reorderPoint)}`}>
                              {order.currentStock}
                            </span>
                            <span className="text-slate-400 text-xs">/</span>
                            <span className="text-xs text-slate-500">{order.reorderPoint}</span>
                          </div>
                        </TableCell>

                        {/* Suggested Qty */}
                        <TableCell onClick={e => e.stopPropagation()}>
                          <span className="font-semibold text-sm text-slate-800">{order.suggestedQty}</span>
                        </TableCell>

                        {/* Order Trigger Date */}
                        <TableCell className="hidden xl:table-cell" onClick={e => e.stopPropagation()}>
                          <span className="text-xs text-slate-600">{formatDate(order.orderTriggerDate)}</span>
                        </TableCell>

                        {/* Expected Delivery Date */}
                        <TableCell className="hidden xl:table-cell" onClick={e => e.stopPropagation()}>
                          <span className="text-xs text-slate-600">{formatDate(order.expectedDeliveryDate)}</span>
                        </TableCell>

                        {/* Lead Time */}
                        <TableCell className="hidden lg:table-cell" onClick={e => e.stopPropagation()}>
                          <span className="text-xs text-slate-600">{order.totalLeadTime}d</span>
                        </TableCell>

                        {/* CNY Risk */}
                        <TableCell className="hidden lg:table-cell" onClick={e => e.stopPropagation()}>
                          {order.cnyRisk ? (
                            <ShieldAlert className="h-4 w-4 text-red-500" />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>

                        {/* Season */}
                        <TableCell className="hidden xl:table-cell" onClick={e => e.stopPropagation()}>
                          <Badge variant="outline" className={`text-[10px] ${SEASON_COLORS[order.season] || 'bg-slate-100 text-slate-600'}`}>
                            {SEASON_LABELS[order.season] || order.season}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell onClick={e => e.stopPropagation()}>
                          {order.status === 'pending' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                              disabled={isConverting}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleConvert(order);
                              }}
                            >
                              {isConverting ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ShoppingCart className="h-3 w-3" />
                              )}
                              Convert to PO
                            </Button>
                          ) : (
                            <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[order.status]?.className || ''}`}>
                              {STATUS_BADGE[order.status]?.label || order.status}
                            </Badge>
                          )}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {/* Expanded row detail (desktop) */}
          <AnimatePresence>
            {expandedRow && (() => {
              const order = orders.find(o => o.id === expandedRow);
              if (!order) return null;
              return (
                <motion.div
                  key={`expanded-${order.id}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden hidden md:block"
                >
                  <ExpandedOrderDetail order={order} />
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* ========== Mobile Card View ========== */}
          <div className="md:hidden space-y-2">
            <AnimatePresence initial={false}>
              {paged.map(order => {
                const pCfg = PRIORITY_CONFIG[order.priority] || PRIORITY_CONFIG.normal;
                const isExpanded = expandedRow === order.id;
                const isConverting = convertingId === order.id;

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card
                      className={`cursor-pointer shadow-sm ${pCfg.border} ${isExpanded ? 'ring-1 ring-slate-200' : ''}`}
                      onClick={() => setExpandedRow(isExpanded ? null : order.id)}
                    >
                      <CardContent className="p-3 space-y-2">
                        {/* Row 1: Priority + Product */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge className={`${pCfg.bg} text-[10px]`}>{pCfg.label}</Badge>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{order.productName}</p>
                              <p className="text-xs text-slate-500">{order.productSku}</p>
                            </div>
                          </div>
                          {order.cnyRisk && <ShieldAlert className="h-4 w-4 text-red-500 flex-shrink-0" />}
                        </div>

                        {/* Row 2: Key numbers */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-1.5 rounded bg-slate-50">
                            <p className={`text-sm font-bold ${stockColor(order.currentStock, order.reorderPoint)}`}>{order.currentStock}</p>
                            <p className="text-[9px] text-slate-500">Stock</p>
                          </div>
                          <div className="p-1.5 rounded bg-slate-50">
                            <p className="text-sm font-bold text-slate-700">{order.suggestedQty}</p>
                            <p className="text-[9px] text-slate-500">Suggested</p>
                          </div>
                          <div className="p-1.5 rounded bg-slate-50">
                            <p className="text-sm font-bold text-slate-700">{order.totalLeadTime}d</p>
                            <p className="text-[9px] text-slate-500">Lead</p>
                          </div>
                        </div>

                        {/* Row 3: Dates + Season */}
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Order: {formatDate(order.orderTriggerDate)}</span>
                          <Badge variant="outline" className={`text-[9px] ${SEASON_COLORS[order.season] || 'bg-slate-100 text-slate-600'}`}>
                            {SEASON_LABELS[order.season] || order.season}
                          </Badge>
                        </div>

                        <div className="text-xs text-slate-500">
                          Deliver: {formatDate(order.expectedDeliveryDate)}
                        </div>

                        {/* Action */}
                        {order.status === 'pending' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            disabled={isConverting}
                            onClick={e => { e.stopPropagation(); handleConvert(order); }}
                          >
                            {isConverting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
                            Convert to PO
                          </Button>
                        ) : (
                          <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[order.status]?.className || ''}`}>
                            {STATUS_BADGE[order.status]?.label || order.status}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>

                    {/* Expanded detail on mobile */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <ExpandedOrderDetail order={order} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* ========== Pagination ========== */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className={safePage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {paginationRange.map((item, i) =>
                    item === 'ellipsis' ? (
                      <PaginationItem key={`ellipsis-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={item}>
                        <PaginationLink
                          isActive={safePage === item}
                          onClick={() => setPage(item)}
                          className="cursor-pointer"
                        >
                          {item}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className={safePage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Re-export the type for consumers
export type { RecommendedOrderRow };
