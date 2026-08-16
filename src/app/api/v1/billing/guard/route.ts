// ============================================
// POST /api/v1/billing/guard
// Check subscription tier guard (for any feature)
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  validationError,
  unauthorizedError,
  internalError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { checkSubscriptionTierGuard } from '@/lib/api/billing';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // 2. Validate input
    const body = await request.json();
    const { feature, action } = body as { feature?: string; action?: string };

    if (!feature) {
      return validationError('feature', 'Feature name is required');
    }

    // 3. Check subscription tier guard
    const guardResult = await checkSubscriptionTierGuard({
      tenantId: context.tenantId,
      feature,
      action,
    });

    // 4. Return guard result
    return apiSuccess({
      allowed: guardResult.allowed,
      tier: guardResult.tier,
      subscription_status: guardResult.subscriptionStatus,
      reason: guardResult.reason || null,
      upgrade_to: guardResult.upgradeTo || null,
      usage_exceeded: guardResult.usageExceeded || false,
    });
  } catch (error) {
    console.error('[Billing/Guard]', error);
    return internalError('Failed to check subscription tier guard');
  }
}
