// ============================================
// TrimedCast - Onboarding Store (Zustand)
// Tracks onboarding progress and selections
// Persists to localStorage for resume support
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Types ---

export type OnboardingStep = 
  | 'welcome'
  | 'business-profile'
  | 'download-templates'
  | 'upload-data'
  | 'first-forecast';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'business-profile',
  'download-templates',
  'upload-data',
  'first-forecast',
];

export const STEP_LABELS: Record<OnboardingStep, { en: string; bn: string }> = {
  welcome:              { en: 'Welcome',             bn: 'স্বাগতম' },
  'business-profile':   { en: 'Business Profile',   bn: 'ব্যবসার তথ্য' },
  'download-templates': { en: 'Download Templates',  bn: 'টেমপ্লেট ডাউনলোড' },
  'upload-data':        { en: 'Upload Data',         bn: 'ডাটা আপলোড' },
  'first-forecast':     { en: 'First Forecast',      bn: 'প্রথম পূর্বাভাসন' },
};

// BD Motorcycle brands
export const MOTORCYCLE_BRANDS = [
  { id: 'bajaj',   label: 'Bajaj',   labelBn: 'বাজাজ' },
  { id: 'tvs',     label: 'TVS',     labelBn: 'টিভিএস' },
  { id: 'hero',    label: 'Hero',    labelBn: 'হিরো' },
  { id: 'honda',   label: 'Honda',   labelBn: 'হোন্ডা' },
  { id: 'yamaha',  label: 'Yamaha',  labelBn: 'ইয়ামাহা' },
  { id: 'runner',  label: 'Runner',  labelBn: 'রানার' },
  { id: 'walton',  label: 'Walton',  labelBn: 'ওয়ালটন' },
  { id: 'keeway',  label: 'Keeway',  labelBn: 'কিওয়ে' },
  { id: 'lifan',   label: 'Lifan',   labelBn: 'লিফান' },
  { id: 'zongshen', label: 'Zongshen', labelBn: 'জংশেন' },
] as const;

// Parts categories
export const PARTS_CATEGORIES = [
  { id: 'engine',      label: 'Engine Parts',      labelBn: 'ইঞ্জিন পার্টস',    icon: '🔧' },
  { id: 'brake',       label: 'Brake Parts',       labelBn: 'ব্রেক পার্টস',     icon: '🛑' },
  { id: 'chain',       label: 'Chain & Sprocket',  labelBn: 'চেইন ও স্প্রোকেট', icon: '⛓️' },
  { id: 'filter',      label: 'Filters',           labelBn: 'ফিল্টার',          icon: '🌀' },
  { id: 'electrical',  label: 'Electrical',        labelBn: 'ইলেকট্রিক্যাল',    icon: '⚡' },
  { id: 'body',        label: 'Body Parts',        labelBn: 'বডি পার্টস',      icon: '🪖' },
  { id: 'suspension',  label: 'Suspension',        labelBn: 'সাসপেনশন',       icon: '🔩' },
  { id: 'other',       label: 'Other',             labelBn: 'অন্যান্য',         icon: '📦' },
] as const;

// CSV Template types for download
export const CSV_TEMPLATES = [
  { id: 'motorcycle-models', label: 'Motorcycle Models',  labelBn: 'মোটরসাইকেল মডেল', icon: '🏍️', filename: 'motorcycle_models_template.csv' },
  { id: 'suppliers',         label: 'Suppliers',          labelBn: 'সাপ্লায়ার',      icon: '🏭', filename: 'suppliers_template.csv' },
  { id: 'products',          label: 'Products',           labelBn: 'পণ্য',            icon: '📦', filename: 'products_template.csv' },
  { id: 'inventory',         label: 'Inventory',          labelBn: 'ইনভেন্টরি',      icon: '📋', filename: 'inventory_template.csv' },
  { id: 'sales-history',     label: 'Sales History',      labelBn: 'বিক্রয় ইতিহাস', icon: '📊', filename: 'sales_history_template.csv' },
  { id: 'purchase-history',  label: 'Purchase History',   labelBn: 'ক্রয় ইতিহাস',   icon: '🛒', filename: 'purchase_history_template.csv' },
  { id: 'seasonal-events',   label: 'Seasonal Events',    labelBn: 'ঋতুভিত্তিক ইভেন্ট', icon: '📅', filename: 'seasonal_events_template.csv' },
] as const;

// --- Store Interface ---

interface OnboardingState {
  // Current step
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  
  // Step 1: Business Profile selections
  selectedBrands: string[];
  selectedCategories: string[];
  businessType: string;
  
  // Step 2: Template downloads tracked
  downloadedTemplates: string[];
  
  // Step 3: Upload status
  hasUploadedData: boolean;
  uploadedFiles: string[];
  usedDemoData: boolean;
  
  // Step 4: Forecast
  hasSeenForecast: boolean;
  
  // AC-ID (set after signup)
  acId: string;
  
  // Actions
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipStep: () => void;
  completeStep: (step: OnboardingStep) => void;
  goToDashboard: () => void;
  
  // Step 1 actions
  toggleBrand: (brandId: string) => void;
  toggleCategory: (catId: string) => void;
  setBusinessType: (type: string) => void;
  
  // Step 2 actions
  markTemplateDownloaded: (templateId: string) => void;
  
  // Step 3 actions
  setUploadedData: (files: string[]) => void;
  setUsedDemoData: () => void;
  
  // Step 4 actions
  setHasSeenForecast: () => void;
  
  // Set AC-ID
  setAcId: (acId: string) => void;
  
  // Reset
  resetOnboarding: () => void;
}

const getStepIndex = (step: OnboardingStep) => ONBOARDING_STEPS.indexOf(step);

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentStep: 'welcome',
      completedSteps: [],
      selectedBrands: [],
      selectedCategories: [],
      businessType: '',
      downloadedTemplates: [],
      hasUploadedData: false,
      uploadedFiles: [],
      usedDemoData: false,
      hasSeenForecast: false,
      acId: '',

      // Navigation
      setStep: (step) => set({ currentStep: step }),
      
      nextStep: () => {
        const { currentStep, completedSteps } = get();
        const idx = getStepIndex(currentStep);
        const nextIdx = idx + 1;
        
        // Mark current step as completed
        const newCompleted = completedSteps.includes(currentStep)
          ? completedSteps
          : [...completedSteps, currentStep];
        
        if (nextIdx < ONBOARDING_STEPS.length) {
          set({ currentStep: ONBOARDING_STEPS[nextIdx], completedSteps: newCompleted });
        } else {
          // All steps done — go to dashboard
          set({ completedSteps: newCompleted, hasSeenForecast: true });
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        const idx = getStepIndex(currentStep);
        if (idx > 0) {
          set({ currentStep: ONBOARDING_STEPS[idx - 1] });
        }
      },

      skipStep: () => {
        // Same as next but explicitly marks as skipped (still moves forward)
        get().nextStep();
      },

      completeStep: (step) => {
        const { completedSteps } = get();
        if (!completedSteps.includes(step)) {
          set({ completedSteps: [...completedSteps, step] });
        }
      },

      goToDashboard: () => {
        // Mark all remaining steps as completed
        set({
          completedSteps: [...ONBOARDING_STEPS],
          hasSeenForecast: true,
        });
      },

      // Step 1: Business Profile
      toggleBrand: (brandId) => {
        const { selectedBrands } = get();
        set({
          selectedBrands: selectedBrands.includes(brandId)
            ? selectedBrands.filter(b => b !== brandId)
            : [...selectedBrands, brandId],
        });
      },

      toggleCategory: (catId) => {
        const { selectedCategories } = get();
        set({
          selectedCategories: selectedCategories.includes(catId)
            ? selectedCategories.filter(c => c !== catId)
            : [...selectedCategories, catId],
        });
      },

      setBusinessType: (type) => set({ businessType: type }),

      // Step 2: Templates
      markTemplateDownloaded: (templateId) => {
        const { downloadedTemplates } = get();
        if (!downloadedTemplates.includes(templateId)) {
          set({ downloadedTemplates: [...downloadedTemplates, templateId] });
        }
      },

      // Step 3: Upload
      setUploadedData: (files) => set({ hasUploadedData: true, uploadedFiles: files }),
      setUsedDemoData: () => set({ hasUploadedData: true, usedDemoData: true }),

      // Step 4: Forecast
      setHasSeenForecast: () => set({ hasSeenForecast: true }),

      // AC-ID
      setAcId: (acId) => set({ acId }),

      // Reset
      resetOnboarding: () => set({
        currentStep: 'welcome',
        completedSteps: [],
        selectedBrands: [],
        selectedCategories: [],
        businessType: '',
        downloadedTemplates: [],
        hasUploadedData: false,
        uploadedFiles: [],
        usedDemoData: false,
        hasSeenForecast: false,
        acId: '',
      }),
    }),
    {
      name: 'trimedcast-onboarding',
      // Only persist key fields
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        selectedBrands: state.selectedBrands,
        selectedCategories: state.selectedCategories,
        businessType: state.businessType,
        downloadedTemplates: state.downloadedTemplates,
        hasUploadedData: state.hasUploadedData,
        usedDemoData: state.usedDemoData,
        hasSeenForecast: state.hasSeenForecast,
        acId: state.acId,
      }),
    }
  )
);
