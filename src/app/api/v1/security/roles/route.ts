// ============================================
// GET /api/v1/security/roles
// Returns all 5 roles with their hierarchy,
// permissions, and restricted fields
// RBAC: warehouse_manager or executive only
// Falls back to showing roles for demo access
// ============================================

import { apiSuccess, forbiddenError, internalError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { getAllRoles, getRoleInfo } from '@/lib/api/rbac';

export async function GET() {
  try {
    const context = await getAuthContext();

    // If authenticated, check RBAC
    if (context.isAuthenticated) {
      const allowedRoles = ['warehouse_manager', 'executive'];
      if (!allowedRoles.includes(context.role)) {
        return forbiddenError('Only warehouse_manager or executive can view all roles');
      }
    }

    // If not authenticated, allow for demo purposes (security model reference)
    const roles = getAllRoles().map((role) => getRoleInfo(role));

    return apiSuccess({
      roles,
      total: roles.length,
    });
  } catch (error) {
    console.error('[Security/Roles]', error);
    return internalError('Failed to fetch roles');
  }
}
