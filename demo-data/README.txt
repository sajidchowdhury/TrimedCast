TrimedCast Demo Data
====================

Realistic Bangladesh motorcycle parts data for testing TrimedCast.
Two complete years (2024 + 2025) with proper BD seasonal patterns.
Import this data to generate forecasts for 2026.

Import Order (IMPORTANT - follow this sequence)
-----------------------------------------------

1. 01_motorcycle_models.csv  ->  Import Data > Motorcycle Models
2. 02_suppliers.csv          ->  Import Data > Suppliers
3. 03_products.csv           ->  Import Data > Products / Parts
4. 04_inventory.csv          ->  Import Data > Inventory / Stock
5. 05_sales_history_2024.csv ->  Import Data > Sales History
   05_sales_history_2025.csv ->  Import Data > Sales History (second import)
6. 06_purchase_history_2024.csv ->  Import Data > Purchase History
   06_purchase_history_2025.csv ->  Import Data > Purchase History (second import)
7. 07_promo_events.csv       ->  Import Data > Promotional Events


Data Summary
------------

| File | Rows | Description |
|------|------|-------------|
| 01_motorcycle_models.csv | 25 | BD market bikes: Bajaj, TVS, Hero, Honda, Yamaha, Runner, Walton |
| 02_suppliers.csv | 24 | 22 China + 2 BD suppliers, CNY flags set |
| 03_products.csv | 42 | Full SKU catalog: pistons, gaskets, chains, filters, etc. |
| 04_inventory.csv | 42 | Current stock levels with warehouse locations |
| 05_sales_history_2024.csv | 1,729 | All 2024 sales with BD seasonal patterns |
| 05_sales_history_2025.csv | 1,748 | All 2025 sales (~10% growth) |
| 06_purchase_history_2024.csv | 222 | 2024 purchase orders from China |
| 06_purchase_history_2025.csv | 233 | 2025 purchase orders |
| 07_promo_events.csv | 15 | Eid, seasonal, clearance, flash, bundle, loyalty promos |


BD Seasonal Pattern (visible in sales data)
-------------------------------------------

  Month   Multiplier  Season       Revenue (2024)
  Jan     1.25        Winter       BDT 604,140
  Feb     1.35        Winter       BDT 644,853   <-- Peak
  Mar     1.05        Summer       BDT 498,131
  Apr     1.30        Summer/Eid   BDT 614,942   <-- Eid spike
  May     0.95        Summer       BDT 455,269
  Jun     0.80        Monsoon      BDT 387,572
  Jul     0.70        Monsoon      BDT 330,622   <-- Trough
  Aug     0.72        Monsoon      BDT 343,789
  Sep     0.78        Monsoon      BDT 385,833
  Oct     1.10        Pre-Winter   BDT 517,848   <-- Demand rising
  Nov     1.20        Winter       BDT 560,814
  Dec     1.30        Winter       BDT 612,438

Total Revenue 2024: BDT 59,56,251
Total Revenue 2025: BDT 65,62,848 (+10.2% YoY growth)


Key BD Market Features
----------------------

- Currency: BDT (Bangladeshi Taka)
- Date format: DD/MM/YYYY
- 8 BD divisions as regions
- CNY-affected suppliers (Jan 20 - Feb 20 shutdown)
- Sea freight: ~90 days from China
- Eid ul-Fitr and Eid ul-Adha demand spikes
- Monsoon (Jun-Sep) reduces demand significantly
- Winter (Nov-Feb) is peak season for most parts


After Import - What to Expect
-----------------------------

1. Dashboard KPIs will populate with real numbers
2. Season indicator will show current BD season
3. Forecast page will generate predictions for 2026
4. Order triggers will recommend WHAT/WHEN/HOW MUCH to order
5. CNY risk flags will appear for orders near Jan 20 - Feb 20
6. Sea vs Air comparison will show cost/time tradeoffs
7. AI Assistant can answer questions about your data
