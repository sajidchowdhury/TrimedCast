// ============================================
// POST /api/soe/confirm-order
// One-click order confirmation for S&OE
// Creates PO, updates RecommendedOrder, logs audit
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiCreated, apiError, notFoundError, validationError } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
import { format, addDays } from 'date-fns';
export const runtime = 'nodejs';


interface ConfirmOrderRequest {
  productId: string;
  quantity: number;
  shipmentMode: 'sea' | 'air';
  tenantId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConfirmOrderRequest = await request.json();
    const { productId, quantity, shipmentMode } = body;

    // Validate required fields
    if (!productId) return validationError('productId', 'Product ID is required');
    if (!quantity || quantity <= 0) return validationError('quantity', 'Quantity must be a positive number');
    if (!shipmentMode || !['sea', 'air'].includes(shipmentMode)) {
      return validationError('shipmentMode', 'Shipment mode must be "sea" or "air"');
    }

    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    // Find the product with supplier
    const product = await db.product.findFirst({
      where: { id: productId, tenantId, isActive: true },
      include: { supplier: true, inventory: true },
    });

    if (!product) {
      return notFoundError('Product');
    }

    // Find a matching pending recommended order for this product
    const matchingRecommendation = await db.recommendedOrder.findFirst({
      where: {
        tenantId,
        productId,
        status: 'pending',
      },
      orderBy: { urgency: 'desc' },
    });

    // Generate PO number
    const poCount = await db.purchaseOrder.count({ where: { tenantId } });
    const poNumber = `PO-${String(poCount + 1).padStart(5, '0')}`;

    // Calculate lead time based on shipment mode
    const baseLeadTime = product.leadTimeDays || product.supplier?.leadTimeDays || 90;
    const leadTimeDays = shipmentMode === 'air' ? Math.ceil(baseLeadTime * 0.3) : baseLeadTime;

    // Calculate expected delivery
    const orderDate = new Date();
    const expectedDelivery = addDays(orderDate, leadTimeDays);

    // Check CNY risk (simplified: if supplier is CNY-affected and order date is Jan-Feb)
    const cnyRisk = product.supplier?.isCnyAffected &&
      (orderDate.getMonth() === 0 || orderDate.getMonth() === 1);

    // Calculate costs
    const unitCost = product.unitCost || 0;
    const totalAmount = quantity * unitCost;

    // Build full timeline
    const timeline = {
      orderPlaced: format(orderDate, 'yyyy-MM-dd'),
      supplierAcknowledgement: format(addDays(orderDate, 3), 'yyyy-MM-dd'),
      productionStart: format(addDays(orderDate, 7), 'yyyy-MM-dd'),
      productionEnd: format(addDays(orderDate, Math.ceil(leadTimeDays * 0.6)), 'yyyy-MM-dd'),
      shipmentDeparture: format(addDays(orderDate, Math.ceil(leadTimeDays * 0.7)), 'yyyy-MM-dd'),
      customsClearance: shipmentMode === 'sea'
        ? format(addDays(orderDate, Math.ceil(leadTimeDays * 0.9)), 'yyyy-MM-dd')
        : null,
      warehouseArrival: format(expectedDelivery, 'yyyy-MM-dd'),
      leadTimeDays,
      shipmentMode,
    };

    // Create PO and update recommendation in transaction
    const purchaseOrder = await db.$transaction(async (tx) => {
      const items = JSON.stringify([{
        productId,
        quantity,
        unitCost,
        recommendedOrderId: matchingRecommendation?.id || null,
      }]);

      const po = await tx.purchaseOrder.create({
        data: {
          tenantId,
          poNumber,
          supplierId: product.supplierId,
          orderDate,
          expectedDelivery,
          status: 'confirmed',
          totalAmount,
          items,
          cnyRisk: cnyRisk || false,
          leadTimeDays,
        },
      });

      // Mark recommendation as converted if one exists
      if (matchingRecommendation) {
        await tx.recommendedOrder.update({
          where: { id: matchingRecommendation.id },
          data: { status: 'converted' },
        });
      }

      return po;
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: context.userId || undefined,
      action: 'create',
      entity: 'purchase_order',
      entityId: purchaseOrder.id,
      metadata: {
        po_number: poNumber,
        product_id: productId,
        product_name: product.name,
        quantity,
        shipment_mode: shipmentMode,
        lead_time_days: leadTimeDays,
        total_amount: totalAmount,
        from_recommended_order: matchingRecommendation?.id || null,
        cny_risk: cnyRisk,
      },
    });

    return apiCreated({
      purchaseOrderId: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      status: purchaseOrder.status,
      productId,
      productName: product.name,
      quantity,
      shipmentMode,
      unitCost,
      totalAmount,
      leadTimeDays,
      expectedDelivery: format(expectedDelivery, 'yyyy-MM-dd'),
      cnyRisk: cnyRisk || false,
      timeline,
      recommendedOrderId: matchingRecommendation?.id || null,
      recommendedOrderStatus: matchingRecommendation ? 'converted' : null,
      message: matchingRecommendation
        ? 'Order confirmed and recommended order converted to purchase order'
        : 'Order confirmed as new purchase order',
    });
  } catch (error) {
    console.error('[SOE/ConfirmOrder/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to confirm order' }, 500);
  }
}
