// ============================================
// GET/DELETE /api/v1/jobs/[id]
// Job detail, cancel job
// Session 16: Scaling + Production Hardening
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  notFoundError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import {
  getJob,
  cancelJob,
  updateProgress,
  completeJob,
  failJob,
} from '@/lib/api/job-queue';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const { id } = await params;
    const job = getJob(id);

    if (!job) {
      return notFoundError('Job');
    }

    return apiSuccess({
      id: job.id,
      queue: job.queue,
      type: job.type,
      priority: job.priority,
      status: job.status,
      progress: job.progress,
      tenantId: job.tenantId,
      userId: job.userId,
      payload: job.payload,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      timeout: job.timeout,
      result: job.result,
      error: job.error,
      createdAt: new Date(job.createdAt).toISOString(),
      updatedAt: new Date(job.updatedAt).toISOString(),
      startedAt: job.startedAt ? new Date(job.startedAt).toISOString() : null,
      completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : null,
    });
  } catch (error) {
    console.error('[Jobs/Id/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get job' }, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const { id } = await params;
    const job = getJob(id);

    if (!job) {
      return notFoundError('Job');
    }

    const cancelled = cancelJob(id);
    if (!cancelled) {
      return apiError(
        { code: 'CANNOT_CANCEL', message: 'Job cannot be cancelled in its current state' },
        409
      );
    }

    return apiSuccess({ message: 'Job cancelled', jobId: id });
  } catch (error) {
    console.error('[Jobs/Id/DELETE]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to cancel job' }, 500);
  }
}
