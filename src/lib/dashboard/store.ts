// ============================================
// Dashboard Store — Zustand state management
// Navigation, active page, dashboard data
// ============================================

import { create } from 'zustand';

// Navigation pages for sidebar
export type DashboardPage =
  | 'overview'
  | 'forecast'
  | 'orders'
  | 'inventory'
  | 'import'
  | 'suppliers'
  | 'analytics'
  | 'soe'
  | 'ai-assistant'
  | 'billing'
  | 'api-explorer'
  | 'settings'
  | 'team'
  | 'help';

export interface SopCycleData {
  id: string;
  cycle_name: string;
  current_stage: string;
  status: string;
}

export interface DashboardKpis {
  total_skus: number;
  total_stock_value_bdt: number;
  stockout_risk_count: number;
  overstock_count: number;
  pending_purchase_orders: number;
  pending_sales_orders: number;
  avg_mape: number | null;
  forecast_accuracy_pct: number | null;
}

export interface UrgentOrder {
  id: string;
  product_name: string;
  sku_code: string;
  recommended_qty: number;
  order_trigger_date: string;
  urgency: string;
}

export interface RecentForecast {
  product_name: string;
  season: string | null;
  predicted_qty: number;
  mape: number | null;
  created_at: string;
}

export interface SeasonalSummary {
  current_season: string;
  next_season: string;
  days_to_next_season: number;
}

export interface DashboardData {
  sop_cycle: SopCycleData | null;
  kpis: DashboardKpis;
  urgent_orders: UrgentOrder[];
  recent_forecasts: RecentForecast[];
  seasonal_summary: SeasonalSummary;
}

interface DashboardStore {
  // Navigation
  activePage: DashboardPage;
  setActivePage: (page: DashboardPage) => void;

  // Dashboard data
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  fetchDashboardData: () => Promise<void>;
  refreshData: () => Promise<void>;

  // Right panel
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  rightPanelContent: 'audit-log' | 'notifications' | null;
  setRightPanelContent: (content: 'audit-log' | 'notifications' | null) => void;

  // Orders summary (shared across orders page)
  ordersCnyAtRisk: number;
  setOrdersCnyAtRisk: (count: number) => void;
}

const CACHE_TTL = 60_000; // 1 minute cache

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // Navigation
  activePage: 'soe',
  setActivePage: (page) => set({ activePage: page }),

  // Dashboard data
  data: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchDashboardData: async () => {
    const { lastFetched, isLoading } = get();
    // Skip if already loading or cache is fresh
    if (isLoading) return;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL && get().data) return;

    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/dashboard');
      const json = await res.json();
      if (json.success) {
        set({ data: json.data, isLoading: false, lastFetched: Date.now() });
      } else {
        set({ error: json.errors?.[0]?.message || 'Failed to load dashboard', isLoading: false });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Network error', isLoading: false });
    }
  },

  refreshData: async () => {
    set({ lastFetched: null });
    await get().fetchDashboardData();
  },

  // Right panel
  rightPanelOpen: false,
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  rightPanelContent: null,
  setRightPanelContent: (content) => set({ rightPanelContent: content, rightPanelOpen: content !== null }),

  // Orders summary
  ordersCnyAtRisk: 0,
  setOrdersCnyAtRisk: (count) => set({ ordersCnyAtRisk: count }),
}));
