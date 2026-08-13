'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useETLStore } from '@/lib/etl/store';
import {
  Upload,
  ArrowRightLeft,
  ShieldCheck,
  Sparkles,
  Database,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
} from 'lucide-react';

const STEPS = [
  { label: 'Upload', icon: Upload },
  { label: 'Map', icon: ArrowRightLeft },
  { label: 'Validate', icon: ShieldCheck },
  { label: 'Harmonize', icon: Sparkles },
  { label: 'Insert', icon: Database },
  { label: 'Complete', icon: CheckCircle2 },
];

interface ImportProgressProps {
  children?: React.ReactNode;
}

export function ImportProgress({ children }: ImportProgressProps) {
  const { currentStep } = useETLStore();

  const overallProgress = ((currentStep) / (STEPS.length - 1)) * 100;

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between relative">
            {/* Background line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
            {/* Progress line */}
            <div
              className="absolute top-5 left-0 h-0.5 bg-blue-500 transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />

            {STEPS.map((step, index) => {
              const isDone = index < currentStep;
              const isActive = index === currentStep;
              const isPending = index > currentStep;

              const Icon = step.icon;

              return (
                <div key={index} className="relative flex flex-col items-center z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isDone
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : isActive
                        ? 'bg-white border-blue-500 text-blue-500 shadow-md shadow-blue-200'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : isActive ? (
                      <Icon className="h-5 w-5 animate-pulse" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1.5 font-medium ${
                      isDone ? 'text-blue-600' : isActive ? 'text-blue-500' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Overall progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Overall Progress</span>
              <span className="text-xs font-medium text-gray-700">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Stage Content */}
      {children && <div>{children}</div>}
    </div>
  );
}
