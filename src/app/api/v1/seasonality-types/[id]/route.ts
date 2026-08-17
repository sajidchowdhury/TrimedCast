// ============================================
// GET /api/v1/seasonality-types/{id} - Get single seasonality type
// PUT /api/v1/seasonality-types/{id} - Update seasonality type
// DELETE /api/v1/seasonality-types/{id} - Delete seasonality type
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiError,
  notFoundError,
  forbiddenError,
  unauthorizedError,
  validationError,
} from '@/lib/api/response';
import { getAuthContext, canDo } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

export const runtime = 'nodejs';

// --- Helper: parse months JSON string to number array ---
function parseMonths(monthsJson: string): number[] {
  try {
    const parsed = JSON.parse(monthsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// --- Helper: format seasonality type for API response ---
function formatSeasonalityType(st: {
  id: string;
  tenantId: string;
  name: string;
  label: string;
  labelBn: string | null;
  description: string | null;
  multiplier: number;
  months: string;
  color: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: st.id,
    tenant_id: st.tenantId,
    name: st.name,
    label: st.label,
    label_bn: st.labelBn,
    description: st.description,
    multiplier: st.multiplier,
    months: parseMonths(st.months),
    color: st.color,
    is_active: st.isActive,
    is_default: st.isDefault,
    created_at: st.createdAt,
    updated_at: st.updatedAt,
  };
}

// ============================================
// GET - Single seasonality type by ID, tenant-scoped
// RBAC: forecast_settings.read
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    const tenantId = context.tenantId;

    // RBAC: forecast_settings.read or forecast_settings.crud
    const canRead =
      canDo(context, 'forecast_settings.read') ||
      canDo(context, 'forecast_settings.crud');
    if (!canRead) {
      return forbiddenError();
    }

    const seasonalityType = await db.seasonalityType.findFirst({
      where: { id, tenantId },
    });

    if (!seasonalityType) {
      return notFoundError('SeasonalityType');
    }

    return apiSuccess(formatSeasonalityType(seasonalityType));
  } catch (error) {
    console.error('[SeasonalityTypes/[id]/GET]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch seasonality type' },
      500
    );
  }
}

// ============================================
// PUT - Update seasonality type
// RBAC: forecast_settings.update (forecast_settings.crud)
// Cannot change name of isDefault=true
// ============================================
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
    const tenantId = context.tenantId;

    // RBAC: forecast_settings.crud
    if (!canDo(context, 'forecast_settings.crud')) {
      return forbiddenError();
    }

    const existing = await db.seasonalityType.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return notFoundError('SeasonalityType');
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // --- Validate name ---
    if (body.name !== undefined) {
      // Cannot change name of isDefault=true
      if (existing.isDefault) {
        return forbiddenError(
          'Cannot change the name of a default seasonality type'
        );
      }
      if (!/^[a-z][a-z0-9_]*$/.test(body.name)) {
        return validationError(
          'name',
          'name must be snake_case (lowercase letters, numbers, underscores, starting with a letter)'
        );
      }
      // Check uniqueness if name is changing
      if (body.name !== existing.name) {
        const nameConflict = await db.seasonalityType.findUnique({
          where: { tenantId_name: { tenantId, name: body.name } },
        });
        if (nameConflict) {
          return apiError(
            {
              code: 'CONFLICT',
              message: `Seasonality type with name "${body.name}" already exists`,
            },
            409
          );
        }
      }
      updates.name = body.name;
    }

    // --- Validate multiplier ---
    if (body.multiplier !== undefined) {
      if (
        typeof body.multiplier !== 'number' ||
        body.multiplier < 0.1 ||
        body.multiplier > 5.0
      ) {
        return validationError(
          'multiplier',
          'multiplier must be a number between 0.1 and 5.0'
        );
      }
      updates.multiplier = body.multiplier;
    }

    // --- Validate months ---
    if (body.months !== undefined) {
      if (!Array.isArray(body.months) || body.months.length === 0) {
        return validationError(
          'months',
          'months must be a non-empty array of month numbers (1-12)'
        );
      }
      const invalidMonths = body.months.filter(
        (m: number) => !Number.isInteger(m) || m < 1 || m > 12
      );
      if (invalidMonths.length > 0) {
        return validationError(
          'months',
          `Invalid month values: [${invalidMonths.join(', ')}]. Each month must be an integer 1-12`
        );
      }
      updates.months = JSON.stringify(body.months);
    }

    // --- Validate color ---
    if (body.color !== undefined) {
      if (body.color && !/^#[0-9a-fA-F]{6}$/.test(body.color)) {
        return validationError(
          'color',
          'color must be a 6-digit hex code (e.g. #ef4444)'
        );
      }
      updates.color = body.color || null;
    }

    // --- Simple string/boolean fields ---
    if (body.label !== undefined) updates.label = body.label;
    if (body.labelBn !== undefined) updates.labelBn = body.labelBn || null;
    if (body.description !== undefined)
      updates.description = body.description || null;
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        return validationError('is_active', 'is_active must be a boolean');
      }
      updates.isActive = body.isActive;
    }

    if (Object.keys(updates).length === 0) {
      return validationError(
        'fields',
        'At least one field must be provided for update'
      );
    }

    // Capture before state for audit
    const before = formatSeasonalityType(existing);

    const updated = await db.seasonalityType.update({
      where: { id },
      data: updates,
    });

    await createAuditLog({
      tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'seasonality_type',
      entityId: id,
      changes: { before, after: updates },
    });

    return apiSuccess(formatSeasonalityType(updated));
  } catch (error) {
    console.error('[SeasonalityTypes/[id]/PUT]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to update seasonality type' },
      500
    );
  }
}

// ============================================
// DELETE - Delete seasonality type
// RBAC: forecast_settings.delete (forecast_settings.crud)
// Cannot delete isDefault=true (403)
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    const tenantId = context.tenantId;

    // RBAC: forecast_settings.crud
    if (!canDo(context, 'forecast_settings.crud')) {
      return forbiddenError();
    }

    const existing = await db.seasonalityType.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return notFoundError('SeasonalityType');
    }

    // Cannot delete default types
    if (existing.isDefault) {
      return forbiddenError(
        'Cannot delete a default seasonality type. Deactivate it instead.'
      );
    }

    await db.seasonalityType.delete({
      where: { id },
    });

    await createAuditLog({
      tenantId,
      userId: context.userId,
      action: 'delete',
      entity: 'seasonality_type',
      entityId: id,
      changes: {
        before: {
          name: existing.name,
          label: existing.label,
          multiplier: existing.multiplier,
        },
      },
    });

    return apiSuccess({ message: 'Seasonality type deleted', id });
  } catch (error) {
    console.error('[SeasonalityTypes/[id]/DELETE]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to delete seasonality type' },
      500
    );
  }
}
