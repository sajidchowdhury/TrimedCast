'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useETLStore } from '@/lib/etl/store';
import { type HarmonizationStep } from '@/lib/etl/import-types';
import {
  CheckCircle2,
  Loader2,
  Circle,
  ArrowRight,
  Scissors,
  Calendar,
  Tag,
  Ruler,
  CopyX,
  Sparkles,
} from 'lucide-react';

const STEP_ICONS: Record<number, React.ReactNode> = {
  1: <Scissors className="h-4 w-4" />,
  2: <Calendar className="h-4 w-4" />,
  3: <Tag className="h-4 w-4" />,
  4: <Ruler className="h-4 w-4" />,
  5: <CopyX className="h-4 w-4" />,
  6: <Sparkles className="h-4 w-4" />,
};

function StepStatusIcon({ step, totalSteps }: { step: number; totalSteps: number }) {
  // All steps are "done" since harmonization runs synchronously
  return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
}

interface HarmonizationLogProps {
  onProceed: () => void;
}

export function HarmonizationLog({ onProceed }: HarmonizationLogProps) {
  const { harmonizationResult, isLoading } = useETLStore();

  if (!harmonizationResult) return null;

  const { log, stats } = harmonizationResult;

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Harmonization Pipeline (6 Steps)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-0">
              {log.map((step, index) => (
                <div key={step.step} className="relative pl-10 pb-4">
                  {/* Step circle */}
                  <div className="absolute left-[10px] top-0 w-[18px] h-[18px] rounded-full bg-emerald-100 flex items-center justify-center ring-2 ring-white">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-400">{STEP_ICONS[step.step]}</span>
                      <h4 className="font-medium text-sm text-gray-800">
                        Step {step.step}: {step.name}
                      </h4>
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                        Done
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-mono">{step.input}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{step.output}</span>
                    </div>
                    {/* Show changes if any */}
                    {Object.keys(step.changes).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        {Object.entries(step.changes).map(([key, val]) => {
                          const change = val as { before: unknown; after: unknown };
                          return (
                            <span key={key} className="inline-flex items-center gap-1 mr-3">
                              <span className="font-mono">{key}:</span>
                              <span className="font-medium text-gray-700">{String(change.after)}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600">Harmonization Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="text-center p-2">
              <div className="text-lg font-bold text-gray-700">{stats.fieldsNormalized}</div>
              <div className="text-xs text-gray-500">Fields Normalized</div>
            </div>
            <div className="text-center p-2">
              <div className="text-lg font-bold text-gray-700">{stats.datesNormalized}</div>
              <div className="text-xs text-gray-500">Dates Fixed</div>
            </div>
            <div className="text-center p-2">
              <div className="text-lg font-bold text-gray-700">{stats.categoriesMapped}</div>
              <div className="text-xs text-gray-500">Categories Mapped</div>
            </div>
            <div className="text-center p-2">
              <div className="text-lg font-bold text-red-600">{stats.duplicatesRemoved}</div>
              <div className="text-xs text-gray-500">Duplicates Removed</div>
            </div>
            <div className="text-center p-2">
              <div className="text-lg font-bold text-emerald-600">{stats.outputRows}</div>
              <div className="text-xs text-gray-500">Output Rows</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proceed Button */}
      <div className="flex justify-end">
        <Button onClick={onProceed} disabled={isLoading} size="lg">
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Insert Data
        </Button>
      </div>
    </div>
  );
}

// Re-export CheckCircle2 for the import
export { CheckCircle2, Loader2 };
