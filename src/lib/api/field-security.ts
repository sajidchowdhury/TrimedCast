// ============================================
// TrimedCast Field-Level Security
// Strips/replaces sensitive fields from API
// responses based on user role.
// Based on: RBAC & Security Model.md Section 2.2
// ============================================

import { getRestrictedFields, type Role } from './rbac';

// --- All Known Sensitive Fields ---
// Complete list of fields that may be restricted for some roles

export const ALL_SENSITIVE_FIELDS = [
  'unit_cost_bdt',
  'margin_bdt',
  'margin_pct',
  'supplier_unit_price',
  'supplier_contract_terms',
  'supplier_payment_terms',
  'eoq_total_cost',
  'po_total_value_bdt',
  'inventory_value_bdt',
] as const;

export type SensitiveField = typeof ALL_SENSITIVE_FIELDS[number];

// --- Field Category Mapping ---
// Maps fields to their business category for UI rendering hints

export const FIELD_CATEGORIES: Record<SensitiveField, string> = {
  unit_cost_bdt: 'cost',
  margin_bdt: 'margin',
  margin_pct: 'margin',
  supplier_unit_price: 'cost',
  supplier_contract_terms: 'contract',
  supplier_payment_terms: 'contract',
  eoq_total_cost: 'cost',
  po_total_value_bdt: 'cost',
  inventory_value_bdt: 'cost',
};

// --- REDACTED placeholder ---

const REDACTED_VALUE = 'REDACTED';

// ============================================
// Core Functions
// ============================================

/**
 * Strip restricted fields from a single object.
 * Restricted fields are completely removed from the output.
 * Non-restricted fields and fields not in the sensitive list pass through unchanged.
 */
export function stripRestrictedFields(
  data: Record<string, unknown>,
  role: string
): Record<string, unknown> {
  const restrictedFields = getRestrictedFields(role);

  if (restrictedFields.length === 0) {
    // No restrictions for this role, return as-is
    return { ...data };
  }

  const restrictedSet = new Set(restrictedFields);
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (!restrictedSet.has(key)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Strip restricted fields from an array of objects.
 * Applies stripRestrictedFields to each item.
 */
export function stripRestrictedFieldsFromArray(
  data: Record<string, unknown>[],
  role: string
): Record<string, unknown>[] {
  const restrictedFields = getRestrictedFields(role);

  if (restrictedFields.length === 0) {
    // No restrictions, return shallow copy of array
    return data.map((item) => ({ ...item }));
  }

  return data.map((item) => stripRestrictedFields(item, role));
}

/**
 * Mask restricted fields with "REDACTED" instead of removing them.
 * Useful for audit displays and UI where showing the field exists
 * (but is hidden) provides better UX than omitting it entirely.
 */
export function maskRestrictedFields(
  data: Record<string, unknown>,
  role: string
): Record<string, unknown> {
  const restrictedFields = getRestrictedFields(role);

  if (restrictedFields.length === 0) {
    return { ...data };
  }

  const restrictedSet = new Set(restrictedFields);
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (restrictedSet.has(key)) {
      // Only mask if the field actually has a value
      result[key] = value !== null && value !== undefined ? REDACTED_VALUE : value;
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Get field visibility information for a role.
 * Returns which sensitive fields are visible and which are restricted.
 * Non-sensitive fields are not included (they are always visible).
 */
export function getFieldVisibility(
  role: string
): { visible: SensitiveField[]; restricted: SensitiveField[] } {
  const restrictedFields = new Set(getRestrictedFields(role));

  const visible: SensitiveField[] = [];
  const restricted: SensitiveField[] = [];

  for (const field of ALL_SENSITIVE_FIELDS) {
    if (restrictedFields.has(field)) {
      restricted.push(field);
    } else {
      visible.push(field);
    }
  }

  return { visible, restricted };
}

// ============================================
// Advanced Helpers
// ============================================

/**
 * Deep strip restricted fields from nested objects.
 * Checks for restricted fields at every level of the object tree.
 * Handles arrays within objects recursively.
 */
export function deepStripRestrictedFields(
  data: Record<string, unknown>,
  role: string
): Record<string, unknown> {
  const restrictedFields = getRestrictedFields(role);

  if (restrictedFields.length === 0) {
    return deepClone(data);
  }

  return deepProcess(data, restrictedFields, 'strip');
}

/**
 * Deep mask restricted fields from nested objects.
 * Same as deepStripRestrictedFields but uses REDACTED instead of removal.
 */
export function deepMaskRestrictedFields(
  data: Record<string, unknown>,
  role: string
): Record<string, unknown> {
  const restrictedFields = getRestrictedFields(role);

  if (restrictedFields.length === 0) {
    return deepClone(data);
  }

  return deepProcess(data, restrictedFields, 'mask');
}

/**
 * Check if a specific field is restricted for a given role.
 */
export function isFieldRestricted(field: string, role: string): boolean {
  const restrictedFields = getRestrictedFields(role);
  return restrictedFields.includes(field);
}

/**
 * Get the category of a sensitive field (for UI rendering).
 * Returns undefined if the field is not a known sensitive field.
 */
export function getFieldCategory(field: string): string | undefined {
  return FIELD_CATEGORIES[field as SensitiveField];
}

/**
 * Create a field filter function for a role.
 * Returns a predicate that checks if a field name is visible for the role.
 * Useful for filtering column definitions in tables.
 */
export function createFieldFilter(role: string): (field: string) => boolean {
  const restrictedSet = new Set(getRestrictedFields(role));
  return (field: string) => !restrictedSet.has(field);
}

// ============================================
// Internal Helpers
// ============================================

function deepClone(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = deepClone(value);
  }
  return result;
}

function deepProcess(
  data: Record<string, unknown>,
  restrictedFields: string[],
  mode: 'strip' | 'mask'
): Record<string, unknown> {
  const restrictedSet = new Set(restrictedFields);
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (restrictedSet.has(key)) {
      if (mode === 'strip') {
        // Skip this field entirely
        continue;
      } else {
        // Mask it
        result[key] = value !== null && value !== undefined ? REDACTED_VALUE : value;
      }
    } else if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        result[key] = value.map((item) => {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            return deepProcess(item as Record<string, unknown>, restrictedFields, mode);
          }
          return item;
        });
      } else {
        result[key] = deepProcess(value as Record<string, unknown>, restrictedFields, mode);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}
