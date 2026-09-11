'use client';

// ============================================
// TrimedCast LEAN — Upload & Manage page (combined)
// Top: upload zone (drop file or click) + download template/sample
// Bottom: year-wise upload list (each year = 1 active upload, delete + replace)
// ============================================

import { useCallback, useRef, useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDate } from '@/lib/sessions/festival-calendar';
import { formatFileSize, isValidFileType, MAX_FILE_SIZE } from '@/lib/etl/excel-parser';
import {
  UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle,
  ArrowRight, Loader2, FileDown, Download, CalendarClock, Trash2,
  RefreshCw, Info,
} from 'lucide-react';

interface YearUpload {
  id: string;
  fileName: string;
  dataYear: number;
  status: string;
  rowCount: number;
  skuCount: number;
  saleCount: number;
  fileSize: number;
  createdAt: string;
  completedAt: string | null;
}

export function UploadManageView() {
  const bumpData = useAppStore((s) => s.bumpData);
  const setLastImport = useAppStore((s) => s.setLastImport);
  const dataVersion = useAppStore((s) => s.dataVersion);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [dataYear, setDataYear] = useState<number>(new Date().getFullYear() - 1);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; skuCount?: number; saleCount?: number; purchaseCount?: number; warnings?: string[]; error?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Year-wise list state
  const [uploads, setUploads] = useState<YearUpload[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadUploads = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/import?byYear=true');
      const json = await res.json();
      setUploads(json.years || []);
    } catch (e) { console.error(e); }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { loadUploads(); }, [loadUploads, dataVersion]);

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    if (!isValidFileType(f.name)) { toast.error('Unsupported file type', { description: 'Use .xlsx, .xls, or .csv' }); return; }
    if (f.size > MAX_FILE_SIZE) { toast.error('File too large', { description: 'Max 10 MB' }); return; }
    setFile(f);
    setImportResult(null);
    toast.success('File ready', { description: `${f.name} (${formatFileSize(f.size)})` });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }, [handleFile]);

  const doImport = useCallback(async () => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('dataYear', String(dataYear));
      const res = await fetch('/api/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setImportResult({ success: false, error: json.error || 'Unknown error' });
        toast.error('Import failed', { description: json.error || 'Unknown error' });
        return;
      }
      setImportResult({
        success: true,
        skuCount: json.skuCount,
        saleCount: json.saleCount,
        purchaseCount: json.purchaseCount,
        warnings: json.warnings,
      });
      setLastImport({
        importId: json.importId,
        fileName: json.fileName,
        rowCount: json.totalRows ?? 0,
        skuCount: json.skuCount ?? 0,
        saleCount: json.saleCount ?? 0,
        purchaseCount: json.purchaseCount ?? 0,
        warnings: json.warnings ?? [],
        completedAt: new Date().toISOString(),
      });
      bumpData();
      loadUploads();
      setFile(null);
      toast.success('Import complete', {
        description: `${json.skuCount} SKUs · ${json.saleCount} sales · ${json.purchaseCount} purchases`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setImportResult({ success: false, error: msg });
      toast.error('Import failed', { description: msg });
    } finally { setImporting(false); }
  }, [file, dataYear, setLastImport, bumpData, loadUploads]);

  const deleteYear = async (year: number) => {
    if (!confirm(`Delete ALL data for ${year}?\n\nThis will permanently delete all sales records for ${year} and the upload record.\nProducts, purchases, and inventory are NOT deleted.\n\nThis cannot be undone.`)) return;
    setDeleting(year);
    try {
      const res = await fetch(`/api/import/${year}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) { toast.error('Delete failed', { description: json.error }); return; }
      toast.success(`${year} data deleted`, { description: `${json.deletedSalesCount} sales records removed` });
      loadUploads();
      bumpData();
    } catch (e) { toast.error('Delete failed'); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-5">
      {/* Section 1: Upload zone */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-primary" />
                Upload Excel
              </CardTitle>
              <CardDescription className="mt-1">
                One row per SKU with monthly columns (Jan–Dec). Re-uploading a year replaces its old data automatically.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <a href="/trimedcast-template.xlsx" download>
                <Button variant="outline" size="sm"><FileDown className="h-4 w-4 mr-2" />Template</Button>
              </a>
              <a href="/sample_client_sales.xlsx" download>
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Sample</Button>
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <UploadCloud className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{file ? file.name : 'Drop your Excel here or click to browse'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {file ? formatFileSize(file.size) : '.xlsx, .xls, or .csv · max 10 MB'}
              </p>
            </div>
            <Input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          </div>

          {/* Year + import button */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="year">Sales data year</Label>
              <Input id="year" type="number" value={dataYear}
                onChange={(e) => setDataYear(Number(e.target.value) || new Date().getFullYear() - 1)} />
              <p className="text-[11px] text-muted-foreground">The year the monthly columns (Jan–Dec) belong to.</p>
            </div>
            <Button onClick={doImport} disabled={!file || importing} className="shrink-0">
              {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</> : <><UploadCloud className="h-4 w-4 mr-2" />Import now</>}
            </Button>
          </div>

          {/* Import result */}
          {importing && (
            <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Parsing + melting monthly columns + upserting records…</span>
            </div>
          )}
          {importResult?.success && (
            <div className="rounded-lg border border-green-500/30 bg-green-50/30 p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Import successful</p>
                  <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                    <div><span className="text-muted-foreground">SKUs:</span> <span className="font-medium">{importResult.skuCount}</span></div>
                    <div><span className="text-muted-foreground">Sales:</span> <span className="font-medium">{importResult.saleCount}</span></div>
                    <div><span className="text-muted-foreground">Purchases:</span> <span className="font-medium">{importResult.purchaseCount}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {importResult && !importResult.success && (
            <div className="rounded-lg border border-red-500/30 bg-red-50/30 p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div><p className="text-sm font-medium">Import failed</p><p className="text-xs text-muted-foreground mt-0.5">{importResult.error}</p></div>
            </div>
          )}

          {/* Info banner about replace */}
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong>How it works:</strong> Each year can have only 1 Excel upload. Re-uploading a year
              (e.g. 2024) automatically deletes the old 2024 data and replaces it with the new file.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Year-wise upload list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Uploaded Years ({uploads.length})
              </CardTitle>
              <CardDescription className="mt-1">Most recent first · each year = 1 active upload</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadUploads} disabled={loadingList}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingList ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : uploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium">No uploads yet</p>
              <p className="text-xs text-muted-foreground mt-1">Upload your first Excel above.</p>
            </div>
          ) : (
            <div className="divide-y">
              {uploads.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-4 hover:bg-muted/30">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0">
                    {u.dataYear}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{u.fileName}</span>
                      <Badge variant="outline" className="text-[10px]">{u.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{u.skuCount} SKUs</span>
                      <span>{u.saleCount} sales</span>
                      <span>{u.rowCount} rows</span>
                      <span>{formatFileSize(u.fileSize)}</span>
                      <span>Uploaded {formatDate(u.createdAt)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                    onClick={() => deleteYear(u.dataYear)} disabled={deleting === u.dataYear}>
                    {deleting === u.dataYear ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
