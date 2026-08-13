# Order Trigger & Lead Time Logic

### **THE CORE IP — TrimedCast Integrated Seasonal Demand & Inventory Forecasting System**

> **Classification:** CONFIDENTIAL — Core Intellectual Property  
> **System:** TrimedCast v1.0  
> **Target Market:** Motorcycle Parts Businesses, Bangladesh  
> **Supply Chain:** Bangladesh ← China (Cross-Border Import)  
> **Last Updated:** 2025-08-13

---

## Table of Contents

1. [The Three Questions This System Answers](#1-the-three-questions-this-system-answers)
2. [Lead Time Decomposition — BD-China Supply Chain](#2-lead-time-decomposition--bd-china-supply-chain)
3. [Chinese New Year (CNY) Impact Model](#3-chinese-new-year-cny-impact-model)
4. [Order Trigger Date Calculator — Full Implementation](#4-order-trigger-date-calculator--full-implementation)
5. [Recommended Order Quantity Calculator](#5-recommended-order-quantity-calculator)
6. [Seasonal Demand Prediction for BD Market](#6-seasonal-demand-prediction-for-bd-market)
7. [Dashboard Visualization — Order Timeline Gantt](#7-dashboard-visualization--order-timeline-gantt)
8. [Performance Requirements](#8-performance-requirements)
9. [Complete System Pipeline — End-to-End](#9-complete-system-pipeline--end-to-end)
10. [Edge Cases & Failure Modes](#10-edge-cases--failure-modes)
11. [Database Schema Integration](#11-database-schema-integration)
12. [API Surface for Order Trigger Engine](#12-api-surface-for-order-trigger-engine)

---

## 1. The Three Questions This System Answers

These are the three existential questions every motorcycle parts importer in Bangladesh must answer — and currently answers with guesswork, WhatsApp messages to suppliers, and gut feeling. **TrimedCast replaces all of that with deterministic, data-driven algorithms.**

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   ┌─────────────┐   ┌──────────────────┐   ┌───────────────────┐   │
│   │  Q1: WHAT?  │   │  Q2: WHAT QTY?  │   │  Q3: WHEN?       │   │
│   │             │   │                  │   │                   │   │
│   │ Which SKU  │   │ How many units  │   │ What date to     │   │
│   │ to order?  │   │ to order?       │   │ place the order? │   │
│   │             │   │                  │   │                   │   │
│   │ Reorder     │   │ EOQ + Gap +     │   │ Lead Time +      │   │
│   │ Point Logic │   │ Constraints     │   │ CNY + Season     │   │
│   └──────┬──────┘   └────────┬────────┘   └─────────┬─────────┘   │
│          │                   │                      │             │
│          └───────────────────┴──────────────────────┘             │
│                              │                                     │
│                    ┌─────────▼─────────┐                          │
│                    │  ORDER TRIGGER    │                          │
│                    │  ENGINE (CORE)   │                          │
│                    └───────────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.1 Q1: What product should be ordered?

**Logic:** A product appears on the recommended order list when:

```
Current Available Stock < Reorder Point
```

Where:

```
Reorder Point = (Daily Consumption Rate × Lead Time) + Safety Stock
```

**Filterable dimensions:**
| Filter | Values | Use Case |
|--------|--------|----------|
| Season | `winter`, `summer`, `monsoon`, `pre_winter`, `all_season` | "Show me winter-critical items" |
| Motorcycle Model | `CD70`, `Pulsar150`, `Platina100`, etc. | "Only CD70 parts" |
| Category | `brake_system`, `chain_sprocket`, `engine`, `electrical`, `body`, `riding_gear` | "Brake parts only" |
| Urgency | `critical`, `high`, `normal`, `low` | "What needs ordering NOW?" |
| CNY Risk | `true`, `false` | "Which orders have CNY risk?" |
| Shipment Mode | `sea`, `air` | "Air-ship the urgent ones" |

**Output:** Filterable Recommended Order List (sorted by urgency descending)

### 1.2 Q2: What quantity should be ordered?

**Core formula:**

```
Recommended Qty = max(EOQ, (Forecasted Demand + Safety Stock) - Current Stock - Pending Orders)
```

**Constraints applied in order:**

```
┌────────────────────────────────────────────────────────────────┐
│  1. Supplier MOQ:   qty >= MOQ    (cannot order below minimum) │
│  2. Warehouse Cap:  qty <= Max Stock - Current Stock            │
│  3. Overstock:      If current > max_stock, qty = 0 (draw down)│
│  4. Seasonal Cap:   qty <= seasonal_demand_ceiling              │
└────────────────────────────────────────────────────────────────┘
```

### 1.3 Q3: WHEN should the product be ordered?

**This is the single most valuable algorithm in the entire system.**

The Order Trigger Date accounts for:
- ✅ Manufacturing lead time (supplier-specific)
- ✅ Shipment time (sea or air route)
- ✅ Customs clearance time (Chittagong port or Dhaka airport)
- ✅ Chinese New Year shutdown impact
- ✅ Seasonal demand acceleration/deceleration
- ✅ Safety buffer before stock hits critical level

**Why this is so valuable:** A BD motorcycle parts importer who orders too early ties up capital in warehouse inventory. One who orders too late faces stockouts during peak season. The precise trigger date **maximizes cash flow efficiency while minimizing stockout risk** — and that is worth the entire SaaS subscription.

---

## 2. Lead Time Decomposition — BD-China Supply Chain

### 2.1 The Three Components of Lead Time

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   Total Lead Time = Manufacturing Time + Shipment Time + Customs Time║
║                                                                      ║
║   Each component is VARIABLE, not fixed:                             ║
║   - Manufacturing: varies by supplier (60-120 days)                  ║
║   - Shipment: varies by route (sea vs air) and congestion            ║
║   - Customs: varies by port, documentation quality, and volume       ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 2.2 Manufacturing Time

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Default** | 90 days (3 months) | Standard for Chinese motorcycle parts factories |
| **Range** | 60–120 days | Depends on supplier size, order volume, product complexity |
| **Fast suppliers** | 60–75 days | Large factories with spare capacity |
| **Slow suppliers** | 100–120 days | Small workshops, complex parts, high season congestion |
| **Storage** | `suppliers.lead_time_days_manufacturing` | Per-supplier, tenant-configurable |
| **Start** | Date order is confirmed by supplier (acknowledged) |
| **End** | Date goods are ready at FOB port in China (typically Guangzhou/Shenzhen/Yiwu) |

**Manufacturing time sub-stages:**

```
  Order Confirmed        Raw Material          Production          QC + Packing
  ──────────────  ───>  ────────────  ───>  ──────────  ───>  ────────────
  Day 0                  Day 5-10             Day 10-75           Day 75-90
                                                │
                                                │  (longest phase —
                                                │   actual production)
```

### 2.3 Shipment Time

#### Sea Route (China → Chittagong Port) — DEFAULT, COST-OPTIMIZED

```
  Chinese Port          South China       Malacca           Bay of        Chittagong
  (Guangzhou/           Sea / East        Strait            Bengal        Port
   Shenzhen/Yiwu)       China Sea
       │                    │                │                │              │
       ├─ Loading: 2-3d ──►├─ Transit: ────►├─ Transit: ───►├─ Transit: ──►├─ Unload: 3-5d
       │                    │  10-15d        │  10-15d       │  10-15d     │
       │                    │                │                │              │
       └────────────────────┴────────────────┴────────────────┘              │
                                                                            │
                              Total: 45-60 days (default: 52) ──────────────┘
```

| Sub-stage | Duration | Default | Variability |
|-----------|----------|---------|-------------|
| Loading at Chinese port | 2–3 days | 2 | Weather, port congestion |
| South China Sea transit | 10–15 days | 12 | Vessel speed, weather |
| Malacca Strait transit | 10–15 days | 12 | Traffic, piracy delays (rare) |
| Bay of Bengal transit | 10–15 days | 12 | Monsoon rough seas (Jun–Sep) |
| Unloading at Chittagong | 3–5 days | 4 | Port congestion, berth availability |
| **Total** | **45–60 days** | **52** | **+8 days during monsoon season** |

> ⚠️ **Monsoon Effect:** During Jun–Sep, Bay of Bengal can add 5–8 days due to rough seas and port congestion at Chittagong. The system applies a `monsoon_adjustment_days` when shipment date falls in monsoon months.

#### Air Route (China → Dhaka/Hong Kong) — URGENT, TIME-OPTIMIZED

| Sub-stage | Duration | Default |
|-----------|----------|---------|
| Airport processing (China) | 1–2 days | 1 |
| Air transit (Guangzhou → Dhaka) | 1–3 days | 2 |
| Airport clearance (Dhaka) | 2–3 days | 2 |
| Transport to warehouse | 1–2 days | 1 |
| **Total** | **5–10 days** | **8** |

**Cost comparison:**

```
  ┌──────────────────────────────────────────────────────────────┐
  │  Sea:  52 days  │  ~$2,500/container  │  ~$0.05/unit        │
  │  Air:   8 days  │  ~$8,000/shipment   │  ~$0.40/unit        │
  │                     8x cost           │  8x cost per unit   │
  └──────────────────────────────────────────────────────────────┘
  
  Air is used ONLY for:
  ✦ Critical stockout situations (urgency = 'critical')
  ✦ High-margin items where stockout cost > air freight cost
  ✦ Small, lightweight items (brake pads, gaskets — not engine blocks)
```

### 2.4 Customs Clearance Time

#### Sea — Chittagong Port (Default)

```
  Vessel Arrives        Documents           Assessment          Duty               Release &
  at Chittagong         Submitted           & Inspection        Payment            Transport
       │                    │                    │                 │                   │
       ├─ 1-2d wait ──────►├─ 1-2d submit ────►├─ 3-5d assess ─►├─ 1-2d pay ──────►├─ 2-5d transport
       │                    │                    │                 │                   │
       └────────────────────┴────────────────────┴─────────────────┴───────────────────┘
  
                              Total: 7-14 days (default: 10)
```

| Sub-stage | Duration | Default | Bottleneck Risk |
|-----------|----------|---------|-----------------|
| Document submission | 1–2 days | 1 | Missing/incomplete documents |
| Customs assessment | 3–5 days | 4 | **HIGHEST RISK** — backlogged during peak |
| Duty payment & processing | 1–2 days | 1 | Banking delays |
| Release + transport to warehouse | 2–5 days | 3 | Truck availability, road Dhaka–Chittagong |
| **Total** | **7–14 days** | **10** | +5 days during peak import season (Oct–Dec) |

#### Air — Dhaka Airport

| Sub-stage | Duration | Default |
|-----------|----------|---------|
| Document submission | 0.5–1 day | 1 |
| Customs assessment | 1–2 days | 1 |
| Duty payment | 0.5–1 day | 1 |
| **Total** | **2–5 days** | **3** |

### 2.5 Total Lead Time Summary

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║  SEA ROUTE (Default — Cost Optimized)                                    ║
║  ─────────────────────────────────────                                   ║
║  Manufacturing:   90 days                                                ║
║  Shipment:        52 days  (China → Chittagong via sea)                  ║
║  Customs:         10 days  (Chittagong Port)                             ║
║  Processing:       5 days  (order ack + packing + final transport)       ║
║  ─────────────────────────────────────                                   ║
║  TOTAL:          157 days  ≈ 5.2 months                                  ║
║                                                                          ║
║  AIR ROUTE (Urgency — Time Optimized)                                    ║
║  ─────────────────────────────────────                                   ║
║  Manufacturing:   90 days                                                ║
║  Shipment:         8 days  (China → Dhaka via air)                       ║
║  Customs:          3 days  (Dhaka Airport)                               ║
║  Processing:       4 days  (order ack + packing + final transport)       ║
║  ─────────────────────────────────────                                   ║
║  TOTAL:          105 days  ≈ 3.5 months                                  ║
║                                                                          ║
║  DELTA:           52 days  saved by air route                            ║
║  COST:            ~8x     higher freight by air                          ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 2.6 Lead Time Variability Model

Lead times are NOT deterministic. The system models them as distributions for Monte Carlo simulation:

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class LeadTimeDistribution:
    """
    Probabilistic model of each lead time component.
    Used for Monte Carlo simulation of order arrival dates.
    """
    # Manufacturing
    mfg_best: int = 75       # Best case (days)
    mfg_likely: int = 90     # Most likely (days)
    mfg_worst: int = 120     # Worst case (days)
    
    # Shipment (Sea)
    ship_sea_best: int = 45
    ship_sea_likely: int = 52
    ship_sea_worst: int = 65
    
    # Shipment (Air)
    ship_air_best: int = 5
    ship_air_likely: int = 8
    ship_air_worst: int = 12
    
    # Customs (Sea/Chittagong)
    customs_sea_best: int = 7
    customs_sea_likely: int = 10
    customs_sea_worst: int = 18
    
    # Customs (Air/Dhaka)
    customs_air_best: int = 2
    customs_air_likely: int = 3
    customs_air_worst: int = 5

    def total_sea_best(self) -> int:
        return self.mfg_best + self.ship_sea_best + self.customs_sea_best  # 127
    
    def total_sea_likely(self) -> int:
        return self.mfg_likely + self.ship_sea_likely + self.customs_sea_likely  # 152
    
    def total_sea_worst(self) -> int:
        return self.mfg_worst + self.ship_sea_worst + self.customs_sea_worst  # 203
    
    def total_air_best(self) -> int:
        return self.mfg_best + self.ship_air_best + self.customs_air_best  # 82
    
    def total_air_likely(self) -> int:
        return self.mfg_likely + self.ship_air_likely + self.customs_air_likely  # 101
    
    def total_air_worst(self) -> int:
        return self.mfg_worst + self.ship_air_worst + self.customs_air_worst  # 137
```

**P90 lead times** (90% of orders arrive within this time):
```
  Sea P90:  ~175 days (use this for conservative planning)
  Air P90:  ~115 days (use this for conservative air planning)
```

---

## 3. Chinese New Year (CNY) Impact Model

### 3.1 CNY Shutdown Facts

> This is the single biggest disruption to BD–China motorcycle parts supply chain. Every year, importers who fail to plan for CNY face 2–3 month stockouts. **TrimedCast is the first system to model this explicitly.**

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │  CHINESE NEW YEAR — THE ANNUAL SUPPLY CHAIN BLACK HOLE            │
  │                                                                     │
  │  • Chinese factories shut down for 2–4 weeks around Lunar New Year │
  │  • No new production starts during the shutdown window              │
  │  • Existing production may pause mid-way                            │
  │  • Post-CNY restart is gradual (factories don't all restart Day 1) │
  │  • Effective delay: 20–30 days added to any order touching CNY     │
  │  • Pre-CNY rush: Suppliers prioritize older orders, new orders     │
  │    placed in December/January may get delayed further               │
  │                                                                     │
  └─────────────────────────────────────────────────────────────────────┘
```

### 3.2 CNY Risk Detection Algorithm

```python
from datetime import date, timedelta
from dataclasses import dataclass
from typing import Optional

@dataclass
class CNYRisk:
    """Result of CNY overlap analysis."""
    has_risk: bool
    overlap_days: int
    original_trigger_date: Optional[date]
    revised_trigger_date: Optional[date]
    strategy: str           # 'before_cny', 'after_cny', 'none'
    additional_delay_days: int  # Extra days added to lead time
    explanation: str


def check_cny_risk(
    order_date: date,
    mfg_days: int,
    cny_start: date,
    cny_end: date,
    buffer_days: int = 5,  # Days before CNY when factories start winding down
) -> CNYRisk:
    """
    Check if the manufacturing period overlaps with CNY shutdown.
    
    Manufacturing period: order_date to (order_date + mfg_days)
    CNY shutdown: cny_start to cny_end
    
    Factories start winding down `buffer_days` before cny_start,
    so effective CNY impact window is (cny_start - buffer) to cny_end.
    
    Args:
        order_date: When the order would be placed
        mfg_days: Manufacturing lead time in days
        cny_start: First day of CNY factory shutdown
        cny_end: Last day of CNY factory shutdown (factories restart next day)
        buffer_days: Pre-CNY wind-down period (default 5)
    
    Returns:
        CNYRisk with overlap analysis and resolution strategy
    """
    # Effective CNY window (includes pre-CNY wind-down)
    effective_cny_start = cny_start - timedelta(days=buffer_days)
    
    # Manufacturing period
    mfg_start = order_date + timedelta(days=2)  # 2 days order processing
    mfg_end = mfg_start + timedelta(days=mfg_days)
    
    # Check overlap between manufacturing period and effective CNY window
    overlap_start = max(mfg_start, effective_cny_start)
    overlap_end = min(mfg_end, cny_end + timedelta(days=3))  # +3 for gradual restart
    
    if overlap_start < overlap_end:
        overlap_days = (overlap_end - overlap_start).days
        
        # Determine best strategy
        # Strategy A: Can we complete manufacturing before CNY starts?
        latest_start_before_cny = effective_cny_start - timedelta(days=mfg_days) - timedelta(days=2)
        
        if order_date <= latest_start_before_cny:
            strategy = 'before_cny'
            additional_delay = 0
            explanation = (
                f"Manufacturing overlaps CNY by {overlap_days} days. "
                f"However, ordering by {latest_start_before_cny} ensures "
                f"manufacturing completes before CNY shutdown."
            )
        else:
            strategy = 'after_cny'
            # Full CNY delay: shutdown period + gradual restart
            cny_shutdown_days = (cny_end - effective_cny_start).days + 3  # +3 restart
            additional_delay = cny_shutdown_days
            explanation = (
                f"Manufacturing overlaps CNY by {overlap_days} days. "
                f"Cannot complete before CNY. Effective delay: {cny_shutdown_days} days. "
                f"Recommend ordering after CNY ({cny_end + timedelta(days=1)})."
            )
        
        return CNYRisk(
            has_risk=True,
            overlap_days=overlap_days,
            original_trigger_date=order_date,
            revised_trigger_date=None,  # Set by caller based on strategy
            strategy=strategy,
            additional_delay_days=additional_delay,
            explanation=explanation,
        )
    
    # No overlap — safe
    return CNYRisk(
        has_risk=False,
        overlap_days=0,
        original_trigger_date=order_date,
        revised_trigger_date=None,
        strategy='none',
        additional_delay_days=0,
        explanation="Manufacturing period does not overlap with CNY shutdown.",
    )
```

### 3.3 CNY Resolution Strategies

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │  STRATEGY A: ORDER BEFORE CNY (Preferred)                               │
  │  ──────────────────────────────────────                                 │
  │  Place order early enough that manufacturing completes before CNY.      │
  │  Required: order_date ≤ cny_start - mfg_days - buffer                  │
  │  Pro:  No delay, goods arrive on original schedule                      │
  │  Con:  Requires earlier capital outlay, may increase holding cost       │
  │                                                                         │
  │  STRATEGY B: ORDER AFTER CNY (Fallback)                                 │
  │  ─────────────────────────────────────                                  │
  │  Accept the delay. Place order after CNY ends.                          │
  │  order_date = cny_end + 1                                               │
  │  Adds CNY shutdown period (~25-35 days) to effective lead time          │
  │  Pro:  No rush, standard order process                                  │
  │  Con:  Stockout risk if safety stock is insufficient during CNY period  │
  │                                                                         │
  │  STRATEGY C: PARTIAL ORDER (Critical items only)                        │
  │  ─────────────────────────────────────                                  │
  │  Order critical/high-margin items before CNY (Strategy A)              │
  │  Order non-critical items after CNY (Strategy B)                       │
  │  Pro:  Balances capital efficiency with stockout prevention             │
  │  Con:  Two shipments, more logistics complexity                         │
  │                                                                         │
  │  STRATEGY D: AIR ROUTE ESCAPE (Emergency)                               │
  │  ─────────────────────────────────────                                  │
  │  If stockout is imminent and CNY blocks sea route,                      │
  │  switch to air route to reduce shipment time by ~44 days               │
  │  Pro:  Fastest resolution                                               │
  │  Con:  8x freight cost — use only for high-margin/critical items       │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
```

**Strategy selection algorithm:**

```python
def select_cny_strategy(
    days_until_stockout: int,
    cny_delay_days: int,
    item_margin_pct: float,
    item_urgency: str,
    can_air_ship: bool,
    air_cost_multiplier: float = 8.0,
) -> str:
    """
    Automatically select the best CNY resolution strategy.
    
    Decision tree:
    1. If we have enough stock to survive CNY delay → Strategy B (order after)
    2. If stockout before CNY ends AND high margin → Strategy A (order before)
    3. If stockout imminent AND can air ship → Strategy D (air escape)
    4. Otherwise → Strategy C (partial order)
    """
    # Can we survive the CNY delay with current stock?
    if days_until_stockout > cny_delay_days + 30:  # +30 buffer
        return 'after_cny'  # Strategy B
    
    # Stockout risk — try to order before CNY
    if item_urgency in ('critical', 'high'):
        return 'before_cny'  # Strategy A
    
    # Emergency: stockout imminent, consider air
    if days_until_stockout <= 30 and can_air_ship and item_margin_pct >= 30:
        return 'air_escape'  # Strategy D
    
    # Default: partial approach
    return 'partial_order'  # Strategy C
```

### 3.4 Annual CNY Calendar (2025–2030)

| Year | Lunar New Year Date | Shutdown Window (Estimated) | Pre-CNY Rush Starts | Post-CNY Full Restart |
|------|--------------------|-----------------------------|---------------------|-----------------------|
| 2025 | January 29 | Jan 20 — Feb 10 | ~Jan 6 | ~Feb 13 |
| 2026 | February 17 | Feb 7 — Feb 28 | ~Jan 24 | ~Mar 3 |
| 2027 | February 6 | Jan 27 — Feb 17 | ~Jan 13 | ~Feb 20 |
| 2028 | January 26 | Jan 16 — Feb 6 | ~Jan 2 | ~Feb 9 |
| 2029 | February 13 | Feb 3 — Feb 24 | ~Jan 20 | ~Feb 27 |
| 2030 | February 3 | Jan 24 — Feb 14 | ~Jan 10 | ~Feb 17 |

```python
# CNY Calendar as a constant in the system
CNY_CALENDAR = {
    2025: {'date': date(2025, 1, 29), 'shutdown_start': date(2025, 1, 20), 'shutdown_end': date(2025, 2, 10)},
    2026: {'date': date(2026, 2, 17), 'shutdown_start': date(2026, 2, 7),  'shutdown_end': date(2026, 2, 28)},
    2027: {'date': date(2027, 2, 6),  'shutdown_start': date(2027, 1, 27), 'shutdown_end': date(2027, 2, 17)},
    2028: {'date': date(2028, 1, 26), 'shutdown_start': date(2028, 1, 16), 'shutdown_end': date(2028, 2, 6)},
    2029: {'date': date(2029, 2, 13), 'shutdown_start': date(2029, 2, 3),  'shutdown_end': date(2029, 2, 24)},
    2030: {'date': date(2030, 2, 3),  'shutdown_start': date(2030, 1, 24), 'shutdown_end': date(2030, 2, 14)},
}

def get_cny_for_date(target_date: date) -> dict:
    """Get the CNY window that affects orders placed on or around target_date."""
    year = target_date.year
    # Check current year and next year (CNY might be early next year)
    for y in [year, year + 1]:
        if y in CNY_CALENDAR:
            cny = CNY_CALENDAR[y]
            # CNY affects orders placed up to ~6 months before the shutdown
            if target_date <= cny['shutdown_end']:
                return cny
    return None
```

### 3.5 CNY Impact Visualization

```
  2026 Timeline — CNY Impact on Order Placement
  ═════════════════════════════════════════════
  
  Jan        Feb        Mar        Apr        May
  ├──┼┼┼┼┼┼┼┤├┼┼┼┼┼┼┼┤├┼┼┼┼┼┼┼┤├┼┼┼┼┼┼┼┤├┼┼┼┼┼┼┼┤
  
       ████████████                                 ← CNY Shutdown (Feb 7 - Feb 28)
  
  ←── SAFE ──→│     ←── RISKY ──→     ←── SAFE ──→
               │                       │
    Order here │    Order here gets     │   Order here
    to finish  │    caught in CNY      │   starts after
    before CNY │    delay = 21 days    │   CNY restart
               │                       │
    Dec 9 *    │    Dec 10 - Feb 28    │   Mar 1
  
  * Dec 9 = Feb 7 - 90 days mfg - 5 days buffer
    (Last safe order date to complete before CNY 2026)
```

---

## 4. Order Trigger Date Calculator — Full Implementation

### 4.1 Core Data Structures

```python
from datetime import date, timedelta
from dataclasses import dataclass, field
from typing import Optional, List
from enum import Enum


class Urgency(Enum):
    CRITICAL = "critical"   # Order should have been placed already / within 30 days
    HIGH = "high"           # Order needed within 90 days
    NORMAL = "normal"       # Order needed within 180 days
    LOW = "low"             # Order needed after 180 days


class ShipmentMode(Enum):
    SEA = "sea"
    AIR = "air"


class CNYStrategy(Enum):
    BEFORE_CNY = "before_cny"
    AFTER_CNY = "after_cny"
    PARTIAL_ORDER = "partial_order"
    AIR_ESCAPE = "air_escape"
    NONE = "none"


@dataclass
class OrderTimeline:
    """Complete milestone timeline from order placement to product availability."""
    order_trigger_date: date          # When to place the order
    order_processing_end: date        # Supplier acknowledges order (+2 days)
    mfg_start_date: date             # Manufacturing begins
    mfg_complete_date: date          # Manufacturing completed, goods at FOB port
    packing_loading_end: date        # Goods packed and loaded onto vessel (+2 days)
    ship_departure_date: date        # Vessel/flight departs China
    arrival_date: date               # Vessel/flight arrives at BD port/airport
    customs_start_date: date         # Customs clearance begins
    customs_clearance_date: date     # Customs clearance completed
    warehouse_arrival_date: date     # Goods arrive at warehouse
    available_for_sale_date: date    # Goods available for sale (QC + shelving +1 day)
    total_lead_time_days: int        # Total from order to availability
    cny_delay_days: int = 0          # Extra days due to CNY


@dataclass
class CNYRiskAssessment:
    """Full CNY risk analysis for an order."""
    has_risk: bool
    overlap_days: int
    effective_cny_start: date        # Including pre-CNY wind-down
    cny_shutdown_start: date
    cny_shutdown_end: date
    strategy: CNYStrategy
    additional_delay_days: int
    latest_safe_order_date: Optional[date]  # Last date to order and finish before CNY
    post_cny_order_date: Optional[date]     # First date to order after CNY
    explanation: str


@dataclass
class OrderTriggerResult:
    """Complete output of the Order Trigger calculation."""
    sku_code: str
    product_name: str
    
    # The answer to Q1: What to order
    needs_order: bool
    reorder_point: float
    current_stock: int
    stock_status: str              # 'below_reorder', 'at_safety', 'adequate', 'overstock'
    
    # The answer to Q2: What qty
    recommended_qty: int
    recommended_qty_breakdown: dict
    
    # The answer to Q3: When to order
    order_trigger_date: date
    timeline: OrderTimeline
    urgency: Urgency
    days_until_trigger: int
    
    # CNY analysis
    cny_risk: CNYRiskAssessment
    
    # Shipment recommendation
    recommended_shipment_mode: ShipmentMode
    
    # Metadata
    calculated_at: date
    total_lead_time_days: int
```

### 4.2 The Core Algorithm — Full Implementation

```python
def calculate_order_trigger(
    sku_code: str,
    product_name: str,
    current_stock: int,
    safety_stock: int,
    max_stock: int,
    daily_consumption_rate: float,
    mfg_days: int,
    shipment_mode: ShipmentMode,
    shipment_days: Optional[int] = None,
    customs_days: Optional[int] = None,
    forecasted_demand: int = 0,
    qty_on_order: int = 0,
    eoq: int = 0,
    moq: int = 1,
    today: Optional[date] = None,
    cny_start: Optional[date] = None,
    cny_end: Optional[date] = None,
    buffer_days: int = 7,
    order_processing_days: int = 2,
    packing_loading_days: int = 2,
    warehouse_transport_days: int = 1,
    qc_shelving_days: int = 1,
    monsoon_adjustment: int = 0,
) -> OrderTriggerResult:
    """
    ╔═════════════════════════════════════════════════════════════════╗
    ║  THE CORE ALGORITHM: Calculate when, what, and how much to     ║
    ║  order for a single SKU.                                       ║
    ║                                                                 ║
    ║  This function answers ALL THREE QUESTIONS:                     ║
    ║    Q1: What product?  → needs_order, stock_status               ║
    ║    Q2: What qty?      → recommended_qty                         ║
    ║    Q3: When?          → order_trigger_date, timeline, urgency   ║
    ╚═════════════════════════════════════════════════════════════════╝
    
    Args:
        sku_code: Product SKU code
        product_name: Human-readable product name
        current_stock: Current available inventory (units)
        safety_stock: Minimum stock level before stockout risk
        max_stock: Maximum warehouse capacity for this SKU
        daily_consumption_rate: Average units consumed per day
        mfg_days: Manufacturing lead time (supplier-specific)
        shipment_mode: SEA or AIR
        shipment_days: Override for calculated shipment days
        customs_days: Override for calculated customs days
        forecasted_demand: Total forecasted demand for the planning period
        qty_on_order: Units already on order (in pipeline)
        eoq: Economic Order Quantity
        moq: Supplier Minimum Order Quantity
        today: Current date (defaults to date.today())
        cny_start: CNY shutdown start date (None = no CNY check)
        cny_end: CNY shutdown end date (None = no CNY check)
        buffer_days: Safety buffer before stock hits safety level
        order_processing_days: Days for supplier to acknowledge order
        packing_loading_days: Days for packing and loading at port
        warehouse_transport_days: Days for final transport to warehouse
        qc_shelving_days: Days for QC check and shelving
        monsoon_adjustment: Extra shipment days during monsoon (Jun-Sep)
    
    Returns:
        OrderTriggerResult with complete analysis
    """
    if today is None:
        today = date.today()
    
    # ──────────────────────────────────────────────────────────────
    # STEP 1: Determine shipment and customs durations
    # ──────────────────────────────────────────────────────────────
    if shipment_days is None:
        if shipment_mode == ShipmentMode.SEA:
            shipment_days = 52 + monsoon_adjustment
        else:
            shipment_days = 8
    
    if customs_days is None:
        customs_days = 10 if shipment_mode == ShipmentMode.SEA else 3
    
    # ──────────────────────────────────────────────────────────────
    # STEP 2: Calculate Reorder Point (answers Q1)
    # ──────────────────────────────────────────────────────────────
    total_lead_time = mfg_days + shipment_days + customs_days
    reorder_point = (daily_consumption_rate * total_lead_time) + safety_stock
    
    # Determine stock status
    if current_stock <= safety_stock:
        stock_status = 'at_safety'
        needs_order = True
    elif current_stock <= reorder_point:
        stock_status = 'below_reorder'
        needs_order = True
    elif current_stock > max_stock:
        stock_status = 'overstock'
        needs_order = False
    else:
        stock_status = 'adequate'
        needs_order = current_stock < reorder_point  # May still need to order for seasonal prep
    
    # ──────────────────────────────────────────────────────────────
    # STEP 3: Calculate Order Trigger Date (answers Q3)
    # ──────────────────────────────────────────────────────────────
    
    # 3a: When will stock hit safety stock level?
    if daily_consumption_rate > 0:
        days_until_safety_stock = (current_stock - safety_stock) / daily_consumption_rate
    else:
        days_until_safety_stock = float('inf')  # No consumption = no urgency
    
    safety_stock_hit_date = today + timedelta(days=max(0, days_until_safety_stock))
    
    # 3b: Order trigger = safety_stock_hit_date - total_lead_time - buffer
    #     (We must order early enough that goods arrive BEFORE we hit safety stock)
    order_trigger_date = safety_stock_hit_date - timedelta(days=total_lead_time) - timedelta(days=buffer_days)
    
    # ──────────────────────────────────────────────────────────────
    # STEP 4: CNY Risk Assessment
    # ──────────────────────────────────────────────────────────────
    cny_risk = _assess_cny_risk(
        order_trigger_date=order_trigger_date,
        mfg_days=mfg_days,
        cny_start=cny_start,
        cny_end=cny_end,
        today=today,
        current_stock=current_stock,
        safety_stock=safety_stock,
        daily_consumption_rate=daily_consumption_rate,
        buffer_days=buffer_days,
        order_processing_days=order_processing_days,
    )
    
    # If CNY risk detected, revise order trigger date
    cny_delay_days = 0
    if cny_risk.has_risk:
        if cny_risk.strategy == CNYStrategy.BEFORE_CNY:
            # Order early enough to finish before CNY
            if cny_risk.latest_safe_order_date and cny_risk.latest_safe_order_date >= today:
                order_trigger_date = min(order_trigger_date, cny_risk.latest_safe_order_date)
        elif cny_risk.strategy == CNYStrategy.AFTER_CNY:
            # Accept delay, order after CNY
            if cny_risk.post_cny_order_date:
                order_trigger_date = cny_risk.post_cny_order_date
                cny_delay_days = cny_risk.additional_delay_days
        cny_risk = dataclass_replace(cny_risk)  # Update if needed
    
    # ──────────────────────────────────────────────────────────────
    # STEP 5: Build Complete Timeline
    # ──────────────────────────────────────────────────────────────
    timeline = _build_timeline(
        order_trigger_date=order_trigger_date,
        mfg_days=mfg_days,
        shipment_days=shipment_days,
        customs_days=customs_days,
        order_processing_days=order_processing_days,
        packing_loading_days=packing_loading_days,
        warehouse_transport_days=warehouse_transport_days,
        qc_shelving_days=qc_shelving_days,
        cny_delay_days=cny_delay_days,
    )
    
    # ──────────────────────────────────────────────────────────────
    # STEP 6: Determine Urgency
    # ──────────────────────────────────────────────────────────────
    days_until_trigger = (order_trigger_date - today).days
    
    if days_until_trigger <= 0:
        urgency = Urgency.CRITICAL  # OVERDUE — should have been ordered already!
    elif days_until_trigger <= 30:
        urgency = Urgency.CRITICAL
    elif days_until_trigger <= 90:
        urgency = Urgency.HIGH
    elif days_until_trigger <= 180:
        urgency = Urgency.NORMAL
    else:
        urgency = Urgency.LOW
    
    # ──────────────────────────────────────────────────────────────
    # STEP 7: Calculate Recommended Order Quantity (answers Q2)
    # ──────────────────────────────────────────────────────────────
    qty_result = calculate_recommended_qty(
        forecasted_demand=forecasted_demand,
        safety_stock=safety_stock,
        current_stock=current_stock,
        qty_on_order=qty_on_order,
        eoq=eoq,
        moq=moq,
        max_stock=max_stock,
    )
    
    # ──────────────────────────────────────────────────────────────
    # STEP 8: Recommend shipment mode
    # ──────────────────────────────────────────────────────────────
    recommended_mode = shipment_mode
    if urgency == Urgency.CRITICAL and shipment_mode == ShipmentMode.SEA:
        # Consider air for critical items (but only if it saves enough time)
        if days_until_trigger <= 0:
            recommended_mode = ShipmentMode.AIR
    
    # ──────────────────────────────────────────────────────────────
    # STEP 9: Return complete result
    # ──────────────────────────────────────────────────────────────
    return OrderTriggerResult(
        sku_code=sku_code,
        product_name=product_name,
        needs_order=needs_order,
        reorder_point=round(reorder_point, 1),
        current_stock=current_stock,
        stock_status=stock_status,
        recommended_qty=qty_result['recommended_qty'],
        recommended_qty_breakdown=qty_result,
        order_trigger_date=order_trigger_date,
        timeline=timeline,
        urgency=urgency,
        days_until_trigger=days_until_trigger,
        cny_risk=cny_risk,
        recommended_shipment_mode=recommended_mode,
        calculated_at=today,
        total_lead_time_days=total_lead_time,
    )


def _assess_cny_risk(
    order_trigger_date: date,
    mfg_days: int,
    cny_start: Optional[date],
    cny_end: Optional[date],
    today: date,
    current_stock: int,
    safety_stock: int,
    daily_consumption_rate: float,
    buffer_days: int,
    order_processing_days: int,
) -> CNYRiskAssessment:
    """Assess CNY risk for a planned order."""
    
    # No CNY data provided
    if cny_start is None or cny_end is None:
        return CNYRiskAssessment(
            has_risk=False, overlap_days=0,
            effective_cny_start=today, cny_shutdown_start=today, cny_shutdown_end=today,
            strategy=CNYStrategy.NONE, additional_delay_days=0,
            latest_safe_order_date=None, post_cny_order_date=None,
            explanation="No CNY window provided for analysis.",
        )
    
    # Pre-CNY wind-down period (factories slow down 5 days before)
    pre_cny_winddown = 5
    effective_cny_start = cny_start - timedelta(days=pre_cny_winddown)
    
    # Manufacturing period
    mfg_start = order_trigger_date + timedelta(days=order_processing_days)
    mfg_end = mfg_start + timedelta(days=mfg_days)
    
    # Post-CNY restart buffer (factories don't all restart on day 1)
    post_cny_restart_buffer = 3
    effective_cny_end = cny_end + timedelta(days=post_cny_restart_buffer)
    
    # Check overlap
    overlap_start = max(mfg_start, effective_cny_start)
    overlap_end = min(mfg_end, effective_cny_end)
    
    if overlap_start < overlap_end:
        overlap_days = (overlap_end - overlap_start).days
        
        # Calculate latest safe order date (Strategy A)
        latest_safe = effective_cny_start - timedelta(days=mfg_days) - timedelta(days=order_processing_days)
        
        # Calculate post-CNY order date (Strategy B)
        post_cny_order = cny_end + timedelta(days=post_cny_restart_buffer)
        
        # Total CNY shutdown period
        cny_total_days = (effective_cny_end - effective_cny_start).days
        
        # Determine strategy
        if latest_safe >= today:
            strategy = CNYStrategy.BEFORE_CNY
            additional_delay = 0
            explanation = (
                f"⚠️ CNY RISK: Manufacturing overlaps CNY by {overlap_days} days. "
                f"STRATEGY A: Order by {latest_safe.strftime('%Y-%m-%d')} to complete "
                f"manufacturing before CNY shutdown ({cny_start.strftime('%b %d')}–"
                f"{cny_end.strftime('%b %d')})."
            )
        else:
            strategy = CNYStrategy.AFTER_CNY
            additional_delay = cny_total_days
            explanation = (
                f"🔴 CNY RISK: Manufacturing overlaps CNY by {overlap_days} days. "
                f"Cannot finish before CNY. STRATEGY B: Order after CNY on "
                f"{post_cny_order.strftime('%Y-%m-%d')}. Effective delay: {cny_total_days} days. "
                f"Verify safety stock ({safety_stock}) can cover the delay."
            )
        
        return CNYRiskAssessment(
            has_risk=True,
            overlap_days=overlap_days,
            effective_cny_start=effective_cny_start,
            cny_shutdown_start=cny_start,
            cny_shutdown_end=cny_end,
            strategy=strategy,
            additional_delay_days=additional_delay,
            latest_safe_order_date=latest_safe if strategy == CNYStrategy.BEFORE_CNY else None,
            post_cny_order_date=post_cny_order if strategy == CNYStrategy.AFTER_CNY else None,
            explanation=explanation,
        )
    
    # No overlap — safe
    return CNYRiskAssessment(
        has_risk=False, overlap_days=0,
        effective_cny_start=effective_cny_start,
        cny_shutdown_start=cny_start, cny_shutdown_end=cny_end,
        strategy=CNYStrategy.NONE, additional_delay_days=0,
        latest_safe_order_date=None, post_cny_order_date=None,
        explanation=f"✅ No CNY risk. Manufacturing completes before CNY window "
                    f"({cny_start.strftime('%b %d')}–{cny_end.strftime('%b %d')}).",
    )


def _build_timeline(
    order_trigger_date: date,
    mfg_days: int,
    shipment_days: int,
    customs_days: int,
    order_processing_days: int,
    packing_loading_days: int,
    warehouse_transport_days: int,
    qc_shelving_days: int,
    cny_delay_days: int,
) -> OrderTimeline:
    """Build the complete order-to-availability timeline."""
    
    d = order_trigger_date
    total = 0
    
    # Order processing
    order_processing_end = d + timedelta(days=order_processing_days)
    total += order_processing_days
    
    # Manufacturing (including any CNY delay)
    mfg_start = order_processing_end
    effective_mfg_days = mfg_days + cny_delay_days
    mfg_complete = mfg_start + timedelta(days=effective_mfg_days)
    total += effective_mfg_days
    
    # Packing & loading
    packing_end = mfg_complete + timedelta(days=packing_loading_days)
    total += packing_loading_days
    
    # Shipment
    ship_departure = packing_end
    arrival = ship_departure + timedelta(days=shipment_days)
    total += shipment_days
    
    # Customs
    customs_start = arrival
    customs_clearance = customs_start + timedelta(days=customs_days)
    total += customs_days
    
    # Warehouse transport
    warehouse_arrival = customs_clearance + timedelta(days=warehouse_transport_days)
    total += warehouse_transport_days
    
    # QC + shelving
    available_for_sale = warehouse_arrival + timedelta(days=qc_shelving_days)
    total += qc_shelving_days
    
    return OrderTimeline(
        order_trigger_date=d,
        order_processing_end=order_processing_end,
        mfg_start_date=mfg_start,
        mfg_complete_date=mfg_complete,
        packing_loading_end=packing_end,
        ship_departure_date=ship_departure,
        arrival_date=arrival,
        customs_start_date=customs_start,
        customs_clearance_date=customs_clearance,
        warehouse_arrival_date=warehouse_arrival,
        available_for_sale_date=available_for_sale,
        total_lead_time_days=total,
        cny_delay_days=cny_delay_days,
    )


def dataclass_replace(obj, **kwargs):
    """Simple dataclass replace (like dataclasses.replace)."""
    from dataclasses import asdict, replace
    return replace(obj, **kwargs)
```

### 4.3 Worked Example 1: Winter 2026 Order for Brake Pads

**Scenario:** Brake Pad Set (BP-001), preparing for Winter 2026 season

**Input parameters:**

| Parameter | Value | Notes |
|-----------|-------|-------|
| SKU | BP-001 | Brake Pad Set - Front (CD70) |
| Current stock | 95 units | |
| Safety stock | 50 units | |
| Max stock | 500 units | Warehouse capacity |
| Daily consumption rate | 3.2 units/day | Higher in winter (normal: 2.0) |
| Manufacturing | 90 days | Standard Chinese supplier |
| Shipment | Sea, 52 days | Default sea route |
| Customs | 10 days | Chittagong port |
| EOQ | 200 units | Economic batch size |
| MOQ | 100 units | Supplier minimum |
| Forecasted demand | 580 units | Prophet forecast for Nov–Feb |
| On order | 0 units | No pending orders |
| Today | August 13, 2025 | |
| CNY 2026 | Feb 7 — Feb 28 | |
| Buffer | 7 days | |

**Step-by-step calculation:**

```
═══════════════════════════════════════════════════════════════════════════
  WORKED EXAMPLE: BP-001 Brake Pad Set — Winter 2026
═══════════════════════════════════════════════════════════════════════════

STEP 1: Calculate Total Lead Time
──────────────────────────────────
  Manufacturing:     90 days
  Shipment (sea):    52 days
  Customs:           10 days
  ────────────────────────
  Total Lead Time:  152 days

STEP 2: Calculate Reorder Point
────────────────────────────────
  Reorder Point = (Daily Consumption × Lead Time) + Safety Stock
  Reorder Point = (3.2 × 152) + 50
  Reorder Point = 486.4 + 50
  Reorder Point = 536.4 units

  Current Stock (95) < Reorder Point (536.4)  →  NEEDS ORDER ✅
  Stock Status: below_reorder

STEP 3: Calculate When Stock Hits Safety Level
──────────────────────────────────────────────
  Days until safety stock = (Current Stock - Safety Stock) / Daily Rate
  Days until safety stock = (95 - 50) / 3.2
  Days until safety stock = 45 / 3.2
  Days until safety stock = 14.06 days

  Safety stock hit date = Aug 13 + 14 days = Aug 27, 2025

STEP 4: Calculate Order Trigger Date
────────────────────────────────────
  Order Trigger Date = Safety Hit Date - Total Lead Time - Buffer
  Order Trigger Date = Aug 27 - 152 days - 7 days
  Order Trigger Date = Aug 27 - 159 days

  Aug 27, 2025 − 159 days:
    Aug 27 − 27 = Aug 0 → Jul 31
    Jul 31 − 31 = Jun 30
    Jun 30 − 30 = May 31
    May 31 − 31 = Apr 30
    Apr 30 − 30 = Mar 31
    Mar 31 − 10 = Mar 21

  Order Trigger Date = March 21, 2025  ← ALREADY PAST!

STEP 5: CNY Risk Assessment
──────────────────────────
  Manufacturing period: Mar 21 + 2 days → Mar 23 to Jun 21, 2025
  CNY 2025 shutdown: Jan 20 – Feb 10, 2025
  Effective CNY (with wind-down): Jan 15 – Feb 13, 2025

  Does Mar 23, 2025 – Jun 21, 2025 overlap with Jan 15 – Feb 13, 2025?
  overlap_start = max(Mar 23, Jan 15) = Mar 23
  overlap_end = min(Jun 21, Feb 13) = Feb 13
  Mar 23 > Feb 13 → NO OVERLAP

  ✅ No CNY risk for this order (CNY 2025 already passed)
  
  But wait — check CNY 2026:
  Manufacturing period: Mar 23, 2025 to Jun 21, 2025
  CNY 2026 shutdown: Feb 7 – Feb 28, 2026
  Jun 21, 2025 < Feb 7, 2026 → NO OVERLAP
  
  ✅ No CNY risk (manufacturing completes well before CNY 2026)

STEP 6: Determine Urgency
─────────────────────────
  Days until trigger = Mar 21, 2025 - Aug 13, 2025 = -145 days

  -145 days ≤ 0  →  URGENCY = CRITICAL 🔴

  ⚠️ This order is 145 days OVERDUE! The product is likely already
     in stockout territory. Immediate action required.

STEP 7: Build Full Timeline (from today, Aug 13, since order is overdue)
────────────────────────────────────────────────────────────────────────
  Order Trigger Date:      Aug 13, 2025 (order NOW — it's overdue)
  Order Processing:        Aug 13 → Aug 15 (2 days)
  Manufacturing:           Aug 15 → Nov 13 (90 days)
  Packing & Loading:       Nov 13 → Nov 15 (2 days)
  Shipment (Sea):          Nov 15 → Jan 6, 2026 (52 days)
  Arrival Chittagong:      Jan 6, 2026
  Customs Clearance:       Jan 6 → Jan 16 (10 days)
  Transport to Warehouse:  Jan 16 → Jan 17 (1 day)
  QC + Shelving:           Jan 17 → Jan 18 (1 day)
  ────────────────────────────────────────────
  Available for Sale:      January 18, 2026
  
  Total: 2 + 90 + 2 + 52 + 10 + 1 + 1 = 158 days

STEP 8: Calculate Recommended Order Quantity
────────────────────────────────────────────
  Total needed = Forecasted Demand + Safety Stock = 580 + 50 = 630
  Total supply = Current Stock + On Order = 95 + 0 = 95
  Gap = 630 - 95 = 535 units
  
  qty = max(Gap, EOQ) = max(535, 200) = 535
  qty = max(535, MOQ) = max(535, 100) = 535  (MOQ satisfied)
  qty = min(535, Max Stock - Current) = min(535, 500-95) = min(535, 405) = 405
  
  ⚠️ Warehouse cap constraint applied!
  Recommended Qty = 405 units
  (Need 535 but warehouse can only hold 405 more)

═══════════════════════════════════════════════════════════════════════════
  RESULT SUMMARY
═══════════════════════════════════════════════════════════════════════════
  Product:            BP-001 Brake Pad Set - Front (CD70)
  Needs Order:        YES ✅
  Recommended Qty:    405 units (constrained by warehouse capacity)
  Order Trigger:      OVERDUE by 145 days — ORDER IMMEDIATELY
  Urgency:            CRITICAL 🔴
  Available Date:     January 18, 2026
  Total Lead Time:    158 days
  CNY Risk:           None ✅
═══════════════════════════════════════════════════════════════════════════
```

**Python execution of the same example:**

```python
result = calculate_order_trigger(
    sku_code="BP-001",
    product_name="Brake Pad Set - Front (CD70)",
    current_stock=95,
    safety_stock=50,
    max_stock=500,
    daily_consumption_rate=3.2,
    mfg_days=90,
    shipment_mode=ShipmentMode.SEA,
    shipment_days=52,
    customs_days=10,
    forecasted_demand=580,
    qty_on_order=0,
    eoq=200,
    moq=100,
    today=date(2025, 8, 13),
    cny_start=date(2025, 1, 20),  # CNY 2025 (already passed)
    cny_end=date(2025, 2, 10),
    buffer_days=7,
)

# Key outputs:
# result.needs_order = True
# result.reorder_point = 536.4
# result.stock_status = 'below_reorder'
# result.urgency = Urgency.CRITICAL
# result.days_until_trigger = -145  (OVERDUE!)
# result.recommended_qty = 405
# result.timeline.available_for_sale_date = date(2026, 1, 18)
# result.cny_risk.has_risk = False
```

### 4.4 Worked Example 2: CNY-Risky Order

**Scenario:** Chain Sprocket Kit (CS-015), where the natural order trigger date falls during CNY shutdown.

**Input parameters:**

| Parameter | Value | Notes |
|-----------|-------|-------|
| SKU | CS-015 | Chain Sprocket Kit (Pulsar 150) |
| Current stock | 320 units | |
| Safety stock | 80 units | |
| Max stock | 600 units | |
| Daily consumption rate | 1.5 units/day | Moderate demand |
| Manufacturing | 90 days | |
| Shipment | Sea, 52 days | |
| Customs | 10 days | |
| Today | November 15, 2025 | |
| CNY 2026 | Feb 7 — Feb 28 | |
| Buffer | 7 days | |

**Step-by-step calculation:**

```
═══════════════════════════════════════════════════════════════════════════
  WORKED EXAMPLE: CS-015 Chain Sprocket Kit — CNY Risk Scenario
═══════════════════════════════════════════════════════════════════════════

STEP 1: Total Lead Time
────────────────────────
  Manufacturing:  90 days
  Shipment:       52 days
  Customs:        10 days
  Total:         152 days

STEP 2: Reorder Point
──────────────────────
  Reorder Point = (1.5 × 152) + 80 = 228 + 80 = 308 units
  Current Stock (320) > Reorder Point (308)  →  Close to reorder!
  (Will cross reorder point soon at current consumption rate)

STEP 3: When does stock hit safety level?
─────────────────────────────────────────
  Days until safety stock = (320 - 80) / 1.5 = 160 days
  Safety stock hit date = Nov 15 + 160 days = Apr 24, 2026

STEP 4: Calculate Order Trigger Date
────────────────────────────────────
  Order Trigger Date = Apr 24, 2026 - 152 days - 7 days
  Order Trigger Date = Apr 24 - 159 days
  Order Trigger Date = November 16, 2025

  (Just 1 day from today — essentially, order NOW)

STEP 5: CNY Risk Assessment ⚠️
──────────────────────────────
  Manufacturing period: Nov 17, 2025 → Feb 15, 2026
    (Nov 16 + 2 processing = Nov 17 start; + 90 mfg = Feb 15)

  CNY 2026 shutdown: Feb 7 – Feb 28, 2026
  Effective CNY window (with 5-day wind-down): Feb 2 – Mar 3, 2026

  Overlap check:
    overlap_start = max(Nov 17, Feb 2) = Feb 2, 2026
    overlap_end = min(Feb 15, Mar 3) = Feb 15, 2026
    Feb 2 < Feb 15 → OVERLAP! 🔴

    Overlap = 13 days

  Strategy A (Order Before CNY):
    Latest safe order = Feb 2 - 90 mfg - 2 processing = Nov 2, 2025
    Is Nov 2 >= today (Nov 15)?  NO ❌
    → Cannot complete manufacturing before CNY starts

  Strategy B (Order After CNY):
    Post-CNY order date = Feb 28 + 3 restart buffer = Mar 3, 2026
    This adds ~29 days of effective CNY delay

  ⚠️ RESULT: CNY Risk detected. Strategy B selected.
    Revised order trigger date: March 3, 2026
    Additional delay: 29 days (CNY shutdown + restart buffer)

STEP 6: Revised Timeline (with CNY delay)
─────────────────────────────────────────
  Order Trigger Date:      Mar 3, 2026 (revised from Nov 16)
  Order Processing:        Mar 3 → Mar 5 (2 days)
  Manufacturing:           Mar 5 → Jun 3 (90 days, no CNY overlap now)
  Packing & Loading:       Jun 3 → Jun 5 (2 days)
  Shipment (Sea):          Jun 5 → Jul 27 (52 days)
  Arrival Chittagong:      Jul 27, 2026
  Customs Clearance:       Jul 27 → Aug 6 (10 days)
  Transport to Warehouse:  Aug 6 → Aug 7 (1 day)
  QC + Shelving:           Aug 7 → Aug 8 (1 day)
  ────────────────────────────────────────────
  Available for Sale:      August 8, 2026

STEP 7: Urgency (with revised date)
────────────────────────────────────
  Days until trigger = Mar 3, 2026 - Nov 15, 2025 = 108 days
  90 < 108 ≤ 180  →  URGENCY = NORMAL 🟡

  But stock will hit safety level on Apr 24, 2026
  Available date is Aug 8, 2026
  Stockout risk: Apr 24 to Aug 8 = 106 days of stockout! 🔴

  ⚠️ UPGRADED URGENCY: HIGH (due to stockout gap despite CNY delay)

═══════════════════════════════════════════════════════════════════════════
  RESULT SUMMARY
═══════════════════════════════════════════════════════════════════════════
  Product:            CS-015 Chain Sprocket Kit (Pulsar 150)
  Needs Order:        YES ✅
  Original Trigger:   Nov 16, 2025
  Revised Trigger:    Mar 3, 2026 (CNY delay)
  CNY Strategy:       AFTER_CNY (Strategy B)
  CNY Overlap:        13 days
  Additional Delay:   29 days
  Urgency:            HIGH 🟡→🔴 (upgraded due to stockout gap)
  Available Date:     Aug 8, 2026
  Stockout Risk:      Apr 24 – Aug 8 (106 days)
  
  💡 RECOMMENDATION: Consider partial order via AIR for critical
     items to bridge the stockout gap, or increase safety stock
     to 240 units (160 days × 1.5/day) to survive until Aug 2026.
═══════════════════════════════════════════════════════════════════════════
```

**Alternative: What if we used Strategy A (rushed order before Nov 2)?**

```
  If the business had placed the order by November 2, 2025:
  
  Order Date:            Nov 2, 2025
  Mfg Start:            Nov 4, 2025
  Mfg Complete:         Feb 2, 2026 (just before effective CNY start)
  Packing:              Feb 2 → Feb 4
  Shipment:             Feb 4 → Mar 28 (52 days)
  Arrival:              Mar 28, 2026
  Customs:              Mar 28 → Apr 7
  Available:            Apr 9, 2026
  
  vs. Strategy B available: Aug 8, 2026
  TIME SAVED: 121 days! 🎯
  
  But Nov 2 < today (Nov 15) → This option is no longer available.
  LESSON: Early CNY planning is critical. System should have flagged
  this product in September 2025.
```

### 4.5 Worked Example 3: Overstocked Product (No Order Needed)

**Scenario:** Engine Oil Filter (EOF-022), currently overstocked

```
═══════════════════════════════════════════════════════════════════════════
  WORKED EXAMPLE: EOF-022 Engine Oil Filter — Overstock Scenario
═══════════════════════════════════════════════════════════════════════════

  Current Stock:    450 units
  Safety Stock:     40 units
  Max Stock:        400 units
  Daily Rate:       2.0 units/day
  
  Current Stock (450) > Max Stock (400) → OVERSTOCK ⚠️
  
  Days to draw down to max: (450 - 400) / 2.0 = 25 days
  Days to draw down to reorder: (450 - 344) / 2.0 = 53 days
    (Reorder Point = (2.0 × 152) + 40 = 344)
  
  RESULT: No order needed. Wait for stock to draw down.
  Next review: In 53 days (when stock approaches reorder point)
═══════════════════════════════════════════════════════════════════════════
```

---

## 5. Recommended Order Quantity Calculator

### 5.1 Full Implementation

```python
@dataclass
class QuantityBreakdown:
    """Detailed breakdown of how the recommended qty was calculated."""
    total_needed: int           # forecasted_demand + safety_stock
    total_supply: int           # current_stock + qty_on_order
    gap: int                    # total_needed - total_supply
    eoq: int                    # economic order quantity
    moq: int                    # supplier minimum
    max_stock: int              # warehouse capacity
    pre_constraint_qty: int     # qty before constraints applied
    recommended_qty: int        # final constrained qty
    status: str                 # 'order_needed', 'adequate', 'overstock', 'warehouse_full'
    constraints_applied: List[str]  # Which constraints were active
    reason: str                 # Human-readable explanation


def calculate_recommended_qty(
    forecasted_demand: int,
    safety_stock: int,
    current_stock: int,
    qty_on_order: int,
    eoq: int,
    moq: int,
    max_stock: int,
) -> dict:
    """
    Calculate the recommended order quantity with full constraint handling.
    
    Algorithm:
    ─────────
    1. Calculate total needed: Forecasted Demand + Safety Stock
    2. Calculate total supply: Current Stock + On Order
    3. Calculate gap: total_needed - total_supply
    4. If gap <= 0 → No order needed (adequate stock)
    5. If currently overstocked → No order, allow draw-down
    6. Start with qty = max(gap, EOQ) → economic batch optimization
    7. Apply MOQ constraint: qty = max(qty, MOQ)
    8. Apply warehouse cap: qty = min(qty, max_stock - current_stock)
    9. If final qty < MOQ and warehouse can't fit MOQ → warehouse_full
    10. Return final qty with full breakdown
    
    Args:
        forecasted_demand: Total forecasted demand for planning period
        safety_stock: Minimum safety stock level
        current_stock: Current available inventory
        qty_on_order: Units already on order (in pipeline)
        eoq: Economic Order Quantity (optimal batch size)
        moq: Supplier Minimum Order Quantity
        max_stock: Maximum warehouse capacity for this SKU
    
    Returns:
        Dictionary with recommended_qty, status, and full breakdown
    """
    constraints_applied = []
    
    # Step 1-3: Calculate demand gap
    total_needed = forecasted_demand + safety_stock
    total_supply = current_stock + qty_on_order
    gap = total_needed - total_supply
    
    # Step 4: Check if stock is adequate
    if gap <= 0:
        return {
            'recommended_qty': 0,
            'status': 'adequate',
            'reason': f'Stock sufficient. Supply ({total_supply}) covers need ({total_needed}).',
            'gap': gap,
            'eoq': eoq,
            'moq': moq,
            'max_stock': max_stock,
            'constraints_applied': [],
            'total_needed': total_needed,
            'total_supply': total_supply,
        }
    
    # Step 5: Check overstock
    if current_stock > max_stock:
        return {
            'recommended_qty': 0,
            'status': 'overstock',
            'reason': f'Currently overstocked ({current_stock} > max {max_stock}). Allow draw-down.',
            'gap': gap,
            'eoq': eoq,
            'moq': moq,
            'max_stock': max_stock,
            'constraints_applied': ['overstock_drawdown'],
            'total_needed': total_needed,
            'total_supply': total_supply,
        }
    
    # Step 6: Start with economic quantity
    qty = max(gap, eoq)
    if eoq > gap:
        constraints_applied.append(f'eoq_floor: EOQ ({eoq}) > gap ({gap}), using EOQ')
    
    # Step 7: Apply MOQ constraint
    if qty < moq:
        qty = moq
        constraints_applied.append(f'moq_floor: qty raised to MOQ ({moq})')
    
    pre_constraint_qty = qty
    
    # Step 8: Apply warehouse capacity constraint
    warehouse_capacity_remaining = max_stock - current_stock
    if qty > warehouse_capacity_remaining:
        qty = warehouse_capacity_remaining
        constraints_applied.append(
            f'warehouse_cap: qty reduced from {pre_constraint_qty} to {qty} '
            f'(max_stock {max_stock} - current {current_stock})'
        )
    
    # Step 9: Check if warehouse can't even fit MOQ
    if qty < moq and qty > 0:
        return {
            'recommended_qty': 0,
            'status': 'warehouse_full',
            'reason': f'Insufficient warehouse space for MOQ. '
                      f'Available space: {warehouse_capacity_remaining}, MOQ: {moq}.',
            'gap': gap,
            'eoq': eoq,
            'moq': moq,
            'max_stock': max_stock,
            'constraints_applied': constraints_applied + ['warehouse_below_moq'],
            'total_needed': total_needed,
            'total_supply': total_supply,
        }
    
    # Ensure qty is non-negative
    qty = max(0, qty)
    
    status = 'order_needed' if qty > 0 else 'adequate'
    reason = f'Order {qty} units. Gap: {gap}, constrained by: {constraints_applied or "none"}'
    
    return {
        'recommended_qty': qty,
        'status': status,
        'reason': reason,
        'gap': gap,
        'eoq': eoq,
        'moq': moq,
        'max_stock': max_stock,
        'constraints_applied': constraints_applied,
        'total_needed': total_needed,
        'total_supply': total_supply,
        'pre_constraint_qty': pre_constraint_qty,
    }
```

### 5.2 Quantity Calculation Examples

```python
# Example 1: Normal order (gap > EOQ > MOQ)
result1 = calculate_recommended_qty(
    forecasted_demand=580, safety_stock=50, current_stock=95,
    qty_on_order=0, eoq=200, moq=100, max_stock=500
)
# Gap = 630 - 95 = 535
# qty = max(535, 200) = 535
# qty = max(535, 100) = 535  (MOQ satisfied)
# qty = min(535, 405) = 405  (warehouse cap: 500-95=405)
# Result: 405, warehouse_cap constraint applied


# Example 2: Small gap, EOQ applies
result2 = calculate_recommended_qty(
    forecasted_demand=200, safety_stock=30, current_stock=180,
    qty_on_order=0, eoq=150, moq=50, max_stock=500
)
# Gap = 230 - 180 = 50
# qty = max(50, 150) = 150  (EOQ floor applies)
# qty = max(150, 50) = 150  (MOQ satisfied)
# qty = min(150, 320) = 150  (warehouse cap OK)
# Result: 150, eoq_floor constraint applied


# Example 3: Overstocked
result3 = calculate_recommended_qty(
    forecasted_demand=100, safety_stock=20, current_stock=450,
    qty_on_order=0, eoq=100, moq=50, max_stock=400
)
# Current stock (450) > max_stock (400) → OVERSTOCK
# Result: 0, status='overstock'


# Example 4: Warehouse full
result4 = calculate_recommended_qty(
    forecasted_demand=500, safety_stock=50, current_stock=490,
    qty_on_order=0, eoq=200, moq=100, max_stock=500
)
# Gap = 550 - 490 = 60
# qty = max(60, 200) = 200
# qty = max(200, 100) = 200
# qty = min(200, 10) = 10  (warehouse cap: 500-490=10)
# 10 < MOQ (100) → warehouse_full
# Result: 0, status='warehouse_full'
```

---

## 6. Seasonal Demand Prediction for BD Market

### 6.1 BD Season Definitions

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │  BANGLADESH MOTORCYCLE SEASONAL CALENDAR                            │
  │                                                                     │
  │  Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec       │
  │  ├──┼──┤├──┼──┼──┤├──┼──┼──┼──┤├──┤├──┼──┤                      │
  │  │WINTER│  │SUMMER │  │  MONSOON   │Pre│  │WINTER│               │
  │  │      │  │       │  │            │W  │  │      │               │
  │  │HIGH  │  │MODERATE│  │  LOW       │HI │  │HIGH  │               │
  │                                                                     │
  └─────────────────────────────────────────────────────────────────────┘
```

| Season | Period | Duration | Demand Level | Key Products | Reason |
|--------|--------|----------|-------------|-------------|--------|
| **Winter** | Nov 1 — Feb 28 | 4 months | 🔴 HIGH | Brake pads, chains, riding gear, engine oil | Cool dry weather = peak riding season |
| **Summer** | Mar 1 — May 31 | 3 months | 🟡 MODERATE | Electrical parts, tires, filters | Hot but rideable; AC/electrical issues |
| **Monsoon** | Jun 1 — Sep 30 | 4 months | 🟢 LOW | Rain gear, brake pads (wet brakes wear fast), chains | Heavy rain = reduced riding; but wet brakes increase pad wear |
| **Pre-Winter** | Oct 1 — Oct 31 | 1 month | 🟠 HIGH (spike) | ALL categories | Preparation rush before peak season |

### 6.2 Seasonal Weight Model

```python
# Default seasonal weights (multiplier on base demand)
SEASONAL_WEIGHTS = {
    'winter':     1.40,   # 40% above base demand
    'summer':     1.00,   # Base demand (reference)
    'monsoon':    0.65,   # 35% below base demand
    'pre_winter': 1.25,   # 25% above base (preparation spike)
}

# Category-specific seasonal adjustments
# Some categories have counter-cyclical demand
CATEGORY_SEASONAL_ADJUSTMENTS = {
    'brake_system': {
        'winter': 1.50,     # More braking in cool weather
        'summer': 1.00,
        'monsoon': 1.20,    # Wet brakes wear faster!
        'pre_winter': 1.30,
    },
    'chain_sprocket': {
        'winter': 1.60,     # Peak riding = peak chain wear
        'summer': 1.10,
        'monsoon': 0.80,    # Less riding, but rust issues
        'pre_winter': 1.40,
    },
    'riding_gear': {
        'winter': 2.00,     # Jackets, gloves in cold weather
        'summer': 0.50,     # Minimal gear in heat
        'monsoon': 1.50,    # Rain gear demand!
        'pre_winter': 1.80,
    },
    'engine': {
        'winter': 1.20,     # Engine oil, filters for winter prep
        'summer': 1.10,
        'monsoon': 0.60,    # Reduced riding
        'pre_winter': 1.30,
    },
    'electrical': {
        'winter': 0.80,     # Fewer electrical issues
        'summer': 1.50,     # Heat causes electrical failures
        'monsoon': 1.30,    # Water damage
        'pre_winter': 1.00,
    },
    'body': {
        'winter': 1.00,
        'summer': 0.90,
        'monsoon': 0.70,    # Less cosmetic work in rain
        'pre_winter': 1.10,
    },
}


def get_season_for_date(target_date: date) -> str:
    """Determine which season a date falls in."""
    month = target_date.month
    if month in (11, 12, 1, 2):
        return 'winter'
    elif month in (3, 4, 5):
        return 'summer'
    elif month in (6, 7, 8, 9):
        return 'monsoon'
    else:  # October
        return 'pre_winter'


def get_season_date_range(season: str, year: int) -> tuple:
    """Get start and end dates for a season."""
    ranges = {
        'winter': (date(year, 11, 1), date(year + 1, 2, 28)),
        'summer': (date(year, 3, 1), date(year, 5, 31)),
        'monsoon': (date(year, 6, 1), date(year, 9, 30)),
        'pre_winter': (date(year, 10, 1), date(year, 10, 31)),
    }
    return ranges[season]


def apply_seasonal_weight(
    base_demand: float,
    season: str,
    category: str,
) -> float:
    """
    Apply seasonal weighting to base demand.
    
    Uses category-specific weights if available, 
    otherwise falls back to general seasonal weights.
    """
    # Try category-specific first
    if category in CATEGORY_SEASONAL_ADJUSTMENTS:
        weight = CATEGORY_SEASONAL_ADJUSTMENTS[category].get(
            season, SEASONAL_WEIGHTS.get(season, 1.0)
        )
    else:
        weight = SEASONAL_WEIGHTS.get(season, 1.0)
    
    return base_demand * weight
```

### 6.3 How to Predict "Next Winter Best Products"

```python
def predict_season_best_products(
    products: List[dict],        # List of product records with forecast data
    target_season: str,          # 'winter', 'summer', 'monsoon', 'pre_winter'
    target_year: int,
    current_stock_by_sku: dict,  # {sku_code: current_stock}
    safety_stock_by_sku: dict,   # {sku_code: safety_stock}
    supplier_lead_times: dict,   # {supplier_id: mfg_days}
    today: Optional[date] = None,
    top_n: int = 20,
) -> List[dict]:
    """
    Predict the best products for an upcoming season.
    
    Algorithm:
    1. Filter products by season compatibility (season_type matches target or 'all_season')
    2. For each product, apply seasonal weight to forecasted demand
    3. Rank by: adjusted_demand (forecasted_demand × seasonal_weight)
    4. For top N, calculate order trigger date and recommended qty
    5. Sort by urgency (critical first), then by adjusted_demand descending
    
    Returns:
        List of product recommendations with full order trigger analysis
    """
    if today is None:
        today = date.today()
    
    season_start, season_end = get_season_date_range(target_season, target_year)
    
    # Get CNY window that affects this season's orders
    cny = get_cny_for_date(season_start)
    cny_start = cny['shutdown_start'] if cny else None
    cny_end = cny['shutdown_end'] if cny else None
    
    recommendations = []
    
    for product in products:
        # Step 1: Season compatibility filter
        if product.get('season_type') not in (target_season, 'all_season'):
            continue
        
        sku = product['sku_code']
        category = product.get('category', 'general')
        base_demand = product.get('forecasted_demand', 0)
        
        # Step 2: Apply seasonal weight
        adjusted_demand = apply_seasonal_weight(base_demand, target_season, category)
        
        if adjusted_demand <= 0:
            continue
        
        # Step 3: Get parameters
        current_stock = current_stock_by_sku.get(sku, 0)
        safety_stock = safety_stock_by_sku.get(sku, 0)
        supplier_id = product.get('default_supplier_id')
        mfg_days = supplier_lead_times.get(supplier_id, 90) if supplier_id else 90
        
        # Step 4: Calculate order trigger
        trigger_result = calculate_order_trigger(
            sku_code=sku,
            product_name=product.get('name', ''),
            current_stock=current_stock,
            safety_stock=safety_stock,
            max_stock=product.get('max_stock', 500),
            daily_consumption_rate=adjusted_demand / (season_end - season_start).days,
            mfg_days=mfg_days,
            shipment_mode=ShipmentMode.SEA,
            forecasted_demand=int(adjusted_demand),
            qty_on_order=product.get('qty_on_order', 0),
            eoq=product.get('eoq', 100),
            moq=product.get('moq', 50),
            today=today,
            cny_start=cny_start,
            cny_end=cny_end,
        )
        
        recommendations.append({
            'sku_code': sku,
            'name': product.get('name', ''),
            'category': category,
            'season_type': product.get('season_type'),
            'motorcycle_model': product.get('motorcycle_model'),
            'forecasted_demand': base_demand,
            'seasonal_weight': CATEGORY_SEASONAL_ADJUSTMENTS.get(
                category, SEASONAL_WEIGHTS
            ).get(target_season, 1.0),
            'adjusted_demand': round(adjusted_demand, 0),
            'recommended_qty': trigger_result.recommended_qty,
            'order_trigger_date': trigger_result.order_trigger_date,
            'expected_available_date': trigger_result.timeline.available_for_sale_date,
            'urgency': trigger_result.urgency.value,
            'cny_risk': trigger_result.cny_risk.has_risk,
            'cny_strategy': trigger_result.cny_risk.strategy.value,
            'days_until_trigger': trigger_result.days_until_trigger,
            'total_lead_time_days': trigger_result.total_lead_time_days,
        })
    
    # Step 5: Sort by urgency, then by adjusted demand
    urgency_order = {'critical': 0, 'high': 1, 'normal': 2, 'low': 3}
    recommendations.sort(
        key=lambda x: (urgency_order.get(x['urgency'], 99), -x['adjusted_demand'])
    )
    
    return recommendations[:top_n]
```

### 6.4 Session-Wise Forecast Output Format

```json
{
  "forecast_session_id": "fs_20250813_winter2026",
  "tenant_id": "t_bd_parts_001",
  "season": "winter_2026",
  "period": {
    "start": "2025-11-01",
    "end": "2026-02-28",
    "total_days": 120
  },
  "generated_at": "2025-08-13T10:30:00+06:00",
  "cny_window": {
    "year": 2026,
    "shutdown_start": "2026-02-07",
    "shutdown_end": "2026-02-28",
    "effective_start": "2026-02-02",
    "effective_end": "2026-03-03"
  },
  "products": [
    {
      "sku_code": "BP-001",
      "name": "Brake Pad Set - Front (CD70)",
      "category": "brake_system",
      "season_type": "winter",
      "motorcycle_model": "CD70",
      "forecasted_demand": 580,
      "seasonal_weight": 1.50,
      "adjusted_demand": 870,
      "recommended_qty": 405,
      "order_trigger_date": "2025-08-13",
      "expected_available_date": "2026-01-18",
      "urgency": "critical",
      "days_until_trigger": 0,
      "cny_risk": false,
      "cny_strategy": "none",
      "total_lead_time_days": 158,
      "unit_cost_bdt": 450,
      "total_cost_bdt": 182250
    },
    {
      "sku_code": "CS-015",
      "name": "Chain Sprocket Kit (Pulsar 150)",
      "category": "chain_sprocket",
      "season_type": "winter",
      "motorcycle_model": "Pulsar150",
      "forecasted_demand": 320,
      "seasonal_weight": 1.60,
      "adjusted_demand": 512,
      "recommended_qty": 280,
      "order_trigger_date": "2026-03-03",
      "expected_available_date": "2026-08-08",
      "urgency": "high",
      "days_until_trigger": 108,
      "cny_risk": true,
      "cny_strategy": "after_cny",
      "total_lead_time_days": 181,
      "unit_cost_bdt": 1200,
      "total_cost_bdt": 336000
    },
    {
      "sku_code": "RG-008",
      "name": "Riding Jacket - Winter (Universal)",
      "category": "riding_gear",
      "season_type": "winter",
      "motorcycle_model": "universal",
      "forecasted_demand": 150,
      "seasonal_weight": 2.00,
      "adjusted_demand": 300,
      "recommended_qty": 200,
      "order_trigger_date": "2025-06-15",
      "expected_available_date": "2025-11-20",
      "urgency": "critical",
      "days_until_trigger": -59,
      "cny_risk": false,
      "cny_strategy": "none",
      "total_lead_time_days": 158,
      "unit_cost_bdt": 2800,
      "total_cost_bdt": 560000
    }
  ],
  "summary": {
    "total_products": 47,
    "total_recommended_units": 8750,
    "total_recommended_spend_bdt": 8500000,
    "critical_urgency_count": 5,
    "high_urgency_count": 12,
    "normal_urgency_count": 20,
    "low_urgency_count": 10,
    "cny_risk_count": 3,
    "cny_strategy_before": 1,
    "cny_strategy_after": 2,
    "earliest_order_date": "2025-06-15",
    "latest_order_date": "2026-03-15",
    "warehouse_utilization_pct": 72.5,
    "products_by_category": {
      "brake_system": 15,
      "chain_sprocket": 8,
      "riding_gear": 6,
      "engine": 10,
      "electrical": 5,
      "body": 3
    }
  }
}
```

---

## 7. Dashboard Visualization — Order Timeline Gantt

### 7.1 Visual Specification

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  ORDER TIMELINE — WINTER 2026 PREPARATION                                  │
  │  Generated: Aug 13, 2025  │  Total Products: 47  │  Critical: 5           │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │                                                                             │
  │  Aug'25  Sep'25  Oct'25  Nov'25  Dec'25  Jan'26  Feb'26  Mar'26           │
  │  ├──┼──┤├──┼──┤├──┼──┤├──┼──┤├──┼──┤├──┼──┤├──┼──┤├──┼──┤           │
  │                                                                             │
  │  BP-001  ▼████████████████░░░░░░░░░░░░████████░░░░░░░░░░░✓             │
  │  CRITICAL│◄── Mfg (90d) ──►│◄── Ship ──►│◄Cst►│            │             │
  │          │                  │            │      │            │             │
  │  RG-008  ▼████████████████████████░░░░░░░░░░░░░░░░░░░✓                 │
  │  CRITICAL│◄──── Mfg (90d) ────►│◄──── Ship ────►│◄Cst►│                │
  │          │                     │                 │      │                  │
  │  CS-015       █████████████████████████████████████████████████████✓     │
  │  HIGH    │    │◄── Mfg (90d) ──►│  ████  │◄── Ship ──►│◄Cst►│         │
  │          │    │                  │ CNY!! │                │      │        │
  │          │    │                  │████████│                │      │        │
  │                                                                             │
  │  EOF-022 ──────────────────────────────────── (No order needed)           │
  │  LOW     │  Stock adequate until Feb 2026                                   │
  │                                                                             │
  │  LEGEND:                                                                    │
  │  ▼ = Order Trigger Date    ✓ = Available for Sale                          │
  │  █ = Manufacturing         ░ = Shipment (Sea)                              │
  │  ▒ = Customs Clearance     ████ = CNY Shutdown Period                      │
  │  🔴 Critical  🟡 High  🟢 Normal  ⚪ Low                                   │
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 UI Component Specification

| Component | Specification |
|-----------|--------------|
| **Chart type** | Horizontal Gantt chart (per product) |
| **X-axis** | Timeline (months), auto-zoom to relevant range |
| **Y-axis** | Product SKU + name, sorted by urgency |
| **Manufacturing bar** | Blue (#3B82F6), solid |
| **Shipment bar** | Green (#10B981), diagonal stripe pattern |
| **Customs bar** | Orange (#F59E0B), dotted pattern |
| **Order trigger marker** | Red inverted triangle (▼), date label |
| **Available date marker** | Green checkmark (✓), date label |
| **CNY shutdown zone** | Red (#EF4444) shaded vertical band, 15% opacity |
| **Today line** | Dashed vertical line, gray |
| **Filters** | Urgency, Season, Category, Shipment Mode, CNY Risk |
| **Interactivity** | Click product → drill into detailed timeline modal |
| **Tooltips** | Hover any segment → show stage name, duration, dates |
| **Responsive** | Min width: 768px, scrollable for mobile |

### 7.3 Detailed Timeline Modal (Per Product)

When a user clicks on a product in the Gantt chart, a modal shows:

```
  ┌───────────────────────────────────────────────────────────────┐
  │  BP-001 — Brake Pad Set - Front (CD70)                       │
  │  Urgency: CRITICAL 🔴    CNY Risk: None ✅                   │
  ├───────────────────────────────────────────────────────────────┤
  │                                                               │
  │  Order Trigger Date:    Aug 13, 2025  (OVERDUE by 145 days)  │
  │                                                               │
  │  ┌─────────────────────────────────────────────────────────┐ │
  │  │  Aug 13     Aug 15       Nov 13   Nov 15  Jan 6  Jan 16│ │
  │  │    │──2d──│◄─── 90d ────►│──2d──│◄52d►│◄10d►│       │ │
  │  │    ▼      Processing  Mfg  Pack  Ship  Customs       │ │
  │  │  Order   Ack          Done  Load  Arrive Clear       │ │
  │  └─────────────────────────────────────────────────────────┘ │
  │                                                               │
  │  Available for Sale:   Jan 18, 2026                          │
  │  Total Lead Time:      158 days                              │
  │  Recommended Qty:      405 units                             │
  │  Estimated Cost:       ৳182,250 (৳450/unit)                 │
  │                                                               │
  │  Stock Projection:                                            │
  │  ┌─────────────────────────────────────────────────────────┐ │
  │  │  95│▓▓▓▓▓▓▓                                              │ │
  │  │    │  ▓▓▓▓▓                                              │ │
  │  │    │    ▓▓▓▓                                              │ │
  │  │  50│───────┼────────────────── Safety Stock ──────────  │ │
  │  │    │      ⚠ Stockout zone                                │ │
  │  │    │            ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲       │ │
  │  │   0│                              ║                     │ │
  │  │    └──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──► │ │
  │  │      Aug  Sep  Oct  Nov  Dec  Jan  Feb  Mar  Apr  May │ │
  │  │                               ↑                        │ │
  │  │                        Stock arrives (Jan 18)          │ │
  │  └─────────────────────────────────────────────────────────┘ │
  │                                                               │
  │  [Place Order]  [Switch to Air]  [Export Timeline]           │
  └───────────────────────────────────────────────────────────────┘
```

---

## 8. Performance Requirements

### 8.1 Latency Targets

| Operation | Target Latency | Max Acceptable | Notes |
|-----------|---------------|----------------|-------|
| Order trigger calc (single SKU) | < 100ms | 1 second | Pure computation, no external calls |
| CNY risk check (single SKU) | < 10ms | 100ms | Simple date arithmetic |
| Timeline generation (single SKU) | < 5ms | 10ms | Date math only |
| Quantity calculation (single SKU) | < 5ms | 10ms | Simple arithmetic |
| **Full tenant recommendation list** | < 5 seconds | 30 seconds | All SKUs for a tenant (typically 100-500 SKUs) |
| Seasonal forecast batch | < 30 seconds | 2 minutes | Prophet forecast + trigger calc for all products |
| Dashboard Gantt render | < 2 seconds | 5 seconds | Client-side rendering |

### 8.2 Scalability Targets

| Metric | Target | Notes |
|--------|--------|-------|
| SKUs per tenant | 100–1,000 | Typical BD motorcycle parts catalog |
| Concurrent tenants | 50 | SaaS multi-tenant |
| Total daily calculations | 50,000 | 50 tenants × 1,000 SKUs × 1 daily run |
| Database queries per calc | ≤ 3 | Product + supplier + inventory lookup |

### 8.3 Optimization Strategies

```python
# Strategy 1: Batch calculation (avoid per-SKU DB queries)
async def batch_calculate_order_triggers(
    tenant_id: str,
    today: Optional[date] = None,
) -> List[OrderTriggerResult]:
    """
    Calculate order triggers for ALL products of a tenant in one batch.
    
    Optimization: Load all products, suppliers, and inventory in bulk
    (3 queries total) instead of per-SKU queries (3N queries).
    """
    if today is None:
        today = date.today()
    
    # Bulk load (3 queries instead of 3N)
    products = await db.products.filter(tenant_id=tenant_id).all()
    suppliers = await db.suppliers.filter(tenant_id=tenant_id).all()
    inventory = await db.inventory.filter(tenant_id=tenant_id).all()
    
    # Build lookup maps
    supplier_map = {s.id: s for s in suppliers}
    inventory_map = {i.product_id: i for i in inventory}
    
    # Get CNY window once
    cny = get_cny_for_date(today)
    
    results = []
    for product in products:
        inv = inventory_map.get(product.id)
        supplier = supplier_map.get(product.default_supplier_id)
        # ... calculate trigger for each product
        result = calculate_order_trigger(...)
        results.append(result)
    
    return results


# Strategy 2: Parallel calculation for large catalogs
import asyncio

async def parallel_batch_calculate(products: List[dict], max_concurrent: int = 20):
    """Calculate triggers in parallel with semaphore limiting."""
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def calc_with_limit(product):
        async with semaphore:
            return calculate_order_trigger(**product)
    
    tasks = [calc_with_limit(p) for p in products]
    return await asyncio.gather(*tasks)


# Strategy 3: Caching for repeated calculations
from functools import lru_cache
from datetime import date

@lru_cache(maxsize=1000)
def cached_cny_check(year: int) -> dict:
    """Cache CNY calendar lookups (changes once per year)."""
    return CNY_CALENDAR.get(year)
```

---

## 9. Complete System Pipeline — End-to-End

### 9.1 Pipeline Architecture

```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                         TRIMEDCAST ORDER TRIGGER PIPELINE                   │
  │                                                                             │
  │  ┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐             │
  │  │  Step 1  │───>│  Step 2  │───>│  Step 3   │───>│  Step 4  │             │
  │  │ Historical│   │ Prophet  │    │  Seasonal │    │  Order   │             │
  │  │  Sales   │    │Forecast  │    │ Adjustment│    │ Trigger  │             │
  │  │  Data    │    │ Engine   │    │  Weights  │    │ Engine   │             │
  │  └─────────┘    └──────────┘    └───────────┘    └──────────┘             │
  │       │              │                │                │                     │
  │       v              v                v                v                     │
  │  sales_history   prophet_         seasonal_       order_trigger_          │
  │  _clean.csv     forecast.json    demand.json     results.json            │
  │                                                             │             │
  │                                                             v             │
  │  ┌──────────┐    ┌───────────┐    ┌──────────┐                          │
  │  │  Step 7  │<───│  Step 6   │<───│  Step 5  │                          │
  │  │ Dashboard│    │  CNY      │    │  Qty     │                          │
  │  │  Render  │    │ Resolver  │    │ Calc     │                          │
  │  └──────────┘    └───────────┘    └──────────┘                          │
  │       │                                                             │
  │       v                                                             │
  │  ┌──────────────────────────────────────┐                          │
  │  │  OUTPUT: Recommended Order List       │                          │
  │  │  • What to order (filtered SKU list) │                          │
  │  │  • What qty (constrained quantities) │                          │
  │  │  • When to order (trigger dates)     │                          │
  │  │  • Full timeline per product         │                          │
  │  │  • CNY risk flags & strategies       │                          │
  │  └──────────────────────────────────────┘                          │
  └─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 End-to-End Implementation

```python
from datetime import date, timedelta
from typing import List, Optional, Dict
import json


class OrderTriggerPipeline:
    """
    Complete pipeline from raw data to recommended order list.
    
    This is the orchestrator that ties together:
    - Prophet forecasting (Step 2)
    - Seasonal adjustment (Step 3)
    - Order trigger calculation (Step 4)
    - Quantity calculation (Step 5)
    - CNY resolution (Step 6)
    - Dashboard output (Step 7)
    """
    
    def __init__(self, tenant_id: str, db_session=None):
        self.tenant_id = tenant_id
        self.db = db_session
    
    async def run_full_pipeline(
        self,
        target_season: str,
        target_year: int,
        today: Optional[date] = None,
        top_n: int = 50,
        filters: Optional[Dict] = None,
    ) -> dict:
        """
        Run the complete order trigger pipeline.
        
        This is the MAIN ENTRY POINT for the system.
        Called by: API endpoint, scheduled job, or dashboard refresh.
        
        Returns the complete recommended order list with all metadata.
        """
        if today is None:
            today = date.today()
        
        # ── Step 1: Load historical data ──
        products = await self._load_products(filters)
        inventory = await self._load_inventory()
        suppliers = await self._load_suppliers()
        
        # ── Step 2: Run Prophet forecasts ──
        forecasts = await self._run_prophet_forecasts(products, target_season, target_year)
        
        # ── Step 3: Apply seasonal adjustments ──
        seasonal_adjusted = self._apply_seasonal_weights(
            products, forecasts, target_season
        )
        
        # ── Step 4-6: Calculate order triggers (includes CNY + qty) ──
        cny = get_cny_for_date(today)
        
        recommendations = []
        for product_data in seasonal_adjusted:
            result = calculate_order_trigger(
                sku_code=product_data['sku_code'],
                product_name=product_data['name'],
                current_stock=inventory.get(product_data['sku_code'], {}).get('qty', 0),
                safety_stock=product_data.get('safety_stock', 0),
                max_stock=product_data.get('max_stock', 500),
                daily_consumption_rate=product_data['adjusted_daily_rate'],
                mfg_days=suppliers.get(
                    product_data.get('default_supplier_id'), {}
                ).get('lead_time_days_manufacturing', 90),
                shipment_mode=ShipmentMode.SEA,
                forecasted_demand=int(product_data['adjusted_demand']),
                qty_on_order=product_data.get('qty_on_order', 0),
                eoq=product_data.get('eoq', 100),
                moq=product_data.get('moq', 50),
                today=today,
                cny_start=cny['shutdown_start'] if cny else None,
                cny_end=cny['shutdown_end'] if cny else None,
            )
            
            recommendations.append(self._format_recommendation(result, product_data))
        
        # ── Step 7: Sort, filter, and generate output ──
        recommendations = self._sort_and_filter(recommendations, filters)
        
        return self._generate_output(
            recommendations=recommendations[:top_n],
            target_season=target_season,
            target_year=target_year,
            today=today,
            cny=cny,
            total_products=len(products),
        )
    
    def _format_recommendation(self, result: OrderTriggerResult, product_data: dict) -> dict:
        """Format a single recommendation for output."""
        return {
            'sku_code': result.sku_code,
            'name': result.product_name,
            'category': product_data.get('category'),
            'season_type': product_data.get('season_type'),
            'motorcycle_model': product_data.get('motorcycle_model'),
            'forecasted_demand': product_data.get('forecasted_demand', 0),
            'seasonal_weight': product_data.get('applied_weight', 1.0),
            'adjusted_demand': round(product_data.get('adjusted_demand', 0)),
            'recommended_qty': result.recommended_qty,
            'order_trigger_date': result.order_trigger_date.isoformat(),
            'expected_available_date': result.timeline.available_for_sale_date.isoformat(),
            'urgency': result.urgency.value,
            'days_until_trigger': result.days_until_trigger,
            'cny_risk': result.cny_risk.has_risk,
            'cny_strategy': result.cny_risk.strategy.value,
            'cny_explanation': result.cny_risk.explanation,
            'total_lead_time_days': result.total_lead_time_days,
            'unit_cost_bdt': product_data.get('unit_cost_bdt', 0),
            'total_cost_bdt': result.recommended_qty * product_data.get('unit_cost_bdt', 0),
            'timeline': {
                'order_trigger': result.timeline.order_trigger_date.isoformat(),
                'mfg_start': result.timeline.mfg_start_date.isoformat(),
                'mfg_complete': result.timeline.mfg_complete_date.isoformat(),
                'ship_departure': result.timeline.ship_departure_date.isoformat(),
                'arrival': result.timeline.arrival_date.isoformat(),
                'customs_clearance': result.timeline.customs_clearance_date.isoformat(),
                'available_for_sale': result.timeline.available_for_sale_date.isoformat(),
            },
        }
    
    def _generate_output(self, recommendations, target_season, target_year, today, cny, total_products):
        """Generate the final output JSON."""
        season_start, season_end = get_season_date_range(target_season, target_year)
        
        total_spend = sum(r['total_cost_bdt'] for r in recommendations)
        urgency_counts = {}
        for r in recommendations:
            u = r['urgency']
            urgency_counts[u] = urgency_counts.get(u, 0) + 1
        
        return {
            'forecast_session_id': f"fs_{today.strftime('%Y%m%d')}_{target_season}{target_year}",
            'tenant_id': self.tenant_id,
            'season': f"{target_season}_{target_year}",
            'period': {
                'start': season_start.isoformat(),
                'end': season_end.isoformat(),
                'total_days': (season_end - season_start).days,
            },
            'generated_at': today.isoformat(),
            'cny_window': {
                'year': cny['date'].year if cny else None,
                'shutdown_start': cny['shutdown_start'].isoformat() if cny else None,
                'shutdown_end': cny['shutdown_end'].isoformat() if cny else None,
            } if cny else None,
            'products': recommendations,
            'summary': {
                'total_products': len(recommendations),
                'total_catalog_products': total_products,
                'total_recommended_units': sum(r['recommended_qty'] for r in recommendations),
                'total_recommended_spend_bdt': total_spend,
                'critical_urgency_count': urgency_counts.get('critical', 0),
                'high_urgency_count': urgency_counts.get('high', 0),
                'normal_urgency_count': urgency_counts.get('normal', 0),
                'low_urgency_count': urgency_counts.get('low', 0),
                'cny_risk_count': sum(1 for r in recommendations if r['cny_risk']),
                'earliest_order_date': min(
                    (r['order_trigger_date'] for r in recommendations if r['recommended_qty'] > 0),
                    default=None
                ),
                'latest_order_date': max(
                    (r['order_trigger_date'] for r in recommendations if r['recommended_qty'] > 0),
                    default=None
                ),
            },
        }
    
    def _sort_and_filter(self, recommendations: List[dict], filters: Optional[Dict]) -> List[dict]:
        """Sort by urgency and apply filters."""
        urgency_order = {'critical': 0, 'high': 1, 'normal': 2, 'low': 3}
        
        # Apply filters
        if filters:
            if filters.get('urgency'):
                recommendations = [r for r in recommendations if r['urgency'] in filters['urgency']]
            if filters.get('category'):
                recommendations = [r for r in recommendations if r.get('category') in filters['category']]
            if filters.get('cny_risk_only'):
                recommendations = [r for r in recommendations if r['cny_risk']]
            if filters.get('motorcycle_model'):
                recommendations = [r for r in recommendations if r.get('motorcycle_model') in filters['motorcycle_model']]
        
        # Sort: urgency first, then by adjusted demand descending
        recommendations.sort(
            key=lambda x: (urgency_order.get(x['urgency'], 99), -x.get('adjusted_demand', 0))
        )
        
        return recommendations
    
    # Stub methods for data loading (implemented with actual DB)
    async def _load_products(self, filters): ...
    async def _load_inventory(self): ...
    async def _load_suppliers(self): ...
    async def _run_prophet_forecasts(self, products, season, year): ...
    
    def _apply_seasonal_weights(self, products, forecasts, season):
        """Apply seasonal weights to forecast results."""
        adjusted = []
        for product, forecast in zip(products, forecasts):
            base_demand = forecast.get('yhat', 0)
            category = product.get('category', 'general')
            weight = CATEGORY_SEASONAL_ADJUSTMENTS.get(
                category, SEASONAL_WEIGHTS
            ).get(season, 1.0) if category in CATEGORY_SEASONAL_ADJUSTMENTS else SEASONAL_WEIGHTS.get(season, 1.0)
            
            adjusted_demand = base_demand * weight
            season_start, season_end = get_season_date_range(season, product.get('year', 2026))
            season_days = (season_end - season_start).days
            
            adjusted.append({
                **product,
                'forecasted_demand': int(base_demand),
                'adjusted_demand': adjusted_demand,
                'adjusted_daily_rate': adjusted_demand / season_days,
                'applied_weight': weight,
            })
        
        return adjusted
```

---

## 10. Edge Cases & Failure Modes

### 10.1 Edge Cases Handled

| Edge Case | How System Handles It |
|-----------|----------------------|
| **Zero consumption rate** | If daily_consumption_rate = 0, no order trigger is generated (no demand). System logs a warning if stock is below safety stock with zero consumption. |
| **Negative gap (overstock)** | Recommended qty = 0, status = 'overstock'. System calculates draw-down timeline. |
| **Warehouse can't fit MOQ** | Recommended qty = 0, status = 'warehouse_full'. Alerts user to clear space or split delivery. |
| **Multiple CNY windows** | System checks both CNY of current year and next year. Uses whichever is relevant. |
| **Order trigger date in the past** | Urgency = CRITICAL, days_until_trigger is negative. System highlights as OVERDUE. |
| **Safety stock = 0** | Valid but dangerous. System flags with a warning. Reorder point = daily_consumption × lead_time. |
| **Supplier lead time = 0** | Valid for local/BD suppliers. Only shipment + customs time applies. |
| **Daily consumption > current stock** | Immediate stockout. Urgency = CRITICAL, trigger date = today. |
| **CNY spans across year boundary** | e.g., CNY 2028 starts Jan 16. System handles cross-year dates correctly. |
| **Air shipment for heavy items** | System warns if air is recommended for items > 50kg. Not cost-effective. |

### 10.2 Failure Modes & Mitigations

```python
def safe_calculate_order_trigger(**kwargs) -> OrderTriggerResult:
    """
    Wrapper with comprehensive error handling and fallbacks.
    """
    try:
        # Validate inputs
        if kwargs.get('daily_consumption_rate', 0) < 0:
            raise ValueError("daily_consumption_rate cannot be negative")
        
        if kwargs.get('current_stock', 0) < 0:
            raise ValueError("current_stock cannot be negative")
        
        if kwargs.get('safety_stock', 0) < 0:
            raise ValueError("safety_stock cannot be negative")
        
        # Handle zero consumption
        if kwargs.get('daily_consumption_rate', 0) == 0:
            return OrderTriggerResult(
                sku_code=kwargs['sku_code'],
                product_name=kwargs['product_name'],
                needs_order=kwargs.get('current_stock', 0) < kwargs.get('safety_stock', 0),
                reorder_point=kwargs.get('safety_stock', 0),
                current_stock=kwargs.get('current_stock', 0),
                stock_status='no_demand',
                recommended_qty=0,
                recommended_qty_breakdown={'status': 'no_demand', 'reason': 'Zero consumption rate'},
                order_trigger_date=kwargs.get('today', date.today()),
                timeline=None,
                urgency=Urgency.LOW,
                days_until_trigger=float('inf'),
                cny_risk=CNYRiskAssessment(
                    has_risk=False, overlap_days=0,
                    effective_cny_start=date.today(), cny_shutdown_start=date.today(),
                    cny_shutdown_end=date.today(), strategy=CNYStrategy.NONE,
                    additional_delay_days=0, latest_safe_order_date=None,
                    post_cny_order_date=None, explanation='No consumption, no CNY risk.',
                ),
                recommended_shipment_mode=ShipmentMode.SEA,
                calculated_at=kwargs.get('today', date.today()),
                total_lead_time_days=0,
            )
        
        return calculate_order_trigger(**kwargs)
    
    except Exception as e:
        # Log error and return safe default
        logger.error(f"Order trigger calculation failed for {kwargs.get('sku_code')}: {e}")
        return _get_fallback_result(kwargs, error=str(e))
```

---

## 11. Database Schema Integration

### 11.1 Tables Used by Order Trigger Engine

```sql
-- Core tables the Order Trigger Engine reads from

-- Products (source of truth for SKU attributes)
SELECT 
    p.sku_code,
    p.name,
    p.category,
    p.season_type,
    p.motorcycle_model,
    p.safety_stock,
    p.max_stock,
    p.eoq,
    p.moq,
    p.default_supplier_id,
    p.seasonal_weight_winter,
    p.seasonal_weight_summer,
    p.seasonal_weight_monsoon,
    p.unit_cost_bdt
FROM products p
WHERE p.tenant_id = :tenant_id
  AND p.is_active = true;

-- Inventory (current stock levels)
SELECT
    i.product_id,
    i.qty_on_hand,
    i.qty_reserved,
    i.qty_available  -- qty_on_hand - qty_reserved
FROM inventory i
WHERE i.tenant_id = :tenant_id;

-- Suppliers (lead time data)
SELECT
    s.id,
    s.name,
    s.lead_time_days_manufacturing,
    s.country  -- 'CN' for Chinese suppliers
FROM suppliers s
WHERE s.tenant_id = :tenant_id
  AND s.is_active = true;

-- Purchase Orders (qty on order)
SELECT
    po.product_id,
    SUM(po.qty) as qty_on_order,
    MIN(po.expected_date) as earliest_arrival
FROM purchase_order_items poi
JOIN purchase_orders po ON poi.order_id = po.id
WHERE po.tenant_id = :tenant_id
  AND po.status IN ('confirmed', 'in_production', 'shipped')
GROUP BY po.product_id;

-- Sales History (for consumption rate calculation)
SELECT
    sh.product_id,
    AVG(sh.daily_qty) as avg_daily_consumption
FROM sales_history_daily sh
WHERE sh.tenant_id = :tenant_id
  AND sh.date >= :lookback_start  -- typically 90 days back
  AND sh.date <= :lookback_end
GROUP BY sh.product_id;

-- Forecast Results (Prophet output)
SELECT
    f.product_id,
    f.season,
    f.year,
    f.yhat,          -- point forecast
    f.yhat_lower,    -- lower bound
    f.yhat_upper     -- upper bound
FROM forecast_results f
WHERE f.tenant_id = :tenant_id
  AND f.season = :target_season
  AND f.year = :target_year;
```

### 11.2 Output Table (Order Recommendations)

```sql
-- Stores calculated order recommendations (caching + audit trail)
CREATE TABLE order_recommendations (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    product_id      UUID NOT NULL REFERENCES products(id),
    
    -- Q1: What to order
    needs_order     BOOLEAN NOT NULL,
    stock_status    VARCHAR(20) NOT NULL,  -- 'below_reorder', 'at_safety', 'adequate', 'overstock'
    reorder_point   DECIMAL(10,2),
    
    -- Q2: What qty
    recommended_qty INTEGER NOT NULL DEFAULT 0,
    qty_status      VARCHAR(20),           -- 'order_needed', 'adequate', 'overstock', 'warehouse_full'
    gap             INTEGER,
    constraints     JSONB,                 -- List of applied constraints
    
    -- Q3: When to order
    order_trigger_date  DATE,
    available_date      DATE,
    total_lead_time_days INTEGER,
    urgency             VARCHAR(10),       -- 'critical', 'high', 'normal', 'low'
    days_until_trigger  INTEGER,
    
    -- Timeline
    timeline            JSONB,             -- Full OrderTimeline as JSON
    
    -- CNY
    cny_risk            BOOLEAN DEFAULT FALSE,
    cny_overlap_days    INTEGER DEFAULT 0,
    cny_strategy        VARCHAR(20),
    cny_additional_delay INTEGER DEFAULT 0,
    
    -- Metadata
    forecast_session_id VARCHAR(50),
    shipment_mode       VARCHAR(10) DEFAULT 'sea',
    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(tenant_id, product_id, forecast_session_id)
);

-- Index for common queries
CREATE INDEX idx_order_recs_urgency ON order_recommendations(tenant_id, urgency);
CREATE INDEX idx_order_recs_cny ON order_recommendations(tenant_id, cny_risk) WHERE cny_risk = true;
CREATE INDEX idx_order_recs_trigger ON order_recommendations(tenant_id, order_trigger_date);
```

---

## 12. API Surface for Order Trigger Engine

### 12.1 REST API Endpoints

```yaml
# Get recommended order list for a season
GET /api/v1/tenants/{tenant_id}/order-recommendations
  Query Parameters:
    season:         string   (winter, summer, monsoon, pre_winter)
    year:           integer  (2026)
    urgency:        string[] (filter: critical, high, normal, low)
    category:       string[] (filter: brake_system, chain_sprocket, ...)
    cny_risk_only:  boolean  (default: false)
    motorcycle:     string[] (filter: CD70, Pulsar150, ...)
    sort_by:        string   (urgency, trigger_date, demand, cost)
    limit:          integer  (default: 50, max: 500)
  Response: JSON (see Section 6.4 format)

# Get detailed timeline for a single product
GET /api/v1/tenants/{tenant_id}/products/{product_id}/order-timeline
  Query Parameters:
    season:         string
    year:           integer
    shipment_mode:  string   (sea, air)
  Response:
    {
      "sku_code": "BP-001",
      "timeline": { ... },
      "stock_projection": [ ... ],
      "cny_analysis": { ... }
    }

# Run/re-run the full pipeline
POST /api/v1/tenants/{tenant_id}/order-recommendations/calculate
  Body:
    {
      "season": "winter",
      "year": 2026,
      "force_refresh": false  // true to re-run Prophet forecasts
    }
  Response:
    {
      "session_id": "fs_20250813_winter2026",
      "status": "completed",
      "duration_ms": 4500,
      "products_analyzed": 47,
      "products_needing_order": 23
    }

# Get CNY calendar
GET /api/v1/cny-calendar
  Query Parameters:
    year: integer (optional, defaults to current + next 2 years)
  Response:
    {
      "years": [
        {
          "year": 2026,
          "lunar_new_year": "2026-02-17",
          "shutdown_start": "2026-02-07",
          "shutdown_end": "2026-02-28",
          "effective_start": "2026-02-02",
          "effective_end": "2026-03-03"
        }
      ]
    }

# Acknowledge/place an order (mark recommendation as acted upon)
PATCH /api/v1/tenants/{tenant_id}/order-recommendations/{rec_id}/acknowledge
  Body:
    {
      "action": "ordered",        // ordered, skipped, deferred, modified
      "actual_qty": 400,          // if different from recommended
      "actual_order_date": "2025-08-14",
      "shipment_mode": "sea",
      "notes": "Ordered 400 instead of 405 due to budget"
    }
```

### 12.2 Webhook Events

```yaml
# Triggered when a product's order becomes critical
order_trigger.critical:
  payload:
    tenant_id: UUID
    product_id: UUID
    sku_code: string
    days_overdue: integer
    recommended_qty: integer
    stockout_date: date

# Triggered when CNY risk is detected for any product
cny_risk.detected:
  payload:
    tenant_id: UUID
    product_ids: UUID[]
    cny_year: integer
    affected_count: integer
    strategy_breakdown: { before_cny: N, after_cny: N }

# Triggered when pipeline completes
pipeline.completed:
  payload:
    tenant_id: UUID
    session_id: string
    duration_ms: integer
    products_analyzed: integer
    products_needing_order: integer
    critical_count: integer
    cny_risk_count: integer
```

---

## Appendix A: Quick Reference Card

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                   TRIMEDCAST — ORDER TRIGGER QUICK REFERENCE                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Q1: WHAT to order?                                                          ║
║  ─────────────────                                                           ║
║  Condition: Current Stock < Reorder Point                                    ║
║  Reorder Point = (Daily Consumption × Lead Time) + Safety Stock              ║
║                                                                              ║
║  Q2: WHAT QTY to order?                                                      ║
║  ─────────────────────                                                       ║
║  Qty = max(EOQ, (Forecast + Safety Stock) - Current - On Order)             ║
║  Constrain: MOQ ≤ Qty ≤ (Max Stock - Current Stock)                         ║
║                                                                              ║
║  Q3: WHEN to order?                                                          ║
║  ─────────────────                                                           ║
║  Trigger Date = Safety Stock Hit Date - Total Lead Time - Buffer             ║
║  Where: Safety Stock Hit Date = Today + (Current - Safety) / Daily Rate      ║
║                                                                              ║
║  LEAD TIMES:                                                                 ║
║  Sea:  90 + 52 + 10 = 152 days (default)                                    ║
║  Air:  90 +  8 +  3 = 101 days (urgent)                                     ║
║                                                                              ║
║  URGENCY:                                                                    ║
║  Overdue / ≤30 days: CRITICAL  │  ≤90 days: HIGH                            ║
║  ≤180 days: NORMAL             │  >180 days: LOW                             ║
║                                                                              ║
║  CNY: Check if mfg period overlaps shutdown → Strategy A/B/C/D              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **Reorder Point** | Stock level at which a new order should be placed to avoid stockout |
| **Safety Stock** | Minimum inventory buffer to protect against demand variability and lead time uncertainty |
| **EOQ** | Economic Order Quantity — the optimal batch size that minimizes total ordering + holding cost |
| **MOQ** | Minimum Order Quantity — the smallest order a supplier will accept |
| **Lead Time** | Total time from placing an order to goods being available for sale |
| **Order Trigger Date** | The specific date on which an order should be placed |
| **CNY** | Chinese New Year — annual factory shutdown period (~2-4 weeks) |
| **FOB** | Free On Board — supplier's port in China where goods are handed to shipping |
| **BDT** | Bangladeshi Taka — local currency |
| **Prophet** | Facebook/Meta's time-series forecasting library used for demand prediction |
| **Gantt Chart** | Horizontal bar chart showing project/order timeline with milestones |
| **SKU** | Stock Keeping Unit — unique product identifier |
| **Tenant** | A single business/customer in the multi-tenant SaaS system |

---

*End of Document — Order Trigger & Lead Time Logic v1.0*  
*This document is the core intellectual property of the TrimedCast system.*  
*All algorithms, formulas, and implementations are original and proprietary.*
