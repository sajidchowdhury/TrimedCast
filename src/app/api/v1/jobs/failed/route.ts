// ============================================
// GET /api/v1/jobs/failed
// List failed jobs with retry option
// Session 16: Scaling + Production Hardening
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import { getFailedJobs, retryFailedJob, type QueueName } from '@/lib/api/job-queue';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const queue = request.nextUrl.searchParams.get('queue') as QueueName | null;
    const failedJobs = getFailedJobs(queue || undefined);

    return apiSuccess(
      failedJobs.map((j) => ({
        id: j.id,
        queue: j.queue,
        type: j.type,
        priority: j.priority,
        tenantId: j.tenantId,
        error: j.error,
        attempts: j.attempts,
        maxAttempts: j.maxAttempts,
        createdAt: new Date(j.createdAt).toISOString(),
        updatedAt: new Date(j.updatedAt).toISOString(),
      }))
    );
  } catch (error) {
    console.error('[Jobs/Failed/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get failed jobs' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return apiError(
        { code: 'VALIDATION_ERROR', message: 'jobId is required' },
        400
      );
    }

    const retried = retryFailedJob(jobId);
    if (!retried) {
      return apiError(
        { code: 'RETRY_FAILED', message: 'Job not found or not in failed state' },
        404
      );
    }

    return apiSuccess({ message: 'Job queued for retry', jobId });
  } catch (error) {
    console.error('[Jobs/Failed/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to retry job' }, 500);
  }
}
