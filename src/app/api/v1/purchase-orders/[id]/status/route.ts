// ============================================
// PUT /api/v1/purchase-orders/{id}/status
// Validates allowed status transitions
// draft→sent→confirmed→in_transit→received
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, notFoundError, forbiddenError, apiError, conflictError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['confirmed', 'cancelled'],
  confirmed: ['in_transit', 'cancelled'],
  in_transit: ['received'],
  received: [],
  cancelled: [],
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'purchase_orders.crud')) {
      return forbiddenError();
    }

    const existing = await db.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('Purchase order');

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'status is required', field: 'status' }, 400);
    }

    // Validate transition
    const allowedTransitions = VALID_TRANSITIONS[existing.status] || [];
    if (!allowedTransitions.includes(status)) {
      return conflictError(
        `Invalid status transition: ${existing.status} → ${status}. Allowed: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

    // If receiving, update inventory
    if (status === 'received') {
      const items = existing.items ? JSON.parse(existing.items) as Array<{ productId: string; quantity: number }> : [];

      await db.$transaction(async (tx) => {
        // Update PO status
        await tx.purchaseOrder.update({
          where: { id },
          data: { status, updatedAt: new Date() },
        });

        // Add inventory for each item
        for (const item of items) {
          const inventory = await tx.inventory.findFirst({
            where: { tenantId, productId: item.productId },
          });

          if (inventory) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                currentStock: inventory.currentStock + item.quantity,
                availableStock: inventory.availableStock + item.quantity,
                lastCountDate: new Date(),
              },
            });
          }
        }
      });
    } else {
      await db.purchaseOrder.update({
        where: { id },
        data: { status },
      });
    }

    await createAuditLog({
      tenantId, userId: context.userId || undefined,
      action: 'status_change', entity: 'purchase_order', entityId: id,
      changes: { before: { status: existing.status }, after: { status } },
    });

    return apiSuccess({
      id,
      old_status: existing.status,
      new_status: status,
      message: `Purchase order status changed from ${existing.status} to ${status}`,
    });
  } catch (error) {
    console.error('[PurchaseOrders/[id]/status]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update purchase order status' }, 500);
  }
}
