// ============================================
// PUT /api/v1/forecasts/{id}/approve
// S&OP approval gate
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, notFoundError, forbiddenError, apiError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    // Only warehouse_manager and executive can approve
    if (context.isAuthenticated && !canDo(context, 'forecasts.approve')) {
      return forbiddenError();
    }

    const forecast = await db.forecast.findFirst({ where: { id, tenantId } });
    if (!forecast) return notFoundError('Forecast');

    const body = await request.json();
    const { governance_note } = body;

    if (!governance_note) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'governance_note is required when approving a forecast', field: 'governance_note' }, 400);
    }

    // Mark forecast as recalibrated (approved/locked)
    const updated = await db.forecast.update({
      where: { id },
      data: {
        isRecalibrated: true,
      },
    });

    // Check if all forecasts in the active SOP cycle are approved
    // If so, auto-advance the SOP cycle stage
    const activeCycle = await db.sopCycle.findFirst({
      where: { tenantId, status: 'active' },
    });

    if (activeCycle && activeCycle.stage === 'validation') {
      // Count remaining unapproved forecasts for this cycle period
      const unapprovedCount = await db.forecast.count({
        where: {
          tenantId,
          isRecalibrated: false,
          forecastDate: {
            gte: activeCycle.periodStart,
            lte: activeCycle.periodEnd,
          },
        },
      });

      if (unapprovedCount === 0) {
        // All forecasts approved — advance SOP cycle to approval stage
        await db.sopCycle.update({
          where: { id: activeCycle.id },
          data: { stage: 'approval', notes: governance_note },
        });
      }
    }

    await createAuditLog({
      tenantId,
      userId: context.userId || undefined,
      action: 'approve',
      entity: 'forecast',
      entityId: id,
      metadata: { governance_note, mape: forecast.mape },
    });

    return apiSuccess({
      id: updated.id,
      is_approved: true,
      governance_note,
      message: 'Forecast approved and locked',
    });
  } catch (error) {
    console.error('[Forecasts/[id]/Approve]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to approve forecast' }, 500);
  }
}
