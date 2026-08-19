'use client';

// ============================================
// TrimedCast — Catalog Dashboard Orchestrator
// Session 28: Product Catalog & Inventory Intelligence Dashboard
// ============================================

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  AlertCircle,
  X,
  LayoutDashboard,
  Grid3X3,
  RefreshCw,
  Clock,
  Skull,
  RotateCw,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import { useCatalogStore } from '@/stores/catalog-store';
import type { CatalogTab } from '@/stores/catalog-store';

import { ProductCatalog } from '@/components/catalog/product-catalog';
import { ABCXYZAnalysis } from '@/components/catalog/abc-xyz-analysis';
import { StockAgingAnalysis } from '@/components/catalog/stock-aging';
import { InventoryTurnoverAnalysis } from '@/components/catalog/inventory-turnover';
import { DeadStockPanel } from '@/components/catalog/dead-stock';
import { ProductLifecyclePanel } from '@/components/catalog/product-lifecycle';

// ─── Tab Configuration ─────────────────────────────────────────

const TAB_CONFIG: { value: CatalogTab; label: string; icon: React.ReactNode }[] = [
  {
    value: 'overview',
    label: 'Catalog',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    value: 'abc-xyz',
    label: 'ABC/XYZ',
    icon: <Grid3X3 className="h-4 w-4" />,
  },
  {
    value: 'lifecycle',
    label: 'Lifecycle',
    icon: <RefreshCw className="h-4 w-4" />,
  },
  {
    value: 'aging',
    label: 'Aging',
    icon: <Clock className="h-4 w-4" />,
  },
  {
    value: 'dead-stock',
    label: 'Dead Stock',
    icon: <Skull className="h-4 w-4" />,
  },
  {
    value: 'turnover',
    label: 'Turnover',
    icon: <RotateCw className="h-4 w-4" />,
  },
];

// ─── Loading Skeleton ──────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table skeleton */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────

export function CatalogDashboard() {
  const { isLoading, error, activeTab, fetchAll, setActiveTab, clearError } = useCatalogStore();

  // Fetch all data on mount
  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Product Catalog &amp; Inventory
          </h1>
          <p className="text-sm text-muted-foreground">
            পণ্য ক্যাটালগ ও ইনভেন্টরি
          </p>
        </div>
      </motion.div>

      {/* ── Error Banner ───────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                        Failed to load catalog data
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                        {error}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearError}
                    className="shrink-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading State ──────────────────────────────────── */}
      {isLoading && <DashboardSkeleton />}

      {/* ── Tabbed Content ─────────────────────────────────── */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as CatalogTab)}
            className="space-y-6"
          >
            {/* Tab Navigation */}
            <TabsList className="w-full sm:w-auto flex-wrap h-auto p-1 gap-0.5">
              {TAB_CONFIG.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1.5 text-xs sm:text-sm"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Catalog Tab ──────────────────────────────── */}
            <TabsContent value="overview">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ProductCatalog />
              </motion.div>
            </TabsContent>

            {/* ── ABC/XYZ Tab ──────────────────────────────── */}
            <TabsContent value="abc-xyz">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ABCXYZAnalysis />
              </motion.div>
            </TabsContent>

            {/* ── Lifecycle Tab ────────────────────────────── */}
            <TabsContent value="lifecycle">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ProductLifecyclePanel />
              </motion.div>
            </TabsContent>

            {/* ── Aging Tab (StockAging + Turnover stacked) ── */}
            <TabsContent value="aging">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <StockAgingAnalysis />
                <Separator />
                <InventoryTurnoverAnalysis />
              </motion.div>
            </TabsContent>

            {/* ── Dead Stock Tab ───────────────────────────── */}
            <TabsContent value="dead-stock">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <DeadStockPanel />
              </motion.div>
            </TabsContent>

            {/* ── Turnover Tab (full width) ────────────────── */}
            <TabsContent value="turnover">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <InventoryTurnoverAnalysis />
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </div>
  );
}

export default CatalogDashboard;
