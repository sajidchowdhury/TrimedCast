// ============================================
// TrimedCast API - Seed Demo Data
// POST: Create demo tenant and user
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    for (const product of products) {
      await db.inventory.upsert({
        where: { tenantId_productId: { tenantId: tenant.id, productId: product.id } },
        update: {},
        create: {
          tenantId: tenant.id,
          productId: product.id,
          currentStock: Math.floor(Math.random() * 200) + 20,
          reservedStock: Math.floor(Math.random() * 30),
          reorderPoint: 30,
          safetyStock: 15,
          maxStockLevel: 300,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { tenant, user, suppliers: suppliers.length, products: products.length },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
