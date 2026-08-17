// ============================================
// POST /api/v1/recommended-orders/{id}/convert-to-po
// Creates a purchase_order from the recommendation
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiCreated, notFoundError, forbiddenError, apiError, conflictError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'recommended_orders.crud') && !canDo(context, 'purchase_orders.crud')) {
      return forbiddenError();
    }

    const recommendedOrder = await db.recommendedOrder.findFirst({
      where: { id, tenantId, status: 'pending' },
      include: {
        product: { include: { supplier: true } },
      },
    });

    if (!recommendedOrder) {
      return notFoundError('Pending recommended order');
    }

    // Generate PO number
    const poCount = await db.purchaseOrder.count({ where: { tenantId } });
    const poNumber = `PO-${String(poCount + 1).padStart(5, '0')}`;

    // Build timeline from recommended order
    const timeline = recommendedOrder.timeline ? JSON.parse(recommendedOrder.timeline) : {};
    const supplierId = recommendedOrder.product.supplierId;

    // Create purchase order in transaction
    const purchaseOrder = await db.$transaction(async (tx) => {
      const items = JSON.stringify([{
        productId: recommendedOrder.productId,
        quantity: recommendedOrder.quantity,
        unitCost: recommendedOrder.unitCost || recommendedOrder.product.unitCost || 0,
        recommendedOrderId: recommendedOrder.id,
      }]);

      const totalAmount = recommendedOrder.totalCost || (recommendedOrder.quantity * (recommendedOrder.unitCost || recommendedOrder.product.unitCost || 0));

      const po = await tx.purchaseOrder.create({
        data: {
          tenantId,
          poNumber,
          supplierId,
          orderDate: recommendedOrder.orderDate,
          expectedDelivery: recommendedOrder.expectedDeliveryDate,
          status: 'draft',
          totalAmount,
          items,
          cnyRisk: recommendedOrder.cnyRisk,
          leadTimeDays: recommendedOrder.totalLeadTime,
        },
      });

      // Mark recommendation as converted
      await tx.recommendedOrder.update({
        where: { id: recommendedOrder.id },
        data: { status: 'converted' },
      });

      return po;
    });

    await createAuditLog({
      tenantId,
      userId: context.userId || undefined,
      action: 'create',
      entity: 'purchase_order',
      entityId: purchaseOrder.id,
      metadata: {
        from_recommended_order: id,
        po_number: poNumber,
        quantity: recommendedOrder.quantity,
      },
    });

    return apiCreated({
      purchase_order_id: purchaseOrder.id,
      po_number: purchaseOrder.poNumber,
      recommended_order_id: id,
      status: 'converted',
      message: 'Recommended order converted to purchase order',
    });
  } catch (error) {
    console.error('[RecommendedOrders/[id]/convert-to-po]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to convert to PO' }, 500);
  }
}
