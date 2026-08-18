'use client';

// ============================================
// TrimedCast — Forecast Results Table
// Session 21: Demand Forecasting Results
// ============================================

import { useState, useEffect } from 'react';
import {
  Eye, CheckCircle2, RefreshCw, AlertTriangle, Search,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import {
  useForecastResultStore, useFilteredForecasts,
} from '@/stores/forecast-result-store';
import {
  FORECAST_METHODS, BD_SEASONS, getAccuracyRating, getMethodConfig,
  type ForecastResult,
} from './types';

function MapeCell({ mape }: { mape: number | null }) {
  const rating = getAccuracyRating(mape);
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    sky: 'text-sky-600 dark:text-sky-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    slate: 'text-slate-500',
  };
  const bgMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10',
    sky: 'bg-sky-500/10',
    amber: 'bg-amber-500/10',
    red: 'bg-red-500/10',
    slate: 'bg-slate-500/10',
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-mono text-sm font-semibold ${colorMap[rating.color]}`}>
        {mape !== null ? `${mape}%` : 'N/A'}
      </span>
      <Badge variant="outline" className={`text-[10px] px-1 py-0 border-0 ${bgMap[rating.color]}`}>
        {rating.label}
      </Badge>
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
  if (!season) return <span className="text-xs text-muted-foreground">—</span>;
  const config = BD_SEASONS.find((s) => s.value === season);
  if (!config) return <Badge variant="outline" className="text-[11px]">{season}</Badge>;
  return (
    <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${config.borderClass} ${config.bgClass} ${config.textClass}`}>
      {config.icon} {config.label}
    </Badge>
  );
}

function ForecastRow({
  forecast, onSelect, onApprove,
}: {
  forecast: ForecastResult;
  onSelect: (f: ForecastResult) => void;
  onApprove: (id: string) => void;
}) {
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSelect(forecast)}
    >
      <TableCell>
        <div>
          <p className="font-medium text-sm">{forecast.product.name}</p>
          <p className="text-xs text-muted-foreground">{forecast.product.sku_code}</p>
        </div>
      </TableCell>
      <TableCell><SeasonBadge season={forecast.season} /></TableCell>
      <TableCell><MethodBadge method={forecast.forecast_method} /></TableCell>
      <TableCell className="font-mono text-sm">
        {forecast.seasonal_adjusted_demand.toLocaleString()}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {forecast.lower_bound !== null && forecast.upper_bound !== null
          ? `${forecast.lower_bound} — ${forecast.upper_bound}`
          : '—'}
      </TableCell>
      <TableCell><MapeCell mape={forecast.mape} /></TableCell>
      <TableCell>
        {forecast.cny_risk_flag ? (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">CNY</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {new Date(forecast.forecast_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => e.stopPropagation()}>
              <span className="sr-only">Actions</span>
              <span className="text-xs">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(forecast); }}>
              <Eye className="mr-2 h-3.5 w-3.5" /> View Detail
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApprove(forecast.id); }}>
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Approve
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Regenerate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function ForecastMobileCard({
  forecast, onSelect, onApprove,
}: {
  forecast: ForecastResult;
  onSelect: (f: ForecastResult) => void;
  onApprove: (id: string) => void;
}) {
  return (
    <Card
      className="border-border/50 cursor-pointer hover:border-border transition-colors"
      onClick={() => onSelect(forecast)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">{forecast.product.name}</p>
            <p className="text-xs text-muted-foreground">{forecast.product.sku_code}</p>
          </div>
          {forecast.cny_risk_flag && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              <AlertTriangle className="h-3 w-3 mr-0.5" /> CNY
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MethodBadge method={forecast.forecast_method} />
          <SeasonBadge season={forecast.season} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground">Predicted</p>
            <p className="font-mono text-sm font-semibold">{forecast.seasonal_adjusted_demand}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Confidence Band</p>
            <p className="font-mono text-xs">
              {forecast.lower_bound}—{forecast.upper_bound}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">MAPE</p>
            <MapeCell mape={forecast.mape} />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={(e) => { e.stopPropagation(); onSelect(forecast); }}>
            <Eye className="h-3 w-3 mr-1" /> View
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={(e) => { e.stopPropagation(); onApprove(forecast.id); }}>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ForecastTable() {
  const store = useForecastResultStore();
  const filteredForecasts = useFilteredForecasts();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSelect = (f: ForecastResult) => {
    store.selectForecast(f);
  };

  const handleApprove = (id: string) => {
    store.approveForecast(id);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by product or SKU..."
            value={store.searchQuery}
            onChange={(e) => store.setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={store.methodFilter} onValueChange={store.setMethodFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
            <SelectValue placeholder="All Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {FORECAST_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                  {m.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={store.seasonFilter} onValueChange={store.setSeasonFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
            <SelectValue placeholder="All Seasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {BD_SEASONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.icon} {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filteredForecasts.length} result{filteredForecasts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      {isMobile ? (
        <div className="grid grid-cols-1 gap-3">
          {filteredForecasts.map((f) => (
            <ForecastMobileCard
              key={f.id}
              forecast={f}
              onSelect={handleSelect}
              onApprove={handleApprove}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Predicted Qty</TableHead>
                <TableHead>Confidence Band</TableHead>
                <TableHead>MAPE</TableHead>
                <TableHead>CNY Risk</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredForecasts.map((f) => (
                <ForecastRow
                  key={f.id}
                  forecast={f}
                  onSelect={handleSelect}
                  onApprove={handleApprove}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
