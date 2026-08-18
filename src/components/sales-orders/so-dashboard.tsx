'use client';

// ============================================
// TrimedCast — Sales Order Dashboard
// Session 23: Sales Order Management
// ============================================

import { useEffect, useState } from 'react';
import { ShoppingBag, Plus, AlertCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSalesOrderStore } from '@/stores/sales-order-store';
import type { SalesOrder } from './types';
import { SOSummaryCards } from './so-summary-cards';
import { SOTable } from './so-table';
import { SOFormDialog } from './so-form-dialog';
import { SODetailSheet } from './so-detail-sheet';

export function SODashboard() {
  const { fetchOrders, isLoading, error, clearError } = useSalesOrderStore();

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleViewOrder(order: SalesOrder) {
    useSalesOrderStore.getState().selectOrder(order);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-emerald-500" />
            Sales Order Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            বিক্রয় আদেশ ব্যবস্থাপনা
          </p>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Order
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <Alert variant="destructive" className="relative">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex-1">{error}</AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 absolute right-2 top-2"
            onClick={clearError}
          >
            <X className="h-3 w-3" />
          </Button>
        </Alert>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-sm text-muted-foreground">Loading orders...</span>
        </div>
      )}

      {/* Dashboard Content */}
      {!isLoading && (
        <>
          {/* Summary Cards */}
          <SOSummaryCards />

          {/* Table with Filters */}
          <SOTable onViewOrder={handleViewOrder} />
        </>
      )}

      {/* Create Order Dialog */}
      <SOFormDialog open={formOpen} onOpenChange={setFormOpen} />

      {/* Order Detail Sheet */}
      <SODetailSheet open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
