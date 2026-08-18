// ============================================
// TrimedCast — Central Dashboard Overview Types
// Session 20: Control Tower Dashboard
// ============================================

export interface DashboardKPIs {
  total_skus: number;
  total_stock_value_bdt: number;
  stockout_risk_count: number;
  overstock_count: number;
  pending_purchase_orders: number;
  pending_sales_orders: number;
  avg_mape: number | null;
  forecast_accuracy_pct: number | null;
}

export interface UrgentOrder {
  id: string;
  product_name: string;
  sku_code: string;
  recommended_qty: number;
  order_trigger_date: string;
  urgency: 'critical' | 'high' | 'normal' | 'low';
}

export interface RecentForecast {
  product_name: string;
  season?: string | null;
  predicted_qty: number;
  mape: number | null;
  created_at: string;
}

export interface SeasonalSummary {
  current_season: string;
  next_season: string;
  days_to_next_season: number;
}

export interface SopCycle {
  id: string;
  cycle_name: string;
  current_stage: string;
  status: string;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  urgent_orders: UrgentOrder[];
  recent_forecasts: RecentForecast[];
  seasonal_summary: SeasonalSummary;
  sop_cycle: SopCycle | null;
}

// BD Seasons
export const BD_SEASONS: Record<string, { label: string; labelBn: string; icon: string; months: string; color: string }> = {
  winter: { label: 'Winter', labelBn: 'শীত', icon: 'Snowflake', months: 'Nov-Feb', color: 'blue' },
  summer: { label: 'Summer', labelBn: 'গ্রীষ্ম', icon: 'Sun', months: 'Mar-May', color: 'amber' },
  monsoon: { label: 'Monsoon', labelBn: 'বর্ষা', icon: 'CloudRain', months: 'Jun-Sep', color: 'emerald' },
  pre_winter: { label: 'Pre-Winter', labelBn: 'হেমন্ত', icon: 'Leaf', months: 'Oct', color: 'orange' },
};

// Module quick links
export interface ModuleLink {
  id: string;
  label: string;
  labelBn: string;
  icon: string;
  description: string;
  color: string;
  session: number;
}

export const MODULE_LINKS: ModuleLink[] = [
  { id: 'products', label: 'Products & Suppliers', labelBn: 'পণ্য ও সরবরাহকারী', icon: 'Package', description: 'Manage inventory catalog', color: 'emerald', session: 18 },
  { id: 'orders', label: 'Purchase Orders', labelBn: 'ক্রয় আদেশ', icon: 'ShoppingCart', description: 'PO lifecycle management', color: 'violet', session: 19 },
  { id: 'seasonality', label: 'Seasonality Types', labelBn: 'মৌসুমীতা', icon: 'Sun', description: 'BD seasonal patterns', color: 'amber', session: 17 },
  { id: 'forecast', label: 'Demand Forecasting', labelBn: 'চাহিদা পূর্বাভাস', icon: 'TrendingUp', description: 'AI-powered predictions', color: 'sky', session: 8 },
  { id: 'users', label: 'User Management', labelBn: 'ব্যবহারকারী', icon: 'Users', description: 'Team & access control', color: 'rose', session: 15 },
  { id: 'rbac', label: 'RBAC & Security', labelBn: 'নিরাপত্তা', icon: 'Shield', description: 'Permissions & roles', color: 'slate', session: 16 },
  { id: 'subscriptions', label: 'Subscriptions', labelBn: 'সাবস্ক্রিপশন', icon: 'CreditCard', description: 'Plans & billing', color: 'indigo', session: 14 },
  { id: 'payments', label: 'BD Payments', labelBn: 'পেমেন্ট', icon: 'Wallet', description: 'bKash, Nagad, SSLCommerz', color: 'pink', session: 13 },
];

// Activity feed item
export interface ActivityItem {
  id: string;
  icon: string;
  description: string;
  time: string;
  module: string;
  moduleColor: string;
}

// Alert item
export interface AlertItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  dismissed: boolean;
}

// Helper: get current BD season based on month
export function getCurrentBDSeason(): { current: string; next: string; daysToNext: number } {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();

  let current = 'winter';
  let next = 'summer';
  let daysToNext = 0;

  if (month >= 2 && month <= 4) {
    // Mar-May: Summer
    current = 'summer';
    next = 'monsoon';
    // Days until June 1
    const junFirst = new Date(now.getFullYear(), 5, 1);
    daysToNext = Math.ceil((junFirst.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } else if (month >= 5 && month <= 8) {
    // Jun-Sep: Monsoon
    current = 'monsoon';
    next = 'pre_winter';
    // Days until Oct 1
    const octFirst = new Date(now.getFullYear(), 9, 1);
    daysToNext = Math.ceil((octFirst.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } else if (month === 9) {
    // Oct: Pre-Winter
    current = 'pre_winter';
    next = 'winter';
    // Days until Nov 1
    const novFirst = new Date(now.getFullYear(), 10, 1);
    daysToNext = Math.ceil((novFirst.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } else {
    // Nov-Feb: Winter
    current = 'winter';
    next = 'summer';
    // Days until Mar 1
    const marFirst = new Date(now.getFullYear() + (month >= 10 ? 1 : 0), 2, 1);
    daysToNext = Math.ceil((marFirst.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Ensure non-negative
  daysToNext = Math.max(0, daysToNext);

  return { current, next, daysToNext };
}

// Mock dashboard data
export const MOCK_DASHBOARD_DATA: DashboardData = {
  kpis: {
    total_skus: 247,
    total_stock_value_bdt: 18500000,
    stockout_risk_count: 8,
    overstock_count: 3,
    pending_purchase_orders: 5,
    pending_sales_orders: 12,
    avg_mape: 12.3,
    forecast_accuracy_pct: 87.7,
  },
  urgent_orders: [
    {
      id: 'ro-001',
      product_name: 'Honda Piston Ring Set',
      sku_code: 'EP-HON-001',
      recommended_qty: 200,
      order_trigger_date: '2026-08-20',
      urgency: 'critical',
    },
    {
      id: 'ro-002',
      product_name: 'Yamaha CDI Unit',
      sku_code: 'EL-YAM-003',
      recommended_qty: 150,
      order_trigger_date: '2026-08-22',
      urgency: 'critical',
    },
    {
      id: 'ro-003',
      product_name: 'Brake Pad Set (Front)',
      sku_code: 'BR-BPS-010',
      recommended_qty: 300,
      order_trigger_date: '2026-08-25',
      urgency: 'high',
    },
    {
      id: 'ro-004',
      product_name: 'Chain Sprocket Kit',
      sku_code: 'DR-CSR-005',
      recommended_qty: 100,
      order_trigger_date: '2026-08-28',
      urgency: 'high',
    },
    {
      id: 'ro-005',
      product_name: 'Engine Oil Filter',
      sku_code: 'FL-EOF-012',
      recommended_qty: 500,
      order_trigger_date: '2026-09-01',
      urgency: 'normal',
    },
  ],
  recent_forecasts: [
    {
      product_name: 'Brake Pad Set',
      season: 'monsoon',
      predicted_qty: 350,
      mape: 8.5,
      created_at: '2026-08-17T10:30:00Z',
    },
    {
      product_name: 'Honda Piston Ring Set',
      season: 'monsoon',
      predicted_qty: 420,
      mape: 11.2,
      created_at: '2026-08-17T09:15:00Z',
    },
    {
      product_name: 'Chain Sprocket Kit',
      season: 'monsoon',
      predicted_qty: 180,
      mape: 15.4,
      created_at: '2026-08-16T14:45:00Z',
    },
    {
      product_name: 'Yamaha CDI Unit',
      season: 'monsoon',
      predicted_qty: 95,
      mape: 9.8,
      created_at: '2026-08-16T11:00:00Z',
    },
    {
      product_name: 'Engine Oil Filter',
      season: null,
      predicted_qty: 720,
      mape: 6.7,
      created_at: '2026-08-15T16:20:00Z',
    },
  ],
  seasonal_summary: {
    current_season: 'monsoon',
    next_season: 'pre_winter',
    days_to_next_season: 45,
  },
  sop_cycle: {
    id: 'sop-aug-2026',
    cycle_name: 'S&OP Aug 2026',
    current_stage: 'demand_review',
    status: 'active',
  },
};

// Mock activity items
export const MOCK_ACTIVITY_ITEMS: ActivityItem[] = [
  { id: 'act-1', icon: 'ShoppingCart', description: 'PO-00005 submitted to Osaka Motorcycle Co.', time: '2 min ago', module: 'Orders', moduleColor: 'violet' },
  { id: 'act-2', icon: 'TrendingUp', description: 'Forecast generated for Brake Pad Set', time: '15 min ago', module: 'Forecast', moduleColor: 'sky' },
  { id: 'act-3', icon: 'UserPlus', description: 'New user Mahfuz added as analyst', time: '1 hour ago', module: 'Users', moduleColor: 'rose' },
  { id: 'act-4', icon: 'AlertTriangle', description: 'Stock alert: CDI Unit below safety stock', time: '2 hours ago', module: 'Inventory', moduleColor: 'amber' },
  { id: 'act-5', icon: 'CreditCard', description: 'Subscription renewed: Professional plan', time: '3 hours ago', module: 'Billing', moduleColor: 'indigo' },
  { id: 'act-6', icon: 'Sun', description: "Seasonality type 'Eid Peak' activated", time: '5 hours ago', module: 'Seasonality', moduleColor: 'amber' },
  { id: 'act-7', icon: 'Package', description: "Product 'Chain Sprocket Kit' imported", time: '6 hours ago', module: 'Products', moduleColor: 'emerald' },
  { id: 'act-8', icon: 'Wallet', description: 'bKash payment ৳45,000 received', time: '1 day ago', module: 'Payments', moduleColor: 'pink' },
];

// Mock alerts
export const MOCK_ALERTS: AlertItem[] = [
  { id: 'alert-1', severity: 'critical', message: '8 products below safety stock', timestamp: '5 min ago', dismissed: false },
  { id: 'alert-2', severity: 'warning', message: 'CNY factory shutdown in 45 days — 5 POs at risk', timestamp: '1 hour ago', dismissed: false },
  { id: 'alert-3', severity: 'info', message: 'S&OP cycle deadline in 3 days', timestamp: '2 hours ago', dismissed: false },
  { id: 'alert-4', severity: 'warning', message: '3 subscriptions expiring this week', timestamp: '4 hours ago', dismissed: false },
];

// SOP stage labels
export const SOP_STAGES: Record<string, string> = {
  data_gathering: 'Data Gathering',
  demand_review: 'Demand Review',
  supply_review: 'Supply Review',
  pre_sop: 'Pre-S&OP',
  exec_sop: 'Exec S&OP',
  consensus: 'Consensus',
};

export const SOP_STAGE_ORDER = ['data_gathering', 'demand_review', 'supply_review', 'pre_sop', 'exec_sop', 'consensus'];
