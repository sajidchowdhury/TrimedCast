'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
  Calculator,
  Shield,
  TrendingUp,
  AlertTriangle,
  Package,
  ChevronDown,
  ChevronRight,
  Loader2,
  Activity,
  Target,
  Gauge,
  Info,
  Zap,
  CircleDollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SERVICE_LEVEL_TABLE,
  SERVICE_LEVEL_FACTORS,
  getSafetyFactor,
  type ProductEOQSafetyStock,
  type SensitivityPoint,
  type EOQOutput,
  type SafetyStockOutput,
  type LeadTimeStats,
  type ErrorMetricsOutput,
  type RecalibrationCheck,
} from '@/lib/forecasting/eoq-safety-stock';

// ============================================
// Types
// ============================================

interface EOQApiResponse {
  success: boolean;
  data?: {
    results: ProductEOQSafetyStock[];
    summary: {
      totalProducts: number;
      totalAnnualCostBDT: number;
      avgMape: number;
      productsNeedingRecalibration: number;
      recalibrationAlerts: Array<{
        productId: string;
        productSku: string;
        productName: string;
        currentMape: number;
        urgency: string;
        recommendation: string;
        suggestedActions: string[];
      }>;
      serviceLevel: number;
      shipmentMode: string;
    };
  };
  error?: string;
}

interface SensitivityResponse {
  success: boolean;
  data?: {
    sensitivity: SensitivityPoint[];
    product: { id: string; sku: string; name: string; category: string };
    eoq: EOQOutput;
    leadTimeStats: LeadTimeStats;
  };
  error?: string;
}

const TENANT_ID = 'demo-bd-motors';

// ============================================
// Animation Variants
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, duration: 0.3 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const expandVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto', transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};

// ============================================
// Helpers
// ============================================

function formatBDT(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-BD')}`;
}

function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('en', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function getMapeColor(mape: number): string {
  if (mape < 10) return 'text-emerald-600';
  if (mape < 20) return 'text-amber-600';
  return 'text-red-600';
}

function getMapeBg(mape: number): string {
  if (mape < 10) return 'bg-emerald-100 text-emerald-700';
  if (mape < 20) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function getRecalBorder(urgency: string): string {
  if (urgency === 'critical') return 'border-l-4 border-l-red-500';
  if (urgency === 'high') return 'border-l-4 border-l-orange-500';
  if (urgency === 'medium') return 'border-l-4 border-l-amber-400';
  return 'border-l-4 border-l-emerald-400';
}

function getRecalRowBg(urgency: string): string {
  if (urgency === 'critical') return 'bg-red-50/50';
  if (urgency === 'high') return 'bg-orange-50/50';
  return '';
}

function getUrgencyBadge(urgency: string): { bg: string; text: string } {
  switch (urgency) {
    case 'critical': return { bg: 'bg-red-100', text: 'text-red-700' };
    case 'high': return { bg: 'bg-orange-100', text: 'text-orange-700' };
    case 'medium': return { bg: 'bg-amber-100', text: 'text-amber-700' };
    case 'low': return { bg: 'bg-slate-100', text: 'text-slate-600' };
    default: return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  }
}

function getAccuracyBadge(rating: string): { bg: string; text: string } {
  switch (rating) {
    case 'excellent': return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
    case 'good': return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
    case 'acceptable': return { bg: 'bg-amber-100', text: 'text-amber-700' };
    case 'poor': return { bg: 'bg-orange-100', text: 'text-orange-700' };
    default: return { bg: 'bg-red-100', text: 'text-red-700' };
  }
}

// ============================================
// Skeleton Loading Component
// ============================================

function PanelSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Controls skeleton */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Table skeleton */}
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-8 w-full mb-3" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Expanded Detail Panel
// ============================================

function ExpandedDetail({
  product,
  serviceLevel,
  shipmentMode,
}: {
  product: ProductEOQSafetyStock;
  serviceLevel: number;
  shipmentMode: 'sea' | 'air';
}) {
  const [sensitivity, setSensitivity] = useState<SensitivityPoint[] | null>(null);
  const [sensLoading, setSensLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setSensLoading(true);
      try {
        const res = await fetch('/api/forecast/sensitivity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: TENANT_ID,
            productId: product.productId,
            shipmentMode,
          }),
        });
        const json: SensitivityResponse = await res.json();
        if (!cancelled && json.success && json.data) {
          setSensitivity(json.data.sensitivity);
        }
      } catch {
        // ignore
      }
      if (!cancelled) setSensLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [product.productId, shipmentMode]);

  const { eoq, safetyStock, leadTimeStats, errorMetrics, recalibration } = product;

  return (
    <motion.div
      variants={expandVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="overflow-hidden"
    >
      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-5">

        {/* EOQ Section */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Calculator className="h-3.5 w-3.5 text-emerald-600" />
            Economic Order Quantity (EOQ)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <p className="text-[10px] text-slate-500">Unconstrained EOQ</p>
              <p className="text-sm font-bold text-slate-800">{formatNumber(eoq.eoqUnconstrained)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-[10px] text-emerald-600">Constrained EOQ</p>
              <p className="text-sm font-bold text-emerald-700">{formatNumber(eoq.eoq)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <p className="text-[10px] text-slate-500">Order Cycle</p>
              <p className="text-sm font-bold text-slate-800">{formatNumber(eoq.orderCycleDays, 1)} days</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <p className="text-[10px] text-slate-500">Cost Savings vs MOQ</p>
              <p className="text-sm font-bold text-slate-800">{formatBDT(eoq.costSavingsVsMoq)}</p>
            </div>
          </div>
          {eoq.constraintsApplied.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {eoq.constraintsApplied.map((c, i) => (
                <Badge key={i} variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                  {c}
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
            <span>Ordering: <span className="font-semibold text-slate-700">{formatBDT(eoq.totalOrderingCost)}</span></span>
            <span>Holding: <span className="font-semibold text-slate-700">{formatBDT(eoq.totalHoldingCost)}</span></span>
            <span>Total: <span className="font-semibold text-emerald-700">{formatBDT(eoq.totalInventoryCost)}</span></span>
          </div>
        </div>

        <Separator />

        {/* Safety Stock Section */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-600" />
            Safety Stock — SS = (EOQ/R) + (MAE × μ<sub>t</sub> × σ<sub>LT</sub>) × k
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <p className="text-[10px] text-slate-500">Cycle Stock (EOQ/R)</p>
              <p className="text-sm font-bold text-slate-800">{formatNumber(safetyStock.componentCycleStock, 2)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <p className="text-[10px] text-slate-500">Uncertainty Component</p>
              <p className="text-sm font-bold text-slate-800">{formatNumber(safetyStock.componentUncertainty, 2)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <p className="text-[10px] text-slate-500">σ<sub>LT</sub> (Lead Time SD)</p>
              <p className="text-sm font-bold text-slate-800">{safetyStock.sigmaLtDays} days</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-[10px] text-emerald-600">k factor (z-score)</p>
              <p className="text-sm font-bold text-emerald-700">{safetyStock.safetyFactorK}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
            <span>MAE used: <span className="font-semibold text-slate-700">{formatNumber(safetyStock.maeUsed, 2)}</span> {safetyStock.maeNormalized ? '(normalized ÷30)' : ''}</span>
            <span>Daily demand: <span className="font-semibold text-slate-700">{formatNumber(safetyStock.dailyDemand, 2)}</span></span>
            <span>Lead time: <span className="font-semibold text-slate-700">{safetyStock.leadTimeDays}d</span></span>
          </div>
        </div>

        <Separator />

        {/* Lead Time Stats */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            Lead Time Statistics
          </h4>
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
            {[
              { label: 'Mean', value: `${leadTimeStats.meanLeadTime}d` },
              { label: 'σ', value: `${leadTimeStats.sigmaLt}d` },
              { label: 'Min', value: `${leadTimeStats.minLeadTime}d` },
              { label: 'Max', value: `${leadTimeStats.maxLeadTime}d` },
              { label: 'Median', value: `${leadTimeStats.medianLeadTime}d` },
              { label: 'CV', value: formatNumber(leadTimeStats.coefficientOfVariation, 3) },
              { label: 'Data Pts', value: String(leadTimeStats.dataPoints) },
            ].map((stat) => (
              <div key={stat.label} className="p-2 rounded bg-white border border-slate-200">
                <p className="text-[9px] text-slate-500">{stat.label}</p>
                <p className="text-xs font-bold text-slate-800">{stat.value}</p>
              </div>
            ))}
          </div>
          {leadTimeStats.usedDefaults && (
            <p className="mt-1.5 text-[10px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Using defaults — insufficient lead time data (&lt;5 orders)
            </p>
          )}
        </div>

        <Separator />

        {/* Error Metrics */}
        {errorMetrics && (
          <>
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-emerald-600" />
                Error Metrics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="p-2 rounded bg-white border border-slate-200">
                  <p className="text-[9px] text-slate-500">MAPE</p>
                  <p className={`text-xs font-bold ${getMapeColor(errorMetrics.mape)}`}>{formatNumber(errorMetrics.mape, 2)}%</p>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <p className="text-[9px] text-slate-500">MAE</p>
                  <p className="text-xs font-bold text-slate-800">{formatNumber(errorMetrics.mae, 2)}</p>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <p className="text-[9px] text-slate-500">RMSE</p>
                  <p className="text-xs font-bold text-slate-800">{formatNumber(errorMetrics.rmse, 2)}</p>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <p className="text-[9px] text-slate-500">Bias</p>
                  <p className={`text-xs font-bold ${errorMetrics.bias > 0 ? 'text-amber-600' : errorMetrics.bias < 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {formatNumber(errorMetrics.bias, 2)}
                    {errorMetrics.bias > 0 ? ' (under)' : errorMetrics.bias < 0 ? ' (over)' : ''}
                  </p>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <p className="text-[9px] text-slate-500">Accuracy</p>
                  {(() => {
                    const badge = getAccuracyBadge(errorMetrics.accuracyRating);
                    return <Badge className={`text-[9px] ${badge.bg} ${badge.text} border-0`}>{errorMetrics.accuracyRating}</Badge>;
                  })()}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span>Within 10%: <span className="font-semibold">{errorMetrics.within10Pct}%</span></span>
                <span>Within 20%: <span className="font-semibold">{errorMetrics.within20Pct}%</span></span>
                <span>Theil&apos;s U: <span className="font-semibold">{formatNumber(errorMetrics.theilsU, 3)}</span></span>
                <span>n=<span className="font-semibold">{errorMetrics.n}</span></span>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Recalibration */}
        {recalibration && (
          <>
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle className={`h-3.5 w-3.5 ${recalibration.needsRecalibration ? 'text-red-500' : 'text-emerald-500'}`} />
                Recalibration Check
              </h4>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const ub = getUrgencyBadge(recalibration.urgency);
                    return (
                      <Badge className={`text-[10px] ${ub.bg} ${ub.text} border-0`}>
                        {recalibration.urgency.toUpperCase()}
                      </Badge>
                    );
                  })()}
                  {recalibration.needsRecalibration ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mb-2">{recalibration.recommendation}</p>
                {recalibration.suggestedActions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-slate-500">Suggested Actions:</p>
                    {recalibration.suggestedActions.map((action, i) => (
                      <p key={i} className="text-[10px] text-slate-600 flex items-start gap-1.5">
                        <Zap className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                        {action}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Sensitivity Analysis */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-emerald-600" />
            Service Level Sensitivity Analysis
          </h4>
          {sensLoading ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              <span className="text-xs text-slate-500">Running sensitivity analysis...</span>
            </div>
          ) : sensitivity ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] font-semibold text-slate-600">Service Level</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">k</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Safety Stock</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">ROP</TableHead>
                    <TableHead className="text-[10px] font-semibold text-slate-600">Total Cost (BDT)</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {sensitivity.map((point) => {
                      const isCurrent = Math.abs(point.serviceLevel - serviceLevel) < 0.001;
                      return (
                        <TableRow
                          key={point.serviceLevel}
                          className={isCurrent ? 'bg-emerald-50' : ''}
                        >
                          <TableCell className="py-1.5 text-xs">
                            <span className={isCurrent ? 'font-bold text-emerald-700' : 'text-slate-700'}>
                              {(point.serviceLevel * 100).toFixed(point.serviceLevel >= 0.999 ? 1 : 0)}%
                            </span>
                            {isCurrent && <Badge className="ml-1.5 text-[8px] bg-emerald-100 text-emerald-700 border-0">Current</Badge>}
                          </TableCell>
                          <TableCell className="py-1.5 text-xs font-mono">{point.k.toFixed(2)}</TableCell>
                          <TableCell className="py-1.5 text-xs font-semibold">{formatNumber(point.safetyStock)}</TableCell>
                          <TableCell className="py-1.5 text-xs font-semibold">{formatNumber(point.reorderPoint)}</TableCell>
                          <TableCell className="py-1.5 text-xs font-semibold">{formatBDT(point.totalCost)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-2">Sensitivity data unavailable</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Mobile Card View
// ============================================

function MobileProductCard({
  product,
  isExpanded,
  onToggle,
  serviceLevel,
  shipmentMode,
}: {
  product: ProductEOQSafetyStock;
  isExpanded: boolean;
  onToggle: () => void;
  serviceLevel: number;
  shipmentMode: 'sea' | 'air';
}) {
  const urgency = product.recalibration?.urgency || 'none';
  const borderClass = getRecalBorder(urgency);
  const rowBg = getRecalRowBg(urgency);

  return (
    <motion.div
      variants={itemVariants}
      className={`rounded-lg border border-slate-200 ${borderClass} ${rowBg} overflow-hidden`}
    >
      <div className="p-3 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">{product.productName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-[9px] h-4">{product.productSku}</Badge>
              <Badge variant="outline" className="text-[9px] h-4">{product.category}</Badge>
            </div>
          </div>
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-1.5 rounded bg-white border border-slate-100">
            <p className="text-[9px] text-slate-500">EOQ</p>
            <p className="text-xs font-bold text-slate-800">{formatNumber(product.eoq.eoq)}</p>
          </div>
          <div className="p-1.5 rounded bg-white border border-slate-100">
            <p className="text-[9px] text-slate-500">SS</p>
            <p className="text-xs font-bold text-emerald-700">{formatNumber(product.safetyStock.safetyStock)}</p>
          </div>
          <div className="p-1.5 rounded bg-white border border-slate-100">
            <p className="text-[9px] text-slate-500">ROP</p>
            <p className="text-xs font-bold text-slate-800">{formatNumber(product.safetyStock.reorderPoint)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
          <span>Cost: {formatBDT(product.eoq.totalInventoryCost)}</span>
          {product.errorMetrics && (
            <span className={getMapeColor(product.errorMetrics.mape)}>
              MAPE: {formatNumber(product.errorMetrics.mape, 1)}%
            </span>
          )}
        </div>

        {product.recalibration?.needsRecalibration && (
          <div className="mt-1.5">
            {(() => {
              const ub = getUrgencyBadge(product.recalibration.urgency);
              return (
                <Badge className={`text-[9px] ${ub.bg} ${ub.text} border-0`}>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Recalibrate: {product.recalibration.urgency}
                </Badge>
              );
            })()}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <ExpandedDetail
            product={product}
            serviceLevel={serviceLevel}
            shipmentMode={shipmentMode}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// Main Panel Component
// ============================================

export function EOQSafetyStockPanel() {
  // State
  const [results, setResults] = useState<ProductEOQSafetyStock[]>([]);
  const [summary, setSummary] = useState<EOQApiResponse['data'] extends undefined ? never : NonNullable<EOQApiResponse['data']>['summary'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Config state
  const [serviceLevel, setServiceLevel] = useState(0.95);
  const [shipmentMode, setShipmentMode] = useState<'sea' | 'air'>('sea');
  const [mapeThreshold, setMapeThreshold] = useState(10);
  const [orderingCost, setOrderingCost] = useState(500);
  const [holdingCostPct, setHoldingCostPct] = useState(20);

  // Product filter
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [products, setProducts] = useState<Array<{ id: string; sku: string; name: string }>>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Fetch products for selector
  useEffect(() => {
    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        const res = await fetch(`/api/forecast/products?tenantId=${TENANT_ID}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setProducts(json.data.map((p: { id: string; sku: string; name: string }) => ({ id: p.id, sku: p.sku, name: p.name })));
          }
        }
      } catch {
        // ignore
      }
      setProductsLoading(false);
    };
    fetchProducts();
  }, []);

  // Calculate handler
  const handleCalculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setSummary(null);
    setExpandedRow(null);

    try {
      const body: Record<string, unknown> = {
        tenantId: TENANT_ID,
        serviceLevel,
        shipmentMode,
        mapeThreshold,
        orderingCost,
        holdingCostPct: holdingCostPct / 100,
        includeSensitivity: false,
      };
      if (selectedProductId) {
        body.productIds = [selectedProductId];
      }

      const res = await fetch('/api/forecast/eoq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json: EOQApiResponse = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Calculation failed');
      }

      if (json.data) {
        setResults(json.data.results);
        setSummary(json.data.summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    }
    setLoading(false);
  }, [serviceLevel, shipmentMode, mapeThreshold, orderingCost, holdingCostPct, selectedProductId]);

  // Auto-calculate on mount
  useEffect(() => {
    handleCalculate();
  }, []);

  const kFactor = getSafetyFactor(serviceLevel);

  const toggleExpand = (productId: string) => {
    setExpandedRow((prev) => (prev === productId ? null : productId));
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ─── Summary Stats Row ─── */}
      {summary && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Package className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Products Analyzed</p>
                  <p className="text-lg font-bold text-slate-800">{summary.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Total Annual Cost</p>
                  <p className="text-lg font-bold text-emerald-700">{formatBDT(summary.totalAnnualCostBDT)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Target className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Avg MAPE</p>
                  <p className={`text-lg font-bold ${getMapeColor(summary.avgMape)}`}>
                    {formatNumber(summary.avgMape, 1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${summary.productsNeedingRecalibration > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
                  <AlertTriangle className={`h-4 w-4 ${summary.productsNeedingRecalibration > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Need Recalibration</p>
                  <div className="flex items-center gap-1.5">
                    <p className={`text-lg font-bold ${summary.productsNeedingRecalibration > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {summary.productsNeedingRecalibration}
                    </p>
                    {summary.productsNeedingRecalibration > 0 && (
                      <Badge className="text-[8px] bg-red-100 text-red-700 border-0 animate-pulse">
                        ACTION
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Service Level</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {(serviceLevel * 100).toFixed(serviceLevel >= 0.999 ? 1 : 0)}%
                  </p>
                  <p className="text-[10px] text-slate-400">k = {kFactor.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Configuration Controls ─── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Product Selector */}
              <div className="flex-1 min-w-0">
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Product</Label>
                <Select
                  value={selectedProductId || '__all__'}
                  onValueChange={(val) => setSelectedProductId(val === '__all__' ? null : val)}
                  disabled={productsLoading || loading}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={productsLoading ? 'Loading...' : 'All products'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">
                      <span className="font-medium text-emerald-700">Calculate All Products</span>
                    </SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="font-medium">{p.sku}</span>
                        <span className="text-slate-400"> — </span>
                        <span className="truncate">{p.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Service Level */}
              <div className="w-full lg:w-[140px]">
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                  Service Level
                  <span className="ml-1 text-emerald-600 font-mono">k={kFactor.toFixed(2)}</span>
                </Label>
                <Select
                  value={String(serviceLevel)}
                  onValueChange={(val) => setServiceLevel(Number(val))}
                  disabled={loading}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_LEVEL_TABLE.map((sl) => (
                      <SelectItem key={sl.serviceLevel} value={String(sl.serviceLevel)}>
                        <span className="font-semibold">{(sl.serviceLevel * 100).toFixed(sl.serviceLevel >= 0.999 ? 1 : 0)}%</span>
                        <span className="text-slate-400 ml-1">k={sl.k}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shipment Mode */}
              <div className="w-full lg:w-[120px]">
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Shipment Mode</Label>
                <div className="flex items-center gap-2 h-9">
                  <span className={`text-xs font-medium ${shipmentMode === 'sea' ? 'text-emerald-700' : 'text-slate-400'}`}>Sea</span>
                  <Switch
                    checked={shipmentMode === 'air'}
                    onCheckedChange={(checked) => setShipmentMode(checked ? 'air' : 'sea')}
                    disabled={loading}
                  />
                  <span className={`text-xs font-medium ${shipmentMode === 'air' ? 'text-amber-700' : 'text-slate-400'}`}>Air</span>
                </div>
              </div>

              {/* MAPE Threshold */}
              <div className="w-full lg:w-[100px]">
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">MAPE Threshold %</Label>
                <Input
                  type="number"
                  value={mapeThreshold}
                  onChange={(e) => setMapeThreshold(Number(e.target.value) || 10)}
                  disabled={loading}
                  className="h-9 text-sm"
                  min={1}
                  max={50}
                />
              </div>

              {/* Ordering Cost */}
              <div className="w-full lg:w-[110px]">
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Ordering Cost (BDT)</Label>
                <Input
                  type="number"
                  value={orderingCost}
                  onChange={(e) => setOrderingCost(Number(e.target.value) || 500)}
                  disabled={loading}
                  className="h-9 text-sm"
                  min={1}
                />
              </div>

              {/* Holding Cost % */}
              <div className="w-full lg:w-[100px]">
                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Holding Cost %</Label>
                <Input
                  type="number"
                  value={holdingCostPct}
                  onChange={(e) => setHoldingCostPct(Number(e.target.value) || 20)}
                  disabled={loading}
                  className="h-9 text-sm"
                  min={1}
                  max={100}
                />
              </div>

              {/* Calculate Button */}
              <div className="flex items-end">
                <Button
                  onClick={handleCalculate}
                  disabled={loading}
                  className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-1.5" />
                  )}
                  {selectedProductId ? 'Calculate' : 'Calculate All'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Error State ─── */}
      {error && (
        <motion.div variants={itemVariants}>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Calculation Error</span>
              </div>
              <p className="text-xs text-red-600 mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-red-200 text-red-700 hover:bg-red-100"
                onClick={handleCalculate}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Loading State ─── */}
      {loading && <PanelSkeleton />}

      {/* ─── Empty State ─── */}
      {!loading && !error && results.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="py-16 text-center">
              <Calculator className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">EOQ &amp; Safety Stock Calculator</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Configure parameters above and click Calculate to compute Economic Order Quantity and Safety Stock for your products.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Results: Desktop Table ─── */}
      {!loading && !error && results.length > 0 && (
        <motion.div variants={itemVariants}>
          {/* Desktop */}
          <Card className="hidden md:block overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-slate-50">
                      <TableHead className="w-[32px] text-[10px] font-semibold text-slate-600" />
                      <TableHead className="text-[10px] font-semibold text-slate-600">SKU</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Product Name</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Category</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600 text-right">EOQ</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600 text-right">SS</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600 text-right">ROP</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600 text-right">Orders/Yr</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600 text-right">Annual Cost</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600 text-right">MAPE</TableHead>
                      <TableHead className="text-[10px] font-semibold text-slate-600">Recalibration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((product) => {
                      const isExpanded = expandedRow === product.productId;
                      const urgency = product.recalibration?.urgency || 'none';
                      const borderClass = getRecalBorder(urgency);
                      const rowBg = getRecalRowBg(urgency);

                      return (
                        <motion.tr
                          key={product.productId}
                          variants={itemVariants}
                          className={`cursor-pointer ${borderClass} ${rowBg} hover:bg-slate-50/80`}
                          onClick={() => toggleExpand(product.productId)}
                        >
                          <TableCell className="py-2.5">
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge variant="outline" className="text-[9px] h-4 font-mono">{product.productSku}</Badge>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className="text-xs font-medium text-slate-800 truncate max-w-[180px] block">{product.productName}</span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge variant="outline" className="text-[9px] h-4">{product.category}</Badge>
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <span className="text-xs font-bold text-slate-800">{formatNumber(product.eoq.eoq)}</span>
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <span className="text-xs font-bold text-emerald-700">{formatNumber(product.safetyStock.safetyStock)}</span>
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <span className="text-xs font-bold text-slate-800">{formatNumber(product.safetyStock.reorderPoint)}</span>
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <span className="text-xs text-slate-700">{formatNumber(product.eoq.ordersPerYear, 1)}</span>
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <span className="text-xs font-semibold text-emerald-700">{formatBDT(product.eoq.totalInventoryCost)}</span>
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            {product.errorMetrics ? (
                              <Badge className={`text-[9px] ${getMapeBg(product.errorMetrics.mape)} border-0`}>
                                {formatNumber(product.errorMetrics.mape, 1)}%
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5">
                            {product.recalibration ? (
                              product.recalibration.needsRecalibration ? (
                                (() => {
                                  const ub = getUrgencyBadge(product.recalibration.urgency);
                                  return (
                                    <Badge className={`text-[9px] ${ub.bg} ${ub.text} border-0`}>
                                      <AlertTriangle className="h-3 w-3 mr-0.5" />
                                      {product.recalibration.urgency}
                                    </Badge>
                                  );
                                })()
                              ) : (
                                <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-0">
                                  <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                  Healthy
                                </Badge>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Expanded detail below the table */}
              <AnimatePresence>
                {expandedRow && (() => {
                  const product = results.find((r) => r.productId === expandedRow);
                  if (!product) return null;
                  return (
                    <ExpandedDetail
                      key={expandedRow}
                      product={product}
                      serviceLevel={serviceLevel}
                      shipmentMode={shipmentMode}
                    />
                  );
                })()}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {results.map((product) => (
              <MobileProductCard
                key={product.productId}
                product={product}
                isExpanded={expandedRow === product.productId}
                onToggle={() => toggleExpand(product.productId)}
                serviceLevel={serviceLevel}
                shipmentMode={shipmentMode}
              />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
