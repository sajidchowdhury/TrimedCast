// ============================================
// GET /api/v1/motorcycle-models/[id]
// PUT /api/v1/motorcycle-models/[id]
// DELETE /api/v1/motorcycle-models/[id] (soft)
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, notFoundError, forbiddenError, apiError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    const model = await db.motorcycleModel.findFirst({
      where: { id, tenantId },
      include: { products: { select: { id: true, sku: true, name: true, category: true } } },
    });

    if (!model) return notFoundError('Motorcycle model');

    return apiSuccess({
      id: model.id, brand: model.brand, model: model.model,
      year_start: model.yearStart, year_end: model.yearEnd,
      cc_rating: model.ccRating, segment: model.segment,
      products: model.products,
    });
  } catch (error) {
    console.error('[MotorcycleModels/[id]/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch motorcycle model' }, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'motorcycle_models.crud')) return forbiddenError();

    const existing = await db.motorcycleModel.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('Motorcycle model');

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    const fieldMap: Record<string, string> = {
      brand: 'brand', model: 'model', year_start: 'yearStart', year_end: 'yearEnd',
      cc_rating: 'ccRating', segment: 'segment',
    };
    for (const [apiField, dbField] of Object.entries(fieldMap)) {
      if (body[apiField] !== undefined) updates[dbField] = body[apiField];
    }

    const updated = await db.motorcycleModel.update({ where: { id }, data: updates });

    await createAuditLog({
      tenantId, userId: context.userId || undefined,
      action: 'update', entity: 'motorcycle_model', entityId: id,
      changes: { before: existing, after: updates },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error('[MotorcycleModels/[id]/PUT]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update motorcycle model' }, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'motorcycle_models.crud')) return forbiddenError();

    const existing = await db.motorcycleModel.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('Motorcycle model');

    await db.motorcycleModel.update({ where: { id }, data: { isActive: false } });

    await createAuditLog({
      tenantId, userId: context.userId || undefined,
      action: 'delete', entity: 'motorcycle_model', entityId: id,
    });

    return apiSuccess({ message: 'Motorcycle model deactivated', id });
  } catch (error) {
    console.error('[MotorcycleModels/[id]/DELETE]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete motorcycle model' }, 500);
  }
}
