'use client';

// ============================================
// TrimedCast LEAN — Dashboard view (Phase 5)
// The dashboard is now the unified Session Pilot — composes all 6
// capabilities for the next upcoming festival into one actionable view.
// Below the pilot: lean build progress + import history.
// ============================================

import { apiFetch } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { SessionPilot } from '@/components/views/session-pilot';
import {
  UploadCloud, CheckCircle2, Package,
} from 'lucide-react';

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

  const [stats, setStats] = useState<Stats>({ products: 0, sales: 0, purchases: 0, festivals: 0 });
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/import');
        const json = await res.json();
        if (cancelled) return;
        setImports(json.imports || []);
        setStats(json.stats || { products: 0, sales: 0, purchases: 0, festivals: 0 });
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dataVersion, lastImport]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasData = stats.products > 0;

  // Empty state — no data yet
  if (!hasData) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center text-center py-12 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
            <UploadCloud className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Welcome to CreativeCast</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Upload your Excel workbook (Pic No, Item, monthly Jan–Dec columns) to get started.
            The system will ingest your sales history and prepare session-wise forecasts,
            order recommendations, freight decisions, and landed-cost analysis — all in one dashboard.
          </p>
          <Button onClick={() => setView('upload')}>
            <UploadCloud className="h-4 w-4 mr-2" />
            Upload your Excel
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* The unified Session Pilot — all 6 capabilities composed */}
      <SessionPilot />

      {/* Lean build progress (all phases done) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Lean Build — Complete
          </CardTitle>
          <CardDescription>All 6 client capabilities are live</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Excel Upload', phase: 'Phase 1', done: true, pct: 100 },
              { label: 'Session Forecast', phase: 'Phase 2', done: true, pct: 100 },
              { label: 'Order Quantity', phase: 'Phase 3', done: true, pct: 100 },
              { label: 'Order Timing', phase: 'Phase 3', done: true, pct: 100 },
              { label: 'Air vs Sea', phase: 'Phase 4', done: true, pct: 100 },
              { label: 'Line Cost', phase: 'Phase 4', done: true, pct: 100 },
            ].map((p) => (
              <div key={p.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {p.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{p.phase}</span>
                </div>
                <Progress value={p.pct} className="h-1.5" />
                <div className="text-[10px] text-green-600">Ready</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data summary + import history */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Summary</CardTitle>
            <CardDescription>What's in the database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <DataStat icon={Package} label="Products" value={stats.products} />
              <DataStat icon={Package} label="Sales records" value={stats.sales} />
              <DataStat icon={Package} label="Purchase records" value={stats.purchases} />
              <DataStat icon={Package} label="Festival sessions" value={stats.festivals} />
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setView('data')}>
              View all products <UploadCloud className="h-3.5 w-3.5 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import History</CardTitle>
            <CardDescription>Uploaded Excel files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            {imports.length === 0 && (
              <p className="text-sm text-muted-foreground">No imports yet.</p>
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
    </div>
  );
}

function DataStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
