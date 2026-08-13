'use client';

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useETLStore, type UploadResult } from '@/lib/etl/store';
import { IMPORT_TYPE_SCHEMAS, type ImportType } from '@/lib/etl/import-types';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  ShoppingCart,
  Package,
  Warehouse,
  Truck,
  Tag,
  Bike,
  Loader2,
  File,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp className="h-5 w-5" />,
  ShoppingCart: <ShoppingCart className="h-5 w-5" />,
  Package: <Package className="h-5 w-5" />,
  Warehouse: <Warehouse className="h-5 w-5" />,
  Truck: <Truck className="h-5 w-5" />,
  Tag: <Tag className="h-5 w-5" />,
  Bike: <Bike className="h-5 w-5" />,
};

const COLOR_MAP: Record<string, string> = {
  emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  blue: 'text-blue-600 bg-blue-50 border-blue-200',
  violet: 'text-violet-600 bg-violet-50 border-violet-200',
  amber: 'text-amber-600 bg-amber-50 border-amber-200',
  rose: 'text-rose-600 bg-rose-50 border-rose-200',
  cyan: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  pink: 'text-pink-600 bg-pink-50 border-pink-200',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadZone() {
  const { importType, setImportType, setUploadResult, setLoading, setError, isLoading, tenantId } = useETLStore();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importTypes = Object.values(IMPORT_TYPE_SCHEMAS);

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

  const handleUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!importType) {
      setError('Please select an import type first');
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

      // Simulate progress
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

      // Small delay for the 100% progress to show
      await new Promise((r) => setTimeout(r, 300));

      setUploadResult(json.data as UploadResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setSelectedFile(null);
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  }, [importType, tenantId, setUploadResult, setLoading, setError]);

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

  return (
    <div className="space-y-6">
      {/* Import Type Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Select Import Type</CardTitle>
          <CardDescription>Choose the type of data you are importing</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={importType}
            onValueChange={(val) => setImportType(val as ImportType)}
          >
            <SelectTrigger className="w-full h-11">
              <SelectValue placeholder="Choose import type..." />
            </SelectTrigger>
            <SelectContent>
              {importTypes.map((schema) => (
                <SelectItem key={schema.type} value={schema.type}>
                  <div className="flex items-center gap-2">
                    <span className={COLOR_MAP[schema.color]?.split(' ')[0] || 'text-gray-600'}>
                      {ICON_MAP[schema.icon]}
                    </span>
                    <span>{schema.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Import type cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
            {importTypes.map((schema) => {
              const isSelected = importType === schema.type;
              const colorClasses = COLOR_MAP[schema.color] || 'text-gray-600 bg-gray-50 border-gray-200';
              return (
                <button
                  key={schema.type}
                  onClick={() => setImportType(schema.type as ImportType)}
                  className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                    isSelected
                      ? `${colorClasses} border-2 shadow-sm`
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {ICON_MAP[schema.icon]}
                    <span className="font-medium text-sm">{schema.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{schema.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Drop Zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50 scale-[1.02]'
                : importType
                ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50'
                : 'border-gray-200 bg-gray-50/30'
            } ${!importType ? 'opacity-60 pointer-events-none' : ''}`}
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
                <Loader2 className="h-12 w-12 mx-auto text-blue-500 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Uploading {selectedFile?.name}...
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(selectedFile?.size || 0)}
                  </p>
                </div>
                <div className="max-w-xs mx-auto">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{Math.round(uploadProgress)}%</p>
                </div>
              </div>
            ) : isDragging ? (
              <div className="space-y-3">
                <Upload className="h-12 w-12 mx-auto text-blue-500 animate-bounce" />
                <p className="text-sm font-medium text-blue-600">Drop your file here</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Drag & drop your Excel file here
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    or click to browse &middot; Supports .xlsx, .xls, .csv &middot; Max 10 MB
                  </p>
                </div>
                {importType && (
                  <Button variant="outline" size="sm" className="mt-2">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
