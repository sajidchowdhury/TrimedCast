// ============================================
// TrimedCast - Demo Data Loader API
// POST /api/v1/demo/load
// Seeds realistic BD motorcycle parts data
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  DEMO_MOTORCYCLE_MODELS,
  DEMO_SUPPLIERS,
  DEMO_PRODUCTS,
  DEMO_SEASONALITY_TYPES,
  DEMO_PROMO_EVENTS,
  generateDemoSalesHistory,
  generateDemoPurchaseHistory,
} from '@/lib/demo-data/content';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenantId as string | undefined;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if demo data already loaded (idempotent)
    const existingProducts = await db.product.count({ where: { tenantId } });
    if (existingProducts > 0) {
      return NextResponse.json({
        success: true,
        message: 'Demo data already loaded',
        alreadyExists: true,
        stats: {
          models: await db.motorcycleModel.count({ where: { tenantId } }),
          suppliers: await db.supplier.count({ where: { tenantId } }),
          products: existingProducts,
          inventory: await db.inventory.count({ where: { tenantId } }),
          sales: await db.salesHistory.count({ where: { tenantId } }),
          purchases: await db.purchaseHistory.count({ where: { tenantId } }),
          seasonalityTypes: await db.seasonalityType.count({ where: { tenantId } }),
          promoEvents: await db.promoEvent.count({ where: { tenantId } }),
        },
      });
    }

    const stats = {
      models: 0,
      suppliers: 0,
      products: 0,
      inventory: 0,
      sales: 0,
      purchases: 0,
      seasonalityTypes: 0,
      promoEvents: 0,
    };

    // 1. Seasonality Types
    for (const st of DEMO_SEASONALITY_TYPES) {
      await db.seasonalityType.create({
        data: {
          tenantId,
          name: st.name,
          label: st.label,
          labelBn: st.labelBn,
          description: st.description,
          multiplier: st.multiplier,
          months: st.months,
          color: st.color,
          isDefault: st.isDefault,
        },
      });
    }
    stats.seasonalityTypes = DEMO_SEASONALITY_TYPES.length;

    // 2. Motorcycle Models
    const modelMap: Record<string, string> = {};
    for (const m of DEMO_MOTORCYCLE_MODELS) {
      const created = await db.motorcycleModel.create({
        data: {
          tenantId,
          brand: m.brand,
          model: m.model,
          yearStart: m.yearStart,
          yearEnd: m.yearEnd,
          ccRating: m.ccRating,
          segment: m.segment,
        },
      });
      modelMap[`${m.brand} ${m.model}`] = created.id;
    }
    stats.models = DEMO_MOTORCYCLE_MODELS.length;

    // 3. Suppliers
    const supplierMap: Record<string, string> = {};
    for (const s of DEMO_SUPPLIERS) {
      const created = await db.supplier.create({
        data: {
          tenantId,
          name: s.name,
          code: s.code,
          country: s.country,
          leadTimeDays: s.leadTimeDays,
          reliability: s.reliability,
          isCnyAffected: s.isCnyAffected,
          contactEmail: s.contactEmail,
          contactPhone: s.contactPhone,
        },
      });
      supplierMap[s.code] = created.id;
    }
    stats.suppliers = DEMO_SUPPLIERS.length;

    // 4. Products (assign first model + first supplier as defaults)
    const firstModelId = Object.values(modelMap)[0] ?? null;
    const productMap: Record<string, string> = {};

    // Map categories to preferred suppliers
    const categorySupplierMap: Record<string, string> = {
      engine: 'SZ-001',
      brake: 'GZ-002',
      chain: 'CQ-003',
      filter: 'IN-004',
      electrical: 'SZ-001',
      body: 'GZ-002',
      suspension: 'CQ-003',
      other: 'BD-005',
    };

    for (const p of DEMO_PRODUCTS) {
      const supplierCode = categorySupplierMap[p.category] ?? 'SZ-001';
      const supplierId = supplierMap[supplierCode] ?? null;

      const created = await db.product.create({
        data: {
          tenantId,
          sku: p.sku,
          name: p.name,
          category: p.category,
          subcategory: p.subcategory,
          motorcycleModelId: firstModelId,
          supplierId,
          unitCost: p.unitCost,
          sellingPrice: p.sellingPrice,
          unit: p.unit,
          minOrderQty: p.minOrderQty,
          eoq: p.eoq,
          moq: p.minOrderQty,
          maxStock: p.maxStock,
          leadTimeDays: DEMO_SUPPLIERS.find(s => s.code === supplierCode)?.leadTimeDays ?? 45,
          isSeasonal: p.isSeasonal,
          seasonalityType: (p as Record<string, unknown>).seasonalityType as string ?? null,
        },
      });
      productMap[p.sku] = created.id;
    }
    stats.products = DEMO_PRODUCTS.length;

    // 5. Inventory
    for (const p of DEMO_PRODUCTS) {
      const productId = productMap[p.sku];
      if (!productId) continue;

      // Start with 60-80% of maxStock as initial inventory
      const stockPercent = 0.6 + ((p.sku.charCodeAt(3) * 13) % 20) / 100;
      const currentStock = Math.round(p.maxStock * stockPercent);
      const safetyStock = Math.round(p.maxStock * 0.1);
      const reorderPoint = Math.round(p.maxStock * 0.2);

      await db.inventory.create({
        data: {
          tenantId,
          productId,
          currentStock,
          reservedStock: Math.round(currentStock * 0.05),
          availableStock: Math.round(currentStock * 0.95),
          reorderPoint,
          safetyStock,
          maxStockLevel: p.maxStock,
          warehouseLoc: `A-${Math.floor(Math.random() * 5) + 1}-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`,
        },
      });
    }
    stats.inventory = DEMO_PRODUCTS.length;

    // 6. Sales History
    const salesRecords = generateDemoSalesHistory();
    for (const s of salesRecords) {
      const productId = productMap[s.sku];
      if (!productId) continue;

      await db.salesHistory.create({
        data: {
          tenantId,
          productId,
          date: new Date(s.date),
          quantity: s.quantity,
          revenue: s.revenue,
          channel: s.channel,
          region: s.region,
          season: s.season,
        },
      });
    }
    stats.sales = salesRecords.length;

    // 7. Purchase History
    const purchaseRecords = generateDemoPurchaseHistory();
    for (const p of purchaseRecords) {
      const productId = productMap[p.sku];
      if (!productId) continue;

      const supplierId = supplierMap[p.supplierCode] ?? null;

      await db.purchaseHistory.create({
        data: {
          tenantId,
          productId,
          date: new Date(p.date),
          quantity: p.quantity,
          unitCost: p.unitCost,
          totalCost: p.totalCost,
          supplierId,
          leadTimeActual: p.leadTimeActual,
          season: p.season,
        },
      });
    }
    stats.purchases = purchaseRecords.length;

    // 8. Promo Events
    for (const pe of DEMO_PROMO_EVENTS) {
      await db.promoEvent.create({
        data: {
          tenantId,
          name: pe.name,
          type: pe.type,
          startDate: new Date(pe.startDate),
          endDate: new Date(pe.endDate),
          discountPct: pe.discountPct,
          expectedUplift: pe.expectedUplift,
          affectedCategories: pe.affectedCategories,
        },
      });
    }
    stats.promoEvents = DEMO_PROMO_EVENTS.length;

    // 9. Default Forecast Settings
    await db.forecastSetting.create({
      data: {
        tenantId,
        model: 'prophet',
        horizonDays: 90,
        confidenceLevel: 0.95,
        seasonalityMode: 'multiplicative',
        includeHolidays: true,
        includePromos: true,
        cnyAdjustment: true,
        autoRecalibration: true,
        recalibrationThreshold: 0.15,
      },
    });

    // Update tenant onboarding status
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        shopName: tenant.shopName ?? 'Demo Motorcycle Parts Shop',
        phone: tenant.phone ?? '+880 1712 345678',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Demo data loaded successfully',
      stats,
    });
  } catch (error) {
    console.error('[Demo Load] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load demo data', details: String(error) },
      { status: 500 }
    );
  }
}
