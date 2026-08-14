# Excel Import & ETL Pipeline: TrimedCast

> Integrated Seasonal Demand & Inventory Forecasting System  
> Version: 1.0 | Last Updated: 2025-08-13

---

## 1. Overview

The system must import 3+ years of historical business data from Excel/CSV files provided by the client. This is the **critical onboarding step** — without properly harmonized data, the forecasting engine cannot produce accurate results.

**Data Quality In = Forecast Quality Out**

---

## 2. Import Types and Dependency Order

Imports MUST happen in a specific order due to foreign key dependencies:

```
Step 1: Motorcycle Models  ──── (no dependencies)
Step 2: Suppliers          ──── (no dependencies)
Step 3: Product Catalog    ──── (depends on Models + Suppliers)
Step 4: Current Stock      ──── (depends on Products)
Step 5: Sales History      ──── (depends on Products) ← LARGEST FILE
Step 6: Purchase History   ──── (depends on Products + Suppliers)
Step 7: Promo Events       ──── (depends on Products, OPTIONAL)
```

The UI enforces this order — a step is only enabled after its dependencies are complete.

---

## 3. File Format Specifications

### 3.1 Supported Formats
| Format | Extension | Library | Notes |
|---|---|---|---|
| Excel 2007+ | .xlsx | laravel-excel (Maatwebsite) | Preferred |
| CSV | .csv | league/csv | UTF-8 encoding required |
| Legacy Excel | .xls | Converted to .xlsx server-side | Auto-convert via PhpSpreadsheet |

### 3.2 Global Limits
| Parameter | Value |
|---|---|
| Max file size | 10 MB |
| Max rows per file | 100,000 |
| Max columns | 50 |
| Date formats (auto-detect) | YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY |
| Number formats (auto-detect) | 1,234.56 (US) vs 1.234,56 (EU) |
| Encoding | UTF-8 (auto-detect BOM, convert from GB2312/Shift-JIS if needed) |

---

## 4. Per-Import Column Specifications

### 4.1 Motorcycle Models Import

| Column | Required | Type | Validation | Default |
|---|---|---|---|---|
| model_name | Yes | string | non-empty, max 255 | — |
| brand | Yes | string | non-empty, max 100 | — |
| year | Yes | integer | 2000–2030 | — |
| engine_cc | No | integer | > 0 | NULL |
| category | Yes | enum | commuter, sports, cruiser, scooter, off_road, electric | 'commuter' |

**Sample Row:**
```
model_name: "Bajaj Pulsar 150", brand: "Bajaj", year: 2023, engine_cc: 150, category: "commuter"
```

---

### 4.2 Suppliers Import

| Column | Required | Type | Validation | Default |
|---|---|---|---|---|
| supplier_name | Yes | string | non-empty | — |
| country | No | string | max 100 | 'China' |
| city | No | string | max 100 | NULL |
| contact_person | No | string | max 255 | NULL |
| email | No | email | valid format | NULL |
| phone | No | string | max 50 | NULL |
| on_time_delivery_pct | No | decimal(5,2) | 0–100 | 80.00 |
| mfg_lead_time_days | No | integer | > 0 | 90 |
| sea_shipment_days | No | integer | > 0 | 52 |
| air_shipment_days | No | integer | > 0 | 8 |
| moq | No | integer | > 0 | 100 |

**Sample Row:**
```
supplier_name: "Zhongsheng Parts Co.", country: "China", city: "Guangzhou", 
on_time_delivery_pct: 85, mfg_lead_time_days: 90, sea_shipment_days: 50, moq: 200
```

---

### 4.3 Product Catalog Import

| Column | Required | Type | Validation | Default |
|---|---|---|---|---|
| sku_code | Yes | string | unique per tenant, max 50 | — |
| product_name | Yes | string | non-empty | — |
| category | Yes | enum | fast_moving_wear, warranty_critical, seasonal, accessory | — |
| sub_category | No | string | max 100 | NULL |
| motorcycle_model | No | string | must match existing model_name | NULL |
| supplier_name | No | string | must match existing supplier | NULL |
| unit_cost_bdt | Yes | decimal(12,2) | > 0 | — |
| selling_price_bdt | Yes | decimal(12,2) | >= unit_cost_bdt | — |
| season_type | Yes | enum | winter, summer, monsoon, pre_winter, all_season | 'all_season' |
| is_warranty_critical | No | boolean | yes/no/true/false/1/0 | false |
| uom | No | string | pcs/set/pair/liter | 'pcs' |

**Sample Row:**
```
sku_code: "BP-001", product_name: "Brake Pad Set - Front", category: "fast_moving_wear",
motorcycle_model: "Bajaj Pulsar 150", supplier_name: "Zhongsheng Parts Co.",
unit_cost_bdt: 450.00, selling_price_bdt: 850.00, season_type: "all_season"
```

---

### 4.4 Current Stock Import

| Column | Required | Type | Validation | Default |
|---|---|---|---|---|
| sku_code | Yes | string | must exist in products | — |
| qty_on_hand | Yes | integer | >= 0 | — |
| qty_allocated | No | integer | >= 0, <= qty_on_hand | 0 |
| warehouse_location | No | string | max 100 | 'main' |

---

### 4.5 Sales History Import (LARGEST — most critical)

| Column | Required | Type | Validation | Default |
|---|---|---|---|---|
| sale_date | Yes | date | within 3-year window | — |
| sku_code | Yes | string | must exist in products | — |
| qty_sold | Yes | integer | > 0 | — |
| unit_price | Yes | decimal(12,2) | > 0 | — |
| total_amount | No | decimal(14,2) | should ≈ qty × price | auto-calc |
| invoice_number | No | string | max 50 | NULL |
| customer_type | No | enum | retail, wholesale, fleet, warranty | 'retail' |

**Sample Row:**
```
sale_date: "2024-01-15", sku_code: "BP-001", qty_sold: 25, unit_price: 850.00,
total_amount: 21250.00, invoice_number: "INV-2024-0142", customer_type: "retail"
```

**Typical file size:** 3 years × 300 SKUs × avg 10 sales/month = ~108,000 rows (may need splitting)

---

### 4.6 Purchase History Import

| Column | Required | Type | Validation | Default |
|---|---|---|---|---|
| purchase_date | Yes | date | within 3-year window | — |
| sku_code | Yes | string | must exist in products | — |
| supplier_name | No | string | must exist in suppliers | NULL |
| qty_ordered | Yes | integer | > 0 | — |
| qty_received | No | integer | <= qty_ordered | = qty_ordered |
| unit_cost | Yes | decimal(12,2) | > 0 | — |
| shipment_mode | No | enum | sea, air | 'sea' |
| actual_lead_time_days | No | integer | > 0 | NULL |

---

### 4.7 Promo Events Import (Optional)

| Column | Required | Type | Validation | Default |
|---|---|---|---|---|
| event_name | Yes | string | non-empty | — |
| start_date | Yes | date | — | — |
| end_date | Yes | date | >= start_date | — |
| promo_index | Yes | decimal(3,2) | 0.0–1.0 | 0.50 |
| affected_skus | No | string | comma-separated SKU codes | NULL |
| affected_category | No | enum | product category | NULL |
| is_recurring | No | boolean | yes/no | false |

---

## 5. The Import Pipeline (Step by Step)

### 5.1 Pipeline Overview

```
┌──────────┐   ┌──────────┐   ┌────────────┐   ┌──────────────┐   ┌──────────┐
│  UPLOAD  │──▶│  MAP     │──▶│ VALIDATE   │──▶│ HARMONIZE    │──▶│  INSERT  │
│  file +  │   │  columns │   │  3 phases  │   │  6 steps     │   │  batch   │
│  detect  │   │  to sys  │   │  type +    │   │  dedup,      │   │  update  │
│  format  │   │  fields  │   │  business  │   │  outliers,   │   │  tracker │
│          │   │          │   │  logic     │   │  promo, gaps │   │          │
└──────────┘   └──────────┘   └────────────┘   └──────────────┘   └──────────┘
     │              │               │                   │                │
     ▼              ▼               ▼                   ▼                ▼
  WebSocket:     WebSocket:     WebSocket:          WebSocket:       WebSocket:
  uploading      mapping        validating          harmonizing      completed
```

---

### Step 1: Upload

**User Action:** Select file + import type, click Upload  
**Server Processing:**
1. Validate file type (.xlsx, .csv, .xls)
2. Validate file size (< 10 MB)
3. Read file headers (first row)
4. Auto-detect: date format, number format, encoding
5. Extract sample rows (first 5 data rows)
6. Auto-map columns using fuzzy matching (see §6)
7. Return: detected columns, sample rows, suggested mapping

**Response to Frontend:**
```json
{
  "import_id": "uuid",
  "file_name": "sales_2022_2024.xlsx",
  "import_type": "sales_history",
  "row_count": 24650,
  "detected_columns": ["Date", "SKU", "Qty", "Price", "Total", "Invoice", "Type"],
  "sample_rows": [
    { "Date": "2024-01-05", "SKU": "BP-001", "Qty": 25, "Price": 850, "Total": 21250, "Invoice": "INV-142", "Type": "retail" }
  ],
  "suggested_mapping": {
    "Date": "sale_date",
    "SKU": "sku_code",
    "Qty": "qty_sold",
    "Price": "unit_price",
    "Total": "total_amount",
    "Invoice": "invoice_number",
    "Type": "customer_type"
  }
}
```

---

### Step 2: Column Mapping

**User Action:** Review auto-mapping, override if needed, confirm  
**Server Processing:**
1. Validate all required columns are mapped
2. Check for duplicate mappings (two Excel cols → same system field)
3. Apply mapping to sample rows
4. Run Phase 1 validation on mapped sample rows
5. Return: validation preview with counts

**If Unmapped Required Columns:** Return error — cannot proceed  
**If Unmapped Optional Columns:** Use defaults, show warning

---

### Step 3: Validation (3 Phases)

#### Phase 1 — Structural Validation
| Check | Severity | Example |
|---|---|---|
| Required column missing | CRITICAL | "sku_code column not found" |
| Empty required field | CRITICAL | Row 47: sku_code is empty |
| Row count > 100,000 | CRITICAL | "File has 150,000 rows (max 100,000)" |
| Duplicate column mapping | CRITICAL | "Both 'Code' and 'SKU' mapped to sku_code" |

#### Phase 2 — Type Validation
| Check | Severity | Example |
|---|---|---|
| Date not parseable | CRITICAL | Row 83: "1x/25/2024" is not a valid date |
| Number field has text | CRITICAL | Row 112: qty_sold = "twenty" |
| Enum value invalid | CRITICAL | Row 56: category = "premium" (not in allowed list) |
| Negative value in positive field | CRITICAL | Row 99: qty_sold = -5 |
| Total ≠ qty × price | WARNING | Row 200: total=21000 but qty×price=21250 (diff=250) |

#### Phase 3 — Business Logic Validation
| Check | Severity | Example |
|---|---|---|
| SKU code not in product catalog | CRITICAL | Row 78: SKU "XX-999" not found |
| Supplier not in supplier list | WARNING | Row 45: "New Supplier Ltd" not found (will create) |
| Motorcycle model not found | WARNING | Row 22: "Honda CB350" not in models (skip model link) |
| selling_price < unit_cost | WARNING | Row 300: margin is negative |
| Date outside 3-year window | WARNING | Row 15: date is from 2018 |
| Qty > 10× category average | WARNING | Row 88: qty=5000 (avg for SKU is 45) — possible outlier |

**Validation Result Format:**
```json
{
  "valid_rows": 24500,
  "warning_rows": 120,
  "critical_error_rows": 30,
  "errors": [
    { "row": 78, "severity": "critical", "field": "sku_code", "message": "SKU 'XX-999' not found in product catalog" },
    { "row": 88, "severity": "warning", "field": "qty_sold", "message": "Qty 5000 is 111x the SKU average of 45 — possible outlier" }
  ],
  "can_proceed": true  // false if any critical errors
}
```

---

### Step 4: Harmonization (THE MOST IMPORTANT STEP)

This transforms raw data into forecast-ready data.

#### 4.1 Deduplication
```python
def deduplicate(df, keys=['sale_date', 'sku_code', 'invoice_number']):
    """Remove exact duplicate rows based on composite key."""
    before = len(df)
    df = df.drop_duplicates(subset=keys)
    after = len(df)
    removed = before - after
    return df, removed
```

#### 4.2 Outlier Detection
```python
def detect_outliers(df, sigma_threshold=3.0):
    """Flag sales where qty_sold > mean + sigma_threshold × std for that SKU."""
    outliers = []
    for sku in df['sku_code'].unique():
        sku_data = df[df['sku_code'] == sku]
        mean = sku_data['qty_sold'].mean()
        std = sku_data['qty_sold'].std()
        threshold = mean + sigma_threshold * std
        
        for idx, row in sku_data.iterrows():
            if row['qty_sold'] > threshold:
                outliers.append({
                    'row': idx,
                    'sku_code': sku,
                    'qty_sold': row['qty_sold'],
                    'mean': round(mean, 1),
                    'std': round(std, 1),
                    'threshold': round(threshold, 1),
                    'is_promo': check_if_promo(row['sale_date'], sku),
                    'action': 'flag'  # Don't auto-remove
                })
    return outliers
```

**Decision Logic:**
- If sale falls in promo window → Explain as promo effect, mark `promo_applied=true`
- If no promo context → Flag for manual review, include in import but mark `is_harmonized=false`
- Never auto-remove data — always flag

#### 4.3 Promo Cleansing
```python
def cleanse_promo_sales(df, promo_events):
    """
    For sales during promotional windows, calculate the promo-adjusted quantity.
    This prevents the forecast from learning promo spikes as normal demand.
    
    adjusted_qty = actual_qty × (1 - promo_index)
    """
    df = df.copy()
    df['promo_applied'] = False
    df['promo_index_at_sale'] = 0.0
    
    for _, event in promo_events.iterrows():
        mask = (
            (df['sale_date'] >= event['start_date']) &
            (df['sale_date'] <= event['end_date']) &
            (df['sku_code'].isin(event.get('affected_skus', [])))
        )
        df.loc[mask, 'promo_applied'] = True
        df.loc[mask, 'promo_index_at_sale'] = event['promo_index']
    
    return df
```

#### 4.4 Gap Filling
```python
def fill_gaps(df, sku_code, start_date, end_date):
    """
    For months with no sales data for a SKU, interpolate missing values.
    
    Strategy:
    - Seasonal product: Use same-month average from other years
    - Non-seasonal: Use 12-month moving average
    - Mark interpolated records: is_harmonized = true
    """
    all_months = pd.date_range(start_date, end_date, freq='MS')
    existing_months = set(df[df['sku_code'] == sku_code]['sale_date'].dt.to_period('M'))
    
    gaps = [m for m in all_months if m.to_period('M') not in existing_months]
    
    filled_rows = []
    for gap_month in gaps:
        # Seasonal: same month in other years
        same_month_data = df[
            (df['sku_code'] == sku_code) & 
            (df['sale_date'].dt.month == gap_month.month)
        ]
        
        if len(same_month_data) > 0:
            avg_qty = same_month_data['qty_sold'].mean()
        else:
            # Fallback: 12-month moving average
            recent = df[df['sku_code'] == sku_code].tail(12)
            avg_qty = recent['qty_sold'].mean()
        
        filled_rows.append({
            'sku_code': sku_code,
            'sale_date': gap_month,
            'qty_sold': round(avg_qty),
            'is_harmonized': True,
            'is_interpolated': True
        })
    
    return filled_rows
```

#### 4.5 Season Tagging
```python
BD_SEASONS = {
    'winter':     [11, 12, 1, 2],   # Nov-Feb
    'summer':     [3, 4, 5],        # Mar-May
    'monsoon':    [6, 7, 8, 9],     # Jun-Sep
    'pre_winter': [10],             # Oct
}

def tag_season(date):
    month = date.month
    for season, months in BD_SEASONS.items():
        if month in months:
            return season
    return 'all_season'  # Fallback
```

#### 4.6 Lead Time Normalization (Purchase History Only)
```python
def normalize_lead_times(df, defaults={'sea': 152, 'air': 101}):
    """
    Calculate actual lead time from purchase history.
    Used for σ_LT calculation in Safety Stock formula.
    """
    df['actual_lead_time_days'] = None
    
    # If we have both purchase_date and received_date
    if 'received_date' in df.columns:
        df['actual_lead_time_days'] = (
            pd.to_datetime(df['received_date']) - pd.to_datetime(df['purchase_date'])
        ).dt.days
    
    # If missing, estimate from shipment mode
    mask = df['actual_lead_time_days'].isna()
    df.loc[mask & (df['shipment_mode'] == 'sea'), 'actual_lead_time_days'] = defaults['sea']
    df.loc[mask & (df['shipment_mode'] == 'air'), 'actual_lead_time_days'] = defaults['air']
    
    return df
```

---

### Step 5: Database Insert

```php
// Laravel batch insert implementation
class ImportRepository
{
    public function batchInsert(string $table, array $rows, int $batchSize = 5000): array
    {
        $succeeded = 0;
        $failed = 0;
        $errors = [];
        
        foreach (array_chunk($rows, $batchSize) as $batch) {
            try {
                DB::table($table)->insert($batch);
                $succeeded += count($batch);
            } catch (\Exception $e) {
                $failed += count($batch);
                $errors[] = $e->getMessage();
                
                // Try row-by-row for this batch to salvage good rows
                foreach ($batch as $row) {
                    try {
                        DB::table($table)->insert($row);
                        $succeeded++;
                        $failed--;
                    } catch (\Exception $e2) {
                        $errors[] = "Row failed: " . $e2->getMessage();
                    }
                }
            }
        }
        
        return compact('succeeded', 'failed', 'errors');
    }
}
```

**Commit Strategy:**
- If success rate >= 95%: Commit all successful rows, log failures
- If success rate < 95%: Rollback entire import, return all errors
- Each import is tracked in `data_imports` table with full status

---

## 6. Fuzzy Column Mapping Algorithm

```python
# Levenshtein distance for auto-mapping Excel columns to system fields
SYSTEM_FIELD_ALIASES = {
    'sale_date':      ['date', 'sale_date', 'sales_date', 'order_date', 'invoice_date', 'তারিখ'],
    'sku_code':       ['sku', 'sku_code', 'product_code', 'item_code', 'code', 'part_number', 'pn'],
    'qty_sold':       ['qty', 'quantity', 'qty_sold', 'units_sold', 'sales_qty', 'sold', 'পরিমাণ'],
    'unit_price':     ['price', 'unit_price', 'selling_price', 'rate', 'unit_rate'],
    'total_amount':   ['total', 'amount', 'total_amount', 'line_total', 'value'],
    'invoice_number': ['invoice', 'inv', 'invoice_number', 'inv_no', 'reference'],
    'customer_type':  ['type', 'customer_type', 'customer', 'segment', 'buyer_type'],
    'purchase_date':  ['date', 'purchase_date', 'order_date', 'po_date'],
    'qty_ordered':    ['qty', 'quantity', 'qty_ordered', 'order_qty', 'ordered'],
    'qty_received':   ['received', 'qty_received', 'received_qty'],
    'unit_cost':      ['cost', 'unit_cost', 'purchase_price', 'buy_price', 'price'],
    'shipment_mode':  ['mode', 'shipment', 'shipment_mode', 'transport', 'delivery'],
    'product_name':   ['name', 'product_name', 'item_name', 'description', 'part_name'],
    'category':       ['category', 'cat', 'type', 'product_category', 'class'],
    'unit_cost_bdt':  ['cost', 'unit_cost', 'purchase_price', 'buy_price', 'price_bdt'],
    'selling_price_bdt': ['selling_price', 'sell_price', 'retail_price', 'mrp'],
    'season_type':    ['season', 'season_type', 'seasonal', 'session'],
}

def levenshtein_distance(s1, s2):
    """Calculate edit distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    prev_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = prev_row[j + 1] + 1
            deletions = curr_row[j] + 1
            substitutions = prev_row[j] + (c1 != c2)
            curr_row.append(min(insertions, deletions, substitutions))
        prev_row = curr_row
    
    return prev_row[-1]

def auto_map_columns(excel_columns, system_aliases):
    """
    Auto-map Excel column headers to system field names.
    Returns: { excel_col_name: system_field_name }
    """
    mappings = {}
    unmapped = []
    
    for col in excel_columns:
        col_clean = col.lower().strip().replace(' ', '_').replace('-', '_')
        best_field = None
        best_score = float('inf')
        
        for field, aliases in system_aliases.items():
            # Check exact match first
            if col_clean in [a.lower() for a in aliases]:
                best_field = field
                best_score = 0
                break
            
            # Check fuzzy match
            for alias in aliases:
                score = levenshtein_distance(col_clean, alias.lower())
                if score < best_score:
                    best_score = score
                    best_field = field
        
        if best_score <= 3 and best_field is not None:
            mappings[col] = best_field
        else:
            unmapped.append(col)
    
    return mappings, unmapped
```

---

## 7. Data Quality Report

After every import, generate a quality report:

```json
{
  "import_id": "uuid",
  "import_type": "sales_history",
  "quality_score": 78,
  "metrics": {
    "total_rows": 24650,
    "successful_rows": 24500,
    "failed_rows": 30,
    "warning_rows": 120,
    "success_rate_pct": 99.4
  },
  "coverage": {
    "date_range": { "start": "2022-01-05", "end": "2024-12-28" },
    "date_gaps": ["2022-07-01 to 2022-07-31 (interpolated)"],
    "sku_coverage_pct": 94.2,
    "skus_missing_history": 20,
    "total_skus_in_catalog": 347,
    "skus_with_history": 327
  },
  "harmonization": {
    "duplicates_removed": 45,
    "outliers_flagged": 28,
    "promo_affected_sales": 1200,
    "interpolated_records": 156,
    "lead_time_estimated": 35
  },
  "recommendations": [
    "20 SKUs have no sales history — forecast accuracy will be limited for these",
    "1 date gap detected (Jul 2022) — filled with interpolation",
    "28 outliers flagged — review in Data Quality panel before generating forecasts"
  ]
}
```

### Quality Score Formula
```
Quality Score = (Completeness × 0.35) + (Consistency × 0.25) + (Freshness × 0.20) + (Volume × 0.20)

Where:
  Completeness = (required_fields_filled / total_required_fields) × 100
  Consistency  = (rows_without_errors / total_rows) × 100
  Freshness    = max(0, 100 - months_since_newest_data)
  Volume       = min(100, (months_of_history / 36) × 100)
```

**Threshold:** Score >= 60 required to generate first forecast. Below 60 = more data needed.

---

## 8. Re-Import and Update Support

| Mode | Description | Use Case |
|---|---|---|
| **Replace** | Delete existing data for import type, insert new | Updated/corrected historical file |
| **Append** | Add new records only (skip duplicates) | Monthly sales data addition |
| **Merge** | Update existing records + add new | Corrected individual records |

**Version Tracking:**
- Each import is versioned: `data_imports.id` + `version` column
- Previous version retained for 30 days
- Rollback: Revert to previous version (delete current, restore previous)

---

## 9. Laravel Implementation Architecture

### Key Classes

```
app/
├── Http/Controllers/
│   └── ImportController.php          — Upload, Map, Execute, Status endpoints
├── Jobs/
│   └── ProcessImportJob.php          — Queued job for async processing
├── Services/Import/
│   ├── ColumnMapperService.php       — Auto-mapping with fuzzy matching
│   ├── ValidationService.php         — 3-phase validation
│   ├── HarmonizationService.php      — 6-step harmonization pipeline
│   ├── QualityScoreService.php       — Quality score calculation
│   └── ImportRepository.php          — Batch insert with error handling
├── Imports/
│   ├── MotorcycleModelImport.php     — Maatwebsite Excel import class
│   ├── SupplierImport.php
│   ├── ProductImport.php
│   ├── StockLevelImport.php
│   ├── SalesHistoryImport.php
│   └── PurchaseHistoryImport.php
└── Events/
    └── ImportProgressEvent.php       — WebSocket broadcast
```

### Job Flow
```php
// ProcessImportJob.php — dispatched to Redis queue
class ProcessImportJob implements ShouldQueue
{
    public function handle(
        ColumnMapperService $mapper,
        ValidationService $validator,
        HarmonizationService $harmonizer,
        ImportRepository $repository
    ) {
        // Step 1: Read file
        $rows = $this->readFile();
        $this->updateStatus('mapping', 10);
        
        // Step 2: Apply column mapping
        $mappedRows = $mapper->applyMapping($rows, $this->columnMapping);
        $this->updateStatus('validating', 20);
        
        // Step 3: Validate (3 phases)
        $validationResult = $validator->validate($mappedRows, $this->importType);
        if ($validationResult->hasCriticalErrors()) {
            $this->fail($validationResult);
            return;
        }
        $this->updateStatus('harmonizing', 40);
        
        // Step 4: Harmonize
        $harmonizedRows = $harmonizer->process($mappedRows, $this->importType);
        $this->updateStatus('importing', 70);
        
        // Step 5: Batch insert
        $result = $repository->batchInsert($this->tableName, $harmonizedRows);
        $this->updateStatus('completed', 100);
        
        // Step 6: Generate quality report
        $qualityReport = $this->generateQualityReport($result);
        
        // Step 7: Check if all mandatory imports done → suggest first forecast
        if ($this->allMandatoryImportsComplete()) {
            event(new ReadyForFirstForecast($this->tenantId));
        }
    }
}
```

---

## 10. Performance Targets

| Operation | Target | Notes |
|---|---|---|
| File upload + parse | < 5s | Up to 10MB |
| Column mapping | < 1s | Auto-mapping algorithm |
| Validation (1,000 rows) | < 3s | |
| Validation (100,000 rows) | < 30s | |
| Harmonization (100,000 rows) | < 2 min | Including outlier detection + gap filling |
| Batch insert (100,000 rows) | < 3 min | 5,000 rows per batch |
| Full import (100,000 rows) | < 5 min | End-to-end |
| Quality score calculation | < 5s | |

---

## 11. Error Handling Strategy

| Scenario | Action |
|---|---|
| File too large (>10MB) | Reject immediately with error |
| Corrupted file | Reject with specific error message |
| >5% critical validation errors | Block import, show all errors, allow user to fix + re-upload |
| <5% critical errors | Import valid rows, log failed rows, show summary |
| Job timeout (>10 min) | Mark as failed, partial results preserved |
| Database connection lost | Auto-retry 3x with backoff, then fail gracefully |
| Duplicate import (same file) | Detect by filename + hash, ask user to confirm |

---

*Document Version: 1.0 | Pipeline Version: 1.0 | Next Review: Before Sprint 1*
