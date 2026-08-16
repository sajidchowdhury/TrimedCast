// ============================================
// TrimedCast API - Authentication Utilities
// DB-backed sessions with RBAC
// ============================================

import { db } from '@/lib/db';
import { headers, cookies } from 'next/headers';
import {
  createSession,
  verifySession,
  revokeSession,
} from '@/lib/auth/session-store';

// --- Token Payload ---

export interface TokenPayload {
  userId: string;
  tenantId: string;
  role: string;
  expiresAt: number;
}

// --- Auth Context ---

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
  isAuthenticated: boolean;
}

/**
 * Create a new authenticated session
 * Returns the session token
 */
export async function createAuthSession(
  userId: string,
  tenantId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return createSession(userId, tenantId, ipAddress, userAgent);
}

/**
 * Get auth context from request headers (Bearer token)
 */
export async function getAuthContext(): Promise<AuthContext> {
  try {
    const hdrs = await headers();
    const authHeader = hdrs.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { userId: '', tenantId: '', role: '', isAuthenticated: false };
    }
    
    const token = authHeader.substring(7);
    return getAuthContextFromToken(token);
  } catch {
    return { userId: '', tenantId: '', role: '', isAuthenticated: false };
  }
}

/**
 * Get auth context from a token string
 */
export async function getAuthContextFromToken(token: string): Promise<AuthContext> {
  const session = await verifySession(token);
  if (!session) {
    return { userId: '', tenantId: '', role: '', isAuthenticated: false };
  }

  // Get user with role
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return { userId: '', tenantId: '', role: '', isAuthenticated: false };
  }

  return {
    userId: session.userId,
    tenantId: session.tenantId,
    role: user.role,
    isAuthenticated: true,
  };
}

/**
 * Get auth context from cookies (for server-side page protection)
 */
export async function getAuthContextFromCookies(): Promise<AuthContext> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('trimedcast-session')?.value;

    if (!token) {
      return { userId: '', tenantId: '', role: '', isAuthenticated: false };
    }

    return getAuthContextFromToken(token);
  } catch {
    return { userId: '', tenantId: '', role: '', isAuthenticated: false };
  }
}

/**
 * Invalidate a session (logout)
 */
export async function logout(token: string): Promise<boolean> {
  return revokeSession(token);
}

// --- Role-Based Access Control ---

export type Role =
  | 'admin'
  | 'warehouse_manager'
  | 'sales_manager'
  | 'marketing_manager'
  | 'finance'
  | 'executive'
  | 'viewer';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [
    // Admin has ALL permissions
    'products.crud', 'inventory.crud', 'suppliers.crud', 'motorcycle_models.crud',
    'sales_orders.crud', 'purchase_orders.crud', 'forecasts.crud', 'forecasts.approve',
    'recommended_orders.crud', 'settings.crud', 'imports.crud', 'users.manage',
    'sop_cycles.crud', 'promo_events.crud', 'audit_log.read',
    'billing.manage', 'subscription.manage', 'team.manage', 'api_explorer.access',
  ],
  warehouse_manager: [
    'products.crud', 'inventory.crud', 'suppliers.crud', 'motorcycle_models.crud',
    'sales_orders.crud', 'purchase_orders.crud', 'forecasts.crud', 'forecasts.approve',
    'recommended_orders.crud', 'settings.crud', 'imports.crud', 'users.manage',
    'sop_cycles.crud', 'promo_events.crud', 'audit_log.read',
  ],
  sales_manager: [
    'products.read', 'inventory.read', 'suppliers.read', 'motorcycle_models.read',
    'sales_orders.crud', 'purchase_orders.read', 'forecasts.read',
    'recommended_orders.read', 'settings.read', 'promo_events.read',
  ],
  marketing_manager: [
    'products.read', 'inventory.read', 'suppliers.read',
    'forecasts.read', 'forecasts.generate', 'recommended_orders.read',
    'settings.read', 'promo_events.crud',
  ],
  finance: [
    'products.read', 'inventory.read', 'suppliers.read',
    'sales_orders.read', 'purchase_orders.read', 'forecasts.read',
    'recommended_orders.read', 'settings.read', 'audit_log.read',
  ],
  executive: [
    'products.read', 'inventory.read', 'suppliers.read', 'motorcycle_models.read',
    'sales_orders.read', 'purchase_orders.read', 'forecasts.read', 'forecasts.approve',
    'recommended_orders.read', 'settings.read', 'sop_cycles.crud', 'audit_log.read',
  ],
  viewer: [
    'products.read', 'inventory.read', 'suppliers.read', 'motorcycle_models.read',
    'sales_orders.read', 'purchase_orders.read', 'forecasts.read',
    'recommended_orders.read', 'settings.read',
  ],
};

export function hasPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role as Role];
  if (!perms) return false;
  return perms.includes(permission);
}

export function canDo(context: AuthContext, permission: string): boolean {
  return context.isAuthenticated && hasPermission(context.role, permission);
}

// --- Tenant-Scoped Database Queries ---

export function tenantScope(tenantId: string) {
  return { tenantId };
}

/**
 * Resolve tenant - if authenticated, use their tenantId
 * Fallback to first active tenant for demo/dev mode
 */
export async function resolveTenant(tenantId?: string): Promise<string> {
  if (tenantId) {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) return tenant.id;
  }
  
  // Fallback: first active tenant (dev/demo mode)
  const first = await db.tenant.findFirst({ where: { isActive: true } });
  if (first) return first.id;
  
  throw new Error('No active tenant found');
}

/**
 * Resolve tenant by AC-ID
 */
export async function resolveTenantByAcId(acId: string): Promise<string | null> {
  const tenant = await db.tenant.findUnique({ where: { acId } });
  return tenant?.id ?? null;
}
