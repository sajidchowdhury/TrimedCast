// ============================================
// GET /api/v1/billing/admin/revenue
// Get detailed revenue metrics for SaaS admin dashboard
// Requires auth with executive role (audit_log.read permission)
// ============================================

import {
  apiSuccess,
  unauthorizedError,
  forbiddenError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext, canDo } from '@/lib/api/auth';
import { getDetailedRevenueMetrics } from '@/lib/api/billing';

export async function GET() {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Role check — requires executive-level access
    if (!canDo(context, 'audit_log.read')) {
      return forbiddenError('Executive access required to view revenue metrics');
    }

    // 3. Get detailed revenue metrics
    const metrics = await getDetailedRevenueMetrics();

    // 4. Return full revenue metrics
    return apiSuccess(metrics);
  } catch (error) {
    console.error('[Billing/Admin/Revenue]', error);
    return internalError('Failed to fetch revenue metrics');
  }
}
