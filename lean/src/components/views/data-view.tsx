'use client';

// ============================================
// TrimedCast LEAN — Data view
// Shows the uploaded products with their sales/purchase summaries.
// Read-only (Phase 1). Editing prices comes in Phase 4 (line cost).
// ============================================

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Package, Plane, Ship, Calendar, Upload } from 'lucide-react';

interface ProductRow {
  id: string;
  skuCode: string;
  productName: string;
  colorDetails: string | null;
  hsCode: string;
  unitCostBdt: number | null;
  sellingPrice: number | null;
  totalSales: number;
  salesRows: number;
  purchaseRows: number;
  lastOrderQty: number | null;
  lastShipmentMode: string | null;
  lastLeadTimeDays: number | null;
}

export function DataView() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const setView = useAppStore((s) => s.setView);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/products');
        const json = await res.json();
        if (!cancelled) setProducts(json.products || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dataVersion]);

  const filtered = products.filter((p) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return p.skuCode.toLowerCase().includes(q) || p.productName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Products & Sales Data</h2>
          <p className="text-xs text-muted-foreground">
            {products.length} SKUs ingested from your Excel
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SKU or item…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 w-full sm:w-64"
            />
          </div>
          <Button variant="outline" onClick={() => setView('upload')}>
            <Upload className="h-4 w-4 mr-2" /> Upload
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">No data yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Upload your Excel workbook to see your SKUs here.
            </p>
            <Button onClick={() => setView('upload')}>
              <Upload className="h-4 w-4 mr-2" /> Upload Excel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">SKU (Pic No)</th>
                    <th className="text-left font-medium px-4 py-2.5">Item</th>
                    <th className="text-left font-medium px-4 py-2.5">Color / Details</th>
                    <th className="text-right font-medium px-4 py-2.5">Total Sales</th>
                    <th className="text-right font-medium px-4 py-2.5">Last Order</th>
                    <th className="text-center font-medium px-4 py-2.5">Mode</th>
                    <th className="text-right font-medium px-4 py-2.5">Lead (d)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium">{p.skuCode}</td>
                      <td className="px-4 py-2.5 max-w-xs">
                        <div className="truncate">{p.productName}</div>
                      </td>
                      <td className="px-4 py-2.5 max-w-xs">
                        <div className="truncate text-xs text-muted-foreground">{p.colorDetails || '—'}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {p.totalSales.toLocaleString()}
                        <div className="text-[10px] text-muted-foreground">{p.salesRows} mo</div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {p.lastOrderQty ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {p.lastShipmentMode ? (
                          <Badge variant="outline" className="text-[10px]">
                            {p.lastShipmentMode === 'air' ? (
                              <><Plane className="h-3 w-3 mr-1" />Air</>
                            ) : (
                              <><Ship className="h-3 w-3 mr-1" />Sea</>
                            )}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                        {p.lastLeadTimeDays ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 50 && (
              <div className="border-t p-3 text-xs text-muted-foreground text-center">
                Showing first 50 of {filtered.length} matching SKUs
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
