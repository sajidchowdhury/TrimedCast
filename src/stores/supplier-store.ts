// ============================================
// TrimedCast - Supplier Store (Zustand)
// Session 18: Product & Supplier Management
// Client-side state for CRUD + filtering
// ============================================

import { create } from 'zustand';
import {
  type Supplier,
  type CreateSupplierInput,
  type UpdateSupplierInput,
} from '@/components/products/types';

// --- Store Interface ---
interface SupplierStore {
  // State
  suppliers: Supplier[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  countryFilter: string;
  cnyFilter: boolean | null; // null = all, true = CNY affected, false = not affected

  // CRUD actions
  fetchSuppliers: () => Promise<void>;
  createSupplier: (data: CreateSupplierInput) => Promise<boolean>;
  updateSupplier: (id: string, data: UpdateSupplierInput) => Promise<boolean>;
  deleteSupplier: (id: string) => Promise<boolean>;

  // UI state actions
  setSearchQuery: (query: string) => void;
  setCountryFilter: (country: string) => void;
  setCnyFilter: (filter: boolean | null) => void;
  clearError: () => void;

  // Computed getters
  filteredSuppliers: () => Supplier[];
  cnyAffectedSuppliers: () => Supplier[];
  countryGroups: () => Record<string, number>;
}

// --- Initial State ---
const initialState = {
  suppliers: [] as Supplier[],
  isLoading: false,
  error: null as string | null,
  searchQuery: '',
  countryFilter: '',
  cnyFilter: null as boolean | null,
};

// --- Store ---
export const useSupplierStore = create<SupplierStore>((set, get) => ({
  ...initialState,

  // --- CRUD Actions ---

  fetchSuppliers: async () => {
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (get().searchQuery) params.set('search', get().searchQuery);
      if (get().countryFilter) params.set('country', get().countryFilter);

      const qs = params.toString();
      const url = `/api/v1/suppliers${qs ? `?${qs}` : ''}`;

      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch suppliers (${res.status})`);
      }

      const json = await res.json();
      const suppliers: Supplier[] = json.data ?? json ?? [];

      set({ suppliers, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching suppliers';
      console.error('[Supplier Store] fetchSuppliers error:', err);
      set({ error: message, isLoading: false });
    }
  },

  createSupplier: async (data: CreateSupplierInput) => {
    set({ error: null });

    try {
      const res = await fetch('/api/v1/suppliers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to create supplier (${res.status})`);
      }

      await get().fetchSuppliers();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error creating supplier';
      console.error('[Supplier Store] createSupplier error:', err);
      set({ error: message });
      return false;
    }
  },

  updateSupplier: async (id: string, data: UpdateSupplierInput) => {
    set({ error: null });

    try {
      const res = await fetch(`/api/v1/suppliers/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to update supplier (${res.status})`);
      }

      await get().fetchSuppliers();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error updating supplier';
      console.error('[Supplier Store] updateSupplier error:', err);
      set({ error: message });
      return false;
    }
  },

  deleteSupplier: async (id: string) => {
    set({ error: null });

    try {
      const res = await fetch(`/api/v1/suppliers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to delete supplier (${res.status})`);
      }

      await get().fetchSuppliers();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error deleting supplier';
      console.error('[Supplier Store] deleteSupplier error:', err);
      set({ error: message });
      return false;
    }
  },

  // --- UI State Actions ---

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setCountryFilter: (country: string) => {
    set({ countryFilter: country });
  },

  setCnyFilter: (filter: boolean | null) => {
    set({ cnyFilter: filter });
  },

  clearError: () => {
    set({ error: null });
  },

  // --- Computed Getters ---

  filteredSuppliers: () => {
    const { suppliers, searchQuery, countryFilter, cnyFilter } = get();
    let result = suppliers;

    if (countryFilter) {
      result = result.filter((s) => s.country === countryFilter);
    }

    if (cnyFilter !== null) {
      result = result.filter((s) => s.is_cny_affected === cnyFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.code && s.code.toLowerCase().includes(q)) ||
          s.country.toLowerCase().includes(q) ||
          (s.contact_email && s.contact_email.toLowerCase().includes(q)),
      );
    }

    return result;
  },

  cnyAffectedSuppliers: () => {
    return get().suppliers.filter((s) => s.is_cny_affected);
  },

  countryGroups: () => {
    const { suppliers } = get();
    const groups: Record<string, number> = {};
    for (const s of suppliers) {
      groups[s.country] = (groups[s.country] ?? 0) + 1;
    }
    return groups;
  },
}));
