'use client';

// ============================================
// TrimedCast - Onboarding Step 1: Business Profile
// Select motorcycle brands & parts categories
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
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">
          Tell us about your business
        </h2>
        <p className="text-sm text-muted-foreground">
          আপনার ব্যবসা সম্পর্কে বলুন
        </p>
      </div>

      {/* Motorcycle Brands */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            What motorcycle brands do you sell?
          </h3>
          <span className="text-xs text-muted-foreground">
            {selectedBrands.length} selected
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MOTORCYCLE_BRANDS.map((brand) => {
            const isSelected = selectedBrands.includes(brand.id);
            return (
              <motion.button
                key={brand.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleBrand(brand.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-emerald-500/30 bg-background'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
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
                <div>
                  <span className="text-sm font-medium text-foreground">{brand.label}</span>
                  <span className="text-xs text-muted-foreground ml-1">({brand.labelBn})</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Parts Categories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            What parts categories do you deal in?
          </h3>
          <span className="text-xs text-muted-foreground">
            {selectedCategories.length} selected
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PARTS_CATEGORIES.map((cat) => {
            const isSelected = selectedCategories.includes(cat.id);
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleCategory(cat.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-emerald-500/30 bg-background'
                }`}
              >
                <span className="text-lg">{cat.icon}</span>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground block truncate">{cat.label}</span>
                  <span className="text-xs text-muted-foreground block truncate">{cat.labelBn}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={prevStep}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          variant="ghost"
          onClick={skipStep}
          className="text-muted-foreground hover:text-foreground ml-auto"
        >
          <SkipForward className="w-4 h-4 mr-1" />
          Skip
        </Button>
        <Button
          onClick={nextStep}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/25"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
