// ============================================
// GET /api/v1/auth/me
// ============================================

import { db } from '@/lib/db';
import { apiSuccess, unauthorizedError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  warehouse_manager: ['products.crud', 'inventory.crud', 'forecasts.approve', 'settings.crud'],
  sales_manager: ['products.read', 'inventory.read', 'sales_orders.crud'],
  marketing_manager: ['products.read', 'forecasts.generate', 'promo_events.crud'],
  finance: ['products.read', 'purchase_orders.read', 'audit_log.read'],
  executive: ['products.read', 'forecasts.approve', 'sop_cycles.crud', 'audit_log.read'],
};

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

    const permissions = ROLE_PERMISSIONS[user.role] || [];

    return apiSuccess({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.isActive,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        plan: user.tenant.plan,
        isActive: user.tenant.isActive,
      },
      permissions,
    });
  } catch (error) {
    console.error('[Auth/Me]', error);
    return unauthorizedError();
  }
}
