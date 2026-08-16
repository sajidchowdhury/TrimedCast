'use client';

// ============================================
// API Contract Explorer - Interactive API Documentation
// Shows all v1 endpoints with method, path, description
// Allows inline testing with request builder
// ============================================

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- API Endpoint Registry ---

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  section: string;
  rbac?: string;
  requestBody?: string;
  queryParams?: string[];
}

const API_ENDPOINTS: ApiEndpoint[] = [
  // Auth
  { method: 'POST', path: '/api/v1/auth/register', description: 'Register new tenant + admin user', section: 'Authentication', requestBody: '{\n  "company_name": "My Shop",\n  "subdomain": "myshop",\n  "admin_name": "Admin",\n  "admin_email": "admin@myshop.com",\n  "password": "SecurePass123!"\n}' },
  { method: 'POST', path: '/api/v1/auth/login', description: 'Login and get auth token', section: 'Authentication', requestBody: '{\n  "email": "admin@myshop.com",\n  "password": "SecurePass123!"\n}' },
  { method: 'POST', path: '/api/v1/auth/logout', description: 'Revoke auth token', section: 'Authentication', rbac: 'Authenticated' },
  { method: 'GET', path: '/api/v1/auth/me', description: 'Get current user + tenant info', section: 'Authentication', rbac: 'Authenticated' },

  // Dashboard
  { method: 'GET', path: '/api/v1/dashboard', description: 'Dashboard KPIs — all metrics in one call', section: 'Dashboard' },

  // Products
  { method: 'GET', path: '/api/v1/products', description: 'List products (paginated, filtered)', section: 'Products', queryParams: ['page', 'per_page', 'category', 'search', 'supplier_id', 'low_stock', 'season_type'], rbac: 'All (read)' },
  { method: 'POST', path: '/api/v1/products', description: 'Create new product', section: 'Products', rbac: 'warehouse_manager', requestBody: '{\n  "sku_code": "BP-047",\n  "name": "Heavy Duty Chain",\n  "category": "chain",\n  "unit_cost_bdt": 1200,\n  "selling_price_bdt": 2200\n}' },
  { method: 'GET', path: '/api/v1/products/{id}', description: 'Get single product with relations', section: 'Products', rbac: 'All (read)' },
  { method: 'PUT', path: '/api/v1/products/{id}', description: 'Update product', section: 'Products', rbac: 'warehouse_manager', requestBody: '{ "name": "Updated Name", "unit_cost_bdt": 500 }' },
  { method: 'DELETE', path: '/api/v1/products/{id}', description: 'Soft delete product', section: 'Products', rbac: 'warehouse_manager' },

  // Inventory
  { method: 'GET', path: '/api/v1/inventory', description: 'List inventory records', section: 'Inventory', queryParams: ['page', 'per_page', 'low_stock'], rbac: 'All (read)' },
  { method: 'GET', path: '/api/v1/inventory/{id}', description: 'Get single inventory record', section: 'Inventory', rbac: 'All (read)' },
  { method: 'PUT', path: '/api/v1/inventory/{id}', description: 'Update stock (manual count)', section: 'Inventory', rbac: 'warehouse_manager', requestBody: '{ "qty_on_hand": 125, "warehouse_location": "A-12" }' },
  { method: 'GET', path: '/api/v1/inventory/stockout-risks', description: 'Products at stockout risk (qty_available <= safety_stock)', section: 'Inventory', queryParams: ['days'] },

  // Suppliers
  { method: 'GET', path: '/api/v1/suppliers', description: 'List suppliers', section: 'Suppliers', queryParams: ['page', 'search', 'country'], rbac: 'All (read)' },
  { method: 'POST', path: '/api/v1/suppliers', description: 'Create supplier', section: 'Suppliers', rbac: 'warehouse_manager', requestBody: '{\n  "name": "China Parts Co",\n  "country": "China",\n  "lead_time_days": 90\n}' },
  { method: 'GET', path: '/api/v1/suppliers/{id}', description: 'Get supplier with products', section: 'Suppliers', rbac: 'All (read)' },
  { method: 'PUT', path: '/api/v1/suppliers/{id}', description: 'Update supplier', section: 'Suppliers', rbac: 'warehouse_manager' },
  { method: 'DELETE', path: '/api/v1/suppliers/{id}', description: 'Deactivate supplier', section: 'Suppliers', rbac: 'warehouse_manager' },

  // Motorcycle Models
  { method: 'GET', path: '/api/v1/motorcycle-models', description: 'List motorcycle models', section: 'Motorcycle Models', queryParams: ['page', 'search', 'segment'], rbac: 'All (read)' },
  { method: 'POST', path: '/api/v1/motorcycle-models', description: 'Create motorcycle model', section: 'Motorcycle Models', rbac: 'warehouse_manager', requestBody: '{\n  "brand": "Bajaj",\n  "model": "Pulsar 150",\n  "cc_rating": 150,\n  "segment": "commuter"\n}' },
  { method: 'GET', path: '/api/v1/motorcycle-models/{id}', description: 'Get single model', section: 'Motorcycle Models', rbac: 'All (read)' },
  { method: 'PUT', path: '/api/v1/motorcycle-models/{id}', description: 'Update model', section: 'Motorcycle Models', rbac: 'warehouse_manager' },
  { method: 'DELETE', path: '/api/v1/motorcycle-models/{id}', description: 'Soft delete model', section: 'Motorcycle Models', rbac: 'warehouse_manager' },

  // Sales Orders
  { method: 'GET', path: '/api/v1/sales-orders', description: 'List sales orders', section: 'Sales Orders', queryParams: ['page', 'status', 'date_from', 'date_to'], rbac: 'WM: all, SM: read+own' },
  { method: 'POST', path: '/api/v1/sales-orders', description: 'Create sales order', section: 'Sales Orders', rbac: 'warehouse_manager, sales_manager', requestBody: '{\n  "product_id": "uuid",\n  "qty_ordered": 50,\n  "unit_price_bdt": 850\n}' },
  { method: 'GET', path: '/api/v1/sales-orders/{id}', description: 'Get sales order', section: 'Sales Orders', rbac: 'All (read)' },
  { method: 'PUT', path: '/api/v1/sales-orders/{id}', description: 'Update sales order', section: 'Sales Orders', rbac: 'WM, SM' },
  { method: 'PUT', path: '/api/v1/sales-orders/{id}/fulfill', description: 'Fulfill order — decrement inventory', section: 'Sales Orders', rbac: 'warehouse_manager' },

  // Purchase Orders
  { method: 'GET', path: '/api/v1/purchase-orders', description: 'List purchase orders', section: 'Purchase Orders', queryParams: ['page', 'status', 'supplier_id', 'cny_risk'], rbac: 'WM: CRUD, SM: read' },
  { method: 'POST', path: '/api/v1/purchase-orders', description: 'Create PO from recommended orders', section: 'Purchase Orders', rbac: 'warehouse_manager', requestBody: '{\n  "recommended_order_ids": ["uuid1", "uuid2"],\n  "shipment_mode": "sea"\n}' },
  { method: 'GET', path: '/api/v1/purchase-orders/{id}', description: 'Get purchase order', section: 'Purchase Orders', rbac: 'WM: all, SM: read' },
  { method: 'PUT', path: '/api/v1/purchase-orders/{id}', description: 'Update purchase order', section: 'Purchase Orders', rbac: 'warehouse_manager' },
  { method: 'PUT', path: '/api/v1/purchase-orders/{id}/status', description: 'Transition PO status with validation', section: 'Purchase Orders', rbac: 'warehouse_manager', requestBody: '{ "status": "confirmed" }' },

  // Forecasts
  { method: 'POST', path: '/api/v1/forecasts/generate', description: 'Dispatch forecast generation job', section: 'Forecasts', rbac: 'warehouse_manager, marketing_manager', requestBody: '{\n  "season": "winter",\n  "product_ids": ["uuid1"],\n  "method_override": "prophet"\n}' },
  { method: 'GET', path: '/api/v1/forecasts/generation-status/{job_id}', description: 'Track forecast generation progress', section: 'Forecasts', rbac: 'Authenticated' },
  { method: 'GET', path: '/api/v1/forecasts', description: 'List forecasts with filtering', section: 'Forecasts', queryParams: ['season', 'product_id', 'method', 'page'], rbac: 'All (read)' },
  { method: 'GET', path: '/api/v1/forecasts/{id}', description: 'Get single forecast', section: 'Forecasts', rbac: 'All (read)' },
  { method: 'PUT', path: '/api/v1/forecasts/{id}/approve', description: 'Approve forecast (S&OP gate)', section: 'Forecasts', rbac: 'warehouse_manager, executive', requestBody: '{ "governance_note": "Approved for Winter 2026" }' },
  { method: 'GET', path: '/api/v1/forecasts/compare', description: 'Forecast vs Actual comparison', section: 'Forecasts', queryParams: ['product_id', 'months'], rbac: 'All (read)' },

  // Recommended Orders
  { method: 'GET', path: '/api/v1/recommended-orders', description: 'THE PRIMARY OUTPUT — recommended orders with timeline', section: 'Recommended Orders', queryParams: ['urgency', 'status', 'shipment_mode', 'cny_risk', 'page'], rbac: 'All (read)' },
  { method: 'GET', path: '/api/v1/recommended-orders/{id}', description: 'Get single recommended order', section: 'Recommended Orders', rbac: 'All (read)' },
  { method: 'POST', path: '/api/v1/recommended-orders/{id}/convert-to-po', description: 'Convert recommendation to Purchase Order', section: 'Recommended Orders', rbac: 'warehouse_manager' },
  { method: 'POST', path: '/api/v1/recommended-orders/{id}/skip', description: 'Skip recommendation with reason', section: 'Recommended Orders', rbac: 'warehouse_manager', requestBody: '{ "reason": "Stock on order from alternate supplier" }' },
  { method: 'GET', path: '/api/v1/recommended-orders/summary', description: 'Executive aggregation for dashboard', section: 'Recommended Orders', rbac: 'All (read)' },

  // S&OP Lifecycle
  { method: 'GET', path: '/api/v1/sop-cycles/current', description: 'Get current active S&OP cycle with stage progress', section: 'S&OP Lifecycle', rbac: 'Authenticated' },
  { method: 'POST', path: '/api/v1/sop-cycles', description: 'Create new S&OP cycle', section: 'S&OP Lifecycle', rbac: 'warehouse_manager, executive', requestBody: '{\n  "cycle_name": "Winter 2026 S&OP",\n  "rhythm": "monthly",\n  "period_start": "2025-11-01",\n  "period_end": "2026-02-28"\n}' },
  { method: 'PUT', path: '/api/v1/sop-cycles/{id}/advance-stage', description: 'Advance S&OP stage (sequential)', section: 'S&OP Lifecycle', rbac: 'warehouse_manager, executive', requestBody: '{\n  "stage": "approval",\n  "governance_note": "All forecasts validated, MAPE within threshold"\n}' },
  { method: 'GET', path: '/api/v1/sop-cycles/{id}/pva', description: 'Plan-vs-Actual analysis for governance', section: 'S&OP Lifecycle', queryParams: ['threshold_pct'], rbac: 'Authenticated' },

  // Data Import
  { method: 'POST', path: '/api/v1/imports/upload', description: 'Upload file for import (Excel/CSV)', section: 'Data Import', rbac: 'warehouse_manager', requestBody: 'multipart/form-data: file + import_type (sales_history|purchase_history|product_catalog|stock_levels|suppliers|motorcycle_models)' },
  { method: 'POST', path: '/api/v1/imports/{id}/map-columns', description: 'Map source columns to target fields', section: 'Data Import', rbac: 'warehouse_manager', requestBody: '{\n  "column_mapping": {\n    "Date": "sale_date",\n    "SKU": "sku_code",\n    "Qty": "qty_sold"\n  }\n}' },
  { method: 'POST', path: '/api/v1/imports/{id}/execute', description: 'Execute ETL pipeline (validate → harmonize → insert)', section: 'Data Import', rbac: 'warehouse_manager' },
  { method: 'GET', path: '/api/v1/imports/{id}/status', description: 'Get import status and progress', section: 'Data Import', rbac: 'warehouse_manager' },

  // Promo Events
  { method: 'GET', path: '/api/v1/promo-events', description: 'List promo events (paginated)', section: 'Promo Events', queryParams: ['page', 'per_page', 'is_active', 'type'], rbac: 'All (read)' },
  { method: 'POST', path: '/api/v1/promo-events', description: 'Create promo event', section: 'Promo Events', rbac: 'warehouse_manager, marketing_manager', requestBody: '{\n  "name": "Eid Special 2025",\n  "type": "eid_discount",\n  "start_date": "2025-04-01",\n  "end_date": "2025-04-15",\n  "discount_pct": 15,\n  "expected_uplift": 0.70\n}' },
  { method: 'PUT', path: '/api/v1/promo-events/{id}', description: 'Update promo event', section: 'Promo Events', rbac: 'warehouse_manager, marketing_manager' },
  { method: 'DELETE', path: '/api/v1/promo-events/{id}', description: 'Deactivate promo event', section: 'Promo Events', rbac: 'warehouse_manager' },

  // Audit Log
  { method: 'GET', path: '/api/v1/audit-log', description: 'List audit entries (paginated, filtered)', section: 'Audit Log', queryParams: ['entity_type', 'entity_id', 'user_id', 'date_from', 'date_to', 'action', 'page'], rbac: 'WM, executive, finance' },

  // Forecast Settings
  { method: 'GET', path: '/api/v1/forecast-settings', description: 'Get forecast settings for tenant', section: 'Forecast Settings', rbac: 'All (read)' },
  { method: 'PUT', path: '/api/v1/forecast-settings', description: 'Update forecast settings', section: 'Forecast Settings', rbac: 'warehouse_manager', requestBody: '{\n  "model": "prophet",\n  "horizon_days": 90,\n  "confidence_level": 0.95,\n  "recalibration_threshold": 0.15\n}' },

  // Users
  { method: 'GET', path: '/api/v1/users', description: 'List tenant users', section: 'Users', queryParams: ['page', 'per_page'], rbac: 'warehouse_manager' },
  { method: 'POST', path: '/api/v1/users', description: 'Create new user', section: 'Users', rbac: 'warehouse_manager', requestBody: '{\n  "name": "John",\n  "email": "john@shop.com",\n  "password": "SecurePass123!",\n  "role": "marketing_manager"\n}' },
  { method: 'PUT', path: '/api/v1/users/{id}/role', description: 'Update user role', section: 'Users', rbac: 'warehouse_manager', requestBody: '{ "role": "marketing_manager" }' },

  // Security
  { method: 'GET', path: '/api/v1/security/permissions', description: 'Current user permissions + restricted fields + capabilities', section: 'Security', rbac: 'Authenticated' },
  { method: 'GET', path: '/api/v1/security/roles', description: 'All 5 roles with hierarchy + permissions + restrictions', section: 'Security', rbac: 'warehouse_manager, executive' },
  { method: 'GET', path: '/api/v1/security/audit-summary', description: 'Audit activity summary for tenant', section: 'Security', queryParams: ['days'], rbac: 'WM, executive, finance' },
  { method: 'GET', path: '/api/v1/security/rate-limit-status', description: 'Current rate limit usage per category', section: 'Security', rbac: 'Authenticated' },

  // Tenant Management (Session 14)
  { method: 'POST', path: '/api/v1/tenants/register', description: 'Register new tenant with auto-provisioning (tenant + admin + forecast_settings + subscription)', section: 'Tenant Management', requestBody: '{\n  "company_name": "BD Moto Parts",\n  "slug": "bd-moto-parts",\n  "admin_name": "Rahim",\n  "admin_email": "rahim@bdmoto.com",\n  "admin_password": "SecurePass123!",\n  "tier": "professional"\n}' },
  { method: 'GET', path: '/api/v1/tenants/me', description: 'Get current tenant with subscription, usage, and status evaluation', section: 'Tenant Management', rbac: 'Authenticated' },
  { method: 'PUT', path: '/api/v1/tenants/{id}/suspend', description: 'Suspend tenant (read-only access)', section: 'Tenant Management', rbac: 'executive', requestBody: '{ "reason": "Payment past due" }' },
  { method: 'PUT', path: '/api/v1/tenants/{id}/reactivate', description: 'Reactivate suspended tenant', section: 'Tenant Management', rbac: 'executive' },
  { method: 'PUT', path: '/api/v1/tenants/{id}/extend-trial', description: 'Extend tenant trial period (1-30 days)', section: 'Tenant Management', rbac: 'executive', requestBody: '{\n  "days": 7,\n  "reason": "Customer needs more evaluation time"\n}' },

  // Billing & Subscription (Session 14)
  { method: 'GET', path: '/api/v1/billing/tiers', description: 'List all subscription tiers with pricing, features, and limits', section: 'Billing & Subscription' },
  { method: 'POST', path: '/api/v1/billing/subscribe', description: 'Subscribe to a tier (create or upgrade/downgrade)', section: 'Billing & Subscription', rbac: 'Authenticated', requestBody: '{\n  "tier": "professional",\n  "payment_method_id": "pm_xxx"\n}' },
  { method: 'GET', path: '/api/v1/billing/subscription', description: 'Get current subscription details + tier definition', section: 'Billing & Subscription', rbac: 'Authenticated' },
  { method: 'PUT', path: '/api/v1/billing/subscription', description: 'Update subscription tier (upgrade/downgrade)', section: 'Billing & Subscription', rbac: 'Authenticated', requestBody: '{ "tier": "enterprise" }' },
  { method: 'POST', path: '/api/v1/billing/cancel', description: 'Cancel subscription (access until period end)', section: 'Billing & Subscription', rbac: 'Authenticated' },
  { method: 'GET', path: '/api/v1/billing/invoice', description: 'List invoices (paginated)', section: 'Billing & Subscription', queryParams: ['page', 'per_page', 'status'], rbac: 'Authenticated' },
  { method: 'POST', path: '/api/v1/billing/invoice', description: 'Generate invoice for current billing period', section: 'Billing & Subscription', rbac: 'Authenticated' },

  // Usage Metering (Session 14)
  { method: 'GET', path: '/api/v1/billing/usage', description: 'Current billing period usage with limits and remaining', section: 'Usage Metering', rbac: 'Authenticated' },
  { method: 'POST', path: '/api/v1/billing/usage/track', description: 'Record a billable usage event (with limit check)', section: 'Usage Metering', rbac: 'Authenticated', requestBody: '{\n  "event_type": "forecast_run",\n  "metadata": { "product_id": "uuid" }\n}' },
  { method: 'GET', path: '/api/v1/billing/feature-check', description: 'Check feature availability for current plan (or all features)', section: 'Usage Metering', queryParams: ['feature'], rbac: 'Authenticated' },

  // Billing Webhooks (Session 14)
  { method: 'POST', path: '/api/v1/billing/webhook', description: 'Handle Stripe/billing webhook events (payment, subscription, invoice)', section: 'Billing Webhooks', requestBody: '{\n  "type": "invoice.payment_succeeded",\n  "data": { "object": { "customer": "cus_xxx" } }\n}' },

  // SaaS Admin (Session 14)
  { method: 'GET', path: '/api/v1/admin/tenants', description: 'List all tenants with subscription + counts (admin dashboard)', section: 'SaaS Admin', queryParams: ['page', 'per_page', 'status', 'plan', 'search'], rbac: 'executive' },
  { method: 'GET', path: '/api/v1/admin/metrics', description: 'Platform-wide revenue, tenant, usage, and forecast quality metrics', section: 'SaaS Admin', rbac: 'executive' },
];

// --- Method Color Map ---
const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PUT: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

// --- Section Icons ---
const SECTION_ICONS: Record<string, string> = {
  Authentication: '🔐',
  Dashboard: '📊',
  Products: '📦',
  Inventory: '🏪',
  Suppliers: '🤝',
  'Motorcycle Models': '🏍️',
  'Sales Orders': '🧾',
  'Purchase Orders': '📋',
  Forecasts: '🔮',
  'Recommended Orders': '🎯',
  'S&OP Lifecycle': '🔄',
  'Data Import': '📥',
  'Promo Events': '🎉',
  'Audit Log': '📝',
  'Forecast Settings': '⚙️',
  Users: '👥',
  Security: '🛡️',
  'Tenant Management': '🏢',
  'Billing & Subscription': '💳',
  'Usage Metering': '📏',
  'Billing Webhooks': '🔗',
  'SaaS Admin': '👑',
};

interface ApiResponse {
  status: number;
  data: unknown;
  duration: number;
  error?: string;
}

export function ApiContractExplorer() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [requestBody, setRequestBody] = useState('');
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [authToken, setAuthToken] = useState('');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');

  const sections = [...new Set(API_ENDPOINTS.map((e) => e.section))];

  const handleSelectEndpoint = useCallback((endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setRequestBody(endpoint.requestBody || '');
    setPathParams({});
    setQueryParams({});
    setResponse(null);
    setActiveTab('test');
  }, []);

  const handleSendRequest = useCallback(async () => {
    if (!selectedEndpoint) return;

    setIsLoading(true);
    setResponse(null);

    try {
      // Build URL with path and query params
      let url = selectedEndpoint.path;
      for (const [key, value] of Object.entries(pathParams)) {
        url = url.replace(`{${key}}`, value);
      }

      const queryStr = Object.entries(queryParams)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      if (queryStr) url += `?${queryStr}`;

      const startTime = Date.now();

      const fetchOptions: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      };

      if (['POST', 'PUT'].includes(selectedEndpoint.method) && requestBody) {
        fetchOptions.body = requestBody;
      }

      const res = await fetch(url, fetchOptions);
      const duration = Date.now() - startTime;

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = await res.text();
      }

      setResponse({ status: res.status, data, duration });
    } catch (error) {
      setResponse({
        status: 0,
        data: null,
        duration: 0,
        error: error instanceof Error ? error.message : 'Request failed',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedEndpoint, pathParams, queryParams, requestBody, authToken]);

  const totalEndpoints = API_ENDPOINTS.length;
  const methodsCount = {
    GET: API_ENDPOINTS.filter((e) => e.method === 'GET').length,
    POST: API_ENDPOINTS.filter((e) => e.method === 'POST').length,
    PUT: API_ENDPOINTS.filter((e) => e.method === 'PUT').length,
    DELETE: API_ENDPOINTS.filter((e) => e.method === 'DELETE').length,
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-primary">{totalEndpoints}</div>
          <div className="text-xs text-muted-foreground">Total Endpoints</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">{methodsCount.GET}</div>
          <div className="text-xs text-muted-foreground">GET</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{methodsCount.POST}</div>
          <div className="text-xs text-muted-foreground">POST</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{methodsCount.PUT}</div>
          <div className="text-xs text-muted-foreground">PUT</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{methodsCount.DELETE}</div>
          <div className="text-xs text-muted-foreground">DELETE</div>
        </Card>
      </div>

      {/* Auth Token Input */}
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">🔐 Auth Token:</span>
          <Input
            placeholder="Paste Bearer token here for authenticated requests"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            className="flex-1 font-mono text-xs"
          />
          {authToken && (
            <Badge variant="default" className="bg-emerald-600">Authenticated</Badge>
          )}
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">📖 Browse Endpoints</TabsTrigger>
          <TabsTrigger value="test">🧪 Test Endpoint</TabsTrigger>
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse">
          <ScrollArea className="h-[600px]">
            <Accordion type="multiple" defaultValue={sections} className="w-full">
              {sections.map((section) => (
                <AccordionItem key={section} value={section}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span>{SECTION_ICONS[section] || '📁'}</span>
                      <span className="font-semibold">{section}</span>
                      <Badge variant="secondary" className="ml-2">
                        {API_ENDPOINTS.filter((e) => e.section === section).length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {API_ENDPOINTS.filter((e) => e.section === section).map((endpoint, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectEndpoint(endpoint)}
                          className="w-full text-left p-2 rounded-md hover:bg-muted/50 flex items-center gap-2 transition-colors"
                        >
                          <Badge className={`${METHOD_COLORS[endpoint.method]} font-mono text-[10px] px-1.5`}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-xs text-muted-foreground flex-1 truncate">{endpoint.path}</code>
                          <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[200px]">{endpoint.description}</span>
                          {endpoint.rbac && (
                            <Badge variant="outline" className="text-[9px]">{endpoint.rbac}</Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test">
          {selectedEndpoint ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Request Panel */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`${METHOD_COLORS[selectedEndpoint.method]} font-mono`}>
                      {selectedEndpoint.method}
                    </Badge>
                    <code className="text-sm font-mono">{selectedEndpoint.path}</code>
                  </div>
                  <CardDescription>{selectedEndpoint.description}</CardDescription>
                  {selectedEndpoint.rbac && (
                    <Badge variant="outline" className="w-fit">RBAC: {selectedEndpoint.rbac}</Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Path Parameters */}
                  {selectedEndpoint.path.includes('{') && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Path Parameters</label>
                      {Array.from(selectedEndpoint.path.matchAll(/\{(\w+)\}/g)).map((match) => (
                        <div key={match[1]} className="flex items-center gap-2 mb-1">
                          <code className="text-xs text-muted-foreground w-8">{match[1]}</code>
                          <Input
                            placeholder={`Enter ${match[1]}`}
                            value={pathParams[match[1]] || ''}
                            onChange={(e) => setPathParams((prev) => ({ ...prev, [match[1]]: e.target.value }))}
                            className="text-xs font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Query Parameters */}
                  {selectedEndpoint.queryParams && selectedEndpoint.queryParams.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Query Parameters</label>
                      {selectedEndpoint.queryParams.map((param) => (
                        <div key={param} className="flex items-center gap-2 mb-1">
                          <code className="text-xs text-muted-foreground w-20 truncate">{param}</code>
                          <Input
                            placeholder="value"
                            value={queryParams[param] || ''}
                            onChange={(e) => setQueryParams((prev) => ({ ...prev, [param]: e.target.value }))}
                            className="text-xs font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Request Body */}
                  {['POST', 'PUT'].includes(selectedEndpoint.method) && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Request Body (JSON)</label>
                      <Textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        className="font-mono text-xs min-h-[120px]"
                        placeholder='{"key": "value"}'
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleSendRequest}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? '⏳ Sending...' : `⚡ Send ${selectedEndpoint.method} Request`}
                  </Button>
                </CardContent>
              </Card>

              {/* Response Panel */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Response</CardTitle>
                  {response && (
                    <div className="flex items-center gap-2">
                      <Badge variant={response.status < 400 ? 'default' : 'destructive'}>
                        {response.status} {response.status < 400 ? 'OK' : 'Error'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{response.duration}ms</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {response ? (
                    <ScrollArea className="h-[400px]">
                      <pre className="text-xs font-mono bg-muted p-3 rounded-md whitespace-pre-wrap break-all">
                        {response.error
                          ? `❌ Error: ${response.error}`
                          : JSON.stringify(response.data, null, 2)}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <div className="text-3xl mb-2">🧪</div>
                        <p className="text-sm">Select an endpoint and send a request</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              <div className="text-4xl mb-3">📖</div>
              <p className="text-lg font-medium">Select an endpoint from the Browse tab</p>
              <p className="text-sm">Click any endpoint to open the interactive tester</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Common Response Format */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📋 Common Response Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-emerald-600">✅ Success Response</label>
              <pre className="text-xs font-mono bg-muted p-2 rounded mt-1">{`{
  "success": true,
  "data": { },
  "meta": { "page": 1, "per_page": 50, "total": 150 }
}`}</pre>
            </div>
            <div>
              <label className="text-xs font-medium text-red-600">❌ Error Response</label>
              <pre className="text-xs font-mono bg-muted p-2 rounded mt-1">{`{
  "success": false,
  "data": null,
  "errors": [{
    "code": "VALIDATION_ERROR",
    "message": "Field is required",
    "field": "name"
  }]
}`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Codes Reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">⚠️ Standard Error Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {[
              { code: 'VALIDATION_ERROR', status: 400, desc: 'Request validation failed' },
              { code: 'UNAUTHORIZED', status: 401, desc: 'Invalid/expired token' },
              { code: 'FORBIDDEN', status: 403, desc: 'Role/permission denied' },
              { code: 'TENANT_ISOLATION_VIOLATION', status: 403, desc: 'Cross-tenant access' },
              { code: 'NOT_FOUND', status: 404, desc: 'Resource not found' },
              { code: 'CONFLICT', status: 409, desc: 'State conflict' },
              { code: 'RATE_LIMIT_EXCEEDED', status: 429, desc: 'Too many requests' },
              { code: 'INTERNAL_ERROR', status: 500, desc: 'Server error' },
            ].map((err) => (
              <div key={err.code} className="flex items-center gap-2 p-1.5 rounded bg-muted/50">
                <Badge variant="destructive" className="text-[9px]">{err.status}</Badge>
                <code className="text-[10px] font-mono">{err.code}</code>
                <span className="text-muted-foreground">{err.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
