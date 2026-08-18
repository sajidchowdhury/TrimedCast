'use client';

// ============================================
// TrimedCast — Inbound Shipments Tracking Panel
// Session 25: Warehouse & Logistics Dashboard
// ============================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Package,
  Truck,
  Anchor,
  ClipboardCheck,
  Archive,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Globe,
  MapPin,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import type { InboundShipment, InboundStatus } from '@/components/warehouse/types';
import {
  INBOUND_STATUS_CONFIG,
  MOCK_INBOUND,
  getInboundStatusStep,
} from '@/components/warehouse/types';
import { useWarehouseStore } from '@/stores/warehouse-store';

// ─── Status Tab Configuration ───────────────────────────────────────

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in-transit', label: 'In-Transit' },
  { value: 'at-dock', label: 'At Dock' },
  { value: 'receiving', label: 'Receiving' },
  { value: 'put-away', label: 'Put-Away' },
  { value: 'completed', label: 'Completed' },
];

// ─── Pipeline Step Indicator ────────────────────────────────────────

const INBOUND_STEPS = [
  { key: 'pending', icon: Clock, label: 'Pending' },
  { key: 'in-transit', icon: Truck, label: 'Transit' },
  { key: 'at-dock', icon: Anchor, label: 'Dock' },
  { key: 'receiving', icon: ClipboardCheck, label: 'Receive' },
  { key: 'put-away', icon: Archive, label: 'Put-Away' },
  { key: 'completed', icon: CheckCircle2, label: 'Done' },
] as const;

function PipelineIndicator({ status }: { status: InboundStatus }) {
  const currentStep = getInboundStatusStep(status);

  return (
    <div className="flex items-center gap-0.5">
      {INBOUND_STEPS.map((step, idx) => {
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
            {idx < INBOUND_STEPS.length - 1 && (
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

function StatusBadge({ status }: { status: InboundStatus }) {
  const config = INBOUND_STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={`${config.color} ${config.bg} border-0 text-xs font-medium`}>
      {config.label}
    </Badge>
  );
}

// ─── Origin Badge ───────────────────────────────────────────────────

function OriginBadge({ origin }: { origin: 'domestic' | 'international' }) {
  if (origin === 'domestic') {
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">
        <MapPin className="mr-1 h-3 w-3" />
        Domestic
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700 text-xs">
      <Globe className="mr-1 h-3 w-3" />
        International
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
        <AlertTriangle className="h-3 w-3" />
        Overdue
      </span>
    );
  }

  return <span className="text-xs text-slate-600">{formatted}</span>;
}

// ─── Mobile Card ────────────────────────────────────────────────────

function InboundMobileCard({
  shipment,
  onSelect,
}: {
  shipment: InboundShipment;
  onSelect: (s: InboundShipment) => void;
}) {
  const config = INBOUND_STATUS_CONFIG[shipment.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="cursor-pointer border-slate-200 transition-shadow hover:shadow-md"
        onClick={() => onSelect(shipment)}
      >
        <CardContent className="p-4">
          {/* Header Row */}
          <div className="mb-2 flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">{shipment.poNumber}</p>
              <p className="text-xs text-slate-500">{shipment.supplierName}</p>
            </div>
            <StatusBadge status={shipment.status} />
          </div>

          {/* Carrier + Origin */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {shipment.carrier}
            </Badge>
            <OriginBadge origin={shipment.origin} />
          </div>

          {/* Port of Entry */}
          {shipment.origin === 'international' && shipment.portOfEntry && (
            <p className="mb-2 flex items-center gap-1 text-xs text-slate-500">
              <Anchor className="h-3 w-3" />
              {shipment.portOfEntry}
            </p>
          )}

          {/* Pipeline */}
          <div className="mb-2 flex items-center gap-2">
            <PipelineIndicator status={shipment.status} />
            <span className={`text-xs font-medium ${config.color}`}>{config.labelBn}</span>
          </div>

          <Separator className="my-2" />

          {/* Details Row */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {shipment.totalPallets} pallets
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

function InboundDesktopRow({
  shipment,
  onSelect,
}: {
  shipment: InboundShipment;
  onSelect: (s: InboundShipment) => void;
}) {
  const config = INBOUND_STATUS_CONFIG[shipment.status];

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
      onClick={() => onSelect(shipment)}
    >
      <td className="px-3 py-3">
        <p className="text-sm font-bold text-slate-900">{shipment.poNumber}</p>
        <p className="text-xs text-slate-500">{shipment.supplierName}</p>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {shipment.carrier}
          </Badge>
          <OriginBadge origin={shipment.origin} />
        </div>
        {shipment.origin === 'international' && shipment.portOfEntry && (
          <p className="mt-0.5 text-xs text-slate-400">{shipment.portOfEntry}</p>
        )}
      </td>
      <td className="px-3 py-3">
        <Badge variant="outline" className="text-xs text-slate-600">
          {shipment.warehouseCode}
        </Badge>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1">
          <PipelineIndicator status={shipment.status} />
          <div className="flex items-center gap-1.5">
            <StatusBadge status={shipment.status} />
            <span className={`text-xs ${config.color}`}>{config.labelBn}</span>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <ETADisplay eta={shipment.eta} />
      </td>
      <td className="px-3 py-3 text-xs text-slate-600">{shipment.totalPallets}</td>
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

interface InboundShipmentsProps {
  onSelectShipment?: (shipment: InboundShipment) => void;
}

export function InboundShipments({ onSelectShipment }: InboundShipmentsProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const store = useWarehouseStore();
  const inbound = store.inbound.length > 0 ? store.inbound : MOCK_INBOUND;

  // Filter logic
  const filtered = useMemo(() => {
    return inbound.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesPO = s.poNumber.toLowerCase().includes(q);
        const matchesSupplier = s.supplierName.toLowerCase().includes(q);
        if (!matchesPO && !matchesSupplier) return false;
      }
      return true;
    });
  }, [inbound, statusFilter, searchQuery]);

  const activeCount = inbound.filter((s) => s.status !== 'completed').length;

  const handleSelect = (shipment: InboundShipment) => {
    store.selectInbound(shipment);
    onSelectShipment?.(shipment);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900">Inbound Shipments</h2>
          <span className="text-sm text-slate-400">/ ইনবাউন্ড শিপমেন্ট</span>
        </div>
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
          <Truck className="mr-1 h-3 w-3" />
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
          placeholder="Search by PO number or supplier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results Count */}
      <p className="text-xs text-slate-400">
        Showing {filtered.length} of {inbound.length} shipments
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
                    PO / Supplier
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    Carrier / Origin
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    Warehouse
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    ETA
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    Pallets
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
                    <InboundDesktopRow
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
              <InboundMobileCard
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
            <p className="text-sm font-medium">No inbound shipments found</p>
            <p className="text-xs">Try adjusting your search or filter</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
