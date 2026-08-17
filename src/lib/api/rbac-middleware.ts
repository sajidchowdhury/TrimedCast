// ============================================
// TrimedCast API - RBAC Middleware
// Reusable wrapper for API routes with automatic
// permission checking and response field filtering
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthContext,
  AuthContext,
  AuthError,
} from '@/lib/api/auth';
import {
  hasGranularPermission,
  getRestrictedFields,
  checkRateLimit,
  validateGovernanceNote as rbacValidateGovernanceNote,
  FIELD_SECURITY,
  type Role,
} from '@/lib/api/rbac';
import {
  logSecurityEvent,
  checkSuspiciousActivity,
  SECURITY_EVENT_TYPES,
} from '@/lib/api/security-event';
import {
  apiError,
  forbiddenError,
  unauthorizedError,
  rateLimitError,
} from '@/lib/api/response';
import { createAuditLog } from '@/lib/api/audit';

// --- RBAC Middleware Options ---

export interface RbacOptions {
  /** Required permission in resource.action format (e.g., 'product.read') */
  permission?: string;
  /** Required role(s) — user must have one of these roles */
  role?: string | string[];
  /** Allow unauthenticated/demo access (default: false) */
  allowDemo?: boolean;
  /** Auto-filter response fields based on role (default: true) */
  filterFields?: boolean;
  /** Require governance_note in request body (default: false) */
  requireGovernanceNote?: boolean;
  /** Rate limit category to check (e.g., 'api', 'forecast') */
  rateLimitCategory?: string;
}

// --- Extended Context passed to handlers ---

export interface RbacContext {
  auth: AuthContext;
}

// --- API Route Handler Type ---

type ApiRouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

type RbacHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
  rbacCtx: RbacContext
) => Promise<NextResponse> | NextResponse;

// ============================================
// withRbac()
// Higher-order function wrapping API route handlers
// with automatic RBAC enforcement
//
// Usage:
//   export const GET = withRbac({ permission: 'product.read' }, async (req, ctx, rbac) => {
//     // rbac.auth.userId, rbac.auth.tenantId, rbac.auth.role
//     return apiSuccess({ ... });
//   });
// ============================================

export function withRbac(options: RbacOptions, handler: RbacHandler): ApiRouteHandler {
  const {
    permission,
    role: requiredRole,
    allowDemo = false,
    filterFields: shouldFilterFields = true,
    requireGovernanceNote = false,
    rateLimitCategory,
  } = options;

  return async (request, ctx) => {
    try {
      // ---- Step 1: Authentication ----
      const auth = await getAuthContext();

      if (!auth.isAuthenticated && !allowDemo) {
        // Log unauthorized access attempt
        await logSecurityEvent({
          tenantId: 'unknown',
          eventType: SECURITY_EVENT_TYPES.ACCESS_DENIED,
          severity: 'medium',
          details: {
            reason: 'unauthenticated',
            permission: permission ?? 'none',
            path: request.nextUrl.pathname,
            method: request.method,
          },
          ipAddress: extractIpAddress(request),
          userAgent: extractUserAgent(request),
        });

        return unauthorizedError('Authentication required');
      }

      // For demo/anonymous mode with no auth, create a minimal context
      const effectiveAuth: AuthContext = auth.isAuthenticated
        ? auth
        : { userId: 'demo', tenantId: 'demo', role: 'viewer', isAuthenticated: false };

      // ---- Step 2: Permission Check ----
      if (permission && effectiveAuth.isAuthenticated) {
        const hasPermission = hasGranularPermission(effectiveAuth.role, permission);
        if (!hasPermission) {
          // Log permission denial
          await logSecurityEvent({
            tenantId: effectiveAuth.tenantId,
            userId: effectiveAuth.userId,
            eventType: SECURITY_EVENT_TYPES.ACCESS_DENIED,
            severity: 'medium',
            details: {
              reason: 'permission_denied',
              requiredPermission: permission,
              userRole: effectiveAuth.role,
              path: request.nextUrl.pathname,
              method: request.method,
            },
            ipAddress: extractIpAddress(request),
            userAgent: extractUserAgent(request),
          });

          // Check for suspicious activity (multiple denied attempts)
          await checkSuspiciousActivity(effectiveAuth.tenantId, effectiveAuth.userId);

          return forbiddenError(`Permission denied: ${permission}`);
        }
      }

      // ---- Step 3: Role Check ----
      if (requiredRole && effectiveAuth.isAuthenticated) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!roles.includes(effectiveAuth.role)) {
          // Log role denial
          await logSecurityEvent({
            tenantId: effectiveAuth.tenantId,
            userId: effectiveAuth.userId,
            eventType: SECURITY_EVENT_TYPES.ACCESS_DENIED,
            severity: 'medium',
            details: {
              reason: 'role_denied',
              requiredRoles: roles,
              userRole: effectiveAuth.role,
              path: request.nextUrl.pathname,
              method: request.method,
            },
            ipAddress: extractIpAddress(request),
            userAgent: extractUserAgent(request),
          });

          return forbiddenError(`Role denied: requires one of [${roles.join(', ')}]`);
        }
      }

      // ---- Step 4: Governance Note Validation ----
      if (requireGovernanceNote && permission && effectiveAuth.isAuthenticated) {
        try {
          const body = await request.clone().json();
          const governanceResult = rbacValidateGovernanceNote(permission, body);
          if (!governanceResult.valid) {
            return apiError(
              { code: 'GOVERNANCE_NOTE_REQUIRED', message: governanceResult.error ?? 'Governance note required' },
              400
            );
          }
        } catch {
          // If body parsing fails, skip governance check
          // (might be a GET request or non-JSON body)
        }
      }

      // ---- Step 5: Rate Limiting ----
      if (rateLimitCategory && effectiveAuth.isAuthenticated) {
        const rateResult = checkRateLimitForUser(
          effectiveAuth.userId,
          effectiveAuth.role,
          rateLimitCategory
        );

        if (!rateResult.allowed) {
          // Log rate limit exceeded
          await logSecurityEvent({
            tenantId: effectiveAuth.tenantId,
            userId: effectiveAuth.userId,
            eventType: SECURITY_EVENT_TYPES.RATE_LIMIT_EXCEEDED,
            severity: 'low',
            details: {
              category: rateLimitCategory,
              limit: rateResult.limit,
              resetAt: rateResult.resetAt,
              path: request.nextUrl.pathname,
            },
            ipAddress: extractIpAddress(request),
            userAgent: extractUserAgent(request),
          });

          return rateLimitError();
        }

        // Set rate limit headers on the response
        // (We'll apply these after the handler runs)
      }

      // ---- Step 6: Execute Handler ----
      const rbacCtx: RbacContext = { auth: effectiveAuth };
      let response = await handler(request, ctx, rbacCtx);

      // ---- Step 7: Filter Response Fields ----
      if (shouldFilterFields && effectiveAuth.isAuthenticated) {
        response = await applyFieldFiltering(response, effectiveAuth.role);
      }

      // ---- Step 8: Add Rate Limit Headers ----
      if (rateLimitCategory && effectiveAuth.isAuthenticated) {
        const rateStatus = checkRateLimit(
          effectiveAuth.userId,
          rateLimitCategory,
          effectiveAuth.role
        );
        response.headers.set('X-RateLimit-Limit', String(rateStatus.limit));
        response.headers.set('X-RateLimit-Remaining', String(rateStatus.remaining));
        response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateStatus.resetAt / 1000)));
      }

      return response;
    } catch (error) {
      // Handle AuthError thrown by requireAuth/requirePermission
      if (error instanceof AuthError) {
        if (error.statusCode === 401) {
          return unauthorizedError(error.message);
        }
        if (error.statusCode === 403) {
          return forbiddenError(error.message);
        }
        return apiError({ code: error.code, message: error.message }, error.statusCode);
      }

      // Unexpected errors
      console.error('[RBAC Middleware] Unexpected error:', error);
      return apiError(
        { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
        500
      );
    }
  };
}

// ============================================
// filterResponseFields()
// Strips restricted fields from API response data
// Based on FIELD_SECURITY config from rbac.ts
// Works on nested objects and arrays
// ============================================

export function filterResponseFields<T>(data: T, role: string): T {
  if (!data || !role) return data;

  const restrictedFields = FIELD_SECURITY[role as Role] ?? [];
  if (restrictedFields.length === 0) return data;

  return filterObject(data, restrictedFields) as T;
}

function filterObject(obj: unknown, restrictedFields: string[]): unknown {
  if (obj === null || obj === undefined) return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => filterObject(item, restrictedFields));
  }

  // Handle plain objects
  if (typeof obj === 'object' && obj.constructor === Object) {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (restrictedFields.includes(key)) {
        // Skip this field entirely
        continue;
      }
      // Recursively filter nested objects/arrays
      filtered[key] = filterObject(value, restrictedFields);
    }
    return filtered;
  }

  // Primitives pass through
  return obj;
}

// ============================================
// applyFieldFiltering()
// Intercepts a NextResponse and filters JSON body fields
// ============================================

async function applyFieldFiltering(
  response: NextResponse,
  role: string
): Promise<NextResponse> {
  try {
    const restrictedFields = FIELD_SECURITY[role as Role] ?? [];
    if (restrictedFields.length === 0) return response;

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) return response;

    // Clone and parse the response body
    const body = await response.json();

    // Filter the data field if it exists (standard API response format)
    if (body && typeof body === 'object') {
      if ('data' in body) {
        body.data = filterResponseFields(body.data, role);
      }
      // Also filter if body itself is the data (non-wrapped response)
      if (!('data' in body) && !('success' in body)) {
        const filtered = filterResponseFields(body, role);
        return new NextResponse(JSON.stringify(filtered), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
    }

    return new NextResponse(JSON.stringify(body), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch {
    // If we can't parse/filter the response, return it as-is
    return response;
  }
}

// ============================================
// validateGovernanceNote()
// Re-exported from rbac.ts for convenience
// Checks if governance_note is present and valid
// Required for: forecast.approve, forecast.update,
//   sop.advance, sop.override, sop.approve
// ============================================

export { rbacValidateGovernanceNote as validateGovernanceNote };

// ============================================
// checkRateLimitForUser()
// Rate limit check wrapper using rbac.ts checkRateLimit
// ============================================

export function checkRateLimitForUser(
  userId: string,
  role: string,
  category: string
): { allowed: boolean; remaining: number; limit: number; resetAt: number } {
  return checkRateLimit(userId, category, role);
}

// ============================================
// createSecurityEvent()
// Log security events (denied access, escalation attempts)
// Writes to both AuditLog (via security-event.ts) and SecurityEvent models
// ============================================

export async function createSecurityEvent(input: {
  tenantId: string;
  userId?: string;
  eventType: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  // Determine severity based on event type
  const severity = getSeverityForEventType(input.eventType);

  await logSecurityEvent({
    tenantId: input.tenantId,
    userId: input.userId,
    eventType: input.eventType,
    severity,
    details: input.details,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}

// ============================================
// Helper: Determine severity from event type
// ============================================

function getSeverityForEventType(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
  const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    [SECURITY_EVENT_TYPES.ACCESS_DENIED]: 'medium',
    [SECURITY_EVENT_TYPES.PERMISSION_ESCALATION_ATTEMPT]: 'critical',
    [SECURITY_EVENT_TYPES.RATE_LIMIT_EXCEEDED]: 'low',
    [SECURITY_EVENT_TYPES.CROSS_TENANT_ACCESS]: 'critical',
    [SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY]: 'high',
    [SECURITY_EVENT_TYPES.ROLE_CHANGE]: 'high',
    [SECURITY_EVENT_TYPES.SESSION_HIJACK_SUSPECT]: 'critical',
  };

  return severityMap[eventType] ?? 'medium';
}

// ============================================
// Helper: Extract IP address from request
// ============================================

function extractIpAddress(request: NextRequest): string {
  // Check common proxy headers first
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

// ============================================
// Helper: Extract User-Agent from request
// ============================================

function extractUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') ?? 'unknown';
}

// ============================================
// Convenience: withCrudRbac()
// Pre-configured RBAC middleware for CRUD routes
// Automatically maps HTTP methods to permissions
// ============================================

export interface CrudRbacOptions {
  /** Resource name (e.g., 'product', 'inventory') */
  resource: string;
  /** Allow demo access for read operations (default: false) */
  allowDemoRead?: boolean;
  /** Enable field filtering (default: true) */
  filterFields?: boolean;
  /** Rate limit category (default: 'api') */
  rateLimitCategory?: string;
}

const METHOD_PERMISSION_MAP: Record<string, string> = {
  GET: 'read',
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

export function withCrudRbac(
  options: CrudRbacOptions,
  handler: RbacHandler
): ApiRouteHandler {
  const { resource, allowDemoRead = false, filterFields = true, rateLimitCategory = 'api' } = options;

  return async (request, ctx) => {
    const method = request.method;
    const action = METHOD_PERMISSION_MAP[method] ?? 'read';
    const permission = `${resource}.${action}`;

    const rbacOptions: RbacOptions = {
      permission,
      allowDemo: method === 'GET' && allowDemoRead,
      filterFields,
      rateLimitCategory,
      requireGovernanceNote: isGovernanceRequired(resource, action),
    };

    const wrapped = withRbac(rbacOptions, handler);
    return wrapped(request, ctx);
  };
}

// ============================================
// Helper: Determine if governance note is required
// ============================================

function isGovernanceRequired(resource: string, action: string): boolean {
  const governanceRequired: Record<string, string[]> = {
    forecast: ['approve', 'update'],
    sop: ['advance', 'override', 'approve'],
  };

  return governanceRequired[resource]?.includes(action) ?? false;
}
