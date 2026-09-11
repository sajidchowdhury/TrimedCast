// ============================================
// TrimedCast LEAN — app store (Zustand)
// Single-tenant, single-admin. No billing/tenancy/RBAC.
// Holds the active dashboard view + the latest import summary.
// ============================================

import { create } from 'zustand';

export type ViewKey =
  | 'dashboard'
  | 'upload'
  | 'manage-uploads'
  | 'forecast'
  | 'orders'
  | 'freight'
  | 'line-cost'
  | 'pilot'
  | 'events'
  | 'settings'
  | 'data';

export interface ImportSummary {
  importId: string;
  fileName: string;
  rowCount: number;
  skuCount: number;
  saleCount: number;
  purchaseCount: number;
  warnings: string[];
  completedAt: string;
}

interface AppState {
  view: ViewKey;
  setView: (v: ViewKey) => void;

  // last import result (so the dashboard can show it)
  lastImport: ImportSummary | null;
  setLastImport: (s: ImportSummary) => void;

  // refresh trigger — bumped after an import so views refetch
  dataVersion: number;
  bumpData: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  setView: (view) => set({ view }),

  lastImport: null,
  setLastImport: (lastImport) => set({ lastImport, dataVersion: Date.now() }),

  dataVersion: 0,
  bumpData: () => set({ dataVersion: Date.now() }),
}));
