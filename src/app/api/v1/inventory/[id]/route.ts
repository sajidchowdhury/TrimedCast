// ============================================
// GET /api/v1/inventory/[id] - Get single inventory record
// PUT /api/v1/inventory/[id] - Update inventory (manual count adjustment)
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, notFoundError, forbiddenError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    const inventory = await db.inventory.findFirst({
      where: { id, tenantId },
      include: { product: true },
    });

    if (!inventory) return notFoundError('Inventory');

    return apiSuccess(inventory);
  } catch (error) {
    console.error('[Inventory/[id]/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch inventory' }, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'inventory.crud')) {
      return forbiddenError();
    }

    const existing = await db.inventory.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('Inventory');

    const body = await request.json();
    const { qty_on_hand, warehouse_location, reorder_point, safety_stock, max_stock_level } = body;

    const updates: Record<string, unknown> = {};
    if (qty_on_hand !== undefined) {
      updates.currentStock = qty_on_hand;
      updates.availableStock = qty_on_hand - existing.reservedStock;
    }
    if (warehouse_location !== undefined) updates.warehouseLoc = warehouse_location;
    if (reorder_point !== undefined) updates.reorderPoint = reorder_point;
    if (safety_stock !== undefined) updates.safetyStock = safety_stock;
    if (max_stock_level !== undefined) updates.maxStockLevel = max_stock_level;

    const inventory = await db.inventory.update({
      where: { id },
      data: updates,
    });

    await createAuditLog({
      tenantId,
      userId: context.userId || undefined,
      action: 'update',
      entity: 'inventory',
      entityId: id,
      changes: { before: existing, after: updates },
    });

    return apiSuccess({
      id: inventory.id,
      qty_on_hand: inventory.currentStock,
      qty_available: inventory.availableStock,
      qty_reserved: inventory.reservedStock,
      reorder_point: inventory.reorderPoint,
      safety_stock: inventory.safetyStock,
      warehouse_location: inventory.warehouseLoc,
    });
  } catch (error) {
    console.error('[Inventory/[id]/PUT]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update inventory' }, 500);
  }
}
