'use client';

// ============================================
// TrimedCast — Upload Zone
// Session 22: Drag & drop file upload
// ============================================

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { type ImportType, IMPORT_TYPE_CONFIG } from './types';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  File,
  CheckCircle2,
} from 'lucide-react';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadZoneProps {
  importType: ImportType | null;
  onUpload: (file: File) => void;
  isUploading: boolean;
  uploadProgress: number;
  uploadedFile: { name: string; size: number; rows: number } | null;
}

export function UploadZone({
  importType,
  onUpload,
  isUploading,
  uploadProgress,
  uploadedFile,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeConfig = importType ? IMPORT_TYPE_CONFIG[importType] : null;

  const validateFile = (file: File): string | null => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return 'Invalid file type. Supported: .xlsx, .xls, .csv';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File too large. Maximum size: 10 MB';
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      setDragError(null);
      const err = validateFile(file);
      if (err) {
        setDragError(err);
        return;
      }
      if (!importType) {
        setDragError('Please select an import type first');
        return;
      }
      onUpload(file);
    },
    [importType, onUpload]
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
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  // Show uploaded file summary
  if (uploadedFile && !isUploading) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-emerald-800">File uploaded successfully</h4>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <File className="h-3.5 w-3.5" />
                  {uploadedFile.name}
                </span>
                <span>{formatFileSize(uploadedFile.size)}</span>
                <Badge variant="outline" className="text-[10px] px-1.5">
                  {uploadedFile.rows.toLocaleString()} rows
                </Badge>
              </div>
              {typeConfig && (
                <Badge className="mt-2 text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  {typeConfig.label}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selected type badge */}
      {typeConfig && (
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">
            {typeConfig.label} ({typeConfig.labelBn})
          </Badge>
          <span className="text-xs text-gray-500">Ready to upload</span>
        </div>
      )}

      {/* Drop zone */}
      <Card>
        <CardContent className="p-0">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && importType && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
                : importType
                ? 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50/50 cursor-pointer'
                : 'border-gray-200 bg-gray-50/30'
            } ${!importType ? 'opacity-50' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className="hidden"
              disabled={isUploading || !importType}
            />

            {isUploading ? (
              <div className="space-y-4">
                <Loader2 className="h-10 w-10 mx-auto text-emerald-500 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Uploading...</p>
                  <p className="text-xs text-gray-500 mt-1">Please wait while we process your file</p>
                </div>
                <div className="max-w-xs mx-auto">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1.5">{Math.round(uploadProgress)}%</p>
                </div>
              </div>
            ) : isDragging ? (
              <div className="space-y-3">
                <Upload className="h-10 w-10 mx-auto text-emerald-500 animate-bounce" />
                <p className="text-sm font-medium text-emerald-600">Drop your file here</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileSpreadsheet className="h-7 w-7 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Drag & drop your file here
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    or click to browse &middot; .xlsx, .xls, .csv &middot; Max 10 MB
                  </p>
                </div>
                {importType && (
                  <Button variant="outline" size="sm" className="mt-1">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                )}
                {!importType && (
                  <p className="text-xs text-amber-600 flex items-center justify-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Select an import type first
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Drag error */}
      {dragError && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {dragError}
        </div>
      )}
    </div>
  );
}
