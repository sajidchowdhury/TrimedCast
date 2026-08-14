### UI/UX Specification: Integrated Seasonal Demand & Inventory Forecasting System

#### 1\. Design Philosophy & Cross-Functional Strategy

The primary design objective is to institutionalize  **Consensus Forecasting** —shifting the organizational culture from siloed data sets to a single, authoritative demand signal. The UI is architected to minimize cognitive load while maximizing statistical transparency, ensuring that qualitative "Expert Intelligence" from the field is grounded in rigorous quantitative models.

##### Stakeholder Functional Alignment

Stakeholder,Core Needs & Functional Alignment,UI Feature Mapping  
Sales,"Pipeline visibility, account-level volatility, and opportunity/risk tracking.","Sales Order management, ""Ask AI"" scenario previews."  
Marketing,"Promotional intensity, NPI (New Product Introduction), and brand activity.","Promo Index slider, Campaign date picker, Regression  $\\beta\_2$  input."  
Operations,"Production constraints, logistics execution, and stockout mitigation.","Safety Stock (SS) controls, Lead Time toggles, S\&OE Control Tower."  
Finance,"Budget alignment, cash flow impact assessment, and margin protection.","Read-Only Financial Coherence view, Cost-to-Serve metrics."  
Leadership,Strategic oversight and high-level capital allocation approval.,"S\&OP Progress Bar (Approval state), Executive Dashboard."

#### 2\. Global Navigation & Dashboard Information Architecture

The architecture utilizes a Softr-based front-end with an Airtable relational backbone. Navigation is status-aware, particularly regarding the "Two-Step" procurement process.

* **Dashboard (Executive View)**  
* *Warehouse Manager & Sales Manager:*  Read-Only (Visibility into S\&OP health and high-level KPIs).  
* **Inventory (Catalog & Stock)**  
* *Warehouse Manager:*  CRUD (Full administration of SKU metadata and reorder parameters).  
* *Sales Manager:*  Read-Only (Stock availability checks).  
* **Sales Orders**  
* *Warehouse Manager:*  CRUD (Order fulfillment and status updates).  
* *Sales Manager:*  CRUD (Entry and tracking of customer demand).  
* **Purchase Orders (Status: Draft → Sent → Received)**  
* *Warehouse Manager:*  CRUD (Replenishment lifecycle management).  
* *Sales Manager:*  Read-Only (Tracking incoming transit for customer ETA).  
* **Suppliers**  
* *Warehouse Manager:*  CRUD (Performance tracking and lead time definitions).  
* *Sales Manager:*  Read-Only (Vendor capability catalog).

#### 3\. Primary Component: S\&OP Lifecycle Progress Bar

A persistent horizontal stepper component reflecting the Monthly or Bi-weekly rhythm. The UI includes a toggle to switch between these two operational cadences, adjusting the date-range logic of the dashboard accordingly.**Visual State Definitions:**

* **Inactive (Grey):**  Future stages not yet initialized.  
* **Current (Pulsing Accent Color):**  The active workflow stage requiring input or review.  
* **Completed (Green Check):**  Stage finalized and data locked for the cycle.  
* **Overdue (Alert Red):**  Stage has exceeded the allocated window in the rhythm (Monthly/Bi-weekly).**Workflow Stages:**  
1. **Validation (Pre-Executive):**  Demand/Supply teams convergence to stress-test assumptions.  
2. **Alignment (Supply/Demand):**  Resolving trade-offs between constraints and market opportunities.  
3. **Executive Approval:**  Governance checkpoint for CFO/COO to authorize capital and priorities.  
4. **Operationalization:**  Transitioning the "Single Set of Numbers" into functional shop-floor KPIs.

#### 4\. Marketing Input Module: Promo Index & Qualitative Adjustment

This module allows Marketing to layer commercial intelligence onto the Statistical Forecast. It utilizes a  **Multiple Linear Regression**  logic to adjust the baseline.

* **Promo Index Slider:**  Numerical input (0.0 to 1.0) representing promotional intensity.  
* **Campaign Event Date Picker:**  Defines the window for seasonal uplifts or relaunch events.  
* **Technical Logic:**  These inputs modulate the  **Beta 2 (**  **$\\beta\_2**$  **)**  coefficient in the back-end regression equation:  $$D(F) \= \\beta\_0 \+ \\beta\_1(\\text{Price}) \+ \\beta\_2(\\text{Promo})$$  
* $\\beta\_0$ : Intercept (Base Demand).  
* $\\beta\_1$ : Impact of price elasticity.  
* $\\beta\_2$ : Impact of promotional activity (linked directly to the Slider).  
* *UI Feedback:*  Adjusting the slider triggers a real-time redraw of the  **Adjusted Consensus Forecast (Dotted Line)** .

#### 5\. Operations Input Module: Floor Stock & Safety Stock Controls

Operations managers manage inventory "Buffer Inventory" via a high-density data grid.**Safety Stock (SS) Technical Specification:**  The UI must calculate Safety Stock using the standard deviation of total demand in a lead time ( $\\sigma\_z$ ):  $$SS \= k \\cdot \\sigma\_z \\text{ where } \\sigma\_z \= \\sqrt{\\mu\_t \\sigma\_d^2 \+ \\mu\_d^2 \\sigma\_t^2}$$

* $\\mu\_t$ : Mean lead time.  
* $\\mu\_d$ : Mean demand.  
* $\\sigma\_t$ : Standard deviation of lead time.  
* $\\sigma\_d$ : Standard deviation of demand.**Grid Features:**  
* **Manual Override Toggle:**  Allows managers to set "Days of Coverage Needed."  
* **Visual Feedback Loop:**  If a user overrides the calculated SS, the field background changes to  **Light Yellow**  to distinguish it from system-calculated values.  
* **Override Logic:**  Based on the formula:  $(1 \- \\text{Supplier On-time Delivery}) \\times \\text{Lead Time}$ .

#### 6\. Technical Logic: Sea vs. Air Lead Time Toggle

A segmented control toggle (Sea | Air) used for scenario simulation.

* **Instructional Logic:**  
* **Sea:**  Increases  **Lead Time (**  **$L**$  **)**  and increases the visual  **Buffer Inventory**  recommendation.  
* **Air:**  Decreases  $L$ , lowering the  **Holding Cost (**  **$h**$  **)**  variable in the EOQ logic, reflecting reduced capital lockup.  
* **UI Impact:**  Switching to "Air" provides an immediate reduction in the recommended Safety Stock level on the primary visualization.

#### 7\. Interface: 'Ask AI' Natural Language Query Bar

A prominent search-style input at the top of the dashboard.

* **Interaction Design:**  
* **Auto-Suggest:**  Displays prompt templates as the user clicks into the bar.  
* **Scenario Preview:**  When a query like  *"What happens to our margin if SKU-01 moves to Air?"*  is entered, the AI generates a temporary "Shadow Line" on the main chart to visualize the impact before the user commits to the change.  
* **Sample Prompts:**  
* *"Show me the MAPE accuracy for the Fashion segment last season."*  
* *"Which products are at high risk of stockout in the next 14 days?"*  
* *"What is the cash flow impact of a 0.2 increase in the Promo Index for SKU-05?"*

#### 8\. Statistical Visualization: Forecasting Engine & Error Metrics

The primary charting area is a multi-layered visualization to align functional perspectives.**Chart Color Coding:**

* **Actual Sales:**  Orange Bars (Historical demand).  
* **Statistical Forecast:**  Solid Blue Line (Baseline model).  
* **Adjusted Consensus Forecast:**  Dotted Blue Line (Includes qualitative Marketing/Sales inputs).  
* **Confidence Interval:**  Semi-transparent Blue Shaded Area (Based on Standard Error).**Forecast Health Metrics Table:**  | Metric | Value | Description | | :--- | :--- | :--- | |  **MAPE**  | 12.5% | Mean Absolute Percentage Error (Relative accuracy). | |  **MAE**  | 140.9 | Mean Absolute Error (Average magnitude of error). | |  **MSE**  | 42,632 | Mean Squared Error (Weighting larger outliers). | |  **RMSE**  | 206.5 | Root Mean Squared Error (Standard deviation of residuals). |

#### 9\. S\&OE (Sales & Operations Execution) Short-Term Control Tower

A "High-Urgency" widget focused on the  **0-3 month horizon**  with a  **Weekly Cadence** .

* **Logic:**  Acts as the "Execution Control Tower" to handle daily disruptions.  
* **Status Triggers:**  Flags "Stockout Risk" if projected inventory drops below SS.  
* **One-Click "Confirm Order":**  Triggers an immediate status change in the Purchase Order table from  **"New"**  to  **"Confirmed,"**  signaling to the supplier that the draft is finalized for fulfillment.

#### 10\. Governance & Traceability Audit Log

A slide-out side panel providing full accountability for forecast adjustments.**Audit Log Specification:**

* **User ID:**  Identifies the stakeholder (Sales, Marketing, or Ops).  
* **Timestamp:**  Precise time of adjustment.  
* **Transaction Record:**  Displays "Previous Value" vs. "New Value" (e.g., Lead Time increased from 30 to 45 days).  
* **Logic:**  Ensures "Full Traceability" as required for collaborative forecasting consensus.

