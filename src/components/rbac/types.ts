// ============================================
// TrimedCast - RBAC Component Types
// Session 16: Role-Based Access Control
// Types, constants, and labels for RBAC components
// ============================================

import type { Role } from '@/lib/api/rbac';

// --- RoleInfo (mirrors getRoleInfo return type) ---

export interface RoleInfo {
  key: string;
  label: string;
  description: string;
  hierarchy_level: number;
  permissions: string[];
  restricted_fields: string[];
  rate_limits: Record<string, number>;
  can_view_financials: boolean;
  can_view_supplier_contracts: boolean;
  can_approve_forecasts: boolean;
  is_read_only: boolean;
  is_operational: boolean;
}

// --- Permission Check ---

export interface PermissionCheck {
  permission: string;
  allowed: boolean;
}

export interface PermissionCheckResult {
  checks: PermissionCheck[];
  allAllowed: boolean;
  anyAllowed: boolean;
}

// --- Field Security Config ---

export interface FieldSecurityConfig {
  field: string;
  isRestricted: boolean;
  mode: 'hide' | 'mask';
  maskChar: string;
}

// --- Rate Limit Config ---

export interface RateLimitConfig {
  category: string;
  limit: number;
  used: number;
  remaining: number;
  resetAt: number;
}

// --- RBAC Resource Actions (all possible resource.action strings) ---

export const RBAC_RESOURCE_ACTIONS = [
  // Products
  'product.create', 'product.read', 'product.update', 'product.delete', 'product.approve', 'product.export',
  // Inventory
  'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete', 'inventory.approve', 'inventory.export',
  // Sales Orders
  'sales_order.create', 'sales_order.read', 'sales_order.update', 'sales_order.delete', 'sales_order.approve', 'sales_order.export',
  // Purchase Orders
  'purchase_order.create', 'purchase_order.read', 'purchase_order.update', 'purchase_order.delete', 'purchase_order.approve', 'purchase_order.export',
  // Suppliers
  'supplier.create', 'supplier.read', 'supplier.update', 'supplier.delete', 'supplier.approve', 'supplier.export',
  // Forecasts
  'forecast.create', 'forecast.read', 'forecast.update', 'forecast.delete', 'forecast.approve', 'forecast.export',
  // Forecast Settings
  'forecast_settings.create', 'forecast_settings.read', 'forecast_settings.update', 'forecast_settings.delete',
  // Promo Events
  'promo_event.create', 'promo_event.read', 'promo_event.update', 'promo_event.delete', 'promo_event.approve', 'promo_event.export',
  // Promo Index
  'promo_index.create', 'promo_index.read', 'promo_index.update', 'promo_index.delete', 'promo_index.approve', 'promo_index.export',
  // S&OP
  'sop.read', 'sop.advance', 'sop.approve', 'sop.override',
  // Users
  'user.create', 'user.read', 'user.update', 'user.delete', 'user.approve', 'user.export',
  // Audit Log
  'audit_log.read', 'audit_log.export',
  // Financial Data
  'financial_data.read', 'financial_data.export',
  // Import
  'import.execute',
  // Dashboard
  'dashboard.read',
  // Motorcycle Models
  'motorcycle_model.create', 'motorcycle_model.read', 'motorcycle_model.update', 'motorcycle_model.delete',
  // Recommended Orders
  'recommended_order.read', 'recommended_order.update', 'recommended_order.create',
] as const;

export type RbacResourceAction = (typeof RBAC_RESOURCE_ACTIONS)[number];

// --- Role Colors (consistent Tailwind classes for each role) ---

export const ROLE_COLORS: Record<Role, { bg: string; text: string; border: string; dot: string }> = {
  warehouse_manager: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-700',
    dot: 'bg-amber-500',
  },
  sales_manager: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-700',
    dot: 'bg-emerald-500',
  },
  marketing_manager: {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-300 dark:border-violet-700',
    dot: 'bg-violet-500',
  },
  finance: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-400',
    border: 'border-cyan-300 dark:border-cyan-700',
    dot: 'bg-cyan-500',
  },
  executive: {
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-300 dark:border-sky-700',
    dot: 'bg-sky-500',
  },
};

// --- Bengali Role Labels ---

export const BENGALI_ROLE_LABELS: Record<Role, string> = {
  warehouse_manager: 'গোডাউন ম্যানেজার',
  sales_manager: 'সেলস ম্যানেজার',
  marketing_manager: 'মার্কেটিং ম্যানেজার',
  finance: 'ফিন্যান্স',
  executive: 'এক্সিকিউটিভ',
};

// --- Guard Component Props ---

export interface PermissionGuardProps {
  /** Single permission string or array of permissions */
  permission: string | string[];
  /** Fallback to render when permission is denied */
  fallback?: React.ReactNode;
  /** Match mode: 'any' = at least one permission, 'all' = every permission required */
  mode?: 'any' | 'all';
  children: React.ReactNode;
}

export interface RoleGuardProps {
  /** Single role string or array of roles */
  role: string | string[];
  /** Fallback to render when role check fails */
  fallback?: React.ReactNode;
  /** Match mode: 'any' = at least one role matches, 'all' = every role must match */
  mode?: 'any' | 'all';
  children: React.ReactNode;
}

export interface FieldGuardProps {
  /** Field name to check against restricted fields */
  field: string;
  /** Display mode: 'hide' = render nothing, 'mask' = replace with mask chars */
  mode?: 'hide' | 'mask';
  /** Character(s) to use when masking (default '•••') */
  maskChar?: string;
  children: React.ReactNode;
}

export interface ReadOnlyGuardProps {
  children: React.ReactNode;
  /** Show the children as disabled (true) or hide them entirely (false) */
  showDisabled?: boolean;
}

export interface PermissionGateProps {
  /** Single permission string or array of permissions */
  permission: string | string[];
  /** Fallback to render when permission is denied */
  fallback?: React.ReactNode;
  /** Match mode: 'any' | 'all' */
  mode?: 'any' | 'all';
  /** Number of skeleton lines to show while loading */
  skeletonLines?: number;
  children: React.ReactNode;
}

// --- Combined RBAC Guard Hook Result ---

export interface RbacGuardResult {
  /** Whether the current check passes */
  allowed: boolean;
  /** Auth loading state */
  isLoading: boolean;
  /** Current user role */
  role: string | null;
  /** Whether the role is read-only */
  isReadOnly: boolean;
  /** Check a specific permission */
  hasPermission: (perm: string) => boolean;
  /** Check any of the given permissions */
  hasAnyPermission: (perms: string[]) => boolean;
  /** Check all of the given permissions */
  hasAllPermissions: (perms: string[]) => boolean;
  /** Check if a field is restricted for current role */
  isFieldRestricted: (field: string) => boolean;
}
