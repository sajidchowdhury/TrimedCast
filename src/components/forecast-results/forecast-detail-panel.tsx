'use client';

// ============================================
// TrimedCast — Forecast Detail Panel
// Session 21: Demand Forecasting Results
// ============================================

import {
  CheckCircle2, RefreshCw, Download, AlertTriangle, Target, TrendingUp,
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useForecastResultStore } from '@/stores/forecast-result-store';
import {
  getMethodConfig, getAccuracyRating, BD_SEASONS,
} from './types';

// Month label formatter
function formatMonth(dateStr: string) {
  const [year, month] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
}

export function ForecastDetailPanel() {
  const { selectedForecast, timeSeries, decomposition, selectForecast } = useForecastResultStore();

  const forecast = selectedForecast;

  return (
    <Sheet open={!!forecast} onOpenChange={(open) => { if (!open) selectForecast(null); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        {forecast && (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg">{forecast.product.name}</SheetTitle>
              <SheetDescription className="text-xs font-mono">{forecast.product.sku_code}</SheetDescription>
            </SheetHeader>

            {/* Method + Season + CNY Badges */}
            <div className="flex items-center gap-2 flex-wrap px-4">
              <MethodBadge method={forecast.forecast_method} />
              <SeasonBadge season={forecast.season} />
              {forecast.cny_risk_flag && (
                <Badge variant="destructive" className="text-[11px] px-2 py-0.5">
                  <AlertTriangle className="h-3 w-3 mr-1" /> CNY Risk
                </Badge>
              )}
              {forecast.is_recalibrated && (
                <Badge variant="outline" className="text-[11px] px-2 py-0.5 border-amber-500/30 text-amber-600">
                  Recalibrated
                </Badge>
              )}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-2 px-4 pt-3">
              <MetricCard label="Predicted Qty" value={forecast.seasonal_adjusted_demand.toLocaleString()} icon={<TrendingUp className="h-3.5 w-3.5" />} />
              <MetricCard
                label="Confidence Band"
                value={forecast.lower_bound !== null ? `${forecast.lower_bound}–${forecast.upper_bound}` : '—'}
                icon={<Target className="h-3.5 w-3.5" />}
              />
              <MetricCard
                label="MAPE"
                value={forecast.mape !== null ? `${forecast.mape}%` : 'N/A'}
                icon={<Target className="h-3.5 w-3.5" />}
                sub={getAccuracyRating(forecast.mape).label}
                subColor={getAccuracyRating(forecast.mape).color}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 px-4">
              <MetricCard
                label="Confidence %"
                value={forecast.confidence !== null ? `${(forecast.confidence * 100).toFixed(0)}%` : '—'}
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              />
              <MetricCard
                label="Baseline Demand"
                value={forecast.baseline_demand.toLocaleString()}
                icon={<TrendingUp className="h-3.5 w-3.5" />}
              />
            </div>

            <Separator className="my-3" />

            {/* Forecast vs Actual Chart */}
            <div className="px-4 space-y-2">
              <h4 className="text-sm font-semibold">Forecast vs Actual</h4>
              <p className="text-[10px] text-muted-foreground">Shaded area = 95% confidence band</p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeries.map((t) => ({ ...t, label: formatMonth(t.date) }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, padding: 8 }}
                      formatter={(value: number, name: string) => [value?.toLocaleString(), name]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {/* Confidence band area */}
                    <Area type="monotone" dataKey="upper_bound" stroke="none" fill="#6366f1" fillOpacity={0.08} name="Upper Bound" />
                    <Area type="monotone" dataKey="lower_bound" stroke="none" fill="#fff" fillOpacity={1} name="Lower Bound" />
                    <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} name="Actual" connectNulls={false} />
                    <Line type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 2 }} name="Predicted" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <Separator className="my-3" />

            {/* Decomposition Charts 2x2 */}
            <div className="px-4 space-y-2">
              <h4 className="text-sm font-semibold">Time Series Decomposition</h4>
              <div className="grid grid-cols-2 gap-3">
                <DecompSubChart
                  title="Observed"
                  data={decomposition}
                  dataKey="observed"
                  color="#6366f1"
                  type="bar"
                />
                <DecompSubChart
                  title="Trend"
                  data={decomposition}
                  dataKey="trend"
                  color="#f59e0b"
                  type="line"
                />
                <DecompSubChart
                  title="Seasonal"
                  data={decomposition}
                  dataKey="seasonal"
                  color="#10b981"
                  type="line"
                />
                <DecompSubChart
                  title="Residual"
                  data={decomposition}
                  dataKey="residual"
                  color="#ec4899"
                  type="bar"
                />
              </div>
            </div>

            <Separator className="my-3" />

            {/* Action Buttons */}
            <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => {/* approve */}}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve Forecast
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" /> Download CSV
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MetricCard({
  label, value, icon, sub, subColor,
}: {
  label: string; value: string; icon: React.ReactNode; sub?: string; subColor?: string;
}) {
  const subColorMap: Record<string, string> = {
    emerald: 'text-emerald-600', sky: 'text-sky-600', amber: 'text-amber-600',
    red: 'text-red-600', slate: 'text-slate-500',
  };
  return (
    <div className="rounded-lg border border-border/50 p-2.5 space-y-0.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="font-semibold text-sm">{value}</p>
      {sub && (
        <p className={`text-[10px] font-medium ${subColor ? subColorMap[subColor] ?? '' : 'text-muted-foreground'}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const config = getMethodConfig(method);
  return (
    <Badge
      variant="outline"
      className="text-[11px] px-2 py-0.5 font-medium"
      style={{ borderColor: config.color, color: config.color, backgroundColor: `${config.color}10` }}
    >
      {config.label}
    </Badge>
  );
}

function SeasonBadge({ season }: { season: string | null }) {
  if (!season) return null;
  const config = BD_SEASONS.find((s) => s.value === season);
  if (!config) return <Badge variant="outline" className="text-[11px]">{season}</Badge>;
  return (
    <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${config.borderClass} ${config.bgClass} ${config.textClass}`}>
      {config.icon} {config.label}
    </Badge>
  );
}

function DecompSubChart({
  title, data, dataKey, color, type,
}: {
  title: string; data: Record<string, unknown>[]; dataKey: string; color: string; type: 'line' | 'bar';
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground font-medium mb-1">{title}</p>
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={data.map((d) => ({ ...d, label: formatMonth(d.date as string) }))} margin={{ top: 2, right: 2, left: -15, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 8 }} interval={5} />
              <YAxis tick={{ fontSize: 8 }} />
              <Tooltip contentStyle={{ fontSize: 9, borderRadius: 6, padding: 4 }} />
              <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={data.map((d) => ({ ...d, label: formatMonth(d.date as string) }))} margin={{ top: 2, right: 2, left: -15, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 8 }} interval={5} />
              <YAxis tick={{ fontSize: 8 }} />
              <Tooltip contentStyle={{ fontSize: 9, borderRadius: 6, padding: 4 }} />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
