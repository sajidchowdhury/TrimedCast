// ============================================
// TrimedCast LEAN — /api/products/[sku]
// PATCH: update unit_cost_bdt + selling_price for a SKU
// DELETE: delete a single SKU + cascade-delete its sales/purchases/inventory
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sku: string }> },
) {
  try {
    const { sku } = await params;
    const body = await req.json().catch(() => ({}));

    const data: { unitCostBdt?: number; sellingPrice?: number; hsCode?: string } = {};
    if (body.unitCostBdt !== undefined) data.unitCostBdt = Number(body.unitCostBdt);
    if (body.sellingPrice !== undefined) data.sellingPrice = Number(body.sellingPrice);
    if (body.hsCode !== undefined) data.hsCode = String(body.hsCode);

    const updated = await db.product.update({
      where: { skuCode: sku },
      data,
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// --- Delete a single SKU + cascade-delete related records ---
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sku: string }> },
) {
  try {
    const { sku } = await params;

    // Use a transaction to cascade-delete all related records
    const result = await db.$transaction([
      // Delete child records first (foreign key constraints)
      db.sale.deleteMany({ where: { skuCode: sku } }),
      db.purchase.deleteMany({ where: { skuCode: sku } }),
      db.inventory.deleteMany({ where: { skuCode: sku } }),
      db.forecast.deleteMany({ where: { skuCode: sku } }),
      db.recommendedOrder.deleteMany({ where: { skuCode: sku } }),
      // Then the product itself
      db.product.delete({ where: { skuCode: sku } }),
    ]);

    // result[5] is the deleted product
    const deletedProduct = result[5];
    return NextResponse.json({
      success: true,
      deleted: {
        skuCode: deletedProduct.skuCode,
        productName: deletedProduct.productName,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[products DELETE] error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
