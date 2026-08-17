// ============================================
// GET /api/v1/seasonality-types - List all for tenant
// POST /api/v1/seasonality-types - Create seasonality type
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiSuccess,
  apiCreated,
  apiError,
  forbiddenError,
  unauthorizedError,
  validationError,
  conflictError,
} from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
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
// GET - List all seasonality types for tenant
// RBAC: forecast_settings.read
// Query: active_only, search
// ============================================
export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();

    // Resolve tenant: fallback to first tenant for demo
    let tenantId: string;
    if (context.isAuthenticated) {
      tenantId = context.tenantId;
    } else {
      tenantId = await resolveTenant();
    }

    // RBAC: forecast_settings.read or forecast_settings.crud
    if (context.isAuthenticated) {
      const canRead =
        canDo(context, 'forecast_settings.read') ||
        canDo(context, 'forecast_settings.crud');
      if (!canRead) {
        return forbiddenError();
      }
    }

    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('active_only') === 'true';
    const search = url.searchParams.get('search')?.trim();

    const where: Record<string, unknown> = {
      tenantId,
      ...(activeOnly ? { isActive: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { label: { contains: search } },
              { labelBn: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    };

    const seasonalityTypes = await db.seasonalityType.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    const data = seasonalityTypes.map(formatSeasonalityType);

    return apiSuccess(data);
  } catch (error) {
    console.error('[SeasonalityTypes/GET]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch seasonality types' },
      500
    );
  }
}

// ============================================
// POST - Create seasonality type
// RBAC: forecast_settings.create (forecast_settings.crud)
// ============================================
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
    const {
      name,
      label,
      labelBn,
      description,
      multiplier,
      months,
      color,
      isActive,
    } = body;

    // --- Validation ---
    if (!label && !name) {
      return validationError(
        'label',
        'label is required (name will be auto-generated from label if omitted)'
      );
    }

    // Auto-name from label if omitted
    const resolvedName =
      name ||
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

    if (!resolvedName) {
      return validationError('name', 'name could not be derived from label');
    }

    // Validate name format (snake_case)
    if (!/^[a-z][a-z0-9_]*$/.test(resolvedName)) {
      return validationError(
        'name',
        'name must be snake_case (lowercase letters, numbers, underscores, starting with a letter)'
      );
    }

    // Check name uniqueness within tenant
    const existing = await db.seasonalityType.findUnique({
      where: { tenantId_name: { tenantId, name: resolvedName } },
    });
    if (existing) {
      return conflictError(
        `Seasonality type with name "${resolvedName}" already exists`
      );
    }

    // Validate multiplier
    if (multiplier === undefined || multiplier === null) {
      return validationError('multiplier', 'multiplier is required');
    }
    if (typeof multiplier !== 'number' || multiplier < 0.1 || multiplier > 5.0) {
      return validationError(
        'multiplier',
        'multiplier must be a number between 0.1 and 5.0'
      );
    }

    // Validate months
    if (!months || !Array.isArray(months) || months.length === 0) {
      return validationError(
        'months',
        'months is required and must be a non-empty array of month numbers (1-12)'
      );
    }
    const invalidMonths = months.filter(
      (m: number) => !Number.isInteger(m) || m < 1 || m > 12
    );
    if (invalidMonths.length > 0) {
      return validationError(
        'months',
        `Invalid month values: [${invalidMonths.join(', ')}]. Each month must be an integer 1-12`
      );
    }

    // Validate color (hex format) if provided
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return validationError('color', 'color must be a 6-digit hex code (e.g. #ef4444)');
    }

    const seasonalityType = await db.seasonalityType.create({
      data: {
        tenantId,
        name: resolvedName,
        label: label || resolvedName,
        labelBn: labelBn || null,
        description: description || null,
        multiplier,
        months: JSON.stringify(months),
        color: color || null,
        isActive: isActive !== undefined ? isActive : true,
        isDefault: false,
      },
    });

    await createAuditLog({
      tenantId,
      userId: context.userId,
      action: 'create',
      entity: 'seasonality_type',
      entityId: seasonalityType.id,
      changes: { after: body },
    });

    return apiCreated(formatSeasonalityType(seasonalityType));
  } catch (error) {
    console.error('[SeasonalityTypes/POST]', error);
    return apiError(
      { code: 'INTERNAL_ERROR', message: 'Failed to create seasonality type' },
      500
    );
  }
}
