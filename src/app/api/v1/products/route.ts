// ============================================
// GET /api/v1/products - List products (paginated, filtered)
// POST /api/v1/products - Create product
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiPaginated, apiCreated, apiError, parsePagination, forbiddenError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();
    const url = new URL(request.url);

    const { page, perPage, skip, take } = parsePagination(url);

    // Filters
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const supplierId = url.searchParams.get('supplier_id');
    const lowStock = url.searchParams.get('low_stock') === 'true';
    const motorcycleModelId = url.searchParams.get('motorcycle_model_id');
    const seasonType = url.searchParams.get('season_type');
    const isActive = url.searchParams.get('is_active') ?? 'true';

    const where: Record<string, unknown> = {
      tenantId,
      ...(isActive !== 'all' ? { isActive: isActive === 'true' } : {}),
      ...(category ? { category } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(motorcycleModelId ? { motorcycleModelId } : {}),
      ...(seasonType ? { seasonalityType: seasonType } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
        ],
      } : {}),
    };

    // Low stock filter: available stock <= reorder point
    if (lowStock) {
      // We'll filter in application code after fetching
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take,
        include: {
          motorcycleModel: { select: { id: true, brand: true, model: true } },
          supplier: { select: { id: true, name: true, country: true } },
          inventory: { select: { currentStock: true, availableStock: true, reservedStock: true, reorderPoint: true, safetyStock: true } },
        },
        orderBy: { name: 'asc' },
      }),
      db.product.count({ where }),
    ]);

    // RBAC: Sales Manager cannot see unit_cost
    const isCostVisible = context.isAuthenticated
      ? canDo(context, 'products.crud') || canDo(context, 'purchase_orders.crud')
      : true;

    const data = products.map((p) => ({
      id: p.id,
      sku_code: p.sku,
      name: p.name,
      category: p.category,
      sub_category: p.subcategory,
      season_type: p.seasonalityType,
      motorcycle_model: p.motorcycleModel,
      supplier: p.supplier,
      unit_cost_bdt: isCostVisible ? p.unitCost : null,
      selling_price_bdt: p.sellingPrice,
      unit: p.unit,
      min_order_qty: p.minOrderQty,
      eoq: p.eoq,
      max_stock: p.maxStock,
      is_seasonal: p.isSeasonal,
      inventory: p.inventory[0] ? {
        qty_on_hand: p.inventory[0].currentStock,
        qty_available: p.inventory[0].availableStock,
        qty_reserved: p.inventory[0].reservedStock,
        reorder_point: p.inventory[0].reorderPoint,
        safety_stock: p.inventory[0].safetyStock,
      } : null,
      is_active: p.isActive,
    }));

    // Low stock post-filter
    const filteredData = lowStock
      ? data.filter((d) => d.inventory && d.inventory.qty_available <= (d.inventory.reorder_point || 0))
      : data;

    return apiPaginated(lowStock ? filteredData : data, page, perPage, total, tenantId);
  } catch (error) {
    console.error('[Products/GET]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to fetch products' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (context.isAuthenticated && !canDo(context, 'products.crud')) {
      return forbiddenError();
    }

    const body = await request.json();
    const {
      sku_code, name, category, sub_category, motorcycle_model_id, supplier_id,
      unit_cost_bdt, selling_price_bdt, unit, min_order_qty, eoq, max_stock,
      lead_time_days, is_seasonal, season_type, season_weight, service_level_target,
    } = body;

    if (!sku_code || !name || !category) {
      return apiError([
        ...(!sku_code ? [{ code: 'VALIDATION_ERROR' as const, message: 'sku_code is required', field: 'sku_code' }] : []),
        ...(!name ? [{ code: 'VALIDATION_ERROR' as const, message: 'name is required', field: 'name' }] : []),
        ...(!category ? [{ code: 'VALIDATION_ERROR' as const, message: 'category is required', field: 'category' }] : []),
      ], 400);
    }

    // Check SKU uniqueness within tenant
    const existing = await db.product.findFirst({
      where: { tenantId, sku: sku_code },
    });
    if (existing) {
      return apiError({ code: 'CONFLICT', message: 'SKU code already exists in this tenant', field: 'sku_code' }, 409);
    }

    const product = await db.product.create({
      data: {
        tenantId,
        sku: sku_code,
        name,
        category,
        subcategory: sub_category,
        motorcycleModelId: motorcycle_model_id,
        supplierId: supplier_id,
        unitCost: unit_cost_bdt,
        sellingPrice: selling_price_bdt,
        unit: unit || 'piece',
        minOrderQty: min_order_qty || 1,
        eoq: eoq || 100,
        moq: min_order_qty || 1,
        maxStock: max_stock || 500,
        leadTimeDays: lead_time_days,
        isSeasonal: is_seasonal || false,
        seasonalityType: season_type,
        seasonWeight: season_weight,
        isActive: true,
      },
      include: {
        motorcycleModel: true,
        supplier: true,
      },
    });

    // Create inventory record
    await db.inventory.create({
      data: {
        tenantId,
        productId: product.id,
        currentStock: 0,
        reservedStock: 0,
        availableStock: 0,
      },
    });

    await createAuditLog({
      tenantId,
      userId: context.userId || undefined,
      action: 'create',
      entity: 'product',
      entityId: product.id,
      changes: { after: body },
    });

    return apiCreated({
      id: product.id,
      sku_code: product.sku,
      name: product.name,
      category: product.category,
      motorcycle_model: product.motorcycleModel,
      supplier: product.supplier,
    });
  } catch (error) {
    console.error('[Products/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create product' }, 500);
  }
}
