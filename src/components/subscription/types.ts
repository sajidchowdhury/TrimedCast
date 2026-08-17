// ============================================
// Subscription Management — Shared Types & Helpers
// ============================================

// --- BDT Pricing ---
export const TIER_PRICING: Record<Tier, { monthly: number; yearly: number }> = {
  starter: { monthly: 2400, yearly: 28800 },
  professional: { monthly: 6900, yearly: 82800 },
  enterprise: { monthly: 17400, yearly: 208800 },
};

export const YEARLY_DISCOUNT = 0.17;

export const TIER_ORDER: Record<Tier, number> = {
  starter: 0,
  professional: 1,
  enterprise: 2,
};

// --- Types ---
export type Tier = 'starter' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
export type EventType =
  | 'created'
  | 'activated'
  | 'renewed'
  | 'payment_failed'
  | 'payment_recovered'
  | 'cancelled'
  | 'resumed'
  | 'expired'
  | 'downgraded'
  | 'plan_changed'
  | 'grace_period_started';

export type CancellationReason =
  | 'too_expensive'
  | 'missing_features'
  | 'switching_competitor'
  | 'low_usage'
  | 'other';

// --- Tier Display ---
export const TIER_LABELS: Record<Tier, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

export const TIER_DESCRIPTIONS: Record<Tier, string> = {
  starter: 'For small teams getting started with demand forecasting',
  professional: 'For growing businesses that need advanced analytics',
  enterprise: 'For large organizations with custom requirements',
};

export const TIER_FEATURES: Record<Tier, string[]> = {
  starter: [
    'Up to 100 SKUs',
    'Basic forecasting (MA, SES)',
    'Monthly data uploads',
    'Email support',
    '5 team members',
    'Standard reports',
  ],
  professional: [
    'Up to 1,000 SKUs',
    'Advanced forecasting (ARIMA, Holt-Winters, XGBoost)',
    'Daily data uploads',
    'Priority email & chat support',
    '25 team members',
    'Advanced reports & dashboards',
    'EOQ & Safety Stock calculator',
    'API access',
    'Data export (CSV, Excel)',
  ],
  enterprise: [
    'Unlimited SKUs',
    'All forecasting models + custom',
    'Real-time data sync',
    '24/7 dedicated support',
    'Unlimited team members',
    'Custom reports & dashboards',
    'Advanced EOQ & Safety Stock',
    'Full API access + webhooks',
    'Data export (CSV, Excel, PDF)',
    'SSO / SAML authentication',
    'Custom integration support',
    'SLA guarantee (99.9%)',
  ],
};

// --- Format BDT ---
export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// --- Subscription Status from API ---
export interface SubscriptionData {
  id: string;
  tier: Tier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  unitAmount: number;
  currency: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  endsAt: string | null;
  autoRenew: boolean;
  lastPaymentAt: string | null;
  nextPaymentAt: string | null;
  paymentFailCount: number;
  gracePeriodEnd: string | null;
  expiredAt: string | null;
  downgradedAt: string | null;
  dataRetentionEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComputedInfo {
  daysUntilExpiry: number;
  inGracePeriod: boolean;
  canRenew: boolean;
  canResume: boolean;
  canCancel: boolean;
  canChangePlan: boolean;
  isTrial: boolean;
  isExpired: boolean;
  statusLabel: string;
}

export interface SubscriptionStatusResponse {
  subscription: SubscriptionData | null;
  status: SubscriptionStatus;
  tier: Tier;
  computed: ComputedInfo;
  tenant: {
    id: string;
    name: string;
    plan: string;
    billingEmail?: string;
    pmType?: string;
    pmLastFour?: string;
    trialStartsAt?: string;
    trialEndsAt?: string;
  } | null;
  pricing: Record<string, { monthly: number; yearly: number }>;
}

// --- Invoice ---
export interface InvoiceData {
  id: string;
  number: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  lineItems: { description: string; amount: number; quantity: number; unit_amount: number }[] | null;
  usageSummary: unknown;
  periodStart: string;
  periodEnd: string;
  paymentMethod: string | null;
  paymentRef: string | null;
  subscriptionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicesResponse {
  success: boolean;
  data: InvoiceData[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

// --- Lifecycle Event ---
export interface LifecycleEvent {
  id: string;
  eventType: EventType;
  fromStatus: string | null;
  toStatus: string | null;
  fromTier: string | null;
  toTier: string | null;
  metadata: string | null;
  performedBy: string | null;
  createdAt: string;
}

// --- Cancellation Reason Labels ---
export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  too_expensive: 'Too expensive',
  missing_features: 'Missing features I need',
  switching_competitor: 'Switching to a competitor',
  low_usage: 'Not using it enough',
  other: 'Other reason',
};

// --- Event Type Colors ---
export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  created: 'bg-blue-500',
  activated: 'bg-emerald-500',
  renewed: 'bg-emerald-500',
  payment_failed: 'bg-red-500',
  payment_recovered: 'bg-amber-500',
  cancelled: 'bg-red-500',
  resumed: 'bg-emerald-500',
  expired: 'bg-red-500',
  downgraded: 'bg-orange-500',
  plan_changed: 'bg-purple-500',
  grace_period_started: 'bg-amber-500',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  created: 'Subscription Created',
  activated: 'Subscription Activated',
  renewed: 'Subscription Renewed',
  payment_failed: 'Payment Failed',
  payment_recovered: 'Payment Recovered',
  cancelled: 'Subscription Cancelled',
  resumed: 'Subscription Resumed',
  expired: 'Subscription Expired',
  downgraded: 'Plan Downgraded',
  plan_changed: 'Plan Changed',
  grace_period_started: 'Grace Period Started',
};
