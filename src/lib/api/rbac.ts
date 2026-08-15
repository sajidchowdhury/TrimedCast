// ============================================
// TrimedCast API - Role-Based Access Control (RBAC)
// Granular permission matrix from RBAC & Security Model.md
// 5-role hierarchy with field-level security
// ============================================

// --- Role Hierarchy ---
// Level 0: executive (strategic oversight, parallel to warehouse_manager)
// Level 1: warehouse_manager (highest operational authority)
// Level 2: sales_manager
// Level 3: marketing_manager
// Level 4: finance (strictly read-only)

export type Role =
  | 'warehouse_manager'
  | 'sales_manager'
  | 'marketing_manager'
  | 'finance'
  | 'executive';

export const ROLE_HIERARCHY: Record<Role, number> = {
  executive: 0,
  warehouse_manager: 1,
  sales_manager: 2,
  marketing_manager: 3,
  finance: 4,
};

export const ROLE_LABELS: Record<Role, string> = {
  warehouse_manager: 'Warehouse Manager',
  sales_manager: 'Sales Manager',
  marketing_manager: 'Marketing Manager',
  finance: 'Finance',
  executive: 'Executive',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  warehouse_manager: 'Operational admin with full control over products, inventory, suppliers, POs, forecast config, and user management.',
  sales_manager: 'Manages sales orders. Read-only visibility into products/inventory/POs. Financial data deliberately hidden.',
  marketing_manager: 'Drives demand-side adjustments via promo events and promo index. No cost or supply-chain data.',
  finance: 'Strictly read-only across all financial data, forecast accuracy, and audit log. No modification capability.',
  executive: 'Strategic leadership with full data visibility. Can approve forecasts & S&OP stages. Cannot perform CRUD operations.',
};

// --- Granular Permissions (resource.action format) ---

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  warehouse_manager: [
    // Products: full CRUD
    'product.create', 'product.read', 'product.update', 'product.delete', 'product.approve', 'product.export',
    // Inventory: full CRUD
    'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete', 'inventory.approve', 'inventory.export',
    // Sales Orders: full CRUD
    'sales_order.create', 'sales_order.read', 'sales_order.update', 'sales_order.delete', 'sales_order.approve', 'sales_order.export',
    // Purchase Orders: full CRUD
    'purchase_order.create', 'purchase_order.read', 'purchase_order.update', 'purchase_order.delete', 'purchase_order.approve', 'purchase_order.export',
    // Suppliers: full CRUD
    'supplier.create', 'supplier.read', 'supplier.update', 'supplier.delete', 'supplier.approve', 'supplier.export',
    // Forecasts: full CRUD + approve
    'forecast.create', 'forecast.read', 'forecast.update', 'forecast.delete', 'forecast.approve', 'forecast.export',
    // Forecast Settings: full CRUD
    'forecast_settings.create', 'forecast_settings.read', 'forecast_settings.update', 'forecast_settings.delete',
    // Promo Events: full CRUD
    'promo_event.create', 'promo_event.read', 'promo_event.update', 'promo_event.delete', 'promo_event.approve', 'promo_event.export',
    // Promo Index: full CRUD
    'promo_index.create', 'promo_index.read', 'promo_index.update', 'promo_index.delete', 'promo_index.approve', 'promo_index.export',
    // S&OP: full access
    'sop.read', 'sop.advance', 'sop.approve', 'sop.override',
    // Users: full management
    'user.create', 'user.read', 'user.update', 'user.delete', 'user.approve', 'user.export',
    // Audit log + financial data
    'audit_log.read', 'audit_log.export',
    'financial_data.read', 'financial_data.export',
    // Data imports
    'import.execute',
    // Dashboard
    'dashboard.read',
    // Motorcycle models
    'motorcycle_model.create', 'motorcycle_model.read', 'motorcycle_model.update', 'motorcycle_model.delete',
    // Recommended orders
    'recommended_order.read', 'recommended_order.update', 'recommended_order.create',
  ],

  sales_manager: [
    // Products: read with field restrictions (🔒)
    'product.read', 'product.export',
    // Inventory: read with field restrictions (🔒)
    'inventory.read', 'inventory.export',
    // Sales Orders: full CRUD (own orders + read all)
    'sales_order.create', 'sales_order.read', 'sales_order.update', 'sales_order.delete', 'sales_order.export',
    // Purchase Orders: read with field restrictions (🔒)
    'purchase_order.read',
    // Suppliers: read with field restrictions (🔒)
    'supplier.read',
    // Forecasts: read only
    'forecast.read', 'forecast.export',
    // Promo Events: read only
    'promo_event.read',
    // S&OP: read only
    'sop.read',
    // Users: read only (basic info)
    'user.read',
    // Dashboard
    'dashboard.read',
    // Motorcycle models: read
    'motorcycle_model.read',
    // Recommended orders: read
    'recommended_order.read',
  ],

  marketing_manager: [
    // Products: read with field restrictions (🔒)
    'product.read', 'product.export',
    // Sales Orders: read only (demand insights)
    'sales_order.read',
    // Forecasts: read + generate
    'forecast.read', 'forecast.export', 'forecast.create',
    // Promo Events: full CRUD
    'promo_event.create', 'promo_event.read', 'promo_event.update', 'promo_event.delete', 'promo_event.export',
    // Promo Index: full CRUD
    'promo_index.create', 'promo_index.read', 'promo_index.update', 'promo_index.delete', 'promo_index.export',
    // S&OP: read only
    'sop.read',
    // Users: read only (basic info)
    'user.read',
    // Dashboard
    'dashboard.read',
    // Recommended orders: read
    'recommended_order.read',
  ],

  finance: [
    // Products: full read (including financial fields)
    'product.read',
    // Inventory: full read (including values)
    'inventory.read',
    // Sales Orders: read only
    'sales_order.read',
    // Purchase Orders: read only (status + values)
    'purchase_order.read',
    // Suppliers: read only (excludes contract terms)
    'supplier.read',
    // Forecasts: read only (accuracy metrics)
    'forecast.read',
    // Forecast Settings: read only
    'forecast_settings.read',
    // Promo Events: read only
    'promo_event.read',
    // Promo Index: read only
    'promo_index.read',
    // S&OP: read only
    'sop.read',
    // Users: read only
    'user.read',
    // Audit log: full read access
    'audit_log.read',
    // Financial data: read access
    'financial_data.read',
    // Dashboard
    'dashboard.read',
    // Recommended orders: read
    'recommended_order.read',
  ],

  executive: [
    // Products: full read
    'product.read', 'product.export',
    // Inventory: full read
    'inventory.read', 'inventory.export',
    // Sales Orders: full read
    'sales_order.read', 'sales_order.export',
    // Purchase Orders: full read
    'purchase_order.read', 'purchase_order.export',
    // Suppliers: full read
    'supplier.read', 'supplier.export',
    // Forecasts: read + approve
    'forecast.read', 'forecast.approve', 'forecast.export',
    // Forecast Settings: read only
    'forecast_settings.read',
    // Promo Events: full read
    'promo_event.read', 'promo_event.export',
    // Promo Index: full read
    'promo_index.read', 'promo_index.export',
    // S&OP: read + advance + approve + override
    'sop.read', 'sop.advance', 'sop.approve', 'sop.override',
    // Users: read only
    'user.read', 'user.export',
    // Audit log: full read
    'audit_log.read', 'audit_log.export',
    // Financial data: read + export
    'financial_data.read', 'financial_data.export',
    // Dashboard
    'dashboard.read',
    // Motorcycle models: read
    'motorcycle_model.read',
    // Recommended orders: read
    'recommended_order.read',
  ],
};

// --- Field-Level Security ---
// Fields restricted per role (hidden/masked from API responses)
// From RBAC & Security Model.md Section 2.2

export const FIELD_SECURITY: Record<Role, string[]> = {
  warehouse_manager: [], // Full access to all fields
  sales_manager: [
    'unit_cost_bdt', 'margin_bdt', 'margin_pct',
    'supplier_unit_price', 'supplier_contract_terms', 'supplier_payment_terms',
    'eoq_total_cost', 'po_total_value_bdt', 'inventory_value_bdt',
  ],
  marketing_manager: [
    'unit_cost_bdt', 'margin_bdt', 'margin_pct',
    'supplier_unit_price', 'supplier_contract_terms', 'supplier_payment_terms',
    'eoq_total_cost', 'po_total_value_bdt', 'inventory_value_bdt',
  ],
  finance: [
    'supplier_contract_terms', 'supplier_payment_terms',
  ],
  executive: [], // Full access to all fields
};

// --- Rate Limits per Role (requests per minute) ---

export const ROLE_RATE_LIMITS: Record<Role, Record<string, number>> = {
  warehouse_manager: { api: 60, ai: 20, forecast: 10, import: 5 },
  sales_manager: { api: 60, ai: 20, forecast: 10, import: 0 },
  marketing_manager: { api: 60, ai: 20, forecast: 10, import: 0 },
  finance: { api: 60, ai: 20, forecast: 0, import: 0 },
  executive: { api: 60, ai: 20, forecast: 10, import: 0 },
};

// --- All Financial Fields ---

export const FINANCIAL_FIELDS = [
  'unit_cost_bdt', 'margin_bdt', 'margin_pct',
  'supplier_unit_price', 'supplier_contract_terms', 'supplier_payment_terms',
  'eoq_total_cost', 'po_total_value_bdt', 'inventory_value_bdt',
];

// ============================================
// Helper Functions
// ============================================

export function getRoleHierarchy(role: string): number {
  return ROLE_HIERARCHY[role as Role] ?? 99;
}

export function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role as Role] ?? [];
}

export function getRestrictedFields(role: string): string[] {
  return FIELD_SECURITY[role as Role] ?? [];
}

export function canViewFinancials(role: string): boolean {
  const r = role as Role;
  return r === 'warehouse_manager' || r === 'finance' || r === 'executive';
}

export function canViewSupplierContracts(role: string): boolean {
  const r = role as Role;
  return r === 'warehouse_manager' || r === 'executive';
}

export function canApproveForecasts(role: string): boolean {
  const r = role as Role;
  return r === 'warehouse_manager' || r === 'executive';
}

export function isReadOnlyRole(role: string): boolean {
  return role === 'finance';
}

export function isOperationalRole(role: string): boolean {
  const r = role as Role;
  return r === 'warehouse_manager' || r === 'sales_manager' || r === 'marketing_manager';
}

export function hasGranularPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role as Role];
  if (!perms) return false;
  return perms.includes(permission);
}

export function isValidRole(role: string): role is Role {
  return role in ROLE_HIERARCHY;
}

export function getAllRoles(): Role[] {
  return ['warehouse_manager', 'sales_manager', 'marketing_manager', 'finance', 'executive'];
}

export function isFieldRestricted(role: string, field: string): boolean {
  const restricted = FIELD_SECURITY[role as Role];
  if (!restricted) return false;
  return restricted.includes(field);
}

// --- Governance Note Validation ---
// governance_note required when overriding calculated values or advancing S&OP stages

export function validateGovernanceNote(
  permission: string,
  body: Record<string, unknown>
): { valid: boolean; error?: string } {
  const requiresNote = [
    'forecast.approve', 'forecast.update',
    'sop.advance', 'sop.override',
    'sop.approve',
  ];

  if (requiresNote.includes(permission)) {
    if (!body.governance_note || typeof body.governance_note !== 'string' || body.governance_note.trim().length < 10) {
      return {
        valid: false,
        error: `Governance note is required for ${permission} (minimum 10 characters explaining the rationale)`,
      };
    }
  }

  return { valid: true };
}

// --- Role Info Composite ---

export function getRoleInfo(role: string) {
  const r = role as Role;
  return {
    key: r,
    label: ROLE_LABELS[r] ?? role,
    description: ROLE_DESCRIPTIONS[r] ?? '',
    hierarchy_level: ROLE_HIERARCHY[r] ?? 99,
    permissions: ROLE_PERMISSIONS[r] ?? [],
    restricted_fields: FIELD_SECURITY[r] ?? [],
    rate_limits: ROLE_RATE_LIMITS[r] ?? { api: 0, ai: 0, forecast: 0, import: 0 },
    can_view_financials: canViewFinancials(role),
    can_view_supplier_contracts: canViewSupplierContracts(role),
    can_approve_forecasts: canApproveForecasts(role),
    is_read_only: isReadOnlyRole(role),
    is_operational: isOperationalRole(role),
  };
}

// --- In-Memory Rate Limit Tracking ---

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

export function checkRateLimit(
  userId: string,
  category: string,
  role: string
): { allowed: boolean; remaining: number; limit: number; resetAt: number } {
  const limits = ROLE_RATE_LIMITS[role as Role];
  if (!limits) return { allowed: false, remaining: 0, limit: 0, resetAt: 0 };

  const limit = limits[category] ?? 0;
  if (limit === 0) return { allowed: false, remaining: 0, limit: 0, resetAt: 0 };

  const key = `${userId}:${category}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, limit, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, limit, resetAt: entry.windowStart + RATE_LIMIT_WINDOW_MS };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, limit, resetAt: entry.windowStart + RATE_LIMIT_WINDOW_MS };
}

export function getRateLimitStatus(
  userId: string,
  role: string
): Record<string, { used: number; limit: number; remaining: number; resetAt: number }> {
  const limits = ROLE_RATE_LIMITS[role as Role];
  if (!limits) return {};

  const now = Date.now();
  const result: Record<string, { used: number; limit: number; remaining: number; resetAt: number }> = {};

  for (const [category, limit] of Object.entries(limits)) {
    const key = `${userId}:${category}`;
    const entry = rateLimitStore.get(key);

    let used = 0;
    let resetAt = now + RATE_LIMIT_WINDOW_MS;

    if (entry && (now - entry.windowStart) <= RATE_LIMIT_WINDOW_MS) {
      used = entry.count;
      resetAt = entry.windowStart + RATE_LIMIT_WINDOW_MS;
    }

    result[category] = { used, limit, remaining: Math.max(0, limit - used), resetAt };
  }

  return result;
}
