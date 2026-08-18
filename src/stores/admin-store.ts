// ============================================
// TrimedCast — Admin Zustand Store
// Session 24: Multi-Tenant Admin Panel
// ============================================

import { create } from 'zustand';
import {
  type AdminTenant,
  type RevenueMetrics,
  type PlatformMetrics,
  type SystemHealth,
  type SecurityEventSummary,
  MOCK_TENANTS,
  MOCK_REVENUE,
  MOCK_METRICS,
  MOCK_HEALTH,
  MOCK_SECURITY,
} from '@/components/admin/types';

type TabFilter = 'overview' | 'tenants' | 'system' | 'revenue';

interface AdminState {
  // Data
  tenants: AdminTenant[];
  revenue: RevenueMetrics | null;
  metrics: PlatformMetrics | null;
  health: SystemHealth | null;
  security: SecurityEventSummary | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  tabFilter: TabFilter;
  searchQuery: string;
  planFilter: string;
  statusFilter: string;

  // Actions
  fetchTenants: () => Promise<void>;
  fetchRevenue: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchHealth: () => Promise<void>;
  fetchSecurity: () => Promise<void>;
  suspendTenant: (id: string) => Promise<void>;
  reactivateTenant: (id: string) => Promise<void>;
  setTabFilter: (tab: TabFilter) => void;
  setSearchQuery: (query: string) => void;
  setPlanFilter: (plan: string) => void;
  setStatusFilter: (status: string) => void;
  clearError: () => void;
  fetchAll: () => Promise<void>;

  // Computed
  filteredTenants: () => AdminTenant[];
  activeTenants: () => AdminTenant[];
  trialTenants: () => AdminTenant[];
}

export const useAdminStore = create<AdminState>((set, get) => ({
  // Initial state
  tenants: [],
  revenue: null,
  metrics: null,
  health: null,
  security: null,
  isLoading: false,
  error: null,
  tabFilter: 'overview',
  searchQuery: '',
  planFilter: 'all',
  statusFilter: 'all',

  // Fetch tenants (with mock fallback)
  fetchTenants: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/v1/admin/tenants');
      if (!res.ok) throw new Error('Failed to fetch tenants');
      const data = await res.json();
      set({ tenants: data.tenants ?? data ?? MOCK_TENANTS, isLoading: false });
    } catch {
      set({ tenants: MOCK_TENANTS, isLoading: false });
    }
  },

  // Fetch revenue (with mock fallback)
  fetchRevenue: async () => {
    try {
      const res = await fetch('/api/v1/admin/revenue');
      if (!res.ok) throw new Error('Failed to fetch revenue');
      const data = await res.json();
      set({ revenue: data ?? MOCK_REVENUE });
    } catch {
      set({ revenue: MOCK_REVENUE });
    }
  },

  // Fetch platform metrics (with mock fallback)
  fetchMetrics: async () => {
    try {
      const res = await fetch('/api/v1/admin/metrics');
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const data = await res.json();
      set({ metrics: data ?? MOCK_METRICS });
    } catch {
      set({ metrics: MOCK_METRICS });
    }
  },

  // Fetch system health (with mock fallback)
  fetchHealth: async () => {
    try {
      const res = await fetch('/api/v1/admin/system/health');
      if (!res.ok) throw new Error('Failed to fetch health');
      const data = await res.json();
      set({ health: data ?? MOCK_HEALTH });
    } catch {
      set({ health: { ...MOCK_HEALTH, lastChecked: new Date().toISOString() } });
    }
  },

  // Fetch security events (with mock fallback)
  fetchSecurity: async () => {
    try {
      const res = await fetch('/api/v1/admin/security');
      if (!res.ok) throw new Error('Failed to fetch security');
      const data = await res.json();
      set({ security: data ?? MOCK_SECURITY });
    } catch {
      set({ security: MOCK_SECURITY });
    }
  },

  // Suspend tenant
  suspendTenant: async (id: string) => {
    try {
      const res = await fetch(`/api/v1/tenants/${id}/suspend`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to suspend tenant');
      // Update local state
      set((state) => ({
        tenants: state.tenants.map((t) =>
          t.id === id ? { ...t, status: 'suspended', isActive: false } : t
        ),
      }));
    } catch {
      // Still update locally for demo
      set((state) => ({
        tenants: state.tenants.map((t) =>
          t.id === id ? { ...t, status: 'suspended', isActive: false } : t
        ),
      }));
    }
  },

  // Reactivate tenant
  reactivateTenant: async (id: string) => {
    try {
      const res = await fetch(`/api/v1/tenants/${id}/reactivate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reactivate tenant');
      set((state) => ({
        tenants: state.tenants.map((t) =>
          t.id === id ? { ...t, status: 'active', isActive: true } : t
        ),
      }));
    } catch {
      set((state) => ({
        tenants: state.tenants.map((t) =>
          t.id === id ? { ...t, status: 'active', isActive: true } : t
        ),
      }));
    }
  },

  // UI actions
  setTabFilter: (tab) => set({ tabFilter: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setPlanFilter: (plan) => set({ planFilter: plan }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  clearError: () => set({ error: null }),

  // Fetch all data
  fetchAll: async () => {
    set({ isLoading: true });
    await Promise.all([
      get().fetchTenants(),
      get().fetchRevenue(),
      get().fetchMetrics(),
      get().fetchHealth(),
      get().fetchSecurity(),
    ]);
    set({ isLoading: false });
  },

  // Computed: filtered tenants
  filteredTenants: () => {
    const { tenants, searchQuery, planFilter, statusFilter } = get();
    return tenants.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.acId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlan = planFilter === 'all' || t.plan === planFilter;
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  },

  // Computed: active tenants
  activeTenants: () => get().tenants.filter((t) => t.status === 'active'),

  // Computed: trial tenants
  trialTenants: () => get().tenants.filter((t) => t.status === 'trial'),
}));
