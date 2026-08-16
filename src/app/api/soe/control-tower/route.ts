// ============================================
// GET /api/soe/control-tower
// S&OE Control Tower — 0-3 month horizon
// Aggregates: stockout alerts, MAPE breaches,
// upcoming deliveries, demand forecast, critical actions
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';
import { format, addMonths, startOfMonth, endOfMonth, differenceInDays, subDays } from 'date-fns';

// --- Types ---

interface StockoutAlert {
  productId: string;
  sku: string;
  productName: string;
  currentStock: number;
  safetyStock: number;
  dailyConsumption: number;
  daysUntilStockout: number;
  urgency: 'critical' | 'high' | 'normal';
  recommendedAction: string;
  canAutoOrder: boolean;
}

interface MAPEBreach {
  productId: string;
  sku: string;
  productName: string;
  currentMAPE: number;
  threshold: number;
  lastRecalibratedAt: string | null;
  suggestedAction: string;
}

interface UpcomingDelivery {
  purchaseOrderId: string;
  productName: string;
  expectedDate: string;
  quantity: number;
  status: string;
  daysUntilArrival: number;
}

interface MonthlyDemandRow {
  month: string;
  season: string;
  totalForecastDemand: number;
  totalActualDemand: number;
  forecastAccuracy: number;
  gap: number;
}

interface CriticalAction {
  id: string;
  type: 'stockout_order' | 'recalibrate' | 'cny_reroute' | 'overstock_reduction' | 'sop_stage_advance';
  priority: 'critical' | 'high' | 'normal';
  title: string;
  description: string;
  productId?: string;
  impactBDT?: number;
  dueDate: string;
  isActionable: boolean;
}

interface SOEControlTowerData {
  horizon: { startMonth: string; endMonth: string; totalMonths: number };
  summary: {
    totalSKUs: number;
    stockoutRiskCount: number;
    overstockCount: number;
    pendingOrdersCount: number;
    mapeBreachesCount: number;
    totalRecommendedSpendBDT: number;
    criticalActionsCount: number;
  };
  stockoutAlerts: StockoutAlert[];
  mapeBreaches: MAPEBreach[];
  upcomingDeliveries: UpcomingDelivery[];
  monthlyDemandForecast: MonthlyDemandRow[];
  criticalActions: CriticalAction[];
}

// --- Helpers ---

function getBDSeason(month: number): string {
  if (month >= 11 || month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'summer';
  if (month >= 6 && month <= 9) return 'monsoon';
  return 'pre_winter';
}

function getUrgency(days: number): 'critical' | 'high' | 'normal' {
  if (days <= 7) return 'critical';
  if (days <= 14) return 'high';
  return 'normal';
}

function getRecommendedAction(urgency: string, canAutoOrder: boolean): string {
  if (urgency === 'critical') return canAutoOrder ? 'Auto-order from approved supplier immediately' : 'Expedite emergency purchase order';
  if (urgency === 'high') return canAutoOrder ? 'Place order with approved supplier' : 'Initiate manual procurement process';
  return 'Monitor and schedule order within reorder window';
}

// --- Demo Data Fallback ---

function getDemoData(): SOEControlTowerData {
  const now = new Date();
  const startMonth = format(startOfMonth(now), 'yyyy-MM');
  const endMonth = format(endOfMonth(addMonths(now, 2)), 'yyyy-MM');

  return {
    horizon: { startMonth, endMonth, totalMonths: 3 },
    summary: {
      totalSKUs: 5,
      stockoutRiskCount: 2,
      overstockCount: 1,
      pendingOrdersCount: 3,
      mapeBreachesCount: 1,
      totalRecommendedSpendBDT: 135000,
      criticalActionsCount: 4,
    },
    stockoutAlerts: [
      {
        productId: 'demo-1',
        sku: 'TRE-BJ-Discover',
        productName: 'Rear Tire Bajaj Discover',
        currentStock: 8,
        safetyStock: 15,
        dailyConsumption: 1.2,
        daysUntilStockout: 6.7,
        urgency: 'critical',
        recommendedAction: 'Expedite emergency purchase order',
        canAutoOrder: true,
      },
      {
        productId: 'demo-2',
        sku: 'BRP-BJ-Discover',
        productName: 'Brake Pad Bajaj Discover',
        currentStock: 12,
        safetyStock: 15,
        dailyConsumption: 0.8,
        daysUntilStockout: 15,
        urgency: 'high',
        recommendedAction: 'Place order with approved supplier',
        canAutoOrder: true,
      },
    ],
    mapeBreaches: [
      {
        productId: 'demo-3',
        sku: 'TRE-BJ-Discover',
        productName: 'Rear Tire Bajaj Discover',
        currentMAPE: 18.5,
        threshold: 10,
        lastRecalibratedAt: null,
        suggestedAction: 'Recalibrate forecast model — monsoon_dip seasonality may be shifting',
      },
    ],
    upcomingDeliveries: [
      {
        purchaseOrderId: 'po-demo-1',
        productName: 'Brake Pad Bajaj Discover',
        expectedDate: '2025-07-15',
        quantity: 200,
        status: 'in_transit',
        daysUntilArrival: 12,
      },
      {
        purchaseOrderId: 'po-demo-2',
        productName: 'Oil Filter Yamaha 100cc',
        expectedDate: '2025-07-08',
        quantity: 200,
        status: 'confirmed',
        daysUntilArrival: 5,
      },
    ],
    monthlyDemandForecast: [
      { month: format(startOfMonth(now), 'yyyy-MM'), season: getBDSeason(now.getMonth() + 1), totalForecastDemand: 850, totalActualDemand: 780, forecastAccuracy: 91.8, gap: 70 },
      { month: format(startOfMonth(addMonths(now, 1)), 'yyyy-MM'), season: getBDSeason(addMonths(now, 1).getMonth() + 1), totalForecastDemand: 720, totalActualDemand: 0, forecastAccuracy: 0, gap: 720 },
      { month: format(startOfMonth(addMonths(now, 2)), 'yyyy-MM'), season: getBDSeason(addMonths(now, 2).getMonth() + 1), totalForecastDemand: 910, totalActualDemand: 0, forecastAccuracy: 0, gap: 910 },
    ],
    criticalActions: [
      { id: 'ca-1', type: 'stockout_order', priority: 'critical', title: 'Emergency order: Rear Tire Bajaj Discover', description: 'Stock at 8 units, below safety stock of 15. Days until stockout: 6.7', productId: 'demo-1', impactBDT: 26400, dueDate: format(addMonths(now, 0), 'yyyy-MM-dd'), isActionable: true },
      { id: 'ca-2', type: 'recalibrate', priority: 'high', title: 'Recalibrate forecast: Rear Tire', description: 'MAPE at 18.5% exceeds 10% threshold. Model may not capture shifting monsoon patterns.', productId: 'demo-3', impactBDT: 8000, dueDate: format(addMonths(now, 0), 'yyyy-MM-dd'), isActionable: true },
      { id: 'ca-3', type: 'cny_reroute', priority: 'high', title: 'CNY risk: Pending orders from Jialing Parts', description: '2 orders may be delayed due to Chinese New Year factory closures (Jan 25 - Feb 8)', impactBDT: 45000, dueDate: format(addMonths(now, 0), 'yyyy-MM-dd'), isActionable: true },
      { id: 'ca-4', type: 'sop_stage_advance', priority: 'normal', title: 'Advance S&OP cycle to approval stage', description: 'Validation stage complete for Monsoon 2025 S&OP. Ready for cross-functional approval.', dueDate: format(addMonths(now, 1), 'yyyy-MM-dd'), isActionable: true },
    ],
  };
}

// --- Main Handler ---

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    const now = new Date();
    const horizonStart = startOfMonth(now);
    const horizonEnd = endOfMonth(addMonths(now, 2));

    // Run all queries in parallel
    const [
      products,
      inventoryData,
      forecasts,
      upcomingPOs,
      pendingOrders,
      recommendedOrders,
      recentSales,
      sopCycles,
      suppliers,
    ] = await Promise.all([
      // All active products
      db.product.findMany({
        where: { tenantId, isActive: true },
        include: { supplier: true },
      }),

      // All inventory
      db.inventory.findMany({
        where: { tenantId },
        include: { product: { select: { id: true, sku: true, name: true, category: true, unitCost: true, supplierId: true } } },
      }),

      // Forecasts in the 0-3 month window
      db.forecast.findMany({
        where: {
          tenantId,
          forecastDate: { gte: horizonStart, lte: horizonEnd },
        },
        include: { product: { select: { id: true, sku: true, name: true } } },
      }),

      // Upcoming deliveries (in_transit, shipped, customs, confirmed)
      db.purchaseOrder.findMany({
        where: {
          tenantId,
          status: { in: ['in_transit', 'shipped', 'customs', 'confirmed'] },
          expectedDelivery: { gte: now },
        },
        orderBy: { expectedDelivery: 'asc' },
      }),

      // Pending recommended orders count
      db.recommendedOrder.count({
        where: { tenantId, status: 'pending' },
      }),

      // Pending recommended orders (for spend calculation)
      db.recommendedOrder.findMany({
        where: { tenantId, status: 'pending' },
        include: { product: { select: { unitCost: true } } },
      }),

      // Recent 30 days sales for consumption rate
      db.salesHistory.findMany({
        where: {
          tenantId,
          date: { gte: subDays(now, 30) },
        },
      }),

      // Active SOP cycles
      db.sopCycle.findMany({
        where: { tenantId, status: 'active' },
      }),

      // Suppliers (for CNY risk check)
      db.supplier.findMany({
        where: { tenantId, isActive: true },
      }),
    ]);

    // If no real data, return demo
    if (products.length === 0 && inventoryData.length === 0) {
      return apiSuccess(getDemoData());
    }

    // --- Build stockout alerts ---
    const salesByProduct = new Map<string, number>();
    for (const sale of recentSales) {
      salesByProduct.set(sale.productId, (salesByProduct.get(sale.productId) || 0) + sale.quantity);
    }

    const stockoutAlerts: StockoutAlert[] = [];
    for (const inv of inventoryData) {
      const safetyStock = inv.safetyStock || 0;
      if (inv.availableStock <= safetyStock) {
        const totalSold = salesByProduct.get(inv.productId) || 0;
        const dailyConsumption = totalSold / 30;
        const daysUntilStockout = dailyConsumption > 0 ? inv.availableStock / dailyConsumption : 999;
        const urgency = getUrgency(daysUntilStockout);
        const hasSupplier = products.find((p) => p.id === inv.productId)?.supplierId != null;
        const canAutoOrder = hasSupplier;

        stockoutAlerts.push({
          productId: inv.productId,
          sku: inv.product.sku,
          productName: inv.product.name,
          currentStock: inv.availableStock,
          safetyStock,
          dailyConsumption: Math.round(dailyConsumption * 100) / 100,
          daysUntilStockout: Math.round(daysUntilStockout * 10) / 10,
          urgency,
          recommendedAction: getRecommendedAction(urgency, canAutoOrder),
          canAutoOrder,
        });
      }
    }
    stockoutAlerts.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

    // --- Build MAPE breach list ---
    const mapeBreaches: MAPEBreach[] = [];
    const mapeByProduct = new Map<string, { mape: number; productId: string; sku: string; name: string }>();
    for (const f of forecasts) {
      if (f.mape != null && f.mape > 10) {
        const existing = mapeByProduct.get(f.productId);
        if (!existing || f.mape > existing.mape) {
          mapeByProduct.set(f.productId, {
            mape: f.mape,
            productId: f.productId,
            sku: f.product.sku,
            name: f.product.name,
          });
        }
      }
    }
    for (const [, breach] of mapeByProduct) {
      mapeBreaches.push({
        productId: breach.productId,
        sku: breach.sku,
        productName: breach.name,
        currentMAPE: Math.round(breach.mape * 10) / 10,
        threshold: 10,
        lastRecalibratedAt: null,
        suggestedAction: `Recalibrate forecast model — MAPE at ${Math.round(breach.mape * 10) / 10}% exceeds 10% threshold`,
      });
    }

    // --- Build upcoming deliveries ---
    const upcomingDeliveries: UpcomingDelivery[] = upcomingPOs.map((po) => {
      const items = po.items ? JSON.parse(po.items) : [];
      const firstItem = items[0] || {};
      const product = products.find((p) => p.id === firstItem.productId);
      const daysUntilArrival = po.expectedDelivery
        ? differenceInDays(new Date(po.expectedDelivery), now)
        : 0;

      return {
        purchaseOrderId: po.id,
        productName: product?.name || 'Unknown Product',
        expectedDate: po.expectedDelivery ? format(new Date(po.expectedDelivery), 'yyyy-MM-dd') : '',
        quantity: firstItem.quantity || 0,
        status: po.status,
        daysUntilArrival: Math.max(0, daysUntilArrival),
      };
    });

    // --- Build monthly demand forecast ---
    const monthlyDemandForecast: MonthlyDemandRow[] = [];
    for (let m = 0; m < 3; m++) {
      const monthDate = addMonths(now, m);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthStart, 'yyyy-MM');

      // Sum forecast demand for this month
      const monthForecasts = forecasts.filter((f) => {
        const fd = new Date(f.forecastDate);
        return fd >= monthStart && fd <= monthEnd;
      });
      const totalForecastDemand = monthForecasts.reduce((sum, f) => sum + f.predictedQty, 0);

      // Sum actual demand from sales history
      const actualSales = recentSales.filter((s) => {
        const sd = new Date(s.date);
        return sd >= monthStart && sd <= monthEnd;
      });
      const totalActualDemand = actualSales.reduce((sum, s) => sum + s.quantity, 0);

      // Calculate accuracy
      const avgMape = monthForecasts.length > 0
        ? monthForecasts.reduce((sum, f) => sum + (f.mape || 0), 0) / monthForecasts.length
        : 0;
      const forecastAccuracy = totalActualDemand > 0 ? Math.max(0, 100 - avgMape) : 0;
      const gap = totalForecastDemand - totalActualDemand;

      monthlyDemandForecast.push({
        month: monthKey,
        season: getBDSeason(monthDate.getMonth() + 1),
        totalForecastDemand: Math.round(totalForecastDemand),
        totalActualDemand: Math.round(totalActualDemand),
        forecastAccuracy: Math.round(forecastAccuracy * 10) / 10,
        gap: Math.round(gap),
      });
    }

    // --- Build critical actions ---
    const criticalActions: CriticalAction[] = [];
    let actionCounter = 0;

    // Stockout-based actions
    for (const alert of stockoutAlerts) {
      actionCounter++;
      criticalActions.push({
        id: `ca-${actionCounter}`,
        type: 'stockout_order',
        priority: alert.urgency,
        title: `${alert.urgency === 'critical' ? 'Emergency' : 'Urgent'} order: ${alert.productName}`,
        description: `Stock at ${alert.currentStock} units, below safety stock of ${alert.safetyStock}. Days until stockout: ${alert.daysUntilStockout}`,
        productId: alert.productId,
        impactBDT: Math.round(alert.dailyConsumption * 30 * (products.find((p) => p.id === alert.productId)?.unitCost || 0)),
        dueDate: format(now, 'yyyy-MM-dd'),
        isActionable: alert.canAutoOrder,
      });
    }

    // MAPE breach actions
    for (const breach of mapeBreaches) {
      actionCounter++;
      criticalActions.push({
        id: `ca-${actionCounter}`,
        type: 'recalibrate',
        priority: breach.currentMAPE > 20 ? 'critical' : 'high',
        title: `Recalibrate forecast: ${breach.productName}`,
        description: `MAPE at ${breach.currentMAPE}% exceeds ${breach.threshold}% threshold.`,
        productId: breach.productId,
        impactBDT: 0,
        dueDate: format(now, 'yyyy-MM-dd'),
        isActionable: true,
      });
    }

    // CNY risk actions
    const cnyAffectedSuppliers = suppliers.filter((s) => s.isCnyAffected);
    if (cnyAffectedSuppliers.length > 0) {
      const cnyAtRiskOrders = recommendedOrders.filter((ro) => ro.cnyRisk);
      if (cnyAtRiskOrders.length > 0) {
        actionCounter++;
        const totalCnySpend = cnyAtRiskOrders.reduce((sum, ro) => sum + (ro.totalCost || 0), 0);
        criticalActions.push({
          id: `ca-${actionCounter}`,
          type: 'cny_reroute',
          priority: 'high',
          title: `CNY risk: ${cnyAtRiskOrders.length} orders from CNY-affected suppliers`,
          description: `${cnyAtRiskOrders.length} pending orders may be delayed due to Chinese New Year factory closures. Consider air-freight or alternate suppliers.`,
          impactBDT: Math.round(totalCnySpend),
          dueDate: format(now, 'yyyy-MM-dd'),
          isActionable: true,
        });
      }
    }

    // Overstock reduction actions
    const overstockItems = inventoryData.filter(
      (inv) => inv.maxStockLevel && inv.currentStock > inv.maxStockLevel * 0.9
    );
    for (const item of overstockItems) {
      actionCounter++;
      criticalActions.push({
        id: `ca-${actionCounter}`,
        type: 'overstock_reduction',
        priority: 'normal',
        title: `Overstock: ${item.product.name}`,
        description: `Current stock ${item.currentStock} exceeds 90% of max level ${item.maxStockLevel}. Consider deferring pending orders.`,
        productId: item.productId,
        impactBDT: 0,
        dueDate: format(addMonths(now, 1), 'yyyy-MM-dd'),
        isActionable: true,
      });
    }

    // SOP stage advance actions
    for (const cycle of sopCycles) {
      if (cycle.stage === 'validation' && cycle.status === 'active') {
        actionCounter++;
        criticalActions.push({
          id: `ca-${actionCounter}`,
          type: 'sop_stage_advance',
          priority: 'normal',
          title: `Advance S&OP cycle to approval stage`,
          description: `Validation stage complete for ${cycle.name}. Ready for cross-functional approval.`,
          dueDate: format(addMonths(now, 1), 'yyyy-MM-dd'),
          isActionable: true,
        });
      }
    }

    // Sort critical actions by priority
    const priorityOrder = { critical: 0, high: 1, normal: 2 };
    criticalActions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // --- Summary ---
    const stockoutRiskCount = stockoutAlerts.length;
    const overstockCount = overstockItems.length;
    const mapeBreachesCount = mapeBreaches.length;
    const totalRecommendedSpendBDT = recommendedOrders.reduce(
      (sum, ro) => sum + (ro.totalCost || ro.quantity * (ro.product.unitCost || 0)),
      0
    );

    const result: SOEControlTowerData = {
      horizon: {
        startMonth: format(horizonStart, 'yyyy-MM'),
        endMonth: format(horizonEnd, 'yyyy-MM'),
        totalMonths: 3,
      },
      summary: {
        totalSKUs: products.length,
        stockoutRiskCount,
        overstockCount,
        pendingOrdersCount: pendingOrders,
        mapeBreachesCount,
        totalRecommendedSpendBDT: Math.round(totalRecommendedSpendBDT),
        criticalActionsCount: criticalActions.length,
      },
      stockoutAlerts,
      mapeBreaches,
      upcomingDeliveries,
      monthlyDemandForecast,
      criticalActions,
    };

    return apiSuccess(result);
  } catch (error) {
    console.error('[SOE/ControlTower/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to load S&OE control tower data' }, 500);
  }
}
