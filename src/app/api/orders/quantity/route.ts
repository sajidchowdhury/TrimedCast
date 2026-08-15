// ============================================
// POST /api/orders/quantity
// Standalone Quantity Calculator Endpoint
// Section 5: Recommended Order Quantity — standalone access
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateRecommendedQty,
  type QuantityBreakdown,
} from '@/lib/forecasting/order-trigger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      forecastedDemand,
      safetyStock,
      currentStock,
      qtyOnOrder = 0,
      eoq = 100,
      moq = 50,
      maxStock = 500,
    } = body;

    // ── Input Validation ──
    if (typeof forecastedDemand !== 'number' || forecastedDemand < 0) {
      return NextResponse.json(
        { error: 'forecastedDemand is required and must be a non-negative number' },
        { status: 400 },
      );
    }
    if (typeof safetyStock !== 'number' || safetyStock < 0) {
      return NextResponse.json(
        { error: 'safetyStock is required and must be a non-negative number' },
        { status: 400 },
      );
    }
    if (typeof currentStock !== 'number' || currentStock < 0) {
      return NextResponse.json(
        { error: 'currentStock is required and must be a non-negative number' },
        { status: 400 },
      );
    }
    if (qtyOnOrder < 0) {
      return NextResponse.json(
        { error: 'qtyOnOrder must be non-negative' },
        { status: 400 },
      );
    }
    if (eoq < 0) {
      return NextResponse.json(
        { error: 'eoq must be non-negative' },
        { status: 400 },
      );
    }
    if (moq < 0) {
      return NextResponse.json(
        { error: 'moq must be non-negative' },
        { status: 400 },
      );
    }
    if (maxStock < 0) {
      return NextResponse.json(
        { error: 'maxStock must be non-negative' },
        { status: 400 },
      );
    }

    // ── Calculate Quantity Breakdown ──
    const breakdown: QuantityBreakdown = calculateRecommendedQty(
      forecastedDemand,
      safetyStock,
      currentStock,
      qtyOnOrder,
      eoq,
      moq,
      maxStock,
    );

    return NextResponse.json({
      success: true,
      data: breakdown,
      meta: {
        calculatedAt: new Date().toISOString(),
        inputs: {
          forecastedDemand,
          safetyStock,
          currentStock,
          qtyOnOrder,
          eoq,
          moq,
          maxStock,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Quantity calculation failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
