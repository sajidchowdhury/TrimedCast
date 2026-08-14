// ============================================
// TrimedCast API - Batch Order Triggers (CORE IP)
// POST: Calculate order triggers for ALL products at once
// GET: Get saved recommended orders with filtering
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
import {
  calculateOrderTrigger,
  type OrderTriggerInput,
  type OrderTriggerResult,
} from '@/lib/forecasting/order-trigger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId: tenantIdRaw = 'demo-bd-motors',
      shippingMethod = 'sea',
      serviceLevel = 0.95,
      season,
    } = body;
    const tenantId = await resolveTenantId(tenantIdRaw);

    // Fetch all products with inventory for this tenant
    const products = await db.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        inventory: { where: { tenantId } },
        salesHistory: {
          where: { tenantId },
          select: { quantity: true, date: true },
        },
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No products found for this tenant' },
        { status: 404 }
      );
    }

    const triggers: (OrderTriggerResult & { unitCost?: number })[] = [];

    for (const product of products) {
      const inv = product.inventory[0];
      if (!inv) continue; // Skip products without inventory

      // Calculate average daily demand from sales history
      const salesData = product.salesHistory;
      let avgDailyDemand = 0;

      if (salesData.length > 0) {
        // Group by date and aggregate
        const dailySales = new Map<string, number>();
        for (const sale of salesData) {
          const dateKey = sale.date.toISOString().split('T')[0];
          dailySales.set(dateKey, (dailySales.get(dateKey) || 0) + sale.quantity);
        }
        const totalQty = Array.from(dailySales.values()).reduce((a, b) => a + b, 0);
        const uniqueDays = dailySales.size;
        // Average per day over the sales period
        avgDailyDemand = uniqueDays > 0 ? totalQty / uniqueDays : 0;
      }

      // If no sales data, estimate from stock turnover
      if (avgDailyDemand === 0 && inv.currentStock > 0) {
        avgDailyDemand = inv.currentStock / 90; // rough: assume stock covers 90 days
      }

      const input: OrderTriggerInput = {
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        currentStock: inv.currentStock,
        reservedStock: inv.reservedStock,
        safetyStock: inv.safetyStock || 15,
        reorderPoint: inv.reorderPoint || 30,
        avgDailyDemand,
        shippingMethod: shippingMethod as 'sea' | 'air',
        serviceLevel,
      };

      try {
        const trigger = calculateOrderTrigger(input);
        triggers.push({ ...trigger, unitCost: product.unitCost || undefined });
      } catch {
        // Skip products that fail trigger calculation
      }
    }

    // Filter by season if requested
    let filtered = triggers;
    if (season) {
      filtered = triggers.filter(t => t.currentSeason === season);
    }

    // Sort by priority: urgent > high > normal > low
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Calculate summary stats
    const totalUrgent = filtered.filter(t => t.priority === 'urgent').length;
    const totalHigh = filtered.filter(t => t.priority === 'high').length;
    const totalNormal = filtered.filter(t => t.priority === 'normal').length;
    const totalLow = filtered.filter(t => t.priority === 'low').length;
    const cnyRiskCount = filtered.filter(t => t.cnyRisk).length;
    const totalSuggestedSpend = filtered.reduce((sum, t) => {
      const cost = (t as OrderTriggerResult & { unitCost?: number }).unitCost || 0;
      return sum + t.suggestedOrderQty * cost;
    }, 0);

    // Serialize dates
    const serialized = filtered.map(t => ({
      ...t,
      unitCost: undefined,
      reorderHitDate: t.reorderHitDate.toISOString().split('T')[0],
      orderTriggerDate: t.orderTriggerDate.toISOString().split('T')[0],
      expectedDeliveryDate: t.expectedDeliveryDate.toISOString().split('T')[0],
      adjustedOrderDate: t.adjustedOrderDate.toISOString().split('T')[0],
    }));

    return NextResponse.json({
      success: true,
      data: {
        triggers: serialized,
        summary: {
          totalProducts: filtered.length,
          totalUrgent,
          totalHigh,
          totalNormal,
          totalLow,
          cnyRiskCount,
          totalSuggestedSpend: Math.round(totalSuggestedSpend * 100) / 100,
        },
        calculatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdRaw = searchParams.get('tenantId') || 'demo-bd-motors';
    const tenantId = await resolveTenantId(tenantIdRaw);
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');
    const season = searchParams.get('season');
    const cnyRisk = searchParams.get('cnyRisk');

    // Build where clause
    const where: Record<string, unknown> = { tenantId };
    if (priority) where.priority = priority;
    if (status) where.status = status;

    const orders = await db.recommendedOrder.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            category: true,
            unitCost: true,
          },
        },
      },
      orderBy: [
        { priority: 'asc' },
        { orderDate: 'desc' },
      ],
    });

    // Post-filter by season and CNY risk if needed (these aren't direct DB fields)
    let filtered = orders;
    if (season) {
      // Filter by justification containing season info
      filtered = filtered.filter(o => o.justification?.includes(season));
    }
    if (cnyRisk === 'true') {
      filtered = filtered.filter(o => o.justification?.includes('CNY'));
    }

    return NextResponse.json({
      success: true,
      data: {
        orders: filtered.map(o => ({
          id: o.id,
          productId: o.productId,
          product: o.product,
          orderDate: o.orderDate.toISOString().split('T')[0],
          quantity: o.quantity,
          orderTrigger: o.orderTrigger,
          totalLeadTime: o.totalLeadTime,
          reorderHitDate: o.reorderHitDate?.toISOString().split('T')[0] || null,
          priority: o.priority,
          status: o.status,
          justification: o.justification,
          createdAt: o.createdAt.toISOString(),
        })),
        total: filtered.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
