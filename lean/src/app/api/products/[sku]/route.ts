// ============================================
// TrimedCast LEAN — /api/products/[sku]
// PATCH: update unit_cost_bdt + selling_price for a SKU
// (so the freight + line-cost analysis uses real costs).
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
