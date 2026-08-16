# TrimedCast — Complete Phase-by-Phase User Guide

## Bangladesh Motorcycle Parts Seasonal Demand & Inventory Forecasting System

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Getting Started — First-Time Setup](#2-getting-started--first-time-setup)
3. [Step-by-Step: Getting the Most Out of TrimedCast](#3-step-by-step-getting-the-most-out-of-trimedcast)
4. [Page-by-Page Guide with Bangla Descriptions](#4-page-by-page-guide-with-bangla-descriptions)
5. [Excel Import Column Specifications](#5-excel-import-column-specifications)
6. [Phase-by-Phase Implementation Process](#6-phase-by-phase-implementation-process)
7. [Keyboard Shortcuts & Tips](#7-keyboard-shortcuts--tips)
8. [Glossary](#8-glossary)

---

## 1. Platform Overview

**TrimedCast** is a SaaS platform built specifically for Bangladesh motorcycle parts importers who source from China. It solves three critical problems:

1. **Seasonal Demand Blindness** — You know Eid and winter spike demand, but by how much? TrimedCast quantifies it with BD-specific seasonal models.
2. **Capital Inefficiency** — Too much stock of slow-movers, stockouts on fast-movers. EOQ and Safety Stock calculations tell you the right amount.
3. **CNY Supply Chain Risk** — Chinese New Year (Jan 20 - Feb 20) shuts down factories. Orders not placed before this window get delayed 30-60 days. TrimedCast flags this automatically.

### Who Is This For?

| Role | What They Do in TrimedCast |
|------|---------------------------|
| Warehouse Manager | Checks inventory, reviews order triggers, manages stock levels |
| Sales Manager | Reviews forecasts, adjusts promo impact, tracks demand patterns |
| Marketing Manager | Sets promo events, measures uplift, runs What-If scenarios |
| Finance | Tracks billing, monitors BDT costs, reviews purchase orders |
| Executive | Views dashboard KPIs, approves S&OP cycle, reviews analytics |

### Key Concepts

- **S&OP (Sales & Operations Planning)** — A 4-stage cycle: Validation > Approval > Operationalization > Governance
- **Consensus Forecast** — Multiple forecasting models combine into one trusted number
- **Order Trigger** — The date you MUST place an order to avoid stockout
- **Safety Stock** — Buffer inventory to absorb demand variability
- **CNY Risk** — Chinese New Year shutdown period (Jan 20 - Feb 20) when Chinese factories close
- **BDT** — Bangladeshi Taka. All monetary values in the system use BDT
- **Sea vs Air** — Sea freight takes ~90 days, Air freight takes ~35 days from China to BD

---

## 2. Getting Started — First-Time Setup

### Prerequisites
- Your TrimedCast account (tenant) is created by your admin
- You have Excel/CSV files with your historical data
- You know your product SKUs and supplier details

### Setup Order (IMPORTANT — Follow This Sequence!)

The import order matters because later imports reference earlier data:

```
Step 1: Motorcycle Models     (brands/models in BD market)
Step 2: Suppliers             (your China suppliers)
Step 3: Products / Parts      (your SKU master list)
Step 4: Inventory / Stock     (current stock levels)
Step 5: Sales History         (past sales transactions)
Step 6: Purchase History      (past purchase orders)
Step 7: Promo Events          (marketing campaigns)
```

> **Why this order?** Products reference Motorcycle Models and Suppliers. Sales/Purchase history references Products. Promo events affect forecast calculations on sales data.

### First-Time Walkthrough

1. **Log in** — Your admin provides credentials
2. **Go to Import Data** — Upload your Excel files in the order above
3. **Map Columns** — The system auto-maps your Excel headers; verify and adjust
4. **Validate & Harmonize** — System checks data quality and applies BD-specific rules
5. **Insert Data** — Data flows into the system
6. **View Dashboard** — KPIs and charts populate with your real data
7. **Run Forecasts** — Go to Forecast page, select products, generate predictions
8. **Review Order Triggers** — System tells you WHAT to order, WHEN, and HOW MUCH

---

## 3. Step-by-Step: Getting the Most Out of TrimedCast

### Phase 1: Data Foundation (Week 1)

| Step | Action | Where | What You Achieve |
|------|--------|-------|-----------------|
| 1 | Import Motorcycle Models | Import Data > Motorcycle Models | System knows which bikes run in BD |
| 2 | Import Suppliers | Import Data > Suppliers | System knows your China supply chain |
| 3 | Import Products | Import Data > Products / Parts | Your SKU catalog is loaded |
| 4 | Import Current Stock | Import Data > Inventory / Stock | System knows what you have now |
| 5 | Import Sales History | Import Data > Sales History | System learns your demand patterns |
| 6 | Import Purchase History | Import Data > Purchase History | System learns your supply patterns |
| 7 | Import Promo Events | Import Data > Promo Events | System knows past marketing impact |

### Phase 2: Understanding Your Current State (Week 2)

| Step | Action | Where | What You Achieve |
|------|--------|-------|-----------------|
| 8 | Review Dashboard KPIs | Dashboard | See total SKUs, stock value, stockout risks |
| 9 | Check S&OP Progress | Dashboard > S&OP Bar | Understand where you are in the planning cycle |
| 10 | View Season Indicator | Dashboard > Season | Know current BD season and days to next |
| 11 | Review Urgent Orders | Dashboard > Urgent Orders | See which orders need immediate attention |
| 12 | Check Inventory Levels | Inventory > Inventory Grid | Spot stockouts and overstocks visually |

### Phase 3: Forecasting (Week 2-3)

| Step | Action | Where | What You Achieve |
|------|--------|-------|-----------------|
| 13 | Run Consensus Forecast | Forecast > Consensus | Get the best combined prediction |
| 14 | Compare Models | Forecast > Compare | See how Prophet, ETS, Regression differ |
| 15 | View Seasonal Decomposition | Forecast > Decomposition | Understand trend, seasonality, residuals |
| 16 | Check Promo Impact | Forecast > Promo | See how Eid/seasonal sales affect demand |
| 17 | Run What-If Scenarios | Forecast > What-If | Test "what if lead time changes?" etc. |
| 18 | Use AI Assistant | Forecast > AI | Ask questions in natural language |

### Phase 4: Decision Making (Week 3-4)

| Step | Action | Where | What You Achieve |
|------|--------|-------|-----------------|
| 19 | Review Order Triggers | Order Triggers > Recommended | See WHAT/WHEN/HOW MUCH to order |
| 20 | Check CNY Risk | Order Triggers > CNY Risk | Identify orders at risk from Chinese New Year |
| 21 | Compare Sea vs Air | Inventory > Sea vs Air | Decide shipment method for urgent orders |
| 22 | Calculate EOQ & Safety Stock | Inventory > EOQ & Safety Stock | Get optimal order quantities |
| 23 | Convert to PO | Order Triggers > Recommended > Convert | Turn recommendations into purchase orders |

### Phase 5: Monitoring & Optimization (Ongoing)

| Step | Action | Where | What You Achieve |
|------|--------|-------|-----------------|
| 24 | Monitor S&OE Tower | S&OE Tower | Real-time 0-3 month operational control |
| 25 | Track Forecast Accuracy | Analytics | Monitor MAPE, spot degradation |
| 26 | Review Audit Log | Header > Audit Log | Full traceability of all actions |
| 27 | Adjust Settings | Settings | Tune forecast defaults, notifications |
| 28 | Check Billing | Billing | Monitor usage and subscription |

---

## 4. Page-by-Page Guide with Bangla Descriptions

### 4.1 Dashboard (Overview)

**English:** The Dashboard is your command center. It shows a real-time snapshot of your entire operation — KPIs, S&OP cycle progress, current season, urgent orders, and recent forecast activity. Think of it as the cockpit of your supply chain.

**Bangla:**
> ড্যাশবোর্ড হলো আপনার কমান্ড সেন্টার। এখানে আপনার পুরো অপারেশনের রিয়েল-টাইম চিত্র দেখা যায় — KPI, S&OP সাইকেলের অগ্রগতি, বর্তমান ঋতু, জরুরি অর্ডার এবং সাম্প্রতিক ফোরকাস্ট কার্যক্রম। এটি আপনার সাপ্লাই চেইনের ককপিট।
>
> **এখানে কী কী থাকে:**
> - **S&OP প্রগ্রেস বার:** আপনি প্ল্যানিং সাইকেলের কোন ধাপে আছেন (Validation > Approval > Ops > Governance)
> - **KPI কার্ড:** মোট SKU, স্টক ভ্যালু (BDT), স্টকআউট রিস্ক, ওভারস্টক, পেন্ডিং PO
> - **ঋতু সূচক:** এখন কোন ঋতু (Winter/Summer/Monsoon/Pre-Winter), পরবর্তী ঋতুতে কত দিন
> - **জরুরি অর্ডার:** যেসব অর্ডার এখনই দিতে হবে
> - **সাম্প্রতিক ফোরকাস্ট:** সবচেয়ে নতুন প্রেডিকশনগুলো

**What to do here:** Start every work session by reviewing the Dashboard. Check urgent orders first, then S&OP progress, then KPIs.

---

### 4.2 Forecast

**English:** The Forecast page is the brain of TrimedCast. It runs multiple mathematical models (Prophet, Exponential Smoothing, Regression) on your sales history and combines them into a Consensus Forecast. You can compare models, see seasonal decomposition, measure promo impact, run What-If scenarios, and ask the AI questions.

**Bangla:**
> ফোরকাস্ট পেজ হলো TrimedCast-এর মস্তিষ্ক। এটি আপনার সেলস হিস্ট্রির উপর একাধিক ম্যাথামেটিক্যাল মডেল (Prophet, Exponential Smoothing, Regression) চালায় এবং সেগুলোকে একটি Consensus Forecast-এ কম্বাইন করে।
>
> **৬টি ট্যাব:**
> - **Consensus:** সব মডেলের সম্মিলিত প্রেডিকশন — এটিই আপনার প্রধান ফোরকাস্ট
> - **Compare:** Prophet vs ETS vs Regression — কোন মডেল সবচেয়ে ভালো?
> - **Promo:** ঈদ, সিজনাল সেল — প্রোমো ডিমান্ড কতটুকু বাড়ায়?
> - **What-If:** "লিড টাইম বদলালে কী হবে?" — সিনারিও টেস্ট
> - **Advanced:** Prophet ডিকম্পোজিশন, EOQ, সার্ভিস লেভেল টেবিল
> - **AI:** প্রাকৃতিক ভাষায় প্রশ্ন করুন — "ঈদের আগে কোন পার্টগুলো সবচেয়ে বেশি লাগবে?"

**What to do here:** Select a product, choose the season, review the Consensus forecast. If accuracy seems off, check Compare tab to see which model fits best. Use What-If to test scenarios before committing.

---

### 4.3 Order Triggers

**English:** This is THE primary output of TrimedCast. It tells you exactly WHEN to order, WHAT to order, and HOW MUCH. Each recommended order considers lead time, safety stock, current inventory, and CNY risk. You can convert recommendations directly into Purchase Orders.

**Bangla:**
> এটি TrimedCast-এর প্রধান আউটপুট। এটি আপনাকে ঠিক বলে দেয় কখন অর্ডার দিতে হবে, কী অর্ডার দিতে হবে, এবং কতটুকু অর্ডার দিতে হবে। প্রতিটি রেকমেন্ডেড অর্ডার লিড টাইম, সেফটি স্টক, বর্তমান ইনভেন্ট্রি এবং CNY রিস্ক বিবেচনা করে।
>
> **৪টি ট্যাব:**
> - **Recommended Orders:** সব অর্ডার রেকমেন্ডেশন টেবিলে — সরাসরি PO-তে কনভার্ট করুন
> - **Order Timeline:** গ্যান্ট চার্ট — কোন অর্ডার কখন আসবে ভিজুয়ালি
> - **CNY Risk:** চাইনিজ নিউ ইয়ারের কারণে যেসব অর্ডার বিপদে
> - **Seasonal Best:** প্রতি ঋতুতে সবচেয়ে গুরুত্বপূর্ণ অর্ডারগুলো

**What to do here:** This is your daily action page. Review recommended orders, check CNY risk flags, and convert approved recommendations to POs.

---

### 4.4 Inventory

**English:** The Inventory page gives you full visibility into stock levels. The grid shows every SKU with color-coded status (green = healthy, yellow = low, red = stockout). You can compare Sea vs Air shipping, calculate EOQ and Safety Stock, view service levels, and project future stock positions.

**Bangla:**
> ইনভেন্ট্রি পেজে আপনার স্টক লেভেলের পূর্ণ দৃশ্যমানতা পাওয়া যায়। গ্রিডে প্রতিটি SKU কালার-কোডেড স্ট্যাটাসসহ দেখা যায় (সবুজ = সুস্থ, হলুদ = কম, লাল = স্টকআউট)।
>
> **৫টি ট্যাব:**
> - **Inventory Grid:** সব SKU-এর ভিজুয়াল গ্রিড — ফিল্টার, সর্ট, সার্চ
> - **Sea vs Air:** সী ফ্রেইট (৯০ দিন) vs এয়ার ফ্রেইট (৩৫ দিন) — কোনটা সস্তা?
> - **EOQ & Safety Stock:** অপটিমাল অর্ডার কোয়ান্টিটি এবং বাফার স্টক ক্যালকুলেশন
> - **Service Levels:** প্রতিটি প্রোডাক্টের সার্ভিস লেভেল (%)
> - **Stock Projection:** ভবিষ্যতে স্টক কেমন থাকবে প্রজেকশন

**What to do here:** Check the grid for red/yellow items. Use Sea vs Air comparison for urgent orders. Review EOQ recommendations.

---

### 4.5 Import Data

**English:** The Import Data page is a 7-step wizard that guides you through uploading Excel/CSV files, mapping columns, validating data, harmonizing (cleaning/normalizing), and inserting into the database. It supports 7 import types, each with specific required and optional columns.

**Bangla:**
> ইম্পোর্ট ডেটা পেজ একটি ৭-ধাপী উইজার্ড যা আপনাকে Excel/CSV ফাইল আপলোড, কলাম ম্যাপিং, ডেটা ভ্যালিডেশন, হারমোনাইজেশন (ক্লিনিং/নরমালাইজেশন) এবং ডেটাবেসে ইনসার্ট করতে গাইড করে।
>
> **৭টি ধাপ:**
> 1. **ইম্পোর্ট টাইপ নির্বাচন:** কী ধরনের ডেটা আপলোড করছেন
> 2. **ফাইল আপলোড:** Excel/CSV ফাইল ড্র্যাগ-অ্যান্ড-ড্রপ
> 3. **কলাম ম্যাপিং:** আপনার এক্সেল হেডার সিস্টেমের ফিল্ডের সাথে ম্যাপ করুন
> 4. **ভ্যালিডেশন:** ডেটা ঠিক আছে কিনা চেক
> 5. **হারমোনাইজেশন:** BD-স্পেসিফিক ট্রান্সফর্ম (ঋতু ট্যাগ, ডিডাপ, নরমালাইজেশন)
> 6. **ইনসার্ট:** ডেটাবেসে ডেটা ঢোকানো
> 7. **সম্পন্ন:** কোয়ালিটি স্কোর এবং সারাংশ

> **গুরুত্বপূর্ণ:** ইম্পোর্ট অর্ডার মানে — Motorcycle Models > Suppliers > Products > Inventory > Sales History > Purchase History > Promo Events

**What to do here:** Follow the import order. Start with Motorcycle Models, then Suppliers, then Products. Each later import references earlier data.

---

### 4.6 Suppliers

**English:** The Suppliers page shows your supplier master data — primarily China-based manufacturers. Key attributes include lead time, reliability score, and whether they're affected by Chinese New Year shutdown.

**Bangla:**
> সাপ্লায়ার পেজে আপনার সরবরাহকারীর মাস্টার ডেটা দেখা যায় — মূলত চীন-ভিত্তিক ম্যানুফ্যাকচারার। মূল বৈশিষ্ট্যগুলোর মধ্যে লিড টাইম, নির্ভরযোগ্যতা স্কোর এবং চাইনিজ নিউ ইয়ার শাটডাউনে প্রভাবিত কিনা তা অন্তর্ভুক্ত।
>
> **এখানে কী দেখবেন:**
> - মোট সাপ্লায়ার সংখ্যা
> - গড় লিড টাইম
> - গড় নির্ভরযোগ্যতা স্কোর
> - CNY-প্রভাবিত সাপ্লায়ার সংখ্যা

**What to do here:** Review supplier reliability scores. Flag CNY-affected suppliers before January.

---

### 4.7 Analytics

**English:** The Analytics page provides deep-dive analysis tools — Sea vs Air comparison, promo slider for testing demand uplift, What-If scenarios, time series decomposition, consensus pipeline, recalibration, seasonal grid, and CNY calendar.

**Bangla:**
> অ্যানালিটিক্স পেজে গভীর বিশ্লেষণ টুল পাওয়া যায় — Sea vs Air তুলনা, প্রোমো স্লাইডার, What-If সিনারিও, টাইম সিরিজ ডিকম্পোজিশন, কনসেনসাস পাইপলাইন, রিক্যালিব্রেশন, সিজনাল গ্রিড এবং CNY ক্যালেন্ডার।
>
> **৮টি ট্যাব:**
> - **Sea vs Air:** শিপিং মোড তুলনা
> - **Promo Slider:** প্রোমো ইম্প্যাক্ট স্লাইডার
> - **What-If:** সিনারিও সিমুলেশন
> - **Decomposition:** টাইম সিরিজ ভাঙা
> - **Consensus Pipeline:** ফোরকাস্ট কীভাবে তৈরি হয়
> - **Recalibration:** ফোরকাস্ট ঠিক করা
> - **Seasonal Grid:** ঋতুভিত্তিক ডিমান্ড গ্রিড
> - **CNY Calendar:** চাইনিজ নিউ ইয়ার ক্যালেন্ডার

**What to do here:** Use this for deep analysis. The promo slider lets you test "what if we do 20% Eid discount?" before actually running the promo.

---

### 4.8 S&OE Tower

**English:** The S&OE (Sales & Operations Execution) Tower is your 0-3 month operational control center. It shows stockout alerts, MAPE breaches (forecast accuracy issues), pending deliveries, demand forecasts, and critical actions that need immediate attention.

**Bangla:**
> S&OE টাওয়ার হলো আপনার ০-৩ মাসের অপারেশনাল কন্ট্রোল সেন্টার। এখানে স্টকআউট অ্যালার্ট, MAPE ব্রিচ (ফোরকাস্ট নির্ভুলতা সমস্যা), পেন্ডিং ডেলিভারি, ডিমান্ড ফোরকাস্ট এবং তাৎক্ষণিক দরকারি ক্রিয়া দেখা যায়।
>
> **এখানে কী কী থাকে:**
> - **স্টকআউট অ্যালার্ট:** যেসব প্রোডাক্ট শেষ হয়ে যাচ্ছে
> - **MAPE ব্রিচ:** ফোরকাস্ট যেখানে ভুল হচ্ছে
> - **পেন্ডিং ডেলিভারি:** কোন PO আসছে
> - **ক্রিটিক্যাল অ্যাকশন:** এখনই কী করতে হবে

**What to do here:** Check this daily. It's your early warning system for the next 3 months.

---

### 4.9 AI Assistant

**English:** The AI Assistant lets you ask questions about your supply chain in natural language. It understands BD market context, seasonal patterns, and your specific data. Ask questions like "Which parts will have highest demand before Eid?" or "What's the CNY risk for my February orders?"

**Bangla:**
> AI অ্যাসিস্ট্যান্ট আপনাকে প্রাকৃতিক ভাষায় আপনার সাপ্লাই চেইন সম্পর্কে প্রশ্ন করতে দেয়। এটি BD মার্কেট কনটেক্সট, সিজনাল প্যাটার্ন এবং আপনার নির্দিষ্ট ডেটা বোঝে।
>
> **উদাহরণ প্রশ্ন:**
> - "ঈদের আগে কোন পার্টগুলো সবচেয়ে বেশি চাহিদা হবে?"
> - "ফেব্রুয়ারির অর্ডারগুলোতে CNY রিস্ক কত?"
> - "Sea শিপিং থেকে Air-এ গেলে সেফটি স্টক কত কমবে?"
> - "ঈদে ২০% ছাড় দিলে ডিমান্ড কতটুকু বাড়বে?"

**What to do here:** Use it when you need quick answers without navigating through multiple pages.

---

### 4.10 Billing

**English:** The Billing page shows your TrimedCast subscription details — current plan, usage, invoices, and payment history. Three tiers are available: Starter, Professional, and Enterprise.

**Bangla:**
> বিলিং পেজে আপনার TrimedCast সাবস্ক্রিপশন বিবরণ দেখা যায় — বর্তমান প্ল্যান, ব্যবহার, ইনভয়েস এবং পেমেন্ট হিস্ট্রি। তিনটি টায়ার আছে: Starter, Professional এবং Enterprise।

**What to do here:** Monitor usage to stay within plan limits. Upgrade if you need more forecasts or AI queries.

---

### 4.11 API Explorer

**English:** The API Explorer shows all available REST API endpoints with their request/response formats. Use this if you're integrating TrimedCast with your ERP or other systems.

**Bangla:**
> API এক্সপ্লোরারে সব উপলব্ধ REST API এন্ডপয়েন্ট তাদের রিকোয়েস্ট/রেসপন্স ফরম্যাটসহ দেখা যায়। আপনি যদি TrimedCast আপনার ERP বা অন্য সিস্টেমের সাথে ইন্টিগ্রেট করেন তবে এটি ব্যবহার করুন।

**What to do here:** Use for integration development. Copy endpoint details for your integration code.

---

### 4.12 Settings

**English:** The Settings page lets you configure system defaults — timezone (Asia/Dhaka), language, currency (BDT), forecast model defaults, confidence level, auto-recalibration, notification preferences, and security settings.

**Bangla:**
> সেটিংস পেজে সিস্টেম ডিফল্ট কনফিগার করা যায় — টাইমজোন (Asia/Dhaka), ভাষা, কারেন্সি (BDT), ফোরকাস্ট মডেল ডিফল্ট, কনফিডেন্স লেভেল, অটো-রিক্যালিব্রেশন, নোটিফিকেশন প্রেফারেন্স এবং সিকিউরিটি সেটিং।
>
> **৪টি কার্ড:**
> - **General:** টাইমজোন, ভাষা, কারেন্সি
> - **Forecast Defaults:** মডেল, কনফিডেন্স লেভেল, অটো-রিক্যালিব্রেশন
> - **Notifications:** স্টকআউট অ্যালার্ট, অর্ডার রিমাইন্ডার, CNY রিস্ক ওয়ার্নিং
> - **Security:** 2FA, সেশন টাইমআউট, API কী

**What to do here:** Configure once during setup. Review notification settings periodically.

---

## 5. Excel Import Column Specifications

### 5.1 Sales History

**File:** Sales_History.xlsx
**Purpose:** Historical sales transactions — this is the MOST IMPORTANT data for forecasting

| Column | Required | Type | Description | Example | BD Notes |
|--------|----------|------|-------------|---------|----------|
| date | YES | Date | Sale date | 15/01/2025 or 2025-01-15 | DD/MM/YYYY preferred |
| product_sku | YES | String | Product code | PISTON-Bajaj-100 | Must match Products SKU |
| quantity | YES | Number | Units sold | 150 | Cannot be negative |
| revenue | No | Number | Total BDT amount | 22500 | In BDT |
| channel | No | Enum | Sales channel | retail / wholesale / online | BD channels |
| region | No | Enum | BD division | dhaka / chittagong / sylhet / rajshahi / khulna / barishal / rangpur / mymensingh | 8 divisions |
| invoice_no | No | String | Invoice number | INV-2025-0456 | |
| customer_id | No | String | Customer identifier | CUST-00789 | |
| season | No | Enum | BD season | winter / summer / monsoon / pre_winter | Auto-tagged if empty |

**Minimum viable file:** date | product_sku | quantity

---

### 5.2 Purchase History

**File:** Purchase_History.xlsx
**Purpose:** Historical purchase orders from suppliers — needed for lead time analysis

| Column | Required | Type | Description | Example | BD Notes |
|--------|----------|------|-------------|---------|----------|
| date | YES | Date | PO date | 01/12/2024 | When order was placed |
| product_sku | YES | String | Product code | PISTON-Bajaj-100 | Must match Products SKU |
| quantity | YES | Number | Units ordered | 500 | |
| unit_cost | No | Number | Cost per unit (BDT) | 85.50 | In BDT, from China |
| total_cost | No | Number | Total cost (BDT) | 42750 | unit_cost x quantity |
| supplier_name | No | String | Supplier name | Qingdao Parts Co. | Must match Suppliers |
| po_number | No | String | Purchase order number | PO-2024-0123 | |
| lead_time_actual | No | Number | Actual delivery days | 92 | Compare with expected |
| season | No | Enum | BD season | winter | Auto-tagged if empty |

**Minimum viable file:** date | product_sku | quantity

---

### 5.3 Products / Parts

**File:** Products.xlsx
**Purpose:** Your SKU master catalog — every part you sell

| Column | Required | Type | Description | Example | BD Notes |
|--------|----------|------|-------------|---------|----------|
| sku | YES | String | Unique product code | PISTON-Bajaj-100 | Alphanumeric, no spaces |
| name | YES | String | Product name | Bajaj Discover 100cc Piston Kit | |
| category | YES | Enum | Part category | piston | See category list below |
| subcategory | No | String | Sub-category | piston_ring | |
| unit_cost | No | Number | Buy price (BDT) | 85.50 | Cost from China supplier |
| selling_price | No | Number | Sell price (BDT) | 150.00 | Retail price in BD |
| unit | No | Enum | Unit of measure | piece / set / pair / dozen | |
| min_order_qty | No | Number | Minimum order quantity | 100 | MOQ from supplier |
| lead_time_days | No | Number | Lead time in days | 90 | Default 90 for sea from China |
| is_seasonal | No | Boolean | Has seasonal demand? | true / false | |
| seasonality_type | No | Enum | Season pattern | winter_peak / monsoon_dip / summer_peak / pre_winter_peak | |

**Product Categories:** piston, gasket, chain, filter, brake_pad, tire, battery, spark_plug, cable, bearing, clutch, engine, fork, shock_absorber, headlight, taillight, mirror, handlebar, seat, tank, exhaust, carburetor, other

**Minimum viable file:** sku | name | category

---

### 5.4 Inventory / Stock

**File:** Inventory.xlsx
**Purpose:** Current stock levels for all products

| Column | Required | Type | Description | Example | BD Notes |
|--------|----------|------|-------------|---------|----------|
| product_sku | YES | String | Product code | PISTON-Bajaj-100 | Must match Products SKU |
| current_stock | YES | Number | Units on hand | 250 | Physical count |
| reserved_stock | No | Number | Units reserved | 50 | Allocated to sales orders |
| reorder_point | No | Number | Reorder level | 100 | When to order |
| safety_stock | No | Number | Buffer stock | 40 | Minimum buffer |
| max_stock_level | No | Number | Max capacity | 500 | Warehouse limit |
| warehouse_location | No | String | Bin/shelf | A3-R2-S1 | |

**Minimum viable file:** product_sku | current_stock

---

### 5.5 Suppliers

**File:** Suppliers.xlsx
**Purpose:** Your supplier master data — primarily China-based manufacturers

| Column | Required | Type | Description | Example | BD Notes |
|--------|----------|------|-------------|---------|----------|
| name | YES | String | Supplier name | Qingdao Motorcycle Parts Co. | |
| code | No | String | Supplier code | SUP-QD-001 | |
| country | No | String | Country | China | Default: China |
| lead_time_days | No | Number | Typical lead time | 90 | Default 90 days (sea) |
| reliability | No | Number | Reliability score 0-1 | 0.85 | 1 = always on time |
| is_cny_affected | No | Boolean | CNY shutdown impact | true | Most China suppliers = true |
| contact_email | No | String | Email | sales@qdparts.cn | |
| contact_phone | No | String | Phone | +86-532-8888-9999 | |

**Minimum viable file:** name

---

### 5.6 Motorcycle Models

**File:** Motorcycle_Models.xlsx
**Purpose:** Motorcycle brands/models in the BD market

| Column | Required | Type | Description | Example | BD Notes |
|--------|----------|------|-------------|---------|----------|
| brand | YES | String | Brand name | Bajaj / TVS / Hero / Honda / Yamaha | Popular BD brands |
| model | YES | String | Model name | Discover 100 / Platina / CT100 | |
| year_start | No | Number | Production start year | 2015 | |
| year_end | No | Number | Production end year | 2025 | Blank = still in production |
| cc_rating | No | Number | Engine displacement | 100 | CC rating |
| segment | No | Enum | Market segment | commuter / premium / scooter / sports / cruiser | commuter dominates BD |

**Minimum viable file:** brand | model

---

### 5.7 Promotional Events

**File:** Promo_Events.xlsx
**Purpose:** Marketing campaigns that affect demand — Eid discounts, seasonal sales, etc.

| Column | Required | Type | Description | Example | BD Notes |
|--------|----------|------|-------------|---------|----------|
| name | YES | String | Event name | Eid ul-Fitr 2025 Sale | |
| type | YES | Enum | Promo type | eid_discount | See types below |
| start_date | YES | Date | Start date | 20/03/2025 | |
| end_date | YES | Date | End date | 05/04/2025 | |
| discount_pct | No | Number | Discount percentage | 15 | 0-100 |
| expected_uplift | No | Number | Expected demand increase % | 40 | How much demand rises |

**Promo Types:** eid_discount, seasonal_sale, clearance, flash_sale, bundle_deal, loyalty_reward

**Minimum viable file:** name | type | start_date | end_date

---

### Import Order Dependency Diagram

```
Motorcycle Models ─────────────────────────────────┐
                                                    │
Suppliers ─────────────────────────────────────────┐│
                                                   ││
Products / Parts ◄── references Models & Suppliers ─┤│
                                                   ││
Inventory / Stock ◄── references Products ──────────┤│
                                                   ││
Sales History ◄── references Products ──────────────┤│
                                                   ││
Purchase History ◄── references Products & Suppliers ┤│
                                                   ││
Promo Events ◄── (standalone, but affects forecasts) ─┘│
                                                    ┘
```

---

## 6. Phase-by-Phase Implementation Process

### Phase 0: Foundation (Sessions 1-2)
- Docker + Database setup
- Prisma schema with all 17+ models
- Multi-tenant architecture with tenant_id
- Base API structure

### Phase 1: Data Ingestion (Sessions 3-5)
- ETL pipeline with 7 import types
- Column mapping with Levenshtein fuzzy matching
- 3-phase validation (structural > type > business)
- Harmonization (dedup, season tagging, BD-specific transforms)
- Batch insert with progress tracking

### Phase 2: Core Forecasting (Sessions 6-9)
- Prophet time series decomposition with BD seasonalities
- Exponential Smoothing (Holt-Winters)
- Multi-linear Regression (Price + Promo)
- Consensus Forecast combination
- EOQ and Safety Stock calculations
- Order Trigger date calculator
- CNY Risk flagging

### Phase 3: API & Backend (Sessions 10-13)
- 58+ REST API endpoints
- RBAC with 5 roles
- Audit logging
- S&OP cycle management
- Import/Export API

### Phase 4: Multi-Tenant SaaS (Sessions 14-16)
- Tenant isolation
- 3 subscription tiers (Starter/Pro/Enterprise)
- Stripe billing integration
- Feature gating
- Usage metering

### Phase 5: Dashboard & UI (Sessions 17-20)
- Dashboard layout with sidebar + header
- 12 pages with Framer Motion transitions
- Forecast page with 6 tabs
- Inventory grid with color-coded status
- Order triggers with Convert to PO
- Import wizard with 7 steps

### Phase 6: AI & Advanced (Sessions 21-23)
- Ask AI with LLM integration
- What-If scenario engine
- Sea vs Air comparison
- Promo impact slider
- Prophet decomposition
- Shadow forecast
- AI conversation management

### Phase 7: Help & Documentation (Current Session)
- Comprehensive TrimedCast-Guide.md
- Floating "?" help button on every page
- Off-canvas help panel with Bangla descriptions
- Sidebar Help menu with step-by-step guide
- Excel import column specification reference

---

## 7. Keyboard Shortcuts & Tips

| Shortcut | Action |
|----------|--------|
| Click "?" button | Open page-specific help |
| Sidebar > Help | Full platform usage guide |
| Header > Ask AI | Natural language query |
| Header > Audit Log | Full action traceability |

### Tips

1. **Always start with the S&OE Tower** — it shows what needs attention NOW
2. **Import data in the correct order** — Products before Sales History
3. **Check CNY Risk before January** — place orders before factories shut down
4. **Use Consensus Forecast** — it's more accurate than any single model
5. **Review MAPE weekly** — if MAPE > 15%, recalibrate
6. **Sea vs Air** — use Air only for critical stockouts, Sea for regular replenishment
7. **Promo impact is real** — Eid can increase demand 30-50% for certain parts
8. **BDT Lakh format** — 1,50,000 means 150,000 BDT (Indian/Bangladeshi numbering)

---

## 8. Glossary

| Term | Bangla | Meaning |
|------|--------|---------|
| Forecast | ভবিষ্যৎ প্রেডিকশন | Prediction of future demand |
| Consensus | ঐকমত্য | Combined prediction from multiple models |
| Safety Stock | নিরাপদ মজুত | Buffer inventory to prevent stockout |
| EOQ | অর্থনৈতিক অর্ডার পরিমাণ | Economic Order Quantity — optimal order size |
| Lead Time | লিড টাইম | Time from order to delivery (China to BD: ~90 days sea, ~35 days air) |
| CNY Risk | চাইনিজ নিউ ইয়ার ঝুঁকি | Risk of delay due to Chinese New Year factory shutdown (Jan 20 - Feb 20) |
| MAPE | গড় পরম শতাংশ ত্রুটি | Mean Absolute Percentage Error — forecast accuracy metric |
| S&OP | বিক্রয় ও অপারেশন পরিকল্পনা | Sales & Operations Planning cycle |
| S&OE | বিক্রয় ও অপারেশন কার্যকরীকরণ | Sales & Operations Execution (0-3 month horizon) |
| SKU | স্টক কিপিং ইউনিট | Stock Keeping Unit — unique product identifier |
| Promo Index | প্রোমো সূচক | Measure of how much a promotion affects demand |
| Reorder Point | পুনরায় অর্ডার পয়েন্ট | Stock level at which a new order should be placed |
| Stockout | স্টকআউট | When inventory reaches zero — no product available |
| Uplift | বৃদ্ধি | Increase in demand due to a promotion |
| BDT | বাংলাদেশি টাকা | Bangladeshi Taka — local currency |
| Monsoon | মৌসুম | June-September — heavy rain affects logistics |
| Pre-Winter | শীতপূর্ব | October — transition month, demand starts rising |
| Winter | শীত | November-February — peak demand for many parts |
| Summer | গ্রম | March-May — lower demand period |
