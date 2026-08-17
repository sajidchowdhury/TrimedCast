// ============================================
// TrimedCast API - Lead Time Statistics
// GET: Get σ_LT and lead time stats from purchase history
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
import { calculateLeadTimeStats, type LeadTimeStats } from '@/lib/forecasting/eoq-safety-stock';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdRaw = searchParams.get('tenantId') || 'default';
    const productId = searchParams.get('productId');
    const shipmentMode = (searchParams.get('shipmentMode') || 'sea') as 'sea' | 'air';
    const tenantId = await resolveTenantId(tenantIdRaw);

    // Fetch purchase history with actual lead times
    const whereClause: Record<string, unknown> = { tenantId };
    if (productId) whereClause.productId = productId;

    const purchaseHistory = await db.purchaseHistory.findMany({
      where: whereClause,
      include: { product: { select: { id: true, sku: true, name: true, category: true } } },
      orderBy: { date: 'desc' },
    });

    if (productId) {
      // Single product lead time stats
      const leadTimes = purchaseHistory
        .filter(ph => ph.leadTimeActual && ph.leadTimeActual > 0)
        .map(ph => ph.leadTimeActual as number);

      const stats = calculateLeadTimeStats(leadTimes, shipmentMode);

      // Recent lead time trend (last 10 orders)
      const recentOrders = purchaseHistory
        .filter(ph => ph.leadTimeActual && ph.leadTimeActual > 0)
        .slice(0, 10)
        .map(ph => ({
          date: ph.date.toISOString().split('T')[0],
          leadTime: ph.leadTimeActual,
          poNumber: ph.poNumber,
          quantity: ph.quantity,
        }));

      return NextResponse.json({
        success: true,
        data: {
          productId,
          product: purchaseHistory[0]?.product || null,
          stats,
          recentOrders,
          shipmentMode,
          totalOrdersWithLeadTime: leadTimes.length,
          totalOrders: purchaseHistory.length,
        },
      });
    }

    // All products - aggregate lead time stats
    const leadTimesByProduct = new Map<string, {
      product: { id: string; sku: string; name: string; category: string };
      leadTimes: number[];
      totalOrders: number;
    }>();

    for (const ph of purchaseHistory) {
      const existing = leadTimesByProduct.get(ph.productId);
      if (existing) {
        existing.totalOrders++;
        if (ph.leadTimeActual && ph.leadTimeActual > 0) {
          existing.leadTimes.push(ph.leadTimeActual);
        }
      } else {
        leadTimesByProduct.set(ph.productId, {
          product: ph.product,
          leadTimes: ph.leadTimeActual && ph.leadTimeActual > 0 ? [ph.leadTimeActual] : [],
          totalOrders: 1,
        });
      }
    }

    const results: Array<{
      productId: string;
      product: { id: string; sku: string; name: string; category: string };
      stats: LeadTimeStats;
      totalOrders: number;
      ordersWithLeadTime: number;
    }> = [];

    for (const [pid, data] of leadTimesByProduct) {
      results.push({
        productId: pid,
        product: data.product,
        stats: calculateLeadTimeStats(data.leadTimes, shipmentMode),
        totalOrders: data.totalOrders,
        ordersWithLeadTime: data.leadTimes.length,
      });
    }

    // Sort by coefficient of variation (most variable first)
    results.sort((a, b) => b.stats.coefficientOfVariation - a.stats.coefficientOfVariation);

    // Overall stats
    const allLeadTimes = purchaseHistory
      .filter(ph => ph.leadTimeActual && ph.leadTimeActual > 0)
      .map(ph => ph.leadTimeActual as number);
    const overallStats = calculateLeadTimeStats(allLeadTimes, shipmentMode);

    return NextResponse.json({
      success: true,
      data: {
        results,
        overallStats,
        shipmentMode,
        totalProducts: results.length,
        totalPurchaseOrders: purchaseHistory.length,
        totalWithLeadTimeData: allLeadTimes.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
