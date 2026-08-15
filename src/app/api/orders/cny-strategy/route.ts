// ============================================
// POST /api/orders/cny-strategy
// CNY Strategy Auto-Selector Endpoint
// Section 3.3: CNY Strategy Selection Algorithm
//
// Given business context (stockout timeline, margins, urgency),
// automatically selects the optimal CNY mitigation strategy.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  selectCNYStrategy,
  type CNYStrategy,
} from '@/lib/forecasting/order-trigger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      daysUntilStockout,
      cnyDelayDays,
      itemMarginPct,
      itemUrgency,
      canAirShip = false,
      airCostMultiplier = 8.0,
    } = body;

    // ── Input Validation ──
    if (typeof daysUntilStockout !== 'number') {
      return NextResponse.json(
        { error: 'daysUntilStockout is required and must be a number' },
        { status: 400 },
      );
    }
    if (typeof cnyDelayDays !== 'number' || cnyDelayDays < 0) {
      return NextResponse.json(
        { error: 'cnyDelayDays is required and must be a non-negative number' },
        { status: 400 },
      );
    }
    if (typeof itemMarginPct !== 'number' || itemMarginPct < 0) {
      return NextResponse.json(
        { error: 'itemMarginPct is required and must be a non-negative number (percentage)' },
        { status: 400 },
      );
    }

    const validUrgencies: string[] = ['critical', 'high', 'normal', 'low'];
    if (!validUrgencies.includes(itemUrgency)) {
      return NextResponse.json(
        { error: `itemUrgency must be one of: ${validUrgencies.join(', ')}` },
        { status: 400 },
      );
    }

    if (typeof canAirShip !== 'boolean') {
      return NextResponse.json(
        { error: 'canAirShip must be a boolean' },
        { status: 400 },
      );
    }
    if (airCostMultiplier <= 0) {
      return NextResponse.json(
        { error: 'airCostMultiplier must be positive' },
        { status: 400 },
      );
    }

    // ── Select CNY Strategy ──
    const strategy: CNYStrategy = selectCNYStrategy(
      daysUntilStockout,
      cnyDelayDays,
      itemMarginPct,
      itemUrgency as 'critical' | 'high' | 'normal' | 'low',
      canAirShip,
      airCostMultiplier,
    );

    // ── Build Explanation ──
    const explanation = buildCNYExplanation(
      strategy,
      daysUntilStockout,
      cnyDelayDays,
      itemMarginPct,
      itemUrgency,
      canAirShip,
      airCostMultiplier,
    );

    // ── Risk Assessment ──
    const riskLevel = assessCNYRiskLevel(daysUntilStockout, cnyDelayDays, itemUrgency);
    const survivalDays = daysUntilStockout - cnyDelayDays;

    return NextResponse.json({
      success: true,
      data: {
        strategy,
        explanation,
        riskLevel,
        survivalDays,
        canSurviveCny: survivalDays > 30,
        needsPreCnyAction: strategy === 'before_cny' || strategy === 'partial_order' || strategy === 'air_escape',
        needsAirFreight: strategy === 'air_escape',
        effectiveDelayDays: strategy === 'after_cny' ? cnyDelayDays : (strategy === 'air_escape' ? 0 : 0),
        costImpact: strategy === 'air_escape'
          ? `Air freight at ${airCostMultiplier}x cost — margin impact: ~${Math.round((airCostMultiplier - 1) * 100 / (1 + itemMarginPct / 100))}% of selling price`
          : 'No additional cost impact',
      },
      meta: {
        calculatedAt: new Date().toISOString(),
        inputs: {
          daysUntilStockout,
          cnyDelayDays,
          itemMarginPct,
          itemUrgency,
          canAirShip,
          airCostMultiplier,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'CNY strategy selection failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ── Helper: Build human-readable explanation ──
function buildCNYExplanation(
  strategy: CNYStrategy,
  daysUntilStockout: number,
  cnyDelayDays: number,
  itemMarginPct: number,
  itemUrgency: string,
  canAirShip: boolean,
  airCostMultiplier: number,
): string {
  switch (strategy) {
    case 'after_cny':
      return `RECOMMENDED: Order after CNY. You have ${daysUntilStockout} days of stock, which covers the CNY delay of ${cnyDelayDays} days with ${daysUntilStockout - cnyDelayDays} days buffer. No premium freight needed.`;

    case 'before_cny':
      return `RECOMMENDED: Order BEFORE CNY shutdown. With ${daysUntilStockout} days until stockout and ${itemUrgency} urgency, you cannot afford to wait. Place order immediately to ensure manufacturing completes before factory shutdown.`;

    case 'air_escape':
      return `RECOMMENDED: Air freight escape. Stockout imminent (${daysUntilStockout} days), margins (${itemMarginPct}%) can absorb ${airCostMultiplier}x air cost. Use air freight to bypass CNY sea shipping delays and maintain supply.`;

    case 'partial_order':
      return `RECOMMENDED: Partial order strategy. Order a partial quantity before CNY to cover immediate needs, then order the remainder after factories reopen. This balances stockout risk against CNY timing constraints.`;

    case 'none':
      return `No CNY strategy needed. Item does not face CNY supply chain risk.`;

    default:
      return `Strategy: ${strategy}`;
  }
}

// ── Helper: Assess risk level ──
function assessCNYRiskLevel(
  daysUntilStockout: number,
  cnyDelayDays: number,
  itemUrgency: string,
): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  if (cnyDelayDays === 0) return 'none';

  const survivalDays = daysUntilStockout - cnyDelayDays;

  if (itemUrgency === 'critical' || survivalDays <= 0) return 'critical';
  if (itemUrgency === 'high' || survivalDays <= 14) return 'high';
  if (survivalDays <= 30) return 'medium';
  if (survivalDays <= 60) return 'low';
  return 'low';
}
