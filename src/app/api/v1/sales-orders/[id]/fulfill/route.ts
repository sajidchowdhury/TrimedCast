// ============================================
// PUT /api/v1/sales-orders/[id]/fulfill
// Sets status=fulfilled, fulfilled_at=now, decrements inventory
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, notFoundError, forbiddenError, apiError, conflictError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'sales_orders.crud')) {
      return forbiddenError();
    }

    const order = await db.salesOrder.findFirst({ where: { id, tenantId } });
    if (!order) return notFoundError('Sales order');

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return conflictError('Only pending or confirmed orders can be fulfilled');
    }

    // Parse items to get product IDs and quantities
    const items = order.items ? JSON.parse(order.items) as Array<{ productId: string; quantity: number }> : [];

    // Decrement inventory for each item
    await db.$transaction(async (tx) => {
      for (const item of items) {
        const inventory = await tx.inventory.findFirst({
          where: { tenantId, productId: item.productId },
        });

        if (inventory) {
          const newCurrentStock = Math.max(0, inventory.currentStock - item.quantity);
          const newReservedStock = Math.max(0, inventory.reservedStock - item.quantity);
          const newAvailableStock = newCurrentStock - newReservedStock;

          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              currentStock: newCurrentStock,
              reservedStock: newReservedStock,
              availableStock: Math.max(0, newAvailableStock),
              lastCountDate: new Date(),
            },
          });
        }
      }

      await tx.salesOrder.update({
        where: { id },
        data: { status: 'delivered', updatedAt: new Date() },
      });
    });

    await createAuditLog({
      tenantId, userId: context.userId || undefined,
      action: 'fulfill', entity: 'sales_order', entityId: id,
      metadata: { items_fulfilled: items.length },
    });

    return apiSuccess({
      message: 'Sales order fulfilled',
      id,
      status: 'delivered',
      items_processed: items.length,
    });
  } catch (error) {
    console.error('[SalesOrders/[id]/fulfill]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fulfill sales order' }, 500);
  }
}
