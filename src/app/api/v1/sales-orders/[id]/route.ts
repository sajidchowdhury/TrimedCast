// ============================================
// GET /api/v1/sales-orders/[id]
// PUT /api/v1/sales-orders/[id]
// DELETE /api/v1/sales-orders/[id]
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, notFoundError, forbiddenError, apiError, conflictError } from '@/lib/api/response';
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

    const order = await db.salesOrder.findFirst({ where: { id, tenantId } });
    if (!order) return notFoundError('Sales order');

    return apiSuccess({
      ...order,
      items: order.items ? JSON.parse(order.items) : [],
    });
  } catch (error) {
    console.error('[SalesOrders/[id]/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch sales order' }, 500);
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

    if (context.isAuthenticated && !canDo(context, 'sales_orders.crud')) return forbiddenError();

    const existing = await db.salesOrder.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('Sales order');

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.channel !== undefined) updates.channel = body.channel;
    if (body.region !== undefined) updates.region = body.region;
    if (body.items !== undefined) updates.items = JSON.stringify(body.items);
    if (body.total_amount !== undefined) updates.totalAmount = body.total_amount;

    const order = await db.salesOrder.update({ where: { id }, data: updates });

    await createAuditLog({
      tenantId, userId: context.userId || undefined,
      action: 'update', entity: 'sales_order', entityId: id,
      changes: { before: existing, after: updates },
    });

    return apiSuccess(order);
  } catch (error) {
    console.error('[SalesOrders/[id]/PUT]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update sales order' }, 500);
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

    if (context.isAuthenticated && !canDo(context, 'sales_orders.crud')) return forbiddenError();

    const existing = await db.salesOrder.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('Sales order');

    if (existing.status === 'shipped' || existing.status === 'delivered') {
      return conflictError('Cannot delete a shipped or delivered order');
    }

    await db.salesOrder.update({ where: { id }, data: { status: 'cancelled' } });

    await createAuditLog({
      tenantId, userId: context.userId || undefined,
      action: 'delete', entity: 'sales_order', entityId: id,
    });

    return apiSuccess({ message: 'Sales order cancelled', id });
  } catch (error) {
    console.error('[SalesOrders/[id]/DELETE]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to cancel sales order' }, 500);
  }
}
