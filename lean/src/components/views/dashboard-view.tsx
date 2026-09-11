'use client';

// ============================================
// TrimedCast LEAN — Dashboard overview view
// Shows: KPI cards, upcoming festival sessions, last import status,
// and a "what to do next" panel. Reads from /api/festivals and /api/import.
// ============================================

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { describeEffect, formatDate } from '@/lib/sessions/festival-calendar';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  CalendarClock,
  UploadCloud,
  AlertTriangle,
  ArrowRight,
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

interface Stats {
  products: number;
  sales: number;
  purchases: number;
  festivals: number;
}

interface ImportRow {
  id: string;
  fileName: string;
  status: string;
  rowCount: number;
  skuCount: number;
  saleCount: number;
  purchaseCount: number;
  createdAt: string;
}

export function DashboardView() {
  const setView = useAppStore((s) => s.setView);
  const lastImport = useAppStore((s) => s.lastImport);
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [stats, setStats] = useState<Stats>({ products: 0, sales: 0, purchases: 0, festivals: 0 });
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [fRes, iRes] = await Promise.all([
          fetch('/api/festivals'),
          fetch('/api/import'),
        ]);
        const fJson = await fRes.json();
        const iJson = await iRes.json();
        if (cancelled) return;
        setFestivals(fJson.festivals || []);
        setImports(iJson.imports || []);
        setStats(iJson.stats || { products: 0, sales: 0, purchases: 0, festivals: 0 });
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dataVersion, lastImport]);

  const upcoming = festivals.filter((f) => f.isUpcoming).slice(0, 5);
  const nextSession = upcoming[0];

  const kpis = [
    { label: 'Products (SKUs)', value: stats.products, icon: Package, tint: 'text-blue-600 bg-blue-50' },
    { label: 'Sales records', value: stats.sales, icon: TrendingUp, tint: 'text-emerald-600 bg-emerald-50' },
    { label: 'Purchase records', value: stats.purchases, icon: ShoppingCart, tint: 'text-amber-600 bg-amber-50' },
    { label: 'Festival sessions', value: stats.festivals, icon: CalendarClock, tint: 'text-purple-600 bg-purple-50' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hasData = stats.products > 0;

  return (
    <div className="space-y-6">
      {/* Empty state — prompt upload */}
      {!hasData && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center text-center py-12 px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
              <UploadCloud className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Welcome to TrimedCast Lean</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Upload your Excel workbook (Pic No, Item, monthly Jan–Dec columns) to get started.
              The system will ingest your sales history and prepare session-wise forecasts.
            </p>
            <Button onClick={() => setView('upload')}>
              <UploadCloud className="h-4 w-4 mr-2" />
              Upload your Excel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{k.label}</span>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md ${k.tint}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold tabular-nums">{k.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Next session banner */}
      {nextSession && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={nextSession.type === 'supply' ? 'destructive' : 'default'}>
                    {nextSession.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Next session</span>
                </div>
                <h3 className="text-xl font-semibold">{nextSession.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Peak: {formatDate(nextSession.peakDate)} · Window: {formatDate(nextSession.windowStart)} – {formatDate(nextSession.windowEnd)}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Badge variant="outline" className="text-sm">
                    {describeEffect(nextSession.demandEffect)}
                  </Badge>
                  {nextSession.daysUntil > 0 ? (
                    <span className="text-sm font-medium text-orange-600">
                      {nextSession.daysUntil} days away
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-red-600">In progress / passed</span>
                  )}
                </div>
              </div>
              <div className="border-t md:border-t-0 md:border-l p-5 md:w-64 flex flex-col justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setView('forecast')}>
                  View forecast <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setView('orders')}>
                  Order recommendations
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming sessions list */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Festival Sessions</CardTitle>
            <CardDescription>Session-wise demand planning calendar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">No upcoming sessions seeded.</p>
            )}
            {upcoming.map((f) => {
              const urgency =
                f.daysUntil <= 45 ? 'critical' : f.daysUntil <= 90 ? 'high' : f.daysUntil <= 180 ? 'normal' : 'low';
              const urgencyColor = {
                critical: 'bg-red-500',
                high: 'bg-orange-500',
                normal: 'bg-blue-500',
                low: 'bg-muted-foreground',
              }[urgency];
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`h-2 w-2 rounded-full ${urgencyColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{f.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {describeEffect(f.demandEffect)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Peak {formatDate(f.peakDate)} · {f.daysUntil} days out
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Urgency</div>
                    <div className="text-xs font-medium capitalize">{urgency}</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Import history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import History</CardTitle>
            <CardDescription>Uploaded Excel files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {imports.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No imports yet. <Button variant="link" className="h-auto p-0" onClick={() => setView('upload')}>Upload one →</Button>
              </div>
            )}
            {imports.slice(0, 5).map((imp) => {
              const ok = imp.status === 'completed';
              return (
                <div key={imp.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`h-2 w-2 rounded-full ${ok ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{imp.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      {imp.rowCount} rows · {imp.skuCount} SKUs · {imp.saleCount} sales · {imp.purchaseCount} purchases
                    </div>
                  </div>
                  <Badge variant={ok ? 'default' : 'secondary'} className="text-[10px]">
                    {imp.status}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Phase status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lean Build Progress</CardTitle>
          <CardDescription>The 6 capabilities, phase by phase</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Excel Upload', phase: 'Phase 1', done: hasData, pct: hasData ? 100 : 0 },
              { label: 'Session Forecast', phase: 'Phase 2', done: false, pct: 0 },
              { label: 'Order Quantity', phase: 'Phase 3', done: false, pct: 0 },
              { label: 'Order Timing', phase: 'Phase 3', done: false, pct: 0 },
              { label: 'Air vs Sea', phase: 'Phase 4', done: false, pct: 0 },
              { label: 'Line Cost', phase: 'Phase 4', done: false, pct: 0 },
            ].map((p) => (
              <div key={p.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.label}</span>
                  <span className="text-[10px] text-muted-foreground">{p.phase}</span>
                </div>
                <Progress value={p.pct} className="h-1.5" />
                <div className="text-[10px] text-muted-foreground">
                  {p.done ? 'Ready' : 'Pending'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
