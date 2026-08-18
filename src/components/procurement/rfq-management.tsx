'use client';

// ============================================
// TrimedCast — RFQ (Request for Quotation) Management
// Session 27: RFQ Cards, Status Pipeline, Expand/Collapse Details
// ============================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Send,
  ClipboardCheck,
  Award,
  XCircle,
  Clock,
  AlertTriangle,
  Package,
  MessageSquare,
  CheckCircle2,
  Circle,
  Loader2,
  User,
} from 'lucide-react';
import type { RFQ, RFQStatus, RFQItem, RFQResponse } from '@/components/procurement/types';
import { RFQ_STATUS_CONFIG, formatBDT } from '@/components/procurement/types';
import { useProcurementStore } from '@/stores/procurement-store';

// ─── Status Pipeline Steps ──────────────────────────────────────────────

const PIPELINE_STEPS: { key: RFQStatus; label: string; labelBn: string }[] = [
  { key: 'draft', label: 'Draft', labelBn: 'খসড়া' },
  { key: 'sent', label: 'Sent', labelBn: 'প্রেরিত' },
  { key: 'responses-received', label: 'Responses', labelBn: 'প্রতিক্রিয়া' },
  { key: 'evaluation', label: 'Evaluation', labelBn: 'মূল্যায়ন' },
  { key: 'awarded', label: 'Awarded', labelBn: 'প্রদানকৃত' },
];

// ─── Helpers ────────────────────────────────────────────────────────────

function getDaysUntilDeadline(deadline: string): number {
  const now = new Date();
  const dl = new Date(deadline);
  return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusBadgeClasses(status: RFQStatus): string {
  const config = RFQ_STATUS_CONFIG[status];
  return `${config.bgColor} ${config.color} border ${config.borderColor}`;
}

// ─── Status Pipeline Stepper ────────────────────────────────────────────

function StatusPipeline({ currentStatus }: { currentStatus: RFQStatus }) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="flex items-center gap-1.5">
        <XCircle className="h-4 w-4 text-rose-500" />
        <span className="text-xs font-medium text-rose-600">Cancelled / বাতিল</span>
      </div>
    );
  }

  const currentStep = RFQ_STATUS_CONFIG[currentStatus].step;

  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {PIPELINE_STEPS.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isFuture = stepNum > currentStep;

        return (
          <div key={step.key} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center min-w-[52px]">
              <div
                className={`
                  flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all
                  ${isCompleted ? 'bg-emerald-500 text-white' : ''}
                  ${isCurrent ? 'bg-sky-500 text-white ring-2 ring-sky-200' : ''}
                  ${isFuture ? 'bg-slate-100 text-slate-400' : ''}
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`
                  text-[9px] mt-0.5 whitespace-nowrap
                  ${isCompleted ? 'text-emerald-600 font-medium' : ''}
                  ${isCurrent ? 'text-sky-700 font-semibold' : ''}
                  ${isFuture ? 'text-slate-400' : ''}
                `}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {idx < PIPELINE_STEPS.length - 1 && (
              <div
                className={`
                  h-0.5 w-4 -mt-3
                  ${isCompleted ? 'bg-emerald-400' : 'bg-slate-200'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── RFQ Items Table ────────────────────────────────────────────────────

function RFQItemsTable({ items }: { items: RFQItem[] }) {
  return (
    <div className="mt-3">
      <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
        <Package className="h-3.5 w-3.5 text-slate-500" />
        Items ({items.length})
      </h4>
      <div className="rounded-md border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs">Part Name</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Specifications</TableHead>
              <TableHead className="text-xs text-right">Qty</TableHead>
              <TableHead className="text-xs text-right">Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="hover:bg-slate-50/50">
                <TableCell className="text-xs">
                  <div className="font-medium text-slate-800">{item.partName}</div>
                  <div className="text-slate-500 text-[10px]">{item.partNameBn}</div>
                </TableCell>
                <TableCell className="text-xs text-slate-600 hidden sm:table-cell max-w-[200px] truncate">
                  {item.specifications}
                </TableCell>
                <TableCell className="text-xs text-right font-medium text-slate-700">
                  {item.quantity.toLocaleString()}
                </TableCell>
                <TableCell className="text-xs text-right text-slate-500">
                  {item.unit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── RFQ Responses Table ────────────────────────────────────────────────

function RFQResponsesTable({
  responses,
  awardedSupplierId,
}: {
  responses: RFQResponse[];
  awardedSupplierId?: string;
}) {
  if (responses.length === 0) {
    return (
      <div className="mt-3 text-sm text-slate-400 italic flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" />
        No responses received yet
      </div>
    );
  }

  return (
    <div className="mt-3">
      <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
        Supplier Responses ({responses.length})
      </h4>
      <div className="rounded-md border border-slate-200 overflow-hidden">
        <ScrollArea className="max-h-64">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs">Supplier</TableHead>
                <TableHead className="text-xs text-right">Total Amount</TableHead>
                <TableHead className="text-xs text-right hidden sm:table-cell">Lead Time</TableHead>
                <TableHead className="text-xs text-right hidden md:table-cell">MOQ</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((resp) => {
                const isAwarded = awardedSupplierId === resp.supplierId;
                const isRecommended = resp.isRecommended;
                const rowClasses = isAwarded
                  ? 'bg-emerald-50 hover:bg-emerald-50/80 border-l-2 border-l-emerald-500'
                  : isRecommended
                    ? 'bg-sky-50/50 hover:bg-sky-50/30'
                    : 'hover:bg-slate-50/50';

                return (
                  <TableRow key={resp.id} className={rowClasses}>
                    <TableCell className="text-xs">
                      <div className="font-medium text-slate-800">{resp.supplierName}</div>
                      {isAwarded && (
                        <span className="text-[10px] text-emerald-600 font-medium">Awarded</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right font-semibold text-slate-800">
                      {formatBDT(resp.totalAmount)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-slate-600 hidden sm:table-cell">
                      {resp.items[0]?.leadTimeDays ?? '—'} days
                    </TableCell>
                    <TableCell className="text-xs text-right text-slate-600 hidden md:table-cell">
                      {resp.items[0]?.moq.toLocaleString() ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      {isRecommended && (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] px-1.5">
                          Recommended
                        </Badge>
                      )}
                      {isAwarded && !isRecommended && (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] px-1.5">
                          Awarded
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}

// ─── Action Buttons (context-sensitive) ─────────────────────────────────

function RFQActions({ rfq }: { rfq: RFQ }) {
  const actions: {
    label: string;
    labelBn: string;
    icon: React.ReactNode;
    variant: 'default' | 'outline' | 'destructive' | 'secondary';
    className: string;
    show: boolean;
  }[] = [
    {
      label: 'Send RFQ',
      labelBn: 'প্রেরণ',
      icon: <Send className="h-3.5 w-3.5" />,
      variant: 'default',
      className: 'bg-sky-600 hover:bg-sky-700 text-white',
      show: rfq.status === 'draft',
    },
    {
      label: 'Evaluate',
      labelBn: 'মূল্যায়ন',
      icon: <ClipboardCheck className="h-3.5 w-3.5" />,
      variant: 'default',
      className: 'bg-purple-600 hover:bg-purple-700 text-white',
      show: rfq.status === 'responses-received',
    },
    {
      label: 'Award',
      labelBn: 'প্রদান',
      icon: <Award className="h-3.5 w-3.5" />,
      variant: 'default',
      className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      show: rfq.status === 'evaluation',
    },
    {
      label: 'Cancel',
      labelBn: 'বাতিল',
      icon: <XCircle className="h-3.5 w-3.5" />,
      variant: 'outline',
      className: 'text-rose-600 border-rose-300 hover:bg-rose-50',
      show: rfq.status !== 'awarded' && rfq.status !== 'cancelled',
    },
  ];

  const visibleActions = actions.filter((a) => a.show);

  if (visibleActions.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {visibleActions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          size="sm"
          className={`h-8 text-xs gap-1.5 ${action.className}`}
        >
          {action.icon}
          {action.label}
          <span className="text-[9px] opacity-70 hidden sm:inline">/ {action.labelBn}</span>
        </Button>
      ))}
    </div>
  );
}

// ─── Single RFQ Card ────────────────────────────────────────────────────

function RFQCard({
  rfq,
  isExpanded,
  onToggle,
}: {
  rfq: RFQ;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const daysUntilDeadline = getDaysUntilDeadline(rfq.deadline);
  const isClosingSoon = daysUntilDeadline >= 0 && daysUntilDeadline < 3;
  const isOverdue = daysUntilDeadline < 0;
  const statusConfig = RFQ_STATUS_CONFIG[rfq.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {/* ── Card Header ── */}
        <CardHeader className="pb-3 cursor-pointer" onClick={onToggle}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* RFQ ID badge */}
                <Badge className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-mono px-1.5">
                  {rfq.id}
                </Badge>
                {/* Title */}
                <CardTitle className="text-sm font-semibold text-slate-800 truncate">
                  {rfq.title}
                </CardTitle>
                {/* Category badge */}
                <Badge
                  className={`${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor} text-[10px] px-1.5`}
                >
                  {rfq.category}
                </Badge>
              </div>

              {/* Status pipeline */}
              <div className="mt-2.5">
                <StatusPipeline currentStatus={rfq.status} />
              </div>
            </div>

            {/* Expand/collapse icon */}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="mt-1 flex-shrink-0"
            >
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </motion.div>
          </div>

          {/* Meta row: dates, counts, awarded info */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
            {/* Created date */}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Created: {formatShortDate(rfq.createdAt)}
            </span>

            {/* Deadline */}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Deadline: {formatShortDate(rfq.deadline)}
              {isClosingSoon && (
                <Badge className="bg-amber-50 text-amber-700 border border-amber-300 text-[9px] px-1 ml-0.5">
                  Closing Soon
                </Badge>
              )}
              {isOverdue && (
                <Badge className="bg-rose-50 text-rose-700 border border-rose-300 text-[9px] px-1 ml-0.5">
                  Overdue
                </Badge>
              )}
            </span>

            {/* Item count */}
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {rfq.items.length} item{rfq.items.length !== 1 ? 's' : ''}
            </span>

            {/* Response count */}
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {rfq.responses.length} response{rfq.responses.length !== 1 ? 's' : ''}
            </span>

            {/* Awarded supplier info */}
            {rfq.status === 'awarded' && rfq.awardedSupplierId && (
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <Award className="h-3 w-3" />
                Awarded: {rfq.responses.find((r) => r.supplierId === rfq.awardedSupplierId)?.supplierName ?? rfq.awardedSupplierId}
                {rfq.awardedAmount && (
                  <span className="font-semibold">({formatBDT(rfq.awardedAmount)})</span>
                )}
              </span>
            )}
          </div>
        </CardHeader>

        {/* ── Expanded Details ── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 pb-4">
                <Separator className="mb-3" />

                {/* Items table */}
                <RFQItemsTable items={rfq.items} />

                {/* Responses table */}
                {rfq.responses.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <RFQResponsesTable
                      responses={rfq.responses}
                      awardedSupplierId={rfq.awardedSupplierId}
                    />
                  </>
                )}

                {/* Action buttons */}
                <Separator className="my-3" />
                <RFQActions rfq={rfq} />
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── Main RFQ Management Component ──────────────────────────────────────

export function RFQManagement() {
  const { rfqs, fetchRFQs } = useProcurementStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch on mount if empty
  useEffect(() => {
    if (rfqs.length === 0) {
      fetchRFQs();
    }
  }, [rfqs.length, fetchRFQs]);

  const activeRFQCount = rfqs.filter(
    (r) => r.status !== 'cancelled' && r.status !== 'awarded'
  ).length;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-bold text-slate-800">
            Request for Quotation
          </h2>
          <span className="text-sm text-slate-500">/ দরপত্র অনুরোধ</span>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-0.5 text-xs font-semibold">
          {activeRFQCount} Active RFQ{activeRFQCount !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* ── RFQ Cards List ── */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {rfqs.map((rfq) => (
            <RFQCard
              key={rfq.id}
              rfq={rfq}
              isExpanded={expandedId === rfq.id}
              onToggle={() => toggleExpand(rfq.id)}
            />
          ))}
        </AnimatePresence>

        {rfqs.length === 0 && (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading RFQs...
          </div>
        )}
      </div>
    </div>
  );
}

export default RFQManagement;
