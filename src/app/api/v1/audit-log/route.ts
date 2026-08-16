// ============================================
// GET /api/v1/audit-log - List audit entries (paginated, filtered)
// RBAC: warehouse_manager, executive, finance (read-only)
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiPaginated, apiError, forbiddenError, unauthorizedError, parsePagination } from '@/lib/api/response';
import { getAuthContext, canDo } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    const tenantId = context.tenantId;

    // RBAC: warehouse_manager, executive, finance have audit_log.read
    if (!canDo(context, 'audit_log.read')) {
      return forbiddenError();
    }

    const url = new URL(request.url);
    const { page, perPage, skip, take } = parsePagination(url);

    // Filters
    const entityType = url.searchParams.get('entity_type');
    const entityId = url.searchParams.get('entity_id');
    const userId = url.searchParams.get('user_id');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const action = url.searchParams.get('action');

    const where: Record<string, unknown> = {
      tenantId,
      ...(entityType ? { entity: entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(userId ? { userId } : {}),
      ...(action ? { action } : {}),
      ...(dateFrom || dateTo ? {
        createdAt: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        },
      } : {}),
    };

    const [auditLogs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.auditLog.count({ where }),
    ]);

    // Parse JSON changes field before returning
    const data = auditLogs.map((log) => ({
      id: log.id,
      user_id: log.userId,
      user: log.user,
      action: log.action,
      entity: log.entity,
      entity_id: log.entityId,
      changes: log.changes ? JSON.parse(log.changes) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      ip_address: log.ipAddress,
      created_at: log.createdAt,
    }));

    return apiPaginated(data, page, perPage, total, tenantId);
  } catch (error) {
    console.error('[AuditLog/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch audit log' }, 500);
  }
}
