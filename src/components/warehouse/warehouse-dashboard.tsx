'use client';

// ============================================
// TrimedCast — Warehouse Dashboard Orchestrator
// Session 25: Warehouse & Logistics Dashboard
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Warehouse as WarehouseIcon,
  Truck,
  Package,
  Bike,
  MapPin,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import type { InboundShipment, OutboundShipment } from '@/components/warehouse/types';
import { useWarehouseStore, type WarehouseTab } from '@/stores/warehouse-store';

import { WarehouseOverview } from '@/components/warehouse/warehouse-overview';
import { ZoneDetailPanel } from '@/components/warehouse/zone-detail-panel';
import { PickPackQueue } from '@/components/warehouse/pick-pack-queue';
import { InboundShipments } from '@/components/warehouse/inbound-shipments';
import { OutboundShipments } from '@/components/warehouse/outbound-shipments';
import { InboundDetailSheet } from '@/components/warehouse/inbound-detail-sheet';
import { OutboundDetailSheet } from '@/components/warehouse/outbound-detail-sheet';
import { CourierOverview } from '@/components/warehouse/courier-overview';
import { DeliveryTracker } from '@/components/warehouse/delivery-tracker';

// ─── Tab Configuration ─────────────────────────────────────────────

const TAB_CONFIG: {
  key: WarehouseTab;
  label: string;
  labelBn: string;
  icon: React.ElementType;
}[] = [
  { key: 'overview', label: 'Overview', labelBn: 'ওভারভিউ', icon: WarehouseIcon },
  { key: 'inbound', label: 'Inbound', labelBn: 'ইনবাউন্ড', icon: Truck },
  { key: 'outbound', label: 'Outbound', labelBn: 'আউটবাউন্ড', icon: Package },
  { key: 'couriers', label: 'Couriers', labelBn: 'কুরিয়ার', icon: Bike },
  { key: 'delivery', label: 'Live Tracking', labelBn: 'লাইভ ট্র্যাকিং', icon: MapPin },
];

// ─── Skeleton Placeholders ─────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-7 w-56 rounded-md bg-slate-200 animate-pulse" />
        <div className="h-5 w-32 rounded-md bg-slate-100 animate-pulse" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-slate-200" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-20 rounded bg-slate-200" />
                <div className="h-5 w-16 rounded bg-slate-200" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Warehouse cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="h-4 w-40 rounded bg-slate-200" />
                  <div className="h-3 w-28 rounded bg-slate-100" />
                </div>
                <div className="h-5 w-12 rounded bg-slate-200" />
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100" />
              <div className="h-3 w-24 rounded bg-slate-100" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Error Banner ──────────────────────────────────────────────────

function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">Failed to load warehouse data</p>
          <p className="text-xs text-red-600 truncate">{message}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────

export function WarehouseDashboard() {
  const fetchAll = useWarehouseStore((s) => s.fetchAll);
  const isLoading = useWarehouseStore((s) => s.isLoading);
  const error = useWarehouseStore((s) => s.error);
  const clearError = useWarehouseStore((s) => s.clearError);
  const activeTab = useWarehouseStore((s) => s.activeTab);
  const setActiveTab = useWarehouseStore((s) => s.setActiveTab);
  const selectedInbound = useWarehouseStore((s) => s.selectedInbound);
  const selectInbound = useWarehouseStore((s) => s.selectInbound);
  const selectedOutbound = useWarehouseStore((s) => s.selectedOutbound);
  const selectOutbound = useWarehouseStore((s) => s.selectOutbound);

  // Sheet open states
  const [inboundSheetOpen, setInboundSheetOpen] = useState(false);
  const [outboundSheetOpen, setOutboundSheetOpen] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Sync inbound sheet open state with selectedInbound
  const handleInboundSelect = useCallback(
    (shipment: InboundShipment) => {
      selectInbound(shipment);
      setInboundSheetOpen(true);
    },
    [selectInbound],
  );

  // Sync outbound sheet open state with selectedOutbound
  const handleOutboundSelect = useCallback(
    (shipment: OutboundShipment) => {
      selectOutbound(shipment);
      setOutboundSheetOpen(true);
    },
    [selectOutbound],
  );

  // Handle inbound sheet close
  const handleInboundSheetClose = useCallback(
    (open: boolean) => {
      setInboundSheetOpen(open);
      if (!open) {
        selectInbound(null);
      }
    },
    [selectInbound],
  );

  // Handle outbound sheet close
  const handleOutboundSheetClose = useCallback(
    (open: boolean) => {
      setOutboundSheetOpen(open);
      if (!open) {
        selectOutbound(null);
      }
    },
    [selectOutbound],
  );

  return (
    <div className="space-y-6">
      {/* ── Dashboard Header ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-500/10">
            <WarehouseIcon className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Warehouse & Logistics
            </h1>
            <p className="text-sm text-slate-500">গুদাম ও লজিস্টিক্স</p>
          </div>
        </div>
      </motion.div>

      {/* ── Error Banner ─────────────────────────────────────── */}
      <AnimatePresence>
        {error && <ErrorBanner message={error} onDismiss={clearError} />}
      </AnimatePresence>

      {/* ── Main Tabs ────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as WarehouseTab)}
      >
        <TabsList className="h-9 w-full overflow-x-auto mb-6">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="min-w-fit px-3 text-xs sm:text-sm gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.labelBn}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ── Overview Tab ─────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-8 mt-0">
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <>
              {/* Warehouse Overview + Summary Cards */}
              <section aria-label="Warehouse Overview">
                <WarehouseOverview />
              </section>

              <Separator />

              {/* Zone Detail Panel */}
              <section aria-label="Warehouse Zones">
                <ZoneDetailPanel />
              </section>

              <Separator />

              {/* Pick & Pack Queue */}
              <section aria-label="Pick and Pack Queue">
                <PickPackQueue />
              </section>
            </>
          )}
        </TabsContent>

        {/* ── Inbound Tab ──────────────────────────────────────── */}
        <TabsContent value="inbound" className="space-y-4 mt-0">
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <section aria-label="Inbound Shipments">
              <InboundShipments onSelectShipment={handleInboundSelect} />
            </section>
          )}

          {/* Inbound Detail Sheet */}
          <InboundDetailSheet
            shipment={selectedInbound}
            open={inboundSheetOpen}
            onOpenChange={handleInboundSheetClose}
          />
        </TabsContent>

        {/* ── Outbound Tab ─────────────────────────────────────── */}
        <TabsContent value="outbound" className="space-y-4 mt-0">
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <section aria-label="Outbound Shipments">
              <OutboundShipments onSelectShipment={handleOutboundSelect} />
            </section>
          )}

          {/* Outbound Detail Sheet */}
          <OutboundDetailSheet
            shipment={selectedOutbound}
            open={outboundSheetOpen}
            onOpenChange={handleOutboundSheetClose}
          />
        </TabsContent>

        {/* ── Couriers Tab ─────────────────────────────────────── */}
        <TabsContent value="couriers" className="space-y-4 mt-0">
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <section aria-label="Courier Partners">
              <CourierOverview />
            </section>
          )}
        </TabsContent>

        {/* ── Live Tracking Tab ────────────────────────────────── */}
        <TabsContent value="delivery" className="space-y-4 mt-0">
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <section aria-label="Live Delivery Tracking">
              <DeliveryTracker />
            </section>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
