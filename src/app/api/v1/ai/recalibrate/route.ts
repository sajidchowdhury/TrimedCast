// ============================================
// /api/v1/ai/recalibrate
// Auto-Recalibration API
// POST: Trigger recalibration for product(s)
// GET: Check recalibration status
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';
import {
  checkRecalibration,
  batchRecalibrationCheck,
  executeRecalibration,
  batchExecuteRecalibration,
  getRecalibrationEvents,
  DEFAULT_RECALIBRATION_CONFIG,
  type RecalibrationConfig,
  type RecalibrationStatus,
  type RecalibrationEvent,
} from '@/lib/forecasting/auto-recalibration';
export const runtime = 'nodejs';


// =============================================
// GET: Check recalibration status
// =============================================

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated
      ? context.tenantId
      : await resolveTenant();

    const url = new URL(request.url);
    const productId = url.searchParams.get('product_id');
    const category = url.searchParams.get('category');
    const includeEvents = url.searchParams.get('include_events') === 'true';
    const mapeThreshold = parseFloat(url.searchParams.get('mape_threshold') || '15');

    const config: RecalibrationConfig = {
      ...DEFAULT_RECALIBRATION_CONFIG,
      mapeThreshold,
    };

    if (productId) {
      // Check specific product
      const status: RecalibrationStatus = await checkRecalibration(
        tenantId,
        productId,
        config
      );

      const events: RecalibrationEvent[] = includeEvents
        ? getRecalibrationEvents(tenantId).filter(e => e.productId === productId)
        : [];

      return NextResponse.json({
        success: true,
        data: {
          product: status,
          events,
        },
      });
    }

    // Batch check all products
    const result = await batchRecalibrationCheck(tenantId, config, category || undefined);

    const events: RecalibrationEvent[] = includeEvents
      ? getRecalibrationEvents(tenantId).slice(-20)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        events,
      },
    });
  } catch (error) {
    console.error('[AI/Recalibrate/GET]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check recalibration status',
      },
      { status: 500 }
    );
  }
}

// =============================================
// POST: Trigger recalibration
// =============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      product_id,
      category,
      target_model,
      mape_threshold,
      execute_all,
      max_products,
    } = body as {
      product_id?: string;
      category?: string;
      target_model?: string;
      mape_threshold?: number;
      execute_all?: boolean;
      max_products?: number;
    };

    const context = await getAuthContext();
    const tenantId = context.isAuthenticated
      ? context.tenantId
      : await resolveTenant();

    const config: RecalibrationConfig = {
      ...DEFAULT_RECALIBRATION_CONFIG,
      mapeThreshold: mape_threshold ?? DEFAULT_RECALIBRATION_CONFIG.mapeThreshold,
    };

    const effectiveTargetModel = target_model || 'prophet_enhanced';

    if (product_id) {
      // Recalibrate single product
      const result = await executeRecalibration(
        tenantId,
        product_id,
        effectiveTargetModel,
        config
      );

      return NextResponse.json({
        success: true,
        data: {
          action: 'recalibrate_single',
          result,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Batch recalibration
    if (!execute_all) {
      // First, just check what needs recalibration
      const checkResult = await batchRecalibrationCheck(
        tenantId,
        config,
        category || undefined
      );

      return NextResponse.json({
        success: true,
        data: {
          action: 'check',
          total_products: checkResult.totalProducts,
          needs_recalibration: checkResult.productsNeedingRecalibration,
          by_urgency: checkResult.summary.byUrgency,
          products_needing_recal: checkResult.products
            .filter(p => p.needed)
            .map(p => ({
              product_id: p.productId,
              sku: p.productSku,
              name: p.productName,
              current_mape: p.currentMape,
              urgency: p.urgency,
              recommendation: p.recommendation,
            })),
          hint: 'Set execute_all=true to actually trigger recalibration for all flagged products',
        },
      });
    }

    // Execute batch recalibration
    const maxProducts = max_products || 50;
    const result = await batchExecuteRecalibration(
      tenantId,
      config,
      effectiveTargetModel,
      maxProducts
    );

    return NextResponse.json({
      success: true,
      data: {
        action: 'recalibrate_batch',
        executed_at: result.executedAt,
        total_checked: result.totalChecked,
        recalibrated: result.recalibrated,
        results: result.results,
        skipped_count: result.skipped.length,
        skipped_reasons: result.skipped.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('[AI/Recalibrate/POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute recalibration',
      },
      { status: 500 }
    );
  }
}
