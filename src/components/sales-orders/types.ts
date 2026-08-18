// ============================================
// TrimedCast — Sales Order Types & Config
// Session 23: Sales Order Management
// ============================================

export interface SalesOrder {
  id: string;
  order_no: string;
  date: string;
  customer_id?: string | null;
  channel?: string | null;
  region?: string | null;
  total_amount?: number | null;
  status: SOStatus;
  items: SOItem[];
}

export type SOStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface SOItem {
  productId: string;
  quantity: number;
  price: number;
  product_name?: string;
  sku_code?: string;
}

export const SO_STATUS_CONFIG: Record<SOStatus, { label: string; labelBn: string; color: string }> = {
  pending: { label: 'Pending', labelBn: 'অপেক্ষমাণ', color: 'amber' },
  confirmed: { label: 'Confirmed', labelBn: 'নিশ্চিত', color: 'sky' },
  shipped: { label: 'Shipped', labelBn: 'প্রেরিত', color: 'violet' },
  delivered: { label: 'Delivered', labelBn: 'বিতরণ', color: 'emerald' },
  cancelled: { label: 'Cancelled', labelBn: 'বাতিল', color: 'red' },
};

export const SO_STATUS_ORDER: SOStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];

export const SO_CHANNELS = [
  { value: 'retail', label: 'Retail Shop', labelBn: 'খুচরা দোকান' },
  { value: 'wholesale', label: 'Wholesale', labelBn: 'পাইকারি' },
  { value: 'online', label: 'Online (Daraz)', labelBn: 'অনলাইন (দারাজ)' },
  { value: 'service_center', label: 'Service Center', labelBn: 'সার্ভিস সেন্টার' },
  { value: 'dealer', label: 'Dealer', labelBn: 'ডিলার' },
  { value: 'export', label: 'Export', labelBn: 'রপ্তানি' },
];

export const BD_REGIONS = [
  { value: 'dhaka', label: 'Dhaka', labelBn: 'ঢাকা' },
  { value: 'chittagong', label: 'Chittagong', labelBn: 'চট্টগ্রাম' },
  { value: 'sylhet', label: 'Sylhet', labelBn: 'সিলেট' },
  { value: 'rajshahi', label: 'Rajshahi', labelBn: 'রাজশাহী' },
  { value: 'khulna', label: 'Khulna', labelBn: 'খুলনা' },
  { value: 'barishal', label: 'Barishal', labelBn: 'বরিশাল' },
  { value: 'rangpur', label: 'Rangpur', labelBn: 'রংপুর' },
  { value: 'mymensingh', label: 'Mymensingh', labelBn: 'ময়মনসিংহ' },
];

// Helper to get channel display
export function getChannelDisplay(value: string | null | undefined): { label: string; labelBn: string } {
  const ch = SO_CHANNELS.find((c) => c.value === value);
  return ch ? { label: ch.label, labelBn: ch.labelBn } : { label: value ?? '—', labelBn: '' };
}

// Helper to get region display
export function getRegionDisplay(value: string | null | undefined): { label: string; labelBn: string } {
  const r = BD_REGIONS.find((reg) => reg.value === value);
  return r ? { label: r.label, labelBn: r.labelBn } : { label: value ?? '—', labelBn: '' };
}

// Format BDT amount
export function formatBDT(amount: number | null | undefined): string {
  if (amount == null) return '৳0';
  return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Mock Data — 12 Sales Orders
export const MOCK_SALES_ORDERS: SalesOrder[] = [
  {
    id: 'so-001',
    order_no: 'SO-00001',
    date: '2026-08-17T00:00:00.000Z',
    customer_id: 'Rahim Auto Parts',
    channel: 'retail',
    region: 'dhaka',
    total_amount: 42500,
    status: 'pending',
    items: [
      { productId: 'p1', quantity: 50, price: 450, product_name: 'Brake Pad Set (Front)', sku_code: 'BP-F-001' },
      { productId: 'p2', quantity: 30, price: 650, product_name: 'Clutch Cable', sku_code: 'CC-002' },
    ],
  },
  {
    id: 'so-002',
    order_no: 'SO-00002',
    date: '2026-08-16T00:00:00.000Z',
    customer_id: 'Karim Motor Stores',
    channel: 'wholesale',
    region: 'chittagong',
    total_amount: 178000,
    status: 'pending',
    items: [
      { productId: 'p3', quantity: 100, price: 850, product_name: 'Chain Kit (428H)', sku_code: 'CK-428-003' },
      { productId: 'p4', quantity: 200, price: 465, product_name: 'Spark Plug (NGK)', sku_code: 'SP-NGK-004' },
    ],
  },
  {
    id: 'so-003',
    order_no: 'SO-00003',
    date: '2026-08-15T00:00:00.000Z',
    customer_id: 'Al-Amin Bike Zone',
    channel: 'online',
    region: 'dhaka',
    total_amount: 23500,
    status: 'pending',
    items: [
      { productId: 'p5', quantity: 20, price: 750, product_name: 'Rear View Mirror Set', sku_code: 'RM-005' },
      { productId: 'p6', quantity: 25, price: 340, product_name: 'Handle Grip Rubber', sku_code: 'HG-006' },
    ],
  },
  {
    id: 'so-004',
    order_no: 'SO-00004',
    date: '2026-08-14T00:00:00.000Z',
    customer_id: 'Nasir Trading Co.',
    channel: 'dealer',
    region: 'sylhet',
    total_amount: 245000,
    status: 'confirmed',
    items: [
      { productId: 'p7', quantity: 150, price: 920, product_name: 'Piston Kit (125cc)', sku_code: 'PK-125-007' },
      { productId: 'p8', quantity: 80, price: 1340, product_name: 'CDI Unit (Bajaj)', sku_code: 'CDI-BJ-008' },
    ],
  },
  {
    id: 'so-005',
    order_no: 'SO-00005',
    date: '2026-08-13T00:00:00.000Z',
    customer_id: 'Jamuna Auto Agency',
    channel: 'wholesale',
    region: 'rajshahi',
    total_amount: 156000,
    status: 'confirmed',
    items: [
      { productId: 'p9', quantity: 60, price: 1200, product_name: 'Carburetor (Keihin)', sku_code: 'CB-KH-009' },
      { productId: 'p10', quantity: 120, price: 700, product_name: 'Brake Shoe Set (Rear)', sku_code: 'BS-R-010' },
    ],
  },
  {
    id: 'so-006',
    order_no: 'SO-00006',
    date: '2026-08-12T00:00:00.000Z',
    customer_id: 'Shahin Motorcycle House',
    channel: 'retail',
    region: 'dhaka',
    total_amount: 18700,
    status: 'confirmed',
    items: [
      { productId: 'p11', quantity: 15, price: 620, product_name: 'Speedometer Cable', sku_code: 'SC-011' },
      { productId: 'p12', quantity: 40, price: 235, product_name: 'Indicator Bulb Set', sku_code: 'IB-012' },
    ],
  },
  {
    id: 'so-007',
    order_no: 'SO-00007',
    date: '2026-08-10T00:00:00.000Z',
    customer_id: 'Rupali Auto Parts',
    channel: 'service_center',
    region: 'chittagong',
    total_amount: 87500,
    status: 'shipped',
    items: [
      { productId: 'p13', quantity: 25, price: 1800, product_name: 'Engine Oil Seal Kit', sku_code: 'EOS-013' },
      { productId: 'p14', quantity: 50, price: 850, product_name: 'Fork Oil Seal', sku_code: 'FOS-014' },
    ],
  },
  {
    id: 'so-008',
    order_no: 'SO-00008',
    date: '2026-08-08T00:00:00.000Z',
    customer_id: 'Mukta Traders',
    channel: 'online',
    region: 'sylhet',
    total_amount: 31200,
    status: 'shipped',
    items: [
      { productId: 'p15', quantity: 30, price: 520, product_name: 'Air Filter Element', sku_code: 'AF-015' },
      { productId: 'p16', quantity: 40, price: 390, product_name: 'Fuel Filter (Inline)', sku_code: 'FF-016' },
    ],
  },
  {
    id: 'so-009',
    order_no: 'SO-00009',
    date: '2026-08-05T00:00:00.000Z',
    customer_id: 'Delta Motor Works',
    channel: 'dealer',
    region: 'rajshahi',
    total_amount: 192000,
    status: 'delivered',
    items: [
      { productId: 'p17', quantity: 80, price: 1400, product_name: 'Stator Coil Assembly', sku_code: 'SCA-017' },
      { productId: 'p18', quantity: 100, price: 800, product_name: 'Regulator Rectifier', sku_code: 'RR-018' },
    ],
  },
  {
    id: 'so-010',
    order_no: 'SO-00010',
    date: '2026-08-03T00:00:00.000Z',
    customer_id: 'Bengal Bike Parts',
    channel: 'wholesale',
    region: 'dhaka',
    total_amount: 124500,
    status: 'delivered',
    items: [
      { productId: 'p19', quantity: 40, price: 1650, product_name: 'Magneto Coil', sku_code: 'MC-019' },
      { productId: 'p20', quantity: 90, price: 650, product_name: 'Throttle Cable', sku_code: 'TC-020' },
    ],
  },
  {
    id: 'so-011',
    order_no: 'SO-00011',
    date: '2026-08-01T00:00:00.000Z',
    customer_id: 'Sundarban Auto',
    channel: 'retail',
    region: 'chittagong',
    total_amount: 9800,
    status: 'cancelled',
    items: [
      { productId: 'p21', quantity: 10, price: 580, product_name: 'Side Stand Spring', sku_code: 'SSS-021' },
      { productId: 'p22', quantity: 20, price: 200, product_name: 'Clutch Lever', sku_code: 'CL-022' },
    ],
  },
  {
    id: 'so-012',
    order_no: 'SO-00012',
    date: '2026-07-30T00:00:00.000Z',
    customer_id: 'Green Road Motors',
    channel: 'service_center',
    region: 'dhaka',
    total_amount: 56000,
    status: 'cancelled',
    items: [
      { productId: 'p23', quantity: 8, price: 3500, product_name: 'Kick Starter Assembly', sku_code: 'KSA-023' },
      { productId: 'p24', quantity: 16, price: 1750, product_name: 'Gear Shift Lever', sku_code: 'GSL-024' },
    ],
  },
];
