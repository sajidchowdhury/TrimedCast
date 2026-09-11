'use client';

// ============================================
// TrimedCast LEAN — Upload view (the Excel import wizard)
// Steps: 1) Select file + data year  2) Preview + column mapping
//        3) Import (POST to /api/import)  4) Result summary
// Accepts the client's wide format (Pic No, Item, Jan..Dec).
// ============================================

import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  TableProperties,
  Download,
  FileDown,
} from 'lucide-react';
import { formatFileSize, isValidFileType, MAX_FILE_SIZE } from '@/lib/etl/excel-parser';

type Step = 'select' | 'preview' | 'importing' | 'done';

interface ImportResult {
  success: boolean;
  importId?: string;
  fileName?: string;
  totalRows?: number;
  skuCount?: number;
  saleCount?: number;
  purchaseCount?: number;
  warnings?: string[];
  mapping?: {
    picNo: string | null;
    item: string | null;
    color: string | null;
    orderQty: string | null;
    orderedOn: string | null;
    sendOn: string | null;
    sendBy: string | null;
    receivedOn: string | null;
    monthly: { header: string; monthIndex: number }[];
  };
  error?: string;
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'select', label: 'Select File' },
  { key: 'preview', label: 'Preview & Mapping' },
  { key: 'importing', label: 'Importing' },
  { key: 'done', label: 'Complete' },
];

export function UploadView() {
  const setView = useAppStore((s) => s.setView);
  const setLastImport = useAppStore((s) => s.setLastImport);
  const bumpData = useAppStore((s) => s.bumpData);

  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [dataYear, setDataYear] = useState<number>(new Date().getFullYear() - 1);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    if (!isValidFileType(f.name)) {
      toast.error('Unsupported file type', { description: 'Use .xlsx, .xls, or .csv' });
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error('File too large', { description: 'Max 10 MB' });
      return;
    }
    setFile(f);
    setResult(null);
    setStep('preview');
    toast.success('File ready', { description: `${f.name} (${formatFileSize(f.size)})` });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    handleFile(f);
  }, [handleFile]);

  const doImport = useCallback(async () => {
    if (!file) return;
    setImporting(true);
    setStep('importing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('dataYear', String(dataYear));
      const res = await fetch('/api/import', { method: 'POST', body: fd });
      const json = (await res.json()) as ImportResult;
      if (!res.ok || !json.success) {
        setResult(json);
        setStep('select');
        toast.error('Import failed', { description: json.error || 'Unknown error' });
        return;
      }
      setResult(json);
      setLastImport({
        importId: json.importId!,
        fileName: json.fileName!,
        rowCount: json.totalRows ?? 0,
        skuCount: json.skuCount ?? 0,
        saleCount: json.saleCount ?? 0,
        purchaseCount: json.purchaseCount ?? 0,
        warnings: json.warnings ?? [],
        completedAt: new Date().toISOString(),
      });
      bumpData();
      setStep('done');
      toast.success('Import complete', {
        description: `${json.skuCount} SKUs · ${json.saleCount} sales rows · ${json.purchaseCount} purchases`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setResult({ success: false, error: msg });
      setStep('select');
      toast.error('Import failed', { description: msg });
    } finally {
      setImporting(false);
    }
  }, [file, dataYear, setLastImport, bumpData]);

  const reset = () => {
    setFile(null);
    setResult(null);
    setStep('select');
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium shrink-0 ${
                i < stepIndex
                  ? 'bg-primary text-primary-foreground'
                  : i === stepIndex
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:inline ${i <= stepIndex ? 'font-medium' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: select */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <CardTitle className="text-base">Upload your sales Excel</CardTitle>
                <CardDescription className="mt-1">
                  The workbook should have one row per SKU with monthly columns (Jan–Dec).
                  Columns we recognize: Pic No, Item, Color & Details, Order QTY, Ordered On, Send On,
                  Send By Sea/Air, Received On, and Jan, Feb, … Dec.
                </CardDescription>
              </div>
            </div>
            {/* Download template + sample */}
            <div className="flex flex-wrap gap-2 mt-2">
              <a href="/trimedcast-template.xlsx" download>
                <Button variant="outline" size="sm">
                  <FileDown className="h-4 w-4 mr-2" />
                  Download template
                </Button>
              </a>
              <a href="/sample_client_sales.xlsx" download>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download sample (21 SKUs)
                </Button>
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              The <strong>template</strong> has empty headers + 2 example rows + an instructions sheet (Bangla + English).
              The <strong>sample</strong> has 21 realistic SKUs with seasonal data you can test the full pipeline with.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <UploadCloud className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Drop your Excel here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-0.5">.xlsx, .xls, or .csv · max 10 MB</p>
              </div>
              <Input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="year">Sales data year</Label>
                <Input
                  id="year"
                  type="number"
                  value={dataYear}
                  onChange={(e) => setDataYear(Number(e.target.value) || new Date().getFullYear() - 1)}
                />
                <p className="text-[11px] text-muted-foreground">
                  The year the monthly columns (Jan–Dec) belong to. Defaults to last year.
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                <p className="font-medium flex items-center gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" />Expected format</p>
                <p className="text-muted-foreground">Wide format — one row per SKU, with 12 monthly columns. The system melts Jan–Dec into a clean SKU-month time series.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: preview + mapping */}
      {step === 'preview' && file && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              {file.name}
            </CardTitle>
            <CardDescription>
              {formatFileSize(file.size)} · ready to import as year {dataYear}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
                <TableProperties className="h-3.5 w-3.5" /> What we'll do
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Parse the workbook and detect column headers</li>
                <li>Melt the 12 monthly columns (Jan–Dec) into one row per SKU-month</li>
                <li>Extract purchase records (Order QTY + dates + Send By mode)</li>
                <li>Upsert products, sales, purchases, and seed inventory</li>
                <li>Seed the festival calendar (Eid, Puja, Winter, CNY, Summer) if empty</li>
              </ul>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={reset}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={doImport} disabled={importing}>
                Import now <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: importing */}
      {step === 'importing' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">Importing & transforming…</p>
            <p className="text-xs text-muted-foreground mt-1">Melting monthly columns, upserting records</p>
            <Progress className="w-full max-w-sm mt-4 h-1.5" value={60} />
          </CardContent>
        </Card>
      )}

      {/* Step 4: done */}
      {step === 'done' && result?.success && (
        <div className="space-y-4">
          <Card className="border-green-500/30 bg-green-50/30">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold">Import successful</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {result.fileName} · {result.totalRows} rows parsed
                  </p>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <Stat label="SKUs" value={result.skuCount ?? 0} />
                    <Stat label="Sales rows" value={result.saleCount ?? 0} />
                    <Stat label="Purchase rows" value={result.purchaseCount ?? 0} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Column mapping diagnostics */}
          {result.mapping && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detected column mapping</CardTitle>
                <CardDescription>How your Excel headers were matched</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  <Mapping label="SKU (Pic No)" value={result.mapping.picNo} />
                  <Mapping label="Product (Item)" value={result.mapping.item} />
                  <Mapping label="Color & Details" value={result.mapping.color} />
                  <Mapping label="Order QTY" value={result.mapping.orderQty} />
                  <Mapping label="Ordered On" value={result.mapping.orderedOn} />
                  <Mapping label="Send On" value={result.mapping.sendOn} />
                  <Mapping label="Send By (Sea/Air)" value={result.mapping.sendBy} />
                  <Mapping label="Received On" value={result.mapping.receivedOn} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.mapping.monthly.map((m) => (
                    <Badge key={m.header} variant="outline" className="text-[10px]">
                      {m.header} → month {m.monthIndex}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warnings ({result.warnings.length})</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 text-xs mt-1 space-y-0.5">
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>
              Upload another
            </Button>
            <Button onClick={() => setView('data')}>
              View data <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="secondary" onClick={() => setView('dashboard')}>
              Back to dashboard
            </Button>
          </div>
        </div>
      )}

      {/* Error state */}
      {result && !result.success && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Import failed</AlertTitle>
          <AlertDescription>{result.error || 'Unknown error'}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

function Mapping({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between rounded border bg-muted/30 px-2 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      {value ? (
        <Badge variant="outline" className="text-[10px] font-mono">{value}</Badge>
      ) : (
        <span className="text-[10px] text-muted-foreground italic">not found</span>
      )}
    </div>
  );
}
