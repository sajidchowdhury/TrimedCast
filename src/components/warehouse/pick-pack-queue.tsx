'use client';

// ============================================
// TrimedCast — Pick & Pack Job Queue
// Session 25: Warehouse & Logistics Dashboard
// ============================================

import { motion } from 'framer-motion';
import {
  Clock,
  Package,
  User,
  ShoppingCart,
  CheckCircle2,
  Circle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import type { PickPackJob, PickPackStatus, PickPackPriority } from '@/components/warehouse/types';
import {
  PICK_PACK_PRIORITY_CONFIG,
  PICK_PACK_STATUS_CONFIG,
} from '@/components/warehouse/types';
import { useWarehouseStore, usePendingPickPackCount } from '@/stores/warehouse-store';

// ─── Animation Variants ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

// ─── Status Stepper Steps ──────────────────────────────────────────

const STEPPER_STEPS: { key: PickPackStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'picking', label: 'Picking' },
  { key: 'packed', label: 'Packed' },
  { key: 'ready', label: 'Ready' },
  { key: 'qc-check', label: 'QC Check' },
];

function getStepIndex(status: PickPackStatus): number {
  return STEPPER_STEPS.findIndex((s) => s.key === status);
}

// ─── Status Stepper ────────────────────────────────────────────────

function StatusStepper({ currentStatus }: { currentStatus: PickPackStatus }) {
  const currentIdx = getStepIndex(currentStatus);

  return (
    <div className="flex items-center gap-0 w-full">
      {STEPPER_STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center h-5 w-5 rounded-full text-[9px] font-medium shrink-0 ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                      ? 'bg-slate-800 text-white ring-2 ring-slate-300'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : isCurrent ? (
                  <span>{idx + 1}</span>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              {/* Step Label (hidden on mobile) */}
              <span
                className={`mt-0.5 text-[9px] whitespace-nowrap ${
                  isCurrent
                    ? 'text-slate-800 font-semibold'
                    : isCompleted
                      ? 'text-emerald-600'
                      : 'text-slate-400'
                } hidden sm:block`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {idx < STEPPER_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-0.5 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Priority Badge ────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: PickPackPriority }) {
  const config = PICK_PACK_PRIORITY_CONFIG[priority];

  return (
    <Badge
      className={`text-[10px] ${config.color} ${config.bg} border ${config.border} ${
        priority === 'urgent' ? 'animate-pulse' : ''
      }`}
    >
      {config.label}
    </Badge>
  );
}

// ─── Timestamp Display ─────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-BD', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

// ─── Job Card ──────────────────────────────────────────────────────

function JobCard({ job }: { job: PickPackJob }) {
  const statusConfig = PICK_PACK_STATUS_CONFIG[job.status];

  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4 space-y-3">
          {/* ── Top Row: Job ID + Order ID + Priority ──────────── */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="outline" className="shrink-0 text-[10px] font-mono">
                {job.id.toUpperCase()}
              </Badge>
              <span className="text-xs text-slate-600 truncate">
                <ShoppingCart className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                {job.orderId}
              </span>
            </div>
            <PriorityBadge priority={job.priority} />
          </div>

          {/* ── Second Row: Assigned + Items + Status ──────────── */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <User className="h-3 w-3" />
              <span>{job.assignedTo}</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              <Package className="h-2.5 w-2.5 mr-0.5" />
              {job.itemCount} items
            </Badge>
            <Badge className={`text-[10px] ${statusConfig.color} ${statusConfig.bg}`}>
              {statusConfig.label}
            </Badge>
          </div>

          <Separator />

          {/* ── Status Stepper ─────────────────────────────────── */}
          <StatusStepper currentStatus={job.status} />

          {/* ── Timestamps ─────────────────────────────────────── */}
          {(job.startedAt || job.completedAt) && (
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              {job.startedAt && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Started: {formatTimestamp(job.startedAt)}</span>
                </div>
              )}
              {job.completedAt && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>Completed: {formatTimestamp(job.completedAt)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function PickPackQueue() {
  const pickPackJobs = useWarehouseStore((s) => s.pickPackJobs);
  const pendingCount = usePendingPickPackCount();

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Pick & Pack Queue</h2>
        <Badge variant="secondary" className="text-xs">
          {pendingCount} pending
        </Badge>
      </div>
      <p className="text-sm text-slate-500 -mt-2">পিক অ্যান্ড প্যাক কিউ</p>

      {/* ── Job Cards List ───────────────────────────────────── */}
      {pickPackJobs.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {pickPackJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </motion.div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Package className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No pick & pack jobs</p>
            <p className="text-xs text-slate-400 mt-0.5">কোনো পিক অ্যান্ড প্যাক কাজ নেই</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
