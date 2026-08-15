// ============================================
// GET /api/v1/security/permissions
// Returns the authenticated user's permissions,
// restricted fields, and role capabilities
// Supports ?role= query param for demo/testing
// ============================================

import { NextRequest } from 'next/server';
import { apiSuccess, unauthorizedError, internalError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { db } from '@/lib/db';
import {
  getRoleHierarchy,
  getRolePermissions,
  canViewFinancials,
  canViewSupplierContracts,
  canApproveForecasts,
  isReadOnlyRole,
  isOperationalRole,
  getRestrictedFields,
  isValidRole,
} from '@/lib/api/rbac';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();

    // Resolve role: from auth context, or from ?role= query param (for demo),
    // or fallback to warehouse_manager if no auth
    const url = new URL(request.url);
    const roleParam = url.searchParams.get('role');

    let role: string;

    if (context.isAuthenticated) {
      role = context.role;
    } else if (roleParam && isValidRole(roleParam)) {
      role = roleParam;
    } else {
      // Try to resolve from DB: find first active user
      const user = await db.user.findFirst({ where: { isActive: true } });
      role = user?.role ?? 'warehouse_manager';
    }

    const permissions = getRolePermissions(role);
    const restrictedFields = getRestrictedFields(role);

    return apiSuccess({
      role,
      hierarchy_level: getRoleHierarchy(role),
      permissions,
      restricted_fields: restrictedFields,
      can_view_financials: canViewFinancials(role),
      can_view_supplier_contracts: canViewSupplierContracts(role),
      can_approve_forecasts: canApproveForecasts(role),
      is_read_only: isReadOnlyRole(role),
      is_operational: isOperationalRole(role),
      authenticated: context.isAuthenticated,
    });
  } catch (error) {
    console.error('[Security/Permissions]', error);
    return internalError('Failed to fetch permissions');
  }
}
