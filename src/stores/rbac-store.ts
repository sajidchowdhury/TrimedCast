// ============================================
// TrimedCast - RBAC Zustand Store
// Session 16: Role-Based Access Control
// Client-side RBAC state with cached permissions
// ============================================

import { create } from 'zustand';
import {
  type Role,
  getRolePermissions,
  getRestrictedFields,
  getRoleInfo,
  isFieldRestricted as checkFieldRestricted,
  isReadOnlyRole,
  canViewFinancials as checkCanViewFinancials,
  canApproveForecasts as checkCanApproveForecasts,
} from '@/lib/api/rbac';
import type { RoleInfo } from '@/components/rbac/types';

// --- Store Interface ---

interface RbacStore {
  // State
  role: string;
  permissions: string[];
  restrictedFields: string[];
  roleInfo: RoleInfo | null;
  isLoading: boolean;
  lastSyncAt: number | null;

  // Actions
  syncFromApi: () => Promise<void>;
  setRole: (role: string) => void;
  reset: () => void;

  // Computed
  hasPermission: (perm: string) => boolean;
  hasAnyPermission: (perms: string[]) => boolean;
  hasAllPermissions: (perms: string[]) => boolean;
  isFieldRestricted: (field: string) => boolean;
  canPerform: (resource: string, action: string) => boolean;
  isReadOnly: () => boolean;
  canViewFinancials: () => boolean;
  canApproveForecasts: () => boolean;
}

// --- Initial State ---

const initialState = {
  role: '',
  permissions: [] as string[],
  restrictedFields: [] as string[],
  roleInfo: null as RoleInfo | null,
  isLoading: false,
  lastSyncAt: null as number | null,
};

// --- Helper: Update derived state from role ---

function deriveFromRole(role: string) {
  const permissions = getRolePermissions(role);
  const restrictedFields = getRestrictedFields(role);
  const info = getRoleInfo(role);
  const roleInfo: RoleInfo = {
    key: info.key,
    label: info.label,
    description: info.description,
    hierarchy_level: info.hierarchy_level,
    permissions: info.permissions,
    restricted_fields: info.restricted_fields,
    rate_limits: info.rate_limits,
    can_view_financials: info.can_view_financials,
    can_view_supplier_contracts: info.can_view_supplier_contracts,
    can_approve_forecasts: info.can_approve_forecasts,
    is_read_only: info.is_read_only,
    is_operational: info.is_operational,
  };
  return { role, permissions, restrictedFields, roleInfo };
}

// --- Store ---

export const useRbacStore = create<RbacStore>((set, get) => ({
  ...initialState,

  // --- Actions ---

  syncFromApi: async () => {
    set({ isLoading: true });

    try {
      const res = await fetch('/api/v1/security/permissions', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        console.warn('[RBAC Store] Failed to sync permissions from API:', res.status);
        set({ isLoading: false });
        return;
      }

      const json = await res.json();

      if (json.success && json.data) {
        const role: string = json.data.role ?? '';
        const derived = deriveFromRole(role);
        set({
          ...derived,
          // If API returns custom permissions (e.g., overridden), prefer those
          permissions: json.data.permissions ?? derived.permissions,
          isLoading: false,
          lastSyncAt: Date.now(),
        });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('[RBAC Store] syncFromApi error:', err);
      set({ isLoading: false });
    }
  },

  setRole: (role: string) => {
    const derived = deriveFromRole(role);
    set({
      ...derived,
      lastSyncAt: Date.now(),
    });
  },

  reset: () => {
    set({
      ...initialState,
    });
  },

  // --- Computed ---

  hasPermission: (perm: string) => {
    return get().permissions.includes(perm);
  },

  hasAnyPermission: (perms: string[]) => {
    const permissions = get().permissions;
    return perms.some((p) => permissions.includes(p));
  },

  hasAllPermissions: (perms: string[]) => {
    const permissions = get().permissions;
    return perms.every((p) => permissions.includes(p));
  },

  isFieldRestricted: (field: string) => {
    const role = get().role;
    if (!role) return false;
    return checkFieldRestricted(role, field);
  },

  canPerform: (resource: string, action: string) => {
    const permission = `${resource}.${action}`;
    return get().permissions.includes(permission);
  },

  isReadOnly: () => {
    const role = get().role;
    return isReadOnlyRole(role);
  },

  canViewFinancials: () => {
    const role = get().role;
    return checkCanViewFinancials(role);
  },

  canApproveForecasts: () => {
    const role = get().role;
    return checkCanApproveForecasts(role);
  },
}));
