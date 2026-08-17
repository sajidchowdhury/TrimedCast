'use client';

// ============================================
// TrimedCast — Validation Results
// Session 22: Validation output display
// ============================================

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
import { type ValidationIssue } from './types';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Wrench,
} from 'lucide-react';

interface ValidationResultsProps {
  issues: ValidationIssue[];
  totalRows: number;
  validRows: number;
  qualityScore: number;
  onProceedAnyway: () => void;
  onFixIssues: () => void;
  isLoading?: boolean;
}

export function ValidationResults({
  issues,
  totalRows,
  validRows,
  qualityScore,
  onProceedAnyway,
  onFixIssues,
  isLoading = false,
}: ValidationResultsProps) {
  const invalidRows = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const errorCount = issues.filter((i) => i.severity === 'error').length;

  // Quality score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-700', bg: 'bg-emerald-500', ring: 'border-emerald-300', fill: 'stroke-emerald-500' };
    if (score >= 60) return { text: 'text-amber-700', bg: 'bg-amber-500', ring: 'border-amber-300', fill: 'stroke-amber-500' };
    return { text: 'text-red-700', bg: 'bg-red-500', ring: 'border-red-300', fill: 'stroke-red-500' };
  };

  const scoreColors = getScoreColor(qualityScore);
  const circumference = 2 * Math.PI * 40;
  const scoreOffset = circumference - (qualityScore / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-gray-700">{totalRows.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">Total Rows</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-emerald-600">{validRows.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">Valid Rows</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-red-600">{invalidRows}</div>
            <div className="text-xs text-gray-500 mt-1">Errors</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
            <div className="text-xs text-gray-500 mt-1">Warnings</div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Score + Issues Table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quality score */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-6">
            {/* Circular progress */}
            <div className="relative w-28 h-28 mb-3">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-gray-200"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className={scoreColors.fill}
                  strokeDasharray={circumference}
                  strokeDashoffset={scoreOffset}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-bold ${scoreColors.text}`}>{Math.round(qualityScore)}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              {qualityScore >= 80
                ? 'Good data quality'
                : qualityScore >= 60
                ? 'Acceptable with minor issues'
                : 'Poor quality — review required'}
            </p>
            <div className="mt-3 space-y-1.5 text-xs w-full">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-3 w-3" /> Errors
                </span>
                <span className="font-medium">{errorCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" /> Warnings
                </span>
                <span className="font-medium">{warningCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issues table */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Validation Issues
              <Badge variant="outline" className="text-xs ml-1">
                {issues.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {issues.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm text-gray-500">No issues found!</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Row</TableHead>
                      <TableHead className="w-[90px]">Column</TableHead>
                      <TableHead className="w-[90px]">Value</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead className="w-[70px]">Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issues.map((issue, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">{issue.row}</TableCell>
                        <TableCell className="text-xs font-mono">{issue.column}</TableCell>
                        <TableCell className="text-xs font-mono max-w-[80px] truncate">
                          {issue.value || '—'}
                        </TableCell>
                        <TableCell className="text-xs">{issue.issue}</TableCell>
                        <TableCell>
                          {issue.severity === 'error' ? (
                            <Badge variant="destructive" className="text-[10px] px-1.5">
                              Error
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] px-1.5 bg-amber-100 text-amber-700 hover:bg-amber-100">
                              Warning
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <Button variant="outline" onClick={onFixIssues} disabled={errorCount === 0}>
          <Wrench className="h-4 w-4 mr-2" />
          Fix Issues
        </Button>
        <Button onClick={onProceedAnyway} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4 mr-2" />
          )}
          Proceed Anyway
        </Button>
      </div>
    </div>
  );
}
