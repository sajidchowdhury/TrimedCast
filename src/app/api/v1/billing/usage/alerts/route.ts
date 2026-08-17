// ============================================
// GET /api/v1/billing/usage/alerts
// Get usage alerts (approaching or exceeding limits)
// ============================================

import { db } from '@/lib/db';
import {
  apiSuccess,
  unauthorizedError,
  notFoundError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { getUsageAlerts } from '@/lib/api/billing';
export const runtime = 'nodejs';


export async function GET() {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Get tenant plan
    const tenant = await db.tenant.findUnique({
      where: { id: context.tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      return notFoundError('Tenant');
    }

    // 3. Get usage alerts
    const alerts = await getUsageAlerts(context.tenantId, tenant.plan);

    // 4. Return alerts array
    return apiSuccess({
      alerts,
      total: alerts.length,
      has_warnings: alerts.some((a) => a.severity === 'warning'),
      has_critical: alerts.some((a) => a.severity === 'critical'),
      has_exceeded: alerts.some((a) => a.severity === 'exceeded'),
    });
  } catch (error) {
    console.error('[Billing/Usage/Alerts]', error);
    return internalError('Failed to fetch usage alerts');
  }
}
