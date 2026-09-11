'use client';

// ============================================
// TrimedCast LEAN — Orders view (Phase 3)
// Session selector + "Generate recommendations" + per-SKU table showing
// recommended order qty, safety stock, reorder point, order-trigger date,
// expected delivery, urgency, and the CNY strategy applied.
// Expandable detail: 5-milestone shipment timeline + EOQ breakdown.
// ============================================

import { useEffect, useState, useCallback, Fragment } from 'react';
import { Input } from "@/components/ui/input";
import { useAppStore } from '@/stores/app-store';
import { usePagination } from '@/hooks/use-pagination';
import { Pagination } from '@/components/dashboard/pagination';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDate } from '@/lib/sessions/festival-calendar';
import {
  ShoppingCart,
  Sparkles,
  Loader2,
  CalendarClock,
  Target,
  Package,
  AlertCircle,
  ChevronRight,
  Plane,
  Ship,
  Clock,
  Shield,
  Search,
} from 'lucide-react';

interface Festival {
  id: string;
  name: string;
  type: string;
  peakDate: string;
  demandEffect: number;
  daysUntil: number;
  isUpcoming: boolean;
}

interface OrderRow {
  id: string;
  skuCode: string;
  productName: string;
  festivalSessionId: string | null;
  forecastQty: number | null;
  mape: number | null;
  recommendedQty: number;
  safetyStock: number;
  reorderPoint: number;
  orderTriggerDate: string | null;
  expectedDelivery: string | null;
  urgency: string;
  recommendedMode: string;
  cnyStrategy: string;
  unitCostBdt: number | null;
  sellingPrice: number | null;
  forecastPoints: { date: string; predicted: number; festivalName: string | null; festivalEffect: number }[];
}

const URGENCY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-muted/40 text-muted-foreground border-border',
};

const CNY_STRATEGY_LABELS: Record<string, string> = {
  none: 'No CNY impact',
  before_cny: 'Order before CNY',
  after_cny: 'Order after CNY',
  partial_order: 'Partial order (air+sea)',
  air_escape: 'Switch to air',
};

export function OrdersView() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const setView = useAppStore((s) => s.setView);

  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [selectedFestivalId, setSelectedFestivalId] = useState<string>('');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const filteredOrders = orders.filter(o => {
    const q = orderSearch.toLowerCase().trim();
    if (!q) return true;
    return o.skuCode.toLowerCase().includes(q) || o.productName.toLowerCase().includes(q);
  });
  const orderPagination = usePagination(filteredOrders, 10);
  const [loadingFestivals, setLoadingFestivals] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingFestivals(true);
      try {
        const res = await fetch('/api/festivals');
        const json = await res.json();
        if (cancelled) return;
        const upcoming = (json.festivals || []).filter((f: Festival) => f.isUpcoming);
        setFestivals(upcoming);
        if (upcoming.length > 0 && !selectedFestivalId) setSelectedFestivalId(upcoming[0].id);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingFestivals(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadOrders = useCallback(async (festivalId: string) => {
    if (!festivalId) { setOrders([]); return; }
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?festivalSessionId=${festivalId}`);
      const json = await res.json();
      setOrders(json.orders || []);
    } catch (e) { console.error(e); }
    finally { setLoadingOrders(false); }
  }, []);

  useEffect(() => {
    if (selectedFestivalId) loadOrders(selectedFestivalId);
  }, [selectedFestivalId, loadOrders, dataVersion]);

  const generate = async () => {
    if (!selectedFestivalId) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/orders/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ festivalSessionId: selectedFestivalId, serviceLevel: 0.95 }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Generation failed', { description: json.error || 'Unknown error' });
        return;
      }
      toast.success('Recommendations generated', {
        description: `${json.generated} SKUs · session: ${json.festivalSessionName}`,
      });
      loadOrders(selectedFestivalId);
    } catch (e) {
      toast.error('Generation failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally { setGenerating(false); }
  };

  const selectedFestival = festivals.find((f) => f.id === selectedFestivalId);

  // Aggregate stats
  const totalRecommended = orders.reduce((s, o) => s + o.recommendedQty, 0);
  const criticalCount = orders.filter((o) => o.urgency === 'critical').length;
  const highCount = orders.filter((o) => o.urgency === 'high').length;
  const cnyAffected = orders.filter((o) => o.cnyStrategy && o.cnyStrategy !== 'none').length;

  return (
    <div className="space-y-5">
      {/* Header + generate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Order Recommendations
          </CardTitle>
          <CardDescription>
            EOQ + Safety Stock + the 9-step Order Trigger algorithm — tells you exactly
            <strong> how much to order</strong> and <strong>when to place the PO</strong>,
            accounting for lead time (155d sea / 104d air) and the Chinese New Year supply disruption.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Festival session</label>
            {loadingFestivals ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedFestivalId} onValueChange={setSelectedFestivalId}>
                <SelectTrigger><SelectValue placeholder="Select a session…" /></SelectTrigger>
                <SelectContent>
                  {festivals.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span>{f.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">· {formatDate(f.peakDate)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button onClick={generate} disabled={generating || !selectedFestivalId}>
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />Generate recommendations</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Stats cards */}
      {orders.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard icon={Package} label="Total recommended" value={totalRecommended.toLocaleString()} sub="units" tint="text-blue-600 bg-blue-50" />
          <StatCard icon={AlertCircle} label="Critical urgency" value={criticalCount.toString()} sub="SKUs ≤ 30 days" tint="text-red-600 bg-red-50" />
          <StatCard icon={Clock} label="High urgency" value={highCount.toString()} sub="SKUs ≤ 90 days" tint="text-orange-600 bg-orange-50" />
          <StatCard icon={Shield} label="CNY-affected" value={cnyAffected.toString()} sub="SKUs need strategy" tint="text-purple-600 bg-purple-50" />
        </div>
      )}

      {/* Recommendations table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Per-SKU Order Plan</CardTitle>
              <CardDescription>
                {orders.length > 0
                  ? `${filteredOrders.length} of ${orders.length} SKUs · 95% service level · generated ${formatDate(orders[0].createdAt)}`
                  : 'No recommendations yet. Generate above.'}
              </CardDescription>
            </div>
            {orders.length > 0 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search SKU…" value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)} className="pl-8 w-40 sm:w-56 h-8 text-xs" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingOrders ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No recommendations for this session</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Click “Generate recommendations” to run EOQ + the order-trigger algorithm for {selectedFestival?.name || 'this session'}.
              </p>
              <Button onClick={generate} disabled={generating}>
                <Sparkles className="h-4 w-4 mr-2" /> Generate now
              </Button>
            </div>
          ) : (
            <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">SKU</th>
                    <th className="text-left font-medium px-4 py-2.5">Product</th>
                    <th className="text-right font-medium px-4 py-2.5">Order Qty</th>
                    <th className="text-right font-medium px-4 py-2.5">Safety Stock</th>
                    <th className="text-right font-medium px-4 py-2.5">Trigger Date</th>
                    <th className="text-right font-medium px-4 py-2.5">Delivery</th>
                    <th className="text-center font-medium px-4 py-2.5">Urgency</th>
                    <th className="text-center font-medium px-4 py-2.5">Mode</th>
                    <th className="text-center font-medium px-4 py-2.5">CNY</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orderPagination.paginatedItems.map((o) => {
                    const expanded = expandedSku === o.id;
                    return (
                      <Fragment key={o.id}>
                        <tr
                          className="hover:bg-muted/30 cursor-pointer"
                          onClick={() => setExpandedSku(expanded ? null : o.id)}
                        >
                          <td className="px-4 py-2.5 font-mono text-xs font-medium">{o.skuCode}</td>
                          <td className="px-4 py-2.5 max-w-xs truncate">{o.productName}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                            {o.recommendedQty.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                            {o.safetyStock.toLocaleString()}
                            <span className="text-[10px] text-muted-foreground block">ROP {o.reorderPoint}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                            {formatDate(o.orderTriggerDate)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                            {formatDate(o.expectedDelivery)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge variant="outline" className={`text-[10px] ${URGENCY_COLORS[o.urgency] || ''}`}>
                              {o.urgency}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {o.recommendedMode === 'air' ? (
                              <Plane className="h-3.5 w-3.5 text-orange-500 inline" />
                            ) : (
                              <Ship className="h-3.5 w-3.5 text-blue-500 inline" />
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {o.cnyStrategy && o.cnyStrategy !== 'none' ? (
                              <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                                {CNY_STRATEGY_LABELS[o.cnyStrategy] || o.cnyStrategy}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="bg-muted/20">
                            <td colSpan={10} className="px-4 py-4">
                              <OrderDetail row={o} festivalName={selectedFestival?.name} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination pagination={orderPagination} itemName="SKUs" />
            </div>
          )}
        </CardContent>
      </Card>

      {orders.length === 0 && festivals.length === 0 && !loadingFestivals && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setView('upload')}>
            <AlertCircle className="h-4 w-4 mr-2" />
            Upload Excel + generate forecast first
          </Button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub, tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub: string; tint: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className={`flex h-8 w-8 items-center justify-center rounded-md ${tint}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

/** Inline detail: EOQ breakdown + 5-milestone timeline + forecast sparkline. */
function OrderDetail({ row, festivalName }: { row: OrderRow; festivalName?: string }) {
  // Build a simple sparkline from the forecast points
  const points = row.forecastPoints;
  const maxVal = Math.max(...points.map((p) => p.predicted), 1);
  const sparkW = 480;
  const sparkH = 60;
  const sparkPath = points.length > 1
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * sparkW} ${sparkH - (p.predicted / maxVal) * sparkH}`).join(' ')
    : '';

  return (
    <div className="space-y-4">
      {/* Row 1: EOQ + safety stock breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Forecast (session)" value={`${row.forecastQty?.toLocaleString() ?? '—'} units`} sub={row.mape != null ? `MAPE ${row.mape}%` : ''} />
        <MiniStat label="Recommended order" value={`${row.recommendedQty.toLocaleString()} units`} sub="EOQ + safety stock" />
        <MiniStat label="Safety stock" value={`${row.safetyStock.toLocaleString()} units`} sub={`ROP ${row.reorderPoint}`} />
        <MiniStat label="Service level" value="95%" sub="k = 1.65" />
      </div>

      {/* Row 2: Trigger date timeline */}
      <div className="rounded-lg border bg-background p-3">
        <div className="flex items-center gap-2 mb-2">
          <CalendarClock className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">Order-trigger timeline</span>
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <TimelineNode label="Today" date={formatDate(new Date().toISOString())} active />
          <TimelineArrow />
          <TimelineNode
            label="Place PO"
            date={formatDate(row.orderTriggerDate)}
            highlight={row.urgency === 'critical'}
          />
          <TimelineArrow />
          <TimelineNode
            label="Shipment departs"
            date={row.expectedDelivery ? formatDate(row.orderTriggerDate) : '—'}
          />
          <TimelineArrow />
          <TimelineNode
            label="Arrives warehouse"
            date={formatDate(row.expectedDelivery)}
            highlight={!!festivalName}
          />
        </div>
        {row.cnyStrategy && row.cnyStrategy !== 'none' && (
          <div className="mt-2 text-xs text-purple-700 bg-purple-50 rounded px-2 py-1 inline-block">
            CNY strategy: {CNY_STRATEGY_LABELS[row.cnyStrategy]}
          </div>
        )}
      </div>

      {/* Row 3: Forecast sparkline */}
      {points.length > 0 && (
        <div className="rounded-lg border bg-background p-3">
          <div className="text-xs font-medium mb-2">Demand forecast ({points.length} months)</div>
          <svg width={sparkW} height={sparkH} className="block">
            <path d={sparkPath} fill="none" stroke="currentColor" className="text-primary" strokeWidth={1.5} />
            {points.map((p, i) => {
              const x = (i / (points.length - 1)) * sparkW;
              const y = sparkH - (p.predicted / maxVal) * sparkH;
              return p.festivalName ? (
                <circle key={i} cx={x} cy={y} r={3} className="fill-orange-500" />
              ) : null;
            })}
          </svg>
          {festivalName && (
            <div className="text-[10px] text-muted-foreground mt-1">
              Orange dots = festival months with demand effects applied
            </div>
          )}
        </div>
      )}

      {/* Row 4: Lead-time breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <MiniStat label="Manufacturing" value="90 days" sub="supplier" />
        <MiniStat label="Shipment" value={row.recommendedMode === 'air' ? '8 days' : '52 days'} sub={row.recommendedMode} />
        <MiniStat label="Customs" value={row.recommendedMode === 'air' ? '3 days' : '10 days'} sub="Chattogram" />
        <MiniStat label="Total lead time" value={row.recommendedMode === 'air' ? '104 days' : '155 days'} sub="incl. internal" />
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border bg-background px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function TimelineNode({ label, date, highlight, active }: { label: string; date: string; highlight?: boolean; active?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-md border px-2 py-1 ${highlight ? 'bg-red-50 border-red-200' : active ? 'bg-primary/10 border-primary/30' : 'bg-background'}`}>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{date}</span>
    </div>
  );
}

function TimelineArrow() {
  return <span className="text-muted-foreground">→</span>;
}
