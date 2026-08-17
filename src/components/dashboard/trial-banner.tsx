'use client';

// ============================================
// TrimedCast - Trial Countdown Banner
// Shows in dashboard when tenant is on trial
// Countdown days + upgrade CTA
// ============================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Clock, Sparkles, X, ArrowRight } from 'lucide-react';
import { TRIAL_CONFIG } from '@/lib/subscription/tiers';

interface TrialBannerProps {
  daysRemaining: number;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

export function TrialBanner({ daysRemaining, onUpgrade, onDismiss }: TrialBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide if not on trial
  if (daysRemaining <= 0 || !isVisible) return null;

  // Color based on urgency
  const isUrgent = daysRemaining <= 3;
  const isWarning = daysRemaining <= 7 && !isUrgent;

  const bannerColor = isUrgent
    ? 'bg-rose-500/10 border-rose-500/20'
    : isWarning
    ? 'bg-amber-500/10 border-amber-500/20'
    : 'bg-emerald-500/10 border-emerald-500/20';

  const textColor = isUrgent
    ? 'text-rose-600 dark:text-rose-400'
    : isWarning
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';

  const buttonClass = isUrgent
    ? 'bg-rose-500 hover:bg-rose-600 text-white'
    : 'bg-emerald-500 hover:bg-emerald-600 text-white';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`border ${bannerColor} rounded-lg px-3 sm:px-4 py-2.5 flex items-center gap-3`}
      >
        {/* Icon */}
        <div className={`flex-shrink-0 ${textColor}`}>
          {isUrgent ? (
            <Clock className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-foreground">
            {isUrgent ? (
              <>⏰ Trial ends in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>!</>
            ) : (
              <>
                <strong>{TRIAL_CONFIG.label}</strong> — {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                <span className="hidden sm:inline"> with full Pro access</span>
              </>
            )}
          </p>
          {isUrgent && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              Upgrade now to keep CNY alerts, order triggers, and all Pro features.
            </p>
          )}
        </div>

        {/* Upgrade button */}
        <Button
          size="sm"
          onClick={onUpgrade}
          className={`${buttonClass} h-7 sm:h-8 text-xs font-semibold shadow-sm flex-shrink-0`}
        >
          Upgrade
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>

        {/* Dismiss */}
        {onDismiss && (
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss();
            }}
            className="text-muted-foreground/60 hover:text-muted-foreground flex-shrink-0 ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// --- Trial Expired Banner ---
// Shows when trial has expired but tenant hasn't upgraded

interface TrialExpiredBannerProps {
  onUpgrade?: () => void;
}

export function TrialExpiredBanner({ onUpgrade }: TrialExpiredBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-rose-500/20 bg-rose-500/5 rounded-lg px-3 sm:px-4 py-2.5 flex items-center gap-3"
    >
      <Clock className="w-4 h-4 text-rose-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-foreground">
          Trial expired — you&apos;re now on the <strong>Free plan</strong>
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
          Free tier: 3-month forecast, 10 products. Upgrade to Pro for ৳12,000/yr to unlock everything.
        </p>
      </div>
      <Button
        size="sm"
        onClick={onUpgrade}
        className="bg-emerald-500 hover:bg-emerald-600 text-white h-7 sm:h-8 text-xs font-semibold shadow-sm flex-shrink-0"
      >
        Upgrade to Pro
        <ArrowRight className="w-3 h-3 ml-1" />
      </Button>
    </motion.div>
  );
}

// --- Free Tier Info Banner ---
// Shows when on free tier (not trial, not pro)
// Reminds what they're missing

interface FreeTierBannerProps {
  onUpgrade?: () => void;
}

export function FreeTierBanner({ onUpgrade }: FreeTierBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border border-border bg-muted/30 rounded-lg px-3 sm:px-4 py-2 flex items-center gap-3"
    >
      <span className="text-sm flex-shrink-0">🔒</span>
      <p className="text-xs text-muted-foreground flex-1 min-w-0">
        Free plan: 3-month forecast, 10 products, no CNY alerts.
        <span className="hidden sm:inline"> Upgrade for the full experience.</span>
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onUpgrade}
        className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 h-7 text-xs flex-shrink-0"
      >
        Upgrade
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
