'use client';

// ============================================
// TrimedCast - Data Import Wizard (7-Step)
// Step 0: Select Import Type
// Step 1: Upload File
// Step 2: Map Columns
// Step 3: Validate Data
// Step 4: Harmonize
// Step 5: Insert to Database
// Step 6: Complete
// ============================================

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  useETLStore,
  type UploadResult,
  type ValidationResultClient,
  type HarmonizationResultClient,
  type InsertionResultClient,
} from '@/lib/etl/store';
import {
  IMPORT_TYPE_SCHEMAS,
  type ImportType,
  type ImportTypeSchema,
  type ColumnMapping,
  type ValidationError,
  type QualityStats,
} from '@/lib/etl/import-types';
import { calculateQualityScore } from '@/lib/etl/quality-score';
import { ColumnMapper } from '@/components/etl/column-mapper';
import { ValidationResults } from '@/components/etl/validation-results';
import { HarmonizationLog } from '@/components/etl/harmonization-log';
import { QualityBadge } from '@/components/etl/quality-badge';
import { ImportHistory } from '@/components/etl/import-history';
import {
  Receipt,
  ShoppingCart,
  Package,
  Box,
  Truck,
  Megaphone,
  Bike,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  XCircle,
  Clock,
  Database,
  Zap,
  RotateCcw,
  Circle,
  ArrowRightLeft,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  FileDown,
  History,
  Layers,
  ListChecks,
} from 'lucide-react';

// ---- Constants ----

const WIZARD_STEPS = [
  { label: 'Select Type', shortLabel: 'Type', icon: Zap },
  { label: 'Upload File', shortLabel: 'Upload', icon: Upload },
  { label: 'Map Columns', shortLabel: 'Map', icon: ArrowRightLeft },
  { label: 'Validate Data', shortLabel: 'Validate', icon: ShieldCheck },
  { label: 'Harmonize', shortLabel: 'Harmonize', icon: Sparkles },
  { label: 'Insert Data', shortLabel: 'Insert', icon: Database },
  { label: 'Complete', shortLabel: 'Done', icon: CheckCircle2 },
] as const;

const IMPORT_TYPE_ICONS: Record<string, React.ElementType> = {
  sales_history: Receipt,
  purchase_history: ShoppingCart,
  inventory: Package,
  products: Box,
  suppliers: Truck,
  promo_events: Megaphone,
  motorcycle_models: Bike,
};

const COLOR_CLASSES: Record<string, { text: string; bg: string; border: string; ring: string }> = {
  emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-700', ring: 'ring-emerald-500' },
  blue: { text: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-700', ring: 'ring-blue-500' },
  violet: { text: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-300 dark:border-violet-700', ring: 'ring-violet-500' },
  amber: { text: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-700', ring: 'ring-amber-500' },
  rose: { text: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-300 dark:border-rose-700', ring: 'ring-rose-500' },
  cyan: { text: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-300 dark:border-cyan-700', ring: 'ring-cyan-500' },
  pink: { text: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-950/30', border: 'border-pink-300 dark:border-pink-700', ring: 'ring-pink-500' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '--';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// ---- Step Progress Bar ----

function StepProgressBar({
  currentStep,
  completedSteps,
}: {
  currentStep: number;
  completedSteps: Set<number>;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start min-w-[560px] sm:min-w-0 px-2 py-4">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStep;
          const isFuture = index > currentStep && !isCompleted;
          const Icon = step.icon;

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center relative"
            >
              {/* Connecting line to next step */}
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className="absolute top-[18px] left-[calc(50%+18px)] right-[calc(-50%+18px)] h-0.5 transition-colors duration-300"
                  style={{
                    backgroundColor: isCompleted ? '#22c55e' : '#e5e7eb',
                  }}
                />
              )}

              {/* Step circle */}
              <div
                className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-white border-sky-500 text-sky-500 shadow-md shadow-sky-200/50 dark:shadow-sky-500/20'
                    : 'bg-white border-gray-300 text-gray-400 dark:bg-gray-800 dark:border-gray-600'
                } ${isCurrent ? 'animate-none' : ''}`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4.5 w-4.5" />
                ) : isCurrent ? (
                  <Icon className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                {/* Pulsing ring for current step */}
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full border-2 border-sky-400 animate-ping opacity-30" />
                )}
              </div>

              {/* Step label */}
              <span
                className={`mt-1.5 text-[11px] font-medium leading-tight text-center transition-colors duration-200 hidden sm:block ${
                  isCompleted
                    ? 'text-emerald-600'
                    : isCurrent
                    ? 'text-sky-600'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Step 0: Select Import Type ----

function StepSelectType({
  selectedType,
  onSelect,
}: {
  selectedType: ImportType | '';
  onSelect: (type: ImportType) => void;
}) {
  const importTypes = Object.values(IMPORT_TYPE_SCHEMAS);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
          Choose Import Type
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Select the type of data you want to import into TrimedCast
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {importTypes.map((schema) => {
          const isSelected = selectedType === schema.type;
          const colors = COLOR_CLASSES[schema.color] || COLOR_CLASSES.emerald;
          const TypeIcon = IMPORT_TYPE_ICONS[schema.type] || Package;
          const requiredCount = schema.requiredFields.length;
          const optionalCount = schema.optionalFields.length;

          return (
            <button
              key={schema.type}
              onClick={() => onSelect(schema.type as ImportType)}
              className={`group relative p-4 rounded-xl border-2 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isSelected
                  ? `${colors.bg} ${colors.border} shadow-sm`
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className={`h-5 w-5 ${colors.text}`} />
                </div>
              )}

              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isSelected
                      ? `${colors.bg} ${colors.text}`
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}
                >
                  <TypeIcon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                    {schema.label}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                {schema.description}
              </p>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                >
                  {requiredCount} required
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 text-gray-400"
                >
                  {optionalCount} optional
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Step 1: Upload File ----

function StepUploadFile({
  importType,
  onUploadComplete,
}: {
  importType: ImportType;
  onUploadComplete: () => void;
}) {
  const {
    setUploadResult,
    setLoading,
    setError,
    isLoading,
    error,
    tenantId,
    uploadResult,
  } = useETLStore();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schema = IMPORT_TYPE_SCHEMAS[importType];
  const TypeIcon = IMPORT_TYPE_ICONS[importType] || Package;
  const colors = COLOR_CLASSES[schema.color] || COLOR_CLASSES.emerald;

  const validateFile = (file: File): string | null => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return 'Invalid file type. Supported formats: .xlsx, .xls, .csv';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File too large. Maximum size is 10 MB';
    }
    return null;
  };

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setLoading(true);
      setError(null);
      setSelectedFile(file);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('importType', importType);
        formData.append('tenantId', tenantId);

        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + Math.random() * 15, 90));
        }, 200);

        const res = await fetch('/api/imports', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Upload failed (${res.status})`);
        }

        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Upload failed');
        }

        await new Promise((r) => setTimeout(r, 300));

        setUploadResult(json.data as UploadResult);
        onUploadComplete();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        setSelectedFile(null);
        setUploadProgress(0);
      } finally {
        setLoading(false);
      }
    },
    [importType, tenantId, setUploadResult, setLoading, setError, onUploadComplete]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleUpload(files[0]);
      }
    },
    [handleUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleUpload(files[0]);
      }
    },
    [handleUpload]
  );

  const isUploaded = !!uploadResult;

  return (
    <div className="space-y-4">
      {/* Selected import type badge */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`${colors.text} ${colors.bg} ${colors.border} text-sm px-3 py-1`}
        >
          <TypeIcon className="h-3.5 w-3.5 mr-1.5" />
          {schema.label}
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Drop zone */}
      <Card>
        <CardContent className="pt-6">
          {isUploaded ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  File uploaded successfully
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {uploadResult.fileName} &middot; {formatFileSize(uploadResult.fileSize)} &middot;{' '}
                  {uploadResult.rowsTotal} rows
                </p>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isLoading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-900/20 scale-[1.01]'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
              } ${isLoading ? 'pointer-events-none' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInput}
                className="hidden"
                disabled={isLoading}
              />

              {isLoading ? (
                <div className="space-y-4">
                  <Loader2 className="h-10 w-10 mx-auto text-sky-500 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Uploading {selectedFile?.name}...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(selectedFile?.size || 0)}
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1.5">
                      {Math.round(uploadProgress)}%
                    </p>
                  </div>
                </div>
              ) : isDragging ? (
                <div className="space-y-3">
                  <Upload className="h-10 w-10 mx-auto text-sky-500 animate-bounce" />
                  <p className="text-sm font-medium text-sky-600">Drop your file here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <FileSpreadsheet className="h-7 w-7 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Drag and drop your file here
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      or click to browse &middot; Supports .xlsx, .xls, .csv &middot; Max 10 MB
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-1">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Step 5: Insert to Database ----

function StepInsert({
  importId,
  onInsertComplete,
}: {
  importId: string;
  onInsertComplete: () => void;
}) {
  const { setInsertionResult, isLoading, setLoading, setError } = useETLStore();
  const [insertProgress, setInsertProgress] = useState(0);
  const [insertStarted, setInsertStarted] = useState(false);
  const [rowsInserted, setRowsInserted] = useState(0);
  const [rowsSkipped, setRowsSkipped] = useState(0);
  const [errors, setErrors] = useState(0);
  const hasRun = useRef(false);

  const startInsert = useCallback(async () => {
    if (hasRun.current) return;
    hasRun.current = true;
    setInsertStarted(true);
    setLoading(true);
    setError(null);
    setInsertProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setInsertProgress((prev) => Math.min(prev + Math.random() * 8, 85));
      }, 300);

      const res = await fetch(`/api/imports/${importId}/insert`, {
        method: 'POST',
      });

      clearInterval(progressInterval);
      setInsertProgress(95);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Insertion failed (${res.status})`);
      }

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Insertion failed');
      }

      const data = json.data as InsertionResultClient;
      setRowsInserted(data.inserted);
      setRowsSkipped(data.skipped);
      setErrors(data.errors?.length || 0);
      setInsertProgress(100);

      await new Promise((r) => setTimeout(r, 400));

      setInsertionResult(data);
      onInsertComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Insertion failed');
      hasRun.current = false;
      setInsertStarted(false);
    } finally {
      setLoading(false);
    }
  }, [importId, setInsertionResult, setLoading, setError, onInsertComplete]);

  useEffect(() => {
    startInsert();
  }, [startInsert]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="space-y-4 max-w-md mx-auto">
            <div className="text-center">
              {insertProgress < 100 ? (
                <Loader2 className="h-10 w-10 mx-auto text-sky-500 animate-spin mb-3" />
              ) : (
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
              )}
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {insertProgress < 100 ? 'Inserting data into database...' : 'Insertion complete!'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {insertProgress < 100
                  ? 'Please wait while rows are being processed'
                  : 'All rows have been processed'}
              </p>
            </div>

            <Progress value={insertProgress} className="h-3" />
            <p className="text-center text-xs text-gray-500">
              {Math.round(insertProgress)}%
            </p>

            {/* Live stats */}
            {(rowsInserted > 0 || rowsSkipped > 0 || errors > 0) && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-600">{rowsInserted}</div>
                  <div className="text-[10px] text-gray-500">Inserted</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-amber-600">{rowsSkipped}</div>
                  <div className="text-[10px] text-gray-500">Skipped</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{errors}</div>
                  <div className="text-[10px] text-gray-500">Errors</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Step 6: Complete ----

function StepComplete() {
  const { insertionResult, uploadResult, validationResult, harmonizationResult, importType } =
    useETLStore();

  const schema = importType ? IMPORT_TYPE_SCHEMAS[importType as ImportType] : null;

  const stats = useMemo(() => {
    const totalRows = uploadResult?.rowsTotal || 0;
    const inserted = insertionResult?.inserted || 0;
    const skipped = insertionResult?.skipped || 0;
    const errorCount = insertionResult?.errors?.length || 0;
    const qualityScore = insertionResult?.qualityScore || 0;
    const duration = insertionResult?.durationMs || null;

    return { totalRows, inserted, skipped, errorCount, qualityScore, duration };
  }, [uploadResult, insertionResult]);

  const qualityStats: QualityStats | null = useMemo(() => {
    if (!uploadResult || !validationResult || !insertionResult) return null;
    return {
      rowsTotal: uploadResult.rowsTotal,
      rowsValid: validationResult.stats.valid,
      rowsInserted: insertionResult.inserted,
      rowsDuplicate: harmonizationResult?.stats.duplicatesRemoved || 0,
      requiredMapped: schema
        ? schema.requiredFields.filter((f) =>
            validationResult.stats.valid > 0
          ).length
        : 0,
      requiredTotal: schema?.requiredFields.length || 0,
    };
  }, [uploadResult, validationResult, insertionResult, harmonizationResult, schema]);

  return (
    <div className="space-y-4">
      {/* Success header */}
      <div className="text-center py-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3"
        >
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </motion.div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Import Complete
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Your {schema?.label || 'data'} has been imported successfully
        </p>
      </div>

      {/* Quality Score */}
      {stats.qualityScore > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <QualityBadge
              score={stats.qualityScore}
              size="lg"
              showBreakdown={!!qualityStats}
              stats={qualityStats}
            />
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Import Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <SummaryStat
              label="Total Rows"
              value={stats.totalRows}
              icon={Layers}
              color="text-gray-700 dark:text-gray-300"
            />
            <SummaryStat
              label="Inserted"
              value={stats.inserted}
              icon={Database}
              color="text-emerald-600"
            />
            <SummaryStat
              label="Skipped"
              value={stats.skipped}
              icon={ArrowRight}
              color="text-amber-600"
            />
            <SummaryStat
              label="Errors"
              value={stats.errorCount}
              icon={AlertCircle}
              color="text-red-600"
            />
            <SummaryStat
              label="Duration"
              value={formatDuration(stats.duration)}
              icon={Clock}
              color="text-gray-700 dark:text-gray-300"
              isText
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  icon: Icon,
  color,
  isText = false,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  isText?: boolean;
}) {
  return (
    <div className="text-center p-2">
      <Icon className={`h-4 w-4 mx-auto mb-1.5 ${color}`} />
      <div className={`text-lg font-bold ${color}`}>{isText ? value : value.toLocaleString()}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

// ---- Main Wizard Component ----

export function ImportWizard() {
  const store = useETLStore();
  const [wizardStep, setWizardStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const [isStepLoading, setIsStepLoading] = useState(false);

  // Track validation/harmonization loading state
  const [validateRunning, setValidateRunning] = useState(false);
  const [harmonizeRunning, setHarmonizeRunning] = useState(false);

  // Auto-run validation when entering step 3
  useEffect(() => {
    if (wizardStep !== 3 || !store.currentImportId || store.validationResult) return;
    if (validateRunning) return;

    const runValidation = async () => {
      setValidateRunning(true);
      setIsStepLoading(true);
      store.setLoading(true);
      store.setError(null);
      try {
        const res = await fetch(`/api/imports/${store.currentImportId}/validate`, {
          method: 'POST',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Validation failed');
        }
        const json = await res.json();
        if (json.success && json.data) {
          store.setValidationResult(json.data as ValidationResultClient);
        }
      } catch (err) {
        store.setError(err instanceof Error ? err.message : 'Validation failed');
      } finally {
        store.setLoading(false);
        setIsStepLoading(false);
        setValidateRunning(false);
      }
    };
    runValidation();
  }, [wizardStep, store.currentImportId, store.validationResult, validateRunning]);

  // Auto-run harmonization when entering step 4
  useEffect(() => {
    if (wizardStep !== 4 || !store.currentImportId || store.harmonizationResult) return;
    if (harmonizeRunning) return;

    const runHarmonization = async () => {
      setHarmonizeRunning(true);
      setIsStepLoading(true);
      store.setLoading(true);
      store.setError(null);
      try {
        const res = await fetch(`/api/imports/${store.currentImportId}/harmonize`, {
          method: 'POST',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Harmonization failed');
        }
        const json = await res.json();
        if (json.success && json.data) {
          store.setHarmonizationResult(json.data as HarmonizationResultClient);
        }
      } catch (err) {
        store.setError(err instanceof Error ? err.message : 'Harmonization failed');
      } finally {
        store.setLoading(false);
        setIsStepLoading(false);
        setHarmonizeRunning(false);
      }
    };
    runHarmonization();
  }, [wizardStep, store.currentImportId, store.harmonizationResult, harmonizeRunning]);

  const advanceStep = useCallback(
    (step: number) => {
      setDirection(1);
      setCompletedSteps((prev) => new Set([...prev, wizardStep]));
      setWizardStep(step);
      setWarningsAcknowledged(false);
    },
    [wizardStep]
  );

  const goBack = useCallback(() => {
    if (wizardStep <= 0) return;
    setDirection(-1);
    setWizardStep((prev) => prev - 1);
    setWarningsAcknowledged(false);
  }, [wizardStep]);

  const resetWizard = useCallback(() => {
    store.reset();
    setWizardStep(0);
    setCompletedSteps(new Set());
    setDirection(1);
    setWarningsAcknowledged(false);
    setShowCancelDialog(false);
    setValidateRunning(false);
    setHarmonizeRunning(false);
    setIsStepLoading(false);
  }, [store]);

  // Determine if current step is complete (Next should be enabled)
  const isStepComplete = useMemo(() => {
    switch (wizardStep) {
      case 0:
        return store.importType !== '';
      case 1:
        return store.uploadResult !== null;
      case 2: {
        if (!store.uploadResult || !store.importType) return false;
        const schema = IMPORT_TYPE_SCHEMAS[store.importType as ImportType];
        if (!schema) return false;
        const requiredFields = schema.requiredFields.map((f) => f.field);
        const mappedTargets = new Set(
          store.mappings.filter((m) => m.targetField).map((m) => m.targetField)
        );
        return requiredFields.every((f) => mappedTargets.has(f));
      }
      case 3: {
        if (!store.validationResult) return false;
        const hasCriticalErrors = store.validationResult.errors.some(
          (e) => e.severity === 'error'
        );
        if (hasCriticalErrors) return false;
        const hasWarnings = store.validationResult.errors.some(
          (e) => e.severity === 'warning'
        );
        if (hasWarnings) return warningsAcknowledged;
        return true;
      }
      case 4:
        return store.harmonizationResult !== null;
      case 5:
        return store.insertionResult !== null;
      case 6:
        return true;
      default:
        return false;
    }
  }, [wizardStep, store.importType, store.uploadResult, store.mappings, store.validationResult, store.harmonizationResult, store.insertionResult, warningsAcknowledged]);

  // Whether this step has its own proceed button (ColumnMapper, ValidationResults, HarmonizationLog)
  const stepHasOwnProceed = wizardStep === 2;

  // Handle Next button click
  const handleNext = useCallback(() => {
    switch (wizardStep) {
      case 0:
        // Type selected, go to upload
        advanceStep(1);
        break;
      case 1:
        // Upload done, go to map (store already advanced via setUploadResult)
        advanceStep(2);
        break;
      case 3:
        // Validation done (or warnings acknowledged), go to harmonize
        advanceStep(4);
        break;
      case 4:
        // Harmonization done, go to insert
        advanceStep(5);
        break;
      case 5:
        // Insert done, go to complete
        advanceStep(6);
        break;
      default:
        break;
    }
  }, [wizardStep, advanceStep]);

  // Has critical errors in validation
  const hasCriticalErrors = useMemo(() => {
    if (wizardStep !== 3 || !store.validationResult) return false;
    return store.validationResult.errors.some((e) => e.severity === 'error');
  }, [wizardStep, store.validationResult]);

  const hasWarnings = useMemo(() => {
    if (wizardStep !== 3 || !store.validationResult) return false;
    return store.validationResult.errors.some((e) => e.severity === 'warning');
  }, [wizardStep, store.validationResult]);

  // Animation variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
    }),
  };

  // Render step content
  const renderStepContent = () => {
    switch (wizardStep) {
      case 0:
        return (
          <StepSelectType
            selectedType={store.importType}
            onSelect={(type) => store.setImportType(type)}
          />
        );

      case 1:
        return (
          <StepUploadFile
            importType={store.importType as ImportType}
            onUploadComplete={() => {
              // Auto-advance to step 2 after successful upload
              advanceStep(2);
            }}
          />
        );

      case 2:
        return (
          <ColumnMapper
            onProceed={() => {
              advanceStep(3);
            }}
          />
        );

      case 3:
        return (
          <div className="space-y-4">
            {isStepLoading || !store.validationResult ? (
              <Card>
                <CardContent className="pt-6 pb-6">
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto text-sky-500 animate-spin mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Running 3-phase validation...
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Structural, Type, and Business rules
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <ValidationResults
                  onProceed={() => {
                    advanceStep(4);
                  }}
                />
                {/* Warning acknowledgement */}
                {hasCriticalErrors && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Critical Errors Found</AlertTitle>
                    <AlertDescription>
                      Your data has critical errors that must be resolved before proceeding.
                      Please go back and fix the column mapping or upload a corrected file.
                    </AlertDescription>
                  </Alert>
                )}
                {!hasCriticalErrors && hasWarnings && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warnings Detected</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>
                        Your data has warnings that may affect quality. You can proceed, but
                        some rows may be skipped or adjusted during harmonization.
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={warningsAcknowledged}
                          onCheckedChange={(checked) =>
                            setWarningsAcknowledged(checked === true)
                          }
                        />
                        <span className="text-sm">
                          I acknowledge the warnings and want to proceed
                        </span>
                      </label>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {isStepLoading || !store.harmonizationResult ? (
              <Card>
                <CardContent className="pt-6 pb-6">
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto text-sky-500 animate-spin mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Running 6-step harmonization...
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Normalizing, deduplicating, and cleansing data
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <HarmonizationLog
                  onProceed={() => {
                    advanceStep(5);
                  }}
                />
                {/* Quality score preview */}
                {store.harmonizationResult && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Quality Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <QualityBadge
                          score={
                            store.insertionResult?.qualityScore ||
                            (store.harmonizationResult.stats.outputRows > 0
                              ? Math.round(
                                  (store.harmonizationResult.stats.outputRows /
                                    Math.max(
                                      store.harmonizationResult.stats.inputRows,
                                      1
                                    )) *
                                    100
                                )
                              : 0)
                          }
                          size="sm"
                        />
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>
                            <span className="font-medium text-emerald-600">
                              {store.harmonizationResult.stats.duplicatesRemoved}
                            </span>{' '}
                            duplicates removed
                          </p>
                          <p>
                            <span className="font-medium text-amber-600">
                              {store.harmonizationResult.stats.fieldsNormalized}
                            </span>{' '}
                            fields normalized
                          </p>
                          <p>
                            <span className="font-medium text-sky-600">
                              {store.harmonizationResult.stats.categoriesMapped}
                            </span>{' '}
                            categories mapped
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        );

      case 5:
        return (
          <StepInsert
            importId={store.currentImportId!}
            onInsertComplete={() => {
              advanceStep(6);
            }}
          />
        );

      case 6:
        return <StepComplete />;

      default:
        return null;
    }
  };

  const showNextButton =
    (wizardStep === 0 ||
    wizardStep === 3 ||
    wizardStep === 4) &&
    wizardStep < 6;

  const showBackButton = wizardStep > 0 && wizardStep < 6;

  return (
    <div className="space-y-0">
      {/* Wizard Card */}
      <Card className="overflow-hidden">
        {/* Step Progress Bar */}
        <div className="border-b bg-gray-50/50 dark:bg-gray-900/30 px-4">
          <StepProgressBar
            currentStep={wizardStep}
            completedSteps={completedSteps}
          />
        </div>

        {/* Error display */}
        {store.error && wizardStep !== 1 && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{store.error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step Content */}
        <CardContent className="px-6 py-5 min-h-[320px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={wizardStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </CardContent>

        {/* Navigation Footer */}
        <div className="border-t bg-gray-50/50 dark:bg-gray-900/30 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBackButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={goBack}
                disabled={store.isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            )}
            {wizardStep < 6 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                className="text-gray-500 hover:text-red-600"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Step indicator */}
            <span className="text-xs text-gray-400 mr-2 hidden sm:inline-block">
              Step {wizardStep + 1} of {WIZARD_STEPS.length}
            </span>

            {showNextButton && (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={!isStepComplete || store.isLoading || isStepLoading}
              >
                {isStepLoading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1.5" />
                )}
                Next
              </Button>
            )}

            {wizardStep === 6 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetWizard}
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Import Another
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href="#import-history">
                    <History className="h-4 w-4 mr-1.5" />
                    View History
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Import History Section */}
      <div id="import-history" className="mt-6 scroll-mt-4">
        <ImportHistory />
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Import?</DialogTitle>
            <DialogDescription>
              This will reset the import wizard and discard all progress. Any data already
              inserted into the database will not be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelDialog(false)}
            >
              Continue Import
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={resetWizard}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Cancel Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
