# RBAC & Security Model

**TrimedCast** — Integrated Seasonal Demand & Inventory Forecasting System  
**Version:** 1.0 | **Last Updated:** 2025-07-11 | **Classification:** Internal Technical Document

---

## Table of Contents

1. [Role Definitions](#1-role-definitions)
2. [Permission Matrix](#2-permission-matrix)
3. [Laravel Implementation](#3-laravel-implementation)
4. [API Security](#4-api-security)
5. [Tenant Isolation Security](#5-tenant-isolation-security)
6. [Data Protection](#6-data-protection)
7. [Security Audit Trail](#7-security-audit-trail)
8. [Two-Factor Authentication](#8-two-factor-authentication-enterprise-tier)
9. [CORS and CSP](#9-cors-and-csp)

---

## 1. Role Definitions

The TrimedCast platform defines **five roles** within each tenant. All roles are tenant-scoped — a user's role applies only within their own tenant and grants zero access to any other tenant's data.

### 1.1 Warehouse Manager (Admin role within tenant)

| Aspect | Details |
|--------|---------|
| **Role Code** | `warehouse_manager` |
| **Hierarchy Level** | 1 (highest within tenant) |
| **Description** | Operational administrator with full control over products, inventory, suppliers, purchase orders, forecast configuration, and user management within their tenant. |

**Capabilities:**

- Full CRUD on: `Products`, `Inventory`, `Suppliers`, `Purchase Orders`, `Forecast Settings`, `Users` (within tenant)
- Can approve/reject forecasts and S&OP stages
- Can view: All data including unit costs, margins, supplier contracts
- Can manage: Other users' roles within tenant (except elevating to `warehouse_manager` without SaaS admin approval)
- Can export: All data for their tenant
- Can override: Calculated values (safety stock, reorder point, EOQ) with mandatory governance note

**Restrictions:**

- Cannot: Modify own role
- Cannot: Delete the tenant itself
- Cannot: Access any other tenant's data
- Cannot: Bypass the S&OP workflow (must follow stage gates)

---

### 1.2 Sales Manager

| Aspect | Details |
|--------|---------|
| **Role Code** | `sales_manager` |
| **Hierarchy Level** | 2 |
| **Description** | Manages sales orders and has read-only visibility into product availability, inventory stock levels, and purchase order status for coordination purposes. Financial data is deliberately hidden. |

**Capabilities:**

- CRUD on: `Sales Orders` — can create, read, update, and delete own orders; read all orders within tenant
- Read-only on:
  - `Products` — **excluding** `unit_cost_bdt`, `margin_bdt`, `margin_pct`, supplier pricing fields
  - `Inventory` — stock quantity levels only, not unit costs or values
  - `Suppliers` — name and lead time only, not contract terms or pricing
  - `Purchase Orders` — status tracking only (expected date, received qty), not cost data
- Can view: Forecast results (read-only) for demand planning coordination

**Restrictions:**

- Cannot: View `unit_cost_bdt`, `margin_bdt`, `margin_pct`, `supplier_pricing`, `forecast_settings`
- Cannot: Modify purchase orders, inventory levels, or product master data
- Cannot: Approve forecasts or advance S&OP stages
- Cannot: Access audit log
- Cannot: Export financial data

---

### 1.3 Marketing Manager

| Aspect | Details |
|--------|---------|
| **Role Code** | `marketing_manager` |
| **Hierarchy Level** | 3 |
| **Description** | Drives demand-side adjustments through promotional events and promo index tuning. Has visibility into forecasts and sales data for demand insight, but no access to cost or supply-chain operational data. |

**Capabilities:**

- CRUD on: `Promo Events`, `Promo Index` adjustments
- Read-only on:
  - `Products` — product names, categories, selling prices (for promo planning)
  - `Forecasts` — can view but not approve or modify algorithm parameters
  - `Sales Data` — aggregated demand insights, not per-unit cost breakdowns
- Can adjust:
  - Promo Index slider (affects the β₂ coefficient in the demand model)
  - Campaign dates and promo event parameters
  - Seasonal override factors for marketing-driven demand shifts

**Restrictions:**

- Cannot: View `unit_cost_bdt`, `margin_bdt`, `margin_pct`, `supplier_pricing`
- Cannot: Modify purchase orders, inventory, or product master data
- Cannot: Approve forecasts or advance S&OP stages
- Cannot: Access `forecast_settings` (algorithm parameters)
- Cannot: Access audit log

---

### 1.4 Finance (Read-Only Analyst)

| Aspect | Details |
|--------|---------|
| **Role Code** | `finance` |
| **Hierarchy Level** | 4 |
| **Description** | Read-only access to all financial data, forecast accuracy metrics, and the audit log. Designed for analysts who need to monitor cost-to-serve, margin performance, and forecast accuracy without any modification capability. |

**Capabilities:**

- Read-only access to:
  - Financial data: `unit_cost_bdt`, `margin_bdt`, `margin_pct`, EOQ costs, order values, purchase order totals
  - Forecast accuracy: MAPE, WMAPE, bias metrics, PvA (Plan vs Actual) analysis
  - Audit log: Full read access for governance and compliance review
- Special view: **Financial Coherence Dashboard**
  - Cost-to-serve metrics per product category
  - Cash flow projections (based on purchase order commitments and sales order pipeline)
  - Margin trend analysis with seasonal decomposition
  - Inventory carrying cost calculations
  - EOQ vs actual order quantity variance analysis

**Restrictions:**

- Cannot: Modify **any** data — strictly read-only across all resources
- Cannot: Approve anything (forecasts, S&OP stages, purchase orders)
- Cannot: View supplier contract details (contract terms, payment terms, exclusivity clauses)
- Cannot: Create, update, or delete any record
- Cannot: Export data (prevents bulk financial data extraction)

---

### 1.5 Executive (Leadership)

| Aspect | Details |
|--------|---------|
| **Role Code** | `executive` |
| **Hierarchy Level** | 0 (strategic oversight, parallel to warehouse_manager) |
| **Description** | Strategic leadership role with visibility into all data (matching warehouse_manager) plus the ability to approve S&OP stages and advance the planning cycle. Cannot perform day-to-day CRUD operations — this is a governance and approval role. |

**Capabilities:**

- Can: Approve S&OP stages, view all data (same visibility as `warehouse_manager`)
- Can: Advance S&OP cycle to the next stage
- Can: Approve or reject forecasts (overrides Sales/Marketing recommendations)
- Can: Override calculated values with governance note
- Special view: **Executive Dashboard**
  - High-level KPIs: Total revenue, total margin, forecast accuracy, fill rate
  - PvA analysis: Plan vs Actual comparison across categories
  - S&OP stage progress with approval status
  - Inventory health summary (stock-out risk, excess inventory)
  - Cash flow summary

**Restrictions:**

- Cannot: CRUD on `Products`, `Inventory`, `Sales Orders`, `Purchase Orders` (strategic role, not operational)
- Cannot: Modify forecast algorithm parameters
- Cannot: Delete users or modify user roles
- **Exception**: Can approve forecasts and advance S&OP stages (this is their primary operational function)

---

### Role Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    TENANT BOUNDARY                       │
│                                                          │
│  ┌──────────────────┐     ┌──────────────────┐          │
│  │ Warehouse Manager│     │    Executive     │          │
│  │  (Operational    │     │  (Strategic      │          │
│  │   Admin)         │     │   Oversight)     │          │
│  └────────┬─────────┘     └────────┬─────────┘          │
│           │                        │                     │
│  ┌────────▼───────────────────────▼────────┐           │
│  │        Shared: Full Data Visibility      │           │
│  │   + Approve Forecasts / S&OP Stages     │           │
│  └─────────────────────────────────────────┘           │
│                                                          │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────┐ │
│  │Sales Manager │  │Marketing Mgr   │  │  Finance   │ │
│  │(Orders +    │  │(Promos +       │  │(Read-Only  │ │
│  │ Stock View) │  │ Demand Adj)    │  │  Analyst)  │ │
│  └──────────────┘  └────────────────┘  └────────────┘ │
│                                                          │
│  Restricted: No cost/margin data   Restricted: No write  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Permission Matrix

### 2.1 Full Resource-Action Matrix

**Legend:**
- ✅ = Full access
- 🔍 = Read-only
- 🚫 = No access
- ⚠️ = Conditional (see notes)
- 🔒 = Read-only with field restrictions

| Resource | Action | warehouse_manager | sales_manager | marketing_manager | finance | executive |
|----------|--------|:-:|:-:|:-:|:-:|:-:|
| **Products** | Create | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Read | ✅ | 🔒 | 🔒 | ✅ | ✅ |
| | Update | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Delete | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Approve | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| | Export | ✅ | 🔒 | 🔒 | 🚫 | ✅ |
| **Inventory** | Create | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Read | ✅ | 🔒 | 🚫 | ✅ | ✅ |
| | Update | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Delete | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Approve | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Export | ✅ | 🔒 | 🚫 | 🚫 | ✅ |
| **Sales Orders** | Create | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| | Read | ✅ | ✅ | 🔍 | 🔍 | ✅ |
| | Update | ✅ | ⚠️ | 🚫 | 🚫 | 🚫 |
| | Delete | ✅ | ⚠️ | 🚫 | 🚫 | 🚫 |
| | Approve | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Export | ✅ | ✅ | 🔍 | 🚫 | ✅ |
| **Purchase Orders** | Create | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Read | ✅ | 🔒 | 🚫 | 🔍 | ✅ |
| | Update | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Delete | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Approve | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| | Export | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| **Suppliers** | Create | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Read | ✅ | 🔒 | 🚫 | 🔍 | ✅ |
| | Update | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Delete | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Approve | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Export | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| **Forecast Results** | Create | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Read | ✅ | 🔍 | 🔍 | 🔍 | ✅ |
| | Update | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Delete | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Approve | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| | Export | ✅ | 🔍 | 🔍 | 🚫 | ✅ |
| **Forecast Settings** | Create | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Read | ✅ | 🚫 | 🚫 | 🔍 | ✅ |
| | Update | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Delete | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Approve | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Export | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| **Promo Events** | Create | ✅ | 🚫 | ✅ | 🚫 | 🚫 |
| | Read | ✅ | 🔍 | ✅ | 🔍 | ✅ |
| | Update | ✅ | 🚫 | ✅ | 🚫 | 🚫 |
| | Delete | ✅ | 🚫 | ✅ | 🚫 | 🚫 |
| | Approve | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| | Export | ✅ | 🚫 | ✅ | 🚫 | ✅ |
| **Promo Index** | Create | ✅ | 🚫 | ✅ | 🚫 | 🚫 |
| | Read | ✅ | 🚫 | ✅ | 🔍 | ✅ |
| | Update | ✅ | 🚫 | ✅ | 🚫 | 🚫 |
| | Delete | ✅ | 🚫 | ✅ | 🚫 | 🚫 |
| | Approve | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| | Export | ✅ | 🚫 | ✅ | 🚫 | ✅ |
| **S&OP Stages** | Read | ✅ | 🔍 | 🔍 | 🔍 | ✅ |
| | Advance | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| | Approve | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| | Override | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| **Users** | Create | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Read | ✅ | 🔍 | 🔍 | 🔍 | ✅ |
| | Update | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Delete | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Approve | ⚠️ | 🚫 | 🚫 | 🚫 | 🚫 |
| | Export | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| **Audit Log** | Read | ✅ | 🚫 | 🚫 | ✅ | ✅ |
| | Export | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| **Financial Data** | Read | ✅ | 🚫 | 🚫 | ✅ | ✅ |
| | Export | ✅ | 🚫 | 🚫 | 🚫 | ✅ |

**Notes on conditional access (⚠️):**
- Sales Manager Update/Delete on Sales Orders: Only own orders (created by the user)
- Warehouse Manager Approve on Users: Cannot approve role changes to `warehouse_manager` for other users

---

### 2.2 Field-Level Restrictions by Role

| Field | warehouse_manager | sales_manager | marketing_manager | finance | executive |
|-------|:-:|:-:|:-:|:-:|:-:|
| `unit_cost_bdt` | ✅ | 🚫 | 🚫 | ✅ | ✅ |
| `margin_bdt` | ✅ | 🚫 | 🚫 | ✅ | ✅ |
| `margin_pct` | ✅ | 🚫 | 🚫 | ✅ | ✅ |
| `supplier_unit_price` | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| `supplier_contract_terms` | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| `supplier_payment_terms` | ✅ | 🚫 | 🚫 | 🚫 | ✅ |
| `eoq_total_cost` | ✅ | 🚫 | 🚫 | ✅ | ✅ |
| `po_total_value_bdt` | ✅ | 🚫 | 🚫 | ✅ | ✅ |
| `inventory_value_bdt` | ✅ | 🚫 | 🚫 | ✅ | ✅ |
| `forecast_settings.*` | ✅ | 🚫 | 🚫 | 🔍 | ✅ |
| `safety_stock_override` | ✅ | 🚫 | 🚫 | 🔍 | ✅ |
| `reorder_point_override` | ✅ | 🚫 | 🚫 | 🔍 | ✅ |
| `governance_note` | ✅ | 🚫 | 🚫 | ✅ | ✅ |
| `selling_price_bdt` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `stock_quantity` | ✅ | ✅ | 🚫 | ✅ | ✅ |
| `product_name` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `po_status` | ✅ | ✅ | 🚫 | ✅ | ✅ |
| `supplier_name` | ✅ | ✅ | 🚫 | ✅ | ✅ |
| `supplier_lead_time_days` | ✅ | ✅ | 🚫 | ✅ | ✅ |

---

## 3. Laravel Implementation

### 3.1 Role and Permission Setup

#### Role Enum

```php
<?php

namespace App\Enums;

enum Role: string
{
    case WAREHOUSE_MANAGER = 'warehouse_manager';
    case SALES_MANAGER = 'sales_manager';
    case MARKETING_MANAGER = 'marketing_manager';
    case FINANCE = 'finance';
    case EXECUTIVE = 'executive';

    /**
     * Get the hierarchy level for the role.
     * Lower number = higher authority within tenant.
     */
    public function hierarchyLevel(): int
    {
        return match ($this) {
            self::WAREHOUSE_MANAGER => 1,
            self::SALES_MANAGER => 2,
            self::MARKETING_MANAGER => 3,
            self::FINANCE => 4,
            self::EXECUTIVE => 0, // Strategic oversight, parallel to warehouse_manager
        };
    }

    /**
     * Roles that can view financial data (unit costs, margins, etc.)
     */
    public function canViewFinancials(): bool
    {
        return in_array($this, [
            self::WAREHOUSE_MANAGER,
            self::FINANCE,
            self::EXECUTIVE,
        ]);
    }

    /**
     * Roles that can view supplier contract details.
     */
    public function canViewSupplierContracts(): bool
    {
        return in_array($this, [
            self::WAREHOUSE_MANAGER,
            self::EXECUTIVE,
        ]);
    }

    /**
     * Roles that can approve forecasts and S&OP stages.
     */
    public function canApproveForecasts(): bool
    {
        return in_array($this, [
            self::WAREHOUSE_MANAGER,
            self::EXECUTIVE,
        ]);
    }

    /**
     * Roles that can perform CRUD on operational data.
     */
    public function isOperational(): bool
    {
        return in_array($this, [
            self::WAREHOUSE_MANAGER,
            self::SALES_MANAGER,
            self::MARKETING_MANAGER,
        ]);
    }

    /**
     * Roles that are strictly read-only.
     */
    public function isReadOnly(): bool
    {
        return $this === self::FINANCE;
    }

    /**
     * Get all sensitive fields this role cannot see.
     */
    public function restrictedFields(): array
    {
        return match ($this) {
            self::WAREHOUSE_MANAGER => [],
            self::EXECUTIVE => [],
            self::SALES_MANAGER => [
                'unit_cost_bdt',
                'margin_bdt',
                'margin_pct',
                'supplier_unit_price',
                'supplier_contract_terms',
                'supplier_payment_terms',
                'eoq_total_cost',
                'po_total_value_bdt',
                'inventory_value_bdt',
            ],
            self::MARKETING_MANAGER => [
                'unit_cost_bdt',
                'margin_bdt',
                'margin_pct',
                'supplier_unit_price',
                'supplier_contract_terms',
                'supplier_payment_terms',
                'eoq_total_cost',
                'po_total_value_bdt',
                'inventory_value_bdt',
            ],
            self::FINANCE => [
                'supplier_contract_terms',
                'supplier_payment_terms',
            ],
        };
    }
}
```

#### Permission Enum

```php
<?php

namespace App\Enums;

enum Permission: string
{
    // Product permissions
    case PRODUCT_CREATE = 'product.create';
    case PRODUCT_READ = 'product.read';
    case PRODUCT_UPDATE = 'product.update';
    case PRODUCT_DELETE = 'product.delete';
    case PRODUCT_APPROVE = 'product.approve';
    case PRODUCT_EXPORT = 'product.export';

    // Inventory permissions
    case INVENTORY_CREATE = 'inventory.create';
    case INVENTORY_READ = 'inventory.read';
    case INVENTORY_UPDATE = 'inventory.update';
    case INVENTORY_DELETE = 'inventory.delete';
    case INVENTORY_APPROVE = 'inventory.approve';
    case INVENTORY_EXPORT = 'inventory.export';

    // Sales Order permissions
    case SALES_ORDER_CREATE = 'sales_order.create';
    case SALES_ORDER_READ = 'sales_order.read';
    case SALES_ORDER_UPDATE = 'sales_order.update';
    case SALES_ORDER_DELETE = 'sales_order.delete';
    case SALES_ORDER_APPROVE = 'sales_order.approve';
    case SALES_ORDER_EXPORT = 'sales_order.export';

    // Purchase Order permissions
    case PURCHASE_ORDER_CREATE = 'purchase_order.create';
    case PURCHASE_ORDER_READ = 'purchase_order.read';
    case PURCHASE_ORDER_UPDATE = 'purchase_order.update';
    case PURCHASE_ORDER_DELETE = 'purchase_order.delete';
    case PURCHASE_ORDER_APPROVE = 'purchase_order.approve';
    case PURCHASE_ORDER_EXPORT = 'purchase_order.export';

    // Supplier permissions
    case SUPPLIER_CREATE = 'supplier.create';
    case SUPPLIER_READ = 'supplier.read';
    case SUPPLIER_UPDATE = 'supplier.update';
    case SUPPLIER_DELETE = 'supplier.delete';
    case SUPPLIER_APPROVE = 'supplier.approve';
    case SUPPLIER_EXPORT = 'supplier.export';

    // Forecast permissions
    case FORECAST_CREATE = 'forecast.create';
    case FORECAST_READ = 'forecast.read';
    case FORECAST_UPDATE = 'forecast.update';
    case FORECAST_DELETE = 'forecast.delete';
    case FORECAST_APPROVE = 'forecast.approve';
    case FORECAST_EXPORT = 'forecast.export';

    // Forecast Settings permissions
    case FORECAST_SETTINGS_CREATE = 'forecast_settings.create';
    case FORECAST_SETTINGS_READ = 'forecast_settings.read';
    case FORECAST_SETTINGS_UPDATE = 'forecast_settings.update';
    case FORECAST_SETTINGS_DELETE = 'forecast_settings.delete';

    // Promo Event permissions
    case PROMO_EVENT_CREATE = 'promo_event.create';
    case PROMO_EVENT_READ = 'promo_event.read';
    case PROMO_EVENT_UPDATE = 'promo_event.update';
    case PROMO_EVENT_DELETE = 'promo_event.delete';
    case PROMO_EVENT_APPROVE = 'promo_event.approve';
    case PROMO_EVENT_EXPORT = 'promo_event.export';

    // Promo Index permissions
    case PROMO_INDEX_CREATE = 'promo_index.create';
    case PROMO_INDEX_READ = 'promo_index.read';
    case PROMO_INDEX_UPDATE = 'promo_index.update';
    case PROMO_INDEX_DELETE = 'promo_index.delete';
    case PROMO_INDEX_APPROVE = 'promo_index.approve';
    case PROMO_INDEX_EXPORT = 'promo_index.export';

    // S&OP permissions
    case SOP_READ = 'sop.read';
    case SOP_ADVANCE = 'sop.advance';
    case SOP_APPROVE = 'sop.approve';
    case SOP_OVERRIDE = 'sop.override';

    // User management permissions
    case USER_CREATE = 'user.create';
    case USER_READ = 'user.read';
    case USER_UPDATE = 'user.update';
    case USER_DELETE = 'user.delete';
    case USER_APPROVE = 'user.approve';
    case USER_EXPORT = 'user.export';

    // Audit log permissions
    case AUDIT_LOG_READ = 'audit_log.read';
    case AUDIT_LOG_EXPORT = 'audit_log.export';

    // Financial data permissions
    case FINANCIAL_DATA_READ = 'financial_data.read';
    case FINANCIAL_DATA_EXPORT = 'financial_data.export';

    /**
     * Get all permissions assigned to a given role.
     */
    public static function forRole(Role $role): array
    {
        return match ($role) {
            Role::WAREHOUSE_MANAGER => self::warehouseManagerPermissions(),
            Role::SALES_MANAGER => self::salesManagerPermissions(),
            Role::MARKETING_MANAGER => self::marketingManagerPermissions(),
            Role::FINANCE => self::financePermissions(),
            Role::EXECUTIVE => self::executivePermissions(),
        };
    }

    private static function warehouseManagerPermissions(): array
    {
        return [
            // Full CRUD on products
            self::PRODUCT_CREATE, self::PRODUCT_READ, self::PRODUCT_UPDATE,
            self::PRODUCT_DELETE, self::PRODUCT_APPROVE, self::PRODUCT_EXPORT,
            // Full CRUD on inventory
            self::INVENTORY_CREATE, self::INVENTORY_READ, self::INVENTORY_UPDATE,
            self::INVENTORY_DELETE, self::INVENTORY_APPROVE, self::INVENTORY_EXPORT,
            // Full CRUD on sales orders
            self::SALES_ORDER_CREATE, self::SALES_ORDER_READ, self::SALES_ORDER_UPDATE,
            self::SALES_ORDER_DELETE, self::SALES_ORDER_APPROVE, self::SALES_ORDER_EXPORT,
            // Full CRUD on purchase orders
            self::PURCHASE_ORDER_CREATE, self::PURCHASE_ORDER_READ, self::PURCHASE_ORDER_UPDATE,
            self::PURCHASE_ORDER_DELETE, self::PURCHASE_ORDER_APPROVE, self::PURCHASE_ORDER_EXPORT,
            // Full CRUD on suppliers
            self::SUPPLIER_CREATE, self::SUPPLIER_READ, self::SUPPLIER_UPDATE,
            self::SUPPLIER_DELETE, self::SUPPLIER_APPROVE, self::SUPPLIER_EXPORT,
            // Full CRUD on forecasts
            self::FORECAST_CREATE, self::FORECAST_READ, self::FORECAST_UPDATE,
            self::FORECAST_DELETE, self::FORECAST_APPROVE, self::FORECAST_EXPORT,
            // Full CRUD on forecast settings
            self::FORECAST_SETTINGS_CREATE, self::FORECAST_SETTINGS_READ,
            self::FORECAST_SETTINGS_UPDATE, self::FORECAST_SETTINGS_DELETE,
            // Full CRUD on promo events and index
            self::PROMO_EVENT_CREATE, self::PROMO_EVENT_READ, self::PROMO_EVENT_UPDATE,
            self::PROMO_EVENT_DELETE, self::PROMO_EVENT_APPROVE, self::PROMO_EVENT_EXPORT,
            self::PROMO_INDEX_CREATE, self::PROMO_INDEX_READ, self::PROMO_INDEX_UPDATE,
            self::PROMO_INDEX_DELETE, self::PROMO_INDEX_APPROVE, self::PROMO_INDEX_EXPORT,
            // S&OP full access
            self::SOP_READ, self::SOP_ADVANCE, self::SOP_APPROVE, self::SOP_OVERRIDE,
            // User management
            self::USER_CREATE, self::USER_READ, self::USER_UPDATE,
            self::USER_DELETE, self::USER_APPROVE, self::USER_EXPORT,
            // Audit log and financial data
            self::AUDIT_LOG_READ, self::AUDIT_LOG_EXPORT,
            self::FINANCIAL_DATA_READ, self::FINANCIAL_DATA_EXPORT,
        ];
    }

    private static function salesManagerPermissions(): array
    {
        return [
            // Products: read with field restrictions (🔒)
            self::PRODUCT_READ, self::PRODUCT_EXPORT,
            // Inventory: read with field restrictions (🔒)
            self::INVENTORY_READ, self::INVENTORY_EXPORT,
            // Sales Orders: full CRUD on own, read all
            self::SALES_ORDER_CREATE, self::SALES_ORDER_READ,
            self::SALES_ORDER_UPDATE, self::SALES_ORDER_DELETE,
            self::SALES_ORDER_EXPORT,
            // Purchase Orders: read with field restrictions (🔒)
            self::PURCHASE_ORDER_READ,
            // Suppliers: read with field restrictions (🔒)
            self::SUPPLIER_READ,
            // Forecasts: read only
            self::FORECAST_READ, self::FORECAST_EXPORT,
            // Promo Events: read only
            self::PROMO_EVENT_READ,
            // S&OP: read only
            self::SOP_READ,
            // Users: read only (basic info)
            self::USER_READ,
        ];
    }

    private static function marketingManagerPermissions(): array
    {
        return [
            // Products: read with field restrictions (🔒)
            self::PRODUCT_READ, self::PRODUCT_EXPORT,
            // Sales Orders: read only (demand insights)
            self::SALES_ORDER_READ,
            // Forecasts: read only
            self::FORECAST_READ, self::FORECAST_EXPORT,
            // Full CRUD on promo events and promo index
            self::PROMO_EVENT_CREATE, self::PROMO_EVENT_READ, self::PROMO_EVENT_UPDATE,
            self::PROMO_EVENT_DELETE, self::PROMO_EVENT_EXPORT,
            self::PROMO_INDEX_CREATE, self::PROMO_INDEX_READ, self::PROMO_INDEX_UPDATE,
            self::PROMO_INDEX_DELETE, self::PROMO_INDEX_EXPORT,
            // S&OP: read only
            self::SOP_READ,
            // Users: read only (basic info)
            self::USER_READ,
        ];
    }

    private static function financePermissions(): array
    {
        return [
            // Products: full read (including financial fields)
            self::PRODUCT_READ,
            // Inventory: full read (including values)
            self::INVENTORY_READ,
            // Sales Orders: read only
            self::SALES_ORDER_READ,
            // Purchase Orders: read only (status + values)
            self::PURCHASE_ORDER_READ,
            // Suppliers: read only (excludes contract terms)
            self::SUPPLIER_READ,
            // Forecasts: read only (accuracy metrics)
            self::FORECAST_READ,
            // Forecast Settings: read only
            self::FORECAST_SETTINGS_READ,
            // Promo Events: read only
            self::PROMO_EVENT_READ,
            // Promo Index: read only
            self::PROMO_INDEX_READ,
            // S&OP: read only
            self::SOP_READ,
            // Users: read only
            self::USER_READ,
            // Audit log: full read access
            self::AUDIT_LOG_READ,
            // Financial data: read access
            self::FINANCIAL_DATA_READ,
        ];
    }

    private static function executivePermissions(): array
    {
        return [
            // Products: full read
            self::PRODUCT_READ, self::PRODUCT_EXPORT,
            // Inventory: full read
            self::INVENTORY_READ, self::INVENTORY_EXPORT,
            // Sales Orders: full read
            self::SALES_ORDER_READ, self::SALES_ORDER_EXPORT,
            // Purchase Orders: full read
            self::PURCHASE_ORDER_READ, self::PURCHASE_ORDER_EXPORT,
            // Suppliers: full read
            self::SUPPLIER_READ, self::SUPPLIER_EXPORT,
            // Forecasts: read + approve
            self::FORECAST_READ, self::FORECAST_APPROVE, self::FORECAST_EXPORT,
            // Forecast Settings: read only
            self::FORECAST_SETTINGS_READ,
            // Promo Events: full read
            self::PROMO_EVENT_READ, self::PROMO_EVENT_EXPORT,
            // Promo Index: full read
            self::PROMO_INDEX_READ, self::PROMO_INDEX_EXPORT,
            // S&OP: read + advance + approve + override
            self::SOP_READ, self::SOP_ADVANCE, self::SOP_APPROVE, self::SOP_OVERRIDE,
            // Users: read only
            self::USER_READ, self::USER_EXPORT,
            // Audit log: full read
            self::AUDIT_LOG_READ, self::AUDIT_LOG_EXPORT,
            // Financial data: read + export
            self::FINANCIAL_DATA_READ, self::FINANCIAL_DATA_EXPORT,
        ];
    }
}
```

#### User Model with Role Checking

```php
<?php

namespace App\Models;

use App\Enums\Permission;
use App\Enums\Role;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected $casts = [
        'role' => Role::class,
        'is_active' => 'boolean',
        'two_factor_confirmed_at' => 'datetime',
        'password' => 'hashed',
    ];

    // ─── Relationships ─────────────────────────────────────

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    // ─── Role Checking ─────────────────────────────────────

    public function hasRole(Role $role): bool
    {
        return $this->role === $role;
    }

    public function hasAnyRole(Role ...$roles): bool
    {
        return in_array($this->role, $roles);
    }

    public function isWarehouseManager(): bool
    {
        return $this->role === Role::WAREHOUSE_MANAGER;
    }

    public function isSalesManager(): bool
    {
        return $this->role === Role::SALES_MANAGER;
    }

    public function isMarketingManager(): bool
    {
        return $this->role === Role::MARKETING_MANAGER;
    }

    public function isFinance(): bool
    {
        return $this->role === Role::FINANCE;
    }

    public function isExecutive(): bool
    {
        return $this->role === Role::EXECUTIVE;
    }

    // ─── Permission Checking ───────────────────────────────

    public function hasPermission(Permission $permission): bool
    {
        return in_array(
            $permission,
            Permission::forRole($this->role),
            true
        );
    }

    public function hasAnyPermission(Permission ...$permissions): bool
    {
        $rolePermissions = Permission::forRole($this->role);

        foreach ($permissions as $permission) {
            if (in_array($permission, $rolePermissions, true)) {
                return true;
            }
        }

        return false;
    }

    public function hasAllPermissions(Permission ...$permissions): bool
    {
        $rolePermissions = Permission::forRole($this->role);

        foreach ($permissions as $permission) {
            if (! in_array($permission, $rolePermissions, true)) {
                return false;
            }
        }

        return true;
    }

    // ─── Financial Data Visibility ─────────────────────────

    public function canViewFinancials(): bool
    {
        return $this->role->canViewFinancials();
    }

    public function canViewSupplierContracts(): bool
    {
        return $this->role->canViewSupplierContracts();
    }

    // ─── Restricted Fields ─────────────────────────────────

    public function restrictedFields(): array
    {
        return $this->role->restrictedFields();
    }

    // ─── Two-Factor Authentication ─────────────────────────

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_secret !== null
            && $this->two_factor_confirmed_at !== null;
    }
}
```

#### Middleware: CheckRole

```php
<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     * Usage: ->middleware('role:warehouse_manager,executive')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $roleEnums = array_map(
            fn (string $role) => Role::from($role),
            $roles
        );

        if (! $user->hasAnyRole(...$roleEnums)) {
            // Log unauthorized access attempt for security audit
            AuditLogService::logSecurityEvent(
                event: 'role_access_denied',
                details: [
                    'required_roles' => $roles,
                    'user_role' => $user->role->value,
                    'route' => $request->route()?->getName(),
                ],
            );

            return response()->json([
                'message' => 'Insufficient role privileges.',
            ], 403);
        }

        return $next($request);
    }
}
```

#### Middleware: CheckPermission

```php
<?php

namespace App\Http\Middleware;

use App\Enums\Permission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     * Usage: ->middleware('permission:product.create')
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $permissionEnum = Permission::from($permission);

        if (! $user->hasPermission($permissionEnum)) {
            // Log unauthorized permission attempt
            AuditLogService::logSecurityEvent(
                event: 'permission_access_denied',
                details: [
                    'required_permission' => $permission,
                    'user_role' => $user->role->value,
                    'route' => $request->route()?->getName(),
                ],
            );

            return response()->json([
                'message' => 'You do not have permission to perform this action.',
            ], 403);
        }

        return $next($request);
    }
}
```

#### Middleware Registration

```php
<?php

// app/Http/Kernel.php (or bootstrap/app.php for Laravel 11+)

->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'role' => \App\Http\Middleware\CheckRole::class,
        'permission' => \App\Http\Middleware\CheckPermission::class,
        'tenant' => \App\Http\Middleware\SetTenantId::class,
    ]);
})
```

#### Route Usage Examples

```php
<?php

// routes/api.php

use App\Http\Controllers\ProductController;
use App\Http\Controllers\ForecastController;
use App\Http\Controllers\SopController;
use App\Http\Controllers\PromoEventController;

// Products — full CRUD for warehouse_manager only
Route::apiResource('products', ProductController::class)
    ->middleware(['auth:sanctum', 'tenant', 'role:warehouse_manager']);

// Product read-only endpoint for other roles
Route::get('products', [ProductController::class, 'index'])
    ->middleware(['auth:sanctum', 'tenant', 'permission:product.read']);

// Forecasts — approval restricted
Route::post('forecasts/{forecast}/approve', [ForecastController::class, 'approve'])
    ->middleware(['auth:sanctum', 'tenant', 'permission:forecast.approve']);

// S&OP — advance restricted to warehouse_manager and executive
Route::post('sop/advance', [SopController::class, 'advance'])
    ->middleware(['auth:sanctum', 'tenant', 'permission:sop.advance']);

// Promo Events — marketing_manager has CRUD
Route::apiResource('promo-events', PromoEventController::class)
    ->middleware(['auth:sanctum', 'tenant', 'permission:promo_event.create']);
```

---

### 3.2 Policy Classes for Each Resource

#### Product Policy

```php
<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission(Permission::PRODUCT_READ);
    }

    public function view(User $user, Product $product): bool
    {
        // Must have read permission AND product belongs to user's tenant
        return $user->hasPermission(Permission::PRODUCT_READ)
            && $user->tenant_id === $product->tenant_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission(Permission::PRODUCT_CREATE);
    }

    public function update(User $user, Product $product): bool
    {
        return $user->hasPermission(Permission::PRODUCT_UPDATE)
            && $user->tenant_id === $product->tenant_id;
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->hasPermission(Permission::PRODUCT_DELETE)
            && $user->tenant_id === $product->tenant_id;
    }

    public function approve(User $user, Product $product): bool
    {
        return $user->hasPermission(Permission::PRODUCT_APPROVE)
            && $user->tenant_id === $product->tenant_id;
    }

    public function export(User $user): bool
    {
        return $user->hasPermission(Permission::PRODUCT_EXPORT);
    }
}
```

#### Sales Order Policy (with ownership check)

```php
<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Enums\Role;
use App\Models\SalesOrder;
use App\Models\User;

class SalesOrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission(Permission::SALES_ORDER_READ);
    }

    public function view(User $user, SalesOrder $salesOrder): bool
    {
        return $user->hasPermission(Permission::SALES_ORDER_READ)
            && $user->tenant_id === $salesOrder->tenant_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission(Permission::SALES_ORDER_CREATE);
    }

    public function update(User $user, SalesOrder $salesOrder): bool
    {
        // Warehouse Manager can update any; Sales Manager only own orders
        if ($user->isWarehouseManager()) {
            return $user->tenant_id === $salesOrder->tenant_id;
        }

        if ($user->isSalesManager()) {
            return $user->hasPermission(Permission::SALES_ORDER_UPDATE)
                && $user->tenant_id === $salesOrder->tenant_id
                && $salesOrder->created_by === $user->id;
        }

        return false;
    }

    public function delete(User $user, SalesOrder $salesOrder): bool
    {
        // Same ownership rules as update
        if ($user->isWarehouseManager()) {
            return $user->tenant_id === $salesOrder->tenant_id;
        }

        if ($user->isSalesManager()) {
            return $user->hasPermission(Permission::SALES_ORDER_DELETE)
                && $user->tenant_id === $salesOrder->tenant_id
                && $salesOrder->created_by === $user->id;
        }

        return false;
    }

    public function approve(User $user, SalesOrder $salesOrder): bool
    {
        return $user->hasPermission(Permission::SALES_ORDER_APPROVE)
            && $user->tenant_id === $salesOrder->tenant_id;
    }
}
```

#### Forecast Policy

```php
<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Forecast;
use App\Models\User;

class ForecastPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission(Permission::FORECAST_READ);
    }

    public function view(User $user, Forecast $forecast): bool
    {
        return $user->hasPermission(Permission::FORECAST_READ)
            && $user->tenant_id === $forecast->tenant_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission(Permission::FORECAST_CREATE);
    }

    public function update(User $user, Forecast $forecast): bool
    {
        return $user->hasPermission(Permission::FORECAST_UPDATE)
            && $user->tenant_id === $forecast->tenant_id;
    }

    public function approve(User $user, Forecast $forecast): bool
    {
        return $user->hasPermission(Permission::FORECAST_APPROVE)
            && $user->tenant_id === $forecast->tenant_id;
    }

    /**
     * Override a calculated forecast value — requires governance note.
     */
    public function override(User $user, Forecast $forecast): bool
    {
        return $user->hasAnyRole(Role::WAREHOUSE_MANAGER, Role::EXECUTIVE)
            && $user->tenant_id === $forecast->tenant_id;
    }
}
```

#### S&OP Policy

```php
<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\User;

class SopPolicy
{
    public function view(User $user): bool
    {
        return $user->hasPermission(Permission::SOP_READ);
    }

    public function advance(User $user): bool
    {
        return $user->hasPermission(Permission::SOP_ADVANCE);
    }

    public function approve(User $user): bool
    {
        return $user->hasPermission(Permission::SOP_APPROVE);
    }

    public function override(User $user): bool
    {
        return $user->hasPermission(Permission::SOP_OVERRIDE);
    }
}
```

---

### 3.2 Field-Level Security (API Resources)

#### Product Resource — Conditional Field Inclusion

```php
<?php

namespace App\Http\Resources;

use App\Enums\Role;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Fields that contain financial data, restricted by role.
     */
    private const FINANCIAL_FIELDS = [
        'unit_cost_bdt',
        'margin_bdt',
        'margin_pct',
    ];

    private const SUPPLIER_FIELDS = [
        'supplier_unit_price',
        'supplier_contract_terms',
        'supplier_payment_terms',
    ];

    public function toArray(Request $request): array
    {
        $user = $request->user();
        $data = parent::toArray($request);

        // Remove financial fields for roles that cannot view them
        if (! $user->canViewFinancials()) {
            foreach (self::FINANCIAL_FIELDS as $field) {
                unset($data[$field]);
            }
        }

        // Remove supplier contract fields for roles that cannot view them
        if (! $user->canViewSupplierContracts()) {
            foreach (self::SUPPLIER_FIELDS as $field) {
                unset($data[$field]);
            }
        }

        // For sales_manager: also remove inventory value
        if ($user->isSalesManager()) {
            unset($data['inventory_value_bdt']);
            unset($data['eoq_total_cost']);
        }

        return $data;
    }
}
```

#### Inventory Resource — Stock Levels Only for Sales Manager

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();

        // Base fields visible to all who have inventory read permission
        $data = [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product_name' => $this->product?->product_name,
            'sku' => $this->product?->sku,
            'warehouse_id' => $this->warehouse_id,
            'stock_quantity' => $this->stock_quantity,
            'stock_status' => $this->stock_status,
            'updated_at' => $this->updated_at,
        ];

        // Full financial details for roles that can view financials
        if ($user->canViewFinancials()) {
            $data['unit_cost_bdt'] = $this->product?->unit_cost_bdt;
            $data['inventory_value_bdt'] = $this->inventory_value_bdt;
            $data['safety_stock_qty'] = $this->safety_stock_qty;
            $data['reorder_point_qty'] = $this->reorder_point_qty;
            $data['eoq_qty'] = $this->eoq_qty;
            $data['eoq_total_cost'] = $this->eoq_total_cost;
        }

        // Override details for warehouse_manager and executive
        if ($user->isWarehouseManager() || $user->isExecutive()) {
            $data['safety_stock_override'] = $this->safety_stock_override;
            $data['reorder_point_override'] = $this->reorder_point_override;
            $data['safety_stock_governance_note'] = $this->safety_stock_governance_note;
            $data['reorder_point_governance_note'] = $this->reorder_point_governance_note;
        }

        return $data;
    }
}
```

#### Purchase Order Resource — Status Tracking for Sales Manager

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();

        // Base fields: status tracking visible to all with PO read permission
        $data = [
            'id' => $this->id,
            'po_number' => $this->po_number,
            'supplier_id' => $this->supplier_id,
            'supplier_name' => $this->supplier?->supplier_name,
            'status' => $this->status,
            'order_date' => $this->order_date,
            'expected_delivery_date' => $this->expected_delivery_date,
            'received_qty' => $this->received_qty,
            'total_qty' => $this->total_qty,
        ];

        // Financial details only for warehouse_manager, finance, executive
        if ($user->canViewFinancials() || $user->isExecutive()) {
            $data['po_total_value_bdt'] = $this->po_total_value_bdt;
            $data['unit_price_bdt'] = $this->unit_price_bdt;
            $data['payment_terms'] = $this->payment_terms;
            $data['payment_status'] = $this->payment_status;
        }

        // Full details for warehouse_manager
        if ($user->isWarehouseManager()) {
            $data['supplier_contract_ref'] = $this->supplier_contract_ref;
            $data['notes'] = $this->notes;
            $data['line_items'] = PurchaseOrderLineItemResource::collection(
                $this->whenLoaded('lineItems')
            );
        }

        return $data;
    }
}
```

#### Supplier Resource — Name Only for Sales Manager

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SupplierResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();

        // Minimal fields for sales_manager
        $data = [
            'id' => $this->id,
            'supplier_name' => $this->supplier_name,
        ];

        // Lead time visible to sales_manager and above
        if (! $user->isMarketingManager()) {
            $data['lead_time_days'] = $this->lead_time_days;
            $data['reliability_score'] = $this->reliability_score;
        }

        // Full details for warehouse_manager, finance, executive
        if ($user->isWarehouseManager() || $user->isFinance() || $user->isExecutive()) {
            $data['contact_name'] = $this->contact_name;
            $data['contact_email'] = $this->contact_email;
            $data['contact_phone'] = $this->contact_phone;
            $data['address'] = $this->address;
            $data['payment_terms_default'] = $this->payment_terms_default;
            $data['currency'] = $this->currency;
        }

        // Contract details only for warehouse_manager and executive
        if ($user->canViewSupplierContracts()) {
            $data['contract_terms'] = $this->contract_terms;
            $data['contract_start_date'] = $this->contract_start_date;
            $data['contract_end_date'] = $this->contract_end_date;
            $data['exclusivity_clause'] = $this->exclusivity_clause;
            $data['unit_pricing'] = SupplierPricingResource::collection(
                $this->whenLoaded('pricing')
            );
        }

        return $data;
    }
}
```

---

### 3.3 Scope-Level Security

#### TenantScope — Global Scope for Multi-Tenancy

```php
<?php

namespace App\Scopes;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    /**
     * Apply the tenant scope to the query.
     * Automatically adds WHERE tenant_id = current_user's tenant_id.
     */
    public function apply(Builder $builder, Model $model): void
    {
        if ($user = auth()->user()) {
            $builder->where($model->getTable() . '.tenant_id', $user->tenant_id);
        }
    }

    /**
     * Extend the builder with a method to bypass tenant scope
     * for SaaS admin operations only.
     */
    public function extend(Builder $builder): void
    {
        $builder->macro('withoutTenantScope', function (Builder $builder) {
            return $builder->withoutGlobalScope(static::class);
        });
    }
}
```

#### TenantScope Trait — Apply to All Tenant-Scoped Models

```php
<?php

namespace App\Models\Concerns;

use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;

trait BelongsToTenant
{
    /**
     * Boot the BelongsToTenant trait.
     * Automatically applies TenantScope and sets tenant_id on create.
     */
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function (Model $model) {
            if (auth()->check() && ! $model->tenant_id) {
                $model->tenant_id = auth()->user()->tenant_id;
            }
        });
    }

    /**
     * Get the tenant relationship.
     */
    public function tenant()
    {
        return $this->belongsTo(\App\Models\Tenant::class);
    }
}
```

#### Usage in Models

```php
<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'product_name',
        'sku',
        'category',
        'unit_cost_bdt',
        'selling_price_bdt',
        'unit',
        'is_active',
    ];

    // tenant_id is automatically set on create
    // queries automatically scoped to current tenant
}
```

#### SetTenantId Middleware

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetTenantId
{
    /**
     * Resolve the tenant from the authenticated user and set it
     * on the request and in the PostgreSQL session variable for RLS.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Verify user's tenant is active
        if (! $user->tenant?->is_active) {
            auth()->logout();

            return response()->json([
                'message' => 'Your organization account is inactive. Contact support.',
            ], 403);
        }

        // Set tenant ID on the request for easy access
        $request->attributes->set('tenant_id', $user->tenant_id);

        // Set PostgreSQL session variable for Row-Level Security
        // This is the defense-in-depth approach — even if Eloquent scope fails,
        // the database RLS policy will enforce tenant isolation.
        try {
            \DB::statement(
                "SET LOCAL app.tenant_id = ?",
                [$user->tenant_id]
            );
        } catch (\Exception $e) {
            \Log::error('Failed to set tenant session variable', [
                'user_id' => $user->id,
                'tenant_id' => $user->tenant_id,
                'error' => $e->getMessage(),
            ]);
        }

        return $next($request);
    }
}
```

#### RoleScope — Filter Queries Based on Role

```php
<?php

namespace App\Scopes;

use App\Enums\Role;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class RoleScope implements Scope
{
    /**
     * Apply role-based query filters.
     * Sales Manager sees only own sales orders by default.
     * All other roles see everything within their tenant.
     */
    public function apply(Builder $builder, Model $model): void
    {
        $user = auth()->user();

        if (! $user) {
            return;
        }

        // Sales Manager: filter sales orders to own by default
        if ($user->isSalesManager() && $model instanceof \App\Models\SalesOrder) {
            $builder->where('created_by', $user->id);
        }

        // Finance: no filtering needed — they have read-only on all
        // Marketing Manager: no filtering on promo events (they own all within tenant)
        // Warehouse Manager / Executive: no filtering (full access within tenant)
    }
}
```

#### RoleScope Trait

```php
<?php

namespace App\Models\Concerns;

use App\Scopes\RoleScope;

trait HasRoleScope
{
    /**
     * Boot the HasRoleScope trait.
     */
    public static function bootHasRoleScope(): void
    {
        static::addGlobalScope(new RoleScope);
    }

    /**
     * Bypass role scope — used by admin or when explicitly
     * requesting all records (with proper authorization check).
     */
    public function scopeAllForRole(Builder $query): Builder
    {
        return $query->withoutGlobalScope(RoleScope::class);
    }
}
```

---

## 4. API Security

### 4.1 Authentication

TrimedCast supports **two authentication strategies** depending on the client type:

| Client Type | Mechanism | Token Type | Expiration | CSRF |
|-------------|-----------|------------|------------|------|
| SPA (Vue.js/React) | Laravel Sanctum | Cookie-based (session) | 24 hours | ✅ Yes |
| Mobile App | Laravel Sanctum | Bearer token | 30 days | N/A |
| 3rd Party Integration | Laravel Passport | OAuth2 access token | Configurable (default 24h) | N/A |
| Service-to-Service | Static API Key + HMAC | Custom header | No expiry (key rotation) | N/A |

#### Sanctum Configuration (SPA)

```php
<?php

// config/sanctum.php

return [
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', implode(',', [
        'localhost:3000',
        'localhost:5173',
        'trimedcast.app',
        '*.trimedcast.app',
    ]))),

    'guard' => ['web'],

    'expiration' => 1440, // 24 hours in minutes

    'token_refresh' => 43200, // 30 days in minutes
];
```

```php
<?php

// config/cors.php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => [], // Dynamically set per tenant via middleware
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

#### Passport Configuration (3rd Party API)

```php
<?php

// config/passport.php

return [
    'client_id' => env('PASSPORT_CLIENT_ID'),
    'client_secret' => env('PASSPORT_CLIENT_SECRET'),

    'personal_access_client_id' => env('PASSPORT_PERSONAL_ACCESS_CLIENT_ID'),
    'personal_access_client_secret' => env('PASSPORT_PERSONAL_ACCESS_CLIENT_SECRET'),

    'token_expiration' => 1440, // 24 hours

    'refresh_token_expiration' => 43200, // 30 days
];
```

#### Authentication Endpoints

```
POST   /api/auth/login          — Email + password login
POST   /api/auth/logout         — Invalidate current token
POST   /api/auth/refresh        — Refresh expiring token
POST   /api/auth/forgot-password — Trigger password reset email
POST   /api/auth/reset-password  — Reset password with token
GET    /api/auth/me             — Get current user + role + permissions
POST   /api/auth/2fa/enable     — Enable 2FA
POST   /api/auth/2fa/verify     — Verify 2FA code
POST   /api/auth/2fa/disable    — Disable 2FA
```

---

### 4.2 API Key Management (Service-to-Service)

The Python Forecast Service and AI/RAG Service authenticate using static API keys combined with HMAC-SHA256 request signing for defense in depth.

#### API Key Schema

```sql
CREATE TABLE service_api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    service_name    VARCHAR(100) NOT NULL, -- 'forecast_service', 'ai_rag_service'
    key_prefix      VARCHAR(8) NOT NULL,   -- First 8 chars for identification
    key_hash        VARCHAR(255) NOT NULL, -- bcrypt hash of the full API key
    hmac_secret     VARCHAR(255) NOT NULL, -- Encrypted HMAC secret
    is_active       BOOLEAN DEFAULT TRUE,
    expires_at      TIMESTAMP WITH TIME ZONE,
    allowed_ips     JSONB,                 -- IP whitelist
    rate_limit      INTEGER DEFAULT 60,    -- Requests per minute
    last_used_at    TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deactivated_at  TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_service_api_keys_tenant ON service_api_keys(tenant_id);
CREATE INDEX idx_service_api_keys_prefix ON service_api_keys(key_prefix);
```

#### HMAC-SHA256 Request Signing

```php
<?php

namespace App\Services\Security;

use Illuminate\Http\Request;

class HmacSignatureService
{
    /**
     * Generate HMAC-SHA256 signature for an outgoing request.
     * Used when TrimedCast calls the Python Forecast Service.
     */
    public static function signRequest(
        string $method,
        string $url,
        string $body,
        string $hmacSecret,
    ): string {
        $timestamp = now()->timestamp;
        $nonce = bin2hex(random_bytes(16));

        // Construct the signature payload: METHOD + URL + TIMESTAMP + NONCE + SHA256(BODY)
        $bodyHash = hash('sha256', $body);
        $payload = implode("\n", [
            strtoupper($method),
            $url,
            $timestamp,
            $nonce,
            $bodyHash,
        ]);

        $signature = hash_hmac('sha256', $payload, $hmacSecret);

        return base64_encode(implode(':', [
            $timestamp,
            $nonce,
            $signature,
        ]));
    }

    /**
     * Verify HMAC-SHA256 signature on an incoming request.
     * Used when the Python Forecast Service calls back to TrimedCast.
     */
    public static function verifySignature(
        Request $request,
        string $hmacSecret,
    ): bool {
        $signatureHeader = $request->header('X-Signature');
        $parts = explode(':', base64_decode($signatureHeader));

        if (count($parts) !== 3) {
            return false;
        }

        [$timestamp, $nonce, $signature] = $parts;

        // Reject requests older than 5 minutes (replay protection)
        if (abs(now()->timestamp - (int) $timestamp) > 300) {
            return false;
        }

        // Reject replayed nonces (check Redis cache)
        $nonceKey = "hmac_nonce:{$nonce}";
        if (\Cache::has($nonceKey)) {
            return false;
        }
        \Cache::put($nonceKey, true, 300); // Store for 5 minutes

        // Reconstruct expected signature
        $bodyHash = hash('sha256', $request->getContent());
        $payload = implode("\n", [
            strtoupper($request->method()),
            $request->fullUrl(),
            $timestamp,
            $nonce,
            $bodyHash,
        ]);

        $expectedSignature = hash_hmac('sha256', $payload, $hmacSecret);

        return hash_equals($expectedSignature, $signature);
    }
}
```

#### Key Rotation Support

```php
<?php

namespace App\Services\Security;

use App\Models\ServiceApiKey;
use Illuminate\Support\Facades\Crypt;

class ApiKeyRotationService
{
    /**
     * Rotate an API key with a 7-day overlap period.
     * Both old and new keys remain active during overlap.
     */
    public function rotateKey(ServiceApiKey $oldKey, string $serviceName): ServiceApiKey
    {
        // Generate new key
        $newKeyValue = 'tmc_' . bin2hex(random_bytes(32));
        $newHmacSecret = bin2hex(random_bytes(32));

        // Create new API key record
        $newKey = ServiceApiKey::create([
            'tenant_id' => $oldKey->tenant_id,
            'service_name' => $serviceName,
            'key_prefix' => substr($newKeyValue, 0, 8),
            'key_hash' => bcrypt($newKeyValue),
            'hmac_secret' => Crypt::encryptString($newHmacSecret),
            'is_active' => true,
            'expires_at' => null, // No expiry — manual rotation only
            'allowed_ips' => $oldKey->allowed_ips,
            'rate_limit' => $oldKey->rate_limit,
        ]);

        // Schedule old key deactivation in 7 days
        $oldKey->update([
            'expires_at' => now()->addDays(7),
        ]);

        // Dispatch job to deactivate old key after 7 days
        \App\Jobs\DeactivateApiKeyJob::dispatch($oldKey)
            ->delay(now()->addDays(7));

        return $newKey;
        // Return the new key value to the caller ONCE
        // It is never stored in plaintext in the database
    }
}
```

---

### 4.3 Rate Limiting

#### Rate Limiter Configuration

```php
<?php

// app/Providers/AppServiceProvider.php → boot()

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

// Per-user standard rate limit: 60 req/min
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)
        ->by($request->user()?->id ?: $request->ip())
        ->response(function () {
            return response()->json([
                'message' => 'Rate limit exceeded. Please try again later.',
            ], 429);
        });
});

// Per-user AI query rate limit: 20 req/min
RateLimiter::for('ai', function (Request $request) {
    return Limit::perMinute(20)
        ->by($request->user()?->id ?: $request->ip())
        ->response(function () {
            return response()->json([
                'message' => 'AI query rate limit exceeded. Maximum 20 queries per minute.',
            ], 429);
        });
});

// Per-tenant forecast generation: 10 req/min
RateLimiter::for('forecast', function (Request $request) {
    return Limit::perMinute(10)
        ->by('forecast:' . $request->user()?->tenant_id)
        ->response(function () {
            return response()->json([
                'message' => 'Forecast generation limit exceeded. Maximum 10 per minute per organization.',
            ], 429);
        });
});

// Per-tenant data import: 5 req/min
RateLimiter::for('import', function (Request $request) {
    return Limit::perMinute(5)
        ->by('import:' . $request->user()?->tenant_id)
        ->response(function () {
            return response()->json([
                'message' => 'Import rate limit exceeded. Maximum 5 imports per minute.',
            ], 429);
        });
});

// Per-IP unauthenticated: 100 req/min
RateLimiter::for('global', function (Request $request) {
    return Limit::perMinute(100)
        ->by($request->ip())
        ->response(function () {
            return response()->json([
                'message' => 'Too many requests from this IP.',
            ], 429);
        });
});
```

#### Route Rate Limiting

```php
<?php

// routes/api.php

// Standard API routes
Route::middleware(['throttle:api', 'auth:sanctum'])->group(function () {
    Route::apiResource('products', ProductController::class);
    Route::apiResource('inventory', InventoryController::class);
    // ...
});

// AI/RAG query routes
Route::middleware(['throttle:ai', 'auth:sanctum'])->group(function () {
    Route::post('ai/query', [AiController::class, 'query']);
    Route::post('ai/rag/search', [AiController::class, 'ragSearch']);
});

// Forecast generation routes
Route::middleware(['throttle:forecast', 'auth:sanctum'])->group(function () {
    Route::post('forecasts/generate', [ForecastController::class, 'generate']);
});

// Import routes
Route::middleware(['throttle:import', 'auth:sanctum'])->group(function () {
    Route::post('imports/products', [ImportController::class, 'products']);
    Route::post('imports/sales', [ImportController::class, 'sales']);
});

// Unauthenticated routes (login, register, etc.)
Route::middleware(['throttle:global'])->group(function () {
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
});
```

---

### 4.4 Input Validation

#### Form Request Example — CreateProductRequest

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission(\App\Enums\Permission::PRODUCT_CREATE);
    }

    public function rules(): array
    {
        return [
            'product_name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:50', 'unique:products,sku'],
            'category' => ['required', 'string', 'in:chain_sprocket,brake_pad,tire_tube,oil_filter,battery,clutch_plate,other'],
            'unit_cost_bdt' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'selling_price_bdt' => ['required', 'numeric', 'min:0', 'max:999999.99', 'gt:unit_cost_bdt'],
            'unit' => ['required', 'string', 'in:piece,set,pair,liter,kilogram'],
            'is_active' => ['boolean'],
            'safety_stock_qty' => ['nullable', 'numeric', 'min:0'],
            'reorder_point_qty' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'selling_price_bdt.gt' => 'Selling price must be greater than unit cost.',
            'sku.unique' => 'This SKU already exists in your inventory.',
            'category.in' => 'Invalid product category.',
        ];
    }
}
```

#### Form Request Example — OverrideForecastRequest (Governance Note Required)

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OverrideForecastRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(
            \App\Enums\Role::WAREHOUSE_MANAGER,
            \App\Enums\Role::EXECUTIVE,
        );
    }

    public function rules(): array
    {
        return [
            'field' => ['required', 'string', 'in:safety_stock_qty,reorder_point_qty,forecast_qty,lead_time_days'],
            'new_value' => ['required', 'numeric', 'min:0'],
            'governance_note' => ['required', 'string', 'min:10', 'max:1000'],
            'effective_from' => ['nullable', 'date', 'after_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'governance_note.required' => 'A governance note is mandatory when overriding calculated values.',
            'governance_note.min' => 'The governance note must be at least 10 characters to explain the override reason.',
        ];
    }
}
```

#### File Upload Validation

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission(\App\Enums\Permission::PRODUCT_CREATE);
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'mimes:xlsx,csv',           // Only Excel and CSV
                'max:10240',                  // Max 10MB
            ],
            'import_type' => ['required', 'string', 'in:products,sales_history,inventory_snapshot'],
        ];
    }

    /**
     * Additional validation after base rules pass.
     * Perform virus scan on enterprise tier.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->hasFile('file')) {
                $file = $this->file('file');

                // Validate file content matches extension (MIME sniffing protection)
                $mimeType = $file->getMimeType();
                $allowedMimes = [
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
                    'text/csv',
                    'text/plain', // csv sometimes detected as text/plain
                ];

                if (! in_array($mimeType, $allowedMimes)) {
                    $validator->errors()->add(
                        'file',
                        'Invalid file content detected. Only .xlsx and .csv files are accepted.'
                    );
                }

                // Virus scan on enterprise tier
                if ($this->user()->tenant->isEnterprise()) {
                    $scanResult = app(VirusScanService::class)->scan($file->getPathname());
                    if (! $scanResult->isClean()) {
                        $validator->errors()->add(
                            'file',
                            'File failed security scan. Please contact support.'
                        );
                    }
                }
            }
        });
    }
}
```

#### Mass Assignment Protection — Model Example

```php
<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use BelongsToTenant;

    /**
     * ONLY $fillable is used — never $guarded.
     * This ensures explicit allowlist of mass-assignable fields.
     */
    protected $fillable = [
        'tenant_id',
        'product_name',
        'sku',
        'category',
        'unit_cost_bdt',
        'selling_price_bdt',
        'unit',
        'is_active',
    ];

    /**
     * Fields never exposed in mass assignment or API:
     * - id, created_at, updated_at are managed by Eloquent
     * - tenant_id is set automatically by TenantScope
     */
    protected $hidden = [
        // Never expose in JSON serialization
    ];

    protected $casts = [
        'unit_cost_bdt' => 'decimal:2',
        'selling_price_bdt' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    // Computed attributes (never stored, never mass-assignable)
    public function getMarginBdtAttribute(): float
    {
        return $this->selling_price_bdt - $this->unit_cost_bdt;
    }

    public function getMarginPctAttribute(): float
    {
        return $this->unit_cost_bdt > 0
            ? round(($this->margin_bdt / $this->unit_cost_bdt) * 100, 2)
            : 0;
    }
}
```

---

## 5. Tenant Isolation Security

TrimedCast implements **defense in depth** for tenant isolation — three independent layers ensure no cross-tenant data access is possible.

### 5.1 Application Level (Layer 1)

#### Global Scope: BelongsToTenant

Every model that belongs to a tenant uses the `BelongsToTenant` trait, which applies a global Eloquent scope. This means **every query** automatically includes `WHERE tenant_id = ?`.

```php
<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if ($user = auth()->user()) {
            $builder->where($model->getTable() . '.tenant_id', $user->tenant_id);
        }
    }

    public function extend(Builder $builder): void
    {
        // Only SaaS admin (super_admin) can bypass tenant scope
        $builder->macro('withoutTenantScope', function (Builder $builder) {
            if (auth()->user()?->isSuperAdmin()) {
                return $builder->withoutGlobalScope(static::class);
            }

            // Log attempted bypass by non-super-admin
            AuditLogService::logSecurityEvent(
                event: 'tenant_scope_bypass_attempted',
                details: [
                    'user_id' => auth()->id(),
                    'model' => get_class($builder->getModel()),
                ],
            );

            abort(403, 'Unauthorized: Cannot bypass tenant isolation.');
        });
    }
}
```

#### Middleware: SetTenantId

Resolves tenant from the authenticated user and injects into the request:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetTenantId
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // 1. Verify user's tenant is active
        $tenant = $user->tenant;
        if (! $tenant || ! $tenant->is_active) {
            auth()->guard('web')->logout();
            auth()->guard('sanctum')->forgetUser();

            return response()->json([
                'message' => 'Organization account is inactive.',
            ], 403);
        }

        // 2. Set tenant_id on request for controller access
        $request->attributes->set('tenant_id', $user->tenant_id);

        // 3. Set PostgreSQL session variable for Row-Level Security (Layer 2)
        try {
            \DB::statement("SET LOCAL app.tenant_id = ?", [$user->tenant_id]);
        } catch (\Exception $e) {
            \Log::critical('Failed to set tenant session variable for RLS', [
                'user_id' => $user->id,
                'tenant_id' => $user->tenant_id,
                'error' => $e->getMessage(),
            ]);
            // Fail closed — if RLS can't be set, deny access
            abort(500, 'Security configuration error.');
        }

        return $next($request);
    }
}
```

**What this prevents:** Any cross-tenant data access through the normal application flow (Eloquent queries, API endpoints, controllers).

---

### 5.2 Database Level — PostgreSQL Row-Level Security (Layer 2)

Even if the application scope fails (bugAbug, circumvented query, raw SQL), the database itself prevents cross-tenant reads.

#### Enable RLS on All Tenant-Scoped Tables

```sql
-- ============================================================
-- ROW-LEVEL SECURITY FOR TRIMEDCAST MULTI-TENANT ISOLATION
-- ============================================================
-- This is defense-in-depth: even if the application layer
-- (Eloquent TenantScope) fails, the database enforces isolation.
-- ============================================================

-- Step 1: Enable RLS on each tenant-scoped table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_index_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_api_keys ENABLE ROW LEVEL SECURITY;

-- Step 2: Create RLS policies for each table
-- Pattern: Allow all operations only when tenant_id matches session variable

CREATE POLICY tenant_isolation ON products
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON inventory
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON sales_orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON sales_order_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON purchase_orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON purchase_order_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON suppliers
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON forecast_results
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON forecast_settings
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::C:uuid);

CREATE POLICY tenant_isolation ON promo_events
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON promo_index_adjustments
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON sop_stages
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON audit_log
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY tenant_isolation ON service_api_keys
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Step 3: Grant table access ONLY through the app role (not superuser)
-- The app connects as 'trimedcast_app' role, which is subject to RLS
-- Superuser (migrations) bypasses RLS — this is intentional for admin ops

-- Step 4: Verification queries (run after setup)
-- Confirm RLS is enabled:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

-- Confirm policies exist:
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

#### SaaS Admin Bypass

```sql
-- The SaaS admin (super_admin role) needs cross-tenant access.
-- Connect as a superuser or role with BYPASSRLS for admin operations:

-- Option A: Superuser (migration user) — automatically bypasses RLS
-- Option B: Dedicated admin role with BYPASSRLS privilege
ALTER ROLE trimedcast_admin BYPASSRLS;

-- Application code must explicitly use this role only in
-- admin-only contexts (tenant provisioning, billing, support).
```

---

### 5.3 Cache/Queue Level (Layer 3)

#### Tenant-Prefixed Redis Keys

All Redis cache keys are prefixed with the tenant ID to prevent cache poisoning or data leakage between tenants.

```php
<?php

namespace App\Services\Cache;

use Illuminate\Support\Facades\Cache;

class TenantCacheService
{
    /**
     * Build a tenant-scoped cache key.
     * Format: tenant:{tenant_id}:{key_name}
     */
    private static function key(string $key): string
    {
        $tenantId = auth()->user()?->tenant_id ?? 'global';

        return "tenant:{$tenantId}:{$key}";
    }

    /**
     * Get a value from tenant-scoped cache.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::get(self::key($key), $default);
    }

    /**
     * Put a value into tenant-scoped cache.
     */
    public static function put(string $key, mixed $value, ?int $ttlSeconds = null): bool
    {
        return $ttlSeconds
            ? Cache::put(self::key($key), $value, $ttlSeconds)
            : Cache::put(self::key($key), $value);
    }

    /**
     * Forget a tenant-scoped cache key.
     */
    public static function forget(string $key): bool
    {
        return Cache::forget(self::key($key));
    }

    /**
     * Flush all cache keys for the current tenant.
     * Used during data imports or major updates.
     */
    public static function flushTenant(): bool
    {
        $tenantId = auth()->user()?->tenant_id;
        if (! $tenantId) {
            return false;
        }

        // Use Redis SCAN to find and delete all keys for this tenant
        $redis = Cache::getRedis();
        $pattern = "tenant:{$tenantId}:*";

        $cursor = '0';
        do {
            [$cursor, $keys] = $redis->scan($cursor, ['match' => $pattern, 'count' => 100]);
            if (! empty($keys)) {
                $redis->del(...$keys);
            }
        } while ($cursor !== '0');

        return true;
    }
}
```

#### Usage Examples

```php
// Cache forecast results per tenant
TenantCacheService::put(
    "forecast:{$productCategory}:{$period}",
    $forecastData,
    3600 // 1 hour TTL
);

// Retrieve cached inventory summary
$inventorySummary = TenantCacheService::get('inventory:summary');

// Flush tenant cache after bulk import
TenantCacheService::flushTenant();
```

#### Tenant-Tagged Queued Jobs

All queued jobs are tagged with the tenant ID to ensure job results are only accessible within the correct tenant.

```php
<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateForecastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $tenantId,    // Always passed explicitly — never inferred from auth()
        public string $productCategory,
        public string $period,
        public array $parameters,
    ) {
        // Tag the job with tenant ID for monitoring and isolation
        $this->onQueue("tenant-{$this->tenantId}");
    }

    public function handle(): void
    {
        // Set the tenant context for this job
        // (auth()->user() is NOT available in queue workers)
        \DB::statement("SET LOCAL app.tenant_id = ?", [$this->tenantId]);

        // ... perform forecast generation ...

        // Cache results under tenant-scoped key
        TenantCacheService::put(
            "forecast:{$this->productCategory}:{$this->period}",
            $results,
            3600
        );
    }
}
```

---

### 5.4 Audit and Monitoring for Tenant Isolation

#### Cross-Tenant Access Detection

```php
<?php

namespace App\Services\Security;

use App\Enums\SecurityEventType;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class TenantIsolationMonitor
{
    /**
     * Log and alert on any cross-tenant access attempt.
     * Called from TenantScope, Policies, and Middleware.
     */
    public static function logViolation(
        string $attemptType,
        array $details,
    ): void {
        $logEntry = [
            'event' => 'tenant_isolation_violation',
            'severity' => 'critical',
            'attempt_type' => $attemptType,
            'user_id' => auth()->id(),
            'user_tenant_id' => auth()->user()?->tenant_id,
            'target_tenant_id' => $details['target_tenant_id'] ?? null,
            'resource_type' => $details['resource_type'] ?? null,
            'resource_id' => $details['resource_id'] ?? null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'timestamp' => now()->toIso8601String(),
            'details' => $details,
        ];

        // 1. Log to security-specific channel
        Log::channel('security')->critical(
            'Tenant isolation violation attempted',
            $logEntry
        );

        // 2. Write to audit_log table
        \App\Models\AuditLog::create([
            'tenant_id' => auth()->user()?->tenant_id,
            'user_id' => auth()->id(),
            'entity_type' => 'security',
            'entity_id' => null,
            'action' => 'tenant_isolation_violation',
            'previous_value' => null,
            'new_value' => $logEntry,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'is_security_event' => true,
        ]);

        // 3. Alert SaaS admin immediately
        Notification::route('mail', config('trimedcast.security_admin_email'))
            ->notify(new \App\Notifications\TenantIsolationViolationNotification($logEntry));

        // 4. Alert Slack/Teams if configured
        if (config('trimedcast.security_alerts_slack')) {
            Notification::route('slack', config('trimedcast.security_alerts_slack_webhook'))
                ->notify(new \App\Notifications\TenantIsolationViolationNotification($logEntry));
        }
    }
}
```

#### Daily Isolation Verification Scan

```php
<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TenantIsolationScanJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Daily job: Verify no data leaks exist via direct DB queries.
     * Scans for any foreign key references that might cross tenant boundaries.
     */
    public function handle(): void
    {
        $violations = [];

        // Check 1: Sales order items referencing products from different tenant
        $crossTenantItems = DB::table('sales_order_items as soi')
            ->join('products as p', 'soi.product_id', '=', 'p.id')
            ->join('sales_orders as so', 'soi.sales_order_id', '=', 'so.id')
            ->whereColumn('so.tenant_id', '!=', 'p.tenant_id')
            ->select(['soi.id', 'so.tenant_id as order_tenant', 'p.tenant_id as product_tenant'])
            ->get();

        if ($crossTenantItems->isNotEmpty()) {
            $violations[] = [
                'type' => 'cross_tenant_sales_order_item',
                'count' => $crossTenantItems->count(),
                'details' => $crossTenantItems->take(10),
            ];
        }

        // Check 2: Purchase order items referencing suppliers from different tenant
        $crossTenantPOItems = DB::table('purchase_order_items as poi')
            ->join('suppliers as s', 'poi.supplier_id', '=', 's.id')
            ->join('purchase_orders as po', 'poi.purchase_order_id', '=', 'po.id')
            ->whereColumn('po.tenant_id', '!=', 's.tenant_id')
            ->select(['poi.id', 'po.tenant_id as po_tenant', 's.tenant_id as supplier_tenant'])
            ->get();

        if ($crossTenantPOItems->isNotEmpty()) {
            $violations[] = [
                'type' => 'cross_tenant_purchase_order_item',
                'count' => $crossTenantPOItems->count(),
                'details' => $crossTenantPOItems->take(10),
            ];
        }

        // Check 3: Verify RLS policies are still active on all tables
        $rlsDisabled = DB::table('pg_tables')
            ->where('schemaname', 'public')
            ->whereIn('tablename', [
                'products', 'inventory', 'sales_orders', 'purchase_orders',
                'suppliers', 'forecast_results', 'forecast_settings',
                'promo_events', 'audit_log', 'users',
            ])
            ->where('rowsecurity', false)
            ->pluck('tablename');

        if ($rlsDisabled->isNotEmpty()) {
            $violations[] = [
                'type' => 'rls_disabled',
                'tables' => $rlsDisabled->toArray(),
            ];
        }

        // Report results
        if (empty($violations)) {
            Log::info('Tenant isolation scan: PASSED — no violations detected.');
        } else {
            Log::critical('Tenant isolation scan: FAILED — violations detected!', $violations);
            // Alert SaaS admin
            Notification::route('mail', config('trimedcast.security_admin_email'))
                ->notify(new \App\Notifications\TenantIsolationScanFailedNotification($violations));
        }
    }
}

// Schedule: app/Console/Kernel.php
// $schedule->job(new TenantIsolationScanJob)->dailyAt('02:00');
```

---

### 5.5 Tenant Isolation Summary

| Layer | Mechanism | What It Prevents | Failure Mode |
|-------|-----------|------------------|-------------|
| **Layer 1: Application** | Eloquent TenantScope + SetTenantId middleware | Cross-tenant queries via application code | Bypassed by raw SQL, bug in scope |
| **Layer 2: Database** | PostgreSQL Row-Level Security (RLS) | Cross-tenant reads/writes at DB level, even with raw SQL | Disabled by superuser, session var not set |
| **Layer 3: Cache/Queue** | Tenant-prefixed Redis keys + tenant-tagged jobs | Cache poisoning, job result leakage | Wrong prefix, shared cache without prefix |
| **Monitoring** | Audit logging + daily isolation scan | Undetected violations over time | Logging disabled, scan not running |

**All three layers must be active simultaneously. If any layer is disabled, the system must alert immediately.**

---

## 6. Data Protection

### 6.1 Sensitive Fields

#### Field Visibility Rules

| Field | Visible To | Hidden From | Rationale |
|-------|-----------|-------------|-----------|
| `unit_cost_bdt` | `warehouse_manager`, `finance`, `executive` | `sales_manager`, `marketing_manager` | Cost data is competitively sensitive; sales/marketing should not see margins |
| `margin_bdt` (computed) | `warehouse_manager`, `finance`, `executive` | `sales_manager`, `marketing_manager` | Derived from unit_cost — same restriction applies |
| `margin_pct` (computed) | `warehouse_manager`, `finance`, `executive` | `sales_manager`, `marketing_manager` | Derived from unit_cost — same restriction applies |
| `supplier_unit_price` | `warehouse_manager`, `executive` | `sales_manager`, `marketing_manager`, `finance` | Supplier pricing is contractually sensitive; even finance sees only aggregate costs |
| `supplier_contract_terms` | `warehouse_manager`, `executive` | `sales_manager`, `marketing_manager`, `finance` | Contract details (exclusivity, payment terms) restricted to operations + leadership |
| `supplier_payment_terms` | `warehouse_manager`, `executive` | `sales_manager`, `marketing_manager`, `finance` | Payment terms are operationally relevant but not for sales/marketing/analyst |
| `eoq_total_cost` | `warehouse_manager`, `finance`, `executive` | `sales_manager`, `marketing_manager` | EOQ cost calculations include unit cost data |
| `po_total_value_bdt` | `warehouse_manager`, `finance`, `executive` | `sales_manager`, `marketing_manager` | Purchase order totals reveal cost structure |
| `inventory_value_bdt` | `warehouse_manager`, `finance`, `executive` | `sales_manager`, `marketing_manager` | Inventory valuation requires cost data |
| `forecast_settings.*` | `warehouse_manager` (CRUD) | `sales_manager` (no access), `marketing_manager` (no access), `finance` (read-only), `executive` (read-only) | Algorithm parameters are operationally sensitive |
| `safety_stock_override` | `warehouse_manager`, `finance`, `executive` | `sales_manager`, `marketing_manager` | Override values require governance context |
| `reorder_point_override` | `warehouse_manager`, `finance`, `executive` | `sales_manager`, `marketing_manager` | Override values require governance context |

#### Field Visibility Middleware

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class StripSensitiveFields
{
    /**
     * Strip sensitive fields from API responses based on user role.
     * This is a safety net — API Resources should already exclude these fields,
     * but this middleware catches any that slip through.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $request->user()) {
            return $response;
        }

        $restrictedFields = $request->user()->restrictedFields();

        if (empty($restrictedFields)) {
            return $response;
        }

        // Only process JSON responses
        if (! $response->headers->has('Content-Type') ||
            ! str_contains($response->headers->get('Content-Type'), 'application/json')) {
            return $response;
        }

        $data = json_decode($response->getContent(), true);

        if (! $data) {
            return $response;
        }

        $data = $this->stripFields($data, $restrictedFields);

        $response->setContent(json_encode($data));

        return $response;
    }

    private function stripFields(array $data, array $fields): array
    {
        foreach ($fields as $field) {
            unset($data[$field]);
        }

        // Also strip from nested 'data' key (Laravel pagination wrapper)
        if (isset($data['data']) && is_array($data['data'])) {
            if (array_is_list($data['data'])) {
                // Collection: strip from each item
                $data['data'] = array_map(
                    fn ($item) => $this->stripFields($item, $fields),
                    $data['data']
                );
            } else {
                // Single resource
                $data['data'] = $this->stripFields($data['data'], $fields);
            }
        }

        return $data;
    }
}
```

---

### 6.2 Encryption

| Layer | Mechanism | Implementation |
|-------|-----------|----------------|
| **At rest (DB)** | PostgreSQL TDE or column-level encryption | See SQL below |
| **At rest (API keys)** | Laravel `Crypt` facade (AES-256-CBC) | `Crypt::encryptString()` / `Crypt::decryptString()` |
| **In transit (all)** | TLS 1.3 | Enforced on LB, app server, DB, Redis connections |
| **In transit (DB)** | PostgreSQL SSL mode `verify-full` | `PGSSLROOTCERT`, `PGSSLMODE=verify-full` |
| **In transit (Redis)** | TLS with certificate verification | `REDIS_CLIENT=predis`, `REDIS_TLS=true` |
| **Passwords** | bcrypt with cost factor 12 | Laravel default, configured in `AppServiceProvider` |
| **2FA secrets** | Encrypted at rest, decrypted only in memory | `Crypt::encryptString()` for `two_factor_secret` |

#### PostgreSQL Column-Level Encryption for High-Sensitivity Fields

```sql
-- For fields that need encryption beyond TDE (e.g., supplier contract terms,
-- API keys, 2FA secrets), use PostgreSQL pgcrypto extension.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypt supplier contract terms at column level
-- The application handles encrypt/decrypt using Laravel's Crypt facade,
-- which stores AES-256-CBC encrypted values in a TEXT column.

-- This is preferred over pgcrypto because Laravel's Crypt is
-- consistent across all encryption needs (API keys, 2FA, etc.)
-- and uses the APP_KEY for key derivation.
```

#### bcrypt Cost Factor Configuration

```php
<?php

// app/Providers/AppServiceProvider.php

use Illuminate\Hashing\HashManager;

public function boot(): void
{
    // Set bcrypt cost factor to 12 (default is 10)
    // This increases hash computation time but significantly
    // improves resistance to brute-force attacks.
    // As of 2025, cost 12 is recommended for production.
    $this->app->make(HashManager::class)->setDefaultDriver('bcrypt');

    // Note: Laravel 11+ uses bcrypt cost 12 by default.
    // For earlier versions, set in config/hashing.php:
}
```

```php
<?php

// config/hashing.php

return [
    'driver' => 'bcrypt',

    'bcrypt' => [
        'rounds' => env('BCRYPT_ROUNDS', 12),
        'verify' => env('BCRYPT_VERIFY', true),
    ],

    'argon' => [
        'memory' => 65536,
        'threads' => 1,
        'time' => 4,
        'verify' => true,
    ],
];
```

#### TLS Configuration Checklist

```
✅ Application Server: Enforce TLS 1.3, disable TLS 1.0/1.1/1.2
✅ Database (PostgreSQL): sslmode=verify-full, root cert from CA
✅ Redis: TLS enabled, certificate verification on
✅ Load Balancer: TLS termination, forward to app over private network
✅ API Clients: Verify TLS certificates, no certificate pinning (allow rotation)
✅ HSTS Header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

### 6.3 Data Export (Tenant Portability)

#### Enterprise Tier Data Export

```php
<?php

namespace App\Jobs;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TenantDataExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $tenantId,
        public string $requestedByUserId,
        public string $format = 'json', // 'json' or 'csv'
    ) {
        $this->onQueue('exports');
    }

    public function handle(): void
    {
        // Verify requester is warehouse_manager or executive
        $requester = User::withoutTenantScope()->find($this->requestedByUserId);
        if (! $requester->isWarehouseManager() && ! $requester->isExecutive()) {
            Log::warning('Unauthorized data export attempt', [
                'user_id' => $this->requestedByUserId,
                'tenant_id' => $this->tenantId,
            ]);
            return;
        }

        // Verify tenant is enterprise tier
        $tenant = DB::table('tenants')->where('id', $this->tenantId)->first();
        if ($tenant->tier !== 'enterprise') {
            throw new \Exception('Data export is only available on enterprise tier.');
        }

        // Export all tenant-scoped tables
        $tables = [
            'products', 'inventory', 'sales_orders', 'sales_order_items',
            'purchase_orders', 'purchase_order_items', 'suppliers',
            'forecast_results', 'forecast_settings', 'promo_events',
            'promo_index_adjustments', 'sop_stages', 'users',
        ];

        $exportData = [];
        foreach ($tables as $table) {
            $exportData[$table] = DB::table($table)
                ->where('tenant_id', $this->tenantId)
                ->get()
                ->toArray();
        }

        // EXCLUDE: System metadata, other tenants' data
        // The tenant scope ensures only this tenant's data is included.

        // Write to storage
        $filename = "exports/tenant_{$this->tenantId}_" . now()->format('Y-m-d_His');

        if ($this->format === 'json') {
            $path = "{$filename}.json";
            Storage::put($path, json_encode($exportData, JSON_PRETTY_PRINT));
        } else {
            // CSV: one file per table, zipped together
            $path = $this->exportAsCsv($exportData, $filename);
        }

        // Notify requester
        $requester->notify(new \App\Notifications\DataExportReadyNotification($path));

        // Audit log
        \App\Models\AuditLog::create([
            'tenant_id' => $this->tenantId,
            'user_id' => $this->requestedByUserId,
            'entity_type' => 'tenant',
            'entity_id' => $this->tenantId,
            'action' => 'data_export',
            'new_value' => ['format' => $this->format, 'path' => $path],
            'is_security_event' => true,
        ]);
    }
}
```

---

### 6.4 Data Retention

| Data Category | Retention Period | Storage Strategy | Archive Action |
|---------------|-----------------|------------------|----------------|
| **Sales/Purchase History** | 5 years | PostgreSQL table partitioning by year | Old partitions archived to S3 (Parquet format) |
| **Audit Log** | 3 years | PostgreSQL table partitioning by month | Old partitions moved to cold storage (S3 Glacier) |
| **Forecast Results** | 2 years | Partitioned by forecast_date | Old partitions archived; accuracy stats retained indefinitely |
| **Deleted Records** | 30 days soft delete | `deleted_at` timestamp | Hard delete via scheduled job after 30 days |
| **User Sessions** | 24 hours | Redis with TTL | Auto-expired |
| **API Tokens** | 24 hours (SPA), 30 days (mobile) | Database + Redis | Auto-expired + cleanup job |
| **Cache Data** | 1 hour (default) | Redis with TTL | Auto-expired |

#### Partitioning Example — Sales Orders

```sql
-- Create partitioned sales_orders table for efficient retention management
CREATE TABLE sales_orders (
    id              UUID NOT NULL,
    tenant_id       UUID NOT NULL,
    order_date      DATE NOT NULL,
    customer_name   VARCHAR(255),
    status          VARCHAR(50),
    total_amount    DECIMAL(12,2),
    created_by      UUID,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at      TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (id, order_date)
) PARTITION BY RANGE (order_date);

-- Create yearly partitions (current year + 5 years back)
CREATE TABLE sales_orders_2020 PARTITION OF sales_orders
    FOR VALUES FROM ('2020-01-01') TO ('2021-01-01');
CREATE TABLE sales_orders_2021 PARTITION OF sales_orders
    FOR VALUES FROM ('2021-01-01') TO ('2022-01-01');
CREATE TABLE sales_orders_2022 PARTITION OF sales_orders
    FOR VALUES FROM ('2022-01-01') TO ('2023-01-01');
CREATE TABLE sales_orders_2023 PARTITION OF sales_orders
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
CREATE TABLE sales_orders_2024 PARTITION OF sales_orders
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE sales_orders_2025 PARTITION OF sales_orders
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Archive partition (data older than 5 years)
-- DETACH the partition, export to S3 as Parquet, then drop
-- ALTER TABLE sales_orders DETACH PARTITION sales_orders_2020;
-- (Export sales_orders_2020 to S3 via pg_dump or COPY)
-- DROP TABLE sales_orders_2020;
```

#### Soft Delete Cleanup Job

```php
<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;

class SoftDeleteCleanupJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Hard delete records that have been soft-deleted for more than 30 days.
     * Runs daily at 03:00.
     */
    public function handle(): void
    {
        $cutoff = now()->subDays(30);

        $models = [
            \App\Models\Product::class,
            \App\Models\Supplier::class,
            \App\Models\SalesOrder::class,
            \App\Models\PurchaseOrder::class,
            \App\Models\PromoEvent::class,
        ];

        foreach ($models as $model) {
            $deleted = $model::onlyTrashed()
                ->where('deleted_at', '<', $cutoff)
                ->forceDelete();

            if ($deleted > 0) {
                Log::info("Hard deleted {$deleted} records from {$model}", [
                    'cutoff' => $cutoff->toDateString(),
                ]);
            }
        }
    }
}

// Schedule: app/Console/Kernel.php
// $schedule->job(new SoftDeleteCleanupJob)->dailyAt('03:00');
```

---

## 7. Security Audit Trail

### 7.1 What Gets Logged

Every data modification in TrimedCast is auditable. The `audit_log` table is **append-only** — records can never be updated or deleted (except by the daily partition archival process).

#### Audit Log Schema

```sql
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    user_id         UUID,               -- NULL for system actions
    entity_type     VARCHAR(100) NOT NULL, -- 'product', 'inventory', 'sales_order', etc.
    entity_id       UUID NOT NULL,
    action          VARCHAR(50) NOT NULL,  -- 'create', 'update', 'delete', 'override', 'approve'
    previous_value  JSONB,              -- Full snapshot before change (NULL for create)
    new_value       JSONB,              -- Full snapshot after change (NULL for delete)
    changed_fields  JSONB,              -- List of field names that changed
    governance_note TEXT,               -- Required for manual overrides
    ip_address      INET,
    user_agent      TEXT,
    is_security_event BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for audit log
CREATE TABLE audit_log_2025_01 PARTITION OF audit_log
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE audit_log_2025_02 PARTITION OF audit_log
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... (auto-created by partition maintenance job)

CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_security ON audit_log(is_security_event) WHERE is_security_event = true;

-- Make audit_log truly append-only
-- Revoke UPDATE and DELETE from application role
REVOKE UPDATE, DELETE ON audit_log FROM trimedcast_app;
```

#### Audit Log Service

```php
<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

class AuditLogService
{
    /**
     * Log a data modification event.
     */
    public static function log(
        string $action,
        Model $entity,
        ?array $previousValue = null,
        ?array $newValue = null,
        ?string $governanceNote = null,
    ): AuditLog {
        // Compute changed fields
        $changedFields = null;
        if ($previousValue && $newValue) {
            $changedFields = array_keys(array_diff_assoc($newValue, $previousValue));
        }

        return AuditLog::create([
            'tenant_id' => auth()->user()?->tenant_id ?? $entity->tenant_id,
            'user_id' => auth()->id(),
            'entity_type' => class_basename($entity),
            'entity_id' => $entity->id,
            'action' => $action,
            'previous_value' => $previousValue,
            'new_value' => $newValue,
            'changed_fields' => $changedFields,
            'governance_note' => $governanceNote,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'is_security_event' => false,
        ]);
    }

    /**
     * Log a security event (cross-tenant attempt, failed login, etc.)
     */
    public static function logSecurityEvent(
        string $event,
        array $details,
    ): AuditLog {
        return AuditLog::create([
            'tenant_id' => auth()->user()?->tenant_id,
            'user_id' => auth()->id(),
            'entity_type' => 'security',
            'entity_id' => null,
            'action' => $event,
            'previous_value' => null,
            'new_value' => $details,
            'changed_fields' => null,
            'governance_note' => null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'is_security_event' => true,
        ]);
    }
}
```

#### Auditable Model Trait

```php
<?php

namespace App\Models\Concerns;

use App\Services\AuditLogService;
use Illuminate\Database\Eloquent\Model;

trait Auditable
{
    /**
     * Boot the Auditable trait.
     * Automatically logs all create, update, and delete events.
     */
    public static function bootAuditable(): void
    {
        // Log on create
        static::created(function (Model $model) {
            AuditLogService::log(
                action: 'create',
                entity: $model,
                previousValue: null,
                newValue: $model->fresh()->toArray(),
            );
        });

        // Log on update
        static::updated(function (Model $model) {
            AuditLogService::log(
                action: 'update',
                entity: $model,
                previousValue: array_intersect_key(
                    $model->getOriginal(),
                    $model->getChanges()
                ),
                newValue: $model->getChanges(),
            );
        });

        // Log on delete
        static::deleted(function (Model $model) {
            AuditLogService::log(
                action: $model->isForceDeleting() ? 'force_delete' : 'soft_delete',
                entity: $model,
                previousValue: $model->toArray(),
                newValue: null,
            );
        });
    }
}
```

---

### 7.2 Governance Note Requirement

Any manual override of a calculated value **must** include a `governance_note`. The system rejects the override without it. This ensures traceability for all human interventions in the automated forecasting and inventory optimization system.

#### Override Validation Trait

```php
<?php

namespace App\Models\Concerns;

use App\Services\AuditLogService;

trait RequiresGovernanceNote
{
    /**
     * Override a calculated field with a governance note.
     *
     * @throws \InvalidArgumentException if governance_note is missing
     */
    public function overrideField(
        string $field,
        mixed $newValue,
        string $governanceNote,
    ): static {
        // Validate governance note is present and meaningful
        if (empty($governanceNote) || strlen(trim($governanceNote)) < 10) {
            throw new \InvalidArgumentException(
                'A governance note of at least 10 characters is required when overriding calculated values. ' .
                'Explain why the system-calculated value is being overridden.'
            );
        }

        $previousValue = $this->getAttribute($field);

        // Apply the override
        $this->setAttribute($field, $newValue);
        $this->setAttribute("{$field}_override", true);
        $this->setAttribute("{$field}_governance_note", $governanceNote);
        $this->setAttribute("{$field}_overridden_by", auth()->id());
        $this->setAttribute("{$field}_overridden_at", now());
        $this->save();

        // Log with governance note prominently stored
        AuditLogService::log(
            action: 'override',
            entity: $this,
            previousValue: [$field => $previousValue],
            newValue: [$field => $newValue],
            governanceNote: $governanceNote,
        );

        return $this;
    }
}
```

#### Controller Example — Override Safety Stock

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\OverrideForecastRequest;
use App\Models\Inventory;
use App\Models\Concerns\RequiresGovernanceNote;

class InventoryOverrideController extends Controller
{
    public function overrideSafetyStock(
        OverrideForecastRequest $request,
        Inventory $inventory,
    ) {
        $this->authorize('update', $inventory);

        try {
            $inventory->overrideField(
                field: 'safety_stock_qty',
                newValue: $request->input('new_value'),
                governanceNote: $request->input('governance_note'),
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'field' => 'governance_note',
            ], 422);
        }

        return response()->json([
            'message' => 'Safety stock overridden successfully.',
            'data' => new \App\Http\Resources\InventoryResource($inventory->fresh()),
        ]);
    }
}
```

---

### 7.3 Security Events

Special audit events that trigger alerts and monitoring:

| Event | Severity | Alert | Description |
|-------|----------|-------|-------------|
| `tenant_isolation_violation` | 🔴 Critical | Immediate (email + Slack) | Any attempted or successful cross-tenant data access |
| `failed_login` | 🟡 Warning | After 5 attempts | Failed login attempt; 5th triggers 15-min lockout |
| `account_lockout` | 🟠 High | Email to user + admin | Account locked due to repeated failed logins |
| `role_escalation_attempt` | 🔴 Critical | Immediate | Attempt to elevate own role or assign `warehouse_manager` |
| `bulk_data_export` | 🟠 High | Email to admin | Any data export operation (potential data exfiltration) |
| `override_without_governance_note` | 🔴 Critical | Immediate | System rejected an override without governance note |
| `api_key_unexpected_ip` | 🟠 High | Email to admin | API key used from IP not in whitelist |
| `api_key_expired` | 🟡 Warning | Log only | API key used after expiration |
| `rls_policy_disabled` | 🔴 Critical | Immediate (all channels) | RLS policy disabled on any table |
| `forecast_override` | 🟡 Warning | Log + governance panel | Manual override of calculated forecast value |
| `sop_stage_advanced` | 🟢 Info | Log only | S&OP stage advanced to next phase |
| `sop_stage_rejected` | 🟡 Warning | Email to stakeholders | S&OP stage rejection (requires explanation) |

#### Failed Login Handler

```php
<?php

namespace App\Services\Security;

use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\RateLimiter;

class LoginSecurityService
{
    /**
     * Handle a failed login attempt.
     * After 5 failures, lock the account for 15 minutes.
     */
    public static function handleFailedLogin(string $email, string $ip): void
    {
        $throttleKey = "login:{$email}:{$ip}";
        $attempts = RateLimiter::attempts($throttleKey);

        // Log the failed attempt
        AuditLogService::logSecurityEvent('failed_login', [
            'email' => $email,
            'ip' => $ip,
            'attempt_number' => $attempts,
        ]);

        // After 5 attempts, lock the account
        if ($attempts >= 5) {
            $user = User::where('email', $email)->first();
            if ($user) {
                // Lock for 15 minutes
                RateLimiter::hit($throttleKey, 900); // 15 minutes in seconds

                AuditLogService::logSecurityEvent('account_lockout', [
                    'email' => $email,
                    'user_id' => $user->id,
                    'tenant_id' => $user->tenant_id,
                    'ip' => $ip,
                    'lockout_duration' => '15 minutes',
                ]);

                // Notify user and admin
                $user->notify(new \App\Notifications\AccountLockoutNotification());
            }
        }
    }

    /**
     * Check if an account is currently locked out.
     */
    public static function isLockedOut(string $email, string $ip): bool
    {
        return RateLimiter::tooManyAttempts("login:{$email}:{$ip}", 5);
    }

    /**
     * Get the remaining lockout time in seconds.
     */
    public static function lockoutRemaining(string $email, string $ip): int
    {
        return RateLimiter::availableIn("login:{$email}:{$ip}");
    }

    /**
     * Clear the lockout on successful login.
     */
    public static function clearLockout(string $email, string $ip): void
    {
        RateLimiter::clear("login:{$email}:{$ip}");
    }
}
```

---

## 8. Two-Factor Authentication (Enterprise Tier)

### 8.1 Configuration

| Parameter | Value |
|-----------|-------|
| **Algorithm** | TOTP (RFC 6238) |
| **App** | Google Authenticator, Authy, 1Password compatible |
| **Required for** | `executive` role (mandatory), `warehouse_manager` (recommended, optional) |
| **Optional for** | All other roles (user can opt in) |
| **Recovery codes** | 8 single-use codes, generated on setup |
| **Code validity** | 30-second window (standard TOTP) |
| **Implementation** | Custom middleware + Laravel Fortify foundation |

### 8.2 Two-Factor Setup

```php
<?php

namespace App\Services\Security;

use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\Style;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\Crypt;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorAuthService
{
    private Google2FA $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    /**
     * Generate a new 2FA secret for a user.
     * Returns the secret and a QR code URI for the authenticator app.
     */
    public function enable(User $user): array
    {
        $secret = $this->google2fa->generateSecretKey();

        // Store encrypted secret (never store in plaintext)
        $user->update([
            'two_factor_secret' => Crypt::encryptString($secret),
        ]);

        // Generate QR code URI
        $qrCodeUri = $this->google2fa->getQRCodeUrl(
            companyName: config('app.name'),     // 'TrimedCast'
            companyEmail: $user->email,
            secret: $secret,
        );

        // Generate recovery codes
        $recoveryCodes = $this->generateRecoveryCodes();
        $user->update([
            'two_factor_recovery_codes' => Crypt::encryptString(
                json_encode($recoveryCodes)
            ),
        ]);

        return [
            'secret' => $secret,          // Show ONCE — for manual entry
            'qr_code_uri' => $qrCodeUri,  // For QR code generation on frontend
            'recovery_codes' => $recoveryCodes, // Show ONCE — user must save these
        ];
    }

    /**
     * Verify a TOTP code and confirm 2FA setup.
     */
    public function confirm(User $user, string $code): bool
    {
        $secret = Crypt::decryptString($user->two_factor_secret);

        if (! $this->google2fa->verifyKey($secret, $code)) {
            return false;
        }

        $user->update([
            'two_factor_confirmed_at' => now(),
        ]);

        return true;
    }

    /**
     * Verify a TOTP code during login.
     */
    public function verify(User $user, string $code): bool
    {
        // Check if it's a recovery code
        if ($this->verifyRecoveryCode($user, $code)) {
            return true;
        }

        // Check TOTP code
        $secret = Crypt::decryptString($user->two_factor_secret);

        return $this->google2fa->verifyKey($secret, $code);
    }

    /**
     * Verify and consume a recovery code (single-use).
     */
    private function verifyRecoveryCode(User $user, string $code): bool
    {
        $recoveryCodes = json_decode(
            Crypt::decryptString($user->two_factor_recovery_codes),
            true
        );

        if (! in_array($code, $recoveryCodes)) {
            return false;
        }

        // Consume the recovery code (remove from list)
        $remainingCodes = array_values(array_diff($recoveryCodes, [$code]));
        $user->update([
            'two_factor_recovery_codes' => Crypt::encryptString(
                json_encode($remainingCodes)
            ),
        ]);

        // Alert if recovery codes running low
        if (count($remainingCodes) <= 2) {
            $user->notify(new \App\Notifications\RecoveryCodesLowNotification());
        }

        return true;
    }

    /**
     * Generate 8 cryptographically secure recovery codes.
     */
    private function generateRecoveryCodes(): array
    {
        return array_map(
            fn () => strtoupper(bin2hex(random_bytes(5))),
            range(1, 8)
        );
        // Example output: ['A1B2C3D4E5', 'F6G7H8I9J0', ...]
    }
}
```

### 8.3 Two-Factor Middleware

```php
<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireTwoFactor
{
    /**
     * Require 2FA for executive role (mandatory).
     * Warn (but allow) for warehouse_manager without 2FA.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Executive: 2FA is MANDATORY
        if ($user->isExecutive() && ! $user->hasTwoFactorEnabled()) {
            return response()->json([
                'message' => 'Two-factor authentication is required for executive accounts. Please enable 2FA before continuing.',
                'action' => 'enable_2fa',
            ], 403);
        }

        // Check if 2FA challenge is pending (after login, before 2FA code entered)
        if ($user->hasTwoFactorEnabled() && session('2fa:pending')) {
            return response()->json([
                'message' => 'Two-factor authentication challenge pending.',
                'action' => 'verify_2fa',
            ], 403);
        }

        return $next($request);
    }
}
```

### 8.4 2FA Enforcement Policy

```php
<?php

// routes/api.php — Apply 2FA middleware after auth

Route::middleware(['auth:sanctum', 'tenant', '2fa.required'])->group(function () {
    // All authenticated routes require 2FA check (for executive)
    // ...
});

// 2FA setup and verification routes (exempt from 2fa.required)
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('auth/2fa/enable', [TwoFactorController::class, 'enable']);
    Route::post('auth/2fa/confirm', [TwoFactorController::class, 'confirm']);
    Route::post('auth/2fa/verify', [TwoFactorController::class, 'verify']);
    Route::post('auth/2fa/disable', [TwoFactorController::class, 'disable']);
    Route::get('auth/2fa/qr-code', [TwoFactorController::class, 'qrCode']);
    Route::get('auth/2fa/recovery-codes', [TwoFactorController::class, 'recoveryCodes']);
});
```

---

## 9. CORS and CSP

### 9.1 CORS Configuration

CORS is configured per-tenant. Each tenant has a set of allowed origins that can make cross-origin requests to the API.

#### Tenant CORS Configuration

```sql
-- Add allowed_origins column to tenants table
ALTER TABLE tenants ADD COLUMN allowed_origins JSONB DEFAULT '[]';

-- Example: Tenant with custom domain and local development
-- UPDATE tenants SET allowed_origins = '["https://shop.motorcycle-bd.com", "http://localhost:3000"]' WHERE id = '...';
```

#### Dynamic CORS Middleware

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantCorsMiddleware
{
    /**
     * Set CORS headers based on tenant's allowed origins.
     * This runs after the SetTenantId middleware has resolved the tenant.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $origin = $request->header('Origin');
        $user = $request->user();

        if (! $user || ! $origin) {
            return $response;
        }

        $allowedOrigins = $user->tenant?->allowed_origins ?? [];

        // Always allow the TrimedCast platform domain
        $allowedOrigins[] = config('app.url');
        $allowedOrigins[] = rtrim(config('app.url'), '/') . '/*'; // Wildcard for subdomains

        // Check if the request origin is allowed
        $isAllowed = false;
        foreach ($allowedOrigins as $allowed) {
            if (fnmatch($allowed, $origin)) {
                $isAllowed = true;
                break;
            }
        }

        if ($isAllowed) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Signature, X-Tenant-Id');
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Access-Control-Max-Age', '86400'); // 24 hours preflight cache
        } else {
            // Origin not in tenant's allowed list
            if ($request->isMethod('OPTIONS')) {
                return response('', 403);
            }
            // For non-preflight requests, simply don't set CORS headers
            // The browser will block the response
        }

        return $response;
    }
}
```

---

### 9.2 Content Security Policy (CSP)

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ContentSecurityPolicy
{
    /**
     * Set strict Content-Security-Policy headers to prevent XSS.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Build CSP header
        $csp = implode('; ', [
            "default-src 'self'",
            "script-src 'self' 'nonce-{$request->attributes->get('csp_nonce')}'",
            "style-src 'self' 'unsafe-inline'", // Required for Tailwind CSS
            "img-src 'self' data: https:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://api.trimedcast.app wss://api.trimedcast.app",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",  // Prevents clickjacking
            "upgrade-insecure-requests",
        ]);

        $response->headers->set('Content-Security-Policy', $csp);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // HTTP Strict Transport Security (HSTS)
        // 1 year, include all subdomains, preload into browser HSTS lists
        $response->headers->set(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
        );

        // Permissions Policy (formerly Feature-Policy)
        $response->headers->set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=()'
        );

        return $response;
    }
}
```

### 9.3 CSP Nonce Generation

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class GenerateCspNonce
{
    /**
     * Generate a CSP nonce for inline scripts.
     * Must run BEFORE the ContentSecurityPolicy middleware.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = base64_encode(random_bytes(32));
        $request->attributes->set('csp_nonce', $nonce);

        // Share with Blade views
        view()->share('cspNonce', $nonce);

        return $next($request);
    }
}
```

### 9.4 Security Headers Summary

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Strict policy (see above) | Prevents XSS by restricting resource sources |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 year, all subdomains |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking (framing) |
| `X-XSS-Protection` | `1; mode=block` | Browser XSS filter (legacy, defense in depth) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Disables browser features not needed |

---

## Appendix A: Security Configuration Checklist

Use this checklist when deploying TrimedCast to a new environment:

```
□ 1.  Application Level
  □ 1.1 TenantScope applied to all tenant-scoped models
  □ 1.2 SetTenantId middleware in global middleware stack
  □ 1.3 CheckRole / CheckPermission middleware on all protected routes
  □ 1.4 Policies registered for all resources
  □ 1.5 API Resources strip sensitive fields based on role
  □ 1.6 $fillable (not $guarded) on all models
  □ 1.7 Form Request validation on all input endpoints

□ 2.  Database Level
  □ 2.1 PostgreSQL RLS enabled on all tenant-scoped tables
  □ 2.2 RLS policies created (tenant_isolation)
  □ 2.3 App role does NOT have BYPASSRLS (only admin does)
  □ 2.4 Audit log table is append-only (REVOKE UPDATE, DELETE)
  □ 2.5 Partitioning configured for sales_orders, audit_log

□ 3.  Authentication & Encryption
  □ 3.1 Sanctum configured with stateful domains
  □ 3.2 Token expiration set (24h SPA, 30d mobile)
  □ 3.3 bcrypt cost factor = 12
  □ 3.4 APP_KEY is strong random value (32+ bytes)
  □ 3.5 TLS 1.3 enforced on all connections
  □ 3.6 PostgreSQL SSL mode = verify-full
  □ 3.7 Redis TLS enabled

□ 4.  API Security
  □ 4.1 Rate limiting configured (api, ai, forecast, import, global)
  □ 4.2 Service API keys stored as bcrypt hashes
  □ 4.3 HMAC signing implemented for service-to-service
  □ 4.4 Key rotation procedure documented
  □ 4.5 CORS configured per tenant
  □ 4.6 File upload validation (type, size, virus scan)

□ 5.  Security Headers
  □ 5.1 Content-Security-Policy set
  □ 5.2 Strict-Transport-Security set (1 year, includeSubDomains, preload)
  □ 5.3 X-Content-Type-Options: nosniff
  □ 5.4 X-Frame-Options: DENY
  □ 5.5 Referrer-Policy: strict-origin-when-cross-origin
  □ 5.6 Permissions-Policy set

□ 6.  Monitoring & Audit
  □ 6.1 Audit log capturing all data modifications
  □ 6.2 Governance note enforced for overrides
  □ 6.3 Security events logged (cross-tenant, failed login, etc.)
  □ 6.4 Tenant isolation scan job scheduled daily
  □ 6.5 Failed login lockout configured (5 attempts = 15 min)
  □ 6.6 Security alert channels configured (email, Slack)

□ 7.  Two-Factor Authentication
  □ 7.1 TOTP implementation tested with Google Authenticator
  □ 7.2 2FA mandatory for executive role
  □ 7.3 Recovery codes generated (8 single-use)
  □ 7.4 Recovery code low-balance notification configured

□ 8.  Data Protection
  □ 8.1 Sensitive field visibility rules implemented
  □ 8.2 Data retention policies configured
  □ 8.3 Soft delete cleanup job scheduled
  □ 8.4 Enterprise tier data export available
```

---

## Appendix B: Permission-Route Mapping Quick Reference

| Route | Required Permission | Additional Constraints |
|-------|-------------------|----------------------|
| `GET /api/products` | `product.read` | Field restriction via ProductResource |
| `POST /api/products` | `product.create` | — |
| `PUT /api/products/{id}` | `product.update` | Tenant scope + Policy |
| `DELETE /api/products/{id}` | `product.delete` | Tenant scope + Policy |
| `GET /api/inventory` | `inventory.read` | Field restriction via InventoryResource |
| `PUT /api/inventory/{id}` | `inventory.update` | Tenant scope + Policy |
| `POST /api/inventory/{id}/override` | `inventory.update` | Governance note required |
| `GET /api/sales-orders` | `sales_order.read` | RoleScope for sales_manager (own orders) |
| `POST /api/sales-orders` | `sales_order.create` | — |
| `PUT /api/sales-orders/{id}` | `sales_order.update` | Ownership check in SalesOrderPolicy |
| `GET /api/purchase-orders` | `purchase_order.read` | Field restriction via PurchaseOrderResource |
| `POST /api/purchase-orders` | `purchase_order.create` | — |
| `POST /api/forecasts/generate` | `forecast.create` | Rate limit: 10/min per tenant |
| `POST /api/forecasts/{id}/approve` | `forecast.approve` | — |
| `POST /api/sop/advance` | `sop.advance` | — |
| `POST /api/sop/{id}/approve` | `sop.approve` | — |
| `POST /api/promo-events` | `promo_event.create` | — |
| `PUT /api/promo-index/{id}` | `promo_index.update` | — |
| `GET /api/audit-log` | `audit_log.read` | — |
| `GET /api/financial-data` | `financial_data.read` | — |
| `POST /api/ai/query` | (any authenticated) | Rate limit: 20/min per user |
| `POST /api/imports/{type}` | `product.create` or `sales_order.create` | Rate limit: 5/min per tenant |

---

*Document generated for TrimedCast v1.0. For questions or updates, contact the platform engineering team.*
