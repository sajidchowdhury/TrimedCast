'use client';

// ============================================
// TrimedCast — Live Last-Mile Delivery Tracker
// Session 25: Warehouse & Logistics Dashboard
// ============================================

import { motion } from 'framer-motion';
import {
  Truck,
  Bike,
  CheckCircle,
  XCircle,
  MapPin,
  Clock,
  ExternalLink,
  Package,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useWarehouseStore } from '@/stores/warehouse-store';
import type { DeliveryStatus, OutboundStatus, DeliveryStatusUpdate } from '@/components/warehouse/types';

// ─── Animation Variants ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: 'easeOut' },
  },
};

// ─── Status Icon Configuration ─────────────────────────────────────

const STATUS_ICON_CONFIG: Record<
  string,
  { icon: React.ElementType; colorClass: string; bgClass: string; label: string; labelBn: string }
> = {
  'in-transit': {
    icon: Truck,
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    label: 'In Transit',
    labelBn: 'পথিমধ্যে',
  },
  'out-for-delivery': {
    icon: Bike,
    colorClass: 'text-sky-600',
    bgClass: 'bg-sky-50',
    label: 'Out for Delivery',
    labelBn: 'ডেলিভারি পথে',
  },
  delivered: {
    icon: CheckCircle,
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50',
    label: 'Delivered',
    labelBn: 'ডেলিভার্ড',
  },
  failed: {
    icon: XCircle,
    colorClass: 'text-red-600',
    bgClass: 'bg-red-50',
    label: 'Failed',
    labelBn: 'ব্যর্থ',
  },
  dispatched: {
    icon: Truck,
    colorClass: 'text-violet-600',
    bgClass: 'bg-violet-50',
    label: 'Dispatched',
    labelBn: 'প্রেরিত',
  },
};

function getStatusConfig(status: OutboundStatus) {
  return (
    STATUS_ICON_CONFIG[status] ?? {
      icon: Package,
      colorClass: 'text-slate-600',
      bgClass: 'bg-slate-50',
      label: status,
      labelBn: '',
    }
  );
}

// ─── Courier Badge Color Map ───────────────────────────────────────

const COURIER_BADGE_COLORS: Record<string, string> = {
  'Pathao Courier': 'bg-red-50 text-red-700 border-red-200',
  RedX: 'bg-red-50 text-red-700 border-red-200',
  'Sundarban Courier': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'SA Paribahan': 'bg-sky-50 text-sky-700 border-sky-200',
  eCourier: 'bg-orange-50 text-orange-700 border-orange-200',
  Continental: 'bg-amber-50 text-amber-700 border-amber-200',
};

function getCourierBadgeClass(courier: string): string {
  return COURIER_BADGE_COLORS[courier] ?? 'bg-slate-50 text-slate-700 border-slate-200';
}

// ─── Date/Time Formatting ──────────────────────────────────────────

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  }) + ', ' + d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Status Update Timeline Item ───────────────────────────────────

function TimelineItem({
  update,
  index,
  isLatest,
  total,
}: {
  update: DeliveryStatusUpdate;
  index: number;
  isLatest: boolean;
  total: number;
}) {
  // Progressive fade for older items
  const opacity = isLatest ? 1 : Math.max(0.35, 1 - index * 0.18);

  return (
    <div className="flex gap-2.5" style={{ opacity }}>
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-2.5 h-2.5 rounded-full mt-1 ${
            isLatest
              ? 'bg-emerald-500 ring-2 ring-emerald-200'
              : 'bg-slate-300'
          }`}
        />
        {index < total - 1 && (
          <div className="w-px flex-1 bg-slate-200 min-h-[16px]" />
        )}
      </div>

      {/* Update content */}
      <div className="pb-3 min-w-0">
        <p
          className={`text-xs font-medium ${
            isLatest ? 'text-slate-900' : 'text-slate-600'
          }`}
        >
          {update.status}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          {formatTimestamp(update.timestamp)}
        </p>
        <p className="text-[10px] text-slate-400 truncate">
          📍 {update.location}
        </p>
        {update.note && (
          <p className="text-[10px] text-slate-400 italic mt-0.5 truncate">
            {update.note}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Delivery Tracking Card ────────────────────────────────────────

function DeliveryCard({ delivery }: { delivery: DeliveryStatus }) {
  const statusConfig = getStatusConfig(delivery.currentStatus);
  const StatusIcon = statusConfig.icon;
  const { date: etaDate, time: etaTime } = formatDateTime(
    delivery.estimatedDelivery
  );

  // Reverse updates so most recent first
  const reversedUpdates = [...delivery.updates].reverse();

  // Determine if this is a "live" (active) delivery
  const isLive =
    delivery.currentStatus !== 'delivered' &&
    delivery.currentStatus !== 'failed';

  return (
    <motion.div variants={cardVariants}>
      <Card className="overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4 space-y-3">
          {/* Shipment ID + Courier badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-slate-900 truncate">
                {delivery.shipmentId.toUpperCase()}
              </span>
              {isLive && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 text-[10px] px-1.5 py-0 border ${getCourierBadgeClass(delivery.courier)}`}
            >
              {delivery.courier}
            </Badge>
          </div>

          {/* Tracking number */}
          <p className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded">
            {delivery.trackingNumber}
          </p>

          {/* Current status with large icon */}
          <div
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${statusConfig.bgClass}`}
          >
            <StatusIcon
              className={`h-8 w-8 shrink-0 ${statusConfig.colorClass}`}
            />
            <div>
              <p className={`text-sm font-semibold ${statusConfig.colorClass}`}>
                {statusConfig.label}
              </p>
              <p className="text-[10px] text-slate-500">
                {statusConfig.labelBn}
              </p>
            </div>
          </div>

          {/* Current location */}
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-slate-700">{delivery.currentLocation}</p>
              <p className="text-[10px] text-slate-400">
                {delivery.currentLocationBn}
              </p>
            </div>
          </div>

          {/* Estimated delivery */}
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-600">
                <span className="font-medium">ETA:</span> {etaDate}, {etaTime}
              </p>
            </div>
          </div>

          <Separator />

          {/* Status updates timeline */}
          <div>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">
              Status Updates
            </p>
            <ScrollArea className="max-h-40">
              <div className="space-y-0">
                {reversedUpdates.map((update, idx) => (
                  <TimelineItem
                    key={idx}
                    update={update}
                    index={idx}
                    isLatest={idx === 0}
                    total={reversedUpdates.length}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Track on courier site link */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8"
            asChild
          >
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="h-3 w-3" />
              Track on Courier Site
            </a>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 mb-4">
        <CheckCircle className="h-8 w-8 text-emerald-500" />
      </div>
      <p className="text-sm font-medium text-slate-700">
        All deliveries completed
      </p>
      <p className="text-xs text-slate-400 mt-1">
        সকল ডেলিভারি সম্পন্ন হয়েছে
      </p>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function DeliveryTracker() {
  const deliveries = useWarehouseStore((s) => s.deliveries);

  // Filter to show only live/active deliveries (non-delivered, non-failed)
  const activeDeliveries = deliveries.filter(
    (d) => d.currentStatus !== 'delivered' && d.currentStatus !== 'failed'
  );

  // All deliveries for display (show all 4 cards as per spec)
  const displayDeliveries = deliveries;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Live Delivery Tracking{' '}
            <span className="text-slate-400 font-normal">
              / লাইভ ডেলিভারি ট্র্যাকিং
            </span>
          </h2>
        </div>
        {/* Pulsing green dot with "Live" badge */}
        {activeDeliveries.length > 0 && (
          <Badge
            variant="outline"
            className="w-fit text-xs border-emerald-300 bg-emerald-50 text-emerald-700"
          >
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live
          </Badge>
        )}
      </div>

      {/* Delivery Tracking Cards */}
      {displayDeliveries.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {displayDeliveries.map((delivery) => (
            <DeliveryCard key={delivery.id} delivery={delivery} />
          ))}
        </motion.div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

export default DeliveryTracker;
