# Session-wise Implementation Roadmap: TrimedCast

> This document defines the EXACT order to implement every module,  
> which .md document to follow for each session, and what you'll have after each phase.

---

## 🗺️ Which .md File to Follow FIRST?

```
START HERE → Data Dictionary & Schema.md
              │
              ▼
         Excel Import & ETL Pipeline.md  (without data, nothing else works)
              │
              ▼
         Order Trigger & Lead Time Logic.md  (your CORE IP)
              │
              ▼
         Forecasting Engine Specification.md  (the brain)
              │
              ▼
         API Contract & Integration Map.md  (wire everything)
              │
              ▼
         Multi-Tenancy & SaaS Architecture.md  (production SaaS)
              │
              ▼
         RBAC & Security Model.md  (lock it down)
              │
              ▼
         Data Requirements & Onboarding Checklist.md  (client onboarding)
```

---

## Implementation Phases Overview

| Phase | Name | Sessions | .md Documents | What You Get |
|---|---|---|---|---|
| **P0** | Foundation | 1-2 | Data Dictionary & Schema | Docker + DB + Models running |
| **P1** | Data Ingestion | 3-5 | Excel Import & ETL, Data Requirements | Can import client Excel data |
| **P2** | Core Forecasting | 6-9 | Forecasting Engine, Order Trigger | Can predict demand + when to order |
| **P3** | API & Backend | 10-13 | API Contract, RBAC | Full REST API with auth |
| **P4** | Multi-Tenant SaaS | 14-16 | Multi-Tenancy Architecture | Tenant isolation + billing |
| **P5** | Dashboard & UI | 17-20 | UI/UX Specification | Complete frontend |
| **P6** | AI & Advanced | 21-23 | API Contract (AI section) | Ask AI + what-if scenarios |

---

## Phase P0: Foundation (Sessions 1-2)

### Session 1: Docker + Database + Migrations
**Follow:** `Data Dictionary & Schema.md` (Sections 1-7)  
**Duration:** 1 session  
**Tasks:**
1. ✅ Docker Compose up (app, nginx, postgres, redis, horizon)
2. Run all 17 migrations → tables created
3. Verify schema: `\dt` in psql shows all tables
4. Seed: tenant + admin user + forecast_settings with BD defaults

**Deliverable:** `make setup` → working Laravel app with empty database at http://localhost:8000

---

### Session 2: Eloquent Models + Tenant Scope
**Follow:** `Data Dictionary & Schema.md` (Section 4 - ER Diagram) + `Multi-Tenancy & SaaS Architecture.md` (Section 3)  
**Duration:** 1 session  
**Tasks:**
1. All 17 Eloquent models with relationships, $fillable, $casts
2. BelongsToTenant trait + TenantScope global scope
3. SetTenantId middleware registered
4. Test: Create tenant, create user, create product — verify tenant isolation

**Deliverable:** `php artisan tinker` → can CRUD all entities with auto tenant scoping

---

## Phase P1: Data Ingestion (Sessions 3-5)

### Session 3: Upload + Column Mapping
**Follow:** `Excel Import & ETL Pipeline.md` (Sections 3-4, 6)  
**Duration:** 1 session  
**Tasks:**
1. ImportController: upload, detect format, return columns
2. ColumnMapperService: fuzzy auto-mapping (Levenshtein)
3. Import UI: drag-drop upload, column mapping grid, preview table
4. data_imports tracking: status flow (uploading → mapping)
5. File validation: type, size, row count

**Deliverable:** User can upload Excel, see auto-mapped columns, override mapping, preview data

---

### Session 4: Validation Pipeline
**Follow:** `Excel Import & ETL Pipeline.md` (Section 5, Step 3)  
**Duration:** 1 session  
**Tasks:**
1. ValidationService: 3-phase validation (structural, type, business)
2. Critical vs Warning severity classification
3. Validation error report with row-level detail
4. UI: Validation results panel — critical errors block, warnings allow with flag
5. Referential integrity checks (SKU codes, supplier names, model names)

**Deliverable:** Uploaded data is validated with detailed error report before any DB writes

---

### Session 5: Harmonization + Import
**Follow:** `Excel Import & ETL Pipeline.md` (Section 5, Steps 4-5) + `Data Requirements & Onboarding Checklist.md` (Section 4)  
**Duration:** 1 session  
**Tasks:**
1. HarmonizationService: dedup, outlier detection, promo cleanse, gap fill, season tag
2. ImportRepository: batch insert (5000 rows/batch)
3. Quality score calculation
4. WebSocket progress events (ImportProgress)
5. Post-import: if all mandatory imports complete, show "Ready for First Forecast" banner
6. Import sequence enforcement (models before products before stock before history)

**Deliverable:** Client's 3-year Excel data imported, harmonized, and stored — system ready for forecasting

---

## Phase P2: Core Forecasting (Sessions 6-9) ⭐ MOST VALUABLE

### Session 6: Python Forecasting Microservice Setup
**Follow:** `Forecasting Engine Specification.md` (Sections 1, 5, 8)  
**Duration:** 1 session  
**Tasks:**
1. Python FastAPI project: Dockerfile, requirements.txt (prophet, statsmodels, scikit-learn, pandas, numpy, asyncpg, redis)
2. Add to docker-compose.yml as 'forecast' service (port 8001)
3. Health endpoint: GET /health
4. Redis queue integration: Laravel dispatches job → Python picks up
5. Callback endpoint: POST /forecast/callback (Python → Laravel)

**Deliverable:** Python service running, Laravel can dispatch and receive forecast results

---

### Session 7: Prophet + Seasonal Forecasting
**Follow:** `Forecasting Engine Specification.md` (Sections 2.2, 2.3, 3)  
**Duration:** 1 session  
**Tasks:**
1. Prophet forecast with BD custom seasonalities (winter, monsoon, pre_winter)
2. BD holiday calendar (Eid, Puja, Independence Day, Pohela Boishakh)
3. Exponential smoothing with auto-tune alpha
4. Consensus forecast logic (baseline → seasonal → marketing → sales adjustments)
5. Multi-linear regression (statsmodels OLS) for beta coefficients

**Deliverable:** Given 3 years of data, system produces seasonal demand forecast per SKU

---

### Session 8: EOQ + Safety Stock Calculator
**Follow:** `Forecasting Engine Specification.md` (Sections 2.4, 2.5, 4) + `Order Trigger & Lead Time Logic.md` (Section 5)  
**Duration:** 1 session  
**Tasks:**
1. EOQ calculation with constraints (MOQ, max_stock)
2. Safety Stock formula: SS = (EOQ/R) + (MAE × μₜ × σ_LT) × k
3. σ_LT calculation from purchase_history actual_lead_time_days
4. Service level → safety factor k mapping (95%→1.65, 99%→2.33)
5. Error metrics: MAPE, MAE, MSE, RMSE calculation
6. Auto-recalibration trigger when MAPE > 10%

**Deliverable:** For any SKU, system can calculate optimal order quantity + safety stock + reorder point

---

### Session 9: Order Trigger Calculator (THE CORE IP) ⭐⭐⭐
**Follow:** `Order Trigger & Lead Time Logic.md` (ALL SECTIONS — this is your IP)  
**Duration:** 1 session (may need 2)  
**Tasks:**
1. Lead time decomposition: Manufacturing + Shipment + Customs
2. Order trigger date calculation: When stock hits reorder point minus total lead time
3. CNY risk detection algorithm
4. CNY resolution strategies (Order Before / Order After)
5. Full timeline generation: Order → Mfg Complete → Ship → Arrive → Customs → Available
6. Urgency classification (critical/high/normal/low)
7. Recommended order quantity with constraints
8. Seasonal best products prediction ("Next Winter Best Products")

**Deliverable:** THE KILLER FEATURE — System answers: "Order SKU-047 on June 22, 300 units, arrives Nov 15, total cost BDT 135,000"

---

## Phase P3: API & Backend Logic (Sessions 10-13)

### Session 10: Core API Endpoints
**Follow:** `API Contract & Integration Map.md` (Sections 3.1-3.7)  
**Duration:** 1 session  
**Tasks:**
1. Auth: register, login, logout, me
2. Products CRUD with tenant scoping
3. Inventory CRUD + stockout-risk endpoint
4. Suppliers CRUD
5. Motorcycle Models CRUD
6. Sales Orders CRUD
7. Purchase Orders CRUD with status transitions

**Deliverable:** All CRUD APIs working with Postman/Bruno test collection

---

### Session 11: Forecast + Recommendation APIs
**Follow:** `API Contract & Integration Map.md` (Sections 3.8-3.9)  
**Duration:** 1 session  
**Tasks:**
1. POST /forecasts/generate → dispatch to Python, return job_id
2. GET /forecasts/generation-status/{job_id} → progress tracking
3. GET /forecasts → list with filtering
4. PUT /forecasts/{id}/approve → S&OP approval gate
5. GET /forecasts/compare → forecast vs actual for charts
6. GET /recommended-orders → THE PRIMARY OUTPUT with full timeline
7. POST /recommended-orders/{id}/convert-to-po → creates purchase order
8. GET /recommended-orders/summary → executive aggregation

**Deliverable:** Complete forecast + recommendation API — the core business logic is accessible

---

### Session 12: S&OP Lifecycle + Data Import APIs
**Follow:** `API Contract & Integration Map.md` (Sections 3.10-3.11)  
**Duration:** 1 session  
**Tasks:**
1. S&OP cycle CRUD + stage advancement
2. Plan-vs-Actual analysis endpoint
3. Data import: upload → map → validate → execute → status
4. WebSocket events: ForecastProgress, ForecastComplete, StockAlert, ImportProgress

**Deliverable:** Full S&OP workflow + data import pipeline accessible via API

---

### Session 13: RBAC + Security Enforcement
**Follow:** `RBAC & Security Model.md` (ALL SECTIONS)  
**Duration:** 1 session  
**Tasks:**
1. 5 role enums + permission matrix implementation
2. Middleware: CheckRole, CheckPermission
3. Field-level security: API Resources hide unit_cost from Sales Manager
4. Audit log: automatic on all model updates (Auditable trait)
5. Governance note requirement for forecast overrides
6. PostgreSQL Row-Level Security (RLS) policies
7. Rate limiting per role

**Deliverable:** Secure API — every endpoint checks role, sensitive fields hidden, all changes audited

---

## Phase P4: Multi-Tenant SaaS (Sessions 14-16)

### Session 14: Tenant Isolation + Onboarding
**Follow:** `Multi-Tenancy & SaaS Architecture.md` (Sections 2-3)  
**Duration:** 1 session  
**Tasks:**
1. Tenant registration flow (company + admin + tier)
2. Auto-provisioning: forecast_settings with BD defaults
3. Tenant suspension: past_due → read-only after 7 days
4. SaaS admin dashboard: tenant list, usage metrics
5. User impersonation for support (with audit)

**Deliverable:** Multiple tenants can register and use the system with complete data isolation

---

### Session 15: Billing + Subscription
**Follow:** `Multi-Tenancy & SaaS Architecture.md` (Sections 4-6)  
**Duration:** 1 session  
**Tasks:**
1. Laravel Cashier + Stripe integration
2. Subscription lifecycle: trial → active → past_due → cancelled
3. 3-tier feature gating (Starter/Pro/Enterprise)
4. Usage metering: forecast runs, AI queries, SKU count
5. CheckSubscriptionTier middleware
6. Stripe webhook handling

**Deliverable:** Working SaaS billing — users can subscribe, upgrade, and features are gated by tier

---

### Session 16: Scaling + Production Hardening
**Follow:** `Multi-Tenancy & SaaS Architecture.md` (Sections 8-10)  
**Duration:** 1 session  
**Tasks:**
1. Horizon dashboard for queue monitoring
2. Redis queue configuration for forecast jobs
3. Laravel scheduler for auto-recalibration (weekly)
4. Failed job handling + retry logic
5. Health check endpoints
6. Production-ready .env configuration

**Deliverable:** Production-ready SaaS platform with monitoring, queuing, and auto-maintenance

---

## Phase P5: Dashboard & UI (Sessions 17-20)

### Session 17: Dashboard Layout + S&OP Progress Bar
**Follow:** `UI/UX Specification.md` (Sections 2-3)  
**Duration:** 1 session  
**Tasks:**
1. Dark theme dashboard layout (sidebar + main + right panel)
2. S&OP Lifecycle progress bar (4 stages: Validation → Approval → Ops → Governance)
3. KPI cards: total SKUs, stock value, stockout risks, overstock, pending orders
4. Season indicator (current + next season + countdown)

**Deliverable:** Working dashboard shell with live KPIs

---

### Session 18: Forecast Visualization Charts
**Follow:** `UI/UX Specification.md` (Section 8)  
**Duration:** 1 session  
**Tasks:**
1. Consensus Forecast chart: historical bars (orange) + baseline line (blue) + consensus line (dotted blue) + confidence interval (shaded)
2. Forecast accuracy metrics table (MAPE, MAE, RMSE)
3. Forecast vs Actual comparison chart
4. Season toggle: switch season and see forecast update

**Deliverable:** Visual forecasting dashboard with interactive charts

---

### Session 19: Recommended Orders Table + Order Timeline
**Follow:** `Order Trigger & Lead Time Logic.md` (Section 7) + `UI/UX Specification.md` (Section 9)  
**Duration:** 1 session  
**Tasks:**
1. Recommended Orders data table with filtering (season, urgency, model)
2. Order Timeline Gantt chart per product (Mfg → Ship → Customs bars)
3. CNY risk warning banner + red zone on timeline
4. "Convert to PO" action button
5. Executive summary card (total spend, urgency breakdown)

**Deliverable:** THE PRIMARY OUTPUT — visual "when/what/how much to order" interface

---

### Session 20: Inventory + Import + Promo UI
**Follow:** `UI/UX Specification.md` (Sections 4-7)  
**Duration:** 1 session  
**Tasks:**
1. Inventory grid with stock status indicators (green/yellow/red)
2. Lead Time simulator toggle (Sea vs Air) with instant SS recalculation
3. Promo Index slider with live forecast adjustment
4. Data import wizard (7-step with progress)
5. Audit log slide-out panel

**Deliverable:** Complete operational UI for all non-forecast modules

---

## Phase P6: AI & Advanced Features (Sessions 21-23)

### Session 21: Ask AI - RAG Integration
**Follow:** `API Contract & Integration Map.md` (Section 5)  
**Duration:** 1 session  
**Tasks:**
1. AI/RAG service: FastAPI + pgvector + OpenAI/LangChain
2. System prompt with TrimedCast context (BD market, seasons, models)
3. Natural language query endpoint: POST /ai/query
4. Sample query handlers (stockout risk, MAPE accuracy, CNY timing)
5. UI: Ask AI search bar with auto-suggest prompt templates

**Deliverable:** Users can ask "Which products at stockout risk next 14 days?" and get data-backed answers

---

### Session 22: What-If Scenario Simulation
**Follow:** `API Contract & Integration Map.md` (Section 5.2)  
**Duration:** 1 session  
**Tasks:**
1. Scenario preview endpoint: POST /ai/scenario-preview
2. Shadow line rendering: temporary "what-if" line on forecast chart
3. Impact summary: margin impact, stock impact, cost impact
4. Sea vs Air comparison tool
5. Promo index "what if" slider

**Deliverable:** "What happens if SKU-01 moves to Air?" → instant visual answer

---

### Session 23: S&OE Control Tower + Polish
**Follow:** `UI/UX Specification.md` (Section 9) + `Project Requirements Document (PRD).md` (Section 7)  
**Duration:** 1 session  
**Tasks:**
1. S&OE short-term control tower (0-3 month horizon)
2. Stockout risk alerts with one-click "Confirm Order"
3. Push notifications for MAPE threshold breach
4. Dashboard polish: loading states, error handling, responsive design
5. Final integration testing across all modules

**Deliverable:** Production-ready SaaS platform — complete from onboarding to order recommendation

---

## 📊 Session Summary

| Phase | Sessions | Key Deliverable | Business Value |
|---|---|---|---|
| **P0** Foundation | 1-2 | App + DB running | Infrastructure |
| **P1** Data Ingestion | 3-5 | Excel import working | Data foundation |
| **P2** Core Forecasting | 6-9 | **"Order this, this many, on this date"** | ⭐ CORE IP |
| **P3** API & Backend | 10-13 | Full REST API + security | Integration |
| **P4** Multi-Tenant | 14-16 | SaaS billing + isolation | Revenue model |
| **P5** Dashboard & UI | 17-20 | Visual decision support | User adoption |
| **P6** AI & Advanced | 21-23 | Ask AI + what-if | Competitive edge |

**Total: 23 sessions → Complete Production SaaS**

---

## 🏃 Quick Start (After Clone)

```bash
cd trimedcast
cp .env.example .env
cp src/.env.example src/.env
make setup
# → http://localhost:8000 is running
# → PostgreSQL on port 5432
# → Redis on port 6379
# → Horizon dashboard at http://localhost:8000/horizon
```

---

*Document Version: 1.0 | Total Sessions: 23 | Estimated Timeline: 8-12 weeks with 2 developers*
