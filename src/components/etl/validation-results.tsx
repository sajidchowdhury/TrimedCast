'use client';

import { useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useETLStore, type ValidationResultClient } from '@/lib/etl/store';
import { type ValidationError } from '@/lib/etl/import-types';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface ValidationResultsProps {
  onProceed: () => void;
}

export function ValidationResults({ onProceed }: ValidationResultsProps) {
  const { validationResult, isLoading } = useETLStore();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showAllErrors, setShowAllErrors] = useState(false);

  if (!validationResult) return null;

  const { stats, errors, errorSummary } = validationResult;
  const bySeverity = errorSummary?.bySeverity || {};
  const byField = errorSummary?.byField || [];

  const filteredErrors = errors.filter((e) => {
    if (severityFilter === 'all') return true;
    return e.severity === severityFilter;
  });

  const displayedErrors = showAllErrors ? filteredErrors : filteredErrors.slice(0, 25);

  const severityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const severityBadge = (severity: string) => {
    switch (severity) {
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
      case 'warning':
        return <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-100">Warning</Badge>;
      case 'info':
        return <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">Info</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-1">Total Rows</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.valid}</div>
            <div className="text-xs text-gray-500 mt-1">Valid Rows</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
            <div className="text-xs text-gray-500 mt-1">Invalid Rows</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.warnings}</div>
            <div className="text-xs text-gray-500 mt-1">Warnings</div>
          </CardContent>
        </Card>
      </div>

      {/* Error Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Severity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">By Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(['error', 'warning', 'info'] as const).map((sev) => {
                const count = bySeverity[sev] || 0;
                const width = stats.total > 0 ? Math.min((count / stats.total) * 100, 100) : 0;
                return (
                  <div key={sev} className="flex items-center gap-3">
                    {severityIcon(sev)}
                    <span className="text-sm capitalize w-16">{sev}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          sev === 'error' ? 'bg-red-500' : sev === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.max(width, count > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* By Field */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Top Fields with Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byField.slice(0, 5).map(([field, count]) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="text-sm font-mono w-28 truncate" title={field}>{field}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-400 rounded-full"
                      style={{ width: `${Math.min((count / (byField[0]?.[1] || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              ))}
              {byField.length === 0 && (
                <p className="text-sm text-gray-400">No field-level issues</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Validation Issues ({filteredErrors.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              {['all', 'error', 'warning', 'info'].map((sev) => (
                <Button
                  key={sev}
                  variant={severityFilter === sev ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSeverityFilter(sev)}
                >
                  {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredErrors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm">No issues found for this filter</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Row</TableHead>
                    <TableHead className="w-[120px]">Field</TableHead>
                    <TableHead className="w-[100px]">Severity</TableHead>
                    <TableHead className="w-[120px]">Value</TableHead>
                    <TableHead>Error Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedErrors.map((error, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-mono">{error.row}</TableCell>
                      <TableCell className="text-xs font-mono">{error.field}</TableCell>
                      <TableCell>{severityBadge(error.severity)}</TableCell>
                      <TableCell className="text-xs font-mono max-w-[120px] truncate">
                        {error.value !== null && error.value !== undefined
                          ? String(error.value).substring(0, 20)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{error.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredErrors.length > 25 && (
                <div className="text-center pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllErrors(!showAllErrors)}
                  >
                    {showAllErrors ? (
                      <>
                        Show Less <ChevronUp className="h-4 w-4 ml-1" />
                      </>
                    ) : (
                      <>
                        Show All ({filteredErrors.length}) <ChevronDown className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Proceed Button */}
      <div className="flex justify-end">
        <Button onClick={onProceed} disabled={isLoading} size="lg">
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4 mr-2" />
          )}
          Proceed to Harmonize
        </Button>
      </div>
    </div>
  );
}
