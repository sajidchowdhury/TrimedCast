'use client';

// ============================================
// TrimedCast — Outbound Shipment Detail Sheet
// Session 25: Warehouse & Logistics Dashboard
// ============================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  CheckCircle2,
  Send,
  Truck,
  MapPin,
  XCircle,
  AlertCircle,
  Building2,
  Hash,
  CalendarClock,
  Weight,
  Phone,
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

import type { OutboundShipment, OutboundStatus } from '@/components/warehouse/types';
import {
  OUTBOUND_STATUS_CONFIG,
  COURIER_PARTNERS,
  getOutboundStatusStep,
} from '@/components/warehouse/types';

// ─── Timeline Steps Configuration ───────────────────────────────────

const TIMELINE_STEPS: {
  key: OutboundStatus;
  icon: React.ElementType;
  label: string;
  labelBn: string;
}[] = [
  { key: 'pick-pack', icon: ClipboardList, label: 'Pick & Pack', labelBn: 'পিক ও প্যাক' },
  { key: 'ready', icon: CheckCircle2, label: 'Ready', labelBn: 'প্রস্তুত' },
  { key: 'dispatched', icon: Send, label: 'Dispatched', labelBn: 'প্রেরিত' },
  { key: 'in-transit', icon: Truck, label: 'In Transit', labelBn: 'পথিমধ্যে' },
  { key: 'out-for-delivery', icon: MapPin, label: 'Out for Delivery', labelBn: 'ডেলিভারি পথে' },
  { key: 'delivered', icon: CheckCircle2, label: 'Delivered', labelBn: 'ডেলিভার্ড' },
];

// ─── Mock Item Data ─────────────────────────────────────────────────

const MOCK_ITEMS = [
  { partName: 'Brake Lever Assembly', sku: 'BL-A-5023', qty: 50, weight: 2.4 },
  { partName: 'Headlight Bulb (H4)', sku: 'HB-H-1078', qty: 100, weight: 0.15 },
  { partName: 'Rear Shock Absorber', sku: 'RS-S-3091', qty: 30, weight: 3.8 },
  { partName: 'Fuel Tank Cap', sku: 'FC-T-7055', qty: 80, weight: 0.5 },
];

// ─── Timestamp Generator ────────────────────────────────────────────

function generateTimestamps(currentStatus: OutboundStatus): Record<string, string> {
  if (currentStatus === 'failed') {
    return {
      'pick-pack': 'Mar 7, 09:00 AM',
      ready: 'Mar 7, 11:30 AM',
      dispatched: 'Mar 7, 02:00 PM',
      'in-transit': 'Mar 8, 06:00 AM',
      'out-for-delivery': 'Mar 9, 10:00 AM',
      delivered: '',
    };
  }

  const base = new Date('2025-03-08T07:00:00+06:00');
  const steps: OutboundStatus[] = [
    'pick-pack',
    'ready',
    'dispatched',
    'in-transit',
    'out-for-delivery',
    'delivered',
  ];
  const currentIdx = steps.indexOf(currentStatus);
  const result: Record<string, string> = {};

  for (let i = 0; i <= currentIdx; i++) {
    const d = new Date(base.getTime() + i * 12 * 60 * 60 * 1000);
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

interface OutboundDetailSheetProps {
  shipment: OutboundShipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OutboundDetailSheet({
  shipment,
  open,
  onOpenChange,
}: OutboundDetailSheetProps) {
  const isFailed = shipment?.status === 'failed';
  const currentStep = shipment ? getOutboundStatusStep(shipment.status) : 0;
  // For failed, show the step before failure (out-for-delivery was attempted)
  const effectiveStep = isFailed ? 5 : currentStep;
  const timestamps = useMemo(
    () => (shipment ? generateTimestamps(shipment.status) : {}),
    [shipment],
  );
  const statusConfig = shipment ? OUTBOUND_STATUS_CONFIG[shipment.status] : null;
  const courier = shipment
    ? COURIER_PARTNERS.find((c) => c.name === shipment.courier)
    : null;

  if (!shipment) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg font-bold text-slate-900">
              {shipment.orderNumber}
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
            Outbound shipment detail
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="flex flex-col gap-5 pb-6">
            {/* Failed Alert Banner */}
            {isFailed && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3"
              >
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-semibold text-red-700">Delivery Failed</p>
                </div>
                <p className="text-xs text-red-600">
                  Address verification required — customer was not reachable at the provided address.
                  Contact the courier or customer to resolve.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit border-red-300 text-red-700 hover:bg-red-100"
                >
                  <Phone className="mr-1.5 h-3.5 w-3.5" />
                  Contact Courier
                </Button>
              </motion.div>
            )}

            {/* Customer Info */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Customer Information
              </h3>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-800">
                  {shipment.customerName}
                </p>
                <p className="text-xs text-slate-500">Customer</p>
              </div>
            </section>

            <Separator />

            {/* Shipment Details */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Shipment Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Courier */}
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                    <Truck className="h-3 w-3" />
                    <span className="text-xs">Courier</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{shipment.courier}</p>
                  <p className="text-xs text-slate-400">{shipment.courierBn}</p>
                  {courier && (
                    <Badge
                      variant="outline"
                      className="mt-1 text-xs"
                      style={{
                        borderColor: courier.logoColor,
                        color: courier.logoColor,
                      }}
                    >
                      {courier.type}
                    </Badge>
                  )}
                </div>

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

                {/* Destination */}
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs">Destination</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {shipment.destinationCity}
                  </p>
                  <p className="text-xs text-slate-400">{shipment.destinationCityBn}</p>
                </div>

                {/* Weight */}
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                    <Weight className="h-3 w-3" />
                    <span className="text-xs">Total Weight</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {shipment.totalWeight} kg
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

              {/* Failed step (if applicable) */}
              {isFailed && (
                <div className="mb-3 ml-1">
                  <div className="relative flex gap-3">
                    <div className="relative z-10 flex-shrink-0">
                      <motion.div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <XCircle className="h-4 w-4 text-red-600" />
                      </motion.div>
                    </div>
                    <div className="pb-2 pt-1">
                      <p className="text-sm font-medium text-red-700">Failed</p>
                      <p className="text-xs text-red-400">ব্যর্থ</p>
                      <p className="mt-0.5 text-xs text-slate-400">Mar 9, 04:00 PM</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="ml-1">
                {TIMELINE_STEPS.map((step, idx) => (
                  <TimelineStep
                    key={step.key}
                    step={step}
                    stepIndex={idx}
                    currentStep={effectiveStep}
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
                        {item.qty} pcs
                      </p>
                      <p className="text-xs text-slate-400">{item.weight} kg</p>
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
