// ============================================
// GET /api/v1/suppliers/[id]
// PUT /api/v1/suppliers/[id]
// DELETE /api/v1/suppliers/[id]
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

    const supplier = await db.supplier.findFirst({
      where: { id, tenantId },
      include: {
        products: { select: { id: true, sku: true, name: true, category: true } },
      },
    });

    if (!supplier) return notFoundError('Supplier');

    return apiSuccess({
      id: supplier.id,
      name: supplier.name,
      code: supplier.code,
      country: supplier.country,
      lead_time_days: supplier.leadTimeDays,
      reliability: supplier.reliability,
      is_cny_affected: supplier.isCnyAffected,
      contact_email: supplier.contactEmail,
      contact_phone: supplier.contactPhone,
      notes: supplier.notes,
      products: supplier.products,
    });
  } catch (error) {
    console.error('[Suppliers/[id]/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch supplier' }, 500);
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

    if (context.isAuthenticated && !canDo(context, 'suppliers.crud')) {
      return forbiddenError();
    }

    const existing = await db.supplier.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('Supplier');

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    const fieldMap: Record<string, string> = {
      name: 'name', code: 'code', country: 'country',
      lead_time_days: 'leadTimeDays', reliability: 'reliability',
      is_cny_affected: 'isCnyAffected', contact_email: 'contactEmail',
      contact_phone: 'contactPhone', notes: 'notes',
    };

    for (const [apiField, dbField] of Object.entries(fieldMap)) {
      if (body[apiField] !== undefined) updates[dbField] = body[apiField];
    }

    const supplier = await db.supplier.update({ where: { id }, data: updates });

    await createAuditLog({
      tenantId, userId: context.userId || undefined,
      action: 'update', entity: 'supplier', entityId: id,
      changes: { before: existing, after: updates },
    });

    return apiSuccess(supplier);
  } catch (error) {
    console.error('[Suppliers/[id]/PUT]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update supplier' }, 500);
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

    if (context.isAuthenticated && !canDo(context, 'suppliers.crud')) {
      return forbiddenError();
    }

    const existing = await db.supplier.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('Supplier');

    await db.supplier.update({ where: { id }, data: { isActive: false } });

    await createAuditLog({
      tenantId, userId: context.userId || undefined,
      action: 'delete', entity: 'supplier', entityId: id,
    });

    return apiSuccess({ message: 'Supplier deactivated', id });
  } catch (error) {
    console.error('[Suppliers/[id]/DELETE]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete supplier' }, 500);
  }
}
