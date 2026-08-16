// ============================================
// GET /api/v1/billing/portal
// Get billing portal configuration (all data needed for billing UI)
// ============================================

import {
  apiSuccess,
  unauthorizedError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { getBillingPortalConfig } from '@/lib/api/billing';

export async function GET() {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Get billing portal config
    const portalConfig = await getBillingPortalConfig(context.tenantId);

    // 3. Return full portal config
    return apiSuccess(portalConfig);
  } catch (error) {
    console.error('[Billing/Portal/GET]', error);
    return internalError('Failed to fetch billing portal configuration');
  }
}
