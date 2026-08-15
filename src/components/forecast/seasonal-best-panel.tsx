'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
import {
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Clock,
  Ship,
  Plane,
  Package,
  ChevronDown,
  ChevronRight,
  Loader2,
  Zap,
  Target,
  Shield,
  CircleDollarSign,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Types
// ============================================

interface PipelineProduct {
  productSku: string;
  productName: string;
  category?: string;
  forecastedDemand: number;
  adjustedDemand: number;
  recommendedQty: number;
  orderTriggerDate: string;
  expectedAvailableDate: string;
  urgency: string;
  daysUntilTrigger: number;
  cnyRisk: boolean;
  cnyStrategy: string;
  totalLeadTimeDays: number;
  unitCostBdt: number;
  totalCostBdt: number;
  timeline?: {
    orderDate?: string;
    manufacturingStart?: string;
    manufacturingEnd?: string;
    shipDate?: string;
    customsClearance?: string;
    availableDate?: string;
  };
  qtyBreakdown?: {
    gap?: number;
    eoq?: number;
    moq?: number;
    safetyStock?: number;
    constraintApplied?: string;
  };
}

interface PipelineSummary {
  totalProducts: number;
  totalRecommendedUnits: number;
  totalRecommendedSpendBdt: number;
  criticalUrgencyCount: number;
  highUrgencyCount: number;
  normalUrgencyCount: number;
  lowUrgencyCount: number;
  cnyRiskCount: number;
  earliestOrderDate: string | null;
  latestOrderDate: string | null;
}

interface SeasonalPipelineResponse {
  success: boolean;
  data: {
    forecastSessionId: string;
    season: string;
    period: { start: string; end: string; totalDays: number };
    cnyWindow: { year: number; shutdownStart: string; shutdownEnd: string } | null;
    products: PipelineProduct[];
    summary: PipelineSummary;
  };
}

type Season = 'winter' | 'summer' | 'monsoon' | 'pre_winter';
type ShippingMethod = 'sea' | 'air';

// ============================================
// Helpers
// ============================================

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function fmtBdt(value: number): string {
  return `৳${value.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function getUrgencyConfig(urgency: string) {
  switch (urgency.toLowerCase()) {
    case 'critical':
      return { label: 'Critical', className: 'bg-red-600 text-white hover:bg-red-600' };
    case 'high':
      return { label: 'High', className: 'bg-orange-500 text-white hover:bg-orange-500' };
    case 'normal':
      return { label: 'Normal', className: 'bg-yellow-500 text-black hover:bg-yellow-500' };
    case 'low':
      return { label: 'Low', className: 'bg-green-600 text-white hover:bg-green-600' };
    default:
      return { label: urgency, className: 'bg-gray-500 text-white hover:bg-gray-500' };
  }
}

const SEASON_LABELS: Record<Season, string> = {
  winter: '❄️ Winter',
  summer: '☀️ Summer',
  monsoon: '🌧️ Monsoon',
  pre_winter: '🍂 Pre-Winter',
};

const ITEMS_PER_PAGE = 15;

// ============================================
// Component
// ============================================

export function SeasonalBestPanel() {
  // State: configuration
  const [selectedSeason, setSelectedSeason] = useState<Season>('winter');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod>('sea');

  // State: data
  const [data, setData] = useState<SeasonalPipelineResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State: UI
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // ------------------------------------------
  // API call
  // ------------------------------------------
  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setExpandedRows(new Set());
    setCurrentPage(1);

    try {
      const response = await fetch('/api/orders/seasonal-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'demo-bd-motors',
          targetSeason: selectedSeason,
          targetYear: selectedYear,
          topN: 50,
          shippingMethod: selectedShipping,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result: SeasonalPipelineResponse = await response.json();

      if (!result.success) {
        throw new Error('API returned unsuccessful response');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedSeason, selectedYear, selectedShipping]);

  // ------------------------------------------
  // Row expansion
  // ------------------------------------------
  const toggleRow = (sku: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  // ------------------------------------------
  // Pagination
  // ------------------------------------------
  const products = data?.products ?? [];
  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const paginatedProducts = products.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // ============================================
  // Render
  // ============================================
  return (
    <div className="space-y-6">
      {/* ===== Configuration Controls ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="size-5 text-blue-600" />
            Seasonal Best Products Pipeline
          </CardTitle>
          <CardDescription>
            WHAT to order, WHAT QTY, and WHEN — with CNY risk awareness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Season Selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Season</label>
              <Select
                value={selectedSeason}
                onValueChange={(v) => setSelectedSeason(v as Season)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEASON_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Year</label>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shipping Method Toggle */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Shipping</label>
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSelectedShipping('sea')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                    selectedShipping === 'sea'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Ship className="size-4" />
                  Sea
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShipping('air')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-l ${
                    selectedShipping === 'air'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Plane className="size-4" />
                  Air
                </button>
              </div>
            </div>

            {/* Run Analysis Button */}
            <Button onClick={runAnalysis} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Loading State ===== */}
      {loading && <LoadingSkeleton />}

      {/* ===== Error State ===== */}
      {error && (
        <Card className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="size-5 text-red-600 shrink-0" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">Analysis Failed</p>
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={runAnalysis} className="ml-auto gap-1.5">
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ===== Results ===== */}
      {data && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="space-y-6"
        >
          {/* Period & CNY Info */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              {fmtDate(data.period.start)} — {fmtDate(data.period.end)} ({data.period.totalDays} days)
            </span>
            {data.cnyWindow && (
              <Badge variant="outline" className="gap-1 border-red-300 text-red-600 dark:border-red-700 dark:text-red-400">
                <AlertTriangle className="size-3" />
                CNY {data.cnyWindow.year}: {fmtShort(data.cnyWindow.shutdownStart)} – {fmtShort(data.cnyWindow.shutdownEnd)}
              </Badge>
            )}
          </div>

          {/* ===== Summary Stats Row ===== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={<Package className="size-5 text-blue-600" />}
              title="Products Needing Order"
              value={fmtNumber(data.summary.totalProducts)}
              subtitle="total SKUs flagged"
            />
            <SummaryCard
              icon={<ShoppingCart className="size-5 text-indigo-600" />}
              title="Recommended Units"
              value={fmtNumber(data.summary.totalRecommendedUnits)}
              subtitle="total quantity to order"
            />
            <SummaryCard
              icon={<CircleDollarSign className="size-5 text-emerald-600" />}
              title="Total Spend"
              value={fmtBdt(data.summary.totalRecommendedSpendBdt)}
              subtitle="estimated investment"
            />
            <SummaryCard
              icon={<Shield className="size-5 text-red-600" />}
              title="CNY Risk Products"
              value={String(data.summary.cnyRiskCount)}
              subtitle="need pre-CNY orders"
            />
          </div>

          {/* ===== Urgency Breakdown ===== */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Urgency:</span>
            <Badge className="bg-red-600 text-white hover:bg-red-600 gap-1">
              <Zap className="size-3" /> Critical: {data.summary.criticalUrgencyCount}
            </Badge>
            <Badge className="bg-orange-500 text-white hover:bg-orange-500 gap-1">
              <TrendingUp className="size-3" /> High: {data.summary.highUrgencyCount}
            </Badge>
            <Badge className="bg-yellow-500 text-black hover:bg-yellow-500 gap-1">
              <Clock className="size-3" /> Normal: {data.summary.normalUrgencyCount}
            </Badge>
            <Badge className="bg-green-600 text-white hover:bg-green-600 gap-1">
              <Target className="size-3" /> Low: {data.summary.lowUrgencyCount}
            </Badge>
          </div>

          {/* ===== Empty State ===== */}
          {products.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="size-12 text-muted-foreground/40 mb-3" />
                <p className="font-medium text-muted-foreground">No products require ordering</p>
                <p className="text-sm text-muted-foreground/70">
                  All inventory levels are sufficient for this season
                </p>
              </CardContent>
            </Card>
          )}

          {/* ===== Product Table (Desktop) ===== */}
          {products.length > 0 && (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-9" />
                          <TableHead>SKU</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Urgency</TableHead>
                          <TableHead className="text-right">Adj. Demand</TableHead>
                          <TableHead className="text-right">Rec. Qty</TableHead>
                          <TableHead>Trigger Date</TableHead>
                          <TableHead>Available Date</TableHead>
                          <TableHead className="text-right">Lead Time</TableHead>
                          <TableHead>CNY</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {paginatedProducts.map((product) => {
                            const isExpanded = expandedRows.has(product.productSku);
                            const urg = getUrgencyConfig(product.urgency);

                            return (
                              <motion.tr
                                key={product.productSku}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className="group"
                              >
                                {/* Expand toggle */}
                                <TableCell className="w-9">
                                  <button
                                    type="button"
                                    onClick={() => toggleRow(product.productSku)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="size-4" />
                                    ) : (
                                      <ChevronRight className="size-4" />
                                    )}
                                  </button>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{product.productSku}</TableCell>
                                <TableCell className="font-medium max-w-[200px] truncate">{product.productName}</TableCell>
                                <TableCell className="text-muted-foreground text-xs">{product.category ?? '—'}</TableCell>
                                <TableCell>
                                  <Badge className={urg.className}>{urg.label}</Badge>
                                </TableCell>
                                <TableCell className="text-right">{fmtNumber(product.adjustedDemand)}</TableCell>
                                <TableCell className="text-right font-semibold">{fmtNumber(product.recommendedQty)}</TableCell>
                                <TableCell>
                                  <span className="flex items-center gap-1 text-xs">
                                    <Calendar className="size-3 text-muted-foreground" />
                                    {fmtShort(product.orderTriggerDate)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs">{fmtShort(product.expectedAvailableDate)}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="flex items-center justify-end gap-1 text-xs">
                                    <Clock className="size-3 text-muted-foreground" />
                                    {product.totalLeadTimeDays}d
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {product.cnyRisk ? (
                                    <Badge variant="destructive" className="gap-1 text-[10px] px-1.5">
                                      <AlertTriangle className="size-3" />
                                      CNY
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-xs">{fmtBdt(product.unitCostBdt)}</TableCell>
                                <TableCell className="text-right font-semibold text-xs">{fmtBdt(product.totalCostBdt)}</TableCell>

                                {/* Expanded row content */}
                                {isExpanded && (
                                  <TableCell colSpan={13} className="p-0">
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      <ExpandedRowContent product={product} />
                                    </motion.div>
                                  </TableCell>
                                )}
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                <AnimatePresence>
                  {paginatedProducts.map((product) => {
                    const isExpanded = expandedRows.has(product.productSku);
                    const urg = getUrgencyConfig(product.urgency);

                    return (
                      <motion.div
                        key={product.productSku}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <Card className="overflow-hidden">
                          <CardContent
                            className="p-4 cursor-pointer"
                            onClick={() => toggleRow(product.productSku)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono text-xs text-muted-foreground">{product.productSku}</p>
                                <p className="font-medium truncate">{product.productName}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge className={urg.className}>{urg.label}</Badge>
                                {product.cnyRisk && (
                                  <Badge variant="destructive" className="gap-0.5 text-[10px]">
                                    <AlertTriangle className="size-3" />
                                    CNY
                                  </Badge>
                                )}
                                {isExpanded ? (
                                  <ChevronDown className="size-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="size-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs">Rec. Qty</p>
                                <p className="font-semibold">{fmtNumber(product.recommendedQty)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Trigger</p>
                                <p>{fmtShort(product.orderTriggerDate)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Total Cost</p>
                                <p className="font-semibold">{fmtBdt(product.totalCostBdt)}</p>
                              </div>
                            </div>
                          </CardContent>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <div className="border-t px-4 py-3">
                                  <ExpandedRowContent product={product} />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* ===== Pagination ===== */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(currentPage * ITEMS_PER_PAGE, products.length)} of{' '}
                    {products.length} products
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="sm"
                        className="w-9"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* ===== Initial empty prompt (no data yet, not loading) ===== */}
      {!data && !loading && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingCart className="size-14 text-muted-foreground/30 mb-4" />
            <p className="font-semibold text-lg text-muted-foreground">Ready to Analyze</p>
            <p className="text-sm text-muted-foreground/70 max-w-md mt-1">
              Select a season, year, and shipping method, then click &ldquo;Run Analysis&rdquo; to
              discover which products to order, in what quantities, and when to place orders.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground/70">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpandedRowContent({ product }: { product: PipelineProduct }) {
  const timeline = product.timeline;
  const qty = product.qtyBreakdown;

  return (
    <div className="bg-muted/30 px-6 py-4 space-y-4">
      {/* Timeline */}
      <div>
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Clock className="size-4 text-blue-600" />
          Full Timeline
        </p>
        {timeline ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {timeline.orderDate && (
              <TimelineStep label="Order" date={timeline.orderDate} />
            )}
            {timeline.manufacturingStart && (
              <>
                <span className="text-muted-foreground">→</span>
                <TimelineStep label="Mfg Start" date={timeline.manufacturingStart} />
              </>
            )}
            {timeline.manufacturingEnd && (
              <>
                <span className="text-muted-foreground">→</span>
                <TimelineStep label="Mfg End" date={timeline.manufacturingEnd} />
              </>
            )}
            {timeline.shipDate && (
              <>
                <span className="text-muted-foreground">→</span>
                <TimelineStep label="Ship" date={timeline.shipDate} />
              </>
            )}
            {timeline.customsClearance && (
              <>
                <span className="text-muted-foreground">→</span>
                <TimelineStep label="Customs" date={timeline.customsClearance} />
              </>
            )}
            {timeline.availableDate && (
              <>
                <span className="text-muted-foreground">→</span>
                <TimelineStep label="Available" date={timeline.availableDate} highlight />
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <TimelineStep label="Order" date={product.orderTriggerDate} />
            <span className="text-muted-foreground">→</span>
            <TimelineStep label="Available" date={product.expectedAvailableDate} highlight />
            <span className="text-muted-foreground ml-3">
              ({product.totalLeadTimeDays} days lead time)
            </span>
          </div>
        )}
      </div>

      {/* Quantity Breakdown */}
      {qty && (
        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Package className="size-4 text-indigo-600" />
            Quantity Breakdown
          </p>
          <div className="flex flex-wrap gap-4 text-xs">
            {qty.gap !== undefined && (
              <div>
                <span className="text-muted-foreground">Gap: </span>
                <span className="font-semibold">{fmtNumber(qty.gap)}</span>
              </div>
            )}
            {qty.eoq !== undefined && (
              <div>
                <span className="text-muted-foreground">EOQ: </span>
                <span className="font-semibold">{fmtNumber(qty.eoq)}</span>
              </div>
            )}
            {qty.moq !== undefined && (
              <div>
                <span className="text-muted-foreground">MOQ: </span>
                <span className="font-semibold">{fmtNumber(qty.moq)}</span>
              </div>
            )}
            {qty.safetyStock !== undefined && (
              <div>
                <span className="text-muted-foreground">Safety Stock: </span>
                <span className="font-semibold">{fmtNumber(qty.safetyStock)}</span>
              </div>
            )}
            {qty.constraintApplied && (
              <div>
                <span className="text-muted-foreground">Constraint: </span>
                <Badge variant="outline" className="text-[10px] px-1.5">
                  {qty.constraintApplied}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CNY Explanation */}
      {product.cnyRisk && (
        <div>
          <p className="text-sm font-semibold mb-1 flex items-center gap-1.5">
            <AlertTriangle className="size-4 text-red-600" />
            CNY Risk Explanation
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="destructive" className="gap-1">
              <Shield className="size-3" />
              CNY Affected
            </Badge>
            {product.cnyStrategy && (
              <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400">
                Strategy: {product.cnyStrategy}
              </Badge>
            )}
            <span className="text-muted-foreground">
              Days until trigger: <strong>{product.daysUntilTrigger}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineStep({
  label,
  date,
  highlight = false,
}: {
  label: string;
  date: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-md px-2.5 py-1.5 border ${
        highlight
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'
          : 'border-border bg-background'
      }`}
    >
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={`font-medium ${highlight ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
        {fmtShort(date)}
      </span>
    </div>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function LoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Summary skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-20 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table skeleton */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4">
            <Skeleton className="h-10 w-full mb-3" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default SeasonalBestPanel;
