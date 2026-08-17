// ============================================
// POST /api/v1/admin/tenants/[id]/impersonate
// Super-admin impersonation for support
// Session 16: Scaling + Production Hardening
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { logAdminImpersonation } from '@/lib/api/security-audit';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required for impersonation');
    }

    const { id: tenantId } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.length < 10) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'Reason must be at least 10 characters' },
        400
      );
    }

    // Find the tenant
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { isActive: true }, take: 1 } },
    });

    if (!tenant) {
      return notFoundError('Tenant');
    }

    // Get tenant admin to impersonate
    const tenantAdmin = tenant.users[0];
    if (!tenantAdmin) {
      return apiError(
        { code: 'NO_ADMIN', message: 'No active user found in tenant' },
        404
      );
    }

    // Log impersonation as security event
    await logAdminImpersonation({
      userId: context.userId,
      tenantId: context.tenantId,
      targetTenantId: tenantId,
      details: { reason, targetUserName: tenantAdmin.name, targetUserEmail: tenantAdmin.email },
    });

    // Create audit log
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'create',
      entity: 'impersonation_session',
      entityId: tenantId,
      metadata: {
        targetTenantId: tenantId,
        targetTenantName: tenant.name,
        reason,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    });

    return apiSuccess({
      message: 'Impersonation session started. Expires in 1 hour.',
      targetTenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      impersonatedUser: {
        id: tenantAdmin.id,
        name: tenantAdmin.name,
        email: tenantAdmin.email,
        role: tenantAdmin.role,
      },
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
  } catch (error) {
    console.error('[Admin/Tenants/Impersonate/POST]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to start impersonation' },
      500
    );
  }
}
