// ============================================
// POST /api/v1/imports/[id]/execute
// Trigger the ETL pipeline: validate → harmonize → insert
// Returns 202 Accepted (processing is async)
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  apiAccepted,
  apiError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
} from '@/lib/api/response';
import { getAuthContext, canDo, tenantScope } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

// --- Harmonization rules per import type ---
// These simulate data transformations applied during the harmonize step

interface HarmonizationRule {
  step: string;
  description: string;
  field?: string;
  transform?: string;
}

const HARMONIZATION_RULES: Record<string, HarmonizationRule[]> = {
  sales_history: [
    { step: 'normalize_dates', description: 'Convert all date formats to ISO 8601', field: 'sale_date', transform: 'dd/mm/yyyy → yyyy-mm-dd' },
    { step: 'standardize_sku', description: 'Uppercase and trim SKU codes', field: 'sku_code', transform: 'trim + uppercase' },
    { step: 'validate_quantities', description: 'Ensure quantities are positive integers', field: 'qty_sold', transform: 'abs(round())' },
    { step: 'normalize_prices', description: 'Round prices to 2 decimal places', field: 'unit_price_bdt', transform: 'round(2)' },
    { step: 'infer_channel', description: 'Default channel to "retail" if empty', field: 'channel', transform: 'default("retail")' },
    { step: 'assign_season', description: 'Auto-assign season from date', field: 'sale_date', transform: 'month → season mapping' },
  ],
  purchase_history: [
    { step: 'normalize_dates', description: 'Convert all date formats to ISO 8601', field: 'purchase_date', transform: 'dd/mm/yyyy → yyyy-mm-dd' },
    { step: 'standardize_sku', description: 'Uppercase and trim SKU codes', field: 'sku_code', transform: 'trim + uppercase' },
    { step: 'validate_quantities', description: 'Ensure quantities are positive integers', field: 'qty_purchased', transform: 'abs(round())' },
    { step: 'normalize_costs', description: 'Round costs to 2 decimal places', field: 'unit_cost_bdt', transform: 'round(2)' },
    { step: 'infer_lead_time', description: 'Default lead time to 90 days if empty', field: 'lead_time_days', transform: 'default(90)' },
  ],
  product_catalog: [
    { step: 'standardize_sku', description: 'Uppercase and trim SKU codes', field: 'sku_code', transform: 'trim + uppercase' },
    { step: 'normalize_category', description: 'Lowercase and standardize category names', field: 'category', transform: 'trim + lowercase + mapping' },
    { step: 'validate_prices', description: 'Ensure cost < selling price', field: 'selling_price_bdt', transform: 'compare(unit_cost_bdt, selling_price_bdt)' },
    { step: 'default_moq', description: 'Default MOQ to 1 if not provided', field: 'min_order_qty', transform: 'default(1)' },
  ],
  stock_levels: [
    { step: 'standardize_sku', description: 'Uppercase and trim SKU codes', field: 'sku_code', transform: 'trim + uppercase' },
    { step: 'validate_stock', description: 'Ensure stock values are non-negative', field: 'current_stock', transform: 'max(0, round())' },
    { step: 'default_location', description: 'Default warehouse location to "main"', field: 'warehouse_location', transform: 'default("main")' },
  ],
  suppliers: [
    { step: 'normalize_name', description: 'Trim and title-case supplier names', field: 'name', transform: 'trim + titlecase' },
    { step: 'validate_country', description: 'Validate ISO country codes', field: 'country', transform: 'iso_country_validation' },
    { step: 'default_lead_time', description: 'Default lead time to 90 days if empty', field: 'lead_time_days', transform: 'default(90)' },
  ],
  motorcycle_models: [
    { step: 'normalize_brand', description: 'Title-case brand names', field: 'brand', transform: 'trim + titlecase' },
    { step: 'normalize_model', description: 'Trim and title-case model names', field: 'model', transform: 'trim + titlecase' },
    { step: 'validate_cc', description: 'Ensure CC rating is a positive integer', field: 'cc_rating', transform: 'abs(round())' },
    { step: 'standardize_segment', description: 'Lowercase segment values', field: 'segment', transform: 'trim + lowercase' },
  ],
};

// Simulate async ETL processing by updating the import record in stages
async function simulateETLProcessing(importId: string, tenantId: string, importType: string, rowsTotal: number): Promise<void> {
  const rules = HARMONIZATION_RULES[importType] || [];
  const startedAt = new Date();

  // Step 1: Validating (already set by map-columns)
  // Simulate some processing time
  const validRows = rowsTotal - Math.ceil(rowsTotal * 0.002);
  const invalidRows = Math.ceil(rowsTotal * 0.001);
  const skippedRows = rowsTotal - validRows - invalidRows;

  // Step 2: Harmonizing
  const harmonizationLog = rules.map((rule) => ({
    step: rule.step,
    description: rule.description,
    field: rule.field || null,
    transform: rule.transform || null,
    rows_affected: Math.floor(rowsTotal * (0.8 + Math.random() * 0.2)),
  }));

  // Step 3: Inserting
  // Simulate some duplicates based on import type
  const duplicateRows = Math.ceil(rowsTotal * 0.02);
  const insertedRows = validRows - duplicateRows;

  // Step 4: Completed
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();

  // Final quality score
  const qualityScore = Math.max(0, Math.min(100,
    100 - (invalidRows / rowsTotal * 100) - (duplicateRows / rowsTotal * 30)
  ));

  // Update record with final results
  await db.dataImport.update({
    where: { id: importId },
    data: {
      status: 'completed',
      rowsValid: validRows,
      rowsInvalid: invalidRows,
      rowsSkipped: skippedRows,
      rowsInserted: insertedRows,
      rowsDuplicate: duplicateRows,
      qualityScore: Math.round(qualityScore * 100) / 100,
      harmonizationLog: JSON.stringify(harmonizationLog),
      startedAt,
      completedAt,
      durationMs: Math.max(durationMs, 150 + Math.floor(Math.random() * 500)),
    },
  });

  // Audit log for completion
  await createAuditLog({
    tenantId,
    action: 'import',
    entity: 'data_import',
    entityId: importId,
    metadata: {
      status: 'completed',
      rows_inserted: insertedRows,
      rows_duplicate: duplicateRows,
      rows_invalid: invalidRows,
      quality_score: qualityScore,
      harmonization_rules: rules.length,
      duration_ms: durationMs,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const context = await getAuthContext();

    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    if (!canDo(context, 'imports.crud')) {
      return forbiddenError();
    }

    // Get the import record
    const dataImport = await db.dataImport.findFirst({
      where: { id, ...tenantScope(context.tenantId) },
    });

    if (!dataImport) {
      return notFoundError('Data import');
    }

    // Import must be in 'validating' status to execute
    if (dataImport.status !== 'validating' && dataImport.status !== 'mapping') {
      if (dataImport.status === 'completed') {
        return conflictError('Import has already been completed');
      }
      if (dataImport.status === 'failed') {
        return conflictError('Import has failed. Please re-upload the file.');
      }
      return conflictError(
        `Import must be in 'validating' or 'mapping' status to execute. Current status: '${dataImport.status}'`
      );
    }

    // Check that column mapping exists
    if (!dataImport.columnMapping) {
      return conflictError('Column mapping is required before executing the import. Call /map-columns first.');
    }

    // Update status to processing (harmonizing)
    const startedAt = new Date();
    await db.dataImport.update({
      where: { id },
      data: {
        status: 'harmonizing',
        startedAt,
      },
    });

    // Audit log for execution start
    await createAuditLog({
      tenantId: context.tenantId,
      userId: context.userId || undefined,
      action: 'status_change',
      entity: 'data_import',
      entityId: id,
      changes: {
        before: { status: dataImport.status },
        after: { status: 'harmonizing' },
      },
      metadata: {
        import_type: dataImport.importType,
        rows_total: dataImport.rowsTotal,
      },
    });

    // Simulate the ETL pipeline (in a real system, this would be a background job)
    // We run it directly here for the demo, but return 202 immediately
    // In production, this would be dispatched to a queue
    simulateETLProcessing(id, context.tenantId, dataImport.importType, dataImport.rowsTotal)
      .catch((err) => {
        console.error(`[ETL Pipeline] Failed for import ${id}:`, err);
        // Mark as failed
        db.dataImport.update({
          where: { id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            errorDetails: JSON.stringify({
              message: 'ETL pipeline failed',
              error: err instanceof Error ? err.message : 'Unknown error',
            }),
          },
        }).catch(() => {});
      });

    return apiAccepted({
      import_id: id,
      status: 'processing',
      message: 'ETL pipeline started: validate → harmonize → insert',
      pipeline_steps: [
        { step: 'validate', status: 'in_progress' },
        { step: 'harmonize', status: 'pending' },
        { step: 'insert', status: 'pending' },
      ],
    });
  } catch (error) {
    console.error('[Imports/[id]/execute/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to execute import pipeline' }, 500);
  }
}
