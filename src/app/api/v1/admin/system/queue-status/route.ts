// ============================================
// GET /api/v1/admin/system/queue-status
// Job queue monitoring dashboard
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
import {
  getAllQueueStats,
  getSystemLoad,
  getFailedJobs,
} from '@/lib/api/job-queue';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required for queue monitoring');
    }

    const [queueStats, systemLoad, failedJobs] = [
      getAllQueueStats(),
      getSystemLoad(),
      getFailedJobs(),
    ];

    return apiSuccess({
      queues: queueStats,
      systemLoad,
      recentFailures: failedJobs.slice(0, 20).map((j) => ({
        id: j.id,
        queue: j.queue,
        type: j.type,
        tenantId: j.tenantId,
        error: j.error,
        attempts: j.attempts,
        createdAt: new Date(j.createdAt).toISOString(),
      })),
    });
  } catch (error) {
    console.error('[Admin/System/QueueStatus/GET]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to get queue status' },
      500
    );
  }
}
