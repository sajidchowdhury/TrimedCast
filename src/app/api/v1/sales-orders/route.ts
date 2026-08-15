// ============================================
// GET /api/v1/sales-orders - List sales orders
// POST /api/v1/sales-orders - Create sales order
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
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const productId = url.searchParams.get('product_id');

    const where: Record<string, unknown> = {
      tenantId,
      ...(status ? { status } : {}),
      ...(dateFrom || dateTo ? {
        date: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        },
      } : {}),
    };

    // Product filter requires checking JSON items field
    if (productId) {
      // For now, we don't filter by product in DB query since items is JSON
    }

    const [orders, total] = await Promise.all([
      db.salesOrder.findMany({
        where, skip, take,
        orderBy: { date: 'desc' },
      }),
      db.salesOrder.count({ where }),
    ]);

    const data = orders.map((o) => ({
      id: o.id,
      order_no: o.orderNo,
      date: o.date,
      customer_id: o.customerId,
      channel: o.channel,
      region: o.region,
      total_amount: o.totalAmount,
      status: o.status,
      items: o.items ? JSON.parse(o.items) : [],
    }));

    return apiPaginated(data, page, perPage, total, tenantId);
  } catch (error) {
    console.error('[SalesOrders/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch sales orders' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'sales_orders.crud')) {
      return forbiddenError();
    }

    const body = await request.json();
    const { product_id, customer_name, qty_ordered, unit_price_bdt, channel, region } = body;

    if (!product_id || !qty_ordered) {
      return apiError([
        ...(!product_id ? [{ code: 'VALIDATION_ERROR' as const, message: 'product_id is required', field: 'product_id' }] : []),
        ...(!qty_ordered ? [{ code: 'VALIDATION_ERROR' as const, message: 'qty_ordered is required', field: 'qty_ordered' }] : []),
      ], 400);
    }

    // Generate order number
    const orderCount = await db.salesOrder.count({ where: { tenantId } });
    const orderNo = `SO-${String(orderCount + 1).padStart(5, '0')}`;

    const items = JSON.stringify([{
      productId: product_id,
      quantity: qty_ordered,
      price: unit_price_bdt,
    }]);

    const totalAmount = qty_ordered * (unit_price_bdt || 0);

    const order = await db.salesOrder.create({
      data: {
        tenantId,
        orderNo,
        date: new Date(),
        customerId: customer_name || null,
        channel: channel || null,
        region: region || null,
        totalAmount: totalAmount || null,
        status: 'pending',
        items,
      },
    });

    await createAuditLog({
      tenantId, userId: context.userId || undefined,
      action: 'create', entity: 'sales_order', entityId: order.id,
      changes: { after: body },
    });

    return apiCreated({
      id: order.id,
      order_no: order.orderNo,
      status: order.status,
      total_amount: order.totalAmount,
    });
  } catch (error) {
    console.error('[SalesOrders/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create sales order' }, 500);
  }
}
