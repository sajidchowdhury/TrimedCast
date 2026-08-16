// ============================================
// GET /api/v1/purchase-orders/[id]
// PUT /api/v1/purchase-orders/[id]
// DELETE /api/v1/purchase-orders/[id]
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, notFoundError, forbiddenError, apiError, conflictError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    const order = await db.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!order) return notFoundError('Purchase order');

    return apiSuccess({
      ...order,
      items: order.items ? JSON.parse(order.items) : [],
    });
  } catch (error) {
    console.error('[PurchaseOrders/[id]/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch purchase order' }, 500);
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

    if (context.isAuthenticated && !canDo(context, 'purchase_orders.crud')) return forbiddenError();

    const existing = await db.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('Purchase order');

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.expected_delivery !== undefined) updates.expectedDelivery = new Date(body.expected_delivery);
    if (body.notes !== undefined) updates.notes = body.notes;

    const order = await db.purchaseOrder.update({ where: { id }, data: updates });

    await createAuditLog({
      tenantId, userId: context.userId || undefined,
      action: 'update', entity: 'purchase_order', entityId: id,
      changes: { before: existing, after: updates },
    });

    return apiSuccess(order);
  } catch (error) {
    console.error('[PurchaseOrders/[id]/PUT]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update purchase order' }, 500);
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

    if (context.isAuthenticated && !canDo(context, 'purchase_orders.crud')) return forbiddenError();

    const existing = await db.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('Purchase order');

    if (existing.status !== 'draft') {
      return conflictError('Only draft purchase orders can be cancelled');
    }

    await db.purchaseOrder.update({ where: { id }, data: { status: 'cancelled' } });

    await createAuditLog({
      tenantId, userId: context.userId || undefined,
      action: 'delete', entity: 'purchase_order', entityId: id,
    });

    return apiSuccess({ message: 'Purchase order cancelled', id });
  } catch (error) {
    console.error('[PurchaseOrders/[id]/DELETE]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to cancel purchase order' }, 500);
  }
}
