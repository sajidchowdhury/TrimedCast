'use client';

// ============================================
// Import Page — ETL pipeline workflow
// Upload → Map → Validate → Harmonize → Insert
// ============================================

import { useETLStore } from '@/lib/etl/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UploadZone } from '@/components/etl/upload-zone';
import { ColumnMapper } from '@/components/etl/column-mapper';
import { ValidationResults } from '@/components/etl/validation-results';
import { HarmonizationLog } from '@/components/etl/harmonization-log';
import { QualityBadge } from '@/components/etl/quality-badge';
import { ImportProgress } from '@/components/etl/import-progress';
import { ImportHistory } from '@/components/etl/import-history';
import { Upload, FileSpreadsheet, CheckCircle2, ArrowRight, Database } from 'lucide-react';
import { IMPORT_TYPE_SCHEMAS } from '@/lib/etl/import-types';

export function ImportPage() {
  const store = useETLStore();

  const steps = [
    { label: 'Upload', icon: Upload, done: !!store.parsedData },
    { label: 'Map Columns', icon: FileSpreadsheet, done: !!store.columnMapping },
    { label: 'Validate', icon: CheckCircle2, done: !!store.validationResult },
    { label: 'Harmonize', icon: ArrowRight, done: !!store.harmonizationResult },
    { label: 'Insert', icon: Database, done: !!store.insertionResult },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5 text-sky-500" />
            Data Import Pipeline
          </h2>
          <p className="text-sm text-muted-foreground">Upload, map, validate, harmonize, and insert Excel data</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              step.done
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-muted text-muted-foreground'
            }`}>
              <step.icon className="h-3 w-3" />
              {step.label}
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Import types info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.keys(IMPORT_TYPE_SCHEMAS).map((type) => (
          <Card key={type} className="p-2">
            <CardContent className="p-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium capitalize">{type.replace('_', ' ')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload zone */}
      <UploadZone />

      {/* Column mapper */}
      {store.parsedData && !store.columnMapping && <ColumnMapper />}

      {/* Validation results */}
      {store.validationResult && <ValidationResults />}

      {/* Harmonization log */}
      {store.harmonizationResult && <HarmonizationLog />}

      {/* Quality badge */}
      {store.qualityScore !== null && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Quality Score:</span>
          <QualityBadge score={store.qualityScore} />
        </div>
      )}

      {/* Import history */}
      <ImportHistory />
    </div>
  );
}
