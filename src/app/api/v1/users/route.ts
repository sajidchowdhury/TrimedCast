// ============================================
// GET /api/v1/users
// List team members (admin only)
// ============================================

import { db } from '@/lib/db';
import { apiSuccess, apiError, unauthorizedError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';

export async function GET() {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // Only admins can list team members
    if (context.role !== 'admin') {
      return apiError({ code: 'FORBIDDEN', message: 'Only admins can view team members' }, 403);
    }

    const users = await db.user.findMany({
      where: { tenantId: context.tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get tenant info for AC-ID
    const tenant = await db.tenant.findUnique({
      where: { id: context.tenantId },
      select: { acId: true, name: true, shopName: true },
    });

    return apiSuccess({
      ac_id: tenant?.acId,
      shop_name: tenant?.shopName || tenant?.name,
      members: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        is_active: u.isActive,
        last_login_at: u.lastLoginAt,
        created_at: u.createdAt,
      })),
      total: users.length,
      max_members: 5,
    });
  } catch (error) {
    console.error('[Users/List]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to list users' }, 500);
  }
}
