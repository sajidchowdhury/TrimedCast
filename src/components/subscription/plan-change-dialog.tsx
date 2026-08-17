'use client';

// ============================================
// Plan Change Dialog — Confirm upgrade/downgrade
// ============================================

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowUpRight,
  ArrowDownRight,
  Check,
  X,
  Loader2,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscriptionStore } from './subscription-store';
import {
  TIER_LABELS,
  TIER_ORDER,
  TIER_FEATURES,
  TIER_PRICING,
  formatBDT,
  type Tier,
  type BillingCycle,
} from './types';

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: Tier;
  currentCycle: BillingCycle;
  newTier: Tier;
  newCycle: BillingCycle;
}

export function PlanChangeDialog({
  open,
  onOpenChange,
  currentTier,
  currentCycle,
  newTier,
  newCycle,
}: PlanChangeDialogProps) {
  const { changePlan, isChangingPlan, changePlanError, changePlanSuccess, clearMessages } =
    useSubscriptionStore();

  const isUpgrade = TIER_ORDER[newTier] > TIER_ORDER[currentTier];
  const isDowngrade = TIER_ORDER[newTier] < TIER_ORDER[currentTier];
  const isCycleChange = TIER_ORDER[newTier] === TIER_ORDER[currentTier];

  const currentPrice = TIER_PRICING[currentTier][currentCycle];
  const newPrice = TIER_PRICING[newTier][newCycle];
  const priceDifference = newPrice - currentPrice;

  // Features comparison
  const currentFeatures = TIER_FEATURES[currentTier];
  const newFeatures = TIER_FEATURES[newTier];
  const gainedFeatures = newFeatures.filter((f) => !currentFeatures.includes(f));
  const lostFeatures = currentFeatures.filter((f) => !newFeatures.includes(f));

  // Prorated charge (simple calculation)
  const now = new Date();
  const proratedDays = 30; // simplified
  const dailyRate = newPrice / 365;
  const proratedCharge = Math.round(dailyRate * proratedDays);

  const [completed, setCompleted] = React.useState(false);

  const handleConfirm = async () => {
    const success = await changePlan(newTier, newCycle);
    if (success) {
      setCompleted(true);
      setTimeout(() => {
        setCompleted(false);
        clearMessages();
        onOpenChange(false);
      }, 2000);
    }
  };

  const handleClose = () => {
    if (!isChangingPlan) {
      setCompleted(false);
      clearMessages();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpgrade && <ArrowUpRight className="h-5 w-5 text-emerald-600" />}
            {isDowngrade && <ArrowDownRight className="h-5 w-5 text-orange-500" />}
            {isCycleChange && <Zap className="h-5 w-5 text-purple-500" />}
            {isUpgrade && 'Upgrade Plan'}
            {isDowngrade && 'Downgrade Plan'}
            {isCycleChange && 'Change Billing Cycle'}
          </DialogTitle>
          <DialogDescription>
            {isUpgrade
              ? 'You will get immediate access to all new features.'
              : isDowngrade
              ? 'Your plan will change at the end of the current billing period.'
              : 'Your billing cycle will change immediately.'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {completed ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              >
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              </motion.div>
              <p className="text-lg font-medium">Plan Changed Successfully!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {changePlanSuccess || `Now on ${TIER_LABELS[newTier]} plan`}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Current → New Plan */}
              <div className="flex items-center gap-3 justify-center">
                <div className="text-center">
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {TIER_LABELS[currentTier]}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatBDT(currentPrice)}/{currentCycle === 'monthly' ? 'mo' : 'yr'}
                  </p>
                </div>
                <ArrowUpRight
                  className={`h-5 w-5 ${
                    isUpgrade ? 'text-emerald-500' : isDowngrade ? 'text-orange-500 rotate-180' : 'text-purple-500'
                  }`}
                />
                <div className="text-center">
                  <Badge className="text-sm px-3 py-1">{TIER_LABELS[newTier]}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatBDT(newPrice)}/{newCycle === 'monthly' ? 'mo' : 'yr'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Price Difference */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Monthly price</p>
                  <p className="font-medium">{formatBDT(TIER_PRICING[newTier].monthly)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Yearly price</p>
                  <p className="font-medium">{formatBDT(TIER_PRICING[newTier].yearly)}</p>
                </div>
              </div>

              {priceDifference !== 0 && (
                <div
                  className={`rounded-lg p-3 text-sm ${
                    priceDifference > 0
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                      : 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400'
                  }`}
                >
                  <span className="font-medium">
                    {priceDifference > 0 ? 'Additional' : 'Credit'}:{' '}
                    {formatBDT(Math.abs(priceDifference))}/{newCycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                  {isUpgrade && (
                    <p className="text-xs mt-1 opacity-80">
                      Prorated charge today: ~{formatBDT(proratedCharge)}
                    </p>
                  )}
                  {isDowngrade && (
                    <p className="text-xs mt-1 opacity-80">
                      Credit will be applied at period end
                    </p>
                  )}
                </div>
              )}

              {/* Features Comparison */}
              {gainedFeatures.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-2 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Features you&apos;ll gain
                  </p>
                  <ul className="space-y-1">
                    {gainedFeatures.map((f) => (
                      <li key={f} className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <Check className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {lostFeatures.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                    <X className="h-3.5 w-3.5" /> Features you&apos;ll lose
                  </p>
                  <ul className="space-y-1">
                    {lostFeatures.map((f) => (
                      <li key={f} className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <X className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Upgrade/Downgrade Note */}
              {isUpgrade && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 p-3 text-sm bg-emerald-50/50 dark:bg-emerald-950/10">
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">
                    Upgrade now — immediate access
                  </p>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/60 mt-0.5">
                    You&apos;ll be charged a prorated amount for the remaining billing period.
                  </p>
                </div>
              )}
              {isDowngrade && (
                <div className="rounded-lg border border-orange-200 dark:border-orange-800 p-3 text-sm bg-orange-50/50 dark:bg-orange-950/10">
                  <p className="font-medium text-orange-700 dark:text-orange-400">
                    Downgrade at period end
                  </p>
                  <p className="text-xs text-orange-600/80 dark:text-orange-400/60 mt-0.5">
                    You&apos;ll keep your current plan features until the end of your billing period.
                  </p>
                </div>
              )}

              {/* Error */}
              {changePlanError && (
                <div className="rounded-lg border border-red-200 p-3 text-sm text-red-600 bg-red-50/50">
                  {changePlanError}
                </div>
              )}

              {/* Actions */}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose} disabled={isChangingPlan}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isChangingPlan}
                  className={
                    isUpgrade
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : isDowngrade
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : ''
                  }
                >
                  {isChangingPlan && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  {isUpgrade && 'Upgrade Now'}
                  {isDowngrade && 'Confirm Downgrade'}
                  {isCycleChange && 'Change Cycle'}
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
