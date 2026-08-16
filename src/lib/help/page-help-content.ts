// ============================================
// Page Help Content — Bangla & English help
// content for every page in TrimedCast
// ============================================

import type { DashboardPage } from '@/lib/dashboard/store';

export interface PageHelpContent {
  page: DashboardPage;
  title: string;
  titleBn: string;
  summary: string;
  summaryBn: string;
  sections: HelpSection[];
  tips: string[];
  tipsBn: string[];
}

export interface HelpSection {
  title: string;
  titleBn: string;
  content: string;
  contentBn: string;
}

export const PAGE_HELP: Record<DashboardPage, PageHelpContent> = {
  overview: {
    page: 'overview',
    title: 'Dashboard',
    titleBn: 'ড্যাশবোর্ড',
    summary: 'Your command center. See KPIs, S&OP progress, current season, urgent orders, and recent forecasts at a glance.',
    summaryBn: 'আপনার কমান্ড সেন্টার। KPI, S&OP অগ্রগতি, বর্তমান ঋতু, জরুরি অর্ডার এবং সাম্প্রতিক ফোরকাস্ট একনজরে দেখুন।',
    sections: [
      {
        title: 'S&OP Progress Bar',
        titleBn: 'S&OP প্রগ্রেস বার',
        content: 'Shows which stage of the Sales & Operations Planning cycle you are in: Validation, Approval, Operationalization, or Governance. Move through stages by completing required actions.',
        contentBn: 'আপনি S&OP সাইকেলের কোন ধাপে আছেন তা দেখায়: Validation, Approval, Operationalization, বা Governance। প্রয়োজনীয় কাজ সম্পন্ন করে ধাপে এগিয়ে যান।',
      },
      {
        title: 'KPI Cards',
        titleBn: 'KPI কার্ড',
        content: 'Total SKUs, Stock Value (BDT), Stockout Risk count, Overstock count, Pending Purchase Orders, and Pending Sales Orders. These update every 60 seconds.',
        contentBn: 'মোট SKU, স্টক ভ্যালু (BDT), স্টকআউট রিস্ক সংখ্যা, ওভারস্টক সংখ্যা, পেন্ডিং পারচেজ অর্ডার এবং পেন্ডিং সেলস অর্ডার। প্রতি ৬০ সেকেন্ডে আপডেট হয়।',
      },
      {
        title: 'Season Indicator',
        titleBn: 'ঋতু সূচক',
        content: 'Shows current BD season (Winter/Summer/Monsoon/Pre-Winter) and days until next season. Critical for understanding demand patterns.',
        contentBn: 'বর্তমান BD ঋতু (শীত/গ্রম/মৌসুম/শীতপূর্ব) এবং পরবর্তী ঋতুতে কত দিন দেখায়। ডিমান্ড প্যাটার্ন বোঝার জন্য গুরুত্বপূর্ণ।',
      },
      {
        title: 'Urgent Orders',
        titleBn: 'জরুরি অর্ডার',
        content: 'Orders that need immediate attention — either stockout imminent or CNY risk flagged. Act on these first.',
        contentBn: 'যেসব অর্ডার তাৎক্ষণিক দরকার — স্টকআউট আসন্ন বা CNY রিস্ক ফ্ল্যাগড। এগুলো আগে সমাধান করুন।',
      },
    ],
    tips: [
      'Start every work session by reviewing urgent orders',
      'Check S&OP progress to know what actions are needed',
      'KPIs refresh every 60 seconds — no need to reload',
    ],
    tipsBn: [
      'প্রতি ওয়ার্ক সেশন শুরুতে জরুরি অর্ডার রিভিউ করুন',
      'কী কাজ দরকার তা জানতে S&OP প্রগ্রেস চেক করুন',
      'KPI প্রতি ৬০ সেকেন্ডে রিফ্রেশ হয় — রিলোড লাগবে না',
    ],
  },

  forecast: {
    page: 'forecast',
    title: 'Forecast',
    titleBn: 'ফোরকাস্ট',
    summary: 'The brain of TrimedCast. Multiple models (Prophet, ETS, Regression) combine into a Consensus Forecast. Compare models, see seasonal patterns, run What-If scenarios, and ask AI.',
    summaryBn: 'TrimedCast-এর মস্তিষ্ক। একাধিক মডেল (Prophet, ETS, Regression) একটি Consensus Forecast-এ কম্বাইন হয়। মডেল তুলনা, সিজনাল প্যাটার্ন, What-If সিনারিও এবং AI প্রশ্ন।',
    sections: [
      {
        title: 'Consensus Forecast',
        titleBn: 'কনসেনসাস ফোরকাস্ট',
        content: 'The combined prediction from all models. This is your primary forecast to trust. It balances strengths of Prophet (seasonality), ETS (trend), and Regression (price/promo).',
        contentBn: 'সব মডেলের সম্মিলিত প্রেডিকশন। এটিই আপনার প্রধান ফোরকাস্ট। Prophet (সিজনালিটি), ETS (ট্রেন্ড) এবং Regression (প্রাইস/প্রোমো)-এর শক্তি ব্যালেন্স করে।',
      },
      {
        title: 'Compare Models',
        titleBn: 'মডেল তুলনা',
        content: 'See Prophet vs ETS vs Regression side-by-side with MAPE accuracy. If one model has much lower MAPE, it may be better for that specific product.',
        contentBn: 'Prophet vs ETS vs Regression পাশাপাশি MAPE নির্ভুলতাসহ দেখুন। কোন মডেলের MAPE অনেক কম হলে, সেই প্রোডাক্টের জন্য সেটাই ভালো।',
      },
      {
        title: 'Promo Impact',
        titleBn: 'প্রোমো ইম্প্যাক্ট',
        content: 'See how Eid discounts, seasonal sales, and flash deals affect demand. The promo index slider lets you test different discount levels.',
        contentBn: 'ঈদ ছাড়, সিজনাল সেল এবং ফ্ল্যাশ ডিল ডিমান্ডে কীভাবে প্রভাব ফেলে তা দেখুন। প্রোমো ইনডেক্স স্লাইডার দিয়ে ভিন্ন ডিসকাউন্ট টেস্ট করুন।',
      },
      {
        title: 'What-If Scenarios',
        titleBn: 'What-If সিনারিও',
        content: 'Test scenarios: "What if lead time increases by 20 days?", "What if we switch from Sea to Air?", "What if service level changes to 99%?". See impact on safety stock and order triggers.',
        contentBn: 'সিনারিও টেস্ট: "লিড টাইম ২০ দিন বাড়লে?", "Sea থেকে Air-এ গেলে?", "সার্ভিস লেভেল ৯৯% হলে?"। সেফটি স্টক ও অর্ডার ট্রিগারে প্রভাব দেখুন।',
      },
      {
        title: 'Advanced Models',
        titleBn: 'অ্যাডভান্সড মডেল',
        content: 'Prophet decomposition (trend + seasonality + holidays), EOQ/Safety Stock calculations, service level table, and stock projection.',
        contentBn: 'Prophet ডিকম্পোজিশন (ট্রেন্ড + সিজনালিটি + ছুটির দিন), EOQ/সেফটি স্টক ক্যালকুলেশন, সার্ভিস লেভেল টেবিল এবং স্টক প্রজেকশন।',
      },
      {
        title: 'AI Query',
        titleBn: 'AI প্রশ্ন',
        content: 'Ask questions in natural language about your supply chain. Examples: "Which parts have highest demand before Eid?", "What is the CNY risk for February orders?"',
        contentBn: 'আপনার সাপ্লাই চেইন সম্পর্কে প্রাকৃতিক ভাষায় প্রশ্ন করুন। উদাহরণ: "ঈদের আগে কোন পার্টগুলো সবচেয়ে বেশি চাহিদা হবে?", "ফেব্রুয়ারি অর্ডারে CNY রিস্ক কত?"',
      },
    ],
    tips: [
      'Always start with Consensus — it is the most reliable',
      'If MAPE > 15%, consider recalibrating the model',
      'Use What-If before making big decisions',
      'The AI understands BD market context — ask freely',
    ],
    tipsBn: [
      'সবসময় Consensus দিয়ে শুরু করুন — এটাই সবচেয়ে নির্ভরযোগ্য',
      'MAPE > 15% হলে মডেল রিক্যালিব্রেট করুন',
      'বড় সিদ্ধান্তের আগে What-If ব্যবহার করুন',
      'AI BD মার্কেট বোঝে — স্বাধীনভাবে প্রশ্ন করুন',
    ],
  },

  orders: {
    page: 'orders',
    title: 'Order Triggers',
    titleBn: 'অর্ডার ট্রিগার',
    summary: 'THE primary output. Tells you WHEN to order, WHAT to order, and HOW MUCH. Each recommendation considers lead time, safety stock, inventory, and CNY risk.',
    summaryBn: 'প্রধান আউটপুট। কখন অর্ডার দিতে হবে, কী দিতে হবে, কতটুকু দিতে হবে — সব বলে দেয়। লিড টাইম, সেফটি স্টক, ইনভেন্ট্রি এবং CNY রিস্ক বিবেচনা করে।',
    sections: [
      {
        title: 'Recommended Orders',
        titleBn: 'রেকমেন্ডেড অর্ডার',
        content: 'A table of all order recommendations with product, quantity, trigger date, urgency, and shipment mode. Click "Convert to PO" to create a Purchase Order.',
        contentBn: 'সব অর্ডার রেকমেন্ডেশনের টেবিল — প্রোডাক্ট, কোয়ান্টিটি, ট্রিগার ডেট, জরুরি এবং শিপিং মোড। "Convert to PO" ক্লিক করে PO তৈরি করুন।',
      },
      {
        title: 'Order Timeline (Gantt)',
        titleBn: 'অর্ডার টাইমলাইন (গ্যান্ট)',
        content: 'Visual Gantt chart showing when each order was placed, when it is in transit, and when it will arrive. See the full pipeline at a glance.',
        contentBn: 'ভিজুয়াল গ্যান্ট চার্ট — কোন অর্ডার কখন দেওয়া হয়েছে, ট্রানজিটে কখন, কখন আসবে। পুরো পাইপলাইন একনজরে।',
      },
      {
        title: 'CNY Risk',
        titleBn: 'CNY রিস্ক',
        content: 'Orders that are at risk from Chinese New Year factory shutdown (Jan 20 - Feb 20). These need to be placed BEFORE the shutdown or switched to Air freight.',
        contentBn: 'চাইনিজ নিউ ইয়ার শাটডাউনের (২০ জানু - ২০ ফেব) কারণে যেসব অর্ডার বিপদে। শাটডাউনের আগে অর্ডার দিন বা Air ফ্রেইট ব্যবহার করুন।',
      },
      {
        title: 'Seasonal Best',
        titleBn: 'সিজনাল বেস্ট',
        content: 'The most important orders for the current and upcoming season. Prioritize these to avoid seasonal stockouts.',
        contentBn: 'বর্তমান ও আগামী ঋতুর সবচেয়ে গুরুত্বপূর্ণ অর্ডার। সিজনাল স্টকআউট এড়াতে এগুলো অগ্রাধিকার দিন।',
      },
    ],
    tips: [
      'Check this page daily — it is your action list',
      'Red CNY flags mean order NOW or face 30-60 day delay',
      'Convert to PO directly from the recommendations table',
      'Urgency: Critical > High > Normal > Low',
    ],
    tipsBn: [
      'প্রতিদিন এই পেজ চেক করুন — এটাই আপনার অ্যাকশন লিস্ট',
      'লাল CNY ফ্ল্যাগ মানে এখনই অর্ডার দিন বা ৩০-৬০ দিন দেরি হবে',
      'রেকমেন্ডেশন টেবিল থেকে সরাসরি PO কনভার্ট করুন',
      'জরুরি: Critical > High > Normal > Low',
    ],
  },

  inventory: {
    page: 'inventory',
    title: 'Inventory',
    titleBn: 'ইনভেন্ট্রি',
    summary: 'Full visibility into stock levels. Color-coded grid (green=healthy, yellow=low, red=stockout). Compare Sea vs Air, calculate EOQ and Safety Stock, project future positions.',
    summaryBn: 'স্টক লেভেলের পূর্ণ দৃশ্যমানতা। কালার-কোডেড গ্রিড (সবুজ=সুস্থ, হলুদ=কম, লাল=স্টকআউট)। Sea vs Air তুলনা, EOQ ও সেফটি স্টক, ভবিষ্যৎ প্রজেকশন।',
    sections: [
      {
        title: 'Inventory Grid',
        titleBn: 'ইনভেন্ট্রি গ্রিড',
        content: 'Visual grid of all SKUs with stock level, status color, reorder point, and safety stock. Filter by category, search by name, sort by stock level.',
        contentBn: 'সব SKU-এর ভিজুয়াল গ্রিড — স্টক লেভেল, স্ট্যাটাস কালার, রিঅর্ডার পয়েন্ট এবং সেফটি স্টক। ক্যাটাগরি ফিল্টার, নাম সার্চ, লেভেল সর্ট।',
      },
      {
        title: 'Sea vs Air Shipping',
        titleBn: 'Sea vs Air শিপিং',
        content: 'Compare total cost and lead time between Sea freight (~90 days) and Air freight (~35 days). Air costs more but saves 55 days — critical for stockout emergencies.',
        contentBn: 'Sea ফ্রেইট (~৯০ দিন) এবং Air ফ্রেইট (~৩৫ দিন)-এর মোট খরচ ও লিড টাইম তুলনা। Air বেশি খরচ কিন্তু ৫৫ দিন বাঁচায় — স্টকআউট জরুরির জন্য।',
      },
      {
        title: 'EOQ & Safety Stock',
        titleBn: 'EOQ ও সেফটি স্টক',
        content: 'Economic Order Quantity tells you the optimal order size. Safety Stock tells you the minimum buffer. Both consider demand variability and lead time uncertainty.',
        contentBn: 'অর্থনৈতিক অর্ডার কোয়ান্টিটি সঠিক অর্ডার সাইজ বলে। সেফটি স্টক ন্যূনতম বাফার বলে। দুটোই ডিমান্ড পরিবর্তনশীলতা ও লিড টাইম অনিশ্চয়তা বিবেচনা করে।',
      },
      {
        title: 'Service Levels',
        titleBn: 'সার্ভিস লেভেল',
        content: 'Percentage of demand you can meet from stock. 95% is typical, 99% for critical parts. Higher service level = more safety stock = more capital tied up.',
        contentBn: 'স্টক থেকে আপনি কত % ডিমান্ড মেটাতে পারেন। ৯৫% সাধারণ, ৯৯% জরুরি পার্টের জন্য। বেশি সার্ভিস লেভেল = বেশি সেফটি স্টক = বেশি মূলধন।',
      },
    ],
    tips: [
      'Red items need action today',
      'Sea is 3-4x cheaper than Air — use Air only for emergencies',
      'EOQ minimizes total cost (ordering + holding)',
      'Safety stock formula: SS = k * sqrt(mu_t * sigma_d^2 + mu_d^2 * sigma_t^2)',
    ],
    tipsBn: [
      'লাল আইটেম আজই অ্যাকশন চায়',
      'Sea, Air-এর তুলনায় ৩-৪ গুণ সস্তা — Air শুধু জরুরির জন্য',
      'EOQ মোট খরচ (অর্ডারিং + হোল্ডিং) কমায়',
      'সেফটি স্টক ফর্মুলা: SS = k * sqrt(mu_t * sigma_d^2 + mu_d^2 * sigma_t^2)',
    ],
  },

  import: {
    page: 'import',
    title: 'Import Data',
    titleBn: 'ইম্পোর্ট ডেটা',
    summary: '7-step wizard for uploading Excel/CSV files. Supports 7 import types. IMPORTANT: Follow the import order — Models > Suppliers > Products > Inventory > Sales > Purchases > Promos.',
    summaryBn: 'Excel/CSV আপলোডের ৭-ধাপী উইজার্ড। ৭ ধরনের ইম্পোর্ট। গুরুত্বপূর্ণ: ক্রম মানে — Models > Suppliers > Products > Inventory > Sales > Purchases > Promos।',
    sections: [
      {
        title: 'Step 1: Select Type',
        titleBn: 'ধাপ ১: টাইপ নির্বাচন',
        content: 'Choose what type of data you are importing: Motorcycle Models, Suppliers, Products, Inventory, Sales History, Purchase History, or Promo Events.',
        contentBn: 'কী ধরনের ডেটা ইম্পোর্ট করছেন তা বেছে নিন: মটরসাইকেল মডেল, সাপ্লায়ার, প্রোডাক্ট, ইনভেন্ট্রি, সেলস হিস্ট্রি, পারচেস হিস্ট্রি বা প্রোমো ইভেন্ট।',
      },
      {
        title: 'Step 2: Upload File',
        titleBn: 'ধাপ ২: ফাইল আপলোড',
        content: 'Drag-and-drop or browse for your Excel (.xlsx/.xls) or CSV file. Maximum file size depends on your plan.',
        contentBn: 'আপনার Excel (.xlsx/.xls) বা CSV ফাইল ড্র্যাগ-অ্যান্ড-ড্রপ বা ব্রাউজ করুন। সর্বোচ্চ ফাইল সাইজ আপনার প্ল্যানের উপর নির্ভর করে।',
      },
      {
        title: 'Step 3: Map Columns',
        titleBn: 'ধাপ ৩: কলাম ম্যাপিং',
        content: 'System auto-maps your Excel headers to TrimedCast fields using fuzzy matching. Verify and adjust any incorrect mappings. All required fields must be mapped.',
        contentBn: 'সিস্টেম আপনার এক্সেল হেডার TrimedCast ফিল্ডে ফাজি ম্যাচিং দিয়ে অটো-ম্যাপ করে। ভুল ম্যাপিং ঠিক করুন। সব আবশ্যক ফিল্ড ম্যাপ হতে হবে।',
      },
      {
        title: 'Step 4: Validate',
        titleBn: 'ধাপ ৪: ভ্যালিডেশন',
        content: 'System checks data quality: missing required fields, wrong types, out-of-range values, invalid enums. Critical errors block progress; warnings can be acknowledged.',
        contentBn: 'সিস্টেম ডেটা মান চেক করে: অনুপস্থিত আবশ্যক ফিল্ড, ভুল টাইপ, সীমার বাইরে, অবৈধ এনাম। ক্রিটিক্যাল ত্রুটি আটকায়; ওয়ার্নিং স্বীকার করা যায়।',
      },
      {
        title: 'Step 5: Harmonize',
        titleBn: 'ধাপ ৫: হারমোনাইজেশন',
        content: 'BD-specific transforms: auto-tag seasons, deduplicate rows, normalize SKU codes, cleanse promo effects, fill date gaps. This makes your data forecast-ready.',
        contentBn: 'BD-স্পেসিফিক ট্রান্সফর্ম: ঋতু অটো-ট্যাগ, ডুপ্লিকেট সরানো, SKU নরমালাইজ, প্রোমো ক্লিন, তারিখ গ্যাপ ফিল। ডেটা ফোরকাস্ট-রেডি করে।',
      },
      {
        title: 'Step 6: Insert',
        titleBn: 'ধাপ ৬: ইনসার্ট',
        content: 'Data is inserted into the database in batches of 5000 rows. See live progress with inserted/skipped/error counts.',
        contentBn: 'ডেটা ৫০০০ সারির ব্যাচে ডেটাবেসে ঢোকানো হয়। লাইভ প্রগ্রেস — ইনসার্ট/স্কিপ/ত্রুটি সংখ্যা।',
      },
      {
        title: 'Step 7: Complete',
        titleBn: 'ধাপ ৭: সম্পন্ন',
        content: 'Summary with quality score (0-100), row statistics, and option to start a new import or view import history.',
        contentBn: 'কোয়ালিটি স্কোর (০-১০০), সারি পরিসংখ্যান এবং নতুন ইম্পোর্ট বা ইম্পোর্ট হিস্ট্রি দেখার বিকল্প।',
      },
    ],
    tips: [
      'IMPORT ORDER MATTERS: Models > Suppliers > Products > Inventory > Sales > Purchases > Promos',
      'Sales History is the most important — it drives all forecasts',
      'Use DD/MM/YYYY date format for BD data',
      'System auto-detects Bangla column headers',
      'Quality score above 80 is good, above 90 is excellent',
    ],
    tipsBn: [
      'ক্রম গুরুত্বপূর্ণ: Models > Suppliers > Products > Inventory > Sales > Purchases > Promos',
      'Sales History সবচেয়ে গুরুত্বপূর্ণ — সব ফোরকাস্ট এর উপর নির্ভর',
      'BD ডেটার জন্য DD/MM/YYYY তারিখ ফরম্যাট ব্যবহার করুন',
      'সিস্টেম বাংলা কলাম হেডার অটো-ডিটেক্ট করে',
      'কোয়ালিটি স্কোর ৮০ উপরে ভালো, ৯০ উপরে উত্তম',
    ],
  },

  suppliers: {
    page: 'suppliers',
    title: 'Suppliers',
    titleBn: 'সাপ্লায়ার',
    summary: 'Your supplier master data — primarily China-based manufacturers. See lead times, reliability scores, and CNY impact status.',
    summaryBn: 'আপনার সরবরাহকারীর ডেটা — মূলত চীন-ভিত্তিক ম্যানুফ্যাকচারার। লিড টাইম, নির্ভরযোগ্যতা স্কোর এবং CNY প্রভাব দেখুন।',
    sections: [
      {
        title: 'Supplier Summary',
        titleBn: 'সাপ্লায়ার সারাংশ',
        content: 'Total suppliers, average lead time, average reliability score, and count of CNY-affected suppliers. Quick overview of your supply base.',
        contentBn: 'মোট সাপ্লায়ার, গড় লিড টাইম, গড় নির্ভরযোগ্যতা স্কোর এবং CNY-প্রভাবিত সাপ্লায়ার সংখ্যা। সাপ্লাই বেসের দ্রুত ওভারভিউ।',
      },
    ],
    tips: [
      'Flag all China suppliers as CNY-affected',
      'Reliability below 0.7 means frequent late deliveries',
      'Review before January — place CNY-risk orders early',
    ],
    tipsBn: [
      'সব চীন সাপ্লায়ার CNY-প্রভাবিত হিসেবে চিহ্নিত করুন',
      'নির্ভরযোগ্যতা ০.৭ এর নিচে মানে প্রায়ই দেরি হয়',
      'জানুয়ারির আগে রিভিউ করুন — CNY-রিস্ক অর্ডার আগে দিন',
    ],
  },

  analytics: {
    page: 'analytics',
    title: 'Analytics',
    titleBn: 'অ্যানালিটিক্স',
    summary: 'Deep-dive analysis tools: Sea vs Air comparison, promo impact slider, What-If scenarios, decomposition, recalibration, seasonal grid, and CNY calendar.',
    summaryBn: 'গভীর বিশ্লেষণ টুল: Sea vs Air তুলনা, প্রোমো স্লাইডার, What-If সিনারিও, ডিকম্পোজিশন, রিক্যালিব্রেশন, সিজনাল গ্রিড এবং CNY ক্যালেন্ডার।',
    sections: [
      {
        title: 'Promo Slider',
        titleBn: 'প্রোমো স্লাইডার',
        content: 'Slide the promo index to see how different discount levels affect demand. Test "What if we do 20% Eid discount?" before committing.',
        contentBn: 'প্রোমো ইনডেক্স স্লাইড করে ভিন্ন ডিসকাউন্টে ডিমান্ড কীভাবে বদলায় দেখুন। "ঈদে ২০% ছাড় দিলে?" কমিটের আগে টেস্ট।',
      },
      {
        title: 'CNY Calendar',
        titleBn: 'CNY ক্যালেন্ডার',
        content: 'Visual calendar showing the Chinese New Year shutdown window (Jan 20 - Feb 20) and which orders are at risk.',
        contentBn: 'চাইনিজ নিউ ইয়ার শাটডাউন উইন্ডো (২০ জানু - ২০ ফেব) এবং কোন অর্ডার বিপদে তা দেখায়।',
      },
    ],
    tips: [
      'Use promo slider before running any marketing campaign',
      'Recalibration fixes forecast drift — run monthly',
      'Seasonal grid reveals which months spike for each category',
    ],
    tipsBn: [
      'মার্কেটিং ক্যাম্পেইনের আগে প্রোমো স্লাইডার ব্যবহার করুন',
      'রিক্যালিব্রেশন ফোরকাস্ট ড্রিফট ঠিক করে — মাসে একবার চালান',
      'সিজনাল গ্রিড দেখায় কোন মাসে কোন ক্যাটাগরি বাড়ে',
    ],
  },

  soe: {
    page: 'soe',
    title: 'S&OE Tower',
    titleBn: 'S&OE টাওয়ার',
    summary: 'Your 0-3 month operational control center. Stockout alerts, MAPE breaches, pending deliveries, demand forecasts, and critical actions for immediate attention.',
    summaryBn: '০-৩ মাসের অপারেশনাল কন্ট্রোল সেন্টার। স্টকআউট অ্যালার্ট, MAPE ব্রিচ, পেন্ডিং ডেলিভারি, ডিমান্ড ফোরকাস্ট এবং তাৎক্ষণিক ক্রিয়া।',
    sections: [
      {
        title: 'Stockout Alerts',
        titleBn: 'স্টকআউট অ্যালার্ট',
        content: 'Products that will run out of stock within the 0-3 month horizon. These need immediate ordering action.',
        contentBn: '০-৩ মাসের মধ্যে যেসব প্রোডাক্ট শেষ হয়ে যাবে। এগুলো তাৎক্ষণিক অর্ডার চায়।',
      },
      {
        title: 'MAPE Breaches',
        titleBn: 'MAPE ব্রিচ',
        content: 'Forecasts where accuracy has dropped below threshold. These models need recalibration.',
        contentBn: 'ফোরকাস্ট যেখানে নির্ভুলতা সীমার নিচে নেমেছে। এই মডেলগুলো রিক্যালিব্রেট করতে হবে।',
      },
      {
        title: 'Critical Actions',
        titleBn: 'ক্রিটিক্যাল অ্যাকশন',
        content: 'Items that need your attention right now — expediting, converting orders, adjusting forecasts.',
        contentBn: 'এখনই দরকারি কাজ — এক্সপিডাইট, অর্ডার কনভার্ট, ফোরকাস্ট ঠিক করা।',
      },
    ],
    tips: [
      'Check this FIRST every day — it is your early warning system',
      'Stockout alerts are the most critical items',
      'MAPE breaches mean your forecasts are drifting — recalibrate',
    ],
    tipsBn: [
      'প্রতিদিন আগে এটি চেক করুন — এটাই আপনার আগাম সতর্কতা',
      'স্টকআউট অ্যালার্ট সবচেয়ে জরুরি',
      'MAPE ব্রিচ মানে ফোরকাস্ট ভাসছে — রিক্যালিব্রেট করুন',
    ],
  },

  'ai-assistant': {
    page: 'ai-assistant',
    title: 'AI Assistant',
    titleBn: 'AI অ্যাসিস্ট্যান্ট',
    summary: 'Ask questions about your supply chain in natural language. AI understands BD market context, seasonal patterns, and your data.',
    summaryBn: 'প্রাকৃতিক ভাষায় সাপ্লাই চেইন সম্পর্কে প্রশ্ন করুন। AI BD মার্কেট কনটেক্সট, সিজনাল প্যাটার্ন এবং আপনার ডেটা বোঝে।',
    sections: [
      {
        title: 'Natural Language Queries',
        titleBn: 'প্রাকৃতিক ভাষা প্রশ্ন',
        content: 'Ask anything: "Which parts spike before Eid?", "What is the CNY risk?", "Compare sea vs air for piston kit". AI uses your real data to answer.',
        contentBn: 'যেকোনো কিছু জিজ্ঞেস করুন: "ঈদের আগে কোন পার্ট বাড়ে?", "CNY রিস্ক কত?", "পিস্টন কিটের Sea vs Air তুলনা"। AI আপনার ডেটা থেকে উত্তর দেয়।',
      },
    ],
    tips: [
      'Be specific — "piston demand next 3 months" works better than "demand"',
      'Ask about CNY risk before January',
      'AI remembers conversation context within a session',
    ],
    tipsBn: [
      'নির্দিষ্ট হন — "পিস্টন ডিমান্ড আগামী ৩ মাস" ভালো কাজ করে',
      'জানুয়ারির আগে CNY রিস্ক সম্পর্কে জিজ্ঞেস করুন',
      'AI এক সেশনে কনভার্সেশন মনে রাখে',
    ],
  },

  billing: {
    page: 'billing',
    title: 'Billing',
    titleBn: 'বিলিং',
    summary: 'Your TrimedCast subscription: current plan, usage, invoices, and payment history. Tiers: Starter, Professional, Enterprise.',
    summaryBn: 'আপনার TrimedCast সাবস্ক্রিপশন: বর্তমান প্ল্যান, ব্যবহার, ইনভয়েস এবং পেমেন্ট হিস্ট্রি। টায়ার: Starter, Professional, Enterprise।',
    sections: [
      {
        title: 'Subscription Plan',
        titleBn: 'সাবস্ক্রিপশন প্ল্যান',
        content: 'View your current plan and its limits. Starter: 500 SKUs, 50 forecasts/month. Professional: 5000 SKUs, 500 forecasts. Enterprise: Unlimited.',
        contentBn: 'বর্তমান প্ল্যান ও সীমা দেখুন। Starter: ৫০০ SKU, ৫০ ফোরকাস্ট/মাস। Professional: ৫০০০ SKU, ৫০০ ফোরকাস্ট। Enterprise: আনলিমিটেড।',
      },
    ],
    tips: [
      'Monitor usage to avoid hitting plan limits',
      'Enterprise adds 2FA, API access, and priority support',
    ],
    tipsBn: [
      'প্ল্যান সীমা এড়াতে ব্যবহার মনিটর করুন',
      'Enterprise-এ 2FA, API অ্যাক্সেস এবং প্রায়রিটি সাপোর্ট আছে',
    ],
  },

  'api-explorer': {
    page: 'api-explorer',
    title: 'API Explorer',
    titleBn: 'API এক্সপ্লোরার',
    summary: 'All REST API endpoints with request/response formats. Use for ERP integration or custom automation.',
    summaryBn: 'সব REST API এন্ডপয়েন্ট রিকোয়েস্ট/রেসপন্স ফরম্যাটসহ। ERP ইন্টিগ্রেশন বা কাস্টম অটোমেশনের জন্য।',
    sections: [
      {
        title: 'API Contract',
        titleBn: 'API কনট্র্যাক্ট',
        content: 'Browse all 58+ API endpoints organized by domain. Each shows HTTP method, path, required parameters, and response format.',
        contentBn: 'ডোমেইন অনুযায়ী ৫৮+ API এন্ডপয়েন্ট ব্রাউজ করুন। HTTP মেথড, পাথ, আবশ্যক প্যারামিটার এবং রেসপন্স ফরম্যাট দেখায়।',
      },
    ],
    tips: [
      'Use API Key authentication for service-to-service calls',
      'All endpoints are tenant-scoped — data is isolated',
    ],
    tipsBn: [
      'সার্ভিস-টু-সার্ভিস কলের জন্য API Key অথেনটিকেশন ব্যবহার করুন',
      'সব এন্ডপয়েন্ট টেন্যান্ট-স্কোপড — ডেটা আইসোলেটেড',
    ],
  },

  settings: {
    page: 'settings',
    title: 'Settings',
    titleBn: 'সেটিংস',
    summary: 'Configure system defaults: timezone, language, currency, forecast model, confidence level, notifications, and security.',
    summaryBn: 'সিস্টেম ডিফল্ট কনফিগার: টাইমজোন, ভাষা, কারেন্সি, ফোরকাস্ট মডেল, কনফিডেন্স লেভেল, নোটিফিকেশন এবং সিকিউরিটি।',
    sections: [
      {
        title: 'General Settings',
        titleBn: 'সাধারণ সেটিংস',
        content: 'Timezone (Asia/Dhaka), Language (English/Bangla), Currency (BDT). Set these once during initial setup.',
        contentBn: 'টাইমজোন (Asia/Dhaka), ভাষা (ইংরেজি/বাংলা), কারেন্সি (BDT)। প্রাথমিক সেটআপে একবার সেট করুন।',
      },
      {
        title: 'Forecast Defaults',
        titleBn: 'ফোরকাস্ট ডিফল্ট',
        content: 'Default model (Prophet/ETS/Ensemble), confidence level (95%), auto-recalibration on/off, recalibration threshold (15% MAPE).',
        contentBn: 'ডিফল্ট মডেল (Prophet/ETS/Ensemble), কনফিডেন্স লেভেল (৯৫%), অটো-রিক্যালিব্রেশন, রিক্যালিব্রেশন থ্রেশহোল্ড (১৫% MAPE)।',
      },
      {
        title: 'Notifications',
        titleBn: 'নোটিফিকেশন',
        content: 'Toggle: Stockout alerts, Order reminders, Forecast completion, CNY risk warnings. Get alerts via email or in-app.',
        contentBn: 'টগল: স্টকআউট অ্যালার্ট, অর্ডার রিমাইন্ডার, ফোরকাস্ট সম্পন্ন, CNY রিস্ক ওয়ার্নিং। ইমেইল বা ইন-অ্যাপ অ্যালার্ট।',
      },
      {
        title: 'Security',
        titleBn: 'সিকিউরিটি',
        content: '2FA (Enterprise only), Session timeout, API Key management. Keep API keys secure — they have full access to your tenant data.',
        contentBn: '2FA (Enterprise), সেশন টাইমআউট, API কী ম্যানেজমেন্ট। API কী নিরাপদ রাখুন — এগুলো আপনার টেন্যান্ট ডেটায় পূর্ণ অ্যাক্সেস আছে।',
      },
    ],
    tips: [
      'Set timezone to Asia/Dhaka first',
      'Enable auto-recalibration to keep forecasts accurate',
      'Turn on all notifications — you do not want to miss CNY warnings',
    ],
    tipsBn: [
      'আগে টাইমজোন Asia/Dhaka সেট করুন',
      'ফোরকাস্ট নির্ভুল রাখতে অটো-রিক্যালিব্রেশন চালু করুন',
      'সব নোটিফিকেশন চালু করুন — CNY ওয়ার্নিং মিস করবেন না',
    ],
  },

  help: {
    page: 'help',
    title: 'Help',
    titleBn: 'সাহায্য',
    summary: 'Your guide to using TrimedCast. Step-by-step platform walkthrough, Excel import column specifications, and per-page Bangla help.',
    summaryBn: 'TrimedCast ব্যবহারের গাইড। ধাপে ধাপে প্ল্যাটফর্ম পরিচিতি, এক্সেল ইম্পোর্ট কলাম স্পেসিফিকেশন এবং প্রতি-পেজ বাংলা সাহায্য।',
    sections: [
      {
        title: 'Step-by-Step Guide',
        titleBn: 'ধাপে ধাপে গাইড',
        content: 'Follow the phases from Data Foundation to Monitor & Optimize. Each phase has clear actions and where to find them in the platform.',
        contentBn: 'ডেটা ভিত্তি থেকে মনিটর ও অপটিমাইজ পর্যন্ত ধাপগুলো অনুসরণ করুন। প্রতি ধাপে স্পষ্ট কাজ এবং প্ল্যাটফর্মে কোথায় পাবেন তা আছে।',
      },
      {
        title: 'Import Guide',
        titleBn: 'ইম্পোর্ট গাইড',
        content: 'Detailed column specifications for each Excel import type. Follow the import order: Motorcycle Models, Suppliers, Products, Inventory, Sales History, Purchase History, Promo Events.',
        contentBn: 'প্রতি এক্সেল ইম্পোর্ট টাইপের বিস্তারিত কলাম স্পেসিফিকেশন। ইম্পোর্ট ক্রম অনুসরণ করুন: মটরসাইকেল মডেল, সাপ্লায়ার, প্রোডাক্ট, ইনভেন্ট্রি, সেলস হিস্ট্রি, পারচেস হিস্ট্রি, প্রোমো ইভেন্ট।',
      },
      {
        title: 'Page Guide',
        titleBn: 'পেজ গাইড',
        content: 'Detailed Bangla help for every page in the platform — Dashboard, Forecast, Orders, Inventory, and more.',
        contentBn: 'প্ল্যাটফর্মের প্রতিটি পেজের বিস্তারিত বাংলা সাহায্য — ড্যাশবোর্ড, ফোরকাস্ট, অর্ডার, ইনভেন্ট্রি এবং আরও অনেক কিছু।',
      },
    ],
    tips: [
      'Start with the Step-by-Step guide if you are new',
      'Use the floating "?" button for quick page-specific help',
      'Check the Import Guide before uploading any Excel file',
    ],
    tipsBn: [
      'নতুন হলে ধাপে ধাপে গাইড থেকে শুরু করুন',
      'দ্রুত পেজ-স্পেসিফিক সাহায্যের জন্য "?" বাটন ব্যবহার করুন',
      'এক্সেল ফাইল আপলোডের আগে ইম্পোর্ট গাইড দেখুন',
    ],
  },
};

// ---- Import Column Specs for Help Panel ----

export interface ImportColumnSpec {
  field: string;
  label: string;
  labelBn: string;
  required: boolean;
  type: string;
  example: string;
  noteBn?: string;
}

export interface ImportTypeHelp {
  type: string;
  label: string;
  labelBn: string;
  descriptionBn: string;
  minColumns: string;
  columns: ImportColumnSpec[];
}

export const IMPORT_HELP: ImportTypeHelp[] = [
  {
    type: 'motorcycle_models',
    label: 'Motorcycle Models',
    labelBn: 'মটরসাইকেল মডেল',
    descriptionBn: 'বাংলাদেশ মার্কেটের মটরসাইকেল ব্র্যান্ড/মডেল। প্রথমে এটি ইম্পোর্ট করুন।',
    minColumns: 'brand | model',
    columns: [
      { field: 'brand', label: 'Brand', labelBn: 'ব্র্যান্ড', required: true, type: 'Text', example: 'Bajaj', noteBn: 'Bajaj, TVS, Hero, Honda, Yamaha' },
      { field: 'model', label: 'Model', labelBn: 'মডেল', required: true, type: 'Text', example: 'Discover 100', noteBn: 'মডেলের নাম' },
      { field: 'year_start', label: 'Year Start', labelBn: 'শুরু বছর', required: false, type: 'Number', example: '2015' },
      { field: 'year_end', label: 'Year End', labelBn: 'শেষ বছর', required: false, type: 'Number', example: '2025' },
      { field: 'cc_rating', label: 'CC Rating', labelBn: 'সিসি রেটিং', required: false, type: 'Number', example: '100' },
      { field: 'segment', label: 'Segment', labelBn: 'সেগমেন্ট', required: false, type: 'Enum', example: 'commuter', noteBn: 'commuter/premium/scooter/sports/cruiser' },
    ],
  },
  {
    type: 'suppliers',
    label: 'Suppliers',
    labelBn: 'সাপ্লায়ার',
    descriptionBn: 'আপনার সরবরাহকারী — মূলত চীন-ভিত্তিক। দ্বিতীয়ে ইম্পোর্ট করুন।',
    minColumns: 'name',
    columns: [
      { field: 'name', label: 'Supplier Name', labelBn: 'সরবরাহকারীর নাম', required: true, type: 'Text', example: 'Qingdao Parts Co.' },
      { field: 'code', label: 'Code', labelBn: 'কোড', required: false, type: 'Text', example: 'SUP-QD-001' },
      { field: 'country', label: 'Country', labelBn: 'দেশ', required: false, type: 'Text', example: 'China', noteBn: 'ডিফল্ট: China' },
      { field: 'lead_time_days', label: 'Lead Time (days)', labelBn: 'লিড টাইম (দিন)', required: false, type: 'Number', example: '90', noteBn: 'ডিফল্ট: ৯০ (Sea)' },
      { field: 'reliability', label: 'Reliability (0-1)', labelBn: 'নির্ভরযোগ্যতা (০-১)', required: false, type: 'Number', example: '0.85' },
      { field: 'is_cny_affected', label: 'CNY Affected', labelBn: 'CNY প্রভাবিত', required: false, type: 'Boolean', example: 'true', noteBn: 'চীন সাপ্লায়ার = true' },
      { field: 'contact_email', label: 'Email', labelBn: 'ইমেইল', required: false, type: 'Text', example: 'sales@qdparts.cn' },
      { field: 'contact_phone', label: 'Phone', labelBn: 'ফোন', required: false, type: 'Text', example: '+86-532-8888-9999' },
    ],
  },
  {
    type: 'products',
    label: 'Products / Parts',
    labelBn: 'প্রোডাক্ট / পার্ট',
    descriptionBn: 'আপনার SKU মাস্টার ক্যাটালগ। তৃতীয়ে ইম্পোর্ট করুন। সবচেয়ে গুরুত্বপূর্ণ মাস্টার ডেটা।',
    minColumns: 'sku | name | category',
    columns: [
      { field: 'sku', label: 'SKU', labelBn: 'SKU কোড', required: true, type: 'Text', example: 'PISTON-Bajaj-100', noteBn: 'ইউনিক, স্পেস ছাড়া' },
      { field: 'name', label: 'Product Name', labelBn: 'পণ্যের নাম', required: true, type: 'Text', example: 'Bajaj Piston Kit 100cc' },
      { field: 'category', label: 'Category', labelBn: 'শ্রেণী', required: true, type: 'Enum', example: 'piston', noteBn: 'piston/gasket/chain/filter/brake_pad/...' },
      { field: 'subcategory', label: 'Subcategory', labelBn: 'উপশ্রেণী', required: false, type: 'Text', example: 'piston_ring' },
      { field: 'unit_cost', label: 'Unit Cost (BDT)', labelBn: 'ক্রয় মূল্য (BDT)', required: false, type: 'Number', example: '85.50', noteBn: 'চীন থেকে ক্রয় মূল্য' },
      { field: 'selling_price', label: 'Selling Price (BDT)', labelBn: 'বিক্রয় মূল্য (BDT)', required: false, type: 'Number', example: '150.00' },
      { field: 'unit', label: 'Unit', labelBn: 'একক', required: false, type: 'Enum', example: 'piece', noteBn: 'piece/set/pair/dozen' },
      { field: 'min_order_qty', label: 'Min Order Qty', labelBn: 'ন্যূনতম অর্ডার', required: false, type: 'Number', example: '100' },
      { field: 'lead_time_days', label: 'Lead Time (days)', labelBn: 'লিড টাইম (দিন)', required: false, type: 'Number', example: '90' },
      { field: 'is_seasonal', label: 'Is Seasonal', labelBn: 'ঋতুগত', required: false, type: 'Boolean', example: 'true' },
      { field: 'seasonality_type', label: 'Seasonality Type', labelBn: 'ঋতুগত ধরন', required: false, type: 'Enum', example: 'winter_peak', noteBn: 'winter_peak/monsoon_dip/summer_peak/pre_winter_peak' },
    ],
  },
  {
    type: 'inventory',
    label: 'Inventory / Stock',
    labelBn: 'ইনভেন্ট্রি / মজুত',
    descriptionBn: 'বর্তমান স্টক লেভেল। চতুর্থে ইম্পোর্ট করুন।',
    minColumns: 'product_sku | current_stock',
    columns: [
      { field: 'product_sku', label: 'Product SKU', labelBn: 'প্রোডাক্ট SKU', required: true, type: 'Text', example: 'PISTON-Bajaj-100', noteBn: 'Products-এর SKU-এর সাথে মিলতে হবে' },
      { field: 'current_stock', label: 'Current Stock', labelBn: 'বর্তমান মজুত', required: true, type: 'Number', example: '250', noteBn: 'ফিজিক্যাল কাউন্ট' },
      { field: 'reserved_stock', label: 'Reserved Stock', labelBn: 'সংরক্ষিত মজুত', required: false, type: 'Number', example: '50' },
      { field: 'reorder_point', label: 'Reorder Point', labelBn: 'পুনরায় অর্ডার পয়েন্ট', required: false, type: 'Number', example: '100' },
      { field: 'safety_stock', label: 'Safety Stock', labelBn: 'নিরাপদ মজুত', required: false, type: 'Number', example: '40' },
      { field: 'max_stock_level', label: 'Max Stock Level', labelBn: 'সর্বোচ্চ স্টক', required: false, type: 'Number', example: '500' },
      { field: 'warehouse_location', label: 'Warehouse Location', labelBn: 'গোডাউন অবস্থান', required: false, type: 'Text', example: 'A3-R2-S1' },
    ],
  },
  {
    type: 'sales_history',
    label: 'Sales History',
    labelBn: 'সেলস হিস্ট্রি',
    descriptionBn: 'ঐতিহাসিক বিক্রয় ডেটা। সবচেয়ে গুরুত্বপূর্ণ — ফোরকাস্টের মূল উপাত্ত। পঞ্চমে ইম্পোর্ট করুন।',
    minColumns: 'date | product_sku | quantity',
    columns: [
      { field: 'date', label: 'Sale Date', labelBn: 'বিক্রয় তারিখ', required: true, type: 'Date', example: '15/01/2025', noteBn: 'DD/MM/YYYY বা YYYY-MM-DD' },
      { field: 'product_sku', label: 'Product SKU', labelBn: 'প্রোডাক্ট SKU', required: true, type: 'Text', example: 'PISTON-Bajaj-100', noteBn: 'Products-এর SKU-এর সাথে মিলতে হবে' },
      { field: 'quantity', label: 'Quantity Sold', labelBn: 'বিক্রয় পরিমাণ', required: true, type: 'Number', example: '150', noteBn: 'ঋণাত্মক হতে পারবে না' },
      { field: 'revenue', label: 'Revenue (BDT)', labelBn: 'আয় (BDT)', required: false, type: 'Number', example: '22500' },
      { field: 'channel', label: 'Channel', labelBn: 'চ্যানেল', required: false, type: 'Enum', example: 'retail', noteBn: 'retail/wholesale/online' },
      { field: 'region', label: 'BD Region', labelBn: 'বিভাগ', required: false, type: 'Enum', example: 'dhaka', noteBn: '8 বিভাগ' },
      { field: 'invoice_no', label: 'Invoice No', labelBn: 'চালান নম্বর', required: false, type: 'Text', example: 'INV-2025-0456' },
      { field: 'customer_id', label: 'Customer ID', labelBn: 'গ্রাহক ID', required: false, type: 'Text', example: 'CUST-00789' },
      { field: 'season', label: 'Season', labelBn: 'ঋতু', required: false, type: 'Enum', example: 'winter', noteBn: 'খালি থাকলে অটো-ট্যাগ' },
    ],
  },
  {
    type: 'purchase_history',
    label: 'Purchase History',
    labelBn: 'পারচেস হিস্ট্রি',
    descriptionBn: 'ঐতিহাসিক ক্রয় অর্ডার। লিড টাইম বিশ্লেষণের জন্য। ষষ্ঠে ইম্পোর্ট করুন।',
    minColumns: 'date | product_sku | quantity',
    columns: [
      { field: 'date', label: 'PO Date', labelBn: 'PO তারিখ', required: true, type: 'Date', example: '01/12/2024' },
      { field: 'product_sku', label: 'Product SKU', labelBn: 'প্রোডাক্ট SKU', required: true, type: 'Text', example: 'PISTON-Bajaj-100' },
      { field: 'quantity', label: 'Quantity Ordered', labelBn: 'অর্ডার পরিমাণ', required: true, type: 'Number', example: '500' },
      { field: 'unit_cost', label: 'Unit Cost (BDT)', labelBn: 'একক মূল্য (BDT)', required: false, type: 'Number', example: '85.50' },
      { field: 'total_cost', label: 'Total Cost (BDT)', labelBn: 'মোট খরচ (BDT)', required: false, type: 'Number', example: '42750' },
      { field: 'supplier_name', label: 'Supplier Name', labelBn: 'সরবরাহকারী', required: false, type: 'Text', example: 'Qingdao Parts Co.' },
      { field: 'po_number', label: 'PO Number', labelBn: 'PO নম্বর', required: false, type: 'Text', example: 'PO-2024-0123' },
      { field: 'lead_time_actual', label: 'Actual Lead Time', labelBn: 'প্রকৃত লিড টাইম', required: false, type: 'Number', example: '92', noteBn: 'প্রত্যাশিত vs প্রকৃত তুলনা' },
      { field: 'season', label: 'Season', labelBn: 'ঋতু', required: false, type: 'Enum', example: 'winter' },
    ],
  },
  {
    type: 'promo_events',
    label: 'Promotional Events',
    labelBn: 'প্রোমো ইভেন্ট',
    descriptionBn: 'মার্কেটিং ক্যাম্পেইন — ঈদ ছাড়, সিজনাল সেল। সপ্তমে ইম্পোর্ট করুন।',
    minColumns: 'name | type | start_date | end_date',
    columns: [
      { field: 'name', label: 'Event Name', labelBn: 'ইভেন্টের নাম', required: true, type: 'Text', example: 'Eid ul-Fitr 2025 Sale' },
      { field: 'type', label: 'Promo Type', labelBn: 'প্রোমো ধরন', required: true, type: 'Enum', example: 'eid_discount', noteBn: 'eid_discount/seasonal_sale/clearance/flash_sale/bundle_deal/loyalty_reward' },
      { field: 'start_date', label: 'Start Date', labelBn: 'শুরু তারিখ', required: true, type: 'Date', example: '20/03/2025' },
      { field: 'end_date', label: 'End Date', labelBn: 'শেষ তারিখ', required: true, type: 'Date', example: '05/04/2025' },
      { field: 'discount_pct', label: 'Discount %', labelBn: 'ছাড় %', required: false, type: 'Number', example: '15', noteBn: '0-100' },
      { field: 'expected_uplift', label: 'Expected Uplift %', labelBn: 'প্রত্যাশিত বৃদ্ধি %', required: false, type: 'Number', example: '40', noteBn: 'ডিমান্ড কত % বাড়বে' },
    ],
  },
];

// ---- Step-by-Step Guide for Help Page ----

export interface GuideStep {
  phase: string;
  phaseBn: string;
  steps: { action: string; actionBn: string; where: string; whereBn: string }[];
}

export const PLATFORM_GUIDE: GuideStep[] = [
  {
    phase: 'Phase 1: Data Foundation',
    phaseBn: 'ধাপ ১: ডেটা ভিত্তি',
    steps: [
      { action: 'Import Motorcycle Models', actionBn: 'মটরসাইকেল মডেল ইম্পোর্ট করুন', where: 'Import Data > Motorcycle Models', whereBn: 'ইম্পোর্ট ডেটা > মটরসাইকেল মডেল' },
      { action: 'Import Suppliers', actionBn: 'সাপ্লায়ার ইম্পোর্ট করুন', where: 'Import Data > Suppliers', whereBn: 'ইম্পোর্ট ডেটা > সাপ্লায়ার' },
      { action: 'Import Products / Parts', actionBn: 'প্রোডাক্ট ইম্পোর্ট করুন', where: 'Import Data > Products / Parts', whereBn: 'ইম্পোর্ট ডেটা > প্রোডাক্ট / পার্ট' },
      { action: 'Import Inventory / Stock', actionBn: 'ইনভেন্ট্রি ইম্পোর্ট করুন', where: 'Import Data > Inventory / Stock', whereBn: 'ইম্পোর্ট ডেটা > ইনভেন্ট্রি / মজুত' },
      { action: 'Import Sales History', actionBn: 'সেলস হিস্ট্রি ইম্পোর্ট করুন', where: 'Import Data > Sales History', whereBn: 'ইম্পোর্ট ডেটা > সেলস হিস্ট্রি' },
      { action: 'Import Purchase History', actionBn: 'পারচেস হিস্ট্রি ইম্পোর্ট করুন', where: 'Import Data > Purchase History', whereBn: 'ইম্পোর্ট ডেটা > পারচেস হিস্ট্রি' },
      { action: 'Import Promo Events', actionBn: 'প্রোমো ইভেন্ট ইম্পোর্ট করুন', where: 'Import Data > Promo Events', whereBn: 'ইম্পোর্ট ডেটা > প্রোমো ইভেন্ট' },
    ],
  },
  {
    phase: 'Phase 2: Understand Your State',
    phaseBn: 'ধাপ ২: বর্তমান অবস্থা বোঝা',
    steps: [
      { action: 'Review Dashboard KPIs', actionBn: 'ড্যাশবোর্ড KPI রিভিউ করুন', where: 'Dashboard', whereBn: 'ড্যাশবোর্ড' },
      { action: 'Check S&OP Progress', actionBn: 'S&OP প্রগ্রেস চেক করুন', where: 'Dashboard > S&OP Bar', whereBn: 'ড্যাশবোর্ড > S&OP বার' },
      { action: 'View Season Indicator', actionBn: 'ঋতু সূচক দেখুন', where: 'Dashboard > Season', whereBn: 'ড্যাশবোর্ড > ঋতু' },
      { action: 'Check Inventory Levels', actionBn: 'ইনভেন্ট্রি লেভেল চেক করুন', where: 'Inventory > Inventory Grid', whereBn: 'ইনভেন্ট্রি > ইনভেন্ট্রি গ্রিড' },
    ],
  },
  {
    phase: 'Phase 3: Forecasting',
    phaseBn: 'ধাপ ৩: ফোরকাস্টিং',
    steps: [
      { action: 'Run Consensus Forecast', actionBn: 'কনসেনসাস ফোরকাস্ট চালান', where: 'Forecast > Consensus', whereBn: 'ফোরকাস্ট > কনসেনসাস' },
      { action: 'Compare Models', actionBn: 'মডেল তুলনা করুন', where: 'Forecast > Compare', whereBn: 'ফোরকাস্ট > তুলনা' },
      { action: 'Check Promo Impact', actionBn: 'প্রোমো ইম্প্যাক্ট দেখুন', where: 'Forecast > Promo', whereBn: 'ফোরকাস্ট > প্রোমো' },
      { action: 'Run What-If Scenarios', actionBn: 'What-If সিনারিও চালান', where: 'Forecast > What-If', whereBn: 'ফোরকাস্ট > What-If' },
      { action: 'Ask AI Questions', actionBn: 'AI-তে প্রশ্ন করুন', where: 'Forecast > AI', whereBn: 'ফোরকাস্ট > AI' },
    ],
  },
  {
    phase: 'Phase 4: Decision Making',
    phaseBn: 'ধাপ ৪: সিদ্ধান্ত গ্রহণ',
    steps: [
      { action: 'Review Order Triggers', actionBn: 'অর্ডার ট্রিগার রিভিউ করুন', where: 'Order Triggers > Recommended', whereBn: 'অর্ডার ট্রিগার > রেকমেন্ডেড' },
      { action: 'Check CNY Risk', actionBn: 'CNY রিস্ক চেক করুন', where: 'Order Triggers > CNY Risk', whereBn: 'অর্ডার ট্রিগার > CNY রিস্ক' },
      { action: 'Compare Sea vs Air', actionBn: 'Sea vs Air তুলনা করুন', where: 'Inventory > Sea vs Air', whereBn: 'ইনভেন্ট্রি > Sea vs Air' },
      { action: 'Convert to Purchase Order', actionBn: 'পারচেস অর্ডার কনভার্ট করুন', where: 'Order Triggers > Convert', whereBn: 'অর্ডার ট্রিগার > কনভার্ট' },
    ],
  },
  {
    phase: 'Phase 5: Monitor & Optimize',
    phaseBn: 'ধাপ ৫: মনিটর ও অপটিমাইজ',
    steps: [
      { action: 'Check S&OE Tower daily', actionBn: 'প্রতিদিন S&OE টাওয়ার চেক করুন', where: 'S&OE Tower', whereBn: 'S&OE টাওয়ার' },
      { action: 'Track Forecast Accuracy', actionBn: 'ফোরকাস্ট নির্ভুলতা ট্র্যাক করুন', where: 'Analytics', whereBn: 'অ্যানালিটিক্স' },
      { action: 'Review Audit Log', actionBn: 'অডিট লগ রিভিউ করুন', where: 'Header > Audit Log', whereBn: 'হেডার > অডিট লগ' },
      { action: 'Adjust Settings', actionBn: 'সেটিংস ঠিক করুন', where: 'Settings', whereBn: 'সেটিংস' },
    ],
  },
];
