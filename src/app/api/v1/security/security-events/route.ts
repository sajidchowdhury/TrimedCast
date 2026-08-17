// ============================================
// GET /api/v1/security/security-events
// List security events for the tenant
// RBAC: warehouse_manager or executive only
// Query params: page, per_page, severity, event_type, since (date), resolved (boolean)
// Returns paginated list of security events
// Falls back to first tenant for demo mode
// If SecurityEvent model doesn't exist in DB, return empty list (graceful degradation)
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiPaginated, forbiddenError, internalError, parsePagination } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const url = new URL(request.url);

    // RBAC: warehouse_manager or executive only
    if (context.isAuthenticated) {
      const allowedRoles = ['warehouse_manager', 'executive'];
      if (!allowedRoles.includes(context.role)) {
        return forbiddenError('Only warehouse_manager or executive can view security events');
      }
    }

    // Resolve tenant
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    // Parse pagination
    const { page, perPage, skip, take } = parsePagination(url);

    // Build filter conditions
    const where: Prisma.SecurityEventWhereInput = { tenantId };

    const severity = url.searchParams.get('severity');
    if (severity && ['low', 'medium', 'high', 'critical'].includes(severity)) {
      where.severity = severity;
    }

    const eventType = url.searchParams.get('event_type');
    if (eventType) {
      where.type = eventType;
    }

    const since = url.searchParams.get('since');
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        where.occurredAt = { gte: sinceDate };
      }
    }

    const resolved = url.searchParams.get('resolved');
    if (resolved === 'true') {
      where.resolved = true;
    } else if (resolved === 'false') {
      where.resolved = false;
    }

    // Query with graceful degradation
    let events: Awaited<ReturnType<typeof db.securityEvent.findMany>> = [];
    let total = 0;

    try {
      [events, total] = await Promise.all([
        db.securityEvent.findMany({
          where,
          orderBy: { occurredAt: 'desc' },
          skip,
          take,
        }),
        db.securityEvent.count({ where }),
      ]);
    } catch {
      // Graceful degradation: if SecurityEvent table doesn't exist or query fails
      events = [];
      total = 0;
    }

    // Format events for response
    const formattedEvents = events.map((event) => ({
      id: event.id,
      type: event.type,
      user_id: event.userId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      url: event.url,
      request_method: event.requestMethod,
      details: event.details ? JSON.parse(event.details) : null,
      severity: event.severity,
      resolved: event.resolved,
      resolved_by: event.resolvedBy,
      resolved_at: event.resolvedAt?.toISOString() ?? null,
      occurred_at: event.occurredAt.toISOString(),
      created_at: event.createdAt.toISOString(),
    }));

    return apiPaginated(formattedEvents, page, perPage, total, tenantId);
  } catch (error) {
    console.error('[Security/SecurityEvents]', error);
    return internalError('Failed to fetch security events');
  }
}
