// ============================================
// TrimedCast - Forecast Job Manager
// In-memory job queue for forecast generation
// (Production would use Redis/BullMQ + Python FastAPI)
// ============================================

import { db } from '@/lib/db';
import { calculateEOQWithConstraints, calculateSafetyStockEnhanced } from '@/lib/forecasting/eoq-safety-stock';
import { calculateOrderTrigger } from '@/lib/forecasting/order-trigger';

export interface ForecastJob {
  jobId: string;
  tenantId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  season: string;
  method: string;
  productIds: string[];
  totalProducts: number;
  completedProducts: number;
  currentProduct: string;
  progressPct: number;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}

// In-memory job store
const jobStore = new Map<string, ForecastJob>();

export function getJob(jobId: string): ForecastJob | undefined {
  return jobStore.get(jobId);
}

export function createJob(
  jobId: string,
  tenantId: string,
  season: string,
  method: string,
  productIds: string[],
  totalProducts: number
): ForecastJob {
  const job: ForecastJob = {
    jobId,
    tenantId,
    status: 'queued',
    season,
    method,
    productIds,
    totalProducts,
    completedProducts: 0,
    currentProduct: '',
    progressPct: 0,
    startedAt: null,
    completedAt: null,
    error: null,
  };
  jobStore.set(jobId, job);
  return job;
}

// Process a forecast job asynchronously
export async function processJob(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;

  job.status = 'processing';
  job.startedAt = new Date();

  try {
    const products = await db.product.findMany({
      where: {
        id: { in: job.productIds },
        tenantId: job.tenantId,
        isActive: true,
      },
      include: {
        inventory: true,
        salesHistory: {
          where: { date: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } },
          orderBy: { date: 'asc' },
        },
        supplier: true,
      },
    });

    const settings = await db.forecastSetting.findFirst({
      where: { tenantId: job.tenantId },
    });

    const confidenceLevel = settings?.confidenceLevel || 0.95;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      job.currentProduct = product.name;
      job.completedProducts = i;
      job.progressPct = Math.round((i / products.length) * 100);

      const salesData = product.salesHistory;
      const avgMonthlyDemand = salesData.length > 0
        ? salesData.reduce((sum, s) => sum + s.quantity, 0) / Math.max(1, Math.ceil(salesData.length / 30))
        : product.eoq || 50;

      // Seasonal adjustment
      const seasonalWeights: Record<string, number> = {
        winter: product.seasonWeight || 1.3,
        summer: 1.0,
        monsoon: product.seasonalityType === 'monsoon_dip' ? 0.7 : 0.9,
        pre_winter: 1.1,
      };
      const seasonalWeight = seasonalWeights[job.season] || 1.0;
      const seasonalAdjustedDemand = Math.round(avgMonthlyDemand * seasonalWeight);
      const consensusDemand = Math.round(seasonalAdjustedDemand * 1.03);

      // Confidence bounds
      const stdDev = salesData.length > 1
        ? Math.sqrt(salesData.reduce((sum, s) => sum + Math.pow(s.quantity - avgMonthlyDemand, 2), 0) / salesData.length)
        : avgMonthlyDemand * 0.2;
      const zScore = 1.96;
      const lowerBound = Math.max(0, consensusDemand - zScore * stdDev);
      const upperBound = consensusDemand + zScore * stdDev;

      // MAPE
      const mape = salesData.length > 2
        ? (salesData.reduce((sum, s) => sum + Math.abs(s.quantity - avgMonthlyDemand) / Math.max(1, s.quantity), 0) / salesData.length) * 100
        : 12.0;

      // Save forecast
      await db.forecast.create({
        data: {
          tenantId: job.tenantId,
          productId: product.id,
          forecastDate: new Date(),
          predictedQty: consensusDemand,
          lowerBound: Math.round(lowerBound),
          upperBound: Math.round(upperBound),
          model: job.method,
          confidence: confidenceLevel,
          mape: Math.round(mape * 100) / 100,
          seasonDetected: job.season,
          cnyRiskFlag: false,
        },
      });

      // Generate recommended order
      const inventory = product.inventory[0];
      if (inventory) {
        const qtyAvailable = inventory.availableStock;
        const unitCost = product.unitCost || 100;
        const supplierLeadTime = product.leadTimeDays || product.supplier?.leadTimeDays || 90;
        const mae = mape * avgMonthlyDemand / 100;

        // EOQ
        const eoqResult = calculateEOQWithConstraints({
          annualDemand: consensusDemand * 12,
          unitCost,
          orderingCost: 500,
          holdingCostPct: 0.20,
          supplierMoq: product.minOrderQty,
          maxStockQty: product.maxStock,
          currentStock: qtyAvailable,
        });

        // Safety stock
        const ssResult = calculateSafetyStockEnhanced({
          eoq: eoqResult.eoq,
          mae,
          meanLeadTimeDays: supplierLeadTime,
          sigmaLt: 15,
          serviceLevel: confidenceLevel,
          reviewPeriodDays: 10,
        });

        // Order trigger
        const triggerResult = calculateOrderTrigger({
          currentStock: qtyAvailable,
          reorderPoint: ssResult.reorderPoint,
          dailyConsumptionRate: consensusDemand / 30,
          mfgDays: Math.round(supplierLeadTime * 0.6),
          shipmentDays: Math.round(supplierLeadTime * 0.35),
          customsDays: Math.round(supplierLeadTime * 0.05),
        });

        const isBelowReorderPoint = qtyAvailable <= ssResult.reorderPoint;
        const orderNeeded = isBelowReorderPoint || triggerResult.shouldOrderNow;

        if (orderNeeded) {
          const orderQty = Math.max(
            eoqResult.eoq,
            ssResult.reorderPoint - qtyAvailable + ssResult.safetyStock
          );

          let urgency = 'normal';
          if (qtyAvailable <= (inventory.safetyStock || 0)) urgency = 'critical';
          else if (isBelowReorderPoint) urgency = 'high';

          // Safely extract date values from trigger result
          const orderTriggerDate = triggerResult.orderTriggerDate instanceof Date && !isNaN(triggerResult.orderTriggerDate.getTime())
            ? triggerResult.orderTriggerDate : new Date();
          const reorderHitDate = triggerResult.reorderHitDate instanceof Date && !isNaN(triggerResult.reorderHitDate.getTime())
            ? triggerResult.reorderHitDate : null;
          const expectedAvailableDate = triggerResult.expectedAvailableDate instanceof Date && !isNaN(triggerResult.expectedAvailableDate.getTime())
            ? triggerResult.expectedAvailableDate : null;

          // cnyRisk may be an object or boolean
          const cnyRiskBool = typeof triggerResult.cnyRisk === 'boolean'
            ? triggerResult.cnyRisk
            : (triggerResult.cnyRisk as Record<string, unknown>)?.hasRisk === true;

          // timeline - serialize safely
          let timelineJson: string | null = null;
          if (triggerResult.timeline) {
            try {
              // Convert Date objects in timeline to ISO strings
              const tl = triggerResult.timeline as Record<string, unknown>;
              const safeTimeline: Record<string, unknown> = {};
              for (const [k, v] of Object.entries(tl)) {
                safeTimeline[k] = v instanceof Date ? v.toISOString() : v;
              }
              timelineJson = JSON.stringify(safeTimeline);
            } catch { timelineJson = null; }
          }

          await db.recommendedOrder.create({
            data: {
              tenantId: job.tenantId,
              productId: product.id,
              orderDate: orderTriggerDate,
              quantity: orderQty,
              suggestedQty: eoqResult.eoq || 0,
              orderTrigger: isBelowReorderPoint ? 'reorder_point' : 'seasonal_uplift',
              totalLeadTime: supplierLeadTime,
              reorderHitDate,
              expectedDeliveryDate: expectedAvailableDate,
              urgency,
              priority: urgency === 'critical' ? 'urgent' : urgency === 'high' ? 'high' : 'normal',
              status: 'pending',
              cnyRisk: cnyRiskBool,
              shipmentMode: 'sea',
              unitCost,
              totalCost: orderQty * unitCost,
              timeline: timelineJson,
            },
          });
        }
      }
    }

    job.status = 'completed';
    job.completedProducts = products.length;
    job.progressPct = 100;
    job.completedAt = new Date();
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.completedAt = new Date();
  }
}
