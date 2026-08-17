// ============================================
// GET /api/v1/security/audit-summary
// Returns a summary of audit activity for the tenant
// RBAC: warehouse_manager, executive, or finance
// Falls back to first tenant for demo access
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, forbiddenError, internalError } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const url = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // If authenticated, check RBAC
    if (context.isAuthenticated) {
      const allowedRoles = ['warehouse_manager', 'executive', 'finance'];
      if (!allowedRoles.includes(context.role)) {
        return forbiddenError('Only warehouse_manager, executive, or finance can view audit summary');
      }
    }

    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    const auditLogs = await db.auditLog.findMany({
      where: { tenantId, createdAt: { gte: since } },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const totalActions = auditLogs.length;

    const byActionType: Record<string, number> = {};
    for (const log of auditLogs) {
      byActionType[log.action] = (byActionType[log.action] || 0) + 1;
    }

    const byEntity: Record<string, number> = {};
    for (const log of auditLogs) {
      byEntity[log.entity] = (byEntity[log.entity] || 0) + 1;
    }

    const userActionCounts: Record<string, { name: string; email: string; role: string; count: number }> = {};
    for (const log of auditLogs) {
      const userId = log.userId || 'system';
      if (!userActionCounts[userId]) {
        userActionCounts[userId] = {
          name: log.user?.name ?? 'System',
          email: log.user?.email ?? 'system',
          role: log.user?.role ?? 'system',
          count: 0,
        };
      }
      userActionCounts[userId].count++;
    }
    const topUsers = Object.entries(userActionCounts)
      .map(([userId, data]) => ({ user_id: userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const criticalActions = ['create', 'delete', 'approve', 'reject'];
    const recentCriticalActions = auditLogs
      .filter((log) => criticalActions.includes(log.action))
      .slice(0, 20)
      .map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entity_id: log.entityId,
        user: log.user ? { name: log.user.name, role: log.user.role } : null,
        created_at: log.createdAt,
      }));

    return apiSuccess({
      period_days: days,
      since: since.toISOString(),
      total_actions: totalActions,
      by_action_type: byActionType,
      by_entity: byEntity,
      top_users: topUsers,
      recent_critical_actions: recentCriticalActions,
    });
  } catch (error) {
    console.error('[Security/AuditSummary]', error);
    return internalError('Failed to fetch audit summary');
  }
}
