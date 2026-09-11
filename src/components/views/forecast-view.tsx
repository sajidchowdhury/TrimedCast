'use client';

// ============================================
// TrimedCast LEAN — Forecast view (Phase 2)
// Session selector + "Generate forecast" button + per-SKU forecast
// table with accuracy badges + a mini sparkline chart showing the
// predicted demand curve with festival effects marked.
// ============================================

import { useEffect, useState, useCallback, Fragment } from 'react';
import { useAppStore } from '@/stores/app-store';
import { usePagination } from '@/hooks/use-pagination';
import { Pagination } from '@/components/dashboard/pagination';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { describeEffect, formatDate } from '@/lib/sessions/festival-calendar';
import {
  TrendingUp,
  Sparkles,
  Loader2,
  CalendarClock,
  Target,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

interface Festival {
  id: string;
  name: string;
  type: string;
  peakDate: string;
  windowStart: string;
  windowEnd: string;
  demandEffect: number;
  year: number;
  daysUntil: number;
  isUpcoming: boolean;
}

interface ForecastPoint {
  date: string;
  month: number;
  year: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  festivalName: string | null;
  festivalEffect: number;
}

interface ForecastRow {
  id: string;
  skuCode: string;
  productName: string;
  festivalSessionId: string | null;
  mape: number;
  mae: number;
  rmse: number;
  bias: number;
  accuracyRating: string;
  n: number;
  totalForecastQty: number;
  model: string;
  historyPoints: number;
  horizonMonths: number;
  generatedAt: string;
  points: ForecastPoint[];
}

const RATING_COLORS: Record<string, string> = {
  excellent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  good: 'bg-green-100 text-green-700 border-green-200',
  fair: 'bg-amber-100 text-amber-700 border-amber-200',
  poor: 'bg-orange-100 text-orange-700 border-orange-200',
  unusable: 'bg-red-100 text-red-700 border-red-200',
};

export function ForecastView() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const setView = useAppStore((s) => s.setView);

  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [selectedFestivalId, setSelectedFestivalId] = useState<string>('');
  const [forecasts, setForecasts] = useState<ForecastRow[]>([]);
  const forecastPagination = usePagination(forecasts, 10);
  const [loadingFestivals, setLoadingFestivals] = useState(true);
  const [loadingForecasts, setLoadingForecasts] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  // Load festivals
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
        if (upcoming.length > 0 && !selectedFestivalId) {
          setSelectedFestivalId(upcoming[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingFestivals(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load forecasts when a festival is selected
  const loadForecasts = useCallback(async (festivalId: string) => {
    if (!festivalId) {
      setForecasts([]);
      return;
    }
    setLoadingForecasts(true);
    try {
      const res = await fetch(`/api/forecast?festivalSessionId=${festivalId}`);
      const json = await res.json();
      setForecasts(json.forecasts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingForecasts(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFestivalId) loadForecasts(selectedFestivalId);
  }, [selectedFestivalId, loadForecasts, dataVersion]);

  const generate = async () => {
    if (!selectedFestivalId) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/forecast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ festivalSessionId: selectedFestivalId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Forecast failed', { description: json.error || 'Unknown error' });
        return;
      }
      toast.success('Forecast generated', {
        description: `${json.generated} SKUs · session: ${json.festivalSessionName}`,
      });
      loadForecasts(selectedFestivalId);
    } catch (e) {
      toast.error('Forecast failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setGenerating(false);
    }
  };

  const selectedFestival = festivals.find((f) => f.id === selectedFestivalId);

  return (
    <div className="space-y-5">
      {/* Session selector + generate button */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Session-wise Forecast
          </CardTitle>
          <CardDescription>
            Select a festival session and generate a per-SKU demand forecast. The engine applies
            festival demand effects (Eid −30%, Durga Puja +10%, Winter +40%, CNY −15%) using
            day-precise Hijri calendar dates.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Festival session</label>
            {loadingFestivals ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedFestivalId} onValueChange={setSelectedFestivalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a session…" />
                </SelectTrigger>
                <SelectContent>
                  {festivals.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex items-center gap-2">
                        <span>{f.name}</span>
                        <span className="text-xs text-muted-foreground">
                          · {formatDate(f.peakDate)} · {describeEffect(f.demandEffect)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button onClick={generate} disabled={generating || !selectedFestivalId}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate forecast
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Selected session info banner */}
      {selectedFestival && (
        <div className="grid gap-4 sm:grid-cols-4">
          <InfoCard
            icon={CalendarClock}
            label="Peak date"
            value={formatDate(selectedFestival.peakDate)}
            sub={`${selectedFestival.daysUntil} days away`}
          />
          <InfoCard
            icon={Target}
            label="Demand effect"
            value={describeEffect(selectedFestival.demandEffect)}
            sub={selectedFestival.type}
          />
          <InfoCard
            icon={CalendarClock}
            label="Window"
            value={formatDate(selectedFestival.windowStart)}
            sub={`to ${formatDate(selectedFestival.windowEnd)}`}
          />
          <InfoCard
            icon={TrendingUp}
            label="SKUs forecast"
            value={forecasts.length.toString()}
            sub={forecasts.length > 0 ? `${forecasts[0].horizonMonths}-month horizon` : '—'}
          />
        </div>
      )}

      {/* Forecast table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-SKU Forecast</CardTitle>
          <CardDescription>
            {forecasts.length > 0
              ? `${forecasts.length} SKUs · generated ${formatDate(forecasts[0].generatedAt)}`
              : 'No forecasts yet. Generate one above.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingForecasts ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : forecasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No forecast for this session</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Click “Generate forecast” to run the Prophet engine for {selectedFestival?.name || 'this session'}.
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
                    <th className="text-right font-medium px-4 py-2.5">Total Forecast</th>
                    <th className="text-right font-medium px-4 py-2.5">MAPE</th>
                    <th className="text-center font-medium px-4 py-2.5">Accuracy</th>
                    <th className="text-right font-medium px-4 py-2.5">History</th>
                    <th className="text-center font-medium px-4 py-2.5">Model</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {forecastPagination.paginatedItems.map((f) => {
                    const expanded = expandedSku === f.id;
                    return (
                      <Fragment key={f.id}>
                        <tr
                          className="hover:bg-muted/30 cursor-pointer"
                          onClick={() => setExpandedSku(expanded ? null : f.id)}
                        >
                          <td className="px-4 py-2.5 font-mono text-xs font-medium">{f.skuCode}</td>
                          <td className="px-4 py-2.5 max-w-xs truncate">{f.productName}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                            {f.totalForecastQty.toLocaleString()}
                            <span className="text-[10px] text-muted-foreground block">
                              {f.horizonMonths}mo
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {f.mape > 0 ? `${f.mape}%` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${RATING_COLORS[f.accuracyRating] || ''}`}
                            >
                              {f.accuracyRating}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                            {f.historyPoints} pts
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {f.model === 'prophet-ts-lean' ? 'prophet' : f.model === 'moving-average' ? 'ma' : 'cold'}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            <ChevronRight
                              className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}
                            />
                          </td>
                        </tr>
                        {expanded && (
                          <tr key={`${f.id}-detail`} className="bg-muted/20">
                            <td colSpan={8} className="px-4 py-4">
                              <ForecastDetail row={f} festivalName={selectedFestival?.name} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination pagination={forecastPagination} itemName="SKUs" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accuracy legend */}
      {forecasts.length > 0 && (
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-medium">Accuracy rating:</span>
            {Object.entries(RATING_COLORS).map(([rating, cls]) => (
              <Badge key={rating} variant="outline" className={`text-[10px] ${cls}`}>
                {rating}
              </Badge>
            ))}
            <span className="text-muted-foreground ml-auto">
              MAPE tiers: excellent &lt;5%, good &lt;10%, fair &lt;20%, poor &lt;50%
            </span>
          </CardContent>
        </Card>
      )}

      {forecasts.length === 0 && festivals.length === 0 && !loadingFestivals && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setView('upload')}>
            <AlertCircle className="h-4 w-4 mr-2" />
            Upload Excel first (Phase 1)
          </Button>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-sm font-semibold truncate">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
      </CardContent>
    </Card>
  );
}

/** Inline detail panel showing the monthly forecast sparkline + festival markers. */
function ForecastDetail({ row, festivalName }: { row: ForecastRow; festivalName?: string }) {
  const points = row.points;
  if (points.length === 0) return null;

  const maxVal = Math.max(...points.map((p) => p.predicted));
  const minVal = 0;
  const width = 720;
  const height = 120;
  const padding = { top: 10, right: 20, bottom: 20, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xStep = points.length > 1 ? chartW / (points.length - 1) : 0;
  const yScale = (v: number) => chartH - ((v - minVal) / (maxVal - minVal || 1)) * chartH;

  // Build the line path
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${padding.left + i * xStep} ${padding.top + yScale(p.predicted)}`)
    .join(' ');

  // Build the confidence band path
  const upperPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${padding.left + i * xStep} ${padding.top + yScale(p.upperBound)}`)
    .join(' ');
  const lowerPath = points
    .map((p, i) => `${i === 0 ? 'L' : 'L'} ${padding.left + i * xStep} ${padding.top + yScale(p.lowerBound)}`)
    .reverse()
    .join(' ');
  const bandPath = `${upperPath} ${lowerPath} Z`;

  // Y axis ticks (0, mid, max)
  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-medium">Demand forecast curve ({points.length} months)</span>
        <span className="text-muted-foreground">
          Confidence band: 95% · Total: <span className="font-medium text-foreground">{row.totalForecastQty.toLocaleString()}</span> units
        </span>
        {festivalName && (
          <Badge variant="outline" className="text-[10px]">
            Session: {festivalName}
          </Badge>
        )}
      </div>

      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block" style={{ minWidth: width }}>
          {/* Y axis grid lines + labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={padding.top + yScale(t)}
                x2={width - padding.right}
                y2={padding.top + yScale(t)}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="2 3"
              />
              <text
                x={padding.left - 6}
                y={padding.top + yScale(t) + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[9px]"
              >
                {t}
              </text>
            </g>
          ))}

          {/* Confidence band */}
          <path d={bandPath} fill="currentColor" className="text-primary" fillOpacity={0.12} />

          {/* Forecast line */}
          <path d={linePath} fill="none" stroke="currentColor" className="text-primary" strokeWidth={2} />

          {/* Points + festival markers */}
          {points.map((p, i) => {
            const cx = padding.left + i * xStep;
            const cy = padding.top + yScale(p.predicted);
            const isFestival = p.festivalName !== null;
            return (
              <g key={i}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isFestival ? 4 : 2.5}
                  fill={isFestival ? 'currentColor' : 'currentColor'}
                  className={isFestival ? 'text-orange-500' : 'text-primary'}
                />
                {isFestival && (
                  <text
                    x={cx}
                    y={cy - 8}
                    textAnchor="middle"
                    className="fill-orange-600 text-[8px] font-medium"
                  >
                    {p.festivalEffect > 1 ? '↑' : '↓'}
                    {Math.round(Math.abs(p.festivalEffect - 1) * 100)}%
                  </text>
                )}
                {i % Math.ceil(points.length / 8) === 0 && (
                  <text
                    x={cx}
                    y={height - 5}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[9px]"
                  >
                    {p.date.slice(2, 7)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Festival months list */}
      {points.some((p) => p.festivalName) && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground">Festival months:</span>
          {points
            .filter((p) => p.festivalName)
            .map((p, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                {p.date.slice(0, 7)} · {p.festivalName} (×{p.festivalEffect}) → {p.predicted} units
              </Badge>
            ))}
        </div>
      )}

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <Metric label="MAPE" value={`${f(row.mape)}%`} />
        <Metric label="MAE" value={f(row.mae)} />
        <Metric label="RMSE" value={f(row.rmse)} />
        <Metric label="Bias" value={f(row.bias)} />
        <Metric label="N (fitted)" value={row.n.toString()} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-background px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

function f(n: number): string {
  return n.toFixed(2);
}
