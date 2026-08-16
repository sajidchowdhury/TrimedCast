// ============================================
// GET /api/v1/purchase-orders - List purchase orders
// POST /api/v1/purchase-orders - Create from recommended orders
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

    const status = url.searchParams.get('status');
    const supplierId = url.searchParams.get('supplier_id');
    const cnyRisk = url.searchParams.get('cny_risk') === 'true';

    const where: Record<string, unknown> = {
      tenantId,
      ...(status ? { status } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(cnyRisk ? { cnyRisk: true } : {}),
    };

    const [orders, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where, skip, take,
        orderBy: { orderDate: 'desc' },
      }),
      db.purchaseOrder.count({ where }),
    ]);

    const data = orders.map((o) => ({
      id: o.id,
      po_number: o.poNumber,
      supplier_id: o.supplierId,
      order_date: o.orderDate,
      expected_delivery: o.expectedDelivery,
      status: o.status,
      total_amount: o.totalAmount,
      cny_risk: o.cnyRisk,
      lead_time_days: o.leadTimeDays,
      items: o.items ? JSON.parse(o.items) : [],
    }));

    return apiPaginated(data, page, perPage, total, tenantId);
  } catch (error) {
    console.error('[PurchaseOrders/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch purchase orders' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'purchase_orders.crud')) {
      return forbiddenError();
    }

    const body = await request.json();
    const { recommended_order_ids, shipment_mode, notes } = body;

    if (!recommended_order_ids || !Array.isArray(recommended_order_ids) || recommended_order_ids.length === 0) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'recommended_order_ids is required and must be a non-empty array' }, 400);
    }

    // Fetch recommended orders
    const recommendedOrders = await db.recommendedOrder.findMany({
      where: {
        id: { in: recommended_order_ids },
        tenantId,
        status: 'pending',
      },
      include: { product: true },
    });

    if (recommendedOrders.length === 0) {
      return apiError({ code: 'VALIDATION_ERROR', message: 'No valid pending recommended orders found' }, 400);
    }

    // Determine supplier from first product
    const firstProduct = recommendedOrders[0].product;
    const supplierId = firstProduct.supplierId;

    // Calculate timeline
    const mode = shipment_mode || 'sea';
    const mfgDays = 90;
    const shipmentDays = mode === 'sea' ? 52 : 8;
    const customsDays = mode === 'sea' ? 10 : 3;
    const totalLeadTime = mfgDays + shipmentDays + customsDays;

    const orderDate = new Date();
    const mfgCompleteDate = new Date(orderDate);
    mfgCompleteDate.setDate(mfgCompleteDate.getDate() + mfgDays);
    const shipDate = new Date(mfgCompleteDate);
    shipDate.setDate(shipDate.getDate() + 2);
    const arrivalDate = new Date(shipDate);
    arrivalDate.setDate(arrivalDate.getDate() + shipmentDays);
    const customsClearanceDate = new Date(arrivalDate);
    customsClearanceDate.setDate(customsClearanceDate.getDate() + customsDays);
    const availableDate = new Date(customsClearanceDate);
    availableDate.setDate(availableDate.getDate() + 1);

    // Check CNY risk
    const cnyStart = new Date('2026-01-20');
    const cnyEnd = new Date('2026-02-20');
    const hasCnyRisk = (mfgCompleteDate >= cnyStart && mfgCompleteDate <= cnyEnd) ||
                       (orderDate <= cnyStart && mfgCompleteDate >= cnyStart);

    // Build items and calculate total cost
    const items = recommendedOrders.map((ro) => ({
      productId: ro.productId,
      quantity: ro.quantity,
      unitCost: ro.unitCost || ro.product.unitCost || 0,
      recommendedOrderId: ro.id,
    }));

    const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

    // Generate PO number
    const poCount = await db.purchaseOrder.count({ where: { tenantId } });
    const poNumber = `PO-${String(poCount + 1).padStart(5, '0')}`;

    // Create purchase order
    const purchaseOrder = await db.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          tenantId,
          poNumber,
          supplierId,
          orderDate,
          expectedDelivery: availableDate,
          status: 'draft',
          totalAmount: totalCost,
          items: JSON.stringify(items),
          cnyRisk: hasCnyRisk,
          leadTimeDays: totalLeadTime,
        },
      });

      // Mark recommended orders as converted
      await Promise.all(
        recommended_order_ids.map((roId: string) =>
          tx.recommendedOrder.update({
            where: { id: roId },
            data: { status: 'converted' },
          })
        )
      );

      return po;
    });

    await createAuditLog({
      tenantId, userId: context.userId || undefined,
      action: 'create', entity: 'purchase_order', entityId: purchaseOrder.id,
      changes: { after: { recommended_order_ids, shipment_mode, total_cost: totalCost } },
    });

    return apiCreated({
      purchase_order_id: purchaseOrder.id,
      po_number: purchaseOrder.poNumber,
      timeline: {
        order_date: orderDate.toISOString().split('T')[0],
        mfg_complete_date: mfgCompleteDate.toISOString().split('T')[0],
        ship_date: shipDate.toISOString().split('T')[0],
        arrival_date: arrivalDate.toISOString().split('T')[0],
        customs_clearance_date: customsClearanceDate.toISOString().split('T')[0],
        available_date: availableDate.toISOString().split('T')[0],
      },
      cny_risk: hasCnyRisk,
      total_cost_bdt: totalCost,
      items_count: items.length,
    });
  } catch (error) {
    console.error('[PurchaseOrders/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create purchase order' }, 500);
  }
}
