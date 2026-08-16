// ============================================
// POST /api/v1/auth/login
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api/response';
import { generateToken, hasPermission } from '@/lib/api/auth';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  warehouse_manager: ['products.crud', 'inventory.crud', 'forecasts.approve', 'settings.crud'],
  sales_manager: ['products.read', 'inventory.read', 'sales_orders.crud'],
  marketing_manager: ['products.read', 'forecasts.generate', 'promo_events.crud'],
  finance: ['products.read', 'purchase_orders.read', 'audit_log.read'],
  executive: ['products.read', 'forecasts.approve', 'sop_cycles.crud', 'audit_log.read'],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError([
        ...(!email ? [{ code: 'VALIDATION_ERROR' as const, message: 'email is required', field: 'email' }] : []),
        ...(!password ? [{ code: 'VALIDATION_ERROR' as const, message: 'password is required', field: 'password' }] : []),
      ], 400);
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      return apiError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' }, 401);
    }

    if (!user.tenant.isActive) {
      return apiError({ code: 'FORBIDDEN', message: 'Tenant account is deactivated' }, 403);
    }

    // In production, verify password hash. For demo, accept any password for existing users.
    // const valid = await bcrypt.compare(password, user.passwordHash);
    // if (!valid) return unauthorizedError();

    // Generate token
    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });

    const permissions = ROLE_PERMISSIONS[user.role] || [];

    return apiSuccess({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant_id: user.tenantId,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        plan: user.tenant.plan,
      },
      permissions,
    });
  } catch (error) {
    console.error('[Auth/Login]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Login failed' }, 500);
  }
}
