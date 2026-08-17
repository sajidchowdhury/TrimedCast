// ============================================
// TrimedCast - Purchase Order & Recommended Order Types
// Session 19: Purchase Order Management Dashboard
// Types, constants, and mock data for BD
// motorcycle parts procurement
// ============================================

// --- Purchase Order ---
export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id?: string | null;
  order_date: string;
  expected_delivery?: string | null;
  status: POStatus;
  total_amount?: number | null;
  cny_risk: boolean;
  lead_time_days?: number | null;
  items: POItem[];
  supplier?: { id: string; name: string; country: string } | null;
}

export type POStatus = 'draft' | 'submitted' | 'confirmed' | 'in_transit' | 'received' | 'cancelled';

export interface POItem {
  productId: string;
  quantity: number;
  unitCost: number;
  recommendedOrderId?: string;
  product_name?: string;
  sku_code?: string;
}

// --- Recommended Order ---
export interface RecommendedOrder {
  id: string;
  product: {
    sku_code: string;
    name: string;
    season_type?: string | null;
    motorcycle_model?: { id: string; brand: string; model: string } | null;
  };
  current_stock?: number | null;
  reorder_point?: number | null;
  recommended_qty: number;
  suggested_qty: number;
  order_trigger_date: string;
  total_lead_time_days?: number | null;
  shipment_mode: 'sea' | 'air';
  expected_available_date?: string | null;
  urgency: 'critical' | 'high' | 'normal' | 'low';
  priority: string;
  status: ROStatus;
  cny_risk: boolean;
  cny_strategy?: string | null;
  cny_delay_days: number;
  unit_cost?: number | null;
  total_cost?: number | null;
  justification?: string | null;
}

export type ROStatus = 'pending' | 'approved' | 'converted' | 'rejected' | 'acknowledged' | 'deferred' | 'skipped';

// --- Status Configs ---
export const PO_STATUS_CONFIG: Record<POStatus, { label: string; labelBn: string; color: string; icon: string }> = {
  draft: { label: 'Draft', labelBn: 'খসড়া', color: 'slate', icon: 'FileText' },
  submitted: { label: 'Submitted', labelBn: 'জমা দেওয়া', color: 'blue', icon: 'Send' },
  confirmed: { label: 'Confirmed', labelBn: 'নিশ্চিত', color: 'indigo', icon: 'CheckCircle2' },
  in_transit: { label: 'In Transit', labelBn: 'পরিবহনে', color: 'amber', icon: 'Truck' },
  received: { label: 'Received', labelBn: 'গৃহীত', color: 'emerald', icon: 'PackageCheck' },
  cancelled: { label: 'Cancelled', labelBn: 'বাতিল', color: 'red', icon: 'XCircle' },
};

export const URGENCY_CONFIG: Record<string, { label: string; labelBn: string; color: string; pulse: boolean }> = {
  critical: { label: 'Critical', labelBn: 'সংকটাপন্ন', color: 'red', pulse: true },
  high: { label: 'High', labelBn: 'উচ্চ', color: 'amber', pulse: false },
  normal: { label: 'Normal', labelBn: 'স্বাভাবিক', color: 'emerald', pulse: false },
  low: { label: 'Low', labelBn: 'নিম্ন', color: 'slate', pulse: false },
};

export const CNY_STRATEGIES = [
  { value: 'before_cny', label: 'Order Before CNY', labelBn: 'CNY আগে অর্ডার', desc: 'Expedite before factory shutdown' },
  { value: 'after_cny', label: 'Order After CNY', labelBn: 'CNY পরে অর্ডার', desc: 'Wait for factory reopening' },
  { value: 'partial_order', label: 'Partial Order', labelBn: 'আংশিক অর্ডার', desc: 'Split: urgent now, rest later' },
  { value: 'air_escape', label: 'Air Freight', labelBn: 'বিমান মালবাহী', desc: 'Air ship critical items only' },
  { value: 'none', label: 'No CNY Impact', labelBn: 'CNY প্রভাব নেই', desc: 'Supplier not affected' },
];

// --- PO Status Transition Helpers ---
export const PO_TRANSITIONS: Record<POStatus, POStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['confirmed', 'cancelled'],
  confirmed: ['in_transit'],
  in_transit: ['received'],
  received: [],
  cancelled: [],
};

export function getNextStatusOptions(current: POStatus): { status: POStatus; label: string }[] {
  return PO_TRANSITIONS[current].map((s) => ({
    status: s,
    label: PO_STATUS_CONFIG[s].label,
  }));
}

// --- CNY Strategy Label Helper ---
export function getCNYStrategyLabel(value?: string | null): string {
  if (!value) return 'None';
  const s = CNY_STRATEGIES.find((c) => c.value === value);
  return s ? s.label : value;
}

// ============================================
// Mock Data for Demo
// ============================================

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-1',
    po_number: 'PO-00001',
    supplier_id: 'sup-1',
    order_date: '2025-08-15T00:00:00.000Z',
    expected_delivery: '2025-11-15T00:00:00.000Z',
    status: 'draft',
    total_amount: 425000,
    cny_risk: true,
    lead_time_days: 155,
    items: [
      { productId: 'prod-1', quantity: 200, unitCost: 850, product_name: 'Honda Piston Ring Set', sku_code: 'EP-HON-001' },
      { productId: 'prod-8', quantity: 150, unitCost: 1500, product_name: 'Exhaust Silencer CD125', sku_code: 'EX-JKP-008' },
    ],
    supplier: { id: 'sup-1', name: 'Jingke Auto Parts', country: 'China' },
  },
  {
    id: 'po-2',
    po_number: 'PO-00002',
    supplier_id: 'sup-2',
    order_date: '2025-08-18T00:00:00.000Z',
    expected_delivery: '2025-10-18T00:00:00.000Z',
    status: 'draft',
    total_amount: 180000,
    cny_risk: false,
    lead_time_days: 60,
    items: [
      { productId: 'prod-2', quantity: 400, unitCost: 450, product_name: 'Brake Pad Set (Front)', sku_code: 'BR-OSK-002' },
    ],
    supplier: { id: 'sup-2', name: 'Osaka Motorcycle Co.', country: 'Japan' },
  },
  {
    id: 'po-3',
    po_number: 'PO-00003',
    supplier_id: 'sup-1',
    order_date: '2025-08-10T00:00:00.000Z',
    expected_delivery: '2025-11-10T00:00:00.000Z',
    status: 'submitted',
    total_amount: 312000,
    cny_risk: true,
    lead_time_days: 90,
    items: [
      { productId: 'prod-3', quantity: 150, unitCost: 620, product_name: 'CDI Unit Yamaha FZ-S', sku_code: 'EL-YMH-003' },
      { productId: 'prod-11', quantity: 100, unitCost: 520, product_name: 'Side Panel Set CD125', sku_code: 'BP-HON-011' },
      { productId: 'prod-6', quantity: 40, unitCost: 2200, product_name: 'Carburetor Assembly', sku_code: 'FS-KSP-006' },
    ],
    supplier: { id: 'sup-1', name: 'Jingke Auto Parts', country: 'China' },
  },
  {
    id: 'po-4',
    po_number: 'PO-00004',
    supplier_id: 'sup-3',
    order_date: '2025-08-12T00:00:00.000Z',
    expected_delivery: '2025-10-12T00:00:00.000Z',
    status: 'submitted',
    total_amount: 195000,
    cny_risk: false,
    lead_time_days: 60,
    items: [
      { productId: 'prod-4', quantity: 100, unitCost: 1200, product_name: 'Rear Shock Absorber', sku_code: 'SP-HMR-004' },
      { productId: 'prod-9', quantity: 120, unitCost: 650, product_name: 'Chain Sprocket Kit', sku_code: 'TR-HMI-009' },
    ],
    supplier: { id: 'sup-3', name: 'Hero MotoCorp Suppliers', country: 'India' },
  },
  {
    id: 'po-5',
    po_number: 'PO-00005',
    supplier_id: 'sup-6',
    order_date: '2025-07-20T00:00:00.000Z',
    expected_delivery: '2025-10-20T00:00:00.000Z',
    status: 'confirmed',
    total_amount: 264000,
    cny_risk: true,
    lead_time_days: 90,
    items: [
      { productId: 'prod-6', quantity: 80, unitCost: 2200, product_name: 'Carburetor Assembly', sku_code: 'FS-KSP-006' },
      { productId: 'prod-11', quantity: 160, unitCost: 520, product_name: 'Side Panel Set CD125', sku_code: 'BP-HON-011' },
    ],
    supplier: { id: 'sup-6', name: 'Kunshan Precision', country: 'China' },
  },
  {
    id: 'po-6',
    po_number: 'PO-00006',
    supplier_id: 'sup-4',
    order_date: '2025-07-05T00:00:00.000Z',
    expected_delivery: '2025-09-05T00:00:00.000Z',
    status: 'in_transit',
    total_amount: 108000,
    cny_risk: false,
    lead_time_days: 60,
    items: [
      { productId: 'prod-5', quantity: 60, unitCost: 1800, product_name: 'Tubeless Tire 100/90-17', sku_code: 'TW-THI-005' },
    ],
    supplier: { id: 'sup-4', name: 'Thai Wheel Industries', country: 'Thailand' },
  },
  {
    id: 'po-7',
    po_number: 'PO-00007',
    supplier_id: 'sup-5',
    order_date: '2025-06-01T00:00:00.000Z',
    expected_delivery: '2025-06-15T00:00:00.000Z',
    status: 'received',
    total_amount: 78000,
    cny_risk: false,
    lead_time_days: 14,
    items: [
      { productId: 'prod-7', quantity: 200, unitCost: 180, product_name: 'Rear View Mirror Set', sku_code: 'AC-DPK-007' },
      { productId: 'prod-10', quantity: 150, unitCost: 280, product_name: '4T Engine Oil 1L', sku_code: 'LB-DPK-010' },
    ],
    supplier: { id: 'sup-5', name: 'Dhaka Parts Ltd.', country: 'Bangladesh' },
  },
  {
    id: 'po-8',
    po_number: 'PO-00008',
    supplier_id: 'sup-1',
    order_date: '2025-08-01T00:00:00.000Z',
    expected_delivery: '2025-11-01T00:00:00.000Z',
    status: 'cancelled',
    total_amount: 340000,
    cny_risk: true,
    lead_time_days: 90,
    items: [
      { productId: 'prod-1', quantity: 200, unitCost: 850, product_name: 'Honda Piston Ring Set', sku_code: 'EP-HON-001' },
      { productId: 'prod-8', quantity: 100, unitCost: 1500, product_name: 'Exhaust Silencer CD125', sku_code: 'EX-JKP-008' },
    ],
    supplier: { id: 'sup-1', name: 'Jingke Auto Parts', country: 'China' },
  },
];

export const MOCK_RECOMMENDED_ORDERS: RecommendedOrder[] = [
  {
    id: 'ro-1',
    product: { sku_code: 'EP-HON-001', name: 'Honda Piston Ring Set', season_type: 'winter_peak', motorcycle_model: { id: 'mc-1', brand: 'Honda', model: 'CD125' } },
    current_stock: 130,
    reorder_point: 100,
    recommended_qty: 200,
    suggested_qty: 180,
    order_trigger_date: '2025-08-20T00:00:00.000Z',
    total_lead_time_days: 155,
    shipment_mode: 'sea',
    expected_available_date: '2026-01-22T00:00:00.000Z',
    urgency: 'critical',
    priority: 'critical',
    status: 'pending',
    cny_risk: true,
    cny_strategy: 'before_cny',
    cny_delay_days: 14,
    unit_cost: 850,
    total_cost: 170000,
    justification: 'Stock approaching reorder point with seasonal uplift; CNY shutdown risk',
  },
  {
    id: 'ro-2',
    product: { sku_code: 'EL-YMH-003', name: 'CDI Unit Yamaha FZ-S', season_type: null, motorcycle_model: { id: 'mc-4', brand: 'Yamaha', model: 'FZ-S V3' } },
    current_stock: 40,
    reorder_point: 60,
    recommended_qty: 150,
    suggested_qty: 120,
    order_trigger_date: '2025-08-18T00:00:00.000Z',
    total_lead_time_days: 45,
    shipment_mode: 'sea',
    expected_available_date: '2025-12-15T00:00:00.000Z',
    urgency: 'critical',
    priority: 'critical',
    status: 'pending',
    cny_risk: true,
    cny_strategy: 'partial_order',
    cny_delay_days: 14,
    unit_cost: 620,
    total_cost: 93000,
    justification: 'Below reorder point; electrical parts in high demand',
  },
  {
    id: 'ro-3',
    product: { sku_code: 'TW-THI-005', name: 'Tubeless Tire 100/90-17', season_type: null, motorcycle_model: null },
    current_stock: 0,
    reorder_point: 30,
    recommended_qty: 60,
    suggested_qty: 50,
    order_trigger_date: '2025-08-15T00:00:00.000Z',
    total_lead_time_days: 25,
    shipment_mode: 'sea',
    expected_available_date: '2025-11-15T00:00:00.000Z',
    urgency: 'high',
    priority: 'high',
    status: 'pending',
    cny_risk: false,
    cny_strategy: 'none',
    cny_delay_days: 0,
    unit_cost: 1800,
    total_cost: 108000,
    justification: 'Out of stock; tires are consistent seller',
  },
  {
    id: 'ro-4',
    product: { sku_code: 'FS-KSP-006', name: 'Carburetor Assembly', season_type: null, motorcycle_model: { id: 'mc-5', brand: 'Honda', model: 'CB Shine' } },
    current_stock: 18,
    reorder_point: 30,
    recommended_qty: 80,
    suggested_qty: 60,
    order_trigger_date: '2025-08-22T00:00:00.000Z',
    total_lead_time_days: 40,
    shipment_mode: 'sea',
    expected_available_date: '2025-12-10T00:00:00.000Z',
    urgency: 'high',
    priority: 'high',
    status: 'approved',
    cny_risk: true,
    cny_strategy: 'after_cny',
    cny_delay_days: 14,
    unit_cost: 2200,
    total_cost: 176000,
    justification: 'Below safety stock; critical fuel system component',
  },
  {
    id: 'ro-5',
    product: { sku_code: 'SP-HMR-004', name: 'Rear Shock Absorber', season_type: 'monsoon_peak', motorcycle_model: { id: 'mc-7', brand: 'Hero', model: 'Splendor Plus' } },
    current_stock: 80,
    reorder_point: 50,
    recommended_qty: 100,
    suggested_qty: 80,
    order_trigger_date: '2025-09-01T00:00:00.000Z',
    total_lead_time_days: 20,
    shipment_mode: 'sea',
    expected_available_date: '2025-11-20T00:00:00.000Z',
    urgency: 'high',
    priority: 'high',
    status: 'pending',
    cny_risk: false,
    cny_strategy: 'none',
    cny_delay_days: 0,
    unit_cost: 1200,
    total_cost: 120000,
    justification: 'Seasonal demand approaching; monsoon peak preparation',
  },
  {
    id: 'ro-6',
    product: { sku_code: 'BR-OSK-002', name: 'Brake Pad Set (Front)', season_type: 'winter_peak', motorcycle_model: { id: 'mc-2', brand: 'Bajaj', model: 'Pulsar 150' } },
    current_stock: 350,
    reorder_point: 200,
    recommended_qty: 400,
    suggested_qty: 350,
    order_trigger_date: '2025-09-10T00:00:00.000Z',
    total_lead_time_days: 30,
    shipment_mode: 'sea',
    expected_available_date: '2026-01-10T00:00:00.000Z',
    urgency: 'normal',
    priority: 'medium',
    status: 'pending',
    cny_risk: false,
    cny_strategy: 'none',
    cny_delay_days: 0,
    unit_cost: 450,
    total_cost: 180000,
    justification: 'Routine reorder; stock healthy but winter demand expected',
  },
  {
    id: 'ro-7',
    product: { sku_code: 'TR-HMI-009', name: 'Chain Sprocket Kit', season_type: 'winter_peak', motorcycle_model: { id: 'mc-3', brand: 'TVS', model: 'Apache RTR 160' } },
    current_stock: 100,
    reorder_point: 60,
    recommended_qty: 120,
    suggested_qty: 100,
    order_trigger_date: '2025-09-15T00:00:00.000Z',
    total_lead_time_days: 20,
    shipment_mode: 'sea',
    expected_available_date: '2025-12-05T00:00:00.000Z',
    urgency: 'normal',
    priority: 'medium',
    status: 'approved',
    cny_risk: false,
    cny_strategy: 'none',
    cny_delay_days: 0,
    unit_cost: 650,
    total_cost: 78000,
    justification: 'Standard reorder cycle; seasonal weight 1.3',
  },
  {
    id: 'ro-8',
    product: { sku_code: 'EX-JKP-008', name: 'Exhaust Silencer CD125', season_type: null, motorcycle_model: { id: 'mc-1', brand: 'Honda', model: 'CD125' } },
    current_stock: 30,
    reorder_point: 25,
    recommended_qty: 50,
    suggested_qty: 40,
    order_trigger_date: '2025-09-20T00:00:00.000Z',
    total_lead_time_days: 45,
    shipment_mode: 'sea',
    expected_available_date: '2026-01-20T00:00:00.000Z',
    urgency: 'normal',
    priority: 'medium',
    status: 'pending',
    cny_risk: true,
    cny_strategy: 'after_cny',
    cny_delay_days: 14,
    unit_cost: 1500,
    total_cost: 75000,
    justification: 'Stock approaching reorder; CNY delay accounted',
  },
  {
    id: 'ro-9',
    product: { sku_code: 'BP-HON-011', name: 'Side Panel Set CD125', season_type: null, motorcycle_model: { id: 'mc-1', brand: 'Honda', model: 'CD125' } },
    current_stock: 70,
    reorder_point: 50,
    recommended_qty: 150,
    suggested_qty: 100,
    order_trigger_date: '2025-10-01T00:00:00.000Z',
    total_lead_time_days: 45,
    shipment_mode: 'sea',
    expected_available_date: '2026-02-15T00:00:00.000Z',
    urgency: 'normal',
    priority: 'low',
    status: 'pending',
    cny_risk: true,
    cny_strategy: 'after_cny',
    cny_delay_days: 14,
    unit_cost: 520,
    total_cost: 78000,
    justification: 'Adequate stock; order after CNY for cost savings',
  },
  {
    id: 'ro-10',
    product: { sku_code: 'LB-DPK-010', name: '4T Engine Oil 1L', season_type: 'winter_peak', motorcycle_model: null },
    current_stock: 250,
    reorder_point: 200,
    recommended_qty: 500,
    suggested_qty: 400,
    order_trigger_date: '2025-10-05T00:00:00.000Z',
    total_lead_time_days: 7,
    shipment_mode: 'air',
    expected_available_date: '2025-10-15T00:00:00.000Z',
    urgency: 'normal',
    priority: 'low',
    status: 'converted',
    cny_risk: false,
    cny_strategy: 'none',
    cny_delay_days: 0,
    unit_cost: 280,
    total_cost: 140000,
    justification: 'Local supplier; short lead time; seasonal uplift',
  },
  {
    id: 'ro-11',
    product: { sku_code: 'AC-DPK-007', name: 'Rear View Mirror Set', season_type: null, motorcycle_model: null },
    current_stock: 400,
    reorder_point: 150,
    recommended_qty: 300,
    suggested_qty: 200,
    order_trigger_date: '2025-10-15T00:00:00.000Z',
    total_lead_time_days: 7,
    shipment_mode: 'air',
    expected_available_date: '2025-10-25T00:00:00.000Z',
    urgency: 'low',
    priority: 'low',
    status: 'deferred',
    cny_risk: false,
    cny_strategy: 'none',
    cny_delay_days: 0,
    unit_cost: 180,
    total_cost: 54000,
    justification: 'Stock well above reorder; defer to next cycle',
  },
  {
    id: 'ro-12',
    product: { sku_code: 'SG-DPK-012', name: 'Helmet Lock', season_type: null, motorcycle_model: null },
    current_stock: 480,
    reorder_point: 200,
    recommended_qty: 400,
    suggested_qty: 300,
    order_trigger_date: '2025-11-01T00:00:00.000Z',
    total_lead_time_days: 7,
    shipment_mode: 'air',
    expected_available_date: '2025-11-10T00:00:00.000Z',
    urgency: 'low',
    priority: 'low',
    status: 'skipped',
    cny_risk: false,
    cny_strategy: 'none',
    cny_delay_days: 0,
    unit_cost: 120,
    total_cost: 48000,
    justification: 'Product inactive; skip recommendation',
  },
];
