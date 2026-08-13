### Project Requirements Document (PRD): Integrated Seasonal Demand & Inventory Forecasting System

#### 1\. Project Purpose and Strategic Objectives

The mission of this system is to provide a centralized Sales and Operations Planning (S\&OP) platform that establishes a "single set of numbers" for the enterprise. By synchronizing commercial demand signals with warehouse replenishment cycles, the system mitigates the dual risks of excessive capital lockup and service level degradation.**Strategic Objectives:**

* **Mitigate Human Bias through Data-Driven Procurement Logic:**  Transition from experience-based heuristic guesswork to reproducible mathematical forecasting.  
* **Optimize Working Capital and Cash Flow:**  Identify and liquidate overstock while aligning new procurement cycles with actual consumption velocity.  
* **Minimize Stockout-Induced Revenue Leakage:**  Protect brand trust by ensuring high-availability for mission-critical motorcycle components, particularly in commercial and fleet segments.  
* **Operational Scalability:**  Automate complex multi-SKU calculations to reduce purchasing review times from several hours to a 30-second automated cycle.  
* **Functional Alignment:**  Force a unified roadmap between Marketing (demand drivers), Sales (field intelligence), and Operations (capacity and lead time constraints).

#### 2\. User Personas and Access Control

The system enforces functional silos at the server level via a strict Role-Based Access Control (RBAC) model.| Persona | Role | Access Level (CRUD) | Primary Responsibilities || \------ | \------ | \------ | \------ || **Warehouse Manager** | Admin | **Create, Read, Update, Delete** | Full administrative control: inventory catalog, supplier contracts, team permissions, and purchase order fulfillment. || **Sales Manager** | User | **Create (Orders), Read, Update (Orders)** | View real-time stock levels and manage sales orders. Restricted from modifying unit costs, supplier data, or administrative settings. |  
**Global Data Restrictions:**  Security protocols must be enforced at the server level (API/Database) to ensure that Sales Managers cannot view sensitive margin data or modify replenishment parameters, regardless of front-end UI availability.

#### 3\. Core System Inputs and Data Integration

The forecasting engine requires four mandatory data streams to execute a valid S\&OP cycle:

* **Product-Wise Floor Stock:**  Real-time synchronization of on-hand units across all locations to establish the "Starting Position" baseline.  
* **3-Year Historical Normalized Data:**  Longitudinal sales data must be uploaded and undergo  **Harmonization** . The system must cleanse sales spikes caused by one-time marketing events (utilizing a  **Promo Index** ) to prevent the forecast from artificially inflating future demand based on non-recurring spikes.  
* **Seasonal Session Selection (Toggle Logic):**  A manual parameter switch for "Winter" vs. "Summer" sessions.  
* *Logic:*  When "Winter" is toggled, the system applies pre-configured weights (e.g., \+25% for mud tires/heavy-duty chains and \-30% for street performance tires) to reflect motorcycle usage in varied road conditions.  
* **Delivery Time Selection (Lead Time Logic):**  A logic-gate for transport modes.  
* *Logic:*  Selection of "Ship" defaults to a  $LT$  (Lead Time) of 60–90 days. "Air" defaults to 7–14 days. This variable is used in the Safety Stock calculation, where "Ship" selections exponentially increase required buffer stock due to longer exposure periods.

#### 4\. The 4-Step S\&OP Lifecycle

The system facilitates a recurring strategic operating rhythm. Functional traceability is maintained by mapping inputs to specific stages:

1. **Validation:**  Pre-executive technical review. The system tests the Demand Plan (derived from Input 2 & 3\) against operational feasibility. The system checks against Input 4 (Supplier Lead Times) and internal labor/machine capacity to ensure the plan is executable.  
2. **Approval:**  Executive-level decision gate. Stakeholders review the "Consensus Forecast." Once approved, this becomes a binding "Single Set of Numbers," locking the procurement budget for the cycle.  
3. **Operationalisation:**  Translation of the approved plan into functional execution. The system pushes the plan into the "Recommended Order List" and aligns KPIs for the shop floor and procurement teams.  
4. **Governance:**  Continuous "Plan-vs-Actual" (PvA) monitoring. The system tracks deviations to drive accountability and refine the smoothing factors (Alpha) for the next cycle.

#### 5\. Inventory Categorization Logic

The system manages inventory through a dual-tier strategy mandated by a  **Model-to-Part Relationship** . To prevent ordering incorrect parts for similar fleets, every part must be mapped to a specific Motorcycle Model ID.

* **Fast-Moving Wear Parts:**  High-velocity items (e.g., brake pads, filters, chains) managed via automated replenishment based on sales volume and road-condition intensity.  
* **Warranty-Critical Components:**  Low-frequency, high-impact items (e.g., electrical switches, regulators, EFI sensors). These are stocked at strategic levels to maintain brand reputation and fulfill warranty SLAs regardless of low turnover.

#### 6\. Mathematical Forecasting and Operational Models

The system removes human judgment error by automating the following models:

* **Linear Regression:**  Predicts demand using independent price and promo variables.  
* $Demand (F) \= \\beta\_0 \+ (\\beta\_1 \\times Price) \+ (\\beta\_2 \\times Promo)$  
* $\\beta\_0$  (Intercept),  $\\beta\_1$  (Price Coefficient),  $\\beta\_2$  (Promo Coefficient).  
* **Economic Order Quantity (EOQ):**  Minimizes total cost of ownership.  
* $EOQ \= \\sqrt{\\frac{2KD}{h}}$  
* $K$ : Ordering cost per order;  $D$ : Demand rate;  $h$ : Holding cost.  
* **Comprehensive Safety Stock Formula:**  
* $Safety Stock \= \\frac{EOQ}{R} \+ (MAE \\times \\mu t \\times \\sigma LT)$  
* **Rational:**  The  $EOQ$  is divided by the Review Period ( $R$ ) to derive "per day demand from EOQ," ensuring safety stock covers the interim period between reviews.  
* $MAE$ : Mean Absolute Error of forecast;  $\\mu t$ : Mean Lead Time;  $\\sigma LT$ : Standard Deviation of Lead Time.  
* **Exponential Smoothing:**  Employs an "Alpha" smoothing factor. High Alpha values weight recent actuals heavily (used for trending models); low Alpha values favor historical stability (used for mature/cyclic models).

#### 7\. Sales and Operations Execution (S\&OE) Layer

The S\&OE layer functions as the "Control Tower" for the short-term horizon (0–3 months).

* **Disruption Response:**  Operates on a weekly cadence to handle supplier delays or demand spikes.  
* **Strategic Alignment:**  Ensures day-to-day scheduling and logistics remain within the guardrails of the broader S\&OP roadmap, translating strategic intent into operational reality.

#### 8\. System Output: Recommended Order List

The primary system output is a filterable "Recommended Order List."

* **Performance Requirement (NFR):**  The system must generate recommendations following data upload/calculation in under 30 seconds per product line.  
* **Filtering Logic:**  The list  **must**  be filterable by "Motorcycle Model" to prevent cross-model part procurement errors.  
* **Output Fields:**  Product Name, Part Number, Forecasted Demand, Reorder Point, and Recommended Quantity (calculated to reduce overstock gradually while preventing immediate stockouts).

#### 9\. Technical Architecture and Database Schema

The system requires a relational structure with specific data types and automated formula fields:| Table | Field Name | Data Type | Logic / Description || \------ | \------ | \------ | \------ || **Users** | Role | String (Single Select) | Warehouse Manager vs. Sales Manager. || **Products** | Model ID | Linked Record | Reference to specific Motorcycle Model table. || **Products** | Unit Cost | Currency | Restricted view; used in EOQ. || **Products** | Units Available | **Formula** | (Total\_Purchases \- Total\_Sales) || **Products** | Lead Time (LT) | Integer (Days) | Driven by "Ship" vs. "Air" toggle logic. || **Orders** | Status | String (Single Select) | Draft, Sent, Received (Status tracking). || **Suppliers** | Performance | Percent | Historical reliability used for  $\\sigma LT$  in Safety Stock. || **Forecasts** | Promo Index | Decimal | Normalization factor to cleanse demand spikes. |  
All system logic must remain transparent and auditable, with no human judgment overrides allowed without an accompanying "Governance Note" logged in the audit trail.  
