// ============================================
// GET /api/v1/auth/me
// Get current authenticated user info
// ============================================

import { db } from '@/lib/db';
import { apiSuccess, unauthorizedError } from '@/lib/api/response';
import { getAuthContext, hasPermission } from '@/lib/api/auth';
export const runtime = 'nodejs';


export async function GET() {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const user = await db.user.findUnique({
      where: { id: context.userId },
      include: { tenant: true },
    });

    if (!user) {
      return unauthorizedError();
    }

    // Get all permissions for this role
    const allPermissions: string[] = [];
    const permissionChecks = [
      'products.crud', 'products.read', 'inventory.crud', 'inventory.read',
      'suppliers.crud', 'suppliers.read', 'forecasts.crud', 'forecasts.read',
      'forecasts.approve', 'forecasts.generate', 'settings.crud', 'settings.read',
      'imports.crud', 'users.manage', 'billing.manage', 'team.manage',
      'audit_log.read', 'sop_cycles.crud', 'promo_events.crud',
    ];
    for (const perm of permissionChecks) {
      if (hasPermission(user.role, perm)) {
        allPermissions.push(perm);
      }
    }

    return apiSuccess({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        is_active: user.isActive,
        last_login_at: user.lastLoginAt,
      },
      tenant: {
        id: user.tenant.id,
        ac_id: user.tenant.acId,
        name: user.tenant.name,
        shop_name: user.tenant.shopName,
        slug: user.tenant.slug,
        plan: user.tenant.plan,
        division: user.tenant.division,
        status: user.tenant.status,
        is_active: user.tenant.isActive,
        trial_ends_at: user.tenant.trialEndsAt,
      },
      permissions: allPermissions,
    });
  } catch (error) {
    console.error('[Auth/Me]', error);
    return unauthorizedError();
  }
}
