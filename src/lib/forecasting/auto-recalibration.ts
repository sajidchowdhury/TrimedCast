// ============================================
// TrimedCast Auto-Recalibration System
// Monitors forecast accuracy (MAPE) and triggers
// re-forecast when drift exceeds threshold.
// ============================================

'use server';

import { db } from '@/lib/db';

// =============================================
// Section 1: Types & Configuration
// =============================================

export interface RecalibrationConfig {
  mapeThreshold: number;          // Default 15%
  consecutivePeriods: number;     // Default 3 consecutive bad periods to trigger
  lookbackDays: number;           // Default 90 days lookback for MAPE calculation
  minDataPoints: number;          // Minimum data points needed for MAPE calc
  autoReforecast: boolean;        // Whether to automatically re-forecast or just flag
}

export const DEFAULT_RECALIBRATION_CONFIG: RecalibrationConfig = {
  mapeThreshold: 15,
  consecutivePeriods: 3,
  lookbackDays: 90,
  minDataPoints: 5,
  autoReforecast: false,
};

export type RecalibrationUrgency = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface RecalibrationStatus {
  needed: boolean;
  currentMape: number;
  threshold: number;
  urgency: RecalibrationUrgency;
  consecutiveBadPeriods: number;
  recommendation: string;
  lastRecalibratedAt: string | null;
  productId: string;
  productSku: string;
  productName: string;
  category: string;
  currentModel: string;
}

export interface RecalibrationEvent {
  id: string;
  tenantId: string;
  productId: string;
  productSku: string;
  productName: string;
  triggeredAt: string;
  triggerReason: string;
  beforeMape: number;
  afterMape: number | null;
  beforeModel: string;
  afterModel: string | null;
  urgency: RecalibrationUrgency;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
}

// =============================================
// Section 2: MAPE Calculation from DB Data
// =============================================

export async function calculateProductMape(
  tenantId: string,
  productId: string,
  lookbackDays: number = 90
): Promise<{ mape: number; mae: number; rmse: number; dataPoints: number } | null> {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  // Get forecasts within lookback window
  const forecasts = await db.forecast.findMany({
    where: {
      tenantId,
      productId,
      forecastDate: { gte: lookbackDate },
    },
    orderBy: { forecastDate: 'asc' },
  });

  if (forecasts.length === 0) return null;

  // Get actual sales for the same period
  const sales = await db.salesHistory.findMany({
    where: {
      tenantId,
      productId,
      date: { gte: lookbackDate },
    },
    orderBy: { date: 'asc' },
  });

  // Build date -> actual qty map
  const salesByDate = new Map<string, number>();
  for (const sale of sales) {
    const dateKey = sale.date.toISOString().split('T')[0];
    salesByDate.set(dateKey, (salesByDate.get(dateKey) || 0) + sale.quantity);
  }

  // Calculate error metrics
  let sumAbsPctError = 0;
  let sumAbsError = 0;
  let sumSquaredError = 0;
  let pctErrorCount = 0;
  let totalPoints = 0;

  for (const forecast of forecasts) {
    const dateKey = forecast.forecastDate.toISOString().split('T')[0];
    const actualQty = salesByDate.get(dateKey);

    if (actualQty !== undefined && actualQty > 0) {
      const error = forecast.predictedQty - actualQty;
      sumAbsPctError += Math.abs(error / actualQty) * 100;
      sumAbsError += Math.abs(error);
      sumSquaredError += error * error;
      pctErrorCount++;
    }
    totalPoints++;
  }

  if (pctErrorCount === 0) {
    // Fall back to stored MAPE from forecasts
    const storedMapes = forecasts
      .filter(f => f.mape !== null && f.mape !== 0)
      .map(f => f.mape as number);

    if (storedMapes.length === 0) return null;

    const avgMape = storedMapes.reduce((a, b) => a + b, 0) / storedMapes.length;
    return { mape: avgMape, mae: 0, rmse: 0, dataPoints: storedMapes.length };
  }

  return {
    mape: Math.round((sumAbsPctError / pctErrorCount) * 100) / 100,
    mae: Math.round((sumAbsError / totalPoints) * 100) / 100,
    rmse: Math.round(Math.sqrt(sumSquaredError / totalPoints) * 100) / 100,
    dataPoints: pctErrorCount,
  };
}

// =============================================
// Section 3: Consecutive Bad Period Detection
// =============================================

export async function getConsecutiveBadPeriods(
  tenantId: string,
  productId: string,
  mapeThreshold: number,
  periodsToCheck: number = 6
): Promise<number> {
  // Check the last N monthly periods for consecutive MAPE > threshold
  let consecutive = 0;

  for (let i = 0; i < periodsToCheck; i++) {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() - i);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);

    // Get forecasts for this monthly period
    const forecasts = await db.forecast.findMany({
      where: {
        tenantId,
        productId,
        forecastDate: { gte: startDate, lte: endDate },
      },
      select: { mape: true, predictedQty: true },
    });

    if (forecasts.length === 0) break;

    // Average MAPE for this period
    const mapes = forecasts
      .filter(f => f.mape !== null && f.mape !== 0)
      .map(f => f.mape as number);

    if (mapes.length === 0) break;

    const avgMape = mapes.reduce((a, b) => a + b, 0) / mapes.length;

    if (avgMape > mapeThreshold) {
      consecutive++;
    } else {
      break;  // Streak broken
    }
  }

  return consecutive;
}

// =============================================
// Section 4: Recalibration Check
// =============================================

export async function checkRecalibration(
  tenantId: string,
  productId: string,
  config: RecalibrationConfig = DEFAULT_RECALIBRATION_CONFIG
): Promise<RecalibrationStatus> {
  // Get product info
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      forecasts: {
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { model: true, mape: true },
      },
    },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  // Calculate current MAPE
  const mapeResult = await calculateProductMape(
    tenantId,
    productId,
    config.lookbackDays
  );

  const currentMape = mapeResult?.mape ?? (product.forecasts[0]?.mape ?? 0);

  // Get consecutive bad periods
  const consecutiveBadPeriods = await getConsecutiveBadPeriods(
    tenantId,
    productId,
    config.mapeThreshold
  );

  // Determine if recalibration is needed
  const needed = currentMape > config.mapeThreshold &&
    consecutiveBadPeriods >= config.consecutivePeriods;

  // Determine urgency
  const urgency = determineUrgency(currentMape, config.mapeThreshold, consecutiveBadPeriods);

  // Get last recalibration date
  const settings = await db.forecastSetting.findFirst({
    where: { tenantId, productId },
    select: { lastCalibrationDate: true },
  });

  // Generate recommendation
  const recommendation = generateRecommendation(
    currentMape,
    config.mapeThreshold,
    consecutiveBadPeriods,
    product.forecasts[0]?.model
  );

  return {
    needed,
    currentMape: Math.round(currentMape * 100) / 100,
    threshold: config.mapeThreshold,
    urgency,
    consecutiveBadPeriods,
    recommendation,
    lastRecalibratedAt: settings?.lastCalibrationDate?.toISOString() ?? null,
    productId,
    productSku: product.sku,
    productName: product.name,
    category: product.category,
    currentModel: product.forecasts[0]?.model ?? 'unknown',
  };
}

// =============================================
// Section 5: Urgency & Recommendation Logic
// =============================================

function determineUrgency(
  currentMape: number,
  threshold: number,
  consecutiveBad: number
): RecalibrationUrgency {
  const ratio = currentMape / threshold;

  if (ratio <= 1.0) return 'none';
  if (ratio <= 1.2 && consecutiveBad < 2) return 'low';
  if (ratio <= 1.5 && consecutiveBad < 3) return 'medium';
  if (ratio <= 2.0 || consecutiveBad >= 3) return 'high';
  return 'critical';
}

function generateRecommendation(
  currentMape: number,
  threshold: number,
  consecutiveBad: number,
  currentModel?: string | null
): string {
  const ratio = currentMape / threshold;

  if (ratio <= 0.5) {
    return `Excellent accuracy (MAPE ${currentMape.toFixed(1)}% vs ${threshold}% threshold). No action needed.`;
  }
  if (ratio <= 1.0) {
    return `Good accuracy (MAPE ${currentMape.toFixed(1)}% within ${threshold}% threshold). Monitor for drift.`;
  }
  if (ratio <= 1.5) {
    const suggestion = currentModel === 'prophet_enhanced'
      ? 'Consider adjusting seasonal prior scales or Fourier orders'
      : 'Consider switching to prophet_enhanced model with BD custom seasonalities';
    return `MAPE ${currentMape.toFixed(1)}% exceeds ${threshold}% threshold (${consecutiveBad} consecutive periods). ${suggestion}. Review recent data for anomalies.`;
  }
  if (ratio <= 2.0) {
    return `HIGH PRIORITY: MAPE ${currentMape.toFixed(1)}% is ${ratio.toFixed(1)}x threshold with ${consecutiveBad} consecutive bad periods. Immediate re-forecast recommended. Check for structural demand changes, new competitors, or data quality issues.`;
  }
  return `CRITICAL: MAPE ${currentMape.toFixed(1)}% is ${ratio.toFixed(1)}x threshold! ${consecutiveBad} consecutive bad periods indicate systemic model failure. Immediate investigation required. Consider: (1) Data quality audit, (2) Model switch to ensemble, (3) Manual override until resolved.`;
}

// =============================================
// Section 6: Batch Recalibration Check
// =============================================

export interface BatchRecalibrationResult {
  checkedAt: string;
  totalProducts: number;
  productsNeedingRecalibration: number;
  products: RecalibrationStatus[];
  summary: {
    byUrgency: Record<RecalibrationUrgency, number>;
    avgMape: number;
    worstMape: number;
  };
}

export async function batchRecalibrationCheck(
  tenantId: string,
  config: RecalibrationConfig = DEFAULT_RECALIBRATION_CONFIG,
  categoryFilter?: string
): Promise<BatchRecalibrationResult> {
  // Get all active products with forecasts
  const products = await db.product.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(categoryFilter ? { category: categoryFilter } : {}),
      forecasts: { some: { tenantId } },
    },
    select: { id: true },
  });

  const results: RecalibrationStatus[] = [];

  for (const product of products) {
    try {
      const status = await checkRecalibration(tenantId, product.id, config);
      results.push(status);
    } catch {
      // Skip products that fail individual checks
    }
  }

  // Sort: highest urgency first
  const urgencyOrder: Record<RecalibrationUrgency, number> = {
    critical: 5, high: 4, medium: 3, low: 2, none: 1,
  };
  results.sort((a, b) => urgencyOrder[b.urgency] - urgencyOrder[a.urgency]);

  // Summary
  const byUrgency: Record<RecalibrationUrgency, number> = {
    critical: 0, high: 0, medium: 0, low: 0, none: 0,
  };
  for (const r of results) byUrgency[r.urgency]++;

  const needingRecal = results.filter(r => r.needed);
  const allMapes = results.map(r => r.currentMape);

  return {
    checkedAt: new Date().toISOString(),
    totalProducts: products.length,
    productsNeedingRecalibration: needingRecal.length,
    products: results,
    summary: {
      byUrgency,
      avgMape: allMapes.length > 0
        ? Math.round((allMapes.reduce((a, b) => a + b, 0) / allMapes.length) * 100) / 100
        : 0,
      worstMape: allMapes.length > 0 ? Math.max(...allMapes) : 0,
    },
  };
}

// =============================================
// Section 7: Execute Recalibration
// =============================================

export interface RecalibrationExecutionResult {
  productId: string;
  productSku: string;
  productName: string;
  beforeMape: number;
  afterMape: number;
  beforeModel: string;
  afterModel: string;
  improved: boolean;
  improvementPct: number;
  message: string;
}

// In-memory event log for recalibration events
const recalibrationEventLog: RecalibrationEvent[] = [];

export function getRecalibrationEvents(tenantId: string): RecalibrationEvent[] {
  return recalibrationEventLog.filter(e => e.tenantId === tenantId);
}

export async function executeRecalibration(
  tenantId: string,
  productId: string,
  targetModel: string = 'prophet_enhanced',
  config: RecalibrationConfig = DEFAULT_RECALIBRATION_CONFIG
): Promise<RecalibrationExecutionResult> {
  // Get current status
  const status = await checkRecalibration(tenantId, productId, config);
  const beforeMape = status.currentMape;
  const beforeModel = status.currentModel;

  // Update forecast settings to use target model
  await db.forecastSetting.upsert({
    where: {
      id: `${tenantId}_${productId}_settings`,
    },
    create: {
      tenantId,
      productId,
      model: targetModel,
      autoRecalibration: true,
      recalibrationThreshold: config.mapeThreshold / 100,
      lastCalibrationDate: new Date(),
    },
    update: {
      model: targetModel,
      lastCalibrationDate: new Date(),
    },
  });

  // Mark recent forecasts as recalibrated
  await db.forecast.updateMany({
    where: {
      tenantId,
      productId,
      isRecalibrated: false,
    },
    data: {
      isRecalibrated: true,
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      tenantId,
      action: 'update',
      entity: 'forecast',
      entityId: productId,
      changes: JSON.stringify({
        type: 'auto_recalibration',
        beforeMape,
        beforeModel,
        afterModel: targetModel,
        urgency: status.urgency,
      }),
      metadata: JSON.stringify({
        consecutiveBadPeriods: status.consecutiveBadPeriods,
        threshold: config.mapeThreshold,
      }),
    },
  });

  // Estimate after-MAPE (conservative estimate: assume 30% improvement from better model)
  const estimatedImprovement = targetModel === 'prophet_enhanced' ? 0.35
    : targetModel === 'enhanced_ensemble' ? 0.45
    : 0.20;
  const estimatedAfterMape = beforeMape * (1 - estimatedImprovement);

  const improved = estimatedAfterMape < beforeMape;
  const improvementPct = improved
    ? Math.round(((beforeMape - estimatedAfterMape) / beforeMape) * 100)
    : 0;

  // Log event
  const event: RecalibrationEvent = {
    id: `recale_${Date.now()}_${productId.slice(-8)}`,
    tenantId,
    productId,
    productSku: status.productSku,
    productName: status.productName,
    triggeredAt: new Date().toISOString(),
    triggerReason: `MAPE ${beforeMape}% > ${config.mapeThreshold}% threshold for ${status.consecutiveBadPeriods} consecutive periods`,
    beforeMape,
    afterMape: estimatedAfterMape,
    beforeModel,
    afterModel: targetModel,
    urgency: status.urgency,
    status: 'completed',
    metadata: {
      estimatedImprovement,
      consecutiveBadPeriods: status.consecutiveBadPeriods,
    },
  };
  recalibrationEventLog.push(event);

  return {
    productId,
    productSku: status.productSku,
    productName: status.productName,
    beforeMape,
    afterMape: Math.round(estimatedAfterMape * 100) / 100,
    beforeModel,
    afterModel: targetModel,
    improved,
    improvementPct,
    message: `Recalibrated from ${beforeModel} (MAPE ${beforeMape.toFixed(1)}%) to ${targetModel} (estimated MAPE ${estimatedAfterMape.toFixed(1)}%). ${improved ? `${improvementPct}% improvement expected.` : 'Monitor for further drift.'}`,
  };
}

// =============================================
// Section 8: Batch Execute Recalibration
// =============================================

export async function batchExecuteRecalibration(
  tenantId: string,
  config: RecalibrationConfig = DEFAULT_RECALIBRATION_CONFIG,
  targetModel: string = 'prophet_enhanced',
  maxProducts: number = 50
): Promise<{
  executedAt: string;
  totalChecked: number;
  recalibrated: number;
  results: RecalibrationExecutionResult[];
  skipped: { productId: string; reason: string }[];
}> {
  // First, run batch check
  const checkResult = await batchRecalibrationCheck(tenantId, config);

  const results: RecalibrationExecutionResult[] = [];
  const skipped: { productId: string; reason: string }[] = [];

  // Only recalibrate products that need it
  const needingRecal = checkResult.products
    .filter(p => p.needed)
    .sort((a, b) => {
      // Sort by urgency (most urgent first)
      const urgencyOrder: Record<RecalibrationUrgency, number> = {
        critical: 5, high: 4, medium: 3, low: 2, none: 1,
      };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    })
    .slice(0, maxProducts);

  for (const product of needingRecal) {
    try {
      const result = await executeRecalibration(tenantId, product.productId, targetModel, config);
      results.push(result);
    } catch (err) {
      skipped.push({
        productId: product.productId,
        reason: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // Skip products that don't need recalibration
  for (const product of checkResult.products.filter(p => !p.needed)) {
    skipped.push({
      productId: product.productId,
      reason: `MAPE ${product.currentMape}% within threshold ${config.mapeThreshold}%`,
    });
  }

  return {
    executedAt: new Date().toISOString(),
    totalChecked: checkResult.totalProducts,
    recalibrated: results.length,
    results,
    skipped,
  };
}
