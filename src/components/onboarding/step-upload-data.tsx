'use client';

// ============================================
// TrimedCast - Onboarding Step 3: Upload Data
// Drag & drop file upload + demo data option
// ============================================

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  Database,
  X,
} from 'lucide-react';
import { useOnboardingStore } from '@/lib/onboarding/store';

const ACCEPTED_TYPES = ['.csv', '.xlsx', '.xls'];
const MAX_SIZE_MB = 10;

export function StepUploadData() {
  const {
    hasUploadedData,
    uploadedFiles,
    usedDemoData,
    setUploadedData,
    setUsedDemoData,
    nextStep,
    prevStep,
    skipStep,
  } = useOnboardingStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const validFiles: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_TYPES.includes(ext)) {
        setUploadError(`Invalid file type: ${file.name}. Use CSV or Excel files.`);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setUploadError(`File too large: ${file.name}. Max ${MAX_SIZE_MB}MB.`);
        return;
      }
      validFiles.push(file.name);
    }

    setUploadedData(validFiles);
  }, [setUploadedData]);

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // Demo data loader
  const handleDemoData = useCallback(async () => {
    setIsDemoLoading(true);
    try {
      // Simulate loading demo data
      await new Promise(resolve => setTimeout(resolve, 1500));
      setUsedDemoData();
    } finally {
      setIsDemoLoading(false);
    }
  }, [setUsedDemoData]);

  // Remove uploaded file
  const handleRemove = useCallback(() => {
    setUploadedData([]);
  }, [setUploadedData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">
          Upload your data
        </h2>
        <p className="text-sm text-muted-foreground">
          আপনার ডাটা আপলোড করুন — প্রথম পূর্বাভাসন দেখুন
        </p>
      </div>

      {!hasUploadedData ? (
        <>
          {/* Upload Area */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-border hover:border-emerald-500/40 hover:bg-emerald-500/5'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-emerald-500' : 'text-muted-foreground'}`} />
              <p className="text-sm font-medium text-foreground mb-1">
                Drag & drop your files here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse — CSV, XLSX, XLS (max {MAX_SIZE_MB}MB)
              </p>
            </div>
          </motion.div>

          {uploadError && (
            <p className="text-xs text-rose-500">{uploadError}</p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Demo Data Option */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              variant="outline"
              onClick={handleDemoData}
              disabled={isDemoLoading}
              className="w-full h-auto py-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              {isDemoLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading demo data...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 mr-2" />
                  <div className="text-left">
                    <span className="block font-medium">Use Demo Data to Explore</span>
                    <span className="block text-xs text-muted-foreground font-normal">
                      ডেমো ডাটা দিয়ে দেখুন — try before you upload
                    </span>
                  </div>
                </>
              )}
            </Button>
          </motion.div>
        </>
      ) : (
        /* Upload success */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {usedDemoData ? (
                <p className="text-sm font-medium text-foreground">Demo data loaded successfully</p>
              ) : (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {uploadedFiles.map(f => (
                      <span key={f} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
                        <FileSpreadsheet className="w-3 h-3" />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-muted-foreground hover:text-rose-500"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {usedDemoData
              ? 'Demo data includes sample products, sales history, and seasonal events.'
              : 'Your data will be processed and ready for forecasting.'
            }
          </p>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={prevStep}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          variant="ghost"
          onClick={skipStep}
          className="text-muted-foreground hover:text-foreground ml-auto"
        >
          <SkipForward className="w-4 h-4 mr-1" />
          Skip
        </Button>
        <Button
          onClick={nextStep}
          disabled={!hasUploadedData}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
