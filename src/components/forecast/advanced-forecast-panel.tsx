'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Brain,
  TrendingUp,
  Target,
  Sparkles,
  CalendarDays,
  LineChart,
  Sigma,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react';

// --- Types matching API response ---

interface ForecastPointClient {
  date: string;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  season: string;
  confidence: number;
}

interface ForecastMetricsClient {
  mape: number;
  mae: number;
  rmse: number;
  bias: number;
}

interface ModelResult {
  model: string;
  points: ForecastPointClient[];
  metrics: ForecastMetricsClient;
  params: Record<string, unknown>;
}

interface ConsensusStage {
  name: string;
  value: number;
  adjustment: number;
  note: string;
}

interface ConsensusResult {
  finalForecast: number;
  stages: ConsensusStage[];
  governanceNotes: string[];
  bestModel: string;
}

interface RegressionInfo {
  beta0: number;
  beta1: number;
  beta2: number;
  rSquared: number;
  pValues: { beta0: number; beta1: number; beta2: number };
  confidence: string;
  validationNotes: string[];
}

interface AdvancedForecastData {
  results: Record<string, ModelResult>;
  consensus: ConsensusResult | null;
  bestModel: string;
  holidays: { holiday: string; ds: string; lower_window: number; upper_window: number }[];
  product: { id: string; sku: string | null; name: string | null; category: string | null };
  inventory: { currentStock: number; availableStock: number; safetyStock: number | null; reorderPoint: number | null } | null;
  dataPoints: number;
}

// --- Model Labels ---

const MODEL_LABELS: Record<string, string> = {
  prophet_bd: 'Prophet BD',
  ets_autotune: 'ETS Auto-Tune',
  regression: 'Multi-Linear Regression',
  moving_average: 'Moving Average',
  exponential_smoothing: 'Exponential Smoothing',
  seasonal_decomposition: 'Seasonal Decomposition',
  prophet_like: 'Prophet-Like',
  consensus: 'Consensus',
};

const MODEL_ICONS: Record<string, React.ReactNode> = {
  prophet_bd: <Brain className="h-4 w-4 text-purple-600" />,
  ets_autotune: <LineChart className="h-4 w-4 text-teal-600" />,
  regression: <Sigma className="h-4 w-4 text-orange-600" />,
  consensus: <Sparkles className="h-4 w-4 text-emerald-600" />,
};

const METHOD_OPTIONS = [
  { key: 'prophet_bd', label: 'Prophet BD', desc: 'Fourier + BD seasonalities + holidays' },
  { key: 'ets_autotune', label: 'ETS Auto-Tune', desc: 'Holt-Winters with auto alpha/alpha tuning' },
  { key: 'regression', label: 'Regression', desc: 'D(F) = β₀ + β₁(Price) + β₂(PromoIndex)' },
];

// --- Component ---

interface AdvancedForecastPanelProps {
  productId: string | null;
  productSku?: string;
  productName?: string;
}

export function AdvancedForecastPanel({ productId }: AdvancedForecastPanelProps) {
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['prophet_bd', 'ets_autotune', 'regression']);
  const [horizonDays, setHorizonDays] = useState(90);
  const [includeHolidays, setIncludeHolidays] = useState(true);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdvancedForecastData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  const toggleMethod = useCallback((method: string) => {
    setSelectedMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  }, []);

  const runAdvancedForecast = useCallback(async () => {
    if (!productId || selectedMethods.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/forecast/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 'demo-bd-motors',
          productId,
          methods: selectedMethods,
          horizonDays,
          includeHolidays,
          includeCNY: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Advanced forecast failed');
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Advanced forecast failed');
      setData(json.data as AdvancedForecastData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [productId, selectedMethods, horizonDays, includeHolidays]);

  // --- Render ---

  const validResults = data
    ? Object.entries(data.results).filter(([, r]) => r.metrics.mape < Infinity && r.points.length > 0)
    : [];

  const sortedResults = [...validResults].sort((a, b) => a[1].metrics.mape - b[1].metrics.mape);

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Advanced Forecasting Models
          </CardTitle>
          <CardDescription>
            Prophet with BD seasonalities, auto-tuned ETS, multi-linear regression, and consensus forecasting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Method selection */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Select Models</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {METHOD_OPTIONS.map(opt => (
                  <div
                    key={opt.key}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedMethods.includes(opt.key)
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => toggleMethod(opt.key)}
                  >
                    <Checkbox
                      checked={selectedMethods.includes(opt.key)}
                      onCheckedChange={() => toggleMethod(opt.key)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Controls row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
              {/* Horizon */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Horizon (days)</label>
                <div className="flex gap-1">
                  {[30, 60, 90, 180].map(d => (
                    <Button
                      key={d}
                      variant={horizonDays === d ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 text-xs ${horizonDays === d ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}`}
                      onClick={() => setHorizonDays(d)}
                    >
                      {d}d
                    </Button>
                  ))}
                </div>
              </div>

              {/* Holiday toggle */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={includeHolidays}
                  onCheckedChange={(v) => setIncludeHolidays(v === true)}
                />
                <span className="text-xs text-gray-600">Include BD Holiday Effects</span>
              </div>

              {/* Run button */}
              <Button
                onClick={runAdvancedForecast}
                disabled={!productId || selectedMethods.length === 0 || loading}
                className="h-10 px-6 bg-purple-600 hover:bg-purple-700 text-white ml-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Run Advanced Models
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Best Model + Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-medium text-gray-500">Best Model</span>
                </div>
                <p className="text-lg font-bold text-slate-800">
                  {MODEL_LABELS[data.bestModel] || data.bestModel}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">lowest MAPE</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium text-gray-500">Models Run</span>
                </div>
                <p className="text-lg font-bold text-slate-800">{validResults.length}</p>
                <p className="text-[10px] text-gray-400 mt-1">advanced + basic</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-gray-500">Holidays Tracked</span>
                </div>
                <p className="text-lg font-bold text-slate-800">{data.holidays.length}</p>
                <p className="text-[10px] text-gray-400 mt-1">BD holiday dates</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium text-gray-500">Data Points</span>
                </div>
                <p className="text-lg font-bold text-slate-800">{data.dataPoints}</p>
                <p className="text-[10px] text-gray-400 mt-1">historical records</p>
              </CardContent>
            </Card>
          </div>

          {/* Model Comparison Table */}
          {sortedResults.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-500" />
                  Model Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Model</TableHead>
                        <TableHead className="text-center">MAPE (%)</TableHead>
                        <TableHead className="text-center">MAE</TableHead>
                        <TableHead className="text-center">RMSE</TableHead>
                        <TableHead className="text-center">Bias</TableHead>
                        <TableHead className="text-center">Points</TableHead>
                        <TableHead className="text-center">Rank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedResults.map(([modelKey, result], idx) => {
                        const isBest = idx === 0;
                        const isAdvanced = ['prophet_bd', 'ets_autotune', 'regression', 'consensus'].includes(modelKey);
                        return (
                          <TableRow key={modelKey} className={isBest ? 'bg-emerald-50/50' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {MODEL_ICONS[modelKey] || <LineChart className="h-4 w-4 text-gray-400" />}
                                <div>
                                  <span className="font-medium text-sm">{MODEL_LABELS[modelKey] || modelKey}</span>
                                  {isBest && (
                                    <Badge className="bg-emerald-100 text-emerald-700 text-[9px] h-4 ml-1.5">BEST</Badge>
                                  )}
                                  {isAdvanced && (
                                    <Badge className="bg-purple-100 text-purple-700 text-[9px] h-4 ml-1">ADV</Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={isBest ? 'font-bold text-emerald-700' : ''}>
                                {result.metrics.mape.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">{result.metrics.mae.toFixed(2)}</TableCell>
                            <TableCell className="text-center">{result.metrics.rmse.toFixed(2)}</TableCell>
                            <TableCell className="text-center">
                              <span className={result.metrics.bias > 0 ? 'text-amber-600' : result.metrics.bias < 0 ? 'text-blue-600' : ''}>
                                {result.metrics.bias > 0 ? '+' : ''}{result.metrics.bias.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-xs text-gray-500">{result.points.length}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`text-[10px] ${idx === 0 ? 'border-emerald-300 text-emerald-700' : ''}`}>
                                #{idx + 1}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advanced Model Details - Expandable Cards */}
          <div className="space-y-3">
            {/* Prophet BD Details */}
            {data.results.prophet_bd && data.results.prophet_bd.points.length > 0 && (
              <ModelDetailCard
                modelKey="prophet_bd"
                result={data.results.prophet_bd}
                expanded={expandedModel === 'prophet_bd'}
                onToggle={() => setExpandedModel(expandedModel === 'prophet_bd' ? null : 'prophet_bd')}
              >
                <ProphetBDDetails params={data.results.prophet_bd.params} />
              </ModelDetailCard>
            )}

            {/* ETS Auto-Tune Details */}
            {data.results.ets_autotune && data.results.ets_autotune.points.length > 0 && (
              <ModelDetailCard
                modelKey="ets_autotune"
                result={data.results.ets_autotune}
                expanded={expandedModel === 'ets_autotune'}
                onToggle={() => setExpandedModel(expandedModel === 'ets_autotune' ? null : 'ets_autotune')}
              >
                <ETSAutoTuneDetails params={data.results.ets_autotune.params} />
              </ModelDetailCard>
            )}

            {/* Regression Details */}
            {data.results.regression && data.results.regression.points.length > 0 && (
              <ModelDetailCard
                modelKey="regression"
                result={data.results.regression}
                expanded={expandedModel === 'regression'}
                onToggle={() => setExpandedModel(expandedModel === 'regression' ? null : 'regression')}
              >
                <RegressionDetails params={data.results.regression.params} />
              </ModelDetailCard>
            )}
          </div>

          {/* Consensus Forecast */}
          {data.consensus && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  Consensus Forecast
                </CardTitle>
                <CardDescription>
                  Weighted blend: Baseline → Seasonal → Marketing → Sales Override
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Pipeline stages */}
                  {data.consensus.stages.map((stage, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                          idx === data.consensus!.stages.length - 1 ? 'bg-emerald-600' : 'bg-gray-400'
                        }`}>
                          {idx + 1}
                        </div>
                        {idx < data.consensus!.stages.length - 1 && (
                          <div className="w-0.5 h-4 bg-gray-300 mt-1" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium">{stage.name}</span>
                          <span className="text-sm font-bold text-slate-800">{Math.round(stage.value)} units</span>
                          {stage.adjustment !== 0 && (
                            <Badge variant="outline" className={`text-[9px] ${stage.adjustment > 0 ? 'text-emerald-600 border-emerald-200' : 'text-red-600 border-red-200'}`}>
                              {stage.adjustment > 0 ? '+' : ''}{Math.round(stage.adjustment)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500">{stage.note}</p>
                      </div>
                    </div>
                  ))}

                  <Separator className="my-2" />

                  {/* Final */}
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-800">Final Consensus Forecast</span>
                      <span className="text-xl font-bold text-emerald-700">{data.consensus.finalForecast} units</span>
                    </div>
                  </div>

                  {/* Governance Notes */}
                  {data.consensus.governanceNotes.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] font-medium text-gray-400 mb-1">Governance Notes</p>
                      {data.consensus.governanceNotes.map((note, i) => (
                        <p key={i} className="text-[10px] text-gray-500">• {note}</p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Holiday Calendar */}
          {data.holidays.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-amber-500" />
                  BD Holiday Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Holiday</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Window</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.holidays.slice(0, 20).map((h, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{h.holiday}</TableCell>
                          <TableCell className="text-xs text-gray-600">{h.ds}</TableCell>
                          <TableCell className="text-center text-[10px] text-gray-500">
                            {h.lower_window}/{h.upper_window}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// --- Sub-components ---

function ModelDetailCard({
  modelKey,
  result,
  expanded,
  onToggle,
  children,
}: {
  modelKey: string;
  result: ModelResult;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3">
            {MODEL_ICONS[modelKey] || <LineChart className="h-4 w-4 text-gray-400" />}
            <div>
              <p className="text-sm font-medium">{MODEL_LABELS[modelKey] || modelKey}</p>
              <p className="text-[10px] text-gray-500">
                MAPE: {result.metrics.mape.toFixed(2)}% | RMSE: {result.metrics.rmse.toFixed(2)} | Points: {result.points.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px]">Details</Badge>
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>
        {expanded && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProphetBDDetails({ params }: { params: Record<string, unknown> }) {
  const seasonalities = params.seasonalities as Array<{ name: string; period: number; fourierOrder: number; activeMonths: number[] }> | undefined;
  const seasonalityMode = params.seasonalityMode as string | undefined;
  const includeHolidays = params.includeHolidays as boolean | undefined;
  const seasonalComponents = params.seasonalComponents as Record<string, number[]> | undefined;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded p-2">
          <p className="text-[10px] font-medium text-gray-400">Seasonality Mode</p>
          <p className="text-xs font-medium">{seasonalityMode || 'N/A'}</p>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <p className="text-[10px] font-medium text-gray-400">Include Holidays</p>
          <p className="text-xs font-medium">{includeHolidays ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {seasonalities && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Custom Seasonalities</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {seasonalities.map(s => (
              <div key={s.name} className="border border-gray-200 rounded p-2">
                <p className="text-xs font-medium">{s.name}</p>
                <p className="text-[10px] text-gray-500">
                  Period: {s.period.toFixed(1)}d | Fourier Order: {s.fourierOrder}
                </p>
                <p className="text-[10px] text-gray-500">
                  Active: {s.activeMonths.map(m =>
                    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]
                  ).join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {seasonalComponents && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Seasonal Component Magnitudes</p>
          {Object.entries(seasonalComponents).map(([name, values]) => {
            const maxVal = Math.max(...values.map(Math.abs));
            const avgVal = values.reduce((a, b) => a + b, 0) / values.length;
            return (
              <div key={name} className="flex items-center gap-2 text-[10px] text-gray-600 mb-1">
                <span className="w-24 font-medium">{name}</span>
                <span>max: {maxVal.toFixed(2)}</span>
                <span>avg: {avgVal.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ETSAutoTuneDetails({ params }: { params: Record<string, unknown> }) {
  const autoTune = params.autoTune as {
    bestAlpha: number;
    bestBeta: number;
    bestGamma: number;
    bestMape: number;
    backtestMetrics: { mape: number; mae: number; rmse: number; bias: number };
    alphaTrials: { alpha: number; mape: number }[];
  } | undefined;

  const mode = params.mode as string | undefined;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-slate-50 rounded p-2">
          <p className="text-[10px] font-medium text-gray-400">Mode</p>
          <p className="text-xs font-medium">{mode || 'N/A'}</p>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <p className="text-[10px] font-medium text-gray-400">Best α</p>
          <p className="text-xs font-bold text-teal-700">{autoTune?.bestAlpha.toFixed(2) || 'N/A'}</p>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <p className="text-[10px] font-medium text-gray-400">Best β</p>
          <p className="text-xs font-medium">{autoTune?.bestBeta.toFixed(2) || 'N/A'}</p>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <p className="text-[10px] font-medium text-gray-400">Best γ</p>
          <p className="text-xs font-medium">{autoTune?.bestGamma.toFixed(2) || 'N/A'}</p>
        </div>
      </div>

      {autoTune && (
        <>
          <div className="bg-emerald-50 rounded p-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-800">
                Backtest MAPE: {autoTune.backtestMetrics.mape.toFixed(2)}% (80/20 split)
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Alpha Trials (MAPE)</p>
            <div className="flex items-end gap-1 h-16">
              {autoTune.alphaTrials.map(t => {
                const minMape = Math.min(...autoTune.alphaTrials.map(a => a.mape));
                const maxMape = Math.max(...autoTune.alphaTrials.map(a => a.mape).filter(m => m < Infinity));
                const range = maxMape - minMape || 1;
                const height = t.mape < Infinity
                  ? Math.max(8, ((maxMape - t.mape) / range) * 100)
                  : 8;
                const isBest = t.alpha === autoTune.bestAlpha;
                return (
                  <div
                    key={t.alpha}
                    className={`flex-1 flex flex-col items-center ${isBest ? 'text-teal-700' : 'text-gray-400'}`}
                  >
                    <div
                      className={`w-full rounded-t ${isBest ? 'bg-teal-500' : 'bg-gray-300'}`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[8px] mt-0.5">{t.alpha.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RegressionDetails({ params }: { params: Record<string, unknown> }) {
  const reg = params.regression as RegressionInfo | undefined;

  if (!reg) {
    return <p className="text-xs text-gray-500">No regression details available</p>;
  }

  return (
    <div className="space-y-3">
      {/* Formula */}
      <div className="bg-slate-50 rounded p-3">
        <p className="text-[10px] font-medium text-gray-400 mb-1">Formula</p>
        <p className="text-xs font-mono">
          D(F) = {reg.beta0.toFixed(2)} + ({reg.beta1.toFixed(2)})×Price + ({reg.beta2.toFixed(2)})×PromoIndex
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="bg-slate-50 rounded p-2">
          <p className="text-[10px] font-medium text-gray-400">R²</p>
          <p className={`text-xs font-bold ${reg.rSquared >= 0.5 ? 'text-emerald-700' : reg.rSquared >= 0.3 ? 'text-amber-700' : 'text-red-700'}`}>
            {reg.rSquared.toFixed(3)}
          </p>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <p className="text-[10px] font-medium text-gray-400">Confidence</p>
          <Badge className={`text-[9px] ${
            reg.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
            reg.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {reg.confidence.toUpperCase()}
          </Badge>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <p className="text-[10px] font-medium text-gray-400">p-value (β₁)</p>
          <p className={`text-xs ${reg.pValues.beta1 < 0.05 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {reg.pValues.beta1.toFixed(3)}
          </p>
        </div>
      </div>

      {/* Coefficients table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Coefficient</TableHead>
            <TableHead className="text-center">Value</TableHead>
            <TableHead className="text-center">p-value</TableHead>
            <TableHead className="text-center">Significance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            { name: 'β₀ (Intercept)', value: reg.beta0, p: reg.pValues.beta0 },
            { name: 'β₁ (Price)', value: reg.beta1, p: reg.pValues.beta1 },
            { name: 'β₂ (PromoIndex)', value: reg.beta2, p: reg.pValues.beta2 },
          ].map(row => (
            <TableRow key={row.name}>
              <TableCell className="text-xs font-medium">{row.name}</TableCell>
              <TableCell className="text-center text-xs">{row.value.toFixed(2)}</TableCell>
              <TableCell className="text-center text-xs">{row.p.toFixed(3)}</TableCell>
              <TableCell className="text-center">
                {row.p < 0.01 ? (
                  <Badge className="bg-emerald-100 text-emerald-700 text-[8px]">p&lt;0.01</Badge>
                ) : row.p < 0.05 ? (
                  <Badge className="bg-emerald-100 text-emerald-700 text-[8px]">p&lt;0.05</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600 text-[8px]">n.s.</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Validation notes */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">Validation Notes</p>
        {reg.validationNotes.map((note, i) => (
          <div key={i} className="flex items-start gap-1.5 mb-1">
            {note.includes('as expected') || note.includes('good') ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
            )}
            <p className="text-[10px] text-gray-600">{note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
