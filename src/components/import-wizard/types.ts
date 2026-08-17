// ============================================
// TrimedCast — Data Import Wizard Types
// Session 22: Import Dashboard
// Bangladesh Motorcycle Parts Forecasting
// ============================================

export type ImportType =
  | 'sales_history'
  | 'product_catalog'
  | 'inventory_snapshot'
  | 'purchase_history'
  | 'supplier_list'
  | 'promo_events'
  | 'motorcycle_models';

export type ImportStatus =
  | 'uploading'
  | 'uploaded'
  | 'mapping'
  | 'mapped'
  | 'validating'
  | 'validated'
  | 'harmonizing'
  | 'harmonized'
  | 'processing'
  | 'completed'
  | 'failed';

export interface ImportRecord {
  id: string;
  importType: ImportType;
  fileName: string;
  fileSize: number;
  status: ImportStatus;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  qualityScore: number;
  createdAt: string;
  completedAt?: string | null;
  error?: string | null;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  isRequired: boolean;
  sampleValues: string[];
}

export interface ValidationIssue {
  row: number;
  column: string;
  value: string;
  issue: string;
  severity: 'error' | 'warning';
}

// Import type configs
export const IMPORT_TYPE_CONFIG: Record<
  ImportType,
  {
    label: string;
    labelBn: string;
    icon: string;
    color: string;
    description: string;
    requiredFields: string[];
  }
> = {
  sales_history: {
    label: 'Sales History',
    labelBn: 'বিক্রয় ইতিহাস',
    icon: 'TrendingUp',
    color: 'emerald',
    description: 'Historical sales data with date, product, quantity, revenue',
    requiredFields: ['date', 'product_sku', 'quantity'],
  },
  product_catalog: {
    label: 'Product Catalog',
    labelBn: 'পণ্য তালিকা',
    icon: 'Package',
    color: 'violet',
    description: 'Product master data with SKU, name, category, cost',
    requiredFields: ['sku', 'name', 'category'],
  },
  inventory_snapshot: {
    label: 'Inventory Snapshot',
    labelBn: 'মজুত স্ন্যাপশট',
    icon: 'Warehouse',
    color: 'amber',
    description: 'Current stock levels by product',
    requiredFields: ['product_sku', 'current_stock'],
  },
  purchase_history: {
    label: 'Purchase History',
    labelBn: 'ক্রয় ইতিহাস',
    icon: 'ShoppingCart',
    color: 'sky',
    description: 'Past purchase orders with lead times',
    requiredFields: ['date', 'product_sku', 'quantity'],
  },
  supplier_list: {
    label: 'Supplier List',
    labelBn: 'সরবরাহকারী তালিকা',
    icon: 'Truck',
    color: 'rose',
    description: 'Supplier master data',
    requiredFields: ['name'],
  },
  promo_events: {
    label: 'Promo Events',
    labelBn: 'প্রোমো ইভেন্ট',
    icon: 'Tag',
    color: 'pink',
    description: 'Marketing events and expected uplift',
    requiredFields: ['name', 'start_date'],
  },
  motorcycle_models: {
    label: 'Motorcycle Models',
    labelBn: 'মোটরসাইকেল মডেল',
    icon: 'Bike',
    color: 'orange',
    description: 'BD motorcycle model catalog',
    requiredFields: ['brand', 'model'],
  },
};

// Status configs
export const STATUS_CONFIG: Record<
  ImportStatus,
  { label: string; labelBn: string; color: string; step: number }
> = {
  uploading: { label: 'Uploading', labelBn: 'আপলোড হচ্ছে', color: 'sky', step: 0 },
  uploaded: { label: 'Uploaded', labelBn: 'আপলোড সম্পন্ন', color: 'sky', step: 1 },
  mapping: { label: 'Mapping Columns', labelBn: 'কলাম ম্যাপিং', color: 'violet', step: 2 },
  mapped: { label: 'Mapped', labelBn: 'ম্যাপ সম্পন্ন', color: 'violet', step: 2 },
  validating: { label: 'Validating', labelBn: 'যাচাই হচ্ছে', color: 'amber', step: 3 },
  validated: { label: 'Validated', labelBn: 'যাচাই সম্পন্ন', color: 'amber', step: 3 },
  harmonizing: { label: 'Harmonizing', labelBn: 'সামঞ্জস্য হচ্ছে', color: 'emerald', step: 4 },
  harmonized: { label: 'Harmonized', labelBn: 'সামঞ্জস্য সম্পন্ন', color: 'emerald', step: 4 },
  processing: { label: 'Processing', labelBn: 'প্রক্রিয়াকরণ', color: 'blue', step: 5 },
  completed: { label: 'Completed', labelBn: 'সম্পন্ন', color: 'emerald', step: 6 },
  failed: { label: 'Failed', labelBn: 'ব্যর্থ', color: 'red', step: -1 },
};

// Mock import records — 8 past imports in various states
export const MOCK_IMPORTS: ImportRecord[] = [
  {
    id: 'imp-001',
    importType: 'sales_history',
    fileName: 'sales_history_2024_jan_dec.xlsx',
    fileSize: 245760,
    status: 'completed',
    totalRows: 12480,
    validRows: 12341,
    invalidRows: 139,
    qualityScore: 89,
    createdAt: '2025-01-15T09:30:00Z',
    completedAt: '2025-01-15T09:32:45Z',
  },
  {
    id: 'imp-002',
    importType: 'sales_history',
    fileName: 'sales_history_2025_jan.csv',
    fileSize: 87240,
    status: 'completed',
    totalRows: 2380,
    validRows: 2356,
    invalidRows: 24,
    qualityScore: 94,
    createdAt: '2025-02-01T14:15:00Z',
    completedAt: '2025-02-01T14:16:12Z',
  },
  {
    id: 'imp-003',
    importType: 'product_catalog',
    fileName: 'bd_moto_parts_catalog.xlsx',
    fileSize: 156800,
    status: 'completed',
    totalRows: 856,
    validRows: 851,
    invalidRows: 5,
    qualityScore: 97,
    createdAt: '2025-02-10T11:00:00Z',
    completedAt: '2025-02-10T11:01:08Z',
  },
  {
    id: 'imp-004',
    importType: 'inventory_snapshot',
    fileName: 'stock_snapshot_feb2025.xlsx',
    fileSize: 98304,
    status: 'completed',
    totalRows: 1540,
    validRows: 1532,
    invalidRows: 8,
    qualityScore: 91,
    createdAt: '2025-02-15T08:45:00Z',
    completedAt: '2025-02-15T08:46:22Z',
  },
  {
    id: 'imp-005',
    importType: 'sales_history',
    fileName: 'sales_history_2025_feb.csv',
    fileSize: 91200,
    status: 'failed',
    totalRows: 2650,
    validRows: 0,
    invalidRows: 2650,
    qualityScore: 0,
    createdAt: '2025-03-01T16:30:00Z',
    completedAt: '2025-03-01T16:30:55Z',
    error: 'Column mapping failed: required field "date" not found in source columns',
  },
  {
    id: 'imp-006',
    importType: 'product_catalog',
    fileName: 'new_parts_added_mar2025.xlsx',
    fileSize: 42160,
    status: 'harmonizing',
    totalRows: 120,
    validRows: 118,
    invalidRows: 2,
    qualityScore: 85,
    createdAt: '2025-03-10T10:20:00Z',
  },
  {
    id: 'imp-007',
    importType: 'purchase_history',
    fileName: 'po_records_2024_q3_q4.xlsx',
    fileSize: 182400,
    status: 'completed',
    totalRows: 4320,
    validRows: 4280,
    invalidRows: 40,
    qualityScore: 88,
    createdAt: '2025-03-05T13:00:00Z',
    completedAt: '2025-03-05T13:02:30Z',
  },
  {
    id: 'imp-008',
    importType: 'supplier_list',
    fileName: 'china_suppliers_master.xlsx',
    fileSize: 32768,
    status: 'completed',
    totalRows: 42,
    validRows: 42,
    invalidRows: 0,
    qualityScore: 100,
    createdAt: '2025-01-20T07:00:00Z',
    completedAt: '2025-01-20T07:00:35Z',
  },
];

// Mock column mappings for sales_history
export const MOCK_COLUMN_MAPPINGS: ColumnMapping[] = [
  {
    sourceColumn: 'date',
    targetField: 'date',
    confidence: 0.95,
    isRequired: true,
    sampleValues: ['2024-01-05', '2024-01-06', '2024-01-07'],
  },
  {
    sourceColumn: 'sku',
    targetField: 'product_sku',
    confidence: 0.88,
    isRequired: true,
    sampleValues: ['BRK-PAD-HB125', 'CHN-428H-130L', 'FIL-AIR-CB150'],
  },
  {
    sourceColumn: 'qty',
    targetField: 'quantity',
    confidence: 0.92,
    isRequired: true,
    sampleValues: ['24', '15', '8'],
  },
  {
    sourceColumn: 'revenue',
    targetField: 'revenue',
    confidence: 0.85,
    isRequired: false,
    sampleValues: ['14400', '8250', '3360'],
  },
  {
    sourceColumn: 'channel',
    targetField: 'channel',
    confidence: 0.7,
    isRequired: false,
    sampleValues: ['retail', 'wholesale', 'online'],
  },
  {
    sourceColumn: 'region',
    targetField: 'region',
    confidence: 0.65,
    isRequired: false,
    sampleValues: ['dhaka', 'chittagong', 'sylhet'],
  },
];

// Mock validation issues — 3 errors + 3 warnings
export const MOCK_VALIDATION_ISSUES: ValidationIssue[] = [
  {
    row: 147,
    column: 'date',
    value: '2024-02-30',
    issue: 'Invalid date: February 30 does not exist',
    severity: 'error',
  },
  {
    row: 523,
    column: 'quantity',
    value: '-5',
    issue: 'Negative quantity is not allowed',
    severity: 'error',
  },
  {
    row: 891,
    column: 'product_sku',
    value: 'UNKNOWN-PART-999',
    issue: 'SKU not found in product catalog',
    severity: 'error',
  },
  {
    row: 312,
    column: '_row',
    value: '',
    issue: 'Duplicate row: same date, SKU, and channel as row 311',
    severity: 'warning',
  },
  {
    row: 678,
    column: 'region',
    value: '',
    issue: 'Missing region — will default to "dhaka"',
    severity: 'warning',
  },
  {
    row: 1102,
    column: 'date',
    value: '2026-07-15',
    issue: 'Future date detected — may indicate data entry error',
    severity: 'warning',
  },
];

// Available target fields per import type
export const TARGET_FIELDS: Record<ImportType, { field: string; label: string; required: boolean }[]> = {
  sales_history: [
    { field: 'date', label: 'Sale Date', required: true },
    { field: 'product_sku', label: 'Product SKU', required: true },
    { field: 'quantity', label: 'Quantity', required: true },
    { field: 'revenue', label: 'Revenue (BDT)', required: false },
    { field: 'channel', label: 'Sales Channel', required: false },
    { field: 'region', label: 'BD Region', required: false },
    { field: 'invoice_no', label: 'Invoice No', required: false },
    { field: 'season', label: 'Season', required: false },
  ],
  product_catalog: [
    { field: 'sku', label: 'SKU', required: true },
    { field: 'name', label: 'Product Name', required: true },
    { field: 'category', label: 'Category', required: true },
    { field: 'unit_cost', label: 'Unit Cost (BDT)', required: false },
    { field: 'selling_price', label: 'Selling Price', required: false },
    { field: 'min_order_qty', label: 'Min Order Qty', required: false },
    { field: 'lead_time_days', label: 'Lead Time (days)', required: false },
  ],
  inventory_snapshot: [
    { field: 'product_sku', label: 'Product SKU', required: true },
    { field: 'current_stock', label: 'Current Stock', required: true },
    { field: 'reserved_stock', label: 'Reserved Stock', required: false },
    { field: 'reorder_point', label: 'Reorder Point', required: false },
    { field: 'safety_stock', label: 'Safety Stock', required: false },
    { field: 'warehouse_location', label: 'Warehouse', required: false },
  ],
  purchase_history: [
    { field: 'date', label: 'PO Date', required: true },
    { field: 'product_sku', label: 'Product SKU', required: true },
    { field: 'quantity', label: 'Quantity', required: true },
    { field: 'unit_cost', label: 'Unit Cost (BDT)', required: false },
    { field: 'supplier_name', label: 'Supplier', required: false },
    { field: 'po_number', label: 'PO Number', required: false },
    { field: 'lead_time_actual', label: 'Lead Time (days)', required: false },
  ],
  supplier_list: [
    { field: 'name', label: 'Supplier Name', required: true },
    { field: 'code', label: 'Supplier Code', required: false },
    { field: 'country', label: 'Country', required: false },
    { field: 'lead_time_days', label: 'Lead Time (days)', required: false },
    { field: 'reliability', label: 'Reliability', required: false },
    { field: 'contact_email', label: 'Email', required: false },
  ],
  promo_events: [
    { field: 'name', label: 'Event Name', required: true },
    { field: 'start_date', label: 'Start Date', required: true },
    { field: 'end_date', label: 'End Date', required: false },
    { field: 'type', label: 'Promo Type', required: false },
    { field: 'discount_pct', label: 'Discount %', required: false },
    { field: 'expected_uplift', label: 'Expected Uplift', required: false },
  ],
  motorcycle_models: [
    { field: 'brand', label: 'Brand', required: true },
    { field: 'model', label: 'Model', required: true },
    { field: 'cc_rating', label: 'CC Rating', required: false },
    { field: 'segment', label: 'Segment', required: false },
    { field: 'year_start', label: 'Year Start', required: false },
  ],
};

// Wizard steps
export const WIZARD_STEPS = [
  { id: 'type', label: 'Select Type', labelBn: 'ধরন নির্বাচন' },
  { id: 'upload', label: 'Upload File', labelBn: 'ফাইল আপলোড' },
  { id: 'mapping', label: 'Map Columns', labelBn: 'কলাম ম্যাপিং' },
  { id: 'validation', label: 'Validate', labelBn: 'যাচাই' },
  { id: 'processing', label: 'Process', labelBn: 'প্রক্রিয়া' },
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number]['id'];
