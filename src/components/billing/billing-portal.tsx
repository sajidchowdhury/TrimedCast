'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CreditCard,
  Zap,
  Crown,
  TrendingUp,
  AlertTriangle,
  Check,
  X,
  Clock,
  Shield,
  BarChart3,
  FileText,
  Settings,
  ChevronRight,
  Lock,
  Unlock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Bell,
  DollarSign,
  Users,
  Package,
  Activity,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

interface UsageMetric {
  current: number;
  limit: number | null;
  remaining: number | null;
}

interface UsageData {
  forecast_runs: UsageMetric;
  ai_queries: UsageMetric;
  sku_count: UsageMetric;
  import_runs: UsageMetric;
  report_generated: UsageMetric;
}

interface UsageAlert {
  type: string;
  severity: 'warning' | 'critical' | 'exceeded';
  message: string;
  current: number;
  limit: number;
  percentage: number;
}

interface TierInfo {
  slug: string;
  name: string;
  pricing: {
    price_cents: number;
    price_usd: string;
    currency: string;
    stripe_price_id: string | null;
  };
  limits: {
    max_skus: number | null;
    max_users: number | null;
    max_warehouses: number | null;
    ai_queries_per_month: number | null;
    forecast_runs_per_month: number | null;
    import_runs_per_month: number | null;
  };
  features: string[];
}

interface FeatureMatrixRow {
  feature: string;
  starter: boolean;
  professional: boolean;
  enterprise: boolean;
}

interface SubscriptionData {
  id: string;
  tier: string;
  status: string;
  unit_amount_cents: number;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  ends_at: string | null;
  last_payment_at: string | null;
  next_payment_at: string | null;
  payment_fail_count: number;
}

interface LifecycleData {
  status: string;
  tier: string;
  valid_transitions: string[];
  timeline: Record<string, string | null>;
}

interface InvoiceData {
  id: string;
  number: string;
  status: string;
  subtotal_cents: number;
  total_cents: number;
  currency: string;
  due_date: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

interface PaymentMethodData {
  type: string;
  last_four: string;
  expiry_month: number;
  expiry_year: number;
  is_expired: boolean;
}

interface RevenueMetrics {
  mrr: number;
  arr: number;
  active_tenants: number;
  trial_tenants: number;
  churn_rate: number;
  arpu: number;
  ltv: number;
  tier_distribution?: Record<string, number>;
  revenue_by_tier?: Record<string, number>;
}

interface BillingState {
  subscription: SubscriptionData | null;
  lifecycle: LifecycleData | null;
  tiers: TierInfo[];
  featureMatrix: FeatureMatrixRow[];
  usage: UsageData | null;
  alerts: UsageAlert[];
  invoices: InvoiceData[];
  paymentMethod: PaymentMethodData | null;
  revenueMetrics: RevenueMetrics | null;
  loading: boolean;
  error: string | null;
  isDemo: boolean;
  isAdmin: boolean;
}

// ─── Helpers ─────────────────────────────────────────────

const TIER_ORDER = ['starter', 'professional', 'enterprise'] as const;

const TIER_ICONS: Record<string, React.ReactNode> = {
  starter: <Zap className="h-5 w-5" />,
  professional: <Shield className="h-5 w-5" />,
  enterprise: <Crown className="h-5 w-5" />,
};

const TIER_COLORS: Record<string, string> = {
  starter: 'text-emerald-600',
  professional: 'text-amber-600',
  enterprise: 'text-rose-600',
};

const TIER_BORDER: Record<string, string> = {
  starter: 'border-emerald-500',
  professional: 'border-amber-500',
  enterprise: 'border-rose-500',
};

const TIER_GLOW: Record<string, string> = {
  starter: 'ring-2 ring-emerald-500/30',
  professional: 'ring-2 ring-amber-500/30',
  enterprise: 'ring-2 ring-rose-500/30',
};

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'trialing':
      return 'secondary';
    case 'past_due':
      return 'outline';
    case 'suspended':
      return 'destructive';
    case 'cancelled':
      return 'outline';
    default:
      return 'secondary';
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    case 'trialing':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'past_due':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'suspended':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function usageBarColor(percentage: number): string {
  if (percentage > 95) return '[&>div]:bg-red-500';
  if (percentage > 80) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-emerald-500';
}

function featureLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function tierIndex(tier: string): number {
  return TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number]);
}

// ─── API fetch helper ────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json;
  } catch {
    return null;
  }
}

// ─── Demo fallback data ──────────────────────────────────

const DEMO_TIERS: TierInfo[] = [
  {
    slug: 'starter',
    name: 'Starter',
    pricing: { price_cents: 2900, price_usd: '$29', currency: 'usd', stripe_price_id: null },
    limits: { max_skus: 100, max_users: 2, max_warehouses: 1, ai_queries_per_month: 50, forecast_runs_per_month: 20, import_runs_per_month: 10 },
    features: ['regression_forecasting', 'single_warehouse', 'csv_import', 'dashboard', 'email_support'],
  },
  {
    slug: 'professional',
    name: 'Professional',
    pricing: { price_cents: 7900, price_usd: '$79', currency: 'usd', stripe_price_id: null },
    limits: { max_skus: 1000, max_users: 10, max_warehouses: 5, ai_queries_per_month: 500, forecast_runs_per_month: 100, import_runs_per_month: 50 },
    features: ['regression_forecasting', 'prophet_forecasting', 'multi_warehouse', 'csv_import', 'excel_import', 'ask_ai', 'dashboard', 'dashboard_sharing', 'priority_support'],
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    pricing: { price_cents: 24900, price_usd: '$249', currency: 'usd', stripe_price_id: null },
    limits: { max_skus: null, max_users: null, max_warehouses: null, ai_queries_per_month: null, forecast_runs_per_month: null, import_runs_per_month: null },
    features: ['regression_forecasting', 'prophet_forecasting', 'ensemble_forecasting', 'multi_warehouse', 'csv_import', 'excel_import', 'ask_ai', 'custom_seasonal_models', 'api_access', 'sso', 'per_tenant_backup', 'custom_domain', 'dashboard', 'dashboard_sharing', 'webhook_notifications', 'dedicated_support'],
  },
];

const DEMO_FEATURE_MATRIX: FeatureMatrixRow[] = [
  { feature: 'regression_forecasting', starter: true, professional: true, enterprise: true },
  { feature: 'prophet_forecasting', starter: false, professional: true, enterprise: true },
  { feature: 'ensemble_forecasting', starter: false, professional: false, enterprise: true },
  { feature: 'single_warehouse', starter: true, professional: true, enterprise: true },
  { feature: 'multi_warehouse', starter: false, professional: true, enterprise: true },
  { feature: 'csv_import', starter: true, professional: true, enterprise: true },
  { feature: 'excel_import', starter: false, professional: true, enterprise: true },
  { feature: 'ask_ai', starter: false, professional: true, enterprise: true },
  { feature: 'custom_seasonal_models', starter: false, professional: false, enterprise: true },
  { feature: 'api_access', starter: false, professional: false, enterprise: true },
  { feature: 'sso', starter: false, professional: false, enterprise: true },
  { feature: 'per_tenant_backup', starter: false, professional: false, enterprise: true },
  { feature: 'custom_domain', starter: false, professional: false, enterprise: true },
  { feature: 'dashboard', starter: true, professional: true, enterprise: true },
  { feature: 'dashboard_sharing', starter: false, professional: true, enterprise: true },
  { feature: 'webhook_notifications', starter: false, professional: false, enterprise: true },
  { feature: 'email_support', starter: true, professional: false, enterprise: false },
  { feature: 'priority_support', starter: false, professional: true, enterprise: false },
  { feature: 'dedicated_support', starter: false, professional: false, enterprise: true },
];

const DEMO_SUBSCRIPTION: SubscriptionData = {
  id: 'demo-sub',
  tier: 'professional',
  status: 'active',
  unit_amount_cents: 7900,
  currency: 'usd',
  current_period_start: new Date(Date.now() - 15 * 86400000).toISOString(),
  current_period_end: new Date(Date.now() + 15 * 86400000).toISOString(),
  trial_ends_at: null,
  cancelled_at: null,
  ends_at: null,
  last_payment_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  next_payment_at: new Date(Date.now() + 15 * 86400000).toISOString(),
  payment_fail_count: 0,
};

const DEMO_LIFECYCLE: LifecycleData = {
  status: 'active',
  tier: 'professional',
  valid_transitions: ['cancel', 'suspend'],
  timeline: {
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    current_period_start: new Date(Date.now() - 15 * 86400000).toISOString(),
    current_period_end: new Date(Date.now() + 15 * 86400000).toISOString(),
    trial_ends_at: null,
    cancelled_at: null,
    ends_at: null,
    last_payment_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    next_payment_at: new Date(Date.now() + 15 * 86400000).toISOString(),
    grace_period_end: null,
  },
};

const DEMO_USAGE: UsageData = {
  forecast_runs: { current: 67, limit: 100, remaining: 33 },
  ai_queries: { current: 389, limit: 500, remaining: 111 },
  sku_count: { current: 456, limit: 1000, remaining: 544 },
  import_runs: { current: 42, limit: 50, remaining: 8 },
  report_generated: { current: 12, limit: null, remaining: null },
};

const DEMO_ALERTS: UsageAlert[] = [
  { type: 'import_runs', severity: 'warning', message: 'Import runs at 84% of limit', current: 42, limit: 50, percentage: 84 },
];

const DEMO_INVOICES: InvoiceData[] = [
  { id: 'inv-1', number: 'INV-2025-001', status: 'paid', subtotal_cents: 7900, total_cents: 7900, currency: 'usd', due_date: '2025-02-01', period_start: '2025-01-01', period_end: '2025-02-01', paid_at: '2025-01-15', created_at: '2025-01-01' },
  { id: 'inv-2', number: 'INV-2025-002', status: 'paid', subtotal_cents: 7900, total_cents: 7900, currency: 'usd', due_date: '2025-03-01', period_start: '2025-02-01', period_end: '2025-03-01', paid_at: '2025-02-15', created_at: '2025-02-01' },
  { id: 'inv-3', number: 'INV-2025-003', status: 'open', subtotal_cents: 7900, total_cents: 7900, currency: 'usd', due_date: '2025-04-01', period_start: '2025-03-01', period_end: '2025-04-01', paid_at: null, created_at: '2025-03-01' },
];

const DEMO_PAYMENT: PaymentMethodData = {
  type: 'card',
  last_four: '4242',
  expiry_month: 12,
  expiry_year: 2026,
  is_expired: false,
};

const DEMO_REVENUE: RevenueMetrics = {
  mrr: 12450,
  arr: 149400,
  active_tenants: 142,
  trial_tenants: 28,
  churn_rate: 0.032,
  arpu: 87.68,
  ltv: 2740,
  tier_distribution: { starter: 68, professional: 52, enterprise: 22 },
  revenue_by_tier: { starter: 1972, professional: 4108, enterprise: 5478 },
};

// ─── Sub-components ──────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
      <Skeleton className="h-60 rounded-lg" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <Badge className={`${statusColor(status)} border-0 font-medium`}>{status.replace('_', ' ')}</Badge>;
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'paid'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
      : status === 'open'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
        : status === 'void'
          ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  return <Badge className={`${cls} border-0 font-medium`}>{status}</Badge>;
}

function MiniUsageBar({ label, current, limit, icon }: { label: string; current: number; limit: number | null; icon: React.ReactNode }) {
  const pct = limit ? Math.min(100, (current / limit) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-medium tabular-nums">
          {current}
          {limit !== null ? ` / ${limit}` : ''}
        </span>
      </div>
      {limit !== null ? (
        <Progress value={pct} className={`h-2 ${usageBarColor(pct)}`} />
      ) : (
        <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <Unlock className="h-3 w-3" /> Unlimited
        </div>
      )}
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────

function OverviewTab({ state, onAction }: { state: BillingState; onAction: (action: string, data?: Record<string, unknown>) => void }) {
  const sub = state.subscription;
  const lc = state.lifecycle;
  const usage = state.usage;
  if (!sub) return <p className="text-muted-foreground">No subscription found.</p>;

  const currentTierDef = state.tiers.find((t) => t.slug === sub.tier);
  const trialDaysLeft = sub.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="space-y-6">
      {/* Subscription Status + Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Subscription Status</CardTitle>
              <StatusBadge status={sub.status} />
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <div className="flex items-center gap-2">
              {TIER_ICONS[sub.tier] ?? <Package className="h-5 w-5" />}
              <span className={`text-lg font-semibold ${TIER_COLORS[sub.tier] ?? ''}`}>
                {currentTierDef?.name ?? sub.tier}
              </span>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Billing Period</span>
                <p className="font-medium">{formatDate(sub.current_period_start)} — {formatDate(sub.current_period_end)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Next Payment</span>
                <p className="font-medium">{formatDate(sub.next_payment_at)}</p>
              </div>
              {trialDaysLeft !== null && (
                <div>
                  <span className="text-muted-foreground">Trial Ends</span>
                  <p className="font-medium text-amber-600">{trialDaysLeft} days left</p>
                </div>
              )}
              {sub.payment_fail_count > 0 && (
                <div>
                  <span className="text-muted-foreground">Failed Payments</span>
                  <p className="font-medium text-red-600">{sub.payment_fail_count}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Tier Card */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg">Current Plan</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{currentTierDef ? formatCurrency(currentTierDef.pricing.price_cents) : '—'}</span>
              <span className="text-muted-foreground">/ month</span>
            </div>
            <Separator />
            {currentTierDef && (
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums">{currentTierDef.limits.max_skus ?? '∞'}</p>
                  <p className="text-muted-foreground">SKUs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums">{currentTierDef.limits.max_users ?? '∞'}</p>
                  <p className="text-muted-foreground">Users</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums">{currentTierDef.limits.max_warehouses ?? '∞'}</p>
                  <p className="text-muted-foreground">Warehouses</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-wrap gap-3">
            {sub.status === 'trialing' && (
              <Button onClick={() => onAction('activate')} className="bg-emerald-600 hover:bg-emerald-700">
                <Zap className="h-4 w-4 mr-2" /> Activate Subscription
              </Button>
            )}
            {lc?.valid_transitions.includes('cancel') && (
              <Button variant="outline" onClick={() => onAction('cancel')} className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                <X className="h-4 w-4 mr-2" /> Cancel Subscription
              </Button>
            )}
            {lc?.valid_transitions.includes('resume') && (
              <Button onClick={() => onAction('resume')} className="bg-emerald-600 hover:bg-emerald-700">
                <RefreshCw className="h-4 w-4 mr-2" /> Resume Subscription
              </Button>
            )}
            {sub.status === 'suspended' && (
              <Button onClick={() => onAction('activate')} className="bg-emerald-600 hover:bg-emerald-700">
                <Unlock className="h-4 w-4 mr-2" /> Reactivate
              </Button>
            )}
            {tierIndex(sub.tier) < 2 && (
              <Button variant="outline" onClick={() => onAction('upgrade')}>
                <ArrowUpRight className="h-4 w-4 mr-2" /> Upgrade Plan
              </Button>
            )}
            {tierIndex(sub.tier) > 0 && sub.status === 'active' && (
              <Button variant="outline" onClick={() => onAction('downgrade')}>
                <ArrowDownRight className="h-4 w-4 mr-2" /> Downgrade Plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Overview */}
      {usage && (
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Usage This Period</CardTitle>
              <Badge variant="outline" className="text-xs">
                {formatDate(state.usage?.forecast_runs ? undefined : undefined)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <MiniUsageBar label="Forecast Runs" current={usage.forecast_runs.current} limit={usage.forecast_runs.limit} icon={<BarChart3 className="h-3.5 w-3.5" />} />
            <MiniUsageBar label="AI Queries" current={usage.ai_queries.current} limit={usage.ai_queries.limit} icon={<Zap className="h-3.5 w-3.5" />} />
            <MiniUsageBar label="SKUs" current={usage.sku_count.current} limit={usage.sku_count.limit} icon={<Package className="h-3.5 w-3.5" />} />
            <MiniUsageBar label="Import Runs" current={usage.import_runs.current} limit={usage.import_runs.limit} icon={<RefreshCw className="h-3.5 w-3.5" />} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Plans & Pricing Tab ─────────────────────────────────

function PlansTab({ state, onAction }: { state: BillingState; onAction: (action: string, data?: Record<string, unknown>) => void }) {
  const currentTier = state.subscription?.tier ?? '';
  return (
    <div className="space-y-8">
      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {state.tiers.map((tier) => {
          const isCurrent = tier.slug === currentTier;
          const isUpgrade = tierIndex(tier.slug) > tierIndex(currentTier);
          const isDowngrade = tierIndex(tier.slug) < tierIndex(currentTier);

          return (
            <Card
              key={tier.slug}
              className={`p-6 relative transition-all ${isCurrent ? `${TIER_BORDER[tier.slug]} ${TIER_GLOW[tier.slug]}` : 'hover:shadow-md'}`}
            >
              {isCurrent && (
                <Badge className="absolute -top-2.5 left-4 bg-emerald-600 text-white border-0">Current Plan</Badge>
              )}
              <CardHeader className="p-0 pb-4">
                <div className="flex items-center gap-2">
                  <span className={TIER_COLORS[tier.slug]}>{TIER_ICONS[tier.slug]}</span>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{formatCurrency(tier.pricing.price_cents)}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{tier.limits.max_skus !== null ? `${tier.limits.max_skus} SKUs` : 'Unlimited SKUs'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{tier.limits.max_users !== null ? `${tier.limits.max_users} Users` : 'Unlimited Users'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span>{tier.limits.max_warehouses !== null ? `${tier.limits.max_warehouses} Warehouse(s)` : 'Unlimited Warehouses'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span>{tier.limits.forecast_runs_per_month !== null ? `${tier.limits.forecast_runs_per_month} Forecasts/mo` : 'Unlimited Forecasts'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span>{tier.limits.ai_queries_per_month !== null ? `${tier.limits.ai_queries_per_month} AI Queries/mo` : 'Unlimited AI Queries'}</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1.5">
                  {tier.features.slice(0, 5).map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-sm">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{featureLabel(f)}</span>
                    </div>
                  ))}
                  {tier.features.length > 5 && (
                    <p className="text-xs text-muted-foreground">+{tier.features.length - 5} more features</p>
                  )}
                </div>
                <div className="pt-2">
                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full">
                      <Check className="h-4 w-4 mr-2" /> Current Plan
                    </Button>
                  ) : isUpgrade ? (
                    <Button
                      onClick={() => onAction('subscribe', { tier: tier.slug })}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      <ArrowUpRight className="h-4 w-4 mr-2" /> Upgrade
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => onAction('subscribe', { tier: tier.slug })}
                      className="w-full"
                    >
                      <ArrowDownRight className="h-4 w-4 mr-2" /> Downgrade
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      {state.featureMatrix.length > 0 && (
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg">Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-56">Feature</TableHead>
                    <TableHead className="text-center">Starter</TableHead>
                    <TableHead className="text-center">Professional</TableHead>
                    <TableHead className="text-center">Enterprise</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.featureMatrix.map((row) => (
                    <TableRow key={row.feature}>
                      <TableCell className="font-medium">{featureLabel(row.feature)}</TableCell>
                      <TableCell className="text-center">
                        {row.starter ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.professional ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.enterprise ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Usage Tab ───────────────────────────────────────────

function UsageTab({ state }: { state: BillingState }) {
  const usage = state.usage;
  const alerts = state.alerts;

  if (!usage) return <p className="text-muted-foreground">No usage data available.</p>;

  const usageEntries: Array<{ key: string; label: string; data: UsageMetric; icon: React.ReactNode }> = [
    { key: 'forecast_runs', label: 'Forecast Runs', data: usage.forecast_runs, icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'ai_queries', label: 'AI Queries', data: usage.ai_queries, icon: <Zap className="h-4 w-4" /> },
    { key: 'sku_count', label: 'Active SKUs', data: usage.sku_count, icon: <Package className="h-4 w-4" /> },
    { key: 'import_runs', label: 'Import Runs', data: usage.import_runs, icon: <RefreshCw className="h-4 w-4" /> },
    { key: 'report_generated', label: 'Reports Generated', data: usage.report_generated, icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Usage Meters */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-lg">Usage Meters</CardTitle>
          <CardDescription>Current billing period usage against your plan limits</CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-6">
          {usageEntries.map(({ key, label, data, icon }) => {
            const pct = data.limit ? (data.current / data.limit) * 100 : 0;
            const isOverLimit = data.limit !== null && data.current >= data.limit;
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    {icon} {label}
                  </span>
                  <div className="flex items-center gap-2 text-sm tabular-nums">
                    <span className={isOverLimit ? 'text-red-600 font-semibold' : ''}>{data.current}</span>
                    {data.limit !== null ? (
                      <>
                        <span className="text-muted-foreground">/</span>
                        <span>{data.limit}</span>
                        <span className="text-muted-foreground">
                          ({pct.toFixed(1)}%)
                        </span>
                      </>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Unlock className="h-3.5 w-3.5" /> Unlimited
                      </span>
                    )}
                  </div>
                </div>
                {data.limit !== null && (
                  <Progress value={Math.min(100, pct)} className={`h-3 ${usageBarColor(pct)}`} />
                )}
                {data.remaining !== null && (
                  <p className="text-xs text-muted-foreground">
                    {data.remaining} remaining this period
                  </p>
                )}
                {isOverLimit && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Limit reached — upgrade to increase
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Usage Alerts */}
      {alerts.length > 0 && (
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Usage Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            {alerts.map((alert, i) => {
              const variant = alert.severity === 'exceeded' ? 'destructive' : undefined;
              return (
                <Alert key={i} variant={variant}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="capitalize">{alert.severity}: {featureLabel(alert.type)}</AlertTitle>
                  <AlertDescription>
                    {alert.message} — {alert.current}/{alert.limit} ({alert.percentage}%)
                  </AlertDescription>
                </Alert>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Invoices Tab ────────────────────────────────────────

function InvoicesTab({ state, onAction }: { state: BillingState; onAction: (action: string, data?: Record<string, unknown>) => void }) {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openInvoiceDetail = useCallback(async (inv: InvoiceData) => {
    setSelectedInvoice(inv);
    setDetailLoading(true);
    const detail = await apiFetch(`/api/v1/billing/invoices/${inv.id}`);
    setInvoiceDetail(detail);
    setDetailLoading(false);
  }, []);

  const invoices = state.invoices;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Invoices</h3>
        <Button onClick={() => onAction('generateInvoice')} variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" /> Generate Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card className="p-6">
          <CardContent className="p-0 text-center text-muted-foreground">
            No invoices yet. Generate your first invoice.
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.number}</TableCell>
                    <TableCell><InvoiceStatusBadge status={inv.status} /></TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(inv.total_cents)}</TableCell>
                    <TableCell>{formatDate(inv.due_date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(inv.period_start)} — {formatDate(inv.period_end)}
                    </TableCell>
                    <TableCell>{formatDate(inv.paid_at)}</TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => openInvoiceDetail(inv)}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Details</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => { if (!open) setSelectedInvoice(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.number}</DialogTitle>
            <DialogDescription>
              {selectedInvoice && `Status: ${selectedInvoice.status} • ${formatCurrency(selectedInvoice.total_cents)}`}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {selectedInvoice && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Amount</span><p className="font-semibold">{formatCurrency(selectedInvoice.total_cents)}</p></div>
                    <div><span className="text-muted-foreground">Due Date</span><p>{formatDate(selectedInvoice.due_date)}</p></div>
                    <div><span className="text-muted-foreground">Period</span><p>{formatDate(selectedInvoice.period_start)} — {formatDate(selectedInvoice.period_end)}</p></div>
                    <div><span className="text-muted-foreground">Paid At</span><p>{formatDate(selectedInvoice.paid_at) || 'Pending'}</p></div>
                  </div>
                  <Separator />
                  {/* Line items from detail if available */}
                  {invoiceDetail && (invoiceDetail as Record<string, unknown>).line_items && (
                    <div>
                      <p className="text-sm font-medium mb-2">Line Items</p>
                      <div className="space-y-1.5 text-sm">
                        {(invoiceDetail as Record<string, unknown>).line_items as unknown as React.ReactNode}
                      </div>
                    </div>
                  )}
                  {!invoiceDetail && (
                    <p className="text-sm text-muted-foreground">Full details not available in demo mode.</p>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Payment Tab ─────────────────────────────────────────

function PaymentTab({ state, onAction }: { state: BillingState; onAction: (action: string, data?: Record<string, unknown>) => void }) {
  const pm = state.paymentMethod;
  const [editing, setEditing] = useState(false);
  const [formType, setFormType] = useState('card');
  const [formLast4, setFormLast4] = useState('');
  const [formMonth, setFormMonth] = useState('1');
  const [formYear, setFormYear] = useState(String(new Date().getFullYear() + 1));

  const handleSave = () => {
    onAction('updatePayment', {
      type: formType,
      last_four: formLast4,
      expiry_month: parseInt(formMonth),
      expiry_year: parseInt(formYear),
    });
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Current Payment Method */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Payment Method
            </CardTitle>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Settings className="h-4 w-4 mr-1" /> Update
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {pm ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-18 rounded-md bg-muted flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium capitalize">{pm.type} ending in {pm.last_four}</p>
                  <p className="text-sm text-muted-foreground">
                    Expires {String(pm.expiry_month).padStart(2, '0')}/{pm.expiry_year}
                  </p>
                  {pm.is_expired && (
                    <Badge variant="destructive" className="mt-1">Expired</Badge>
                  )}
                </div>
              </div>

              {editing && (
                <>
                  <Separator />
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={formType} onValueChange={setFormType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="card">Credit Card</SelectItem>
                            <SelectItem value="debit">Debit Card</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Last 4 Digits</Label>
                        <Input
                          placeholder="4242"
                          maxLength={4}
                          value={formLast4}
                          onChange={(e) => setFormLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expiry Month</Label>
                        <Select value={formMonth} onValueChange={setFormMonth}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                              <SelectItem key={m} value={String(m)}>{String(m).padStart(2, '0')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Expiry Year</Label>
                        <Select value={formYear} onValueChange={setFormYear}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">Save</Button>
                      <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No payment method on file.</p>
          )}
        </CardContent>
      </Card>

      {/* Billing Address (placeholder) */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-lg">Billing Address</CardTitle>
          <CardDescription>Managed in your organization settings</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-sm text-muted-foreground">
            Update your billing address in the organization profile section.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Admin Tab ───────────────────────────────────────────

function AdminTab({ state }: { state: BillingState }) {
  const m = state.revenueMetrics;
  if (!m) return <p className="text-muted-foreground">Revenue metrics not available.</p>;

  const metricCards: Array<{ label: string; value: string; icon: React.ReactNode; change?: string }> = [
    { label: 'MRR', value: `$${m.mrr.toLocaleString()}`, icon: <DollarSign className="h-4 w-4" /> },
    { label: 'ARR', value: `$${m.arr.toLocaleString()}`, icon: <TrendingUp className="h-4 w-4" /> },
    { label: 'Active Tenants', value: String(m.active_tenants), icon: <Users className="h-4 w-4" /> },
    { label: 'Trial Tenants', value: String(m.trial_tenants), icon: <Clock className="h-4 w-4" /> },
    { label: 'Churn Rate', value: `${(m.churn_rate * 100).toFixed(1)}%`, icon: <ArrowDownRight className="h-4 w-4" /> },
    { label: 'ARPU', value: `$${m.arpu.toFixed(2)}`, icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'LTV', value: `$${m.ltv.toLocaleString()}`, icon: <Activity className="h-4 w-4" /> },
  ];

  const tierDist = m.tier_distribution ?? {};
  const revByTier = m.revenue_by_tier ?? {};
  const totalTenants = Object.values(tierDist).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Revenue Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {metricCards.map(({ label, value, icon }) => (
          <Card key={label} className="p-4">
            <CardContent className="p-0 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                {icon}
                <span className="text-xs font-medium">{label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tier Distribution */}
      {Object.keys(tierDist).length > 0 && (
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg">Tier Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            {Object.entries(tierDist).map(([tier, count]) => {
              const pct = totalTenants > 0 ? (count / totalTenants) * 100 : 0;
              return (
                <div key={tier} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span className={TIER_COLORS[tier]}>{TIER_ICONS[tier]}</span>
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </span>
                    <span className="tabular-nums">{count} tenants ({pct.toFixed(1)}%)</span>
                  </div>
                  <Progress value={pct} className="h-2 [&>div]:bg-emerald-500" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Revenue by Tier */}
      {Object.keys(revByTier).length > 0 && (
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg">Revenue by Tier</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Monthly Revenue</TableHead>
                  <TableHead className="text-right">Tenants</TableHead>
                  <TableHead className="text-right">ARPU</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(revByTier).map(([tier, rev]) => {
                  const tenants = tierDist[tier] ?? 0;
                  const arpu = tenants > 0 ? (rev / tenants) : 0;
                  return (
                    <TableRow key={tier}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <span className={TIER_COLORS[tier]}>{TIER_ICONS[tier]}</span>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">${rev.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{tenants}</TableCell>
                      <TableCell className="text-right tabular-nums">${arpu.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main BillingPortal Component ────────────────────────

export function BillingPortal() {
  const [state, setState] = useState<BillingState>({
    subscription: null,
    lifecycle: null,
    tiers: [],
    featureMatrix: [],
    usage: null,
    alerts: [],
    invoices: [],
    paymentMethod: null,
    revenueMetrics: null,
    loading: true,
    error: null,
    isDemo: false,
    isAdmin: false,
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Show toast briefly
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      // Fetch in parallel
      const [subRes, lcRes, tiersRes, usageRes, alertsRes, invoicesRes, pmRes, revRes] = await Promise.all([
        apiFetch<{ subscription: SubscriptionData; tier_definition?: unknown }>('/api/v1/billing/subscription'),
        apiFetch<LifecycleData>('/api/v1/billing/subscription/lifecycle'),
        apiFetch<{ tiers: TierInfo[]; feature_matrix: FeatureMatrixRow[] }>('/api/v1/billing/tiers'),
        apiFetch<{ usage: UsageData }>('/api/v1/billing/usage'),
        apiFetch<{ alerts: UsageAlert[] }>('/api/v1/billing/usage/alerts'),
        apiFetch<{ data: InvoiceData[]; items: InvoiceData[] }>('/api/v1/billing/invoice'),
        apiFetch<{ payment_method: PaymentMethodData }>('/api/v1/billing/payment-method'),
        apiFetch<RevenueMetrics>('/api/v1/billing/admin/revenue'),
      ]);

      const isDemo = !subRes; // If subscription failed, likely not authenticated
      const isAdmin = !!revRes;

      setState({
        subscription: subRes?.subscription ?? (isDemo ? DEMO_SUBSCRIPTION : null),
        lifecycle: lcRes ?? (isDemo ? DEMO_LIFECYCLE : null),
        tiers: tiersRes?.tiers ?? DEMO_TIERS,
        featureMatrix: tiersRes?.feature_matrix ?? DEMO_FEATURE_MATRIX,
        usage: usageRes?.usage ?? (isDemo ? DEMO_USAGE : null),
        alerts: alertsRes?.alerts ?? (isDemo ? DEMO_ALERTS : []),
        invoices: invoicesRes?.data ?? invoicesRes?.items ?? (isDemo ? DEMO_INVOICES : []),
        paymentMethod: pmRes?.payment_method ?? (isDemo ? DEMO_PAYMENT : null),
        revenueMetrics: revRes ?? (isDemo ? DEMO_REVENUE : null),
        loading: false,
        error: null,
        isDemo,
        isAdmin: isDemo ? true : isAdmin,
      });
    } catch (err) {
      // Fall back to demo data on error
      setState({
        subscription: DEMO_SUBSCRIPTION,
        lifecycle: DEMO_LIFECYCLE,
        tiers: DEMO_TIERS,
        featureMatrix: DEMO_FEATURE_MATRIX,
        usage: DEMO_USAGE,
        alerts: DEMO_ALERTS,
        invoices: DEMO_INVOICES,
        paymentMethod: DEMO_PAYMENT,
        revenueMetrics: DEMO_REVENUE,
        loading: false,
        error: 'Using demo data — connect your account to see live billing info.',
        isDemo: true,
        isAdmin: true,
      });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Action handler
  const handleAction = useCallback(async (action: string, data?: Record<string, unknown>) => {
    setActionLoading(action);
    try {
      switch (action) {
        case 'activate': {
          const res = await fetch('/api/v1/billing/subscription/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
          if (res.ok) showToast('success', 'Subscription activated!');
          else showToast('error', 'Failed to activate subscription');
          break;
        }
        case 'cancel': {
          const res = await fetch('/api/v1/billing/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
          if (res.ok) showToast('success', 'Subscription cancelled. Access continues until end of period.');
          else showToast('error', 'Failed to cancel subscription');
          break;
        }
        case 'resume': {
          const res = await fetch('/api/v1/billing/subscription/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
          if (res.ok) showToast('success', 'Subscription resumed!');
          else showToast('error', 'Failed to resume subscription');
          break;
        }
        case 'subscribe': {
          const tier = (data?.tier ?? 'professional') as string;
          const res = await fetch('/api/v1/billing/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier }),
          });
          if (res.ok) showToast('success', `Subscribed to ${tier} plan!`);
          else showToast('error', 'Failed to change plan');
          break;
        }
        case 'upgrade': {
          const currentTier = state.subscription?.tier ?? 'starter';
          const nextIdx = Math.min(tierIndex(currentTier) + 1, 2);
          const nextTier = TIER_ORDER[nextIdx];
          const res = await fetch('/api/v1/billing/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier: nextTier }),
          });
          if (res.ok) showToast('success', `Upgraded to ${nextTier}!`);
          else showToast('error', 'Failed to upgrade');
          break;
        }
        case 'downgrade': {
          const currentTier = state.subscription?.tier ?? 'professional';
          const prevIdx = Math.max(tierIndex(currentTier) - 1, 0);
          const prevTier = TIER_ORDER[prevIdx];
          const res = await fetch('/api/v1/billing/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier: prevTier }),
          });
          if (res.ok) showToast('success', `Downgraded to ${prevTier}.`);
          else showToast('error', 'Failed to downgrade');
          break;
        }
        case 'generateInvoice': {
          const res = await fetch('/api/v1/billing/invoice', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
          if (res.ok) showToast('success', 'Invoice generated!');
          else showToast('error', 'Failed to generate invoice');
          break;
        }
        case 'updatePayment': {
          const res = await fetch('/api/v1/billing/payment-method', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (res.ok) showToast('success', 'Payment method updated!');
          else showToast('error', 'Failed to update payment method');
          break;
        }
        default:
          break;
      }
      // Reload data after action
      await loadData();
    } catch {
      showToast('error', 'An error occurred. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, [state.subscription?.tier, loadData, showToast]);

  // ─── Render ──────────────────────────────────────────

  if (state.loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" /> Billing Portal
          </h2>
          <p className="text-muted-foreground text-sm">Manage your subscription, usage, and billing</p>
        </div>
        <div className="flex items-center gap-2">
          {state.isDemo && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <Clock className="h-3 w-3 mr-1" /> Demo Mode
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={loadData} disabled={state.loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${state.loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Error / Info Banner */}
      {state.error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Action Loading Overlay */}
      {actionLoading && (
        <Alert className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
          <AlertTitle className="text-emerald-800 dark:text-emerald-200">Processing</AlertTitle>
          <AlertDescription className="text-emerald-700 dark:text-emerald-300">
            {actionLoading === 'cancel' && 'Cancelling subscription...'}
            {actionLoading === 'activate' && 'Activating subscription...'}
            {actionLoading === 'resume' && 'Resuming subscription...'}
            {actionLoading === 'subscribe' && 'Changing plan...'}
            {actionLoading === 'upgrade' && 'Upgrading plan...'}
            {actionLoading === 'downgrade' && 'Downgrading plan...'}
            {actionLoading === 'generateInvoice' && 'Generating invoice...'}
            {actionLoading === 'updatePayment' && 'Updating payment method...'}
          </AlertDescription>
        </Alert>
      )}

      {/* Toast */}
      {toast && (
        <Alert
          className={
            toast.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950'
              : 'border-red-300 bg-red-50 dark:bg-red-950'
          }
        >
          {toast.type === 'success' ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-red-600" />}
          <AlertTitle className={toast.type === 'success' ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'}>
            {toast.type === 'success' ? 'Success' : 'Error'}
          </AlertTitle>
          <AlertDescription className={toast.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>
            {toast.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-1.5">
            <Package className="h-4 w-4" /> Plans & Pricing
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" /> Usage
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4" /> Payment
          </TabsTrigger>
          {state.isAdmin && (
            <TabsTrigger value="admin" className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" /> Admin
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab state={state} onAction={handleAction} />
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <PlansTab state={state} onAction={handleAction} />
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          <UsageTab state={state} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <InvoicesTab state={state} onAction={handleAction} />
        </TabsContent>

        <TabsContent value="payment" className="mt-6">
          <PaymentTab state={state} onAction={handleAction} />
        </TabsContent>

        {state.isAdmin && (
          <TabsContent value="admin" className="mt-6">
            <AdminTab state={state} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
