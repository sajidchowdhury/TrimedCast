// ============================================
// POST /api/v1/seasonality-types/bulk-toggle
// Bulk activate/deactivate seasonality types
// RBAC: forecast_settings.update (forecast_settings.crud)
// Cannot change isDefault types
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiError,
  forbiddenError,
  unauthorizedError,
  validationError,
} from '@/lib/api/response';
import { getAuthContext, canDo } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    const tenantId = context.tenantId;

    // RBAC: forecast_settings.crud
    if (!canDo(context, 'forecast_settings.crud')) {
      return forbiddenError();
    }

    const body = await request.json();
    const { ids, isActive } = body;

    // --- Validation ---
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return validationError('ids', 'ids must be a non-empty array of seasonality type IDs');
    }

    if (typeof isActive !== 'boolean') {
      return validationError('isActive', 'isActive must be a boolean');
    }

    // Fetch all matching types for tenant
    const types = await db.seasonalityType.findMany({
      where: {
        id: { in: ids },
        tenantId,
      },
    });

    if (types.length === 0) {
      return validationError('ids', 'No matching seasonality types found for this tenant');
    }

    // Filter out isDefault types — they cannot be toggled
    const toggleable = types.filter((t) => !t.isDefault);
    const skipped = types.filter((t) => t.isDefault);

    if (toggleable.length === 0) {
      return forbiddenError(
        'Cannot toggle default seasonality types. All provided IDs are default types.'
      );
    }

    // Bulk update
    const toggleableIds = toggleable.map((t) => t.id);
    const result = await db.seasonalityType.updateMany({
      where: {
        id: { in: toggleableIds },
        tenantId,
      },
      data: {
        isActive,
      },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'seasonality_type',
      changes: {
        after: {
          action: 'bulk_toggle',
          ids: toggleableIds,
          isActive,
          count: result.count,
        },
      },
      metadata: {
        skippedDefaultIds: skipped.map((s) => s.id),
        skippedCount: skipped.length,
      },
    });

    return apiSuccess({
      toggled: result.count,
      is_active: isActive,
      skipped_default: skipped.length,
      skipped_ids: skipped.map((s) => ({ id: s.id, name: s.name })),
    });
  } catch (error) {
    console.error('[SeasonalityTypes/bulk-toggle/POST]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to bulk toggle seasonality types' },
      500
    );
  }
}
