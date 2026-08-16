// ============================================
// GET /api/v1/promo-events - List promo events (paginated)
// POST /api/v1/promo-events - Create promo event
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiPaginated, apiCreated, apiError, parsePagination, forbiddenError, unauthorizedError, validationError } from '@/lib/api/response';
import { getAuthContext, canDo } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    const tenantId = context.tenantId;
    const url = new URL(request.url);

    // RBAC: All authenticated roles can read (promo_events.read or promo_events.crud)
    const canRead = canDo(context, 'promo_events.read') || canDo(context, 'promo_events.crud');
    if (!canRead) {
      return forbiddenError();
    }

    const { page, perPage, skip, take } = parsePagination(url);

    // Filters
    const isActive = url.searchParams.get('is_active');
    const type = url.searchParams.get('type');

    const where: Record<string, unknown> = {
      tenantId,
      ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
      ...(type ? { type } : {}),
    };

    const [promoEvents, total] = await Promise.all([
      db.promoEvent.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      db.promoEvent.count({ where }),
    ]);

    const data = promoEvents.map((pe) => ({
      id: pe.id,
      name: pe.name,
      type: pe.type,
      start_date: pe.startDate,
      end_date: pe.endDate,
      discount_pct: pe.discountPct,
      affected_categories: pe.affectedCategories,
      expected_uplift: pe.expectedUplift,
      is_active: pe.isActive,
      created_at: pe.createdAt,
      updated_at: pe.updatedAt,
    }));

    return apiPaginated(data, page, perPage, total, tenantId);
  } catch (error) {
    console.error('[PromoEvents/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch promo events' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    if (!context.isAuthenticated) {
      return unauthorizedError();
    }
    const tenantId = context.tenantId;

    // RBAC: warehouse_manager, marketing_manager
    if (!canDo(context, 'promo_events.crud')) {
      return forbiddenError();
    }

    const body = await request.json();
    const {
      name, type, start_date, end_date, discount_pct,
      affected_categories, expected_uplift, is_active,
    } = body;

    // Validation
    if (!name) return validationError('name', 'name is required');
    if (!type) return validationError('type', 'type is required');
    if (!start_date) return validationError('start_date', 'start_date is required');
    if (!end_date) return validationError('end_date', 'end_date is required');

    const validTypes = ['eid_discount', 'seasonal_sale', 'clearance', 'flash_sale'];
    if (!validTypes.includes(type)) {
      return validationError('type', `type must be one of: ${validTypes.join(', ')}`);
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime())) return validationError('start_date', 'Invalid start_date format');
    if (isNaN(endDate.getTime())) return validationError('end_date', 'Invalid end_date format');
    if (startDate >= endDate) return validationError('end_date', 'end_date must be after start_date');

    if (discount_pct !== undefined && (discount_pct < 0 || discount_pct > 100)) {
      return validationError('discount_pct', 'discount_pct must be between 0 and 100');
    }

    const promoEvent = await db.promoEvent.create({
      data: {
        tenantId,
        name,
        type,
        startDate,
        endDate,
        discountPct: discount_pct ?? null,
        affectedCategories: affected_categories ?? null,
        expectedUplift: expected_uplift ?? null,
        isActive: is_active ?? true,
      },
    });

    await createAuditLog({
      tenantId,
      userId: context.userId,
      action: 'create',
      entity: 'promo_event',
      entityId: promoEvent.id,
      changes: { after: body },
    });

    return apiCreated({
      id: promoEvent.id,
      name: promoEvent.name,
      type: promoEvent.type,
      start_date: promoEvent.startDate,
      end_date: promoEvent.endDate,
      discount_pct: promoEvent.discountPct,
      affected_categories: promoEvent.affectedCategories,
      expected_uplift: promoEvent.expectedUplift,
      is_active: promoEvent.isActive,
    });
  } catch (error) {
    console.error('[PromoEvents/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create promo event' }, 500);
  }
}
