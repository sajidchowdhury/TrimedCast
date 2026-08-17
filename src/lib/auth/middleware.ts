// ============================================
// TrimedCast - Auth Middleware Utilities
// Extracted auth check logic for route protection
// Role-based route access + tenant status checks
// ============================================

import { db } from '@/lib/db';

// --- Route Classification ---

/** Public routes that never require authentication */
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/pricing',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
] as const;

/** Public route prefixes (anything under these paths is public) */
export const PUBLIC_ROUTE_PREFIXES = [
  '/api/v1/auth/',     // Auth API endpoints
  '/api/v1/subscription/', // Subscription API (handles auth internally with demo mode)
  '/api/v1/payment/',  // Payment API (handles auth internally)
  '/api/health',       // Health check
  '/_next/',           // Next.js static assets
  '/favicon',          // Favicon
  '/api/imports/file', // File upload (has its own auth)
] as const;

/** Auth-only pages (redirect to /dashboard if already logged in) */
export const AUTH_PAGES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
] as const;

/** Routes that require specific roles */
export const ROLE_RESTRICTED_ROUTES: Record<string, string[]> = {
  '/admin':          ['admin'],
  '/settings':       ['admin', 'warehouse_manager'],
  '/billing':        ['admin', 'finance'],
  '/team':           ['admin'],
  '/audit-log':      ['admin', 'finance', 'executive'],
};

/** Routes blocked for suspended/cancelled tenants (can still view billing) */
export const SUSPENSION_BLOCKED_PREFIXES = [
  '/dashboard',
  '/products',
  '/inventory',
  '/suppliers',
  '/forecasts',
  '/orders',
  '/imports',
  '/reports',
  '/sop',
] as const;

// --- Route Classification Functions ---

/**
 * Check if a path is a public route
 */
export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname as typeof PUBLIC_ROUTES[number])) return true;
  return PUBLIC_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

/**
 * Check if a path is an auth page (login/signup)
 */
export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.includes(pathname as typeof AUTH_PAGES[number]);
}

/**
 * Check if a path requires specific roles
 * Returns the required roles or null if no restriction
 */
export function getRequiredRoles(pathname: string): string[] | null {
  for (const [route, roles] of Object.entries(ROLE_RESTRICTED_ROUTES)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return roles;
    }
  }
  return null;
}

/**
 * Check if a path is blocked for suspended tenants
 */
export function isBlockedForSuspended(pathname: string): boolean {
  return SUSPENSION_BLOCKED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  );
}

// --- Session Validation ---

export interface SessionValidationResult {
  isValid: boolean;
  userId?: string;
  tenantId?: string;
  role?: string;
  tenantStatus?: string;
  tenantIsActive?: boolean;
  reason?: 'no_token' | 'session_not_found' | 'session_expired' | 'user_deactivated' | 'tenant_deactivated';
}

/**
 * Validate session token against the database
 * Returns full validation result with user/tenant context
 */
export async function validateSession(token: string): Promise<SessionValidationResult> {
  if (!token) {
    return { isValid: false, reason: 'no_token' };
  }

  // Look up session
  const session = await db.userSession.findUnique({
    where: { token },
    select: {
      id: true,
      isActive: true,
      expiresAt: true,
      userId: true,
      tenantId: true,
    },
  });

  if (!session) {
    return { isValid: false, reason: 'session_not_found' };
  }

  if (!session.isActive || session.expiresAt <= new Date()) {
    // Expired/inactive — deactivate in DB
    if (session.isActive) {
      await db.userSession.update({
        where: { id: session.id },
        data: { isActive: false },
      }).catch(() => {}); // Silent fail on cleanup
    }
    return { isValid: false, reason: 'session_expired' };
  }

  // Get user with role + tenant status
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      role: true,
      isActive: true,
      tenant: {
        select: {
          status: true,
          isActive: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return { isValid: false, userId: session.userId, tenantId: session.tenantId, reason: 'user_deactivated' };
  }

  if (!user.tenant.isActive) {
    return {
      isValid: false,
      userId: session.userId,
      tenantId: session.tenantId,
      role: user.role,
      tenantStatus: user.tenant.status,
      tenantIsActive: false,
      reason: 'tenant_deactivated',
    };
  }

  return {
    isValid: true,
    userId: session.userId,
    tenantId: session.tenantId,
    role: user.role,
    tenantStatus: user.tenant.status,
    tenantIsActive: true,
  };
}

/**
 * Check if a user with given role can access a path
 */
export function canAccessRoute(role: string, pathname: string): boolean {
  const requiredRoles = getRequiredRoles(pathname);
  if (!requiredRoles) return true; // No restriction
  return requiredRoles.includes(role);
}
