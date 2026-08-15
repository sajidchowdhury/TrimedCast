'use client';

// ============================================
// TrimedCast What-If Scenario Simulation Panel
// Session 22: Core UI for Scenario Analysis
//
// Features:
//   - Product selector + Modification type tabs
//   - Type-specific controls (Lead Time, Promo, SL, Qty, Price)
//   - Dual-line shadow forecast chart with BD season bands
//   - Impact summary cards with direction indicators
//   - Recommendation panel with risk flags
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceArea,
} from 'recharts';
import {
  GitBranch,
  Ship,
  Plane,
  Megaphone,
  Shield,
  Package,
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Brain,
  Lock,
  Info,
  BarChart3,
  Zap,
  Target,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  runLeadTimeScenario,
  runPromoIndexScenario,
  runServiceLevelScenario,
  runPriceScenario,
  runOrderQuantityScenario,
  generateShadowForecast,
  compareSeaVsAir,
  LEAD_TIME_CONFIG,
  FREIGHT_COST,
  type ScenarioModificationType,
  type ScenarioBaseState,
  type ScenarioResult,
  type ShadowForecastPoint,
  type LeadTimeMode,
  type SeaVsAirComparison,
} from '@/lib/forecasting/scenario-engine';
import { BD_SEASONS, getBDSeason, type BDSeason, type SeasonInfo } from '@/lib/forecasting/models';
import { useForecastStore } from '@/lib/forecasting/store';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface ChartDataPoint {
  month: string;
  baseline: number;
  scenario: number;
  baselineLower: number;
  baselineUpper: number;
  scenarioLower: number;
  scenarioUpper: number;
  season: BDSeason;
}

const SERVICE_LEVEL_OPTIONS = [
  { value: '0.90', label: '90%' },
  { value: '0.95', label: '95%' },
  { value: '0.975', label: '97.5%' },
  { value: '0.99', label: '99%' },
] as const;

const MODIFICATION_TABS: {
  value: ScenarioModificationType;
  label: string;
  icon: typeof GitBranch;
}[] = [
  { value: 'lead_time_mode', label: 'Lead Time', icon: Ship },
  { value: 'promo_index', label: 'Promo Index', icon: Megaphone },
  { value: 'service_level', label: 'Service Level', icon: Shield },
  { value: 'order_quantity', label: 'Order Qty', icon: Package },
  { value: 'price', label: 'Price', icon: CircleDollarSign },
];

const SEASON_COLORS: Record<BDSeason, string> = {
  winter: 'rgba(59, 130, 246, 0.08)',
  monsoon: 'rgba(107, 114, 128, 0.08)',
  summer: 'rgba(249, 115, 22, 0.08)',
  pre_winter: 'rgba(34, 197, 94, 0.08)',
};

const SEASON_BORDER_COLORS: Record<BDSeason, string> = {
  winter: 'rgba(59, 130, 246, 0.15)',
  monsoon: 'rgba(107, 114, 128, 0.15)',
  summer: 'rgba(249, 115, 22, 0.15)',
  pre_winter: 'rgba(34, 197, 94, 0.15)',
};

// ============================================
// Component
// ============================================

export function WhatIfScenarioPanel() {
  // --- Store ---
  const {
    products,
    selectedProductId,
    forecastResult,
    shippingMethod,
    serviceLevel,
    fetchProducts,
    setSelectedProductId,
  } = useForecastStore();

  // --- Local state ---
  const [modType, setModType] = useState<ScenarioModificationType>('lead_time_mode');
  const [computing, setComputing] = useState(false);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [seaVsAirResult, setSeaVsAirResult] = useState<SeaVsAirComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);

  // Modification-specific state
  const [leadTimeMode, setLeadTimeMode] = useState<LeadTimeMode>('air');
  const [promoIndex, setPromoIndex] = useState(0.5);
  const [selectedServiceLevel, setSelectedServiceLevel] = useState('0.975');
  const [orderQuantity, setOrderQuantity] = useState(200);
  const [unitPrice, setUnitPrice] = useState(850);

  // --- Derived base state ---
  const baseState: ScenarioBaseState | null = useMemo(() => {
    if (!forecastResult) return null;

    const fr = forecastResult;
    const demand = fr.forecast.points.length > 0
      ? fr.forecast.points.reduce((s, p) => s + p.predicted, 0) / fr.forecast.points.length
      : 100;
    const demandStdDev = Math.sqrt(
      fr.forecast.points.length > 0
        ? fr.forecast.points.reduce((s, p) => s + Math.pow(p.predicted - demand, 2), 0) / fr.forecast.points.length
        : 100
    );

    return {
      avgMonthlyDemand: Math.round(demand),
      demandStdDev: Math.round(demandStdDev),
      leadTimeMode: shippingMethod,
      avgLeadTimeDays: fr.leadTime.total,
      leadTimeStdDev: shippingMethod === 'sea' ? 15 : 5,
      serviceLevel,
      unitPrice,
      unitCost: unitPrice * 0.6,
      promoIndex,
      orderQuantity,
      orderingCost: 2500,
      holdingCostPct: 0.20,
      annualDemand: Math.round(demand * 12),
    };
  }, [forecastResult, shippingMethod, serviceLevel, unitPrice, promoIndex, orderQuantity]);

  // --- Fetch products on mount ---
  useEffect(() => {
    if (products.length === 0) fetchProducts();
  }, [products.length, fetchProducts]);

  // --- Run scenario computation ---
  const runScenario = useCallback(async () => {
    if (!baseState) {
      setError('No forecast data available. Generate a forecast first.');
      return;
    }

    setComputing(true);
    setError(null);

    try {
      // Small delay for UX feedback
      await new Promise((r) => setTimeout(r, 150));

      let result: ScenarioResult;

      switch (modType) {
        case 'lead_time_mode':
          result = runLeadTimeScenario(baseState, leadTimeMode);
          // Also run sea vs air comparison
          try {
            const comparison = compareSeaVsAir(baseState);
            setSeaVsAirResult(comparison);
          } catch {
            setSeaVsAirResult(null);
          }
          break;
        case 'promo_index':
          result = runPromoIndexScenario(baseState, promoIndex);
          break;
        case 'service_level':
          result = runServiceLevelScenario(baseState, parseFloat(selectedServiceLevel));
          break;
        case 'order_quantity':
          result = runOrderQuantityScenario(baseState, orderQuantity);
          break;
        case 'price':
          result = runPriceScenario(baseState, unitPrice);
          break;
        default:
          throw new Error(`Unknown modification type: ${modType}`);
      }

      setScenarioResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scenario computation failed');
      setScenarioResult(null);
    } finally {
      setComputing(false);
    }
  }, [baseState, modType, leadTimeMode, promoIndex, selectedServiceLevel, orderQuantity, unitPrice]);

  // --- Auto-run scenario when inputs change ---
  useEffect(() => {
    if (baseState) {
      runScenario();
    }
  }, [baseState, modType, leadTimeMode, promoIndex, selectedServiceLevel, orderQuantity, unitPrice]);

  // --- Chart data ---
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!scenarioResult) return [];

    return scenarioResult.shadowForecast.map((pt: ShadowForecastPoint) => {
      const monthDate = new Date(pt.month);
      const monthNum = monthDate.getMonth() + 1;
      const seasonInfo = getBDSeason(monthNum);

      return {
        month: pt.month,
        baseline: Math.round(pt.baseline),
        scenario: Math.round(pt.scenario),
        baselineLower: Math.round(pt.baseline * 0.85),
        baselineUpper: Math.round(pt.baseline * 1.15),
        scenarioLower: Math.round(pt.lowerBound),
        scenarioUpper: Math.round(pt.upperBound),
        season: seasonInfo.season,
      };
    });
  }, [scenarioResult]);

  // --- Season bands for chart ---
  const seasonBands = useMemo(() => {
    if (chartData.length === 0) return [];
    const bands: { season: BDSeason; startIdx: number; endIdx: number }[] = [];
    let currentSeason: BDSeason | null = null;
    let startIdx = 0;

    chartData.forEach((pt, idx) => {
      if (pt.season !== currentSeason) {
        if (currentSeason !== null) {
          bands.push({ season: currentSeason, startIdx, endIdx: idx - 1 });
        }
        currentSeason = pt.season;
        startIdx = idx;
      }
    });

    if (currentSeason !== null) {
      bands.push({ season: currentSeason, startIdx, endIdx: chartData.length - 1 });
    }

    return bands;
  }, [chartData]);

  // --- AI analysis handler ---
  const handleAiAnalysis = useCallback(async () => {
    if (!scenarioResult || !baseState) return;

    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/scenario-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modificationType: modType,
          baseState,
          scenarioResult,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setAiRecommendation(json.recommendation || json.data?.recommendation || 'Analysis complete.');
      } else {
        setAiRecommendation('AI analysis is not available for this scenario. Please review the impact metrics manually.');
      }
    } catch {
      setAiRecommendation('Unable to reach AI service. Review the impact metrics and risk flags above for guidance.');
    } finally {
      setAiLoading(false);
    }
  }, [scenarioResult, baseState, modType]);

  // --- Find selected product ---
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // --- Direction icon helper ---
  const DirectionIcon = ({ direction }: { direction: 'positive' | 'negative' | 'neutral' }) => {
    if (direction === 'positive') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (direction === 'negative') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  // --- Custom chart tooltip ---
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-violet-500" />
            What-If Scenario Simulation
          </h2>
          <p className="text-sm text-muted-foreground">
            Simulate changes and see their impact on your supply chain
          </p>
        </div>
        {selectedProduct && (
          <Badge variant="outline" className="text-xs w-fit">
            {selectedProduct.sku} - {selectedProduct.name}
          </Badge>
        )}
      </div>

      {/* No forecast warning */}
      {!forecastResult && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Info className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">No forecast data loaded</p>
              <p className="text-xs text-muted-foreground">
                Select a product and generate a forecast first to enable scenario analysis.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ============================================ */}
        {/* Left Column: Scenario Configuration */}
        {/* ============================================ */}
        <div className="lg:col-span-1 space-y-4">
          {/* Product Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-violet-500" />
                Product Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={selectedProductId ?? ''}
                onValueChange={(val) => setSelectedProductId(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProduct && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Category: {selectedProduct.category}</p>
                  <p>Stock: {selectedProduct.currentStock} | Safety: {selectedProduct.safetyStock}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modification Type Tabs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-500" />
                Modification Type
              </CardTitle>
              <CardDescription className="text-xs">
                Choose what to simulate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={modType}
                onValueChange={(val) => setModType(val as ScenarioModificationType)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-5 h-auto p-1">
                  {MODIFICATION_TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="text-xs px-1 py-1.5 data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-600"
                    >
                      <tab.icon className="h-3.5 w-3.5 mb-0.5" />
                      <span className="hidden sm:inline ml-1">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Lead Time Controls */}
                <TabsContent value="lead_time_mode" className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-xs font-medium">Shipping Mode</Label>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Ship className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Sea</span>
                        <span className="text-xs text-muted-foreground">({LEAD_TIME_CONFIG.sea.total}d)</span>
                      </div>
                      <Switch
                        checked={leadTimeMode === 'air'}
                        onCheckedChange={(checked) => setLeadTimeMode(checked ? 'air' : 'sea')}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Air</span>
                        <Plane className="h-4 w-4 text-orange-500" />
                        <span className="text-xs text-muted-foreground">({LEAD_TIME_CONFIG.air.total}d)</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted/20 rounded-md">
                      <p>Sea: {LEAD_TIME_CONFIG.sea.manufacturing}d mfg + {LEAD_TIME_CONFIG.sea.shipping}d ship + {LEAD_TIME_CONFIG.sea.customs}d customs + {LEAD_TIME_CONFIG.sea.internal}d internal</p>
                      <p>Air: {LEAD_TIME_CONFIG.air.manufacturing}d mfg + {LEAD_TIME_CONFIG.air.shipping}d ship + {LEAD_TIME_CONFIG.air.customs}d customs + {LEAD_TIME_CONFIG.air.internal}d internal</p>
                      <p className="mt-1 font-medium">Freight: Sea BDT {FREIGHT_COST.sea}/unit | Air BDT {FREIGHT_COST.air}/unit</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Promo Index Controls */}
                <TabsContent value="promo_index" className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Promo Index</Label>
                      <span className="text-sm font-mono font-medium text-violet-600">{promoIndex.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[promoIndex]}
                      onValueChange={([val]) => setPromoIndex(val)}
                      min={0}
                      max={1}
                      step={0.01}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.00 (None)</span>
                      <span>0.50</span>
                      <span>1.00 (Max)</span>
                    </div>
                    <p className="text-xs text-muted-foreground p-2 bg-muted/20 rounded-md">
                      Promo index scales demand via the demand model: D = {`beta_0 + beta_1 * Price + beta_2 * PromoIndex`}. Higher promo drives more demand but increases inventory costs.
                    </p>
                  </div>
                </TabsContent>

                {/* Service Level Controls */}
                <TabsContent value="service_level" className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-xs font-medium">Service Level Target</Label>
                    <Select
                      value={selectedServiceLevel}
                      onValueChange={setSelectedServiceLevel}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select service level..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_LEVEL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted/20 rounded-md">
                      <p>Higher service level = more safety stock = lower stockout risk</p>
                      <p>90%: k=1.28 | 95%: k=1.65 | 97.5%: k=1.96 | 99%: k=2.33</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Order Quantity Controls */}
                <TabsContent value="order_quantity" className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Order Quantity</Label>
                      {baseState && (
                        <span className="text-xs text-muted-foreground">
                          EOQ: {Math.round(Math.sqrt(2 * baseState.annualDemand * baseState.orderingCost / (baseState.unitCost * baseState.holdingCostPct)))} units
                        </span>
                      )}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full"
                    />
                    {baseState && (
                      <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted/20 rounded-md">
                        <p>Current EOQ reference: {Math.round(Math.sqrt(2 * baseState.annualDemand * baseState.orderingCost / (baseState.unitCost * baseState.holdingCostPct)))} units</p>
                        <p>Ordering cost: BDT {baseState.orderingCost.toLocaleString()} per order</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Price Controls */}
                <TabsContent value="price" className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Unit Price (BDT)</Label>
                      {baseState && (
                        <span className="text-xs text-muted-foreground">
                          Current: BDT {baseState.unitPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded-md">
                      <p>Price changes affect demand via elasticity model. Higher price reduces demand volume but may increase margin.</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Sea vs Air comparison (only for lead time tab) */}
          <AnimatePresence>
            {modType === 'lead_time_mode' && seaVsAirResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      Sea vs Air Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 rounded-md border border-blue-500/20 bg-blue-500/5">
                        <Ship className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                        <p className="text-xs font-medium">Sea</p>
                        <p className="text-lg font-bold">BDT {Math.round(seaVsAirResult.riskAnalysis.seaTotalCostOfOwnership).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total CoO</p>
                      </div>
                      <div className="text-center p-2 rounded-md border border-orange-500/20 bg-orange-500/5">
                        <Plane className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                        <p className="text-xs font-medium">Air</p>
                        <p className="text-lg font-bold">BDT {Math.round(seaVsAirResult.riskAnalysis.airTotalCostOfOwnership).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total CoO</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recommended:</span>
                        <Badge variant={seaVsAirResult.recommendation === 'air' ? 'default' : 'secondary'} className="text-xs">
                          {seaVsAirResult.recommendation === 'air' ? 'Air Freight' : 'Sea Freight'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Net Savings:</span>
                        <span className={cn('font-medium', seaVsAirResult.netSavingsBDT >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          BDT {Math.round(Math.abs(seaVsAirResult.netSavingsBDT)).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sea Stockout Risk:</span>
                        <span>{(seaVsAirResult.riskAnalysis.seaStockoutProbability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Air Stockout Risk:</span>
                        <span>{(seaVsAirResult.riskAnalysis.airStockoutProbability * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ============================================ */}
        {/* Right Column: Chart + Impact + Recommendation */}
        {/* ============================================ */}
        <div className="lg:col-span-2 space-y-4">
          {/* Loading state */}
          {computing && (
            <Card>
              <CardContent className="p-8 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <p className="text-sm text-muted-foreground">Computing scenario...</p>
              </CardContent>
            </Card>
          )}

          {/* Error state */}
          {error && !computing && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-600">Scenario Error</p>
                  <p className="text-xs text-muted-foreground">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shadow Forecast Chart */}
          {scenarioResult && !computing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-violet-500" />
                      Shadow Forecast
                    </CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-6 rounded-sm bg-violet-500" />
                        <span>Baseline</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-0.5 w-6 border-t-2 border-dashed border-violet-300" />
                        <span>Scenario</span>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    Comparing current state vs what-if scenario over 6 months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />

                        {/* BD Season background bands */}
                        {seasonBands.map((band, idx) => {
                          const startMonth = chartData[band.startIdx]?.month;
                          const endMonth = chartData[band.endIdx]?.month;
                          if (!startMonth || !endMonth) return null;
                          return (
                            <ReferenceArea
                              key={`season-${idx}`}
                              x1={startMonth}
                              x2={endMonth}
                              fill={SEASON_COLORS[band.season]}
                              stroke={SEASON_BORDER_COLORS[band.season]}
                              strokeWidth={0.5}
                            />
                          );
                        })}

                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          axisLine={{ stroke: 'var(--border)' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          axisLine={{ stroke: 'var(--border)' }}
                          tickLine={false}
                          tickFormatter={(val: number) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val)}
                        />

                        {/* Baseline confidence interval */}
                        <Area
                          dataKey="baselineUpper"
                          fill="rgba(139, 92, 246, 0.06)"
                          stroke="none"
                          name="Baseline Upper"
                        />
                        <Area
                          dataKey="baselineLower"
                          fill="var(--background)"
                          stroke="none"
                          name="Baseline Lower"
                        />

                        {/* Scenario confidence interval */}
                        <Area
                          dataKey="scenarioUpper"
                          fill="rgba(168, 85, 247, 0.08)"
                          stroke="none"
                          name="Scenario Upper"
                        />
                        <Area
                          dataKey="scenarioLower"
                          fill="var(--background)"
                          stroke="none"
                          name="Scenario Lower"
                        />

                        {/* Baseline line (solid) */}
                        <Line
                          type="monotone"
                          dataKey="baseline"
                          stroke="rgb(139, 92, 246)"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: 'rgb(139, 92, 246)', strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                          name="Baseline"
                        />

                        {/* Scenario line (dashed) */}
                        <Line
                          type="monotone"
                          dataKey="scenario"
                          stroke="rgb(168, 85, 247)"
                          strokeWidth={2}
                          strokeDasharray="6 3"
                          dot={{ r: 3, fill: 'rgb(168, 85, 247)', strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                          name="Scenario"
                        />

                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                          iconType="line"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Season legend */}
                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground font-medium">BD Seasons:</span>
                    {BD_SEASONS.map((s) => (
                      <div key={s.season} className="flex items-center gap-1.5 text-xs">
                        <div
                          className="h-2.5 w-2.5 rounded-sm border"
                          style={{
                            backgroundColor: SEASON_COLORS[s.season].replace('0.08', '0.3'),
                            borderColor: SEASON_BORDER_COLORS[s.season].replace('0.15', '0.4'),
                          }}
                        />
                        <span className="text-muted-foreground">{s.label.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Impact Summary Cards */}
          {scenarioResult && !computing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4 text-violet-500" />
                      Impact Summary
                    </CardTitle>
                    {scenarioResult.confidenceLevel > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {(scenarioResult.confidenceLevel * 100).toFixed(0)}% confidence
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {scenarioResult.impacts.map((impact, idx) => (
                      <motion.div
                        key={impact.metric}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                      >
                        <div className={cn(
                          'p-3 rounded-lg border transition-colors',
                          impact.direction === 'positive'
                            ? 'border-emerald-500/20 bg-emerald-500/5'
                            : impact.direction === 'negative'
                              ? 'border-red-500/20 bg-red-500/5'
                              : 'border-border bg-muted/30'
                        )}>
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">{impact.metric}</span>
                            <DirectionIcon direction={impact.direction} />
                          </div>
                          <div className="flex items-baseline gap-1.5 mb-1">
                            <span className="text-sm font-semibold">{impact.baseline.toLocaleString()}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-bold">{impact.scenario.toLocaleString()}</span>
                            {impact.unit && (
                              <span className="text-xs text-muted-foreground ml-0.5">{impact.unit}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-xs font-medium',
                              impact.direction === 'positive' ? 'text-emerald-600' : impact.direction === 'negative' ? 'text-red-600' : 'text-muted-foreground'
                            )}>
                              {impact.change >= 0 ? '+' : ''}{impact.change.toLocaleString()} {impact.unit}
                            </span>
                            <span className={cn(
                              'text-xs',
                              impact.direction === 'positive' ? 'text-emerald-600' : impact.direction === 'negative' ? 'text-red-600' : 'text-muted-foreground'
                            )}>
                              ({impact.changePercent >= 0 ? '+' : ''}{impact.changePercent.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Total Net Impact */}
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between p-3 rounded-lg border border-violet-500/20 bg-violet-500/5">
                    <div className="flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-violet-500" />
                      <span className="text-sm font-medium">Total Net Impact (BDT/year)</span>
                    </div>
                    <span className={cn(
                      'text-lg font-bold',
                      scenarioResult.totalCostImpact <= 0 ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {scenarioResult.totalCostImpact >= 0 ? '+' : ''}BDT {Math.round(Math.abs(scenarioResult.totalCostImpact)).toLocaleString()}
                      {scenarioResult.totalCostImpact <= 0 ? ' saved' : ' additional'}
                    </span>
                  </div>

                  {/* Risk Flags */}
                  {scenarioResult.riskFlags.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Risk Flags
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {scenarioResult.riskFlags.map((flag, idx) => {
                          const isWarning = flag.toLowerCase().includes('warning') || flag.toLowerCase().includes('critical');
                          return (
                            <Badge
                              key={idx}
                              variant={isWarning ? 'destructive' : 'outline'}
                              className="text-xs max-w-[300px] hyphens-auto"
                            >
                              {flag}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recommendation Panel */}
          {scenarioResult && !computing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-violet-500" />
                    Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scenario modifications */}
                  {scenarioResult.modifications.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Scenario Changes:</p>
                      {scenarioResult.modifications.map((mod, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3.5 w-3.5 text-violet-500" />
                          <span>{mod.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Separator />

                  {/* Recommendation text */}
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-sm leading-relaxed">{scenarioResult.recommendation}</p>
                  </div>

                  {/* AI recommendation (if available) */}
                  {aiRecommendation && (
                    <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Brain className="h-3.5 w-3.5 text-violet-500" />
                        <span className="text-xs font-medium text-violet-600">AI Analysis</span>
                      </div>
                      <p className="text-sm leading-relaxed">{aiRecommendation}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="flex-1 sm:flex-none gap-2"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Apply Scenario
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Scenarios are for analysis only and cannot be applied directly.</p>
                      </TooltipContent>
                    </Tooltip>

                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 sm:flex-none gap-2 bg-violet-600 hover:bg-violet-700"
                      onClick={handleAiAnalysis}
                      disabled={aiLoading || !scenarioResult}
                    >
                      {aiLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Brain className="h-3.5 w-3.5" />
                      )}
                      Run AI Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Empty state when no scenario result and not computing */}
          {!scenarioResult && !computing && !error && (
            <Card>
              <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
                <GitBranch className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Configure a scenario on the left to see the shadow forecast and impact analysis
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
