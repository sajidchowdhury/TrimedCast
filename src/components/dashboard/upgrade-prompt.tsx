'use client';

// ============================================
// TrimedCast - Upgrade Prompt Component
// Shows when a user tries to access a
// gated feature on the Free plan
// ============================================

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lock, ArrowRight, Check, Sparkles } from 'lucide-react';
import {
  type GatedFeature,
  FEATURE_DESCRIPTIONS,
  TIERS,
  type TrimedCastTier,
} from '@/lib/subscription/tiers';


// --- Inline Upgrade Prompt (non-modal) ---
// For embedding directly in a page section

interface UpgradePromptProps {
  feature: GatedFeature;
  reason?: string;
  reasonBn?: string;
  onUpgrade?: () => void;
  compact?: boolean;
}

export function UpgradePrompt({
  feature,
  reason,
  reasonBn,
  onUpgrade,
  compact = false,
}: UpgradePromptProps) {
  const desc = FEATURE_DESCRIPTIONS[feature];

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
        <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground flex-1">
          {desc?.label || feature} requires Pro
        </span>
        <Button
          size="sm"
          onClick={onUpgrade}
          className="bg-emerald-500 hover:bg-emerald-600 text-white h-6 text-[10px] font-semibold flex-shrink-0"
        >
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 space-y-3"
    >
      {/* Lock icon + title */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <Lock className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            🔒 {desc?.label || feature} requires Pro
          </h3>
          {desc?.labelBn && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {desc.labelBn} — প্রো লাগবে
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-12">
        {desc?.description || reason || 'This feature is available on the Pro plan.'}
      </p>

      {/* Price + CTA */}
      <div className="flex items-center gap-3 pl-12">
        <Button
          onClick={onUpgrade}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/25 h-9"
        >
          Upgrade Now
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
        <span className="text-xs text-muted-foreground">
          ৳{TIERS.pro.priceBdt.toLocaleString()}/year
        </span>
      </div>
    </motion.div>
  );
}

// --- Modal Upgrade Dialog ---
// For showing as a dialog when user clicks a gated feature

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: GatedFeature;
  currentTier?: TrimedCastTier;
  isTrial?: boolean;
  onUpgrade?: () => void;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  feature,
  currentTier = 'free',
  isTrial = false,
  onUpgrade,
}: UpgradeDialogProps) {
  const desc = FEATURE_DESCRIPTIONS[feature];

  // Pro features that user is missing
  const proOnlyFeatures: GatedFeature[] = [
    'cny_alerts',
    'order_triggers',
    'auto_recalibration',
    'soe_tower',
    'promo_simulator',
    'export_reports',
    'seasonal_breakdown',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            {desc?.label || feature} requires Pro
          </DialogTitle>
          <DialogDescription>
            {desc?.description || 'This feature is only available on the Pro plan.'}
          </DialogDescription>
        </DialogHeader>

        {/* What you get with Pro */}
        <div className="space-y-3 py-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            With Pro, you also get:
          </p>
          <div className="space-y-1.5">
            {proOnlyFeatures.map((f) => {
              const fDesc = FEATURE_DESCRIPTIONS[f];
              return (
                <div key={f} className="flex items-center gap-2 text-xs">
                  <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  <span className="text-foreground">{fDesc?.icon} {fDesc?.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4 text-center space-y-1">
          <p className="text-2xl font-bold text-foreground">
            ৳{TIERS.pro.priceBdt.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground">/year</span>
          </p>
          <p className="text-xs text-muted-foreground">
            ৳465/month • Less than ৳16/day
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            Maybe Later
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onUpgrade?.();
            }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            Upgrade to Pro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Feature Locked Overlay ---
// Wraps a section and shows a lock overlay
// when the feature is not available

interface FeatureLockedOverlayProps {
  feature: GatedFeature;
  allowed: boolean;
  children: React.ReactNode;
  onUpgrade?: () => void;
}

export function FeatureLockedOverlay({
  feature,
  allowed,
  children,
  onUpgrade,
}: FeatureLockedOverlayProps) {
  if (allowed) return <>{children}</>;

  return (
    <div className="relative">
      {/* Blurred content behind */}
      <div className="blur-[2px] opacity-40 pointer-events-none select-none">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
        <UpgradePrompt
          feature={feature}
          onUpgrade={onUpgrade}
          compact
        />
      </div>
    </div>
  );
}
