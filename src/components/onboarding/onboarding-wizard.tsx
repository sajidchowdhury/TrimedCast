'use client';

// ============================================
// TrimedCast - Onboarding Wizard
// Multi-step wizard with progress bar,
// step navigation, skip functionality
// ============================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, ArrowRight } from 'lucide-react';
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

export function OnboardingWizard() {
  const router = useRouter();
  const { currentStep, completedSteps, goToDashboard, setAcId } = useOnboardingStore();

  const currentIdx = ONBOARDING_STEPS.indexOf(currentStep);
  const totalSteps = ONBOARDING_STEPS.length;

  // If onboarding is complete, redirect to dashboard
  useEffect(() => {
    if (completedSteps.length >= totalSteps) {
      router.push('/dashboard');
    }
  }, [completedSteps.length, totalSteps, router]);

  // Try to get AC-ID from auth context or URL params
  useEffect(() => {
    // Check URL params for ac_id
    const params = new URLSearchParams(window.location.search);
    const acId = params.get('ac_id');
    if (acId) setAcId(acId);
  }, [setAcId]);

  const StepComponent = STEP_COMPONENTS[currentStep];

  const handleSkipAll = () => {
    goToDashboard();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm">
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

            {/* Skip all */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipAll}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Step indicators */}
          <div className="flex items-center gap-1 py-3">
            {ONBOARDING_STEPS.map((step, i) => {
              const isCompleted = completedSteps.includes(step);
              const isCurrent = step === currentStep;
              const label = STEP_LABELS[step];

              return (
                <div key={step} className="flex items-center gap-1 flex-1">
                  <button
                    onClick={() => {
                      // Can only go back to completed steps
                      if (isCompleted || i < currentIdx) {
                        useOnboardingStore.getState().setStep(step);
                      }
                    }}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                      isCurrent
                        ? 'text-emerald-500'
                        : isCompleted
                        ? 'text-emerald-500/70 hover:text-emerald-500 cursor-pointer'
                        : 'text-muted-foreground/50'
                    }`}
                  >
                    {/* Step dot */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                      isCurrent
                        ? 'bg-emerald-500 text-white'
                        : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : 'bg-muted text-muted-foreground/50'
                    }`}>
                      {isCompleted ? '✓' : i + 1}
                    </div>
                    {/* Label (hidden on mobile) */}
                    <span className="hidden sm:inline truncate">
                      {label.en}
                    </span>
                  </button>
                  {/* Connector line */}
                  {i < ONBOARDING_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded-full transition-colors ${
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
      <main className="flex-1 flex items-start justify-center py-8 sm:py-12">
        <div className="w-full max-w-2xl px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {StepComponent && <StepComponent />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
