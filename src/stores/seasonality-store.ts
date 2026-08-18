// ============================================
// TrimedCast - Seasonality Type Store (Zustand)
// Session 17: Seasonality Type Management
// Client-side state for CRUD + filtering
// ============================================

import { create } from 'zustand';
import {
  type SeasonalityType,
  type CreateSeasonalityTypeInput,
  type UpdateSeasonalityTypeInput,
} from '@/components/seasonality/types';

// --- Store Interface ---

interface SeasonalityStore {
  // State
  types: SeasonalityType[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  activeOnly: boolean;

  // CRUD actions
  fetchTypes: () => Promise<void>;
  createType: (data: CreateSeasonalityTypeInput) => Promise<boolean>;
  updateType: (id: string, data: UpdateSeasonalityTypeInput) => Promise<boolean>;
  deleteType: (id: string) => Promise<boolean>;
  bulkToggle: (ids: string[], isActive: boolean) => Promise<boolean>;

  // UI state actions
  setSearchQuery: (query: string) => void;
  setActiveOnly: (activeOnly: boolean) => void;
  clearError: () => void;

  // Computed getters
  activeTypes: () => SeasonalityType[];
  defaultTypes: () => SeasonalityType[];
  customTypes: () => SeasonalityType[];
  filteredTypes: () => SeasonalityType[];
  getTypeByName: (name: string) => SeasonalityType | undefined;
  getActiveMonthsForDate: (date: Date) => SeasonalityType[];
  getCombinedMultiplierForDate: (date: Date) => number;
}

// --- Initial State ---

const initialState = {
  types: [] as SeasonalityType[],
  isLoading: false,
  error: null as string | null,
  searchQuery: '',
  activeOnly: false,
};

// --- Store ---

export const useSeasonalityStore = create<SeasonalityStore>((set, get) => ({
  ...initialState,

  // --- CRUD Actions ---

  fetchTypes: async () => {
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (get().activeOnly) params.set('active_only', 'true');
      if (get().searchQuery) params.set('search', get().searchQuery);

      const qs = params.toString();
      const url = `/api/v1/seasonality-types${qs ? `?${qs}` : ''}`;

      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch seasonality types (${res.status})`);
      }

      const json = await res.json();
      const types: SeasonalityType[] = json.data ?? json ?? [];

      set({ types, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching seasonality types';
      console.error('[Seasonality Store] fetchTypes error:', err);
      set({ error: message, isLoading: false });
    }
  },

  createType: async (data: CreateSeasonalityTypeInput) => {
    set({ error: null });

    try {
      const res = await fetch('/api/v1/seasonality-types', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to create seasonality type (${res.status})`);
      }

      // Re-fetch to get the full list with the new item
      await get().fetchTypes();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error creating seasonality type';
      console.error('[Seasonality Store] createType error:', err);
      set({ error: message });
      return false;
    }
  },

  updateType: async (id: string, data: UpdateSeasonalityTypeInput) => {
    set({ error: null });

    try {
      const res = await fetch(`/api/v1/seasonality-types/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to update seasonality type (${res.status})`);
      }

      // Re-fetch to sync
      await get().fetchTypes();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error updating seasonality type';
      console.error('[Seasonality Store] updateType error:', err);
      set({ error: message });
      return false;
    }
  },

  deleteType: async (id: string) => {
    set({ error: null });

    try {
      const res = await fetch(`/api/v1/seasonality-types/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to delete seasonality type (${res.status})`);
      }

      // Re-fetch to sync
      await get().fetchTypes();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error deleting seasonality type';
      console.error('[Seasonality Store] deleteType error:', err);
      set({ error: message });
      return false;
    }
  },

  bulkToggle: async (ids: string[], isActive: boolean) => {
    set({ error: null });

    try {
      const res = await fetch('/api/v1/seasonality-types/bulk-toggle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, is_active: isActive }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to bulk toggle seasonality types (${res.status})`);
      }

      // Re-fetch to sync
      await get().fetchTypes();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error bulk toggling seasonality types';
      console.error('[Seasonality Store] bulkToggle error:', err);
      set({ error: message });
      return false;
    }
  },

  // --- UI State Actions ---

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setActiveOnly: (activeOnly: boolean) => {
    set({ activeOnly });
  },

  clearError: () => {
    set({ error: null });
  },

  // --- Computed Getters ---

  activeTypes: () => {
    return get().types.filter((t) => t.is_active);
  },

  defaultTypes: () => {
    return get().types.filter((t) => t.is_default);
  },

  customTypes: () => {
    return get().types.filter((t) => !t.is_default);
  },

  filteredTypes: () => {
    const { types, searchQuery, activeOnly } = get();
    let result = types;

    if (activeOnly) {
      result = result.filter((t) => t.is_active);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((t) =>
        t.label.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.label_bn && t.label_bn.includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    return result;
  },

  getTypeByName: (name: string) => {
    return get().types.find((t) => t.name === name);
  },

  getActiveMonthsForDate: (date: Date) => {
    const month = date.getMonth() + 1; // JS months are 0-indexed
    return get().types.filter((t) => t.is_active && t.months.includes(month));
  },

  getCombinedMultiplierForDate: (date: Date) => {
    const activeForMonth = get().getActiveMonthsForDate(date);
    if (activeForMonth.length === 0) return 1.0;
    // Product of all active types' multipliers for that month
    return activeForMonth.reduce((product, t) => product * t.multiplier, 1.0);
  },
}));
