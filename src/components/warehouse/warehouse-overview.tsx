'use client';

// ============================================
// TrimedCast — Warehouse Overview Section
// Session 25: Warehouse & Logistics Dashboard
// ============================================

import { motion } from 'framer-motion';
import {
  Warehouse,
  Maximize,
  BarChart3,
  Grid3x3,
  MapPin,
  ChevronRight,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

import type { Warehouse as WarehouseType } from '@/components/warehouse/types';
import {
  WAREHOUSE_STATUS_CONFIG,
  getWarehouseUtilization,
  getCapacityBgColor,
  getCapacityColor,
} from '@/components/warehouse/types';
import { useWarehouseStore } from '@/stores/warehouse-store';

// ─── Animation Variants ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ─── Summary Card Data ─────────────────────────────────────────────

interface SummaryStat {
  label: string;
  labelBn: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}

function getSummaryStats(warehouses: WarehouseType[]): SummaryStat[] {
  const totalCapacity = warehouses.reduce((sum, wh) => sum + wh.capacity, 0);
  const totalUsed = warehouses.reduce((sum, wh) => sum + wh.usedCapacity, 0);
  const avgUtil = totalCapacity > 0 ? ((totalUsed / totalCapacity) * 100).toFixed(1) : '0';
  const totalZones = warehouses.reduce((sum, wh) => sum + wh.zoneCount, 0);

  return [
    {
      label: 'Total Warehouses',
      labelBn: 'মোট গুদাম',
      value: String(warehouses.length),
      icon: <Warehouse className="h-5 w-5" />,
      accent: 'text-emerald-600',
    },
    {
      label: 'Total Capacity',
      labelBn: 'মোট ধারণক্ষমতা',
      value: `${totalCapacity.toLocaleString()} sqm`,
      icon: <Maximize className="h-5 w-5" />,
      accent: 'text-violet-600',
    },
    {
      label: 'Avg Utilization',
      labelBn: 'গড় ব্যবহার',
      value: `${avgUtil}%`,
      icon: <BarChart3 className="h-5 w-5" />,
      accent: 'text-amber-600',
    },
    {
      label: 'Active Zones',
      labelBn: 'সক্রিয় জোন',
      value: String(totalZones),
      icon: <Grid3x3 className="h-5 w-5" />,
      accent: 'text-sky-600',
    },
  ];
}

// ─── Warehouse Card ────────────────────────────────────────────────

function WarehouseCard({
  warehouse,
  isSelected,
  onSelect,
}: {
  warehouse: WarehouseType;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const util = getWarehouseUtilization(warehouse);
  const statusConfig = WAREHOUSE_STATUS_CONFIG[warehouse.status];
  const barColor = getCapacityBgColor(util);

  return (
    <motion.div variants={itemVariants}>
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected
            ? 'ring-2 ring-emerald-500 shadow-md'
            : 'hover:border-slate-300'
        }`}
        onClick={onSelect}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header: Name + Code Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{warehouse.name}</h3>
              <p className="text-xs text-slate-500 truncate">{warehouse.nameBn}</p>
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px] font-mono">
              {warehouse.code}
            </Badge>
          </div>

          {/* City */}
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>{warehouse.city}</span>
            <span className="text-slate-400">({warehouse.cityBn})</span>
          </div>

          <Separator />

          {/* Capacity Utilization */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Capacity Utilization</span>
              <span className={`font-semibold ${getCapacityColor(util)}`}>{util}%</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
                initial={{ width: 0 }}
                animate={{ width: `${util}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {warehouse.usedCapacity.toLocaleString()} / {warehouse.capacity.toLocaleString()} sqm used
            </p>
          </div>

          <Separator />

          {/* Footer: Zone count + Status + Primary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {warehouse.zoneCount} zones
              </Badge>
              <Badge
                className={`text-[10px] ${statusConfig.color} ${statusConfig.bg} border ${statusConfig.border}`}
              >
                {statusConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              {warehouse.isPrimary && (
                <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Primary
                </Badge>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function WarehouseOverview() {
  const warehouses = useWarehouseStore((s) => s.warehouses);
  const selectedWarehouse = useWarehouseStore((s) => s.selectedWarehouse);
  const selectWarehouse = useWarehouseStore((s) => s.selectWarehouse);

  const summaryStats = getSummaryStats(warehouses);

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ─────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {summaryStats.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <Card className="h-full">
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`rounded-lg bg-slate-50 p-2 ${stat.accent}`}>
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 truncate">{stat.label}</p>
                  <p className="text-xs text-slate-400 truncate">{stat.labelBn}</p>
                  <p className="text-lg font-bold mt-0.5">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Warehouse Cards Grid ──────────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {warehouses.map((wh) => (
          <WarehouseCard
            key={wh.id}
            warehouse={wh}
            isSelected={selectedWarehouse?.id === wh.id}
            onSelect={() =>
              selectWarehouse(
                selectedWarehouse?.id === wh.id ? null : wh,
              )
            }
          />
        ))}
      </motion.div>
    </div>
  );
}
