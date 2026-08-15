// ============================================
// POST /api/v1/forecasts/generate
// Dispatches forecast generation job
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiAccepted, apiError, forbiddenError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createJob, processJob } from '@/lib/api/forecast-job-manager';
import { createAuditLog } from '@/lib/api/audit';

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'forecasts.generate') && !canDo(context, 'forecasts.crud')) {
      return forbiddenError();
    }

    const body = await request.json();
    const { season, product_ids, method_override } = body;

    if (!season) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'season is required', field: 'season' }, 400);
    }

    const validSeasons = ['winter', 'summer', 'monsoon', 'pre_winter'];
    if (!validSeasons.includes(season)) {
      return apiError({ code: 'VALIDATION_ERROR', message: `season must be one of: ${validSeasons.join(', ')}`, field: 'season' }, 400);
    }

    // Determine products to forecast
    let targetProductIds = product_ids;
    if (!targetProductIds || targetProductIds.length === 0) {
      // Forecast ALL active products
      const allProducts = await db.product.findMany({
        where: { tenantId, isActive: true },
        select: { id: true },
      });
      targetProductIds = allProducts.map((p) => p.id);
    }

    if (targetProductIds.length === 0) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'No active products found to forecast' }, 400);
    }

    const method = method_override || 'prophet';
    const jobId = `fj-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Create job
    createJob(jobId, tenantId, season, method, targetProductIds, targetProductIds.length);

    // Process asynchronously (don't await - let it run in background)
    processJob(jobId).catch((err) => {
      console.error('[ForecastJob] Background processing error:', err);
    });

    // Estimate completion time
    const estimatedSeconds = Math.ceil(targetProductIds.length * 0.5);

    await createAuditLog({
      tenantId,
      userId: context.userId || undefined,
      action: 'create',
      entity: 'forecast_job',
      entityId: jobId,
      metadata: { season, method, productCount: targetProductIds.length },
    });

    return apiAccepted({
      job_id: jobId,
      status: 'queued',
      total_products: targetProductIds.length,
      estimated_completion_seconds: estimatedSeconds,
    });
  } catch (error) {
    console.error('[Forecasts/Generate]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to start forecast generation' }, 500);
  }
}
