// ============================================
// GET /api/v1/security/rate-limit-status
// Returns current rate limit usage for the
// authenticated user
// Falls back to warehouse_manager for demo
// ============================================

import { NextRequest } from 'next/server';
import { apiSuccess, internalError } from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { getRateLimitStatus, ROLE_RATE_LIMITS } from '@/lib/api/rbac';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const url = new URL(request.url);
    const roleParam = url.searchParams.get('role');

    const userId = context.isAuthenticated ? context.userId : 'demo-user';
    const role = context.isAuthenticated ? context.role : (roleParam || 'warehouse_manager');

    const status = getRateLimitStatus(userId, role);
    const limits = ROLE_RATE_LIMITS[role as keyof typeof ROLE_RATE_LIMITS] ?? {};

    return apiSuccess({
      role,
      rate_limits: limits,
      usage: status,
      window_seconds: 60,
    });
  } catch (error) {
    console.error('[Security/RateLimitStatus]', error);
    return internalError('Failed to fetch rate limit status');
  }
}
