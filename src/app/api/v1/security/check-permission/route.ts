// ============================================
// POST /api/v1/security/check-permission
// Check if the authenticated user has a specific permission
// Body: { permission: string } or { permissions: string[], mode: 'any' | 'all' }
// Response: { allowed: boolean, checked: string | string[], role: string, missing?: string[] }
// Falls back to warehouse_manager for demo mode
// ============================================

import { NextRequest } from 'next/server';
import { apiSuccess, apiError, internalError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { hasGranularPermission, isValidRole } from '@/lib/api/rbac';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const context = await getAuthContext();

    // Resolve role: from auth context, or fallback to warehouse_manager for demo
    let role: string;
    if (context.isAuthenticated) {
      role = context.role;
    } else {
      // Try to resolve from DB: find first active user
      const user = await db.user.findFirst({ where: { isActive: true } });
      role = user?.role ?? 'warehouse_manager';
    }

    // Validate role
    if (!isValidRole(role)) {
      return apiError(
        { code: 'INVALID_ROLE', message: `Role '${role}' is not a valid RBAC role` },
        400
      );
    }

    // Mode 1: Single permission check
    if (body.permission && typeof body.permission === 'string') {
      const allowed = hasGranularPermission(role, body.permission);
      return apiSuccess({
        allowed,
        checked: body.permission,
        role,
        ...(allowed ? {} : { missing: [body.permission] }),
      });
    }

    // Mode 2: Multiple permissions check
    if (body.permissions && Array.isArray(body.permissions)) {
      const mode = body.mode === 'all' ? 'all' : 'any';
      const checked = body.permissions as string[];

      const results = checked.map((p: string) => ({
        permission: p,
        allowed: hasGranularPermission(role, p),
      }));

      const allowedPermissions = results.filter((r) => r.allowed).map((r) => r.permission);
      const missingPermissions = results.filter((r) => !r.allowed).map((r) => r.permission);

      const allowed = mode === 'all'
        ? missingPermissions.length === 0
        : allowedPermissions.length > 0;

      return apiSuccess({
        allowed,
        checked,
        mode,
        role,
        ...(missingPermissions.length > 0 ? { missing: missingPermissions } : {}),
      });
    }

    // Invalid request: neither permission nor permissions provided
    return apiError(
      { code: 'VALIDATION_ERROR', message: 'Provide either "permission" (string) or "permissions" (string[]) in the request body' },
      400
    );
  } catch (error) {
    console.error('[Security/CheckPermission]', error);
    return internalError('Failed to check permission');
  }
}
