// ============================================
// GET /api/v1/admin/system/health
// System health check — all components
// Session 16: Scaling + Production Hardening
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  forbiddenError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { getFullSystemHealth, getProductionConfig } from '@/lib/api/health-check';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required for system health');
    }

    const [health, config] = await Promise.all([
      getFullSystemHealth(),
      Promise.resolve(getProductionConfig()),
    ]);

    return apiSuccess({
      health,
      productionConfig: config,
    });
  } catch (error) {
    console.error('[Admin/System/Health/GET]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to check system health' },
      500
    );
  }
}
