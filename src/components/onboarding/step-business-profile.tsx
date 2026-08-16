'use client';

// ============================================
// TrimedCast - Onboarding Step 1: Business Profile
// Select motorcycle brands & parts categories
// Mobile responsive with proper touch targets
// ============================================

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, SkipForward } from 'lucide-react';
import {
  useOnboardingStore,
  MOTORCYCLE_BRANDS,
  PARTS_CATEGORIES,
} from '@/lib/onboarding/store';

export function StepBusinessProfile() {
  const {
    selectedBrands,
    selectedCategories,
    toggleBrand,
    toggleCategory,
    nextStep,
    prevStep,
    skipStep,
  } = useOnboardingStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Tell us about your business
        </h2>
        <p className="text-sm text-muted-foreground">
          আপনার ব্যবসা সম্পর্কে বলুন — helps us tailor forecasts to your inventory
        </p>
      </motion.div>

      {/* Motorcycle Brands */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            What motorcycle brands do you sell?
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {selectedBrands.length} selected
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MOTORCYCLE_BRANDS.map((brand) => {
            const isSelected = selectedBrands.includes(brand.id);
            return (
              <motion.button
                key={brand.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleBrand(brand.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all min-h-[44px] ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-emerald-500/30 bg-background'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-muted-foreground/30'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground block truncate">{brand.label}</span>
                  <span className="text-[10px] text-muted-foreground block truncate">{brand.labelBn}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Parts Categories */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            What parts categories do you deal in?
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {selectedCategories.length} selected
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PARTS_CATEGORIES.map((cat) => {
            const isSelected = selectedCategories.includes(cat.id);
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleCategory(cat.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all min-h-[44px] ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-emerald-500/30 bg-background'
                }`}
              >
                <span className="text-lg flex-shrink-0">{cat.icon}</span>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground block truncate">{cat.label}</span>
                  <span className="text-[10px] text-muted-foreground block truncate">{cat.labelBn}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Selection summary */}
      {(selectedBrands.length > 0 || selectedCategories.length > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3"
        >
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ✨ Great start! We&apos;ll customize your dashboard and forecasts for {selectedBrands.length} brand{selectedBrands.length !== 1 ? 's' : ''} and {selectedCategories.length} categor{selectedCategories.length !== 1 ? 'ies' : 'y'}.
          </p>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={prevStep}
          className="text-muted-foreground hover:text-foreground min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          variant="ghost"
          onClick={skipStep}
          className="text-muted-foreground hover:text-foreground ml-auto min-h-[44px]"
        >
          <SkipForward className="w-4 h-4 mr-1" />
          Skip
        </Button>
        <Button
          onClick={nextStep}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/25 min-h-[44px]"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
