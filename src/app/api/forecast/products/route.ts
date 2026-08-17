// ============================================
// TrimedCast API - Products for Forecast Selection
// GET: List products with inventory for the forecast product selector
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTenantId } from '@/lib/tenant-resolver';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantIdRaw = searchParams.get('tenantId') || 'default';
    const tenantId = await resolveTenantId(tenantIdRaw);

    const products = await db.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        inventory: { where: { tenantId } },
        salesHistory: {
          where: { tenantId },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = products.map((p) => {
      const inv = p.inventory[0];
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        currentStock: inv?.currentStock || 0,
        availableStock: inv?.availableStock || 0,
        safetyStock: inv?.safetyStock || 0,
        reorderPoint: inv?.reorderPoint || 0,
        salesCount: p.salesHistory.length,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
