'use client';

// ============================================
// TrimedCast — Inbound Shipment Detail Sheet
// Session 25: Warehouse & Logistics Dashboard
// ============================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Truck,
  Anchor,
  ClipboardCheck,
  Archive,
  CheckCircle2,
  Globe,
  MapPin,
  Package,
  Building2,
  Hash,
  CalendarClock,
  Layers,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

import type { InboundShipment, InboundStatus } from '@/components/warehouse/types';
import {
  INBOUND_STATUS_CONFIG,
  getInboundStatusStep,
} from '@/components/warehouse/types';

// ─── Timeline Steps Configuration ───────────────────────────────────

const TIMELINE_STEPS: {
  key: InboundStatus;
  icon: React.ElementType;
  label: string;
  labelBn: string;
}[] = [
  { key: 'pending', icon: Clock, label: 'Pending', labelBn: 'পেন্ডিং' },
  { key: 'in-transit', icon: Truck, label: 'In Transit', labelBn: 'পথিমধ্যে' },
  { key: 'at-dock', icon: Anchor, label: 'At Dock', labelBn: 'ডকে আগত' },
  { key: 'receiving', icon: ClipboardCheck, label: 'Receiving', labelBn: 'গ্রহণ করছে' },
  { key: 'put-away', icon: Archive, label: 'Put Away', labelBn: 'সংরক্ষণ করছে' },
  { key: 'completed', icon: CheckCircle2, label: 'Completed', labelBn: 'সম্পন্ন' },
];

// ─── Mock Item Data ─────────────────────────────────────────────────

const MOCK_ITEMS = [
  { partName: 'Brake Pad Set (Front)', sku: 'BP-F-1001', qty: 200, unit: 'pcs' },
  { partName: 'Chain Sprocket Kit', sku: 'CS-K-2045', qty: 150, unit: 'sets' },
  { partName: 'Spark Plug (Iridium)', sku: 'SP-I-3088', qty: 500, unit: 'pcs' },
  { partName: 'Engine Oil Filter', sku: 'OF-E-4012', qty: 300, unit: 'pcs' },
];

// ─── Timestamp Generator ────────────────────────────────────────────

function generateTimestamps(currentStatus: InboundStatus): Record<string, string> {
  const base = new Date('2025-03-07T08:00:00+06:00');
  const steps: InboundStatus[] = [
    'pending',
    'in-transit',
    'at-dock',
    'receiving',
    'put-away',
    'completed',
  ];
  const currentIdx = steps.indexOf(currentStatus);
  const result: Record<string, string> = {};

  for (let i = 0; i <= currentIdx; i++) {
    const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
    result[steps[i]] = d.toLocaleString('en-BD', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return result;
}

// ─── Timeline Step Component ────────────────────────────────────────

function TimelineStep({
  step,
  stepIndex,
  currentStep,
  timestamps,
  isLast,
}: {
  step: (typeof TIMELINE_STEPS)[number];
  stepIndex: number;
  currentStep: number;
  timestamps: Record<string, string>;
  isLast: boolean;
}) {
  const stepNum = stepIndex + 1;
  const isCompleted = stepNum < currentStep;
  const isCurrent = stepNum === currentStep;
  const isFuture = stepNum > currentStep;
  const Icon = step.icon;
  const timestamp = timestamps[step.key];

  return (
    <div className="relative flex gap-3">
      {/* Vertical Line */}
      {!isLast && (
        <div
          className={`absolute left-[15px] top-[34px] h-[calc(100%-34px)] w-0.5 ${
            isCompleted ? 'bg-emerald-300' : 'bg-slate-200'
          }`}
        />
      )}

      {/* Icon Circle */}
      <div className="relative z-10 flex-shrink-0">
        {isCompleted ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
        ) : isCurrent ? (
          <motion.div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon className="h-4 w-4 text-amber-600" />
          </motion.div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
            <Icon className="h-4 w-4 text-slate-400" />
          </div>
        )}
      </div>

      {/* Label + Timestamp */}
      <div className="pb-6 pt-1">
        <p
          className={`text-sm font-medium ${
            isCompleted
              ? 'text-emerald-700'
              : isCurrent
                ? 'text-amber-700'
                : 'text-slate-400'
          }`}
        >
          {step.label}
        </p>
        <p
          className={`text-xs ${
            isCompleted
              ? 'text-emerald-500'
              : isCurrent
                ? 'text-amber-500'
                : 'text-slate-300'
          }`}
        >
          {step.labelBn}
        </p>
        {timestamp && (
          <p className="mt-0.5 text-xs text-slate-400">{timestamp}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

interface InboundDetailSheetProps {
  shipment: InboundShipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InboundDetailSheet({
  shipment,
  open,
  onOpenChange,
}: InboundDetailSheetProps) {
  const currentStep = shipment ? getInboundStatusStep(shipment.status) : 0;
  const timestamps = useMemo(
    () => (shipment ? generateTimestamps(shipment.status) : {}),
    [shipment],
  );
  const statusConfig = shipment ? INBOUND_STATUS_CONFIG[shipment.status] : null;

  if (!shipment) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg font-bold text-slate-900">
              {shipment.poNumber}
            </SheetTitle>
            {statusConfig && (
              <Badge
                variant="outline"
                className={`${statusConfig.color} ${statusConfig.bg} border-0 text-xs`}
              >
                {statusConfig.label}
              </Badge>
            )}
          </div>
          <SheetDescription className="text-sm text-slate-500">
            Inbound shipment detail
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="flex flex-col gap-5 pb-6">
            {/* Supplier Info */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Supplier Information
              </h3>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-800">
                  {shipment.supplierName}
                </p>
                <p className="text-xs text-slate-500">Supplier</p>
              </div>
            </section>

            <Separator />

            {/* Shipment Details */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Shipment Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Carrier */}
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                    <Truck className="h-3 w-3" />
                    <span className="text-xs">Carrier</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{shipment.carrier}</p>
                  <p className="text-xs text-slate-400">{shipment.carrierBn}</p>
                </div>

                {/* Origin */}
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                    {shipment.origin === 'domestic' ? (
                      <MapPin className="h-3 w-3" />
                    ) : (
                      <Globe className="h-3 w-3" />
                    )}
                    <span className="text-xs">Origin</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      shipment.origin === 'domestic'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-sky-200 bg-sky-50 text-sky-700'
                    }`}
                  >
                    {shipment.origin === 'domestic' ? 'Domestic' : 'International'}
                  </Badge>
                </div>

                {/* Port of Entry */}
                {shipment.origin === 'international' && shipment.portOfEntry && (
                  <div className="rounded-lg border border-slate-200 p-2.5">
                    <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                      <Anchor className="h-3 w-3" />
                      <span className="text-xs">Port of Entry</span>
                    </div>
                    <p className="text-sm font-medium text-slate-800">
                      {shipment.portOfEntry}
                    </p>
                  </div>
                )}

                {/* Warehouse */}
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                    <Building2 className="h-3 w-3" />
                    <span className="text-xs">Warehouse</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {shipment.warehouseCode}
                  </p>
                </div>

                {/* Pallet Count */}
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                    <Layers className="h-3 w-3" />
                    <span className="text-xs">Pallets</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {shipment.totalPallets}
                  </p>
                </div>

                {/* Tracking Number */}
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                    <Hash className="h-3 w-3" />
                    <span className="text-xs">Tracking</span>
                  </div>
                  <p className="text-sm font-medium text-teal-600">
                    {shipment.trackingNumber}
                  </p>
                </div>

                {/* ETA */}
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                    <CalendarClock className="h-3 w-3" />
                    <span className="text-xs">ETA</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(shipment.eta).toLocaleDateString('en-BD', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Timeline */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Shipment Timeline
              </h3>
              <div className="ml-1">
                {TIMELINE_STEPS.map((step, idx) => (
                  <TimelineStep
                    key={step.key}
                    step={step}
                    stepIndex={idx}
                    currentStep={currentStep}
                    timestamps={timestamps}
                    isLast={idx === TIMELINE_STEPS.length - 1}
                  />
                ))}
              </div>
            </section>

            <Separator />

            {/* Items List */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Items ({MOCK_ITEMS.length})
              </h3>
              <div className="flex flex-col gap-2">
                {MOCK_ITEMS.map((item, idx) => (
                  <motion.div
                    key={item.sku}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">
                        {item.partName}
                      </p>
                      <p className="text-xs text-slate-400">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-700">
                        {item.qty} {item.unit}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
