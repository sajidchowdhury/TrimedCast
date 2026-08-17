'use client';

// ============================================
// TrimedCast - Onboarding Wizard
// Multi-step wizard with animated progress bar,
// step navigation, skip functionality
// Mobile responsive, spring transitions
// ============================================

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, ArrowRight, Check, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useOnboardingStore,
  ONBOARDING_STEPS,
  STEP_LABELS,
  type OnboardingStep,
} from '@/lib/onboarding/store';
import { StepWelcome } from './step-welcome';
import { StepBusinessProfile } from './step-business-profile';
import { StepDownloadTemplates } from './step-download-templates';
import { StepUploadData } from './step-upload-data';
import { StepFirstForecast } from './step-first-forecast';

// Map step to component
const STEP_COMPONENTS: Record<OnboardingStep, React.ComponentType> = {
  welcome: StepWelcome,
  'business-profile': StepBusinessProfile,
  'download-templates': StepDownloadTemplates,
  'upload-data': StepUploadData,
  'first-forecast': StepFirstForecast,
};

// Spring transition config
const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

// Step animation variants
const stepVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 60 : -60,
    scale: 0.98,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: springTransition,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -60 : 60,
    scale: 0.98,
    transition: { duration: 0.2 },
  }),
};

function OnboardingWizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentStep,
    completedSteps,
    goToDashboard,
    setAcId,
    setStep,
  } = useOnboardingStore();

  const currentIdx = ONBOARDING_STEPS.indexOf(currentStep);
  const totalSteps = ONBOARDING_STEPS.length;
  const progressPercent = Math.round(((currentIdx + 1) / totalSteps) * 100);
  const direction = 1; // always forward for simplicity

  // If onboarding is complete, redirect to root
  useEffect(() => {
    if (completedSteps.length >= totalSteps) {
      router.push('/');
    }
  }, [completedSteps.length, totalSteps, router]);

  // Get AC-ID from URL params
  useEffect(() => {
    const acId = searchParams.get('ac_id');
    if (acId) setAcId(acId);
  }, [searchParams, setAcId]);

  const StepComponent = STEP_COMPONENTS[currentStep];

  const handleSkipAll = () => {
    goToDashboard();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10">
                <Bike className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Trimed<span className="text-emerald-500">Cast</span>
              </span>
            </div>

            {/* Step counter + Skip all */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                Step {currentIdx + 1} of {totalSteps}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipAll}
                className="text-muted-foreground hover:text-foreground h-8"
              >
                <SkipForward className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Skip all</span>
                <span className="sm:hidden">Skip</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-emerald-500"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>
      </header>

      {/* Step Indicators */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-0 py-3 overflow-x-auto">
            {ONBOARDING_STEPS.map((step, i) => {
              const isCompleted = completedSteps.includes(step);
              const isCurrent = step === currentStep;
              const label = STEP_LABELS[step];

              return (
                <div key={step} className="flex items-center flex-1 min-w-0">
                  <button
                    onClick={() => {
                      if (isCompleted || i < currentIdx) {
                        setStep(step);
                      }
                    }}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-all min-w-0 ${
                      isCurrent
                        ? 'text-emerald-500'
                        : isCompleted
                        ? 'text-emerald-500/70 hover:text-emerald-500 cursor-pointer'
                        : 'text-muted-foreground/40'
                    }`}
                  >
                    {/* Step dot */}
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isCurrent ? 1.15 : 1,
                        backgroundColor: isCurrent
                          ? '#10b981'
                          : isCompleted
                          ? 'rgba(16,185,129,0.2)'
                          : 'rgba(0,0,0,0.05)',
                      }}
                      transition={springTransition}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${
                        isCurrent
                          ? 'text-white'
                          : isCompleted
                          ? 'text-emerald-500'
                          : 'text-muted-foreground/40'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : i + 1}
                    </motion.div>
                    {/* Label (hidden on mobile) */}
                    <span className="hidden sm:inline truncate">
                      {label.en}
                    </span>
                  </button>
                  {/* Connector line */}
                  {i < ONBOARDING_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded-full mx-1 transition-colors duration-300 ${
                      isCompleted ? 'bg-emerald-500/40' : 'bg-muted'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center py-6 sm:py-10 md:py-12">
        <div className="w-full max-w-2xl px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {StepComponent && <StepComponent />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-3">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-[10px] sm:text-xs text-center text-muted-foreground/60">
            TrimedCast — ঋতুভিত্তিক চাহিদা পূর্বাভাসন • Seasonal Demand Forecasting for BD Motorcycle Parts
          </p>
        </div>
      </footer>
    </div>
  );
}

export function OnboardingWizard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bike className="w-5 h-5 text-emerald-500 animate-pulse" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    }>
      <OnboardingWizardInner />
    </Suspense>
  );
}
