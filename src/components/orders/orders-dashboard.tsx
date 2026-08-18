'use client';

// ============================================
// TrimedCast - Orders Dashboard
// Session 19: Purchase Order Management Dashboard
// Main dashboard with tabs, stats, PO table,
// and recommended orders panel
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePurchaseOrderStore } from '@/stores/purchase-order-store';
import { useRecommendedOrderStore } from '@/stores/recommended-order-store';
import type { PurchaseOrder, POStatus } from './types';
import { MOCK_PURCHASE_ORDERS, MOCK_RECOMMENDED_ORDERS } from './types';
import { POStatsCards } from './po-stats-cards';
import { PurchaseOrderTable } from './purchase-order-table';
import { PurchaseOrderDetailSheet } from './purchase-order-detail-sheet';
import { RecommendedOrdersPanel } from './recommended-orders-panel';

// --- Main Dashboard Component ---
export function OrdersDashboard() {
  // --- PO Store ---
  const {
    orders: poOrders,
    isLoading: poLoading,
    error: poError,
    searchQuery: poSearch,
    statusFilter: poStatusFilter,
    cnyRiskFilter: poCnyFilter,
    fetchOrders: fetchPOs,
    updateOrderStatus,
    setSearchQuery: setPOSearch,
    setStatusFilter: setPOStatusFilter,
    setCnyRiskFilter: setPOCnyFilter,
    clearError: clearPOError,
    filteredOrders: poFiltered,
    totalByStatus: poTotalByStatus,
  } = usePurchaseOrderStore();

  // --- RO Store ---
  const {
    orders: roOrders,
    isLoading: roLoading,
    error: roError,
    urgencyFilter: roUrgency,
    statusFilter: roStatusFilter,
    cnyRiskFilter: roCnyFilter,
    fetchOrders: fetchROs,
    approveOrder,
    rejectOrder,
    convertToPO,
    setUrgencyFilter: setROUrgency,
    setStatusFilter: setROStatusFilter,
    setCnyRiskFilter: setROCnyFilter,
    clearError: clearROError,
    filteredOrders: roFiltered,
  } = useRecommendedOrderStore();

  // --- Detail Sheet State ---
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // --- Fetch on Mount ---
  useEffect(() => {
    fetchPOs();
    fetchROs();
  }, [fetchPOs, fetchROs]);

  // --- Use mock data if API returns empty ---
  const displayPOOrders = poOrders.length > 0 ? poFiltered() : MOCK_PURCHASE_ORDERS;
  const displayROOrders = roOrders.length > 0 ? roFiltered() : MOCK_RECOMMENDED_ORDERS;
  const allPOOrders = poOrders.length > 0 ? poOrders : MOCK_PURCHASE_ORDERS;
  const allROOrders = roOrders.length > 0 ? roOrders : MOCK_RECOMMENDED_ORDERS;
  const statusCounts = poOrders.length > 0 ? poTotalByStatus() : (() => {
    const counts: Record<string, number> = {};
    for (const o of MOCK_PURCHASE_ORDERS) {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    }
    return counts;
  })();

  // --- Handlers ---
  const handleViewDetail = useCallback((order: PurchaseOrder) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  }, []);

  const handleUpdateStatus = useCallback(async (id: string, newStatus: POStatus) => {
    await updateOrderStatus(id, newStatus);
    // Update the detail sheet if the same order is open
    setSelectedOrder((prev) => {
      if (prev && prev.id === id) {
        return { ...prev, status: newStatus };
      }
      return prev;
    });
  }, [updateOrderStatus]);

  const handleApprove = useCallback(async (id: string) => {
    await approveOrder(id);
  }, [approveOrder]);

  const handleReject = useCallback(async (id: string) => {
    await rejectOrder(id);
  }, [rejectOrder]);

  const handleConvertToPO = useCallback(async (id: string) => {
    await convertToPO(id);
  }, [convertToPO]);

  const isLoading = poLoading || roLoading;
  const hasError = poError || roError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <ShoppingCart className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Purchase Order Management</h1>
          <p className="text-sm text-muted-foreground">ক্রয় আদেশ ব্যবস্থাপনা</p>
        </div>
      </div>

      {/* Error Banner */}
      {hasError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-sm text-red-600 dark:text-red-400 flex-1">
            {poError ?? roError}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => { clearPOError(); clearROError(); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading orders...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Stats Cards */}
          <POStatsCards orders={allPOOrders} />

          {/* Tabs: PO Table | Recommended Orders */}
          <Tabs defaultValue="purchase-orders" className="space-y-4">
            <TabsList>
              <TabsTrigger value="purchase-orders" className="gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" />
                Purchase Orders
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {allPOOrders.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="recommended-orders" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Recommended Orders
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {allROOrders.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Purchase Orders Tab */}
            <TabsContent value="purchase-orders" className="space-y-4">
              <PurchaseOrderTable
                orders={displayPOOrders}
                searchQuery={poSearch}
                statusFilter={poStatusFilter}
                cnyRiskFilter={poCnyFilter}
                onSearchChange={setPOSearch}
                onStatusFilterChange={setPOStatusFilter}
                onCnyRiskFilterChange={setPOCnyFilter}
                onViewDetail={handleViewDetail}
                onUpdateStatus={handleUpdateStatus}
                totalByStatus={statusCounts}
              />

              {/* Detail Sheet */}
              <PurchaseOrderDetailSheet
                open={detailOpen}
                onOpenChange={setDetailOpen}
                order={selectedOrder}
                onUpdateStatus={handleUpdateStatus}
              />
            </TabsContent>

            {/* Recommended Orders Tab */}
            <TabsContent value="recommended-orders" className="space-y-4">
              <RecommendedOrdersPanel
                orders={displayROOrders}
                urgencyFilter={roUrgency}
                statusFilter={roStatusFilter}
                cnyRiskFilter={roCnyFilter}
                onUrgencyFilterChange={setROUrgency}
                onStatusFilterChange={setROStatusFilter}
                onCnyRiskFilterChange={setROCnyFilter}
                onApprove={handleApprove}
                onReject={handleReject}
                onConvertToPO={handleConvertToPO}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
