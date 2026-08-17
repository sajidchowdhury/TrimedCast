'use client';

// ============================================
// Renewal Panel — Renewal status and controls
// ============================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  RefreshCw,
  CalendarClock,
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  Loader2,
  Clock,
  ShieldCheck,
  History,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSubscriptionStore } from './subscription-store';
import { formatBDT, TIER_LABELS, TIER_PRICING, type Tier, type BillingCycle } from './types';

interface RenewalPanelProps {
  tier: Tier;
  billingCycle: BillingCycle;
  autoRenew: boolean;
  currentPeriodEnd: string | null;
  nextPaymentAt: string | null;
  paymentFailCount: number;
  gracePeriodEnd: string | null;
  daysUntilExpiry: number;
  inGracePeriod: boolean;
  canRenew: boolean;
}

export function RenewalPanel({
  tier,
  billingCycle,
  autoRenew,
  currentPeriodEnd,
  nextPaymentAt,
  paymentFailCount,
  gracePeriodEnd,
  daysUntilExpiry,
  inGracePeriod,
  canRenew,
}: RenewalPanelProps) {
  const {
    renewSubscription,
    isRenewing,
    renewError,
    renewSuccess,
    isTogglingAutoRenew,
    toggleAutoRenew,
  } = useSubscriptionStore();

  const [confirmAutoRenew, setConfirmAutoRenew] = useState(false);
  const [pendingAutoRenewValue, setPendingAutoRenewValue] = useState(false);

  const tierLabel = TIER_LABELS[tier];
  const currentPrice = TIER_PRICING[tier][billingCycle];

  const now = new Date();
  const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const nextPayment = nextPaymentAt ? new Date(nextPaymentAt) : null;
  const graceEnd = gracePeriodEnd ? new Date(gracePeriodEnd) : null;

  // Grace period days remaining
  const graceDaysLeft = graceEnd
    ? Math.max(0, Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Nearing expiry threshold
  const nearingExpiry = daysUntilExpiry > 0 && daysUntilExpiry <= 7;

  // Mock renewal history
  const renewalHistory = [
    { date: '2025-01-15', amount: currentPrice },
    { date: '2024-12-15', amount: currentPrice },
    { date: '2024-11-15', amount: currentPrice },
  ];

  const handleAutoRenewToggle = (checked: boolean) => {
    if (autoRenew && !checked) {
      // Turning off — show confirmation
      setPendingAutoRenewValue(false);
      setConfirmAutoRenew(true);
    } else {
      toggleAutoRenew(checked);
    }
  };

  const confirmToggleOff = async () => {
    await toggleAutoRenew(false);
    setConfirmAutoRenew(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Current Renewal Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-600" />
            Renewal Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-Renew Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`h-4 w-4 ${autoRenew ? 'text-emerald-600' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-sm font-medium">Auto-renew</p>
                <p className="text-xs text-muted-foreground">
                  {autoRenew ? 'Your subscription will renew automatically' : 'Manual renewal required'}
                </p>
              </div>
            </div>
            <Switch
              checked={autoRenew}
              onCheckedChange={handleAutoRenewToggle}
              disabled={isTogglingAutoRenew}
            />
          </div>

          <Separator />

          {/* Next Renewal Date */}
          {nextPayment && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Next renewal</span>
              </div>
              <span className="text-sm font-medium">
                {nextPayment.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* Period End */}
          {periodEnd && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Period ends</span>
              </div>
              <span className="text-sm">
                {periodEnd.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* Renew Amount */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Renewal amount</span>
            <span className="text-sm font-medium">
              {formatBDT(currentPrice)}/{billingCycle === 'monthly' ? 'mo' : 'yr'}
            </span>
          </div>

          {/* Manual Renew Button */}
          {canRenew && (
            <Button
              onClick={() => renewSubscription()}
              disabled={isRenewing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isRenewing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1.5" />
              )}
              Renew Now
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Success message */}
      {renewSuccess && (
        <Alert className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/10">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-700 dark:text-emerald-400">
            {renewSuccess}
          </AlertDescription>
        </Alert>
      )}

      {/* Error message */}
      {renewError && (
        <Alert variant="destructive">
          <AlertDescription>{renewError}</AlertDescription>
        </Alert>
      )}

      {/* Payment Retry Status (past_due) */}
      {paymentFailCount > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Payment Retry Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Failed attempts</span>
              <Badge variant="destructive">{paymentFailCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Next retry</span>
              <span className="text-sm">
                {graceEnd
                  ? graceEnd.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Pending'}
              </span>
            </div>
            <Button variant="outline" size="sm" className="w-full gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Update Payment Method
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grace Period Warning */}
      {inGracePeriod && (
        <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            <strong>Grace Period:</strong> {graceDaysLeft} day{graceDaysLeft !== 1 ? 's' : ''}{' '}
            remaining to update your payment before your subscription expires.
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Update Payment
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Expiry Warning */}
      {nearingExpiry && !inGracePeriod && (
        <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/10">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            <strong>Expiring Soon:</strong> Your subscription expires in {daysUntilExpiry} day
            {daysUntilExpiry !== 1 ? 's' : ''}. Renew now to avoid interruption.
            <Button
              onClick={() => renewSubscription()}
              disabled={isRenewing}
              className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isRenewing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1.5" />
              )}
              Renew Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Renewal History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Recent Renewals
          </CardTitle>
          <CardDescription>Last 3 renewal records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {renewalHistory.map((record, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {new Date(record.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span className="font-medium">{formatBDT(record.amount)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Auto-Renew Off Confirmation Dialog */}
      <Dialog open={confirmAutoRenew} onOpenChange={setConfirmAutoRenew}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Turn off auto-renewal?</DialogTitle>
            <DialogDescription>
              Your subscription will not renew automatically. You&apos;ll need to manually renew before{' '}
              {periodEnd
                ? periodEnd.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'period end'}{' '}
              to keep access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmAutoRenew(false)}>
              Keep Auto-Renew
            </Button>
            <Button variant="destructive" onClick={confirmToggleOff}>
              Turn Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
