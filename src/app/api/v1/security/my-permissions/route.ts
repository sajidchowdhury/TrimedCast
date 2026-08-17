// ============================================
// GET /api/v1/security/my-permissions
// Returns the authenticated user's full RBAC profile
// Includes: role, permissions, restricted_fields, role_info, rate_limit_status
// This is the comprehensive endpoint for the RBAC store to sync from
// Falls back to first active user for demo mode
// Uses: getRoleInfo(), getRateLimitStatus() from rbac.ts
// ============================================

import { apiSuccess, internalError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { getRoleInfo, getRateLimitStatus, isValidRole } from '@/lib/api/rbac';

export async function GET() {
  try {
    const context = await getAuthContext();

    let userId: string;
    let role: string;
    let tenantId: string | undefined;

    if (context.isAuthenticated) {
      userId = context.userId;
      role = context.role;
      tenantId = context.tenantId;
    } else {
      // Fallback: find first active user for demo mode
      const user = await db.user.findFirst({
        where: { isActive: true },
        select: { id: true, role: true, tenantId: true },
      });
      userId = user?.id ?? 'demo-user';
      role = user?.role ?? 'warehouse_manager';
      tenantId = user?.tenantId ?? undefined;
    }

    // Validate role
    if (!isValidRole(role)) {
      role = 'warehouse_manager';
    }

    // Get comprehensive role info
    const roleInfo = getRoleInfo(role);

    // Get rate limit status
    const rateLimitStatus = getRateLimitStatus(userId, role);

    return apiSuccess({
      user_id: userId,
      tenant_id: tenantId,
      authenticated: context.isAuthenticated,
      role: roleInfo.key,
      permissions: roleInfo.permissions,
      restricted_fields: roleInfo.restricted_fields,
      role_info: {
        label: roleInfo.label,
        description: roleInfo.description,
        hierarchy_level: roleInfo.hierarchy_level,
        can_view_financials: roleInfo.can_view_financials,
        can_view_supplier_contracts: roleInfo.can_view_supplier_contracts,
        can_approve_forecasts: roleInfo.can_approve_forecasts,
        is_read_only: roleInfo.is_read_only,
        is_operational: roleInfo.is_operational,
      },
      rate_limits: roleInfo.rate_limits,
      rate_limit_status: rateLimitStatus,
    });
  } catch (error) {
    console.error('[Security/MyPermissions]', error);
    return internalError('Failed to fetch user permissions');
  }
}
