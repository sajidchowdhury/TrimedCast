// ============================================
// GET /api/v1/products/[id] - Get single product
// PUT /api/v1/products/[id] - Update product
// DELETE /api/v1/products/[id] - Soft delete
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, notFoundError, forbiddenError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    const product = await db.product.findFirst({
      where: { id, tenantId },
      include: {
        motorcycleModel: true,
        supplier: true,
        inventory: true,
        forecasts: { take: 1, orderBy: { createdAt: 'desc' } },
        recommendedOrders: { where: { status: 'pending' }, take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!product) return notFoundError('Product');

    const isCostVisible = !context.isAuthenticated || canDo(context, 'products.crud');

    return apiSuccess({
      id: product.id,
      sku_code: product.sku,
      name: product.name,
      category: product.category,
      sub_category: product.subcategory,
      season_type: product.seasonalityType,
      motorcycle_model: product.motorcycleModel,
      supplier: product.supplier,
      unit_cost_bdt: isCostVisible ? product.unitCost : null,
      selling_price_bdt: product.sellingPrice,
      unit: product.unit,
      min_order_qty: product.minOrderQty,
      eoq: product.eoq,
      max_stock: product.maxStock,
      lead_time_days: product.leadTimeDays,
      is_seasonal: product.isSeasonal,
      season_weight: product.seasonWeight,
      inventory: product.inventory[0] || null,
      latest_forecast: product.forecasts[0] || null,
      recommended_order: product.recommendedOrders[0] || null,
      is_active: product.isActive,
    });
  } catch (error) {
    console.error('[Products/[id]/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch product' }, 500);
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

    if (context.isAuthenticated && !canDo(context, 'products.crud')) {
      return forbiddenError();
    }

    const existing = await db.product.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('Product');

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    const allowedFields = [
      'name', 'category', 'sub_category', 'motorcycle_model_id', 'supplier_id',
      'unit_cost_bdt', 'selling_price_bdt', 'unit', 'min_order_qty', 'eoq',
      'max_stock', 'lead_time_days', 'is_seasonal', 'season_type', 'season_weight',
    ];

    const fieldMap: Record<string, string> = {
      sub_category: 'subcategory',
      motorcycle_model_id: 'motorcycleModelId',
      supplier_id: 'supplierId',
      unit_cost_bdt: 'unitCost',
      selling_price_bdt: 'sellingPrice',
      min_order_qty: 'minOrderQty',
      max_stock: 'maxStock',
      lead_time_days: 'leadTimeDays',
      is_seasonal: 'isSeasonal',
      season_type: 'seasonalityType',
      season_weight: 'seasonWeight',
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const dbField = fieldMap[field] || field;
        updates[dbField] = body[field];
      }
    }

    const product = await db.product.update({
      where: { id },
      data: updates,
    });

    await createAuditLog({
      tenantId,
      userId: context.userId || undefined,
      action: 'update',
      entity: 'product',
      entityId: id,
      changes: { before: existing, after: updates },
    });

    return apiSuccess(product);
  } catch (error) {
    console.error('[Products/[id]/PUT]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update product' }, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'products.crud')) {
      return forbiddenError();
    }

    const existing = await db.product.findFirst({ where: { id, tenantId } });
    if (!existing) return notFoundError('Product');

    // Soft delete
    await db.product.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      tenantId,
      userId: context.userId || undefined,
      action: 'delete',
      entity: 'product',
      entityId: id,
    });

    return apiSuccess({ message: 'Product deactivated', id });
  } catch (error) {
    console.error('[Products/[id]/DELETE]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete product' }, 500);
  }
}
