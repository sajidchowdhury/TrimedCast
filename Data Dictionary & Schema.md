# Data Dictionary & Schema: TrimedCast

> Integrated Seasonal Demand & Inventory Forecasting System  
> Multi-Tenant SaaS | PostgreSQL | Laravel 11  
> Version: 1.0 | Last Updated: 2025-08-13

---

## 1. Multi-Tenancy Architecture

### Strategy: Shared Database, Isolated Rows (tenant_id column)

Every business-facing table includes a `tenant_id` foreign key. All queries are automatically scoped via **Laravel Global Scope** to prevent cross-tenant data leakage.

```
┌───────────────────────────────────────────────────┐
│  PostgreSQL Instance (Shared)                      │
│  ├── tenants (tenant registry)                    │
│  ├── users (tenant_id scoped)                     │
│  ├── products (tenant_id scoped)                  │
│  ├── sales_history (tenant_id scoped, partitioned)│
│  └── ... all tables tenant-scoped                 │
│                                                    │
│  Global Scope: WHERE tenant_id = current_tenant() │
└───────────────────────────────────────────────────┘
```

**Enforcement Rules:**
- All Eloquent models use `BelongsToTenant` trait
- All API responses filtered by authenticated user's tenant_id
- Tenant isolation verified at **database query level** (not just UI hiding)
- Super-admin can bypass scope for cross-tenant analytics (SaaS admin only)

---

## 2. Data Type Conventions

| Convention | Implementation |
|---|---|
| Primary Keys | UUID v4 (auto-generated) |
| Timestamps | `created_at`, `updated_at` (timestamptz, UTC) |
| Soft Deletes | `deleted_at` (timestamptz, nullable) |
| Currency | `DECIMAL(14,2)` — all values in BDT (Bangladeshi Taka) |
| Percentages | `DECIMAL(5,2)` — stored as numeric (e.g., 95.00 = 95%) |
| Weights/Coefficients | `DECIMAL(6,4)` — for beta coefficients, seasonal weights |
| Enums | PostgreSQL ENUM types or CHECK constraints |
| JSON Config | `JSONB` — for flexible per-tenant settings |

---

## 3. Core Tables

### 3.1 tenants

The tenant registry — each row represents one SaaS customer (one motorcycle parts business).

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto-generated | Tenant identifier |
| name | VARCHAR(255) | NOT NULL | — | Company name |
| slug | VARCHAR(100) | NOT NULL, UNIQUE | — | URL-safe identifier (e.g., "triplay-pino") |
| domain | VARCHAR(255) | UNIQUE, NULLABLE | NULL | Custom domain (e.g., "app.triplay.com") |
| subscription_tier | ENUM | NOT NULL | 'starter' | starter, pro, enterprise |
| subscription_status | ENUM | NOT NULL | 'trial' | trial, active, past_due, cancelled |
| subscription_expires_at | TIMESTAMPTZ | NULLABLE | NULL | Subscription expiry |
| max_skus | INTEGER | NOT NULL | 500 | SKU limit per tier |
| max_users | INTEGER | NOT NULL | 5 | User limit per tier |
| settings | JSONB | NOT NULL | '{}' | Tenant-wide config (see §8) |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_tenants_slug ON tenants(slug);
CREATE UNIQUE INDEX idx_tenants_domain ON tenants(domain) WHERE domain IS NOT NULL;
```

**Settings JSONB Structure:**
```json
{
  "default_holding_cost_pct": 20.00,
  "default_ordering_cost_bdt": 500.00,
  "default_service_level": 0.95,
  "default_alpha": 0.30,
  "manufacturing_lead_time_days": 90,
  "customs_clearance_days": 10,
  "cny_shutdown_start": "2026-01-20",
  "cny_shutdown_end": "2026-02-20",
  "bd_winter_months": [11, 12, 1, 2],
  "bd_monsoon_months": [6, 7, 8, 9],
  "review_period_days": 10,
  "mape_threshold": 10.0,
  "auto_recalibrate": true
}
```

---

### 3.2 users

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | User identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| name | VARCHAR(255) | NOT NULL | — | Full name |
| email | VARCHAR(255) | NOT NULL | — | Email (unique per tenant) |
| password | VARCHAR(255) | NOT NULL | — | Bcrypt hash |
| role | ENUM | NOT NULL | 'sales_manager' | warehouse_manager, sales_manager, marketing_manager, finance, executive |
| is_active | BOOLEAN | NOT NULL | true | Account status |
| last_login_at | TIMESTAMPTZ | NULLABLE | NULL | Last login timestamp |
| settings | JSONB | NOT NULL | '{}' | User preferences |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_users_email_tenant ON users(email, tenant_id);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
```

**RBAC Permission Matrix:**

| Resource | warehouse_manager | sales_manager | marketing_manager | finance | executive |
|---|---|---|---|---|---|
| Products | CRUD | R | R | R | R |
| Inventory | CRUD | R | R | R | R |
| Sales Orders | CRUD | CR(U own) | R | R | R |
| Purchase Orders | CRUD | R | R | R | R |
| Suppliers | CRUD | R | R | R | R |
| Forecasts | CR(approve) | R | R(CR promo) | R | CR(approve) |
| Recommended Orders | CRUD | R | R | R | R |
| Unit Costs | R | — | — | R | R |
| Forecast Settings | CRUD | — | R | — | R |
| Audit Log | R | — | — | R | R |
| S&OP Cycle | CRUD | R | R | R | CR(advance) |

---

### 3.3 motorcycle_models

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Model identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| name | VARCHAR(255) | NOT NULL | — | e.g., "Bajaj Pulsar 150" |
| brand | VARCHAR(100) | NOT NULL | — | e.g., "Bajaj", "Honda" |
| year | INTEGER | NOT NULL | — | Model year |
| engine_cc | INTEGER | NULLABLE | NULL | Engine displacement |
| category | ENUM | NOT NULL | 'commuter' | commuter, sports, cruiser, scooter, off_road, electric |
| is_active | BOOLEAN | NOT NULL | true | — |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes:**
```sql
CREATE INDEX idx_moto_models_tenant ON motorcycle_models(tenant_id);
CREATE INDEX idx_moto_models_category ON motorcycle_models(category);
CREATE INDEX idx_moto_models_brand ON motorcycle_models(brand);
```

---

### 3.4 suppliers

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Supplier identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| name | VARCHAR(255) | NOT NULL | — | Supplier company name |
| country | VARCHAR(100) | NOT NULL | 'China' | Supplier country |
| city | VARCHAR(100) | NULLABLE | NULL | City |
| contact_person | VARCHAR(255) | NULLABLE | NULL | Contact name |
| email | VARCHAR(255) | NULLABLE | NULL | Contact email |
| phone | VARCHAR(50) | NULLABLE | NULL | Contact phone |
| on_time_delivery_pct | DECIMAL(5,2) | NOT NULL | 80.00 | Historical on-time % |
| performance_rating | DECIMAL(3,2) | NOT NULL | 3.00 | 1-5 rating |
| lead_time_days_manufacturing | INTEGER | NOT NULL | 90 | Mfg lead time (days) |
| lead_time_days_sea | INTEGER | NOT NULL | 52 | Sea shipment days |
| lead_time_days_air | INTEGER | NOT NULL | 8 | Air shipment days |
| moq | INTEGER | NOT NULL | 100 | Minimum order quantity |
| is_active | BOOLEAN | NOT NULL | true | — |
| notes | TEXT | NULLABLE | NULL | Free-text notes |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes:**
```sql
CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX idx_suppliers_country ON suppliers(country);
```

**BD-China Lead Time Decomposition:**
```
Sea Route:  90 (mfg) + 52 (sea) + 10 (customs) = 152 days ≈ 5 months
Air Route:  90 (mfg) + 8  (air) + 3  (customs) = 101 days ≈ 3.5 months
```

---

### 3.5 products (SKU Master)

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Product identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| sku_code | VARCHAR(50) | NOT NULL | — | Unique SKU code per tenant |
| name | VARCHAR(255) | NOT NULL | — | Product name |
| description | TEXT | NULLABLE | NULL | Detailed description |
| category | ENUM | NOT NULL | — | fast_moving_wear, warranty_critical, seasonal, accessory |
| sub_category | VARCHAR(100) | NULLABLE | NULL | E.g., "brake_pads", "chain" |
| motorcycle_model_id | UUID | FK → motorcycle_models.id, NULLABLE | NULL | Compatible model |
| supplier_id | UUID | FK → suppliers.id, NULLABLE | NULL | Primary supplier |
| unit_cost_bdt | DECIMAL(12,2) | NOT NULL | 0.00 | Purchase price (restricted view) |
| selling_price_bdt | DECIMAL(12,2) | NOT NULL | 0.00 | Selling price |
| unit_of_measure | VARCHAR(20) | NOT NULL | 'pcs' | pcs, set, pair, liter |
| season_type | ENUM | NOT NULL | 'all_season' | winter, summer, monsoon, pre_winter, all_season |
| seasonal_weight_winter | DECIMAL(4,2) | NOT NULL | 1.00 | Winter multiplier (1.25 = +25%) |
| seasonal_weight_summer | DECIMAL(4,2) | NOT NULL | 1.00 | Summer multiplier |
| seasonal_weight_monsoon | DECIMAL(4,2) | NOT NULL | 1.00 | Monsoon multiplier |
| lead_time_mode | ENUM | NOT NULL | 'sea' | sea, air, mixed |
| lead_time_days | INTEGER | NOT NULL | 152 | Computed total lead time |
| reorder_point | INTEGER | NOT NULL | 0 | Auto-calculated |
| safety_stock_qty | INTEGER | NOT NULL | 0 | Auto-calculated |
| max_stock_qty | INTEGER | NULLABLE | NULL | Warehouse capacity limit |
| is_warranty_critical | BOOLEAN | NOT NULL | false | Higher service level |
| service_level_target | DECIMAL(3,2) | NOT NULL | 0.95 | Target fill rate |
| holding_cost_pct | DECIMAL(5,2) | NULLABLE | NULL | Per-SKU override |
| ordering_cost_bdt | DECIMAL(10,2) | NULLABLE | NULL | Per-SKU override |
| promo_index | DECIMAL(3,2) | NOT NULL | 0.00 | Current promo intensity (0.0–1.0) |
| is_active | BOOLEAN | NOT NULL | true | — |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_products_sku_tenant ON products(sku_code, tenant_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_model ON products(motorcycle_model_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_season ON products(season_type);
```

**BD Seasonal Weight Defaults by Category:**

| Category | Winter | Summer | Monsoon |
|---|---|---|---|
| Fast-Moving Wear (general) | 1.25 | 0.90 | 0.70 |
| Brake Parts | 1.40 | 1.00 | 0.60 |
| Off-Road/Mud Tires | 1.50 | 0.80 | 1.10 |
| Street Performance Tires | 0.70 | 1.20 | 0.50 |
| Chains & Sprockets | 1.30 | 0.90 | 0.80 |
| Filters (Air/Oil) | 1.10 | 1.00 | 0.90 |
| Warranty-Critical (electrical) | 1.00 | 1.00 | 1.00 |
| Accessories (riding gear) | 1.50 | 0.60 | 0.40 |

---

### 3.6 inventory (Current Stock Levels)

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Record identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| product_id | UUID | FK → products.id, NOT NULL | — | Product reference |
| warehouse_location | VARCHAR(100) | NULLABLE | 'main' | Warehouse zone |
| qty_on_hand | INTEGER | NOT NULL | 0 | Physical count |
| qty_allocated | INTEGER | NOT NULL | 0 | Reserved for sales orders |
| qty_on_order | INTEGER | NOT NULL | 0 | On POs not yet received |
| qty_available | INTEGER | GENERATED | — | `qty_on_hand - qty_allocated` |
| last_counted_at | TIMESTAMPTZ | NULLABLE | NULL | Last physical count |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Generated Column:**
```sql
ALTER TABLE inventory ADD COLUMN qty_available INTEGER
  GENERATED ALWAYS AS (qty_on_hand - qty_allocated) STORED;
```

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_inventory_product_tenant ON inventory(product_id, tenant_id);
CREATE INDEX idx_inventory_low_stock ON inventory(qty_available) WHERE qty_available <= 0;
```

---

### 3.7 sales_history (Time-Series — Partitioned by Month)

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Record identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| product_id | UUID | FK → products.id, NOT NULL | — | Product reference |
| sale_date | DATE | NOT NULL | — | Date of sale |
| qty_sold | INTEGER | NOT NULL, CHECK > 0 | — | Quantity sold |
| unit_price_bdt | DECIMAL(12,2) | NOT NULL | — | Unit selling price |
| total_amount_bdt | DECIMAL(14,2) | NOT NULL | — | Line total |
| promo_applied | BOOLEAN | NOT NULL | false | Was promotion active? |
| promo_index_at_sale | DECIMAL(3,2) | NOT NULL | 0.00 | Promo index at time of sale |
| invoice_number | VARCHAR(50) | NULLABLE | NULL | Invoice reference |
| customer_type | ENUM | NOT NULL | 'retail' | retail, wholesale, fleet, warranty |
| is_harmonized | BOOLEAN | NOT NULL | false | Has data been cleansed? |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Partitioning:**
```sql
CREATE TABLE sales_history (
    id UUID DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    product_id UUID NOT NULL,
    sale_date DATE NOT NULL,
    qty_sold INTEGER NOT NULL CHECK (qty_sold > 0),
    unit_price_bdt DECIMAL(12,2) NOT NULL,
    total_amount_bdt DECIMAL(14,2) NOT NULL,
    promo_applied BOOLEAN NOT NULL DEFAULT false,
    promo_index_at_sale DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    invoice_number VARCHAR(50),
    customer_type VARCHAR(20) NOT NULL DEFAULT 'retail',
    is_harmonized BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, sale_date)
) PARTITION BY RANGE (sale_date);

-- Monthly partitions (auto-create via pg_partman)
CREATE TABLE sales_history_2024_01 PARTITION OF sales_history
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

**Indexes:**
```sql
CREATE INDEX idx_sales_product_date ON sales_history(product_id, sale_date);
CREATE INDEX idx_sales_tenant ON sales_history(tenant_id);
CREATE INDEX idx_sales_date_brin ON sales_history USING BRIN(sale_date);
```

---

### 3.8 purchase_history (Time-Series — Partitioned by Month)

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Record identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| product_id | UUID | FK → products.id, NOT NULL | — | Product reference |
| supplier_id | UUID | FK → suppliers.id, NOT NULL | — | Supplier reference |
| purchase_date | DATE | NOT NULL | — | Date order placed |
| qty_ordered | INTEGER | NOT NULL, CHECK > 0 | — | Quantity ordered |
| qty_received | INTEGER | NOT NULL | 0 | Quantity received |
| unit_cost_bdt | DECIMAL(12,2) | NOT NULL | — | Unit purchase cost |
| total_cost_bdt | DECIMAL(14,2) | NOT NULL | — | Line total |
| lead_time_actual_days | INTEGER | NULLABLE | NULL | Actual lead time (for σ_LT) |
| shipment_mode | ENUM | NOT NULL | 'sea' | sea, air |
| order_status | ENUM | NOT NULL | 'received' | draft, confirmed, shipped, received, cancelled |
| is_harmonized | BOOLEAN | NOT NULL | false | — |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Partitioning:** PARTITION BY RANGE (purchase_date) monthly — same as sales_history.

**Indexes:**
```sql
CREATE INDEX idx_purchase_product_date ON purchase_history(product_id, purchase_date);
CREATE INDEX idx_purchase_supplier ON purchase_history(supplier_id);
CREATE INDEX idx_purchase_date_brin ON purchase_history USING BRIN(purchase_date);
```

---

### 3.9 forecasts

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Forecast identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| product_id | UUID | FK → products.id, NOT NULL | — | Product reference |
| forecast_date | DATE | NOT NULL | — | Date forecast was generated |
| period_start | DATE | NOT NULL | — | Forecast period start |
| period_end | DATE | NOT NULL | — | Forecast period end |
| season | ENUM | NOT NULL | — | winter, summer, monsoon, pre_winter |
| forecast_method | ENUM | NOT NULL | 'prophet' | linear_regression, prophet, exponential_smoothing, consensus |
| baseline_demand | INTEGER | NOT NULL | 0 | Raw statistical forecast |
| seasonal_adjusted_demand | INTEGER | NOT NULL | 0 | After seasonal weights |
| consensus_demand | INTEGER | NOT NULL | 0 | After marketing/sales adjustments |
| promo_adjusted_demand | INTEGER | NOT NULL | 0 | After promo index |
| eoq | INTEGER | NOT NULL | 0 | Economic Order Quantity |
| safety_stock | INTEGER | NOT NULL | 0 | Calculated safety stock |
| reorder_point | INTEGER | NOT NULL | 0 | Reorder point |
| recommended_order_qty | INTEGER | NOT NULL | 0 | Final recommended quantity |
| order_trigger_date | DATE | NULLABLE | NULL | When to place the order |
| expected_arrival_date | DATE | NULLABLE | NULL | When goods available for sale |
| mape | DECIMAL(5,2) | NULLABLE | NULL | Mean Absolute Percentage Error |
| mae | DECIMAL(10,2) | NULLABLE | NULL | Mean Absolute Error |
| mse | DECIMAL(14,2) | NULLABLE | NULL | Mean Squared Error |
| rmse | DECIMAL(10,2) | NULLABLE | NULL | Root Mean Squared Error |
| alpha | DECIMAL(3,2) | NULLABLE | NULL | Smoothing factor used |
| beta_0 | DECIMAL(12,4) | NULLABLE | NULL | Regression intercept |
| beta_1 | DECIMAL(12,4) | NULLABLE | NULL | Price coefficient |
| beta_2 | DECIMAL(12,4) | NULLABLE | NULL | Promo coefficient |
| is_approved | BOOLEAN | NOT NULL | false | S&OP approval gate |
| approved_by | UUID | FK → users.id, NULLABLE | NULL | Who approved |
| approved_at | TIMESTAMPTZ | NULLABLE | NULL | When approved |
| sop_cycle_id | UUID | FK → sop_cycles.id, NULLABLE | NULL | S&OP cycle reference |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes:**
```sql
CREATE INDEX idx_forecasts_product_date ON forecasts(product_id, forecast_date);
CREATE INDEX idx_forecasts_tenant ON forecasts(tenant_id);
CREATE INDEX idx_forecasts_season ON forecasts(season);
CREATE INDEX idx_forecasts_sop ON forecasts(sop_cycle_id);
CREATE INDEX idx_forecasts_unapproved ON forecasts(is_approved) WHERE is_approved = false;
```

---

### 3.10 sop_cycles (S&OP Lifecycle)

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Cycle identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| cycle_name | VARCHAR(255) | NOT NULL | — | e.g., "Winter 2026 S&OP" |
| rhythm | ENUM | NOT NULL | 'monthly' | monthly, bi_weekly |
| period_start | DATE | NOT NULL | — | Cycle period start |
| period_end | DATE | NOT NULL | — | Cycle period end |
| current_stage | ENUM | NOT NULL | 'validation' | validation, approval, operationalization, governance |
| validation_status | ENUM | NOT NULL | 'pending' | pending, in_progress, completed |
| approval_status | ENUM | NOT NULL | 'pending' | pending, in_progress, completed, rejected |
| operationalization_status | ENUM | NOT NULL | 'pending' | pending, in_progress, completed |
| governance_status | ENUM | NOT NULL | 'pending' | pending, in_progress, completed |
| validation_completed_at | TIMESTAMPTZ | NULLABLE | NULL | — |
| approval_completed_at | TIMESTAMPTZ | NULLABLE | NULL | — |
| operationalization_completed_at | TIMESTAMPTZ | NULLABLE | NULL | — |
| governance_completed_at | TIMESTAMPTZ | NULLABLE | NULL | — |
| created_by | UUID | FK → users.id | — | Who initiated |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes:**
```sql
CREATE INDEX idx_sop_tenant ON sop_cycles(tenant_id);
CREATE INDEX idx_sop_stage ON sop_cycles(current_stage);
```

---

### 3.11 sales_orders

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Order identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| product_id | UUID | FK → products.id, NOT NULL | — | Product reference |
| customer_name | VARCHAR(255) | NULLABLE | NULL | Customer name |
| order_date | DATE | NOT NULL | — | Order date |
| qty_ordered | INTEGER | NOT NULL, CHECK > 0 | — | Quantity |
| unit_price_bdt | DECIMAL(12,2) | NOT NULL | — | Unit price |
| total_amount_bdt | DECIMAL(14,2) | NOT NULL | — | Line total |
| status | ENUM | NOT NULL | 'pending' | pending, confirmed, fulfilled, cancelled |
| fulfilled_at | TIMESTAMPTZ | NULLABLE | NULL | Fulfillment timestamp |
| created_by | UUID | FK → users.id | — | Who created |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes:**
```sql
CREATE INDEX idx_sales_orders_product ON sales_orders(product_id);
CREATE INDEX idx_sales_orders_date ON sales_orders(order_date);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
```

---

### 3.12 purchase_orders

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | PO identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| product_id | UUID | FK → products.id, NOT NULL | — | Product reference |
| supplier_id | UUID | FK → suppliers.id, NOT NULL | — | Supplier reference |
| order_date | DATE | NOT NULL | — | Date order placed |
| qty_ordered | INTEGER | NOT NULL, CHECK > 0 | — | Quantity |
| unit_cost_bdt | DECIMAL(12,2) | NOT NULL | — | Unit cost |
| total_cost_bdt | DECIMAL(14,2) | NOT NULL | — | Line total |
| shipment_mode | ENUM | NOT NULL | 'sea' | sea, air |
| status | ENUM | NOT NULL | 'draft' | draft, sent, confirmed, in_production, shipped, received, cancelled |
| expected_mfg_complete_date | DATE | NULLABLE | NULL | Manufacturing completion |
| expected_ship_date | DATE | NULLABLE | NULL | Expected ship date |
| expected_arrival_date | DATE | NULLABLE | NULL | Expected arrival at Chittagong |
| expected_customs_clearance_date | DATE | NULLABLE | NULL | Customs clearance |
| expected_available_date | DATE | NULLABLE | NULL | Available for sale |
| actual_received_date | DATE | NULLABLE | NULL | Actual receipt date |
| cny_risk_flag | BOOLEAN | NOT NULL | false | CNY shutdown risk |
| notes | TEXT | NULLABLE | NULL | — |
| created_by | UUID | FK → users.id | — | Who created |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Status Transition Rules:**
```
draft → sent → confirmed → in_production → shipped → received
  ↓       ↓       ↓           ↓              ↓
cancel  cancel  cancel      cancel         cancel
```

**Indexes:**
```sql
CREATE INDEX idx_po_product ON purchase_orders(product_id);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_cny ON purchase_orders(cny_risk_flag) WHERE cny_risk_flag = true;
```

---

### 3.13 recommended_orders (Primary System Output)

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Record identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| product_id | UUID | FK → products.id, NOT NULL | — | Product reference |
| forecast_id | UUID | FK → forecasts.id, NULLABLE | NULL | Source forecast |
| current_stock | INTEGER | NOT NULL | 0 | Stock at calculation time |
| reorder_point | INTEGER | NOT NULL | 0 | — |
| recommended_qty | INTEGER | NOT NULL | 0 | — |
| order_trigger_date | DATE | NOT NULL | — | **When to place order** |
| total_lead_time_days | INTEGER | NOT NULL | 152 | — |
| manufacturing_days | INTEGER | NOT NULL | 90 | — |
| shipment_days | INTEGER | NOT NULL | 52 | — |
| customs_days | INTEGER | NOT NULL | 10 | — |
| cny_buffer_days | INTEGER | NOT NULL | 0 | Extra days if CNY risk |
| shipment_mode | ENUM | NOT NULL | 'sea' | sea, air |
| expected_available_date | DATE | NOT NULL | — | When goods available for sale |
| urgency | ENUM | NOT NULL | 'normal' | critical, high, normal, low |
| status | ENUM | NOT NULL | 'pending' | pending, ordered, skipped |
| skipped_reason | TEXT | NULLABLE | NULL | Why skipped |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Urgency Logic:**
```
days_until_reorder = (current_stock - reorder_point) / daily_consumption_rate

critical: days_until_reorder <= 30  OR  order_trigger_date already past
high:     days_until_reorder <= 90
normal:   days_until_reorder <= 180
low:      days_until_reorder > 180
```

**Indexes:**
```sql
CREATE INDEX idx_rec_orders_product ON recommended_orders(product_id);
CREATE INDEX idx_rec_orders_trigger_date ON recommended_orders(order_trigger_date);
CREATE INDEX idx_rec_orders_urgency ON recommended_orders(urgency);
CREATE INDEX idx_rec_orders_status ON recommended_orders(status);
```

---

### 3.14 promo_events

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Event identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| name | VARCHAR(255) | NOT NULL | — | Campaign name |
| description | TEXT | NULLABLE | NULL | — |
| start_date | DATE | NOT NULL | — | Campaign start |
| end_date | DATE | NOT NULL | — | Campaign end |
| promo_index | DECIMAL(3,2) | NOT NULL | 0.50 | Intensity (0.0–1.0) |
| affected_product_ids | JSONB | NULLABLE | NULL | Array of product UUIDs |
| affected_category | VARCHAR(100) | NULLABLE | NULL | Category-wide impact |
| is_recurring | BOOLEAN | NOT NULL | false | Annual recurrence? |
| created_by | UUID | FK → users.id | — | Who created |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes:**
```sql
CREATE INDEX idx_promo_tenant ON promo_events(tenant_id);
CREATE INDEX idx_promo_dates ON promo_events(start_date, end_date);
CREATE INDEX idx_promo_products ON promo_events USING GIN(affected_product_ids);
```

---

### 3.15 audit_log

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Log identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| user_id | UUID | FK → users.id, NOT NULL | — | Who made the change |
| entity_type | VARCHAR(50) | NOT NULL | — | E.g., "forecast", "product" |
| entity_id | UUID | NOT NULL | — | ID of changed entity |
| action | ENUM | NOT NULL | — | create, update, delete, override |
| previous_value | JSONB | NULLABLE | NULL | State before change |
| new_value | JSONB | NULLABLE | NULL | State after change |
| governance_note | TEXT | NULLABLE | NULL | Required for manual overrides |
| ip_address | INET | NULLABLE | NULL | Request IP |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes:**
```sql
CREATE INDEX idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_log(created_at);
```

---

### 3.16 data_imports (ETL Tracking)

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Import identifier |
| tenant_id | UUID | FK → tenants.id, NOT NULL | — | Tenant scope |
| import_type | ENUM | NOT NULL | — | sales_history, purchase_history, product_catalog, stock_levels, suppliers, motorcycle_models |
| file_name | VARCHAR(255) | NOT NULL | — | Original filename |
| file_size_bytes | BIGINT | NOT NULL | 0 | File size |
| row_count | INTEGER | NOT NULL | 0 | Total rows |
| rows_succeeded | INTEGER | NOT NULL | 0 | Successfully imported |
| rows_failed | INTEGER | NOT NULL | 0 | Failed rows |
| status | ENUM | NOT NULL | 'uploading' | uploading, mapping, validating, harmonizing, importing, completed, failed |
| column_mapping | JSONB | NULLABLE | NULL | Excel→system field mapping |
| validation_errors | JSONB | NULLABLE | NULL | Validation error objects |
| harmonization_rules_applied | JSONB | NULLABLE | NULL | Rules applied |
| created_by | UUID | FK → users.id | — | Who initiated |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes:**
```sql
CREATE INDEX idx_imports_tenant ON data_imports(tenant_id);
CREATE INDEX idx_imports_status ON data_imports(status);
```

---

### 3.17 forecast_settings (Per-Tenant Config)

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| id | UUID | PK | auto | Settings identifier |
| tenant_id | UUID | FK → tenants.id, UNIQUE | — | One config per tenant |
| default_alpha | DECIMAL(3,2) | NOT NULL | 0.30 | Smoothing factor |
| default_service_level | DECIMAL(3,2) | NOT NULL | 0.95 | Target fill rate |
| default_holding_cost_pct | DECIMAL(5,2) | NOT NULL | 20.00 | Annual holding cost % |
| default_ordering_cost_bdt | DECIMAL(10,2) | NOT NULL | 500.00 | Cost per purchase order |
| manufacturing_lead_time_days | INTEGER | NOT NULL | 90 | China mfg time |
| customs_clearance_days_sea | INTEGER | NOT NULL | 10 | Chittagong port clearance |
| customs_clearance_days_air | INTEGER | NOT NULL | 3 | Air customs clearance |
| cny_shutdown_start | DATE | NULLABLE | NULL | CNY shutdown start |
| cny_shutdown_end | DATE | NULLABLE | NULL | CNY shutdown end |
| bd_winter_months | INTEGER[] | NOT NULL | '{11,12,1,2}' | BD winter months |
| bd_summer_months | INTEGER[] | NOT NULL | '{3,4,5}' | BD summer months |
| bd_monsoon_months | INTEGER[] | NOT NULL | '{6,7,8,9}' | BD monsoon months |
| bd_pre_winter_months | INTEGER[] | NOT NULL | '{10}' | BD pre-winter |
| mape_threshold | DECIMAL(5,2) | NOT NULL | 10.00 | MAPE alert % |
| auto_recalibrate | BOOLEAN | NOT NULL | true | Auto-adjust on breach |
| review_period_days | INTEGER | NOT NULL | 10 | Review period R |
| prophet_changepoint_prior | DECIMAL(3,2) | NOT NULL | 0.05 | Prophet trend flexibility |
| prophet_seasonality_prior | DECIMAL(4,1) | NOT NULL | 10.0 | Prophet seasonal strength |
| regression_window_months | INTEGER | NOT NULL | 36 | History window |
| outlier_sigma_threshold | DECIMAL(3,1) | NOT NULL | 3.0 | Outlier detection σ |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | — |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | — |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_forecast_settings_tenant ON forecast_settings(tenant_id);
```

---

## 4. Entity-Relationship Diagram

```
tenants ──1:N── users
tenants ──1:N── motorcycle_models
tenants ──1:N── suppliers
tenants ──1:N── products
tenants ──1:N── inventory
tenants ──1:N── sales_history
tenants ──1:N── purchase_history
tenants ──1:N── forecasts
tenants ──1:N── sop_cycles
tenants ──1:N── sales_orders
tenants ──1:N── purchase_orders
tenants ──1:N── recommended_orders
tenants ──1:N── promo_events
tenants ──1:N── audit_log
tenants ──1:N── data_imports
tenants ──1:1── forecast_settings

motorcycle_models ──1:N── products
suppliers ──1:N── products
suppliers ──1:N── purchase_history
suppliers ──1:N── purchase_orders

products ──1:1── inventory
products ──1:N── sales_history
products ──1:N── purchase_history
products ──1:N── forecasts
products ──1:N── sales_orders
products ──1:N── purchase_orders
products ──1:N── recommended_orders

forecasts ──1:N── recommended_orders
sop_cycles ──1:N── forecasts
users ──1:N── audit_log
users ──1:N── sales_orders (created_by)
users ──1:N── purchase_orders (created_by)
```

---

## 5. Partitioning Strategy

| Table | Strategy | Key | Retention |
|---|---|---|---|
| sales_history | RANGE by sale_date (monthly) | sale_date | Keep 5 years minimum |
| purchase_history | RANGE by purchase_date (monthly) | purchase_date | Keep 5 years minimum |

**Auto-partition via pg_partman:**
```sql
SELECT partman.create_parent(
    p_parent_table := 'public.sales_history',
    p_control := 'sale_date',
    p_type := 'range',
    p_interval := '1 month',
    p_premake := 12
);
```

---

## 6. Indexing Strategy Summary

| Index Type | Use Case | Tables |
|---|---|---|
| **B-Tree** (default) | FK columns, status, enum, equality | All tables |
| **Composite B-Tree** | Multi-column WHERE (product_id + date) | sales_history, purchase_history, forecasts |
| **BRIN** | Time-series range scans | sales_history.sale_date, purchase_history.purchase_date |
| **GIN** | JSONB containment | promo_events.affected_product_ids, data_imports |
| **Partial** | Conditional queries (unapproved, low stock) | forecasts, inventory, purchase_orders |

---

## 7. Data Integrity Constraints

### Foreign Key Cascade Rules

| Relationship | On Delete | Rationale |
|---|---|---|
| tenant_id → tenants | RESTRICT | Cannot delete tenant with data |
| product_id → products | RESTRICT | Cannot delete product with history |
| supplier_id → suppliers | SET NULL | Keep product if supplier removed |
| motorcycle_model_id → motorcycle_models | SET NULL | Keep product if model removed |
| user_id → users | SET NULL | Keep audit trail |
| forecast_id → forecasts | SET NULL | Keep recommendation if forecast re-run |

### Business Constraints (CHECK)

```sql
-- Positive margin
ALTER TABLE products ADD CONSTRAINT chk_positive_margin
    CHECK (selling_price_bdt >= unit_cost_bdt);

-- Received within ordered
ALTER TABLE purchase_history ADD CONSTRAINT chk_received_within_ordered
    CHECK (qty_received <= qty_ordered);

-- Positive seasonal weights
ALTER TABLE products ADD CONSTRAINT chk_positive_seasonal_weights
    CHECK (seasonal_weight_winter > 0 AND seasonal_weight_summer > 0 AND seasonal_weight_monsoon > 0);

-- Service level range
ALTER TABLE products ADD CONSTRAINT chk_service_level_range
    CHECK (service_level_target >= 0.50 AND service_level_target <= 0.999);

-- Promo index range
ALTER TABLE products ADD CONSTRAINT chk_promo_index_range
    CHECK (promo_index >= 0.00 AND promo_index <= 1.00);
```

---

## 8. Migration Execution Order

```
1. Extensions: uuid-ossp, pg_partman
2. ENUM types (create before tables)
3. tenants (no FK dependencies)
4. users (depends on tenants)
5. motorcycle_models (depends on tenants)
6. suppliers (depends on tenants)
7. products (depends on tenants, motorcycle_models, suppliers)
8. inventory (depends on tenants, products)
9. forecast_settings (depends on tenants)
10. sop_cycles (depends on tenants, users)
11. promo_events (depends on tenants, users)
12. sales_history (partitioned, depends on tenants, products)
13. purchase_history (partitioned, depends on tenants, products, suppliers)
14. forecasts (depends on tenants, products, users, sop_cycles)
15. sales_orders (depends on tenants, products, users)
16. purchase_orders (depends on tenants, products, suppliers, users)
17. recommended_orders (depends on tenants, products, forecasts)
18. data_imports (depends on tenants, users)
19. audit_log (depends on tenants, users)
```

---

*Document Version: 1.0 | Schema Version: 1.0 | Next Review: Before Sprint 1*
