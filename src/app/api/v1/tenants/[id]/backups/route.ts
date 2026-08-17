// ============================================
// GET /api/v1/tenants/[id]/backups
// Tenant backup management
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
import { createTenantBackup, getTenantBackups, getBackupStatus } from '@/lib/api/data-export';
import { db } from '@/lib/db';
export const runtime = 'nodejs';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const { id: tenantId } = await params;
    if (context.tenantId !== tenantId && context.role !== 'executive') {
      return forbiddenError('Cannot access backups from another tenant');
    }

    const backups = await getTenantBackups(tenantId, 20);
    return apiSuccess(backups);
  } catch (error) {
    console.error('[Tenants/Backups/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get backups' }, 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const { id: tenantId } = await params;
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required to create backups');
    }

    // Check tenant exists and is enterprise
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return notFoundError('Tenant');
    }

    if (tenant.plan !== 'enterprise') {
      return apiError(
        { code: 'TIER_REQUIRED', message: 'Per-tenant backups require Enterprise tier' },
        403
      );
    }

    const result = await createTenantBackup(tenantId, context.userId);
    return apiSuccess(result, 201);
  } catch (error) {
    console.error('[Tenants/Backups/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create backup' }, 500);
  }
}
