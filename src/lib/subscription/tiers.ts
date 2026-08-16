// ============================================
// TrimedCast - Subscription Tier Definitions
// BD-specific: Free (post-trial) + Pro (12K BDT/yr)
// Complements the generic billing.ts tiers
// ============================================

// --- Tier Slugs ---
export type TrimedCastTier = 'free' | 'pro';

// --- Tier Pricing (BDT) ---
export const TIER_PRICING = {
  free: { amountBdt: 0, period: 'forever', label: 'Free' },
  pro:  { amountBdt: 12000, period: 'year', label: 'Pro — ৳12,000/yr' },
} as const;

// --- Feature List ---
// Every feature that can be gated in TrimedCast
export type GatedFeature =
  | 'forecast_months'       // How many months of forecast
  | 'max_products'          // Max products/SKUs
  | 'cny_alerts'            // CNY risk alerts
  | 'order_triggers'        // Smart order triggers
  | 'auto_recalibration'    // Auto recalibration
  | 'soe_tower'             // S&OE Control Tower
  | 'promo_simulator'       // Promo impact simulation
  | 'multi_user'            // Multiple users per AC-ID
  | 'export_reports'        // PDF/Excel export
  | 'seasonal_breakdown'    // Seasonal decomposition chart
  | 'priority_support'      // WhatsApp priority support
  | 'custom_seasonal_models' // Custom seasonality types
  | 'api_access'            // API key access
  | 'webhook_notifications' // Webhook push notifications
  | 'dashboard_sharing'     // Shareable dashboard links
  | 'data_upload'           // Upload data (always allowed)
  | 'view_forecast'         // View forecast (always allowed, but limited months);

// --- Tier Definitions ---
export interface TrimedCastTierDefinition {
  slug: TrimedCastTier;
  name: string;
  nameBn: string;
  priceBdt: number;
  priceLabel: string;
  priceLabelBn: string;
  features: GatedFeature[];
  limits: Record<string, number | boolean | null>; // null = unlimited
  maxUsers: number;   // -1 = unlimited
  maxSkus: number;    // -1 = unlimited
  forecastMonths: number; // -1 = unlimited
}

export const TIERS: Record<TrimedCastTier, TrimedCastTierDefinition> = {
  free: {
    slug: 'free',
    name: 'Free',
    nameBn: 'ফ্রি',
    priceBdt: 0,
    priceLabel: 'Free forever',
    priceLabelBn: 'চিরকাল ফ্রি',
    features: [
      'data_upload',
      'view_forecast',
    ],
    limits: {
      forecast_months: 3,
      max_products: 10,
      cny_alerts: false,
      order_triggers: false,
      auto_recalibration: false,
      soe_tower: false,
      promo_simulator: false,
      multi_user: false,
      export_reports: false,
      seasonal_breakdown: false,
      priority_support: false,
      custom_seasonal_models: false,
      api_access: false,
      webhook_notifications: false,
      dashboard_sharing: false,
    },
    maxUsers: 1,
    maxSkus: 10,
    forecastMonths: 3,
  },
  pro: {
    slug: 'pro',
    name: 'Pro',
    nameBn: 'প্রো',
    priceBdt: 12000,
    priceLabel: '৳12,000/year',
    priceLabelBn: '১২,০০০ টাকা/বছর',
    features: [
      'data_upload',
      'view_forecast',
      'cny_alerts',
      'order_triggers',
      'auto_recalibration',
      'soe_tower',
      'promo_simulator',
      'multi_user',
      'export_reports',
      'seasonal_breakdown',
      'priority_support',
      'custom_seasonal_models',
      'api_access',
      'webhook_notifications',
      'dashboard_sharing',
    ],
    limits: {
      forecast_months: 12,
      max_products: null,    // unlimited
      cny_alerts: true,
      order_triggers: true,
      auto_recalibration: true,
      soe_tower: true,
      promo_simulator: true,
      multi_user: true,
      export_reports: true,
      seasonal_breakdown: true,
      priority_support: true,
      custom_seasonal_models: true,
      api_access: true,
      webhook_notifications: true,
      dashboard_sharing: true,
    },
    maxUsers: 5,
    maxSkus: -1,    // unlimited
    forecastMonths: 12,
  },
};

// --- Feature Descriptions (for upgrade prompts) ---
export const FEATURE_DESCRIPTIONS: Record<GatedFeature, {
  label: string;
  labelBn: string;
  description: string;
  descriptionBn: string;
  icon: string;
}> = {
  forecast_months: {
    label: '12-Month Forecast',
    labelBn: '১২-মাসের পূর্বাভাসন',
    description: 'See full 12-month seasonal forecast instead of just 3 months. Essential for annual purchase planning.',
    descriptionBn: 'বার্ষিক ক্রয় পরিকল্পনার জন্য ৩ মাসের বদলে সম্পূর্ণ ১২-মাসের ঋতুভিত্তিক পূর্বাভাসন দেখুন।',
    icon: '📈',
  },
  max_products: {
    label: 'Unlimited Products',
    labelBn: 'অসীম পণ্য',
    description: 'Track all your SKUs, not just the top 10. Get forecasts for your complete inventory.',
    descriptionBn: 'শুধু ১০ টি নয়, সব SKU ট্র্যাক করুন। আপনার সম্পূর্ণ ইনভেন্টরির পূর্বাভাসন পান।',
    icon: '📦',
  },
  cny_alerts: {
    label: 'CNY Risk Alerts',
    labelBn: 'চীনা নববর্ষ ঝুঁকি সতর্কতা',
    description: 'Get alerts when Chinese suppliers shut down for Lunar New Year. Order before factory closures.',
    descriptionBn: 'চীনা সাপ্লায়ার বন্ধ হলে সতর্কতা পান। কারখানা বন্ধার আগে অর্ডার করুন।',
    icon: '🇨🇳',
  },
  order_triggers: {
    label: 'Smart Order Triggers',
    labelBn: 'স্মার্ট অর্ডার ট্রিগার',
    description: 'AI-driven reorder recommendations with priority scoring. Never miss a restock window.',
    descriptionBn: 'এআই-চালিত রিঅর্ডার সুপারিশন। কখনো রিস্টক উইন্ডো মিস করবেন না।',
    icon: '🎯',
  },
  auto_recalibration: {
    label: 'Auto Recalibration',
    labelBn: 'স্বয়ংক্রিয় পুনঃক্রমাঙ্কন',
    description: 'Forecasts automatically adjust each month as new actual sales data comes in. Keeps predictions accurate.',
    descriptionBn: 'নতুন বিক্রয় ডাটা আসলে পূর্বাভাসন স্বয়ংক্রিয়ভাবে সামঞ্জস্য করে।',
    icon: '🔄',
  },
  soe_tower: {
    label: 'S&OE Control Tower',
    labelBn: 'এসঅ্যান্ডওই কন্ট্রোল টাওয়ার',
    description: 'Full demand/supply/revenue consensus view. Align sales, procurement, and finance teams.',
    descriptionBn: 'সম্পূর্ণ চাহিদা/সরবরাহ/আয় কনসেনসাস ভিউ।',
    icon: '🗼',
  },
  promo_simulator: {
    label: 'Promo Impact Simulator',
    labelBn: 'প্রমো ইমপ্যাক্ট সিমুলেটর',
    description: 'Simulate Eid sales, winter promotions before committing. See expected uplift and ROI.',
    descriptionBn: 'ঈদ সেল, শীতকালীন প্রমোশন সিমুলেট করুন। প্রত্যাশিত বৃদ্ধি ও আরওআই দেখুন।',
    icon: '🎪',
  },
  multi_user: {
    label: 'Multi-User Access',
    labelBn: 'মাল্টি-ইউজার অ্যাক্সেস',
    description: 'Add up to 5 team members to your AC-ID. Sales, warehouse, and finance can all access.',
    descriptionBn: 'আপনার এসিআ-আইডিতে ৫ জন পর্যন্ত টিম সদস্য যোগ করুন।',
    icon: '👥',
  },
  export_reports: {
    label: 'Export Reports',
    labelBn: 'রিপোর্ট এক্সপোর্ট',
    description: 'Download forecasts, orders, and analytics as PDF or Excel. Share with suppliers and management.',
    descriptionBn: 'পূর্বাভাসন, অর্ডার পিডিএফ বা এক্সেল ডাউনলোড করুন।',
    icon: '📄',
  },
  seasonal_breakdown: {
    label: 'Seasonal Decomposition',
    labelBn: 'ঋতুভিত্তিক বিশ্লেষণ',
    description: 'See trend + seasonal + residual decomposition charts. Understand WHY demand fluctuates.',
    descriptionBn: 'ট্রেন্ড + ঋতুভিত্তিক + রেসিডুয়াল বিশ্লেষণ দেখুন।',
    icon: '📊',
  },
  priority_support: {
    label: 'Priority WhatsApp Support',
    labelBn: 'প্রায়রিটি হোয়াটসঅ্যাপ সাপোর্ট',
    description: 'Get help via WhatsApp within 2 hours during business days. Email support for everyone.',
    descriptionBn: 'ব্যবসায়িক দিনে ২ ঘন্টার মধ্যে হোয়াটসঅ্যাপে সাহায্য পান।',
    icon: '💬',
  },
  custom_seasonal_models: {
    label: 'Custom Seasonal Models',
    labelBn: 'কাস্টম ঋতুভিত্তিক মডেল',
    description: 'Define your own seasonality types beyond the defaults. Model local holidays and events.',
    descriptionBn: 'ডিফল্ট ছাড়া আপনার নিজের ঋতুভিত্তিক ধরন সংজ্ঞায়িত করুন।',
    icon: '🧮',
  },
  api_access: {
    label: 'API Access',
    labelBn: 'এপিআই অ্যাক্সেস',
    description: 'Programmatic access via REST API keys. Integrate with your POS, ERP, or custom tools.',
    descriptionBn: 'REST API কী দিয়ে প্রোগ্রাম্যাটিক অ্যাক্সেস।',
    icon: '🔑',
  },
  webhook_notifications: {
    label: 'Webhook Notifications',
    labelBn: 'ওয়েবহুক নোটিফিকেশন',
    description: 'Push notifications to your systems when orders trigger, forecasts update, or stock hits reorder point.',
    descriptionBn: 'অর্ডার ট্রিগার বা পূর্বাভাসন আপডেট হলে পুশ নোটিফিকেশন।',
    icon: '🔔',
  },
  dashboard_sharing: {
    label: 'Dashboard Sharing',
    labelBn: 'ড্যাশবোর্ড শেয়ারিং',
    description: 'Generate shareable links to your dashboard. Perfect for supplier coordination.',
    descriptionBn: 'আপনার ড্যাশবোর্ডের শেয়ারযোগ্য লিংক তৈরি করুন।',
    icon: '🔗',
  },
  data_upload: {
    label: 'Data Upload',
    labelBn: 'ডাটা আপলোড',
    description: 'Upload your sales, inventory, and purchase data via CSV or Excel.',
    descriptionBn: 'সিএসভি বা এক্সেল দিয়ে আপনার ডাটা আপলোড করুন।',
    icon: '📤',
  },
  view_forecast: {
    label: 'View Forecast',
    labelBn: 'পূর্বাভাসন দেখুন',
    description: 'See AI-powered demand forecasts for your products.',
    descriptionBn: 'আপনার পণ্যের এআই-চালিত চাহিদা পূর্বাভাসন দেখুন।',
    icon: '🔮',
  },
};

// Trial configuration
export const TRIAL_CONFIG = {
  durationDays: 14,
  label: '14-Day Free Trial',
  labelBn: '১৪-দিনের ফ্রি ট্রায়াল',
  description: 'Full access to all Pro features',
  descriptionBn: 'সব প্রো ফিচারে সম্পূর্ণ অ্যাক্সেস',
} as const;
