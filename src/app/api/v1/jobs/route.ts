// ============================================
// GET/POST /api/v1/jobs
// Job queue monitoring — list jobs, enqueue new
// Session 16: Scaling + Production Hardening
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  forbiddenError,
  parsePagination,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import {
  getAllQueueStats,
  getJobHistory,
  getSystemLoad,
  enqueue,
  type QueueName,
  type JobPriority,
} from '@/lib/api/job-queue';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const url = request.nextUrl;
    const mode = url.searchParams.get('mode') || 'stats';

    // Stats mode — queue statistics
    if (mode === 'stats') {
      const queueStats = getAllQueueStats();
      const systemLoad = getSystemLoad();
      return apiSuccess({ queues: queueStats, systemLoad });
    }

    // History mode — recent jobs
    if (mode === 'history') {
      const queue = url.searchParams.get('queue') as QueueName | null;
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const history = getJobHistory(queue || undefined, limit);
      return apiSuccess(history.map((j) => ({
        id: j.id,
        queue: j.queue,
        type: j.type,
        priority: j.priority,
        status: j.status,
        progress: j.progress,
        tenantId: j.tenantId,
        attempts: j.attempts,
        error: j.error,
        createdAt: new Date(j.createdAt).toISOString(),
        startedAt: j.startedAt ? new Date(j.startedAt).toISOString() : null,
        completedAt: j.completedAt ? new Date(j.completedAt).toISOString() : null,
      })));
    }

    return apiError({ code: 'INVALID_MODE', message: 'Mode must be "stats" or "history"' }, 400);
  } catch (error) {
    console.error('[Jobs/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get job info' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const body = await request.json();
    const { queue, type, priority, payload, tenantId } = body;

    if (!queue || !type) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'queue and type are required' },
        400
      );
    }

    const jobId = enqueue({
      queue: queue as QueueName,
      type,
      priority: (priority || 'normal') as JobPriority,
      tenantId: tenantId || context.tenantId,
      userId: context.userId,
      payload: payload || {},
    });

    return apiSuccess({ jobId, message: 'Job enqueued successfully' }, 201);
  } catch (error) {
    console.error('[Jobs/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to enqueue job' }, 500);
  }
}
