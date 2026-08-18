// ============================================
// TrimedCast — Sales Order Zustand Store
// Session 23: Sales Order Management
// ============================================

import { create } from 'zustand';
import type { SalesOrder, SOStatus, SOItem } from '@/components/sales-orders/types';
import { MOCK_SALES_ORDERS } from '@/components/sales-orders/types';

interface SalesOrderState {
  // Data
  orders: SalesOrder[];
  selectedOrder: SalesOrder | null;

  // Loading & Error
  isLoading: boolean;
  error: string | null;

  // Filters
  statusFilter: SOStatus | 'all';
  channelFilter: string;
  regionFilter: string;
  searchQuery: string;

  // Actions — Data
  fetchOrders: () => Promise<void>;
  createOrder: (order: Omit<SalesOrder, 'id' | 'order_no'>) => Promise<void>;
  updateOrderStatus: (id: string, status: SOStatus) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  fulfillOrder: (id: string) => Promise<void>;
  selectOrder: (order: SalesOrder | null) => void;

  // Actions — UI
  setStatusFilter: (filter: SOStatus | 'all') => void;
  setChannelFilter: (filter: string) => void;
  setRegionFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;

  // Computed
  filteredOrders: () => SalesOrder[];
  ordersByStatus: () => Record<SOStatus, SalesOrder[]>;
  totalRevenue: () => number;
  pendingCount: () => number;
  deliveredCount: () => number;
  overdueOrders: () => SalesOrder[];
}

export const useSalesOrderStore = create<SalesOrderState>((set, get) => ({
  // Initial State
  orders: [],
  selectedOrder: null,
  isLoading: false,
  error: null,
  statusFilter: 'all',
  channelFilter: '',
  regionFilter: '',
  searchQuery: '',

  // Fetch Orders — tries API first, falls back to mock
  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/sales-orders');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      const orders: SalesOrder[] = (json.data ?? []).map(mapApiOrder);
      set({ orders, isLoading: false });
    } catch {
      // Fallback to mock data
      set({ orders: MOCK_SALES_ORDERS, isLoading: false });
    }
  },

  // Create Order
  createOrder: async (orderData) => {
    set({ isLoading: true, error: null });
    try {
      const payload = {
        date: orderData.date,
        customer_id: orderData.customer_id,
        channel: orderData.channel,
        region: orderData.region,
        total_amount: orderData.total_amount,
        status: orderData.status,
        items: orderData.items,
      };

      const res = await fetch('/api/v1/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const json = await res.json();
      const newOrder = mapApiOrder(json.data ?? json);

      set((state) => ({
        orders: [newOrder, ...state.orders],
        isLoading: false,
      }));
    } catch {
      // Offline: create locally
      const newOrder: SalesOrder = {
        ...orderData,
        id: `so-local-${Date.now()}`,
        order_no: `SO-${String(get().orders.length + 1).padStart(5, '0')}`,
      };
      set((state) => ({
        orders: [newOrder, ...state.orders],
        isLoading: false,
      }));
    }
  },

  // Update Order Status
  updateOrderStatus: async (id, status) => {
    try {
      const res = await fetch(`/api/v1/sales-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
    } catch {
      // Offline: update locally
    }
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)),
      selectedOrder: state.selectedOrder?.id === id ? { ...state.selectedOrder, status } : state.selectedOrder,
    }));
  },

  // Cancel Order
  cancelOrder: async (id) => {
    await get().updateOrderStatus(id, 'cancelled');
  },

  // Fulfill Order (mark as delivered)
  fulfillOrder: async (id) => {
    await get().updateOrderStatus(id, 'delivered');
  },

  // Select Order
  selectOrder: (order) => {
    set({ selectedOrder: order });
  },

  // UI Filters
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setChannelFilter: (filter) => set({ channelFilter: filter }),
  setRegionFilter: (filter) => set({ regionFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearError: () => set({ error: null }),

  // Computed — Filtered Orders
  filteredOrders: () => {
    const { orders, statusFilter, channelFilter, regionFilter, searchQuery } = get();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (channelFilter && o.channel !== channelFilter) return false;
      if (regionFilter && o.region !== regionFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesOrderNo = o.order_no.toLowerCase().includes(q);
        const matchesCustomer = (o.customer_id ?? '').toLowerCase().includes(q);
        if (!matchesOrderNo && !matchesCustomer) return false;
      }
      return true;
    });
  },

  // Computed — Orders by Status
  ordersByStatus: () => {
    const { orders } = get();
    const grouped: Record<SOStatus, SalesOrder[]> = {
      pending: [],
      confirmed: [],
      shipped: [],
      delivered: [],
      cancelled: [],
    };
    orders.forEach((o) => {
      grouped[o.status].push(o);
    });
    return grouped;
  },

  // Computed — Total Revenue
  totalRevenue: () => {
    const { orders } = get();
    return orders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  },

  // Computed — Pending Count
  pendingCount: () => {
    const { orders } = get();
    return orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length;
  },

  // Computed — Delivered Count
  deliveredCount: () => {
    const { orders } = get();
    return orders.filter((o) => o.status === 'delivered').length;
  },

  // Computed — Overdue Orders (pending > 7 days)
  overdueOrders: () => {
    const { orders } = get();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return orders.filter((o) => {
      if (o.status !== 'pending' && o.status !== 'confirmed') return false;
      return new Date(o.date) < sevenDaysAgo;
    });
  },
}));

// Map API response to our SalesOrder interface
function mapApiOrder(raw: Record<string, unknown>): SalesOrder {
  return {
    id: String(raw.id ?? ''),
    order_no: String(raw.order_no ?? ''),
    date: String(raw.date ?? new Date().toISOString()),
    customer_id: raw.customer_id ? String(raw.customer_id) : null,
    channel: raw.channel ? String(raw.channel) : null,
    region: raw.region ? String(raw.region) : null,
    total_amount: typeof raw.total_amount === 'number' ? raw.total_amount : null,
    status: (raw.status as SOStatus) ?? 'pending',
    items: Array.isArray(raw.items) ? (raw.items as SOItem[]) : [],
  };
}
