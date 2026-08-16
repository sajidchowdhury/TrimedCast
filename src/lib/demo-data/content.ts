// ============================================
// TrimedCast - Demo Data Content
// Realistic BD motorcycle parts data for
// onboarding demo / trial exploration
// ============================================

// --- Motorcycle Models ---
export const DEMO_MOTORCYCLE_MODELS = [
  { brand: 'Bajaj',    model: 'Pulsar 150',    yearStart: 2012, yearEnd: 2025, ccRating: 150, segment: 'commuter' },
  { brand: 'Bajaj',    model: 'Pulsar NS 200', yearStart: 2018, yearEnd: 2025, ccRating: 200, segment: 'premium' },
  { brand: 'TVS',      model: 'Apache RTR 160',yearStart: 2015, yearEnd: 2025, ccRating: 160, segment: 'commuter' },
  { brand: 'Hero',     model: 'Splendor Plus', yearStart: 2010, yearEnd: 2025, ccRating: 100, segment: 'commuter' },
  { brand: 'Honda',    model: 'CB Shine',      yearStart: 2014, yearEnd: 2025, ccRating: 125, segment: 'commuter' },
  { brand: 'Yamaha',   model: 'FZ-S V3',       yearStart: 2019, yearEnd: 2025, ccRating: 150, segment: 'premium' },
  { brand: 'Runner',   model: 'Cheeta',        yearStart: 2016, yearEnd: 2025, ccRating: 100, segment: 'commuter' },
  { brand: 'Walton',   model: 'Fusion 125',    yearStart: 2017, yearEnd: 2025, ccRating: 125, segment: 'commuter' },
  { brand: 'Keeway',   model: 'Superlight 125',yearStart: 2018, yearEnd: 2025, ccRating: 125, segment: 'commuter' },
  { brand: 'Lifan',    model: 'Pony 100',      yearStart: 2019, yearEnd: 2025, ccRating: 100, segment: 'commuter' },
] as const;

// --- Suppliers ---
export const DEMO_SUPPLIERS = [
  { name: 'Shenzhen Auto Parts Co.',   code: 'SZ-001', country: 'China', leadTimeDays: 45, reliability: 0.92, isCnyAffected: true,  contactEmail: 'sales@szparts.cn',    contactPhone: '+86 755 8800 1234' },
  { name: 'Guangzhou Motorcycle Ltd.', code: 'GZ-002', country: 'China', leadTimeDays: 50, reliability: 0.88, isCnyAffected: true,  contactEmail: 'export@gzmoto.cn',    contactPhone: '+86 20 8765 4321' },
  { name: 'Chongqing Parts Factory',  code: 'CQ-003', country: 'China', leadTimeDays: 55, reliability: 0.85, isCnyAffected: true,  contactEmail: 'intl@cqparts.cn',     contactPhone: '+86 23 6543 2100' },
  { name: 'Indian Parts Ltd.',        code: 'IN-004', country: 'India', leadTimeDays: 30, reliability: 0.90, isCnyAffected: false, contactEmail: 'supply@indianparts.in', contactPhone: '+91 22 2876 5432' },
  { name: 'Dhaka Wholesale Market',   code: 'BD-005', country: 'Bangladesh', leadTimeDays: 7,  reliability: 0.95, isCnyAffected: false, contactEmail: 'info@dhakawholesale.bd', contactPhone: '+880 1712 345678' },
] as const;

// --- Products (keyed by category) ---
export const DEMO_PRODUCTS = [
  // Engine Parts
  { sku: 'BP-ENG-001', name: 'Piston Kit (Bajaj Pulsar 150)',  category: 'engine',    subcategory: 'piston',      unitCost: 850,  sellingPrice: 1200, unit: 'set',   minOrderQty: 10,  eoq: 100, maxStock: 500, isSeasonal: false },
  { sku: 'BP-ENG-002', name: 'Piston Ring Set (Pulsar 150)',    category: 'engine',    subcategory: 'piston_ring', unitCost: 320,  sellingPrice: 480,  unit: 'set',   minOrderQty: 20,  eoq: 200, maxStock: 800, isSeasonal: false },
  { sku: 'BP-ENG-003', name: 'Cylinder Head Gasket (Pulsar)',   category: 'engine',    subcategory: 'gasket',      unitCost: 180,  sellingPrice: 290,  unit: 'piece', minOrderQty: 15,  eoq: 150, maxStock: 600, isSeasonal: false },
  // Brake Parts
  { sku: 'BP-BRK-001', name: 'Brake Pad Set (Front)',           category: 'brake',     subcategory: 'pad',         unitCost: 220,  sellingPrice: 380,  unit: 'set',   minOrderQty: 20,  eoq: 200, maxStock: 700, isSeasonal: true, seasonalityType: 'winter_peak' },
  { sku: 'BP-BRK-002', name: 'Brake Shoe Set (Rear)',           category: 'brake',     subcategory: 'shoe',        unitCost: 195,  sellingPrice: 320,  unit: 'set',   minOrderQty: 20,  eoq: 200, maxStock: 600, isSeasonal: true, seasonalityType: 'winter_peak' },
  // Chain & Sprocket
  { sku: 'BP-CHN-001', name: 'Drive Chain 428H (120L)',         category: 'chain',     subcategory: 'chain',       unitCost: 580,  sellingPrice: 850,  unit: 'piece', minOrderQty: 10,  eoq: 80,  maxStock: 300, isSeasonal: true, seasonalityType: 'winter_peak' },
  { sku: 'BP-CHN-002', name: 'Front Sprocket 14T',              category: 'chain',     subcategory: 'sprocket',    unitCost: 120,  sellingPrice: 200,  unit: 'piece', minOrderQty: 30,  eoq: 250, maxStock: 800, isSeasonal: false },
  // Filters
  { sku: 'BP-FLT-001', name: 'Oil Filter (Universal)',          category: 'filter',    subcategory: 'oil',         unitCost: 65,   sellingPrice: 120,  unit: 'piece', minOrderQty: 50,  eoq: 500, maxStock: 2000, isSeasonal: false },
  { sku: 'BP-FLT-002', name: 'Air Filter (Bajaj Pulsar)',       category: 'filter',    subcategory: 'air',         unitCost: 95,   sellingPrice: 175,  unit: 'piece', minOrderQty: 30,  eoq: 300, maxStock: 1000, isSeasonal: false },
  // Electrical
  { sku: 'BP-ELC-001', name: 'CDI Unit (Bajaj Pulsar 150)',     category: 'electrical', subcategory: 'cdi',        unitCost: 450,  sellingPrice: 750,  unit: 'piece', minOrderQty: 5,   eoq: 50,  maxStock: 200, isSeasonal: false },
  { sku: 'BP-ELC-002', name: 'Regulator Rectifier (12V)',       category: 'electrical', subcategory: 'regulator',   unitCost: 280,  sellingPrice: 450,  unit: 'piece', minOrderQty: 10,  eoq: 80,  maxStock: 300, isSeasonal: false },
  // Body Parts
  { sku: 'BP-BDY-001', name: 'Side Panel Set (Pulsar 150)',     category: 'body',      subcategory: 'panel',       unitCost: 720,  sellingPrice: 1100, unit: 'set',   minOrderQty: 5,   eoq: 40,  maxStock: 150, isSeasonal: true, seasonalityType: 'eid_peak' },
  { sku: 'BP-BDY-002', name: 'Rear View Mirror Set',            category: 'body',      subcategory: 'mirror',      unitCost: 150,  sellingPrice: 260,  unit: 'set',   minOrderQty: 20,  eoq: 150, maxStock: 500, isSeasonal: false },
  // Suspension
  { sku: 'BP-SUS-001', name: 'Rear Shock Absorber (Gas)',       category: 'suspension', subcategory: 'shock',       unitCost: 650,  sellingPrice: 980,  unit: 'piece', minOrderQty: 5,   eoq: 50,  maxStock: 200, isSeasonal: true, seasonalityType: 'winter_peak' },
  // Other
  { sku: 'BP-OTH-001', name: 'Engine Oil 10W-40 (1L)',          category: 'other',     subcategory: 'oil_lube',    unitCost: 180,  sellingPrice: 280,  unit: 'bottle', minOrderQty: 24, eoq: 240, maxStock: 1000, isSeasonal: true, seasonalityType: 'eid_peak' },
] as const;

// --- Seasonality Types ---
export const DEMO_SEASONALITY_TYPES = [
  { name: 'winter_peak',  label: 'Winter Peak Demand',  labelBn: 'শীতকালীন চাহিদা বৃদ্ধি',  description: 'Oct–Feb demand spike for brake pads, chains, suspension parts', multiplier: 1.8, months: '[10,11,12,1,2]', color: '#10b981', isDefault: true },
  { name: 'monsoon_dip',  label: 'Monsoon Demand Dip',  labelBn: 'মৌসুমী চাহিদা হ্রাস',     description: 'Jun–Sep reduced riding, lower parts demand',                    multiplier: 0.5, months: '[6,7,8,9]',    color: '#f43f5e', isDefault: true },
  { name: 'eid_peak',     label: 'Eid Peak Demand',     labelBn: 'ঈদের চাহিদা বৃদ্ধি',       description: 'Ramadan/Eid shopping surge — body parts, accessories, oil',     multiplier: 1.6, months: '[3,4]',        color: '#f59e0b', isDefault: true },
  { name: 'cny_shutdown', label: 'CNY Supplier Shutdown',labelBn: 'চীনা নববর্ষ সাপ্লায়ার বন্ধ', description: 'Jan–Feb Chinese New Year — suppliers closed, no new orders',    multiplier: 0.3, months: '[1,2]',        color: '#ef4444', isDefault: true },
] as const;

// --- Promo Events ---
export const DEMO_PROMO_EVENTS = [
  { name: 'Eid ul-Fitr Sale 2025',        type: 'eid_discount',  startDate: '2025-03-25', endDate: '2025-04-10', discountPct: 15, expectedUplift: 1.5, affectedCategories: '["body","other"]' },
  { name: 'Winter Readiness Campaign',     type: 'seasonal_sale', startDate: '2025-10-01', endDate: '2025-11-30', discountPct: 10, expectedUplift: 1.3, affectedCategories: '["brake","chain","suspension"]' },
] as const;

// --- Sales History (12 months × popular SKUs) ---
// Realistic seasonal pattern: winter high, monsoon low
const SEASONAL_MULTIPLIER: Record<number, number> = {
  1: 1.4, 2: 1.3, 3: 1.5, 4: 1.4,  // Winter + Eid
  5: 1.0, 6: 0.6, 7: 0.5, 8: 0.5,  // Monsoon dip
  9: 0.7, 10: 1.2, 11: 1.8, 12: 1.6, // Pre-winter + Winter peak
};

// Base monthly sales for popular products
const BASE_SALES: Record<string, number> = {
  'BP-ENG-001': 45,  // Piston kit — steady
  'BP-BRK-001': 55,  // Brake pads — seasonal
  'BP-CHN-001': 30,  // Chain — seasonal
  'BP-FLT-001': 120, // Oil filter — high volume
  'BP-ELC-001': 15,  // CDI unit — low volume
  'BP-BDY-001': 20,  // Side panel — Eid boost
  'BP-FLT-002': 80,  // Air filter
  'BP-BRK-002': 50,  // Brake shoe
  'BP-OTH-001': 100, // Engine oil
  'BP-SUS-001': 18,  // Shock absorber
  'BP-ENG-002': 40,  // Piston ring
  'BP-CHN-002': 60,  // Front sprocket
};

const CHANNELS = ['retail', 'wholesale', 'online'] as const;
const REGIONS = ['dhaka', 'chittagong', 'sylhet', 'rajshahi'] as const;

export function generateDemoSalesHistory(): Array<{
  sku: string;
  date: string;
  quantity: number;
  revenue: number;
  channel: string;
  region: string;
  season: string;
}> {
  const records: Array<{
    sku: string; date: string; quantity: number;
    revenue: number; channel: string; region: string; season: string;
  }> = [];

  const skus = Object.keys(BASE_SALES);

  for (const sku of skus) {
    const baseQty = BASE_SALES[sku];
    const product = DEMO_PRODUCTS.find(p => p.sku === sku);
    const price = product?.sellingPrice ?? 100;

    for (let month = 1; month <= 12; month++) {
      // 2 sales records per month per product (mid-month and end-month)
      for (const dayOffset of [10, 22]) {
        const seasonalMult = SEASONAL_MULTIPLIER[month] ?? 1;
        // Add some randomness (deterministic-ish for consistency)
        const noise = 0.8 + ((sku.charCodeAt(3) * month + dayOffset) % 40) / 100;
        const qty = Math.round(baseQty * seasonalMult * noise * 0.5);
        const revenue = Math.round(qty * price);

        const date = `2024-${String(month).padStart(2, '0')}-${String(dayOffset).padStart(2, '0')}`;
        const channel = CHANNELS[(sku.charCodeAt(5) + month) % CHANNELS.length];
        const region = REGIONS[(sku.charCodeAt(7) + month) % REGIONS.length];

        let season: string;
        if (month >= 10 || month <= 2) season = 'winter';
        else if (month >= 6 && month <= 9) season = 'monsoon';
        else if (month >= 3 && month <= 4) season = 'pre_winter';
        else season = 'summer';

        records.push({ sku, date, quantity: qty, revenue, channel, region, season });
      }
    }
  }

  return records;
}

// --- Purchase History ---
export function generateDemoPurchaseHistory(): Array<{
  sku: string;
  date: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplierCode: string;
  leadTimeActual: number;
  season: string;
}> {
  const records: Array<{
    sku: string; date: string; quantity: number;
    unitCost: number; totalCost: number; supplierCode: string;
    leadTimeActual: number; season: string;
  }> = [];

  const purchaseSkus = ['BP-ENG-001', 'BP-BRK-001', 'BP-CHN-001', 'BP-FLT-001', 'BP-ELC-001'];
  const supplierCodes = ['SZ-001', 'GZ-002', 'CQ-003', 'IN-004'];

  for (const sku of purchaseSkus) {
    const product = DEMO_PRODUCTS.find(p => p.sku === sku);
    const cost = product?.unitCost ?? 100;

    for (let month = 1; month <= 12; month++) {
      // 1 purchase per month per product
      const day = 5 + ((sku.charCodeAt(3) * month) % 20);
      const date = `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const qty = Math.round(50 + ((sku.charCodeAt(5) + month * 7) % 100));
      const supplierCode = supplierCodes[(sku.charCodeAt(7) + month) % supplierCodes.length];
      const leadTimeActual = Math.round(30 + ((sku.charCodeAt(3) + month) % 30));

      let season: string;
      if (month >= 10 || month <= 2) season = 'winter';
      else if (month >= 6 && month <= 9) season = 'monsoon';
      else if (month >= 3 && month <= 4) season = 'pre_winter';
      else season = 'summer';

      records.push({
        sku, date, quantity: qty,
        unitCost: cost, totalCost: qty * cost,
        supplierCode, leadTimeActual, season,
      });
    }
  }

  return records;
}

// --- Step labels for the demo data loading progress UI ---
export const DEMO_LOADING_STEPS = [
  { key: 'seasonality', label: 'Seasonality Types',    labelBn: 'ঋতুভিত্তিক ধরন',    count: 4 },
  { key: 'models',      label: 'Motorcycle Models',    labelBn: 'মোটরসাইকেল মডেল',   count: 10 },
  { key: 'suppliers',   label: 'Suppliers',            labelBn: 'সাপ্লায়ার',         count: 5 },
  { key: 'products',    label: 'Products & Pricing',   labelBn: 'পণ্য ও মূল্য',       count: 15 },
  { key: 'inventory',   label: 'Inventory Levels',     labelBn: 'ইনভেন্টরি স্তর',     count: 15 },
  { key: 'sales',       label: 'Sales History (12mo)', labelBn: 'বিক্রয় ইতিহাস',    count: 240 },
  { key: 'purchases',   label: 'Purchase History',     labelBn: 'ক্রয় ইতিহাস',      count: 60 },
  { key: 'promos',      label: 'Promotional Events',   labelBn: 'প্রমোশনাল ইভেন্ট',   count: 2 },
  { key: 'forecast',    label: 'Forecast Settings',    labelBn: 'পূর্বাভাসন সেটিংস',  count: 1 },
] as const;
