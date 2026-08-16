// ============================================
// POST /api/v1/auth/login
// Login with AC-ID + email + password
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api/response';
import { createAuthSession, hasPermission } from '@/lib/api/auth';
import { verifyPassword } from '@/lib/auth/password';
import { resolveTenantByAcId, isValidAcId } from '@/lib/auth/ac-id';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['products.crud', 'inventory.crud', 'forecasts.approve', 'settings.crud', 'billing.manage', 'team.manage'],
  warehouse_manager: ['products.crud', 'inventory.crud', 'forecasts.approve', 'settings.crud'],
  sales_manager: ['products.read', 'inventory.read', 'sales_orders.crud'],
  marketing_manager: ['products.read', 'forecasts.generate', 'promo_events.crud'],
  finance: ['products.read', 'purchase_orders.read', 'audit_log.read'],
  executive: ['products.read', 'forecasts.approve', 'sop_cycles.crud', 'audit_log.read'],
  viewer: ['products.read', 'inventory.read', 'forecasts.read'],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ac_id, email, password } = body;

    // Validate required fields
    const errors: { code: string; message: string; field: string }[] = [];
    if (!ac_id) errors.push({ code: 'VALIDATION_ERROR', message: 'AC-ID is required', field: 'ac_id' });
    if (!email) errors.push({ code: 'VALIDATION_ERROR', message: 'Email is required', field: 'email' });
    if (!password) errors.push({ code: 'VALIDATION_ERROR', message: 'Password is required', field: 'password' });

    if (ac_id && !isValidAcId(ac_id)) {
      errors.push({ code: 'VALIDATION_ERROR', message: 'Invalid AC-ID format (e.g., TC-2025-DHK-0001)', field: 'ac_id' });
    }

    if (errors.length > 0) {
      return apiError(errors, 400);
    }

    // Resolve tenant by AC-ID
    const tenantId = await resolveTenantByAcId(ac_id);
    if (!tenantId) {
      return apiError({ code: 'UNAUTHORIZED', message: 'Invalid AC-ID. No account found.' }, 401);
    }

    // Find user within this tenant
    const user = await db.user.findFirst({
      where: {
        email,
        tenantId,
        isActive: true,
      },
      include: { tenant: true },
    });

    if (!user) {
      return apiError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' }, 401);
    }

    if (!user.tenant.isActive) {
      return apiError({ code: 'FORBIDDEN', message: 'Account is deactivated. Contact support.' }, 403);
    }

    // Verify password with bcrypt
    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return apiError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' }, 401);
    }

    // Create DB-backed session
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    const token = await createAuthSession(user.id, user.tenantId, ipAddress, userAgent);

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const permissions = ROLE_PERMISSIONS[user.role] || [];

    return apiSuccess({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        tenant_id: user.tenantId,
      },
      tenant: {
        id: user.tenant.id,
        ac_id: user.tenant.acId,
        name: user.tenant.name,
        shop_name: user.tenant.shopName,
        plan: user.tenant.plan,
        division: user.tenant.division,
      },
      permissions,
    });
  } catch (error) {
    console.error('[Auth/Login]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Login failed' }, 500);
  }
}
