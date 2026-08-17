// ============================================
// TrimedCast API - Forecast Persistence
// POST: Save forecast results to DB for history/comparison
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
export const runtime = 'nodejs';


interface ForecastPointInput {
  date: string;
  predicted: number;
  lowerBound?: number;
  upperBound?: number;
  season?: string;
  confidence?: number;
}

interface ForecastMetricsInput {
  mape?: number;
  mae?: number;
  rmse?: number;
  bias?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId: tenantIdRaw = 'demo-bd-motors',
      productId,
      forecastPoints,
      model = 'ensemble',
      metrics,
      horizonDays = 90,
    } = body as {
      tenantId?: string;
      productId: string;
      forecastPoints: ForecastPointInput[];
      model?: string;
      metrics?: ForecastMetricsInput;
      horizonDays?: number;
    };
    const tenantId = await resolveTenantId(tenantIdRaw);

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
        { status: 400 }
      );
    }

    if (!forecastPoints || !Array.isArray(forecastPoints) || forecastPoints.length === 0) {
      return NextResponse.json(
        { success: false, error: 'forecastPoints array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Batch create Forecast records - one per forecast point date
    // For efficiency, process in chunks to avoid SQLite limits
    const CHUNK_SIZE = 50;
    let totalSaved = 0;
    const cnyRiskFlags = new Set<string>();

    // Check for CNY risk dates (rough: any forecast in Jan-Feb might overlap CNY)
    for (const point of forecastPoints) {
      const month = new Date(point.date).getMonth() + 1;
      if (month === 1 || month === 2) {
        cnyRiskFlags.add(point.date);
      }
    }

    for (let i = 0; i < forecastPoints.length; i += CHUNK_SIZE) {
      const chunk = forecastPoints.slice(i, i + CHUNK_SIZE);

      const createData = chunk.map(point => ({
        tenantId,
        productId,
        forecastDate: new Date(point.date),
        predictedQty: point.predicted,
        lowerBound: point.lowerBound || null,
        upperBound: point.upperBound || null,
        model,
        confidence: point.confidence || 0.95,
        mape: metrics?.mape || null,
        isRecalibrated: false,
        seasonDetected: point.season || null,
        cnyRiskFlag: cnyRiskFlags.has(point.date),
      }));

      // Use createMany for batch insert
      const result = await db.forecast.createMany({
        data: createData,
      });

      totalSaved += result.count;
    }

    // Also save a ForecastSetting record for this product if not exists
    const existingSetting = await db.forecastSetting.findFirst({
      where: { tenantId, productId },
    });

    if (!existingSetting) {
      await db.forecastSetting.create({
        data: {
          tenantId,
          productId,
          model,
          horizonDays,
          confidenceLevel: forecastPoints[0]?.confidence || 0.95,
          lastCalibrationDate: new Date(),
        },
      });
    } else {
      await db.forecastSetting.update({
        where: { id: existingSetting.id },
        data: {
          model,
          horizonDays,
          lastCalibrationDate: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        savedCount: totalSaved,
        productId,
        productSku: product.sku,
        model,
        horizonDays,
        metrics: metrics || {},
        dateRange: {
          from: forecastPoints[0]?.date,
          to: forecastPoints[forecastPoints.length - 1]?.date,
        },
        cnyRiskPointCount: cnyRiskFlags.size,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
