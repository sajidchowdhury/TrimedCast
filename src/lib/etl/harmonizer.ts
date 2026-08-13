// ============================================
// TrimedCast ETL - 6-Step Harmonization Pipeline
// Step 1: Trim & Normalize
// Step 2: Date Normalization
// Step 3: Category Mapping
// Step 4: Unit Conversion
// Step 5: Deduplication
// Step 6: Enrichment
// ============================================

import {
  type ImportTypeSchema,
  type ColumnMapping,
  type HarmonizationStep,
  type FieldDef,
  getAllFields,
  getBDSeason,
} from './import-types';
import { applyMapping } from './column-mapper';

export interface HarmonizationResult {
  harmonizedRows: Record<string, unknown>[];
  log: HarmonizationStep[];
  stats: {
    inputRows: number;
    outputRows: number;
    duplicatesRemoved: number;
    fieldsNormalized: number;
    categoriesMapped: number;
    datesNormalized: number;
  };
}

// Category mapping dictionary for fuzzy matching
const CATEGORY_MAP: Record<string, string> = {
  'piston ring': 'piston', 'piston kit': 'piston', 'piston set': 'piston',
  'brake pad': 'brake_pad', 'brake pads': 'brake_pad', 'disc pad': 'brake_pad',
  'air filter': 'filter', 'oil filter': 'filter', 'fuel filter': 'filter',
  'chain set': 'chain', 'drive chain': 'chain', 'sprocket chain': 'chain',
  'head gasket': 'gasket', 'gasket kit': 'gasket', 'base gasket': 'gasket',
  'spark plug': 'spark_plug', 'ngk plug': 'spark_plug',
  'clutch plate': 'clutch', 'clutch set': 'clutch', 'friction plate': 'clutch',
  'tyre': 'tire', 'rear tyre': 'tire', 'front tyre': 'tire',
  'ball bearing': 'bearing', 'roller bearing': 'bearing',
  'brake cable': 'cable', 'clutch cable': 'cable', 'speedometer cable': 'cable',
  'engine oil': 'engine', 'motor oil': 'engine',
  'shock': 'shock_absorber', 'shocker': 'shock_absorber', 'rear shock': 'shock_absorber',
  'silencer': 'exhaust', 'muffler': 'exhaust',
  'head lamp': 'headlight', 'head light': 'headlight',
  'tail lamp': 'taillight', 'tail light': 'taillight',
  'side mirror': 'mirror', 'rear mirror': 'mirror',
  'fuel tank': 'tank', 'petrol tank': 'tank',
  'handle bar': 'handlebar',
  'carb': 'carburetor', 'carbie': 'carburetor',
};

const CHANNEL_MAP: Record<string, string> = {
  'retail': 'retail', 'shop': 'retail', 'direct': 'retail', 'store': 'retail',
  'wholesale': 'wholesale', 'dealer': 'wholesale', 'bulk': 'wholesale', 'distributor': 'wholesale',
  'online': 'online', 'ecommerce': 'online', 'web': 'online', 'digital': 'online',
};

const REGION_MAP: Record<string, string> = {
  'dhaka': 'dhaka', 'dhk': 'dhaka', 'ঢাকা': 'dhaka',
  'chittagong': 'chittagong', 'ctg': 'chittagong', 'চট্টগ্রাম': 'chittagong', 'chattogram': 'chittagong',
  'sylhet': 'sylhet', 'syl': 'sylhet', 'সিলেট': 'sylhet',
  'rajshahi': 'rajshahi', 'raj': 'rajshahi', 'রাজশাহী': 'rajshahi',
  'khulna': 'khulna', 'khl': 'khulna', 'খুলনা': 'khulna',
  'barishal': 'barishal', 'bar': 'barishal', 'বরিশাল': 'barishal', 'barisal': 'barishal',
  'rangpur': 'rangpur', 'rng': 'rangpur', 'রংপুর': 'rangpur',
  'mymensingh': 'mymensingh', 'mym': 'mymensingh', 'ময়মনসিংহ': 'mymensingh',
};

const COUNTRY_MAP: Record<string, string> = {
  'china': 'China', 'cn': 'China', 'চীন': 'China', 'prc': 'China',
  'japan': 'Japan', 'jp': 'Japan', 'জাপান': 'Japan',
  'india': 'India', 'in': 'India', 'ভারত': 'India',
  'thailand': 'Thailand', 'th': 'Thailand',
  'taiwan': 'Taiwan', 'tw': 'Taiwan',
  'bangladesh': 'Bangladesh', 'bd': 'Bangladesh', 'বাংলাদেশ': 'Bangladesh',
  'indonesia': 'Indonesia', 'id': 'Indonesia',
};

// ---- Step 1: Trim & Normalize ----

function harmonizeTrimNormalize(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping[]
): { rows: Record<string, unknown>[]; changes: number } {
  let totalChanges = 0;
  const result = rows.map(row => {
    const mapped = applyMapping(row, mapping);
    const newRow: Record<string, unknown> = {};
    let changes = 0;

    for (const [key, value] of Object.entries(mapped)) {
      if (value === null || value === undefined) {
        newRow[key] = null;
        continue;
      }

      if (typeof value === 'string') {
        let str = value;

        // Trim whitespace
        const trimmed = str.trim();
        if (trimmed !== str) changes++;
        str = trimmed;

        // Normalize case based on field
        if (key === 'sku' || key === 'product_sku' || key === 'code' || key === 'po_number' || key === 'invoice_no') {
          const upper = str.toUpperCase();
          if (upper !== str) changes++;
          str = upper;
          // Remove special chars from SKU (keep alphanumeric, dash, underscore)
          if (key === 'sku' || key === 'product_sku') {
            const cleaned = str.replace(/[^A-Za-z0-9_-]/g, '');
            if (cleaned !== str) changes++;
            str = cleaned;
          }
        } else if (key === 'name' || key === 'supplier_name') {
          // Title case for names
          const titled = str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase());
          if (titled !== str) changes++;
          str = titled;
        }

        // Normalize whitespace (collapse multiple spaces)
        const collapsed = str.replace(/\s+/g, ' ');
        if (collapsed !== str) changes++;
        str = collapsed;

        // Strip leading zeros from numeric-looking strings (except codes)
        if (!['sku', 'product_sku', 'code', 'po_number', 'invoice_no'].includes(key)) {
          if (/^0+\d+$/.test(str) && str.length > 1) {
            const stripped = String(parseInt(str, 10));
            if (stripped !== str) changes++;
            str = stripped;
          }
        }

        newRow[key] = str || null;
      } else {
        newRow[key] = value;
      }
    }

    totalChanges += changes;
    return newRow;
  });

  return { rows: result, changes: totalChanges };
}

// ---- Step 2: Date Normalization ----

function harmonizeDates(
  rows: Record<string, unknown>[],
  schema: ImportTypeSchema
): { rows: Record<string, unknown>[]; datesNormalized: number } {
  let datesNormalized = 0;
  const dateFields = getAllFields(schema).filter(f => f.type === 'date');

  const result = rows.map(row => {
    const newRow = { ...row };

    for (const fieldDef of dateFields) {
      const value = newRow[fieldDef.field];
      if (value === null || value === undefined) continue;

      const dateStr = String(value);
      let parsed: Date | null = null;

      // Try YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        parsed = new Date(dateStr);
      }

      // Try DD/MM/YYYY or DD-MM-YYYY
      if (!parsed || isNaN(parsed.getTime())) {
        const parts = dateStr.split(/[\/\-\.]/);
        if (parts.length === 3) {
          const [p1, p2, p3] = parts.map(Number);
          if (p3 > 100) {
            // DD/MM/YYYY format
            parsed = new Date(p3, p2 - 1, p1);
          } else if (p1 > 100) {
            // YYYY/MM/DD format
            parsed = new Date(p1, p2 - 1, p3);
          }
        }
      }

      // Try DD-MMM-YYYY (e.g., 15-Jan-2024)
      if (!parsed || isNaN(parsed.getTime())) {
        const match = dateStr.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{4})$/);
        if (match) {
          parsed = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
        }
      }

      // Try standard parse
      if (!parsed || isNaN(parsed.getTime())) {
        parsed = new Date(dateStr);
      }

      if (parsed && !isNaN(parsed.getTime())) {
        const isoDate = parsed.toISOString().split('T')[0]; // YYYY-MM-DD
        newRow[fieldDef.field] = isoDate;
        if (isoDate !== dateStr) datesNormalized++;

        // Auto-assign season for date fields
        if (fieldDef.field === 'date' && !newRow['season']) {
          newRow['season'] = getBDSeason(parsed.getMonth() + 1);
        }
      } else {
        // Keep original value, validation will flag it
        newRow[fieldDef.field] = dateStr;
      }
    }

    return newRow;
  });

  return { rows: result, datesNormalized };
}

// ---- Step 3: Category Mapping ----

function harmonizeCategories(
  rows: Record<string, unknown>[],
  schema: ImportTypeSchema
): { rows: Record<string, unknown>[]; categoriesMapped: number } {
  let categoriesMapped = 0;

  const result = rows.map(row => {
    const newRow = { ...row };

    // Map product category
    if (newRow['category'] && typeof newRow['category'] === 'string') {
      const lower = newRow['category'].toLowerCase().replace(/[\s-]+/g, '_');
      const mapped = CATEGORY_MAP[lower] || CATEGORY_MAP[newRow['category'].toLowerCase()];
      if (mapped) {
        if (mapped !== newRow['category']) categoriesMapped++;
        newRow['category'] = mapped;
      }
    }

    // Map channel
    if (newRow['channel'] && typeof newRow['channel'] === 'string') {
      const lower = newRow['channel'].toLowerCase();
      const mapped = CHANNEL_MAP[lower] || CHANNEL_MAP[newRow['channel'].toLowerCase()];
      if (mapped) {
        if (mapped !== newRow['channel']) categoriesMapped++;
        newRow['channel'] = mapped;
      }
    }

    // Map region
    if (newRow['region'] && typeof newRow['region'] === 'string') {
      const lower = newRow['region'].toLowerCase();
      const mapped = REGION_MAP[lower] || REGION_MAP[newRow['region'].toLowerCase()];
      if (mapped) {
        if (mapped !== newRow['region']) categoriesMapped++;
        newRow['region'] = mapped;
      }
    }

    // Map country (for suppliers)
    if (newRow['country'] && typeof newRow['country'] === 'string') {
      const lower = newRow['country'].toLowerCase();
      const mapped = COUNTRY_MAP[lower] || COUNTRY_MAP[newRow['country'].toLowerCase()];
      if (mapped) {
        if (mapped !== newRow['country']) categoriesMapped++;
        newRow['country'] = mapped;
      }
    }

    // Map promo type
    if (newRow['type'] && schema.type === 'promo_events' && typeof newRow['type'] === 'string') {
      const lower = newRow['type'].toLowerCase().replace(/[\s-]+/g, '_');
      const promoMap: Record<string, string> = {
        'eid': 'eid_discount', 'eid discount': 'eid_discount', 'eid sale': 'eid_discount',
        'seasonal': 'seasonal_sale', 'season': 'seasonal_sale', 'seasonal sale': 'seasonal_sale',
        'clearance': 'clearance', 'clearance sale': 'clearance', 'closeout': 'clearance',
        'flash': 'flash_sale', 'flash sale': 'flash_sale', 'deal': 'flash_sale',
        'bundle': 'bundle_deal', 'combo': 'bundle_deal',
        'loyalty': 'loyalty_reward', 'member': 'loyalty_reward',
      };
      const mapped = promoMap[lower];
      if (mapped) {
        if (mapped !== newRow['type']) categoriesMapped++;
        newRow['type'] = mapped;
      }
    }

    return newRow;
  });

  return { rows: result, categoriesMapped };
}

// ---- Step 4: Unit Conversion ----

function harmonizeUnits(
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  return rows.map(row => {
    const newRow = { ...row };

    // Convert "dozen" to 12 multiplier
    if (newRow['unit'] === 'dozen' && newRow['quantity'] !== undefined) {
      newRow['quantity'] = Number(newRow['quantity']) * 12;
      newRow['unit'] = 'piece';
    }

    // Convert "pair" to 2 for applicable categories
    if (newRow['unit'] === 'pair') {
      const pairCategories = ['brake_pad', 'bearing', 'mirror', 'tire'];
      if (pairCategories.includes(String(newRow['category']))) {
        newRow['quantity'] = Number(newRow['quantity'] || 1) * 2;
        newRow['unit'] = 'piece';
      }
    }

    // Convert "set of 10" type units
    if (typeof newRow['unit'] === 'string' && newRow['unit'].includes('set')) {
      const match = String(newRow['unit']).match(/set\s*(?:of\s*)?(\d+)/i);
      if (match) {
        newRow['quantity'] = Number(newRow['quantity'] || 1) * parseInt(match[1]);
        newRow['unit'] = 'set';
      }
    }

    return newRow;
  });
}

// ---- Step 5: Deduplication ----

function harmonizeDedup(
  rows: Record<string, unknown>[],
  schema: ImportTypeSchema
): { rows: Record<string, unknown>[]; duplicatesRemoved: number } {
  const seen = new Map<string, Record<string, unknown>>();
  const result: Record<string, unknown>[] = [];

  for (const row of rows) {
    let key: string;

    switch (schema.type) {
      case 'sales_history':
        key = `${row['date']}_${row['product_sku']}_${row['invoice_no'] || ''}`;
        break;
      case 'purchase_history':
        key = `${row['date']}_${row['product_sku']}_${row['po_number'] || ''}`;
        break;
      case 'products':
        key = String(row['sku']);
        break;
      case 'inventory':
        key = String(row['product_sku']);
        break;
      case 'suppliers':
        key = String(row['name']);
        break;
      case 'motorcycle_models':
        key = `${row['brand']}_${row['model']}`;
        break;
      case 'promo_events':
        key = `${row['name']}_${row['start_date']}`;
        break;
      default:
        key = JSON.stringify(row);
    }

    if (!seen.has(key)) {
      seen.set(key, row);
      result.push(row);
    } else {
      // Keep the more complete record (more non-null fields)
      const existing = seen.get(key)!;
      const existingFields = Object.values(existing).filter(v => v !== null && v !== undefined).length;
      const newFields = Object.values(row).filter(v => v !== null && v !== undefined).length;
      if (newFields > existingFields) {
        const idx = result.indexOf(existing);
        if (idx >= 0) result[idx] = row;
        seen.set(key, row);
      }
    }
  }

  return {
    rows: result,
    duplicatesRemoved: rows.length - result.length,
  };
}

// ---- Step 6: Enrichment ----

function harmonizeEnrichment(
  rows: Record<string, unknown>[],
  schema: ImportTypeSchema
): Record<string, unknown>[] {
  return rows.map(row => {
    const newRow = { ...row };

    switch (schema.type) {
      case 'inventory': {
        // Compute available_stock = current_stock - reserved_stock
        const currentStock = Number(newRow['current_stock'] || 0);
        const reservedStock = Number(newRow['reserved_stock'] || 0);
        newRow['available_stock'] = Math.max(0, currentStock - reservedStock);
        break;
      }

      case 'purchase_history': {
        // Compute total_cost = quantity * unit_cost
        const qty = Number(newRow['quantity'] || 0);
        const unitCost = newRow['unit_cost'] !== undefined ? Number(newRow['unit_cost']) : null;
        if (unitCost !== null && !isNaN(unitCost) && newRow['total_cost'] === undefined) {
          newRow['total_cost'] = qty * unitCost;
        }
        // Fill season from date
        if (!newRow['season'] && newRow['date']) {
          const d = new Date(String(newRow['date']));
          if (!isNaN(d.getTime())) {
            newRow['season'] = getBDSeason(d.getMonth() + 1);
          }
        }
        break;
      }

      case 'sales_history': {
        // Fill season from date
        if (!newRow['season'] && newRow['date']) {
          const d = new Date(String(newRow['date']));
          if (!isNaN(d.getTime())) {
            newRow['season'] = getBDSeason(d.getMonth() + 1);
          }
        }
        break;
      }

      case 'suppliers': {
        // Default country to China if not set
        if (!newRow['country']) newRow['country'] = 'China';
        // Default is_cny_affected to true if country is China
        if (newRow['country'] === 'China' && newRow['is_cny_affected'] === undefined) {
          newRow['is_cny_affected'] = true;
        }
        break;
      }

      case 'products': {
        // Default unit to piece
        if (!newRow['unit']) newRow['unit'] = 'piece';
        // Default min_order_qty to 1
        if (!newRow['min_order_qty']) newRow['min_order_qty'] = 1;
        break;
      }
    }

    // Standardize empty optional fields to null
    for (const [key, value] of Object.entries(newRow)) {
      if (value === '' || value === undefined) {
        newRow[key] = null;
      }
    }

    return newRow;
  });
}

// ---- Main Harmonization Orchestrator ----

export function runHarmonization(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping[],
  schema: ImportTypeSchema
): HarmonizationResult {
  const log: HarmonizationStep[] = [];
  const inputRows = rows.length;
  let currentRows = rows.map(r => ({ ...r }));

  // Step 1: Trim & Normalize
  const step1 = harmonizeTrimNormalize(currentRows, mapping);
  currentRows = step1.rows;
  log.push({
    step: 1,
    name: 'Trim & Normalize',
    input: `${inputRows} rows`,
    output: `${currentRows.length} rows`,
    changes: { fieldsNormalized: { before: inputRows, after: step1.changes } },
  });

  // Step 2: Date Normalization
  const step2 = harmonizeDates(currentRows, schema);
  currentRows = step2.rows;
  log.push({
    step: 2,
    name: 'Date Normalization',
    input: `${inputRows} rows`,
    output: `${step2.datesNormalized} dates normalized`,
    changes: { datesNormalized: { before: 0, after: step2.datesNormalized } },
  });

  // Step 3: Category Mapping
  const step3 = harmonizeCategories(currentRows, schema);
  currentRows = step3.rows;
  log.push({
    step: 3,
    name: 'Category Mapping',
    input: `${inputRows} rows`,
    output: `${step3.categoriesMapped} categories mapped`,
    changes: { categoriesMapped: { before: 0, after: step3.categoriesMapped } },
  });

  // Step 4: Unit Conversion
  const step4 = harmonizeUnits(currentRows);
  currentRows = step4;
  log.push({
    step: 4,
    name: 'Unit Conversion',
    input: `${inputRows} rows`,
    output: `${currentRows.length} rows`,
    changes: {},
  });

  // Step 5: Deduplication
  const step5 = harmonizeDedup(currentRows, schema);
  currentRows = step5.rows;
  log.push({
    step: 5,
    name: 'Deduplication',
    input: `${inputRows} rows`,
    output: `${currentRows.length} rows (${step5.duplicatesRemoved} duplicates removed)`,
    changes: { duplicatesRemoved: { before: inputRows, after: currentRows.length } },
  });

  // Step 6: Enrichment
  const step6 = harmonizeEnrichment(currentRows, schema);
  currentRows = step6;
  log.push({
    step: 6,
    name: 'Enrichment',
    input: `${currentRows.length} rows`,
    output: `${currentRows.length} rows enriched`,
    changes: {},
  });

  return {
    harmonizedRows: currentRows,
    log,
    stats: {
      inputRows,
      outputRows: currentRows.length,
      duplicatesRemoved: step5.duplicatesRemoved,
      fieldsNormalized: step1.changes,
      categoriesMapped: step3.categoriesMapped,
      datesNormalized: step2.datesNormalized,
    },
  };
}
