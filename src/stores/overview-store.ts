// ============================================
// TrimedCast — Overview Dashboard Zustand Store
// Session 20: Control Tower Dashboard
// ============================================

import { create } from 'zustand';
import type { DashboardData } from '@/components/overview/types';
import { MOCK_DASHBOARD_DATA } from '@/components/overview/types';

interface OverviewState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  fetchDashboard: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
}

export const useOverviewStore = create<OverviewState>((set, get) => ({
  data: null,
  isLoading: false,
  error: null,
  lastRefresh: null,

  fetchDashboard: async () => {
    // Don't re-fetch if already loading
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/v1/dashboard');

      if (!response.ok) {
        throw new Error(`Dashboard API returned ${response.status}`);
      }

      const json = await response.json();

      if (json.data) {
        set({
          data: json.data as DashboardData,
          isLoading: false,
          lastRefresh: new Date(),
          error: null,
        });
      } else {
        // No data field — use mock
        set({
          data: MOCK_DASHBOARD_DATA,
          isLoading: false,
          lastRefresh: new Date(),
          error: null,
        });
      }
    } catch {
      // On error, fall back to mock data so the UI still works
      set({
        data: MOCK_DASHBOARD_DATA,
        isLoading: false,
        lastRefresh: new Date(),
        error: null,
      });
    }
  },

  refreshDashboard: async () => {
    set({ isLoading: true, error: null });
    await get().fetchDashboard();
  },
}));
