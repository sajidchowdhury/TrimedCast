// ============================================
// PUT /api/v1/promo-events/{id} - Update promo event
// DELETE /api/v1/promo-events/{id} - Soft delete (set isActive=false)
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, notFoundError, forbiddenError, unauthorizedError, validationError } from '@/lib/api/response';
import { getAuthContext, canDo } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

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

    // RBAC: warehouse_manager, marketing_manager
    if (!canDo(context, 'promo_events.crud')) {
      return forbiddenError();
    }

    const existing = await db.promoEvent.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('PromoEvent');

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    const allowedFields = [
      'name', 'type', 'start_date', 'end_date', 'discount_pct',
      'affected_categories', 'expected_uplift', 'is_active',
    ];

    const fieldMap: Record<string, string> = {
      start_date: 'startDate',
      end_date: 'endDate',
      discount_pct: 'discountPct',
      affected_categories: 'affectedCategories',
      expected_uplift: 'expectedUplift',
      is_active: 'isActive',
    };

    // Validate type if provided
    if (body.type !== undefined) {
      const validTypes = ['eid_discount', 'seasonal_sale', 'clearance', 'flash_sale'];
      if (!validTypes.includes(body.type)) {
        return validationError('type', `type must be one of: ${validTypes.join(', ')}`);
      }
    }

    // Validate dates if provided
    if (body.start_date !== undefined) {
      const startDate = new Date(body.start_date);
      if (isNaN(startDate.getTime())) return validationError('start_date', 'Invalid start_date format');
    }
    if (body.end_date !== undefined) {
      const endDate = new Date(body.end_date);
      if (isNaN(endDate.getTime())) return validationError('end_date', 'Invalid end_date format');
    }

    // Validate discount_pct if provided
    if (body.discount_pct !== undefined && (body.discount_pct < 0 || body.discount_pct > 100)) {
      return validationError('discount_pct', 'discount_pct must be between 0 and 100');
    }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const dbField = fieldMap[field] || field;
        // Convert date strings to Date objects
        if (field === 'start_date' || field === 'end_date') {
          updates[dbField] = new Date(body[field]);
        } else {
          updates[dbField] = body[field];
        }
      }
    }

    const promoEvent = await db.promoEvent.update({
      where: { id },
      data: updates,
    });

    await createAuditLog({
      tenantId,
      userId: context.userId,
      action: 'update',
      entity: 'promo_event',
      entityId: id,
      changes: { before: existing, after: updates },
    });

    return apiSuccess({
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
    console.error('[PromoEvents/[id]/PUT]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update promo event' }, 500);
  }
}

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

    // RBAC: warehouse_manager only (promo_events.crud is sufficient, but per spec only warehouse_manager)
    // warehouse_manager has promo_events.crud; marketing_manager also has promo_events.crud
    // Per API contract spec: DELETE is warehouse_manager only - check users.manage as stricter gate
    // Actually, looking at the spec: "RBAC: warehouse_manager" for DELETE
    // Both warehouse_manager and marketing_manager have promo_events.crud
    // We need a more restrictive check: only warehouse_manager can delete
    if (context.role !== 'warehouse_manager') {
      return forbiddenError('Only warehouse_manager can delete promo events');
    }

    const existing = await db.promoEvent.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('PromoEvent');

    // Soft delete: set isActive = false
    await db.promoEvent.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      tenantId,
      userId: context.userId,
      action: 'delete',
      entity: 'promo_event',
      entityId: id,
      changes: { before: { isActive: existing.isActive }, after: { isActive: false } },
    });

    return apiSuccess({ message: 'Promo event deactivated', id });
  } catch (error) {
    console.error('[PromoEvents/[id]/DELETE]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete promo event' }, 500);
  }
}
