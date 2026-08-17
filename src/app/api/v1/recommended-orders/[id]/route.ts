// ============================================
// GET /api/v1/recommended-orders/{id}
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, notFoundError, apiError } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';
export const runtime = 'nodejs';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    const order = await db.recommendedOrder.findFirst({
      where: { id, tenantId },
      include: {
        product: {
          select: {
            id: true, sku: true, name: true, category: true, unitCost: true,
            motorcycleModel: { select: { brand: true, model: true } },
            supplier: { select: { id: true, name: true, country: true } },
          },
        },
      },
    });

    if (!order) return notFoundError('Recommended order');

    // Get inventory for this product
    const inventory = await db.inventory.findFirst({
      where: { tenantId, productId: order.productId },
    });

    return apiSuccess({
      id: order.id,
      product: {
        sku_code: order.product.sku,
        name: order.product.name,
        category: order.product.category,
        motorcycle_model: order.product.motorcycleModel,
        supplier: order.product.supplier,
      },
      current_stock: inventory?.availableStock ?? null,
      recommended_qty: order.quantity,
      order_trigger_date: order.orderDate,
      total_lead_time_days: order.totalLeadTime,
      urgency: order.urgency,
      status: order.status,
      cny_risk: order.cnyRisk,
      shipment_mode: order.shipmentMode,
      unit_cost: order.unitCost,
      total_cost: order.totalCost,
      timeline: order.timeline ? JSON.parse(order.timeline) : null,
      justification: order.justification,
    });
  } catch (error) {
    console.error('[RecommendedOrders/[id]/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch recommended order' }, 500);
  }
}
