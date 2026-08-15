// ============================================
// POST /api/v1/imports/upload
// Upload file for data import (ETL step 1)
// Content-Type: multipart/form-data
// ============================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiCreated, apiError, validationError, unauthorizedError, forbiddenError } from '@/lib/api/response';
import { getAuthContext, canDo, resolveTenant } from '@/lib/api/auth';
import { createAuditLog } from '@/lib/api/audit';

// --- Column detection config per import type ---

interface ColumnDef {
  source: string;
  target: string;
  required: boolean;
  type: 'string' | 'number' | 'date';
}

const IMPORT_TYPE_COLUMNS: Record<string, ColumnDef[]> = {
  sales_history: [
    { source: 'Date', target: 'sale_date', required: true, type: 'date' },
    { source: 'SKU', target: 'sku_code', required: true, type: 'string' },
    { source: 'Qty', target: 'qty_sold', required: true, type: 'number' },
    { source: 'Price', target: 'unit_price_bdt', required: false, type: 'number' },
    { source: 'Total', target: 'total_amount_bdt', required: false, type: 'number' },
    { source: 'Invoice', target: 'invoice_number', required: false, type: 'string' },
    { source: 'Channel', target: 'channel', required: false, type: 'string' },
    { source: 'Region', target: 'region', required: false, type: 'string' },
  ],
  purchase_history: [
    { source: 'Date', target: 'purchase_date', required: true, type: 'date' },
    { source: 'SKU', target: 'sku_code', required: true, type: 'string' },
    { source: 'Qty', target: 'qty_purchased', required: true, type: 'number' },
    { source: 'Cost', target: 'unit_cost_bdt', required: false, type: 'number' },
    { source: 'PO', target: 'po_number', required: false, type: 'string' },
    { source: 'Supplier', target: 'supplier_name', required: false, type: 'string' },
    { source: 'LeadTime', target: 'lead_time_days', required: false, type: 'number' },
  ],
  product_catalog: [
    { source: 'SKU', target: 'sku_code', required: true, type: 'string' },
    { source: 'Name', target: 'name', required: true, type: 'string' },
    { source: 'Category', target: 'category', required: true, type: 'string' },
    { source: 'Cost', target: 'unit_cost_bdt', required: false, type: 'number' },
    { source: 'Price', target: 'selling_price_bdt', required: false, type: 'number' },
    { source: 'MOQ', target: 'min_order_qty', required: false, type: 'number' },
    { source: 'Supplier', target: 'supplier_name', required: false, type: 'string' },
  ],
  stock_levels: [
    { source: 'SKU', target: 'sku_code', required: true, type: 'string' },
    { source: 'Qty', target: 'current_stock', required: true, type: 'number' },
    { source: 'Location', target: 'warehouse_location', required: false, type: 'string' },
    { source: 'Reserved', target: 'reserved_stock', required: false, type: 'number' },
  ],
  suppliers: [
    { source: 'Name', target: 'name', required: true, type: 'string' },
    { source: 'Country', target: 'country', required: false, type: 'string' },
    { source: 'LeadTime', target: 'lead_time_days', required: false, type: 'number' },
    { source: 'Email', target: 'contact_email', required: false, type: 'string' },
    { source: 'Phone', target: 'contact_phone', required: false, type: 'string' },
    { source: 'Reliability', target: 'reliability_score', required: false, type: 'number' },
  ],
  motorcycle_models: [
    { source: 'Brand', target: 'brand', required: true, type: 'string' },
    { source: 'Model', target: 'model', required: true, type: 'string' },
    { source: 'CC', target: 'cc_rating', required: false, type: 'number' },
    { source: 'Segment', target: 'segment', required: false, type: 'string' },
    { source: 'YearStart', target: 'year_start', required: false, type: 'number' },
    { source: 'YearEnd', target: 'year_end', required: false, type: 'number' },
  ],
};

const VALID_IMPORT_TYPES = Object.keys(IMPORT_TYPE_COLUMNS);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Generate sample rows based on import type
function generateSampleRows(importType: string): Record<string, string>[] {
  const columns = IMPORT_TYPE_COLUMNS[importType];
  if (!columns) return [];

  const samples: Record<string, string>[][] = [];

  for (let i = 0; i < 5; i++) {
    const row: Record<string, string> = {};
    for (const col of columns) {
      switch (col.type) {
        case 'date':
          row[col.source] = `2025-0${1 + i}-15`;
          break;
        case 'number':
          row[col.source] = String(Math.floor(Math.random() * 500) + 10);
          break;
        case 'string':
          row[col.source] = `${col.source}_${i + 1}`;
          break;
      }
    }
    samples.push(row);
  }

  return samples;
}

// Estimate row count based on file size (rough heuristic)
function estimateRowCount(fileSize: number): number {
  // Average ~80 bytes per row for typical CSV
  const avgRowSize = 80;
  const estimated = Math.max(10, Math.floor(fileSize / avgRowSize));
  // Cap at reasonable limit
  return Math.min(estimated, 100000);
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated ? context.tenantId : await resolveTenant();

    if (!context.isAuthenticated) {
      return unauthorizedError();
    }

    if (!canDo(context, 'imports.crud')) {
      return forbiddenError();
    }

    // Parse multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file');
    const importType = formData.get('import_type') as string | null;

    // Validate import_type
    if (!importType || !VALID_IMPORT_TYPES.includes(importType)) {
      return validationError(
        'import_type',
        `import_type is required and must be one of: ${VALID_IMPORT_TYPES.join(', ')}`
      );
    }

    // Validate file
    if (!file || !(file instanceof File)) {
      return validationError('file', 'file is required and must be a valid file (Excel/CSV)');
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return validationError('file', `File size exceeds maximum limit of 10MB (received ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    if (file.size === 0) {
      return validationError('file', 'File is empty');
    }

    // Validate file extension
    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase();
    const validExtensions = ['csv', 'xlsx', 'xls'];
    if (!ext || !validExtensions.includes(ext)) {
      return validationError('file', `File must be Excel (.xlsx, .xls) or CSV (.csv). Received: .${ext || 'unknown'}`);
    }

    // Get column definitions for this import type
    const columnDefs = IMPORT_TYPE_COLUMNS[importType];

    // Build detected_columns
    const detectedColumns = columnDefs.map((col) => ({
      source: col.source,
      target: col.target,
      type: col.type,
      required: col.required,
    }));

    // Build suggested_mapping
    const suggestedMapping: Record<string, string> = {};
    for (const col of columnDefs) {
      suggestedMapping[col.source] = col.target;
    }

    // Generate sample rows
    const sampleRows = generateSampleRows(importType);

    // Estimate total rows
    const estimatedRows = estimateRowCount(file.size);

    // Create DataImport record
    const dataImport = await db.dataImport.create({
      data: {
        tenantId,
        importType,
        fileName,
        fileSize: file.size,
        rowsTotal: estimatedRows,
        status: 'mapping',
        rawPreview: JSON.stringify(sampleRows),
        columnMapping: JSON.stringify(suggestedMapping),
        createdBy: context.userId || null,
      },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: context.userId || undefined,
      action: 'import',
      entity: 'data_import',
      entityId: dataImport.id,
      metadata: {
        import_type: importType,
        file_name: fileName,
        file_size: file.size,
        estimated_rows: estimatedRows,
      },
    });

    return apiCreated({
      import_id: dataImport.id,
      file_name: fileName,
      import_type: importType,
      file_size: file.size,
      estimated_rows: estimatedRows,
      detected_columns: detectedColumns,
      sample_rows: sampleRows,
      suggested_mapping: suggestedMapping,
      status: 'mapping',
    });
  } catch (error) {
    console.error('[Imports/Upload/POST]', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to process file upload' }, 500);
  }
}
