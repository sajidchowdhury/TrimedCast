// ============================================
// GET /api/soe/notifications
// S&OE Notifications — alerts for stockout risk,
// MAPE breaches, CNY risk, overstock, delivery delays
//
// POST /api/soe/notifications
// Mark notifications as read
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, validationError } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';
import { format, differenceInDays, subDays } from 'date-fns';
export const runtime = 'nodejs';


// --- Notification Types ---

interface SOENotification {
  id: string;
  type: 'stockout_risk' | 'mape_breach' | 'cny_risk' | 'overstock' | 'delivery_delay';
  severity: 'critical' | 'high' | 'normal';
  title: string;
  description: string;
  productId?: string;
  productName?: string;
  sku?: string;
  relatedEntityId?: string;
  createdAt: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
}

// In-memory notification read state (for demo; production would use DB)
const notificationReadState = new Map<string, boolean>();

// --- GET: Fetch Notifications ---

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    const now = new Date();
    const notifications: SOENotification[] = [];

    // Run parallel queries
    const [
      inventoryData,
      forecasts,
      cnyRiskOrders,
      delayedPOs,
    ] = await Promise.all([
      // Inventory with stock details
      db.inventory.findMany({
        where: { tenantId },
        include: { product: { select: { id: true, sku: true, name: true, category: true, unitCost: true, supplierId: true } } },
      }),

      // Recent forecasts
      db.forecast.findMany({
        where: { tenantId, forecastDate: { gte: subDays(now, 30) } },
        include: { product: { select: { id: true, sku: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),

      // Recommended orders with CNY risk
      db.recommendedOrder.findMany({
        where: { tenantId, cnyRisk: true, status: 'pending' },
        include: { product: { select: { id: true, sku: true, name: true } } },
      }),

      // Purchase orders that might be delayed
      db.purchaseOrder.findMany({
        where: {
          tenantId,
          status: { in: ['in_transit', 'shipped', 'confirmed'] },
          expectedDelivery: { lte: now },
        },
      }),
    ]);

    // Recent sales for consumption rates
    const recentSales = await db.salesHistory.findMany({
      where: { tenantId, date: { gte: subDays(now, 30) } },
    });
    const salesByProduct = new Map<string, number>();
    for (const sale of recentSales) {
      salesByProduct.set(sale.productId, (salesByProduct.get(sale.productId) || 0) + sale.quantity);
    }

    // --- Stockout risk notifications ---
    for (const inv of inventoryData) {
      const safetyStock = inv.safetyStock || 0;
      if (inv.availableStock <= safetyStock) {
        const totalSold = salesByProduct.get(inv.productId) || 0;
        const dailyConsumption = totalSold / 30;
        const daysUntilStockout = dailyConsumption > 0 ? inv.availableStock / dailyConsumption : 999;
        const severity = daysUntilStockout <= 7 ? 'critical' : daysUntilStockout <= 14 ? 'high' : 'normal';

        notifications.push({
          id: `notif-stockout-${inv.id}`,
          type: 'stockout_risk',
          severity,
          title: `Stockout risk: ${inv.product.name}`,
          description: `Available stock ${inv.availableStock} <= safety stock ${safetyStock}. Days until stockout: ${Math.round(daysUntilStockout * 10) / 10}`,
          productId: inv.productId,
          productName: inv.product.name,
          sku: inv.product.sku,
          createdAt: format(now, "yyyy-MM-dd'T'HH:mm:ss"),
          isRead: notificationReadState.get(`notif-stockout-${inv.id}`) || false,
          metadata: {
            currentStock: inv.availableStock,
            safetyStock,
            daysUntilStockout: Math.round(daysUntilStockout * 10) / 10,
          },
        });
      }
    }

    // --- MAPE breach notifications ---
    const mapeByProduct = new Map<string, { mape: number; productId: string; sku: string; name: string; createdAt: Date }>();
    for (const f of forecasts) {
      if (f.mape != null && f.mape > 10) {
        const existing = mapeByProduct.get(f.productId);
        if (!existing || f.mape > existing.mape) {
          mapeByProduct.set(f.productId, {
            mape: f.mape,
            productId: f.productId,
            sku: f.product.sku,
            name: f.product.name,
            createdAt: f.createdAt,
          });
        }
      }
    }
    for (const [, breach] of mapeByProduct) {
      notifications.push({
        id: `notif-mape-${breach.productId}`,
        type: 'mape_breach',
        severity: breach.mape > 20 ? 'critical' : 'high',
        title: `MAPE breach: ${breach.name}`,
        description: `Forecast MAPE at ${Math.round(breach.mape * 10) / 10}% exceeds 10% threshold. Consider recalibration.`,
        productId: breach.productId,
        productName: breach.name,
        sku: breach.sku,
        createdAt: format(breach.createdAt, "yyyy-MM-dd'T'HH:mm:ss"),
        isRead: notificationReadState.get(`notif-mape-${breach.productId}`) || false,
        metadata: { currentMAPE: Math.round(breach.mape * 10) / 10, threshold: 10 },
      });
    }

    // --- CNY risk notifications ---
    if (cnyRiskOrders.length > 0) {
      notifications.push({
        id: 'notif-cny-risk',
        type: 'cny_risk',
        severity: 'high',
        title: `CNY risk: ${cnyRiskOrders.length} pending orders affected`,
        description: `${cnyRiskOrders.length} recommended orders have CNY risk. Chinese New Year factory closures (late Jan - mid Feb) may delay shipments by 2-3 weeks.`,
        relatedEntityId: cnyRiskOrders[0].id,
        createdAt: format(now, "yyyy-MM-dd'T'HH:mm:ss"),
        isRead: notificationReadState.get('notif-cny-risk') || false,
        metadata: {
          affectedOrders: cnyRiskOrders.length,
          products: cnyRiskOrders.map((ro) => ro.product.name),
        },
      });
    }

    // --- Overstock notifications ---
    for (const inv of inventoryData) {
      if (inv.maxStockLevel && inv.currentStock > inv.maxStockLevel * 0.9) {
        const utilization = Math.round((inv.currentStock / inv.maxStockLevel) * 100);
        notifications.push({
          id: `notif-overstock-${inv.id}`,
          type: 'overstock',
          severity: 'normal',
          title: `Overstock: ${inv.product.name}`,
          description: `Stock at ${inv.currentStock} units (${utilization}% of max ${inv.maxStockLevel}). Consider deferring pending orders.`,
          productId: inv.productId,
          productName: inv.product.name,
          sku: inv.product.sku,
          createdAt: format(now, "yyyy-MM-dd'T'HH:mm:ss"),
          isRead: notificationReadState.get(`notif-overstock-${inv.id}`) || false,
          metadata: { currentStock: inv.currentStock, maxStock: inv.maxStockLevel, utilization },
        });
      }
    }

    // --- Delivery delay notifications ---
    for (const po of delayedPOs) {
      const daysDelayed = po.expectedDelivery
        ? differenceInDays(now, new Date(po.expectedDelivery))
        : 0;

      if (daysDelayed > 0) {
        const items = po.items ? JSON.parse(po.items) : [];
        const firstItem = items[0] || {};
        const product = inventoryData.find((inv) => inv.productId === firstItem.productId);

        notifications.push({
          id: `notif-delay-${po.id}`,
          type: 'delivery_delay',
          severity: daysDelayed > 14 ? 'critical' : daysDelayed > 7 ? 'high' : 'normal',
          title: `Delivery delay: PO ${po.poNumber}`,
          description: `PO ${po.poNumber} is ${daysDelayed} days past expected delivery date. Current status: ${po.status}.`,
          relatedEntityId: po.id,
          productName: product?.product.name || 'Unknown Product',
          createdAt: format(now, "yyyy-MM-dd'T'HH:mm:ss"),
          isRead: notificationReadState.get(`notif-delay-${po.id}`) || false,
          metadata: { poNumber: po.poNumber, daysDelayed, status: po.status },
        });
      }
    }

    // Sort: unread first, then by severity
    const severityOrder = { critical: 0, high: 1, normal: 2 };
    notifications.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return apiSuccess({
      notifications,
      summary: {
        total: notifications.length,
        unread: unreadCount,
        byType: {
          stockout_risk: notifications.filter((n) => n.type === 'stockout_risk').length,
          mape_breach: notifications.filter((n) => n.type === 'mape_breach').length,
          cny_risk: notifications.filter((n) => n.type === 'cny_risk').length,
          overstock: notifications.filter((n) => n.type === 'overstock').length,
          delivery_delay: notifications.filter((n) => n.type === 'delivery_delay').length,
        },
        bySeverity: {
          critical: notifications.filter((n) => n.severity === 'critical').length,
          high: notifications.filter((n) => n.severity === 'high').length,
          normal: notifications.filter((n) => n.severity === 'normal').length,
        },
      },
    });
  } catch (error) {
    console.error('[SOE/Notifications/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to load S&OE notifications' }, 500);
  }
}

// --- POST: Mark Notifications as Read ---

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationIds } = body as { notificationIds?: string[] };

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return validationError('notificationIds', 'Array of notification IDs is required');
    }

    // Mark each as read in our in-memory store
    for (const id of notificationIds) {
      notificationReadState.set(id, true);
    }

    return apiSuccess({
      markedRead: notificationIds.length,
      notificationIds,
    });
  } catch (error) {
    console.error('[SOE/Notifications/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to mark notifications as read' }, 500);
  }
}
