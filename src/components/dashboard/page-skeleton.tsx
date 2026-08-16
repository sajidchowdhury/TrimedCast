'use client';

// ============================================
// Page Skeleton — Reusable loading skeletons
// for dashboard pages with responsive layout
// ============================================

import { Skeleton } from '@/components/ui/skeleton';

/** Full dashboard layout skeleton: header + sidebar space + content area */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar placeholder (hidden on mobile, visible on desktop) */}
      <div className="hidden md:block w-56 shrink-0 border-r border-border p-4 space-y-4">
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-px w-full" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
        <Skeleton className="h-px w-full" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 p-4 md:p-6 space-y-5">
        {/* Header bar */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-5 w-40 rounded" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>

        {/* S&OP progress bar */}
        <Skeleton className="h-16 w-full rounded-lg" />

        {/* KPI cards row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>

        {/* Three-column section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>

        {/* Quick actions */}
        <Skeleton className="h-28 w-full rounded-lg" />

        {/* Market intelligence */}
        <Skeleton className="h-36 w-full rounded-lg" />
      </div>
    </div>
  );
}

/** Forecast page skeleton: chart + metrics + panels */
export function ForecastSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-72 rounded" />
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      </div>

      {/* Product selector */}
      <Skeleton className="h-10 w-full rounded" />

      {/* Season toggle */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded" />
        ))}
      </div>

      {/* Main chart */}
      <Skeleton className="h-[450px] w-full rounded-lg" />

      {/* Metrics table */}
      <Skeleton className="h-40 w-full rounded-lg" />

      {/* Two-column panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  );
}

/** Data table skeleton: filter bar + rows */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Skeleton className="h-8 w-28 rounded" />
        <Skeleton className="h-8 w-28 rounded" />
        <Skeleton className="h-8 w-28 rounded" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>

      {/* Table header */}
      <Skeleton className="h-10 w-full rounded" />

      {/* Table rows */}
      <div className="space-y-1">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded" />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24 rounded" />
        <div className="flex gap-1">
          <Skeleton className="h-7 w-20 rounded" />
          <Skeleton className="h-7 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

/** Chart skeleton: for recharts containers */
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-36 rounded" />
        <Skeleton className="h-5 w-20 rounded" />
      </div>
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}
