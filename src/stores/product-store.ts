// ============================================
// TrimedCast - Product Store (Zustand)
// Session 18: Product & Supplier Management
// Client-side state for CRUD + filtering
// ============================================

import { create } from 'zustand';
import {
  type Product,
  type CreateProductInput,
  type UpdateProductInput,
} from '@/components/products/types';

// --- Pagination ---
interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

// --- Store Interface ---
interface ProductStore {
  // State
  products: Product[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  categoryFilter: string;
  lowStockFilter: boolean;
  activeOnly: boolean;
  pagination: Pagination;

  // CRUD actions
  fetchProducts: (page?: number, perPage?: number) => Promise<void>;
  createProduct: (data: CreateProductInput) => Promise<boolean>;
  updateProduct: (id: string, data: UpdateProductInput) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;

  // UI state actions
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setLowStockFilter: (lowStock: boolean) => void;
  setActiveOnly: (activeOnly: boolean) => void;
  clearError: () => void;

  // Computed getters
  filteredProducts: () => Product[];
  lowStockProducts: () => Product[];
  categoryGroups: () => Record<string, number>;
  stockSummary: () => { total: number; healthy: number; low: number; out: number };
}

// --- Initial State ---
const initialState = {
  products: [] as Product[],
  isLoading: false,
  error: null as string | null,
  searchQuery: '',
  categoryFilter: '',
  lowStockFilter: false,
  activeOnly: false,
  pagination: { page: 1, perPage: 20, total: 0, totalPages: 0 } as Pagination,
};

// --- Store ---
export const useProductStore = create<ProductStore>((set, get) => ({
  ...initialState,

  // --- CRUD Actions ---

  fetchProducts: async (page?: number, perPage?: number) => {
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      const p = page ?? get().pagination.page;
      const pp = perPage ?? get().pagination.perPage;
      params.set('page', String(p));
      params.set('per_page', String(pp));
      if (get().searchQuery) params.set('search', get().searchQuery);
      if (get().categoryFilter) params.set('category', get().categoryFilter);
      if (get().activeOnly) params.set('active_only', 'true');
      if (get().lowStockFilter) params.set('low_stock', 'true');

      const url = `/api/v1/products?${params.toString()}`;

      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch products (${res.status})`);
      }

      const json = await res.json();
      const products: Product[] = json.data ?? json ?? [];
      const pagination: Pagination = json.pagination ?? {
        page: p,
        perPage: pp,
        total: products.length,
        totalPages: 1,
      };

      set({ products, pagination, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching products';
      console.error('[Product Store] fetchProducts error:', err);
      set({ error: message, isLoading: false });
    }
  },

  createProduct: async (data: CreateProductInput) => {
    set({ error: null });

    try {
      const res = await fetch('/api/v1/products', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to create product (${res.status})`);
      }

      await get().fetchProducts();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error creating product';
      console.error('[Product Store] createProduct error:', err);
      set({ error: message });
      return false;
    }
  },

  updateProduct: async (id: string, data: UpdateProductInput) => {
    set({ error: null });

    try {
      const res = await fetch(`/api/v1/products/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to update product (${res.status})`);
      }

      await get().fetchProducts();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error updating product';
      console.error('[Product Store] updateProduct error:', err);
      set({ error: message });
      return false;
    }
  },

  deleteProduct: async (id: string) => {
    set({ error: null });

    try {
      const res = await fetch(`/api/v1/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to delete product (${res.status})`);
      }

      await get().fetchProducts();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error deleting product';
      console.error('[Product Store] deleteProduct error:', err);
      set({ error: message });
      return false;
    }
  },

  // --- UI State Actions ---

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setCategoryFilter: (category: string) => {
    set({ categoryFilter: category });
  },

  setLowStockFilter: (lowStock: boolean) => {
    set({ lowStockFilter: lowStock });
  },

  setActiveOnly: (activeOnly: boolean) => {
    set({ activeOnly });
  },

  clearError: () => {
    set({ error: null });
  },

  // --- Computed Getters ---

  filteredProducts: () => {
    const { products, searchQuery, categoryFilter, lowStockFilter, activeOnly } = get();
    let result = products;

    if (activeOnly) {
      result = result.filter((p) => p.is_active);
    }

    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter);
    }

    if (lowStockFilter) {
      result = result.filter((p) => {
        const avail = p.inventory?.qty_available ?? 0;
        const reorder = p.inventory?.reorder_point ?? 0;
        return avail <= reorder;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku_code.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.sub_category && p.sub_category.toLowerCase().includes(q)) ||
          (p.supplier?.name && p.supplier.name.toLowerCase().includes(q)),
      );
    }

    return result;
  },

  lowStockProducts: () => {
    return get().products.filter((p) => {
      const avail = p.inventory?.qty_available ?? 0;
      const reorder = p.inventory?.reorder_point ?? 0;
      return avail <= reorder;
    });
  },

  categoryGroups: () => {
    const { products } = get();
    const groups: Record<string, number> = {};
    for (const p of products) {
      groups[p.category] = (groups[p.category] ?? 0) + 1;
    }
    return groups;
  },

  stockSummary: () => {
    const { products } = get();
    let healthy = 0;
    let low = 0;
    let out = 0;
    for (const p of products) {
      const avail = p.inventory?.qty_available ?? 0;
      const reorder = p.inventory?.reorder_point ?? 0;
      if (avail === 0) out++;
      else if (avail <= reorder) low++;
      else healthy++;
    }
    return { total: products.length, healthy, low, out };
  },
}));
