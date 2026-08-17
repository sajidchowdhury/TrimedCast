// ============================================
// GET /api/v1/sop-cycles/current
// Get current active S&OP cycle with stage
// statuses, progress percentages, and
// completion timestamps
// ============================================

import { db } from '@/lib/db';
import { apiSuccess, unauthorizedError, apiError } from '@/lib/api/response';
import { getAuthContext, tenantScope } from '@/lib/api/auth';
export const runtime = 'nodejs';


const STAGE_ORDER = ['validation', 'approval', 'operationalization', 'governance'] as const;
type SopStage = (typeof STAGE_ORDER)[number];

function getStageIndex(stage: string): number {
  return STAGE_ORDER.indexOf(stage as SopStage);
}

function getStageProgress(stage: string): number {
  // Each stage represents 25% of the overall lifecycle
  const idx = getStageIndex(stage);
  if (idx === -1) return 0;
  return (idx + 1) * 25;
}

export async function GET() {
  try {
    const context = await getAuthContext();

    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    const tenantId = context.tenantId;

    // Find the current active S&OP cycle for this tenant
    const activeCycle = await db.sopCycle.findFirst({
      where: {
        ...tenantScope(tenantId),
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeCycle) {
      return apiSuccess({
        active_cycle: null,
        message: 'No active S&OP cycle found for this tenant',
      });
    }

    // Calculate stage details
    const currentStageIndex = getStageIndex(activeCycle.stage);
    const overallProgress = getStageProgress(activeCycle.stage);

    // Build stage statuses with timestamps
    const stageStatuses = STAGE_ORDER.map((stage, idx) => {
      const isCompleted = idx < currentStageIndex;
      const isCurrent = idx === currentStageIndex;
      const isPending = idx > currentStageIndex;

      return {
        stage,
        status: isCompleted ? 'completed' : isCurrent ? 'in_progress' : 'pending',
        progress_pct: isCompleted ? 100 : isCurrent ? 50 : 0,
        order: idx + 1,
      };
    });

    // Count forecasts in the cycle period for validation progress
    const [totalForecasts, approvedForecasts] = await Promise.all([
      db.forecast.count({
        where: {
          ...tenantScope(tenantId),
          forecastDate: {
            gte: activeCycle.periodStart,
            lte: activeCycle.periodEnd,
          },
        },
      }),
      db.forecast.count({
        where: {
          ...tenantScope(tenantId),
          isRecalibrated: true,
          forecastDate: {
            gte: activeCycle.periodStart,
            lte: activeCycle.periodEnd,
          },
        },
      }),
    ]);

    // Validation stage progress based on approved forecasts
    if (currentStageIndex === 0 && totalForecasts > 0) {
      const validationProgress = Math.round((approvedForecasts / totalForecasts) * 100);
      stageStatuses[0].progress_pct = validationProgress;
    }

    // Count recommended orders for operationalization progress
    const [totalOrders, convertedOrders] = await Promise.all([
      db.recommendedOrder.count({
        where: {
          ...tenantScope(tenantId),
          orderDate: {
            gte: activeCycle.periodStart,
            lte: activeCycle.periodEnd,
          },
        },
      }),
      db.recommendedOrder.count({
        where: {
          ...tenantScope(tenantId),
          status: 'converted',
          orderDate: {
            gte: activeCycle.periodStart,
            lte: activeCycle.periodEnd,
          },
        },
      }),
    ]);

    // Operationalization stage progress based on converted orders
    if (currentStageIndex === 2 && totalOrders > 0) {
      const opsProgress = Math.round((convertedOrders / totalOrders) * 100);
      stageStatuses[2].progress_pct = opsProgress;
    }

    // Parse participants
    const participants = activeCycle.participants
      ? JSON.parse(activeCycle.participants)
      : [];

    return apiSuccess({
      id: activeCycle.id,
      name: activeCycle.name,
      period_start: activeCycle.periodStart,
      period_end: activeCycle.periodEnd,
      current_stage: activeCycle.stage,
      status: activeCycle.status,
      overall_progress_pct: overallProgress,
      stages: stageStatuses,
      validation: {
        total_forecasts: totalForecasts,
        approved_forecasts: approvedForecasts,
        pending_forecasts: totalForecasts - approvedForecasts,
      },
      operationalization: {
        total_orders: totalOrders,
        converted_orders: convertedOrders,
        pending_orders: totalOrders - convertedOrders,
      },
      participants,
      notes: activeCycle.notes,
      created_at: activeCycle.createdAt,
      updated_at: activeCycle.updatedAt,
    });
  } catch (error) {
    console.error('[SopCycles/Current/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch current S&OP cycle' }, 500);
  }
}
