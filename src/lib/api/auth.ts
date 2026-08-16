// ============================================
// TrimedCast API - Authentication Utilities
// JWT-based auth for API v1 endpoints
// ============================================

import { db } from '@/lib/db';
import { headers } from 'next/headers';

// Simple JWT-like token encoding (for demo; production would use proper JWT library)
// Token format: base64({userId}:{tenantId}:{role}:{expiresAt})

interface TokenPayload {
  userId: string;
  tenantId: string;
  role: string;
  expiresAt: number;
}

// In-memory token store for session management
const tokenStore = new Map<string, TokenPayload>();

export function generateToken(payload: Omit<TokenPayload, 'expiresAt'>): string {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24h expiry
  const fullPayload: TokenPayload = { ...payload, expiresAt };
  
  // Create a simple token
  const tokenStr = `${payload.userId}:${payload.tenantId}:${payload.role}:${expiresAt}`;
  const token = Buffer.from(tokenStr).toString('base64url');
  
  // Store in memory
  tokenStore.set(token, fullPayload);
  
  return token;
}

export function verifyToken(token: string): TokenPayload | null {
  const payload = tokenStore.get(token);
  if (!payload) return null;
  if (payload.expiresAt < Date.now()) {
    tokenStore.delete(token);
    return null;
  }
  return payload;
}

export function revokeToken(token: string): void {
  tokenStore.delete(token);
}

// --- Request Context ---

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
  isAuthenticated: boolean;
}

// Get auth context from request headers
export async function getAuthContext(): Promise<AuthContext> {
  try {
    const hdrs = await headers();
    const authHeader = hdrs.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { userId: '', tenantId: '', role: '', isAuthenticated: false };
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return { userId: '', tenantId: '', role: '', isAuthenticated: false };
    }
    
    return {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      isAuthenticated: true,
    };
  } catch {
    return { userId: '', tenantId: '', role: '', isAuthenticated: false };
  }
}

// --- Role-Based Access Control ---

export type Role = 
  | 'warehouse_manager' 
  | 'sales_manager' 
  | 'marketing_manager' 
  | 'finance' 
  | 'executive';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
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

// Resolve tenant - if no auth, fallback to first active tenant for demo
export async function resolveTenant(tenantId?: string): Promise<string> {
  if (tenantId) {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) return tenant.id;
  }
  
  // Fallback: first active tenant
  const first = await db.tenant.findFirst({ where: { isActive: true } });
  if (first) return first.id;
  
  throw new Error('No active tenant found');
}
