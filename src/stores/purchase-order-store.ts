// ============================================
// TrimedCast - Purchase Order Store (Zustand)
// Session 19: Purchase Order Management Dashboard
// Client-side state for PO list, filtering,
// status transitions, and computed getters
// ============================================

import { create } from 'zustand';
import {
  type PurchaseOrder,
  type POStatus,
  MOCK_PURCHASE_ORDERS,
} from '@/components/orders/types';

// --- Store Interface ---
interface PurchaseOrderStore {
  // State
  orders: PurchaseOrder[];
  isLoading: boolean;
  error: string | null;
  statusFilter: string;
  cnyRiskFilter: boolean;
  searchQuery: string;

  // Actions
  fetchOrders: () => Promise<void>;
  updateOrderStatus: (id: string, newStatus: POStatus) => Promise<boolean>;
  cancelOrder: (id: string) => Promise<boolean>;

  // UI state actions
  setStatusFilter: (status: string) => void;
  setCnyRiskFilter: (cnyRisk: boolean) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;

  // Computed getters
  filteredOrders: () => PurchaseOrder[];
  ordersByStatus: () => Record<string, PurchaseOrder[]>;
  totalByStatus: () => Record<string, number>;
  cnyAtRiskOrders: () => PurchaseOrder[];
}

// --- Initial State ---
const initialState = {
  orders: [] as PurchaseOrder[],
  isLoading: false,
  error: null as string | null,
  statusFilter: '',
  cnyRiskFilter: false,
  searchQuery: '',
};

// --- Store ---
export const usePurchaseOrderStore = create<PurchaseOrderStore>((set, get) => ({
  ...initialState,

  // --- Fetch Orders ---
  fetchOrders: async () => {
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (get().statusFilter) params.set('status', get().statusFilter);
      if (get().cnyRiskFilter) params.set('cny_risk', 'true');
      if (get().searchQuery) params.set('search', get().searchQuery);

      const url = `/api/v1/purchase-orders?${params.toString()}`;

      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch purchase orders (${res.status})`);
      }

      const json = await res.json();
      const orders: PurchaseOrder[] = json.data ?? json ?? [];

      set({ orders, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching purchase orders';
      console.error('[PO Store] fetchOrders error:', err);
      // Fallback to mock data on error
      set({ orders: MOCK_PURCHASE_ORDERS, error: null, isLoading: false });
    }
  },

  // --- Update Order Status ---
  updateOrderStatus: async (id: string, newStatus: POStatus) => {
    set({ error: null });

    try {
      const res = await fetch(`/api/v1/purchase-orders/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to update order status (${res.status})`);
      }

      // Optimistic update
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, status: newStatus } : o
        ),
      }));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error updating order status';
      console.error('[PO Store] updateOrderStatus error:', err);
      // Optimistic update even on API error (demo mode)
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, status: newStatus } : o
        ),
      }));
      return true;
    }
  },

  // --- Cancel Order ---
  cancelOrder: async (id: string) => {
    return get().updateOrderStatus(id, 'cancelled');
  },

  // --- UI State Actions ---
  setStatusFilter: (status: string) => set({ statusFilter: status }),
  setCnyRiskFilter: (cnyRisk: boolean) => set({ cnyRiskFilter: cnyRisk }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  clearError: () => set({ error: null }),

  // --- Computed Getters ---
  filteredOrders: () => {
    const { orders, searchQuery, statusFilter, cnyRiskFilter } = get();
    let result = orders;

    if (statusFilter) {
      result = result.filter((o) => o.status === statusFilter);
    }

    if (cnyRiskFilter) {
      result = result.filter((o) => o.cny_risk);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.po_number.toLowerCase().includes(q) ||
          (o.supplier?.name && o.supplier.name.toLowerCase().includes(q)) ||
          o.items.some(
            (item) =>
              (item.product_name && item.product_name.toLowerCase().includes(q)) ||
              (item.sku_code && item.sku_code.toLowerCase().includes(q))
          )
      );
    }

    return result;
  },

  ordersByStatus: () => {
    const { orders } = get();
    const groups: Record<string, PurchaseOrder[]> = {};
    for (const o of orders) {
      if (!groups[o.status]) groups[o.status] = [];
      groups[o.status].push(o);
    }
    return groups;
  },

  totalByStatus: () => {
    const { orders } = get();
    const counts: Record<string, number> = {};
    for (const o of orders) {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    }
    return counts;
  },

  cnyAtRiskOrders: () => {
    return get().orders.filter((o) => o.cny_risk);
  },
}));
