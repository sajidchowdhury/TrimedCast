// ============================================
// TrimedCast Forecasting - Zustand Store
// State management for the forecast dashboard
// ============================================

import { create } from 'zustand';
import type { BDSeason } from './models';

// --- Product for selection ---

export interface ProductForSelection {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  availableStock: number;
  safetyStock: number;
  reorderPoint: number;
  salesCount: number;
}

// --- Forecast API response types (client) ---

export interface ForecastPointClient {
  date: string;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  season: BDSeason;
  confidence: number;
}

export interface ForecastMetricsClient {
  mape: number;
  mae: number;
  rmse: number;
  bias: number;
}

export interface IndividualModelResult {
  model: string;
  metrics: ForecastMetricsClient;
}

export interface ForecastDataClient {
  model: string;
  metrics: ForecastMetricsClient;
  points: ForecastPointClient[];
  modelsRun: string[];
  individualResults: IndividualModelResult[];
}

export interface OrderTriggerClient {
  productId: string;
  productSku: string;
  productName: string;
  currentStock: number;
  availableStock: number;
  safetyStock: number;
  reorderPoint: number;
  daysOfStock: number;
  stockStatus: 'healthy' | 'low' | 'critical' | 'stockout' | 'below_reorder' | 'at_safety' | 'adequate' | 'overstock' | 'no_demand';
  totalLeadTimeDays: number;
  leadTimeBreakdown: {
    manufacturing: number;
    shipping: number;
    customs: number;
    internal: number;
  };
  reorderHitDate: string;
  orderTriggerDate: string;
  expectedDeliveryDate: string;
  cnyRisk: boolean;
  cnyDelayDays: number;
  cnyStrategy: string;
  cnyExplanation?: string;
  suggestedOrderQty: number;
  priority: 'urgent' | 'high' | 'normal' | 'low' | 'critical';
  urgency?: 'critical' | 'high' | 'normal' | 'low';
  currentSeason: BDSeason;
  seasonNote: string;
  // Enhanced timeline dates (from pipeline)
  timelineDates?: {
    orderTriggerDate: string;
    mfgStartDate: string;
    mfgCompleteDate: string;
    shipDepartureDate: string;
    arrivalDate: string;
    customsClearanceDate: string;
    availableForSaleDate: string;
    totalLeadTimeDays: number;
    cnyDelayDays: number;
  };
  // Quantity breakdown
  qtyBreakdown?: {
    recommendedQty: number;
    status: string;
    reason: string;
    gap: number;
    constraintsApplied: string[];
  };
  // Shipment mode
  recommendedShipmentMode?: 'sea' | 'air';
}

export interface EOQResultClient {
  eoq: number;
  ordersPerYear: number;
  orderCycleDays: number;
  totalOrderingCost: number;
  totalHoldingCost: number;
  totalCost: number;
}

export interface SafetyStockResultClient {
  safetyStock: number;
  reorderPoint: number;
  serviceLevel: number;
  zScore: number;
  components: { demandVariability: number; leadTimeVariability: number };
}

export interface LeadTimeResultClient {
  total: number;
  breakdown: {
    manufacturing: number;
    shipping: number;
    customs: number;
    internal: number;
  };
  shippingMethod: string;
}

export interface ForecastResultClient {
  product: { id: string; sku: string | null; name: string | null };
  forecast: ForecastDataClient;
  orderTrigger: OrderTriggerClient;
  eoq: EOQResultClient;
  safetyStock: SafetyStockResultClient;
  leadTime: LeadTimeResultClient;
  dataPoints: number;
}

// --- Store ---

export interface ForecastStore {
  // Product selection
  products: ProductForSelection[];
  selectedProductId: string | null;
  productsLoading: boolean;

  // Forecast result
  forecastResult: ForecastResultClient | null;
  forecastLoading: boolean;

  // Settings
  shippingMethod: 'sea' | 'air';
  serviceLevel: number;
  horizonDays: number;

  // Active tab
  activeTab: 'import' | 'forecast' | 'advanced' | 'eoq' | 'orders' | 'pipeline';

  // Error
  error: string | null;

  // Actions
  setActiveTab: (tab: 'import' | 'forecast' | 'advanced' | 'eoq' | 'orders' | 'pipeline') => void;
  setSelectedProductId: (id: string | null) => void;
  setShippingMethod: (method: 'sea' | 'air') => void;
  fetchProducts: () => Promise<void>;
  generateForecast: () => Promise<void>;
  setError: (error: string | null) => void;
  resetForecast: () => void;
}

const TENANT_ID = 'demo-bd-motors';

export const useForecastStore = create<ForecastStore>((set, get) => ({
  products: [],
  selectedProductId: null,
  productsLoading: false,
  forecastResult: null,
  forecastLoading: false,
  shippingMethod: 'sea',
  serviceLevel: 0.95,
  horizonDays: 90,
  activeTab: 'import',
  error: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedProductId: (id) => set({ selectedProductId: id }),
  setShippingMethod: (method) => set({ shippingMethod: method }),
  setError: (error) => set({ error }),

  fetchProducts: async () => {
    set({ productsLoading: true });
    try {
      const res = await fetch(`/api/forecast/products?tenantId=${TENANT_ID}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          set({ products: json.data, productsLoading: false });
          return;
        }
      }
      set({ productsLoading: false });
    } catch {
      set({ productsLoading: false });
    }
  },

  generateForecast: async () => {
    const { selectedProductId, shippingMethod, serviceLevel, horizonDays } = get();
    if (!selectedProductId) return;

    set({ forecastLoading: true, error: null });
    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          productId: selectedProductId,
          model: 'ensemble',
          horizonDays,
          serviceLevel,
          shippingMethod,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Forecast generation failed');
      }

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Forecast generation failed');
      }

      set({ forecastResult: json.data as ForecastResultClient, forecastLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Forecast generation failed', forecastLoading: false });
    }
  },

  resetForecast: () => set({ forecastResult: null, selectedProductId: null, error: null }),
}));
