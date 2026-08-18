// ============================================
// TrimedCast — Warehouse & Logistics Zustand Store
// Session 25: Warehouse & Logistics Dashboard
// ============================================

import { create } from 'zustand';
import type {
  Warehouse,
  WarehouseZone,
  InboundShipment,
  OutboundShipment,
  CourierPartner,
  PickPackJob,
  DeliveryStatus,
  InboundStatus,
  OutboundStatus,
  WarehouseStatus,
} from '@/components/warehouse/types';
import {
  MOCK_WAREHOUSES,
  MOCK_ZONES,
  MOCK_INBOUND,
  MOCK_OUTBOUND,
  COURIER_PARTNERS,
  MOCK_PICK_PACK,
  MOCK_DELIVERIES,
} from '@/components/warehouse/types';

// ─── Tab Type ────────────────────────────────────────────────────────

export type WarehouseTab =
  | 'overview'
  | 'inbound'
  | 'outbound'
  | 'couriers'
  | 'delivery';

// ─── Store Interface ────────────────────────────────────────────────

interface WarehouseState {
  // Data
  warehouses: Warehouse[];
  zones: WarehouseZone[];
  inbound: InboundShipment[];
  outbound: OutboundShipment[];
  couriers: CourierPartner[];
  pickPackJobs: PickPackJob[];
  deliveries: DeliveryStatus[];

  // Selection
  selectedWarehouse: Warehouse | null;
  selectedInbound: InboundShipment | null;
  selectedOutbound: OutboundShipment | null;

  // Loading & Error
  isLoading: boolean;
  error: string | null;

  // UI State
  activeTab: WarehouseTab;
  searchQuery: string;
  warehouseFilter: string;      // warehouse code or 'all'
  statusFilter: string;         // status value or 'all'

  // Actions — Data Fetching
  fetchWarehouses: () => Promise<void>;
  fetchZones: (warehouseId?: string) => Promise<void>;
  fetchInbound: () => Promise<void>;
  fetchOutbound: () => Promise<void>;
  fetchCouriers: () => Promise<void>;
  fetchPickPack: () => Promise<void>;
  fetchDeliveries: () => Promise<void>;
  fetchAll: () => Promise<void>;

  // Actions — Selection
  selectWarehouse: (warehouse: Warehouse | null) => void;
  selectInbound: (shipment: InboundShipment | null) => void;
  selectOutbound: (shipment: OutboundShipment | null) => void;

  // Actions — UI
  setActiveTab: (tab: WarehouseTab) => void;
  setSearchQuery: (query: string) => void;
  setWarehouseFilter: (filter: string) => void;
  setStatusFilter: (filter: string) => void;
  clearError: () => void;

  // Computed / Selectors
  filteredInbound: () => InboundShipment[];
  filteredOutbound: () => OutboundShipment[];
  filteredPickPack: () => PickPackJob[];
  warehouseUtilization: () => Record<string, number>;
  activeInboundCount: () => number;
  activeOutboundCount: () => number;
  pendingPickPackCount: () => number;
}

// ─── Store Implementation ───────────────────────────────────────────

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  // ── Initial State ──────────────────────────────────────────────
  warehouses: [],
  zones: [],
  inbound: [],
  outbound: [],
  couriers: [],
  pickPackJobs: [],
  deliveries: [],

  selectedWarehouse: null,
  selectedInbound: null,
  selectedOutbound: null,

  isLoading: false,
  error: null,

  activeTab: 'overview',
  searchQuery: '',
  warehouseFilter: 'all',
  statusFilter: 'all',

  // ── Data Fetching ──────────────────────────────────────────────

  fetchWarehouses: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/warehouse');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      const warehouses: Warehouse[] = json.data ?? [];
      set({ warehouses, isLoading: false });
    } catch {
      set({ warehouses: MOCK_WAREHOUSES, isLoading: false });
    }
  },

  fetchZones: async (warehouseId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = warehouseId
        ? `/api/v1/warehouse/zones?warehouseId=${warehouseId}`
        : '/api/v1/warehouse/zones';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      const zones: WarehouseZone[] = json.data ?? [];
      set({ zones, isLoading: false });
    } catch {
      // Filter mock zones if warehouseId specified
      const zones = warehouseId
        ? MOCK_ZONES.filter((z) => z.warehouseId === warehouseId)
        : MOCK_ZONES;
      set({ zones, isLoading: false });
    }
  },

  fetchInbound: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/warehouse/inbound');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      const inbound: InboundShipment[] = json.data ?? [];
      set({ inbound, isLoading: false });
    } catch {
      set({ inbound: MOCK_INBOUND, isLoading: false });
    }
  },

  fetchOutbound: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/warehouse/outbound');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      const outbound: OutboundShipment[] = json.data ?? [];
      set({ outbound, isLoading: false });
    } catch {
      set({ outbound: MOCK_OUTBOUND, isLoading: false });
    }
  },

  fetchCouriers: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/warehouse/couriers');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      const couriers: CourierPartner[] = json.data ?? [];
      set({ couriers, isLoading: false });
    } catch {
      set({ couriers: COURIER_PARTNERS, isLoading: false });
    }
  },

  fetchPickPack: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/warehouse/pick-pack');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      const pickPackJobs: PickPackJob[] = json.data ?? [];
      set({ pickPackJobs, isLoading: false });
    } catch {
      set({ pickPackJobs: MOCK_PICK_PACK, isLoading: false });
    }
  },

  fetchDeliveries: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/v1/warehouse/deliveries');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      const deliveries: DeliveryStatus[] = json.data ?? [];
      set({ deliveries, isLoading: false });
    } catch {
      set({ deliveries: MOCK_DELIVERIES, isLoading: false });
    }
  },

  // Parallel fetch of all warehouse data
  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [
        warehousesRes,
        zonesRes,
        inboundRes,
        outboundRes,
        couriersRes,
        pickPackRes,
        deliveriesRes,
      ] = await Promise.allSettled([
        fetch('/api/v1/warehouse').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/warehouse/zones').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/warehouse/inbound').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/warehouse/outbound').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/warehouse/couriers').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/warehouse/pick-pack').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
        fetch('/api/v1/warehouse/deliveries').then((r) => r.ok ? r.json() : Promise.reject(r.status)),
      ]);

      const extract = <T>(result: PromiseSettledResult<{ data?: T[] }>, fallback: T[]): T[] => {
        if (result.status === 'fulfilled' && result.value?.data) {
          return result.value.data;
        }
        return fallback;
      };

      set({
        warehouses: extract<Warehouse>(warehousesRes, MOCK_WAREHOUSES),
        zones: extract<WarehouseZone>(zonesRes, MOCK_ZONES),
        inbound: extract<InboundShipment>(inboundRes, MOCK_INBOUND),
        outbound: extract<OutboundShipment>(outboundRes, MOCK_OUTBOUND),
        couriers: extract<CourierPartner>(couriersRes, COURIER_PARTNERS),
        pickPackJobs: extract<PickPackJob>(pickPackRes, MOCK_PICK_PACK),
        deliveries: extract<DeliveryStatus>(deliveriesRes, MOCK_DELIVERIES),
        isLoading: false,
      });
    } catch {
      // Complete fallback to mock data
      set({
        warehouses: MOCK_WAREHOUSES,
        zones: MOCK_ZONES,
        inbound: MOCK_INBOUND,
        outbound: MOCK_OUTBOUND,
        couriers: COURIER_PARTNERS,
        pickPackJobs: MOCK_PICK_PACK,
        deliveries: MOCK_DELIVERIES,
        isLoading: false,
      });
    }
  },

  // ── Selection ──────────────────────────────────────────────────

  selectWarehouse: (warehouse) => set({ selectedWarehouse: warehouse }),
  selectInbound: (shipment) => set({ selectedInbound: shipment }),
  selectOutbound: (shipment) => set({ selectedOutbound: shipment }),

  // ── UI Actions ─────────────────────────────────────────────────

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setWarehouseFilter: (filter) => set({ warehouseFilter: filter }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  clearError: () => set({ error: null }),

  // ── Computed / Selectors ───────────────────────────────────────

  // Filtered inbound: search by PO number / supplier name, filter by status + warehouse
  filteredInbound: () => {
    const { inbound, searchQuery, statusFilter, warehouseFilter } = get();
    return inbound.filter((s) => {
      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      // Warehouse filter
      if (warehouseFilter !== 'all' && s.warehouseCode !== warehouseFilter) return false;
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesPO = s.poNumber.toLowerCase().includes(q);
        const matchesSupplier = s.supplierName.toLowerCase().includes(q);
        const matchesTracking = s.trackingNumber.toLowerCase().includes(q);
        if (!matchesPO && !matchesSupplier && !matchesTracking) return false;
      }
      return true;
    });
  },

  // Filtered outbound: search by order number / customer name, filter by status + warehouse
  filteredOutbound: () => {
    const { outbound, searchQuery, statusFilter, warehouseFilter } = get();
    return outbound.filter((s) => {
      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      // Warehouse filter
      if (warehouseFilter !== 'all' && s.warehouseCode !== warehouseFilter) return false;
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesOrder = s.orderNumber.toLowerCase().includes(q);
        const matchesCustomer = s.customerName.toLowerCase().includes(q);
        const matchesTracking = s.trackingNumber.toLowerCase().includes(q);
        const matchesCity = s.destinationCity.toLowerCase().includes(q);
        if (!matchesOrder && !matchesCustomer && !matchesTracking && !matchesCity) return false;
      }
      return true;
    });
  },

  // Filtered pick & pack: search by order ID / assigned person, filter by status + warehouse
  filteredPickPack: () => {
    const { pickPackJobs, searchQuery, statusFilter, warehouseFilter } = get();
    return pickPackJobs.filter((j) => {
      // Status filter
      if (statusFilter !== 'all' && j.status !== statusFilter) return false;
      // Warehouse filter
      if (warehouseFilter !== 'all' && j.warehouseCode !== warehouseFilter) return false;
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesOrder = j.orderId.toLowerCase().includes(q);
        const matchesAssigned = j.assignedTo.toLowerCase().includes(q);
        if (!matchesOrder && !matchesAssigned) return false;
      }
      return true;
    });
  },

  // Warehouse utilization: map warehouse code → utilization percentage
  warehouseUtilization: () => {
    const { warehouses } = get();
    const result: Record<string, number> = {};
    for (const wh of warehouses) {
      result[wh.code] = wh.capacity > 0
        ? Math.round((wh.usedCapacity / wh.capacity) * 100)
        : 0;
    }
    return result;
  },

  // Active inbound count (not completed)
  activeInboundCount: () => {
    const { inbound } = get();
    return inbound.filter((s) => s.status !== 'completed').length;
  },

  // Active outbound count (not delivered/failed)
  activeOutboundCount: () => {
    const { outbound } = get();
    return outbound.filter(
      (s) => s.status !== 'delivered' && s.status !== 'failed',
    ).length;
  },

  // Pending pick & pack count (pending or picking)
  pendingPickPackCount: () => {
    const { pickPackJobs } = get();
    return pickPackJobs.filter(
      (j) => j.status === 'pending' || j.status === 'picking',
    ).length;
  },
}));

// ─── External Selector Hooks ────────────────────────────────────────
// These provide stable references for React components to subscribe to
// specific slices of the store state.

export function useFilteredInbound(): InboundShipment[] {
  return useWarehouseStore((s) => s.filteredInbound());
}

export function useFilteredOutbound(): OutboundShipment[] {
  return useWarehouseStore((s) => s.filteredOutbound());
}

export function useFilteredPickPack(): PickPackJob[] {
  return useWarehouseStore((s) => s.filteredPickPack());
}

export function useWarehouseUtilization(): Record<string, number> {
  return useWarehouseStore((s) => s.warehouseUtilization());
}

export function useActiveInboundCount(): number {
  return useWarehouseStore((s) => s.activeInboundCount());
}

export function useActiveOutboundCount(): number {
  return useWarehouseStore((s) => s.activeOutboundCount());
}

export function usePendingPickPackCount(): number {
  return useWarehouseStore((s) => s.pendingPickPackCount());
}
