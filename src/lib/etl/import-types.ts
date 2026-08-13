// ============================================
// TrimedCast ETL - Import Type Definitions
// Bangladesh Motorcycle Parts Forecasting
// ============================================

export type ImportType =
  | 'sales_history'
  | 'purchase_history'
  | 'inventory'
  | 'products'
  | 'suppliers'
  | 'promo_events'
  | 'motorcycle_models';

export type ImportStatus =
  | 'uploading'
  | 'parsing'
  | 'mapping'
  | 'validating'
  | 'harmonizing'
  | 'inserting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type SeverityLevel = 'error' | 'warning' | 'info';

export interface FieldDef {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  required: boolean;
  enumValues?: string[];
  min?: number;
  max?: number;
  pattern?: string;
  dateFormat?: string[];
}

export interface ImportTypeSchema {
  type: ImportType;
  label: string;
  description: string;
  icon: string;
  color: string;
  requiredFields: FieldDef[];
  optionalFields: FieldDef[];
  sampleAliases: Record<string, string[]>;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  isRequired: boolean;
}

export interface ValidationError {
  row: number;
  field: string;
  value: unknown;
  error: string;
  severity: SeverityLevel;
}

export interface HarmonizationStep {
  step: number;
  name: string;
  input: string;
  output: string;
  changes: Record<string, { before: unknown; after: unknown }>;
}

export interface QualityStats {
  rowsTotal: number;
  rowsValid: number;
  rowsInserted: number;
  rowsDuplicate: number;
  requiredMapped: number;
  requiredTotal: number;
}

export interface ImportResult {
  success: boolean;
  rowsTotal: number;
  rowsValid: number;
  rowsInvalid: number;
  rowsSkipped: number;
  rowsInserted: number;
  rowsDuplicate: number;
  qualityScore: number;
  validationErrors: ValidationError[];
  harmonizationLog: HarmonizationStep[];
}

// BD Regions
const BD_REGIONS = ['dhaka', 'chittagong', 'sylhet', 'rajshahi', 'khulna', 'barishal', 'rangpur', 'mymensingh'];

// BD Seasons
const BD_SEASONS = ['winter', 'summer', 'monsoon', 'pre_winter'];

// Sales channels
const SALES_CHANNELS = ['retail', 'wholesale', 'online'];

// Product categories for motorcycle parts
const PRODUCT_CATEGORIES = [
  'piston', 'gasket', 'chain', 'filter', 'brake_pad', 'tire',
  'battery', 'spark_plug', 'cable', 'bearing', 'clutch', 'engine',
  'fork', 'shock_absorber', 'headlight', 'taillight', 'mirror',
  'handlebar', 'seat', 'tank', 'exhaust', 'carburetor', 'other'
];

// Promo types
const PROMO_TYPES = ['eid_discount', 'seasonal_sale', 'clearance', 'flash_sale', 'bundle_deal', 'loyalty_reward'];

// Motorcycle segments
const MOTO_SEGMENTS = ['commuter', 'premium', 'scooter', 'sports', 'cruiser'];

// ---- Import Type Schemas ----

export const IMPORT_TYPE_SCHEMAS: Record<ImportType, ImportTypeSchema> = {
  sales_history: {
    type: 'sales_history',
    label: 'Sales History',
    description: 'Historical sales transactions with dates, products, quantities, and revenue',
    icon: 'TrendingUp',
    color: 'emerald',
    requiredFields: [
      { field: 'date', label: 'Sale Date', type: 'date', required: true, dateFormat: ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'] },
      { field: 'product_sku', label: 'Product SKU', type: 'string', required: true, pattern: '^[A-Za-z0-9_-]+$' },
      { field: 'quantity', label: 'Quantity Sold', type: 'number', required: true, min: 0 },
    ],
    optionalFields: [
      { field: 'revenue', label: 'Revenue (BDT)', type: 'number', required: false, min: 0 },
      { field: 'channel', label: 'Sales Channel', type: 'enum', required: false, enumValues: SALES_CHANNELS },
      { field: 'region', label: 'BD Region', type: 'enum', required: false, enumValues: BD_REGIONS },
      { field: 'invoice_no', label: 'Invoice Number', type: 'string', required: false },
      { field: 'customer_id', label: 'Customer ID', type: 'string', required: false },
      { field: 'season', label: 'Season', type: 'enum', required: false, enumValues: BD_SEASONS },
    ],
    sampleAliases: {
      date: ['Date', 'Sale Date', 'Invoice Date', 'তারিখ', 'Sales Date', 'Transaction Date', 'Order Date'],
      product_sku: ['SKU', 'Product Code', 'Part No', 'Product SKU', 'Item Code', 'পণ্য কোড', 'Part Number', 'SKU Code'],
      quantity: ['Qty', 'Quantity', 'Units Sold', 'পরিমাণ', 'Sales Qty', 'Amount Sold', 'QTY'],
      revenue: ['Revenue', 'Amount', 'Total', 'Total Amount', 'BDT', 'Sales Amount', 'টাকা', 'Total Revenue', 'Sale Value'],
      channel: ['Channel', 'Sales Channel', 'Type', 'বিক্রয় চ্যানেল'],
      region: ['Region', 'Area', 'Zone', 'অঞ্চল', 'Location', 'City'],
      invoice_no: ['Invoice', 'Invoice No', 'Inv #', 'চালান নম্বর', 'Bill No'],
      customer_id: ['Customer', 'Customer ID', 'Client', 'গ্রাহক'],
      season: ['Season', 'ঋতু', 'Period'],
    },
  },

  purchase_history: {
    type: 'purchase_history',
    label: 'Purchase History',
    description: 'Historical purchase orders from suppliers with lead times',
    icon: 'ShoppingCart',
    color: 'blue',
    requiredFields: [
      { field: 'date', label: 'PO Date', type: 'date', required: true, dateFormat: ['DD/MM/YYYY', 'YYYY-MM-DD'] },
      { field: 'product_sku', label: 'Product SKU', type: 'string', required: true, pattern: '^[A-Za-z0-9_-]+$' },
      { field: 'quantity', label: 'Quantity Ordered', type: 'number', required: true, min: 0 },
    ],
    optionalFields: [
      { field: 'unit_cost', label: 'Unit Cost (BDT)', type: 'number', required: false, min: 0 },
      { field: 'total_cost', label: 'Total Cost (BDT)', type: 'number', required: false, min: 0 },
      { field: 'supplier_name', label: 'Supplier Name', type: 'string', required: false },
      { field: 'po_number', label: 'PO Number', type: 'string', required: false },
      { field: 'lead_time_actual', label: 'Actual Lead Time (days)', type: 'number', required: false, min: 1, max: 365 },
      { field: 'season', label: 'Season', type: 'enum', required: false, enumValues: BD_SEASONS },
    ],
    sampleAliases: {
      date: ['Date', 'PO Date', 'Order Date', 'Purchase Date', 'তারিখ'],
      product_sku: ['SKU', 'Product Code', 'Part No', 'Item Code', 'পণ্য কোড'],
      quantity: ['Qty', 'Quantity', 'Units', 'Order Qty', 'পরিমাণ'],
      unit_cost: ['Unit Cost', 'Cost', 'Price', 'Unit Price', 'একক মূল্য'],
      total_cost: ['Total Cost', 'Total', 'Total Amount', 'মোট খরচ'],
      supplier_name: ['Supplier', 'Vendor', 'Supplier Name', 'সরবরাহকারী'],
      po_number: ['PO #', 'PO Number', 'Purchase Order', 'ক্রয় আদেশ'],
      lead_time_actual: ['Lead Time', 'Delivery Days', 'লিড টাইম', 'Days to Deliver'],
      season: ['Season', 'ঋতু'],
    },
  },

  products: {
    type: 'products',
    label: 'Products / Parts',
    description: 'Product master data - motorcycle parts with categories and pricing',
    icon: 'Package',
    color: 'violet',
    requiredFields: [
      { field: 'sku', label: 'SKU', type: 'string', required: true, pattern: '^[A-Za-z0-9_-]+$' },
      { field: 'name', label: 'Product Name', type: 'string', required: true },
      { field: 'category', label: 'Category', type: 'enum', required: true, enumValues: PRODUCT_CATEGORIES },
    ],
    optionalFields: [
      { field: 'subcategory', label: 'Subcategory', type: 'string', required: false },
      { field: 'unit_cost', label: 'Unit Cost (BDT)', type: 'number', required: false, min: 0 },
      { field: 'selling_price', label: 'Selling Price (BDT)', type: 'number', required: false, min: 0 },
      { field: 'unit', label: 'Unit', type: 'enum', required: false, enumValues: ['piece', 'set', 'pair', 'dozen'] },
      { field: 'min_order_qty', label: 'Min Order Qty', type: 'number', required: false, min: 1 },
      { field: 'lead_time_days', label: 'Lead Time (days)', type: 'number', required: false, min: 1, max: 365 },
      { field: 'is_seasonal', label: 'Is Seasonal', type: 'boolean', required: false },
      { field: 'seasonality_type', label: 'Seasonality Type', type: 'enum', required: false, enumValues: ['winter_peak', 'monsoon_dip', 'summer_peak', 'pre_winter_peak'] },
    ],
    sampleAliases: {
      sku: ['SKU', 'Product Code', 'Part No', 'Item Code', 'পণ্য কোড', 'SKU Code', 'Part Number'],
      name: ['Name', 'Product Name', 'Description', 'Part Name', 'পণ্যের নাম', 'Item Name'],
      category: ['Category', 'Type', 'Product Category', 'Part Type', 'শ্রেণী', 'Class'],
      subcategory: ['Subcategory', 'Sub Type', 'Sub Class'],
      unit_cost: ['Cost', 'Unit Cost', 'Buy Price', 'Purchase Price', 'ক্রয় মূল্য'],
      selling_price: ['Price', 'Selling Price', 'Sell Price', 'MRP', 'বিক্রয় মূল্য', 'Retail Price'],
      unit: ['Unit', 'UOM', 'Measure', 'একক'],
      min_order_qty: ['MOQ', 'Min Order', 'Minimum Qty', 'ন্যূনতম অর্ডার'],
      lead_time_days: ['Lead Time', 'LT', 'Lead Time Days', 'লিড টাইম'],
      is_seasonal: ['Seasonal', 'Is Seasonal', 'ঋতুগত'],
      seasonality_type: ['Seasonality', 'Season Type', 'Demand Pattern'],
    },
  },

  inventory: {
    type: 'inventory',
    label: 'Inventory / Stock',
    description: 'Current stock levels and reorder parameters for all products',
    icon: 'Warehouse',
    color: 'amber',
    requiredFields: [
      { field: 'product_sku', label: 'Product SKU', type: 'string', required: true, pattern: '^[A-Za-z0-9_-]+$' },
      { field: 'current_stock', label: 'Current Stock', type: 'number', required: true, min: 0 },
    ],
    optionalFields: [
      { field: 'reserved_stock', label: 'Reserved Stock', type: 'number', required: false, min: 0 },
      { field: 'reorder_point', label: 'Reorder Point', type: 'number', required: false, min: 0 },
      { field: 'safety_stock', label: 'Safety Stock', type: 'number', required: false, min: 0 },
      { field: 'max_stock_level', label: 'Max Stock Level', type: 'number', required: false, min: 0 },
      { field: 'warehouse_location', label: 'Warehouse Location', type: 'string', required: false },
    ],
    sampleAliases: {
      product_sku: ['SKU', 'Product Code', 'Part No', 'Item Code', 'পণ্য কোড'],
      current_stock: ['Stock', 'Current Stock', 'On Hand', 'Qty', 'মজুত', 'Available', 'In Stock'],
      reserved_stock: ['Reserved', 'Allocated', 'Reserved Qty', 'সংরক্ষিত'],
      reorder_point: ['ROP', 'Reorder Point', 'Reorder Level', 'পুনরায় অর্ডার পয়েন্ট'],
      safety_stock: ['Safety Stock', 'SS', 'Buffer Stock', 'নিরাপদ মজুত'],
      max_stock_level: ['Max Level', 'Maximum Stock', 'Max Qty'],
      warehouse_location: ['Location', 'Bin', 'Shelf', 'Warehouse', 'অবস্থান'],
    },
  },

  suppliers: {
    type: 'suppliers',
    label: 'Suppliers',
    description: 'Supplier master data - primarily China-based parts manufacturers',
    icon: 'Truck',
    color: 'rose',
    requiredFields: [
      { field: 'name', label: 'Supplier Name', type: 'string', required: true },
    ],
    optionalFields: [
      { field: 'code', label: 'Supplier Code', type: 'string', required: false },
      { field: 'country', label: 'Country', type: 'string', required: false },
      { field: 'lead_time_days', label: 'Lead Time (days)', type: 'number', required: false, min: 1, max: 365 },
      { field: 'reliability', label: 'Reliability Score', type: 'number', required: false, min: 0, max: 1 },
      { field: 'is_cny_affected', label: 'CNY Affected', type: 'boolean', required: false },
      { field: 'contact_email', label: 'Contact Email', type: 'string', required: false, pattern: '^[\\S]+@[\\S]+\\.\\S+$' },
      { field: 'contact_phone', label: 'Contact Phone', type: 'string', required: false },
    ],
    sampleAliases: {
      name: ['Supplier', 'Supplier Name', 'Vendor', 'Factory', 'সরবরাহকারী', 'Manufacturer'],
      code: ['Code', 'Supplier Code', 'Vendor Code', 'কোড'],
      country: ['Country', 'Origin', 'দেশ', 'Nation'],
      lead_time_days: ['Lead Time', 'LT', 'Delivery Time', 'লিড টাইম'],
      reliability: ['Reliability', 'Score', 'Rating', 'নির্ভরযোগ্যতা'],
      is_cny_affected: ['CNY Affected', 'CNY Impact', 'Chinese New Year', 'CNY Shutdown'],
      contact_email: ['Email', 'Contact Email', 'ইমেইল'],
      contact_phone: ['Phone', 'Contact Phone', 'ফোন', 'Telephone'],
    },
  },

  motorcycle_models: {
    type: 'motorcycle_models',
    label: 'Motorcycle Models',
    description: 'Motorcycle brand/model master data for BD market',
    icon: 'Bike',
    color: 'cyan',
    requiredFields: [
      { field: 'brand', label: 'Brand', type: 'string', required: true },
      { field: 'model', label: 'Model', type: 'string', required: true },
    ],
    optionalFields: [
      { field: 'year_start', label: 'Year Start', type: 'number', required: false, min: 1970, max: 2030 },
      { field: 'year_end', label: 'Year End', type: 'number', required: false, min: 1970, max: 2030 },
      { field: 'cc_rating', label: 'CC Rating', type: 'number', required: false, min: 50, max: 2000 },
      { field: 'segment', label: 'Segment', type: 'enum', required: false, enumValues: MOTO_SEGMENTS },
    ],
    sampleAliases: {
      brand: ['Brand', 'Make', 'Manufacturer', 'ব্র্যান্ড'],
      model: ['Model', 'Motorcycle Model', 'মডেল', 'Bike Model'],
      year_start: ['Year', 'Year Start', 'From Year', 'Start Year'],
      year_end: ['Year End', 'To Year', 'End Year'],
      cc_rating: ['CC', 'Displacement', 'Engine CC', 'সিসি'],
      segment: ['Segment', 'Class', 'Type', 'Category'],
    },
  },

  promo_events: {
    type: 'promo_events',
    label: 'Promotional Events',
    description: 'Eid discounts, seasonal sales, clearance events affecting demand',
    icon: 'Tag',
    color: 'pink',
    requiredFields: [
      { field: 'name', label: 'Event Name', type: 'string', required: true },
      { field: 'type', label: 'Promo Type', type: 'enum', required: true, enumValues: PROMO_TYPES },
      { field: 'start_date', label: 'Start Date', type: 'date', required: true, dateFormat: ['DD/MM/YYYY', 'YYYY-MM-DD'] },
      { field: 'end_date', label: 'End Date', type: 'date', required: true, dateFormat: ['DD/MM/YYYY', 'YYYY-MM-DD'] },
    ],
    optionalFields: [
      { field: 'discount_pct', label: 'Discount %', type: 'number', required: false, min: 0, max: 100 },
      { field: 'expected_uplift', label: 'Expected Uplift %', type: 'number', required: false, min: 0, max: 500 },
    ],
    sampleAliases: {
      name: ['Name', 'Event', 'Promo Name', 'Event Name', 'অনুষ্ঠান'],
      type: ['Type', 'Promo Type', 'Event Type', 'Discount Type', 'ধরন'],
      start_date: ['Start', 'Start Date', 'From', 'শুরু'],
      end_date: ['End', 'End Date', 'To', 'শেষ'],
      discount_pct: ['Discount', 'Discount %', 'Off', 'ছাড়'],
      expected_uplift: ['Uplift', 'Expected Uplift', 'Demand Increase', 'বৃদ্ধি'],
    },
  },
};

// Helper to get all fields for an import type
export function getAllFields(schema: ImportTypeSchema): FieldDef[] {
  return [...schema.requiredFields, ...schema.optionalFields];
}

// Helper to get required field names
export function getRequiredFieldNames(schema: ImportTypeSchema): string[] {
  return schema.requiredFields.map(f => f.field);
}

// Helper to find field def by name
export function getFieldDef(schema: ImportTypeSchema, fieldName: string): FieldDef | undefined {
  return getAllFields(schema).find(f => f.field === fieldName);
}

// BD Season from month
export function getBDSeason(month: number): string {
  if (month === 11 || month === 12 || month === 1 || month === 2) return 'winter';
  if (month >= 3 && month <= 5) return 'summer';
  if (month >= 6 && month <= 9) return 'monsoon';
  return 'pre_winter'; // October
}

// Get all import types as array
export function getImportTypesList(): ImportTypeSchema[] {
  return Object.values(IMPORT_TYPE_SCHEMAS);
}
