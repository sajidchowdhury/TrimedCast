# Data Requirements & Onboarding Checklist

**Project:** TrimedCast — Integrated Seasonal Demand & Inventory Forecasting System  
**Document Type:** Data Requirements & Onboarding Specification  
**Version:** 1.0.0  
**Status:** Production-Ready  
**Last Updated:** 2025-07-11  
**Classification:** Internal — Engineering & Client-Facing  

---

## Document Purpose

This document specifies **EXACTLY** what data the client must provide to initialize the TrimedCast system, the format requirements, validation rules, and the complete onboarding pipeline from Excel upload to first forecast generation.

### Audience

| Role | Usage |
|------|-------|
| Client IT / Operations Team | Prepare data exports in the exact formats specified |
| TrimedCast Onboarding Engineer | Validate, harmonize, and load client data |
| TrimedCast Backend Engineer | Implement validation, harmonization, and import pipelines |
| Product Manager | Understand data dependencies and onboarding SLA |

### Key Principles

1. **No ambiguity** — Every column name, type, and validation rule is explicitly defined.
2. **Fail-fast validation** — Invalid data is rejected at import time with precise error messages.
3. **Harmonization before forecasting** — Raw data is never fed directly into forecast models.
4. **BD-market specificity** — All defaults, season definitions, and lead-time calculations reflect Bangladesh motorcycle-parts market conditions.

---

## Section 1: Data Classification

Data is classified into three tiers based on system dependency. The system **cannot generate forecasts** without all Mandatory data. Conditionally Required data significantly improves accuracy. Optional data provides incremental enhancement.

### 1.1 Mandatory Data (System Cannot Function Without This)

---

#### A. Product Master Catalog

| Attribute | Detail |
|-----------|--------|
| **Description** | Complete list of all SKU items the tenant sells. This is the foundational reference entity; every sales record, purchase record, and inventory position references a SKU in this catalog. |
| **Source** | Excel upload (primary), Manual entry via admin UI (secondary), ERP API (future) |
| **Expected Volume** | Minimum 300 SKUs; typical 500–2,000 SKUs; maximum 10,000 SKUs per tenant |
| **Import Sequence** | 3rd (after Motorcycle Models and Suppliers, which are referenced) |

**Required Columns:**

| # | Column Name | Data Type | Max Length | Nullable | Description |
|---|-------------|-----------|-----------|----------|-------------|
| 1 | `sku_code` | String | 50 | No | Unique product identifier. Must be stable across all imports (sales, purchases, inventory). |
| 2 | `product_name` | String | 200 | No | Human-readable product name (e.g., "Brake Pad Set – Front"). |
| 3 | `category` | Enum | — | No | One of: `fast_moving_wear`, `warranty_critical`, `seasonal`, `accessory`. |
| 4 | `sub_category` | String | 100 | No | Finer classification within category (e.g., "brake_system", "chain_kit", "filter", "tyre"). |
| 5 | `motorcycle_model_name` | String | 100 | No | Must match a model in Motorcycle Model Master. Comma-separated for multi-fit parts (e.g., "Bajaj Pulsar 150,Honda CB150F"). |
| 6 | `supplier_name` | String | 200 | No | Primary supplier. Must match a supplier in Supplier Master. |
| 7 | `unit_cost_bdt` | Decimal(12,2) | — | No | Landed cost in BDT (including duty, freight). Must be > 0. |
| 8 | `selling_price_bdt` | Decimal(12,2) | — | No | Retail selling price in BDT. Must be > 0 and >= `unit_cost_bdt`. |
| 9 | `season_type` | Enum | — | No | One of: `winter`, `summer`, `monsoon`, `pre_winter`, `all_season`. |
| 10 | `is_warranty_critical` | Enum | — | No | One of: `yes`, `no`. If `yes`, service level target defaults to 99% and stockout is flagged as critical. |
| 11 | `uom` | Enum | — | No | One of: `pcs`, `set`, `pair`, `litre`, `kg`, `meter`, `roll`, `tube`. |

**Sample Row:**

```
sku_code           : BP-FR-001
product_name       : Brake Pad Set – Front (Bajaj Pulsar 150)
category           : fast_moving_wear
sub_category       : brake_system
motorcycle_model_name : Bajaj Pulsar 150
supplier_name      : Zhejiang BrakeTech Co. Ltd.
unit_cost_bdt      : 185.00
selling_price_bdt  : 350.00
season_type        : all_season
is_warranty_critical : yes
uom                : set
```

**Validation Rules:**

| Rule ID | Rule | Severity |
|---------|------|----------|
| PM-V01 | `sku_code` must be unique across the entire catalog | Critical |
| PM-V02 | `unit_cost_bdt` must be > 0 | Critical |
| PM-V03 | `selling_price_bdt` must be > 0 | Critical |
| PM-V04 | `selling_price_bdt` must be >= `unit_cost_bdt` | Warning |
| PM-V05 | `category` must be one of the 4 allowed enum values | Critical |
| PM-V06 | `season_type` must be one of the 5 allowed enum values | Critical |
| PM-V07 | `is_warranty_critical` must be `yes` or `no` | Critical |
| PM-V08 | `motorcycle_model_name` must reference an existing model in Motorcycle Model Master | Critical |
| PM-V09 | `supplier_name` must reference an existing supplier in Supplier Master | Critical |
| PM-V10 | `uom` must be one of the 8 allowed enum values | Critical |
| PM-W01 | Total SKU count < 300 → warning that forecast confidence may be low | Warning |

**Harmonization Rules:**

| Rule ID | Rule |
|---------|------|
| PM-H01 | Trim all string fields; collapse multiple spaces to single space |
| PM-H02 | `sku_code` upper-cased automatically |
| PM-H03 | If `motorcycle_model_name` is comma-separated, create one-to-many fitment mapping |
| PM-H04 | If `selling_price_bdt` < `unit_cost_bdt`, flag as loss-leader and log warning; do not auto-correct |

---

#### B. 3-Year Sales History (Date-wise)

| Attribute | Detail |
|-----------|--------|
| **Description** | Day-level sales transactions for every SKU. This is the primary input for demand forecasting models (Holt-Winters, regression, seasonality decomposition). |
| **Source** | Excel upload (primary), POS/ERP API integration (future) |
| **Expected Volume** | 300 SKUs × 1,095 days ≈ 328,500 rows (3 years daily); up to 500,000 rows for larger catalogs |
| **Import Sequence** | 5th (after Product Catalog, which is referenced) |

**Required Columns:**

| # | Column Name | Data Type | Max Length | Nullable | Description |
|---|-------------|-----------|-----------|----------|-------------|
| 1 | `sale_date` | Date | — | No | Date of sale. Format: YYYY-MM-DD or DD/MM/YYYY (auto-detected). |
| 2 | `sku_code` | String | 50 | No | Must reference a valid SKU in Product Master Catalog. |
| 3 | `qty_sold` | Integer | — | No | Units sold on this date for this SKU. Must be >= 0. |
| 4 | `unit_price` | Decimal(12,2) | — | No | Actual selling price per unit on this transaction. |
| 5 | `total_amount` | Decimal(14,2) | — | No | Line total = qty_sold × unit_price. Used for revenue analytics. |
| 6 | `customer_type` | Enum | — | No | One of: `retail`, `wholesale`, `fleet`, `warranty`. |
| 7 | `invoice_number` | String | 50 | Yes | Invoice reference for audit trail. Used for deduplication composite key. |

**Sample Row:**

```
sale_date     : 2024-01-15
sku_code      : BP-FR-001
qty_sold      : 12
unit_price    : 350.00
total_amount  : 4200.00
customer_type : retail
invoice_number: INV-2024-001847
```

**Validation Rules:**

| Rule ID | Rule | Severity |
|---------|------|----------|
| SH-V01 | `sale_date` must be within the 3-year lookback window (today − 1095 days to today) | Critical |
| SH-V02 | `sku_code` must exist in Product Master Catalog | Critical |
| SH-V03 | `qty_sold` must be >= 0 | Critical |
| SH-V04 | `unit_price` must be > 0 | Critical |
| SH-V05 | `total_amount` must equal `qty_sold` × `unit_price` (tolerance: ±1.00 BDT for rounding) | Warning |
| SH-V06 | `customer_type` must be one of the 4 allowed enum values | Critical |
| SH-V07 | Date range must span at least 730 days (2 years minimum); 1095 days (3 years) preferred | Warning |
| SH-V08 | No future dates allowed | Critical |
| SH-V09 | No duplicate rows for same (sale_date, sku_code, invoice_number) composite key | Critical |

**Harmonization Rules:**

| Rule ID | Rule |
|---------|------|
| SH-H01 | Remove one-time bulk orders where qty_sold > 3σ from the SKU's historical mean (flagged, not deleted — moved to `sales_excluded` table) |
| SH-H02 | Flag promo-affected sales: if `sale_date` falls within a promo event window and the promo calendar is provided, tag the record with `is_promo_affected = true` |
| SH-H03 | If multiple rows exist for same (sale_date, sku_code), aggregate by summing qty_sold and recalculating weighted average unit_price |
| SH-H04 | Assign BD season tag based on `sale_date` (see Section 5.1) |
| SH-H05 | For missing date-SKU combinations within the data range, insert zero-sales rows (gap filling for continuous time series) |

---

#### C. 3-Year Purchase History (Date-wise)

| Attribute | Detail |
|-----------|--------|
| **Description** | Purchase order history used to calculate actual supplier lead times, fill rates, and inform the replenishment engine. |
| **Source** | Excel upload (primary), ERP API (future) |
| **Expected Volume** | 100,000–300,000 rows depending on order frequency |
| **Import Sequence** | 6th (after Product Catalog and Suppliers, which are referenced) |

**Required Columns:**

| # | Column Name | Data Type | Max Length | Nullable | Description |
|---|-------------|-----------|-----------|----------|-------------|
| 1 | `purchase_date` | Date | — | No | Date purchase order was placed. |
| 2 | `sku_code` | String | 50 | No | Must reference a valid SKU in Product Master Catalog. |
| 3 | `supplier_name` | String | 200 | No | Must reference a valid supplier in Supplier Master. |
| 4 | `qty_ordered` | Integer | — | No | Quantity ordered. Must be > 0. |
| 5 | `qty_received` | Integer | — | Yes | Quantity actually received. Nullable if order is still pending. |
| 6 | `unit_cost` | Decimal(12,2) | — | No | Purchase price per unit at time of order in BDT. |
| 7 | `shipment_mode` | Enum | — | No | One of: `sea`, `air`. |
| 8 | `actual_lead_time_days` | Integer | — | Yes | Total elapsed days from PO date to goods-received date. Nullable if not yet received. |
| 9 | `order_status` | Enum | — | No | One of: `pending`, `shipped`, `received`, `cancelled`, `partial`. |

**Sample Row:**

```
purchase_date        : 2024-03-01
sku_code             : BP-FR-001
supplier_name        : Zhejiang BrakeTech Co. Ltd.
qty_ordered          : 500
qty_received         : 480
unit_cost            : 180.00
shipment_mode        : sea
actual_lead_time_days: 158
order_status         : received
```

**Validation Rules:**

| Rule ID | Rule | Severity |
|---------|------|----------|
| PH-V01 | `purchase_date` must be within the 3-year lookback window | Critical |
| PH-V02 | `sku_code` must exist in Product Master Catalog | Critical |
| PH-V03 | `supplier_name` must exist in Supplier Master | Critical |
| PH-V04 | `qty_ordered` must be > 0 | Critical |
| PH-V05 | `qty_received` must be >= 0 and <= `qty_ordered` (if not null) | Critical |
| PH-V06 | `unit_cost` must be > 0 | Critical |
| PH-V07 | `shipment_mode` must be `sea` or `air` | Critical |
| PH-V08 | `order_status` must be one of the 5 allowed enum values | Critical |
| PH-V09 | If `order_status` is `received` or `partial`, `actual_lead_time_days` must not be null | Critical |
| PH-V10 | `actual_lead_time_days` must be > 0 (if not null) | Critical |
| PH-W01 | If `qty_received` < `qty_ordered` × 0.8, flag as poor fill rate | Warning |

**Harmonization Rules:**

| Rule ID | Rule |
|---------|------|
| PH-H01 | Separate `actual_lead_time_days` into components: manufacturing days, shipment days, customs days (if component data available; otherwise store as composite) |
| PH-H02 | Calculate per-supplier, per-shipment-mode average lead time for use as default in replenishment engine |
| PH-H03 | Calculate per-supplier fill rate = avg(qty_received / qty_ordered) for received orders |
| PH-H04 | Assign BD season tag based on `purchase_date` |
| PH-H05 | Flag orders where `purchase_date` falls within Chinese New Year shutdown window (see Section 5.3) |

---

#### D. Current Stock / Inventory Levels

| Attribute | Detail |
|-----------|--------|
| **Description** | Snapshot of current on-hand and allocated inventory for every SKU. Used to calculate stockout risk and initial reorder points. |
| **Source** | Excel upload (primary), WMS API sync (future) |
| **Expected Volume** | One row per SKU (300–10,000 rows) |
| **Import Sequence** | 4th (after Product Catalog, which is referenced) |

**Required Columns:**

| # | Column Name | Data Type | Max Length | Nullable | Description |
|---|-------------|-----------|-----------|----------|-------------|
| 1 | `sku_code` | String | 50 | No | Must reference a valid SKU in Product Master Catalog. |
| 2 | `qty_on_hand` | Integer | — | No | Current physical quantity in warehouse. Must be >= 0. |
| 3 | `qty_allocated` | Integer | — | No | Quantity reserved for pending sales orders. Must be >= 0. |
| 4 | `warehouse_location` | String | 100 | Yes | Warehouse identifier (e.g., "Dhaka-Main", "CTG-Port"). |

**Sample Row:**

```
sku_code          : BP-FR-001
qty_on_hand       : 85
qty_allocated     : 20
warehouse_location: Dhaka-Main
```

**Validation Rules:**

| Rule ID | Rule | Severity |
|---------|------|----------|
| SL-V01 | `sku_code` must exist in Product Master Catalog | Critical |
| SL-V02 | `sku_code` must be unique (one inventory position per SKU) | Critical |
| SL-V03 | `qty_on_hand` must be >= 0 | Critical |
| SL-V04 | `qty_allocated` must be >= 0 | Critical |
| SL-V05 | `qty_allocated` must be <= `qty_on_hand` | Warning |
| SL-W01 | Every SKU in Product Catalog should have an inventory row; missing SKUs flagged as "no stock data" | Warning |

**Harmonization Rules:**

| Rule ID | Rule |
|---------|------|
| SL-H01 | Calculate `qty_available` = `qty_on_hand` − `qty_allocated` (derived field, not imported) |
| SL-H02 | For SKUs with no inventory row, insert with `qty_on_hand = 0`, `qty_allocated = 0` and flag as "data gap" |

---

#### E. Supplier Master Data

| Attribute | Detail |
|-----------|--------|
| **Description** | Supplier information used for lead time calculation, cost modeling, and purchase order generation. Most suppliers are China-based for motorcycle parts in BD. |
| **Source** | Excel upload (primary), Manual entry (secondary) |
| **Expected Volume** | 10–100 suppliers per tenant |
| **Import Sequence** | 2nd (referenced by Product Catalog) |

**Required Columns:**

| # | Column Name | Data Type | Max Length | Nullable | Description |
|---|-------------|-----------|-----------|----------|-------------|
| 1 | `supplier_name` | String | 200 | No | Unique supplier identifier. Must match references in Product Catalog and Purchase History. |
| 2 | `country` | String | 100 | No | Country of supplier (e.g., "China", "Bangladesh", "India", "Japan", "Thailand"). |
| 3 | `city` | String | 100 | No | City of supplier (e.g., "Guangzhou", "Chongqing", "Ningbo"). |
| 4 | `contact_person` | String | 200 | Yes | Primary contact name. |
| 5 | `email` | String | 200 | Yes | Contact email. Must be valid email format if provided. |
| 6 | `phone` | String | 50 | Yes | Contact phone number (international format preferred). |
| 7 | `on_time_delivery_pct` | Decimal(5,2) | — | No | Historical on-time delivery percentage. Range: 0.00–100.00. |
| 8 | `manufacturing_lead_time_days` | Integer | — | No | Average manufacturing/production lead time in days. Must be > 0. |
| 9 | `sea_shipment_days` | Integer | — | Yes | Average sea freight transit days from supplier port to Chittagong. Nullable for non-sea suppliers. |
| 10 | `air_shipment_days` | Integer | — | Yes | Average air freight transit days from supplier to Dhaka. Nullable for non-air suppliers. |
| 11 | `moq` | Integer | — | No | Minimum order quantity per SKU for this supplier. Must be > 0. |

**Sample Row:**

```
supplier_name              : Zhejiang BrakeTech Co. Ltd.
country                    : China
city                       : Hangzhou
contact_person             : Li Wei
email                      : liwei@braketech.cn
phone                      : +86-571-8888-9999
on_time_delivery_pct       : 78.50
manufacturing_lead_time_days: 90
sea_shipment_days          : 52
air_shipment_days          : 8
moq                        : 200
```

**Validation Rules:**

| Rule ID | Rule | Severity |
|---------|------|----------|
| SM-V01 | `supplier_name` must be unique | Critical |
| SM-V02 | `on_time_delivery_pct` must be between 0.00 and 100.00 | Critical |
| SM-V03 | `manufacturing_lead_time_days` must be > 0 | Critical |
| SM-V04 | `sea_shipment_days` must be > 0 (if not null) | Critical |
| SM-V05 | `air_shipment_days` must be > 0 (if not null) | Critical |
| SM-V06 | `moq` must be > 0 | Critical |
| SM-V07 | `email` must match regex `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$` (if provided) | Warning |
| SM-W01 | If `country` is "China" and both `sea_shipment_days` and `air_shipment_days` are null, flag warning | Warning |

**Harmonization Rules:**

| Rule ID | Rule |
|---------|------|
| SM-H01 | Calculate `total_sea_lead_time` = `manufacturing_lead_time_days` + `sea_shipment_days` + `customs_clearance_days` (default 10) |
| SM-H02 | Calculate `total_air_lead_time` = `manufacturing_lead_time_days` + `air_shipment_days` + `customs_clearance_days` (default 3 for air-courier clearance) |
| SM-H03 | If China-based supplier and lead times not provided, apply BD market defaults (see Section 5.2) |

---

#### F. Motorcycle Model Master

| Attribute | Detail |
|-----------|--------|
| **Description** | Motorcycle models sold/serviced in Bangladesh. Products are mapped to models for demand aggregation and model-level forecasting. |
| **Source** | Excel upload (primary), System-provided template with common BD models (secondary) |
| **Expected Volume** | 20–100 models per tenant |
| **Import Sequence** | 1st (referenced by Product Catalog; no upstream dependencies) |

**Required Columns:**

| # | Column Name | Data Type | Max Length | Nullable | Description |
|---|-------------|-----------|-----------|----------|-------------|
| 1 | `model_name` | String | 100 | No | Unique model identifier (e.g., "Bajaj Pulsar 150", "Honda CD70", "TVS Apache RTR 160"). |
| 2 | `brand` | String | 50 | No | Brand name (e.g., "Bajaj", "Honda", "TVS", "Yamaha", "Suzuki", "Runner", "Walton", "KEEWAY"). |
| 3 | `year` | Integer | — | No | Model year or launch year (e.g., 2023). |
| 4 | `engine_cc` | Integer | — | No | Engine displacement in CC. |
| 5 | `category` | Enum | — | No | One of: `commuter`, `sports`, `cruiser`, `scooter`, `off_road`, `electric`. |

**Sample Row:**

```
model_name : Bajaj Pulsar 150
brand      : Bajaj
year       : 2023
engine_cc  : 150
category   : sports
```

**Validation Rules:**

| Rule ID | Rule | Severity |
|---------|------|----------|
| MM-V01 | `model_name` must be unique | Critical |
| MM-V02 | `year` must be between 2000 and current year + 1 | Critical |
| MM-V03 | `engine_cc` must be > 0 | Critical |
| MM-V04 | `category` must be one of the 6 allowed enum values | Critical |

**Harmonization Rules:**

| Rule ID | Rule |
|---------|------|
| MM-H01 | Normalize brand name casing (title case) |
| MM-H02 | If model already exists in system-provided BD model library, auto-link to library entry for cross-tenant benchmarking (future feature) |

**Pre-Populated BD Market Models (System Template):**

The system ships with a template containing the most common motorcycle models in Bangladesh. Tenants can import this template and modify as needed:

| model_name | brand | year | engine_cc | category |
|------------|-------|------|-----------|----------|
| Honda CD70 | Honda | 2023 | 70 | commuter |
| Honda CG125 | Honda | 2023 | 125 | commuter |
| Bajaj Pulsar 150 | Bajaj | 2023 | 150 | sports |
| Bajaj Pulsar NS160 | Bajaj | 2023 | 160 | sports |
| Bajaj Discover 125 | Bajaj | 2023 | 125 | commuter |
| TVS Apache RTR 160 | TVS | 2023 | 160 | sports |
| Yamaha FZ-S V3 | Yamaha | 2023 | 150 | sports |
| Suzuki Gixxer SF | Suzuki | 2023 | 155 | sports |
| Runner Bike RT | Runner | 2023 | 100 | commuter |
| Walton Fusion 110 | Walton | 2023 | 110 | commuter |
| KEEWAY Superlight 125 | KEEWAY | 2023 | 125 | cruiser |
| Honda Dio | Honda | 2023 | 110 | scooter |
| Bajaj Platina 110 | Bajaj | 2023 | 110 | commuter |
| TVS Radeon | TVS | 2023 | 110 | commuter |
| Yamaha RayZR | Yamaha | 2023 | 125 | scooter |

---

### 1.2 Conditionally Required Data (System Functions Better With This)

If any of these datasets are not provided, the system uses sensible defaults but forecast accuracy and inventory optimization quality will be reduced.

---

#### G. Promotional Event Calendar (3 Years)

| Attribute | Detail |
|-----------|--------|
| **Description** | Historical and planned promotional events that distort normal demand patterns. Critical for de-seasonalizing sales data and generating baseline forecasts. |
| **Source** | Excel upload or manual entry |
| **If Not Provided** | System assumes no promotional distortion in historical sales. MAPE may be 5–15% higher for promo-heavy categories. System cannot produce promo-adjusted forecasts. |

**Required Columns:**

| # | Column Name | Data Type | Nullable | Description |
|---|-------------|-----------|----------|-------------|
| 1 | `event_name` | String(200) | No | Descriptive name (e.g., "Eid-ul-Fitr Sale 2024", "Year-End Clearance"). |
| 2 | `start_date` | Date | No | Promo start date. |
| 3 | `end_date` | Date | No | Promo end date. Must be >= `start_date`. |
| 4 | `promo_index` | Decimal(3,2) | No | Demand distortion factor. 0.0 = no impact, 1.0 = pure promo-driven (no organic demand). Typical range: 0.2–0.8. |
| 5 | `affected_skus` | String | Yes | Comma-separated SKU codes affected. If null, applies to `affected_category`. |
| 6 | `affected_category` | Enum | Yes | Product category affected. One of: `fast_moving_wear`, `warranty_critical`, `seasonal`, `accessory`, `all`. |

**Sample Row:**

```
event_name       : Eid-ul-Fitr Sale 2024
start_date       : 2024-04-07
end_date         : 2024-04-16
promo_index      : 0.60
affected_skus    : NULL
affected_category: all
```

**Validation Rules:**

| Rule ID | Rule | Severity |
|---------|------|----------|
| PC-V01 | `end_date` must be >= `start_date` | Critical |
| PC-V02 | `promo_index` must be between 0.00 and 1.00 | Critical |
| PC-V03 | Overlapping events for the same SKU/category flagged for review | Warning |

**Harmonization Rules:**

| Rule ID | Rule |
|---------|------|
| PC-H01 | For each sales record, check if `sale_date` falls within any promo window for that SKU; if yes, tag `is_promo_affected = true` and store `promo_index` |
| PC-H02 | Normalized sales = actual_sales × (1 − promo_index) for baseline calculation |

---

#### H. Seasonal Weight Overrides per SKU

| Attribute | Detail |
|-----------|--------|
| **Description** | SKU-level seasonal demand weights that override category-level defaults. Allows fine-tuning for items with unusual seasonality. |
| **If Not Provided** | System uses category-level default seasonal weights derived from aggregate sales analysis. |

**Required Columns:**

| # | Column Name | Data Type | Nullable | Description |
|---|-------------|-----------|----------|-------------|
| 1 | `sku_code` | String(50) | No | Must reference a valid SKU. |
| 2 | `winter_weight` | Decimal(5,4) | No | Demand multiplier for winter season. 1.0000 = average. >1 = above average demand. |
| 3 | `summer_weight` | Decimal(5,4) | No | Demand multiplier for summer season. |
| 4 | `monsoon_weight` | Decimal(5,4) | No | Demand multiplier for monsoon season. |

**Default Category-Level Seasonal Weights (used if no SKU overrides):**

| Category | winter_weight | summer_weight | monsoon_weight | pre_winter_weight |
|----------|---------------|---------------|----------------|-------------------|
| fast_moving_wear | 1.30 | 0.90 | 0.70 | 1.10 |
| warranty_critical | 1.20 | 0.95 | 0.80 | 1.05 |
| seasonal | 1.50 | 0.70 | 0.50 | 1.30 |
| accessory | 1.10 | 1.00 | 0.85 | 1.05 |

**Validation Rules:**

| Rule ID | Rule | Severity |
|---------|------|----------|
| SW-V01 | `sku_code` must exist in Product Master Catalog | Critical |
| SW-V02 | Each weight must be > 0.0000 and <= 5.0000 | Critical |
| SW-V03 | Average of the three weights should be approximately 1.0 (±0.3) | Warning |

---

#### I. Holding Cost % per SKU or Category

| Attribute | Detail |
|-----------|--------|
| **Description** | Annual cost of holding one unit of inventory as a percentage of unit cost. Includes warehousing, insurance, depreciation, obsolescence risk. |
| **If Not Provided** | System uses tenant-level default of **20%** (typical for BD motorcycle parts market with high obsolescence risk for seasonal items). |

**Required Columns:**

| # | Column Name | Data Type | Nullable | Description |
|---|-------------|-----------|----------|-------------|
| 1 | `sku_code` | String(50) | Yes | SKU code (if null, applies to `category`). |
| 2 | `category` | Enum | Yes | Product category (if null, applies to `sku_code`). One of the 4 category enum values. |
| 3 | `holding_cost_pct` | Decimal(5,2) | No | Annual holding cost as % of unit cost. Range: 5.00–50.00. |

**Default Values:**

| Scope | Default Holding Cost % |
|-------|----------------------|
| Tenant-level (global) | 20.00% |
| Category: fast_moving_wear | 15.00% |
| Category: warranty_critical | 10.00% (lower due to mandatory stocking) |
| Category: seasonal | 30.00% (higher due to obsolescence risk) |
| Category: accessory | 25.00% |

**Validation Rules:**

| Rule ID | Rule | Severity |
|---------|------|----------|
| HC-V01 | `holding_cost_pct` must be between 5.00 and 50.00 | Critical |
| HC-V02 | Either `sku_code` or `category` must be provided (not both null) | Critical |

---

#### J. Ordering Cost per Purchase Order

| Attribute | Detail |
|-----------|--------|
| **Description** | Fixed cost of placing one purchase order (communication, documentation, customs paperwork, bank charges for L/C). Used in EOQ calculation. |
| **If Not Provided** | System uses tenant-level default of **BDT 500** per PO (covers typical BD import documentation cost). |

**Required Columns:**

| # | Column Name | Data Type | Nullable | Description |
|---|-------------|-----------|----------|-------------|
| 1 | `ordering_cost_bdt` | Decimal(10,2) | No | Cost per purchase order in BDT. Range: 100.00–10,000.00. |

**Validation Rules:**

| Rule ID | Rule | Severity |
|---------|------|----------|
| OC-V01 | `ordering_cost_bdt` must be between 100.00 and 10,000.00 | Critical |

---

#### K. Service Level Targets per SKU

| Attribute | Detail |
|-----------|--------|
| **Description** | Desired probability of not stocking out during lead time. Higher targets require more safety stock. |
| **If Not Provided** | Default **95%** for fast-moving and accessory categories; **99%** for warranty-critical items. |

**Required Columns:**

| # | Column Name | Data Type | Nullable | Description |
|---|-------------|-----------|----------|-------------|
| 1 | `sku_code` | String(50) | Yes | SKU code (if null, applies to `category`). |
| 2 | `category` | Enum | Yes | Product category. |
| 3 | `service_level_pct` | Decimal(5,2) | No | Target service level as percentage. Range: 80.00–99.99. |

**Default Values:**

| Category | Default Service Level % | Z-score |
|----------|------------------------|---------|
| fast_moving_wear | 95.00% | 1.645 |
| warranty_critical | 99.00% | 2.326 |
| seasonal | 90.00% | 1.282 |
| accessory | 95.00% | 1.645 |

**Validation Rules:**

| Rule ID | Rule | Severity |
|---------|------|----------|
| SLT-V01 | `service_level_pct` must be between 80.00 and 99.99 | Critical |
| SLT-V02 | Either `sku_code` or `category` must be provided | Critical |
| SLT-W01 | `service_level_pct` > 99.00% results in very high safety stock; flag for review | Warning |

---

### 1.3 Optional Data (Enhances Accuracy)

These datasets provide incremental improvements to forecast accuracy or business intelligence but are not required for the core forecasting and inventory optimization engines.

---

#### L. Return / Defect History

| Attribute | Detail |
|-----------|--------|
| **Description** | Historical returns and defect data. Used to adjust effective demand (net demand = gross demand − returns) and identify quality issues by supplier. |

| # | Column Name | Data Type | Nullable | Description |
|---|-------------|-----------|----------|-------------|
| 1 | `return_date` | Date | No | Date of return. |
| 2 | `sku_code` | String(50) | No | Product returned. |
| 3 | `qty_returned` | Integer | No | Quantity returned. |
| 4 | `return_reason` | Enum | No | One of: `defective`, `wrong_item`, `excess_stock`, `warranty_claim`, `customer_dissatisfied`. |
| 5 | `supplier_name` | String(200) | Yes | Supplier for quality tracking. |

---

#### M. Exchange Rate History (BDT/CNY)

| Attribute | Detail |
|-----------|--------|
| **Description** | Monthly BDT/CNY exchange rate history. Used to model cost volatility and project future purchase costs. |

| # | Column Name | Data Type | Nullable | Description |
|---|-------------|-----------|----------|-------------|
| 1 | `month` | Date (YYYY-MM-01) | No | First day of month. |
| 2 | `bdt_per_cny` | Decimal(10,4) | No | Exchange rate: how many BDT for 1 CNY. |
| 3 | `source` | String(50) | Yes | Rate source (e.g., "BB", "commercial_bank"). |

**Default:** If not provided, system uses Bangladesh Bank published rates (auto-fetched via API in future releases).

---

#### N. Competitor Pricing

| Attribute | Detail |
|-----------|--------|
| **Description** | Competitor selling prices for comparable items. Used for price elasticity modeling and competitive positioning alerts. |

| # | Column Name | Data Type | Nullable | Description |
|---|-------------|-----------|----------|-------------|
| 1 | `sku_code` | String(50) | No | Our SKU. |
| 2 | `competitor_name` | String(200) | No | Competitor identifier. |
| 3 | `competitor_price_bdt` | Decimal(12,2) | No | Competitor's selling price. |
| 4 | `observation_date` | Date | No | Date of price observation. |

---

#### O. Market Growth Indicators

| Attribute | Detail |
|-----------|--------|
| **Description** | Macro-level market data for demand trend adjustment. Includes motorcycle registration data, GDP growth, fuel prices. |

| # | Column Name | Data Type | Nullable | Description |
|---|-------------|-----------|----------|-------------|
| 1 | `indicator_name` | String(100) | No | One of: `motorcycle_registration_monthly`, `gdp_growth_yoy_pct`, `fuel_price_bdt_per_litre`, `inflation_yoy_pct`. |
| 2 | `period` | Date (YYYY-MM-01) | No | Month. |
| 3 | `value` | Decimal(14,4) | No | Indicator value. |

---

## Section 2: Excel Format Specifications

### 2.1 Universal Format Rules

| Parameter | Specification |
|-----------|---------------|
| **File Format** | Microsoft Excel `.xlsx` (no `.xls`, no `.csv` — CSV import is a planned future feature) |
| **Max File Size** | 10 MB per upload |
| **Max Rows per Sheet** | 100,000 rows (excluding header) |
| **Max Columns per Sheet** | 50 columns |
| **Header Row** | Row 1 — must contain exact column names as specified below |
| **Data Start Row** | Row 2 |
| **Date Format** | `YYYY-MM-DD` (preferred) or `DD/MM/YYYY` (auto-detected). **Never** use `MM/DD/YYYY` — ambiguous. |
| **Number Format (Integer)** | No decimal places, no thousands separator (e.g., `1500`, not `1,500`) |
| **Number Format (Currency)** | 2 decimal places, no currency symbol, no thousands separator (e.g., `185.50`, not `BDT 185.50` or `185.50 BDT`) |
| **Encoding** | UTF-8 (Excel default for .xlsx) |
| **Empty Cells** | Represent null/missing values. Do NOT use "N/A", "NULL", "-", or empty strings. |
| **Boolean Fields** | Use `yes` or `no` (lowercase). Do NOT use `true`/`false`, `1`/`0`, `Y`/`N`. |
| **Enum Fields** | Exact values as specified in Section 1. Case-sensitive (lowercase with underscores). |
| **Multi-value Fields** | Comma-separated without spaces (e.g., `BP-FR-001,BP-RR-002,CK-001`) |
| **Sheet Naming** | Each import type must use the exact sheet name specified. Additional sheets are ignored. |

### 2.2 Column Mapping Tables

#### Import A: Product Master Catalog

**Sheet Name:** `Product_Master`

| # | Column Header (Exact) | Data Type | Required | Default (if missing & optional) | Validation |
|---|----------------------|-----------|----------|---------------------------------|------------|
| 1 | `sku_code` | String(50) | Yes | — | Unique, non-empty |
| 2 | `product_name` | String(200) | Yes | — | Non-empty |
| 3 | `category` | Enum | Yes | — | One of: `fast_moving_wear`, `warranty_critical`, `seasonal`, `accessory` |
| 4 | `sub_category` | String(100) | Yes | — | Non-empty |
| 5 | `motorcycle_model_name` | String(100) | Yes | — | Must exist in Motorcycle Model Master |
| 6 | `supplier_name` | String(200) | Yes | — | Must exist in Supplier Master |
| 7 | `unit_cost_bdt` | Decimal(12,2) | Yes | — | > 0 |
| 8 | `selling_price_bdt` | Decimal(12,2) | Yes | — | > 0, >= unit_cost_bdt (warning) |
| 9 | `season_type` | Enum | Yes | — | One of: `winter`, `summer`, `monsoon`, `pre_winter`, `all_season` |
| 10 | `is_warranty_critical` | Enum | Yes | — | `yes` or `no` |
| 11 | `uom` | Enum | Yes | — | One of: `pcs`, `set`, `pair`, `litre`, `kg`, `meter`, `roll`, `tube` |

#### Import B: Sales History

**Sheet Name:** `Sales_History`

| # | Column Header (Exact) | Data Type | Required | Default (if missing & optional) | Validation |
|---|----------------------|-----------|----------|---------------------------------|------------|
| 1 | `sale_date` | Date | Yes | — | Within 3-year window |
| 2 | `sku_code` | String(50) | Yes | — | Must exist in Product Master |
| 3 | `qty_sold` | Integer | Yes | — | >= 0 |
| 4 | `unit_price` | Decimal(12,2) | Yes | — | > 0 |
| 5 | `total_amount` | Decimal(14,2) | Yes | — | ≈ qty_sold × unit_price |
| 6 | `customer_type` | Enum | Yes | — | One of: `retail`, `wholesale`, `fleet`, `warranty` |
| 7 | `invoice_number` | String(50) | No | Auto-generated | Used for dedup composite key |

#### Import C: Purchase History

**Sheet Name:** `Purchase_History`

| # | Column Header (Exact) | Data Type | Required | Default (if missing & optional) | Validation |
|---|----------------------|-----------|----------|---------------------------------|------------|
| 1 | `purchase_date` | Date | Yes | — | Within 3-year window |
| 2 | `sku_code` | String(50) | Yes | — | Must exist in Product Master |
| 3 | `supplier_name` | String(200) | Yes | — | Must exist in Supplier Master |
| 4 | `qty_ordered` | Integer | Yes | — | > 0 |
| 5 | `qty_received` | Integer | No | Null | >= 0, <= qty_ordered |
| 6 | `unit_cost` | Decimal(12,2) | Yes | — | > 0 |
| 7 | `shipment_mode` | Enum | Yes | — | `sea` or `air` |
| 8 | `actual_lead_time_days` | Integer | No | Null | > 0 |
| 9 | `order_status` | Enum | Yes | — | One of: `pending`, `shipped`, `received`, `cancelled`, `partial` |

#### Import D: Current Stock Levels

**Sheet Name:** `Current_Stock`

| # | Column Header (Exact) | Data Type | Required | Default (if missing & optional) | Validation |
|---|----------------------|-----------|----------|---------------------------------|------------|
| 1 | `sku_code` | String(50) | Yes | — | Must exist in Product Master, unique |
| 2 | `qty_on_hand` | Integer | Yes | — | >= 0 |
| 3 | `qty_allocated` | Integer | Yes | 0 | >= 0, <= qty_on_hand (warning) |
| 4 | `warehouse_location` | String(100) | No | "Default" | Non-empty if provided |

#### Import E: Supplier Master

**Sheet Name:** `Supplier_Master`

| # | Column Header (Exact) | Data Type | Required | Default (if missing & optional) | Validation |
|---|----------------------|-----------|----------|---------------------------------|------------|
| 1 | `supplier_name` | String(200) | Yes | — | Unique |
| 2 | `country` | String(100) | Yes | — | Non-empty |
| 3 | `city` | String(100) | Yes | — | Non-empty |
| 4 | `contact_person` | String(200) | No | Null | — |
| 5 | `email` | String(200) | No | Null | Valid email format |
| 6 | `phone` | String(50) | No | Null | — |
| 7 | `on_time_delivery_pct` | Decimal(5,2) | Yes | — | 0.00–100.00 |
| 8 | `manufacturing_lead_time_days` | Integer | Yes | — | > 0 |
| 9 | `sea_shipment_days` | Integer | No | 52 (if China) | > 0 |
| 10 | `air_shipment_days` | Integer | No | 8 (if China) | > 0 |
| 11 | `moq` | Integer | Yes | — | > 0 |

#### Import F: Motorcycle Model Master

**Sheet Name:** `Motorcycle_Models`

| # | Column Header (Exact) | Data Type | Required | Default (if missing & optional) | Validation |
|---|----------------------|-----------|----------|---------------------------------|------------|
| 1 | `model_name` | String(100) | Yes | — | Unique |
| 2 | `brand` | String(50) | Yes | — | Non-empty |
| 3 | `year` | Integer | Yes | — | 2000–current+1 |
| 4 | `engine_cc` | Integer | Yes | — | > 0 |
| 5 | `category` | Enum | Yes | — | One of: `commuter`, `sports`, `cruiser`, `scooter`, `off_road`, `electric` |

#### Import G: Promotional Event Calendar

**Sheet Name:** `Promo_Events`

| # | Column Header (Exact) | Data Type | Required | Default (if missing & optional) | Validation |
|---|----------------------|-----------|----------|---------------------------------|------------|
| 1 | `event_name` | String(200) | Yes | — | Non-empty |
| 2 | `start_date` | Date | Yes | — | — |
| 3 | `end_date` | Date | Yes | — | >= start_date |
| 4 | `promo_index` | Decimal(3,2) | Yes | — | 0.00–1.00 |
| 5 | `affected_skus` | String | No | Null | Comma-separated SKU codes |
| 6 | `affected_category` | Enum | No | Null | One of: `fast_moving_wear`, `warranty_critical`, `seasonal`, `accessory`, `all` |

#### Import H: Seasonal Weight Overrides

**Sheet Name:** `Seasonal_Weights`

| # | Column Header (Exact) | Data Type | Required | Default (if missing & optional) | Validation |
|---|----------------------|-----------|----------|---------------------------------|------------|
| 1 | `sku_code` | String(50) | Yes | — | Must exist in Product Master |
| 2 | `winter_weight` | Decimal(5,4) | Yes | — | > 0.0000, <= 5.0000 |
| 3 | `summer_weight` | Decimal(5,4) | Yes | — | > 0.0000, <= 5.0000 |
| 4 | `monsoon_weight` | Decimal(5,4) | Yes | — | > 0.0000, <= 5.0000 |

### 2.3 Column Name Auto-Mapping (Fuzzy Match)

The system will attempt to auto-detect column mappings using fuzzy matching against the expected column names. This reduces client friction when their Excel headers don't exactly match.

| Expected Column | Accepted Aliases (case-insensitive) |
|-----------------|-------------------------------------|
| `sku_code` | `sku`, `sku_code`, `item_code`, `product_code`, `part_number`, `part_no` |
| `product_name` | `product_name`, `item_name`, `description`, `product_description`, `item_desc` |
| `sale_date` | `sale_date`, `date`, `invoice_date`, `sales_date`, `txn_date` |
| `qty_sold` | `qty_sold`, `quantity`, `qty`, `units_sold`, `sales_qty`, `sold` |
| `unit_price` | `unit_price`, `price`, `selling_price`, `rate`, `unit_rate` |
| `supplier_name` | `supplier_name`, `supplier`, `vendor`, `vendor_name` |
| `qty_on_hand` | `qty_on_hand`, `on_hand`, `stock`, `current_stock`, `available_qty`, `balance` |

> **Note:** Fuzzy-matched columns are flagged for user confirmation before import proceeds. Exact matches are used without confirmation.

---

## Section 3: Data Validation Rules

### 3.1 Validation Architecture

The validation engine executes a three-phase pipeline on every import:

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  Phase 1:   │     │  Phase 2:    │     │  Phase 3:     │
│  Structural │────▶│  Content     │────▶│  Referential  │
│  Validation │     │  Validation  │     │  Integrity    │
└─────────────┘     └──────────────┘     └───────────────┘
   Sheet exists?      Type checks?         FK references?
   Headers match?     Range checks?        Cross-import
   Row count OK?      Enum checks?        consistency?
```

**Phase 1 — Structural Validation:** Checks file format, sheet names, column headers, and row count. Any failure here is always **Critical** and blocks further processing.

**Phase 2 — Content Validation:** Checks data types, ranges, enum values, and business logic for each cell. Failures are classified as **Critical** or **Warning**.

**Phase 3 — Referential Integrity:** Checks that foreign key references exist in previously imported data. Always **Critical**.

### 3.2 Validation Error Severity Levels

| Severity | Behavior | UI Indicator | Example |
|----------|----------|--------------|---------|
| **Critical** | Row is rejected. Import cannot proceed until all critical errors are resolved or rows are excluded. | Red | `sku_code` is null, `unit_cost_bdt` is negative, `category` value is not in allowed enum |
| **Warning** | Row is accepted but flagged. Import proceeds. Warnings are shown for review and can be acknowledged. | Yellow | `selling_price_bdt` < `unit_cost_bdt` (loss-leader), `qty_allocated` > `qty_on_hand` (over-allocation), data freshness > 30 days |
| **Info** | Row is accepted. Informational note only. | Blue | Fuzzy-matched column name, default value applied |

### 3.3 Validation Report Format

After each import, the system generates a validation report:

```json
{
  "import_id": "IMP-2025-001",
  "tenant_id": "tenant_bajaj_bd",
  "import_type": "Sales_History",
  "file_name": "sales_history_3yr.xlsx",
  "total_rows": 328500,
  "valid_rows": 327891,
  "critical_errors": 42,
  "warnings": 567,
  "info_messages": 12,
  "validation_result": "BLOCKED",
  "errors": [
    {
      "row": 1583,
      "column": "sku_code",
      "value": "BP-FR-999",
      "rule_id": "SH-V02",
      "severity": "critical",
      "message": "SKU code 'BP-FR-999' does not exist in Product Master Catalog"
    },
    {
      "row": 25891,
      "column": "unit_price",
      "value": "-350.00",
      "rule_id": "SH-V04",
      "severity": "critical",
      "message": "unit_price must be greater than 0"
    }
  ],
  "warnings": [
    {
      "row": 4821,
      "column": "total_amount",
      "value": "4150.00",
      "rule_id": "SH-V05",
      "severity": "warning",
      "message": "total_amount (4150.00) does not equal qty_sold (12) × unit_price (350.00) = 4200.00. Difference: 50.00 BDT"
    }
  ]
}
```

### 3.4 Comprehensive Validation Rules by Import Type

#### Structural Validation Rules (Phase 1 — All Imports)

| Rule ID | Rule | Applies To |
|---------|------|-----------|
| STR-V01 | File must be `.xlsx` format | All |
| STR-V02 | File size must not exceed 10 MB | All |
| STR-V03 | Sheet name must match expected name (or first sheet used with warning) | All |
| STR-V04 | Header row (Row 1) must contain all required column names | All |
| STR-V05 | No duplicate column names in header | All |
| STR-V06 | Row count must not exceed 100,000 | All |
| STR-V07 | Row count must be >= 1 (at least one data row) | All |

#### Content Validation Rules (Phase 2)

**Type Validation:**

| Check | Rule | Error Message Template |
|-------|------|----------------------|
| String | Value must be parseable as text, max length not exceeded | "Column '{col}' value exceeds max length of {max_len} characters" |
| Integer | Value must be parseable as integer (no decimals, no text) | "Column '{col}' value '{value}' is not a valid integer" |
| Decimal | Value must be parseable as decimal number | "Column '{col}' value '{value}' is not a valid decimal number" |
| Date | Value must be parseable as date in YYYY-MM-DD or DD/MM/YYYY format | "Column '{col}' value '{value}' is not a valid date. Expected format: YYYY-MM-DD or DD/MM/YYYY" |
| Enum | Value must be one of the allowed enum values (case-sensitive) | "Column '{col}' value '{value}' is not valid. Allowed values: {allowed}" |
| Boolean | Value must be `yes` or `no` | "Column '{col}' value '{value}' is not valid. Use 'yes' or 'no'" |

**Range Validation:**

| Check | Rule | Error Message Template |
|-------|------|----------------------|
| Positive | Value must be > 0 | "Column '{col}' must be greater than 0" |
| Non-Negative | Value must be >= 0 | "Column '{col}' must be 0 or greater" |
| Percentage | Value must be between 0.00 and 100.00 | "Column '{col}' must be between 0.00 and 100.00" |
| Date Window | Date must be within [today − 1095 days, today] | "Column '{col}' date '{value}' is outside the allowed 3-year window" |
| No Future | Date must be <= today | "Column '{col}' date '{value}' is in the future" |

**Uniqueness Validation:**

| Import | Unique Key | Error Message |
|--------|-----------|---------------|
| Product Master | `sku_code` | "Duplicate sku_code '{value}' found in rows {row1} and {row2}" |
| Supplier Master | `supplier_name` | "Duplicate supplier_name '{value}' found" |
| Motorcycle Model | `model_name` | "Duplicate model_name '{value}' found" |
| Current Stock | `sku_code` | "Duplicate sku_code '{value}' in stock levels" |

**Business Logic Validation:**

| Rule ID | Check | Severity | Error Message |
|---------|-------|----------|---------------|
| BL-V01 | `selling_price_bdt` >= `unit_cost_bdt` | Warning | "Selling price ({sp}) is less than unit cost ({uc}) for SKU '{sku}'. This indicates a loss-leader." |
| BL-V02 | `qty_received` <= `qty_ordered` | Critical | "qty_received ({qr}) exceeds qty_ordered ({qo}) for purchase order" |
| BL-V03 | `qty_allocated` <= `qty_on_hand` | Warning | "qty_allocated ({qa}) exceeds qty_on_hand ({qh}) for SKU '{sku}'. This indicates over-allocation." |
| BL-V04 | `end_date` >= `start_date` | Critical | "end_date ({ed}) is before start_date ({sd}) for promo event" |
| BL-V05 | `total_amount` ≈ `qty_sold` × `unit_price` (±1.00 BDT) | Warning | "total_amount ({ta}) does not match qty_sold ({qs}) × unit_price ({up}) = {expected}. Difference: {diff} BDT" |
| BL-V06 | Sales date range spans >= 730 days | Warning | "Sales history spans only {days} days. Minimum 730 days (2 years) recommended for reliable forecasting." |
| BL-V07 | Total SKU count >= 300 | Warning | "Only {count} SKUs provided. 300+ SKUs recommended for meaningful forecast generation." |

#### Referential Integrity Validation (Phase 3)

| Rule ID | Child Import | Child Column | Parent Import | Parent Column | Error Message |
|---------|-------------|-------------|--------------|--------------|---------------|
| RI-V01 | Product Master | `motorcycle_model_name` | Motorcycle Models | `model_name` | "Motorcycle model '{value}' not found in Motorcycle Model Master" |
| RI-V02 | Product Master | `supplier_name` | Supplier Master | `supplier_name` | "Supplier '{value}' not found in Supplier Master" |
| RI-V03 | Sales History | `sku_code` | Product Master | `sku_code` | "SKU code '{value}' not found in Product Master Catalog" |
| RI-V04 | Purchase History | `sku_code` | Product Master | `sku_code` | "SKU code '{value}' not found in Product Master Catalog" |
| RI-V05 | Purchase History | `supplier_name` | Supplier Master | `supplier_name` | "Supplier '{value}' not found in Supplier Master" |
| RI-V06 | Current Stock | `sku_code` | Product Master | `sku_code` | "SKU code '{value}' not found in Product Master Catalog" |
| RI-V07 | Seasonal Weights | `sku_code` | Product Master | `sku_code` | "SKU code '{value}' not found in Product Master Catalog" |

> **Note for multi-value fields:** When `motorcycle_model_name` is comma-separated, each model is validated individually. If ANY model in the list fails RI, the entire row is flagged.

---

## Section 4: Harmonization Pipeline

The harmonization pipeline transforms raw imported data into clean, analysis-ready time series. It is executed **after** all validation passes and **before** any forecast model is trained.

### 4.1 Pipeline Overview

```
  Raw Excel
     │
     ▼
┌──────────────┐
│  Step 1:     │  Map client column names to system field names
│  Column      │  Auto-detect via fuzzy matching + manual override
│  Mapping     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Step 2:     │  Convert string representations to typed values
│  Type        │  "2024-01-15" → Date, "350.00" → Decimal
│  Coercion    │  Handle BD-specific number formats (comma as thousand sep)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Step 3:     │  Remove exact duplicate rows
│  Dedup-      │  Composite key: (sale_date, sku_code, invoice_number)
│  lication    │  or (purchase_date, sku_code, supplier_name)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Step 4:     │  Flag statistical outliers (sales > 3σ from SKU mean)
│  Outlier     │  Move flagged records to sales_excluded table
│  Detection   │  Do NOT delete — preserve for audit
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Step 5:     │  Normalize sales during promo windows
│  Promo       │  adjusted_sales = actual_sales × (1 − promo_index)
│  Cleansing   │  Only if Promo Calendar is provided
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Step 6:     │  Fill gaps in time series with interpolated values
│  Gap         │  Method: 7-day centered moving average
│  Filling     │  Only for missing dates within data range
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Step 7:     │  Assign BD season to every record based on date
│  Season      │  See Section 5.1 for season definitions
│  Tagging     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Step 8:     │  Separate lead time into components
│  Lead Time   │  Manufacturing | Shipment | Customs
│  Normaliz.   │  Calculate per-supplier averages
└──────┬───────┘
       │
       ▼
  Harmonized Data (forecast-ready)
```

### 4.2 Step-by-Step Detail

---

#### Step 1: Column Mapping

**Purpose:** Map client's Excel column headers to TrimedCast system field names.

**Process:**
1. For each column header in the uploaded file, attempt exact match against the expected column names.
2. If no exact match, attempt fuzzy match using Levenshtein distance (threshold: ≤ 2 edits) against the expected column names AND accepted aliases (see Section 2.3).
3. If a fuzzy match is found, flag as "auto-mapped" and present to the user for confirmation.
4. If no match is found, flag as "unmapped" and require the user to manually select the target field or mark as "skip".
5. All required fields must be mapped before import proceeds.

**Output:** A column mapping configuration stored as:

```json
{
  "import_type": "Sales_History",
  "column_mappings": [
    {"file_column": "Date", "system_field": "sale_date", "match_type": "fuzzy", "confirmed": true},
    {"file_column": "SKU", "system_field": "sku_code", "match_type": "fuzzy", "confirmed": true},
    {"file_column": "Qty Sold", "system_field": "qty_sold", "match_type": "fuzzy", "confirmed": true},
    {"file_column": "Price", "system_field": "unit_price", "match_type": "fuzzy", "confirmed": true},
    {"file_column": "Total", "system_field": "total_amount", "match_type": "fuzzy", "confirmed": true},
    {"file_column": "Cust Type", "system_field": "customer_type", "match_type": "fuzzy", "confirmed": true},
    {"file_column": "Invoice #", "system_field": "invoice_number", "match_type": "fuzzy", "confirmed": true}
  ]
}
```

---

#### Step 2: Type Coercion

**Purpose:** Convert string representations in Excel cells to properly typed values.

**Rules:**

| Target Type | Coercion Logic | Failure Handling |
|-------------|---------------|-----------------|
| Date | Try YYYY-MM-DD first, then DD/MM/YYYY, then DD-MM-YYYY. Reject MM/DD/YYYY (ambiguous). | Mark as Critical error |
| Integer | Remove commas (thousand separators). Parse as integer. Reject if decimal present. | Mark as Critical error |
| Decimal | Remove commas. Parse as decimal. Accept up to 4 decimal places. | Mark as Critical error |
| Enum | Exact case-sensitive match against allowed values. Also try lowercase conversion. | Mark as Critical error |
| String | Trim whitespace. Collapse multiple spaces to single. Enforce max length (truncate with warning). | Truncate + Warning |

**BD-Specific Handling:**
- Bengali numeral digits (০১২৩৪৫৬৭৮৯) are converted to ASCII (0123456789)
- "BDT" or "৳" prefixes in currency fields are stripped
- Comma-as-thousand-separator is handled: `1,500` → `1500`

---

#### Step 3: Deduplication

**Purpose:** Remove exact duplicate rows that may arise from data extraction errors.

**Dedup Composite Keys by Import Type:**

| Import Type | Composite Key |
|-------------|--------------|
| Sales History | (`sale_date`, `sku_code`, `invoice_number`) |
| Purchase History | (`purchase_date`, `sku_code`, `supplier_name`, `qty_ordered`) |
| Product Master | (`sku_code`) |
| Supplier Master | (`supplier_name`) |
| Motorcycle Models | (`model_name`) |
| Current Stock | (`sku_code`) |
| Promo Events | (`event_name`, `start_date`) |

**Process:**
1. Sort rows by composite key.
2. For each group of identical keys, keep the first occurrence and log the duplicate row numbers.
3. If rows have same key but different values, flag as **Warning** (potential data conflict) and keep the row with the most recent data (or first occurrence if indeterminate).

---

#### Step 4: Outlier Detection

**Purpose:** Identify and exclude statistical outliers that would distort forecast models.

**Algorithm:**
For each SKU, calculate:
```
mean_qty = AVG(qty_sold) across all historical dates
std_qty  = STDDEV(qty_sold) across all historical dates
threshold = mean_qty + (3 × std_qty)
```

Any record where `qty_sold > threshold` is flagged as an outlier.

**Processing:**
1. Flagged records are **NOT deleted** — they are moved to the `sales_excluded` table with `exclusion_reason = 'statistical_outlier'`.
2. The original `sales_history` table is updated with zero for the outlier date-SKU combination (or the threshold value, tenant-configurable).
3. A summary report is generated: "X outlier records detected across Y SKUs, representing Z% of total sales volume."

**Exception:** If a flagged outlier coincides with a known promotional event, it is **not excluded** (promo sales are handled in Step 5 instead).

---

#### Step 5: Promo Cleansing

**Purpose:** Remove promotional distortion from baseline demand calculation.

**Only executed if** the Promotional Event Calendar (Dataset G) has been imported.

**Algorithm:**
For each sales record tagged as `is_promo_affected = true`:
```
baseline_sales = actual_sales × (1 − promo_index)
```

Where `promo_index` is the distortion factor from the matching promo event.

**Example:**
- Actual sales during Eid promo: 150 units
- Promo index for this event: 0.60
- Baseline (organic) sales: 150 × (1 − 0.60) = **60 units**
- Promo-lift sales: 150 × 0.60 = **90 units** (stored separately for promo forecast)

**Storage:**
- `sales_history.qty_sold` → stores `baseline_sales` (for forecast training)
- `sales_history.qty_sold_promo` → stores `promo-lift sales` (for promo uplift modeling)
- `sales_history.qty_sold_actual` → stores original `actual_sales` (for audit)

---

#### Step 6: Gap Filling

**Purpose:** Ensure continuous time series for forecast model training. Many small businesses have gaps in their POS data (closed days, system downtime, missed entries).

**Algorithm:**
1. For each SKU, identify the date range: `[first_sale_date, last_sale_date]`.
2. For each date in this range, check if a sales record exists.
3. If a record exists, no action.
4. If no record exists (gap):
   - If the gap is **1–7 days**: Interpolate using **7-day centered moving average** around the gap.
   - If the gap is **8–30 days**: Interpolate using **30-day centered moving average** and flag as `interpolation_quality = LOW`.
   - If the gap is **> 30 days**: Insert **zero-sales** rows and flag as `interpolation_quality = CRITICAL` (major data gap; warn user that forecast confidence is low for this SKU).
5. Gap-filled records are tagged `is_gap_filled = true` and `interpolation_method` for audit.

---

#### Step 7: Season Tagging

**Purpose:** Assign the appropriate Bangladesh season to every record based on its date.

**Tagging Function:**

```python
from datetime import date

def assign_bd_season(date: date) -> str:
    """Assign BD season based on date.
    
    Seasons defined per Section 5.1.
    """
    month = date.month
    
    if month in (11, 12, 1, 2):
        return "winter"
    elif month in (3, 4, 5):
        return "summer"
    elif month in (6, 7, 8, 9):
        return "monsoon"
    elif month == 10:
        return "pre_winter"
    
    # Fallback (should not reach)
    return "all_season"
```

**Applied to:**
- Every row in `sales_history` → `season_tag` column
- Every row in `purchase_history` → `season_tag` column
- Every forecast output → `season_tag` column

---

#### Step 8: Lead Time Normalization

**Purpose:** Decompose composite lead times into components and compute per-supplier averages for use in the replenishment engine.

**Decomposition:**

```
total_lead_time = manufacturing_days + shipment_days + customs_clearance_days
```

| Component | Source | Default (if not separable) |
|-----------|--------|---------------------------|
| Manufacturing | `supplier.manufacturing_lead_time_days` | 90 days (China) |
| Shipment (Sea) | `supplier.sea_shipment_days` | 52 days (China → Chittagong) |
| Shipment (Air) | `supplier.air_shipment_days` | 8 days (China → Dhaka) |
| Customs (Sea) | Derived or default | 10 days (Chittagong port) |
| Customs (Air) | Derived or default | 3 days (Dhaka airport) |

**Per-Supplier Average Calculation:**

For each supplier, compute from actual purchase history (orders with `order_status = 'received'`):

```sql
SELECT 
    supplier_name,
    shipment_mode,
    AVG(actual_lead_time_days) AS avg_lead_time,
    STDDEV(actual_lead_time_days) AS std_lead_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY actual_lead_time_days) AS p95_lead_time,
    COUNT(*) AS sample_size
FROM purchase_history
WHERE order_status = 'received'
  AND actual_lead_time_days IS NOT NULL
GROUP BY supplier_name, shipment_mode;
```

- `avg_lead_time` → used as default in EOQ/ROP calculations
- `p95_lead_time` → used for conservative safety stock calculation
- `std_lead_time` → used for lead time variability in safety stock formula
- `sample_size` < 5 → flag as "insufficient lead time data; using supplier master defaults"

---

## Section 5: BD Market-Specific Data Requirements

### 5.1 Bangladesh Season Definitions

The TrimedCast system uses four seasons aligned with the Bangladesh climatic calendar, which directly impacts motorcycle usage patterns and parts demand:

| Season | Date Range | Duration | Climate Characteristics | Motorcycle Usage Impact | Key Parts Demand |
|--------|-----------|----------|------------------------|----------------------|------------------|
| **Winter** | November 1 — February 28 | ~120 days | Dry, cool (12–25°C), fog in northern BD, low rainfall | **HIGH** — Ideal riding weather, peak commuting season, long-distance travel increases | Brake pads, chain kits, engine oil, filters, tyres (general wear items) |
| **Summer** | March 1 — May 31 | ~92 days | Hot (30–42°C), humid, occasional nor'wester storms | **MODERATE** — Usage continues but comfort decreases, AC/scooter preference rises | Radiator parts (for liquid-cooled), coolant, engine oil (viscosity change), electrical (fan motor, regulator) |
| **Monsoon** | June 1 — September 30 | ~122 days | Heavy rainfall, flooding in low-lying areas, waterlogged roads | **LOW** — Reduced riding, many commuters switch to alternatives, water damage to bikes | Tyre (grip/wet), brake pads (wet braking), electrical (waterproofing), rust prevention, chain lube |
| **Pre-Winter** | October 1 — October 31 | ~31 days | Transition: rain decreasing, temperatures dropping, humidity falling | **RISING** — Usage picks up, pre-winter servicing begins, **critical pre-order season** for winter stock | All categories — this is the optimal time to receive winter inventory |

**Season Transition Forecast Impact:**

The system applies season transition multipliers during the 2-week boundary periods:

| Transition Period | Multiplier | Rationale |
|-------------------|-----------|-----------|
| Last 2 weeks of Monsoon → Pre-Winter | 1.0 → 1.3 (gradual ramp) | Servicing demand picks up as riders prepare for winter |
| Last week of Pre-Winter → Winter | 1.3 → 1.5 (sharp ramp) | Full winter demand onset |
| Last 2 weeks of Winter → Summer | 1.3 → 1.0 (gradual decline) | Winter servicing completed |
| Last 2 weeks of Summer → Monsoon | 1.0 → 0.7 (gradual decline) | Rain starts, usage drops |

### 5.2 China Supply Chain Specifics

The vast majority of motorcycle parts in Bangladesh are sourced from China. The supply chain involves three sequential phases, each with its own variability:

#### Supply Chain Timeline — Sea Shipment (Most Common)

```
┌─────────────────────┐   ┌──────────────────────┐   ┌────────────────────┐   ┌───────────────────┐
│  Manufacturing      │   │  Sea Freight         │   │  Customs Clearance │   │  Inland Transport │
│  (China Factory)    │──▶│  (China → Chittagong)│──▶│  (Chittagong Port) │──▶│  (CTG → Dhaka)    │
│  ~90 days           │   │  ~45-60 days         │   │  ~7-14 days        │   │  ~2-3 days        │
└─────────────────────┘   └──────────────────────┘   └────────────────────┘   └───────────────────┘

Total: 90 + 52 + 10 + 2 ≈ 154 days (~5.1 months)
```

#### Supply Chain Timeline — Air Shipment (Emergency / High-Value)

```
┌─────────────────────┐   ┌──────────────────────┐   ┌────────────────────┐
│  Manufacturing      │   │  Air Freight         │   │  Customs Clearance │
│  (China Factory)    │──▶│  (China → Dhaka)     │──▶│  (Dhaka Airport)   │
│  ~90 days           │   │  ~7-10 days          │   │  ~3-5 days         │
└─────────────────────┘   └──────────────────────┘   └────────────────────┘

Total: 90 + 8 + 4 ≈ 102 days (~3.4 months)
```

#### Detailed Lead Time Breakdown

| Phase | Sea Shipment | Air Shipment | Variability | Notes |
|-------|-------------|-------------|------------|-------|
| Manufacturing | 90 days | 90 days | ±15 days | Depends on factory workload, raw material availability, order size vs MOQ |
| Freight Transit | 52 days (avg) | 8 days (avg) | Sea: ±8 days, Air: ±2 days | Sea: port congestion, weather. Air: flight availability |
| Customs Clearance | 10 days (avg) | 4 days (avg) | Sea: ±4 days, Air: ±2 days | Chittagong port: slower, variable. Dhaka airport: faster |
| Inland Transport | 2 days | 0 days | ±1 day | Chittagong → Dhaka by truck (sea only) |
| **Total (Average)** | **154 days** | **102 days** | — | — |
| **Total (P95/Conservative)** | **~175 days** | **~115 days** | — | Used for safety stock calculation |

#### Key Supply Chain Constraints

| Constraint | Detail | System Handling |
|-----------|--------|----------------|
| **Chinese New Year (CNY) Shutdown** | ~Jan 20 — Feb 20 annually. All Chinese factories closed. No production, no shipment booking. | See Section 5.3 for detailed CNY impact calculation |
| **Chittagong Port Congestion** | Chittagong is the primary seaport. Congestion can add 5–15 days to clearance during peak import season (Oct–Dec). | System adds +5 days to customs estimate for orders arriving Oct–Dec |
| **BD Bank L/C Processing** | Letter of Credit opening takes 5–7 business days. Must be initiated before supplier starts production. | System adds 7 days to order trigger date (L/C lead) |
| **Container Minimum** | Sea shipments typically require FCL (full container load) or LCL consolidation. Minimum practical order: ~2 CBM. | System flags if total order volume < 2 CBM for sea shipment |
| **Air Shipment Cost** | Air freight is ~4–5× sea freight cost per kg. Only justified for high-margin or warranty-critical items. | System auto-suggests air shipment only for `is_warranty_critical = yes` or margin > 60% |

### 5.3 CNY Impact Calculation

Chinese New Year (CNY) is the most significant recurring disruption to the Bangladesh motorcycle parts supply chain. The system must proactively model and alert for CNY impact.

#### CNY Shutdown Window

| Year | CNY Date (Approx.) | Factory Shutdown Window | Recovery Period |
|------|--------------------|-----------------------|-----------------|
| 2026 | January 17 | January 12 — February 16 | February 17 — March 3 (ramp-up) |
| 2027 | February 6 | February 1 — March 6 | March 7 — March 21 (ramp-up) |
| 2028 | January 26 | January 21 — February 25 | February 26 — March 12 (ramp-up) |
| 2029 | February 13 | February 8 — March 15 | March 16 — March 30 (ramp-up) |
| 2030 | February 3 | January 29 — March 5 | March 6 — March 20 (ramp-up) |

> **Note:** Exact CNY dates vary each year. The system maintains a configurable CNY calendar. Shutdown is typically 3 weeks before CNY date (factories wind down) through 2 weeks after (workers return). Add 2 weeks for full production recovery.

#### CNY Impact Algorithm

```python
from datetime import date, timedelta

def calculate_cny_impact(
    order_trigger_date: date,
    manufacturing_days: int,
    cny_shutdown_start: date,
    cny_shutdown_end: date,
    recovery_days: int = 14
) -> dict:
    """Calculate the impact of Chinese New Year on an order.
    
    Returns:
        dict with keys:
            - is_affected: bool — whether CNY impacts this order
            - revised_trigger_date: date — adjusted order placement date
            - cny_buffer_days: int — additional days added due to CNY
            - expected_delivery_date: date — revised expected delivery
            - alert_message: str — human-readable alert
    """
    # Manufacturing period: [order_trigger_date, order_trigger_date + manufacturing_days]
    mfg_start = order_trigger_date
    mfg_end = order_trigger_date + timedelta(days=manufacturing_days)
    
    # Check if manufacturing period overlaps with CNY shutdown
    cny_full_end = cny_shutdown_end + timedelta(days=recovery_days)
    
    if mfg_end <= cny_shutdown_start or mfg_start >= cny_full_end:
        # No overlap — CNY does not affect this order
        return {
            "is_affected": False,
            "revised_trigger_date": order_trigger_date,
            "cny_buffer_days": 0,
            "expected_delivery_date": mfg_end,
            "alert_message": None
        }
    
    # CNY AFFECTS this order
    # Option A: Order BEFORE CNY (order early so manufacturing completes before shutdown)
    latest_pre_cny_trigger = cny_shutdown_start - timedelta(days=manufacturing_days + 7)
    
    # Option B: Order AFTER CNY (wait until factories fully recover)
    earliest_post_cny_trigger = cny_full_end
    
    if order_trigger_date < cny_shutdown_start:
        cny_buffer_days = (cny_shutdown_start - latest_pre_cny_trigger).days - \
                          (cny_shutdown_start - order_trigger_date).days
        revised_trigger = latest_pre_cny_trigger
        alert = (
            f"CNY ALERT: Order on {order_trigger_date} will NOT complete manufacturing "
            f"before CNY shutdown ({cny_shutdown_start}). "
            f"Recommend ordering by {latest_pre_cny_trigger} to avoid delays. "
            f"Alternatively, delay order until {earliest_post_cny_trigger}."
        )
    else:
        cny_buffer_days = (earliest_post_cny_trigger - order_trigger_date).days
        revised_trigger = earliest_post_cny_trigger
        alert = (
            f"CNY ALERT: Order on {order_trigger_date} falls within CNY shutdown/recovery. "
            f"Revised order trigger: {earliest_post_cny_trigger}. "
            f"CNY buffer: +{cny_buffer_days} days."
        )
    
    revised_mfg_end = revised_trigger + timedelta(days=manufacturing_days)
    
    return {
        "is_affected": True,
        "revised_trigger_date": revised_trigger,
        "cny_buffer_days": max(cny_buffer_days, 0),
        "expected_delivery_date": revised_mfg_end,
        "alert_message": alert
    }
```

#### CNY Planning Recommendations

For each SKU with a projected stockout date, the system checks:

1. **Is the stockout date within the CNY-affected period?** If yes, the replenishment order must be placed early enough to complete manufacturing BEFORE CNY shutdown, or delayed until after recovery.

2. **Pre-CNY bulk ordering strategy:** For fast-moving and warranty-critical items, the system recommends a **pre-CNY bulk order** covering estimated demand during the CNY shutdown + recovery period (approximately 6 weeks of demand).

3. **CNY demand pre-build calculation:**

```
cny_period_demand = avg_weekly_demand × 6 weeks
pre_cny_order_qty = cny_period_demand − projected_on_hand_at_cny_start
```

4. **Alert generation timeline:**
   - **T-120 days before CNY:** Initial alert — "CNY approaching. Review orders for affected SKUs."
   - **T-90 days before CNY:** Critical alert — "Last chance to place sea-shipment orders for pre-CNY delivery."
   - **T-30 days before CNY:** Final alert — "Pre-CNY order window closing. Only air shipment can deliver before CNY."

---

## Section 6: Onboarding Workflow

### 6.1 Complete Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TRIMEDCAST ONBOARDING WORKFLOW                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 1: Tenant Registration                                            │
│  ├── Company name, subdomain, admin email                               │
│  ├── Admin user creation (email + password)                             │
│  └── Email verification                                                 │
│           │                                                             │
│           ▼                                                             │
│  Step 2: Subscription Selection                                         │
│  ├── Starter (≤ 500 SKUs, 1 warehouse)                                 │
│  ├── Pro (≤ 2,000 SKUs, 3 warehouses)                                  │
│  └── Enterprise (≤ 10,000 SKUs, unlimited warehouses, API access)       │
│           │                                                             │
│           ▼                                                             │
│  Step 3: Forecast Settings Configuration                                │
│  ├── Default holding cost % (default: 20%)                              │
│  ├── Default ordering cost BDT (default: 500)                           │
│  ├── Default service level targets per category                         │
│  ├── Default lead times (sea: 154 days, air: 102 days)                  │
│  ├── Season definitions (BD defaults pre-loaded, editable)              │
│  ├── CNY calendar (next 3 years pre-loaded, editable)                   │
│  └── Currency: BDT (fixed for BD market)                                │
│           │                                                             │
│           ▼                                                             │
│  Step 4: Data Import Sequence (strict order — referential integrity)    │
│  │                                                                      │
│  │  4a. Motorcycle Models ──────────── (no dependencies)               │
│  │       │                                                              │
│  │       ▼                                                              │
│  │  4b. Supplier Master ───────────── (no dependencies)                 │
│  │       │                                                              │
│  │       ▼                                                              │
│  │  4c. Product Catalog ───────────── (depends on 4a, 4b)              │
│  │       │                                                              │
│  │       ▼                                                              │
│  │  4d. Current Stock Levels ──────── (depends on 4c)                  │
│  │       │                                                              │
│  │       ▼                                                              │
│  │  4e. Sales History ─────────────── (depends on 4c)                  │
│  │       │                                                              │
│  │       ▼                                                              │
│  │  4f. Purchase History ──────────── (depends on 4c, 4b)              │
│  │       │                                                              │
│  │       ▼                                                              │
│  │  4g. Promo Events ──────────────── (depends on 4c, optional)        │
│  │       │                                                              │
│  │       ▼                                                              │
│  │  4h. Seasonal Weights ──────────── (depends on 4c, optional)        │
│  │       │                                                              │
│  │       ▼                                                              │
│  │  4i. Holding Cost / Ordering Cost / Service Levels ─ (optional)     │
│  │                                                                      │
│           ▼                                                             │
│  Step 5: Data Validation & Harmonization                                │
│  ├── Automated validation (all 3 phases)                                │
│  ├── Validation report review (critical errors must be fixed)           │
│  ├── Warning acknowledgment                                             │
│  ├── Harmonization pipeline execution (8 steps)                         │
│  ├── Data quality score calculation (see Section 7)                     │
│  └── Manual review & sign-off                                           │
│           │                                                             │
│           ▼                                                             │
│  Step 6: Initial Forecast Generation                                    │
│  ├── Triggered automatically when all mandatory data loaded             │
│  ├── Data quality score must be >= 60                                   │
│  ├── Generate forecasts for all active SKUs                             │
│  ├── Calculate reorder points and safety stock                          │
│  ├── Identify CNY-affected orders                                       │
│  └── Generate initial replenishment recommendations                     │
│           │                                                             │
│           ▼                                                             │
│  Step 7: Dashboard Tour & User Training                                 │
│  ├── Interactive product tour (6 steps)                                 │
│  ├── Forecast dashboard walkthrough                                     │
│  ├── Inventory alert configuration                                      │
│  ├── Report scheduling setup                                            │
│  └── Knowledge base & video tutorial links                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Step-by-Step Onboarding Details

---

#### Step 1: Tenant Registration

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Company Name | String(200) | Yes | Non-empty, unique across platform |
| Subdomain | String(50) | Yes | Alphanumeric + hyphens only, unique, 3–50 chars |
| Admin Full Name | String(200) | Yes | Non-empty |
| Admin Email | String(200) | Yes | Valid email, unique across platform |
| Admin Phone | String(20) | Yes | BD phone format: +880-XXXXXXXXXX |
| Business Type | Enum | Yes | One of: `motorcycle_dealer`, `parts_wholesaler`, `parts_retailer`, `multi_brand_workshop`, `fleet_operator` |
| Number of Warehouses | Integer | Yes | 1–10 (must be within subscription limit) |
| Primary Warehouse City | Enum | Yes | One of: `dhaka`, `chittagong`, `rajshahi`, `khulna`, `sylhet`, `rangpur`, `barishal`, `mymensingh` |

---

#### Step 2: Subscription Selection

| Feature | Starter | Pro | Enterprise |
|---------|---------|-----|-----------|
| Max SKUs | 500 | 2,000 | 10,000 |
| Max Warehouses | 1 | 3 | Unlimited |
| Max Users | 3 | 10 | Unlimited |
| Forecast Models | Holt-Winters only | HW + Regression | HW + Regression + ML Ensemble |
| Historical Data | 2 years | 3 years | 5 years |
| API Access | No | Read-only | Full CRUD |
| Custom Reports | No | Yes | Yes + Scheduled |
| CNY Planning | Basic alerts | Full CNY modeling | Full + custom holiday calendars |
| Support | Email (48h SLA) | Email + Chat (24h SLA) | Dedicated CSM (4h SLA) |
| Monthly Price (BDT) | 5,000 | 15,000 | 45,000 |

---

#### Step 3: Forecast Settings Configuration

**Pre-populated with BD market defaults. Client can override any value.**

| Setting | Default Value | Range | Description |
|---------|--------------|-------|-------------|
| `default_holding_cost_pct` | 20.00 | 5.00–50.00 | Annual holding cost as % of unit cost |
| `default_ordering_cost_bdt` | 500.00 | 100.00–10,000.00 | Fixed cost per purchase order |
| `default_sea_lead_time_days` | 154 | 60–300 | Default total lead time via sea |
| `default_air_lead_time_days` | 102 | 30–200 | Default total lead time via air |
| `default_service_level_fast_moving` | 95.00 | 80.00–99.99 | Service level for fast-moving wear |
| `default_service_level_warranty` | 99.00 | 80.00–99.99 | Service level for warranty-critical |
| `default_service_level_seasonal` | 90.00 | 80.00–99.99 | Service level for seasonal |
| `default_service_level_accessory` | 95.00 | 80.00–99.99 | Service level for accessory |
| `forecast_horizon_days` | 90 | 30–365 | How far ahead to forecast |
| `forecast_retraining_frequency` | weekly | daily/weekly/monthly | How often to retrain models |
| `outlier_sigma_threshold` | 3.0 | 2.0–5.0 | Standard deviations for outlier detection |
| `customs_clearance_sea_days` | 10 | 3–30 | Default customs clearance for sea |
| `customs_clearance_air_days` | 4 | 1–10 | Default customs clearance for air |
| `lc_processing_days` | 7 | 3–15 | L/C processing time at BD bank |
| `currency` | BDT | BDT (fixed) | Base currency (BD market only currently) |

---

#### Step 4: Data Import Sequence

**Strict ordering enforced** due to referential integrity constraints. Each import must succeed (validation passes) before the next import is allowed.

| Step | Import | Dependency | Expected Duration | UI State After Completion |
|------|--------|------------|-------------------|--------------------------|
| 4a | Motorcycle Models | None | < 1 minute | Models loaded — "Import Suppliers next" |
| 4b | Supplier Master | None | < 1 minute | Suppliers loaded — "Import Product Catalog next" |
| 4c | Product Catalog | 4a, 4b | 1–5 minutes | Products loaded — "Import Stock Levels next" |
| 4d | Current Stock | 4c | < 1 minute | Stock loaded — "Import Sales History next" |
| 4e | Sales History | 4c | 5–30 minutes (large file) | Sales loaded — "Import Purchase History next" |
| 4f | Purchase History | 4c, 4b | 2–15 minutes | Purchases loaded — "Import Promo Events (optional)" |
| 4g | Promo Events | 4c | < 1 minute | Promos loaded (optional step) |
| 4h | Seasonal Weights | 4c | < 1 minute | Weights loaded (optional step) |
| 4i | Cost/Service Level Overrides | 4c | < 1 minute | Overrides loaded (optional step) |

**Import UI Features:**
- Drag-and-drop file upload area
- Real-time progress bar with row count
- Pause/resume for large imports
- Column mapping screen (Step 1 of harmonization) with auto-detection
- Validation report display with error/warning counts
- "Fix & Re-upload" flow for critical errors
- "Acknowledge Warnings" flow for non-critical issues

---

#### Step 5: Data Validation & Harmonization

**Automated pipeline execution with manual review checkpoints.**

| Sub-Step | Process | Duration | Manual Review Required? |
|----------|---------|----------|------------------------|
| 5.1 | Structural validation (Phase 1) | < 1 min | No — auto-pass/fail |
| 5.2 | Content validation (Phase 2) | 1–10 min | No — auto-pass/fail |
| 5.3 | Referential integrity (Phase 3) | 1–5 min | No — auto-pass/fail |
| 5.4 | Column mapping confirmation | — | **Yes** — user must confirm fuzzy matches |
| 5.5 | Outlier review | — | **Yes** — user can override outlier exclusions |
| 5.6 | Gap fill review | — | **Yes** — user can review large gaps flagged as CRITICAL |
| 5.7 | Data quality score calculation | < 1 min | No — auto-generated |
| 5.8 | Final sign-off | — | **Yes** — admin must approve data for forecast use |

**If Data Quality Score < 60:** System blocks forecast generation and provides specific recommendations for improvement (see Section 7).

---

#### Step 6: Initial Forecast Generation

**Triggered automatically when:**
- All 6 mandatory datasets are loaded and validated
- Data quality score >= 60
- Admin has signed off on harmonized data (Step 5.8)

**Process:**

| Sub-Step | Process | Duration | Output |
|----------|---------|----------|--------|
| 6.1 | Train Holt-Winters model per SKU | 5–20 min | Seasonal decomposition parameters (α, β, γ) |
| 6.2 | Generate 90-day demand forecast per SKU | < 5 min | Daily forecast values with confidence intervals |
| 6.3 | Calculate safety stock per SKU | < 1 min | Safety stock = z × σ_demand × √(lead_time) |
| 6.4 | Calculate reorder point per SKU | < 1 min | ROP = (avg_daily_demand × lead_time) + safety_stock |
| 6.5 | Calculate EOQ per SKU | < 1 min | EOQ = √(2 × D × S / H) |
| 6.6 | Identify CNY-affected orders | < 1 min | Alerts for orders that conflict with CNY shutdown |
| 6.7 | Generate initial replenishment recommendations | < 1 min | PO suggestions with timing, quantity, and shipment mode |
| 6.8 | Send "Onboarding Complete — Forecasts Ready" notification | < 1 min | Email + in-app notification |

---

#### Step 7: Dashboard Tour & User Training

| Tour Step | Feature | Duration | Description |
|-----------|---------|----------|-------------|
| 7.1 | Forecast Dashboard | 2 min | Show demand forecast charts for top 10 SKUs by revenue |
| 7.2 | Inventory Alert Panel | 2 min | Show current stockout risks and reorder alerts |
| 7.3 | CNY Planning View | 2 min | Show upcoming CNY impact and recommended pre-CNY orders |
| 7.4 | Replenishment Recommendations | 2 min | Show PO suggestions with sea vs air trade-off |
| 7.5 | Report Configuration | 2 min | Set up scheduled weekly/monthly reports |
| 7.6 | User Management | 1 min | Add team members, assign roles (viewer, analyst, admin) |

---

### 6.3 Onboarding SLA Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time from registration to first forecast | ≤ 5 business days | Assuming client provides all data within 2 business days |
| Data import success rate (first attempt) | ≥ 80% | Percentage of imports that pass validation without re-upload |
| Time for validation & harmonization | ≤ 4 hours | Automated + manual review |
| Forecast generation time | ≤ 30 minutes | For 1,000 SKUs |
| Client satisfaction (onboarding NPS) | ≥ 8/10 | Post-onboarding survey |

---

## Section 7: Data Quality Score

### 7.1 Scoring Framework

The Data Quality Score (DQS) is a composite metric (0–100) that determines whether imported data is sufficient for reliable forecast generation.

**Minimum threshold: 60** — Below this, the system blocks forecast generation and provides improvement recommendations.

### 7.2 Score Composition

```
DQS = (Completeness × 0.35) + (Consistency × 0.25) + (Freshness × 0.20) + (Volume × 0.20)
```

| Dimension | Weight | Score Range | Description |
|-----------|--------|------------|-------------|
| **Completeness** | 35% | 0–100 | Are all mandatory fields populated? Are all mandatory datasets loaded? |
| **Consistency** | 25% | 0–100 | Do cross-references align? Are there conflicting values? |
| **Freshness** | 20% | 0–100 | How recent is the data? Is the sales history up to date? |
| **Volume** | 20% | 0–100 | Is there enough historical data for statistical significance? |

### 7.3 Dimension Scoring Details

#### Completeness Score (0–100)

| Check | Points | Max Points |
|-------|--------|-----------|
| All 6 mandatory datasets loaded | — | 30 |
| — Motorcycle Models loaded | 5 | 5 |
| — Supplier Master loaded | 5 | 5 |
| — Product Catalog loaded | 5 | 5 |
| — Current Stock loaded | 5 | 5 |
| — Sales History loaded | 5 | 5 |
| — Purchase History loaded | 5 | 5 |
| Percentage of mandatory fields non-null (across all datasets) | — | 30 |
| — ≥ 99% fields non-null | 30 | 30 |
| — ≥ 95% fields non-null | 25 | 30 |
| — ≥ 90% fields non-null | 20 | 30 |
| — ≥ 80% fields non-null | 10 | 30 |
| — < 80% fields non-null | 5 | 30 |
| Conditionally required datasets loaded | — | 20 |
| — Promo Events loaded | 7 | 7 |
| — Seasonal Weights loaded | 7 | 7 |
| — Holding Cost / Service Levels loaded | 6 | 6 |
| Optional datasets loaded (bonus) | — | 20 |
| — Return/Defect History loaded | 7 | 7 |
| — Exchange Rate History loaded | 7 | 7 |
| — Competitor Pricing loaded | 3 | 3 |
| — Market Growth Indicators loaded | 3 | 3 |
| | **Total** | **100** |

#### Consistency Score (0–100)

| Check | Points | Max Points |
|-------|--------|-----------|
| Referential integrity: All SKU codes in sales/purchases/stock exist in Product Catalog | 25 | 25 |
| Referential integrity: All supplier names in products/purchases exist in Supplier Master | 15 | 15 |
| Referential integrity: All motorcycle models in products exist in Model Master | 10 | 10 |
| No orphaned records (records referencing non-existent parents) | 15 | 15 |
| Date consistency: No sales dates after today | 5 | 5 |
| Date consistency: No purchase dates after today | 5 | 5 |
| Price consistency: ≤ 5% of SKUs have selling_price < unit_cost | 10 | 10 |
| Quantity consistency: ≤ 5% of purchase records have qty_received > qty_ordered | 10 | 10 |
| No critical validation errors | 5 | 5 |
| | **Total** | **100** |

**Referential Integrity Scoring:**
- 100% of references valid → full points
- 95–99% valid → 80% of points
- 90–94% valid → 60% of points
- 80–89% valid → 40% of points
- < 80% valid → 20% of points

#### Freshness Score (0–100)

| Check | Points | Max Points |
|-------|--------|-----------|
| Sales history includes data within last 30 days | 30 | 30 |
| — Within last 7 days | 30 | — |
| — Within last 14 days | 25 | — |
| — Within last 30 days | 20 | — |
| — Within last 60 days | 10 | — |
| — Older than 60 days | 0 | — |
| Stock levels updated within last 7 days | 25 | 25 |
| — Within last 1 day | 25 | — |
| — Within last 3 days | 20 | — |
| — Within last 7 days | 15 | — |
| — Older than 7 days | 5 | — |
| Purchase history includes data within last 90 days | 20 | 20 |
| — Within last 30 days | 20 | — |
| — Within last 60 days | 15 | — |
| — Within last 90 days | 10 | — |
| — Older than 90 days | 0 | — |
| Product catalog last updated within last 30 days | 15 | 15 |
| Supplier master last updated within last 90 days | 10 | 10 |
| | **Total** | **100** |

#### Volume Score (0–100)

| Check | Points | Max Points |
|-------|--------|-----------|
| Sales history date range | — | 30 |
| — ≥ 3 years (1,095 days) | 30 | — |
| — ≥ 2.5 years (913 days) | 25 | — |
| — ≥ 2 years (730 days) | 20 | — |
| — ≥ 1.5 years (548 days) | 10 | — |
| — < 1.5 years | 0 | — |
| SKU count | — | 25 |
| — ≥ 500 SKUs | 25 | — |
| — ≥ 300 SKUs | 20 | — |
| — ≥ 100 SKUs | 10 | — |
| — < 100 SKUs | 0 | — |
| Average data points per SKU (sales records) | — | 25 |
| — ≥ 300 data points per SKU (near-daily for 3 years) | 25 | — |
| — ≥ 150 data points per SKU (weekly for 3 years) | 20 | — |
| — ≥ 50 data points per SKU (monthly for 3 years) | 10 | — |
| — < 50 data points per SKU | 0 | — |
| Purchase history volume | — | 20 |
| — ≥ 5,000 purchase records | 20 | — |
| — ≥ 2,000 purchase records | 15 | — |
| — ≥ 500 purchase records | 10 | — |
| — < 500 purchase records | 0 | — |
| | **Total** | **100** |

### 7.4 Quality Score Interpretation

| Score Range | Quality Level | Forecast Eligibility | Action Required |
|-------------|--------------|---------------------|----------------|
| 90–100 | Excellent | Full forecast capabilities enabled | None — proceed to Step 6 |
| 80–89 | Good | Full forecast capabilities enabled | Review warnings; consider adding optional data |
| 70–79 | Fair | Forecasts enabled with reduced confidence | Address top 3 improvement recommendations |
| 60–69 | Marginal | Forecasts enabled with low confidence | Must address improvement recommendations before relying on forecasts |
| 40–59 | Insufficient | **Forecasts BLOCKED** | Must improve data quality to ≥ 60 |
| 0–39 | Critical | **Forecasts BLOCKED** | Major data gaps; onboarding engineer assistance required |

### 7.5 Improvement Recommendations

When DQS < 60, the system generates specific, prioritized recommendations:

```json
{
  "data_quality_score": 47,
  "quality_level": "Insufficient",
  "forecast_eligible": false,
  "recommendations": [
    {
      "priority": 1,
      "dimension": "Volume",
      "current_score": 25,
      "target_score": 60,
      "recommendation": "Sales history covers only 1.2 years (438 days). Minimum 2 years (730 days) required for reliable seasonal decomposition. Please provide additional historical sales data.",
      "estimated_impact": "+15 points to Volume score"
    },
    {
      "priority": 2,
      "dimension": "Completeness",
      "current_score": 55,
      "target_score": 70,
      "recommendation": "12% of SKU codes in Sales History do not exist in Product Catalog (48 orphaned SKUs). Please add missing products to the catalog or correct SKU codes in sales data.",
      "estimated_impact": "+10 points to Consistency score"
    },
    {
      "priority": 3,
      "dimension": "Freshness",
      "current_score": 40,
      "target_score": 60,
      "recommendation": "Most recent sales data is 45 days old. Please upload updated sales data including the last 45 days.",
      "estimated_impact": "+20 points to Freshness score"
    }
  ]
}
```

### 7.6 Data Quality Monitoring (Post-Onboarding)

After onboarding, the DQS is recalculated on every data sync/import to ensure ongoing data health:

| Trigger | Action |
|---------|--------|
| Weekly automated DQS recalculation | If score drops below 80, send warning email to admin |
| New data import | Recalculate DQS after import |
| If DQS drops below 60 | Pause automated forecast retraining; alert admin |
| If DQS drops below 40 | Pause all automated alerts and recommendations; critical alert to admin and TrimedCast support |

---

## Appendix A: Complete Onboarding Checklist

This checklist is used by the onboarding engineer and client team to track progress.

### A.1 Pre-Onboarding Preparation

- [ ] Client has identified an onboarding coordinator (single point of contact)
- [ ] Client has identified data sources (ERP, POS, spreadsheets, manual records)
- [ ] Client has export capability from their systems (Excel or CSV export)
- [ ] Client has reviewed this document and understands data requirements
- [ ] TrimedCast has scheduled kick-off call (60 minutes)

### A.2 Tenant Setup

- [ ] Company name confirmed
- [ ] Subdomain chosen and available
- [ ] Admin user email and phone provided
- [ ] Business type selected
- [ ] Subscription tier selected (Starter / Pro / Enterprise)
- [ ] Payment method configured
- [ ] Forecast settings reviewed and customized (if needed)
- [ ] BD market defaults acknowledged

### A.3 Data Preparation & Import

| # | Data Set | Status | File Name | Rows | Valid | Errors | Warnings | Quality |
|---|----------|--------|-----------|------|-------|--------|----------|---------|
| 1 | Motorcycle Models | Not Started | — | — | — | — | — | — |
| 2 | Supplier Master | Not Started | — | — | — | — | — | — |
| 3 | Product Catalog | Not Started | — | — | — | — | — | — |
| 4 | Current Stock | Not Started | — | — | — | — | — | — |
| 5 | Sales History | Not Started | — | — | — | — | — | — |
| 6 | Purchase History | Not Started | — | — | — | — | — | — |
| 7 | Promo Events | Not Started | — | — | — | — | — | — |
| 8 | Seasonal Weights | Not Started | — | — | — | — | — | — |
| 9 | Cost/Service Level Overrides | Not Started | — | — | — | — | — | — |

### A.4 Validation & Harmonization

- [ ] All structural validations passed
- [ ] All content validations passed (0 critical errors)
- [ ] All referential integrity checks passed
- [ ] Column mappings confirmed by client
- [ ] Outlier flags reviewed and acknowledged
- [ ] Gap fill results reviewed
- [ ] Harmonization pipeline completed successfully
- [ ] Data Quality Score calculated: ____ / 100
- [ ] DQS ≥ 60 (forecast eligible): Yes / No
- [ ] Admin sign-off on harmonized data

### A.5 Forecast Generation

- [ ] Initial forecast generation triggered
- [ ] Forecast generation completed successfully
- [ ] Top 20 SKU forecasts manually reviewed by onboarding engineer
- [ ] CNY impact alerts generated for upcoming CNY period
- [ ] Replenishment recommendations generated
- [ ] "Onboarding Complete" notification sent

### A.6 User Training & Handoff

- [ ] Dashboard tour completed by admin user
- [ ] Additional users created and roles assigned
- [ ] Scheduled report configuration completed
- [ ] Knowledge base access confirmed
- [ ] Post-onboarding survey sent
- [ ] Onboarding case closed in TrimedCast CRM

---

## Appendix B: Data Export Templates

For each import type, TrimedCast provides a downloadable Excel template with:
- Correct sheet name
- All required and optional column headers
- Data validation dropdowns (for enum fields)
- Sample data rows (2–3 examples)
- Instruction comments in header cells
- Protected formatting (to prevent accidental structure changes)

### Template Download URLs (Generated per Tenant)

| Template | URL Pattern |
|----------|-------------|
| Motorcycle Models | `/api/v1/templates/motorcycle_models?tenant={id}` |
| Supplier Master | `/api/v1/templates/supplier_master?tenant={id}` |
| Product Catalog | `/api/v1/templates/product_catalog?tenant={id}` |
| Current Stock | `/api/v1/templates/current_stock?tenant={id}` |
| Sales History | `/api/v1/templates/sales_history?tenant={id}` |
| Purchase History | `/api/v1/templates/purchase_history?tenant={id}` |
| Promo Events | `/api/v1/templates/promo_events?tenant={id}` |
| Seasonal Weights | `/api/v1/templates/seasonal_weights?tenant={id}` |

---

## Appendix C: Enum Reference (All Allowed Values)

| Field | Allowed Values | Description |
|-------|---------------|-------------|
| `category` (Product) | `fast_moving_wear`, `warranty_critical`, `seasonal`, `accessory` | Product demand classification |
| `season_type` | `winter`, `summer`, `monsoon`, `pre_winter`, `all_season` | Seasonal demand pattern |
| `is_warranty_critical` | `yes`, `no` | Whether stockout affects warranty claims |
| `uom` | `pcs`, `set`, `pair`, `litre`, `kg`, `meter`, `roll`, `tube` | Unit of measure |
| `customer_type` | `retail`, `wholesale`, `fleet`, `warranty` | Customer segment |
| `shipment_mode` | `sea`, `air` | Freight method |
| `order_status` | `pending`, `shipped`, `received`, `cancelled`, `partial` | Purchase order status |
| `category` (Motorcycle) | `commuter`, `sports`, `cruiser`, `scooter`, `off_road`, `electric` | Motorcycle type |
| `return_reason` | `defective`, `wrong_item`, `excess_stock`, `warranty_claim`, `customer_dissatisfied` | Return classification |
| `business_type` | `motorcycle_dealer`, `parts_wholesaler`, `parts_retailer`, `multi_brand_workshop`, `fleet_operator` | Tenant business model |
| `bd_season` | `winter`, `summer`, `monsoon`, `pre_winter` | Bangladesh season (derived from date) |

---

## Appendix D: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-07-11 | TrimedCast Engineering | Initial production-ready specification |

---

*End of Document*
