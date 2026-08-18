// ============================================
// TrimedCast — Financial Analytics & Cost Intelligence Zustand Store
// Session 26: Financial Analytics & Cost Intelligence Dashboard
// ============================================

import { create } from 'zustand';
import type {
  CostCategory,
  MarginAnalysis,
  RevenueTrend,
  CurrencyExposure,
  CustomsDutyItem,
  PaymentTerm,
  BudgetItem,
  CostToServe,
  FinanceTab,
} from '@/components/finance/types';
import {
  MOCK_COST_CATEGORIES,
  MOCK_MARGIN_ANALYSIS,
  MOCK_REVENUE_TRENDS,
  MOCK_CURRENCY_EXPOSURE,
  MOCK_CUSTOMS_ITEMS,
  MOCK_PAYMENT_TERMS,
  MOCK_BUDGET,
  MOCK_COST_TO_SERVE,
  computeTotalCost,
  computeAvgMargin,
} from '@/components/finance/types';

// ─── Store Interface ─────────────────────────────────────────────────

interface FinanceState {
  // ── Data ────────────────────────────────────────────────────────
  costCategories: CostCategory[];
  margins: MarginAnalysis[];
  revenueTrends: RevenueTrend[];
  currencies: CurrencyExposure[];
  customsItems: CustomsDutyItem[];
  paymentTerms: PaymentTerm[];
  budget: BudgetItem[];
  costToServe: CostToServe[];

  // ── Loading & Error ─────────────────────────────────────────────
  isLoading: boolean;
  error: string | null;

  // ── UI State ────────────────────────────────────────────────────
  activeTab: FinanceTab;
  searchQuery: string;
  categoryFilter: string;     // product category or 'all'
  periodFilter: string;       // e.g. 'FY 2024-25 Q4' or 'all'

  // ── Actions — Data Fetching ─────────────────────────────────────
  fetchCostCategories: () => Promise<void>;
  fetchMargins: () => Promise<void>;
  fetchRevenueTrends: () => Promise<void>;
  fetchCurrencies: () => Promise<void>;
  fetchCustomsItems: () => Promise<void>;
  fetchPaymentTerms: () => Promise<void>;
  fetchBudget: () => Promise<void>;
  fetchCostToServe: () => Promise<void>;
  fetchAll: () => Promise<void>;

  // ── Actions — UI ────────────────────────────────────────────────
  setActiveTab: (tab: FinanceTab) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (filter: string) => void;
  setPeriodFilter: (filter: string) => void;
  clearError: () => void;

  // ── Computed / Selectors ────────────────────────────────────────
  filteredMargins: () => MarginAnalysis[];
  totalCost: () => number;
  avgMargin: () => number;
  currencyRisk: () => { high: number; critical: number; totalUnhedged: number };
  overduePayments: () => { totalAmount: number; supplierCount: number; worstOverdue: PaymentTerm | null };
  budgetVariance: () => { totalBudget: number; totalActual: number; totalVariance: number; criticalCount: number };
}

// ─── Store Implementation ───────────────────────────────────────────

export const useFinanceStore = create<FinanceState>((set, get) => ({
  // ── Initial State ──────────────────────────────────────────────
  costCategories: [],
  margins: [],
  revenueTrends: [],
  currencies: [],
  customsItems: [],
  paymentTerms: [],
  budget: [],
  costToServe: [],

  isLoading: false,
  error: null,

  activeTab: 'overview',
  searchQuery: '',
  categoryFilter: 'all',
  periodFilter: 'all',

  // ── Data Fetching ──────────────────────────────────────────────

  fetchCostCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/finance/cost-categories');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ costCategories: json.data ?? [], isLoading: false });
    } catch {
      set({ costCategories: MOCK_COST_CATEGORIES, isLoading: false });
    }
  },

  fetchMargins: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/finance/margins');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ margins: json.data ?? [], isLoading: false });
    } catch {
      set({ margins: MOCK_MARGIN_ANALYSIS, isLoading: false });
    }
  },

  fetchRevenueTrends: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/finance/revenue-trends');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ revenueTrends: json.data ?? [], isLoading: false });
    } catch {
      set({ revenueTrends: MOCK_REVENUE_TRENDS, isLoading: false });
    }
  },

  fetchCurrencies: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/finance/currencies');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ currencies: json.data ?? [], isLoading: false });
    } catch {
      set({ currencies: MOCK_CURRENCY_EXPOSURE, isLoading: false });
    }
  },

  fetchCustomsItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/finance/customs');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ customsItems: json.data ?? [], isLoading: false });
    } catch {
      set({ customsItems: MOCK_CUSTOMS_ITEMS, isLoading: false });
    }
  },

  fetchPaymentTerms: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/finance/payment-terms');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ paymentTerms: json.data ?? [], isLoading: false });
    } catch {
      set({ paymentTerms: MOCK_PAYMENT_TERMS, isLoading: false });
    }
  },

  fetchBudget: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/finance/budget');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ budget: json.data ?? [], isLoading: false });
    } catch {
      set({ budget: MOCK_BUDGET, isLoading: false });
    }
  },

  fetchCostToServe: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/finance/cost-to-serve');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ costToServe: json.data ?? [], isLoading: false });
    } catch {
      set({ costToServe: MOCK_COST_TO_SERVE, isLoading: false });
    }
  },

  // ── Parallel Fetch All ─────────────────────────────────────────

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [
        costRes,
        marginsRes,
        trendsRes,
        currenciesRes,
        customsRes,
        paymentsRes,
        budgetRes,
        ctsRes,
      ] = await Promise.allSettled([
        fetch('/api/v1/finance/cost-categories').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/finance/margins').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/finance/revenue-trends').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/finance/currencies').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/finance/customs').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/finance/payment-terms').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/finance/budget').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/finance/cost-to-serve').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
      ]);

      const extract = <T>(result: PromiseSettledResult<{ data?: T[] }>, fallback: T[]): T[] => {
        if (result.status === 'fulfilled' && result.value?.data) {
          return result.value.data;
        }
        return fallback;
      };

      set({
        costCategories: extract<CostCategory>(costRes, MOCK_COST_CATEGORIES),
        margins: extract<MarginAnalysis>(marginsRes, MOCK_MARGIN_ANALYSIS),
        revenueTrends: extract<RevenueTrend>(trendsRes, MOCK_REVENUE_TRENDS),
        currencies: extract<CurrencyExposure>(currenciesRes, MOCK_CURRENCY_EXPOSURE),
        customsItems: extract<CustomsDutyItem>(customsRes, MOCK_CUSTOMS_ITEMS),
        paymentTerms: extract<PaymentTerm>(paymentsRes, MOCK_PAYMENT_TERMS),
        budget: extract<BudgetItem>(budgetRes, MOCK_BUDGET),
        costToServe: extract<CostToServe>(ctsRes, MOCK_COST_TO_SERVE),
        isLoading: false,
      });
    } catch {
      // Complete fallback to mock data
      set({
        costCategories: MOCK_COST_CATEGORIES,
        margins: MOCK_MARGIN_ANALYSIS,
        revenueTrends: MOCK_REVENUE_TRENDS,
        currencies: MOCK_CURRENCY_EXPOSURE,
        customsItems: MOCK_CUSTOMS_ITEMS,
        paymentTerms: MOCK_PAYMENT_TERMS,
        budget: MOCK_BUDGET,
        costToServe: MOCK_COST_TO_SERVE,
        isLoading: false,
      });
    }
  },

  // ── UI Actions ─────────────────────────────────────────────────

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (filter) => set({ categoryFilter: filter }),
  setPeriodFilter: (filter) => set({ periodFilter: filter }),
  clearError: () => set({ error: null }),

  // ── Computed / Selectors ───────────────────────────────────────

  // Filtered margins: search by product category / channel, filter by category
  filteredMargins: () => {
    const { margins, searchQuery, categoryFilter } = get();
    return margins.filter((m) => {
      // Category filter
      if (categoryFilter !== 'all' && m.productCategory !== categoryFilter) return false;
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesCategory = m.productCategory.toLowerCase().includes(q);
        const matchesCategoryBn = m.productCategoryBn.includes(q);
        const matchesChannel = m.channel.toLowerCase().includes(q);
        const matchesChannelBn = m.channelBn.includes(q);
        if (!matchesCategory && !matchesCategoryBn && !matchesChannel && !matchesChannelBn) return false;
      }
      return true;
    });
  },

  // Total cost from all cost categories
  totalCost: () => {
    const { costCategories } = get();
    return computeTotalCost(costCategories);
  },

  // Weighted average gross margin across all margin lines
  avgMargin: () => {
    const { margins } = get();
    return computeAvgMargin(margins);
  },

  // Currency risk summary
  currencyRisk: () => {
    const { currencies } = get();
    let high = 0;
    let critical = 0;
    let totalUnhedged = 0;
    for (const c of currencies) {
      if (c.risk === 'high') high++;
      if (c.risk === 'critical') critical++;
      totalUnhedged += c.unhedgedAmount * c.rate; // convert to BDT
    }
    return { high, critical, totalUnhedged };
  },

  // Overdue payments summary
  overduePayments: () => {
    const { paymentTerms } = get();
    let totalAmount = 0;
    let supplierCount = 0;
    let worstOverdue: PaymentTerm | null = null;
    let worstDays = 0;

    for (const pt of paymentTerms) {
      if (pt.overdueAmount > 0) {
        totalAmount += pt.overdueAmount;
        supplierCount++;
        if (pt.overdueDays > worstDays) {
          worstDays = pt.overdueDays;
          worstOverdue = pt;
        }
      }
    }

    return { totalAmount, supplierCount, worstOverdue };
  },

  // Budget variance summary
  budgetVariance: () => {
    const { budget } = get();
    let totalBudget = 0;
    let totalActual = 0;
    let totalVariance = 0;
    let criticalCount = 0;

    for (const b of budget) {
      totalBudget += b.budgetAmount;
      totalActual += b.actualAmount;
      totalVariance += b.variance;
      if (b.status === 'critical') criticalCount++;
    }

    return { totalBudget, totalActual, totalVariance, criticalCount };
  },
}));

// ─── External Selector Hooks ────────────────────────────────────────
// These provide stable references for React components to subscribe to
// specific slices of the store state.

export function useTotalCost(): number {
  return useFinanceStore((s) => s.totalCost());
}

export function useAvgMargin(): number {
  return useFinanceStore((s) => s.avgMargin());
}

export function useCurrencyRisk(): { high: number; critical: number; totalUnhedged: number } {
  return useFinanceStore((s) => s.currencyRisk());
}

export function useOverduePayments(): { totalAmount: number; supplierCount: number; worstOverdue: PaymentTerm | null } {
  return useFinanceStore((s) => s.overduePayments());
}

export function useBudgetVariance(): { totalBudget: number; totalActual: number; totalVariance: number; criticalCount: number } {
  return useFinanceStore((s) => s.budgetVariance());
}

export function useFilteredMargins(): MarginAnalysis[] {
  return useFinanceStore((s) => s.filteredMargins());
}
