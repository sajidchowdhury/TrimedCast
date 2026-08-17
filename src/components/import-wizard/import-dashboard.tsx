'use client';

// ============================================
// TrimedCast — Import Dashboard
// Session 22: Main orchestrating component
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useImportStore } from '@/stores/import-store';
import {
  type ImportType,
  type ImportRecord,
  IMPORT_TYPE_CONFIG,
  STATUS_CONFIG,
  WIZARD_STEPS,
  type WizardStep,
} from './types';
import { ImportTypeSelector } from './import-type-selector';
import { UploadZone } from './upload-zone';
import { ColumnMapper } from './column-mapper';
import { ValidationResults } from './validation-results';
import { ImportProgress } from './import-progress';
import { ImportHistory } from './import-history';
import {
  Upload,
  Database,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

const STEP_ICONS: Record<WizardStep, React.ComponentType<{ className?: string }>> = {
  type: Database,
  upload: Upload,
  mapping: FileSpreadsheet,
  validation: CheckCircle2,
  processing: Loader2,
};

// Map status to progress step (0-5)
function statusToStep(status: ImportRecord['status']): number {
  const s = STATUS_CONFIG[status];
  if (!s) return 0;
  if (s.step === -1) return 2; // failed — show at validate step
  if (s.step >= 6) return 5;   // completed
  return Math.min(s.step, 5);
}

export function ImportDashboard() {
  const store = useImportStore();

  // Processing timer
  const [startTime, setStartTime] = useState(0);
  const [detailImport, setDetailImport] = useState<ImportRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Fetch imports on mount
  useEffect(() => {
    void store.fetchImports();
  }, []);

  // Wizard step handler
  const handleTypeSelect = useCallback(
    (type: ImportType) => {
      store.setSelectedImportType(type);
    },
    [store]
  );

  const handleUpload = useCallback(
    (file: File) => {
      if (store.selectedImportType) {
        store.uploadFile(file, store.selectedImportType);
      }
    },
    [store]
  );

  const handleConfirmMapping = useCallback(async () => {
    await store.runValidation();
    store.setWizardStep('validation');
  }, [store]);

  const handleProceedAnyway = useCallback(async () => {
    setStartTime(Date.now());
    await store.processImport();
  }, [store]);

  const handleFixIssues = useCallback(() => {
    store.setWizardStep('mapping');
  }, [store]);

  const handlePrevStep = useCallback(() => {
    store.prevStep();
  }, [store]);

  const handleNextStep = useCallback(() => {
    const { wizardStep, selectedImportType, uploadedFile } = store;
    // Validate step transitions
    if (wizardStep === 'type' && !selectedImportType) return;
    if (wizardStep === 'upload' && !uploadedFile) return;
    store.nextStep();
  }, [store]);

  const handleReset = useCallback(() => {
    store.resetWizard();
    setStartTime(0);
  }, [store]);

  const handleSelectImport = useCallback((record: ImportRecord) => {
    setDetailImport(record);
    setShowDetail(true);
  }, []);

  // Can go next?
  const canGoNext = (() => {
    const { wizardStep, selectedImportType, uploadedFile } = store;
    if (wizardStep === 'type') return !!selectedImportType;
    if (wizardStep === 'upload') return !!uploadedFile;
    return false;
  })();

  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.id === store.wizardStep);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Upload className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Data Import</h2>
            <p className="text-sm text-gray-500">
              তথ্য আমদানি — Import & validate your data files
            </p>
          </div>
        </div>
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="new" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="new" className="flex-1 sm:flex-initial gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            New Import
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-initial gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Import History
          </TabsTrigger>
        </TabsList>

        {/* New Import Tab */}
        <TabsContent value="new" className="mt-4">
          <div className="space-y-5">
            {/* Wizard stepper */}
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center border-b">
                  {WIZARD_STEPS.map((step, idx) => {
                    const isDone = idx < currentStepIndex;
                    const isActive = idx === currentStepIndex;
                    const Icon = STEP_ICONS[step.id];

                    return (
                      <div
                        key={step.id}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors ${
                          isActive
                            ? 'text-emerald-700 font-semibold border-b-2 border-emerald-500 bg-emerald-50/50'
                            : isDone
                            ? 'text-gray-500'
                            : 'text-gray-400'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Icon className={`h-4 w-4 ${isActive ? '' : 'opacity-50'}`} />
                        )}
                        <span className="hidden sm:inline">{step.label}</span>
                        <span className="sm:hidden text-xs">{idx + 1}</span>
                        {idx < WIZARD_STEPS.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-gray-300 hidden sm:block absolute right-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Step content */}
            <div className="min-h-[300px]">
              {/* Step 1: Select Import Type */}
              {store.wizardStep === 'type' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-1">Select Import Type</h3>
                    <p className="text-sm text-gray-500">
                      Choose the type of data you want to import into TrimedCast
                    </p>
                  </div>
                  <ImportTypeSelector
                    selected={store.selectedImportType}
                    onSelect={handleTypeSelect}
                  />
                </div>
              )}

              {/* Step 2: Upload File */}
              {store.wizardStep === 'upload' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-1">Upload Data File</h3>
                    <p className="text-sm text-gray-500">
                      Upload your Excel or CSV file for {store.selectedImportType ? IMPORT_TYPE_CONFIG[store.selectedImportType].label : 'import'}
                    </p>
                  </div>
                  <UploadZone
                    importType={store.selectedImportType}
                    onUpload={handleUpload}
                    isUploading={store.isLoading}
                    uploadProgress={store.uploadProgress}
                    uploadedFile={store.uploadedFile}
                  />
                </div>
              )}

              {/* Step 3: Map Columns */}
              {store.wizardStep === 'mapping' && store.selectedImportType && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-1">Map Columns</h3>
                    <p className="text-sm text-gray-500">
                      Review and adjust the column mapping from your file to the target fields
                    </p>
                  </div>
                  <ColumnMapper
                    importType={store.selectedImportType}
                    mappings={store.columnMappings}
                    onMappingsChange={store.mapColumns}
                    onConfirm={handleConfirmMapping}
                    isLoading={store.isLoading}
                  />
                </div>
              )}

              {/* Step 4: Validation */}
              {store.wizardStep === 'validation' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-1">Validation Results</h3>
                    <p className="text-sm text-gray-500">
                      Review data quality issues before proceeding
                    </p>
                  </div>
                  <ValidationResults
                    issues={store.validationIssues}
                    totalRows={store.uploadedFile?.rows || 238}
                    validRows={
                      (store.uploadedFile?.rows || 238) -
                      store.validationIssues.filter((i) => i.severity === 'error').length
                    }
                    qualityScore={
                      store.validationIssues.length === 0
                        ? 100
                        : Math.max(
                            0,
                            Math.round(
                              100 -
                                store.validationIssues.filter((i) => i.severity === 'error').length * 3 -
                                store.validationIssues.filter((i) => i.severity === 'warning').length * 1
                            )
                          )
                    }
                    onProceedAnyway={handleProceedAnyway}
                    onFixIssues={handleFixIssues}
                    isLoading={store.isLoading}
                  />
                </div>
              )}

              {/* Step 5: Processing */}
              {store.wizardStep === 'processing' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-1">Processing Import</h3>
                    <p className="text-sm text-gray-500">
                      Your data is being processed and inserted into the database
                    </p>
                  </div>
                  <ImportProgress
                    currentStep={store.processingProgress >= 100 ? 5 : 4}
                    status={store.processingProgress >= 100 ? 'completed' : 'processing'}
                    progressPercent={store.processingProgress}
                    processingRow={store.processingRow}
                    totalRows={store.uploadedFile?.rows || 238}
                    startTime={startTime}
                  />

                  {store.processingProgress >= 100 && (
                    <Card className="border-emerald-200 bg-emerald-50/50">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-emerald-800">Import completed successfully!</h4>
                            <p className="text-sm text-emerald-700 mt-1">
                              {store.uploadedFile?.rows || 238} rows processed &middot; Quality score: 92%
                            </p>
                            <div className="mt-3 flex gap-2">
                              <Button variant="outline" size="sm" onClick={handleReset}>
                                <RotateCcw className="h-4 w-4 mr-1.5" />
                                Import Another
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {/* Wizard navigation */}
            {store.wizardStep !== 'processing' && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={currentStepIndex === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>

                <div className="flex items-center gap-2">
                  {store.wizardStep !== 'mapping' && store.wizardStep !== 'validation' && (
                    <Button
                      onClick={handleNextStep}
                      disabled={!canGoNext || store.isLoading}
                    >
                      {store.isLoading ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-1.5" />
                      )}
                      Next
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Error display */}
            {store.error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-xs text-red-600 mt-0.5">{store.error}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 text-xs"
                  onClick={store.clearError}
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Import History Tab */}
        <TabsContent value="history" className="mt-4">
          <ImportHistory
            imports={store.imports}
            typeFilter={store.typeFilter}
            searchQuery={store.searchQuery}
            onTypeFilterChange={store.setTypeFilter}
            onSearchQueryChange={store.setSearchQuery}
            onRefresh={() => store.fetchImports()}
            onSelectImport={handleSelectImport}
            isLoading={store.isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Import Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          {detailImport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-gray-500" />
                  Import Detail
                </DialogTitle>
                <DialogDescription>
                  {detailImport.fileName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Status & Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <Badge
                      className={`text-xs ${
                        detailImport.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : detailImport.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {STATUS_CONFIG[detailImport.status]?.label || detailImport.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Type</p>
                    <p className="text-sm font-medium">
                      {IMPORT_TYPE_CONFIG[detailImport.importType]?.label || detailImport.importType}
                    </p>
                  </div>
                </div>

                {/* Rows */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Rows</p>
                    <p className="text-lg font-bold">{detailImport.totalRows.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Valid</p>
                    <p className="text-lg font-bold text-emerald-600">{detailImport.validRows.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Invalid</p>
                    <p className="text-lg font-bold text-red-600">{detailImport.invalidRows.toLocaleString()}</p>
                  </div>
                </div>

                {/* Quality & Error */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Quality Score</p>
                    <p className="text-lg font-bold">{detailImport.qualityScore}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Created</p>
                    <p className="text-sm">{new Date(detailImport.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {detailImport.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-red-700 mb-1">Error</p>
                    <p className="text-xs text-red-600">{detailImport.error}</p>
                  </div>
                )}

                {/* Progress visualization */}
                <ImportProgress
                  currentStep={statusToStep(detailImport.status)}
                  status={detailImport.status}
                  progressPercent={
                    detailImport.status === 'completed' ? 100 : 0
                  }
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
