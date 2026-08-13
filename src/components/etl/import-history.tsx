'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useETLStore, type DataImportRecord } from '@/lib/etl/store';
import { IMPORT_TYPE_SCHEMAS, type ImportType } from '@/lib/etl/import-types';
import { QualityBadge } from './quality-badge';
import {
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  RefreshCw,
  Inbox,
} from 'lucide-react';

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Completed</Badge>;
    case 'failed':
      return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="text-xs">Cancelled</Badge>;
    case 'uploading':
    case 'parsing':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">Uploading</Badge>;
    case 'mapping':
      return <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 text-xs">Mapping</Badge>;
    case 'validating':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">Validating</Badge>;
    case 'harmonizing':
      return <Badge className="bg-cyan-100 text-cyan-700 hover:bg-cyan-100 text-xs">Harmonizing</Badge>;
    case 'inserting':
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs">Inserting</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function getImportTypeLabel(type: string): string {
  const schema = IMPORT_TYPE_SCHEMAS[type as ImportType];
  return schema?.label || type;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function ImportHistory() {
  const { imports, fetchImports } = useETLStore();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-gray-500" />
            Import History
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchImports}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {imports.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No imports yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Upload an Excel file to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Quality</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDate(imp.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {getImportTypeLabel(imp.importType)}
                    </TableCell>
                    <TableCell className="text-xs font-mono max-w-[150px] truncate">
                      {imp.fileName}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {imp.rowsTotal}
                    </TableCell>
                    <TableCell>{getStatusBadge(imp.status)}</TableCell>
                    <TableCell className="text-right">
                      {imp.qualityScore !== null && imp.qualityScore !== undefined ? (
                        <QualityBadge score={imp.qualityScore} size="sm" />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {formatDuration(imp.durationMs)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
