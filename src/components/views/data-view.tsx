'use client';

// ============================================
// TrimedCast LEAN — Products & Sales Data view
// Server-side pagination + search (loads fast even with 1000+ SKUs).
// Inline price editing + single/bulk deletion.
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Search, Package, Plane, Ship, Upload, Check, Loader2, Trash2, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';

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

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const PAGE_SIZE = 20;

export function DataView() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const bumpData = useAppStore((s) => s.bumpData);
  const setView = useAppStore((s) => s.setView);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deletingSingle, setDeletingSingle] = useState<string | null>(null);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Debounce the search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPagination(prev => ({ ...prev, page: 1 })); // reset to page 1 on search
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async (page: number, q: string) => {
    setLoading(true);
    setSelected(new Set()); // clear selection on page change
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (q) params.set('q', q);
      const res = await apiFetch(`/api/products?${params}`);
      const json = await res.json();
      setProducts(json.products || []);
      setPagination(json.pagination || { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(pagination.page, debouncedQuery); }, [debouncedQuery, dataVersion, load]);

  const updatePrice = useCallback(async (sku: string, field: 'unitCostBdt' | 'sellingPrice', value: number) => {
    setSaving(sku);
    try {
      const res = await apiFetch(`/api/products/${encodeURIComponent(sku)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toast.error('Update failed', { description: json.error }); return; }
      setProducts(prev => prev.map(p => p.skuCode === sku ? { ...p, [field]: value } : p));
      bumpData();
      toast.success('Price updated', { description: `${sku}: ৳${value}` });
    } catch (e) { toast.error('Update failed'); }
    finally { setSaving(null); }
  }, [bumpData]);

  const deleteSingle = useCallback(async (sku: string, name: string) => {
    if (!confirm(`Delete "${sku}" (${name})?\n\nThis will also delete ALL its sales, purchases, inventory, forecasts, and orders.\n\nThis cannot be undone.`)) return;
    setDeletingSingle(sku);
    try {
      const res = await apiFetch(`/api/products/${encodeURIComponent(sku)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) { toast.error('Delete failed', { description: json.error }); return; }
      setProducts(prev => prev.filter(p => p.skuCode !== sku));
      setSelected(prev => { const n = new Set(prev); n.delete(sku); return n; });
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      bumpData();
      toast.success('SKU deleted', { description: `${sku} — ${name}` });
    } catch (e) { toast.error('Delete failed'); }
    finally { setDeletingSingle(null); }
  }, [bumpData]);

  const deleteBulk = useCallback(async () => {
    const count = selected.size;
    if (count === 0) return;
    if (!confirm(`Delete ${count} SKU${count > 1 ? 's' : ''}?\n\nThis will also delete ALL their sales, purchases, inventory, forecasts, and orders.\n\nThis cannot be undone.`)) return;
    setDeletingBulk(true);
    try {
      const res = await apiFetch('/api/products', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuCodes: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toast.error('Bulk delete failed', { description: json.error }); return; }
      setProducts(prev => prev.filter(p => !selected.has(p.skuCode)));
      setPagination(prev => ({ ...prev, total: prev.total - json.deletedCount }));
      setSelected(new Set());
      bumpData();
      toast.success('SKUs deleted', { description: `${json.deletedCount} deleted` });
    } catch (e) { toast.error('Bulk delete failed'); }
    finally { setDeletingBulk(false); }
  }, [selected, bumpData]);

  const toggleSelect = (sku: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(sku)) n.delete(sku); else n.add(sku); return n; });
  };
  const toggleSelectAll = () => {
    setSelected(prev => {
      if (prev.size === products.length) return new Set();
      return new Set(products.map(p => p.skuCode));
    });
  };

  const allSelected = products.length > 0 && selected.size === products.length;
  const someSelected = selected.size > 0 && !allSelected;
  const goToPage = (p: number) => { if (p >= 1 && p <= pagination.totalPages) load(p, debouncedQuery); };

  return (
    <div className="space-y-4">
      {/* Header + search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Products & Sales Data</h2>
          <p className="text-xs text-muted-foreground">
            {pagination.total} SKUs total · page {pagination.page} of {pagination.totalPages || 1} · edit prices inline · delete single or bulk
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search SKU or item…" value={query}
              onChange={(e) => setQuery(e.target.value)} className="pl-8 w-full sm:w-64" />
          </div>
          <Button variant="outline" onClick={() => setView('upload')}>
            <Upload className="h-4 w-4 mr-2" /> Upload
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">{debouncedQuery ? 'No SKUs found' : 'No data yet'}</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              {debouncedQuery ? `No products match "${debouncedQuery}"` : 'Upload your Excel workbook to see your SKUs here.'}
            </p>
            <Button onClick={() => setView('upload')}><Upload className="h-4 w-4 mr-2" /> Upload Excel</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Bulk-action bar */}
            {selected.size > 0 && (
              <div className="flex items-center justify-between gap-3 border-b bg-primary/5 px-4 py-2.5">
                <span className="text-sm font-medium">{selected.size} SKU{selected.size > 1 ? 's' : ''} selected</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}><X className="h-3.5 w-3.5 mr-1" />Clear</Button>
                  <Button variant="destructive" size="sm" onClick={deleteBulk} disabled={deletingBulk}>
                    {deletingBulk ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                    Delete {selected.size > 1 ? `${selected.size} SKUs` : 'SKU'}
                  </Button>
                </div>
              </div>
            )}
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5 w-10">
                      <input type="checkbox" checked={allSelected}
                        ref={el => { if (el) el.indeterminate = someSelected; }}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer" title="Select all" />
                    </th>
                    <th className="text-left font-medium px-4 py-2.5">SKU (Pic No)</th>
                    <th className="text-left font-medium px-4 py-2.5">Item</th>
                    <th className="text-left font-medium px-4 py-2.5">Color / Details</th>
                    <th className="text-right font-medium px-4 py-2.5">Unit Cost (৳)</th>
                    <th className="text-right font-medium px-4 py-2.5">Sell Price (৳)</th>
                    <th className="text-right font-medium px-4 py-2.5">Total Sales</th>
                    <th className="text-right font-medium px-4 py-2.5">Last Order</th>
                    <th className="text-center font-medium px-4 py-2.5">Mode</th>
                    <th className="text-right font-medium px-4 py-2.5">Lead (d)</th>
                    <th className="text-center font-medium px-4 py-2.5 w-12">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map(p => {
                    const isSelected = selected.has(p.skuCode);
                    return (
                      <tr key={p.id} className={`hover:bg-muted/30 ${isSelected ? 'bg-primary/5' : ''}`}>
                        <td className="px-4 py-2.5">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.skuCode)}
                            className="h-4 w-4 rounded border-border accent-primary cursor-pointer" title={`Select ${p.skuCode}`} />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs font-medium">{p.skuCode}</td>
                        <td className="px-4 py-2.5 max-w-xs"><div className="truncate">{p.productName}</div></td>
                        <td className="px-4 py-2.5 max-w-xs"><div className="truncate text-xs text-muted-foreground">{p.colorDetails || '—'}</div></td>
                        <td className="px-4 py-2.5 text-right">
                          <PriceInput value={p.unitCostBdt} onSave={v => updatePrice(p.skuCode, 'unitCostBdt', v)} disabled={saving === p.skuCode} />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <PriceInput value={p.sellingPrice} onSave={v => updatePrice(p.skuCode, 'sellingPrice', v)} disabled={saving === p.skuCode} />
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{p.totalSales.toLocaleString()}<div className="text-[10px] text-muted-foreground">{p.salesRows} mo</div></td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{p.lastOrderQty ?? '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          {p.lastShipmentMode ? (
                            <Badge variant="outline" className="text-[10px]">
                              {p.lastShipmentMode === 'air' ? <><Plane className="h-3 w-3 mr-1" />Air</> : <><Ship className="h-3 w-3 mr-1" />Sea</>}
                            </Badge>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-xs">{p.lastLeadTimeDays ?? '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteSingle(p.skuCode, p.productName)} disabled={deletingSingle === p.skuCode} title={`Delete ${p.skuCode}`}>
                            {deletingSingle === p.skuCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Showing {products.length} of {pagination.total} SKUs
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToPage(1)} disabled={pagination.page <= 1}><ChevronsLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs tabular-nums px-2">{pagination.page} / {pagination.totalPages || 1}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goToPage(pagination.totalPages)} disabled={pagination.page >= pagination.totalPages}><ChevronsRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Inline editable price input — saves on blur or Enter. */
function PriceInput({ value, onSave, disabled }: { value: number | null; onSave: (v: number) => void; disabled?: boolean }) {
  const [local, setLocal] = useState<string>(value?.toString() ?? '');
  const commit = () => {
    const n = Number(local);
    if (!isNaN(n) && n >= 0 && n !== value) onSave(n);
    else setLocal(value?.toString() ?? '');
  };
  return (
    <div className="relative inline-flex items-center">
      <span className="text-muted-foreground text-xs mr-1">৳</span>
      <input type="number" value={local} onChange={e => setLocal(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        disabled={disabled} placeholder="—"
        className="w-20 rounded border border-transparent bg-transparent px-1.5 py-1 text-right tabular-nums text-xs hover:border-border focus:border-primary focus:bg-background focus:outline-none disabled:opacity-50" />
      {disabled && <Loader2 className="h-3 w-3 animate-spin absolute -right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />}
      {value !== null && !disabled && local === value.toString() && <Check className="h-3 w-3 text-green-500 absolute -right-4 top-1/2 -translate-y-1/2" />}
    </div>
  );
}
