// ============================================
// TrimedCast API - Convert Recommended Order to Purchase Order
// POST: Convert a recommended order to a purchase order
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId: tenantIdRaw = 'demo-bd-motors',
      recommendedOrderId,
      supplierId,
    } = body;
    const tenantId = await resolveTenantId(tenantIdRaw);

    if (!recommendedOrderId) {
      return NextResponse.json(
        { success: false, error: 'recommendedOrderId is required' },
        { status: 400 }
      );
    }

    // Fetch the recommended order with product details
    const recOrder = await db.recommendedOrder.findUnique({
      where: { id: recommendedOrderId },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            category: true,
            unitCost: true,
            supplierId: true,
          },
        },
      },
    });

    if (!recOrder) {
      return NextResponse.json(
        { success: false, error: 'Recommended order not found' },
        { status: 404 }
      );
    }

    if (recOrder.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Recommended order does not belong to this tenant' },
        { status: 403 }
      );
    }

    if (recOrder.status === 'converted') {
      return NextResponse.json(
        { success: false, error: 'Recommended order has already been converted to a purchase order' },
        { status: 400 }
      );
    }

    if (recOrder.status === 'rejected') {
      return NextResponse.json(
        { success: false, error: 'Cannot convert a rejected recommended order' },
        { status: 400 }
      );
    }

    // Determine supplier
    const effectiveSupplierId = supplierId || recOrder.product.supplierId;

    // Generate PO number: PO-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const poNumber = `PO-${dateStr}-${randomSuffix}`;

    // Build PO items as JSON
    const items = JSON.stringify([{
      productId: recOrder.productId,
      productSku: recOrder.product.sku,
      productName: recOrder.product.name,
      quantity: recOrder.quantity,
      unitCost: recOrder.product.unitCost || 0,
      totalCost: recOrder.quantity * (recOrder.product.unitCost || 0),
    }]);

    // Calculate expected delivery date based on lead time
    const expectedDelivery = new Date(today);
    if (recOrder.totalLeadTime) {
      expectedDelivery.setDate(expectedDelivery.getDate() + recOrder.totalLeadTime);
    } else {
      expectedDelivery.setDate(expectedDelivery.getDate() + 155); // default sea lead time
    }

    // Calculate total amount
    const totalAmount = recOrder.quantity * (recOrder.product.unitCost || 0);

    // Check CNY risk from justification
    const cnyRisk = recOrder.justification?.includes('CNY') || false;

    // Create the purchase order
    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        tenantId,
        poNumber,
        supplierId: effectiveSupplierId,
        orderDate: today,
        expectedDelivery,
        status: 'draft',
        totalAmount: Math.round(totalAmount * 100) / 100,
        items,
        cnyRisk,
        leadTimeDays: recOrder.totalLeadTime || 155,
      },
    });

    // Update recommended order status to 'converted'
    await db.recommendedOrder.update({
      where: { id: recommendedOrderId },
      data: { status: 'converted' },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        tenantId,
        action: 'create',
        entity: 'purchase_order',
        entityId: purchaseOrder.id,
        changes: JSON.stringify({
          from: 'recommended_order',
          recommendedOrderId,
          poNumber,
          quantity: recOrder.quantity,
          totalAmount,
        }),
        metadata: JSON.stringify({
          productSku: recOrder.product.sku,
          priority: recOrder.priority,
          cnyRisk,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        purchaseOrder: {
          id: purchaseOrder.id,
          poNumber: purchaseOrder.poNumber,
          supplierId: purchaseOrder.supplierId,
          orderDate: purchaseOrder.orderDate.toISOString().split('T')[0],
          expectedDelivery: purchaseOrder.expectedDelivery?.toISOString().split('T')[0] || null,
          status: purchaseOrder.status,
          totalAmount: purchaseOrder.totalAmount,
          cnyRisk: purchaseOrder.cnyRisk,
          leadTimeDays: purchaseOrder.leadTimeDays,
          items: JSON.parse(purchaseOrder.items || '[]'),
        },
        recommendedOrderId,
        convertedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
