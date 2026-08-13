'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useETLStore } from '@/lib/etl/store';
import { IMPORT_TYPE_SCHEMAS, getAllFields, type ColumnMapping, type ImportType } from '@/lib/etl/import-types';
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Zap,
} from 'lucide-react';

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-emerald-600';
  if (confidence >= 0.6) return 'text-amber-600';
  return 'text-red-600';
}

function getConfidenceBg(confidence: number): string {
  if (confidence >= 0.8) return 'bg-emerald-100 text-emerald-700';
  if (confidence >= 0.6) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.95) return 'Exact';
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Medium';
  if (confidence > 0) return 'Low';
  return 'None';
}

interface ColumnMapperProps {
  onProceed: () => void;
}

export function ColumnMapper({ onProceed }: ColumnMapperProps) {
  const { uploadResult, mappings, setMappings, importType, currentImportId, setLoading, setError, isLoading } = useETLStore();
  const [showPreview, setShowPreview] = useState(false);
  const [isRemapping, setIsRemapping] = useState(false);

  const schema = useMemo(() => {
    if (!importType) return null;
    return IMPORT_TYPE_SCHEMAS[importType as ImportType] || null;
  }, [importType]);

  const allTargetFields = useMemo(() => schema ? getAllFields(schema) : [], [schema]);
  const requiredFieldNames = useMemo(() => schema ? schema.requiredFields.map((f) => f.field) : [], [schema]);

  const missingRequired = useMemo(() => {
    const mappedTargetFields = new Set(mappings.filter((m) => m.targetField).map((m) => m.targetField));
    return requiredFieldNames.filter((f) => !mappedTargetFields.has(f));
  }, [mappings, requiredFieldNames]);

  const lowConfidenceCount = useMemo(
    () => mappings.filter((m) => m.targetField && m.confidence < 0.6 && m.confidence > 0).length,
    [mappings]
  );

  const handleTargetChange = useCallback(
    (sourceColumn: string, newTarget: string) => {
      const updated = mappings.map((m) => {
        if (m.sourceColumn === sourceColumn) {
          const isRequired = requiredFieldNames.includes(newTarget);
          return {
            ...m,
            targetField: newTarget,
            confidence: newTarget ? 1.0 : 0,
            isRequired,
          };
        }
        return m;
      });
      setMappings(updated);
    },
    [mappings, requiredFieldNames, setMappings]
  );

  const handleAutoRemap = useCallback(async () => {
    if (!currentImportId) return;
    setIsRemapping(true);
    try {
      const res = await fetch(`/api/imports/${currentImportId}/map`, { method: 'GET' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.mappings) {
          setMappings(json.data.mappings);
        }
      }
    } catch {
      // Keep existing mappings
    } finally {
      setIsRemapping(false);
    }
  }, [currentImportId, setMappings]);

  const handleSaveAndProceed = useCallback(async () => {
    if (!currentImportId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/imports/${currentImportId}/map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save mapping');
      }
      onProceed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mapping');
    } finally {
      setLoading(false);
    }
  }, [currentImportId, mappings, onProceed, setLoading, setError]);

  if (!uploadResult || !importType || !schema) return null;

  const preview = uploadResult.preview || [];

  return (
    <div className="space-y-4">
      {/* Warnings */}
      {missingRequired.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Missing Required Fields</AlertTitle>
          <AlertDescription>
            The following required fields are not mapped:{' '}
            {missingRequired.map((f) => {
              const fieldDef = allTargetFields.find((fd) => fd.field === f);
              return (
                <Badge key={f} variant="destructive" className="mr-1 text-xs">
                  {fieldDef?.label || f}
                </Badge>
              );
            })}
          </AlertDescription>
        </Alert>
      )}

      {lowConfidenceCount > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Low Confidence Mappings</AlertTitle>
          <AlertDescription>
            {lowConfidenceCount} column(s) have low confidence scores. Consider reviewing and adjusting manually.
          </AlertDescription>
        </Alert>
      )}

      {/* Mapping Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Column Mapping</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoRemap}
              disabled={isRemapping}
            >
              {isRemapping ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-1" />
              )}
              Auto-Map
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Source Column</TableHead>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[200px]">Target Field</TableHead>
                <TableHead className="w-[100px]">Confidence</TableHead>
                <TableHead className="w-[80px]">Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => {
                return (
                  <TableRow key={mapping.sourceColumn}>
                    <TableCell className="font-mono text-sm">
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
                          {schema.requiredFields.map((f) => (
                            <SelectItem key={f.field} value={f.field}>
                              <span className="font-medium">{f.label}</span>
                              <span className="text-red-500 ml-1">*</span>
                            </SelectItem>
                          ))}
                          {schema.optionalFields.map((f) => (
                            <SelectItem key={f.field} value={f.field}>
                              <span className="text-gray-600">{f.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {mapping.targetField ? (
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getConfidenceBg(mapping.confidence)}`}
                        >
                          {getConfidenceLabel(mapping.confidence)} ({Math.round(mapping.confidence * 100)}%)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-gray-400">
                          Unmapped
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {mapping.isRequired ? (
                        <span className="text-red-500 text-xs font-medium">Required</span>
                      ) : mapping.targetField ? (
                        <span className="text-gray-400 text-xs">Optional</span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sample Data Preview */}
      <Collapsible open={showPreview} onOpenChange={setShowPreview}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Sample Data Preview ({preview.length} rows)
                </CardTitle>
                {showPreview ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="overflow-x-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {uploadResult.headers.map((h) => (
                        <TableHead key={h} className="text-xs font-mono whitespace-nowrap">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i}>
                        {uploadResult.headers.map((h) => (
                          <TableCell key={h} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                            {row[h] !== null && row[h] !== undefined ? String(row[h]) : '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Proceed Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveAndProceed}
          disabled={isLoading || missingRequired.length > 0}
          size="lg"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Validate Data
        </Button>
      </div>
    </div>
  );
}
