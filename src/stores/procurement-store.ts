// ============================================
// TrimedCast — Supplier Scorecard & Procurement Dashboard Zustand Store
// Session 27: Supplier Scorecard & Procurement Dashboard
// ============================================

import { create } from 'zustand';
import type {
  Supplier,
  SupplierScorecard,
  RFQ,
  CostComparison,
  SupplierRiskAssessment,
  PurchaseOrderBySupplier,
  SupplierTier,
  SupplierRisk,
  ProcurementTab,
} from '@/components/procurement/types';
import {
  MOCK_SUPPLIERS,
  MOCK_SCORECARDS,
  MOCK_RFQS,
  MOCK_COST_COMPARISONS,
  MOCK_RISK_ASSESSMENTS,
  MOCK_PO_BY_SUPPLIER,
} from '@/components/procurement/types';

// ─── Store Interface ─────────────────────────────────────────────────

interface ProcurementState {
  // ── Data ────────────────────────────────────────────────────────
  suppliers: Supplier[];
  scorecards: SupplierScorecard[];
  rfqs: RFQ[];
  costComparisons: CostComparison[];
  riskAssessments: SupplierRiskAssessment[];
  poBySupplier: PurchaseOrderBySupplier[];

  // ── Loading & Error ─────────────────────────────────────────────
  isLoading: boolean;
  error: string | null;

  // ── UI State ────────────────────────────────────────────────────
  activeTab: ProcurementTab;
  searchQuery: string;
  tierFilter: SupplierTier | 'all';
  riskFilter: SupplierRisk | 'all';
  countryFilter: string; // countryCode or 'all'

  // ── Actions — Data Fetching ─────────────────────────────────────
  fetchSuppliers: () => Promise<void>;
  fetchScorecards: () => Promise<void>;
  fetchRFQs: () => Promise<void>;
  fetchCostComparisons: () => Promise<void>;
  fetchRiskAssessments: () => Promise<void>;
  fetchPOBySupplier: () => Promise<void>;
  fetchAll: () => Promise<void>;

  // ── Actions — UI ────────────────────────────────────────────────
  setActiveTab: (tab: ProcurementTab) => void;
  setSearchQuery: (query: string) => void;
  setTierFilter: (filter: SupplierTier | 'all') => void;
  setRiskFilter: (filter: SupplierRisk | 'all') => void;
  setCountryFilter: (filter: string) => void;
  clearError: () => void;

  // ── Computed / Selectors ────────────────────────────────────────
  filteredSuppliers: () => Supplier[];
  activeSuppliers: () => Supplier[];
  strategicSuppliers: () => Supplier[];
  highRiskSuppliers: () => Supplier[];
}

// ─── Store Implementation ───────────────────────────────────────────

export const useProcurementStore = create<ProcurementState>((set, get) => ({
  // ── Initial State ──────────────────────────────────────────────
  suppliers: [],
  scorecards: [],
  rfqs: [],
  costComparisons: [],
  riskAssessments: [],
  poBySupplier: [],

  isLoading: false,
  error: null,

  activeTab: 'scorecard',
  searchQuery: '',
  tierFilter: 'all',
  riskFilter: 'all',
  countryFilter: 'all',

  // ── Data Fetching ──────────────────────────────────────────────

  fetchSuppliers: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/procurement/suppliers');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ suppliers: json.data ?? [], isLoading: false });
    } catch {
      set({ suppliers: MOCK_SUPPLIERS, isLoading: false });
    }
  },

  fetchScorecards: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/procurement/scorecards');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ scorecards: json.data ?? [], isLoading: false });
    } catch {
      set({ scorecards: MOCK_SCORECARDS, isLoading: false });
    }
  },

  fetchRFQs: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/procurement/rfqs');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ rfqs: json.data ?? [], isLoading: false });
    } catch {
      set({ rfqs: MOCK_RFQS, isLoading: false });
    }
  },

  fetchCostComparisons: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/procurement/cost-comparisons');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ costComparisons: json.data ?? [], isLoading: false });
    } catch {
      set({ costComparisons: MOCK_COST_COMPARISONS, isLoading: false });
    }
  },

  fetchRiskAssessments: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/procurement/risk-assessments');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ riskAssessments: json.data ?? [], isLoading: false });
    } catch {
      set({ riskAssessments: MOCK_RISK_ASSESSMENTS, isLoading: false });
    }
  },

  fetchPOBySupplier: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/procurement/po-by-supplier');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      set({ poBySupplier: json.data ?? [], isLoading: false });
    } catch {
      set({ poBySupplier: MOCK_PO_BY_SUPPLIER, isLoading: false });
    }
  },

  // ── Parallel Fetch All ─────────────────────────────────────────

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [
        suppliersRes,
        scorecardsRes,
        rfqsRes,
        costRes,
        riskRes,
        poRes,
      ] = await Promise.allSettled([
        fetch('/api/v1/procurement/suppliers').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/procurement/scorecards').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/procurement/rfqs').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/procurement/cost-comparisons').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/procurement/risk-assessments').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/procurement/po-by-supplier').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
      ]);

      const extract = <T>(result: PromiseSettledResult<{ data?: T[] }>, fallback: T[]): T[] => {
        if (result.status === 'fulfilled' && result.value?.data) {
          return result.value.data;
        }
        return fallback;
      };

      set({
        suppliers: extract<Supplier>(suppliersRes, MOCK_SUPPLIERS),
        scorecards: extract<SupplierScorecard>(scorecardsRes, MOCK_SCORECARDS),
        rfqs: extract<RFQ>(rfqsRes, MOCK_RFQS),
        costComparisons: extract<CostComparison>(costRes, MOCK_COST_COMPARISONS),
        riskAssessments: extract<SupplierRiskAssessment>(riskRes, MOCK_RISK_ASSESSMENTS),
        poBySupplier: extract<PurchaseOrderBySupplier>(poRes, MOCK_PO_BY_SUPPLIER),
        isLoading: false,
      });
    } catch {
      // Complete fallback to mock data
      set({
        suppliers: MOCK_SUPPLIERS,
        scorecards: MOCK_SCORECARDS,
        rfqs: MOCK_RFQS,
        costComparisons: MOCK_COST_COMPARISONS,
        riskAssessments: MOCK_RISK_ASSESSMENTS,
        poBySupplier: MOCK_PO_BY_SUPPLIER,
        isLoading: false,
      });
    }
  },

  // ── UI Actions ─────────────────────────────────────────────────

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTierFilter: (filter) => set({ tierFilter: filter }),
  setRiskFilter: (filter) => set({ riskFilter: filter }),
  setCountryFilter: (filter) => set({ countryFilter: filter }),
  clearError: () => set({ error: null }),

  // ── Computed / Selectors ───────────────────────────────────────

  // Filtered suppliers: search by name/nameBn/city/productCategories, filter by tier/risk/country
  filteredSuppliers: () => {
    const { suppliers, searchQuery, tierFilter, riskFilter, countryFilter } = get();
    return suppliers.filter((s) => {
      // Tier filter
      if (tierFilter !== 'all' && s.tier !== tierFilter) return false;
      // Risk filter
      if (riskFilter !== 'all' && s.riskLevel !== riskFilter) return false;
      // Country filter
      if (countryFilter !== 'all' && s.countryCode !== countryFilter) return false;
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesNameBn = s.nameBn.includes(q);
        const matchesCity = s.city.toLowerCase().includes(q);
        const matchesCategory = s.productCategories.some((c) => c.toLowerCase().includes(q));
        if (!matchesName && !matchesNameBn && !matchesCity && !matchesCategory) return false;
      }
      return true;
    });
  },

  // Active suppliers (status = 'active')
  activeSuppliers: () => {
    const { suppliers } = get();
    return suppliers.filter((s) => s.status === 'active');
  },

  // Strategic suppliers (tier = 'strategic')
  strategicSuppliers: () => {
    const { suppliers } = get();
    return suppliers.filter((s) => s.tier === 'strategic');
  },

  // High-risk suppliers (riskLevel = 'high' or 'critical')
  highRiskSuppliers: () => {
    const { suppliers } = get();
    return suppliers.filter((s) => s.riskLevel === 'high' || s.riskLevel === 'critical');
  },
}));

// ─── External Selector Hooks ────────────────────────────────────────
// These provide stable references for React components to subscribe to
// specific slices of the store state.

export function useFilteredSuppliers(): Supplier[] {
  return useProcurementStore((s) => s.filteredSuppliers());
}

export function useActiveSuppliers(): Supplier[] {
  return useProcurementStore((s) => s.activeSuppliers());
}

export function useStrategicSuppliers(): Supplier[] {
  return useProcurementStore((s) => s.strategicSuppliers());
}

export function useHighRiskSuppliers(): Supplier[] {
  return useProcurementStore((s) => s.highRiskSuppliers());
}
