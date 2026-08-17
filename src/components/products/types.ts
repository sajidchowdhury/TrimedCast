// ============================================
// TrimedCast - Product & Supplier Type Definitions
// Session 18: Product & Supplier Management
// Types, constants, and mock data for BD
// motorcycle parts inventory management
// ============================================

// --- Product type matching API response ---
export interface Product {
  id: string;
  sku_code: string;
  name: string;
  category: string;
  sub_category?: string;
  season_type?: string;
  motorcycle_model?: { id: string; brand: string; model: string } | null;
  supplier?: { id: string; name: string; country: string } | null;
  unit_cost_bdt?: number | null;
  selling_price_bdt?: number | null;
  unit: string;
  min_order_qty: number;
  eoq: number;
  max_stock: number;
  lead_time_days?: number | null;
  is_seasonal: boolean;
  season_weight?: number | null;
  inventory?: {
    qty_on_hand: number;
    qty_available: number;
    qty_reserved: number;
    reorder_point: number;
    safety_stock: number;
  } | null;
  is_active: boolean;
}

export interface CreateProductInput {
  sku_code: string;
  name: string;
  category: string;
  sub_category?: string;
  motorcycle_model_id?: string;
  supplier_id?: string;
  unit_cost_bdt?: number;
  selling_price_bdt?: number;
  unit?: string;
  min_order_qty?: number;
  eoq?: number;
  max_stock?: number;
  lead_time_days?: number;
  is_seasonal?: boolean;
  season_type?: string;
  season_weight?: number;
}

export type UpdateProductInput = Partial<CreateProductInput>;

// --- Supplier types ---
export interface Supplier {
  id: string;
  name: string;
  code?: string | null;
  country: string;
  lead_time_days: number;
  reliability?: number | null;
  is_cny_affected: boolean;
  contact_email?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  product_count?: number;
}

export interface CreateSupplierInput {
  name: string;
  code?: string;
  country?: string;
  lead_time_days?: number;
  reliability?: number;
  is_cny_affected?: boolean;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

// --- Motorcycle Model ---
export interface MotorcycleModel {
  id: string;
  brand: string;
  model: string;
  ccRating?: number;
  segment?: string;
}

// --- Seasonality Option (for dropdowns) ---
export interface SeasonalityOption {
  id: string;
  name: string;
  label: string;
  labelBn?: string;
}

// --- BD product categories ---
export const PRODUCT_CATEGORIES = [
  { value: 'engine_parts', label: 'Engine Parts', labelBn: 'ইঞ্জিন পার্টস' },
  { value: 'electrical', label: 'Electrical', labelBn: 'ইলেকট্রিকাল' },
  { value: 'body_parts', label: 'Body Parts', labelBn: 'বডি পার্টস' },
  { value: 'brake_system', label: 'Brake System', labelBn: 'ব্রেক সিস্টেম' },
  { value: 'suspension', label: 'Suspension', labelBn: 'সাসপেনশন' },
  { value: 'transmission', label: 'Transmission', labelBn: 'ট্রান্সমিশন' },
  { value: 'fuel_system', label: 'Fuel System', labelBn: 'ফুয়েল সিস্টেম' },
  { value: 'exhaust', label: 'Exhaust', labelBn: 'এক্সহস্ট' },
  { value: 'tires_wheels', label: 'Tires & Wheels', labelBn: 'টায়ার ও হুইল' },
  { value: 'accessories', label: 'Accessories', labelBn: 'এক্সেসরিজ' },
  { value: 'lubricants', label: 'Lubricants & Oils', labelBn: 'লুব্রিকেন্ট ও তেল' },
  { value: 'safety_gear', label: 'Safety Gear', labelBn: 'সেফটি গিয়ার' },
] as const;

// --- Supplier countries (Asia-focused for BD market) ---
export const SUPPLIER_COUNTRIES = [
  { value: 'China', label: 'China', labelBn: 'চীন' },
  { value: 'Japan', label: 'Japan', labelBn: 'জাপান' },
  { value: 'India', label: 'India', labelBn: 'ভারত' },
  { value: 'Thailand', label: 'Thailand', labelBn: 'থাইল্যান্ড' },
  { value: 'Taiwan', label: 'Taiwan', labelBn: 'তাইওয়ান' },
  { value: 'South Korea', label: 'South Korea', labelBn: 'দক্ষিণ কোরিয়া' },
  { value: 'Bangladesh', label: 'Bangladesh', labelBn: 'বাংলাদেশ' },
  { value: 'Indonesia', label: 'Indonesia', labelBn: 'ইন্দোনেশিয়া' },
  { value: 'Malaysia', label: 'Malaysia', labelBn: 'মালয়েশিয়া' },
  { value: 'Vietnam', label: 'Vietnam', labelBn: 'ভিয়েতনাম' },
] as const;

// --- Product units ---
export const PRODUCT_UNITS = ['piece', 'set', 'pair', 'liter', 'kg', 'meter', 'roll', 'box'] as const;

// --- Helper: get category label ---
export function getCategoryLabel(value: string): string {
  const cat = PRODUCT_CATEGORIES.find((c) => c.value === value);
  return cat ? cat.label : value;
}

// --- Helper: get country label ---
export function getCountryLabel(value: string): string {
  const c = SUPPLIER_COUNTRIES.find((cn) => cn.value === value);
  return c ? c.label : value;
}

// --- Stock status helpers ---
export type StockStatus = 'healthy' | 'low' | 'out';

export function getStockStatus(product: Product): StockStatus {
  const avail = product.inventory?.qty_available ?? 0;
  const reorder = product.inventory?.reorder_point ?? 0;
  if (avail === 0) return 'out';
  if (avail <= reorder) return 'low';
  return 'healthy';
}

// ============================================
// Mock Data for Demo
// ============================================

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Jingke Auto Parts',
    code: 'JK-AP',
    country: 'China',
    lead_time_days: 45,
    reliability: 0.87,
    is_cny_affected: true,
    contact_email: 'sales@jingke.cn',
    contact_phone: '+86-755-12345678',
    notes: 'Main engine parts supplier from Shenzhen',
    product_count: 23,
  },
  {
    id: 'sup-2',
    name: 'Osaka Motorcycle Co.',
    code: 'OSK-MC',
    country: 'Japan',
    lead_time_days: 30,
    reliability: 0.95,
    is_cny_affected: false,
    contact_email: 'export@osaka-mc.jp',
    contact_phone: '+81-6-98765432',
    notes: 'Premium OEM-quality brake and electrical parts',
    product_count: 15,
  },
  {
    id: 'sup-3',
    name: 'Hero MotoCorp Suppliers',
    code: 'HM-SUP',
    country: 'India',
    lead_time_days: 20,
    reliability: 0.82,
    is_cny_affected: false,
    contact_email: 'parts@heromoto.in',
    contact_phone: '+91-11-45678901',
    notes: 'Cost-effective suspension and transmission parts',
    product_count: 18,
  },
  {
    id: 'sup-4',
    name: 'Thai Wheel Industries',
    code: 'TWI',
    country: 'Thailand',
    lead_time_days: 25,
    reliability: 0.79,
    is_cny_affected: false,
    contact_email: 'info@thaiwheel.co.th',
    contact_phone: '+66-2-34567890',
    notes: 'Tires and wheel assemblies',
    product_count: 8,
  },
  {
    id: 'sup-5',
    name: 'Dhaka Parts Ltd.',
    code: 'DP-LTD',
    country: 'Bangladesh',
    lead_time_days: 7,
    reliability: 0.7,
    is_cny_affected: false,
    contact_email: 'sales@dhakaparts.bd',
    contact_phone: '+880-2-1234567',
    notes: 'Local accessories and safety gear manufacturer',
    product_count: 12,
  },
  {
    id: 'sup-6',
    name: 'Kunshan Precision',
    code: 'KS-PR',
    country: 'China',
    lead_time_days: 40,
    reliability: 0.91,
    is_cny_affected: true,
    contact_email: 'bd@kunshanprecision.cn',
    contact_phone: '+86-512-87654321',
    notes: 'Precision fuel system and exhaust components',
    product_count: 10,
  },
];

export const MOCK_MOTORCYCLE_MODELS: MotorcycleModel[] = [
  { id: 'mc-1', brand: 'Honda', model: 'CD125', ccRating: 125, segment: 'commuter' },
  { id: 'mc-2', brand: 'Bajaj', model: 'Pulsar 150', ccRating: 150, segment: 'commuter' },
  { id: 'mc-3', brand: 'TVS', model: 'Apache RTR 160', ccRating: 160, segment: 'commuter' },
  { id: 'mc-4', brand: 'Yamaha', model: 'FZ-S V3', ccRating: 150, segment: 'commuter' },
  { id: 'mc-5', brand: 'Honda', model: 'CB Shine', ccRating: 125, segment: 'commuter' },
  { id: 'mc-6', brand: 'Bajaj', model: 'Discover 125', ccRating: 125, segment: 'commuter' },
  { id: 'mc-7', brand: 'Hero', model: 'Splendor Plus', ccRating: 100, segment: 'budget' },
  { id: 'mc-8', brand: 'Yamaha', model: 'R15 V4', ccRating: 155, segment: 'sport' },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku_code: 'EP-HON-001',
    name: 'Honda Piston Ring Set',
    category: 'engine_parts',
    sub_category: 'piston',
    season_type: 'winter_peak',
    motorcycle_model: { id: 'mc-1', brand: 'Honda', model: 'CD125' },
    supplier: { id: 'sup-1', name: 'Jingke Auto Parts', country: 'China' },
    unit_cost_bdt: 850,
    selling_price_bdt: 1200,
    unit: 'set',
    min_order_qty: 50,
    eoq: 200,
    max_stock: 1000,
    lead_time_days: 45,
    is_seasonal: true,
    season_weight: 1.8,
    inventory: { qty_on_hand: 150, qty_available: 130, qty_reserved: 20, reorder_point: 100, safety_stock: 50 },
    is_active: true,
  },
  {
    id: 'prod-2',
    sku_code: 'BR-OSK-002',
    name: 'Brake Pad Set (Front)',
    category: 'brake_system',
    sub_category: 'pads',
    season_type: 'winter_peak',
    motorcycle_model: { id: 'mc-2', brand: 'Bajaj', model: 'Pulsar 150' },
    supplier: { id: 'sup-2', name: 'Osaka Motorcycle Co.', country: 'Japan' },
    unit_cost_bdt: 450,
    selling_price_bdt: 750,
    unit: 'set',
    min_order_qty: 100,
    eoq: 400,
    max_stock: 2000,
    lead_time_days: 30,
    is_seasonal: true,
    season_weight: 2.0,
    inventory: { qty_on_hand: 380, qty_available: 350, qty_reserved: 30, reorder_point: 200, safety_stock: 80 },
    is_active: true,
  },
  {
    id: 'prod-3',
    sku_code: 'EL-YMH-003',
    name: 'CDI Unit Yamaha FZ-S',
    category: 'electrical',
    sub_category: 'ignition',
    motorcycle_model: { id: 'mc-4', brand: 'Yamaha', model: 'FZ-S V3' },
    supplier: { id: 'sup-1', name: 'Jingke Auto Parts', country: 'China' },
    unit_cost_bdt: 620,
    selling_price_bdt: 950,
    unit: 'piece',
    min_order_qty: 30,
    eoq: 150,
    max_stock: 800,
    lead_time_days: 45,
    is_seasonal: false,
    season_weight: null,
    inventory: { qty_on_hand: 45, qty_available: 40, qty_reserved: 5, reorder_point: 60, safety_stock: 25 },
    is_active: true,
  },
  {
    id: 'prod-4',
    sku_code: 'SP-HMR-004',
    name: 'Rear Shock Absorber',
    category: 'suspension',
    sub_category: 'shock',
    motorcycle_model: { id: 'mc-7', brand: 'Hero', model: 'Splendor Plus' },
    supplier: { id: 'sup-3', name: 'Hero MotoCorp Suppliers', country: 'India' },
    unit_cost_bdt: 1200,
    selling_price_bdt: 1800,
    unit: 'piece',
    min_order_qty: 20,
    eoq: 100,
    max_stock: 500,
    lead_time_days: 20,
    is_seasonal: true,
    season_weight: 1.5,
    inventory: { qty_on_hand: 95, qty_available: 80, qty_reserved: 15, reorder_point: 50, safety_stock: 20 },
    is_active: true,
  },
  {
    id: 'prod-5',
    sku_code: 'TW-THI-005',
    name: 'Tubeless Tire 100/90-17',
    category: 'tires_wheels',
    sub_category: 'tire',
    motorcycle_model: null,
    supplier: { id: 'sup-4', name: 'Thai Wheel Industries', country: 'Thailand' },
    unit_cost_bdt: 1800,
    selling_price_bdt: 2800,
    unit: 'piece',
    min_order_qty: 10,
    eoq: 60,
    max_stock: 300,
    lead_time_days: 25,
    is_seasonal: false,
    season_weight: null,
    inventory: { qty_on_hand: 0, qty_available: 0, qty_reserved: 0, reorder_point: 30, safety_stock: 10 },
    is_active: true,
  },
  {
    id: 'prod-6',
    sku_code: 'FS-KSP-006',
    name: 'Carburetor Assembly',
    category: 'fuel_system',
    sub_category: 'carburetor',
    motorcycle_model: { id: 'mc-5', brand: 'Honda', model: 'CB Shine' },
    supplier: { id: 'sup-6', name: 'Kunshan Precision', country: 'China' },
    unit_cost_bdt: 2200,
    selling_price_bdt: 3500,
    unit: 'piece',
    min_order_qty: 15,
    eoq: 80,
    max_stock: 400,
    lead_time_days: 40,
    is_seasonal: false,
    season_weight: null,
    inventory: { qty_on_hand: 22, qty_available: 18, qty_reserved: 4, reorder_point: 30, safety_stock: 12 },
    is_active: true,
  },
  {
    id: 'prod-7',
    sku_code: 'AC-DPK-007',
    name: 'Rear View Mirror Set',
    category: 'accessories',
    sub_category: 'mirror',
    motorcycle_model: null,
    supplier: { id: 'sup-5', name: 'Dhaka Parts Ltd.', country: 'Bangladesh' },
    unit_cost_bdt: 180,
    selling_price_bdt: 350,
    unit: 'pair',
    min_order_qty: 50,
    eoq: 300,
    max_stock: 1500,
    lead_time_days: 7,
    is_seasonal: false,
    season_weight: null,
    inventory: { qty_on_hand: 420, qty_available: 400, qty_reserved: 20, reorder_point: 150, safety_stock: 60 },
    is_active: true,
  },
  {
    id: 'prod-8',
    sku_code: 'EX-JKP-008',
    name: 'Exhaust Silencer CD125',
    category: 'exhaust',
    sub_category: 'silencer',
    motorcycle_model: { id: 'mc-1', brand: 'Honda', model: 'CD125' },
    supplier: { id: 'sup-1', name: 'Jingke Auto Parts', country: 'China' },
    unit_cost_bdt: 1500,
    selling_price_bdt: 2500,
    unit: 'piece',
    min_order_qty: 10,
    eoq: 50,
    max_stock: 250,
    lead_time_days: 45,
    is_seasonal: false,
    season_weight: null,
    inventory: { qty_on_hand: 35, qty_available: 30, qty_reserved: 5, reorder_point: 25, safety_stock: 10 },
    is_active: true,
  },
  {
    id: 'prod-9',
    sku_code: 'TR-HMI-009',
    name: 'Chain Sprocket Kit',
    category: 'transmission',
    sub_category: 'chain',
    motorcycle_model: { id: 'mc-3', brand: 'TVS', model: 'Apache RTR 160' },
    supplier: { id: 'sup-3', name: 'Hero MotoCorp Suppliers', country: 'India' },
    unit_cost_bdt: 650,
    selling_price_bdt: 1100,
    unit: 'set',
    min_order_qty: 25,
    eoq: 120,
    max_stock: 600,
    lead_time_days: 20,
    is_seasonal: true,
    season_weight: 1.3,
    inventory: { qty_on_hand: 110, qty_available: 100, qty_reserved: 10, reorder_point: 60, safety_stock: 25 },
    is_active: true,
  },
  {
    id: 'prod-10',
    sku_code: 'LB-DPK-010',
    name: '4T Engine Oil 1L',
    category: 'lubricants',
    sub_category: 'oil',
    motorcycle_model: null,
    supplier: { id: 'sup-5', name: 'Dhaka Parts Ltd.', country: 'Bangladesh' },
    unit_cost_bdt: 280,
    selling_price_bdt: 450,
    unit: 'liter',
    min_order_qty: 100,
    eoq: 500,
    max_stock: 3000,
    lead_time_days: 7,
    is_seasonal: true,
    season_weight: 1.6,
    inventory: { qty_on_hand: 280, qty_available: 250, qty_reserved: 30, reorder_point: 200, safety_stock: 80 },
    is_active: true,
  },
  {
    id: 'prod-11',
    sku_code: 'BP-HON-011',
    name: 'Side Panel Set CD125',
    category: 'body_parts',
    sub_category: 'panel',
    motorcycle_model: { id: 'mc-1', brand: 'Honda', model: 'CD125' },
    supplier: { id: 'sup-1', name: 'Jingke Auto Parts', country: 'China' },
    unit_cost_bdt: 520,
    selling_price_bdt: 900,
    unit: 'set',
    min_order_qty: 30,
    eoq: 150,
    max_stock: 800,
    lead_time_days: 45,
    is_seasonal: false,
    season_weight: null,
    inventory: { qty_on_hand: 75, qty_available: 70, qty_reserved: 5, reorder_point: 50, safety_stock: 20 },
    is_active: true,
  },
  {
    id: 'prod-12',
    sku_code: 'SG-DPK-012',
    name: 'Helmet Lock',
    category: 'safety_gear',
    sub_category: 'lock',
    motorcycle_model: null,
    supplier: { id: 'sup-5', name: 'Dhaka Parts Ltd.', country: 'Bangladesh' },
    unit_cost_bdt: 120,
    selling_price_bdt: 250,
    unit: 'piece',
    min_order_qty: 100,
    eoq: 400,
    max_stock: 2000,
    lead_time_days: 7,
    is_seasonal: false,
    season_weight: null,
    inventory: { qty_on_hand: 500, qty_available: 480, qty_reserved: 20, reorder_point: 200, safety_stock: 80 },
    is_active: false,
  },
];
