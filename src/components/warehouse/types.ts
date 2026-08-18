// ============================================
// TrimedCast — Warehouse & Logistics Types
// Session 25: Warehouse & Logistics Dashboard
// ============================================

// ─── Core Type Definitions ───────────────────────────────────────────

export type WarehouseStatus = 'active' | 'maintenance' | 'full';

export interface Warehouse {
  id: string;
  name: string;
  nameBn: string;
  code: string;
  city: string;
  cityBn: string;
  capacity: number;       // sqm
  usedCapacity: number;   // sqm
  zoneCount: number;
  status: WarehouseStatus;
  isPrimary: boolean;
}

export type ZoneType =
  | 'receiving'
  | 'bulk-storage'
  | 'picking'
  | 'packing'
  | 'shipping'
  | 'cold-storage'
  | 'hazardous';

export type ZoneStatus = 'active' | 'full' | 'locked' | 'maintenance';

export interface WarehouseZone {
  id: string;
  warehouseId: string;
  name: string;
  nameBn: string;
  type: ZoneType;
  capacityPallets: number;
  usedPallets: number;
  temperature?: number;   // °C for cold/hazardous zones
  status: ZoneStatus;
}

export type InboundStatus =
  | 'pending'
  | 'in-transit'
  | 'at-dock'
  | 'receiving'
  | 'put-away'
  | 'completed';

export type InboundOrigin = 'domestic' | 'international';

export interface InboundShipment {
  id: string;
  poNumber: string;
  supplierName: string;
  warehouseCode: string;
  carrier: string;
  carrierBn: string;
  status: InboundStatus;
  eta: string;            // ISO date
  items: number;
  totalPallets: number;
  trackingNumber: string;
  origin: InboundOrigin;
  portOfEntry?: string;
}

export type OutboundStatus =
  | 'pick-pack'
  | 'ready'
  | 'dispatched'
  | 'in-transit'
  | 'out-for-delivery'
  | 'delivered'
  | 'failed';

export interface OutboundShipment {
  id: string;
  orderNumber: string;
  customerName: string;
  warehouseCode: string;
  courier: string;
  courierBn: string;
  status: OutboundStatus;
  eta: string;            // ISO date
  items: number;
  totalWeight: number;    // kg
  trackingNumber: string;
  destinationCity: string;
  destinationCityBn: string;
}

export type CourierType = 'express' | 'standard' | 'freight';

export interface CourierPartner {
  id: string;
  name: string;
  nameBn: string;
  type: CourierType;
  logoColor: string;
  coverage: string;
  avgDeliveryDays: number;
  onTimeRate: number;     // 0–100
  activeShipments: number;
}

export type PickPackStatus = 'pending' | 'picking' | 'packed' | 'ready' | 'qc-check';
export type PickPackPriority = 'normal' | 'high' | 'urgent';

export interface PickPackJob {
  id: string;
  orderId: string;
  warehouseCode: string;
  status: PickPackStatus;
  assignedTo: string;
  itemCount: number;
  priority: PickPackPriority;
  startedAt?: string;     // ISO date
  completedAt?: string;   // ISO date
}

export interface DeliveryStatusUpdate {
  timestamp: string;
  location: string;
  status: string;
  note?: string;
}

export interface DeliveryStatus {
  id: string;
  shipmentId: string;
  courier: string;
  trackingNumber: string;
  currentStatus: OutboundStatus;
  currentLocation: string;
  currentLocationBn: string;
  estimatedDelivery: string;
  updates: DeliveryStatusUpdate[];
}

// ─── Status Configuration Maps ──────────────────────────────────────

export const WAREHOUSE_STATUS_CONFIG: Record<
  WarehouseStatus,
  { label: string; labelBn: string; color: string; bg: string; border: string }
> = {
  active: {
    label: 'Active',
    labelBn: 'সক্রিয়',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  maintenance: {
    label: 'Maintenance',
    labelBn: 'রক্ষণাবেক্ষণ',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  full: {
    label: 'Full',
    labelBn: 'সর্বক্ষম',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
};

export const ZONE_TYPE_CONFIG: Record<
  ZoneType,
  { label: string; labelBn: string; icon: string; color: string; bg: string }
> = {
  receiving: {
    label: 'Receiving',
    labelBn: 'রিসিভিং',
    icon: 'ArrowDownToLine',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  'bulk-storage': {
    label: 'Bulk Storage',
    labelBn: 'বাল্ক স্টোরেজ',
    icon: 'Warehouse',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
  },
  picking: {
    label: 'Picking',
    labelBn: 'পিকিং',
    icon: 'Hand',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  packing: {
    label: 'Packing',
    labelBn: 'প্যাকিং',
    icon: 'Package',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  shipping: {
    label: 'Shipping',
    labelBn: 'শিপিং',
    icon: 'Truck',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  'cold-storage': {
    label: 'Cold Storage',
    labelBn: 'কোল্ড স্টোরেজ',
    icon: 'Snowflake',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
  hazardous: {
    label: 'Hazardous',
    labelBn: 'বিপজন্ন',
    icon: 'AlertTriangle',
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
};

export const INBOUND_STATUS_CONFIG: Record<
  InboundStatus,
  { step: number; label: string; labelBn: string; color: string; bg: string }
> = {
  pending: {
    step: 1,
    label: 'Pending',
    labelBn: 'পেন্ডিং',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  'in-transit': {
    step: 2,
    label: 'In Transit',
    labelBn: 'পথিমধ্যে',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  'at-dock': {
    step: 3,
    label: 'At Dock',
    labelBn: 'ডকে আগত',
    color: 'text-amber-600',
    bg: 'bg-amber-100',
  },
  receiving: {
    step: 4,
    label: 'Receiving',
    labelBn: 'গ্রহণ করছে',
    color: 'text-violet-600',
    bg: 'bg-violet-100',
  },
  'put-away': {
    step: 5,
    label: 'Put Away',
    labelBn: 'সংরক্ষণ করছে',
    color: 'text-teal-600',
    bg: 'bg-teal-100',
  },
  completed: {
    step: 6,
    label: 'Completed',
    labelBn: 'সম্পন্ন',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
  },
};

export const OUTBOUND_STATUS_CONFIG: Record<
  OutboundStatus,
  { step: number; label: string; labelBn: string; color: string; bg: string }
> = {
  'pick-pack': {
    step: 1,
    label: 'Pick & Pack',
    labelBn: 'পিক ও প্যাক',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  ready: {
    step: 2,
    label: 'Ready',
    labelBn: 'প্রস্তুত',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  dispatched: {
    step: 3,
    label: 'Dispatched',
    labelBn: 'প্রেরিত',
    color: 'text-amber-600',
    bg: 'bg-amber-100',
  },
  'in-transit': {
    step: 4,
    label: 'In Transit',
    labelBn: 'পথিমধ্যে',
    color: 'text-violet-600',
    bg: 'bg-violet-100',
  },
  'out-for-delivery': {
    step: 5,
    label: 'Out for Delivery',
    labelBn: 'ডেলিভারি পথে',
    color: 'text-teal-600',
    bg: 'bg-teal-100',
  },
  delivered: {
    step: 6,
    label: 'Delivered',
    labelBn: 'ডেলিভার্ড',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
  },
  failed: {
    step: 0,
    label: 'Failed',
    labelBn: 'ব্যর্থ',
    color: 'text-red-600',
    bg: 'bg-red-100',
  },
};

// ─── Courier Partners ───────────────────────────────────────────────

export const COURIER_PARTNERS: CourierPartner[] = [
  {
    id: 'courier-pathao',
    name: 'Pathao Courier',
    nameBn: 'পাঠাও কুরিয়ার',
    type: 'express',
    logoColor: '#E21D3E',
    coverage: 'Dhaka, Chattogram, Sylhet, Rajshahi',
    avgDeliveryDays: 2,
    onTimeRate: 85,
    activeShipments: 34,
  },
  {
    id: 'courier-redx',
    name: 'RedX',
    nameBn: 'রেডএক্স',
    type: 'express',
    logoColor: '#D32F2F',
    coverage: 'All 64 districts',
    avgDeliveryDays: 1.5,
    onTimeRate: 88,
    activeShipments: 28,
  },
  {
    id: 'courier-sundarban',
    name: 'Sundarban Courier',
    nameBn: 'সুন্দরবন কুরিয়ার',
    type: 'standard',
    logoColor: '#2E7D32',
    coverage: 'Dhaka, Khulna, Barisal, Chattogram',
    avgDeliveryDays: 3,
    onTimeRate: 82,
    activeShipments: 19,
  },
  {
    id: 'courier-sa-paribahan',
    name: 'SA Paribahan',
    nameBn: 'এসএ পরিবহন',
    type: 'standard',
    logoColor: '#1565C0',
    coverage: 'All major cities',
    avgDeliveryDays: 4,
    onTimeRate: 78,
    activeShipments: 12,
  },
  {
    id: 'courier-ecourier',
    name: 'eCourier',
    nameBn: 'ই-কুরিয়ার',
    type: 'express',
    logoColor: '#FF6F00',
    coverage: 'Dhaka, Chattogram, Sylhet, Rajshahi, Khulna',
    avgDeliveryDays: 1.5,
    onTimeRate: 90,
    activeShipments: 22,
  },
  {
    id: 'courier-continental',
    name: 'Continental',
    nameBn: 'কনটিনেন্টাল',
    type: 'freight',
    logoColor: '#4E342E',
    coverage: 'Chattogram port, Dhaka, all divisions',
    avgDeliveryDays: 5,
    onTimeRate: 85,
    activeShipments: 8,
  },
];

// ─── Bangladesh Warehouse Cities ────────────────────────────────────

export const BD_WAREHOUSE_CITIES = [
  { value: 'dhaka', label: 'Dhaka', labelBn: 'ঢাকা' },
  { value: 'chattogram', label: 'Chattogram', labelBn: 'চট্টগ্রাম' },
  { value: 'sylhet', label: 'Sylhet', labelBn: 'সিলেট' },
  { value: 'rajshahi', label: 'Rajshahi', labelBn: 'রাজশাহী' },
  { value: 'khulna', label: 'Khulna', labelBn: 'খুলনা' },
  { value: 'bogura', label: 'Bogura', labelBn: 'বগুড়া' },
  { value: 'narayanganj', label: 'Narayanganj', labelBn: 'নারায়ণগঞ্জ' },
] as const;

export type BDCity = (typeof BD_WAREHOUSE_CITIES)[number]['value'];

// ─── Mock Data — Warehouses ─────────────────────────────────────────

export const MOCK_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-dhk-01',
    name: 'Dhaka Central Hub',
    nameBn: 'ঢাকা সেন্ট্রাল হাব',
    code: 'WH-DHK-01',
    city: 'Dhaka',
    cityBn: 'ঢাকা',
    capacity: 5000,
    usedCapacity: 3600,
    zoneCount: 6,
    status: 'active',
    isPrimary: true,
  },
  {
    id: 'wh-cgp-01',
    name: 'Chattogram Port Warehouse',
    nameBn: 'চট্টগ্রাম পোর্ট গুদাম',
    code: 'WH-CGP-01',
    city: 'Chattogram',
    cityBn: 'চট্টগ্রাম',
    capacity: 3000,
    usedCapacity: 2550,
    zoneCount: 5,
    status: 'active',
    isPrimary: false,
  },
  {
    id: 'wh-syl-01',
    name: 'Sylhet Distribution',
    nameBn: 'সিলেট ডিস্ট্রিবিউশন',
    code: 'WH-SYL-01',
    city: 'Sylhet',
    cityBn: 'সিলেট',
    capacity: 1500,
    usedCapacity: 675,
    zoneCount: 4,
    status: 'active',
    isPrimary: false,
  },
  {
    id: 'wh-raj-01',
    name: 'Rajshahi Regional',
    nameBn: 'রাজশাহী আঞ্চলিক',
    code: 'WH-RAJ-01',
    city: 'Rajshahi',
    cityBn: 'রাজশাহী',
    capacity: 1200,
    usedCapacity: 720,
    zoneCount: 3,
    status: 'maintenance',
    isPrimary: false,
  },
];

// ─── Mock Data — Warehouse Zones (Dhaka Central Hub) ────────────────

export const MOCK_ZONES: WarehouseZone[] = [
  {
    id: 'zone-dhk-rcv',
    warehouseId: 'wh-dhk-01',
    name: 'Receiving Dock',
    nameBn: 'রিসিভিং ডক',
    type: 'receiving',
    capacityPallets: 100,
    usedPallets: 65,
    status: 'active',
  },
  {
    id: 'zone-dhk-bulk-a',
    warehouseId: 'wh-dhk-01',
    name: 'Bulk Storage A',
    nameBn: 'বাল্ক স্টোরেজ এ',
    type: 'bulk-storage',
    capacityPallets: 500,
    usedPallets: 380,
    status: 'active',
  },
  {
    id: 'zone-dhk-pick',
    warehouseId: 'wh-dhk-01',
    name: 'Picking Zone',
    nameBn: 'পিকিং জোন',
    type: 'picking',
    capacityPallets: 200,
    usedPallets: 145,
    status: 'active',
  },
  {
    id: 'zone-dhk-pack',
    warehouseId: 'wh-dhk-01',
    name: 'Packing Area',
    nameBn: 'প্যাকিং এরিয়া',
    type: 'packing',
    capacityPallets: 100,
    usedPallets: 42,
    status: 'active',
  },
  {
    id: 'zone-dhk-ship',
    warehouseId: 'wh-dhk-01',
    name: 'Shipping Dock',
    nameBn: 'শিপিং ডক',
    type: 'shipping',
    capacityPallets: 80,
    usedPallets: 55,
    status: 'active',
  },
  {
    id: 'zone-dhk-haz',
    warehouseId: 'wh-dhk-01',
    name: 'Hazardous Storage',
    nameBn: 'বিপজন্ন স্টোরেজ',
    type: 'hazardous',
    capacityPallets: 50,
    usedPallets: 12,
    temperature: 25,
    status: 'active',
  },
];

// ─── Mock Data — Inbound Shipments ──────────────────────────────────

export const MOCK_INBOUND: InboundShipment[] = [
  {
    id: 'ib-001',
    poNumber: 'PO-2025-0301',
    supplierName: 'Jiangsu Huanyu',
    warehouseCode: 'WH-CGP-01',
    carrier: 'COSCO Shipping',
    carrierBn: 'কোসকো শিপিং',
    status: 'at-dock',
    eta: '2025-03-11T08:00:00+06:00',
    items: 18,
    totalPallets: 45,
    trackingNumber: 'COSCO-BD-4521',
    origin: 'international',
    portOfEntry: 'Chattogram Port',
  },
  {
    id: 'ib-002',
    poNumber: 'PO-2025-0302',
    supplierName: 'Chongqing Moto',
    warehouseCode: 'WH-DHK-01',
    carrier: 'Biman Cargo',
    carrierBn: 'বিমান কার্গো',
    status: 'in-transit',
    eta: '2025-03-13T14:00:00+06:00',
    items: 6,
    totalPallets: 12,
    trackingNumber: 'BG-BD-7823',
    origin: 'international',
    portOfEntry: 'HSIA Dhaka',
  },
  {
    id: 'ib-003',
    poNumber: 'PO-2025-0303',
    supplierName: 'Local BD Supplier',
    warehouseCode: 'WH-DHK-01',
    carrier: 'Own Transport',
    carrierBn: 'নিজ পরিবহন',
    status: 'receiving',
    eta: '2025-03-10T10:00:00+06:00',
    items: 4,
    totalPallets: 8,
    trackingNumber: 'LOCAL-DHK-112',
    origin: 'domestic',
  },
  {
    id: 'ib-004',
    poNumber: 'PO-2025-0304',
    supplierName: 'Zhejiang Auto',
    warehouseCode: 'WH-CGP-01',
    carrier: 'Maersk Line',
    carrierBn: 'মার্স্ক লাইন',
    status: 'pending',
    eta: '2025-03-25T06:00:00+06:00',
    items: 24,
    totalPallets: 60,
    trackingNumber: 'MAE-BD-9034',
    origin: 'international',
    portOfEntry: 'Chattogram Port',
  },
  {
    id: 'ib-005',
    poNumber: 'PO-2025-0305',
    supplierName: 'Guangzhou Parts',
    warehouseCode: 'WH-DHK-01',
    carrier: 'Evergreen Marine',
    carrierBn: 'এভারগ্রিন মেরিন',
    status: 'put-away',
    eta: '2025-03-09T12:00:00+06:00',
    items: 15,
    totalPallets: 30,
    trackingNumber: 'EGL-BD-3312',
    origin: 'international',
    portOfEntry: 'Chattogram Port',
  },
  {
    id: 'ib-006',
    poNumber: 'PO-2025-0306',
    supplierName: 'Tianjin Export',
    warehouseCode: 'WH-DHK-01',
    carrier: 'China Airlines Cargo',
    carrierBn: 'চায়না এয়ারলাইন্স কার্গো',
    status: 'in-transit',
    eta: '2025-03-14T16:00:00+06:00',
    items: 8,
    totalPallets: 15,
    trackingNumber: 'CIA-BD-5567',
    origin: 'international',
    portOfEntry: 'HSIA Dhaka',
  },
  {
    id: 'ib-007',
    poNumber: 'PO-2025-0307',
    supplierName: 'RFL Bangladesh',
    warehouseCode: 'WH-DHK-01',
    carrier: 'Self Pickup',
    carrierBn: 'স্বয়ং পিকআপ',
    status: 'completed',
    eta: '2025-03-07T09:00:00+06:00',
    items: 3,
    totalPallets: 5,
    trackingNumber: 'RFL-DHK-089',
    origin: 'domestic',
  },
  {
    id: 'ib-008',
    poNumber: 'PO-2025-0308',
    supplierName: 'Shandong Weiteng',
    warehouseCode: 'WH-CGP-01',
    carrier: 'OOCL',
    carrierBn: 'ওওসিএল',
    status: 'pending',
    eta: '2025-03-28T07:00:00+06:00',
    items: 20,
    totalPallets: 40,
    trackingNumber: 'OOL-BD-2278',
    origin: 'international',
    portOfEntry: 'Chattogram Port',
  },
];

// ─── Mock Data — Outbound Shipments ─────────────────────────────────

export const MOCK_OUTBOUND: OutboundShipment[] = [
  {
    id: 'ob-001',
    orderNumber: 'SO-2025-1101',
    customerName: 'Rahim Auto Parts',
    warehouseCode: 'WH-DHK-01',
    courier: 'Pathao Courier',
    courierBn: 'পাঠাও কুরিয়ার',
    status: 'dispatched',
    eta: '2025-03-11T18:00:00+06:00',
    items: 5,
    totalWeight: 120,
    trackingNumber: 'PTH-D-45210',
    destinationCity: 'Dhaka',
    destinationCityBn: 'ঢাকা',
  },
  {
    id: 'ob-002',
    orderNumber: 'SO-2025-1102',
    customerName: 'Karim Motor',
    warehouseCode: 'WH-CGP-01',
    courier: 'Sundarban Courier',
    courierBn: 'সুন্দরবন কুরিয়ার',
    status: 'in-transit',
    eta: '2025-03-13T12:00:00+06:00',
    items: 8,
    totalWeight: 245,
    trackingNumber: 'SUN-C-78432',
    destinationCity: 'Chattogram',
    destinationCityBn: 'চট্টগ্রাম',
  },
  {
    id: 'ob-003',
    orderNumber: 'SO-2025-1103',
    customerName: 'Jamuna Auto',
    warehouseCode: 'WH-DHK-01',
    courier: 'SA Paribahan',
    courierBn: 'এসএ পরিবহন',
    status: 'out-for-delivery',
    eta: '2025-03-10T14:00:00+06:00',
    items: 3,
    totalWeight: 78,
    trackingNumber: 'SA-R-33109',
    destinationCity: 'Rajshahi',
    destinationCityBn: 'রাজশাহী',
  },
  {
    id: 'ob-004',
    orderNumber: 'SO-2025-1104',
    customerName: 'Square Motors',
    warehouseCode: 'WH-DHK-01',
    courier: 'RedX',
    courierBn: 'রেডএক্স',
    status: 'pick-pack',
    eta: '2025-03-12T10:00:00+06:00',
    items: 7,
    totalWeight: 190,
    trackingNumber: 'RDX-S-90821',
    destinationCity: 'Sylhet',
    destinationCityBn: 'সিলেট',
  },
  {
    id: 'ob-005',
    orderNumber: 'SO-2025-1105',
    customerName: 'Bengal Auto',
    warehouseCode: 'WH-DHK-01',
    courier: 'eCourier',
    courierBn: 'ই-কুরিয়ার',
    status: 'ready',
    eta: '2025-03-11T08:00:00+06:00',
    items: 4,
    totalWeight: 95,
    trackingNumber: 'ECU-N-11204',
    destinationCity: 'Narayanganj',
    destinationCityBn: 'নারায়ণগঞ্জ',
  },
  {
    id: 'ob-006',
    orderNumber: 'SO-2025-1106',
    customerName: 'Navana Motors',
    warehouseCode: 'WH-DHK-01',
    courier: 'Pathao Courier',
    courierBn: 'পাঠাও কুরিয়ার',
    status: 'delivered',
    eta: '2025-03-08T11:00:00+06:00',
    items: 2,
    totalWeight: 45,
    trackingNumber: 'PTH-D-44987',
    destinationCity: 'Dhaka',
    destinationCityBn: 'ঢাকা',
  },
  {
    id: 'ob-007',
    orderNumber: 'SO-2025-1107',
    customerName: 'Aftab Motorcycle',
    warehouseCode: 'WH-SYL-01',
    courier: 'Sundarban Courier',
    courierBn: 'সুন্দরবন কুরিয়ার',
    status: 'dispatched',
    eta: '2025-03-14T09:00:00+06:00',
    items: 6,
    totalWeight: 160,
    trackingNumber: 'SUN-B-76554',
    destinationCity: 'Bogura',
    destinationCityBn: 'বগুড়া',
  },
  {
    id: 'ob-008',
    orderNumber: 'SO-2025-1108',
    customerName: 'Pran-RFL Auto',
    warehouseCode: 'WH-RAJ-01',
    courier: 'SA Paribahan',
    courierBn: 'এসএ পরিবহন',
    status: 'failed',
    eta: '2025-03-09T16:00:00+06:00',
    items: 5,
    totalWeight: 135,
    trackingNumber: 'SA-K-32877',
    destinationCity: 'Khulna',
    destinationCityBn: 'খুলনা',
  },
];

// ─── Mock Data — Pick & Pack Jobs ───────────────────────────────────

export const MOCK_PICK_PACK: PickPackJob[] = [
  {
    id: 'pk-001',
    orderId: 'SO-2025-1101',
    warehouseCode: 'WH-DHK-01',
    status: 'picking',
    assignedTo: 'Karim Uddin',
    itemCount: 4,
    priority: 'urgent',
    startedAt: '2025-03-10T08:30:00+06:00',
  },
  {
    id: 'pk-002',
    orderId: 'SO-2025-1104',
    warehouseCode: 'WH-DHK-01',
    status: 'pending',
    assignedTo: 'Rafiq Hossain',
    itemCount: 7,
    priority: 'high',
  },
  {
    id: 'pk-003',
    orderId: 'SO-2025-1105',
    warehouseCode: 'WH-DHK-01',
    status: 'packed',
    assignedTo: 'Sumaiya Akter',
    itemCount: 3,
    priority: 'normal',
    startedAt: '2025-03-10T09:00:00+06:00',
  },
  {
    id: 'pk-004',
    orderId: 'SO-2025-1107',
    warehouseCode: 'WH-SYL-01',
    status: 'qc-check',
    assignedTo: 'Tanvir Ahmed',
    itemCount: 5,
    priority: 'urgent',
    startedAt: '2025-03-10T07:45:00+06:00',
  },
  {
    id: 'pk-005',
    orderId: 'SO-2025-1106',
    warehouseCode: 'WH-DHK-01',
    status: 'ready',
    assignedTo: 'Mizanur Rahman',
    itemCount: 2,
    priority: 'high',
    startedAt: '2025-03-10T06:00:00+06:00',
    completedAt: '2025-03-10T07:20:00+06:00',
  },
  {
    id: 'pk-006',
    orderId: 'SO-2025-1102',
    warehouseCode: 'WH-CGP-01',
    status: 'pending',
    assignedTo: 'Jahangir Alam',
    itemCount: 6,
    priority: 'normal',
  },
];

// ─── Mock Data — Delivery Tracking ──────────────────────────────────

export const MOCK_DELIVERIES: DeliveryStatus[] = [
  {
    id: 'dlv-001',
    shipmentId: 'ob-001',
    courier: 'Pathao Courier',
    trackingNumber: 'PTH-D-45210',
    currentStatus: 'dispatched',
    currentLocation: 'Dhaka Hub, Tejgaon',
    currentLocationBn: 'ঢাকা হাব, তেজগাঁও',
    estimatedDelivery: '2025-03-11T18:00:00+06:00',
    updates: [
      {
        timestamp: '2025-03-10T09:00:00+06:00',
        location: 'WH-DHK-01, Dhaka Central Hub',
        status: 'Order packed',
        note: '4 items packed and labeled',
      },
      {
        timestamp: '2025-03-10T10:15:00+06:00',
        location: 'Dhaka Hub, Tejgaon',
        status: 'Dispatched',
        note: 'Picked up by Pathao rider',
      },
      {
        timestamp: '2025-03-10T14:30:00+06:00',
        location: 'Pathao Sort Center, Mohakhali',
        status: 'In sorting',
        note: 'Package sorted for Dhaka intra-city',
      },
    ],
  },
  {
    id: 'dlv-002',
    shipmentId: 'ob-002',
    courier: 'Sundarban Courier',
    trackingNumber: 'SUN-C-78432',
    currentStatus: 'in-transit',
    currentLocation: 'Sundarban Transit, Comilla',
    currentLocationBn: 'সুন্দরবন ট্রানজিট, কুমিল্লা',
    estimatedDelivery: '2025-03-13T12:00:00+06:00',
    updates: [
      {
        timestamp: '2025-03-09T08:00:00+06:00',
        location: 'WH-CGP-01, Chattogram Port Warehouse',
        status: 'Order packed',
      },
      {
        timestamp: '2025-03-09T11:00:00+06:00',
        location: 'Chattogram Depot, Agrabad',
        status: 'Dispatched',
        note: 'Loaded onto Sundarban truck CG-DH-4521',
      },
      {
        timestamp: '2025-03-10T06:00:00+06:00',
        location: 'Sundarban Transit, Comilla',
        status: 'In transit',
        note: 'Package in transit via Dhaka-Chattogram highway',
      },
    ],
  },
  {
    id: 'dlv-003',
    shipmentId: 'ob-003',
    courier: 'SA Paribahan',
    trackingNumber: 'SA-R-33109',
    currentStatus: 'out-for-delivery',
    currentLocation: 'Rajshahi City, Boalia',
    currentLocationBn: 'রাজশাহী শহর, বোয়ালিয়া',
    estimatedDelivery: '2025-03-10T14:00:00+06:00',
    updates: [
      {
        timestamp: '2025-03-08T07:00:00+06:00',
        location: 'WH-DHK-01, Dhaka Central Hub',
        status: 'Order packed',
      },
      {
        timestamp: '2025-03-08T10:00:00+06:00',
        location: 'SA Paribahan, Gabtoli',
        status: 'Dispatched',
      },
      {
        timestamp: '2025-03-09T08:00:00+06:00',
        location: 'SA Transit Hub, Natore',
        status: 'In transit',
      },
      {
        timestamp: '2025-03-10T08:30:00+06:00',
        location: 'Rajshahi Depot, Sapura',
        status: 'Arrived at destination city',
      },
      {
        timestamp: '2025-03-10T10:00:00+06:00',
        location: 'Rajshahi City, Boalia',
        status: 'Out for delivery',
        note: 'With delivery rider — expected by 2:00 PM',
      },
    ],
  },
  {
    id: 'dlv-004',
    shipmentId: 'ob-008',
    courier: 'SA Paribahan',
    trackingNumber: 'SA-K-32877',
    currentStatus: 'failed',
    currentLocation: 'Khulna Depot, Sonadanga',
    currentLocationBn: 'খুলনা ডিপো, সোনাডাঙ্গা',
    estimatedDelivery: '2025-03-09T16:00:00+06:00',
    updates: [
      {
        timestamp: '2025-03-07T09:00:00+06:00',
        location: 'WH-RAJ-01, Rajshahi Regional',
        status: 'Order packed',
      },
      {
        timestamp: '2025-03-07T12:00:00+06:00',
        location: 'SA Paribahan, Rajshahi',
        status: 'Dispatched',
      },
      {
        timestamp: '2025-03-08T14:00:00+06:00',
        location: 'Khulna Depot, Sonadanga',
        status: 'Arrived at destination city',
      },
      {
        timestamp: '2025-03-09T10:00:00+06:00',
        location: 'Khulna City, Daulatpur',
        status: 'Delivery attempted',
        note: 'Customer not reachable — incorrect address',
      },
      {
        timestamp: '2025-03-09T16:00:00+06:00',
        location: 'Khulna Depot, Sonadanga',
        status: 'Failed',
        note: 'Address verification required — contact customer for correct address',
      },
    ],
  },
];

// ─── Helper Functions ───────────────────────────────────────────────

/**
 * Format a number as Bangladeshi Taka
 */
export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Get color class based on capacity utilization percentage
 * Green < 60%, Amber < 80%, Red >= 80%
 */
export function getCapacityColor(pct: number): string {
  if (pct >= 80) return 'text-red-600';
  if (pct >= 60) return 'text-amber-600';
  return 'text-emerald-600';
}

/**
 * Get background color class based on capacity utilization percentage
 */
export function getCapacityBgColor(pct: number): string {
  if (pct >= 80) return 'bg-red-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

/**
 * Get Tailwind classes for warehouse status badge
 */
export function getWarehouseStatusClasses(
  status: WarehouseStatus,
): { bg: string; text: string; border: string } {
  const config = WAREHOUSE_STATUS_CONFIG[status];
  return {
    bg: config.bg,
    text: config.color,
    border: config.border,
  };
}

/**
 * Get the step number for inbound status (for progress stepper)
 */
export function getInboundStatusStep(status: InboundStatus): number {
  return INBOUND_STATUS_CONFIG[status].step;
}

/**
 * Get the step number for outbound status (for progress stepper)
 */
export function getOutboundStatusStep(status: OutboundStatus): number {
  return OUTBOUND_STATUS_CONFIG[status].step;
}

/**
 * Calculate utilization percentage for a warehouse
 */
export function getWarehouseUtilization(wh: Warehouse): number {
  if (wh.capacity === 0) return 0;
  return Math.round((wh.usedCapacity / wh.capacity) * 100);
}

/**
 * Calculate utilization percentage for a zone
 */
export function getZoneUtilization(zone: WarehouseZone): number {
  if (zone.capacityPallets === 0) return 0;
  return Math.round((zone.usedPallets / zone.capacityPallets) * 100);
}

/**
 * Pick & Pack priority badge colors
 */
export const PICK_PACK_PRIORITY_CONFIG: Record<
  PickPackPriority,
  { label: string; labelBn: string; color: string; bg: string; border: string }
> = {
  urgent: {
    label: 'Urgent',
    labelBn: 'জরুরি',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  high: {
    label: 'High',
    labelBn: 'উচ্চ',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  normal: {
    label: 'Normal',
    labelBn: 'সাধারণ',
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
};

/**
 * Pick & Pack status config
 */
export const PICK_PACK_STATUS_CONFIG: Record<
  PickPackStatus,
  { label: string; labelBn: string; color: string; bg: string }
> = {
  pending: {
    label: 'Pending',
    labelBn: 'পেন্ডিং',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  picking: {
    label: 'Picking',
    labelBn: 'পিকিং',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  packed: {
    label: 'Packed',
    labelBn: 'প্যাকড',
    color: 'text-violet-600',
    bg: 'bg-violet-100',
  },
  ready: {
    label: 'Ready',
    labelBn: 'প্রস্তুত',
    color: 'text-teal-600',
    bg: 'bg-teal-100',
  },
  'qc-check': {
    label: 'QC Check',
    labelBn: 'কিউসি চেক',
    color: 'text-amber-600',
    bg: 'bg-amber-100',
  },
};
