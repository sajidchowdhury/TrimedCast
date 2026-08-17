'use client';

// ============================================
// TrimedCast — Import History
// Session 22: Table of past imports
// ============================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type ImportRecord,
  type ImportType,
  type ImportStatus,
  IMPORT_TYPE_CONFIG,
  STATUS_CONFIG,
} from './types';
import {
  FileSpreadsheet,
  RefreshCw,
  Inbox,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Loader2,
  TrendingUp,
  Package,
  Warehouse,
  ShoppingCart,
  Truck,
  Tag,
  Bike,
} from 'lucide-react';

const TYPE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  Package,
  Warehouse,
  ShoppingCart,
  Truck,
  Tag,
  Bike,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatDuration(start: string, end?: string | null): string {
  if (!end) return '—';
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  } catch {
    return '—';
  }
}

function getQualityBadge(score: number) {
  if (score >= 80) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">
        {score}%
      </Badge>
    );
  }
  if (score >= 60) {
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">
        {score}%
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
      {score}%
    </Badge>
  );
}

function getStatusBadge(status: ImportStatus) {
  const config = STATUS_CONFIG[status];
  if (!config) return <Badge variant="outline" className="text-xs">{status}</Badge>;

  const colorMap: Record<string, string> = {
    sky: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
    violet: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
    amber: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
    emerald: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    red: 'bg-red-100 text-red-700 hover:bg-red-100',
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  };

  return (
    <Badge className={`text-xs ${colorMap[config.color] || ''}`}>
      {config.label}
    </Badge>
  );
}

interface ImportHistoryProps {
  imports: ImportRecord[];
  typeFilter: ImportType | 'all';
  searchQuery: string;
  onTypeFilterChange: (filter: ImportType | 'all') => void;
  onSearchQueryChange: (query: string) => void;
  onRefresh: () => void;
  onSelectImport: (record: ImportRecord) => void;
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 10;

export function ImportHistory({
  imports,
  typeFilter,
  searchQuery,
  onTypeFilterChange,
  onSearchQueryChange,
  onRefresh,
  onSelectImport,
  isLoading = false,
}: ImportHistoryProps) {
  const [page, setPage] = useState(1);

  // Filter imports
  let filtered = imports;
  if (typeFilter !== 'all') {
    filtered = filtered.filter((imp) => imp.importType === typeFilter);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (imp) =>
        imp.fileName.toLowerCase().includes(q) ||
        imp.importType.toLowerCase().includes(q)
    );
  }

  // Sort by date desc
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-gray-500" />
            Import History
            <Badge variant="outline" className="text-xs ml-1">
              {filtered.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => {
                  onSearchQueryChange(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs pl-8"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(val) => {
                onTypeFilterChange(val as ImportType | 'all');
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(IMPORT_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading} className="h-8">
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No imports found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload a file to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead className="text-center">Quality</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((imp) => {
                    const typeConfig = IMPORT_TYPE_CONFIG[imp.importType];
                    const IconComp = typeConfig ? TYPE_ICON_MAP[typeConfig.icon] : null;

                    return (
                      <TableRow
                        key={imp.id}
                        className="cursor-pointer hover:bg-gray-50/80"
                        onClick={() => onSelectImport(imp)}
                      >
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDate(imp.createdAt)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            {IconComp && <IconComp className="h-3.5 w-3.5 text-gray-400" />}
                            <span>{typeConfig?.label || imp.importType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono max-w-[180px] truncate" title={imp.fileName}>
                          {imp.fileName}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">
                          {imp.totalRows.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {imp.qualityScore > 0
                            ? getQualityBadge(imp.qualityScore)
                            : <span className="text-xs text-gray-400">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(imp.status)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">
                          {formatDuration(imp.createdAt, imp.completedAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, sorted.length)} of {sorted.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </Button>
                  <span className="text-xs text-gray-600 px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
