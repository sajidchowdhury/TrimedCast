// ============================================
// TrimedCast LEAN — /api/products
// List products with their total sales + last purchase.
// ============================================

import { NextResponse } from 'next/server';
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
