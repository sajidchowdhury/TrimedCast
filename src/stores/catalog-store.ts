// ============================================
// TrimedCast — Product Catalog & Inventory Intelligence Store
// Session 28: Product Catalog & Inventory Intelligence Dashboard
// ============================================

import { create } from 'zustand';
import type {
  Product,
  CategorySummary,
  ABCAnalysis,
  StockAgingBucket,
  InventoryTurnover,
  DeadStockItem,
  LifecycleProduct,
  DemandVariability,
  ABCClass,
  StockHealth,
  LifecycleStage,
} from '@/components/catalog/types';
import {
  MOCK_PRODUCTS,
  MOCK_CATEGORY_SUMMARIES,
  MOCK_ABC_ANALYSIS,
  MOCK_STOCK_AGING,
  MOCK_TURNOVER,
  MOCK_DEAD_STOCK,
  MOCK_LIFECYCLE_PRODUCTS,
  MOCK_DEMAND_VARIABILITY,
} from '@/components/catalog/types';

// ─── Filter Types ──────────────────────────────────────────────

export type CatalogTab =
  | 'overview'
  | 'abc-xyz'
  | 'lifecycle'
  | 'aging'
  | 'turnover'
  | 'dead-stock'
  | 'demand';

// ─── Store State & Actions ─────────────────────────────────────

interface CatalogState {
  // Data
  products: Product[];
  categories: CategorySummary[];
  abcAnalysis: ABCAnalysis[];
  stockAging: StockAgingBucket[];
  turnover: InventoryTurnover[];
  deadStock: DeadStockItem[];
  lifecycle: LifecycleProduct[];
  demandVar: DemandVariability[];

  // Loading & Error
  isLoading: boolean;
  error: string | null;

  // Filters
  activeTab: CatalogTab;
  searchQuery: string;
  categoryFilter: string | null;
  abcFilter: ABCClass | null;
  healthFilter: StockHealth | null;
  lifecycleFilter: LifecycleStage | null;

  // Actions — Fetch
  fetchProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchABCAnalysis: () => Promise<void>;
  fetchStockAging: () => Promise<void>;
  fetchTurnover: () => Promise<void>;
  fetchDeadStock: () => Promise<void>;
  fetchLifecycle: () => Promise<void>;
  fetchDemandVar: () => Promise<void>;
  fetchAll: () => Promise<void>;

  // Actions — UI
  setActiveTab: (tab: CatalogTab) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string | null) => void;
  setAbcFilter: (cls: ABCClass | null) => void;
  setHealthFilter: (health: StockHealth | null) => void;
  setLifecycleFilter: (stage: LifecycleStage | null) => void;
  clearError: () => void;
}

// ─── Selectors (computed via getters) ──────────────────────────

export function selectFilteredProducts(state: CatalogState): Product[] {
  let filtered = [...state.products];

  // Search filter — matches name, nameBn, sku, supplier
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.nameBn.includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  // Category filter
  if (state.categoryFilter) {
    filtered = filtered.filter((p) => p.category === state.categoryFilter);
  }

  // ABC filter
  if (state.abcFilter) {
    filtered = filtered.filter((p) => p.abcClass === state.abcFilter);
  }

  // Health filter
  if (state.healthFilter) {
    filtered = filtered.filter((p) => p.stockHealth === state.healthFilter);
  }

  // Lifecycle filter
  if (state.lifecycleFilter) {
    filtered = filtered.filter((p) => p.lifecycleStage === state.lifecycleFilter);
  }

  return filtered;
}

export function selectTotalProducts(state: CatalogState): number {
  return state.products.length;
}

export function selectTotalStockValue(state: CatalogState): number {
  return state.products.reduce((sum, p) => sum + p.stockQty * p.costPrice, 0);
}

export function selectAvgTurnover(state: CatalogState): number {
  if (state.products.length === 0) return 0;
  const total = state.products.reduce((sum, p) => sum + p.turnoverRate, 0);
  return Math.round((total / state.products.length) * 10) / 10;
}

export function selectDeadStockValue(state: CatalogState): number {
  return state.deadStock.reduce((sum, d) => sum + d.stockValue, 0);
}

export function selectCriticalCount(state: CatalogState): number {
  return state.products.filter((p) => p.stockHealth === 'critical').length;
}

// ─── Helper: fetch with mock fallback ──────────────────────────

async function fetchWithMock<T>(url: string, mockData: T): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    const json = await response.json();
    if (json.data) {
      return json.data as T;
    }
    return mockData;
  } catch {
    return mockData;
  }
}

// ─── Store ─────────────────────────────────────────────────────

export const useCatalogStore = create<CatalogState>((set, get) => ({
  // Initial data — empty until fetched
  products: [],
  categories: [],
  abcAnalysis: [],
  stockAging: [],
  turnover: [],
  deadStock: [],
  lifecycle: [],
  demandVar: [],

  isLoading: false,
  error: null,

  activeTab: 'overview',
  searchQuery: '',
  categoryFilter: null,
  abcFilter: null,
  healthFilter: null,
  lifecycleFilter: null,

  // ── Fetch Actions ──────────────────────────────────────────

  fetchProducts: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const data = await fetchWithMock<Product[]>('/api/v1/catalog/products', MOCK_PRODUCTS);
      set({ products: data, isLoading: false });
    } catch (err) {
      set({ products: MOCK_PRODUCTS, isLoading: false, error: (err as Error).message });
    }
  },

  fetchCategories: async () => {
    try {
      const data = await fetchWithMock<CategorySummary[]>('/api/v1/catalog/categories', MOCK_CATEGORY_SUMMARIES);
      set({ categories: data });
    } catch {
      set({ categories: MOCK_CATEGORY_SUMMARIES });
    }
  },

  fetchABCAnalysis: async () => {
    try {
      const data = await fetchWithMock<ABCAnalysis[]>('/api/v1/catalog/abc-analysis', MOCK_ABC_ANALYSIS);
      set({ abcAnalysis: data });
    } catch {
      set({ abcAnalysis: MOCK_ABC_ANALYSIS });
    }
  },

  fetchStockAging: async () => {
    try {
      const data = await fetchWithMock<StockAgingBucket[]>('/api/v1/catalog/stock-aging', MOCK_STOCK_AGING);
      set({ stockAging: data });
    } catch {
      set({ stockAging: MOCK_STOCK_AGING });
    }
  },

  fetchTurnover: async () => {
    try {
      const data = await fetchWithMock<InventoryTurnover[]>('/api/v1/catalog/turnover', MOCK_TURNOVER);
      set({ turnover: data });
    } catch {
      set({ turnover: MOCK_TURNOVER });
    }
  },

  fetchDeadStock: async () => {
    try {
      const data = await fetchWithMock<DeadStockItem[]>('/api/v1/catalog/dead-stock', MOCK_DEAD_STOCK);
      set({ deadStock: data });
    } catch {
      set({ deadStock: MOCK_DEAD_STOCK });
    }
  },

  fetchLifecycle: async () => {
    try {
      const data = await fetchWithMock<LifecycleProduct[]>('/api/v1/catalog/lifecycle', MOCK_LIFECYCLE_PRODUCTS);
      set({ lifecycle: data });
    } catch {
      set({ lifecycle: MOCK_LIFECYCLE_PRODUCTS });
    }
  },

  fetchDemandVar: async () => {
    try {
      const data = await fetchWithMock<DemandVariability[]>('/api/v1/catalog/demand-variability', MOCK_DEMAND_VARIABILITY);
      set({ demandVar: data });
    } catch {
      set({ demandVar: MOCK_DEMAND_VARIABILITY });
    }
  },

  fetchAll: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      // Fetch all data in parallel with mock fallback
      const [
        products,
        categories,
        abcAnalysis,
        stockAging,
        turnover,
        deadStock,
        lifecycle,
        demandVar,
      ] = await Promise.all([
        fetchWithMock<Product[]>('/api/v1/catalog/products', MOCK_PRODUCTS),
        fetchWithMock<CategorySummary[]>('/api/v1/catalog/categories', MOCK_CATEGORY_SUMMARIES),
        fetchWithMock<ABCAnalysis[]>('/api/v1/catalog/abc-analysis', MOCK_ABC_ANALYSIS),
        fetchWithMock<StockAgingBucket[]>('/api/v1/catalog/stock-aging', MOCK_STOCK_AGING),
        fetchWithMock<InventoryTurnover[]>('/api/v1/catalog/turnover', MOCK_TURNOVER),
        fetchWithMock<DeadStockItem[]>('/api/v1/catalog/dead-stock', MOCK_DEAD_STOCK),
        fetchWithMock<LifecycleProduct[]>('/api/v1/catalog/lifecycle', MOCK_LIFECYCLE_PRODUCTS),
        fetchWithMock<DemandVariability[]>('/api/v1/catalog/demand-variability', MOCK_DEMAND_VARIABILITY),
      ]);

      set({
        products,
        categories,
        abcAnalysis,
        stockAging,
        turnover,
        deadStock,
        lifecycle,
        demandVar,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      // Full mock fallback
      set({
        products: MOCK_PRODUCTS,
        categories: MOCK_CATEGORY_SUMMARIES,
        abcAnalysis: MOCK_ABC_ANALYSIS,
        stockAging: MOCK_STOCK_AGING,
        turnover: MOCK_TURNOVER,
        deadStock: MOCK_DEAD_STOCK,
        lifecycle: MOCK_LIFECYCLE_PRODUCTS,
        demandVar: MOCK_DEMAND_VARIABILITY,
        isLoading: false,
        error: (err as Error).message,
      });
    }
  },

  // ── UI Actions ────────────────────────────────────────────

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setAbcFilter: (cls) => set({ abcFilter: cls }),
  setHealthFilter: (health) => set({ healthFilter: health }),
  setLifecycleFilter: (stage) => set({ lifecycleFilter: stage }),
  clearError: () => set({ error: null }),
}));
