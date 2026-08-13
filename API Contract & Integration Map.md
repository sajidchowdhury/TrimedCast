# API Contract & Integration Map: TrimedCast

> Integrated Seasonal Demand & Inventory Forecasting System  
> Version: 1.0 | Last Updated: 2025-08-13

---

## 1. System Integration Architecture

### 1.1 Service Map

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  Frontend    │────▶│   Laravel    │────▶│  Python FastAPI     │
│  (Next.js)   │◀────│   (Port 8000)│◀────│  (Port 8001)        │
└──────────────┘     └──────┬───────┘     └─────────────────────┘
                           │
                           ├────▶ PostgreSQL (Port 5432)
                           ├────▶ Redis (Port 6379) [Queue + Cache]
                           └────▶ AI/RAG Service (Port 8002) [LLM + pgvector]
```

### 1.2 Authentication Summary

| Service | Auth Method | Details |
|---|---|---|
| Frontend ↔ Laravel | Laravel Sanctum (SPA) | Cookie-based CSRF-protected auth |
| Laravel ↔ Python | API Key + HMAC | Service-to-service, signed requests |
| Laravel ↔ AI/RAG | API Key + Rate Limit | Service-to-service |
| Mobile/3rd Party ↔ Laravel | Laravel Passport (OAuth2) | Token-based for API consumers |

### 1.3 Common Headers

| Header | Required | Description |
|---|---|---|
| Authorization | Yes | `Bearer {token}` (Sanctum) or `Bearer {oauth_token}` (Passport) |
| X-Tenant-ID | Auto-set | Set by middleware after auth — clients MUST NOT set manually |
| Accept | Yes | `application/json` |
| Content-Type | Yes (POST/PUT) | `application/json` or `multipart/form-data` (uploads) |

---

## 2. Common Response Format

### 2.1 Success Response

```json
{
  "success": true,
  "data": { },
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 150,
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 2.2 Error Response

```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "The qty_sold must be a positive integer.",
      "field": "qty_sold"
    }
  ]
}
```

### 2.3 Paginated Response

```json
{
  "success": true,
  "data": [ { }, { } ],
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 150,
    "last_page": 3,
    "from": 1,
    "to": 50
  }
}
```

### 2.4 Rate Limiting

| Endpoint Group | Limit | Per |
|---|---|---|
| Standard CRUD APIs | 60 req/min | user |
| Forecast Generation | 10 req/min | tenant |
| Data Import | 5 req/min | tenant |
| AI "Ask AI" | 20 req/min | user |
| Python Service | 100 req/min | service |

---

## 3. Frontend ↔ Laravel API Endpoints

### 3.1 Authentication & User Management

#### POST /api/v1/auth/register
Register new tenant + admin user (SaaS onboarding).

**Request:**
```json
{
  "company_name": "Triplay y Derivados El Pino",
  "subdomain": "triplay",
  "admin_name": "Carlos Mendoza",
  "admin_email": "carlos@triplay.com",
  "password": "SecurePass123!",
  "subscription_tier": "pro"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "tenant_id": "uuid",
    "user_id": "uuid",
    "token": "1|abc123...",
    "user": { "id": "uuid", "name": "Carlos Mendoza", "role": "warehouse_manager" },
    "tenant": { "id": "uuid", "name": "Triplay y Derivados El Pino", "slug": "triplay" }
  }
}
```

---

#### POST /api/v1/auth/login
**Request:**
```json
{ "email": "carlos@triplay.com", "password": "SecurePass123!" }
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "2|def456...",
    "user": { "id": "uuid", "name": "Carlos Mendoza", "role": "warehouse_manager", "tenant_id": "uuid" },
    "tenant": { "id": "uuid", "name": "Triplay y Derivados El Pino", "subscription_tier": "pro" },
    "permissions": ["products.crud", "inventory.crud", "forecasts.approve", "settings.crud"]
  }
}
```

---

#### POST /api/v1/auth/logout
**Headers:** Authorization: Bearer {token}  
**Response (200):** `{ "success": true, "data": { "message": "Logged out" } }`

---

#### GET /api/v1/auth/me
**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id", "name", "email", "role", "is_active" },
    "tenant": { "id", "name", "slug", "subscription_tier", "subscription_status" },
    "permissions": ["products.crud", ...]
  }
}
```

---

### 3.2 Dashboard

#### GET /api/v1/dashboard
Main dashboard aggregation endpoint — all KPIs in one call.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sop_cycle": {
      "id": "uuid",
      "cycle_name": "Winter 2026 S&OP",
      "current_stage": "validation",
      "stage_statuses": { "validation": "in_progress", "approval": "pending", "operationalization": "pending", "governance": "pending" }
    },
    "kpis": {
      "total_skus": 347,
      "total_stock_value_bdt": 12500000,
      "stockout_risk_count": 12,
      "overstock_count": 8,
      "pending_purchase_orders": 5,
      "pending_sales_orders": 23,
      "avg_mape": 8.5,
      "forecast_accuracy_pct": 91.5
    },
    "urgent_orders": [
      {
        "id": "uuid",
        "product_name": "Brake Pad Set - Bajaj Pulsar",
        "sku_code": "BP-001",
        "recommended_qty": 300,
        "order_trigger_date": "2025-09-15",
        "urgency": "critical"
      }
    ],
    "recent_forecasts": [ { "product_name", "season", "consensus_demand", "mape", "created_at" } ],
    "seasonal_summary": {
      "current_season": "monsoon",
      "next_season": "pre_winter",
      "days_to_next_season": 45
    }
  }
}
```

---

#### GET /api/v1/dashboard/forecast-accuracy
**Query:** `?period=monthly&months=12`  
**Response:** `{ "data": { "mape_trend": [...], "mae_trend": [...], "by_category": {...}, "by_season": {...} } }`

---

### 3.3 Products (SKU Management)

#### GET /api/v1/products
**Query:** `?page=1&per_page=50&category=fast_moving_wear&season=winter&search=brake&supplier_id=uuid&low_stock=true`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sku_code": "BP-001",
      "name": "Brake Pad Set - Front",
      "category": "fast_moving_wear",
      "season_type": "all_season",
      "motorcycle_model": { "id": "uuid", "name": "Bajaj Pulsar 150" },
      "supplier": { "id": "uuid", "name": "China Parts Co." },
      "unit_cost_bdt": 450.00,
      "selling_price_bdt": 850.00,
      "inventory": { "qty_on_hand": 120, "qty_available": 95, "qty_on_order": 200 },
      "safety_stock_qty": 50,
      "reorder_point": 80,
      "is_active": true
    }
  ],
  "meta": { "page": 1, "per_page": 50, "total": 347 }
}
```

> **RBAC:** Sales Manager — unit_cost_bdt field is null in response.

---

#### POST /api/v1/products
**RBAC:** warehouse_manager only  
**Request:**
```json
{
  "sku_code": "BP-047",
  "name": "Heavy Duty Chain - 520",
  "category": "fast_moving_wear",
  "sub_category": "chain",
  "motorcycle_model_id": "uuid",
  "supplier_id": "uuid",
  "unit_cost_bdt": 1200.00,
  "selling_price_bdt": 2200.00,
  "season_type": "winter",
  "seasonal_weight_winter": 1.30,
  "seasonal_weight_monsoon": 0.80,
  "lead_time_mode": "sea",
  "is_warranty_critical": false,
  "service_level_target": 0.95
}
```

---

#### GET /api/v1/products/{id}
**Response:** Product with motorcycle_model, supplier, inventory, latest_forecast, recommended_order

---

#### PUT /api/v1/products/{id}
**RBAC:** warehouse_manager only

#### DELETE /api/v1/products/{id}
**RBAC:** warehouse_manager only. Soft delete.

---

### 3.4 Inventory

#### GET /api/v1/inventory
**Query:** `?page=1&low_stock=true` (items below reorder point)  
**Response:** Inventory records with product details

#### PUT /api/v1/inventory/{id}
**RBAC:** warehouse_manager only. Update qty_on_hand (manual count adjustment).  
**Request:** `{ "qty_on_hand": 125, "warehouse_location": "A-12" }`

#### GET /api/v1/inventory/stockout-risks
Products where `qty_available <= safety_stock_qty`  
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "product_id": "uuid",
      "sku_code": "BP-001",
      "product_name": "Brake Pad Set - Front",
      "qty_available": 15,
      "safety_stock_qty": 50,
      "daily_consumption_rate": 3.2,
      "days_until_stockout": 4.7
    }
  ]
}
```

---

### 3.5 Sales Orders

#### GET /api/v1/sales-orders
**Query:** `?status=pending&date_from=2024-01-01&date_to=2024-12-31&product_id=uuid`  
**RBAC:** warehouse_manager (all), sales_manager (all read, own create/update)

#### POST /api/v1/sales-orders
**RBAC:** warehouse_manager, sales_manager  
**Request:**
```json
{
  "product_id": "uuid",
  "customer_name": "Rahim Auto Parts",
  "qty_ordered": 50,
  "unit_price_bdt": 850.00
}
```

#### PUT /api/v1/sales-orders/{id}/fulfill
**RBAC:** warehouse_manager only. Sets status=fulfilled, fulfilled_at=now, decrements inventory.

---

### 3.6 Purchase Orders

#### GET /api/v1/purchase-orders
**Query:** `?status=draft&supplier_id=uuid&cny_risk=true`  
**RBAC:** warehouse_manager (CRUD), sales_manager (read-only)

#### POST /api/v1/purchase-orders
Convert from recommended_orders to actual PO.  
**Request:**
```json
{
  "recommended_order_ids": ["uuid1", "uuid2"],
  "shipment_mode": "sea",
  "notes": "Winter 2026 order batch"
}
```
Auto-calculates: expected_mfg_complete_date, expected_ship_date, expected_arrival_date, expected_customs_clearance_date, expected_available_date based on lead time decomposition. Checks CNY risk.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "purchase_order_ids": ["uuid1", "uuid2"],
    "timeline": {
      "order_date": "2025-09-15",
      "mfg_complete_date": "2025-12-14",
      "ship_date": "2025-12-16",
      "arrival_date": "2026-02-06",
      "customs_clearance_date": "2026-02-16",
      "available_date": "2026-02-17"
    },
    "cny_risk": false,
    "total_cost_bdt": 540000.00
  }
}
```

#### PUT /api/v1/purchase-orders/{id}/status
**RBAC:** warehouse_manager only  
**Request:** `{ "status": "confirmed" }`  
Validates allowed transitions (draft→sent→confirmed→in_production→shipped→received).

---

### 3.7 Suppliers

| Method | Endpoint | RBAC |
|---|---|---|
| GET | /api/v1/suppliers | All (read) |
| POST | /api/v1/suppliers | warehouse_manager |
| GET | /api/v1/suppliers/{id} | All (read) |
| PUT | /api/v1/suppliers/{id} | warehouse_manager |
| DELETE | /api/v1/suppliers/{id} | warehouse_manager |

---

### 3.8 Forecasts

#### POST /api/v1/forecasts/generate
Dispatches job to Python service via Redis queue.  
**RBAC:** warehouse_manager, marketing_manager  
**Request:**
```json
{
  "season": "winter",
  "product_ids": ["uuid1", "uuid2"],
  "method_override": "prophet"
}
```
If product_ids omitted, forecasts ALL active products.  
**Response (202):**
```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "queued",
    "total_products": 347,
    "estimated_completion_seconds": 180
  }
}
```

---

#### GET /api/v1/forecasts/generation-status/{job_id}
**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "processing",
    "progress_pct": 45,
    "completed_products": 156,
    "total_products": 347,
    "current_product": "Chain 520 - Heavy Duty",
    "started_at": "2025-08-13T10:00:00Z",
    "estimated_remaining_seconds": 99
  }
}
```

---

#### GET /api/v1/forecasts
**Query:** `?season=winter&product_id=uuid&is_approved=false&method=prophet&page=1`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "product": { "sku_code": "BP-001", "name": "Brake Pad Set" },
      "season": "winter",
      "forecast_method": "prophet",
      "baseline_demand": 450,
      "seasonal_adjusted_demand": 563,
      "consensus_demand": 580,
      "eoq": 320,
      "safety_stock": 55,
      "reorder_point": 80,
      "recommended_order_qty": 280,
      "order_trigger_date": "2025-09-15",
      "expected_arrival_date": "2026-02-17",
      "mape": 8.2,
      "is_approved": false,
      "created_at": "2025-08-13T10:05:00Z"
    }
  ]
}
```

---

#### PUT /api/v1/forecasts/{id}/approve
**RBAC:** warehouse_manager, executive  
**Request:** `{ "governance_note": "Approved for Winter 2026 cycle" }` (note required)  
Triggers: locks forecast, updates sop_cycle stage if all forecasts in cycle are approved.

---

#### GET /api/v1/forecasts/compare
Forecast vs Actual comparison for charting.  
**Query:** `?product_id=uuid&months=12`  
**Response:**
```json
{
  "success": true,
  "data": {
    "product": { "sku_code": "BP-001", "name": "Brake Pad Set" },
    "comparison": [
      { "month": "2025-01", "forecasted": 450, "actual": 432, "variance": -18, "variance_pct": -4.0 },
      { "month": "2025-02", "forecasted": 420, "actual": 445, "variance": 25, "variance_pct": 5.95 }
    ],
    "metrics": { "mape": 8.2, "mae": 35.6, "rmse": 42.1 }
  }
}
```

---

### 3.9 Recommended Orders (THE PRIMARY OUTPUT)

#### GET /api/v1/recommended-orders
**Query:** `?season=winter&urgency=critical&status=pending&motorcycle_model_id=uuid&shipment_mode=sea`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "product": { "sku_code": "BP-001", "name": "Brake Pad Set - Front", "season_type": "all_season", "motorcycle_model": { "name": "Bajaj Pulsar 150" } },
      "current_stock": 95,
      "reorder_point": 80,
      "recommended_qty": 280,
      "order_trigger_date": "2025-09-15",
      "total_lead_time_days": 152,
      "manufacturing_days": 90,
      "shipment_days": 52,
      "customs_days": 10,
      "cny_buffer_days": 0,
      "shipment_mode": "sea",
      "expected_available_date": "2026-02-17",
      "urgency": "critical",
      "status": "pending",
      "timeline": {
        "order_trigger_date": "2025-09-15",
        "mfg_complete_date": "2025-12-14",
        "ship_date": "2025-12-16",
        "arrival_date": "2026-02-06",
        "customs_clearance_date": "2026-02-16",
        "available_date": "2026-02-17"
      }
    }
  ],
  "meta": { "page": 1, "per_page": 50, "total": 42 }
}
```

---

#### POST /api/v1/recommended-orders/{id}/convert-to-po
**RBAC:** warehouse_manager only. Creates a purchase_order from the recommendation. Sets recommendation status to "ordered".

#### POST /api/v1/recommended-orders/{id}/skip
**RBAC:** warehouse_manager only.  
**Request:** `{ "reason": "Sufficient stock already on order from alternate supplier" }`

#### GET /api/v1/recommended-orders/summary
Aggregated view for executive dashboard.  
**Response:**
```json
{
  "success": true,
  "data": {
    "total_recommendations": 42,
    "total_recommended_spend_bdt": 8500000,
    "by_urgency": { "critical": 5, "high": 12, "normal": 20, "low": 5 },
    "by_season": { "winter": 28, "all_season": 14 },
    "cny_at_risk_count": 3,
    "earliest_trigger_date": "2025-08-20",
    "latest_trigger_date": "2026-03-15"
  }
}
```

---

### 3.10 S&OP Lifecycle

#### GET /api/v1/sop-cycles/current
**Response:** Current cycle with stage statuses, progress percentages, and completion timestamps.

#### POST /api/v1/sop-cycles
**RBAC:** warehouse_manager, executive  
**Request:** `{ "cycle_name": "Winter 2026 S&OP", "rhythm": "monthly", "period_start": "2025-11-01", "period_end": "2026-02-28" }`

#### PUT /api/v1/sop-cycles/{id}/advance-stage
**RBAC:** warehouse_manager, executive  
**Request:** `{ "stage": "approval", "governance_note": "All forecasts validated, MAPE within threshold" }`  
Note: governance_note required when advancing past validation.

#### GET /api/v1/sop-cycles/{id}/pva
Plan-vs-Actual analysis for governance stage.  
**Response:** `{ "overall_accuracy_pct": 91.5, "by_category": [...], "skus_exceeding_threshold": [...] }`

---

### 3.11 Data Import (ETL Pipeline)

#### POST /api/v1/imports/upload
**Content-Type:** multipart/form-data  
**Request:** `file` (Excel/CSV, max 10MB) + `import_type` (sales_history|purchase_history|product_catalog|stock_levels|suppliers|motorcycle_models)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "import_id": "uuid",
    "file_name": "sales_history_2022_2024.xlsx",
    "import_type": "sales_history",
    "detected_columns": ["Date", "SKU", "Qty", "Price", "Total", "Invoice"],
    "sample_rows": [ { "Date": "2024-01-05", "SKU": "BP-001", "Qty": 25, ... } ],
    "suggested_mapping": { "Date": "sale_date", "SKU": "sku_code", "Qty": "qty_sold", "Price": "unit_price_bdt", "Total": "total_amount_bdt", "Invoice": "invoice_number" }
  }
}
```

---

#### POST /api/v1/imports/{id}/map-columns
**Request:**
```json
{
  "column_mapping": {
    "Date": "sale_date",
    "SKU": "sku_code",
    "Qty": "qty_sold",
    "Price": "unit_price_bdt",
    "Total": "total_amount_bdt",
    "Invoice": "invoice_number"
  }
}
```
**Response:** `{ "validation_preview": { "valid_rows": 2450, "warning_rows": 12, "error_rows": 3, "errors": [...] } }`

---

#### POST /api/v1/imports/{id}/execute
Triggers: validate → harmonize → insert pipeline.  
**Response:** `{ "import_id": "uuid", "status": "processing" }`

#### GET /api/v1/imports/{id}/status
**Response:**
```json
{
  "success": true,
  "data": {
    "import_id": "uuid",
    "status": "completed",
    "rows_processed": 2465,
    "rows_succeeded": 2450,
    "rows_failed": 15,
    "harmonization_rules_applied": ["outlier_removal", "promo_cleansing", "gap_filling"],
    "errors": [ { "row": 47, "field": "sku_code", "message": "SKU 'XX-999' not found in product catalog" } ]
  }
}
```

---

### 3.12 Promo Events

| Method | Endpoint | RBAC |
|---|---|---|
| GET | /api/v1/promo-events | All (read) |
| POST | /api/v1/promo-events | warehouse_manager, marketing_manager |
| PUT | /api/v1/promo-events/{id} | warehouse_manager, marketing_manager |
| DELETE | /api/v1/promo-events/{id} | warehouse_manager |

**POST Request:**
```json
{
  "name": "Eid Special 2025",
  "start_date": "2025-04-01",
  "end_date": "2025-04-15",
  "promo_index": 0.70,
  "affected_category": "fast_moving_wear",
  "is_recurring": true
}
```

---

### 3.13 Audit Log

#### GET /api/v1/audit-log
**Query:** `?entity_type=forecasts&entity_id=uuid&user_id=uuid&date_from=&date_to=&action=override`  
**RBAC:** warehouse_manager, executive, finance (read-only)  
**Response:** Paginated audit entries with previous_value/new_value diffs.

---

### 3.14 Forecast Settings

#### GET /api/v1/forecast-settings
**RBAC:** All (read)  
**Response:** Full forecast_settings object for the tenant.

#### PUT /api/v1/forecast-settings
**RBAC:** warehouse_manager only  
**Request:** Partial update — only send fields you want to change.
```json
{
  "default_alpha": 0.25,
  "manufacturing_lead_time_days": 95,
  "cny_shutdown_start": "2026-01-20",
  "cny_shutdown_end": "2026-02-20"
}
```

---

### 3.15 Motorcycle Models

| Method | Endpoint | RBAC |
|---|---|---|
| GET | /api/v1/motorcycle-models | All (read) |
| POST | /api/v1/motorcycle-models | warehouse_manager |
| PUT | /api/v1/motorcycle-models/{id} | warehouse_manager |
| DELETE | /api/v1/motorcycle-models/{id} | warehouse_manager (soft) |

---

### 3.16 Users (Tenant User Management)

#### GET /api/v1/users
**RBAC:** warehouse_manager only

#### POST /api/v1/users
**RBAC:** warehouse_manager only  
**Request:** `{ "name", "email", "password", "role" }`

#### PUT /api/v1/users/{id}/role
**RBAC:** warehouse_manager only  
**Request:** `{ "role": "marketing_manager" }`

---

## 4. Laravel ↔ Python Forecasting Service

### 4.1 Authentication
All requests include:
- Header: `X-Forecast-Service-Key: {api_key}`
- HMAC signature: `X-Signature: HMAC-SHA256(payload, secret)`

### 4.2 Endpoints

#### POST /forecast/run
Dispatched by Laravel when user triggers forecast generation.

**Request:**
```json
{
  "tenant_id": "uuid",
  "job_id": "uuid",
  "product_ids": ["uuid1", "uuid2"],
  "season": "winter",
  "forecast_horizon_months": 6,
  "historical_data": {
    "uuid1": [
      { "date": "2022-01-01", "qty_sold": 45, "unit_price": 850.0, "promo_index": 0.0 },
      { "date": "2022-02-01", "qty_sold": 52, "unit_price": 850.0, "promo_index": 0.0 }
    ]
  },
  "settings": {
    "alpha": 0.30,
    "prophet_changepoint_prior": 0.05,
    "prophet_seasonality_prior": 10.0,
    "bd_winter_months": [11, 12, 1, 2],
    "bd_monsoon_months": [6, 7, 8, 9],
    "holidays": [
      { "name": "Eid-ul-Fitr", "date": "2025-03-30" },
      { "name": "CNY_Shutdown", "date_start": "2026-01-20", "date_end": "2026-02-20" }
    ]
  },
  "product_configs": {
    "uuid1": {
      "season_type": "winter",
      "seasonal_weight_winter": 1.30,
      "seasonal_weight_summer": 0.90,
      "seasonal_weight_monsoon": 0.70,
      "unit_cost_bdt": 450.0,
      "holding_cost_pct": 20.0,
      "ordering_cost_bdt": 500.0,
      "service_level_target": 0.95,
      "is_warranty_critical": false
    }
  },
  "inventory": {
    "uuid1": { "qty_available": 95, "qty_on_order": 200, "daily_consumption_rate": 3.2 }
  },
  "lead_times": {
    "mfg_days": 90,
    "sea_shipment_days": 52,
    "air_shipment_days": 8,
    "customs_days_sea": 10,
    "customs_days_air": 3,
    "shipment_mode": "sea"
  }
}
```

**Response (202):** `{ "job_id": "uuid", "status": "processing" }`

---

#### GET /forecast/status/{job_id}
**Response:**
```json
{
  "job_id": "uuid",
  "status": "processing",
  "progress_pct": 45,
  "completed": 156,
  "total": 347,
  "current_product": "Chain 520 - Heavy Duty"
}
```

---

#### POST /forecast/callback
**Called BY Python service** when job completes. Laravel endpoint.

**Request:**
```json
{
  "job_id": "uuid",
  "tenant_id": "uuid",
  "status": "completed",
  "results": [
    {
      "product_id": "uuid1",
      "season": "winter",
      "baseline_demand": 450,
      "seasonal_adjusted_demand": 563,
      "consensus_demand": 580,
      "eoq": 320,
      "safety_stock": 55,
      "reorder_point": 80,
      "recommended_order_qty": 280,
      "order_trigger_date": "2025-09-15",
      "expected_arrival_date": "2026-02-17",
      "mape": 8.2,
      "mae": 35.6,
      "mse": 1849.0,
      "rmse": 43.0,
      "alpha": 0.30,
      "beta_0": 120.5,
      "beta_1": -0.85,
      "beta_2": 45.2
    }
  ],
  "error_metrics_summary": {
    "avg_mape": 8.5,
    "avg_mae": 38.2,
    "products_exceeding_mape_threshold": 5
  }
}
```

Laravel stores results in `forecasts` table, creates `recommended_orders`, triggers WebSocket event `ForecastComplete` to frontend.

---

#### POST /calculate/eoq
**Request:**
```json
{
  "demand": 580,
  "unit_cost_bdt": 450.0,
  "ordering_cost_bdt": 500.0,
  "holding_cost_pct": 20.0,
  "moq": 100,
  "max_stock": 500
}
```

**Response:**
```json
{
  "eoq": 316,
  "constrained_eoq": 316,
  "eoq_cost_bdt": 28420.0,
  "constraints_applied": []
}
```

---

#### POST /calculate/safety-stock
**Request:**
```json
{
  "eoq": 316,
  "review_period_days": 10,
  "mae": 35.6,
  "mean_lead_time_days": 152,
  "sigma_lt": 15.0,
  "service_level": 0.95
}
```

**Response:**
```json
{
  "safety_stock": 55,
  "safety_factor_k": 1.65,
  "review_period_component": 31.6,
  "uncertainty_buffer": 23.4
}
```

---

#### POST /calculate/order-trigger
**Request:**
```json
{
  "current_stock": 95,
  "reorder_point": 80,
  "daily_consumption_rate": 3.2,
  "mfg_days": 90,
  "shipment_days": 52,
  "customs_days": 10,
  "today": "2025-08-13",
  "cny_start": "2026-01-20",
  "cny_end": "2026-02-20"
}
```

**Response:**
```json
{
  "order_trigger_date": "2025-09-15",
  "reorder_hit_date": "2026-02-14",
  "total_lead_time_days": 152,
  "timeline": {
    "order_date": "2025-09-15",
    "mfg_complete_date": "2025-12-14",
    "ship_date": "2025-12-16",
    "arrival_date": "2026-02-06",
    "customs_date": "2026-02-16",
    "available_date": "2026-02-17"
  },
  "cny_risk": false,
  "cny_risk_reason": null,
  "cny_revised_date": null
}
```

**Example with CNY Risk:**
```json
{
  "order_trigger_date": "2025-12-01",
  "cny_risk": true,
  "cny_risk_reason": "Manufacturing period (Dec 1 - Mar 1) overlaps with CNY shutdown (Jan 20 - Feb 20). Factory will pause production for 31 days.",
  "cny_revised_date": "2025-11-01",
  "cny_buffer_days": 31,
  "timeline": {
    "order_date": "2025-11-01",
    "mfg_complete_date": "2026-01-30",
    "ship_date": "2026-02-01",
    "arrival_date": "2026-03-25",
    "customs_date": "2026-04-04",
    "available_date": "2026-04-05"
  }
}
```

---

#### POST /forecast/backtest
**Request:**
```json
{
  "tenant_id": "uuid",
  "product_ids": ["uuid1"],
  "model_type": "prophet",
  "train_pct": 80
}
```

**Response:**
```json
{
  "results": [
    {
      "product_id": "uuid1",
      "mape": 8.2,
      "mae": 35.6,
      "mse": 1849.0,
      "rmse": 43.0,
      "best_alpha": 0.30,
      "predictions_vs_actuals": [
        { "date": "2024-07-01", "predicted": 450, "actual": 432 },
        { "date": "2024-08-01", "predicted": 420, "actual": 445 }
      ]
    }
  ]
}
```

---

## 5. Laravel ↔ AI/RAG Service (Ask AI)

### 5.1 Endpoints

#### POST /ai/query
Natural language query from the "Ask AI" bar.

**Request:**
```json
{
  "query": "Which products are at stockout risk in the next 14 days?",
  "context": {
    "current_season": "monsoon",
    "active_sop_cycle_id": "uuid",
    "user_role": "warehouse_manager"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "3 products are at stockout risk within 14 days:\n\n1. **Brake Pad Set - Front (BP-001)**: 4.7 days until stockout (15 units available, 3.2/day consumption)\n2. **Air Filter - Pulsar (AF-003)**: 8.2 days until stockout (24 units available, 2.9/day)\n3. **Chain 520 (CH-012)**: 11.5 days until stockout (46 units available, 4.0/day)\n\n**Recommendation:** Expedite air shipment for BP-001 and AF-003. CH-012 has a pending sea shipment arriving in 10 days.",
    "source_data": {
      "products_at_risk": 3,
      "query_type": "stockout_risk"
    },
    "scenario_preview": null
  }
}
```

---

#### POST /ai/scenario-preview
For "What-If" queries that need a visual shadow line on charts.

**Request:**
```json
{
  "query": "What happens to safety stock if SKU BP-001 moves from sea to air shipment?",
  "base_state": {
    "product_id": "uuid",
    "current_lead_time_mode": "sea",
    "current_safety_stock": 55
  },
  "modifications": {
    "lead_time_mode": "air"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Switching BP-001 to air shipment reduces total lead time from 152 to 101 days (-34%). Safety stock drops from 55 to 37 units (-33%). Holding cost savings: ~BDT 810/month. However, air freight adds ~BDT 45/unit, increasing total cost per order by BDT 14,175 for the recommended 315 units.",
    "impact_summary": {
      "lead_time_change_days": -51,
      "safety_stock_change": -18,
      "holding_cost_savings_monthly_bdt": 810,
      "air_freight_additional_cost_bdt": 14175,
      "net_impact": "Cost increases by BDT 13,365 but reduces stockout risk window by 51 days"
    },
    "shadow_forecast_data": [ { "month": "2025-09", "baseline_safety_stock": 55, "scenario_safety_stock": 37 } ]
  }
}
```

---

### 5.2 System Prompt Template

```
You are TrimedCast AI, a supply chain intelligence assistant for motorcycle parts businesses in Bangladesh.

CONTEXT:
- Current Season: {current_season}
- S&OP Cycle: {sop_cycle_name} (Stage: {current_stage})
- Tenant: {tenant_name}

CAPABILITIES:
1. Stockout risk analysis (identify products at risk within N days)
2. Lead time scenario simulation (sea vs air, CNY impact)
3. Forecast accuracy queries (MAPE, MAE by product/category/season)
4. Cash flow impact analysis (promo index changes, shipment mode changes)
5. Order timing recommendations (when to order, considering CNY)
6. Overstock identification (products exceeding max_stock or 1.5x forecast)

DATA ACCESS:
- You can query: products, inventory, forecasts, recommended_orders, purchase_orders, sales_history
- All queries are scoped to the current tenant
- Currency: BDT (Bangladeshi Taka)
- Seasons: Winter (Nov-Feb), Summer (Mar-May), Monsoon (Jun-Sep), Pre-Winter (Oct)

RULES:
- Always provide specific numbers and product names (not generic advice)
- For what-if scenarios, show the shadow preview data
- Flag CNY risks when order dates fall in Jan 20 - Feb 20
- Reference the mathematical models (EOQ, Safety Stock) when explaining calculations
- If data is insufficient, say so explicitly rather than guessing
```

---

### 5.3 Sample Queries the AI Must Handle

| # | Query | Expected Response Type |
|---|---|---|
| 1 | "Which products are at stockout risk in the next 14 days?" | List with days_until_stockout |
| 2 | "What happens to safety stock if SKU BP-001 moves from sea to air?" | Scenario preview with shadow data |
| 3 | "Show me the MAPE accuracy for fast-moving wear parts last winter." | Metrics table by SKU |
| 4 | "What is the cash flow impact of a 0.2 increase in promo index for SKU CH-012?" | Financial impact calculation |
| 5 | "When should I place orders for winter products to avoid CNY delays?" | Order trigger dates with CNY warnings |
| 6 | "Which SKUs have forecast error above 10% and need recalibration?" | List with current MAPE |
| 7 | "What's the total recommended order spend for winter 2026?" | Aggregate financial figure |
| 8 | "Compare sea vs air shipment for all critical urgency items." | Side-by-side comparison table |

---

## 6. WebSocket Events (Real-time Updates)

### 6.1 Channel Structure
- **Private tenant channel:** `private-tenant.{tenant_id}`
- **Presence channel (multi-user):** `presence-sop.{sop_cycle_id}`

### 6.2 Events

| Event | Trigger | Payload |
|---|---|---|
| `ForecastProgress` | Python service updates progress | `{ job_id, progress_pct, current_product, completed, total }` |
| `ForecastComplete` | Forecast job finishes | `{ job_id, total_products, avg_mape, duration_seconds }` |
| `StockAlert` | Inventory crosses threshold | `{ product_id, product_name, alert_type, current_stock, threshold, days_until_stockout }` |
| `OrderStatusChanged` | PO status transition | `{ purchase_order_id, product_name, old_status, new_status, expected_dates }` |
| `SOPStageChanged` | S&OP cycle stage advance | `{ cycle_id, cycle_name, old_stage, new_stage, changed_by }` |
| `ImportProgress` | Data import step completes | `{ import_id, status, rows_processed, rows_total }` |
| `CNYRiskAlert` | Order trigger date has CNY risk | `{ recommended_order_id, product_name, order_trigger_date, cny_start, cny_end, revised_date }` |

**Alert Types for StockAlert:**
- `stockout_risk` — qty_available <= safety_stock
- `reorder_point_crossed` — qty_available <= reorder_point
- `overstock` — qty_on_hand > max_stock_qty

---

## 7. Error Handling

### 7.1 Standard Error Codes

| HTTP | Code | Description |
|---|---|---|
| 400 | VALIDATION_ERROR | Request body/params validation failed |
| 401 | UNAUTHORIZED | Invalid or expired token |
| 403 | FORBIDDEN | Role/permission denied for this action |
| 403 | TENANT_ISOLATION_VIOLATION | Attempted cross-tenant data access |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | State conflict (e.g., invalid status transition) |
| 422 | IMPORT_VALIDATION_FAILED | Data import has validation errors |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Unexpected server error |
| 503 | FORECAST_SERVICE_UNAVAILABLE | Python forecasting service is down |
| 503 | AI_SERVICE_UNAVAILABLE | AI/RAG service is down |

### 7.2 Forecast-Specific Errors

| Code | Description | Client Action |
|---|---|---|
| INSUFFICIENT_HISTORY | < 12 months data for regression | Upload more historical data |
| ALL_SKUs_BELOW_THRESHOLD | All products have MAPE > threshold | Review data quality, adjust settings |
| FORECAST_JOB_TIMEOUT | Job exceeded 10 minute limit | Retry with fewer products |
| CNY_RISK_DETECTED | Advisory, not error | Show CNY warning to user |

### 7.3 Retry Strategy

| Service | Max Retries | Backoff | Dead Letter Action |
|---|---|---|---|
| Forecast Jobs | 3 | 5s, 30s, 120s | Notify tenant admin |
| AI Queries | 2 | 3s, 15s | Return error to user |
| Import Jobs | 1 | — | Mark as failed, show errors |
| Callback (Python→Laravel) | 5 | 10s, 30s, 60s, 120s, 300s | Alert SaaS admin |

---

## 8. API Versioning

- **URL-based:** `/api/v1/...` (current)
- **Header-based (optional):** `Accept: application/vnd.trimedcast.v1+json`
- **Version deprecation:** 6 months notice before retiring old version
- **Breaking changes:** New version only; additions within v1 are non-breaking

---

## 9. Sequence Diagrams

### 9.1 Forecast Generation Flow

```
Frontend          Laravel           Redis Queue       Python Service      PostgreSQL
   │                 │                   │                  │                 │
   │─POST /forecasts/generate──▶        │                  │                 │
   │                 │──enqueue job───▶  │                  │                 │
   │                 │                   │──pick up job───▶ │                 │
   │                 │                   │                  │──fetch history──▶│
   │◀─WebSocket:ForecastProgress──      │                  │◀─data───────────│
   │                 │                   │                  │──Prophet─────   │
   │                 │                   │                  │──Regression──   │
   │                 │                   │                  │──EOQ+SS──────   │
   │                 │                   │                  │──OrderTrigger── │
   │                 │◀─POST /forecast/callback─────────────│                 │
   │                 │──store results─────────────────────────────────────▶  │
   │◀─WebSocket:ForecastComplete──      │                  │                 │
   │                 │                   │                  │                 │
```

### 9.2 Data Import Flow

```
Frontend          Laravel           PostgreSQL        Harmonization
   │                 │                   │                 │
   │─POST /imports/upload──▶            │                 │
   │◀─detected_columns+mapping──        │                 │
   │─POST /imports/{id}/map-columns──▶  │                 │
   │◀─validation_preview──────────      │                 │
   │─POST /imports/{id}/execute──▶      │                 │
   │                 │────validate──────▶                 │
   │                 │────harmonize─────────────────────▶ │
   │                 │◀─harmonized_data────────────────── │
   │                 │────INSERT────────▶                 │
   │◀─WebSocket:ImportComplete─────     │                 │
```

---

*Document Version: 1.0 | API Version: v1 | Next Review: Before Sprint 1*
