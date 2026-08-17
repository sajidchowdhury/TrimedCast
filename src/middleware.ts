// ============================================
// TrimedCast - Auth Middleware
// Route protection with role-based access
// and tenant status checks
//
// Flow:
// 1. Public routes → allow through
// 2. Auth pages + already logged in → redirect /dashboard
// 3. Protected routes + no session → redirect /login
// 4. Protected routes + invalid/expired session → clear cookie + /login
// 5. Role-restricted routes + insufficient role → redirect /dashboard (403)
// 6. Tenant suspended + accessing operational route → redirect /billing
// 7. Valid session → attach headers → allow
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  isPublicRoute,
  isAuthPage,
  getRequiredRoles,
  isBlockedForSuspended,
  validateSession,
  canAccessRoute,
} from '@/lib/auth/middleware';

// Session cookie name
const SESSION_COOKIE = 'trimedcast-session';

// Header keys for downstream consumption
const HEADER_USER_ID = 'x-user-id';
const HEADER_TENANT_ID = 'x-tenant-id';
const HEADER_USER_ROLE = 'x-user-role';
const HEADER_TENANT_STATUS = 'x-tenant-status';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- 1. Public routes → always allow ----
  if (isPublicRoute(pathname)) {
    // If user is logged in and visiting an auth page, redirect to dashboard
    if (isAuthPage(pathname)) {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      if (token) {
        const result = await validateSession(token);
        if (result.isValid) {
          // Preserve redirect param if present
          const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard';
          return NextResponse.redirect(new URL(redirectTo, request.url));
        }
        // Invalid session on auth page — clear cookie, let them see the auth page
        const response = NextResponse.next();
        response.cookies.delete(SESSION_COOKIE);
        return response;
      }
    }
    return NextResponse.next();
  }

  // ---- 2. Protected routes → check session ----
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    // No token → redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ---- 3. Validate session against DB ----
  const result = await validateSession(token);

  if (!result.isValid) {
    // Invalid/expired session → clear cookie + redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  // ---- 4. Role-based route protection ----
  const requiredRoles = getRequiredRoles(pathname);
  if (requiredRoles && result.role) {
    if (!canAccessRoute(result.role, pathname)) {
      // User doesn't have the required role → redirect to dashboard
      // (They're authenticated, just not authorized for this specific route)
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // ---- 5. Tenant status checks ----
  // If tenant is suspended/past_due and user tries to access operational routes,
  // redirect to billing so they can resolve the payment issue
  if (
    result.tenantStatus &&
    (result.tenantStatus === 'suspended' || result.tenantStatus === 'past_due') &&
    isBlockedForSuspended(pathname)
  ) {
    // Allow access to billing, settings, and auth routes only
    const billingUrl = new URL('/billing', request.url);
    billingUrl.searchParams.set('suspended', 'true');
    return NextResponse.redirect(billingUrl);
  }

  // ---- 6. Valid session → attach user context headers ----
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(HEADER_USER_ID, result.userId || '');
  requestHeaders.set(HEADER_TENANT_ID, result.tenantId || '');
  if (result.role) {
    requestHeaders.set(HEADER_USER_ROLE, result.role);
  }
  if (result.tenantStatus) {
    requestHeaders.set(HEADER_TENANT_STATUS, result.tenantStatus);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const runtime = 'nodejs';

export const config = {
  // Match all routes except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
