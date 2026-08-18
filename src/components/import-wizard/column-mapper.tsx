'use client';

// ============================================
// TrimedCast — Column Mapper
// Session 22: Column mapping interface
// ============================================

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type ColumnMapping,
  type ImportType,
  IMPORT_TYPE_CONFIG,
  TARGET_FIELDS,
} from './types';
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Zap,
  Loader2,
} from 'lucide-react';

function getConfidenceBadge(confidence: number) {
  if (confidence >= 0.8) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">
        High ({Math.round(confidence * 100)}%)
      </Badge>
    );
  }
  if (confidence >= 0.5) {
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">
        Medium ({Math.round(confidence * 100)}%)
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
      Low ({Math.round(confidence * 100)}%)
    </Badge>
  );
}

interface ColumnMapperProps {
  importType: ImportType;
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ColumnMapper({
  importType,
  mappings,
  onMappingsChange,
  onConfirm,
  isLoading = false,
}: ColumnMapperProps) {
  const typeConfig = IMPORT_TYPE_CONFIG[importType];
  const targetFields = TARGET_FIELDS[importType] || [];

  // Check for missing required fields
  const mappedTargetFields = new Set(mappings.filter((m) => m.targetField).map((m) => m.targetField));
  const missingRequired = targetFields
    .filter((f) => f.required && !mappedTargetFields.has(f.field))
    .map((f) => f.label);

  const handleTargetChange = (sourceColumn: string, newTarget: string) => {
    const updated = mappings.map((m) => {
      if (m.sourceColumn === sourceColumn) {
        const targetField = targetFields.find((f) => f.field === newTarget);
        return {
          ...m,
          targetField: newTarget,
          confidence: newTarget ? 1.0 : 0,
          isRequired: targetField?.required || false,
        };
      }
      return m;
    });
    onMappingsChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Header info */}
      {typeConfig && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Mapping columns for {typeConfig.label}
                </p>
                <p className="text-xs text-gray-500">
                  {mappings.length} source columns detected &middot; {targetFields.filter((f) => f.required).length} required fields
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing required fields warning */}
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Missing required fields</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {missingRequired.join(', ')} — please map these before proceeding
            </p>
          </div>
        </div>
      )}

      {/* Mapping Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Column Mapping</CardTitle>
          <CardDescription>
            Auto-detected mappings shown below. Override any mapping by selecting a different target field.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Source Column</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="min-w-[160px]">Target Field</TableHead>
                  <TableHead className="w-[110px]">Confidence</TableHead>
                  <TableHead className="min-w-[120px]">Sample Values</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.sourceColumn}>
                    <TableCell className="font-mono text-sm font-medium">
                      {mapping.sourceColumn}
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.targetField || '__none__'}
                        onValueChange={(val) =>
                          handleTargetChange(
                            mapping.sourceColumn,
                            val === '__none__' ? '' : val
                          )
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-gray-400">-- Skip --</span>
                          </SelectItem>
                          {targetFields.map((f) => (
                            <SelectItem key={f.field} value={f.field}>
                              <span className={f.required ? 'font-medium' : 'text-gray-600'}>
                                {f.label}
                              </span>
                              {f.required && <span className="text-red-500 ml-1">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {mapping.targetField ? (
                        getConfidenceBadge(mapping.confidence)
                      ) : (
                        <Badge variant="outline" className="text-xs text-gray-400">
                          Unmapped
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {mapping.sampleValues.slice(0, 3).map((v, i) => (
                          <code
                            key={i}
                            className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                          >
                            {v.length > 12 ? v.substring(0, 12) + '...' : v}
                          </code>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirm button */}
      <div className="flex justify-end">
        <Button
          onClick={onConfirm}
          disabled={isLoading || missingRequired.length > 0}
          size="lg"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Confirm Mapping
        </Button>
      </div>
    </div>
  );
}
