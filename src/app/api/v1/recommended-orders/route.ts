// ============================================
// GET /api/v1/recommended-orders
// THE PRIMARY OUTPUT — full timeline, filters, pagination
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiPaginated, apiError, parsePagination } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();
    const url = new URL(request.url);
    const { page, perPage, skip, take } = parsePagination(url);

    const urgency = url.searchParams.get('urgency');
    const status = url.searchParams.get('status');
    const shipmentMode = url.searchParams.get('shipment_mode');
    const motorcycleModelId = url.searchParams.get('motorcycle_model_id');
    const cnyRisk = url.searchParams.get('cny_risk') === 'true';

    const where: Record<string, unknown> = {
      tenantId,
      ...(urgency ? { urgency } : {}),
      ...(status ? { status } : {}),
      ...(shipmentMode ? { shipmentMode } : {}),
      ...(cnyRisk ? { cnyRisk: true } : {}),
      ...(motorcycleModelId ? {
        product: { motorcycleModelId },
      } : {}),
    };

    const [orders, total] = await Promise.all([
      db.recommendedOrder.findMany({
        where,
        skip,
        take,
        include: {
          product: {
            select: {
              id: true, sku: true, name: true, category: true, seasonalityType: true,
              motorcycleModel: { select: { id: true, brand: true, model: true } },
            },
          },
        },
        orderBy: [
          { urgency: 'desc' },
          { orderDate: 'asc' },
        ],
      }),
      db.recommendedOrder.count({ where }),
    ]);

    // Get current stock for each product
    const productIds = orders.map((o) => o.productId);
    const inventories = await db.inventory.findMany({
      where: { tenantId, productId: { in: productIds } },
      select: { productId: true, availableStock: true, reorderPoint: true, safetyStock: true },
    });
    const inventoryMap = new Map(inventories.map((i) => [i.productId, i]));

    const data = orders.map((o) => {
      const inv = inventoryMap.get(o.productId);
      const timeline = o.timeline ? JSON.parse(o.timeline) : null;

      return {
        id: o.id,
        product: {
          sku_code: o.product.sku,
          name: o.product.name,
          season_type: o.product.seasonalityType,
          motorcycle_model: o.product.motorcycleModel,
        },
        current_stock: inv?.availableStock ?? null,
        reorder_point: inv?.reorderPoint ?? null,
        recommended_qty: o.quantity,
        suggested_qty: o.suggestedQty,
        order_trigger_date: o.orderDate,
        total_lead_time_days: o.totalLeadTime,
        shipment_mode: o.shipmentMode,
        expected_available_date: o.expectedDeliveryDate,
        urgency: o.urgency,
        priority: o.priority,
        status: o.status,
        cny_risk: o.cnyRisk,
        cny_strategy: o.cnyStrategy,
        cny_delay_days: o.cnyDelayDays,
        unit_cost: o.unitCost,
        total_cost: o.totalCost,
        timeline,
        justification: o.justification,
        created_at: o.createdAt,
      };
    });

    return apiPaginated(data, page, perPage, total, tenantId);
  } catch (error) {
    console.error('[RecommendedOrders/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch recommended orders' }, 500);
  }
}
