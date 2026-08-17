'use client';

// ============================================
// Cancellation Flow — Multi-step cancellation wizard
// ============================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Frown,
  ChevronRight,
  ChevronLeft,
  XCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Zap,
  BarChart3,
  Users,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscriptionStore } from './subscription-store';
import {
  CANCELLATION_REASON_LABELS,
  TIER_FEATURES,
  TIER_LABELS,
  formatBDT,
  type CancellationReason,
  type Tier,
} from './types';

interface CancellationFlowProps {
  currentTier: Tier;
  periodEndDate: string | null;
  onComplete?: () => void;
}

const REASONS: CancellationReason[] = [
  'too_expensive',
  'missing_features',
  'switching_competitor',
  'low_usage',
  'other',
];

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  'Up to': <BarChart3 className="h-4 w-4 text-muted-foreground" />,
  'Unlimited': <BarChart3 className="h-4 w-4 text-muted-foreground" />,
  'Advanced': <Zap className="h-4 w-4 text-muted-foreground" />,
  '24/7': <Shield className="h-4 w-4 text-muted-foreground" />,
  'team': <Users className="h-4 w-4 text-muted-foreground" />,
  default: <Zap className="h-4 w-4 text-muted-foreground" />,
};

function getFeatureIcon(feature: string) {
  for (const [key, icon] of Object.entries(FEATURE_ICONS)) {
    if (feature.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return FEATURE_ICONS.default;
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 100 : -100, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 100 : -100, opacity: 0 }),
};

export function CancellationFlow({ currentTier, periodEndDate, onComplete }: CancellationFlowProps) {
  const { cancelSubscription, isCancelling, cancelError, cancelSuccess, resumeSubscription, isResuming } =
    useSubscriptionStore();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selectedReason, setSelectedReason] = useState<CancellationReason | null>(null);
  const [feedback, setFeedback] = useState('');
  const [cancelled, setCancelled] = useState(false);

  const features = TIER_FEATURES[currentTier];
  const tierLabel = TIER_LABELS[currentTier];

  const endsAtDate = periodEndDate
    ? new Date(periodEndDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'end of current period';

  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const handleCancel = async () => {
    const success = await cancelSubscription(selectedReason || 'other', feedback || undefined);
    if (success) {
      setCancelled(true);
    }
  };

  const handleResume = async () => {
    const success = await resumeSubscription();
    if (success && onComplete) {
      onComplete();
    }
  };

  // --- Cancelled State ---
  if (cancelSuccess && cancelled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            >
              <XCircle className="h-10 w-10 text-orange-500 mx-auto mb-3" />
            </motion.div>
            <CardTitle>Subscription Cancelled</CardTitle>
            <CardDescription>
              Your subscription will remain active until {endsAtDate}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                You have access until <strong>{endsAtDate}</strong>. After that, your data will be
                retained for 30 days.
              </AlertDescription>
            </Alert>
            <Button
              onClick={handleResume}
              disabled={isResuming}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isResuming && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Resume Subscription
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const totalSteps = 4;

  return (
    <div className="max-w-md mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`h-2 w-2 rounded-full transition-colors ${
                i <= step ? 'bg-orange-500' : 'bg-muted'
              }`}
            />
            {i < totalSteps - 1 && (
              <div className={`w-12 h-0.5 mx-1 ${i < step ? 'bg-orange-500' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        {/* Step 1: Reason */}
        {step === 0 && (
          <motion.div
            key="step1"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Frown className="h-5 w-5 text-orange-500" />
                  We&apos;re sorry to see you go
                </CardTitle>
                <CardDescription>Why are you cancelling your subscription?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${
                      selectedReason === reason
                        ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/20'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          selectedReason === reason ? 'border-orange-500' : 'border-muted-foreground/30'
                        }`}
                      >
                        {selectedReason === reason && (
                          <div className="h-2 w-2 rounded-full bg-orange-500" />
                        )}
                      </div>
                      {CANCELLATION_REASON_LABELS[reason]}
                    </span>
                  </button>
                ))}
                <div className="pt-2">
                  <Button onClick={goNext} disabled={!selectedReason} className="w-full">
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Feedback */}
        {step === 1 && (
          <motion.div
            key="step2"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Additional Feedback</CardTitle>
                <CardDescription>
                  Help us improve by sharing more details (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Tell us what we could do better..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={goBack} className="flex-1">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button onClick={goNext} className="flex-1">
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: What you'll lose */}
        {step === 2 && (
          <motion.div
            key="step3"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">What you&apos;ll lose</CardTitle>
                <CardDescription>
                  These {tierLabel} features will no longer be available after {endsAtDate}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                  {features.map((feature, i) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2 text-sm"
                    >
                      <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                      <span>{feature}</span>
                    </motion.div>
                  ))}
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={goBack} className="flex-1">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button onClick={goNext} variant="destructive" className="flex-1">
                    Continue to Cancel
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Final Confirmation */}
        {step === 3 && (
          <motion.div
            key="step4"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle>Confirm Cancellation</CardTitle>
                <CardDescription>
                  This action will cancel your {tierLabel} subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/10">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    Your access continues until <strong>{endsAtDate}</strong>. No further charges
                    after that.
                  </AlertDescription>
                </Alert>

                {cancelError && (
                  <Alert variant="destructive">
                    <AlertDescription>{cancelError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={onComplete}
                    className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Keep My Subscription
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="w-full"
                  >
                    {isCancelling && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Cancel Subscription
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={goBack} className="w-full">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Go Back
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
