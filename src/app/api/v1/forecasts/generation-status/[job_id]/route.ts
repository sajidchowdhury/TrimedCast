// ============================================
// GET /api/v1/forecasts/generation-status/{job_id}
// Progress tracking for forecast generation
// ============================================

import { NextRequest } from 'next/server';
import { apiSuccess, notFoundError, apiError } from '@/lib/api/response';
import { getJob } from '@/lib/api/forecast-job-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ job_id: string }> }
) {
  try {
    const { job_id } = await params;
    const job = getJob(job_id);

    if (!job) {
      return notFoundError('Forecast job');
    }

    const elapsedMs = job.startedAt ? Date.now() - job.startedAt.getTime() : 0;
    const estimatedRemainingSeconds = job.status === 'processing' && job.progressPct > 0
      ? Math.round((elapsedMs / job.progressPct) * (100 - job.progressPct) / 1000)
      : job.status === 'queued' ? null : 0;

    return apiSuccess({
      job_id: job.jobId,
      status: job.status,
      progress_pct: job.progressPct,
      completed_products: job.completedProducts,
      total_products: job.totalProducts,
      current_product: job.currentProduct || null,
      started_at: job.startedAt,
      completed_at: job.completedAt,
      estimated_remaining_seconds: estimatedRemainingSeconds,
      error: job.error,
    });
  } catch (error) {
    console.error('[Forecasts/GenerationStatus]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get job status' }, 500);
  }
}
