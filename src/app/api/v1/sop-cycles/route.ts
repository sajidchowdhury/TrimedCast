// ============================================
// POST /api/v1/sop-cycles
// Create new S&OP cycle
// RBAC: warehouse_manager, executive
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiCreated,
  apiError,
  unauthorizedError,
  forbiddenError,
  validationError,
} from '@/lib/api/response';
import { getAuthContext, canDo, tenantScope } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();

    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    // RBAC: only warehouse_manager and executive can create S&OP cycles
    if (!canDo(context, 'sop_cycles.crud')) {
      return forbiddenError('Only warehouse_manager and executive roles can create S&OP cycles');
    }

    const tenantId = context.tenantId;
    const body = await request.json();

    // --- Validation ---
    const { cycle_name, rhythm, period_start, period_end, participants, notes } = body;

    if (!cycle_name || typeof cycle_name !== 'string' || cycle_name.trim().length === 0) {
      return validationError('cycle_name', 'cycle_name is required and must be a non-empty string');
    }

    if (!period_start) {
      return validationError('period_start', 'period_start is required (ISO date string)');
    }

    if (!period_end) {
      return validationError('period_end', 'period_end is required (ISO date string)');
    }

    const parsedStart = new Date(period_start);
    const parsedEnd = new Date(period_end);

    if (isNaN(parsedStart.getTime())) {
      return validationError('period_start', 'period_start must be a valid ISO date string');
    }

    if (isNaN(parsedEnd.getTime())) {
      return validationError('period_end', 'period_end must be a valid ISO date string');
    }

    if (parsedEnd <= parsedStart) {
      return validationError('period_end', 'period_end must be after period_start');
    }

    // Validate rhythm if provided
    const validRhythms = ['monthly', 'quarterly', 'biannual', 'annual'];
    if (rhythm && !validRhythms.includes(rhythm)) {
      return validationError('rhythm', `rhythm must be one of: ${validRhythms.join(', ')}`);
    }

    // Check if there's already an active cycle for this tenant
    const existingActive = await db.sopCycle.findFirst({
      where: {
        ...tenantScope(tenantId),
        status: 'active',
      },
    });

    if (existingActive) {
      return apiError(
        {
          code: 'CONFLICT',
          message: `An active S&OP cycle already exists: "${existingActive.name}". Archive it before creating a new one.`,
          field: 'status',
        },
        409
      );
    }

    // Serialize participants if provided
    const participantsJson = participants ? JSON.stringify(participants) : null;

    // --- Create the S&OP cycle ---
    const cycle = await db.sopCycle.create({
      data: {
        tenantId,
        name: cycle_name.trim(),
        periodStart: parsedStart,
        periodEnd: parsedEnd,
        stage: 'validation',
        status: 'active',
        participants: participantsJson,
        notes: notes || (rhythm ? `Rhythm: ${rhythm}` : null),
      },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: context.userId,
      action: 'create',
      entity: 'sop_cycle',
      entityId: cycle.id,
      metadata: {
        cycle_name: cycle.name,
        period_start,
        period_end,
        rhythm: rhythm || 'quarterly',
      },
    });

    return apiCreated({
      id: cycle.id,
      name: cycle.name,
      period_start: cycle.periodStart,
      period_end: cycle.periodEnd,
      stage: cycle.stage,
      status: cycle.status,
      participants: participants || [],
      notes: cycle.notes,
      created_at: cycle.createdAt,
    }, {
      message: 'S&OP cycle created successfully. Starting at validation stage.',
    });
  } catch (error) {
    console.error('[SopCycles/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create S&OP cycle' }, 500);
  }
}
