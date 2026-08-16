// ============================================
// GET /api/v1/admin/security/events
// Security events listing + summary
// Session 16: Scaling + Production Hardening
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiPaginated,
  apiError,
  unauthorizedError,
  forbiddenError,
  parsePagination,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import {
  getSecurityEvents,
  getSecuritySummary,
  getUnresolvedAlerts,
  SecurityEventFilters,
} from '@/lib/api/security-audit';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required for security events');
    }

    const url = request.nextUrl;
    const mode = url.searchParams.get('mode') || 'list';

    // Summary mode
    if (mode === 'summary') {
      const days = parseInt(url.searchParams.get('days') || '30', 10);
      const summary = await getSecuritySummary(days);
      return apiSuccess(summary);
    }

    // Alerts mode — unresolved high/critical
    if (mode === 'alerts') {
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const alerts = await getUnresolvedAlerts(limit);
      return apiSuccess(alerts);
    }

    // List mode — paginated
    const { page, perPage, skip, take } = parsePagination(url);
    const filters: SecurityEventFilters = {
      skip,
      take,
    };

    const type = url.searchParams.get('type');
    const severity = url.searchParams.get('severity');
    const resolved = url.searchParams.get('resolved');
    const tenantId = url.searchParams.get('tenantId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (type) filters.type = type as SecurityEventFilters['type'];
    if (severity) filters.severity = severity as SecurityEventFilters['severity'];
    if (resolved !== null) filters.resolved = resolved === 'true';
    if (tenantId) filters.tenantId = tenantId;
    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);

    const result = await getSecurityEvents(filters);
    return apiPaginated(result.events, page, perPage, result.total);
  } catch (error) {
    console.error('[Admin/Security/Events/GET]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch security events' },
      500
    );
  }
}
