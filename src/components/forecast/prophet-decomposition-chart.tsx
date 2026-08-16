'use client';

// ============================================
// Prophet-Style Time Series Decomposition Viz
// 4 stacked charts: Trend, Seasonal, Holiday, Combined
// With BD seasonal patterns and interactive tooltips
// ============================================

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Sun, CalendarDays, Layers, Info } from 'lucide-react';
import { BD_SEASONS, type BDSeason } from '@/lib/forecasting/models';

// =============================================
// Demo Data Generation
// =============================================

interface DecompPoint {
  month: string;
  monthNum: number;
  season: BDSeason;
  trend: number;
  seasonal: number;
  holiday: number;
  yhat: number;
  yhatLower: number;
  yhatUpper: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getBDSeason(month: number): BDSeason {
  for (const s of BD_SEASONS) {
    if (s.months.includes(month)) return s.season;
  }
  return 'winter';
}

function generateDecompositionData(): DecompPoint[] {
  const data: DecompPoint[] = [];
  const baseTrend = 500; // Base demand level
  const trendGrowth = 8; // Monthly growth

  // 24 months of data
  for (let i = 0; i < 24; i++) {
    const monthNum = (i % 12) + 1;
    const year = 2024 + Math.floor(i / 12);
    const monthLabel = `${MONTH_NAMES[monthNum - 1]} ${year}`;
    const season = getBDSeason(monthNum);

    // Trend: slow linear growth with slight curvature
    const trend = baseTrend + trendGrowth * i + 0.15 * Math.pow(i, 1.1);

    // Seasonal: BD-specific pattern
    let seasonal = 0;
    switch (monthNum) {
      case 1: seasonal = 180; break;   // Winter peak
      case 2: seasonal = 150; break;   // Winter peak
      case 3: seasonal = 30; break;    // Summer ramp
      case 4: seasonal = -10; break;   // Summer + Eid offset
      case 5: seasonal = -50; break;   // Summer heat
      case 6: seasonal = -120; break;  // Monsoon trough
      case 7: seasonal = -150; break;  // Monsoon deep trough
      case 8: seasonal = -140; break;  // Monsoon deep trough
      case 9: seasonal = -80; break;   // Monsoon easing
      case 10: seasonal = 60; break;   // Pre-winter spike
      case 11: seasonal = 130; break;  // Winter ramp
      case 12: seasonal = 200; break;  // Winter peak
    }

    // Holiday: discrete effects
    let holiday = 0;
    if (monthNum === 4) holiday = -80;      // Eid ul-Fitr dip
    if (monthNum === 7) holiday = -60;      // Eid ul-Adha dip
    if (monthNum === 10) holiday = 40;      // Durga Puja bump
    if (monthNum === 4) holiday += 25;      // Pohela Boishakh
    if (monthNum === 12) holiday += 15;     // Victory Day
    if (monthNum === 3) holiday += 10;      // Independence Day

    const yhat = Math.round(trend + seasonal + holiday);
    const uncertainty = 30 + i * 1.5; // Growing uncertainty
    const yhatLower = Math.round(yhat - 1.96 * uncertainty);
    const yhatUpper = Math.round(yhat + 1.96 * uncertainty);

    data.push({
      month: monthLabel,
      monthNum,
      season,
      trend: Math.round(trend),
      seasonal,
      holiday,
      yhat,
      yhatLower,
      yhatUpper,
    });
  }

  return data;
}

// =============================================
// Season color helper
// =============================================

const SEASON_COLORS: Record<BDSeason, { bg: string; text: string; fill: string }> = {
  winter: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', fill: '#10b981' },
  summer: { bg: 'bg-amber-500/10', text: 'text-amber-600', fill: '#f59e0b' },
  monsoon: { bg: 'bg-sky-500/10', text: 'text-sky-600', fill: '#0ea5e9' },
  pre_winter: { bg: 'bg-orange-500/10', text: 'text-orange-600', fill: '#f97316' },
};

function getSeasonColor(season: BDSeason) {
  return SEASON_COLORS[season] || SEASON_COLORS.winter;
}

// =============================================
// Custom Tooltip
// =============================================

function DecompTooltip({ active, payload, label, dataKey }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey?: string }>;
  label?: string;
  dataKey: string;
}) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      <p className="text-muted-foreground">
        {dataKey}: <span className="font-mono font-semibold text-foreground">{val.toFixed(0)}</span>
      </p>
    </div>
  );
}

// =============================================
// Component
// =============================================

export function ProphetDecompositionChart() {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const data = useMemo(() => generateDecompositionData(), []);

  const selected = selectedMonth !== null ? data[selectedMonth] : null;

  // Compute seasonal min/max for y-axis
  const seasonalMin = Math.min(...data.map(d => d.seasonal));
  const seasonalMax = Math.max(...data.map(d => d.seasonal));
  const holidayMin = Math.min(...data.map(d => d.holiday));
  const holidayMax = Math.max(...data.map(d => d.holiday));

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-base">Prophet Decomposition</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Layers className="h-3 w-3 mr-1" />
                y = trend + seasonal + holiday
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Time series decomposed into trend, BD seasonal, and holiday components. Click a month for details.
          </p>
        </CardHeader>
      </Card>

      {/* Season Legend */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        {BD_SEASONS.map((s) => {
          const colors = getSeasonColor(s.season);
          return (
            <div key={s.season} className="flex items-center gap-1.5 text-xs">
              <div className={`h-2.5 w-2.5 rounded-sm ${colors.bg} border ${colors.text.replace('text-', 'border-')}`} />
              <span className="text-muted-foreground">{s.label}</span>
            </div>
          );
        })}
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-1.5 text-xs">
          <div className="h-2.5 w-2.5 rounded-sm bg-red-500/20 border border-red-400" />
          <span className="text-muted-foreground">Holiday Effect</span>
        </div>
      </div>

      {/* Chart 1: Trend Component */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Trend Component
            <Badge variant="secondary" className="text-[10px] ml-auto">Slow-moving baseline</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} onClick={(e) => { if (e?.activeTooltipIndex !== undefined) setSelectedMonth(e.activeTooltipIndex); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={2} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={['auto', 'auto']} />
              <Tooltip content={<DecompTooltip dataKey="Trend" />} />
              <Line type="monotone" dataKey="trend" stroke="#10b981" strokeWidth={2.5} dot={false} name="Trend" />
              {selectedMonth !== null && (
                <ReferenceLine x={data[selectedMonth]?.month} stroke="#6366f1" strokeDasharray="3 3" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 2: Seasonal Component */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            Seasonal Component (BD)
            <Badge variant="secondary" className="text-[10px] ml-auto">
              Winter +30-60% | Monsoon -20-40%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} onClick={(e) => { if (e?.activeTooltipIndex !== undefined) setSelectedMonth(e.activeTooltipIndex); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={2} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={[seasonalMin - 20, seasonalMax + 20]} />
              <Tooltip content={<DecompTooltip dataKey="Seasonal" />} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
              <Area
                type="monotone"
                dataKey="seasonal"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.2}
                strokeWidth={2}
                name="Seasonal"
              />
              {selectedMonth !== null && (
                <ReferenceLine x={data[selectedMonth]?.month} stroke="#6366f1" strokeDasharray="3 3" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 3: Holiday Component */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-rose-500" />
            Holiday Component
            <Badge variant="secondary" className="text-[10px] ml-auto">
              Eid dip | Puja bump
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} onClick={(e) => { if (e?.activeTooltipIndex !== undefined) setSelectedMonth(e.activeTooltipIndex); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={2} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={[holidayMin - 20, holidayMax + 20]} />
              <Tooltip content={<DecompTooltip dataKey="Holiday" />} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
              <Bar
                dataKey="holiday"
                name="Holiday"
                fill="#ef4444"
                radius={[3, 3, 0, 0]}
              />
              {selectedMonth !== null && (
                <ReferenceLine x={selectedMonth} stroke="#6366f1" strokeDasharray="3 3" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 4: Combined Forecast with Confidence Band */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-500" />
            Combined Forecast (yhat)
            <Badge variant="secondary" className="text-[10px] ml-auto">95% confidence band</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} onClick={(e) => { if (e?.activeTooltipIndex !== undefined) setSelectedMonth(e.activeTooltipIndex); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={2} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={['auto', 'auto']} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload as DecompPoint | undefined;
                  if (!d) return null;
                  return (
                    <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md text-xs space-y-1">
                      <p className="font-medium">{label}</p>
                      <p>yhat: <span className="font-mono font-semibold">{d.yhat}</span></p>
                      <p className="text-muted-foreground">
                        [{d.yhatLower}, {d.yhatUpper}]
                      </p>
                      <Separator />
                      <p className="text-muted-foreground">trend: {d.trend}</p>
                      <p className="text-muted-foreground">seasonal: {d.seasonal > 0 ? '+' : ''}{d.seasonal}</p>
                      <p className="text-muted-foreground">holiday: {d.holiday > 0 ? '+' : ''}{d.holiday}</p>
                    </div>
                  );
                }}
              />
              {/* Confidence band */}
              <Area
                type="monotone"
                dataKey="yhatUpper"
                stroke="transparent"
                fill="#8b5cf6"
                fillOpacity={0.08}
                name="Upper"
              />
              <Area
                type="monotone"
                dataKey="yhatLower"
                stroke="transparent"
                fill="#ffffff"
                fillOpacity={1}
                name="Lower"
              />
              {/* Forecast line */}
              <Line type="monotone" dataKey="yhat" stroke="#8b5cf6" strokeWidth={2.5} dot={false} name="yhat" />
              {/* Trend as reference */}
              <Line type="monotone" dataKey="trend" stroke="#10b981" strokeWidth={1} strokeDasharray="4 2" dot={false} name="Trend" />
              {selectedMonth !== null && (
                <ReferenceLine x={data[selectedMonth]?.month} stroke="#6366f1" strokeDasharray="3 3" />
              )}
            </AreaChart>
          </ResponsiveContainer>
          {/* Inline legend */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground px-2">
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 bg-violet-500 rounded" />
              <span>yhat (combined)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 bg-emerald-500 rounded border-dashed" />
              <span>Trend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-4 bg-violet-500/10 rounded" />
              <span>95% CI</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Month Detail Panel */}
      {selected && (
        <Card className="border-violet-200 dark:border-violet-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-violet-500" />
              Detailed Breakdown: {selected.month}
              <Badge className={`ml-2 ${getSeasonColor(selected.season).bg} ${getSeasonColor(selected.season).text} text-[10px]`}>
                {selected.season.replace('_', '-')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Trend</p>
                <p className="text-lg font-mono font-semibold text-emerald-600">{selected.trend}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Seasonal</p>
                <p className={`text-lg font-mono font-semibold ${selected.seasonal >= 0 ? 'text-amber-600' : 'text-sky-600'}`}>
                  {selected.seasonal > 0 ? '+' : ''}{selected.seasonal}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Holiday</p>
                <p className={`text-lg font-mono font-semibold ${selected.holiday >= 0 ? 'text-rose-600' : 'text-rose-400'}`}>
                  {selected.holiday > 0 ? '+' : ''}{selected.holiday}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">yhat</p>
                <p className="text-lg font-mono font-semibold text-violet-600">{selected.yhat}</p>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div>95% CI: [{selected.yhatLower}, {selected.yhatUpper}]</div>
              <div>
                Seasonal lift: {((selected.seasonal / selected.trend) * 100).toFixed(1)}%
                {selected.holiday !== 0 && ` | Holiday: ${((selected.holiday / selected.trend) * 100).toFixed(1)}%`}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => setSelectedMonth(null)}
            >
              Clear selection
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Component Summary Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Trend</p>
                <p className="text-muted-foreground">Slow-moving baseline capturing the underlying demand trajectory</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Sun className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Seasonal (BD)</p>
                <p className="text-muted-foreground">Winter peak (+30-60%), Monsoon trough (-20-40%), Pre-winter spike</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Holiday</p>
                <p className="text-muted-foreground">Eid dips (-25-30%), Durga Puja bump (+10%), CNY impact</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Layers className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Combined</p>
                <p className="text-muted-foreground">yhat = trend + seasonal + holiday with 95% confidence band</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


