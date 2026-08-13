// ============================================
// TrimedCast ETL - Zustand Store
// State management for the import pipeline
// ============================================

import { create } from 'zustand';
import {
  type ColumnMapping,
  type ValidationError,
  type HarmonizationStep,
  type ImportType,
  type ImportTypeSchema,
  IMPORT_TYPE_SCHEMAS,
} from './import-types';

// ---- Upload Result ----
export interface UploadResult {
  id: string;
  importType: string;
  fileName: string;
  fileSize: number;
  rowsTotal: number;
  status: string;
  headers: string[];
  preview: Record<string, unknown>[];
  mappings: ColumnMapping[];
  detectedFormat: string;
  sheetName: string;
}

// ---- Validation Result (client-side) ----
export interface ValidationResultClient {
  valid: boolean;
  stats: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
  errors: ValidationError[];
  errorSummary?: {
    bySeverity: Record<string, number>;
    byField: [string, number][];
  };
}

// ---- Harmonization Result (client-side) ----
export interface HarmonizationResultClient {
  stats: {
    inputRows: number;
    outputRows: number;
    duplicatesRemoved: number;
    fieldsNormalized: number;
    categoriesMapped: number;
    datesNormalized: number;
  };
  log: HarmonizationStep[];
  preview: Record<string, unknown>[];
}

// ---- Insertion Result (client-side) ----
export interface InsertionResultClient {
  inserted: number;
  skipped: number;
  qualityScore: number;
  createdMasterData: string[];
  errors: ValidationError[];
  durationMs: number | null;
}

// ---- DataImport (for history) ----
export interface DataImportRecord {
  id: string;
  tenantId: string;
  importType: string;
  fileName: string;
  fileSize: number;
  rowsTotal: number;
  rowsValid: number | null;
  rowsInvalid: number | null;
  rowsInserted: number | null;
  rowsSkipped: number | null;
  rowsDuplicate: number | null;
  qualityScore: number | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

// ---- ETL Store ----
export interface ETLStore {
  // State
  tenantId: string;
  currentImportId: string | null;
  currentStep: number; // 0-5: Upload, Map, Validate, Harmonize, Insert, Complete
  importType: ImportType | '';
  uploadResult: UploadResult | null;
  mappings: ColumnMapping[];
  validationResult: ValidationResultClient | null;
  harmonizationResult: HarmonizationResultClient | null;
  insertionResult: InsertionResultClient | null;
  imports: DataImportRecord[];
  isLoading: boolean;
  error: string | null;
  isSeeded: boolean;

  // Actions
  setStep: (step: number) => void;
  setImportType: (type: ImportType | '') => void;
  setUploadResult: (result: UploadResult) => void;
  setMappings: (mappings: ColumnMapping[]) => void;
  setValidationResult: (result: ValidationResultClient) => void;
  setHarmonizationResult: (result: HarmonizationResultClient) => void;
  setInsertionResult: (result: InsertionResultClient) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  seedDemo: () => Promise<void>;
  fetchImports: () => Promise<void>;
}

const initialState = {
  tenantId: 'demo-bd-motors',
  currentImportId: null,
  currentStep: 0,
  importType: '' as ImportType | '',
  uploadResult: null,
  mappings: [],
  validationResult: null,
  harmonizationResult: null,
  insertionResult: null,
  imports: [],
  isLoading: false,
  error: null,
  isSeeded: false,
};

export const useETLStore = create<ETLStore>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),
  setImportType: (type) => set({ importType: type }),
  setUploadResult: (result) =>
    set({
      uploadResult: result,
      currentImportId: result.id,
      mappings: result.mappings,
      currentStep: 1, // Move to mapping step
    }),
  setMappings: (mappings) => set({ mappings }),
  setValidationResult: (result) => set({ validationResult: result }),
  setHarmonizationResult: (result) => set({ harmonizationResult: result }),
  setInsertionResult: (result) =>
    set({ insertionResult: result, currentStep: 5 }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  reset: () => set({ ...initialState, isSeeded: get().isSeeded, imports: get().imports }),

  seedDemo: async () => {
    if (get().isSeeded) return;
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        set({ isSeeded: true });
        await get().fetchImports();
      }
    } catch {
      // Silently fail - seed might already exist
      set({ isSeeded: true });
    }
  },

  fetchImports: async () => {
    try {
      const tenantId = get().tenantId;
      const res = await fetch(`/api/imports?tenantId=${tenantId}&limit=50`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          set({ imports: json.data });
        }
      }
    } catch {
      // Silently fail
    }
  },
}));

// Helper to get the schema for the current import type
export function getCurrentSchema(importType: ImportType | ''): ImportTypeSchema | null {
  if (!importType) return null;
  return IMPORT_TYPE_SCHEMAS[importType] || null;
}
