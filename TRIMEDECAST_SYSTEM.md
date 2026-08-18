# TrimedCast — Complete System Overview

> **Seasonal Demand & Inventory Forecasting Platform for Bangladesh Motorcycle Parts Industry**

---

## Table of Contents

1. [What is TrimedCast?](#1-what-is-trimedcast)
2. [The Problem It Solves](#2-the-problem-it-solves)
3. [System Architecture & Modules](#3-system-architecture--modules)
4. [What It Does — Feature-by-Feature](#4-what-it-does--feature-by-feature)
5. [Who Benefits From This System](#5-who-benefits-from-this-system)
6. [Target Customers](#6-target-customers)
7. [Bangladesh-Specific Advantages](#7-bangladesh-specific-advantages)
8. [Technical Stack](#8-technical-stack)
9. [Module Map (Sessions 1–28)](#9-module-map-sessions-128)

---

## 1. What is TrimedCast?

TrimedCast is a **full-stack, enterprise-grade supply chain intelligence platform** purpose-built for the **Bangladesh motorcycle and auto parts industry**. It combines demand forecasting, inventory optimization, procurement management, warehouse logistics, financial analytics, and multi-tenant administration into a single unified dashboard.

The name **TrimedCast** comes from:
- **Tri** — Three-layer intelligence (Forecast → Optimize → Execute)
- **Med** — Median-weighted forecasting algorithms
- **Cast** — Demand casting (predictive projection)

Unlike generic ERPs (SAP, Oracle) or Western-focused tools (NetSuite, Fishbowl), TrimedCast is deeply localized for Bangladesh — incorporating **Bengali (বাংলা)** throughout the UI, **BDT (৳)** currency, **Bangladesh import tax structure** (Customs Duty + Supplementary Duty + 15% VAT + AIT), **BD courier networks** (Pathao, RedX, Sundarban), **CNY/USD exchange exposure**, and **Bangladesh seasonal demand patterns** (Monsoon dip, Pre-Winter surge, CNY holiday disruption).

---

## 2. The Problem It Solves

Bangladesh's motorcycle parts industry faces critical challenges that TrimedCast directly addresses:

| Problem | Impact | TrimedCast Solution |
|---------|--------|---------------------|
| **No demand visibility** | Overstocking dead parts, stockouts on fast movers | AI-powered seasonal forecasting with MAPE tracking |
| **Manual reordering** | Orders placed too late, emergency air shipments at 3× cost | EOQ + Safety Stock auto-calculation with reorder triggers |
| **CNY currency risk** | 60%+ parts from China; CNY spikes erode margins | Real-time FX exposure monitoring with hedging recommendations |
| **Complex import duties** | Incorrect duty calculations, customs delays | Built-in BD customs calculator with HS code lookup |
| **No supplier scorecards** | Stuck with poor suppliers, no performance data | 5-dimension weighted scorecards (On-Time, Quality, Cost, Responsive, Flexibility) |
| **Warehouse blind spots** | Don't know what's aging, where stock is, or picking efficiency | Zone-level tracking, stock aging analysis, pick-pack queues |
| **Dead stock accumulation** | Capital trapped in unsellable inventory, 20%+ of total stock | Dead stock identification with recovery action recommendations |
| **Seasonal demand swings** | Monsoon drops 30-40%, Pre-Winter surges 50%+, caught off guard | Seasonal multiplier engine with 12 BD seasons and CNY calendar |
| **Fragmented logistics** | Multiple couriers, no tracking, lost shipments | 6 BD courier integrations with live last-mile delivery tracking |
| **No financial intelligence** | Can't see margin by product/channel, budget overruns hidden | Cost breakdown, margin analysis, budget vs actual tracking |

---

## 3. System Architecture & Modules

TrimedCast is organized into **15 integrated modules** across **28 development sessions**:

```
┌─────────────────────────────────────────────────────────────┐
│                    TrimedCast Platform                       │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│  FORECAST   │  INVENTORY  │  PROCUREMENT │    LOGISTICS    │
│  ENGINE     │  INTEL      │  & SUPPLIERS │    & WAREHOUSE  │
├─────────────┼─────────────┼─────────────┼─────────────────┤
│ Seasonal    │ Product     │ Supplier    │ Warehouse       │
│ Forecasting │ Catalog     │ Scorecards  │ Management      │
│             │             │             │                 │
│ EOQ/SS      │ ABC/XYZ     │ RFQ         │ Inbound/Outbound│
│ Calculator  │ Analysis    │ Management  │ Shipments       │
│             │             │             │                 │
│ CNY Risk    │ Stock Aging │ Cost        │ BD Couriers     │
│ Management  │ & Turnover  │ Comparison  │ & Live Tracking │
│             │             │             │                 │
│ Recalibration│ Dead Stock │ Risk        │ Pick/Pack/Ship  │
│ & Sensitivity│ & Lifecycle│ Assessment  │ Workflow        │
├─────────────┴─────────────┴─────────────┴─────────────────┤
│              OPERATIONS & INTELLIGENCE LAYER               │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│  FINANCE    │  SALES      │  DATA       │    PLATFORM     │
│  & COST     │  ORDERS     │  IMPORT     │    ADMIN        │
├─────────────┼─────────────┼─────────────┼─────────────────┤
│ Cost        │ Order       │ 5-Step      │ Multi-Tenant    │
│ Breakdown   │ Management  │ Import      │ Management      │
│             │             │ Wizard      │                 │
│ Margin      │ Channel     │ Column      │ Revenue         │
│ Analysis    │ Tracking    │ Mapping     │ Metrics         │
│             │             │             │                 │
│ Currency FX │ Customer    │ Validation  │ System Health   │
│ Exposure    │ Lifecycle   │ & Harmonize │ & Security      │
│             │             │             │                 │
│ Customs     │ BD Payment  │ Quality     │ RBAC &          │
│ Calculator  │ Integration │ Scoring     │ Permissions     │
├─────────────┴─────────────┴─────────────┴─────────────────┤
│                   PLATFORM FOUNDATION                       │
├────────────────────────────────────────────────────────────┤
│  Auth & Onboarding  │  Subscriptions & Billing  │  API     │
└────────────────────────────────────────────────────────────┘
```

---

## 4. What It Does — Feature-by-Feature

### 4.1 Demand Forecasting Engine
- **Seasonal demand forecasting** with 12 Bangladesh-specific seasonal patterns (Winter-Dry, Pre-Monsoon, Monsoon, Post-Monsoon, Pre-Winter, Winter-Festive, CNY Holiday, Ramadan, Eid-ul-Fitr, Eid-ul-Adha, Durga Puja, Year-End)
- **MAPE (Mean Absolute Percentage Error)** tracking per product/method with accuracy ratings (Excellent <10%, Good <20%, Fair <30%)
- **6 forecast methods**: Prophet, ARIMA, ETS, Ensemble, Naive, Moving Average — with model comparison
- **Auto-recalibration** triggers when MAPE exceeds threshold (5 urgency levels)
- **Service level sensitivity analysis** (90% → 99.9%)
- **What-if scenario planning** with promo index sliders
- **CNY risk calendar** tracking Chinese New Year factory shutdowns and shipping delays
- **Consensus forecast pipeline** with approval workflow

### 4.2 EOQ & Safety Stock Optimization
- **Economic Order Quantity** with 4 constraints: MOQ, max stock, warehouse capacity, current stock
- **TrimedCast Safety Stock Formula**: `SS = (EOQ/R) + (MAE × μₜ × σ_LT) × k`
- **Lead time statistics** from actual purchase history (σ_LT, sea vs air defaults)
- **Safety factor mapping**: Service level → k (90%→1.28, 95%→1.65, 99%→2.33, 99.9%→3.09)
- **Error metrics dashboard**: MAPE, MAE, MSE, RMSE, bias, Theil's U
- **Batch processing** for all products simultaneously

### 4.3 Product Catalog & Inventory Intelligence
- **30+ product catalog** across 8 BD motorcycle part categories (Engine, Brake, Electrical, Body, Suspension, Transmission, Filters, Accessories)
- **ABC classification** (A=80% revenue from 20% products, B=15%, C=5%) with Pareto chart
- **XYZ demand classification** (X=stable CV<0.5, Y=variable, Z=erratic CV≥1)
- **Combined ABC-XYZ matrix** (9 cells from AX to CZ) for prioritization
- **Stock aging analysis**: 5 buckets (0-30d fresh → 180+ dead) with value tracking
- **Inventory turnover** by category with BD industry benchmark (4.2×)
- **Dead stock identification** with recovery actions (markdown, donate, return, dispose)
- **Product lifecycle management**: Introduction → Growth → Maturity → Decline → Discontinued
- **Demand variability profiling**: stable, seasonal, erratic, intermittent patterns

### 4.4 Warehouse & Logistics
- **4 Bangladesh warehouses**: Dhaka Central Hub, Chattogram Port, Sylhet Distribution, Rajshahi Regional
- **6 warehouse zones**: Receiving Dock, Bulk Storage, Picking Zone, Packing Area, Shipping Dock, Hazardous Storage
- **Inbound shipment tracking**: 6-step pipeline (Pending → In-Transit → At Dock → Receiving → Put-Away → Completed)
- **Outbound shipment tracking**: 7-step pipeline with failed delivery handling
- **6 BD courier partners**: Pathao, RedX, Sundarban, SA Paribahan, eCourier, Continental — with on-time rates and coverage
- **Live last-mile delivery tracking** with real-time status updates and BD location names in Bengali
- **Pick-Pack-Ship workflow** with priority queue (urgent/high/normal)

### 4.5 Procurement & Supplier Management
- **10 supplier directory** across 5 countries (🇨🇳🇮🇳🇧🇩🇰🇷🇹🇭)
- **4-tier classification**: Strategic, Preferred, Approved, Probationary
- **5-dimension weighted scorecards**: On-Time Delivery (30%), Quality (25%), Cost (25%), Responsiveness (12%), Flexibility (8%)
- **RFQ (Request for Quotation) management**: Draft → Sent → Responses → Evaluation → Awarded
- **Multi-source cost comparison** with landed cost analysis and savings calculation
- **Supplier risk assessment**: risk factors, mitigation actions, 2×2 risk matrix
- **PO tracking by supplier** with overdue monitoring

### 4.6 Financial Analytics & Cost Intelligence
- **Cost breakdown**: 7 categories totaling ৳81.8M with donut chart
- **Margin analysis**: 8 product categories × channels with gross margin tracking
- **12-month revenue trends** with seasonal overlay and CNY impact annotation
- **Currency exposure**: BDT/USD/CNY/JPY with FX risk monitoring and hedging recommendations
- **BD customs duty calculator**: HS code lookup, proper BD tax structure (Duty + CD + 15% VAT + AIT), interactive real-time calculation
- **Supplier payment terms** analysis with overdue tracking and credit utilization
- **Budget vs actual** comparison with variance analysis
- **Cost-to-serve** analysis per BD customer and region

### 4.7 Sales Order Management
- **Full order lifecycle**: Pending → Confirmed → Shipped → Delivered (with Cancel)
- **6 BD sales channels**: Retail, Wholesale, Online/Daraz, Service Center, Dealer, Export
- **8 BD regions** (Dhaka, Chattogram, Rajshahi, Sylhet, Khulna, Barishal, Rangpur, Mymensingh)
- **Order creation** with dynamic line items, BDT pricing
- **Detail sheets** with horizontal status stepper timeline

### 4.8 Data Import Wizard
- **7 import types**: Sales History, Product Catalog, Inventory Snapshot, Purchase History, Supplier List, Promo Events, Motorcycle Models
- **5-step wizard**: Select Type → Upload → Column Mapping → Validation → Processing
- **Auto-column mapping** with confidence scores
- **Data validation** with error/warning classification and quality scoring
- **Import history** with quality tracking

### 4.9 Multi-Tenant Administration
- **Tenant management** with AC IDs (TC-2025-DHK-0001)
- **3 plan tiers**: Starter (৳5,000/mo), Professional (৳15,000/mo), Enterprise (৳35,000/mo)
- **Revenue metrics**: MRR, ARR, churn rate, invoice tracking
- **Platform metrics**: users, products, forecast runs, AI queries
- **System health monitoring**: uptime, DB latency, queue depth, service status
- **Security event tracking** with severity classification

### 4.10 Platform Foundation
- **Authentication**: Login, signup, OTP verification, password recovery
- **Onboarding wizard**: Welcome → Business Profile → Upload Data → Download Templates → First Forecast
- **RBAC**: Role-based access control with permission matrix and field-level security
- **Subscriptions**: Plan management, lifecycle timeline, cancellation flow, invoice list
- **BD payment integration**: bKash, Nagad, SSLCommerz, Bank Transfer
- **API contract explorer** with security panel

---

## 5. Who Benefits From This System

### 5.1 Business Owners & CEOs
- **Single dashboard view** of entire supply chain health
- **Financial intelligence** — see exactly where money is made and lost
- **Risk visibility** — CNY exposure, supplier risks, stock risks all in one place
- **Data-driven decisions** instead of gut-feel ordering

### 5.2 Procurement Managers
- **Never miss a reorder** — automated EOQ + Safety Stock calculations
- **Negotiate better** — supplier scorecards with hard data
- **Reduce costs** — multi-source cost comparison shows cheapest option
- **Manage risk** — supplier risk assessments prevent supply disruptions

### 5.3 Warehouse Managers
- **Know exactly what's where** — zone-level inventory tracking
- **Catch aging stock early** — before it becomes dead stock
- **Track every shipment** — inbound and outbound with BD courier integration
- **Optimize picking** — priority queue ensures urgent orders ship first

### 5.4 Finance Teams
- **See true costs** — landed cost with all BD duties calculated
- **Monitor FX risk** — know CNY/USD exposure before it hurts
- **Track margins** — by product, channel, and customer
- **Budget control** — variance alerts before overruns escalate

### 5.5 Sales Teams
- **Never oversell** — real-time stock visibility
- **Know lead times** — accurate delivery estimates for customers
- **Channel insights** — which channels have best margins
- **Customer management** — order lifecycle tracking with BD geography

### 5.6 Data Analysts
- **Forecast accuracy** — MAPE tracking, recalibration triggers
- **Seasonal patterns** — 12 BD seasons with multipliers
- **ABC/XYZ analysis** — classify every product for strategy
- **Demand variability** — understand which products are predictable

### 5.7 IT Administrators
- **Multi-tenant management** — isolate data per tenant
- **RBAC** — granular permissions, field-level security
- **System health** — real-time monitoring, audit logs
- **API access** — RESTful API for integrations

---

## 6. Target Customers

### Primary Target: Bangladesh Motorcycle Parts Distributors

These are the **core customers** TrimedCast is built for:

| Segment | Company Type | Annual Revenue | Products SKU Count | Key Pain Point |
|---------|-------------|----------------|-------------------|----------------|
| **Large Distributors** | National distributors with 500+ SKUs | ৳50Cr+ (50M+ BDT) | 500-2,000 | Demand visibility, CNY risk, dead stock |
| **Regional Wholesalers** | Division-level wholesalers | ৳10-50Cr | 200-500 | Seasonal demand, supplier management |
| **Chain Retailers** | Multi-shop retail chains | ৳5-20Cr | 100-300 | Reorder automation, margin tracking |
| **Online Dealers** | Daraz/Facebook marketplace sellers | ৳1-10Cr | 50-200 | Inventory sync, fast fulfillment |

**Real Bangladesh companies that fit this profile:**
- Rahim Auto Parts — Large Dhaka-based distributor
- Navana Motors — National motorcycle & parts network
- RFL Group — Diversified industrial with auto parts division
- Aftab Automobiles — Established automotive distributor
- Bengal Auto — Regional parts wholesaler
- Karim Motor — Chattogram-based marine & motorcycle parts
- Pran-RFL Group — Consumer goods with auto parts arm

### Secondary Target: Motorcycle & Auto Parts Businesses in Similar Markets

Countries with similar supply chain dynamics (China-sourced parts, seasonal demand, developing logistics):

| Country | Why Similar | Market Size |
|---------|-----------|-------------|
| **India** | Huge 2-wheeler market, China sourcing, monsoon season | $12B+ |
| **Sri Lanka** | Island logistics, import-dependent, seasonal tourism demand | $500M+ |
| **Nepal** | Mountain logistics, India+China sourcing, seasonal | $300M+ |
| **Myanmar** | Developing market, China border, similar challenges | $200M+ |
| **Vietnam** | Large motorcycle market, growing parts industry | $3B+ |
| **Indonesia** | Biggest motorcycle market, archipelago logistics | $8B+ |

### Tertiary Target: Any Import-Dependent Parts Business

The platform's core intelligence (forecasting, FX risk, customs calculation, supplier scoring) applies to any business that:
- Imports parts from China/Japan/Korea
- Has seasonal demand patterns
- Manages multi-warehouse inventory
- Sells through multiple channels (retail + wholesale + online)

---

## 7. Bangladesh-Specific Advantages

TrimedCast isn't just "translated" for Bangladesh — it's **architecturally designed** for the BD market:

### Language & Localization
- **Full Bengali (বাংলা) throughout** — every label, status, category, and instruction
- **Dual-language display** — English + Bengali shown together for clarity
- **BD date/time formatting** — proper locale handling
- **BDT (৳) currency** — all financial figures in Bangladeshi Taka

### Geography & Logistics
- **All 8 divisions**: Dhaka, Chattogram, Rajshahi, Sylhet, Khulna, Barishal, Rangpur, Mymensingh
- **64 districts coverage** for courier delivery
- **Chattogram Port** — specific handling for sea freight receiving
- **HSIA Dhaka** — air cargo processing
- **Narayanganj** — industrial hub warehouse zone

### Tax & Compliance
- **BD import tax structure**: Customs Duty (5-25%) + Supplementary Duty (0-20%) + VAT (15%) + AIT (1-5%)
- **HS code integration** for proper classification
- **Landed cost calculation** following NBR rules
- **VAT on (CIF + CD + SD)** — proper BD VAT base calculation

### Payments & Banking
- **bKash** — mobile financial services (most popular in BD)
- **Nagad** — postal mobile banking
- **SSLCommerz** — payment gateway
- **Bank Transfer** — standard BD banking

### Seasonal Intelligence
- **Monsoon season** (Jun-Sep): 30-40% demand drop for riding parts
- **Pre-Winter surge** (Oct-Dec): 50%+ spike in maintenance parts
- **CNY Holiday** (Jan-Feb): Factory shutdowns, shipping delays from China
- **Ramadan & Eid**: Modified demand patterns
- **Durga Puja**: Festive season demand shift

### Courier & Last-Mile
- **Pathao Courier** — express, 85% on-time, 2 days
- **RedX** — express, 88% on-time, 1.5 days
- **Sundarban Courier** — standard, 82% on-time, 3 days
- **SA Paribahan** — standard, 78% on-time, 4 days
- **eCourier** — express, 90% on-time, 1.5 days
- **Continental** — freight, 85% on-time, 5 days

---

## 8. Technical Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Full-stack React framework |
| **Language** | TypeScript 5 | Type-safe development |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Responsive UI with component library |
| **State** | Zustand | Client-side state management |
| **Database** | Prisma ORM + SQLite | Data persistence |
| **Auth** | NextAuth.js v4 | Authentication & sessions |
| **Icons** | Lucide React | Consistent icon system |
| **Animation** | Framer Motion | Smooth UI transitions |
| **Charts** | Custom SVG | Lightweight, no-chart-library visualizations |
| **Payments** | bKash, Nagad, SSLCommerz | BD payment gateways |
| **AI/ML** | z-ai-web-dev-sdk | LLM, VLM, TTS, ASR capabilities |

### Codebase Statistics
- **258 UI components** across 15 modules
- **16 Zustand stores** for state management
- **175 API routes** for backend services
- **142,000+ lines** of TypeScript/React code
- **Zero external chart libraries** — all visualizations are custom SVG
- **Full Bengali localization** — every module has dual-language support

---

## 9. Module Map (Sessions 1–28)

| Session | Module | Key Feature |
|---------|--------|-------------|
| 1-7 | Foundation | Auth, onboarding, database, API |
| 8 | EOQ & Safety Stock | Optimization calculator with constraints |
| 9-12 | Forecasting Engine | Seasonal patterns, CNY risk, AI queries |
| 13-15 | Platform | RBAC, payments, subscriptions, billing |
| 16-19 | Dashboard | Layout, sidebar, navigation, analytics |
| 20 | Control Tower | Overview dashboard with KPIs and alerts |
| 21 | Forecast Results | Method comparison, decomposition, accuracy |
| 22 | Data Import Wizard | 5-step upload, mapping, validation |
| 23 | Sales Orders | Order lifecycle with BD channels/regions |
| 24 | Multi-Tenant Admin | Tenant management, revenue, system health |
| 25 | Warehouse & Logistics | 4 warehouses, shipments, BD couriers, live tracking |
| 26 | Financial Analytics | Cost breakdown, FX risk, customs calculator, budget |
| 27 | Procurement & Suppliers | Scorecards, RFQ, cost comparison, risk assessment |
| 28 | Product Catalog | ABC/XYZ, stock aging, turnover, dead stock, lifecycle |

---

## Summary

**TrimedCast is the only supply chain intelligence platform built specifically for Bangladesh's motorcycle parts industry.** It transforms how distributors forecast demand, manage inventory, source from suppliers, operate warehouses, and control costs — all in a single system with full Bengali localization, BDT currency, Bangladesh tax compliance, and BD logistics integration.

**For the first time, a Bangladeshi motorcycle parts business can:**
- Know what demand will be next season (not guess)
- Auto-calculate optimal order quantities (not over/under order)
- See real supplier performance scores (not just who's cheapest)
- Track every shipment across 6 couriers (not call and hope)
- Calculate true landed cost with all duties (not estimate)
- Identify dead stock before it dies (not find it 6 months later)
- Monitor CNY exposure in real-time (not discover it in the P&L)

This is supply chain intelligence — **made in Bangladesh, for Bangladesh.**

---

*TrimedCast — চাহিদা পূর্বাভাস, সরবরাহ নিয়ন্ত্রণ, ব্যবসায়িক বুদ্ধিমত্তা*
*(Demand Forecasting, Supply Control, Business Intelligence)*
