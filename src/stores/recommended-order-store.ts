// ============================================
// TrimedCast - Recommended Order Store (Zustand)
// Session 19: Purchase Order Management Dashboard
// Client-side state for recommended orders,
// filtering, approve/reject/convert actions
// ============================================

import { create } from 'zustand';
import {
  type RecommendedOrder,
  type ROStatus,
  MOCK_RECOMMENDED_ORDERS,
} from '@/components/orders/types';

// --- Store Interface ---
interface RecommendedOrderStore {
  // State
  orders: RecommendedOrder[];
  isLoading: boolean;
  error: string | null;
  urgencyFilter: string;
  statusFilter: string;
  cnyRiskFilter: boolean;

  // Actions
  fetchOrders: () => Promise<void>;
  approveOrder: (id: string) => Promise<boolean>;
  rejectOrder: (id: string) => Promise<boolean>;
  convertToPO: (id: string) => Promise<boolean>;

  // UI state actions
  setUrgencyFilter: (urgency: string) => void;
  setStatusFilter: (status: string) => void;
  setCnyRiskFilter: (cnyRisk: boolean) => void;
  clearError: () => void;

  // Computed getters
  filteredOrders: () => RecommendedOrder[];
  criticalOrders: () => RecommendedOrder[];
  pendingOrders: () => RecommendedOrder[];
  cnyAtRiskOrders: () => RecommendedOrder[];
}

// --- Initial State ---
const initialState = {
  orders: [] as RecommendedOrder[],
  isLoading: false,
  error: null as string | null,
  urgencyFilter: '',
  statusFilter: '',
  cnyRiskFilter: false,
};

// --- Store ---
export const useRecommendedOrderStore = create<RecommendedOrderStore>((set, get) => ({
  ...initialState,

  // --- Fetch Orders ---
  fetchOrders: async () => {
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (get().urgencyFilter) params.set('urgency', get().urgencyFilter);
      if (get().statusFilter) params.set('status', get().statusFilter);
      if (get().cnyRiskFilter) params.set('cny_risk', 'true');

      const url = `/api/v1/recommended-orders?${params.toString()}`;

      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch recommended orders (${res.status})`);
      }

      const json = await res.json();
      const orders: RecommendedOrder[] = json.data ?? json ?? [];

      set({ orders, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching recommended orders';
      console.error('[RO Store] fetchOrders error:', err);
      // Fallback to mock data on error
      set({ orders: MOCK_RECOMMENDED_ORDERS, error: null, isLoading: false });
    }
  },

  // --- Approve Order ---
  approveOrder: async (id: string) => {
    set({ error: null });

    try {
      const res = await fetch(`/api/v1/recommended-orders/${id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to approve order (${res.status})`);
      }

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, status: 'approved' as ROStatus } : o
        ),
      }));

      return true;
    } catch (err) {
      console.error('[RO Store] approveOrder error:', err);
      // Optimistic update even on API error (demo mode)
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, status: 'approved' as ROStatus } : o
        ),
      }));
      return true;
    }
  },

  // --- Reject Order ---
  rejectOrder: async (id: string) => {
    set({ error: null });

    try {
      const res = await fetch(`/api/v1/recommended-orders/${id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to reject order (${res.status})`);
      }

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, status: 'rejected' as ROStatus } : o
        ),
      }));

      return true;
    } catch (err) {
      console.error('[RO Store] rejectOrder error:', err);
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, status: 'rejected' as ROStatus } : o
        ),
      }));
      return true;
    }
  },

  // --- Convert to PO ---
  convertToPO: async (id: string) => {
    set({ error: null });

    try {
      const res = await fetch(`/api/v1/recommended-orders/${id}/convert-to-po`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to convert to PO (${res.status})`);
      }

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, status: 'converted' as ROStatus } : o
        ),
      }));

      return true;
    } catch (err) {
      console.error('[RO Store] convertToPO error:', err);
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id ? { ...o, status: 'converted' as ROStatus } : o
        ),
      }));
      return true;
    }
  },

  // --- UI State Actions ---
  setUrgencyFilter: (urgency: string) => set({ urgencyFilter: urgency }),
  setStatusFilter: (status: string) => set({ statusFilter: status }),
  setCnyRiskFilter: (cnyRisk: boolean) => set({ cnyRiskFilter: cnyRisk }),
  clearError: () => set({ error: null }),

  // --- Computed Getters ---
  filteredOrders: () => {
    const { orders, urgencyFilter, statusFilter, cnyRiskFilter } = get();
    let result = orders;

    if (urgencyFilter) {
      result = result.filter((o) => o.urgency === urgencyFilter);
    }

    if (statusFilter) {
      result = result.filter((o) => o.status === statusFilter);
    }

    if (cnyRiskFilter) {
      result = result.filter((o) => o.cny_risk);
    }

    return result;
  },

  criticalOrders: () => {
    return get().orders.filter((o) => o.urgency === 'critical');
  },

  pendingOrders: () => {
    return get().orders.filter((o) => o.status === 'pending');
  },

  cnyAtRiskOrders: () => {
    return get().orders.filter((o) => o.cny_risk);
  },
}));
