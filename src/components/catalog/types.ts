// ============================================
// TrimedCast — Product Catalog & Inventory Intelligence
// Session 28: Product Catalog & Inventory Intelligence Dashboard
// ============================================

// ─── Core Enum Types ───────────────────────────────────────────

export type ABCClass = 'A' | 'B' | 'C';
export type XYZClass = 'X' | 'Y' | 'Z';
export type LifecycleStage = 'introduction' | 'growth' | 'maturity' | 'decline' | 'discontinued';
export type StockHealth = 'healthy' | 'low' | 'critical' | 'overstock' | 'dead';
export type DemandPattern = 'stable' | 'seasonal' | 'erratic' | 'intermittent';
export type Improvement = 'up' | 'down' | 'flat';
export type SuggestedAction = 'markdown' | 'donate' | 'return' | 'dispose';
export type Priority = 'high' | 'medium' | 'low';
export type RevenueTrend = 'up' | 'down' | 'flat' | 'stable';
export type LifecycleAction = 'promote' | 'maintain' | 'discount' | 'phase-out';

// ─── Product ───────────────────────────────────────────────────

export interface Product {
  id: string;
  sku: string;
  name: string;
  nameBn: string;
  category: string;
  categoryBn: string;
  subcategory: string;
  subcategoryBn: string;
  unitPrice: number;        // BDT selling price
  costPrice: number;        // BDT cost price
  stockQty: number;
  reorderPoint: number;
  maxStock: number;
  leadTimeDays: number;
  supplier: string;
  supplierBn: string;
  abcClass: ABCClass;
  xyzClass: XYZClass;
  lifecycleStage: LifecycleStage;
  stockHealth: StockHealth;
  daysOfSupply: number;
  turnoverRate: number;
  lastSoldDate: string;     // ISO date
  lastReceivedDate: string; // ISO date
  createdDate: string;      // ISO date
  totalSold12m: number;
  totalRevenue12m: number;
  margin: number;           // percentage
  avgMonthlyDemand: number;
  demandStdDev: number;
  cv: number;               // coefficient of variation
}

// ─── Category Summary ──────────────────────────────────────────

export interface CategorySummary {
  category: string;
  categoryBn: string;
  productCount: number;
  totalStock: number;
  totalRevenue12m: number;
  avgMargin: number;
  abcDistribution: { A: number; B: number; C: number };
  topProduct: string;
}

// ─── ABC Analysis ──────────────────────────────────────────────

export interface ABCAnalysis {
  class: ABCClass;
  productCount: number;
  revenuePct: number;
  revenueCumPct: number;
  description: string;
  descriptionBn: string;
  color: string;
}

// ─── Stock Aging ───────────────────────────────────────────────

export interface StockAgingBucket {
  bucket: string;
  bucketBn: string;
  productCount: number;
  stockValue: number;
  pctOfTotal: number;
}

// ─── Inventory Turnover ────────────────────────────────────────

export interface InventoryTurnover {
  category: string;
  categoryBn: string;
  turnoverRate: number;
  avgDaysToSell: number;
  stockValue: number;
  cogs12m: number;
  improvement: Improvement;
  improvementPct: number;
}

// ─── Dead Stock ────────────────────────────────────────────────

export interface DeadStockItem {
  product: Product;
  daysSinceLastSale: number;
  stockValue: number;
  suggestedAction: SuggestedAction;
  suggestedActionBn: string;
  priority: Priority;
}

// ─── Lifecycle Product ─────────────────────────────────────────

export interface LifecycleProduct {
  product: Product;
  stage: LifecycleStage;
  stageBn: string;
  monthsInStage: number;
  predictedNextStage: LifecycleStage | null;
  revenueTrend: RevenueTrend;
  action: LifecycleAction;
  actionBn: string;
}

// ─── Demand Variability ────────────────────────────────────────

export interface DemandVariability {
  product: Product;
  cv: number;
  demandPattern: DemandPattern;
  avgDemand: number;
  maxDemand: number;
  minDemand: number;
  zeroDemandMonths: number;
}

// ─── Style Helper Return Type ──────────────────────────────────

export interface StyleClasses {
  bg: string;
  text: string;
  border: string;
  color: string;
}

// ─── Constants ─────────────────────────────────────────────────

export const ABC_CONFIG: Record<ABCClass, { color: string; revenuePct: string; productPct: string; label: string; labelBn: string }> = {
  A: { color: 'emerald', revenuePct: '~80%', productPct: '~20%', label: 'High Value', labelBn: 'উচ্চ মূল্য' },
  B: { color: 'sky', revenuePct: '~15%', productPct: '~30%', label: 'Medium Value', labelBn: 'মাঝারি মূল্য' },
  C: { color: 'amber', revenuePct: '~5%', productPct: '~50%', label: 'Low Value', labelBn: 'নিম্ন মূল্য' },
};

export const XYZ_CONFIG: Record<XYZClass, { color: string; cvRange: string; label: string; labelBn: string }> = {
  X: { color: 'emerald', cvRange: 'CV < 0.5', label: 'Stable Demand', labelBn: 'স্থিত চাহিদা' },
  Y: { color: 'sky', cvRange: '0.5 ≤ CV < 1.0', label: 'Variable Demand', labelBn: 'পরিবর্তনশীল চাহিদা' },
  Z: { color: 'amber', cvRange: 'CV ≥ 1.0', label: 'Erratic Demand', labelBn: 'অনিয়মিত চাহিদা' },
};

export const LIFECECYCLE_CONFIG: Record<LifecycleStage, { color: string; labelBn: string; icon: string }> = {
  introduction: { color: 'blue', labelBn: 'প্রবেশ পর্যায়', icon: '🆕' },
  growth: { color: 'emerald', labelBn: 'বৃদ্ধি পর্যায়', icon: '📈' },
  maturity: { color: 'sky', labelBn: 'পরিণতি পর্যায়', icon: '⚖️' },
  decline: { color: 'amber', labelBn: 'পতন পর্যায়', icon: '📉' },
  discontinued: { color: 'red', labelBn: 'বন্ধ', icon: '🚫' },
};

export const STOCK_HEALTH_CONFIG: Record<StockHealth, { color: string; labelBn: string; icon: string }> = {
  healthy: { color: 'emerald', labelBn: 'স্বাস্থ্যকর', icon: '✅' },
  low: { color: 'amber', labelBn: 'কম', icon: '⚠️' },
  critical: { color: 'red', labelBn: 'সংকটাপন্ন', icon: '🔴' },
  overstock: { color: 'sky', labelBn: 'অতিরিক্ত মজুত', icon: '📦' },
  dead: { color: 'slate', labelBn: 'মৃত মজুত', icon: '💀' },
};

export const DEMAND_PATTERN_CONFIG: Record<DemandPattern, { color: string; labelBn: string }> = {
  stable: { color: 'emerald', labelBn: 'স্থিত' },
  seasonal: { color: 'sky', labelBn: 'মৌসুমী' },
  erratic: { color: 'amber', labelBn: 'অনিয়মিত' },
  intermittent: { color: 'red', labelBn: 'বিচ্ছিন্ন' },
};

export const BD_PRODUCT_CATEGORIES = [
  { id: 'engine', name: 'Engine Parts', nameBn: 'ইঞ্জিন পার্টস', prefix: 'ENG' },
  { id: 'brake', name: 'Brake System', nameBn: 'ব্রেক সিস্টেম', prefix: 'BRK' },
  { id: 'electrical', name: 'Electrical', nameBn: 'ইলেকট্রিক্যাল', prefix: 'ELC' },
  { id: 'body', name: 'Body & Frame', nameBn: 'বডি ও ফ্রেম', prefix: 'BDY' },
  { id: 'suspension', name: 'Suspension', nameBn: 'সাসপেনশন', prefix: 'SUS' },
  { id: 'transmission', name: 'Transmission', nameBn: 'ট্রান্সমিশন', prefix: 'TRN' },
  { id: 'filters', name: 'Filters & Fluids', nameBn: 'ফিল্টার ও তরল', prefix: 'FLT' },
  { id: 'accessories', name: 'Accessories', nameBn: 'এক্সেসরিজ', prefix: 'ACC' },
] as const;

// ─── Mock Products (30 products across 8 categories) ───────────

export const MOCK_PRODUCTS: Product[] = [
  // ── Engine Parts (5) ──
  {
    id: 'prod-001', sku: 'TC-ENG-001', name: 'Piston Kit 100cc', nameBn: 'পিস্টন কিট ১০০সিসি',
    category: 'Engine Parts', categoryBn: 'ইঞ্জিন পার্টস', subcategory: 'Piston & Ring', subcategoryBn: 'পিস্টন ও রিং',
    unitPrice: 1850, costPrice: 1200, stockQty: 120, reorderPoint: 30, maxStock: 200, leadTimeDays: 21,
    supplier: 'Jiangsu Jinhu', supplierBn: 'জিয়াংসু জিনহু',
    abcClass: 'A', xyzClass: 'X', lifecycleStage: 'maturity', stockHealth: 'healthy',
    daysOfSupply: 85, turnoverRate: 8.4, lastSoldDate: '2025-07-10', lastReceivedDate: '2025-06-28', createdDate: '2023-01-15',
    totalSold12m: 1440, totalRevenue12m: 2664000, margin: 35.1, avgMonthlyDemand: 120, demandStdDev: 18, cv: 0.15,
  },
  {
    id: 'prod-002', sku: 'TC-ENG-002', name: 'Cylinder Block 125cc', nameBn: 'সিলিন্ডার ব্লক ১২৫সিসি',
    category: 'Engine Parts', categoryBn: 'ইঞ্জিন পার্টস', subcategory: 'Cylinder', subcategoryBn: 'সিলিন্ডার',
    unitPrice: 8500, costPrice: 5800, stockQty: 18, reorderPoint: 10, maxStock: 40, leadTimeDays: 30,
    supplier: 'Chongqing Longtai', supplierBn: 'চংকিং লংতাই',
    abcClass: 'A', xyzClass: 'Y', lifecycleStage: 'maturity', stockHealth: 'low',
    daysOfSupply: 22, turnoverRate: 5.2, lastSoldDate: '2025-07-08', lastReceivedDate: '2025-05-20', createdDate: '2022-06-10',
    totalSold12m: 216, totalRevenue12m: 1836000, margin: 31.8, avgMonthlyDemand: 18, demandStdDev: 12, cv: 0.67,
  },
  {
    id: 'prod-003', sku: 'TC-ENG-003', name: 'Valve Set (Intake+Exhaust)', nameBn: 'ভালভ সেট (ইনটেক+এক্সহস্ট)',
    category: 'Engine Parts', categoryBn: 'ইঞ্জিন পার্টস', subcategory: 'Valvetrain', subcategoryBn: 'ভালভট্রেন',
    unitPrice: 2200, costPrice: 1450, stockQty: 85, reorderPoint: 25, maxStock: 150, leadTimeDays: 18,
    supplier: 'Jiangsu Jinhu', supplierBn: 'জিয়াংসু জিনহু',
    abcClass: 'B', xyzClass: 'X', lifecycleStage: 'maturity', stockHealth: 'healthy',
    daysOfSupply: 68, turnoverRate: 6.8, lastSoldDate: '2025-07-12', lastReceivedDate: '2025-06-15', createdDate: '2022-03-20',
    totalSold12m: 960, totalRevenue12m: 2112000, margin: 34.1, avgMonthlyDemand: 80, demandStdDev: 14, cv: 0.18,
  },
  {
    id: 'prod-004', sku: 'TC-ENG-004', name: 'Cam Chain Tensioner', nameBn: 'ক্যাম চেইন টেনশনার',
    category: 'Engine Parts', categoryBn: 'ইঞ্জিন পার্টস', subcategory: 'Valvetrain', subcategoryBn: 'ভালভট্রেন',
    unitPrice: 950, costPrice: 620, stockQty: 200, reorderPoint: 50, maxStock: 250, leadTimeDays: 14,
    supplier: 'Wuxi Fuwei', supplierBn: 'উক্সি ফুওয়েই',
    abcClass: 'C', xyzClass: 'Y', lifecycleStage: 'decline', stockHealth: 'overstock',
    daysOfSupply: 145, turnoverRate: 2.1, lastSoldDate: '2025-06-01', lastReceivedDate: '2025-04-10', createdDate: '2021-09-05',
    totalSold12m: 240, totalRevenue12m: 228000, margin: 34.7, avgMonthlyDemand: 20, demandStdDev: 16, cv: 0.8,
  },
  {
    id: 'prod-005', sku: 'TC-ENG-005', name: 'Oil Pump Assembly', nameBn: 'অয়েল পাম্প অ্যাসেম্বলি',
    category: 'Engine Parts', categoryBn: 'ইঞ্জিন পার্টস', subcategory: 'Lubrication', subcategoryBn: 'লুব্রিকেশন',
    unitPrice: 3200, costPrice: 2100, stockQty: 0, reorderPoint: 15, maxStock: 60, leadTimeDays: 25,
    supplier: 'Chongqing Longtai', supplierBn: 'চংকিং লংতাই',
    abcClass: 'B', xyzClass: 'Z', lifecycleStage: 'discontinued', stockHealth: 'dead',
    daysOfSupply: 0, turnoverRate: 0.3, lastSoldDate: '2024-11-15', lastReceivedDate: '2024-09-20', createdDate: '2021-02-10',
    totalSold12m: 12, totalRevenue12m: 38400, margin: 34.4, avgMonthlyDemand: 1, demandStdDev: 2.5, cv: 1.25,
  },

  // ── Brake System (4) ──
  {
    id: 'prod-006', sku: 'TC-BRK-001', name: 'Brake Pad Front', nameBn: 'ব্রেক প্যাড সামনে',
    category: 'Brake System', categoryBn: 'ব্রেক সিস্টেম', subcategory: 'Pads & Shoes', subcategoryBn: 'প্যাড ও শু',
    unitPrice: 450, costPrice: 280, stockQty: 350, reorderPoint: 80, maxStock: 500, leadTimeDays: 10,
    supplier: 'Hangzhou Safe', supplierBn: 'হাংজু সেফ',
    abcClass: 'A', xyzClass: 'X', lifecycleStage: 'maturity', stockHealth: 'healthy',
    daysOfSupply: 95, turnoverRate: 12.0, lastSoldDate: '2025-07-13', lastReceivedDate: '2025-07-01', createdDate: '2022-01-01',
    totalSold12m: 4200, totalRevenue12m: 1890000, margin: 37.8, avgMonthlyDemand: 350, demandStdDev: 35, cv: 0.1,
  },
  {
    id: 'prod-007', sku: 'TC-BRK-002', name: 'Brake Disc Rotor', nameBn: 'ব্রেক ডিস্ক রটর',
    category: 'Brake System', categoryBn: 'ব্রেক সিস্টেম', subcategory: 'Discs & Drums', subcategoryBn: 'ডিস্ক ও ড্রাম',
    unitPrice: 1800, costPrice: 1100, stockQty: 8, reorderPoint: 20, maxStock: 80, leadTimeDays: 22,
    supplier: 'Hangzhou Safe', supplierBn: 'হাংজু সেফ',
    abcClass: 'B', xyzClass: 'Y', lifecycleStage: 'growth', stockHealth: 'critical',
    daysOfSupply: 5, turnoverRate: 7.5, lastSoldDate: '2025-07-11', lastReceivedDate: '2025-06-10', createdDate: '2023-08-15',
    totalSold12m: 720, totalRevenue12m: 1296000, margin: 38.9, avgMonthlyDemand: 60, demandStdDev: 25, cv: 0.42,
  },
  {
    id: 'prod-008', sku: 'TC-BRK-003', name: 'Brake Caliper Assembly', nameBn: 'ব্রেক ক্যালিপার অ্যাসেম্বলি',
    category: 'Brake System', categoryBn: 'ব্রেক সিস্টেম', subcategory: 'Calipers', subcategoryBn: 'ক্যালিপার',
    unitPrice: 4500, costPrice: 3100, stockQty: 45, reorderPoint: 15, maxStock: 60, leadTimeDays: 28,
    supplier: 'Zhejiang Jinyi', supplierBn: 'জেজিয়াং জিনই',
    abcClass: 'B', xyzClass: 'X', lifecycleStage: 'maturity', stockHealth: 'healthy',
    daysOfSupply: 55, turnoverRate: 4.8, lastSoldDate: '2025-07-09', lastReceivedDate: '2025-05-25', createdDate: '2022-04-12',
    totalSold12m: 264, totalRevenue12m: 1188000, margin: 31.1, avgMonthlyDemand: 22, demandStdDev: 6, cv: 0.27,
  },
  {
    id: 'prod-009', sku: 'TC-BRK-004', name: 'Brake Lever Set', nameBn: 'ব্রেক লিভার সেট',
    category: 'Brake System', categoryBn: 'ব্রেক সিস্টেম', subcategory: 'Levers & Cables', subcategoryBn: 'লিভার ও কেবল',
    unitPrice: 680, costPrice: 420, stockQty: 150, reorderPoint: 40, maxStock: 200, leadTimeDays: 12,
    supplier: 'Wuxi Fuwei', supplierBn: 'উক্সি ফুওয়েই',
    abcClass: 'C', xyzClass: 'X', lifecycleStage: 'maturity', stockHealth: 'healthy',
    daysOfSupply: 110, turnoverRate: 3.6, lastSoldDate: '2025-07-07', lastReceivedDate: '2025-06-20', createdDate: '2022-07-01',
    totalSold12m: 480, totalRevenue12m: 326400, margin: 38.2, avgMonthlyDemand: 40, demandStdDev: 8, cv: 0.2,
  },

  // ── Electrical (4) ──
  {
    id: 'prod-010', sku: 'TC-ELC-001', name: 'LED Headlight 12V', nameBn: 'এলইডি হেডলাইট ১২ভি',
    category: 'Electrical', categoryBn: 'ইলেকট্রিক্যাল', subcategory: 'Lighting', subcategoryBn: 'লাইটিং',
    unitPrice: 2500, costPrice: 1600, stockQty: 65, reorderPoint: 20, maxStock: 100, leadTimeDays: 15,
    supplier: 'Shenzhen Bright', supplierBn: 'শেনজেন ব্রাইট',
    abcClass: 'A', xyzClass: 'Y', lifecycleStage: 'growth', stockHealth: 'healthy',
    daysOfSupply: 48, turnoverRate: 9.2, lastSoldDate: '2025-07-12', lastReceivedDate: '2025-06-18', createdDate: '2023-05-01',
    totalSold12m: 1200, totalRevenue12m: 3000000, margin: 36.0, avgMonthlyDemand: 100, demandStdDev: 45, cv: 0.45,
  },
  {
    id: 'prod-011', sku: 'TC-ELC-002', name: 'CDI Unit 100cc', nameBn: 'সিডিআই ইউনিট ১০০সিসি',
    category: 'Electrical', categoryBn: 'ইলেকট্রিক্যাল', subcategory: 'Ignition', subcategoryBn: 'ইগনিশন',
    unitPrice: 1200, costPrice: 750, stockQty: 95, reorderPoint: 30, maxStock: 150, leadTimeDays: 16,
    supplier: 'Shenzhen Bright', supplierBn: 'শেনজেন ব্রাইট',
    abcClass: 'B', xyzClass: 'X', lifecycleStage: 'maturity', stockHealth: 'healthy',
    daysOfSupply: 72, turnoverRate: 6.5, lastSoldDate: '2025-07-10', lastReceivedDate: '2025-06-05', createdDate: '2022-02-20',
    totalSold12m: 720, totalRevenue12m: 864000, margin: 37.5, avgMonthlyDemand: 60, demandStdDev: 10, cv: 0.17,
  },
  {
    id: 'prod-012', sku: 'TC-ELC-003', name: 'Regulator Rectifier', nameBn: 'রেগুলেটর রেক্টিফায়ার',
    category: 'Electrical', categoryBn: 'ইলেকট্রিক্যাল', subcategory: 'Charging', subcategoryBn: 'চার্জিং',
    unitPrice: 980, costPrice: 620, stockQty: 3, reorderPoint: 25, maxStock: 80, leadTimeDays: 18,
    supplier: 'Fujian Deli', supplierBn: 'ফুজিয়ান ডেলি',
    abcClass: 'C', xyzClass: 'Z', lifecycleStage: 'decline', stockHealth: 'critical',
    daysOfSupply: 2, turnoverRate: 1.8, lastSoldDate: '2025-06-25', lastReceivedDate: '2025-03-15', createdDate: '2021-06-10',
    totalSold12m: 120, totalRevenue12m: 117600, margin: 36.7, avgMonthlyDemand: 10, demandStdDev: 12, cv: 1.2,
  },
  {
    id: 'prod-013', sku: 'TC-ELC-004', name: 'Turn Signal Relay', nameBn: 'টার্ন সিগন্যাল রিলে',
    category: 'Electrical', categoryBn: 'ইলেকট্রিক্যাল', subcategory: 'Switches & Relays', subcategoryBn: 'সুইচ ও রিলে',
    unitPrice: 350, costPrice: 210, stockQty: 280, reorderPoint: 60, maxStock: 300, leadTimeDays: 10,
    supplier: 'Wuxi Fuwei', supplierBn: 'উক্সি ফুওয়েই',
    abcClass: 'C', xyzClass: 'Y', lifecycleStage: 'maturity', stockHealth: 'overstock',
    daysOfSupply: 200, turnoverRate: 1.5, lastSoldDate: '2025-05-20', lastReceivedDate: '2025-03-01', createdDate: '2021-11-05',
    totalSold12m: 180, totalRevenue12m: 63000, margin: 40.0, avgMonthlyDemand: 15, demandStdDev: 10, cv: 0.67,
  },

  // ── Body & Frame (4) ──
  {
    id: 'prod-014', sku: 'TC-BDY-001', name: 'Front Fender 100cc', nameBn: 'সামনের ফেন্ডার ১০০সিসি',
    category: 'Body & Frame', categoryBn: 'বডি ও ফ্রেম', subcategory: 'Fenders', subcategoryBn: 'ফেন্ডার',
    unitPrice: 1200, costPrice: 780, stockQty: 55, reorderPoint: 20, maxStock: 100, leadTimeDays: 20,
    supplier: 'Taizhou Hongda', supplierBn: 'তাইজু হংডা',
    abcClass: 'B', xyzClass: 'Y', lifecycleStage: 'maturity', stockHealth: 'healthy',
    daysOfSupply: 52, turnoverRate: 5.0, lastSoldDate: '2025-07-06', lastReceivedDate: '2025-05-30', createdDate: '2022-08-15',
    totalSold12m: 360, totalRevenue12m: 432000, margin: 35.0, avgMonthlyDemand: 30, demandStdDev: 18, cv: 0.6,
  },
  {
    id: 'prod-015', sku: 'TC-BDY-002', name: 'Rear View Mirror Set', nameBn: 'রিয়ার ভিউ মিরর সেট',
    category: 'Body & Frame', categoryBn: 'বডি ও ফ্রেম', subcategory: 'Mirrors', subcategoryBn: 'মিরর',
    unitPrice: 650, costPrice: 400, stockQty: 110, reorderPoint: 30, maxStock: 150, leadTimeDays: 12,
    supplier: 'Taizhou Hongda', supplierBn: 'তাইজু হংডা',
    abcClass: 'C', xyzClass: 'X', lifecycleStage: 'maturity', stockHealth: 'healthy',
    daysOfSupply: 78, turnoverRate: 4.2, lastSoldDate: '2025-07-11', lastReceivedDate: '2025-06-10', createdDate: '2022-05-20',
    totalSold12m: 540, totalRevenue12m: 351000, margin: 38.5, avgMonthlyDemand: 45, demandStdDev: 9, cv: 0.2,
  },
  {
    id: 'prod-016', sku: 'TC-BDY-003', name: 'Side Panel Set (L+R)', nameBn: 'সাইড প্যানেল সেট (বাম+ডান)',
    category: 'Body & Frame', categoryBn: 'বডি ও ফ্রেম', subcategory: 'Panels', subcategoryBn: 'প্যানেল',
    unitPrice: 3500, costPrice: 2200, stockQty: 250, reorderPoint: 30, maxStock: 100, leadTimeDays: 25,
    supplier: 'Taizhou Hongda', supplierBn: 'তাইজু হংডা',
    abcClass: 'C', xyzClass: 'Z', lifecycleStage: 'decline', stockHealth: 'overstock',
    daysOfSupply: 320, turnoverRate: 0.8, lastSoldDate: '2025-04-15', lastReceivedDate: '2025-01-20', createdDate: '2021-03-01',
    totalSold12m: 60, totalRevenue12m: 210000, margin: 37.1, avgMonthlyDemand: 5, demandStdDev: 6.5, cv: 1.3,
  },
  {
    id: 'prod-017', sku: 'TC-BDY-004', name: 'Fuel Tank 100cc', nameBn: 'ফুয়েল ট্যাংক ১০০সিসি',
    category: 'Body & Frame', categoryBn: 'বডি ও ফ্রেম', subcategory: 'Tanks', subcategoryBn: 'ট্যাংক',
    unitPrice: 6500, costPrice: 4200, stockQty: 12, reorderPoint: 8, maxStock: 30, leadTimeDays: 35,
    supplier: 'Chongqing Longtai', supplierBn: 'চংকিং লংতাই',
    abcClass: 'B', xyzClass: 'Y', lifecycleStage: 'growth', stockHealth: 'low',
    daysOfSupply: 18, turnoverRate: 6.2, lastSoldDate: '2025-07-09', lastReceivedDate: '2025-06-01', createdDate: '2023-10-01',
    totalSold12m: 240, totalRevenue12m: 1560000, margin: 35.4, avgMonthlyDemand: 20, demandStdDev: 12, cv: 0.6,
  },

  // ── Suspension (3) ──
  {
    id: 'prod-018', sku: 'TC-SUS-001', name: 'Front Shock Absorber', nameBn: 'সামনের শক অ্যাবসরবার',
    category: 'Suspension', categoryBn: 'সাসপেনশন', subcategory: 'Shock Absorbers', subcategoryBn: 'শক অ্যাবসরবার',
    unitPrice: 3800, costPrice: 2400, stockQty: 40, reorderPoint: 15, maxStock: 60, leadTimeDays: 20,
    supplier: 'Zhejiang Jinyi', supplierBn: 'জেজিয়াং জিনই',
    abcClass: 'A', xyzClass: 'Y', lifecycleStage: 'maturity', stockHealth: 'healthy',
    daysOfSupply: 45, turnoverRate: 7.0, lastSoldDate: '2025-07-10', lastReceivedDate: '2025-06-12', createdDate: '2022-03-15',
    totalSold12m: 600, totalRevenue12m: 2280000, margin: 36.8, avgMonthlyDemand: 50, demandStdDev: 22, cv: 0.44,
  },
  {
    id: 'prod-019', sku: 'TC-SUS-002', name: 'Rear Shock Absorber', nameBn: 'পেছনের শক অ্যাবসরবার',
    category: 'Suspension', categoryBn: 'সাসপেনশন', subcategory: 'Shock Absorbers', subcategoryBn: 'শক অ্যাবসরবার',
    unitPrice: 4200, costPrice: 2700, stockQty: 5, reorderPoint: 15, maxStock: 50, leadTimeDays: 22,
    supplier: 'Zhejiang Jinyi', supplierBn: 'জেজিয়াং জিনই',
    abcClass: 'A', xyzClass: 'X', lifecycleStage: 'maturity', stockHealth: 'critical',
    daysOfSupply: 3, turnoverRate: 10.5, lastSoldDate: '2025-07-12', lastReceivedDate: '2025-06-25', createdDate: '2022-03-15',
    totalSold12m: 840, totalRevenue12m: 3528000, margin: 35.7, avgMonthlyDemand: 70, demandStdDev: 12, cv: 0.17,
  },
  {
    id: 'prod-020', sku: 'TC-SUS-003', name: 'Fork Seal Kit', nameBn: 'ফর্ক সিল কিট',
    category: 'Suspension', categoryBn: 'সাসপেনশন', subcategory: 'Seals & Bushes', subcategoryBn: 'সিল ও বুশ',
    unitPrice: 500, costPrice: 300, stockQty: 180, reorderPoint: 40, maxStock: 200, leadTimeDays: 14,
    supplier: 'Wuxi Fuwei', supplierBn: 'উক্সি ফুওয়েই',
    abcClass: 'C', xyzClass: 'Y', lifecycleStage: 'maturity', stockHealth: 'overstock',
    daysOfSupply: 250, turnoverRate: 2.0, lastSoldDate: '2025-05-10', lastReceivedDate: '2025-02-15', createdDate: '2021-07-20',
    totalSold12m: 144, totalRevenue12m: 72000, margin: 40.0, avgMonthlyDemand: 12, demandStdDev: 9, cv: 0.75,
  },

  // ── Transmission (3) ──
  {
    id: 'prod-021', sku: 'TC-TRN-001', name: 'Chain Drive 428H', nameBn: 'চেইন ড্রাইভ ৪২৮এইচ',
    category: 'Transmission', categoryBn: 'ট্রান্সমিশন', subcategory: 'Chain & Sprocket', subcategoryBn: 'চেইন ও স্প্রোকেট',
    unitPrice: 1500, costPrice: 950, stockQty: 75, reorderPoint: 25, maxStock: 120, leadTimeDays: 15,
    supplier: 'Jiangsu Jinhu', supplierBn: 'জিয়াংসু জিনহু',
    abcClass: 'B', xyzClass: 'X', lifecycleStage: 'maturity', stockHealth: 'healthy',
    daysOfSupply: 60, turnoverRate: 7.8, lastSoldDate: '2025-07-11', lastReceivedDate: '2025-06-08', createdDate: '2022-01-10',
    totalSold12m: 960, totalRevenue12m: 1440000, margin: 36.7, avgMonthlyDemand: 80, demandStdDev: 14, cv: 0.18,
  },
  {
    id: 'prod-022', sku: 'TC-TRN-002', name: 'Clutch Plate Set', nameBn: 'ক্লাচ প্লেট সেট',
    category: 'Transmission', categoryBn: 'ট্রান্সমিশন', subcategory: 'Clutch', subcategoryBn: 'ক্লাচ',
    unitPrice: 1100, costPrice: 700, stockQty: 90, reorderPoint: 30, maxStock: 120, leadTimeDays: 16,
    supplier: 'Jiangsu Jinhu', supplierBn: 'জিয়াংসু জিনহু',
    abcClass: 'B', xyzClass: 'X', lifecycleStage: 'maturity', stockHealth: 'healthy',
    daysOfSupply: 70, turnoverRate: 6.0, lastSoldDate: '2025-07-08', lastReceivedDate: '2025-05-28', createdDate: '2022-04-05',
    totalSold12m: 540, totalRevenue12m: 594000, margin: 36.4, avgMonthlyDemand: 45, demandStdDev: 8, cv: 0.18,
  },
  {
    id: 'prod-023', sku: 'TC-TRN-003', name: 'Gear Shift Lever', nameBn: 'গিয়ার শিফট লিভার',
    category: 'Transmission', categoryBn: 'ট্রান্সমিশন', subcategory: 'Levers & Linkage', subcategoryBn: 'লিভার ও লিংকেজ',
    unitPrice: 750, costPrice: 460, stockQty: 0, reorderPoint: 20, maxStock: 80, leadTimeDays: 14,
    supplier: 'Wuxi Fuwei', supplierBn: 'উক্সি ফুওয়েই',
    abcClass: 'C', xyzClass: 'Z', lifecycleStage: 'decline', stockHealth: 'dead',
    daysOfSupply: 0, turnoverRate: 0.5, lastSoldDate: '2024-12-10', lastReceivedDate: '2024-08-05', createdDate: '2021-05-15',
    totalSold12m: 24, totalRevenue12m: 18000, margin: 38.7, avgMonthlyDemand: 2, demandStdDev: 3.2, cv: 1.5,
  },

  // ── Filters & Fluids (4) ──
  {
    id: 'prod-024', sku: 'TC-FLT-001', name: 'Oil Filter 100cc', nameBn: 'অয়েল ফিল্টার ১০০সিসি',
    category: 'Filters & Fluids', categoryBn: 'ফিল্টার ও তরল', subcategory: 'Oil Filter', subcategoryBn: 'অয়েল ফিল্টার',
    unitPrice: 280, costPrice: 160, stockQty: 500, reorderPoint: 100, maxStock: 600, leadTimeDays: 7,
    supplier: 'Fujian Deli', supplierBn: 'ফুজিয়ান ডেলি',
    abcClass: 'A', xyzClass: 'X', lifecycleStage: 'maturity', stockHealth: 'healthy',
    daysOfSupply: 110, turnoverRate: 11.0, lastSoldDate: '2025-07-13', lastReceivedDate: '2025-07-05', createdDate: '2022-01-01',
    totalSold12m: 6000, totalRevenue12m: 1680000, margin: 42.9, avgMonthlyDemand: 500, demandStdDev: 50, cv: 0.1,
  },
  {
    id: 'prod-025', sku: 'TC-FLT-002', name: 'Air Filter Element', nameBn: 'এয়ার ফিল্টার এলিমেন্ট',
    category: 'Filters & Fluids', categoryBn: 'ফিল্টার ও তরল', subcategory: 'Air Filter', subcategoryBn: 'এয়ার ফিল্টার',
    unitPrice: 350, costPrice: 200, stockQty: 420, reorderPoint: 80, maxStock: 500, leadTimeDays: 8,
    supplier: 'Fujian Deli', supplierBn: 'ফুজিয়ান ডেলি',
    abcClass: 'B', xyzClass: 'X', lifecycleStage: 'maturity', stockHealth: 'healthy',
    daysOfSupply: 92, turnoverRate: 9.5, lastSoldDate: '2025-07-12', lastReceivedDate: '2025-06-28', createdDate: '2022-01-01',
    totalSold12m: 3600, totalRevenue12m: 1260000, margin: 42.9, avgMonthlyDemand: 300, demandStdDev: 30, cv: 0.1,
  },
  {
    id: 'prod-026', sku: 'TC-FLT-003', name: 'Engine Oil 10W-40 1L', nameBn: 'ইঞ্জিন অয়েল 10W-40 ১লি',
    category: 'Filters & Fluids', categoryBn: 'ফিল্টার ও তরল', subcategory: 'Fluids', subcategoryBn: 'তরল',
    unitPrice: 520, costPrice: 340, stockQty: 300, reorderPoint: 60, maxStock: 400, leadTimeDays: 5,
    supplier: 'Fujian Deli', supplierBn: 'ফুজিয়ান ডেলি',
    abcClass: 'B', xyzClass: 'Y', lifecycleStage: 'growth', stockHealth: 'healthy',
    daysOfSupply: 88, turnoverRate: 8.0, lastSoldDate: '2025-07-13', lastReceivedDate: '2025-07-01', createdDate: '2023-03-10',
    totalSold12m: 2400, totalRevenue12m: 1248000, margin: 34.6, avgMonthlyDemand: 200, demandStdDev: 80, cv: 0.4,
  },
  {
    id: 'prod-027', sku: 'TC-FLT-004', name: 'Fuel Filter Inline', nameBn: 'ফুয়েল ফিল্টার ইনলাইন',
    category: 'Filters & Fluids', categoryBn: 'ফিল্টার ও তরল', subcategory: 'Fuel Filter', subcategoryBn: 'ফুয়েল ফিল্টার',
    unitPrice: 180, costPrice: 100, stockQty: 0, reorderPoint: 30, maxStock: 100, leadTimeDays: 10,
    supplier: 'Fujian Deli', supplierBn: 'ফুজিয়ান ডেলি',
    abcClass: 'C', xyzClass: 'Z', lifecycleStage: 'introduction', stockHealth: 'dead',
    daysOfSupply: 0, turnoverRate: 0.2, lastSoldDate: '2025-02-10', lastReceivedDate: '2024-11-15', createdDate: '2025-01-01',
    totalSold12m: 6, totalRevenue12m: 1080, margin: 44.4, avgMonthlyDemand: 0.5, demandStdDev: 1.0, cv: 1.4,
  },

  // ── Accessories (3) ──
  {
    id: 'prod-028', sku: 'TC-ACC-001', name: 'Mobile Phone Holder', nameBn: 'মোবাইল ফোন হোল্ডার',
    category: 'Accessories', categoryBn: 'এক্সেসরিজ', subcategory: 'Mounts', subcategoryBn: 'মাউন্ট',
    unitPrice: 500, costPrice: 280, stockQty: 160, reorderPoint: 40, maxStock: 200, leadTimeDays: 10,
    supplier: 'Shenzhen Bright', supplierBn: 'শেনজেন ব্রাইট',
    abcClass: 'C', xyzClass: 'Y', lifecycleStage: 'introduction', stockHealth: 'healthy',
    daysOfSupply: 120, turnoverRate: 3.0, lastSoldDate: '2025-07-05', lastReceivedDate: '2025-05-15', createdDate: '2025-01-20',
    totalSold12m: 360, totalRevenue12m: 180000, margin: 44.0, avgMonthlyDemand: 30, demandStdDev: 18, cv: 0.6,
  },
  {
    id: 'prod-029', sku: 'TC-ACC-002', name: 'LED Strip Light 12V', nameBn: 'এলইডি স্ট্রিপ লাইট ১২ভি',
    category: 'Accessories', categoryBn: 'এক্সেসরিজ', subcategory: 'Lighting', subcategoryBn: 'লাইটিং',
    unitPrice: 800, costPrice: 480, stockQty: 220, reorderPoint: 50, maxStock: 150, leadTimeDays: 12,
    supplier: 'Shenzhen Bright', supplierBn: 'শেনজেন ব্রাইট',
    abcClass: 'C', xyzClass: 'Z', lifecycleStage: 'introduction', stockHealth: 'overstock',
    daysOfSupply: 280, turnoverRate: 1.2, lastSoldDate: '2025-04-20', lastReceivedDate: '2025-01-10', createdDate: '2025-02-01',
    totalSold12m: 96, totalRevenue12m: 76800, margin: 40.0, avgMonthlyDemand: 8, demandStdDev: 10, cv: 1.25,
  },
  {
    id: 'prod-030', sku: 'TC-ACC-003', name: 'Seat Cover Premium', nameBn: 'সিট কভার প্রিমিয়াম',
    category: 'Accessories', categoryBn: 'এক্সেসরিজ', subcategory: 'Seats', subcategoryBn: 'সিট',
    unitPrice: 1500, costPrice: 900, stockQty: 35, reorderPoint: 15, maxStock: 60, leadTimeDays: 15,
    supplier: 'Taizhou Hongda', supplierBn: 'তাইজু হংডা',
    abcClass: 'C', xyzClass: 'Y', lifecycleStage: 'growth', stockHealth: 'low',
    daysOfSupply: 28, turnoverRate: 4.5, lastSoldDate: '2025-07-08', lastReceivedDate: '2025-05-20', createdDate: '2024-06-15',
    totalSold12m: 180, totalRevenue12m: 270000, margin: 40.0, avgMonthlyDemand: 15, demandStdDev: 10, cv: 0.67,
  },
];

// ─── Mock Category Summaries ───────────────────────────────────

export const MOCK_CATEGORY_SUMMARIES: CategorySummary[] = [
  {
    category: 'Engine Parts', categoryBn: 'ইঞ্জিন পার্টস',
    productCount: 5, totalStock: 423, totalRevenue12m: 6872400, avgMargin: 34.0,
    abcDistribution: { A: 2, B: 2, C: 1 }, topProduct: 'Piston Kit 100cc',
  },
  {
    category: 'Brake System', categoryBn: 'ব্রেক সিস্টেম',
    productCount: 4, totalStock: 553, totalRevenue12m: 4700400, avgMargin: 36.5,
    abcDistribution: { A: 1, B: 2, C: 1 }, topProduct: 'Brake Pad Front',
  },
  {
    category: 'Electrical', categoryBn: 'ইলেকট্রিক্যাল',
    productCount: 4, totalStock: 443, totalRevenue12m: 4044600, avgMargin: 37.6,
    abcDistribution: { A: 1, B: 1, C: 2 }, topProduct: 'LED Headlight 12V',
  },
  {
    category: 'Body & Frame', categoryBn: 'বডি ও ফ্রেম',
    productCount: 4, totalStock: 427, totalRevenue12m: 2553000, avgMargin: 36.5,
    abcDistribution: { A: 0, B: 2, C: 2 }, topProduct: 'Fuel Tank 100cc',
  },
  {
    category: 'Suspension', categoryBn: 'সাসপেনশন',
    productCount: 3, totalStock: 225, totalRevenue12m: 5872800, avgMargin: 37.5,
    abcDistribution: { A: 2, B: 0, C: 1 }, topProduct: 'Rear Shock Absorber',
  },
  {
    category: 'Transmission', categoryBn: 'ট্রান্সমিশন',
    productCount: 3, totalStock: 165, totalRevenue12m: 2052000, avgMargin: 37.3,
    abcDistribution: { A: 0, B: 2, C: 1 }, topProduct: 'Chain Drive 428H',
  },
  {
    category: 'Filters & Fluids', categoryBn: 'ফিল্টার ও তরল',
    productCount: 4, totalStock: 1220, totalRevenue12m: 4189080, avgMargin: 41.2,
    abcDistribution: { A: 1, B: 2, C: 1 }, topProduct: 'Oil Filter 100cc',
  },
  {
    category: 'Accessories', categoryBn: 'এক্সেসরিজ',
    productCount: 3, totalStock: 415, totalRevenue12m: 526800, avgMargin: 41.3,
    abcDistribution: { A: 0, B: 0, C: 3 }, topProduct: 'Seat Cover Premium',
  },
];

// ─── Mock ABC Analysis ─────────────────────────────────────────

export const MOCK_ABC_ANALYSIS: ABCAnalysis[] = [
  {
    class: 'A', productCount: 6, revenuePct: 80.2, revenueCumPct: 80.2,
    description: 'Top revenue contributors — critical for cash flow',
    descriptionBn: 'শীর্ষ রেভিনিউ অবদানকারী — ক্যাশ ফ্লোর জন্য গুরুত্বপূর্ণ',
    color: 'emerald',
  },
  {
    class: 'B', productCount: 10, revenuePct: 15.1, revenueCumPct: 95.3,
    description: 'Moderate revenue — steady sellers needing consistent supply',
    descriptionBn: 'মাঝারি রেভিনিউ — ধারাবাহিক সরবরাহ প্রয়োজন',
    color: 'sky',
  },
  {
    class: 'C', productCount: 14, revenuePct: 4.7, revenueCumPct: 100.0,
    description: 'Long tail — consider rationalization or made-to-order',
    descriptionBn: 'লং টেইল — যৌক্তিকীকরণ বা অর্ডার অনুযায়ী তৈরি বিবেচনা করুন',
    color: 'amber',
  },
];

// ─── Mock Stock Aging ──────────────────────────────────────────

export const MOCK_STOCK_AGING: StockAgingBucket[] = [
  { bucket: '0-30', bucketBn: '০-৩০ দিন', productCount: 12, stockValue: 4200000, pctOfTotal: 43.75 },
  { bucket: '31-60', bucketBn: '৩১-৬০ দিন', productCount: 8, stockValue: 2800000, pctOfTotal: 29.17 },
  { bucket: '61-90', bucketBn: '৬১-৯০ দিন', productCount: 5, stockValue: 1500000, pctOfTotal: 15.63 },
  { bucket: '91-180', bucketBn: '৯১-১৮০ দিন', productCount: 3, stockValue: 900000, pctOfTotal: 9.38 },
  { bucket: '180+', bucketBn: '১৮০+ দিন', productCount: 2, stockValue: 600000, pctOfTotal: 6.25 },
];

// ─── Mock Inventory Turnover ───────────────────────────────────

export const MOCK_TURNOVER: InventoryTurnover[] = [
  { category: 'Engine Parts', categoryBn: 'ইঞ্জিন পার্টস', turnoverRate: 5.2, avgDaysToSell: 70, stockValue: 4850000, cogs12m: 25220000, improvement: 'up', improvementPct: 8.3 },
  { category: 'Brake System', categoryBn: 'ব্রেক সিস্টেম', turnoverRate: 7.8, avgDaysToSell: 47, stockValue: 2100000, cogs12m: 16380000, improvement: 'up', improvementPct: 12.5 },
  { category: 'Electrical', categoryBn: 'ইলেকট্রিক্যাল', turnoverRate: 4.1, avgDaysToSell: 89, stockValue: 3200000, cogs12m: 13120000, improvement: 'flat', improvementPct: 0.5 },
  { category: 'Body & Frame', categoryBn: 'বডি ও ফ্রেম', turnoverRate: 3.5, avgDaysToSell: 104, stockValue: 3800000, cogs12m: 13300000, improvement: 'down', improvementPct: 5.2 },
  { category: 'Suspension', categoryBn: 'সাসপেনশন', turnoverRate: 6.5, avgDaysToSell: 56, stockValue: 2900000, cogs12m: 18850000, improvement: 'up', improvementPct: 15.0 },
  { category: 'Transmission', categoryBn: 'ট্রান্সমিশন', turnoverRate: 5.8, avgDaysToSell: 63, stockValue: 1800000, cogs12m: 10440000, improvement: 'up', improvementPct: 6.7 },
  { category: 'Filters & Fluids', categoryBn: 'ফিল্টার ও তরল', turnoverRate: 9.2, avgDaysToSell: 40, stockValue: 1200000, cogs12m: 11040000, improvement: 'up', improvementPct: 18.2 },
  { category: 'Accessories', categoryBn: 'এক্সেসরিজ', turnoverRate: 2.5, avgDaysToSell: 146, stockValue: 1500000, cogs12m: 3750000, improvement: 'down', improvementPct: 10.0 },
];

// ─── Mock Dead Stock ───────────────────────────────────────────

export const MOCK_DEAD_STOCK: DeadStockItem[] = [
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-005')!,
    daysSinceLastSale: 240, stockValue: 0,
    suggestedAction: 'dispose', suggestedActionBn: 'নিষ্পত্তি', priority: 'high',
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-023')!,
    daysSinceLastSale: 214, stockValue: 0,
    suggestedAction: 'return', suggestedActionBn: 'ফেরত', priority: 'high',
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-027')!,
    daysSinceLastSale: 183, stockValue: 0,
    suggestedAction: 'markdown', suggestedActionBn: 'মার্কডাউন', priority: 'medium',
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-016')!,
    daysSinceLastSale: 89, stockValue: 875000,
    suggestedAction: 'markdown', suggestedActionBn: 'মার্কডাউন', priority: 'medium',
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-004')!,
    daysSinceLastSale: 42, stockValue: 190000,
    suggestedAction: 'donate', suggestedActionBn: 'দান', priority: 'low',
  },
];

// ─── Mock Lifecycle Products ───────────────────────────────────

export const MOCK_LIFECYCLE_PRODUCTS: LifecycleProduct[] = [
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-028')!,
    stage: 'introduction', stageBn: 'প্রবেশ পর্যায়', monthsInStage: 6,
    predictedNextStage: 'growth', revenueTrend: 'up', action: 'promote', actionBn: 'প্রচার',
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-029')!,
    stage: 'introduction', stageBn: 'প্রবেশ পর্যায়', monthsInStage: 5,
    predictedNextStage: null, revenueTrend: 'flat', action: 'discount', actionBn: 'ডিসকাউন্ট',
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-027')!,
    stage: 'introduction', stageBn: 'প্রবেশ পর্যায়', monthsInStage: 6,
    predictedNextStage: null, revenueTrend: 'down', action: 'phase-out', actionBn: 'ফেজ-আউট',
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-010')!,
    stage: 'growth', stageBn: 'বৃদ্ধি পর্যায়', monthsInStage: 14,
    predictedNextStage: 'maturity', revenueTrend: 'up', action: 'promote', actionBn: 'প্রচার',
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-007')!,
    stage: 'growth', stageBn: 'বৃদ্ধি পর্যায়', monthsInStage: 10,
    predictedNextStage: 'maturity', revenueTrend: 'up', action: 'maintain', actionBn: 'রক্ষণাবেক্ষণ',
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-006')!,
    stage: 'maturity', stageBn: 'পরিণতি পর্যায়', monthsInStage: 30,
    predictedNextStage: 'decline', revenueTrend: 'stable', action: 'maintain', actionBn: 'রক্ষণাবেক্ষণ',
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-001')!,
    stage: 'maturity', stageBn: 'পরিণতি পর্যায়', monthsInStage: 30,
    predictedNextStage: 'decline', revenueTrend: 'stable', action: 'maintain', actionBn: 'রক্ষণাবেক্ষণ',
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-004')!,
    stage: 'decline', stageBn: 'পতন পর্যায়', monthsInStage: 8,
    predictedNextStage: 'discontinued', revenueTrend: 'down', action: 'discount', actionBn: 'ডিসকাউন্ট',
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-012')!,
    stage: 'decline', stageBn: 'পতন পর্যায়', monthsInStage: 10,
    predictedNextStage: 'discontinued', revenueTrend: 'down', action: 'phase-out', actionBn: 'ফেজ-আউট',
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-005')!,
    stage: 'discontinued', stageBn: 'বন্ধ', monthsInStage: 8,
    predictedNextStage: null, revenueTrend: 'down', action: 'phase-out', actionBn: 'ফেজ-আউট',
  },
];

// ─── Mock Demand Variability ───────────────────────────────────

export const MOCK_DEMAND_VARIABILITY: DemandVariability[] = [
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-006')!,
    cv: 0.1, demandPattern: 'stable', avgDemand: 350, maxDemand: 420, minDemand: 280, zeroDemandMonths: 0,
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-024')!,
    cv: 0.1, demandPattern: 'stable', avgDemand: 500, maxDemand: 600, minDemand: 400, zeroDemandMonths: 0,
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-010')!,
    cv: 0.45, demandPattern: 'seasonal', avgDemand: 100, maxDemand: 180, minDemand: 40, zeroDemandMonths: 0,
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-026')!,
    cv: 0.4, demandPattern: 'seasonal', avgDemand: 200, maxDemand: 350, minDemand: 80, zeroDemandMonths: 0,
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-012')!,
    cv: 1.2, demandPattern: 'erratic', avgDemand: 10, maxDemand: 40, minDemand: 0, zeroDemandMonths: 3,
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-016')!,
    cv: 1.3, demandPattern: 'erratic', avgDemand: 5, maxDemand: 25, minDemand: 0, zeroDemandMonths: 6,
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-005')!,
    cv: 1.25, demandPattern: 'intermittent', avgDemand: 1, maxDemand: 6, minDemand: 0, zeroDemandMonths: 8,
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-023')!,
    cv: 1.5, demandPattern: 'intermittent', avgDemand: 2, maxDemand: 10, minDemand: 0, zeroDemandMonths: 9,
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-018')!,
    cv: 0.44, demandPattern: 'seasonal', avgDemand: 50, maxDemand: 90, minDemand: 15, zeroDemandMonths: 0,
  },
  {
    product: MOCK_PRODUCTS.find(p => p.id === 'prod-021')!,
    cv: 0.18, demandPattern: 'stable', avgDemand: 80, maxDemand: 110, minDemand: 55, zeroDemandMonths: 0,
  },
];

// ─── Helper Functions ──────────────────────────────────────────

export function formatBDT(amount: number): string {
  return '৳' + amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function getABCClasses(cls: ABCClass): StyleClasses {
  const map: Record<ABCClass, StyleClasses> = {
    A: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', color: 'emerald' },
    B: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-700', color: 'sky' },
    C: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', color: 'amber' },
  };
  return map[cls];
}

export function getXYZClasses(cls: XYZClass): StyleClasses {
  const map: Record<XYZClass, StyleClasses> = {
    X: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', color: 'emerald' },
    Y: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-700', color: 'sky' },
    Z: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', color: 'amber' },
  };
  return map[cls];
}

export function getLifecycleClasses(stage: LifecycleStage): StyleClasses {
  const map: Record<LifecycleStage, StyleClasses> = {
    introduction: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', color: 'blue' },
    growth: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', color: 'emerald' },
    maturity: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-700', color: 'sky' },
    decline: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', color: 'amber' },
    discontinued: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700', color: 'red' },
  };
  return map[stage];
}

export function getStockHealthClasses(health: StockHealth): StyleClasses {
  const map: Record<StockHealth, StyleClasses> = {
    healthy: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', color: 'emerald' },
    low: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', color: 'amber' },
    critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700', color: 'red' },
    overstock: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-700', color: 'sky' },
    dead: { bg: 'bg-slate-100 dark:bg-slate-900/30', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700', color: 'slate' },
  };
  return map[health];
}

export function getDemandPatternClasses(pattern: DemandPattern): StyleClasses {
  const map: Record<DemandPattern, StyleClasses> = {
    stable: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', color: 'emerald' },
    seasonal: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-700', color: 'sky' },
    erratic: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', color: 'amber' },
    intermittent: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700', color: 'red' },
  };
  return map[pattern];
}

export function getDaysOfSupplyColor(days: number): string {
  if (days < 7) return 'text-red-600 dark:text-red-400';
  if (days < 30) return 'text-amber-600 dark:text-amber-400';
  if (days < 90) return 'text-sky-600 dark:text-sky-400';
  return 'text-emerald-600 dark:text-emerald-400';
}
