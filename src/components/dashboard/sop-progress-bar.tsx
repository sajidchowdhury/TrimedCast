'use client';

// ============================================
// S&OP Lifecycle Progress Bar
// 4 stages: Validation → Approval → Ops → Governance
// Visual states: Inactive (grey), Current (pulsing), Completed (green), Overdue (red)
// ============================================

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, AlertTriangle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SopStage {
  id: string;
  label: string;
  description: string;
}

export const SOP_STAGES: SopStage[] = [
  { id: 'validation', label: 'Validation', description: 'Demand/Supply convergence to stress-test assumptions' },
  { id: 'approval', label: 'Executive Approval', description: 'CFO/COO authorize capital and priorities' },
  { id: 'operationalization', label: 'Operationalization', description: 'Transition to functional shop-floor KPIs' },
  { id: 'governance', label: 'Governance', description: 'Ongoing monitoring and compliance review' },
];

export type SopStageStatus = 'inactive' | 'current' | 'completed' | 'overdue';

interface SopProgressBarProps {
  currentStage?: string | null;
  cycleName?: string | null;
  rhythm?: 'monthly' | 'biweekly';
  onRhythmChange?: (rhythm: 'monthly' | 'biweekly') => void;
  className?: string;
}

function getStageStatuses(currentStage?: string | null): SopStageStatus[] {
  if (!currentStage) return ['inactive', 'inactive', 'inactive', 'inactive'];

  const stageIndex = SOP_STAGES.findIndex((s) => s.id === currentStage);
  if (stageIndex === -1) return ['inactive', 'inactive', 'inactive', 'inactive'];

  return SOP_STAGES.map((_, i) => {
    if (i < stageIndex) return 'completed';
    if (i === stageIndex) return 'current';
    return 'inactive';
  });
}

export function SopProgressBar({
  currentStage,
  cycleName,
  rhythm = 'monthly',
  onRhythmChange,
  className,
}: SopProgressBarProps) {
  const statuses = getStageStatuses(currentStage);

  return (
    <div className={cn('w-full', className)}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">S&OP Lifecycle</h3>
          {cycleName && (
            <span className="text-xs text-muted-foreground">— {cycleName}</span>
          )}
        </div>
        {/* Rhythm toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          <button
            onClick={() => onRhythmChange?.('monthly')}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-sm transition-all',
              rhythm === 'monthly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => onRhythmChange?.('biweekly')}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-sm transition-all',
              rhythm === 'biweekly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Bi-weekly
          </button>
        </div>
      </div>

      {/* Progress stages */}
      <div className="relative flex items-center justify-between">
        {SOP_STAGES.map((stage, i) => {
          const status = statuses[i];
          return (
            <div key={stage.id} className="flex flex-col items-center relative z-10 flex-1">
              {/* Stage node */}
              <motion.div
                initial={false}
                animate={{
                  scale: status === 'current' ? [1, 1.08, 1] : 1,
                }}
                transition={{
                  duration: 2,
                  repeat: status === 'current' ? Infinity : 0,
                  ease: 'easeInOut',
                }}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                  status === 'completed' && 'border-emerald-500 bg-emerald-500 text-white',
                  status === 'current' && 'border-amber-500 bg-amber-500/15 text-amber-600',
                  status === 'overdue' && 'border-red-500 bg-red-500/15 text-red-600',
                  status === 'inactive' && 'border-muted-foreground/30 bg-muted text-muted-foreground/50',
                )}
              >
                {status === 'completed' && <CheckCircle2 className="h-5 w-5" />}
                {status === 'current' && <Clock className="h-5 w-5" />}
                {status === 'overdue' && <AlertTriangle className="h-5 w-5" />}
                {status === 'inactive' && <Circle className="h-5 w-5" />}
              </motion.div>

              {/* Stage label */}
              <span
                className={cn(
                  'mt-2 text-xs font-medium text-center leading-tight max-w-[80px]',
                  status === 'completed' && 'text-emerald-600',
                  status === 'current' && 'text-amber-600',
                  status === 'overdue' && 'text-red-600',
                  status === 'inactive' && 'text-muted-foreground',
                )}
              >
                {stage.label}
              </span>

              {/* Connector line to next stage */}
              {i < SOP_STAGES.length - 1 && (
                <div
                  className={cn(
                    'absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-0.5',
                    statuses[i] === 'completed' && statuses[i + 1] !== 'inactive'
                      ? 'bg-emerald-500'
                      : 'bg-muted-foreground/20',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
