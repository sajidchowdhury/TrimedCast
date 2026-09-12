// ============================================
// TrimedCast LEAN — auth middleware stubs (NO-OP)
//
// The lean build has NO auth system (deferred per lean scope:
// single-admin, no RBAC, no tenant resolution). This stub module
// exists ONLY so that a stray src/middleware.ts (copied from the
// original TrimedCast codebase) can import these functions without
// breaking the build.
//
// All functions return "allow everything" defaults, making the
// middleware a complete pass-through (no-op) — every request is
// treated as public and allowed.
// ============================================

import type { NextRequest } from 'next/server';

/**
 * In the lean build, ALL routes are public (no auth).
 * Returns true for every pathname so the middleware short-circuits
 * at step 1 (public routes → allow) and never reaches the session check.
 */
export function isPublicRoute(_pathname: string): boolean {
  return true;
}

/** No auth pages in the lean build. */
export function isAuthPage(_pathname: string): boolean {
  return false;
}

/** No role-based route protection in the lean build. */
export function getRequiredRoles(_pathname: string): string[] | null {
  return null;
}

/** No tenant suspension logic in the lean build. */
export function isBlockedForSuspended(_pathname: string): boolean {
  return false;
}

/** No session validation in the lean build — always returns invalid. */
export async function validateSession(_token: string): Promise<{
  isValid: boolean;
  userId?: string;
  tenantId?: string;
  role?: string;
  tenantStatus?: string;
}> {
  // Return isValid: false, but since isPublicRoute() always returns true,
  // this function is never actually called by the middleware.
  return { isValid: false };
}

/** No role-based access control in the lean build — everyone can access. */
export function canAccessRoute(_role: string, _pathname: string): boolean {
  return true;
}

// Export a default no-op for any other potential imports
export default function noop(_req: NextRequest) {
  return undefined;
}
