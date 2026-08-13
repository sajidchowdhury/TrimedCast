// ============================================
// TrimedCast ETL - Batch Database Inserter
// ============================================

import { db } from '@/lib/db';
import { type ImportType, type ImportTypeSchema, IMPORT_TYPE_SCHEMAS, type ValidationError } from './import-types';

export interface InsertionResult {
  inserted: number;
  skipped: number;
  errors: ValidationError[];
  createdMasterData: string[];
}

/**
 * Look up a product ID by SKU within a tenant
 */
async function lookupProduct(tenantId: string, sku: string): Promise<string | null> {
  const product = await db.product.findFirst({
    where: { tenantId, sku: sku.toUpperCase() },
    select: { id: true },
  });
  return product?.id || null;
}

/**
 * Look up a supplier ID by name within a tenant
 */
async function lookupSupplier(tenantId: string, name: string): Promise<string | null> {
  const supplier = await db.supplier.findFirst({
    where: { tenantId, name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  return supplier?.id || null;
}

/**
 * Batch insert rows for sales_history import type
 */
async function insertSalesHistory(
  rows: Record<string, unknown>[],
  tenantId: string
): Promise<InsertionResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: ValidationError[] = [];
  const createdMasterData: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      // Look up or create product
      let productId = await lookupProduct(tenantId, String(row['product_sku']));
      if (!productId) {
        // Auto-create product
        const newProduct = await db.product.create({
          data: {
            tenantId,
            sku: String(row['product_sku']).toUpperCase(),
            name: String(row['product_sku']),
            category: 'other',
          },
        });
        productId = newProduct.id;
        createdMasterData.push(`Auto-created product: ${row['product_sku']}`);
      }

      await db.salesHistory.create({
        data: {
          tenantId,
          productId,
          date: new Date(String(row['date'])),
          quantity: Number(row['quantity']),
          revenue: row['revenue'] ? Number(row['revenue']) : null,
          channel: row['channel'] ? String(row['channel']) : null,
          region: row['region'] ? String(row['region']) : null,
          invoiceNo: row['invoice_no'] ? String(row['invoice_no']) : null,
          customerId: row['customer_id'] ? String(row['customer_id']) : null,
          season: row['season'] ? String(row['season']) : null,
        },
      });
      inserted++;
    } catch (err) {
      skipped++;
      errors.push({
        row: rowNum,
        field: '_insert',
        value: null,
        error: `Insert failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    }
  }

  return { inserted, skipped, errors, createdMasterData };
}

/**
 * Batch insert rows for purchase_history import type
 */
async function insertPurchaseHistory(
  rows: Record<string, unknown>[],
  tenantId: string
): Promise<InsertionResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: ValidationError[] = [];
  const createdMasterData: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      let productId = await lookupProduct(tenantId, String(row['product_sku']));
      if (!productId) {
        const newProduct = await db.product.create({
          data: {
            tenantId,
            sku: String(row['product_sku']).toUpperCase(),
            name: String(row['product_sku']),
            category: 'other',
          },
        });
        productId = newProduct.id;
        createdMasterData.push(`Auto-created product: ${row['product_sku']}`);
      }

      let supplierId: string | null = null;
      if (row['supplier_name']) {
        supplierId = await lookupSupplier(tenantId, String(row['supplier_name']));
        if (!supplierId) {
          const newSupplier = await db.supplier.create({
            data: {
              tenantId,
              name: String(row['supplier_name']),
              country: 'China',
            },
          });
          supplierId = newSupplier.id;
          createdMasterData.push(`Auto-created supplier: ${row['supplier_name']}`);
        }
      }

      await db.purchaseHistory.create({
        data: {
          tenantId,
          productId,
          date: new Date(String(row['date'])),
          quantity: Number(row['quantity']),
          unitCost: row['unit_cost'] ? Number(row['unit_cost']) : null,
          totalCost: row['total_cost'] ? Number(row['total_cost']) : null,
          supplierId,
          poNumber: row['po_number'] ? String(row['po_number']) : null,
          leadTimeActual: row['lead_time_actual'] ? Number(row['lead_time_actual']) : null,
          season: row['season'] ? String(row['season']) : null,
        },
      });
      inserted++;
    } catch (err) {
      skipped++;
      errors.push({
        row: rowNum, field: '_insert', value: null,
        error: `Insert failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    }
  }

  return { inserted, skipped, errors, createdMasterData };
}

/**
 * Batch insert rows for products import type (upsert)
 */
async function insertProducts(
  rows: Record<string, unknown>[],
  tenantId: string
): Promise<InsertionResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: ValidationError[] = [];
  const createdMasterData: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      await db.product.upsert({
        where: {
          tenantId_sku: {
            tenantId,
            sku: String(row['sku']).toUpperCase(),
          },
        },
        create: {
          tenantId,
          sku: String(row['sku']).toUpperCase(),
          name: String(row['name']),
          category: String(row['category'] || 'other'),
          subcategory: row['subcategory'] ? String(row['subcategory']) : null,
          unitCost: row['unit_cost'] ? Number(row['unit_cost']) : null,
          sellingPrice: row['selling_price'] ? Number(row['selling_price']) : null,
          unit: String(row['unit'] || 'piece'),
          minOrderQty: Number(row['min_order_qty'] || 1),
          leadTimeDays: row['lead_time_days'] ? Number(row['lead_time_days']) : null,
          isSeasonal: row['is_seasonal'] === true || row['is_seasonal'] === 'true' || row['is_seasonal'] === 1,
          seasonalityType: row['seasonality_type'] ? String(row['seasonality_type']) : null,
        },
        update: {
          name: String(row['name']),
          category: String(row['category'] || 'other'),
          subcategory: row['subcategory'] ? String(row['subcategory']) : null,
          unitCost: row['unit_cost'] ? Number(row['unit_cost']) : null,
          sellingPrice: row['selling_price'] ? Number(row['selling_price']) : null,
          unit: String(row['unit'] || 'piece'),
          minOrderQty: Number(row['min_order_qty'] || 1),
          leadTimeDays: row['lead_time_days'] ? Number(row['lead_time_days']) : null,
        },
      });
      inserted++;
    } catch (err) {
      skipped++;
      errors.push({
        row: rowNum, field: '_insert', value: null,
        error: `Insert failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    }
  }

  return { inserted, skipped, errors, createdMasterData };
}

/**
 * Batch insert rows for inventory import type
 */
async function insertInventory(
  rows: Record<string, unknown>[],
  tenantId: string
): Promise<InsertionResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: ValidationError[] = [];
  const createdMasterData: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      let productId = await lookupProduct(tenantId, String(row['product_sku']));
      if (!productId) {
        const newProduct = await db.product.create({
          data: {
            tenantId,
            sku: String(row['product_sku']).toUpperCase(),
            name: String(row['product_sku']),
            category: 'other',
          },
        });
        productId = newProduct.id;
        createdMasterData.push(`Auto-created product: ${row['product_sku']}`);
      }

      await db.inventory.upsert({
        where: {
          tenantId_productId: { tenantId, productId },
        },
        create: {
          tenantId,
          productId,
          currentStock: Number(row['current_stock'] || 0),
          reservedStock: Number(row['reserved_stock'] || 0),
          availableStock: Number(row['available_stock'] || row['current_stock'] || 0),
          reorderPoint: row['reorder_point'] ? Number(row['reorder_point']) : null,
          safetyStock: row['safety_stock'] ? Number(row['safety_stock']) : null,
          maxStockLevel: row['max_stock_level'] ? Number(row['max_stock_level']) : null,
          warehouseLoc: row['warehouse_location'] ? String(row['warehouse_location']) : null,
        },
        update: {
          currentStock: Number(row['current_stock'] || 0),
          reservedStock: Number(row['reserved_stock'] || 0),
          availableStock: Number(row['available_stock'] || row['current_stock'] || 0),
          reorderPoint: row['reorder_point'] ? Number(row['reorder_point']) : null,
          safetyStock: row['safety_stock'] ? Number(row['safety_stock']) : null,
          maxStockLevel: row['max_stock_level'] ? Number(row['max_stock_level']) : null,
          warehouseLoc: row['warehouse_location'] ? String(row['warehouse_location']) : null,
        },
      });
      inserted++;
    } catch (err) {
      skipped++;
      errors.push({
        row: rowNum, field: '_insert', value: null,
        error: `Insert failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    }
  }

  return { inserted, skipped, errors, createdMasterData };
}

/**
 * Batch insert rows for suppliers import type
 */
async function insertSuppliers(
  rows: Record<string, unknown>[],
  tenantId: string
): Promise<InsertionResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: ValidationError[] = [];
  const createdMasterData: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      await db.supplier.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name: String(row['name']),
          },
        },
        create: {
          tenantId,
          name: String(row['name']),
          code: row['code'] ? String(row['code']) : null,
          country: String(row['country'] || 'China'),
          leadTimeDays: Number(row['lead_time_days'] || 90),
          reliability: row['reliability'] ? Number(row['reliability']) : null,
          isCnyAffected: row['is_cny_affected'] !== undefined
            ? (row['is_cny_affected'] === true || row['is_cny_affected'] === 'true' || row['is_cny_affected'] === 1)
            : true,
          contactEmail: row['contact_email'] ? String(row['contact_email']) : null,
          contactPhone: row['contact_phone'] ? String(row['contact_phone']) : null,
        },
        update: {
          code: row['code'] ? String(row['code']) : null,
          country: String(row['country'] || 'China'),
          leadTimeDays: Number(row['lead_time_days'] || 90),
          reliability: row['reliability'] ? Number(row['reliability']) : null,
          contactEmail: row['contact_email'] ? String(row['contact_email']) : null,
          contactPhone: row['contact_phone'] ? String(row['contact_phone']) : null,
        },
      });
      inserted++;
    } catch (err) {
      skipped++;
      errors.push({
        row: rowNum, field: '_insert', value: null,
        error: `Insert failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    }
  }

  return { inserted, skipped, errors, createdMasterData };
}

/**
 * Batch insert rows for motorcycle_models import type
 */
async function insertMotorcycleModels(
  rows: Record<string, unknown>[],
  tenantId: string
): Promise<InsertionResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: ValidationError[] = [];
  const createdMasterData: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      await db.motorcycleModel.upsert({
        where: {
          tenantId_brand_model: {
            tenantId,
            brand: String(row['brand']),
            model: String(row['model']),
          },
        },
        create: {
          tenantId,
          brand: String(row['brand']),
          model: String(row['model']),
          yearStart: row['year_start'] ? Number(row['year_start']) : null,
          yearEnd: row['year_end'] ? Number(row['year_end']) : null,
          ccRating: row['cc_rating'] ? Number(row['cc_rating']) : null,
          segment: row['segment'] ? String(row['segment']) : null,
        },
        update: {
          yearStart: row['year_start'] ? Number(row['year_start']) : null,
          yearEnd: row['year_end'] ? Number(row['year_end']) : null,
          ccRating: row['cc_rating'] ? Number(row['cc_rating']) : null,
          segment: row['segment'] ? String(row['segment']) : null,
        },
      });
      inserted++;
    } catch (err) {
      skipped++;
      errors.push({
        row: rowNum, field: '_insert', value: null,
        error: `Insert failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    }
  }

  return { inserted, skipped, errors, createdMasterData };
}

/**
 * Batch insert rows for promo_events import type
 */
async function insertPromoEvents(
  rows: Record<string, unknown>[],
  tenantId: string
): Promise<InsertionResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: ValidationError[] = [];
  const createdMasterData: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      await db.promoEvent.create({
        data: {
          tenantId,
          name: String(row['name']),
          type: String(row['type']),
          startDate: new Date(String(row['start_date'])),
          endDate: new Date(String(row['end_date'])),
          discountPct: row['discount_pct'] ? Number(row['discount_pct']) : null,
          expectedUplift: row['expected_uplift'] ? Number(row['expected_uplift']) : null,
        },
      });
      inserted++;
    } catch (err) {
      skipped++;
      errors.push({
        row: rowNum, field: '_insert', value: null,
        error: `Insert failed: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    }
  }

  return { inserted, skipped, errors, createdMasterData };
}

// ---- Main Batch Insert Orchestrator ----

export async function batchInsert(
  rows: Record<string, unknown>[],
  importType: ImportType,
  tenantId: string
): Promise<InsertionResult> {
  switch (importType) {
    case 'sales_history':
      return insertSalesHistory(rows, tenantId);
    case 'purchase_history':
      return insertPurchaseHistory(rows, tenantId);
    case 'products':
      return insertProducts(rows, tenantId);
    case 'inventory':
      return insertInventory(rows, tenantId);
    case 'suppliers':
      return insertSuppliers(rows, tenantId);
    case 'motorcycle_models':
      return insertMotorcycleModels(rows, tenantId);
    case 'promo_events':
      return insertPromoEvents(rows, tenantId);
    default:
      return {
        inserted: 0,
        skipped: rows.length,
        errors: [{ row: 0, field: '_type', value: importType, error: `Unknown import type: ${importType}`, severity: 'error' }],
        createdMasterData: [],
      };
  }
}
