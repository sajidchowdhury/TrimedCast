// ============================================
// GET /api/v1/inventory - List inventory
// PUT /api/v1/inventory - Bulk update
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiPaginated, apiError, parsePagination } from '@/lib/api/response';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();
    const url = new URL(request.url);

    const { page, perPage, skip, take } = parsePagination(url);
    const lowStock = url.searchParams.get('low_stock') === 'true';

    const where: Record<string, unknown> = { tenantId };

    const [inventory, total] = await Promise.all([
      db.inventory.findMany({
        where,
        skip,
        take,
        include: {
          product: {
            select: {
              id: true, sku: true, name: true, category: true,
              motorcycleModel: { select: { brand: true, model: true } },
            },
          },
        },
        orderBy: { product: { name: 'asc' } },
      }),
      db.inventory.count({ where }),
    ]);

    const data = inventory.map((inv) => ({
      id: inv.id,
      product: inv.product,
      qty_on_hand: inv.currentStock,
      qty_available: inv.availableStock,
      qty_reserved: inv.reservedStock,
      reorder_point: inv.reorderPoint,
      safety_stock: inv.safetyStock,
      max_stock_level: inv.maxStockLevel,
      warehouse_location: inv.warehouseLoc,
      last_count_date: inv.lastCountDate,
      is_low_stock: inv.availableStock <= (inv.reorderPoint || 0),
    }));

    const filteredData = lowStock
      ? data.filter((d) => d.is_low_stock)
      : data;

    return apiPaginated(filteredData, page, perPage, lowStock ? filteredData.length : total, tenantId);
  } catch (error) {
    console.error('[Inventory/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch inventory' }, 500);
  }
}
