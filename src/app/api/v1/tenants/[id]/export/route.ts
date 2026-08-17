// ============================================
// GET /api/v1/tenants/[id]/export
// Tenant data export (GDPR / Data Portability)
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
import { exportTenantData, canExport, getExportTablesList } from '@/lib/api/data-export';
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

    // Verify tenant access (must be same tenant or executive)
    if (context.tenantId !== tenantId && context.role !== 'executive') {
      return forbiddenError('Cannot export data from another tenant');
    }

    const url = request.nextUrl;
    const mode = url.searchParams.get('mode') || 'export';

    // Tables list mode
    if (mode === 'tables') {
      return apiSuccess({ tables: getExportTablesList() });
    }

    // Rate limit check
    const rateLimitCheck = canExport(tenantId);
    if (!rateLimitCheck.allowed) {
      return apiError(
        {
          code: 'RATE_LIMITED',
          message: 'Export rate limited. Maximum 1 export per hour per tenant.',
          details: { nextAllowedAt: new Date(rateLimitCheck.nextAllowedAt).toISOString() },
        },
        429
      );
    }

    // Get tenant and verify exists
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return notFoundError('Tenant');
    }

    // Parse options
    const format = (url.searchParams.get('format') || 'json') as 'json' | 'csv';
    const tablesParam = url.searchParams.get('tables');
    const tables = tablesParam ? tablesParam.split(',') : undefined;

    // Perform export
    const result = await exportTenantData({
      tenantId,
      userId: context.userId,
      tables,
      format,
    });

    return apiSuccess(result);
  } catch (error) {
    console.error('[Tenants/Export/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to export tenant data' }, 500);
  }
}
