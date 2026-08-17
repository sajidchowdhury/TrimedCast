// ============================================
// TrimedCast — Forecast Result Store (Zustand)
// Session 21: Demand Forecasting Results
// ============================================

import { create } from 'zustand';
import {
  type ForecastResult,
  type ForecastTimePoint,
  type DecompositionData,
  type ModelComparison,
  MOCK_FORECASTS,
  MOCK_TIME_SERIES,
  MOCK_DECOMPOSITION,
  MOCK_MODEL_COMPARISON,
} from '@/components/forecast-results/types';

interface ForecastResultState {
  // Data
  forecasts: ForecastResult[];
  selectedForecast: ForecastResult | null;
  timeSeries: ForecastTimePoint[];
  decomposition: DecompositionData[];
  modelComparison: ModelComparison[];

  // Loading & Error
  isLoading: boolean;
  error: string | null;

  // Filters
  methodFilter: string;
  seasonFilter: string;
  searchQuery: string;

  // Actions
  fetchForecasts: () => Promise<void>;
  selectForecast: (forecast: ForecastResult | null) => void;
  generateForecast: (productId: string) => Promise<void>;
  approveForecast: (forecastId: string) => Promise<void>;

  // UI Actions
  setMethodFilter: (method: string) => void;
  setSeasonFilter: (season: string) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}

export const useForecastResultStore = create<ForecastResultState>((set, get) => ({
  // Initial data from mocks
  forecasts: MOCK_FORECASTS,
  selectedForecast: null,
  timeSeries: MOCK_TIME_SERIES,
  decomposition: MOCK_DECOMPOSITION,
  modelComparison: MOCK_MODEL_COMPARISON,

  isLoading: false,
  error: null,

  methodFilter: 'all',
  seasonFilter: 'all',
  searchQuery: '',

  fetchForecasts: async () => {
    set({ isLoading: true, error: null });
    try {
      // Try real API first
      const res = await fetch('/api/v1/forecasts');
      if (res.ok) {
        const json = await res.json();
        const forecasts = json.data ?? json;
        set({ forecasts: Array.isArray(forecasts) ? forecasts : MOCK_FORECASTS, isLoading: false });
      } else {
        // Fallback to mock
        set({ forecasts: MOCK_FORECASTS, isLoading: false });
      }
    } catch {
      // Fallback to mock
      set({ forecasts: MOCK_FORECASTS, isLoading: false });
    }
  },

  selectForecast: (forecast) => {
    set({ selectedForecast: forecast });
  },

  generateForecast: async (_productId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/forecasts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: _productId }),
      });
      if (res.ok) {
        // Refresh forecasts after generation
        await get().fetchForecasts();
      } else {
        set({ error: 'Failed to generate forecast', isLoading: false });
      }
    } catch {
      set({ error: 'Failed to generate forecast', isLoading: false });
    }
  },

  approveForecast: async (forecastId: string) => {
    try {
      const res = await fetch(`/api/v1/forecasts/${forecastId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        set({ error: 'Failed to approve forecast' });
      }
    } catch {
      set({ error: 'Failed to approve forecast' });
    }
  },

  setMethodFilter: (method) => set({ methodFilter: method }),
  setSeasonFilter: (season) => set({ seasonFilter: season }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearError: () => set({ error: null }),
}));

// Computed selectors
export function useFilteredForecasts(): ForecastResult[] {
  const { forecasts, methodFilter, seasonFilter, searchQuery } = useForecastResultStore();

  return forecasts.filter((f) => {
    if (methodFilter !== 'all' && f.forecast_method !== methodFilter) return false;
    if (seasonFilter !== 'all' && f.season !== seasonFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSku = f.product.sku_code.toLowerCase().includes(q);
      const matchName = f.product.name.toLowerCase().includes(q);
      if (!matchSku && !matchName) return false;
    }
    return true;
  });
}

export function useAverageMape(): number {
  const forecasts = useFilteredForecasts();
  const withMape = forecasts.filter((f) => f.mape !== null);
  if (withMape.length === 0) return 0;
  return withMape.reduce((sum, f) => sum + (f.mape ?? 0), 0) / withMape.length;
}

export function useAccuracyDistribution(): Record<string, number> {
  const forecasts = useFilteredForecasts();
  const dist: Record<string, number> = { excellent: 0, good: 0, fair: 0, poor: 0 };
  for (const f of forecasts) {
    if (f.mape === null) continue;
    if (f.mape < 10) dist.excellent++;
    else if (f.mape < 20) dist.good++;
    else if (f.mape < 30) dist.fair++;
    else dist.poor++;
  }
  return dist;
}
