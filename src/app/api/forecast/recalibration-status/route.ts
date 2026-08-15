// ============================================
// TrimedCast API - Recalibration Status
// GET: Check which products need recalibration
// POST: Run recalibration check for all products
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
import {
  calculateErrorMetrics,
  checkRecalibration,
  type RecalibrationCheck,
} from '@/lib/forecasting/eoq-safety-stock';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdRaw = searchParams.get('tenantId') || 'default';
    const mapeThreshold = parseFloat(searchParams.get('mapeThreshold') || '10');
    const tenantId = await resolveTenantId(tenantIdRaw);

    // Get forecast settings for recalibration threshold
    const settings = await db.forecastSetting.findFirst({
      where: { tenantId },
    });
    const effectiveThreshold = settings?.recalibrationThreshold
      ? settings.recalibrationThreshold * 100
      : mapeThreshold;

    // Get products with forecasts
    const productsWithForecasts = await db.product.findMany({
      where: {
        tenantId,
        isActive: true,
        forecasts: { some: {} },
      },
      include: {
        forecasts: {
          where: {
            forecastDate: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { forecastDate: 'asc' },
        },
        salesHistory: {
          where: {
            date: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    const recalibrationResults: RecalibrationCheck[] = [];

    for (const product of productsWithForecasts) {
      // Build actual vs predicted arrays
      const salesByMonth = new Map<string, number>();
      for (const s of product.salesHistory) {
        const key = s.date.toISOString().split('T')[0].substring(0, 7);
        salesByMonth.set(key, (salesByMonth.get(key) || 0) + s.quantity);
      }

      const forecastByMonth = new Map<string, number>();
      for (const f of product.forecasts) {
        const key = f.forecastDate.toISOString().split('T')[0].substring(0, 7);
        forecastByMonth.set(key, (forecastByMonth.get(key) || 0) + f.predictedQty);
      }

      const actuals: number[] = [];
      const predicted: number[] = [];
      for (const [month, actual] of salesByMonth) {
        const pred = forecastByMonth.get(month);
        if (pred !== undefined) {
          actuals.push(actual);
          predicted.push(pred);
        }
      }

      if (actuals.length >= 3) {
        const metrics = calculateErrorMetrics({ actual: actuals, predicted });
        const check = checkRecalibration(
          product.id,
          product.sku,
          product.name,
          metrics,
          effectiveThreshold
        );
        recalibrationResults.push(check);
      }
    }

    // Categorize
    const critical = recalibrationResults.filter(r => r.urgency === 'critical');
    const high = recalibrationResults.filter(r => r.urgency === 'high');
    const medium = recalibrationResults.filter(r => r.urgency === 'medium');
    const low = recalibrationResults.filter(r => r.urgency === 'low');
    const healthy = recalibrationResults.filter(r => r.urgency === 'none');

    // Sort by urgency
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
    recalibrationResults.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return NextResponse.json({
      success: true,
      data: {
        products: recalibrationResults,
        summary: {
          totalChecked: recalibrationResults.length,
          needsRecalibration: critical.length + high.length + medium.length + low.length,
          critical: critical.length,
          high: high.length,
          medium: medium.length,
          low: low.length,
          healthy: healthy.length,
          mapeThreshold: effectiveThreshold,
          avgMape: recalibrationResults.length > 0
            ? Math.round((recalibrationResults.reduce((sum, r) => sum + r.currentMape, 0) / recalibrationResults.length) * 100) / 100
            : 0,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId: tenantIdRaw = 'default',
      mapeThreshold = 10,
      createAuditLogs = true,
    } = body;
    const tenantId = await resolveTenantId(tenantIdRaw);

    // Reuse GET logic
    const productsWithForecasts = await db.product.findMany({
      where: {
        tenantId,
        isActive: true,
        forecasts: { some: {} },
      },
      include: {
        forecasts: {
          where: {
            forecastDate: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { forecastDate: 'asc' },
        },
        salesHistory: {
          where: {
            date: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    const recalibrationResults: RecalibrationCheck[] = [];
    const auditEntries: Array<{ productId: string; mape: number; urgency: string; recommendation: string }> = [];

    for (const product of productsWithForecasts) {
      const salesByMonth = new Map<string, number>();
      for (const s of product.salesHistory) {
        const key = s.date.toISOString().split('T')[0].substring(0, 7);
        salesByMonth.set(key, (salesByMonth.get(key) || 0) + s.quantity);
      }
      const forecastByMonth = new Map<string, number>();
      for (const f of product.forecasts) {
        const key = f.forecastDate.toISOString().split('T')[0].substring(0, 7);
        forecastByMonth.set(key, (forecastByMonth.get(key) || 0) + f.predictedQty);
      }
      const actuals: number[] = [];
      const predicted: number[] = [];
      for (const [month, actual] of salesByMonth) {
        const pred = forecastByMonth.get(month);
        if (pred !== undefined) {
          actuals.push(actual);
          predicted.push(pred);
        }
      }
      if (actuals.length >= 3) {
        const metrics = calculateErrorMetrics({ actual: actuals, predicted });
        const check = checkRecalibration(product.id, product.sku, product.name, metrics, mapeThreshold);
        recalibrationResults.push(check);
        if (check.needsRecalibration) {
          auditEntries.push({
            productId: product.id,
            mape: check.currentMape,
            urgency: check.urgency,
            recommendation: check.recommendation,
          });
        }
      }
    }

    // Create audit logs
    if (createAuditLogs && auditEntries.length > 0) {
      await db.auditLog.createMany({
        data: auditEntries.map(entry => ({
          tenantId,
          action: 'recalibration_check',
          entity: 'forecast',
          entityId: entry.productId,
          metadata: JSON.stringify({
            mape: entry.mape,
            urgency: entry.urgency,
            recommendation: entry.recommendation,
            mapeThreshold,
          }),
        })),
      }).catch(() => {});
    }

    // Update forecast settings last calibration date
    await db.forecastSetting.updateMany({
      where: { tenantId },
      data: { lastCalibrationDate: new Date() },
    }).catch(() => {});

    const needsRecal = recalibrationResults.filter(r => r.needsRecalibration);

    return NextResponse.json({
      success: true,
      data: {
        products: recalibrationResults,
        summary: {
          totalChecked: recalibrationResults.length,
          needsRecalibration: needsRecal.length,
          auditLogsCreated: auditEntries.length,
          mapeThreshold,
          avgMape: recalibrationResults.length > 0
            ? Math.round((recalibrationResults.reduce((sum, r) => sum + r.currentMape, 0) / recalibrationResults.length) * 100) / 100
            : 0,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
