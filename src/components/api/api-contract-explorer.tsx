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
