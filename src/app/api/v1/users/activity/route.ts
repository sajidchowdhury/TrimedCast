// ============================================
// GET /api/v1/users/activity
// User activity/audit log
// Admin sees all tenant activity, others see their own
// Paginated, ordered by most recent
// Filters: entity, action, user_id, date_from, date_to
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiPaginated,
  apiError,
  unauthorizedError,
  parsePagination,
} from '@/lib/api/response';
import { getAuthContext, canDo } from '@/lib/api/auth';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const { searchParams } = new URL(request.url);
    const { page, perPage, skip, take } = parsePagination(request.url);

    // Admin sees all tenant activity, others see their own
    const isAdmin = canDo(context, 'audit_log.read');

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: context.tenantId,
    };

    // Non-admins can only see their own activity
    if (!isAdmin) {
      where.userId = context.userId;
    }

    // Filters
    const entity = searchParams.get('entity');
    if (entity) where.entity = entity;

    const action = searchParams.get('action');
    if (action) where.action = action;

    const userId = searchParams.get('user_id');
    if (userId && isAdmin) where.userId = userId;

    // Date range filter
    const createdAt: Record<string, Date> = {};
    const dateFrom = searchParams.get('date_from');
    if (dateFrom) createdAt.gte = new Date(dateFrom);

    const dateTo = searchParams.get('date_to');
    if (dateTo) createdAt.lte = new Date(dateTo);

    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }

    // Count total
    const total = await db.auditLog.count({ where });

    // Fetch activity
    const activity = await db.auditLog.findMany({
      where,
      select: {
        id: true,
        userId: true,
        action: true,
        entity: true,
        entityId: true,
        changes: true,
        metadata: true,
        ipAddress: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return apiPaginated(
      activity.map(a => ({
        id: a.id,
        user_id: a.userId,
        user_name: a.user?.name,
        user_email: a.user?.email,
        action: a.action,
        entity: a.entity,
        entity_id: a.entityId,
        changes: a.changes ? JSON.parse(a.changes) : null,
        metadata: a.metadata ? JSON.parse(a.metadata) : null,
        ip_address: a.ipAddress,
        created_at: a.createdAt,
      })),
      page,
      perPage,
      total,
      context.tenantId
    );
  } catch (error) {
    console.error('[Users/Activity/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch activity log' }, 500);
  }
}
