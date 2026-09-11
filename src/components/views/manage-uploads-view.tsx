'use client';

// ============================================
// TrimedCast LEAN — Manage Uploads view
// Shows all year-wise Excel uploads (each year = 1 active upload).
// Delete a year's data, or re-upload to replace (handled by the import API).
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDate } from '@/lib/sessions/festival-calendar';
import { formatFileSize } from '@/lib/etl/excel-parser';
import {
  CalendarClock, Trash2, Loader2, Upload, FileSpreadsheet, AlertCircle, RefreshCw,
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

export function ManageUploadsView() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const bumpData = useAppStore((s) => s.bumpData);
  const setView = useAppStore((s) => s.setView);
  const [uploads, setUploads] = useState<YearUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/import?byYear=true');
      const json = await res.json();
      setUploads(json.years || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, dataVersion]);

  const deleteYear = async (year: number) => {
    if (!confirm(`Delete ALL data for ${year}?\n\nThis will permanently delete:\n- All sales records for ${year}\n- The upload record\n\nProducts, purchases, and inventory are NOT deleted (they may belong to other years).\n\nThis cannot be undone.`)) return;
    setDeleting(year);
    try {
      const res = await fetch(`/api/import/${year}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Delete failed', { description: json.error || 'Unknown error' });
        return;
      }
      toast.success(`${year} data deleted`, {
        description: `${json.deletedSalesCount} sales records removed`,
      });
      load();
      bumpData();
    } catch (e) {
      toast.error('Delete failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally { setDeleting(null); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Manage Uploads
              </CardTitle>
              <CardDescription className="mt-1">
                All year-wise Excel uploads. Each year can have only 1 active upload —
                re-uploading a year replaces its previous data automatically.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
              </Button>
              <Button size="sm" onClick={() => setView('upload')}>
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload new
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Info banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800">
        <strong>How it works:</strong> When you upload an Excel for a year that already has data
        (e.g. re-upload 2024), the system automatically deletes the old 2024 sales and replaces
        them with the new file. Each year keeps only the latest upload. Use the trash button
        below to permanently delete a year's data.
      </div>

      {/* Year-wise list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uploaded Years ({uploads.length})</CardTitle>
          <CardDescription>Most recent first</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : uploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">No uploads yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Upload your first Excel to see it here.
              </p>
              <Button onClick={() => setView('upload')}>
                <Upload className="h-4 w-4 mr-2" /> Upload Excel
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {uploads.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-4 hover:bg-muted/30">
                  {/* Year badge */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0">
                    {u.dataYear}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{u.fileName}</span>
                      <Badge variant="outline" className="text-[10px]">{u.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{u.skuCount} SKUs</span>
                      <span>{u.saleCount} sales records</span>
                      <span>{u.rowCount} Excel rows</span>
                      <span>{formatFileSize(u.fileSize)}</span>
                      <span>Uploaded {formatDate(u.createdAt)}</span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                    onClick={() => deleteYear(u.dataYear)}
                    disabled={deleting === u.dataYear}
                  >
                    {deleting === u.dataYear ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                    )}
                    Delete year
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tip */}
      {uploads.length > 0 && (
        <Card>
          <CardContent className="p-4 flex items-start gap-2 text-xs">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-muted-foreground">
              <strong>Tip:</strong> To <strong>replace</strong> a year's data (e.g. you found a
              mistake in your 2024 Excel), simply go to <strong>Upload Excel</strong> and upload
              the corrected file with the same year (2024). The old data is automatically deleted
              and replaced — no need to delete first.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
