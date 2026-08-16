// ============================================
// TrimedCast - Auth Middleware
// Route protection: unauthenticated users
// redirected to /login for protected routes
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/pricing',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
];

// Public route prefixes (anything under these paths is public)
const PUBLIC_ROUTE_PREFIXES = [
  '/api/v1/auth/',     // Auth API endpoints
  '/api/health',       // Health check
  '/_next/',           // Next.js static assets
  '/favicon',          // Favicon
  '/api/imports/file', // File upload endpoint (has its own auth)
];

// Auth pages (redirect to dashboard if already logged in)
const AUTH_PAGES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
];

/**
 * Check if a path matches any public route prefix
 */
function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

/**
 * Check if a path is an auth page (login/signup)
 */
function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.includes(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    // If user is logged in and visiting auth page, redirect to dashboard
    if (isAuthPage(pathname)) {
      const token = request.cookies.get('trimedcast-session')?.value;
      if (token) {
        // Verify session is still valid
        const session = await db.userSession.findUnique({
          where: { token },
          select: { isActive: true, expiresAt: true },
        });

        if (session?.isActive && session.expiresAt > new Date()) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // For protected routes, check session
  const token = request.cookies.get('trimedcast-session')?.value;

  if (!token) {
    // No token — redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify session
  const session = await db.userSession.findUnique({
    where: { token },
    select: { isActive: true, expiresAt: true, userId: true, tenantId: true },
  });

  if (!session || !session.isActive || session.expiresAt <= new Date()) {
    // Invalid/expired session — clear cookie and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('trimedcast-session');
    return response;
  }

  // Valid session — attach user info to headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', session.userId);
  requestHeaders.set('x-tenant-id', session.tenantId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Match all routes except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
