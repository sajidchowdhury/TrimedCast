'use client';

// ============================================
// Auto-Recalibration Dashboard
// Monitoring dashboard for forecast accuracy
// and auto-recalibration engine
// ============================================

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Activity, AlertTriangle, CheckCircle2,
  RefreshCw, TrendingDown, Zap, Shield,
  History, BarChart3, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type MetricsResult,
} from '@/lib/forecasting/auto-recalibration-engine';

// =============================================
// Demo Data
// =============================================

interface ProductRecalStatus {
  skuId: string;
  productName: string;
  currentMAPE: number;
  mapeRating: MetricsResult['mapeRating'];
  urgency: 'critical' | 'high' | 'medium' | 'low' | 'none';
  lastRecalibrated: string;
  actuals: number[];
  forecasts: number[];
}

const DEMO_PRODUCTS: ProductRecalStatus[] = [
  {
    skuId: 'SKU-001', productName: 'Brake Pad Set (Disc)', currentMAPE: 4.2, mapeRating: 'excellent', urgency: 'none',
    lastRecalibrated: '2025-01-10',
    actuals: [520, 580, 490, 610, 550, 420, 380, 350, 410, 530, 620, 700],
    forecasts: [510, 570, 500, 600, 540, 430, 370, 360, 420, 520, 610, 690],
  },
  {
    skuId: 'SKU-002', productName: 'Chain Kit 428H', currentMAPE: 7.8, mapeRating: 'good', urgency: 'low',
    lastRecalibrated: '2024-12-20',
    actuals: [300, 350, 280, 310, 260, 200, 180, 170, 220, 290, 340, 380],
    forecasts: [310, 340, 270, 320, 250, 210, 190, 160, 230, 300, 350, 370],
  },
  {
    skuId: 'SKU-003', productName: 'Tire 100/90-17 (Rear)', currentMAPE: 12.5, mapeRating: 'fair', urgency: 'medium',
    lastRecalibrated: '2024-11-05',
    actuals: [150, 160, 140, 130, 120, 110, 100, 95, 105, 135, 155, 170],
    forecasts: [170, 175, 155, 145, 135, 90, 80, 75, 90, 120, 140, 160],
  },
  {
    skuId: 'SKU-004', productName: 'Engine Oil 10W-40 (1L)', currentMAPE: 18.3, mapeRating: 'fair', urgency: 'high',
    lastRecalibrated: '2024-09-15',
    actuals: [800, 850, 780, 820, 750, 600, 550, 520, 580, 720, 880, 950],
    forecasts: [700, 750, 700, 730, 680, 500, 450, 420, 480, 620, 780, 850],
  },
  {
    skuId: 'SKU-005', productName: 'Spark Plug NGK B8ES', currentMAPE: 25.7, mapeRating: 'poor', urgency: 'critical',
    lastRecalibrated: '2024-06-01',
    actuals: [200, 220, 190, 180, 170, 130, 110, 100, 120, 180, 230, 250],
    forecasts: [280, 300, 270, 260, 250, 200, 180, 170, 190, 250, 300, 320],
  },
  {
    skuId: 'SKU-006', productName: 'Air Filter CG125', currentMAPE: 3.1, mapeRating: 'excellent', urgency: 'none',
    lastRecalibrated: '2025-01-12',
    actuals: [90, 95, 88, 85, 80, 70, 65, 60, 72, 88, 98, 105],
    forecasts: [92, 94, 87, 84, 81, 69, 64, 61, 73, 87, 97, 104],
  },
  {
    skuId: 'SKU-007', productName: 'Clutch Plate Set', currentMAPE: 14.2, mapeRating: 'fair', urgency: 'medium',
    lastRecalibrated: '2024-10-20',
    actuals: [120, 130, 115, 110, 100, 85, 75, 70, 80, 105, 125, 140],
    forecasts: [140, 150, 130, 125, 115, 70, 60, 55, 65, 90, 110, 130],
  },
  {
    skuId: 'SKU-008', productName: 'Headlight Bulb H4', currentMAPE: 22.4, mapeRating: 'poor', urgency: 'critical',
    lastRecalibrated: '2024-07-10',
    actuals: [180, 190, 170, 165, 155, 130, 115, 110, 125, 160, 195, 210],
    forecasts: [240, 250, 230, 220, 210, 170, 150, 145, 160, 200, 240, 260],
  },
];

// Recalibration history
interface RecalHistoryEntry {
  timestamp: string;
  skuId: string;
  productName: string;
  changes: string[];
  mapeBefore: number;
  mapeAfter: number;
}

const DEMO_HISTORY: RecalHistoryEntry[] = [
  {
    timestamp: '2025-01-12T10:00:00Z',
    skuId: 'SKU-006', productName: 'Air Filter CG125',
    changes: ['alpha: 0.30 -> 0.35', 'changepoint_prior_scale: 0.050 -> 0.052'],
    mapeBefore: 5.8, mapeAfter: 3.1,
  },
  {
    timestamp: '2025-01-10T14:30:00Z',
    skuId: 'SKU-001', productName: 'Brake Pad Set (Disc)',
    changes: ['alpha: 0.28 -> 0.33', 'bias correction: +12'],
    mapeBefore: 6.4, mapeAfter: 4.2,
  },
  {
    timestamp: '2024-12-20T09:15:00Z',
    skuId: 'SKU-002', productName: 'Chain Kit 428H',
    changes: ['alpha: 0.25 -> 0.30', 'sigma_threshold: 2.0 -> 3.0'],
    mapeBefore: 10.2, mapeAfter: 7.8,
  },
  {
    timestamp: '2024-11-05T16:45:00Z',
    skuId: 'SKU-003', productName: 'Tire 100/90-17 (Rear)',
    changes: ['alpha: 0.30 -> 0.45', 'changepoint_prior_scale: 0.050 -> 0.068'],
    mapeBefore: 16.8, mapeAfter: 12.5,
  },
];

// =============================================
// Helpers
// =============================================

function getUrgencyConfig(urgency: string) {
  switch (urgency) {
    case 'critical': return { color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/20', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    case 'high': return { color: 'text-orange-600', bg: 'bg-orange-500/10', border: 'border-orange-500/20', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
    case 'medium': return { color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'low': return { color: 'text-sky-600', bg: 'bg-sky-500/10', border: 'border-sky-500/20', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' };
    default: return { color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
  }
}

function getMapeBarColor(mape: number): string {
  if (mape < 5) return '#10b981';
  if (mape < 10) return '#f59e0b';
  if (mape < 20) return '#f97316';
  return '#ef4444';
}

function getRatingBadge(rating: string) {
  switch (rating) {
    case 'excellent': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'good': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'fair': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'poor': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'unusable': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default: return '';
  }
}

// =============================================
// Component
// =============================================

export function RecalibrationDashboard() {
  const [recalibrating, setRecalibrating] = useState<Set<string>>(new Set());
  const [runningBacktest, setRunningBacktest] = useState(false);

  // Compute summary
  const summary = useMemo(() => {
    const total = DEMO_PRODUCTS.length;
    const needing = DEMO_PRODUCTS.filter(p => p.urgency !== 'none').length;
    const byUrgency = { critical: 0, high: 0, medium: 0, low: 0 };
    DEMO_PRODUCTS.forEach(p => {
      if (p.urgency !== 'none') byUrgency[p.urgency as keyof typeof byUrgency]++;
    });
    return { total, needing, byUrgency };
  }, []);

  // MAPE distribution data for histogram
  const mapeDistribution = useMemo(() => {
    const bins = [
      { range: '0-5', min: 0, max: 5, count: 0 },
      { range: '5-10', min: 5, max: 10, count: 0 },
      { range: '10-15', min: 10, max: 15, count: 0 },
      { range: '15-20', min: 15, max: 20, count: 0 },
      { range: '20-25', min: 20, max: 25, count: 0 },
      { range: '25-30', min: 25, max: 30, count: 0 },
      { range: '30+', min: 30, max: 100, count: 0 },
    ];
    DEMO_PRODUCTS.forEach(p => {
      for (const bin of bins) {
        if (p.currentMAPE >= bin.min && p.currentMAPE < bin.max) {
          bin.count++;
          break;
        }
      }
    });
    return bins;
  }, []);

  // Backtest results (demo)
  const backtestResults = useMemo(() => [
    { model: 'Moving Average', mape: 12.4, color: '#6366f1' },
    { model: 'Exp Smoothing', mape: 9.8, color: '#8b5cf6' },
    { model: 'Naive', mape: 15.2, color: '#a855f7' },
    { model: 'Seasonal Naive', mape: 8.3, color: '#10b981' },
  ], []);

  const bestModel = backtestResults.reduce((best, r) => r.mape < best.mape ? r : best, backtestResults[0]);

  // Sort products for table
  const sortedProducts = useMemo(() => {
    return [...DEMO_PRODUCTS].sort((a, b) => b.currentMAPE - a.currentMAPE);
  }, []);

  const handleRecalibrate = (skuId: string) => {
    setRecalibrating(prev => new Set(prev).add(skuId));
    setTimeout(() => {
      setRecalibrating(prev => {
        const next = new Set(prev);
        next.delete(skuId);
        return next;
      });
    }, 2000);
  };

  const handleRecalibrateAllCritical = () => {
    const critical = DEMO_PRODUCTS.filter(p => p.urgency === 'critical');
    critical.forEach(p => handleRecalibrate(p.skuId));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-rose-500" />
              <CardTitle className="text-base">Auto-Recalibration Dashboard</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              4-Trigger Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Monitoring forecast accuracy and auto-recalibration triggers across all products
          </p>
        </CardHeader>
      </Card>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Products</p>
            <p className="text-2xl font-mono font-semibold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Need Recalibration</p>
            <p className="text-2xl font-mono font-semibold text-rose-600">{summary.needing}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-red-500 uppercase tracking-wider">Critical</p>
            <p className="text-2xl font-mono font-semibold text-red-600">{summary.byUrgency.critical}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-orange-500 uppercase tracking-wider">High</p>
            <p className="text-2xl font-mono font-semibold text-orange-600">{summary.byUrgency.high}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Last Run</p>
            <p className="text-xs font-mono text-foreground mt-1">2025-01-15</p>
            <p className="text-[10px] text-muted-foreground">08:30 UTC</p>
          </CardContent>
        </Card>
      </div>

      {/* MAPE Distribution Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            MAPE Distribution
            <Badge variant="secondary" className="text-[10px] ml-auto">Threshold: 10%</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mapeDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" label={{ value: 'MAPE %', position: 'insideBottom', offset: -2, fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md text-xs">
                      <p className="font-medium">MAPE {label}%</p>
                      <p>{payload[0].value} products</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" name="Products" radius={[4, 4, 0, 0]}>
                {mapeDistribution.map((entry, idx) => (
                  <Cell key={idx} fill={getMapeBarColor((entry.min + entry.max) / 2)} />
                ))}
              </Bar>
              <ReferenceLine x={2} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: '10%', position: 'top', fontSize: 10, fill: '#ef4444' }} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground px-2">
            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> &lt;5%</div>
            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> 5-10%</div>
            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-orange-500" /> 10-20%</div>
            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-red-500" /> &gt;20%</div>
          </div>
        </CardContent>
      </Card>

      {/* Products Needing Recalibration Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Products Needing Recalibration
            </CardTitle>
            <Button
              variant="destructive"
              size="sm"
              className="text-xs"
              onClick={handleRecalibrateAllCritical}
              disabled={summary.byUrgency.critical === 0}
            >
              <Zap className="h-3 w-3 mr-1" />
              Recalibrate All Critical
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-2 text-left font-medium">SKU</th>
                  <th className="py-2 px-2 text-left font-medium">Product Name</th>
                  <th className="py-2 px-2 text-right font-medium">MAPE</th>
                  <th className="py-2 px-2 text-center font-medium">Rating</th>
                  <th className="py-2 px-2 text-center font-medium">Urgency</th>
                  <th className="py-2 px-2 text-right font-medium">Last Recal</th>
                  <th className="py-2 px-2 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.filter(p => p.urgency !== 'none').map((product) => {
                  const urgConfig = getUrgencyConfig(product.urgency);
                  const isRecalibrating = recalibrating.has(product.skuId);
                  return (
                    <tr key={product.skuId} className={cn('border-b border-border/50', urgConfig.bg)}>
                      <td className="py-2 px-2 font-mono">{product.skuId}</td>
                      <td className="py-2 px-2">{product.productName}</td>
                      <td className="py-2 px-2 text-right font-mono font-semibold">{product.currentMAPE}%</td>
                      <td className="py-2 px-2 text-center">
                        <Badge className={cn('text-[10px]', getRatingBadge(product.mapeRating))}>{product.mapeRating}</Badge>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Badge className={cn('text-[10px]', urgConfig.badge)}>{product.urgency}</Badge>
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{product.lastRecalibrated}</td>
                      <td className="py-2 px-2 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-6"
                          onClick={() => handleRecalibrate(product.skuId)}
                          disabled={isRecalibrating}
                        >
                          {isRecalibrating ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Backtest Results Panel */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-violet-500" />
              Backtest Results
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => { setRunningBacktest(true); setTimeout(() => setRunningBacktest(false), 3000); }}
              disabled={runningBacktest}
            >
              {runningBacktest ? (
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Run Full Backtest
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {backtestResults.map((r) => (
              <div
                key={r.model}
                className={cn(
                  'p-3 rounded-md border text-center',
                  r.model === bestModel.model
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border bg-muted/50'
                )}
              >
                <p className="text-[10px] text-muted-foreground">{r.model}</p>
                <p className={cn(
                  'text-lg font-mono font-semibold',
                  r.mape < 10 ? 'text-emerald-600' : r.mape < 15 ? 'text-amber-600' : 'text-red-600'
                )}>
                  {r.mape}%
                </p>
                {r.model === bestModel.model && (
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px] mt-1 dark:bg-emerald-900/30 dark:text-emerald-400">Best</Badge>
                )}
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={backtestResults} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={[0, 20]} />
              <YAxis type="category" dataKey="model" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={100} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload as typeof backtestResults[0] | undefined;
                  if (!d) return null;
                  return (
                    <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md text-xs">
                      <p className="font-medium">{d.model}</p>
                      <p>MAPE: <span className="font-mono font-semibold">{d.mape}%</span></p>
                    </div>
                  );
                }}
              />
              <ReferenceLine x={10} stroke="#ef4444" strokeDasharray="3 3" />
              <Bar dataKey="mape" name="MAPE" radius={[0, 4, 4, 0]}>
                {backtestResults.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recalibration History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-sky-500" />
            Recalibration History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {DEMO_HISTORY.map((entry, idx) => {
              const improved = entry.mapeAfter < entry.mapeBefore;
              return (
                <div key={idx} className="relative pl-6 pb-3">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1 h-3 w-3 rounded-full bg-sky-500 border-2 border-background" />
                  {idx < DEMO_HISTORY.length - 1 && (
                    <div className="absolute left-1.5 top-4 w-0.5 h-full bg-border" />
                  )}
                  <div className="text-xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.productName}</span>
                      <Badge variant="outline" className="text-[10px]">{entry.skuId}</Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.changes.map((change, cIdx) => (
                        <Badge key={cIdx} variant="secondary" className="text-[10px] font-mono">
                          {change}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        MAPE: <span className="font-mono font-semibold text-rose-600">{entry.mapeBefore}%</span>
                        <ArrowRight className="inline h-3 w-3 mx-1" />
                        <span className={cn('font-mono font-semibold', improved ? 'text-emerald-600' : 'text-rose-600')}>
                          {entry.mapeAfter}%
                        </span>
                      </span>
                      {improved && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px] dark:bg-emerald-900/30 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" />
                          -{(entry.mapeBefore - entry.mapeAfter).toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


