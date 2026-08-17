// ============================================
// GET /api/v1/rate-limit
// Rate limit status for current tenant
// Session 16: Scaling + Production Hardening
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import {
  getTenantRateLimitStatus,
  isFeatureAvailable,
  getAllTierRateLimits,
  type TenantRateLimitCategory,
} from '@/lib/api/tenant-rate-limit';
import { db } from '@/lib/db';
export const runtime = 'nodejs';


const CATEGORIES: TenantRateLimitCategory[] = ['api', 'forecast', 'ai', 'import'];

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // Get tenant's tier
    const tenant = await db.tenant.findUnique({
      where: { id: context.tenantId },
      select: { plan: true },
    });

    const tier = (tenant?.plan || 'starter') as 'starter' | 'professional' | 'enterprise';

    const url = request.nextUrl;
    const mode = url.searchParams.get('mode') || 'status';

    // Tier info mode — show all tier limits
    if (mode === 'tiers') {
      return apiSuccess({
        currentTier: tier,
        allTierLimits: getAllTierRateLimits(),
        featureAvailability: {
          api: isFeatureAvailable(tier, 'api'),
          forecast: isFeatureAvailable(tier, 'forecast'),
          ai: isFeatureAvailable(tier, 'ai'),
          import: isFeatureAvailable(tier, 'import'),
        },
      });
    }

    // Status mode — current usage
    const status = getTenantRateLimitStatus(context.tenantId, tier);
    return apiSuccess(status);
  } catch (error) {
    console.error('[RateLimit/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get rate limit status' }, 500);
  }
}
