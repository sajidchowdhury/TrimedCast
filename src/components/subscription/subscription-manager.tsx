'use client';

// ============================================
// Subscription Manager — Main subscription management page with 4 tabs
// ============================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Crown,
  Zap,
  Shield,
  Check,
  X,
  Clock,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  Receipt,
  History,
  Loader2,
  ChevronRight,
  Sparkles,
  Building2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSubscriptionStore } from './subscription-store';
import {
  TIER_LABELS,
  TIER_DESCRIPTIONS,
  TIER_FEATURES,
  TIER_PRICING,
  TIER_ORDER,
  YEARLY_DISCOUNT,
  formatBDT,
  type Tier,
  type BillingCycle,
  type SubscriptionStatus,
} from './types';
import { PlanChangeDialog } from './plan-change-dialog';
import { CancellationFlow } from './cancellation-flow';
import { RenewalPanel } from './renewal-panel';
import { InvoiceList } from './invoice-list';
import { LifecycleTimeline } from './lifecycle-timeline';

// --- Status Badge ---
function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const config: Record<SubscriptionStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    trial: { variant: 'secondary', label: 'Trial' },
    active: { variant: 'default', label: 'Active' },
    past_due: { variant: 'outline', label: 'Past Due' },
    cancelled: { variant: 'destructive', label: 'Cancelled' },
    expired: { variant: 'destructive', label: 'Expired' },
  };
  const { variant, label } = config[status] || config.active;
  return <Badge variant={variant}>{label}</Badge>;
}

// --- Tier Icon ---
function TierIcon({ tier }: { tier: Tier }) {
  const iconMap: Record<Tier, React.ReactNode> = {
    starter: <Zap className="h-5 w-5" />,
    professional: <Crown className="h-5 w-5" />,
    enterprise: <Building2 className="h-5 w-5" />,
  };
  return <>{iconMap[tier]}</>;
}

// --- Overview Tab ---
function OverviewTab() {
  const { statusData, isLoadingStatus, statusError, cancelSuccess, resumeSubscription, isResuming } =
    useSubscriptionStore();
  const [showCancellation, setShowCancellation] = useState(false);

  if (isLoadingStatus) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (statusError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{statusError}</AlertDescription>
      </Alert>
    );
  }

  const sub = statusData?.subscription;
  const computed = statusData?.computed;
  const tier = (sub?.tier || statusData?.tier || 'starter') as Tier;
  const status = (sub?.status || statusData?.status || 'trial') as SubscriptionStatus;
  const billingCycle = (sub?.billingCycle || 'monthly') as BillingCycle;
  const autoRenew = sub?.autoRenew ?? true;
  const unitAmount = sub?.unitAmount ?? TIER_PRICING[tier][billingCycle];

  const periodStart = sub?.currentPeriodStart ? new Date(sub.currentPeriodStart) : null;
  const periodEnd = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
  const nextPayment = sub?.nextPaymentAt ? new Date(sub.nextPaymentAt) : null;
  const trialEndsAt = sub?.trialEndsAt ? new Date(sub.trialEndsAt) : null;
  const endsAt = sub?.endsAt ? new Date(sub.endsAt) : null;
  const cancelledAt = sub?.cancelledAt ? new Date(sub.cancelledAt) : null;

  const daysUntil = computed?.daysUntilExpiry || 0;
  const canCancel = computed?.canCancel ?? false;
  const canResume = computed?.canResume ?? false;
  const isTrial = computed?.isTrial ?? false;
  const isExpired = computed?.isExpired ?? false;
  const inGracePeriod = computed?.inGracePeriod ?? false;
  const canRenew = computed?.canRenew ?? false;

  // Show cancellation flow
  if (showCancellation && canCancel) {
    return (
      <div className="p-4">
        <CancellationFlow
          currentTier={tier}
          periodEndDate={sub?.currentPeriodEnd || sub?.endsAt || null}
          onComplete={() => setShowCancellation(false)}
        />
      </div>
    );
  }

  // Cancelled state with resume option
  if (cancelSuccess && status === 'cancelled') {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="text-center">
            <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto mb-2" />
            <CardTitle>Subscription Cancelled</CardTitle>
            <CardDescription>
              Your subscription will remain active until{' '}
              {endsAt
                ? endsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'end of period'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => resumeSubscription()}
              disabled={isResuming}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isResuming && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Resume Subscription
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 p-4"
    >
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                tier === 'enterprise' ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400' :
                tier === 'professional' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' :
                'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
              }`}>
                <TierIcon tier={tier} />
              </div>
              <div>
                <CardTitle className="text-lg">{TIER_LABELS[tier]} Plan</CardTitle>
                <CardDescription>{TIER_DESCRIPTIONS[tier]}</CardDescription>
              </div>
            </div>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{formatBDT(unitAmount)}</span>
            <span className="text-sm text-muted-foreground">
              /{billingCycle === 'monthly' ? 'month' : 'year'}
            </span>
          </div>

          <Separator />

          {/* Period Dates */}
          {periodStart && periodEnd && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Current period</p>
                <p className="font-medium">
                  {periodStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} —{' '}
                  {periodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Billing cycle</p>
                <p className="font-medium capitalize">{billingCycle}</p>
              </div>
            </div>
          )}

          {/* Trial Info */}
          {isTrial && trialEndsAt && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 p-3 bg-blue-50/50 dark:bg-blue-950/10">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                Trial ends {trialEndsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/50 mt-0.5">
                {daysUntil} day{daysUntil !== 1 ? 's' : ''} remaining in trial
              </p>
              <Progress value={Math.max(0, 100 - (daysUntil / 14) * 100)} className="mt-2 h-1.5" />
            </div>
          )}

          {/* Auto-renew */}
          {!isTrial && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${autoRenew ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                <span className="text-sm">Auto-renew</span>
              </div>
              <Badge variant={autoRenew ? 'default' : 'outline'}>
                {autoRenew ? 'On' : 'Off'}
              </Badge>
            </div>
          )}

          {/* Next Payment */}
          {nextPayment && status === 'active' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Next payment</span>
              </div>
              <span className="text-sm font-medium">
                {nextPayment.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          )}

          {/* Days Until Expiry/Renewal */}
          {daysUntil > 0 && !isTrial && status !== 'cancelled' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {autoRenew ? 'Days until renewal' : 'Days until expiry'}
                </span>
              </div>
              <Badge variant={daysUntil <= 7 ? 'destructive' : 'secondary'}>
                {daysUntil} day{daysUntil !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}

          {/* Grace Period Warning */}
          {inGracePeriod && (
            <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                In grace period — {daysUntil} day{daysUntil !== 1 ? 's' : ''} remaining to update payment
              </AlertDescription>
            </Alert>
          )}

          {/* Expired State */}
          {isExpired && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Subscription expired. Renew to regain access to your account.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancellation(true)}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
              >
                Cancel Subscription
              </Button>
            )}
            {canResume && (
              <Button
                size="sm"
                onClick={() => resumeSubscription()}
                disabled={isResuming}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isResuming && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Resume Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CreditCard className="h-3.5 w-3.5" />
              Payment method
            </div>
            <p className="text-sm font-medium capitalize">
              {statusData?.tenant?.pmType || 'bKash'}
              {statusData?.tenant?.pmLastFour && ` ••${statusData.tenant.pmLastFour}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Receipt className="h-3.5 w-3.5" />
              Billing email
            </div>
            <p className="text-sm font-medium truncate">
              {statusData?.tenant?.billingEmail || 'Not set'}
            </p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

// --- Change Plan Tab ---
function ChangePlanTab() {
  const { statusData, isLoadingStatus } = useSubscriptionStore();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [changeDialog, setChangeDialog] = useState<{
    open: boolean;
    tier: Tier;
    cycle: BillingCycle;
  }>({ open: false, tier: 'starter', cycle: 'monthly' });

  const sub = statusData?.subscription;
  const currentTier = (sub?.tier || statusData?.tier || 'starter') as Tier;
  const currentCycle = (sub?.billingCycle || 'monthly') as BillingCycle;
  const canChangePlan = statusData?.computed?.canChangePlan ?? true;

  const tiers: Tier[] = ['starter', 'professional', 'enterprise'];

  const handleSelectPlan = (tier: Tier) => {
    if (tier === currentTier && billingCycle === currentCycle) return;
    setChangeDialog({ open: true, tier, cycle: billingCycle });
  };

  if (isLoadingStatus) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 p-4"
    >
      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant={billingCycle === 'monthly' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setBillingCycle('monthly')}
        >
          Monthly
        </Button>
        <Button
          variant={billingCycle === 'yearly' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setBillingCycle('yearly')}
          className="gap-1"
        >
          Yearly
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            Save 17%
          </Badge>
        </Button>
      </div>

      {/* Tier Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrent = tier === currentTier;
          const isHigher = TIER_ORDER[tier] > TIER_ORDER[currentTier];
          const isLower = TIER_ORDER[tier] < TIER_ORDER[currentTier];
          const price = TIER_PRICING[tier][billingCycle];
          const yearlyPrice = TIER_PRICING[tier].yearly;
          const monthlyEquiv = Math.round(yearlyPrice / 12);
          const features = TIER_FEATURES[tier];

          return (
            <motion.div
              key={tier}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
            >
              <Card
                className={`relative h-full flex flex-col ${
                  isCurrent
                    ? 'border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-800'
                    : 'hover:border-muted-foreground/20'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white">Current Plan</Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <TierIcon tier={tier} />
                    <CardTitle className="text-lg">{TIER_LABELS[tier]}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{TIER_DESCRIPTIONS[tier]}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">
                        {billingCycle === 'yearly' ? formatBDT(monthlyEquiv) : formatBDT(price)}
                      </span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-xs text-muted-foreground">
                        {formatBDT(yearlyPrice)} billed annually
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-1.5 text-sm">
                    {features.slice(0, 5).map((feature) => (
                      <div key={feature} className="flex items-start gap-1.5">
                        <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-xs">{feature}</span>
                      </div>
                    ))}
                    {features.length > 5 && (
                      <p className="text-xs text-muted-foreground pl-5">
                        +{features.length - 5} more features
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    {isCurrent && billingCycle === currentCycle ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : !canChangePlan ? (
                      <Button variant="outline" className="w-full" disabled>
                        Not Available
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSelectPlan(tier)}
                        className={`w-full ${
                          isHigher
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : isLower
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        {isHigher && (
                          <>
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                            Upgrade
                          </>
                        )}
                        {isLower && (
                          <>
                            <ArrowDownRight className="h-4 w-4 mr-1" />
                            Downgrade
                          </>
                        )}
                        {TIER_ORDER[tier] === TIER_ORDER[currentTier] && (
                          <>
                            <Sparkles className="h-4 w-4 mr-1" />
                            Switch Cycle
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Feature Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Feature</th>
                  {tiers.map((t) => (
                    <th key={t} className="text-center py-2 px-3 font-medium">
                      {TIER_LABELS[t]}
                      {t === currentTier && (
                        <span className="block text-[10px] text-emerald-600">Current</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Gather all unique features */}
                {[...new Set(tiers.flatMap((t) => TIER_FEATURES[t]))].map((feature) => (
                  <tr key={feature} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-muted-foreground">{feature}</td>
                    {tiers.map((t) => (
                      <td key={t} className="text-center py-2 px-3">
                        {TIER_FEATURES[t].includes(feature) ? (
                          <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Plan Change Dialog */}
      <PlanChangeDialog
        open={changeDialog.open}
        onOpenChange={(open) => setChangeDialog((prev) => ({ ...prev, open }))}
        currentTier={currentTier}
        currentCycle={currentCycle}
        newTier={changeDialog.tier}
        newCycle={changeDialog.cycle}
      />
    </motion.div>
  );
}

// --- Main Component ---
export function SubscriptionManager() {
  const { fetchStatus, fetchInvoices, fetchEvents, clearMessages } = useSubscriptionStore();

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <div className="space-y-0">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-0">
          <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
            <Crown className="h-3.5 w-3.5 hidden sm:inline" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="change-plan" className="gap-1.5 text-xs sm:text-sm">
            <Zap className="h-3.5 w-3.5 hidden sm:inline" />
            Change Plan
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5 text-xs sm:text-sm">
            <Receipt className="h-3.5 w-3.5 hidden sm:inline" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="lifecycle" className="gap-1.5 text-xs sm:text-sm">
            <History className="h-3.5 w-3.5 hidden sm:inline" />
            Lifecycle
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="change-plan" className="mt-0">
          <ChangePlanTab />
        </TabsContent>

        <TabsContent value="invoices" className="mt-0">
          <div className="p-4">
            <InvoiceList />
          </div>
        </TabsContent>

        <TabsContent value="lifecycle" className="mt-0">
          <LifecycleTimeline />
        </TabsContent>
      </Tabs>
    </div>
  );
}
