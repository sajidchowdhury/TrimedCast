// ============================================
// TrimedCast — Admin Panel Types & Mock Data
// Session 24: Multi-Tenant Admin Panel
// ============================================

export interface AdminTenant {
  id: string;
  acId: string;
  name: string;
  slug: string;
  division: string;
  plan: string;
  status: string;
  isActive: boolean;
  userCount: number;
  productCount: number;
  mrr: number;
  trialEndsAt?: string | null;
  createdAt: string;
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  churnRate: number;
  avgRevenuePerTenant: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  cancelledTenants: number;
  tierDistribution: { starter: number; professional: number; enterprise: number };
  thisMonth: { paidInvoices: number; pendingInvoices: number; totalRevenueCents: number };
}

export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalProducts: number;
  forecastRunsThisMonth: number;
  aiQueriesThisMonth: number;
  avgMape: number | null;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  dbLatencyMs: number;
  queueDepth: number;
  lastChecked: string;
  services: { name: string; status: string; latencyMs: number }[];
}

export interface SecurityEventSummary {
  total: number;
  critical: number;
  resolved: number;
  unresolved: number;
  topTypes: { type: string; count: number }[];
}

// Plan configs
export const PLAN_CONFIG = {
  starter: { label: 'Starter', labelBn: 'স্টার্টার', color: 'slate', price: '৳2,000/mo' },
  professional: { label: 'Professional', labelBn: 'প্রফেশনাল', color: 'emerald', price: '৳8,000/mo' },
  enterprise: { label: 'Enterprise', labelBn: 'এন্টারপ্রাইজ', color: 'violet', price: '৳25,000/mo' },
} as const;

export const TENANT_STATUS_CONFIG = {
  trial: { label: 'Trial', labelBn: 'ট্রায়াল', color: 'sky' },
  active: { label: 'Active', labelBn: 'সক্রিয়', color: 'emerald' },
  past_due: { label: 'Past Due', labelBn: 'বকেয়া', color: 'amber' },
  suspended: { label: 'Suspended', labelBn: 'স্থগিত', color: 'red' },
  cancelled: { label: 'Cancelled', labelBn: 'বাতিল', color: 'slate' },
} as const;

export const BD_DIVISIONS = [
  'dhaka',
  'chittagong',
  'sylhet',
  'rajshahi',
  'khulna',
  'barishal',
  'rangpur',
  'mymensingh',
] as const;

// Mock tenants
export const MOCK_TENANTS: AdminTenant[] = [
  {
    id: 't-001',
    acId: 'TC-2025-DHK-0001',
    name: 'Rahim Auto Parts Ltd',
    slug: 'rahim-auto-parts',
    division: 'dhaka',
    plan: 'professional',
    status: 'active',
    isActive: true,
    userCount: 8,
    productCount: 234,
    mrr: 8000,
    trialEndsAt: null,
    createdAt: '2024-11-15T06:00:00Z',
  },
  {
    id: 't-002',
    acId: 'TC-2025-CTG-0002',
    name: 'Karim Motor Industries',
    slug: 'karim-motor-industries',
    division: 'chittagong',
    plan: 'enterprise',
    status: 'active',
    isActive: true,
    userCount: 12,
    productCount: 387,
    mrr: 25000,
    trialEndsAt: null,
    createdAt: '2024-09-20T06:00:00Z',
  },
  {
    id: 't-003',
    acId: 'TC-2025-SYL-0003',
    name: 'Jamuna Auto Agency',
    slug: 'jamuna-auto-agency',
    division: 'sylhet',
    plan: 'starter',
    status: 'active',
    isActive: true,
    userCount: 3,
    productCount: 89,
    mrr: 2000,
    trialEndsAt: null,
    createdAt: '2025-01-10T06:00:00Z',
  },
  {
    id: 't-004',
    acId: 'TC-2025-RAJ-0004',
    name: 'Square Motors BD',
    slug: 'square-motors-bd',
    division: 'rajshahi',
    plan: 'professional',
    status: 'active',
    isActive: true,
    userCount: 6,
    productCount: 156,
    mrr: 8000,
    trialEndsAt: null,
    createdAt: '2024-12-05T06:00:00Z',
  },
  {
    id: 't-005',
    acId: 'TC-2025-KHL-0005',
    name: 'Bengal Auto Parts',
    slug: 'bengal-auto-parts',
    division: 'khulna',
    plan: 'starter',
    status: 'trial',
    isActive: true,
    userCount: 2,
    productCount: 45,
    mrr: 0,
    trialEndsAt: '2025-09-05T06:00:00Z',
    createdAt: '2025-08-06T06:00:00Z',
  },
  {
    id: 't-006',
    acId: 'TC-2025-DHK-0006',
    name: 'Navana Motors',
    slug: 'navana-motors',
    division: 'dhaka',
    plan: 'enterprise',
    status: 'trial',
    isActive: true,
    userCount: 4,
    productCount: 112,
    mrr: 0,
    trialEndsAt: '2025-09-18T06:00:00Z',
    createdAt: '2025-08-19T06:00:00Z',
  },
  {
    id: 't-007',
    acId: 'TC-2025-BAR-0007',
    name: 'Aftab Motorcycle Co',
    slug: 'aftab-motorcycle-co',
    division: 'barishal',
    plan: 'professional',
    status: 'past_due',
    isActive: true,
    userCount: 5,
    productCount: 134,
    mrr: 8000,
    trialEndsAt: null,
    createdAt: '2025-02-28T06:00:00Z',
  },
  {
    id: 't-008',
    acId: 'TC-2025-RNP-0008',
    name: 'Pran-RFL Auto',
    slug: 'pran-rfl-auto',
    division: 'rangpur',
    plan: 'starter',
    status: 'suspended',
    isActive: false,
    userCount: 7,
    productCount: 90,
    mrr: 2000,
    trialEndsAt: null,
    createdAt: '2025-03-15T06:00:00Z',
  },
];

export const MOCK_REVENUE: RevenueMetrics = {
  mrr: 156000,
  arr: 1872000,
  churnRate: 3.2,
  avgRevenuePerTenant: 19500,
  activeTenants: 4,
  trialTenants: 2,
  suspendedTenants: 1,
  cancelledTenants: 0,
  tierDistribution: { starter: 3, professional: 3, enterprise: 2 },
  thisMonth: {
    paidInvoices: 24,
    pendingInvoices: 3,
    totalRevenueCents: 15600000,
  },
};

export const MOCK_METRICS: PlatformMetrics = {
  totalTenants: 8,
  activeTenants: 4,
  totalUsers: 47,
  totalProducts: 1247,
  forecastRunsThisMonth: 342,
  aiQueriesThisMonth: 89,
  avgMape: 12.3,
};

export const MOCK_HEALTH: SystemHealth = {
  status: 'healthy',
  uptime: 99.9,
  dbLatencyMs: 12,
  queueDepth: 3,
  lastChecked: new Date().toISOString(),
  services: [
    { name: 'Database', status: 'healthy', latencyMs: 12 },
    { name: 'Queue', status: 'healthy', latencyMs: 3 },
    { name: 'Cache', status: 'healthy', latencyMs: 2 },
    { name: 'API', status: 'healthy', latencyMs: 45 },
  ],
};

export const MOCK_SECURITY: SecurityEventSummary = {
  total: 23,
  critical: 2,
  resolved: 18,
  unresolved: 5,
  topTypes: [
    { type: 'rate_limit_exceeded', count: 8 },
    { type: 'suspicious_login', count: 5 },
    { type: 'permission_denied', count: 4 },
    { type: 'invalid_token', count: 3 },
    { type: 'brute_force', count: 2 },
  ],
};

// Helper: format BDT
export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-IN')}`;
}

// Helper: plan badge color classes
export function getPlanBadgeClasses(plan: string): string {
  switch (plan) {
    case 'starter':
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    case 'professional':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
    case 'enterprise':
      return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

// Helper: status badge color classes
export function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'trial':
      return 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800';
    case 'active':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
    case 'past_due':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
    case 'suspended':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
    case 'cancelled':
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

// Helper: division display name
export function getDivisionLabel(div: string): string {
  const map: Record<string, string> = {
    dhaka: 'Dhaka',
    chittagong: 'Chittagong',
    sylhet: 'Sylhet',
    rajshahi: 'Rajshahi',
    khulna: 'Khulna',
    barishal: 'Barishal',
    rangpur: 'Rangpur',
    mymensingh: 'Mymensingh',
  };
  return map[div] || div;
}
