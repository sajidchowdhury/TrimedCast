'use client';

// ============================================
// TrimedCast — Zone Detail Panel
// Session 25: Warehouse & Logistics Dashboard
// ============================================

import { motion, AnimatePresence } from 'framer-motion';
import {
  Thermometer,
  Snowflake,
  AlertTriangle,
  Layers,
  PackageSearch,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import type { WarehouseZone, ZoneType } from '@/components/warehouse/types';
import {
  ZONE_TYPE_CONFIG,
  getZoneUtilization,
  getCapacityBgColor,
} from '@/components/warehouse/types';
import { useWarehouseStore } from '@/stores/warehouse-store';

// ─── Animation Variants ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

// ─── Temperature Display ───────────────────────────────────────────

function TemperatureDisplay({ zone }: { zone: WarehouseZone }) {
  if (zone.type === 'cold-storage') {
    return (
      <div className="flex items-center gap-1 text-xs text-cyan-600">
        <Snowflake className="h-3 w-3" />
        <span>2–8°C</span>
      </div>
    );
  }
  if (zone.type === 'hazardous') {
    return (
      <div className="flex items-center gap-1 text-xs text-red-600">
        <AlertTriangle className="h-3 w-3" />
        <span>Ambient</span>
      </div>
    );
  }
  if (zone.temperature != null) {
    return (
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <Thermometer className="h-3 w-3" />
        <span>{zone.temperature}°C</span>
      </div>
    );
  }
  return null;
}

// ─── Zone Status Dot ───────────────────────────────────────────────

function ZoneStatusDot({ status }: { status: WarehouseZone['status'] }) {
  const colorMap: Record<string, string> = {
    active: 'bg-emerald-500',
    full: 'bg-red-500',
    locked: 'bg-slate-400',
    maintenance: 'bg-amber-500',
  };

  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colorMap[status] ?? 'bg-slate-300'}`}
    />
  );
}

// ─── Zone Card ─────────────────────────────────────────────────────

function ZoneCard({ zone }: { zone: WarehouseZone }) {
  const util = getZoneUtilization(zone);
  const typeConfig = ZONE_TYPE_CONFIG[zone.type];
  const barColor = getCapacityBgColor(util);

  return (
    <motion.div variants={itemVariants}>
      <Card className="h-full hover:shadow-sm transition-shadow">
        <CardContent className="p-4 space-y-3">
          {/* Header: Name + Type Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-medium text-sm truncate">{zone.name}</h4>
              <p className="text-xs text-slate-500 truncate">{zone.nameBn}</p>
            </div>
            <Badge
              className={`shrink-0 text-[10px] ${typeConfig.color} ${typeConfig.bg} border border-transparent`}
            >
              {typeConfig.label}
            </Badge>
          </div>

          <Separator />

          {/* Utilization Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Utilization</span>
              <span className="font-semibold text-slate-700">{util}%</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
                initial={{ width: 0 }}
                animate={{ width: `${util}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Pallet Count */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Layers className="h-3 w-3 shrink-0" />
            <span>
              {zone.usedPallets} of {zone.capacityPallets} pallets
            </span>
          </div>

          <Separator />

          {/* Footer: Temperature + Status */}
          <div className="flex items-center justify-between">
            <TemperatureDisplay zone={zone} />
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ZoneStatusDot status={zone.status} />
              <span className="capitalize">{zone.status}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function ZoneDetailPanel() {
  const selectedWarehouse = useWarehouseStore((s) => s.selectedWarehouse);
  const zones = useWarehouseStore((s) => s.zones);

  // Filter zones for the selected warehouse
  const warehouseZones = selectedWarehouse
    ? zones.filter((z) => z.warehouseId === selectedWarehouse.id)
    : [];

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {selectedWarehouse ? (
          <motion.div
            key={selectedWarehouse.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-1"
          >
            <h2 className="text-lg font-semibold">
              Zones — {selectedWarehouse.name}
            </h2>
            <p className="text-sm text-slate-500">
              {selectedWarehouse.nameBn} • {warehouseZones.length} জোন
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-1"
          >
            <h2 className="text-lg font-semibold">Warehouse Zones</h2>
            <p className="text-sm text-slate-500">গুদাম জোন</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Zone Cards or Placeholder ────────────────────────── */}
      <AnimatePresence mode="wait">
        {selectedWarehouse && warehouseZones.length > 0 ? (
          <motion.div
            key={`zones-${selectedWarehouse.id}`}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {warehouseZones.map((zone) => (
              <ZoneCard key={zone.id} zone={zone} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-dashed">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                <PackageSearch className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">
                  {selectedWarehouse
                    ? 'No zones found for this warehouse'
                    : 'Select a warehouse to view zones'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedWarehouse
                    ? 'এই গুদামের কোনো জোন পাওয়া যায়নি'
                    : 'জোন দেখতে একটি গুদাম নির্বাচন করুন'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
