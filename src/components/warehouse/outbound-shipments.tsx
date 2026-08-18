'use client';

// ============================================
// TrimedCast — Outbound Shipments Tracking Panel
// Session 25: Warehouse & Logistics Dashboard
// ============================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Package,
  Truck,
  ClipboardList,
  CheckCircle2,
  Send,
  MapPin,
  AlertCircle,
  ChevronRight,
  XCircle,
  Weight,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import type { OutboundShipment, OutboundStatus } from '@/components/warehouse/types';
import {
  OUTBOUND_STATUS_CONFIG,
  MOCK_OUTBOUND,
  COURIER_PARTNERS,
  getOutboundStatusStep,
} from '@/components/warehouse/types';
import { useWarehouseStore } from '@/stores/warehouse-store';

// ─── Status Tab Configuration ───────────────────────────────────────

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pick-pack', label: 'Pick-Pack' },
  { value: 'ready', label: 'Ready' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'in-transit', label: 'In-Transit' },
  { value: 'out-for-delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
];

// ─── Pipeline Step Indicator (7-step: pick-pack → ready → dispatched → in-transit → out-for-delivery → delivered, + failed) ──

const OUTBOUND_STEPS = [
  { key: 'pick-pack', icon: ClipboardList, label: 'Pick' },
  { key: 'ready', icon: CheckCircle2, label: 'Ready' },
  { key: 'dispatched', icon: Send, label: 'Dispatch' },
  { key: 'in-transit', icon: Truck, label: 'Transit' },
  { key: 'out-for-delivery', icon: MapPin, label: 'Delivery' },
  { key: 'delivered', icon: CheckCircle2, label: 'Done' },
] as const;

function PipelineIndicator({ status }: { status: OutboundStatus }) {
  // Failed is step 0 — special handling
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-1">
        <XCircle className="h-3.5 w-3.5 text-red-500" />
        <span className="text-xs font-medium text-red-600">Failed</span>
      </div>
    );
  }

  const currentStep = getOutboundStatusStep(status);

  return (
    <div className="flex items-center gap-0.5">
      {OUTBOUND_STEPS.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isFuture = stepNum > currentStep;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                isCompleted
                  ? 'bg-emerald-500'
                  : isCurrent
                    ? 'bg-amber-500 scale-125'
                    : 'bg-slate-200'
              }`}
            />
            {idx < OUTBOUND_STEPS.length - 1 && (
              <div
                className={`h-px w-1.5 ${
                  isCompleted ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: OutboundStatus }) {
  const config = OUTBOUND_STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={`${config.color} ${config.bg} border-0 text-xs font-medium`}>
      {config.label}
    </Badge>
  );
}

// ─── Courier Badge ──────────────────────────────────────────────────

function CourierBadge({ courierName }: { courierName: string }) {
  const courier = COURIER_PARTNERS.find((c) => c.name === courierName);
  const color = courier?.logoColor ?? '#64748b';

  return (
    <Badge
      variant="outline"
      className="text-xs"
      style={{
        borderColor: color,
        color: color,
        backgroundColor: `${color}10`,
      }}
    >
      <div
        className="mr-1 h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {courierName}
    </Badge>
  );
}

// ─── ETA Display ────────────────────────────────────────────────────

function ETADisplay({ eta }: { eta: string }) {
  const etaDate = new Date(eta);
  const now = new Date();
  const isOverdue = etaDate < now;
  const formatted = etaDate.toLocaleDateString('en-BD', {
    month: 'short',
    day: 'numeric',
  });

  if (isOverdue) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-red-600">
        <AlertCircle className="h-3 w-3" />
        Overdue
      </span>
    );
  }

  return <span className="text-xs text-slate-600">{formatted}</span>;
}

// ─── Mobile Card ────────────────────────────────────────────────────

function OutboundMobileCard({
  shipment,
  onSelect,
}: {
  shipment: OutboundShipment;
  onSelect: (s: OutboundShipment) => void;
}) {
  const config = OUTBOUND_STATUS_CONFIG[shipment.status];
  const isFailed = shipment.status === 'failed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`cursor-pointer border transition-shadow hover:shadow-md ${
          isFailed ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
        }`}
        onClick={() => onSelect(shipment)}
      >
        <CardContent className="p-4">
          {/* Header Row */}
          <div className="mb-2 flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">{shipment.orderNumber}</p>
              <p className="text-xs text-slate-500">{shipment.customerName}</p>
            </div>
            <StatusBadge status={shipment.status} />
          </div>

          {/* Courier + Destination */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <CourierBadge courierName={shipment.courier} />
            <Badge variant="outline" className="border-slate-200 text-xs text-slate-600">
              <MapPin className="mr-1 h-3 w-3" />
              {shipment.destinationCity}
              <span className="ml-1 text-slate-400">({shipment.destinationCityBn})</span>
            </Badge>
          </div>

          {/* Failed Alert */}
          {isFailed && (
            <div className="mb-2 flex items-center gap-1.5 rounded-md bg-red-100 px-2 py-1">
              <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              <span className="text-xs font-medium text-red-700">
                Delivery failed — Address verification required
              </span>
            </div>
          )}

          {/* Pipeline */}
          <div className="mb-2 flex items-center gap-2">
            <PipelineIndicator status={shipment.status} />
            {!isFailed && (
              <span className={`text-xs font-medium ${config.color}`}>{config.labelBn}</span>
            )}
          </div>

          <Separator className="my-2" />

          {/* Details Row */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Weight className="h-3 w-3" />
                {shipment.totalWeight} kg
              </span>
              <span>{shipment.warehouseCode}</span>
            </div>
            <ETADisplay eta={shipment.eta} />
          </div>

          {/* Tracking Number */}
          <p className="mt-1.5 text-xs font-medium text-teal-600 hover:underline">
            {shipment.trackingNumber}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Desktop Table Row ──────────────────────────────────────────────

function OutboundDesktopRow({
  shipment,
  onSelect,
}: {
  shipment: OutboundShipment;
  onSelect: (s: OutboundShipment) => void;
}) {
  const config = OUTBOUND_STATUS_CONFIG[shipment.status];
  const isFailed = shipment.status === 'failed';

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`cursor-pointer border-b transition-colors hover:bg-slate-50 ${
        isFailed ? 'border-red-100 bg-red-50/20' : 'border-slate-100'
      }`}
      onClick={() => onSelect(shipment)}
    >
      <td className="px-3 py-3">
        <p className="text-sm font-bold text-slate-900">{shipment.orderNumber}</p>
        <p className="text-xs text-slate-500">{shipment.customerName}</p>
      </td>
      <td className="px-3 py-3">
        <CourierBadge courierName={shipment.courier} />
      </td>
      <td className="px-3 py-3">
        <Badge variant="outline" className="text-xs text-slate-600">
          {shipment.warehouseCode}
        </Badge>
      </td>
      <td className="px-3 py-3">
        <p className="text-xs text-slate-700">{shipment.destinationCity}</p>
        <p className="text-xs text-slate-400">{shipment.destinationCityBn}</p>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1">
          <PipelineIndicator status={shipment.status} />
          {!isFailed && (
            <div className="flex items-center gap-1.5">
              <StatusBadge status={shipment.status} />
              <span className={`text-xs ${config.color}`}>{config.labelBn}</span>
            </div>
          )}
          {isFailed && (
            <div className="flex items-center gap-1.5">
              <StatusBadge status={shipment.status} />
              <span className="text-xs text-red-500">Address issue</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <ETADisplay eta={shipment.eta} />
      </td>
      <td className="px-3 py-3 text-xs text-slate-600">{shipment.totalWeight} kg</td>
      <td className="px-3 py-3">
        <span className="text-xs font-medium text-teal-600 hover:underline">
          {shipment.trackingNumber}
        </span>
      </td>
      <td className="px-3 py-3">
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </td>
    </motion.tr>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

interface OutboundShipmentsProps {
  onSelectShipment?: (shipment: OutboundShipment) => void;
}

export function OutboundShipments({ onSelectShipment }: OutboundShipmentsProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const store = useWarehouseStore();
  const outbound = store.outbound.length > 0 ? store.outbound : MOCK_OUTBOUND;

  // Filter logic
  const filtered = useMemo(() => {
    return outbound.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesOrder = s.orderNumber.toLowerCase().includes(q);
        const matchesCustomer = s.customerName.toLowerCase().includes(q);
        const matchesCity = s.destinationCity.toLowerCase().includes(q);
        if (!matchesOrder && !matchesCustomer && !matchesCity) return false;
      }
      return true;
    });
  }, [outbound, statusFilter, searchQuery]);

  const activeCount = outbound.filter(
    (s) => s.status !== 'delivered' && s.status !== 'failed',
  ).length;

  const handleSelect = (shipment: OutboundShipment) => {
    store.selectOutbound(shipment);
    onSelectShipment?.(shipment);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900">Outbound Shipments</h2>
          <span className="text-sm text-slate-400">/ আউটবাউন্ড শিপমেন্ট</span>
        </div>
        <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100">
          <Send className="mr-1 h-3 w-3" />
          {activeCount} Active
        </Badge>
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="h-8 w-full overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="min-w-fit px-2.5 text-xs"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by order number, customer, or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results Count */}
      <p className="text-xs text-slate-400">
        Showing {filtered.length} of {outbound.length} shipments
      </p>

      {/* Content: Desktop Table / Mobile Cards */}
      <ScrollArea className="max-h-[480px]">
        {/* Desktop Table (hidden on mobile) */}
        <div className="hidden md:block">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    Order / Customer
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    Courier
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    Warehouse
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    Destination
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    ETA
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    Weight
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    Tracking
                  </th>
                  <th className="w-8 px-3 py-2" />
                </tr>
              </thead>
              <AnimatePresence>
                <tbody>
                  {filtered.map((shipment) => (
                    <OutboundDesktopRow
                      key={shipment.id}
                      shipment={shipment}
                      onSelect={handleSelect}
                    />
                  ))}
                </tbody>
              </AnimatePresence>
            </table>
          </div>
        </div>

        {/* Mobile Cards (visible on mobile only) */}
        <div className="flex flex-col gap-3 md:hidden">
          <AnimatePresence>
            {filtered.map((shipment) => (
              <OutboundMobileCard
                key={shipment.id}
                shipment={shipment}
                onSelect={handleSelect}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Package className="mb-2 h-10 w-10" />
            <p className="text-sm font-medium">No outbound shipments found</p>
            <p className="text-xs">Try adjusting your search or filter</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
