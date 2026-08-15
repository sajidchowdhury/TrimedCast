// ============================================
// GET /api/v1/motorcycle-models - List
// POST /api/v1/motorcycle-models - Create
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiPaginated, apiCreated, apiError, parsePagination, forbiddenError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();
    const url = new URL(request.url);
    const { page, perPage, skip, take } = parsePagination(url);

    const search = url.searchParams.get('search');
    const segment = url.searchParams.get('segment');

    const where: Record<string, unknown> = {
      tenantId,
      isActive: true,
      ...(segment ? { segment } : {}),
      ...(search ? {
        OR: [
          { brand: { contains: search } },
          { model: { contains: search } },
        ],
      } : {}),
    };

    const [models, total] = await Promise.all([
      db.motorcycleModel.findMany({
        where, skip, take,
        include: { _count: { select: { products: true } } },
        orderBy: [{ brand: 'asc' }, { model: 'asc' }],
      }),
      db.motorcycleModel.count({ where }),
    ]);

    const data = models.map((m) => ({
      id: m.id,
      brand: m.brand,
      model: m.model,
      year_start: m.yearStart,
      year_end: m.yearEnd,
      cc_rating: m.ccRating,
      segment: m.segment,
      product_count: m._count.products,
    }));

    return apiPaginated(data, page, perPage, total, tenantId);
  } catch (error) {
    console.error('[MotorcycleModels/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch motorcycle models' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'motorcycle_models.crud')) {
      return forbiddenError();
    }

    const body = await request.json();
    const { brand, model, year_start, year_end, cc_rating, segment } = body;

    if (!brand || !model) {
      return apiError([
        ...(!brand ? [{ code: 'VALIDATION_ERROR' as const, message: 'brand is required', field: 'brand' }] : []),
        ...(!model ? [{ code: 'VALIDATION_ERROR' as const, message: 'model is required', field: 'model' }] : []),
      ], 400);
    }

    const motorcycleModel = await db.motorcycleModel.create({
      data: {
        tenantId,
        brand,
        model,
        yearStart: year_start || null,
        yearEnd: year_end || null,
        ccRating: cc_rating || null,
        segment: segment || null,
        isActive: true,
      },
    });

    await createAuditLog({
      tenantId, userId: context.userId || undefined,
      action: 'create', entity: 'motorcycle_model', entityId: motorcycleModel.id,
      changes: { after: body },
    });

    return apiCreated(motorcycleModel);
  } catch (error) {
    console.error('[MotorcycleModels/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create motorcycle model' }, 500);
  }
}
