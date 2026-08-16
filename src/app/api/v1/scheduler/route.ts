// ============================================
// GET /api/v1/scheduler
// Scheduler status and control
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
  getSchedulerStatus,
  getScheduledJobs,
  pauseJob,
  resumeJob,
  startScheduler,
  stopScheduler,
} from '@/lib/api/scheduler';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required for scheduler control');
    }

    const [status, jobs] = [getSchedulerStatus(), getScheduledJobs()];

    return apiSuccess({
      status,
      jobs: jobs.map((j) => ({
        name: j.name,
        interval: j.interval,
        type: j.type,
        handler: j.handler,
        queue: j.queue,
        tenantId: j.tenantId,
        enabled: j.enabled,
      })),
    });
  } catch (error) {
    console.error('[Scheduler/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get scheduler status' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required for scheduler control');
    }

    const body = await request.json();
    const { action } = body; // 'start' | 'stop' | 'pause' | 'resume'

    switch (action) {
      case 'start':
        startScheduler();
        return apiSuccess({ message: 'Scheduler started' });
      case 'stop':
        stopScheduler();
        return apiSuccess({ message: 'Scheduler stopped' });
      case 'pause': {
        const { jobName } = body;
        if (!jobName) return apiError({ code: 'VALIDATION_ERROR', message: 'jobName required' }, 400);
        await pauseJob(jobName);
        return apiSuccess({ message: `Job "${jobName}" paused` });
      }
      case 'resume': {
        const { jobName } = body;
        if (!jobName) return apiError({ code: 'VALIDATION_ERROR', message: 'jobName required' }, 400);
        await resumeJob(jobName);
        return apiSuccess({ message: `Job "${jobName}" resumed` });
      }
      default:
        return apiError(
          { code: 'INVALID_ACTION', message: 'Action must be start, stop, pause, or resume' },
          400
        );
    }
  } catch (error) {
    console.error('[Scheduler/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to control scheduler' }, 500);
  }
}
