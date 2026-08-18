'use client';

// ============================================
// TrimedCast — Import Progress
// Session 22: Processing progress display
// ============================================

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { type ImportStatus, STATUS_CONFIG } from './types';
import {
  Upload,
  ArrowRightLeft,
  ShieldCheck,
  Sparkles,
  Database,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  Clock,
} from 'lucide-react';

const STEPS = [
  { key: 'upload' as const, label: 'Upload', icon: Upload },
  { key: 'map' as const, label: 'Map', icon: ArrowRightLeft },
  { key: 'validate' as const, label: 'Validate', icon: ShieldCheck },
  { key: 'harmonize' as const, label: 'Harmonize', icon: Sparkles },
  { key: 'process' as const, label: 'Process', icon: Database },
  { key: 'complete' as const, label: 'Complete', icon: CheckCircle2 },
];

interface ImportProgressProps {
  currentStep: number; // 0-5
  status?: ImportStatus;
  progressPercent?: number;
  processingRow?: number;
  totalRows?: number;
  startTime?: number;
}

export function ImportProgress({
  currentStep,
  status,
  progressPercent = 0,
  processingRow = 0,
  totalRows = 0,
  startTime,
}: ImportProgressProps) {
  const overallProgress = currentStep >= 5 ? 100 : ((currentStep) / 5) * 100;

  // Time elapsed
  const elapsed = startTime ? Date.now() - startTime : 0;
  const elapsedStr = elapsed > 0
    ? elapsed < 60000
      ? `${(elapsed / 1000).toFixed(0)}s`
      : `${(elapsed / 60000).toFixed(1)}m`
    : '0s';

  const statusConfig = status ? STATUS_CONFIG[status] : null;
  const isFailed = status === 'failed';

  return (
    <div className="space-y-4">
      {/* 6-step stepper */}
      <Card>
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center justify-between relative">
            {/* Background line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
            {/* Progress line */}
            <div
              className={`absolute top-5 left-0 h-0.5 transition-all duration-500 ${
                isFailed ? 'bg-red-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${overallProgress}%` }}
            />

            {STEPS.map((step, index) => {
              const isDone = index < currentStep && !isFailed;
              const isActive = index === currentStep && !isFailed;
              const isFailedStep = isFailed && index === currentStep;
              const isPending = index > currentStep;

              const Icon = step.icon;

              return (
                <div key={index} className="relative flex flex-col items-center z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isActive
                        ? 'bg-white border-emerald-500 text-emerald-500 shadow-md shadow-emerald-200'
                        : isFailedStep
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : isFailedStep ? (
                      <XCircle className="h-5 w-5" />
                    ) : isActive ? (
                      <Icon className="h-5 w-5 animate-pulse" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1.5 font-medium ${
                      isDone
                        ? 'text-emerald-600'
                        : isActive
                        ? 'text-emerald-500'
                        : isFailedStep
                        ? 'text-red-500'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Overall progress bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">
                {isFailed ? 'Import Failed' : statusConfig?.label || 'Overall Progress'}
              </span>
              <span className="text-xs font-medium text-gray-700">
                {Math.round(isFailed ? overallProgress : Math.max(overallProgress, progressPercent))}%
              </span>
            </div>
            <Progress
              value={Math.max(overallProgress, progressPercent)}
              className="h-2"
            />
          </div>

          {/* Current step description */}
          {isActive && (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                {currentStep === 0 && 'Uploading your data file...'}
                {currentStep === 1 && 'Auto-mapping columns to target fields...'}
                {currentStep === 2 && 'Validating data quality and integrity...'}
                {currentStep === 3 && 'Harmonizing and normalizing data...'}
                {currentStep === 4 && 'Processing and inserting rows...'}
                {currentStep === 5 && 'Import completed successfully!'}
              </p>
              <div className="flex items-center gap-3">
                {totalRows > 0 && processingRow > 0 && (
                  <Badge variant="outline" className="text-xs font-mono">
                    Row {processingRow.toLocaleString()} of {totalRows.toLocaleString()}
                  </Badge>
                )}
                {startTime > 0 && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {elapsedStr}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Failed state */}
          {isFailed && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700 font-medium">Import failed</p>
              <p className="text-xs text-red-600 mt-1">
                Please check the error details and try again.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
