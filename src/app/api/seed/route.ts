// ============================================
// TrimedCast API - Seed Demo Data
// POST: Create demo tenant and user
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    // Create demo tenant
    const tenant = await db.tenant.upsert({
      where: { slug: 'demo-bd-motors' },
      update: {},
      create: {
        name: 'BD Motors Ltd.',
        slug: 'demo-bd-motors',
        domain: 'bdmotors.com',
        plan: 'professional',
      },
    });

    // Create demo user
    const user = await db.user.upsert({
      where: { email: 'admin@bdmotors.com' },
      update: {},
      create: {
        email: 'admin@bdmotors.com',
        name: 'Rakib Hassan',
        role: 'executive',
        tenantId: tenant.id,
      },
    });

    // Create some sample suppliers
    const suppliers = await Promise.all([
      db.supplier.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: 'Jialing Parts Co.' } },
        update: {},
        create: { tenantId: tenant.id, name: 'Jialing Parts Co.', code: 'JPC-001', country: 'China', leadTimeDays: 90, reliability: 0.88, isCnyAffected: true },
      }),
      db.supplier.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: 'Lifan Industries' } },
        update: {},
        create: { tenantId: tenant.id, name: 'Lifan Industries', code: 'LFI-002', country: 'China', leadTimeDays: 95, reliability: 0.85, isCnyAffected: true },
      }),
      db.supplier.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: 'Bajaj Auto Parts' } },
        update: {},
        create: { tenantId: tenant.id, name: 'Bajaj Auto Parts', code: 'BAJ-003', country: 'India', leadTimeDays: 45, reliability: 0.92, isCnyAffected: false },
      }),
    ]);

    // Create sample products
    const products = await Promise.all([
      db.product.upsert({
        where: { tenantId_sku: { tenantId: tenant.id, sku: 'PST-HON-125' } },
        update: {},
        create: { tenantId: tenant.id, sku: 'PST-HON-125', name: 'Piston Kit Honda 125cc', category: 'piston', unitCost: 450, sellingPrice: 850, unit: 'set', minOrderQty: 10, isSeasonal: true, seasonalityType: 'winter_peak' },
      }),
      db.product.upsert({
        where: { tenantId_sku: { tenantId: tenant.id, sku: 'BRP-BJ-Discover' } },
        update: {},
        create: { tenantId: tenant.id, sku: 'BRP-BJ-Discover', name: 'Brake Pad Bajaj Discover', category: 'brake_pad', unitCost: 120, sellingPrice: 280, unit: 'pair', minOrderQty: 20 },
      }),
      db.product.upsert({
        where: { tenantId_sku: { tenantId: tenant.id, sku: 'CHN-HON-CD70' } },
        update: {},
        create: { tenantId: tenant.id, sku: 'CHN-HON-CD70', name: 'Drive Chain Honda CD70', category: 'chain', unitCost: 380, sellingPrice: 650, unit: 'piece', minOrderQty: 5 },
      }),
      db.product.upsert({
        where: { tenantId_sku: { tenantId: tenant.id, sku: 'FLT-YAM-100' } },
        update: {},
        create: { tenantId: tenant.id, sku: 'FLT-YAM-100', name: 'Oil Filter Yamaha 100cc', category: 'filter', unitCost: 65, sellingPrice: 150, unit: 'piece', minOrderQty: 50 },
      }),
      db.product.upsert({
        where: { tenantId_sku: { tenantId: tenant.id, sku: 'TRE-BJ-Discover' } },
        update: {},
        create: { tenantId: tenant.id, sku: 'TRE-BJ-Discover', name: 'Rear Tire Bajaj Discover', category: 'tire', unitCost: 1200, sellingPrice: 2200, unit: 'piece', minOrderQty: 4, isSeasonal: true, seasonalityType: 'monsoon_dip' },
      }),
    ]);

    // Create inventory for products
    const stockLevels = [150, 45, 80, 200, 25];
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const currentStock = stockLevels[i] || Math.floor(Math.random() * 200) + 20;
      const reserved = Math.floor(currentStock * 0.15);
      await db.inventory.upsert({
        where: { tenantId_productId: { tenantId: tenant.id, productId: product.id } },
        update: { currentStock, reservedStock: reserved, availableStock: currentStock - reserved },
        create: {
          tenantId: tenant.id,
          productId: product.id,
          currentStock,
          reservedStock: reserved,
          availableStock: currentStock - reserved,
          reorderPoint: 30,
          safetyStock: 15,
          maxStockLevel: 300,
        },
      });
    }

    // Create motorcycle models
    const models = await Promise.all([
      db.motorcycleModel.upsert({
        where: { tenantId_brand_model: { tenantId: tenant.id, brand: 'Honda', model: 'CD 70' } },
        update: {},
        create: { tenantId: tenant.id, brand: 'Honda', model: 'CD 70', ccRating: 70, segment: 'commuter' },
      }),
      db.motorcycleModel.upsert({
        where: { tenantId_brand_model: { tenantId: tenant.id, brand: 'Bajaj', model: 'Discover 125' } },
        update: {},
        create: { tenantId: tenant.id, brand: 'Bajaj', model: 'Discover 125', ccRating: 125, segment: 'commuter' },
      }),
      db.motorcycleModel.upsert({
        where: { tenantId_brand_model: { tenantId: tenant.id, brand: 'Bajaj', model: 'Pulsar 150' } },
        update: {},
        create: { tenantId: tenant.id, brand: 'Bajaj', model: 'Pulsar 150', ccRating: 150, segment: 'premium' },
      }),
      db.motorcycleModel.upsert({
        where: { tenantId_brand_model: { tenantId: tenant.id, brand: 'Yamaha', model: 'FZ-S 150' } },
        update: {},
        create: { tenantId: tenant.id, brand: 'Yamaha', model: 'FZ-S 150', ccRating: 150, segment: 'premium' },
      }),
    ]);

    // Create a few sales orders
    const existingSOCount = await db.salesOrder.count({ where: { tenantId: tenant.id } });
    if (existingSOCount === 0) {
      await db.salesOrder.createMany({
        data: [
          { tenantId: tenant.id, orderNo: 'SO-00001', date: new Date('2025-01-15'), customerId: 'Rahim Auto', channel: 'retail', region: 'dhaka', totalAmount: 4250, status: 'delivered', items: JSON.stringify([{ productId: products[0].id, quantity: 5, price: 850 }]) },
          { tenantId: tenant.id, orderNo: 'SO-00002', date: new Date('2025-02-20'), customerId: 'Karim Parts', channel: 'wholesale', region: 'chittagong', totalAmount: 8400, status: 'confirmed', items: JSON.stringify([{ productId: products[1].id, quantity: 30, price: 280 }]) },
          { tenantId: tenant.id, orderNo: 'SO-00003', date: new Date('2025-03-10'), customerId: 'Salam Store', channel: 'retail', region: 'sylhet', totalAmount: 3250, status: 'pending', items: JSON.stringify([{ productId: products[2].id, quantity: 5, price: 650 }]) },
        ],
      });
    }

    // Create purchase orders
    const existingPOCount = await db.purchaseOrder.count({ where: { tenantId: tenant.id } });
    if (existingPOCount === 0) {
      await db.purchaseOrder.createMany({
        data: [
          { tenantId: tenant.id, poNumber: 'PO-00001', supplierId: suppliers[0].id, orderDate: new Date('2025-01-05'), expectedDelivery: new Date('2025-04-05'), status: 'received', totalAmount: 45000, items: JSON.stringify([{ productId: products[0].id, quantity: 100, unitCost: 450 }]), leadTimeDays: 90 },
          { tenantId: tenant.id, poNumber: 'PO-00002', supplierId: suppliers[1].id, orderDate: new Date('2025-02-15'), expectedDelivery: new Date('2025-05-20'), status: 'in_transit', totalAmount: 24000, items: JSON.stringify([{ productId: products[1].id, quantity: 200, unitCost: 120 }]), leadTimeDays: 95 },
          { tenantId: tenant.id, poNumber: 'PO-00003', supplierId: suppliers[2].id, orderDate: new Date('2025-03-01'), expectedDelivery: new Date('2025-04-15'), status: 'confirmed', totalAmount: 19000, items: JSON.stringify([{ productId: products[3].id, quantity: 200, unitCost: 95 }]), leadTimeDays: 45 },
        ],
      });
    }

    // Create forecast settings
    await db.forecastSetting.upsert({
      where: { id: `fs-${tenant.id}` },
      update: {},
      create: {
        id: `fs-${tenant.id}`,
        tenantId: tenant.id,
        model: 'prophet',
        horizonDays: 90,
        confidenceLevel: 0.95,
      },
    });

    // Create an active SOP cycle
    const existingCycle = await db.sopCycle.findFirst({ where: { tenantId: tenant.id, status: 'active' } });
    if (!existingCycle) {
      await db.sopCycle.create({
        data: {
          tenantId: tenant.id,
          name: 'Monsoon 2025 S&OP',
          periodStart: new Date('2025-06-01'),
          periodEnd: new Date('2025-09-30'),
          stage: 'validation',
          status: 'active',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        user: { id: user.id, name: user.name, role: user.role },
        suppliers: suppliers.length,
        products: products.length,
        motorcycle_models: models.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
