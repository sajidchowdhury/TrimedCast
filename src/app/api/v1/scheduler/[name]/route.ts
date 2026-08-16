// ============================================
// GET/POST /api/v1/scheduler/[name]
// Individual scheduled job detail and control
// Session 16: Scaling + Production Hardening
// ============================================

import { NextRequest } from 'next/server';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from '@/lib/api/response';
import { getAuthContext } from '@/lib/api/auth';
import {
  getScheduledJobs,
  pauseJob,
  resumeJob,
} from '@/lib/api/scheduler';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required');
    }

    const { name } = await params;
    const jobs = getScheduledJobs();
    const jobDef = jobs.find((j) => j.name === name);

    if (!jobDef) {
      return notFoundError('Scheduled job');
    }

    // Get DB record for status info
    const dbJob = await db.scheduledJob.findFirst({
      where: { name },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess({
      definition: {
        name: jobDef.name,
        interval: jobDef.interval,
        type: jobDef.type,
        handler: jobDef.handler,
        queue: jobDef.queue,
        tenantId: jobDef.tenantId,
        enabled: jobDef.enabled,
      },
      dbRecord: dbJob ? {
        id: dbJob.id,
        status: dbJob.status,
        lastRunAt: dbJob.lastRunAt?.toISOString(),
        nextRunAt: dbJob.nextRunAt?.toISOString(),
        failCount: dbJob.failCount,
        lastError: dbJob.lastError,
        metadata: dbJob.metadata,
      } : null,
    });
  } catch (error) {
    console.error('[Scheduler/Name/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get job detail' }, 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    if (context.role !== 'executive') {
      return forbiddenError('Executive role required');
    }

    const { name } = await params;
    const body = await request.json();
    const { action } = body; // 'pause' | 'resume'

    if (action === 'pause') {
      await pauseJob(name);
      return apiSuccess({ message: `Job "${name}" paused` });
    }

    if (action === 'resume') {
      await resumeJob(name);
      return apiSuccess({ message: `Job "${name}" resumed` });
    }

    return apiError(
      { code: 'INVALID_ACTION', message: 'Action must be "pause" or "resume"' },
      400
    );
  } catch (error) {
    console.error('[Scheduler/Name/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to control job' }, 500);
  }
}
