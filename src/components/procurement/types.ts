// ============================================
// TrimedCast — Supplier Scorecard & Procurement Dashboard
// Session 27: Types, Constants, Mock Data & Helpers
// ============================================

// ─── Enum-like Union Types ─────────────────────────────────────────────

export type SupplierTier = 'strategic' | 'preferred' | 'approved' | 'probationary';
export type SupplierRisk = 'low' | 'medium' | 'high' | 'critical';
export type SupplierStatus = 'active' | 'under-review' | 'suspended' | 'onboarding';
export type RFQStatus = 'draft' | 'sent' | 'responses-received' | 'evaluation' | 'awarded' | 'cancelled';
export type ScoreTrend = 'up' | 'down' | 'stable';
export type MitigationPriority = 'low' | 'medium' | 'high' | 'critical';
export type MitigationStatus = 'pending' | 'in-progress' | 'completed';
export type ProcurementTab = 'scorecard' | 'rfq' | 'cost-comparison' | 'risk' | 'po-summary';

// ─── Core Domain Types ────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  nameBn: string;
  country: string;
  countryCode: string;
  city: string;
  tier: SupplierTier;
  status: SupplierStatus;
  yearEstablished: number;
  productCategories: string[];
  contactName: string;
  contactEmail: string;
  phone: string;
  website: string;
  moq: number;
  leadTimeDays: number;
  paymentTermsDays: number;
  currency: string;
  rating: number; // 1-5
  totalOrders: number;
  onTimeDeliveryRate: number; // 0-100
  qualityScore: number; // 0-100
  costCompetitiveness: number; // 0-100
  responsivenessScore: number; // 0-100
  lastOrderDate: string; // ISO date
  annualSpend: number; // BDT
  riskLevel: SupplierRisk;
  riskFactors: string[];
  notes: string;
}

export interface ScorecardDimension {
  score: number;    // 0-100
  weight: number;   // 0-100 (%)
  trend: ScoreTrend;
}

export interface SupplierScorecard {
  supplierId: string;
  overallScore: number; // 0-100
  dimensions: {
    onTimeDelivery: ScorecardDimension;
    quality: ScorecardDimension;
    cost: ScorecardDimension;
    responsiveness: ScorecardDimension;
    flexibility: ScorecardDimension;
  };
  improvements: string[];
  strengths: string[];
}

export interface RFQItem {
  id: string;
  partName: string;
  partNameBn: string;
  specifications: string;
  quantity: number;
  unit: string;
}

export interface RFQResponseItem {
  itemId: string;
  unitPrice: number;
  leadTimeDays: number;
  moq: number;
  totalPrice: number;
}

export interface RFQResponse {
  id: string;
  supplierId: string;
  supplierName: string;
  submittedAt: string; // ISO date
  items: RFQResponseItem[];
  totalAmount: number;
  notes: string;
  isRecommended: boolean;
}

export interface RFQ {
  id: string;
  title: string;
  status: RFQStatus;
  createdAt: string;  // ISO date
  deadline: string;   // ISO date
  category: string;
  categoryBn: string;
  items: RFQItem[];
  responses: RFQResponse[];
  awardedSupplierId?: string;
  awardedAmount?: number;
}

export interface CostComparisonSupplier {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  leadTimeDays: number;
  moq: number;
  qualityScore: number;
  landedCost: number;
  recommended: boolean;
}

export interface CostComparison {
  partName: string;
  partNameBn: string;
  specifications: string;
  suppliers: CostComparisonSupplier[];
}

export interface RiskFactor {
  name: string;
  nameBn: string;
  severity: SupplierRisk;
  description: string;
}

export interface MitigationAction {
  action: string;
  actionBn: string;
  priority: MitigationPriority;
  status: MitigationStatus;
}

export interface SupplierRiskAssessment {
  supplierId: string;
  supplierName: string;
  overallRisk: SupplierRisk;
  factors: RiskFactor[];
  mitigationActions: MitigationAction[];
  lastAssessed: string; // ISO date
}

export interface PurchaseOrderBySupplier {
  supplierId: string;
  supplierName: string;
  openPOs: number;
  completedPOs: number;
  totalValue: number; // BDT
  avgLeadTime: number; // days
  onTimeRate: number;  // 0-100
  overduePOs: number;
}

// ─── Configuration Constants ──────────────────────────────────────────

export const TIER_CONFIG: Record<SupplierTier, { label: string; labelBn: string; color: string; bgColor: string; borderColor: string; icon: string }> = {
  strategic: {
    label: 'Strategic',
    labelBn: 'কৌশলগত',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    icon: 'crown',
  },
  preferred: {
    label: 'Preferred',
    labelBn: 'অগ্রাধিকারপ্রাপ্ত',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    icon: 'star',
  },
  approved: {
    label: 'Approved',
    labelBn: 'অনুমোদিত',
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
    icon: 'check-circle',
  },
  probationary: {
    label: 'Probationary',
    labelBn: 'পরীক্ষামূলক',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    icon: 'alert-triangle',
  },
};

export const RISK_LEVEL_CONFIG: Record<SupplierRisk, { label: string; labelBn: string; color: string; bgColor: string; borderColor: string }> = {
  low: {
    label: 'Low',
    labelBn: 'নিম্ন',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
  },
  medium: {
    label: 'Medium',
    labelBn: 'মধ্যম',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
  },
  high: {
    label: 'High',
    labelBn: 'উচ্চ',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
  },
  critical: {
    label: 'Critical',
    labelBn: 'সংকটাপন্ন',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
  },
};

export const SUPPLIER_STATUS_CONFIG: Record<SupplierStatus, { label: string; labelBn: string; color: string; bgColor: string; borderColor: string }> = {
  active: {
    label: 'Active',
    labelBn: 'সক্রিয়',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
  },
  'under-review': {
    label: 'Under Review',
    labelBn: 'পর্যালোচনাধীন',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
  },
  suspended: {
    label: 'Suspended',
    labelBn: 'স্থগিত',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
  },
  onboarding: {
    label: 'Onboarding',
    labelBn: 'অনবোর্ডিং',
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
  },
};

export const RFQ_STATUS_CONFIG: Record<RFQStatus, { label: string; labelBn: string; step: number; color: string; bgColor: string; borderColor: string }> = {
  draft: {
    label: 'Draft',
    labelBn: 'খসড়া',
    step: 1,
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
  },
  sent: {
    label: 'Sent',
    labelBn: 'প্রেরিত',
    step: 2,
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
  },
  'responses-received': {
    label: 'Responses Received',
    labelBn: 'প্রতিক্রিয়া প্রাপ্ত',
    step: 3,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
  },
  evaluation: {
    label: 'Evaluation',
    labelBn: 'মূল্যায়ন',
    step: 4,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
  },
  awarded: {
    label: 'Awarded',
    labelBn: 'প্রদানকৃত',
    step: 5,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
  },
  cancelled: {
    label: 'Cancelled',
    labelBn: 'বাতিল',
    step: 0,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
  },
};

export const SCORECARD_WEIGHTS: Record<string, number> = {
  onTimeDelivery: 30,
  quality: 25,
  cost: 25,
  responsiveness: 12,
  flexibility: 8,
};

export const COUNTRY_FLAGS: Record<string, string> = {
  CN: '\u{1F1E8}\u{1F1F3}', // 🇨🇳
  JP: '\u{1F1EF}\u{1F1F5}', // 🇯🇵
  IN: '\u{1F1EE}\u{1F1F3}', // 🇮🇳
  TH: '\u{1F1F9}\u{1F1ED}', // 🇹🇭
  BD: '\u{1F1E7}\u{1F1E9}', // 🇧🇩
  KR: '\u{1F1F0}\u{1F1F7}', // 🇰🇷
  TW: '\u{1F1F9}\u{1F1FC}', // 🇹🇼
};

// ─── Mock Data ────────────────────────────────────────────────────────

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 'SUP-001',
    name: 'Jiangsu Huanyu Motor Parts',
    nameBn: 'জিয়াংসু হুয়ানইউ',
    country: 'China',
    countryCode: 'CN',
    city: 'Nanjing',
    tier: 'strategic',
    status: 'active',
    yearEstablished: 2003,
    productCategories: ['Engine Parts', 'Pistons', 'Cylinder Blocks'],
    contactName: 'Wang Jianguo',
    contactEmail: 'wjg@huanyu-motor.cn',
    phone: '+86-25-8345-6789',
    website: 'www.huanyu-motor.cn',
    moq: 500,
    leadTimeDays: 35,
    paymentTermsDays: 60,
    currency: 'CNY',
    rating: 5,
    totalOrders: 248,
    onTimeDeliveryRate: 92,
    qualityScore: 88,
    costCompetitiveness: 85,
    responsivenessScore: 78,
    lastOrderDate: '2025-05-12',
    annualSpend: 18500000,
    riskLevel: 'medium',
    riskFactors: ['CNY currency exposure', 'Single source for engine parts'],
    notes: 'Primary engine parts supplier. Strong quality but CNY hedging needed.',
  },
  {
    id: 'SUP-002',
    name: 'Chongqing Jianshe Motorcycle',
    nameBn: 'চংকিং জিয়ানশে',
    country: 'China',
    countryCode: 'CN',
    city: 'Chongqing',
    tier: 'strategic',
    status: 'active',
    yearEstablished: 1998,
    productCategories: ['Frame Components', 'Suspension', 'Wheels'],
    contactName: 'Li Xiaoming',
    contactEmail: 'lxm@jianshe-moto.cn',
    phone: '+86-23-6789-0123',
    website: 'www.jianshe-moto.cn',
    moq: 300,
    leadTimeDays: 40,
    paymentTermsDays: 45,
    currency: 'CNY',
    rating: 4,
    totalOrders: 186,
    onTimeDeliveryRate: 88,
    qualityScore: 92,
    costCompetitiveness: 82,
    responsivenessScore: 82,
    lastOrderDate: '2025-04-28',
    annualSpend: 12300000,
    riskLevel: 'medium',
    riskFactors: ['CNY currency exposure', 'Long lead times'],
    notes: 'Reliable frame and suspension supplier. Quality is excellent.',
  },
  {
    id: 'SUP-003',
    name: 'Zhejiang Qianjiang Motorcycle',
    nameBn: 'ঝেজিয়াং ছিয়ানজিয়াং',
    country: 'China',
    countryCode: 'CN',
    city: 'Wenling',
    tier: 'preferred',
    status: 'active',
    yearEstablished: 2005,
    productCategories: ['Engine Parts', 'Transmission', 'Clutch'],
    contactName: 'Zhang Wei',
    contactEmail: 'zw@qianjiang-moto.cn',
    phone: '+86-576-8234-5678',
    website: 'www.qianjiang-moto.cn',
    moq: 400,
    leadTimeDays: 32,
    paymentTermsDays: 60,
    currency: 'CNY',
    rating: 4,
    totalOrders: 132,
    onTimeDeliveryRate: 85,
    qualityScore: 86,
    costCompetitiveness: 88,
    responsivenessScore: 75,
    lastOrderDate: '2025-05-05',
    annualSpend: 8700000,
    riskLevel: 'medium',
    riskFactors: ['CNY currency exposure'],
    notes: 'Good cost competitiveness for transmission components.',
  },
  {
    id: 'SUP-004',
    name: 'Guangzhou Wuyang Honda',
    nameBn: 'গুয়াংজু উয়াং হোন্ডা',
    country: 'China',
    countryCode: 'CN',
    city: 'Guangzhou',
    tier: 'preferred',
    status: 'active',
    yearEstablished: 1992,
    productCategories: ['Brake Systems', 'Electrical', 'Control Cables'],
    contactName: 'Chen Jie',
    contactEmail: 'cj@wuyang-honda.cn',
    phone: '+86-20-8765-4321',
    website: 'www.wuyang-honda.cn',
    moq: 200,
    leadTimeDays: 28,
    paymentTermsDays: 30,
    currency: 'CNY',
    rating: 5,
    totalOrders: 204,
    onTimeDeliveryRate: 95,
    qualityScore: 96,
    costCompetitiveness: 72,
    responsivenessScore: 90,
    lastOrderDate: '2025-05-18',
    annualSpend: 6200000,
    riskLevel: 'low',
    riskFactors: [],
    notes: 'Honda JV — premium quality but higher cost. Excellent reliability.',
  },
  {
    id: 'SUP-005',
    name: 'Shandong Weiteng Power',
    nameBn: 'শানডং ওয়েটেং',
    country: 'China',
    countryCode: 'CN',
    city: 'Jinan',
    tier: 'approved',
    status: 'under-review',
    yearEstablished: 2010,
    productCategories: ['Engine Parts', 'Alternators', 'Stator Coils'],
    contactName: 'Sun Haoran',
    contactEmail: 'sh@weiteng-power.cn',
    phone: '+86-531-8654-3210',
    website: 'www.weiteng-power.cn',
    moq: 600,
    leadTimeDays: 45,
    paymentTermsDays: 90,
    currency: 'CNY',
    rating: 3,
    totalOrders: 68,
    onTimeDeliveryRate: 78,
    qualityScore: 80,
    costCompetitiveness: 90,
    responsivenessScore: 65,
    lastOrderDate: '2025-03-20',
    annualSpend: 4100000,
    riskLevel: 'high',
    riskFactors: ['Poor on-time delivery', 'Quality issues', 'Financial concerns'],
    notes: 'Low cost but inconsistent delivery and quality. Under review.',
  },
  {
    id: 'SUP-006',
    name: 'Tianjin Motorcycle',
    nameBn: 'তিয়ানজিন মোটরসাইকেল',
    country: 'China',
    countryCode: 'CN',
    city: 'Tianjin',
    tier: 'approved',
    status: 'under-review',
    yearEstablished: 2001,
    productCategories: ['Exhaust Systems', 'Fuel Tanks', 'Fenders'],
    contactName: 'Liu Feng',
    contactEmail: 'lf@tianjin-moto.cn',
    phone: '+86-22-5432-1098',
    website: 'www.tianjin-moto.cn',
    moq: 350,
    leadTimeDays: 38,
    paymentTermsDays: 60,
    currency: 'CNY',
    rating: 3,
    totalOrders: 95,
    onTimeDeliveryRate: 75,
    qualityScore: 82,
    costCompetitiveness: 86,
    responsivenessScore: 70,
    lastOrderDate: '2025-04-10',
    annualSpend: 3500000,
    riskLevel: 'high',
    riskFactors: ['Declining performance', 'Communication gaps'],
    notes: 'Performance declining over past 2 quarters. Need to monitor closely.',
  },
  {
    id: 'SUP-007',
    name: 'Hero MotoCorp India',
    nameBn: 'হিরো মোটোকর্প',
    country: 'India',
    countryCode: 'IN',
    city: 'New Delhi',
    tier: 'preferred',
    status: 'active',
    yearEstablished: 1984,
    productCategories: ['Brake Systems', 'Wheels', 'Tyres'],
    contactName: 'Rajesh Sharma',
    contactEmail: 'rs@heromotocorp.in',
    phone: '+91-11-2345-6789',
    website: 'www.heromotocorp.in',
    moq: 250,
    leadTimeDays: 20,
    paymentTermsDays: 45,
    currency: 'INR',
    rating: 4,
    totalOrders: 156,
    onTimeDeliveryRate: 90,
    qualityScore: 91,
    costCompetitiveness: 78,
    responsivenessScore: 85,
    lastOrderDate: '2025-05-15',
    annualSpend: 5800000,
    riskLevel: 'low',
    riskFactors: [],
    notes: 'Reliable Indian supplier. Shorter lead times from India.',
  },
  {
    id: 'SUP-008',
    name: 'RFL Bangladesh',
    nameBn: 'আরএফএল বাংলাদেশ',
    country: 'Bangladesh',
    countryCode: 'BD',
    city: 'Narayanganj',
    tier: 'strategic',
    status: 'active',
    yearEstablished: 1980,
    productCategories: ['Brake Pads', 'Cables', 'Rubber Parts', 'Plastic Parts'],
    contactName: 'Kamal Hossain',
    contactEmail: 'kh@rfl.com.bd',
    phone: '+880-2-761-2345',
    website: 'www.rfl.com.bd',
    moq: 100,
    leadTimeDays: 7,
    paymentTermsDays: 30,
    currency: 'BDT',
    rating: 5,
    totalOrders: 312,
    onTimeDeliveryRate: 97,
    qualityScore: 94,
    costCompetitiveness: 80,
    responsivenessScore: 95,
    lastOrderDate: '2025-05-20',
    annualSpend: 7400000,
    riskLevel: 'low',
    riskFactors: [],
    notes: 'Domestic supplier — fastest delivery, no FX risk. Strategic partner.',
  },
  {
    id: 'SUP-009',
    name: 'TK Corporation Korea',
    nameBn: 'টিকে কর্পোরেশন',
    country: 'South Korea',
    countryCode: 'KR',
    city: 'Seoul',
    tier: 'approved',
    status: 'active',
    yearEstablished: 1996,
    productCategories: ['Electrical', 'Ignition Systems', 'Sensors'],
    contactName: 'Park Joon-ho',
    contactEmail: 'pj@tk-corp.kr',
    phone: '+82-2-3456-7890',
    website: 'www.tk-corp.kr',
    moq: 150,
    leadTimeDays: 25,
    paymentTermsDays: 30,
    currency: 'KRW',
    rating: 4,
    totalOrders: 89,
    onTimeDeliveryRate: 93,
    qualityScore: 95,
    costCompetitiveness: 70,
    responsivenessScore: 88,
    lastOrderDate: '2025-05-08',
    annualSpend: 2800000,
    riskLevel: 'low',
    riskFactors: [],
    notes: 'Premium electrical/ignition parts. High quality but premium pricing.',
  },
  {
    id: 'SUP-010',
    name: 'Siam Yamaha Thailand',
    nameBn: 'সিয়াম ইয়ামাহা',
    country: 'Thailand',
    countryCode: 'TH',
    city: 'Bangkok',
    tier: 'probationary',
    status: 'onboarding',
    yearEstablished: 2018,
    productCategories: ['Suspension', 'Forks', 'Shock Absorbers'],
    contactName: 'Somchai Prasert',
    contactEmail: 'sp@siam-yamaha.th',
    phone: '+66-2-567-8901',
    website: 'www.siam-yamaha.th',
    moq: 200,
    leadTimeDays: 30,
    paymentTermsDays: 45,
    currency: 'THB',
    rating: 3,
    totalOrders: 12,
    onTimeDeliveryRate: 70,
    qualityScore: 85,
    costCompetitiveness: 75,
    responsivenessScore: 60,
    lastOrderDate: '2025-02-15',
    annualSpend: 1200000,
    riskLevel: 'high',
    riskFactors: ['New supplier', 'Unproven track record'],
    notes: 'New supplier on probation. Yamaha OEM quality but limited history.',
  },
];

// ─── Mock Scorecards ──────────────────────────────────────────────────

export const MOCK_SCORECARDS: SupplierScorecard[] = [
  {
    supplierId: 'SUP-001',
    overallScore: 86,
    dimensions: {
      onTimeDelivery: { score: 92, weight: 30, trend: 'stable' },
      quality: { score: 88, weight: 25, trend: 'up' },
      cost: { score: 85, weight: 25, trend: 'stable' },
      responsiveness: { score: 78, weight: 12, trend: 'up' },
      flexibility: { score: 80, weight: 8, trend: 'stable' },
    },
    improvements: ['Improve responsiveness to RFQ queries (< 24h)', 'Reduce lead time for urgent orders'],
    strengths: ['Consistent on-time delivery above 90%', 'Strong quality control processes'],
  },
  {
    supplierId: 'SUP-002',
    overallScore: 87,
    dimensions: {
      onTimeDelivery: { score: 88, weight: 30, trend: 'down' },
      quality: { score: 92, weight: 25, trend: 'stable' },
      cost: { score: 82, weight: 25, trend: 'up' },
      responsiveness: { score: 82, weight: 12, trend: 'stable' },
      flexibility: { score: 85, weight: 8, trend: 'up' },
    },
    improvements: ['Address recent delivery delays (2 late shipments in Q1)', 'Improve packaging to reduce transit damage'],
    strengths: ['Highest quality score among frame suppliers', 'Good cost improvement trajectory'],
  },
  {
    supplierId: 'SUP-003',
    overallScore: 85,
    dimensions: {
      onTimeDelivery: { score: 85, weight: 30, trend: 'stable' },
      quality: { score: 86, weight: 25, trend: 'stable' },
      cost: { score: 88, weight: 25, trend: 'up' },
      responsiveness: { score: 75, weight: 12, trend: 'down' },
      flexibility: { score: 78, weight: 8, trend: 'stable' },
    },
    improvements: ['Improve communication response times', 'Stabilize on-time delivery rate'],
    strengths: ['Best cost competitiveness in transmission category', 'Consistent quality scores'],
  },
  {
    supplierId: 'SUP-004',
    overallScore: 90,
    dimensions: {
      onTimeDelivery: { score: 95, weight: 30, trend: 'up' },
      quality: { score: 96, weight: 25, trend: 'stable' },
      cost: { score: 72, weight: 25, trend: 'down' },
      responsiveness: { score: 90, weight: 12, trend: 'up' },
      flexibility: { score: 88, weight: 8, trend: 'stable' },
    },
    improvements: ['Negotiate better pricing for volume commitments', 'Explore cost reduction in logistics chain'],
    strengths: ['Industry-leading quality scores', 'Excellent on-time delivery and responsiveness'],
  },
  {
    supplierId: 'SUP-005',
    overallScore: 72,
    dimensions: {
      onTimeDelivery: { score: 78, weight: 30, trend: 'down' },
      quality: { score: 80, weight: 25, trend: 'down' },
      cost: { score: 90, weight: 25, trend: 'up' },
      responsiveness: { score: 65, weight: 12, trend: 'down' },
      flexibility: { score: 55, weight: 8, trend: 'down' },
    },
    improvements: ['Critical: improve on-time delivery rate', 'Address recurring quality defects in alternator batches', 'Improve responsiveness — average 5-day reply time'],
    strengths: ['Lowest unit cost in engine parts category'],
  },
  {
    supplierId: 'SUP-006',
    overallScore: 74,
    dimensions: {
      onTimeDelivery: { score: 75, weight: 30, trend: 'down' },
      quality: { score: 82, weight: 25, trend: 'down' },
      cost: { score: 86, weight: 25, trend: 'stable' },
      responsiveness: { score: 70, weight: 12, trend: 'down' },
      flexibility: { score: 60, weight: 8, trend: 'down' },
    },
    improvements: ['Reverse declining delivery performance trend', 'Improve communication — establish dedicated account manager', 'Submit quality improvement plan by Q3'],
    strengths: ['Good cost competitiveness for body parts'],
  },
  {
    supplierId: 'SUP-007',
    overallScore: 86,
    dimensions: {
      onTimeDelivery: { score: 90, weight: 30, trend: 'stable' },
      quality: { score: 91, weight: 25, trend: 'up' },
      cost: { score: 78, weight: 25, trend: 'stable' },
      responsiveness: { score: 85, weight: 12, trend: 'stable' },
      flexibility: { score: 82, weight: 8, trend: 'up' },
    },
    improvements: ['Explore cost reduction opportunities for high-volume items', 'Increase MOQ flexibility for trial orders'],
    strengths: ['Shortest lead time among international suppliers', 'Strong quality and on-time performance'],
  },
  {
    supplierId: 'SUP-008',
    overallScore: 92,
    dimensions: {
      onTimeDelivery: { score: 97, weight: 30, trend: 'up' },
      quality: { score: 94, weight: 25, trend: 'stable' },
      cost: { score: 80, weight: 25, trend: 'stable' },
      responsiveness: { score: 95, weight: 12, trend: 'up' },
      flexibility: { score: 90, weight: 8, trend: 'up' },
    },
    improvements: ['Expand product range to cover more categories', 'Invest in capacity for seasonal demand spikes'],
    strengths: ['Best on-time delivery rate (97%)', 'No currency risk — domestic BDT transactions', 'Fastest response times'],
  },
  {
    supplierId: 'SUP-009',
    overallScore: 84,
    dimensions: {
      onTimeDelivery: { score: 93, weight: 30, trend: 'stable' },
      quality: { score: 95, weight: 25, trend: 'stable' },
      cost: { score: 70, weight: 25, trend: 'down' },
      responsiveness: { score: 88, weight: 12, trend: 'stable' },
      flexibility: { score: 72, weight: 8, trend: 'stable' },
    },
    improvements: ['Cost reduction needed — 15% above market average', 'Increase flexibility for small batch orders'],
    strengths: ['Premium quality for electrical and ignition components', 'Very reliable delivery schedule'],
  },
  {
    supplierId: 'SUP-010',
    overallScore: 68,
    dimensions: {
      onTimeDelivery: { score: 70, weight: 30, trend: 'stable' },
      quality: { score: 85, weight: 25, trend: 'stable' },
      cost: { score: 75, weight: 25, trend: 'stable' },
      responsiveness: { score: 60, weight: 12, trend: 'down' },
      flexibility: { score: 50, weight: 8, trend: 'stable' },
    },
    improvements: ['Must establish consistent delivery track record', 'Improve communication and responsiveness significantly', 'Complete 6-month probationary review before tier upgrade'],
    strengths: ['Yamaha OEM quality standards for suspension parts'],
  },
];

// ─── Mock RFQs ────────────────────────────────────────────────────────

export const MOCK_RFQS: RFQ[] = [
  {
    id: 'RFQ-2025-001',
    title: 'Engine Parts Q2 2025',
    status: 'sent',
    createdAt: '2025-05-01',
    deadline: '2025-05-25',
    category: 'Engine Parts',
    categoryBn: 'ইঞ্জিন পার্টস',
    items: [
      { id: 'RI-001', partName: 'Piston Kit 250cc', partNameBn: 'পিস্টন কিট ২৫০সিসি', specifications: 'STD bore, 3-ring set, complete with pin & clips', quantity: 2000, unit: 'sets' },
      { id: 'RI-002', partName: 'Cylinder Block 250cc', partNameBn: 'সিলিন্ডার ব্লক ২৫০সিসি', specifications: 'Cast iron, STD bore 72mm, with studs', quantity: 1500, unit: 'pcs' },
      { id: 'RI-003', partName: 'Crankshaft Assembly', partNameBn: 'ক্র্যাংকশ্যাফট সমাবেশ', specifications: 'Forged steel, balanced, with bearings', quantity: 800, unit: 'pcs' },
    ],
    responses: [
      {
        id: 'RR-001',
        supplierId: 'SUP-001',
        supplierName: 'Jiangsu Huanyu Motor Parts',
        submittedAt: '2025-05-08',
        items: [
          { itemId: 'RI-001', unitPrice: 850, leadTimeDays: 30, moq: 500, totalPrice: 1700000 },
          { itemId: 'RI-002', unitPrice: 2200, leadTimeDays: 35, moq: 200, totalPrice: 3300000 },
          { itemId: 'RI-003', unitPrice: 4500, leadTimeDays: 40, moq: 100, totalPrice: 3600000 },
        ],
        totalAmount: 8600000,
        notes: 'Best overall value. Can offer 3% discount for early payment.',
        isRecommended: true,
      },
      {
        id: 'RR-002',
        supplierId: 'SUP-003',
        supplierName: 'Zhejiang Qianjiang Motorcycle',
        submittedAt: '2025-05-10',
        items: [
          { itemId: 'RI-001', unitPrice: 820, leadTimeDays: 28, moq: 400, totalPrice: 1640000 },
          { itemId: 'RI-002', unitPrice: 2100, leadTimeDays: 32, moq: 300, totalPrice: 3150000 },
          { itemId: 'RI-003', unitPrice: 4800, leadTimeDays: 38, moq: 150, totalPrice: 3840000 },
        ],
        totalAmount: 8630000,
        notes: 'Lower piston price but higher crankshaft cost. Shorter lead times.',
        isRecommended: false,
      },
      {
        id: 'RR-003',
        supplierId: 'SUP-005',
        supplierName: 'Shandong Weiteng Power',
        submittedAt: '2025-05-12',
        items: [
          { itemId: 'RI-001', unitPrice: 780, leadTimeDays: 45, moq: 600, totalPrice: 1560000 },
          { itemId: 'RI-002', unitPrice: 1950, leadTimeDays: 42, moq: 400, totalPrice: 2925000 },
          { itemId: 'RI-003', unitPrice: 4200, leadTimeDays: 50, moq: 200, totalPrice: 3360000 },
        ],
        totalAmount: 7845000,
        notes: 'Lowest price but longest lead times and higher MOQ.',
        isRecommended: false,
      },
    ],
  },
  {
    id: 'RFQ-2025-002',
    title: 'Brake System Components',
    status: 'evaluation',
    createdAt: '2025-04-20',
    deadline: '2025-05-15',
    category: 'Brake Systems',
    categoryBn: 'ব্রেক সিস্টেম',
    items: [
      { id: 'RI-004', partName: 'Brake Pad Set (Front)', partNameBn: 'ব্রেক প্যাড সেট (সামনে)', specifications: 'Semi-metallic, for disc brake 250cc', quantity: 5000, unit: 'sets' },
      { id: 'RI-005', partName: 'Brake Shoe Set (Rear)', partNameBn: 'ব্রেক শু সেট (পিছনে)', specifications: 'Asbestos-free, drum brake 250cc', quantity: 5000, unit: 'sets' },
    ],
    responses: [
      {
        id: 'RR-004',
        supplierId: 'SUP-004',
        supplierName: 'Guangzhou Wuyang Honda',
        submittedAt: '2025-05-05',
        items: [
          { itemId: 'RI-004', unitPrice: 320, leadTimeDays: 25, moq: 1000, totalPrice: 1600000 },
          { itemId: 'RI-005', unitPrice: 180, leadTimeDays: 25, moq: 1000, totalPrice: 900000 },
        ],
        totalAmount: 2500000,
        notes: 'Honda OEM quality. Premium pricing but excellent durability.',
        isRecommended: true,
      },
      {
        id: 'RR-005',
        supplierId: 'SUP-007',
        supplierName: 'Hero MotoCorp India',
        submittedAt: '2025-05-06',
        items: [
          { itemId: 'RI-004', unitPrice: 280, leadTimeDays: 18, moq: 500, totalPrice: 1400000 },
          { itemId: 'RI-005', unitPrice: 155, leadTimeDays: 18, moq: 500, totalPrice: 775000 },
        ],
        totalAmount: 2175000,
        notes: 'Good quality at competitive price. Shorter lead time from India.',
        isRecommended: false,
      },
      {
        id: 'RR-006',
        supplierId: 'SUP-008',
        supplierName: 'RFL Bangladesh',
        submittedAt: '2025-05-04',
        items: [
          { itemId: 'RI-004', unitPrice: 340, leadTimeDays: 5, moq: 200, totalPrice: 1700000 },
          { itemId: 'RI-005', unitPrice: 195, leadTimeDays: 5, moq: 200, totalPrice: 975000 },
        ],
        totalAmount: 2675000,
        notes: 'Domestic supply — fastest delivery. Slightly higher cost but no FX risk.',
        isRecommended: false,
      },
      {
        id: 'RR-007',
        supplierId: 'SUP-005',
        supplierName: 'Shandong Weiteng Power',
        submittedAt: '2025-05-10',
        items: [
          { itemId: 'RI-004', unitPrice: 250, leadTimeDays: 40, moq: 2000, totalPrice: 1250000 },
          { itemId: 'RI-005', unitPrice: 140, leadTimeDays: 40, moq: 2000, totalPrice: 700000 },
        ],
        totalAmount: 1950000,
        notes: 'Lowest price but longest lead time and highest MOQ.',
        isRecommended: false,
      },
    ],
  },
  {
    id: 'RFQ-2025-003',
    title: 'Electrical Components Batch',
    status: 'awarded',
    createdAt: '2025-04-10',
    deadline: '2025-04-30',
    category: 'Electrical',
    categoryBn: 'বৈদ্যুতিক',
    items: [
      { id: 'RI-006', partName: 'Alternator Assembly 250cc', partNameBn: 'অল্টারনেটর সমাবেশ ২৫০সিসি', specifications: '12V 150W, with regulator/rectifier', quantity: 3000, unit: 'pcs' },
      { id: 'RI-007', partName: 'CDI Unit', partNameBn: 'সিডিআই ইউনিট', specifications: 'DC-CDI, 12V, for 250cc single cylinder', quantity: 3000, unit: 'pcs' },
      { id: 'RI-008', partName: 'Ignition Coil', partNameBn: 'ইগনিশন কয়েল', specifications: '12V, high-output, with spark plug cap', quantity: 3000, unit: 'pcs' },
    ],
    responses: [
      {
        id: 'RR-008',
        supplierId: 'SUP-001',
        supplierName: 'Jiangsu Huanyu Motor Parts',
        submittedAt: '2025-04-22',
        items: [
          { itemId: 'RI-006', unitPrice: 1200, leadTimeDays: 35, moq: 500, totalPrice: 3600000 },
          { itemId: 'RI-007', unitPrice: 450, leadTimeDays: 30, moq: 500, totalPrice: 1350000 },
          { itemId: 'RI-008', unitPrice: 380, leadTimeDays: 30, moq: 500, totalPrice: 1140000 },
        ],
        totalAmount: 6090000,
        notes: 'Competitive pricing for full electrical kit.',
        isRecommended: true,
      },
      {
        id: 'RR-009',
        supplierId: 'SUP-009',
        supplierName: 'TK Corporation Korea',
        submittedAt: '2025-04-25',
        items: [
          { itemId: 'RI-006', unitPrice: 1500, leadTimeDays: 22, moq: 300, totalPrice: 4500000 },
          { itemId: 'RI-007', unitPrice: 580, leadTimeDays: 20, moq: 300, totalPrice: 1740000 },
          { itemId: 'RI-008', unitPrice: 480, leadTimeDays: 20, moq: 300, totalPrice: 1440000 },
        ],
        totalAmount: 7680000,
        notes: 'Premium quality but 26% higher cost. Shorter lead times.',
        isRecommended: false,
      },
    ],
    awardedSupplierId: 'SUP-001',
    awardedAmount: 6090000,
  },
  {
    id: 'RFQ-2025-004',
    title: 'Suspension Fork Assembly',
    status: 'draft',
    createdAt: '2025-05-20',
    deadline: '2025-06-10',
    category: 'Suspension',
    categoryBn: 'সাসপেনশন',
    items: [
      { id: 'RI-009', partName: 'Telescopic Fork Assembly', partNameBn: 'টেলিস্কোপিক ফোর্ক সমাবেশ', specifications: '37mm tube, 550mm length, with oil seal & dust seal', quantity: 1000, unit: 'sets' },
    ],
    responses: [],
  },
];

// ─── Mock Cost Comparisons ────────────────────────────────────────────

export const MOCK_COST_COMPARISONS: CostComparison[] = [
  {
    partName: 'Piston Kit 250cc',
    partNameBn: 'পিস্টন কিট ২৫০সিসি',
    specifications: 'STD bore, 3-ring set, complete with pin & clips',
    suppliers: [
      { supplierId: 'SUP-001', supplierName: 'Jiangsu Huanyu', unitPrice: 850, leadTimeDays: 30, moq: 500, qualityScore: 88, landedCost: 1020, recommended: true },
      { supplierId: 'SUP-003', supplierName: 'Zhejiang Qianjiang', unitPrice: 820, leadTimeDays: 28, moq: 400, qualityScore: 86, landedCost: 984, recommended: false },
      { supplierId: 'SUP-005', supplierName: 'Shandong Weiteng', unitPrice: 780, leadTimeDays: 45, moq: 600, qualityScore: 80, landedCost: 936, recommended: false },
    ],
  },
  {
    partName: 'Brake Pad Set (Front)',
    partNameBn: 'ব্রেক প্যাড সেট (সামনে)',
    specifications: 'Semi-metallic, for disc brake 250cc',
    suppliers: [
      { supplierId: 'SUP-004', supplierName: 'Guangzhou Wuyang Honda', unitPrice: 320, leadTimeDays: 25, moq: 1000, qualityScore: 96, landedCost: 384, recommended: true },
      { supplierId: 'SUP-007', supplierName: 'Hero MotoCorp India', unitPrice: 280, leadTimeDays: 18, moq: 500, qualityScore: 91, landedCost: 336, recommended: false },
      { supplierId: 'SUP-008', supplierName: 'RFL Bangladesh', unitPrice: 340, leadTimeDays: 5, moq: 200, qualityScore: 94, landedCost: 340, recommended: false },
      { supplierId: 'SUP-005', supplierName: 'Shandong Weiteng', unitPrice: 250, leadTimeDays: 40, moq: 2000, qualityScore: 80, landedCost: 300, recommended: false },
    ],
  },
  {
    partName: 'Alternator Assembly',
    partNameBn: 'অল্টারনেটর সমাবেশ',
    specifications: '12V 150W, with regulator/rectifier',
    suppliers: [
      { supplierId: 'SUP-001', supplierName: 'Jiangsu Huanyu', unitPrice: 1200, leadTimeDays: 35, moq: 500, qualityScore: 88, landedCost: 1440, recommended: true },
      { supplierId: 'SUP-005', supplierName: 'Shandong Weiteng', unitPrice: 1050, leadTimeDays: 45, moq: 600, qualityScore: 80, landedCost: 1260, recommended: false },
      { supplierId: 'SUP-009', supplierName: 'TK Corporation Korea', unitPrice: 1500, leadTimeDays: 22, moq: 300, qualityScore: 95, landedCost: 1800, recommended: false },
    ],
  },
  {
    partName: 'Suspension Fork',
    partNameBn: 'সাসপেনশন ফোর্ক',
    specifications: '37mm tube, 550mm length, with seals',
    suppliers: [
      { supplierId: 'SUP-010', supplierName: 'Siam Yamaha Thailand', unitPrice: 2800, leadTimeDays: 30, moq: 200, qualityScore: 85, landedCost: 3360, recommended: true },
      { supplierId: 'SUP-002', supplierName: 'Chongqing Jianshe', unitPrice: 2200, leadTimeDays: 40, moq: 300, qualityScore: 92, landedCost: 2640, recommended: false },
    ],
  },
];

// ─── Mock Risk Assessments ────────────────────────────────────────────

export const MOCK_RISK_ASSESSMENTS: SupplierRiskAssessment[] = [
  {
    supplierId: 'SUP-001',
    supplierName: 'Jiangsu Huanyu Motor Parts',
    overallRisk: 'medium',
    factors: [
      { name: 'CNY Currency Exposure', nameBn: 'সিএনওয়াই মুদ্রা ঝুঁকি', severity: 'medium', description: '90% of spend in CNY. BDT/CNY volatility 8-12% annually. Unhedged exposure ৳16.7M.' },
      { name: 'Single Source Risk', nameBn: 'একক উৎস ঝুঁকি', severity: 'high', description: 'Sole supplier for piston kits and cylinder blocks. No qualified alternative.' },
      { name: 'Geopolitical Risk', nameBn: 'ভূ-রাজনৈতিক ঝুঁকি', severity: 'low', description: 'China-Bangladesh trade relations stable. Low disruption probability.' },
    ],
    mitigationActions: [
      { action: 'Implement CNY forward contracts for 6-month horizon', actionBn: '৬ মাসের জন্য সিএনওয়াই ফরওয়ার্ড চুক্তি বাস্তবায়ন', priority: 'high', status: 'in-progress' },
      { action: 'Qualify secondary supplier for piston kits', actionBn: 'পিস্টন কিটের জন্য গৌণ সরবরাহকারী যোগ্যতা অর্জন', priority: 'critical', status: 'pending' },
      { action: 'Diversify payment currency (settle some in USD)', actionBn: 'পেমেন্ট মুদ্রা বৈচিত্র্যকরণ (কিছু ইউএসডিতে নিষ্পত্তি)', priority: 'medium', status: 'pending' },
    ],
    lastAssessed: '2025-05-15',
  },
  {
    supplierId: 'SUP-005',
    supplierName: 'Shandong Weiteng Power',
    overallRisk: 'high',
    factors: [
      { name: 'Poor On-Time Delivery', nameBn: 'দুর্বল সময়মত ডেলিভারি', severity: 'high', description: 'On-time rate dropped from 85% to 78% over 6 months. 5 late deliveries in Q1.' },
      { name: 'Quality Issues', nameBn: 'গুণমান সমস্যা', severity: 'high', description: '12% defect rate on alternator assemblies vs 3% target. 3 batch rejections in 2025.' },
      { name: 'Financial Concerns', nameBn: 'আর্থিক উদ্বেগ', severity: 'medium', description: 'Requested 90-day payment terms extension. Potential cash flow issues.' },
    ],
    mitigationActions: [
      { action: 'Place supplier on formal performance improvement plan', actionBn: 'সরবরাহকারীকে আনুষ্ঠানিক কর্মক্ষমতা উন্নয়ন পরিকল্পনায় রাখা', priority: 'critical', status: 'in-progress' },
      { action: 'Source alternators from TK Corporation as backup', actionBn: 'বিকল্প হিসেবে টিকে কর্পোরেশন থকে অল্টারনেটর সংগ্রহ', priority: 'high', status: 'in-progress' },
      { action: 'Request financial statements for review', actionBn: 'পর্যালোচনার জন্য আর্থিক বিবরণী অনুরোধ', priority: 'medium', status: 'pending' },
    ],
    lastAssessed: '2025-05-10',
  },
  {
    supplierId: 'SUP-010',
    supplierName: 'Siam Yamaha Thailand',
    overallRisk: 'high',
    factors: [
      { name: 'New Supplier Risk', nameBn: 'নতুন সরবরাহকারী ঝুঁকি', severity: 'high', description: 'Only 12 orders completed. No long-term track record. Probationary period incomplete.' },
      { name: 'Unproven Track Record', nameBn: 'অপরীক্ষিত ট্র্যাক রেকর্ড', severity: 'high', description: '70% on-time delivery. Responsiveness score 60 — below 75 threshold.' },
      { name: 'THB Currency Risk', nameBn: 'টিএইচবি মুদ্রা ঝুঁকি', severity: 'low', description: 'Low spend volume. THB relatively stable vs BDT.' },
    ],
    mitigationActions: [
      { action: 'Complete 6-month probationary review', actionBn: '৬ মাসের পরীক্ষামূলক পর্যালোচনা সম্পন্ন', priority: 'critical', status: 'in-progress' },
      { action: 'Limit order volume to max ৳2M until review complete', actionBn: 'পর্যালোচনা সম্পন্ন না হওয়া পর্যন্ত সর্বোচ্চ ২মি টাকা অর্ডার', priority: 'high', status: 'completed' },
      { action: 'Assign dedicated QA inspector for incoming goods', actionBn: 'আগত পণ্যের জন্য নিবেদিত কিউএ পরিদর্শক নিযুক্ত', priority: 'medium', status: 'pending' },
    ],
    lastAssessed: '2025-05-12',
  },
  {
    supplierId: 'SUP-006',
    supplierName: 'Tianjin Motorcycle',
    overallRisk: 'high',
    factors: [
      { name: 'Declining Performance', nameBn: 'হ্রাসমান কর্মক্ষমতা', severity: 'high', description: 'All KPIs trending down for 2 consecutive quarters. On-time from 85% → 75%.' },
      { name: 'Communication Gaps', nameBn: 'যোগাযোগ ফাঁক', severity: 'medium', description: 'Average response time 4 days vs 2-day SLA. Missing deadline confirmations.' },
      { name: 'Quality Regression', nameBn: 'গুণমান প্রত্যাবৃত্তি', severity: 'medium', description: 'Quality score dropped from 88 to 82. 2 warranty claims in Q1.' },
    ],
    mitigationActions: [
      { action: 'Issue formal warning with 90-day improvement deadline', actionBn: '৯০ দিনের উন্নয়ন সময়সীমা সহ আনুষ্ঠানিক সতর্কতা জারি', priority: 'critical', status: 'pending' },
      { action: 'Require weekly status calls with account manager', actionBn: 'অ্যাকাউন্ট ম্যানেজার সাথকে সাপ্তাহিক স্ট্যাটাস কল প্রয়োজন', priority: 'high', status: 'pending' },
      { action: 'Identify alternative supplier for exhaust systems', actionBn: 'এক্সহস্ট সিস্টেমের জন্য বিকল্প সরবরাহকারী চিহ্নিত', priority: 'medium', status: 'in-progress' },
    ],
    lastAssessed: '2025-05-08',
  },
];

// ─── Mock PO by Supplier ──────────────────────────────────────────────

export const MOCK_PO_BY_SUPPLIER: PurchaseOrderBySupplier[] = [
  { supplierId: 'SUP-001', supplierName: 'Jiangsu Huanyu Motor Parts', openPOs: 8, completedPOs: 240, totalValue: 18500000, avgLeadTime: 35, onTimeRate: 92, overduePOs: 1 },
  { supplierId: 'SUP-002', supplierName: 'Chongqing Jianshe Motorcycle', openPOs: 5, completedPOs: 181, totalValue: 12300000, avgLeadTime: 40, onTimeRate: 88, overduePOs: 2 },
  { supplierId: 'SUP-003', supplierName: 'Zhejiang Qianjiang Motorcycle', openPOs: 4, completedPOs: 128, totalValue: 8700000, avgLeadTime: 32, onTimeRate: 85, overduePOs: 1 },
  { supplierId: 'SUP-004', supplierName: 'Guangzhou Wuyang Honda', openPOs: 3, completedPOs: 201, totalValue: 6200000, avgLeadTime: 28, onTimeRate: 95, overduePOs: 0 },
  { supplierId: 'SUP-005', supplierName: 'Shandong Weiteng Power', openPOs: 3, completedPOs: 65, totalValue: 4100000, avgLeadTime: 45, onTimeRate: 78, overduePOs: 3 },
  { supplierId: 'SUP-006', supplierName: 'Tianjin Motorcycle', openPOs: 2, completedPOs: 93, totalValue: 3500000, avgLeadTime: 38, onTimeRate: 75, overduePOs: 2 },
  { supplierId: 'SUP-007', supplierName: 'Hero MotoCorp India', openPOs: 4, completedPOs: 152, totalValue: 5800000, avgLeadTime: 20, onTimeRate: 90, overduePOs: 0 },
  { supplierId: 'SUP-008', supplierName: 'RFL Bangladesh', openPOs: 6, completedPOs: 306, totalValue: 7400000, avgLeadTime: 7, onTimeRate: 97, overduePOs: 0 },
  { supplierId: 'SUP-009', supplierName: 'TK Corporation Korea', openPOs: 2, completedPOs: 87, totalValue: 2800000, avgLeadTime: 25, onTimeRate: 93, overduePOs: 0 },
  { supplierId: 'SUP-010', supplierName: 'Siam Yamaha Thailand', openPOs: 1, completedPOs: 11, totalValue: 1200000, avgLeadTime: 30, onTimeRate: 70, overduePOs: 1 },
];

// ─── Helper Functions ─────────────────────────────────────────────────

/**
 * Format a number as BDT (Bangladeshi Taka) currency string.
 */
export function formatBDT(amount: number): string {
  return '৳' + amount.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Get Tailwind CSS classes for supplier tier badges.
 */
export function getTierClasses(tier: SupplierTier): { bg: string; text: string; border: string } {
  const config = TIER_CONFIG[tier];
  return { bg: config.bgColor, text: config.color, border: config.borderColor };
}

/**
 * Get Tailwind CSS classes for risk level badges.
 */
export function getRiskClasses(risk: SupplierRisk): { bg: string; text: string; border: string } {
  const config = RISK_LEVEL_CONFIG[risk];
  return { bg: config.bgColor, text: config.color, border: config.borderColor };
}

/**
 * Get a Tailwind text color class based on a 0-100 score.
 * red < 40, amber < 60, sky < 80, emerald >= 80
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-sky-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-rose-600';
}

/**
 * Get a label for a 0-100 score: Poor / Fair / Good / Excellent.
 */
export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

/**
 * Compute a weighted overall score from scorecard dimensions.
 */
export function computeWeightedScore(dimensions: SupplierScorecard['dimensions']): number {
  const entries = Object.values(dimensions) as ScorecardDimension[];
  const totalWeight = entries.reduce((sum, d) => sum + d.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = entries.reduce((sum, d) => sum + d.score * d.weight, 0);
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}
