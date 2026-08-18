'use client';

// ============================================
// TrimedCast — Courier Partners Overview
// Session 25: Warehouse & Logistics Dashboard
// ============================================

import { motion } from 'framer-motion';
import { Package, Zap, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWarehouseStore } from '@/stores/warehouse-store';
import type { CourierPartner, CourierType } from '@/components/warehouse/types';

// ─── Animation Variants ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

// ─── Courier Type Configuration ────────────────────────────────────

const COURIER_TYPE_CONFIG: Record<
  CourierType,
  { label: string; labelBn: string; colorClass: string; bgClass: string; borderClass: string }
> = {
  express: {
    label: 'Express',
    labelBn: 'এক্সপ্রেস',
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  standard: {
    label: 'Standard',
    labelBn: 'স্ট্যান্ডার্ড',
    colorClass: 'text-sky-700',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200',
  },
  freight: {
    label: 'Freight',
    labelBn: 'ফ্রেইট',
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
};

// ─── On-Time Rate Color ────────────────────────────────────────────

function getOnTimeColor(rate: number): string {
  if (rate > 85) return '#10b981'; // emerald-500
  if (rate > 75) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

function getOnTimeTrackColor(rate: number): string {
  if (rate > 85) return '#d1fae5'; // emerald-100
  if (rate > 75) return '#fef3c7'; // amber-100
  return '#fee2e2'; // red-100
}

function getOnTimeTextColor(rate: number): string {
  if (rate > 85) return 'text-emerald-700';
  if (rate > 75) return 'text-amber-700';
  return 'text-red-700';
}

// ─── Circular Progress Indicator ───────────────────────────────────

function CircularProgress({
  value,
  size = 56,
  strokeWidth = 4,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={getOnTimeTrackColor(value)}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={getOnTimeColor(value)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Percentage text */}
      <span
        className={`absolute text-xs font-bold ${getOnTimeTextColor(value)}`}
      >
        {value}%
      </span>
    </div>
  );
}

// ─── Courier Card ──────────────────────────────────────────────────

function CourierCard({
  courier,
  index,
}: {
  courier: CourierPartner;
  index: number;
}) {
  const typeConfig = COURIER_TYPE_CONFIG[courier.type];

  return (
    <motion.div variants={cardVariants}>
      <Card className="relative overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Color accent bar at top */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: courier.logoColor }}
        />

        <CardContent className="p-4 pt-5">
          {/* Courier name + Bengali name */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 truncate">
                {courier.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {courier.nameBn}
              </p>
            </div>
            {/* Type badge */}
            <Badge
              variant="outline"
              className={`shrink-0 text-[10px] px-1.5 py-0 ${typeConfig.bgClass} ${typeConfig.colorClass} ${typeConfig.borderClass} border`}
            >
              {typeConfig.label}
            </Badge>
          </div>

          {/* Coverage */}
          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            <span className="font-medium text-slate-700">Coverage:</span>{' '}
            {courier.coverage}
          </p>

          {/* On-time rate + Avg delivery days */}
          <div className="flex items-center justify-between mb-3">
            {/* Circular progress for on-time rate */}
            <div className="flex items-center gap-2">
              <CircularProgress value={courier.onTimeRate} />
              <div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  On-Time
                </p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Delivery
                </p>
              </div>
            </div>

            {/* Avg delivery days */}
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">
                {courier.avgDeliveryDays}{' '}
                <span className="text-xs font-normal text-slate-500">days</span>
              </p>
              <p className="text-[10px] text-slate-400">দিন (avg)</p>
            </div>
          </div>

          {/* Active shipments */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-600">Active Shipments</span>
            </div>
            <Badge
              variant="secondary"
              className="text-xs font-semibold bg-slate-100 text-slate-700"
            >
              {courier.activeShipments}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function CourierOverview() {
  const couriers = useWarehouseStore((s) => s.couriers);

  // Computed summary values
  const totalActive = couriers.reduce((sum, c) => sum + c.activeShipments, 0);
  const avgOnTime =
    couriers.length > 0
      ? Math.round(
          couriers.reduce((sum, c) => sum + c.onTimeRate, 0) / couriers.length
        )
      : 0;
  const fastest = couriers.reduce(
    (best, c) =>
      c.avgDeliveryDays < best.avgDeliveryDays ? c : best,
    couriers[0]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Courier Partners{' '}
            <span className="text-slate-400 font-normal">/ কুরিয়ার পার্টনার</span>
          </h2>
        </div>
        <Badge
          variant="outline"
          className="w-fit text-xs border-emerald-300 bg-emerald-50 text-emerald-700"
        >
          <Zap className="h-3 w-3 mr-1" />
          BD Logistics Network
        </Badge>
      </div>

      {/* Courier Cards Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {couriers.map((courier, idx) => (
          <CourierCard key={courier.id} courier={courier} index={idx} />
        ))}
      </motion.div>

      {/* Summary Row */}
      <Separator />
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {/* Total Active Shipments */}
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-emerald-100">
            <Truck className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Active Shipments</p>
            <p className="text-xl font-bold text-slate-900">{totalActive}</p>
          </div>
        </div>

        {/* Avg On-Time Rate */}
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-sky-100">
            <Zap className="h-4 w-4 text-sky-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Avg On-Time Rate</p>
            <p className="text-xl font-bold text-slate-900">
              {avgOnTime}%
            </p>
          </div>
        </div>

        {/* Fastest Courier */}
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-amber-100">
            <Package className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Fastest Courier</p>
            <p className="text-sm font-bold text-slate-900">
              {fastest?.name ?? '—'}
            </p>
            <p className="text-[10px] text-slate-400">
              {fastest ? `${fastest.avgDeliveryDays} days avg` : ''}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default CourierOverview;
