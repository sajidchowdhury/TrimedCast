'use client';

import { useEffect, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useETLStore, type ValidationResultClient, type HarmonizationResultClient, type InsertionResultClient } from '@/lib/etl/store';
import { IMPORT_TYPE_SCHEMAS, type ImportType, type QualityStats } from '@/lib/etl/import-types';
import { calculateQualityScore } from '@/lib/etl/quality-score';
import { useForecastStore } from '@/lib/forecasting/store';
import { UploadZone } from '@/components/etl/upload-zone';
import { ColumnMapper } from '@/components/etl/column-mapper';
import { ValidationResults } from '@/components/etl/validation-results';
import { HarmonizationLog } from '@/components/etl/harmonization-log';
import { QualityBadge } from '@/components/etl/quality-badge';
import { ImportProgress } from '@/components/etl/import-progress';
import { ImportHistory } from '@/components/etl/import-history';
import { ForecastChart } from '@/components/forecast/forecast-chart';
import { OrderTriggerCard } from '@/components/forecast/order-trigger-card';
import { SeasonalPattern } from '@/components/forecast/seasonal-pattern';
import { LeadTimeViz } from '@/components/forecast/lead-time-viz';
import { ModelComparison } from '@/components/forecast/model-comparison';
import { ForecastVsActual } from '@/components/forecast/forecast-vs-actual';
import { RecommendedOrdersTable } from '@/components/forecast/recommended-orders-table';
import { CNYCalendar } from '@/components/forecast/cny-calendar';
import { CategorySeasonalGrid } from '@/components/forecast/category-seasonal-grid';
import { StockProjection } from '@/components/forecast/stock-projection';
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
  BarChart3,
  Upload,
  Package,
  Activity,
  Clock,
  Target,
  Shield,
  Calculator,
  Zap,
  Search,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// ETL Step content components (unchanged)
// ============================================

function UploadStep() {
  return <UploadZone />;
}

function MapStep() {
  const { setStep } = useETLStore();
  const handleProceed = useCallback(() => { setStep(2); }, [setStep]);
  return <ColumnMapper onProceed={handleProceed} />;
}

function ValidateStep() {
  const { currentImportId, setLoading, setError, setValidationResult, setStep, isLoading } = useETLStore();
  const handleProceed = useCallback(() => { setStep(3); }, [setStep]);

  useEffect(() => {
    const runValidation = async () => {
      if (!currentImportId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/imports/${currentImportId}/validate`, { method: 'POST' });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Validation failed'); }
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Validation failed');
        setValidationResult(json.data as ValidationResultClient);
      } catch (err) { setError(err instanceof Error ? err.message : 'Validation failed'); }
      finally { setLoading(false); }
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
  const { currentImportId, setLoading, setError, setHarmonizationResult, setStep, harmonizationResult, isLoading } = useETLStore();
  const handleProceed = useCallback(() => { setStep(4); }, [setStep]);

  useEffect(() => {
    if (harmonizationResult) return;
    const runHarmonization = async () => {
      if (!currentImportId) return;
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/imports/${currentImportId}/harmonize`, { method: 'POST' });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Harmonization failed'); }
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Harmonization failed');
        setHarmonizationResult(json.data as HarmonizationResultClient);
      } catch (err) { setError(err instanceof Error ? err.message : 'Harmonization failed'); }
      finally { setLoading(false); }
    };
    runHarmonization();
  }, [currentImportId, harmonizationResult, setLoading, setError, setHarmonizationResult]);

  if (isLoading && !harmonizationResult) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto text-blue-500 animate-spin mb-3" />
          <p className="text-sm text-gray-600">Running 6-step harmonization...</p>
          <p className="text-xs text-gray-400 mt-1">Trim → Dates → Categories → Units → Dedup → Enrich</p>
        </CardContent>
      </Card>
    );
  }
  return <HarmonizationLog onProceed={handleProceed} />;
}

function InsertStep() {
  const { currentImportId, setLoading, setError, setInsertionResult, setStep, insertionResult, uploadResult, mappings, importType, isLoading } = useETLStore();

  useEffect(() => {
    if (insertionResult) return;
    const runInsert = async () => {
      if (!currentImportId) return;
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/imports/${currentImportId}/insert`, { method: 'POST' });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Insertion failed'); }
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Insertion failed');
        setInsertionResult(json.data as InsertionResultClient);
      } catch (err) { setError(err instanceof Error ? err.message : 'Insertion failed'); }
      finally { setLoading(false); }
    };
    runInsert();
  }, [currentImportId, insertionResult, setLoading, setError, setInsertionResult]);

  if (isLoading && !insertionResult) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto text-blue-500 animate-spin mb-3" />
          <p className="text-sm text-gray-600">Inserting data into database...</p>
        </CardContent>
      </Card>
    );
  }
  if (!insertionResult) return null;

  const schema = importType ? IMPORT_TYPE_SCHEMAS[importType as ImportType] : null;
  const requiredTotal = schema?.requiredFields.length || 0;
  const requiredMapped = mappings.filter((m) => m.targetField && m.confidence > 0 && schema?.requiredFields.some((rf) => rf.field === m.targetField)).length;
  const qualityStats: QualityStats = {
    rowsTotal: uploadResult?.rowsTotal || 0,
    rowsValid: uploadResult?.rowsTotal || insertionResult.inserted,
    rowsInserted: insertionResult.inserted,
    rowsDuplicate: 0,
    requiredMapped,
    requiredTotal,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-800">Import Complete!</h2>
              <p className="text-sm text-emerald-600">Your data has been successfully processed and inserted</p>
            </div>
          </div>
          <QualityBadge score={insertionResult.qualityScore} size="lg" showBreakdown={true} stats={qualityStats} />
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center"><Database className="h-5 w-5 mx-auto text-blue-500 mb-1" /><div className="text-2xl font-bold text-gray-700">{insertionResult.inserted}</div><div className="text-xs text-gray-500">Rows Inserted</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><XCircle className="h-5 w-5 mx-auto text-red-500 mb-1" /><div className="text-2xl font-bold text-gray-700">{insertionResult.skipped}</div><div className="text-xs text-gray-500">Rows Skipped</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><FileSpreadsheet className="h-5 w-5 mx-auto text-gray-500 mb-1" /><div className="text-2xl font-bold text-gray-700">{insertionResult.createdMasterData?.length || 0}</div><div className="text-xs text-gray-500">Master Data Created</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><Loader2 className="h-5 w-5 mx-auto text-gray-400 mb-1" style={{ animation: 'none' }} /><div className="text-2xl font-bold text-gray-700">{insertionResult.durationMs !== null ? insertionResult.durationMs < 1000 ? `${insertionResult.durationMs}ms` : `${(insertionResult.durationMs / 1000).toFixed(1)}s` : '—'}</div><div className="text-xs text-gray-500">Duration</div></CardContent></Card>
      </div>
      {insertionResult.createdMasterData && insertionResult.createdMasterData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Auto-Created Master Data</CardTitle></CardHeader>
          <CardContent><ul className="text-xs text-gray-500 space-y-1">{insertionResult.createdMasterData.map((item, i) => (<li key={i} className="flex items-center gap-2"><Badge variant="outline" className="text-xs h-5">New</Badge>{item}</li>))}</ul></CardContent>
        </Card>
      )}
      {insertionResult.errors && insertionResult.errors.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-600">Insertion Errors ({insertionResult.errors.length})</CardTitle></CardHeader>
          <CardContent><ul className="text-xs text-red-500 space-y-1">{insertionResult.errors.slice(0, 10).map((err, i) => (<li key={i}>Row {err.row}: {err.error}</li>))}{insertionResult.errors.length > 10 && <li className="text-gray-400">...and {insertionResult.errors.length - 10} more</li>}</ul></CardContent>
        </Card>
      )}
    </motion.div>
  );
}

// ============================================
// Import Data Tab
// ============================================

function ImportDataTab() {
  const { currentStep, isLoading, error, setError, reset, seedDemo, fetchImports, isSeeded } = useETLStore();

  useEffect(() => {
    if (!isSeeded) seedDemo();
    fetchImports();
  }, [isSeeded]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return <UploadStep />;
      case 1: return <MapStep />;
      case 2: return <ValidateStep />;
      case 3: return <HarmonizeStep />;
      case 4: return <InsertStep />;
      case 5: return <InsertStep />;
      default: return <UploadStep />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" className="ml-4 h-7 text-xs" onClick={() => setError(null)}>Dismiss</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Stepper */}
      {currentStep > 0 && (
        <ImportProgress>
          <AnimatePresence mode="wait">
            <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </ImportProgress>
      )}

      {/* Step 0: Upload */}
      {currentStep === 0 && (
        <AnimatePresence mode="wait">
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2"><UploadStep /></div>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" />How It Works</CardTitle></CardHeader>
                  <CardContent>
                    <ol className="text-xs text-gray-600 space-y-3">
                      <li className="flex items-start gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">1</span><span>Select import type and upload your Excel file (.xlsx, .xls, .csv)</span></li>
                      <li className="flex items-start gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold">2</span><span>Review auto-mapped columns. Fuzzy matching uses Levenshtein distance + BD aliases</span></li>
                      <li className="flex items-start gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-bold">3</span><span>3-phase validation: Schema, Data quality, Business rules</span></li>
                      <li className="flex items-start gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-[10px] font-bold">4</span><span>6-step harmonization: Trim, Dates, Categories, Units, Dedup, Enrich</span></li>
                      <li className="flex items-start gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">5</span><span>Batch insert with quality scoring (0-100)</span></li>
                    </ol>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-gray-500" />Supported Data Types</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.values(IMPORT_TYPE_SCHEMAS).map((schema) => (
                        <div key={schema.type} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                          <span className="font-medium">{schema.label}</span>
                          <span className="text-gray-400">({schema.requiredFields.length} required)</span>
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

      <ImportHistory />
    </div>
  );
}

// ============================================
// Forecast Dashboard Tab
// ============================================

function ForecastDashboardTab() {
  const {
    products,
    selectedProductId,
    productsLoading,
    forecastResult,
    forecastLoading,
    shippingMethod,
    error,
    setSelectedProductId,
    setShippingMethod,
    fetchProducts,
    generateForecast,
    setError,
    resetForecast,
  } = useForecastStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" className="ml-4 h-7 text-xs" onClick={() => setError(null)}>Dismiss</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Product selector + controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            {/* Product select */}
            <div className="flex-1 min-w-0">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Select Product</label>
              <Select
                value={selectedProductId || ''}
                onValueChange={(val) => setSelectedProductId(val || null)}
                disabled={productsLoading}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder={productsLoading ? 'Loading products...' : 'Choose a product...'} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-medium">{p.sku}</span>
                        <span className="text-gray-400">—</span>
                        <span className="truncate">{p.name}</span>
                        <Badge variant="outline" className="text-[9px] h-4 ml-1">{p.salesCount} sales</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shipping method */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Shipping</label>
              <Select value={shippingMethod} onValueChange={(val) => setShippingMethod(val as 'sea' | 'air')}>
                <SelectTrigger className="w-32 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sea">Sea Freight</SelectItem>
                  <SelectItem value="air">Air Freight</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate button */}
            <Button
              onClick={generateForecast}
              disabled={!selectedProductId || forecastLoading}
              className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {forecastLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Forecast
                </>
              )}
            </Button>

            {/* Reset */}
            {forecastResult && (
              <Button variant="outline" size="sm" onClick={resetForecast} className="h-10">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No product selected state */}
      {!selectedProductId && !forecastLoading && (
        <Card>
          <CardContent className="py-16 text-center">
            <Search className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Select a Product to Forecast</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Choose a product from the dropdown above and click &quot;Generate Forecast&quot; to view
              seasonal demand predictions, order triggers, and inventory optimization recommendations.
            </p>
            {products.length === 0 && !productsLoading && (
              <div className="mt-4">
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  No products found — Import sales history data first
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {forecastLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-3 w-24" /></CardContent></Card>
            <Card><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-3 w-24" /></CardContent></Card>
            <Card><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-3 w-24" /></CardContent></Card>
            <Card><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-3 w-24" /></CardContent></Card>
          </div>
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-[400px] w-full rounded" />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Forecast results */}
      {forecastResult && !forecastLoading && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
          {/* Top row: 4 stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Avg Daily Demand */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium text-gray-500">Avg Daily Demand</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {forecastResult.forecast.points.length > 0
                    ? (forecastResult.forecast.points.reduce((sum, p) => sum + p.predicted, 0) / forecastResult.forecast.points.length).toFixed(1)
                    : '—'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">units/day average</p>
              </CardContent>
            </Card>

            {/* Current Stock Days */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium text-gray-500">Stock Days Left</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {forecastResult.orderTrigger.daysOfStock}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {forecastResult.orderTrigger.stockStatus === 'healthy' ? 'Healthy' :
                   forecastResult.orderTrigger.stockStatus === 'low' ? 'Low — Reorder soon' :
                   forecastResult.orderTrigger.stockStatus === 'critical' ? 'Critical!' :
                   'Stockout!'}
                </p>
              </CardContent>
            </Card>

            {/* Lead Time */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-gray-500">Lead Time</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {forecastResult.leadTime.total}d
                </p>
                <p className="text-[10px] text-gray-400 mt-1 capitalize">
                  {forecastResult.leadTime.shippingMethod} freight
                </p>
              </CardContent>
            </Card>

            {/* Quality Score / MAPE */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-violet-500" />
                  <span className="text-xs font-medium text-gray-500">Model MAPE</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {forecastResult.forecast.metrics.mape.toFixed(1)}%
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {forecastResult.forecast.metrics.mape < 10 ? 'Excellent accuracy' :
                   forecastResult.forecast.metrics.mape < 20 ? 'Good accuracy' :
                   forecastResult.forecast.metrics.mape < 30 ? 'Moderate accuracy' :
                   'Needs recalibration'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Demand Forecast with Confidence Interval</CardTitle>
                  <CardDescription>
                    {forecastResult.product.sku} — {forecastResult.product.name} ·
                    {forecastResult.forecast.points.length}-day horizon · {forecastResult.forecast.model} model
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {forecastResult.dataPoints} data points
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ForecastChart points={forecastResult.forecast.points} />
            </CardContent>
          </Card>

          {/* Order Trigger + Seasonal Pattern */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrderTriggerCard trigger={forecastResult.orderTrigger} />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  BD Seasonal Pattern
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SeasonalPattern currentSeason={forecastResult.orderTrigger.currentSeason} />
              </CardContent>
            </Card>
          </div>

          {/* Lead Time + EOQ/Safety Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LeadTimeViz
              leadTime={forecastResult.leadTime}
              cnyDelayDays={forecastResult.orderTrigger.cnyDelayDays}
            />
            <div className="space-y-4">
              {/* EOQ Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-blue-500" />
                    Economic Order Quantity (EOQ)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Optimal Order Qty</span>
                    <span className="text-2xl font-bold text-slate-800">{forecastResult.eoq.eoq}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-blue-50">
                      <p className="text-sm font-bold text-blue-700">{forecastResult.eoq.ordersPerYear}</p>
                      <p className="text-[10px] text-blue-500">Orders/yr</p>
                    </div>
                    <div className="p-2 rounded bg-blue-50">
                      <p className="text-sm font-bold text-blue-700">{forecastResult.eoq.orderCycleDays}d</p>
                      <p className="text-[10px] text-blue-500">Cycle</p>
                    </div>
                    <div className="p-2 rounded bg-blue-50">
                      <p className="text-sm font-bold text-blue-700">৳{forecastResult.eoq.totalCost.toLocaleString()}</p>
                      <p className="text-[10px] text-blue-500">Total Cost</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Safety Stock Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-500" />
                    Safety Stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Safety Stock Level</span>
                    <span className="text-2xl font-bold text-slate-800">{forecastResult.safetyStock.safetyStock}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-amber-50">
                      <p className="text-sm font-bold text-amber-700">{forecastResult.safetyStock.reorderPoint}</p>
                      <p className="text-[10px] text-amber-500">Reorder Pt</p>
                    </div>
                    <div className="p-2 rounded bg-amber-50">
                      <p className="text-sm font-bold text-amber-700">{(forecastResult.safetyStock.serviceLevel * 100).toFixed(0)}%</p>
                      <p className="text-[10px] text-amber-500">Service Lvl</p>
                    </div>
                    <div className="p-2 rounded bg-amber-50">
                      <p className="text-sm font-bold text-amber-700">{forecastResult.safetyStock.zScore}</p>
                      <p className="text-[10px] text-amber-500">Z-Score</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 bg-slate-50 rounded p-2">
                    <span className="font-medium">Components:</span>{' '}
                    Demand var: {forecastResult.safetyStock.components.demandVariability.toFixed(2)} |
                    Lead time var: {forecastResult.safetyStock.components.leadTimeVariability.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Model Comparison */}
          <ModelComparison
            individualResults={forecastResult.forecast.individualResults}
            ensembleModel={forecastResult.forecast.model}
          />

          {/* Forecast vs Actual Comparison */}
          <ForecastVsActual
            productId={selectedProductId}
            productName={forecastResult.product.name || 'Unknown Product'}
            tenantId="demo-bd-motors"
          />

          {/* Stock Projection Chart */}
          <StockProjection
            currentStock={forecastResult.orderTrigger.currentStock}
            safetyStock={forecastResult.orderTrigger.safetyStock}
            reorderPoint={forecastResult.orderTrigger.reorderPoint}
            avgDailyDemand={forecastResult.orderTrigger.daysOfStock > 0 ? forecastResult.orderTrigger.currentStock / forecastResult.orderTrigger.daysOfStock : 1}
            orderArrivalDate={forecastResult.orderTrigger.expectedDeliveryDate}
            orderQty={forecastResult.orderTrigger.suggestedOrderQty}
            productName={forecastResult.product.name || undefined}
          />
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// Order Triggers Tab (THE CORE IP - THE PRIMARY OUTPUT)
// ============================================

function OrderTriggersTab() {
  const [seasonalBest, setSeasonalBest] = useState<{ products: Array<{ productId: string; productSku: string; productName: string; category: string; predictedDemand: number; currentStock: number; stockGap: number; season: string }> } | null>(null);
  const [seasonalBestLoading, setSeasonalBestLoading] = useState(false);

  // Fetch seasonal best products on mount
  useEffect(() => {
    const fetchSeasonalBest = async () => {
      setSeasonalBestLoading(true);
      try {
        const res = await fetch('/api/forecast/seasonal-best?tenantId=demo-bd-motors');
        if (res.ok) {
          const json = await res.json();
          if (json.success) setSeasonalBest(json.data);
        }
      } catch { /* ignore */ }
      finally { setSeasonalBestLoading(false); }
    };
    fetchSeasonalBest();
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <ShoppingCart className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-900">Recommended Orders</h2>
              <p className="text-sm text-emerald-700">
                THE CORE IP — TrimedCast answers: &ldquo;Order <strong>what</strong>, <strong>how many</strong>, on <strong>what date</strong>?&rdquo;
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Calculated from: Lead time decomposition + CNY risk + BD seasonal demand + EOQ + Safety stock
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Orders Table - THE PRIMARY OUTPUT */}
      <RecommendedOrdersTable />

      {/* Seasonal Best Products */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Seasonal Best Products</CardTitle>
          </div>
          <CardDescription>Top products predicted to sell best in the upcoming season</CardDescription>
        </CardHeader>
        <CardContent>
          {seasonalBestLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Analyzing seasonal patterns...</span>
            </div>
          ) : seasonalBest && seasonalBest.products && seasonalBest.products.length > 0 ? (
            <div className="space-y-3">
              {seasonalBest.products.slice(0, 5).map((product, idx) => (
                <motion.div
                  key={product.productId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-100"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    idx === 0 ? 'bg-amber-100 text-amber-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-800 truncate">{product.productName}</span>
                      <Badge variant="outline" className="text-[9px] h-4">{product.productSku}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">{product.category}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-emerald-700">{Math.round(product.predictedDemand)} units</p>
                    <p className="text-[10px] text-gray-400">predicted demand</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {product.stockGap > 0 ? (
                      <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                        Gap: {Math.round(product.stockGap)} units
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                        Stock OK
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm">No seasonal predictions available yet</p>
              <p className="text-xs text-gray-400">Import sales history data first to enable seasonal analysis</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CNY Calendar - Supply Chain Disruption Planning */}
      <CNYCalendar />

      {/* Category × Season Demand Matrix */}
      <CategorySeasonalGrid />
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function Home() {
  const { currentStep, reset } = useETLStore();
  const { activeTab, setActiveTab } = useForecastStore();

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
                <p className="text-xs text-slate-400">Seasonal Demand & Inventory Forecasting</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activeTab === 'import' && currentStep > 0 && currentStep < 5 && (
                <Button variant="outline" size="sm" className="text-white border-slate-600 hover:bg-slate-700 hover:text-white" onClick={reset}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  New Import
                </Button>
              )}
              <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs hidden sm:inline-flex">
                BD Motorcycle Parts
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'import' | 'forecast' | 'orders')} className="w-full">
          <TabsList className="grid w-full max-w-lg mx-auto mb-6 grid-cols-3">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import Data</span>
              <span className="sm:hidden">Import</span>
            </TabsTrigger>
            <TabsTrigger value="forecast" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Forecast</span>
              <span className="sm:hidden">Forecast</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Order Triggers</span>
              <span className="sm:hidden">Orders</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import">
            <AnimatePresence mode="wait">
              <motion.div
                key="import-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <ImportDataTab />
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="forecast">
            <AnimatePresence mode="wait">
              <motion.div
                key="forecast-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <ForecastDashboardTab />
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="orders">
            <AnimatePresence mode="wait">
              <motion.div
                key="orders-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <OrderTriggersTab />
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </Tabs>
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
