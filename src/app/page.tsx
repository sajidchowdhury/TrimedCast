'use client';

import { useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useETLStore, type ValidationResultClient, type HarmonizationResultClient, type InsertionResultClient } from '@/lib/etl/store';
import { IMPORT_TYPE_SCHEMAS, type ImportType, type QualityStats } from '@/lib/etl/import-types';
import { calculateQualityScore } from '@/lib/etl/quality-score';
import { UploadZone } from '@/components/etl/upload-zone';
import { ColumnMapper } from '@/components/etl/column-mapper';
import { ValidationResults } from '@/components/etl/validation-results';
import { HarmonizationLog } from '@/components/etl/harmonization-log';
import { QualityBadge } from '@/components/etl/quality-badge';
import { ImportProgress } from '@/components/etl/import-progress';
import { ImportHistory } from '@/components/etl/import-history';
import {
  Loader2,
  AlertCircle,
  RotateCcw,
  Database,
  CheckCircle2,
  FileSpreadsheet,
  Bike,
  ArrowRight,
  History,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Step content components
// ============================================

function UploadStep() {
  return <UploadZone />;
}

function MapStep() {
  const { setStep, currentStep } = useETLStore();

  const handleProceed = useCallback(() => {
    setStep(2); // Move to validate step
  }, [setStep]);

  return <ColumnMapper onProceed={handleProceed} />;
}

function ValidateStep() {
  const { currentImportId, setLoading, setError, setValidationResult, setStep, isLoading } = useETLStore();

  const handleProceed = useCallback(() => {
    setStep(3); // Move to harmonize step
  }, [setStep]);

  // Run validation on mount if not yet run
  useEffect(() => {
    const runValidation = async () => {
      if (!currentImportId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/imports/${currentImportId}/validate`, {
          method: 'POST',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Validation failed');
        }
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Validation failed');
        }
        setValidationResult(json.data as ValidationResultClient);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Validation failed');
      } finally {
        setLoading(false);
      }
    };
    runValidation();
  }, [currentImportId, setLoading, setError, setValidationResult]);

  return (
    <div>
      {isLoading && (
        <Card className="mb-4">
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto text-blue-500 animate-spin mb-3" />
            <p className="text-sm text-gray-600">Running 3-phase validation...</p>
            <p className="text-xs text-gray-400 mt-1">Schema → Data → Business Rules</p>
          </CardContent>
        </Card>
      )}
      <ValidationResults onProceed={handleProceed} />
    </div>
  );
}

function HarmonizeStep() {
  const {
    currentImportId,
    setLoading,
    setError,
    setHarmonizationResult,
    setStep,
    harmonizationResult,
    isLoading,
  } = useETLStore();

  const handleProceed = useCallback(() => {
    setStep(4); // Move to insert step
  }, [setStep]);

  // Run harmonization on mount if not yet run
  useEffect(() => {
    if (harmonizationResult) return; // Already run
    const runHarmonization = async () => {
      if (!currentImportId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/imports/${currentImportId}/harmonize`, {
          method: 'POST',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Harmonization failed');
        }
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Harmonization failed');
        }
        setHarmonizationResult(json.data as HarmonizationResultClient);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Harmonization failed');
      } finally {
        setLoading(false);
      }
    };
    runHarmonization();
  }, [currentImportId, harmonizationResult, setLoading, setError, setHarmonizationResult]);

  if (isLoading && !harmonizationResult) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto text-blue-500 animate-spin mb-3" />
          <p className="text-sm text-gray-600">Running 6-step harmonization...</p>
          <p className="text-xs text-gray-400 mt-1">
            Trim → Dates → Categories → Units → Dedup → Enrich
          </p>
        </CardContent>
      </Card>
    );
  }

  return <HarmonizationLog onProceed={handleProceed} />;
}

function InsertStep() {
  const {
    currentImportId,
    setLoading,
    setError,
    setInsertionResult,
    setStep,
    insertionResult,
    uploadResult,
    mappings,
    importType,
    isLoading,
  } = useETLStore();

  // Run insertion on mount if not yet run
  useEffect(() => {
    if (insertionResult) return; // Already run
    const runInsert = async () => {
      if (!currentImportId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/imports/${currentImportId}/insert`, {
          method: 'POST',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Insertion failed');
        }
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Insertion failed');
        }
        setInsertionResult(json.data as InsertionResultClient);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Insertion failed');
      } finally {
        setLoading(false);
      }
    };
    runInsert();
  }, [currentImportId, insertionResult, setLoading, setError, setInsertionResult]);

  if (isLoading && !insertionResult) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto text-blue-500 animate-spin mb-3" />
          <p className="text-sm text-gray-600">Inserting data into database...</p>
          <p className="text-xs text-gray-400 mt-1">Batch processing rows</p>
        </CardContent>
      </Card>
    );
  }

  if (!insertionResult) return null;

  // Calculate quality stats for breakdown
  const schema = importType ? IMPORT_TYPE_SCHEMAS[importType as ImportType] : null;
  const requiredTotal = schema?.requiredFields.length || 0;
  const requiredMapped = mappings.filter(
    (m) => m.targetField && m.confidence > 0 && schema?.requiredFields.some((rf) => rf.field === m.targetField)
  ).length;

  const qualityStats: QualityStats = {
    rowsTotal: uploadResult?.rowsTotal || 0,
    rowsValid: uploadResult?.rowsTotal || insertionResult.inserted,
    rowsInserted: insertionResult.inserted,
    rowsDuplicate: 0,
    requiredMapped,
    requiredTotal,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Success Header */}
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-800">Import Complete!</h2>
              <p className="text-sm text-emerald-600">
                Your data has been successfully processed and inserted
              </p>
            </div>
          </div>

          {/* Quality Score */}
          <QualityBadge
            score={insertionResult.qualityScore}
            size="lg"
            showBreakdown={true}
            stats={qualityStats}
          />
        </CardContent>
      </Card>

      {/* Insertion Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Database className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <div className="text-2xl font-bold text-gray-700">{insertionResult.inserted}</div>
            <div className="text-xs text-gray-500">Rows Inserted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <XCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <div className="text-2xl font-bold text-gray-700">{insertionResult.skipped}</div>
            <div className="text-xs text-gray-500">Rows Skipped</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <FileSpreadsheet className="h-5 w-5 mx-auto text-gray-500 mb-1" />
            <div className="text-2xl font-bold text-gray-700">
              {insertionResult.createdMasterData?.length || 0}
            </div>
            <div className="text-xs text-gray-500">Master Data Created</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Loader2 className="h-5 w-5 mx-auto text-gray-400 mb-1" style={{ animation: 'none' }} />
            <div className="text-2xl font-bold text-gray-700">
              {insertionResult.durationMs !== null
                ? insertionResult.durationMs < 1000
                  ? `${insertionResult.durationMs}ms`
                  : `${(insertionResult.durationMs / 1000).toFixed(1)}s`
                : '—'}
            </div>
            <div className="text-xs text-gray-500">Duration</div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-created master data */}
      {insertionResult.createdMasterData && insertionResult.createdMasterData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Auto-Created Master Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-gray-500 space-y-1">
              {insertionResult.createdMasterData.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs h-5">New</Badge>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Insertion errors */}
      {insertionResult.errors && insertionResult.errors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Insertion Errors ({insertionResult.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-red-500 space-y-1">
              {insertionResult.errors.slice(0, 10).map((err, i) => (
                <li key={i}>Row {err.row}: {err.error}</li>
              ))}
              {insertionResult.errors.length > 10 && (
                <li className="text-gray-400">
                  ...and {insertionResult.errors.length - 10} more
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function Home() {
  const {
    currentStep,
    isLoading,
    error,
    setError,
    reset,
    seedDemo,
    fetchImports,
    isSeeded,
    currentImportId,
    setStep,
  } = useETLStore();

  // Seed on mount
  useEffect(() => {
    if (!isSeeded) {
      seedDemo();
    }
    fetchImports();
  }, [isSeeded]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <UploadStep />;
      case 1:
        return <MapStep />;
      case 2:
        return <ValidateStep />;
      case 3:
        return <HarmonizeStep />;
      case 4:
        return <InsertStep />;
      case 5:
        return <InsertStep />; // Same as 4, showing completion
      default:
        return <UploadStep />;
    }
  };

  const stepLabels = ['Upload File', 'Map Columns', 'Validate Data', 'Harmonize', 'Insert Data', 'Complete'];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
                <Bike className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">TrimedCast</h1>
                <p className="text-xs text-slate-400">Excel Import Pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentStep > 0 && currentStep < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white border-slate-600 hover:bg-slate-700 hover:text-white"
                  onClick={reset}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  New Import
                </Button>
              )}
              <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs">
                Bangladesh Motorcycle Parts Forecasting
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                className="ml-4 h-7 text-xs"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Stepper (visible after step 0) */}
        {currentStep > 0 && (
          <ImportProgress>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </ImportProgress>
        )}

        {/* Step 0: Upload (full width, no stepper) */}
        {currentStep === 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Upload zone (2 cols) */}
                <div className="lg:col-span-2">
                  <UploadStep />
                </div>

                {/* Right: Quick info sidebar (1 col) */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        How It Works
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="text-xs text-gray-600 space-y-3">
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">1</span>
                          <span>Select import type and upload your Excel file (.xlsx, .xls, .csv)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold">2</span>
                          <span>Review auto-mapped columns. Fuzzy matching uses Levenshtein distance + BD aliases</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-bold">3</span>
                          <span>3-phase validation: Schema, Data quality, Business rules</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-[10px] font-bold">4</span>
                          <span>6-step harmonization: Trim, Dates, Categories, Units, Dedup, Enrich</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">5</span>
                          <span>Batch insert with quality scoring (0-100)</span>
                        </li>
                      </ol>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-gray-500" />
                        Supported Data Types
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.values(IMPORT_TYPE_SCHEMAS).map((schema) => (
                          <div key={schema.type} className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                            <span className="font-medium">{schema.label}</span>
                            <span className="text-gray-400">
                              ({schema.requiredFields.length} required)
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Import History */}
        <div>
          <ImportHistory />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-xs text-gray-500 text-center">
            TrimedCast &copy; 2024 | Seasonal Demand Forecasting for BD Motorcycle Parts
          </p>
        </div>
      </footer>
    </div>
  );
}
