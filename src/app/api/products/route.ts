// ============================================
// TrimedCast LEAN — /api/products
// GET: list products with their total sales + last purchase.
// DELETE: bulk-delete multiple SKUs (cascade-deletes related records).
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const products = await db.product.findMany({
    include: {
      _count: { select: { sales: true, purchases: true } },
    },
    orderBy: { skuCode: 'asc' },
  });

  // aggregate sales qty per SKU
  const enriched = await Promise.all(
    products.map(async (p) => {
      const agg = await db.sale.aggregate({
        where: { skuCode: p.skuCode },
        _sum: { qtySold: true },
      });
      const lastPurchase = await db.purchase.findFirst({
        where: { skuCode: p.skuCode },
        orderBy: { orderedOn: 'desc' },
      });
      return {
        id: p.id,
        skuCode: p.skuCode,
        productName: p.productName,
        colorDetails: p.colorDetails,
        hsCode: p.hsCode,
        unitCostBdt: p.unitCostBdt,
        sellingPrice: p.sellingPrice,
        totalSales: agg._sum.qtySold ?? 0,
        salesRows: p._count.sales,
        purchaseRows: p._count.purchases,
        lastOrderQty: lastPurchase?.orderQty ?? null,
        lastShipmentMode: lastPurchase?.shipmentMode ?? null,
        lastLeadTimeDays: lastPurchase?.actualLeadTimeDays ?? null,
      };
    }),
  );

  return NextResponse.json({ products: enriched });
}

// --- Bulk-delete multiple SKUs ---
// Body: { "skuCodes": ["Pic 10", "Pic 11", ...] }
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const skuCodes: string[] = Array.isArray(body.skuCodes) ? body.skuCodes : [];

    if (skuCodes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'skuCodes array is required (e.g. ["Pic 10", "Pic 11"])' },
        { status: 400 },
      );
    }

    // Use a transaction to cascade-delete all related records for every SKU
    const result = await db.$transaction([
      db.sale.deleteMany({ where: { skuCode: { in: skuCodes } } }),
      db.purchase.deleteMany({ where: { skuCode: { in: skuCodes } } }),
      db.inventory.deleteMany({ where: { skuCode: { in: skuCodes } } }),
      db.forecast.deleteMany({ where: { skuCode: { in: skuCodes } } }),
      db.recommendedOrder.deleteMany({ where: { skuCode: { in: skuCodes } } }),
      db.product.deleteMany({ where: { skuCode: { in: skuCodes } } }),
    ]);

    // result[5].count is the number of products actually deleted
    const deletedCount = result[5].count;

    return NextResponse.json({
      success: true,
      deletedCount,
      requestedCount: skuCodes.length,
      notFound: deletedCount < skuCodes.length ? skuCodes.length - deletedCount : 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[products bulk DELETE] error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
