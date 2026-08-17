// ============================================
// PUT /api/v1/sop-cycles/{id}/advance-stage
// Advance S&OP stage sequentially
// RBAC: warehouse_manager, executive
// governance_note required when advancing
// past validation stage
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  validationError,
} from '@/lib/api/response';
import { getAuthContext, canDo, tenantScope } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


const STAGE_ORDER = ['validation', 'approval', 'operationalization', 'governance'] as const;
type SopStage = (typeof STAGE_ORDER)[number];

function getStageIndex(stage: string): number {
  return STAGE_ORDER.indexOf(stage as SopStage);
}

function getNextStage(currentStage: string): SopStage | null {
  const idx = getStageIndex(currentStage);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();

    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // RBAC: only warehouse_manager and executive can advance S&OP stages
    if (!canDo(context, 'sop_cycles.crud')) {
      return forbiddenError('Only warehouse_manager and executive roles can advance S&OP stages');
    }

    const tenantId = context.tenantId;

    // Find the S&OP cycle
    const cycle = await db.sopCycle.findFirst({
      where: {
        id,
        ...tenantScope(tenantId),
      },
    });

    if (!cycle) {
      return notFoundError('S&OP Cycle');
    }

    // Cycle must be active to advance
    if (cycle.status !== 'active') {
      return apiError(
        {
          code: 'INVALID_STATE',
          message: `Cannot advance stage: cycle status is "${cycle.status}", expected "active"`,
        },
        400
      );
    }

    const body = await request.json();
    const { stage, governance_note } = body;

    // Validate target stage
    if (!stage) {
      return validationError('stage', 'Target stage is required');
    }

    const validStages = STAGE_ORDER as readonly string[];
    if (!validStages.includes(stage)) {
      return validationError('stage', `Invalid stage. Must be one of: ${validStages.join(', ')}`);
    }

    // Must advance sequentially — can't skip stages
    const currentIdx = getStageIndex(cycle.stage);
    const targetIdx = getStageIndex(stage);

    if (targetIdx !== currentIdx + 1) {
      if (targetIdx <= currentIdx) {
        return apiError(
          {
            code: 'INVALID_TRANSITION',
            message: `Cannot advance to "${stage}": already at or past this stage (current: "${cycle.stage}")`,
            field: 'stage',
          },
          400
        );
      }
      return apiError(
        {
          code: 'INVALID_TRANSITION',
          message: `Cannot skip stages. Current stage is "${cycle.stage}", next stage is "${getNextStage(cycle.stage)}". Requested "${stage}" would skip ${targetIdx - currentIdx - 1} stage(s).`,
          field: 'stage',
        },
        400
      );
    }

    // governance_note is required when advancing past validation stage
    if (currentIdx >= 0 && !governance_note) {
      // Advancing from validation → approval or any later stage requires governance_note
      return validationError(
        'governance_note',
        `governance_note is required when advancing past the validation stage (advancing from "${cycle.stage}" to "${stage}")`
      );
    }

    // Stage-specific validation before advancing
    if (cycle.stage === 'validation') {
      // Check that all forecasts have been approved before advancing to approval
      const unapprovedCount = await db.forecast.count({
        where: {
          ...tenantScope(tenantId),
          isRecalibrated: false,
          forecastDate: {
            gte: cycle.periodStart,
            lte: cycle.periodEnd,
          },
        },
      });

      if (unapprovedCount > 0) {
        return apiError(
          {
            code: 'STAGE_PREREQUISITE_NOT_MET',
            message: `Cannot advance to approval: ${unapprovedCount} forecast(s) still unapproved in this cycle period`,
          },
          400
        );
      }
    }

    if (cycle.stage === 'approval') {
      // At approval stage, governance_note must document the approval decision
      if (!governance_note || governance_note.trim().length === 0) {
        return validationError(
          'governance_note',
          'A governance note documenting the approval decision is required to advance to operationalization'
        );
      }
    }

    // --- Advance the stage ---
    const updateData: Record<string, unknown> = {
      stage,
    };

    // Append governance note to existing notes
    const existingNotes = cycle.notes || '';
    const newNote = `[${new Date().toISOString()}] Stage advanced: ${cycle.stage} → ${stage}${governance_note ? ` | Note: ${governance_note}` : ''}`;
    updateData.notes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;

    // If advancing to governance (final stage), mark cycle as completed
    if (stage === 'governance') {
      updateData.status = 'completed';
    }

    const updated = await db.sopCycle.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'sop_cycle',
      entityId: id,
      changes: {
        before: { stage: cycle.stage, status: cycle.status },
        after: { stage: updated.stage, status: updated.status },
      },
      metadata: {
        action: 'advance_stage',
        from_stage: cycle.stage,
        to_stage: stage,
        governance_note,
      },
    });

    return apiSuccess({
      id: updated.id,
      name: updated.name,
      previous_stage: cycle.stage,
      current_stage: updated.stage,
      status: updated.status,
      governance_note,
      stage_progress: {
        validation: getStageIndex(updated.stage) >= 0 ? 'completed' : 'pending',
        approval: getStageIndex(updated.stage) >= 1 ? 'completed' : 'pending',
        operationalization: getStageIndex(updated.stage) >= 2 ? 'completed' : 'pending',
        governance: getStageIndex(updated.stage) >= 3 ? 'completed' : 'pending',
      },
      overall_progress_pct: (getStageIndex(updated.stage) + 1) * 25,
      notes: updated.notes,
      updated_at: updated.updatedAt,
    }, undefined, stage === 'governance' ? 200 : 200);
  } catch (error) {
    console.error('[SopCycles/[id]/AdvanceStage/PUT]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to advance S&OP stage' }, 500);
  }
}
