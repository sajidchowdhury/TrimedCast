// ============================================
// TrimedCast ETL - 3-Phase Validation Engine
// Phase 1: Schema Validation
// Phase 2: Data Validation
// Phase 3: Business Rule Validation
// ============================================

import {
  type ImportTypeSchema,
  type ValidationError,
  type FieldDef,
  type ColumnMapping,
  getAllFields,
  getFieldDef,
} from './import-types';
import { applyMapping } from './column-mapper';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
}

// ---- Phase 1: Schema Validation ----

function validateSchema(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping[],
  schema: ImportTypeSchema
): ValidationError[] {
  const errors: ValidationError[] = [];
  const allFields = getAllFields(schema);

  for (let i = 0; i < rows.length; i++) {
    const mappedRow = applyMapping(rows[i], mapping);
    const rowNum = i + 2; // +2 for 1-based + header row

    for (const fieldDef of allFields) {
      const value = mappedRow[fieldDef.field];

      // Check required fields
      if (fieldDef.required && (value === null || value === undefined || value === '')) {
        errors.push({
          row: rowNum,
          field: fieldDef.field,
          value,
          error: `Required field "${fieldDef.label}" is missing or empty`,
          severity: 'error',
        });
        continue;
      }

      // Skip further validation if value is empty and field is optional
      if (value === null || value === undefined || value === '') continue;

      // Type validation
      switch (fieldDef.type) {
        case 'number': {
          const num = Number(value);
          if (isNaN(num) || !isFinite(num)) {
            errors.push({
              row: rowNum,
              field: fieldDef.field,
              value,
              error: `"${fieldDef.label}" must be a number, got "${value}"`,
              severity: 'error',
            });
          } else if (fieldDef.min !== undefined && num < fieldDef.min) {
            errors.push({
              row: rowNum,
              field: fieldDef.field,
              value,
              error: `"${fieldDef.label}" must be at least ${fieldDef.min}, got ${num}`,
              severity: 'error',
            });
          } else if (fieldDef.max !== undefined && num > fieldDef.max) {
            errors.push({
              row: rowNum,
              field: fieldDef.field,
              value,
              error: `"${fieldDef.label}" must be at most ${fieldDef.max}, got ${num}`,
              severity: 'error',
            });
          }
          break;
        }

        case 'date': {
          const dateStr = String(value);
          const parsed = new Date(dateStr);
          if (isNaN(parsed.getTime())) {
            // Try DD/MM/YYYY format
            const parts = dateStr.split(/[\/\-\.]/);
            if (parts.length === 3) {
              const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              if (isNaN(d.getTime())) {
                errors.push({
                  row: rowNum,
                  field: fieldDef.field,
                  value,
                  error: `"${fieldDef.label}" is not a valid date: "${value}"`,
                  severity: 'error',
                });
              }
            } else {
              errors.push({
                row: rowNum,
                field: fieldDef.field,
                value,
                error: `"${fieldDef.label}" is not a valid date: "${value}"`,
                severity: 'error',
              });
            }
          }
          break;
        }

        case 'enum': {
          if (fieldDef.enumValues) {
            const strVal = String(value).toLowerCase().replace(/[\s-]+/g, '_');
            if (!fieldDef.enumValues.includes(strVal) && !fieldDef.enumValues.includes(String(value))) {
              errors.push({
                row: rowNum,
                field: fieldDef.field,
                value,
                error: `"${fieldDef.label}" must be one of: ${fieldDef.enumValues.join(', ')}. Got "${value}"`,
                severity: 'warning', // warning because harmonizer may fix it
              });
            }
          }
          break;
        }

        case 'boolean': {
          const strVal = String(value).toLowerCase();
          if (!['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'].includes(strVal)) {
            errors.push({
              row: rowNum,
              field: fieldDef.field,
              value,
              error: `"${fieldDef.label}" must be true/false or yes/no, got "${value}"`,
              severity: 'warning',
            });
          }
          break;
        }

        case 'string': {
          if (fieldDef.pattern) {
            const regex = new RegExp(fieldDef.pattern);
            if (!regex.test(String(value))) {
              errors.push({
                row: rowNum,
                field: fieldDef.field,
                value,
                error: `"${fieldDef.label}" does not match expected format`,
                severity: 'error',
              });
            }
          }
          break;
        }
      }
    }
  }

  return errors;
}

// ---- Phase 2: Data Validation ----

function validateData(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping[],
  schema: ImportTypeSchema
): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenKeys = new Map<string, number>();

  // Calculate median for outlier detection
  const quantityValues: number[] = [];
  for (const row of rows) {
    const mappedRow = applyMapping(row, mapping);
    const qty = Number(mappedRow['quantity'] || mappedRow['current_stock']);
    if (!isNaN(qty)) quantityValues.push(qty);
  }
  const sortedQty = [...quantityValues].sort((a, b) => a - b);
  const median = sortedQty.length > 0
    ? sortedQty[Math.floor(sortedQty.length / 2)]
    : 0;

  for (let i = 0; i < rows.length; i++) {
    const mappedRow = applyMapping(rows[i], mapping);
    const rowNum = i + 2;

    // Check for null/empty required fields (caught in schema, but double-check)
    for (const fieldDef of schema.requiredFields) {
      const value = mappedRow[fieldDef.field];
      if (value === null || value === undefined || String(value).trim() === '') {
        // Already caught in schema validation, skip duplicate
      }
    }

    // Duplicate detection by composite key
    let compositeKey = '';
    if (schema.type === 'sales_history') {
      compositeKey = `${mappedRow['date']}_${mappedRow['product_sku']}_${mappedRow['invoice_no'] || i}`;
    } else if (schema.type === 'products') {
      compositeKey = String(mappedRow['sku']);
    } else if (schema.type === 'inventory') {
      compositeKey = String(mappedRow['product_sku']);
    } else if (schema.type === 'purchase_history') {
      compositeKey = `${mappedRow['date']}_${mappedRow['product_sku']}_${mappedRow['po_number'] || i}`;
    } else if (schema.type === 'suppliers') {
      compositeKey = String(mappedRow['name']);
    } else if (schema.type === 'motorcycle_models') {
      compositeKey = `${mappedRow['brand']}_${mappedRow['model']}`;
    } else {
      compositeKey = JSON.stringify(mappedRow);
    }

    if (seenKeys.has(compositeKey)) {
      errors.push({
        row: rowNum,
        field: '_composite',
        value: compositeKey,
        error: `Duplicate row detected (first seen at row ${seenKeys.get(compositeKey)})`,
        severity: 'warning',
      });
    } else {
      seenKeys.set(compositeKey, rowNum);
    }

    // Date range checks
    const dateFields = getAllFields(schema).filter(f => f.type === 'date');
    for (const fieldDef of dateFields) {
      const value = mappedRow[fieldDef.field];
      if (value === null || value === undefined) continue;

      const dateStr = String(value);
      let parsed: Date | null = null;

      // Try standard parse
      parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) {
        // Try DD/MM/YYYY
        const parts = dateStr.split(/[\/\-\.]/);
        if (parts.length === 3) {
          parsed = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }

      if (parsed && !isNaN(parsed.getTime())) {
        const now = new Date();
        // Future date check (for historical data)
        if (parsed > now && schema.type !== 'promo_events') {
          errors.push({
            row: rowNum,
            field: fieldDef.field,
            value,
            error: `Date "${value}" is in the future`,
            severity: 'warning',
          });
        }
        // Too old check (before 2015 for BD motorcycle market)
        if (parsed < new Date('2015-01-01')) {
          errors.push({
            row: rowNum,
            field: fieldDef.field,
            value,
            error: `Date "${value}" is before 2015, which seems too old for this dataset`,
            severity: 'warning',
          });
        }
      }
    }

    // Positive number checks
    const positiveFields = ['quantity', 'revenue', 'unit_cost', 'total_cost', 'current_stock'];
    for (const fieldName of positiveFields) {
      const value = mappedRow[fieldName];
      if (value !== null && value !== undefined) {
        const num = Number(value);
        if (!isNaN(num) && num < 0) {
          errors.push({
            row: rowNum,
            field: fieldName,
            value,
            error: `"${fieldName}" should not be negative`,
            severity: 'error',
          });
        }
      }
    }

    // Outlier detection for quantities
    const qtyField = mappedRow['quantity'] !== undefined ? 'quantity' : 'current_stock';
    const qtyValue = Number(mappedRow[qtyField]);
    if (!isNaN(qtyValue) && median > 0 && qtyValue > median * 10) {
      errors.push({
        row: rowNum,
        field: qtyField,
        value: qtyValue,
        error: `Value ${qtyValue} is more than 10x the median (${median}), possible outlier`,
        severity: 'info',
      });
    }

    // String length checks
    const stringFields = getAllFields(schema).filter(f => f.type === 'string');
    for (const fieldDef of stringFields) {
      const value = mappedRow[fieldDef.field];
      if (value !== null && value !== undefined) {
        const strLen = String(value).length;
        if (strLen > 255) {
          errors.push({
            row: rowNum,
            field: fieldDef.field,
            value: String(value).substring(0, 50) + '...',
            error: `"${fieldDef.label}" is too long (${strLen} chars, max 255)`,
            severity: 'warning',
          });
        }
      }
    }
  }

  return errors;
}

// ---- Phase 3: Business Rule Validation ----

function validateBusinessRules(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping[],
  schema: ImportTypeSchema
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const mappedRow = applyMapping(rows[i], mapping);
    const rowNum = i + 2;

    switch (schema.type) {
      case 'sales_history': {
        // Quantity must be positive
        const qty = Number(mappedRow['quantity']);
        if (!isNaN(qty) && qty <= 0) {
          errors.push({
            row: rowNum, field: 'quantity', value: qty,
            error: 'Sales quantity must be greater than 0',
            severity: 'error',
          });
        }
        // Revenue should not be negative
        const rev = mappedRow['revenue'];
        if (rev !== null && rev !== undefined && Number(rev) < 0) {
          errors.push({
            row: rowNum, field: 'revenue', value: rev,
            error: 'Revenue cannot be negative',
            severity: 'error',
          });
        }
        break;
      }

      case 'purchase_history': {
        const qty = Number(mappedRow['quantity']);
        if (!isNaN(qty) && qty <= 0) {
          errors.push({
            row: rowNum, field: 'quantity', value: qty,
            error: 'Purchase quantity must be greater than 0',
            severity: 'error',
          });
        }
        // Lead time should be reasonable (1-365 days)
        const lt = mappedRow['lead_time_actual'];
        if (lt !== null && lt !== undefined) {
          const ltNum = Number(lt);
          if (!isNaN(ltNum) && (ltNum < 1 || ltNum > 365)) {
            errors.push({
              row: rowNum, field: 'lead_time_actual', value: lt,
              error: 'Lead time should be between 1-365 days',
              severity: 'warning',
            });
          }
        }
        break;
      }

      case 'inventory': {
        const currentStock = Number(mappedRow['current_stock']);
        const safetyStock = mappedRow['safety_stock'] !== undefined ? Number(mappedRow['safety_stock']) : null;
        const reorderPoint = mappedRow['reorder_point'] !== undefined ? Number(mappedRow['reorder_point']) : null;

        // Current stock should be non-negative
        if (!isNaN(currentStock) && currentStock < 0) {
          errors.push({
            row: rowNum, field: 'current_stock', value: currentStock,
            error: 'Current stock cannot be negative',
            severity: 'error',
          });
        }
        // Safety stock should be less than reorder point
        if (safetyStock !== null && reorderPoint !== null && !isNaN(safetyStock) && !isNaN(reorderPoint)) {
          if (safetyStock > reorderPoint) {
            errors.push({
              row: rowNum, field: 'safety_stock', value: safetyStock,
              error: `Safety stock (${safetyStock}) should be less than reorder point (${reorderPoint})`,
              severity: 'warning',
            });
          }
        }
        // Check if stock is below reorder point (informative)
        if (!isNaN(currentStock) && reorderPoint !== null && !isNaN(reorderPoint)) {
          if (currentStock < reorderPoint) {
            errors.push({
              row: rowNum, field: 'current_stock', value: currentStock,
              error: `Stock (${currentStock}) is below reorder point (${reorderPoint}) — needs reorder`,
              severity: 'info',
            });
          }
        }
        break;
      }

      case 'products': {
        // SKU format check
        const sku = String(mappedRow['sku'] || '');
        if (sku && !/^[A-Za-z0-9_-]+$/.test(sku)) {
          errors.push({
            row: rowNum, field: 'sku', value: sku,
            error: 'SKU should contain only letters, numbers, dashes, and underscores',
            severity: 'warning',
          });
        }
        // Selling price should be >= unit cost
        const unitCost = mappedRow['unit_cost'] !== undefined ? Number(mappedRow['unit_cost']) : null;
        const sellPrice = mappedRow['selling_price'] !== undefined ? Number(mappedRow['selling_price']) : null;
        if (unitCost !== null && sellPrice !== null && !isNaN(unitCost) && !isNaN(sellPrice)) {
          if (sellPrice < unitCost) {
            errors.push({
              row: rowNum, field: 'selling_price', value: sellPrice,
              error: `Selling price (${sellPrice}) is below unit cost (${unitCost}) — selling at a loss`,
              severity: 'warning',
            });
          }
        }
        break;
      }

      case 'suppliers': {
        // Lead time check (China suppliers typically 60-180 days)
        const lt = mappedRow['lead_time_days'];
        if (lt !== null && lt !== undefined) {
          const ltNum = Number(lt);
          if (!isNaN(ltNum) && ltNum > 365) {
            errors.push({
              row: rowNum, field: 'lead_time_days', value: lt,
              error: 'Lead time over 365 days seems unreasonable',
              severity: 'error',
            });
          } else if (!isNaN(ltNum) && ltNum > 180) {
            errors.push({
              row: rowNum, field: 'lead_time_days', value: lt,
              error: 'Lead time over 180 days is unusually long — verify this is correct',
              severity: 'info',
            });
          }
        }
        // Reliability score check
        const rel = mappedRow['reliability'];
        if (rel !== null && rel !== undefined) {
          const relNum = Number(rel);
          if (!isNaN(relNum) && (relNum < 0 || relNum > 1)) {
            errors.push({
              row: rowNum, field: 'reliability', value: rel,
              error: 'Reliability score must be between 0 and 1',
              severity: 'error',
            });
          }
        }
        break;
      }

      case 'promo_events': {
        // End date should be after start date
        const startDate = new Date(String(mappedRow['start_date'] || ''));
        const endDate = new Date(String(mappedRow['end_date'] || ''));
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          if (endDate < startDate) {
            errors.push({
              row: rowNum, field: 'end_date', value: mappedRow['end_date'],
              error: 'End date is before start date',
              severity: 'error',
            });
          }
        }
        // Discount percentage check
        const disc = mappedRow['discount_pct'];
        if (disc !== null && disc !== undefined) {
          const discNum = Number(disc);
          if (!isNaN(discNum) && (discNum < 0 || discNum > 100)) {
            errors.push({
              row: rowNum, field: 'discount_pct', value: disc,
              error: 'Discount percentage must be between 0 and 100',
              severity: 'error',
            });
          }
        }
        break;
      }

      case 'motorcycle_models': {
        // Year range check
        const yearStart = mappedRow['year_start'] !== undefined ? Number(mappedRow['year_start']) : null;
        const yearEnd = mappedRow['year_end'] !== undefined ? Number(mappedRow['year_end']) : null;
        if (yearStart !== null && yearEnd !== null && !isNaN(yearStart) && !isNaN(yearEnd)) {
          if (yearEnd < yearStart) {
            errors.push({
              row: rowNum, field: 'year_end', value: yearEnd,
              error: 'Year end is before year start',
              severity: 'warning',
            });
          }
        }
        break;
      }
    }
  }

  return errors;
}

// ---- Main Validation Orchestrator ----

export function runAllValidations(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping[],
  schema: ImportTypeSchema
): ValidationResult {
  // Phase 1: Schema
  const schemaErrors = validateSchema(rows, mapping, schema);

  // Phase 2: Data
  const dataErrors = validateData(rows, mapping, schema);

  // Phase 3: Business Rules
  const businessErrors = validateBusinessRules(rows, mapping, schema);

  // Combine all errors
  const allErrors = [...schemaErrors, ...dataErrors, ...businessErrors];

  // Calculate stats
  const errorRows = new Set(allErrors.filter(e => e.severity === 'error').map(e => e.row));
  const totalRows = rows.length;
  const validRows = totalRows - errorRows.size;
  const warningCount = allErrors.filter(e => e.severity === 'warning').length;

  return {
    valid: errorRows.size === 0,
    errors: allErrors,
    stats: {
      total: totalRows,
      valid: validRows,
      invalid: errorRows.size,
      warnings: warningCount,
    },
  };
}

export { validateSchema, validateData, validateBusinessRules };
